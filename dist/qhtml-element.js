(function (globalScope) {
  const QHTML_VERSION = "4.3.22";
  globalScope.QHTML_VERSION = QHTML_VERSION;
})(typeof globalThis !== "undefined" ? globalThis : window);

(function () {
  "use strict";

  const globalScope = typeof globalThis !== "undefined" ? globalThis : window;

  class QHTMLDomRegistry {
    constructor() {
      this.nextHandle = 1;
      this.nodes = new Map();
      this.handles = new WeakMap();
      this.freeHandles = [];
      this.generations = new Map();
    }

    register(node) {
      if (!(node instanceof Node)) {
        throw new TypeError("Expected a DOM Node");
      }

      const existing = this.handles.get(node);

      if (existing !== undefined) {
        return this.encode(existing);
      }

      const handle = this.freeHandles.pop() ?? this.nextHandle++;
      const generation = (this.generations.get(handle) ?? 0) + 1;

      this.nodes.set(handle, node);
      this.handles.set(node, handle);
      this.generations.set(handle, generation);

      return this.encode(handle);
    }

    resolve(encodedHandle) {
      const { handle, generation } = this.decode(encodedHandle);

      if (this.generations.get(handle) !== generation) {
        return null;
      }

      return this.nodes.get(handle) ?? null;
    }

    release(encodedHandle) {
      const { handle, generation } = this.decode(encodedHandle);

      if (this.generations.get(handle) !== generation) {
        return false;
      }

      const node = this.nodes.get(handle);

      if (node !== undefined) {
        this.handles.delete(node);
      }

      this.nodes.delete(handle);
      this.freeHandles.push(handle);

      return true;
    }

    isValid(encodedHandle) {
      const node = this.resolve(encodedHandle);
      return node !== null && node.isConnected;
    }

    encode(handle) {
      const generation = this.generations.get(handle) ?? 0;
      return ((generation & 0xfff) << 20) | (handle & 0xfffff);
    }

    decode(encodedHandle) {
      return {
        handle: encodedHandle & 0xfffff,
        generation: encodedHandle >>> 20
      };
    }
  }

  globalScope.QHTMLDom = globalScope.QHTMLDom || new QHTMLDomRegistry();

  // The bridge is assembled in multiple sections later in this file.  It must
  // remain extensible until every browser-facing API has been installed.  A
  // prior hot-reloaded runtime may have left a frozen bridge in globalThis, so
  // clone it before adding or replacing methods.
  const existingQHTMLBrowserBridge = globalScope.QHTMLBrowserBridge;
  const qhtmlBrowserBridge = existingQHTMLBrowserBridge && Object.isExtensible(existingQHTMLBrowserBridge)
    ? existingQHTMLBrowserBridge
    : Object.assign({}, existingQHTMLBrowserBridge || {});

  Object.assign(qhtmlBrowserBridge, {
    registerElement(element) {
      return globalScope.QHTMLDom.register(element);
    },

    querySelector(selector) {
      const element = document.querySelector(selector);
      return element === null ? 0 : globalScope.QHTMLDom.register(element);
    },

    createElement(tagName) {
      return globalScope.QHTMLDom.register(document.createElement(tagName));
    },

    appendChild(parentHandle, childHandle) {
      const parent = globalScope.QHTMLDom.resolve(parentHandle);
      const child = globalScope.QHTMLDom.resolve(childHandle);

      if (parent === null || child === null) {
        return false;
      }

      parent.appendChild(child);
      return true;
    },

    setAttribute(handle, name, value) {
      const element = globalScope.QHTMLDom.resolve(handle);

      if (!(element instanceof Element)) {
        return false;
      }

      element.setAttribute(name, value);
      return true;
    },

    setProperty(handle, property, value) {
      const element = globalScope.QHTMLDom.resolve(handle);

      if (element === null) {
        return false;
      }

      element[property] = value;
      return true;
    },

    setStyle(handle, property, value) {
      const element = globalScope.QHTMLDom.resolve(handle);

      if (!(element instanceof HTMLElement)) {
        return false;
      }

      element.style.setProperty(property, value);
      return true;
    },

    remove(handle) {
      const node = globalScope.QHTMLDom.resolve(handle);

      if (node === null) {
        return false;
      }

      node.remove();
      globalScope.QHTMLDom.release(handle);
      return true;
    },

    release(handle) {
      return globalScope.QHTMLDom.release(handle);
    },

    applyMutationBatch(commands) {
      for (const command of commands) {
        const node = globalScope.QHTMLDom.resolve(command.target);

        if (node === null) {
          continue;
        }

        switch (command.opcode) {
          case 0:
            node.setAttribute(command.name, command.value);
            break;

          case 1:
            node[command.name] = command.value;
            break;

          case 2:
            node.style.setProperty(command.name, command.value);
            break;

          case 3:
            {
              const child = globalScope.QHTMLDom.resolve(command.value);
              if (child !== null) {
                node.appendChild(child);
              }
            }
            break;

          case 4:
            node.remove();
            globalScope.QHTMLDom.release(command.target);
            break;
        }
      }

      return true;
    }
  });
  globalScope.QHTMLBrowserBridge = qhtmlBrowserBridge;

  const ELEMENT_NAME = "q-html";
  const ELEMENT_NAME_7 = "q-html7";
  const ELEMENT_NAME_6 = "q-html6";
  const ELEMENT_NAME_ERROR = "q-html-error";
  const QHTML_VERSION = String(globalScope.QHTML_VERSION || "4.3.7");
  const currentScript = document.currentScript;
  const QHTML7_RUNTIME_BASE = globalScope.QHTML7_SCRIPT_BASE ||
    globalScope.QHTML_SCRIPT_BASE ||
    (currentScript && currentScript.src ? new URL(".", currentScript.src).href : new URL("./", document.baseURI).href);
  const QHTML_IMPORT_MAX_PER_RESOURCE_DEFAULT = 100;
  const QHTML_CONTENT_LOADED_EVENT = "QHTMLContentLoaded";
  const QHTML_ROOT_SELECTOR = `${ELEMENT_NAME},${ELEMENT_NAME_7}`;
  const ELEMENT_INNER_HTML = typeof Element !== "undefined"
    ? Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML")
    : null;
  let activePropertyTransactionId = "";
  let propertyTransactionCounter = 0;
  let qhtmlContentLoadedDispatchPending = false;

  if (!globalScope.QHTML7 || !globalScope.QHTML7.Module) {
    throw new Error("qhtml-element.js must be loaded after qhtml-wasm.js initializes WASM");
  }

  function instantiateParserTree(source, contextNode) {
    const qtModule = globalScope.QHTML7.Module;
    if (typeof qtModule.QHTMLParser !== "function" || typeof qtModule.QHTMLDomTree !== "function") {
      throw new Error("QHTML7 WASM module must export QHTMLParser and QHTMLDomTree");
    }

    const parser = new qtModule.QHTMLParser();
    const tree = new qtModule.QHTMLDomTree();
    if (contextNode && typeof tree.loadFromASTWithContext === "function") {
      tree.loadFromASTWithContext(parser.parse(String(source || "")), contextNode);
    } else {
      tree.loadFromAST(parser.parse(String(source || "")));
    }
    return { parser, tree };
  }

  function dispatchQHTMLContentLoadedSoon() {
    if (qhtmlContentLoadedDispatchPending) {
      return;
    }
    qhtmlContentLoadedDispatchPending = true;
    globalScope.setTimeout(() => {
      qhtmlContentLoadedDispatchPending = false;
      const detail = { runtime: "qhtml7", QHTML7: globalScope.QHTML7 || null };
      document.dispatchEvent(new CustomEvent(QHTML_CONTENT_LOADED_EVENT, { detail }));
      if (globalScope && globalScope !== document && typeof globalScope.dispatchEvent === "function") {
        globalScope.dispatchEvent(new CustomEvent(QHTML_CONTENT_LOADED_EVENT, { detail }));
      }
    }, 0);
  }

  function qhtmlImportCache() {
    if (!globalScope.QHTML7.importCache) {
      globalScope.QHTML7.importCache = new Map();
    }
    return globalScope.QHTML7.importCache;
  }

  function importCacheVersion() {
    return String(globalScope.QHTML7.importVersion || globalScope.QHTML7.version || "1");
  }

  function qhtmlVersionQuery() {
    const value = String(globalScope.QHTML_VERSION || QHTML_VERSION || "").trim();
    return value ? "v" + value.replace(/^v/i, "") : "";
  }

  function versionedFetchUrl(src) {
    const text = String(src || "");
    if (!text || text.startsWith(":/")) {
      return text;
    }
    const version = qhtmlVersionQuery();
    if (!version || text.includes("?" + version) || text.includes("&" + version)) {
      return text;
    }
    const hashIndex = text.indexOf("#");
    const beforeHash = hashIndex >= 0 ? text.slice(0, hashIndex) : text;
    const hash = hashIndex >= 0 ? text.slice(hashIndex) : "";
    return beforeHash + (beforeHash.includes("?") ? "&" : "?") + version + hash;
  }

  function importLimitPerResource() {
    const configured = Number(
      globalScope.QHTML7.importMaxPerResource ||
      globalScope.QHTML7.maxImportPerResource ||
      QHTML_IMPORT_MAX_PER_RESOURCE_DEFAULT
    );
    if (!Number.isFinite(configured) || configured < 1) {
      return QHTML_IMPORT_MAX_PER_RESOURCE_DEFAULT;
    }
    return Math.floor(configured);
  }

  function canonicalImportResourceKey(path) {
    return String(path || "").trim();
  }

  function importFetchCacheKey(importDef) {
    return [
      importCacheVersion(),
      String(importDef && importDef.cacheMode ? importDef.cacheMode : "default"),
      canonicalImportResourceKey(importDef && importDef.path)
    ].join("|");
  }

  function createImportExpansionState(options) {
    const stateOptions = options || {};
    const maxPerResource = Number.isFinite(Number(stateOptions.maxPerResource))
      ? Math.floor(Number(stateOptions.maxPerResource))
      : importLimitPerResource();
    return {
      activeStack: stateOptions.activeStack || new Set(),
      importCounts: stateOptions.importCounts || new Map(),
      fetchedSources: stateOptions.fetchedSources || new Map(),
      skippedCycles: stateOptions.skippedCycles || [],
      maxPerResource: maxPerResource > 0 ? maxPerResource : QHTML_IMPORT_MAX_PER_RESOURCE_DEFAULT
    };
  }

  function describeImportStack(state, nextKey) {
    const stack = Array.from(state && state.activeStack ? state.activeStack : []);
    if (nextKey) {
      stack.push(nextKey);
    }
    return stack.join(" -> ");
  }

  function assertImportAllowed(state, importDef) {
    const key = canonicalImportResourceKey(importDef && importDef.path);
    if (!key) {
      return "";
    }
    const count = (state.importCounts.get(key) || 0) + 1;
    state.importCounts.set(key, count);
    if (count > state.maxPerResource) {
      const kind = importDef && importDef.kind ? importDef.kind : "q-import";
      throw new Error(
        `QHTML ${kind} limit exceeded for ${key}: imported ${count} times during one expansion; ` +
        `maximum is ${state.maxPerResource}.`
      );
    }
    return key;
  }

  async function fetchImportSourceForExpansion(importDef, state) {
    const key = importFetchCacheKey(importDef);
    if (state.fetchedSources.has(key)) {
      return state.fetchedSources.get(key);
    }
    const source = await fetchImportSource(importDef);
    state.fetchedSources.set(key, source);
    return source;
  }

  function unicodeToBase64(value) {
    return btoa(unescape(encodeURIComponent(String(value || ""))));
  }

  function base64ToUnicode(value) {
    return decodeURIComponent(escape(atob(String(value || ""))));
  }

  function importStorageKey(path) {
    return `qhtml7:import:${importCacheVersion()}:${path}`;
  }

  function importNodePath(node) {
    return node && typeof node.path === "function" ? String(node.path() || "").trim() : "";
  }

  function importNodeCacheMode(node) {
    return node && typeof node.cacheMode === "function" ? String(node.cacheMode() || "default").trim().toLowerCase() : "default";
  }

  function importNodeIsRequire(node) {
    return !!(node && typeof node.isRequire === "function" && node.isRequire());
  }

  function collectImportNodes(tree) {
    const imports = [];
    const root = tree && typeof tree.root === "function" ? tree.root() : tree;
    walkQHTMLNode(root, (node) => {
      if (qhtmlNodeType(node) !== "QHTMLImportNode") {
        return;
      }
      const path = importNodePath(node);
      if (!path) {
        return;
      }
      imports.push({
        node,
        kind: importNodeIsRequire(node) ? "q-require" : "q-import",
        path,
        cacheMode: importNodeCacheMode(node)
      });
    });
    return imports;
  }

  function qhtmlResourceText(path) {
    const resources = globalScope.QHTML7.resources || globalScope.QHTML7.qrc || {};
    if (Object.prototype.hasOwnProperty.call(resources, path)) {
      return String(resources[path] == null ? "" : resources[path]);
    }
    const moduleResource = globalScope.QHTML7.Module && globalScope.QHTML7.Module.qhtmlResource;
    if (typeof moduleResource === "function") {
      const value = moduleResource(path);
      if (value != null) {
        return String(value);
      }
    }
    const readResourceText = globalScope.QHTML7.Module && globalScope.QHTML7.Module.readResourceText;
    if (typeof readResourceText === "function") {
      const value = readResourceText(path);
      if (value != null && String(value).length > 0) {
        return String(value);
      }
    }
    return null;
  }

  async function fetchImportSource(importDef) {
    const path = importDef.path;
    const cacheMode = importDef.cacheMode || "default";
    const memoryCacheKey = `${importCacheVersion()}:${path}`;
    const memoryCache = qhtmlImportCache();

    if (cacheMode === "cache" && memoryCache.has(memoryCacheKey)) {
      return rebaseNestedImportPaths(memoryCache.get(memoryCacheKey), path);
    }

    if (cacheMode === "cache" && globalScope.localStorage) {
      const cached = globalScope.localStorage.getItem(importStorageKey(path));
      if (cached) {
        const source = base64ToUnicode(cached);
        memoryCache.set(memoryCacheKey, source);
        return rebaseNestedImportPaths(source, path);
      }
    }

    let source = null;
    if (path.startsWith(":/")) {
      source = qhtmlResourceText(path);
      if (source == null) {
        throw new Error(`QHTML resource not found: ${path}`);
      }
    } else {
      let response;
      let fetchError = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          response = await fetch(versionedFetchUrl(path), { cache: cacheMode === "nocache" ? "no-store" : "default" });
          fetchError = null;
          break;
        } catch (error) {
          fetchError = error;
          await new Promise((resolve) => globalScope.setTimeout(resolve, 40 * (attempt + 1)));
        }
      }
      if (fetchError) {
        throw new Error(`QHTML ${importDef.kind} failed for ${path}: ${fetchError && fetchError.message ? fetchError.message : fetchError}`);
      }
      if (!response.ok) {
        throw new Error(`QHTML ${importDef.kind} failed for ${path}: ${response.status} ${response.statusText}`);
      }
      source = await response.text();
    }

    if (cacheMode === "cache") {
      memoryCache.set(memoryCacheKey, source);
      if (globalScope.localStorage) {
        globalScope.localStorage.setItem(importStorageKey(path), unicodeToBase64(source));
      }
    }
    return rebaseNestedImportPaths(source, path);
  }

  function isRelativeImportPath(path) {
    const text = String(path || "").trim();
    return !!text &&
      !text.startsWith(":/") &&
      !text.startsWith("/") &&
      !text.startsWith("//") &&
      !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(text);
  }

  function normalizeResourcePath(path) {
    const parts = String(path || "").split("/");
    const out = [];
    parts.forEach((part) => {
      if (!part || part === ".") {
        return;
      }
      if (part === "..") {
        if (out.length > 1) {
          out.pop();
        }
        return;
      }
      out.push(part);
    });
    return out.join("/");
  }

  function resolveImportPath(path, basePath) {
    const childPath = String(path || "").trim();
    const parentPath = String(basePath || "").trim();
    if (!isRelativeImportPath(childPath) || !parentPath) {
      return childPath;
    }

    if (parentPath.startsWith(":/")) {
      const parentDirectory = parentPath.slice(0, parentPath.lastIndexOf("/") + 1);
      return normalizeResourcePath(parentDirectory + childPath);
    }

    try {
      return new URL(childPath, new URL(parentPath, document.baseURI)).href;
    } catch (error) {
      const parentDirectory = parentPath.slice(0, parentPath.lastIndexOf("/") + 1);
      return parentDirectory + childPath;
    }
  }

  function quoteImportPath(path, originalToken) {
    const token = String(originalToken || "");
    const quote = token[0];
    if (quote === "\"" || quote === "'" || quote === "`") {
      return quote + String(path || "").replaceAll("\\", "\\\\").replaceAll(quote, "\\" + quote) + quote;
    }
    return String(path || "");
  }

  function firstDirectiveTokenSpan(source, bodyStart, bodyEnd) {
    let cursor = bodyStart;
    while (cursor < bodyEnd && /\s/.test(source[cursor])) {
      cursor += 1;
    }
    if (cursor >= bodyEnd) {
      return null;
    }

    const start = cursor;
    const quote = source[cursor];
    if (quote === "\"" || quote === "'" || quote === "`") {
      cursor += 1;
      let escape = false;
      while (cursor < bodyEnd) {
        const ch = source[cursor];
        if (escape) {
          escape = false;
        } else if (ch === "\\") {
          escape = true;
        } else if (ch === quote) {
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      return { start, end: cursor, token: source.slice(start, cursor) };
    }

    while (cursor < bodyEnd && !/\s/.test(source[cursor])) {
      cursor += 1;
    }
    return { start, end: cursor, token: source.slice(start, cursor) };
  }

  function rebaseNestedImportPaths(source, basePath) {
    const text = String(source || "");
    if (!basePath) {
      return text;
    }

    const declarations = collectImportDeclarationsFromSource(text, 0, text.length, []);
    let rebased = text;
    declarations.reverse().forEach((declaration) => {
      if (!declaration.pathIsRelative || !declaration.pathToken) {
        return;
      }
      const resolvedPath = resolveImportPath(declaration.path, basePath);
      const replacement = quoteImportPath(resolvedPath, declaration.pathToken);
      rebased = rebased.slice(0, declaration.pathStart) + replacement + rebased.slice(declaration.pathEnd);
    });
    return rebased;
  }

  function findMatchingSourceBrace(source, openIndex) {
    let depth = 0;
    let quote = "";
    let escape = false;
    let blockComment = false;
    for (let index = openIndex; index < source.length; index += 1) {
      const ch = source[index];
      const next = source[index + 1] || "";
      if (blockComment) {
        if (ch === "*" && next === "/") {
          blockComment = false;
          index += 1;
        }
        continue;
      }
      if (quote) {
        if (escape) {
          escape = false;
        } else if (ch === "\\") {
          escape = true;
        } else if (ch === quote) {
          quote = "";
        }
        continue;
      }
      if (ch === "/" && next === "*") {
        blockComment = true;
        index += 1;
        continue;
      }
      if (ch === "\"" || ch === "'" || ch === "`") {
        quote = ch;
        continue;
      }
      if (ch === "{") {
        depth += 1;
      } else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          return index;
        }
      }
    }
    return -1;
  }

  function headerStartForBlock(source, cursor, openIndex) {
    for (let index = openIndex - 1; index >= cursor; index -= 1) {
      const ch = source[index];
      if (ch === "\n" || ch === ";" || ch === "}") {
        return index + 1;
      }
    }
    return cursor;
  }

  function collectImportDeclarationsFromSource(source, start, end, out) {
    let cursor = start || 0;
    const stop = typeof end === "number" ? end : source.length;
    while (cursor < stop) {
      const openIndex = source.indexOf("{", cursor);
      if (openIndex < 0 || openIndex >= stop) {
        break;
      }
      const closeIndex = findMatchingSourceBrace(source, openIndex);
      if (closeIndex < 0) {
        break;
      }
      const headerStart = headerStartForBlock(source, cursor, openIndex);
      const header = source.slice(headerStart, openIndex).trim();
      if (header === "q-import" || header === "q-require") {
        const bodyStart = openIndex + 1;
        const bodyEnd = closeIndex;
        const body = source.slice(bodyStart, bodyEnd).trim();
        const pathSpan = firstDirectiveTokenSpan(source, bodyStart, bodyEnd);
        const parts = body.split(/\s+/).filter(Boolean);
        const rawPath = pathSpan ? pathSpan.token : parts[0] || "";
        const path = rawPath.replace(/^["'`]|["'`]$/g, "");
        let cacheMode = "default";
        parts.slice(1).forEach((part) => {
          const token = part.toLowerCase();
          if (token === "cache" || token === "nocache") {
            cacheMode = token;
          }
        });
        out.push({
          kind: header,
          path,
          cacheMode,
          bodyStart,
          bodyEnd,
          pathStart: pathSpan ? pathSpan.start : bodyStart,
          pathEnd: pathSpan ? pathSpan.end : bodyStart,
          pathToken: pathSpan ? pathSpan.token : rawPath,
          pathIsRelative: isRelativeImportPath(path),
          start: headerStart,
          end: closeIndex + 1
        });
      } else {
        collectImportDeclarationsFromSource(source, openIndex + 1, closeIndex, out);
      }
      cursor = closeIndex + 1;
    }
    return out;
  }

  function importKey(importDef) {
    return `${importDef.kind}|${importDef.path}`;
  }

  function expandSourceWithImports(source, fetchedImports) {
    const declarations = collectImportDeclarationsFromSource(String(source || ""), 0, String(source || "").length, []);
    const fetchedByKey = new Map();
    fetchedImports.forEach((entry) => {
      fetchedByKey.set(importKey(entry), entry.source);
    });

    let expanded = String(source || "");
    let replaced = 0;
    declarations.reverse().forEach((declaration) => {
      const key = importKey(declaration);
      if (!fetchedByKey.has(key)) {
        return;
      }
      expanded = expanded.slice(0, declaration.start) + "\n" + fetchedByKey.get(key) + "\n" + expanded.slice(declaration.end);
      replaced += 1;
    });

    if (replaced < fetchedImports.length) {
      const appended = fetchedImports
        .filter((entry) => !declarations.some((declaration) => importKey(declaration) === importKey(entry)))
        .map((entry) => entry.source)
        .join("\n");
      if (appended) {
        expanded += "\n" + appended;
      }
    }
    return expanded;
  }

  async function resolveBlockingRequires(source) {
    let expandedSource = String(source || "");
    for (let pass = 0; pass < 8; pass += 1) {
      const parsed = instantiateParserTree(expandedSource);
      const requires = collectImportNodes(parsed.tree).filter((entry) => entry.kind === "q-require");
      if (requires.length === 0) {
        return expandedSource;
      }
      const fetched = await Promise.all(requires.map(async (entry) => Object.assign({}, entry, {
        source: await fetchImportSource(entry)
      })));
      const nextSource = expandSourceWithImports(expandedSource, fetched);
      if (nextSource === expandedSource) {
        return expandedSource;
      }
      expandedSource = nextSource;
    }
    throw new Error("QHTML q-require nesting exceeded 8 expansion passes");
  }

  function replaceImportDeclarations(source, replacements) {
    let expanded = String(source || "");
    replacements
      .slice()
      .sort((a, b) => b.declaration.start - a.declaration.start)
      .forEach((entry) => {
        expanded =
          expanded.slice(0, entry.declaration.start) +
          "\n" + String(entry.source || "") + "\n" +
          expanded.slice(entry.declaration.end);
      });
    return expanded;
  }

  async function expandSourceImportsRecursive(source, basePath, state) {
    const original = String(source || "");
    const declarations = collectImportDeclarationsFromSource(original, 0, original.length, []);
    if (declarations.length === 0) {
      return original;
    }

    const replacements = [];
    for (const declaration of declarations) {
      const resolvedPath = resolveImportPath(declaration.path, basePath);
      const importDef = {
        kind: declaration.kind,
        path: resolvedPath,
        cacheMode: declaration.cacheMode
      };
      const resourceKey = canonicalImportResourceKey(resolvedPath);

      if (resourceKey && state.activeStack.has(resourceKey)) {
        state.skippedCycles.push({
          kind: declaration.kind,
          path: resourceKey,
          stack: describeImportStack(state, resourceKey)
        });
        replacements.push({ declaration, source: "" });
        continue;
      }

      assertImportAllowed(state, importDef);
      const importedSource = await fetchImportSourceForExpansion(importDef, state);
      let expandedImportedSource = importedSource;

      if (resourceKey) {
        state.activeStack.add(resourceKey);
      }
      try {
        expandedImportedSource = await expandSourceImportsRecursive(importedSource, resolvedPath, state);
      } finally {
        if (resourceKey) {
          state.activeStack.delete(resourceKey);
        }
      }

      replacements.push({ declaration, source: expandedImportedSource });
    }

    return replaceImportDeclarations(original, replacements);
  }

  async function resolveAllImportsBeforeParse(source, basePath) {
    const state = createImportExpansionState();
    const rootBasePath = basePath || document.baseURI || globalScope.location.href || "";
    const rootKey = canonicalImportResourceKey(rootBasePath);
    if (rootKey) {
      state.activeStack.add(rootKey);
    }
    try {
      return await expandSourceImportsRecursive(source, rootBasePath, state);
    } finally {
      if (rootKey) {
        state.activeStack.delete(rootKey);
      }
    }
  }


  async function applyAsyncImports(element, source, tree) {
    const imports = collectImportNodes(tree).filter((entry) => entry.kind === "q-import");
    if (imports.length === 0) {
      return;
    }
    try {
      const fetched = await Promise.all(imports.map(async (entry) => Object.assign({}, entry, {
        source: await fetchImportSource(entry)
      })));
      const expandedSource = expandSourceWithImports(source, fetched);
      if (expandedSource !== source && element.isConnected) {
        element.__qhtmlExpandedSource = expandedSource;
        element.__qhtml7Mounted = false;
        await mountElement(element, { force: true });
      }
    } catch (error) {
      element.dispatchEvent(new CustomEvent("QHTMLImportError", {
        bubbles: true,
        detail: { error }
      }));
      throw error;
    }
  }

  function splitList(value) {
    return String(value || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function defineHiddenValue(target, name, value) {
    Object.defineProperty(target, name, {
      configurable: true,
      enumerable: false,
      writable: true,
      value
    });
  }

  function createQHTMLMap(seed) {
    const map = Object.assign({}, seed || {});
    defineHiddenValue(map, "set", function qhtmlMapSet(key, value) {
      this[String(key)] = value;
      return value;
    });
    defineHiddenValue(map, "value", function qhtmlMapValue(key) {
      return this[String(key)];
    });
    defineHiddenValue(map, "keys", function qhtmlMapKeys() {
      return Object.keys(this);
    });
    defineHiddenValue(map, "remove", function qhtmlMapRemove(key) {
      delete this[String(key)];
    });
    defineHiddenValue(map, "clear", function qhtmlMapClear() {
      Object.keys(this).forEach((key) => delete this[key]);
    });
    return map;
  }

  function createQHTMLArray(seed) {
    const array = Array.isArray(seed) ? seed.slice() : Array.from(seed || []);
    defineHiddenValue(array, "set", function qhtmlArraySet(key, value) {
      this[Number(key)] = value;
      return value;
    });
    defineHiddenValue(array, "value", function qhtmlArrayValue(key) {
      return this[Number(key)];
    });
    defineHiddenValue(array, "keys", function qhtmlArrayKeys() {
      return Object.keys(this);
    });
    defineHiddenValue(array, "add", function qhtmlArrayAdd(value) {
      this.push(value);
      return value;
    });
    defineHiddenValue(array, "count", function qhtmlArrayCount() {
      return this.length;
    });
    return array;
  }

  function createQHTMLModel(seed) {
    const model = Array.isArray(seed) ? createQHTMLArray(seed) : createQHTMLMap(seed);
    if (typeof model.add !== "function") {
      defineHiddenValue(model, "add", function qhtmlModelAdd(value) {
        const key = String(Object.keys(this).length);
        this[key] = value;
        return value;
      });
    }
    if (typeof model.count !== "function") {
      defineHiddenValue(model, "count", function qhtmlModelCount() {
        return Object.keys(this).length;
      });
    }
    return model;
  }

  function QCallback(callback, options) {
    const creator = options && options.creator ? options.creator : ((this && this !== globalScope) ? this : null);
    const wrapped = function qhtmlCallbackInvoker(...args) {
      return callback.apply(creator || this, args);
    };
    wrapped.__qhtmlElement = creator || null;
    wrapped.__qhtmlCreator = creator || null;
    wrapped.__qhtmlCallback = callback;
    wrapped.__qhtmlInvokeFromSignal = function qhtmlCallbackInvokeFromSignal(args) {
      try {
        return wrapped.apply(creator || this, args || []);
      } catch (error) {
        reportQHTMLExecutionContext(error, {
          kind: "q-callback-signal-dispatch",
          sender: creator || this,
          args: args || []
        }, creator && creator.__qhtmlRegistry);
        throw error;
      }
    };
    return wrapped;
  }

  function installQHTML6CompatibilityGlobals() {
    globalScope.QMap = globalScope.QMap || createQHTMLMap;
    globalScope.QArray = globalScope.QArray || createQHTMLArray;
    globalScope.QModel = globalScope.QModel || createQHTMLModel;
    globalScope.QCallback = globalScope.QCallback || QCallback;
    const qhtmlObject = globalScope.QHtml || {};
    const rootContext = qhtmlObject.rootContext || createQHTMLMap();
    qhtmlObject.rootContext = rootContext;
    qhtmlObject.printEventLoopSnapshot = qhtmlObject.printEventLoopSnapshot || function qhtmlPrintEventLoopSnapshot() {
      return "";
    };
    globalScope.QHtml = qhtmlObject;
  }

  installQHTML6CompatibilityGlobals();

  function walkQHTMLNode(node, visitor) {
    if (!node || typeof visitor !== "function") {
      return;
    }
    visitor(node);
    const count = typeof node.childCount === "function" ? node.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      walkQHTMLNode(node.childAt(index), visitor);
    }
  }

  function qhtmlCssString(value) {
    const text = String(value == null ? "" : value);
    if (globalScope.CSS && typeof globalScope.CSS.escape === "function") {
      return globalScope.CSS.escape(text);
    }
    return text.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  }

  function qhtmlTreeRoot(tree) {
    return tree && typeof tree.root === "function" ? tree.root() : tree;
  }

  const QHTML_DOM_UUID_ATTRIBUTE = "domuuid";
  const QHTML_DOM_NODE_SELECTOR = `[${QHTML_DOM_UUID_ATTRIBUTE}], [qhtml-node]`;
  const QHTML_DOM_RUNTIME_SELECTOR = `[${QHTML_DOM_UUID_ATTRIBUTE}], [qhtml-node], [component-instance]`;

  function qhtmlNodeByUuid(tree, uuid) {
    const wanted = String(uuid || "").trim();
    if (!tree || !wanted) {
      return null;
    }
    if (typeof tree.findByUUID === "function") {
      return tree.findByUUID(wanted);
    }
    const root = qhtmlTreeRoot(tree);
    if (root && typeof root.qhtmlUUID === "function" && root.qhtmlUUID() === wanted) {
      return root;
    }
    return null;
  }

  function qhtmlNodeList(tree) {
    const out = [];
    walkQHTMLNode(qhtmlTreeRoot(tree), (node) => {
      out.push(node);
    });
    return out;
  }

  function qhtmlDomUuid(domElement) {
    if (!domElement || typeof domElement.getAttribute !== "function") {
      return "";
    }
    return domElement.getAttribute(QHTML_DOM_UUID_ATTRIBUTE) ||
      domElement.getAttribute("component-instance") ||
      domElement.getAttribute("qhtml-node") ||
      "";
  }

  function setQHTMLDomUuid(domElement, uuid) {
    const value = String(uuid || "").trim();
    if (!domElement || !value || typeof domElement.setAttribute !== "function") {
      return "";
    }
    domElement.setAttribute(QHTML_DOM_UUID_ATTRIBUTE, value);
    return value;
  }

  function setQHTMLDomUuidForNode(domElement, qhtmlNode) {
    const uuid = qhtmlNodeUuid(qhtmlNode);
    return setQHTMLDomUuid(domElement, uuid);
  }

  function qhtmlCurrentDomElements(rootElement) {
    if (!rootElement || typeof rootElement.querySelectorAll !== "function") {
      return [];
    }
    const elements = [];
    if (rootElement.hasAttribute &&
        (rootElement.hasAttribute(QHTML_DOM_UUID_ATTRIBUTE) ||
         rootElement.hasAttribute("qhtml-node") ||
         rootElement.hasAttribute("component-instance"))) {
      elements.push(rootElement);
    }
    rootElement.querySelectorAll(QHTML_DOM_RUNTIME_SELECTOR).forEach((element) => {
      elements.push(element);
    });
    return elements;
  }

  function qhtmlDomElementByUuid(rootElement, uuid) {
    const wanted = String(uuid || "").trim();
    if (!rootElement || !wanted || typeof rootElement.querySelector !== "function") {
      return null;
    }
    if (rootElement.getAttribute &&
        qhtmlDomUuid(rootElement) === wanted) {
      return rootElement;
    }
    const escaped = qhtmlCssString(wanted);
    return rootElement.querySelector(
      `[${QHTML_DOM_UUID_ATTRIBUTE}="${escaped}"], [component-instance="${escaped}"], [qhtml-node="${escaped}"]`
    );
  }

  function qhtmlDomElementByName(rootElement, tree, name) {
    const wanted = String(name || "").trim();
    if (!wanted) {
      return null;
    }
    const elements = qhtmlCurrentDomElements(rootElement);
    for (let index = 0; index < elements.length; index += 1) {
      const element = elements[index];
      const uuid = qhtmlDomUuid(element);
      const node = qhtmlNodeByUuid(tree, uuid);
      if (qhtmlNodeName(node) === wanted) {
        return element;
      }
    }
    return null;
  }

  function qhtmlNodeForDomElement(domElement, registry) {
    if (!domElement || !registry) {
      return null;
    }

    const browserNode = typeof Node !== "undefined" && domElement instanceof Node;
    if (!browserNode) {
      if (typeof domElement.qhtmlType === "function") {
        return domElement;
      }
      if (domElement.htmlNode && typeof domElement.htmlNode.qhtmlType === "function") {
        return domElement.htmlNode;
      }
      if (domElement.__qhtmlNode && typeof domElement.__qhtmlNode.qhtmlType === "function") {
        return domElement.__qhtmlNode;
      }
    }

    if (domElement === registry.rootElement) {
      return registry.tree || null;
    }

    const uuid = qhtmlDomUuid(domElement);
    return qhtmlNodeByUuid(registry.tree, uuid);
  }

  function qhtmlNodeContainsNode(ownerNode, candidateNode) {
    if (!ownerNode || !candidateNode) {
      return false;
    }
    const ownerUuid = qhtmlNodeUuid(ownerNode);
    let cursor = candidateNode;
    while (cursor) {
      if (qhtmlNodeUuid(cursor) === ownerUuid) {
        return true;
      }
      cursor = qhtmlParentNode(cursor);
    }
    return false;
  }

  function createLiveQHTMLNodeLookup(tree) {
    return {
      get(uuid, scopeNode) {
        const wanted = String(uuid || "").trim();
        if (!wanted) {
          return null;
        }
        const node = qhtmlNodeByUuid(tree, wanted);
        if (!node) {
          return null;
        }
        if (scopeNode && !qhtmlNodeContainsNode(scopeNode, node)) {
          return null;
        }
        return node;
      },
      set() {
        return this;
      },
      forEach(callback, thisArg) {
        if (typeof callback !== "function") {
          return;
        }
        qhtmlNodeList(tree).forEach((node) => {
          const uuid = qhtmlNodeUuid(node);
          if (uuid) {
            callback.call(thisArg, node, uuid, this);
          }
        });
      },
      values() {
        return qhtmlNodeList(tree)[Symbol.iterator]();
      },
      has(uuid) {
        return Boolean(this.get(uuid));
      },
      delete() {
        return false;
      },
      clear() {}
    };
  }

  function createLiveQHTMLDomElementUuidLookup(rootElement, tree) {
    return {
      get(uuid) {
        return qhtmlDomElementByUuid(rootElement, uuid);
      },
      set() {
        return this;
      },
      forEach(callback, thisArg) {
        if (typeof callback !== "function") {
          return;
        }
        qhtmlCurrentDomElements(rootElement).forEach((element) => {
          const uuid = qhtmlDomUuid(element);
          if (uuid) {
            callback.call(thisArg, element, uuid, this);
          }
        });
      },
      values() {
        return qhtmlCurrentDomElements(rootElement)[Symbol.iterator]();
      },
      has(uuid) {
        return !!qhtmlDomElementByUuid(rootElement, uuid);
      },
      delete() {
        return false;
      },
      clear() {}
    };
  }

  function createLiveQHTMLDomElementNameLookup(rootElement, tree) {
    return {
      get(name) {
        return qhtmlDomElementByName(rootElement, tree, name);
      },
      set() {
        return this;
      },
      forEach(callback, thisArg) {
        if (typeof callback !== "function") {
          return;
        }
        qhtmlCurrentDomElements(rootElement).forEach((element) => {
          const uuid = qhtmlDomUuid(element);
          const node = qhtmlNodeByUuid(tree, uuid);
          const name = qhtmlNodeName(node);
          if (name) {
            callback.call(thisArg, element, name, this);
          }
        });
      },
      values() {
        const values = [];
        this.forEach((element) => values.push(element));
        return values[Symbol.iterator]();
      },
      has(name) {
        return !!qhtmlDomElementByName(rootElement, tree, name);
      },
      delete() {
        return false;
      },
      clear() {}
    };
  }

  function createPropertyTransactionId() {
    propertyTransactionCounter += 1;
    const randomPart = Math.random().toString(36).slice(2);
    return `qhtml-tx-${Date.now().toString(36)}-${propertyTransactionCounter.toString(36)}-${randomPart}`;
  }

  function currentPropertyTransactionId() {
    return activePropertyTransactionId || createPropertyTransactionId();
  }

  function withPropertyTransaction(transactionId, callback) {
    const previousTransactionId = activePropertyTransactionId;
    activePropertyTransactionId = transactionId || previousTransactionId || createPropertyTransactionId();
    try {
      return callback(activePropertyTransactionId);
    } finally {
      activePropertyTransactionId = previousTransactionId;
    }
  }

  function isValidContextIdentifier(name) {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(String(name || "")) &&
      ![
        "this", "arguments", "const", "let", "var", "function", "return", "class", "new",
        "if", "else", "for", "while", "do", "switch", "case", "break", "continue"
      ].includes(String(name || ""));
  }

  function qhtmlNodeType(node) {
    try {
      return node && typeof node.qhtmlType === "function" ? node.qhtmlType() : "";
    } catch (error) {
      return "";
    }
  }

  function qhtmlNodeName(node) {
    try {
      return node && typeof node.qhtmlName === "function" ? node.qhtmlName() : "";
    } catch (error) {
      return "";
    }
  }

  function qhtmlNodeKeyword(node) {
    try {
      return node && typeof node.keyword === "function" ? node.keyword() : "";
    } catch (error) {
      return "";
    }
  }

  function qhtmlNodeAttribute(node, name) {
    return node && typeof node.attribute === "function" ? node.attribute(String(name || "")) : "";
  }

  const QHTML_LAYOUT_ATTRIBUTE_NAMES = new Set([
    "id",
    "name",
    "role",
    "title",
    "tabindex"
  ]);

  const QHTML_PALETTE_BUTTON_ATTRIBUTE_NAMES = new Set([
    "name",
    "component",
    "qhtml",
    "instance",
    "support",
    "data-pb-create-component"
  ]);

  const QHTML_CSS_SHORTCUT_NAMES = new Set([
    "aligncontent", "alignitems", "alignself", "aspectratio", "background",
    "backgroundcolor", "backgroundimage", "backgroundposition", "backgroundrepeat",
    "backgroundsize", "bordercolor", "borderradius", "borderstyle", "borderwidth",
    "bottom", "boxshadow", "boxsizing", "color", "columngap", "cursor", "display",
    "filter", "flex", "flexbasis", "flexdirection", "flexgrow", "flexshrink",
    "flexwrap", "fontfamily", "fontsize", "fontstyle", "fontweight", "gap",
    "gridarea", "gridcolumn", "gridrow", "height", "justifycontent",
    "justifyitems", "justifyself", "left", "letterspacing", "lineheight",
    "liststyle", "liststyletype", "margin", "marginbottom", "marginleft",
    "marginright", "margintop", "maxheight", "maxwidth", "minheight", "minwidth",
    "objectfit", "objectposition", "opacity", "order", "overflow", "overflowx",
    "overflowy", "padding", "paddingbottom", "paddingleft", "paddingright",
    "paddingtop", "pointerevents", "position", "right", "rowgap", "textalign",
    "textdecoration", "textoverflow", "texttransform", "top", "transform",
    "transformorigin", "transition", "visibility", "whitespace", "width",
    "wordbreak", "x", "y", "zindex"
  ]);

  const QHTML_CSS_SHORTCUT_CSS_NAMES = new Set([
    "align-content", "align-items", "align-self", "aspect-ratio", "background",
    "background-color", "background-image", "background-position", "background-repeat",
    "background-size", "border-color", "border-radius", "border-style", "border-width",
    "bottom", "box-shadow", "box-sizing", "color", "column-gap", "cursor", "display",
    "filter", "flex", "flex-basis", "flex-direction", "flex-grow", "flex-shrink",
    "flex-wrap", "font-family", "font-size", "font-style", "font-weight", "gap",
    "grid-area", "grid-column", "grid-row", "height", "justify-content",
    "justify-items", "justify-self", "left", "letter-spacing", "line-height",
    "list-style", "list-style-type", "margin", "margin-bottom", "margin-left",
    "margin-right", "margin-top", "max-height", "max-width", "min-height", "min-width",
    "object-fit", "object-position", "opacity", "order", "overflow", "overflow-x",
    "overflow-y", "padding", "padding-bottom", "padding-left", "padding-right",
    "padding-top", "pointer-events", "position", "right", "row-gap", "text-align",
    "text-decoration", "text-overflow", "text-transform", "top", "transform",
    "transform-origin", "transition", "visibility", "white-space", "width",
    "word-break", "z-index"
  ]);

  const QHTML_CSS_LENGTH_SHORTCUT_PROPERTIES = new Set([
    "background-position", "background-size", "border-radius", "border-width",
    "bottom", "column-gap", "flex-basis", "font-size", "gap", "height",
    "left", "letter-spacing", "margin", "margin-bottom", "margin-left",
    "margin-right", "margin-top", "max-height", "max-width", "min-height",
    "min-width", "object-position", "padding", "padding-bottom", "padding-left",
    "padding-right", "padding-top", "right", "row-gap", "top",
    "transform-origin", "width"
  ]);

  const QHTML_CSS_INVALID_VALUE_WARNINGS = new Set();

  function isCssShortcutAssignmentName(name) {
    const lowerName = String(name || "").trim().toLowerCase();
    return QHTML_CSS_SHORTCUT_NAMES.has(lowerName) || QHTML_CSS_SHORTCUT_CSS_NAMES.has(lowerName);
  }

  function isDeclarativeLayoutAttribute(name) {
    const lowerName = String(name || "").toLowerCase();
    return lowerName.startsWith("data-") ||
      lowerName.startsWith("aria-") ||
      QHTML_LAYOUT_ATTRIBUTE_NAMES.has(lowerName);
  }

  function nodeHasDirectQHTMLProperty(node, name) {
    const wanted = String(name || "").trim().toLowerCase();
    const count = node && typeof node.childCount === "function" ? node.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = node.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLProperty" && qhtmlNodeName(child).trim().toLowerCase() === wanted) {
        return true;
      }
    }
    return false;
  }

  function componentDefinitionHasProperty(instanceNode, name) {
    const definitionNode = instanceNode && typeof instanceNode.componentDefinition === "function"
      ? instanceNode.componentDefinition()
      : null;
    const wanted = String(name || "").trim().toLowerCase();
    return propertyNodesForDefinition(definitionNode)
      .some((propertyNode) => qhtmlNodeName(propertyNode).trim().toLowerCase() === wanted);
  }

  function shouldBindDeclarativeAttribute(domElement, qhtmlNode, name) {
    const nodeType = qhtmlNodeType(qhtmlNode);
    const lowerName = String(name || "").toLowerCase();
    const tagName = domElement && domElement.localName ? String(domElement.localName).toLowerCase() : "";
    if (!lowerName || lowerName === "style" || isCssShortcutAssignmentName(lowerName)) {
      return false;
    }
    if (nodeType === "QHTMLComponentInstance") {
      return !componentDefinitionHasProperty(qhtmlNode, lowerName);
    }
    if (nodeHasDirectQHTMLProperty(qhtmlNode, lowerName)) {
      return false;
    }
    if (nodeType === "QHTMLLayout" || nodeType === "QHTMLRowLayout" || nodeType === "QHTMLColumnLayout") {
      return isDeclarativeLayoutAttribute(lowerName);
    }
    if (tagName === "q-palette-toolbox-button") {
      return QHTML_PALETTE_BUTTON_ATTRIBUTE_NAMES.has(lowerName);
    }
    return true;
  }

  function bindDeclarativeAssignmentAttributes(domElement, qhtmlNode, registry) {
    const count = typeof qhtmlNode.childCount === "function" ? qhtmlNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      if (qhtmlNodeType(child) !== "QHTMLPropertyAssignment") {
        continue;
      }
      const name = qhtmlNodeName(child);
      if (isCssShortcutAssignmentName(name)) {
        applyCssShortcutAssignment(domElement, child, registry);
        continue;
      }
      if (!shouldBindDeclarativeAttribute(domElement, qhtmlNode, name)) {
        continue;
      }
      const rawValue = typeof child.value === "function" ? child.value() : "";
      const resolved = resolvePropertyValue(rawValue, domElement, child, registry);
      domElement.setAttribute(name, String(resolved == null ? "" : resolved));
    }
  }

  function cssShortcutPropertyName(name) {
    const text = String(name || "").trim();
    const lower = text.toLowerCase();
    if (lower === "x") {
      return "left";
    }
    if (lower === "y") {
      return "top";
    }
    if (QHTML_CSS_SHORTCUT_CSS_NAMES.has(lower)) {
      return lower;
    }
    return text.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).toLowerCase();
  }

  function cssGeometryReferenceValue(cssName, rawValue, domElement, registry) {
    const property = String(cssName || "").trim().toLowerCase();
    if (property !== "left" && property !== "right" && property !== "top" && property !== "bottom") {
      return undefined;
    }
    const stripped = stripMatchingQuotes(String(rawValue || "").trim());
    if (!/^[A-Za-z_$][A-Za-z0-9_$-]*(?:\.[A-Za-z_$][A-Za-z0-9_$-]*)?$/.test(stripped)) {
      return undefined;
    }
    const resolved = resolveAnchorTarget(stripped, registry);
    const parent = domElement.parentElement || registry.rootElement;
    const parentStyle = globalScope.getComputedStyle(parent);
    if (parentStyle.position === "static") {
      parent.style.position = "relative";
    }
    domElement.style.position = "absolute";

    const parentRect = parent.getBoundingClientRect();
    const parentBorderLeft = parent.clientLeft || 0;
    const parentBorderTop = parent.clientTop || 0;
    const parentBorderRight = Math.max(0, (parent.offsetWidth || 0) - (parent.clientWidth || 0) - parentBorderLeft);
    const parentBorderBottom = Math.max(0, (parent.offsetHeight || 0) - (parent.clientHeight || 0) - parentBorderTop);
    const targetRect = anchorTargetRect(resolved.target);
    const axis = property === "left" || property === "right" ? "x" : "y";
    const targetCoordinate = edgeCoordinate(targetRect, resolved.targetEdge, axis);
    let value;
    if (property === "left") {
      value = targetCoordinate - parentRect.left - parentBorderLeft + parent.scrollLeft;
    } else if (property === "right") {
      value = parentRect.right - parentBorderRight - targetCoordinate - parent.scrollLeft;
    } else if (property === "top") {
      value = targetCoordinate - parentRect.top - parentBorderTop + parent.scrollTop;
    } else {
      value = parentRect.bottom - parentBorderBottom - targetCoordinate - parent.scrollTop;
    }
    return `${Math.round(value * 100) / 100}px`;
  }

  function cssShortcutValue(rawValue, domElement, propertyNode, registry) {
    const stripped = stripMatchingQuotes(String(rawValue || "").trim());
    if (stripped.indexOf("$") >= 0) {
      return stripped.replace(/\$\s*\{([^}]+)\}/g, (match, expression) => {
        try {
          const context = executionContextFor(domElement, registry, []);
          const value = new Function(...context.names, `with(this) { return (${decodeQHTMLScriptEntities(expression)}); }`)
            .apply(qhtmlExecutionObjectFor(domElement, registry), context.values);
          return String(value == null ? "" : value);
        } catch (error) {
          reportQHTMLExecutionContext(error, {
            kind: "css-shortcut-interpolation",
            name: propertyNode && typeof propertyNode.qhtmlName === "function" ? propertyNode.qhtmlName() : "",
            node: propertyNode,
            sender: domElement,
            args: [expression]
          }, registry);
          if (reportQHTMLRuntimeError(domElement, error, registry)) {
            return "";
          }
          throw error;
        }
      });
    }
    return resolvePropertyValue(rawValue, domElement, propertyNode, registry);
  }

  function applyCssShortcutAssignment(domElement, propertyNode, registry) {
    if (!domElement || !propertyNode || !domElement.style) {
      return;
    }
    const rawValue = typeof propertyNode.value === "function" ? propertyNode.value() : "";
    const cssName = cssShortcutPropertyName(qhtmlNodeName(propertyNode));
    const geometryValue = cssGeometryReferenceValue(cssName, rawValue, domElement, registry);
    const value = typeof geometryValue !== "undefined"
      ? geometryValue
      : cssShortcutValue(rawValue, domElement, propertyNode, registry);
    domElement.style.setProperty(cssName, serializeCssShortcutValue(cssName, value));
    if (typeof geometryValue !== "undefined" && typeof globalScope.requestAnimationFrame === "function") {
      globalScope.requestAnimationFrame(() => {
        const nextValue = cssGeometryReferenceValue(cssName, rawValue, domElement, registry);
        if (typeof nextValue !== "undefined") {
          domElement.style.setProperty(cssName, nextValue);
        }
      });
    }
  }

  function serializeCssShortcutValue(cssName, value) {
    if (value == null) {
      return "";
    }
    if (typeof value === "number" && Number.isFinite(value) && QHTML_CSS_LENGTH_SHORTCUT_PROPERTIES.has(cssName)) {
      const warningKey = `${cssName}:${value}`;
      if (!QHTML_CSS_INVALID_VALUE_WARNINGS.has(warningKey) &&
          globalScope.console && typeof globalScope.console.warn === "function") {
        QHTML_CSS_INVALID_VALUE_WARNINGS.add(warningKey);
        globalScope.console.warn(`Invalid CSS ${cssName} property: ${value}`);
      }
    }
    return String(value);
  }

  function bindCssShortcutAssignments(domElement, qhtmlNode, registry) {
    const count = qhtmlNode && typeof qhtmlNode.childCount === "function" ? qhtmlNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLPropertyAssignment" && isCssShortcutAssignmentName(qhtmlNodeName(child))) {
        applyCssShortcutAssignment(domElement, child, registry);
      }
    }
  }

  const QHTML_DOM_EVENT_ALIASES = Object.freeze({
    mousepress: "mousedown",
    mousepressed: "mousedown",
    mousemove: "mousemove",
    mouseover: "mouseover",
    mouseout: "mouseout",
    mouseenter: "mouseenter",
    mouseleave: "mouseleave",
    mousedrag: "mousemove",
    doubleclick: "dblclick",
    context: "contextmenu",
    rightclick: "contextmenu",
    mousewheel: "wheel",
    keypress: "keypress",
    keydown: "keydown",
    keyup: "keyup"
  });

  const QHTML_COMMON_DOM_EVENTS = new Set([
    "abort", "animationcancel", "animationend", "animationiteration", "animationstart",
    "auxclick", "beforeinput", "beforetoggle", "blur", "cancel", "change",
    "click", "close", "compositionend", "compositionstart", "compositionupdate",
    "contextmenu", "copy", "cut", "dblclick", "drag", "dragend", "dragenter",
    "dragleave", "dragover", "dragstart", "drop", "error", "focus", "focusin",
    "focusout", "formdata", "input", "invalid", "keydown", "keypress", "keyup",
    "load", "loadeddata", "loadedmetadata", "mousedown", "mouseenter", "mouseleave",
    "mousemove", "mouseout", "mouseover", "mouseup", "paste", "pointercancel",
    "pointerdown", "pointerenter", "pointerleave", "pointermove", "pointerout",
    "pointerover", "pointerup", "reset", "resize", "scroll", "select", "submit",
    "toggle", "touchcancel", "touchend", "touchmove", "touchstart", "transitioncancel",
    "transitionend", "transitionrun", "transitionstart", "wheel"
  ]);

  function stripEventOnPrefix(name) {
    return String(name || "").trim().toLowerCase().replace(/^on(?=[a-z])/, "");
  }

  function eventNameForDom(eventName) {
    const normalized = stripEventOnPrefix(eventName);
    return QHTML_DOM_EVENT_ALIASES[normalized] || normalized;
  }

  function eventSignalName(eventName) {
    const normalized = stripEventOnPrefix(eventName);
    return normalized ? "on" + normalized : "";
  }

  function eventSignalAliases(eventName) {
    const raw = String(eventName || "").trim().toLowerCase();
    const normalized = stripEventOnPrefix(raw);
    const domName = eventNameForDom(normalized);
    const aliases = new Set();
    [raw, normalized, domName].forEach((name) => {
      if (!name) return;
      aliases.add(name);
      aliases.add("on" + stripEventOnPrefix(name));
    });
    return Array.from(aliases).filter(Boolean);
  }

  function isOnPrefixedEventName(name) {
    return /^on[a-z][a-z0-9_+\-]*$/i.test(String(name || "").trim());
  }

  function isKnownDomEventName(name) {
    const normalized = stripEventOnPrefix(name);
    return QHTML_COMMON_DOM_EVENTS.has(normalized) ||
      QHTML_COMMON_DOM_EVENTS.has(eventNameForDom(normalized)) ||
      Object.prototype.hasOwnProperty.call(QHTML_DOM_EVENT_ALIASES, normalized);
  }

  function isDomEventSignalLookupName(name) {
    return isOnPrefixedEventName(name) || isKnownDomEventName(name);
  }

  function isDomElementLike(value) {
    return !!(value && typeof value === "object" && typeof value.addEventListener === "function");
  }

  function qhtmlEventSignalStore(domElement) {
    if (!domElement.__qhtmlEventSignals) {
      Object.defineProperty(domElement, "__qhtmlEventSignals", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: Object.create(null)
      });
    }
    if (!domElement.qhtmlSignals) {
      Object.defineProperty(domElement, "qhtmlSignals", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: Object.create(null)
      });
    }
    return domElement.__qhtmlEventSignals;
  }

  function qhtmlBoundEventStore(domElement) {
    if (!domElement.__qhtmlBoundDomEvents) {
      Object.defineProperty(domElement, "__qhtmlBoundDomEvents", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: new Set()
      });
    }
    return domElement.__qhtmlBoundDomEvents;
  }

  function syntheticEventSignalNode(signalName, domEventName, qhtmlEventName) {
    const uuid = `builtin-event-${signalName}-${Math.random().toString(36).slice(2)}`;
    const connected = [];
    return {
      qhtmlName: function () { return signalName; },
      qhtmlType: function () { return "QHTMLBuiltinEventSignal"; },
      qhtmlUUID: function () { return uuid; },
      parameters: function () { return "event"; },
      emit: function () {},
      connect: function (target) {
        connected.push(target);
        return true;
      },
      signalBus: function () { return null; },
      domEventName: domEventName,
      qhtmlEventName: qhtmlEventName,
      connected: function () { return connected.slice(); }
    };
  }

  function ensureDomEventSignal(domElement, eventName, registry) {
    if (!isDomElementLike(domElement)) {
      return null;
    }
    const qhtmlEventName = stripEventOnPrefix(eventName);
    if (!qhtmlEventName || isPaintEventName(qhtmlEventName) || qhtmlEventName === "paint") {
      return null;
    }

    const domEventName = eventNameForDom(qhtmlEventName);
    if (!domEventName) {
      return null;
    }

    const signals = qhtmlEventSignalStore(domElement);
    for (const alias of eventSignalAliases(qhtmlEventName)) {
      if (signals[alias]) {
        return signals[alias];
      }
    }

    const signalName = eventSignalName(qhtmlEventName);
    const signalNode = syntheticEventSignalNode(signalName, domEventName, qhtmlEventName);
    const signal = createDomSignal(domElement, signalName, signalNode);
    signal.__qhtmlBuiltinDomEvent = domEventName;
    signal.__qhtmlQEventName = qhtmlEventName;
    signal.__qhtmlRegistry = registry || domElement.__qhtmlRegistry || null;

    eventSignalAliases(qhtmlEventName).forEach((alias) => {
      signals[alias] = signal;
      domElement.qhtmlSignals[alias] = signal;
    });

    const boundEvents = qhtmlBoundEventStore(domElement);
    if (!boundEvents.has(domEventName)) {
      boundEvents.add(domEventName);
      domElement.addEventListener(domEventName, function qhtmlDomEventBridge(event) {
        return signal(event);
      });
    }

    return signal;
  }

  function eventSignalForPathPart(value, part, registry) {
    if (!isDomElementLike(value) || !isDomEventSignalLookupName(part)) {
      return undefined;
    }
    if (isOnPrefixedEventName(part)) {
      return ensureDomEventSignal(value, part, registry);
    }
    const existing = value.__qhtmlEventSignals && value.__qhtmlEventSignals[String(part || "").toLowerCase()];
    if (existing) {
      return existing;
    }
    if (isKnownDomEventName(part) && typeof value[part] === "undefined") {
      return ensureDomEventSignal(value, part, registry);
    }
    return undefined;
  }

  function eventHandlerExecution(parameters, args) {
    const sourceNames = Array.isArray(parameters) ? parameters.slice() : [];
    const sourceValues = Array.isArray(args) ? args.slice() : [];
    const names = [];
    const values = [];
    const used = new Set();

    const add = function (name, value) {
      if (!isValidContextIdentifier(name) || used.has(name)) {
        return;
      }
      used.add(name);
      names.push(name);
      values.push(value);
    };

    sourceNames.forEach((name, index) => {
      add(name, index < sourceValues.length ? sourceValues[index] : undefined);
    });

    const eventArg = sourceValues.length > 0 ? sourceValues[0] : null;
    add("event", eventArg);
    add("e", eventArg);
    add("detail", eventArg && typeof eventArg === "object" ? eventArg.detail : undefined);
    return { names, values };
  }

  function createQHTMLSelectorHelper(domElement, registry) {
    return function qhtmlSelect(selector, callback, rootOverride) {
      const selectorText = String(selector || "").trim();
      if (!selectorText) {
        return selectorText.startsWith("#") ? null : [];
      }
      const root =
        rootOverride ||
        (registry && registry.rootElement && typeof registry.rootElement.querySelectorAll === "function" ? registry.rootElement : null) ||
        (domElement && domElement.closest && domElement.closest(QHTML_ROOT_SELECTOR)) ||
        (domElement && domElement.ownerDocument) ||
        (registry && registry.rootElement && registry.rootElement.ownerDocument) ||
        document;

      if (selectorText.startsWith("#")) {
        const element = root.querySelector(selectorText);
        if (element && typeof callback === "function") {
          callback.call(element, element, 0, [element]);
        }
        return element;
      }

      const elements = Array.from(root.querySelectorAll(selectorText));
      if (typeof callback === "function") {
        elements.forEach((element, index) => {
          callback.call(element, element, index, elements);
        });
      }
      return elements;
    };
  }


  function addDomElementContextBindings(add, domElement, registry) {
    if (typeof add !== "function") {
      return;
    }

    const addElement = function (name, element) {
      if (!name || !element || !isDomElementLike(element)) {
        return;
      }
      add(String(name || "").trim(), element);
    };

    if (registry && registry.elementsByUuid) {
      registry.elementsByUuid.forEach((element) => {
        const node = qhtmlNodeForDomElement(element, registry);
        const nodeName = qhtmlNodeName(node);
        addElement(nodeName, element);
      });
    }

    const rootElement =
      (registry && registry.rootElement) ||
      (domElement && domElement.closest && domElement.closest(QHTML_ROOT_SELECTOR)) ||
      domElement ||
      null;
    const doc =
      (rootElement && rootElement.ownerDocument) ||
      (domElement && domElement.ownerDocument) ||
      (typeof document !== "undefined" ? document : null);
    const queryRoot = rootElement && typeof rootElement.querySelectorAll === "function" ? rootElement : doc;
    if (!queryRoot || typeof queryRoot.querySelectorAll !== "function") {
      return;
    }

    queryRoot.querySelectorAll("[id], [name]").forEach((element) => {
      addElement(element.getAttribute("id"), element);
      addElement(element.getAttribute("name"), element);
    });
  }

  function executionContextFor(domElement, registry, parameterNames) {
    const names = [];
    const values = [];
    const used = new Set(parameterNames || []);
    const sourceRegistry = registry || (domElement && domElement.__qhtmlRegistry);
    const add = function (name, value) {
      if (!isValidContextIdentifier(name) || used.has(name)) {
        return;
      }
      used.add(name);
      names.push(name);
      values.push(value);
    };
    const reserve = function (name, value) {
      if (!isValidContextIdentifier(name)) {
        return;
      }
      const existingIndex = names.indexOf(name);
      if (existingIndex >= 0) {
        values[existingIndex] = value;
        used.add(name);
        return;
      }
      if (used.has(name)) {
        return;
      }
      used.add(name);
      names.push(name);
      values.push(value);
    };

    // Runtime helpers must be injected before user/DOM symbols so they cannot be
    // shadowed by an element id/name or a registry entry with the same identifier.
    reserve("$", createQHTMLSelectorHelper(domElement, sourceRegistry));
    reserve("qhtmlMakeSignal", globalScope.qhtmlMakeSignal);
    reserve("qhtml", qhtmlRuntimeFragment);
    reserve("QMap", globalScope.QMap);
    reserve("QArray", globalScope.QArray);
    reserve("QModel", globalScope.QModel);
    reserve("QCallback", globalScope.QCallback);
    reserve("QHTMLComponentInstance", globalScope.QHTML7.Module.QHTMLComponentInstance);
    addLexicalQHTMLContextBindings(add, domElement, sourceRegistry);
    addScopedQHTMLContextBindings(add, domElement, sourceRegistry);

    if (sourceRegistry) {
      if (sourceRegistry.elementsByName) {
        sourceRegistry.elementsByName.forEach((element, name) => add(name, element));
      }
      if (sourceRegistry.workersByName) {
        sourceRegistry.workersByName.forEach((worker, name) => add(name, worker));
      }
      if (sourceRegistry.loggersByName) {
        sourceRegistry.loggersByName.forEach((logger, name) => add(name, logger));
      }
      addDomElementContextBindings(add, domElement, sourceRegistry);
      if (sourceRegistry.componentDefinitionsByName) {
        sourceRegistry.componentDefinitionsByName.forEach((definition, name) => add(name, definition));
      }
      if (sourceRegistry.qhtmlClassesByName) {
        sourceRegistry.qhtmlClassesByName.forEach((classObject, name) => add(name, classObject));
      }
      if (sourceRegistry.qhtmlClassInstancesByName) {
        sourceRegistry.qhtmlClassInstancesByName.forEach((classInstance, name) => add(name, classInstance));
      }
      if (sourceRegistry.timersByName) {
        sourceRegistry.timersByName.forEach((timer, name) => add(name, timer));
      }
      if (sourceRegistry.animationsByName) {
        sourceRegistry.animationsByName.forEach((animation, name) => add(name, animation));
      }
      if (sourceRegistry.paintersByName) {
        sourceRegistry.paintersByName.forEach((painter, name) => add(name, painter));
      }
    }
    addQHTMLRootContextBindings(add);
    return { names, values };
  }

  function normalizeScriptInvocation(domElement, registry, parameters, args) {
    const names = Array.isArray(parameters) ? parameters.slice() : splitList(parameters);
    const values = Array.isArray(args) ? args.slice() : [];
    const sourceRegistry = registry || (domElement && domElement.__qhtmlRegistry) || null;
    const helpers = {
      "$": createQHTMLSelectorHelper(domElement, sourceRegistry)
    };

    Object.keys(helpers).forEach((name) => {
      const parameterIndex = names.indexOf(name);
      if (parameterIndex < 0) {
        return;
      }
      while (values.length <= parameterIndex) {
        values.push(undefined);
      }
      values[parameterIndex] = helpers[name];
    });

    return { names, values };
  }

  const QHTML_EXECUTION_NOT_FOUND = Symbol("QHTMLExecutionNotFound");
  const qhtmlExecutionProxyCache = new WeakMap();

  function qhtmlRuntimeStoreEntry(owner, name) {
    if (!owner || !name) {
      return QHTML_EXECUTION_NOT_FOUND;
    }

    if (owner.__qhtmlRuntimeProperties &&
        Object.prototype.hasOwnProperty.call(owner.__qhtmlRuntimeProperties, name)) {
      return owner.__qhtmlRuntimeProperties[name];
    }

    if (owner.__qhtmlProperties &&
        Object.prototype.hasOwnProperty.call(owner.__qhtmlProperties, name)) {
      const entry = owner.__qhtmlProperties[name];
      return entry ? entry.value : undefined;
    }

    const stores = [
      owner.__qhtmlFunctions,
      owner.__qhtmlVars,
      owner.__qhtmlCallbacks,
      owner.qhtmlSignals
    ];

    for (let index = 0; index < stores.length; index += 1) {
      const store = stores[index];
      if (store && Object.prototype.hasOwnProperty.call(store, name)) {
        return store[name];
      }
    }

    const descriptor = Object.getOwnPropertyDescriptor(owner, name);
    if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      return descriptor.value;
    }

    return QHTML_EXECUTION_NOT_FOUND;
  }

  function qhtmlComponentExecutionChain(domElement, registry) {
    const chain = [];
    const seen = new Set();
    let current = currentQHTMLComponentFor(domElement, registry);

    while (current && !seen.has(current)) {
      seen.add(current);
      chain.push(current);
      current = parentQHTMLComponentFor(current, registry);
    }

    if (registry && registry.rootElement && !seen.has(registry.rootElement)) {
      chain.push(registry.rootElement);
    }

    return chain;
  }

  function qhtmlResolveExecutionReference(domElement, name, registry) {
    const contexts = [];
    const seenContexts = new Set();
    const senderNode = qhtmlNodeForDomElement(domElement, registry);

    if (senderNode) {
      contexts.push(senderNode);
    }

    qhtmlComponentExecutionChain(domElement, registry).forEach((componentElement) => {
      const componentNode = qhtmlNodeForDomElement(componentElement, registry);
      const componentUuid = qhtmlNodeUuid(componentNode);
      const key = componentUuid || componentNode;
      if (componentNode && !seenContexts.has(key)) {
        seenContexts.add(key);
        contexts.push(componentNode);
      }
    });

    for (let index = 0; index < contexts.length; index += 1) {
      const contextNode = contexts[index];
      if (!contextNode || typeof contextNode.resolve !== "function") {
        continue;
      }

      const contextUuid = qhtmlNodeUuid(contextNode);
      const resolving = qhtmlResolvingReferenceSet(registry);
      const resolveKey = `execution:${contextUuid || index}:${name}`;
      if (resolving && resolving.has(resolveKey)) {
        continue;
      }

      if (resolving) {
        resolving.add(resolveKey);
      }

      try {
        const referenceNode = contextNode.resolve(name);
        if (referenceNode) {
          return {
            found: true,
            referenceNode,
            value: runtimeValueForQHTMLReference(referenceNode, registry, domElement)
          };
        }
      } finally {
        if (resolving) {
          resolving.delete(resolveKey);
        }
      }
    }

    return { found: false, referenceNode: null, value: undefined };
  }

  function qhtmlSafeDomValue(element, name) {
    if (!element) {
      return QHTML_EXECUTION_NOT_FOUND;
    }

    const ownDescriptor = Object.getOwnPropertyDescriptor(element, name);
    if (ownDescriptor && ownDescriptor.get && ownDescriptor.get.__qhtmlReferenceAccessor === true) {
      return QHTML_EXECUTION_NOT_FOUND;
    }

    try {
      if (!(name in element)) {
        return QHTML_EXECUTION_NOT_FOUND;
      }
      const value = Reflect.get(element, name, element);
      return typeof value === "function" && !value.connect
        ? value.bind(element)
        : value;
    } catch (error) {
      return QHTML_EXECUTION_NOT_FOUND;
    }
  }

  function qhtmlPrepareExecutionValue(value, owner) {
    if (typeof value !== "function" || !owner || value.connect || value.__qhtmlFunctionNode) {
      return value;
    }
    try {
      return value.bind(owner);
    } catch (error) {
      return value;
    }
  }

  function qhtmlExecutionLookup(domElement, name, registry, options) {
    const settings = options || {};
    const componentChain = qhtmlComponentExecutionChain(domElement, registry);

    const senderValue = qhtmlRuntimeStoreEntry(domElement, name);
    if (senderValue !== QHTML_EXECUTION_NOT_FOUND) {
      return { found: true, value: qhtmlPrepareExecutionValue(senderValue, domElement), owner: domElement };
    }

    for (let index = 0; index < componentChain.length; index += 1) {
      const componentElement = componentChain[index];
      if (componentElement === domElement) {
        continue;
      }
      const componentValue = qhtmlRuntimeStoreEntry(componentElement, name);
      if (componentValue !== QHTML_EXECUTION_NOT_FOUND) {
        return { found: true, value: qhtmlPrepareExecutionValue(componentValue, componentElement), owner: componentElement };
      }
    }

    const resolved = qhtmlResolveExecutionReference(domElement, name, registry);
    if (resolved.found) {
      return {
        found: true,
        value: qhtmlPrepareExecutionValue(
          resolved.value,
          ownerRuntimeObjectForQHTMLNode(resolved.referenceNode, registry) || domElement
        ),
        owner: ownerRuntimeObjectForQHTMLNode(resolved.referenceNode, registry) || domElement,
        referenceNode: resolved.referenceNode
      };
    }

    if (settings.allowDomFallback === false) {
      return { found: false, value: undefined, owner: null };
    }

    const senderDomValue = qhtmlSafeDomValue(domElement, name);
    if (senderDomValue !== QHTML_EXECUTION_NOT_FOUND) {
      return { found: true, value: senderDomValue, owner: domElement };
    }

    for (let index = 0; index < componentChain.length; index += 1) {
      const componentElement = componentChain[index];
      if (componentElement === domElement) {
        continue;
      }
      const componentDomValue = qhtmlSafeDomValue(componentElement, name);
      if (componentDomValue !== QHTML_EXECUTION_NOT_FOUND) {
        return { found: true, value: componentDomValue, owner: componentElement };
      }
    }

    return { found: false, value: undefined, owner: null };
  }

  function qhtmlExecutionWrite(domElement, name, value, registry) {
    const owners = [domElement, ...qhtmlComponentExecutionChain(domElement, registry)];
    const seen = new Set();

    for (let index = 0; index < owners.length; index += 1) {
      const owner = owners[index];
      if (!owner || seen.has(owner)) {
        continue;
      }
      seen.add(owner);

      if ((owner.__qhtmlRuntimeProperties &&
           Object.prototype.hasOwnProperty.call(owner.__qhtmlRuntimeProperties, name)) ||
          (owner.__qhtmlProperties &&
           Object.prototype.hasOwnProperty.call(owner.__qhtmlProperties, name))) {
        return writeRuntimeStoredProperty(owner, name, value);
      }

      const scopedStores = [owner.__qhtmlVars, owner.__qhtmlCallbacks];
      for (let storeIndex = 0; storeIndex < scopedStores.length; storeIndex += 1) {
        const store = scopedStores[storeIndex];
        if (store && Object.prototype.hasOwnProperty.call(store, name)) {
          store[name] = value;
          return true;
        }
      }
    }

    const resolved = qhtmlResolveExecutionReference(domElement, name, registry);
    if (resolved.found) {
      const referenceType = qhtmlNodeType(resolved.referenceNode);
      if (referenceType === "QHTMLProperty" || referenceType === "QHTMLPropertyAssignment") {
        const owner = ownerRuntimeObjectForQHTMLNode(resolved.referenceNode, registry) || domElement;
        if (writeRuntimeStoredProperty(owner, name, value)) {
          return true;
        }
      }
    }

    try {
      Reflect.set(domElement, name, value, domElement);
      return true;
    } catch (error) {
      return false;
    }
  }

  function qhtmlExecutionObjectFor(domElement, registry) {
    if (!domElement || typeof Proxy !== "function") {
      return domElement;
    }

    const sourceRegistry = registry || domElement.__qhtmlRegistry || null;
    const componentElement = currentQHTMLComponentFor(domElement, sourceRegistry) || domElement;
    const cached = qhtmlExecutionProxyCache.get(domElement);
    if (cached && cached.componentElement === componentElement && cached.registry === sourceRegistry) {
      return cached.proxy;
    }

    let proxy = null;
    const handler = {
      get(target, name) {
        if (name === Symbol.unscopables) {
          return undefined;
        }
        if (typeof name === "symbol") {
          return Reflect.get(target, name, target);
        }
        if (name === "dom" || name === "eventTarget" || name === "sender") {
          return domElement;
        }
        if (name === "componentDom") {
          return componentElement;
        }
        if (name === "component" || name === "qhtmlContext") {
          return proxy;
        }
        if (name === "__qhtmlExecutionProxy") {
          return true;
        }

        const result = qhtmlExecutionLookup(domElement, String(name), sourceRegistry);
        return result.found ? result.value : undefined;
      },

      set(target, name, value) {
        if (typeof name === "symbol") {
          return Reflect.set(target, name, value, target);
        }
        return qhtmlExecutionWrite(domElement, String(name), value, sourceRegistry);
      },

      has(target, name) {
        if (name === Symbol.unscopables) {
          return false;
        }
        if (typeof name === "symbol") {
          return name in target;
        }
        if (name === "dom" || name === "eventTarget" || name === "sender" ||
            name === "componentDom" || name === "component" || name === "qhtmlContext") {
          return true;
        }
        return qhtmlExecutionLookup(domElement, String(name), sourceRegistry).found;
      }
    };

    proxy = new Proxy(componentElement, handler);
    qhtmlExecutionProxyCache.set(domElement, {
      componentElement,
      registry: sourceRegistry,
      proxy
    });
    return proxy;
  }

  function qhtmlExecutionNodeLabel(node) {
    if (!node) {
      return "";
    }
    const type = qhtmlNodeType(node);
    const name = qhtmlNodeName(node);
    const uuid = qhtmlNodeUuid(node);
    return [name || type || "anonymous", type && name ? type : "", uuid ? `uuid=${uuid}` : ""]
      .filter(Boolean)
      .join(" ");
  }

  function qhtmlExecutionSenderLabel(sender, registry) {
    if (!sender) {
      return "anonymous";
    }
    const parts = [];
    if (sender.nodeType === 1) {
      parts.push(String(sender.tagName || "element").toLowerCase());
      if (sender.id) {
        parts.push(`#${sender.id}`);
      }
      try {
        const node = qhtmlNodeForDomElement(sender, registry || sender.__qhtmlRegistry || null);
        const nodeLabel = qhtmlExecutionNodeLabel(node);
        if (nodeLabel) {
          parts.push(`node=${nodeLabel}`);
        }
      } catch (error) {
        parts.push("node=<unresolved>");
      }
      return parts.join(" ");
    }
    if (sender.qhtmlName) {
      parts.push(`name=${sender.qhtmlName}`);
    }
    if (sender.name && sender.name !== sender.qhtmlName) {
      parts.push(`name=${sender.name}`);
    }
    if (sender.qhtmlUUID) {
      parts.push(`uuid=${sender.qhtmlUUID}`);
    }
    if (sender.htmlNode) {
      const nodeLabel = qhtmlExecutionNodeLabel(sender.htmlNode);
      if (nodeLabel) {
        parts.push(`node=${nodeLabel}`);
      }
    }
    return parts.length ? parts.join(" ") : Object.prototype.toString.call(sender);
  }

  function qhtmlExecutionArgsLabel(args) {
    return Array.from(args || []).map((arg) => {
      if (arg && arg.nodeType === 1) {
        return `<${String(arg.tagName || "element").toLowerCase()}${arg.id ? `#${arg.id}` : ""}>`;
      }
      if (arg && arg.type && arg.target) {
        return `[Event ${arg.type}]`;
      }
      if (typeof arg === "string") {
        return JSON.stringify(arg);
      }
      if (typeof arg === "number" || typeof arg === "boolean" || arg == null) {
        return String(arg);
      }
      return Object.prototype.toString.call(arg);
    }).join(", ");
  }

  function reportQHTMLExecutionContext(error, context, registry) {
    if (!context || !globalScope.console || typeof globalScope.console.error !== "function") {
      return;
    }
    const sender = context.sender || context.domElement || context.ownerElement || null;
    const pieces = [];
    if (context.kind) {
      pieces.push(context.kind);
    }
    if (context.name) {
      pieces.push(String(context.name));
    }
    if (context.signalName) {
      pieces.push(`signal=${context.signalName}`);
    }
    if (context.eventName) {
      pieces.push(`event=${context.eventName}`);
    }
    if (context.parameters && context.parameters.length) {
      pieces.push(`parameters=(${context.parameters.join(", ")})`);
    }
    if (context.args) {
      pieces.push(`args=[${qhtmlExecutionArgsLabel(context.args)}]`);
    }
    const nodeLabel = qhtmlExecutionNodeLabel(context.node || context.signalNode || context.handlerNode || context.functionNode || context.actionNode || context.scriptNode || null);
    if (nodeLabel) {
      pieces.push(`node=${nodeLabel}`);
    }
    pieces.push(`from sender ${qhtmlExecutionSenderLabel(sender, registry || (sender && sender.__qhtmlRegistry) || null)}`);
    globalScope.console.error(`[QHTML7] Script execution failed from ${pieces.join("; ")}`, error);
  }

  function executeScriptBody(domElement, parameters, args, body, registry, executionContext) {
    const invocation = normalizeScriptInvocation(domElement, registry, parameters, args);
    const context = executionContextFor(domElement, registry, invocation.names);
    try {
      if (shouldUseQHTML6ForLegacySource(body) &&
          reportQHTMLRuntimeError(domElement, new Error("QHTML6 legacy script syntax requested"), registry)) {
        return undefined;
      }
      const callable = new Function(
        ...invocation.names,
        ...context.names,
        `with(this) {\n${expandQHTMLInlineScriptExpressions(body)}\n}`
      );
      return callable.apply(qhtmlExecutionObjectFor(domElement, registry), [...invocation.values, ...context.values]);
    } catch (error) {
      reportQHTMLExecutionContext(error, Object.assign({
        kind: "script",
        sender: domElement,
        parameters: invocation.names,
        args: invocation.values
      }, executionContext || {}), registry);
      if (reportQHTMLRuntimeError(domElement, error, registry)) {
        return undefined;
      }
      throw error;
    }
  }

  function executeFunctionBody(domElement, functionNode, args, body, signalContext, registry) {
    const parameters = splitList(typeof functionNode.parameters === "function" ? functionNode.parameters() : "");
    return executeScriptBody(domElement, parameters, args || [], body, registry, {
      kind: "function",
      name: typeof functionNode.qhtmlName === "function" ? functionNode.qhtmlName() : "",
      functionNode,
      sender: domElement,
      signalName: signalContext && signalContext.signal ? qhtmlNodeName(signalContext.signal) : "",
      args: args || []
    });
  }

  function stripMatchingQuotes(value) {
    const text = String(value || "").trim();
    if (text.length >= 2) {
      const first = text[0];
      const last = text[text.length - 1];
      if ((first === "\"" && last === "\"") || (first === "'" && last === "'")) {
        return text.slice(1, -1);
      }
    }
    return text;
  }

  function parsePrimitiveProperty(value) {
    const text = String(value || "").trim();
    if (/^[-+]?(?:\d+|\d*\.\d+)$/.test(text)) {
      return Number(text);
    }
    if (text === "true") {
      return true;
    }
    if (text === "false") {
      return false;
    }
    if (text === "null") {
      return null;
    }
    if (/^[-+]?(?:\d+|\d*\.\d+)(?:%|px|em|rem|vw|vh|vmin|vmax|ch|ex|cm|mm|in|pt|pc|deg|rad|turn|s|ms)$/.test(text)) {
      return text;
    }
    if ((text.startsWith("\"") && text.endsWith("\"")) || (text.startsWith("'") && text.endsWith("'"))) {
      return stripMatchingQuotes(text);
    }
    return undefined;
  }

  function parseStructuredProperty(value, domElement, registry) {
    const text = String(value || "").trim();
    const structured = (text.startsWith("[") && text.endsWith("]")) ||
      (text.startsWith("{") && text.endsWith("}"));
    if (!structured) {
      return undefined;
    }

    try {
      const names = [];
      const values = [];
      if (registry && registry.elementsByName) {
        registry.elementsByName.forEach((element, name) => {
          if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) {
            names.push(name);
            values.push(element);
          }
        });
      }
      names.push("$");
      values.push(createQHTMLSelectorHelper(domElement, registry));
      return Function(...names, `return (${text});`).apply(qhtmlExecutionObjectFor(domElement, registry), values);
    } catch (error) {
      return undefined;
    }
  }

  function qhtmlRuntimeFragment(source) {
    const tree = instantiateParserTree(String(source || "")).tree;
    return tree && typeof tree.renderHtml === "function" ? tree.renderHtml() : "";
  }

  function shouldUseQHTML6ForLegacySource(source) {
    const text = String(source || "")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\/\/.*$/gm, " ");
    return /(?:^|[^A-Za-z0-9_$])(?:this\s*\.\s*)?qdom\s*\(/.test(text);
  }

  function requestQHTML6LegacyQDomFallback(rootElement, methodName) {
    const error = new Error(`QHTML6 legacy qdom().${methodName}() requested`);
    return reportQHTMLRuntimeError(rootElement, error, rootElement && (rootElement.__qhtmlRegistry || rootElement.qhtmlComponentRegistry) || null);
  }

  function createQHTMLDomFacade(rootElement) {
    return {
      tree: rootElement ? rootElement.qhtmlDomTree || null : null,
      find(selector) {
        const element = rootElement && rootElement.querySelector
          ? rootElement.querySelector(String(selector || ""))
          : null;
        return createQHTMLDomSelection(rootElement, element);
      },
      slot() {
        if (requestQHTML6LegacyQDomFallback(rootElement, "slot")) {
          return "";
        }
        throw new TypeError("this.qdom(...).slot is not a function");
      },
      slots() {
        if (requestQHTML6LegacyQDomFallback(rootElement, "slots")) {
          return [];
        }
        throw new TypeError("this.qdom(...).slots is not a function");
      }
    };
  }

  function createQHTMLDomSelection(rootElement, element) {
    return {
      element,
      serialize() {
        const registry = rootElement && (rootElement.__qhtmlRegistry || rootElement.qhtmlComponentRegistry) || null;
        const node = qhtmlNodeForDomElement(element, registry);
        if (node && typeof node.sourceQHTML === "function") {
          return node.sourceQHTML();
        }
        return element ? element.outerHTML || "" : "";
      },
      replaceWithQHTML(source) {
        const parsed = instantiateParserTree(String(source || ""));
        const html = parsed.tree && typeof parsed.tree.renderHtml === "function"
          ? parsed.tree.renderHtml()
          : String(source || "");
        if (element) {
          element.outerHTML = html;
        }
        if (rootElement) {
          rootElement.__qhtmlLegacyDomMutated = true;
        }
        return this;
      }
    };
  }

  function loadQHTML6Runtime() {
    if (globalScope.__qhtml6FallbackRuntimePromise) {
      return globalScope.__qhtml6FallbackRuntimePromise;
    }
    globalScope.__qhtml6FallbackRuntimePromise = new Promise((resolve, reject) => {
      if (globalScope.QHtml6) {
        resolve(globalScope.QHtml6);
        return;
      }
      const script = document.createElement("script");
      script.async = false;
      script.onload = function onQHTML6Loaded() {
        resolve(globalScope.QHtml6 || null);
      };
      script.onerror = function onQHTML6Error() {
        reject(new Error("QHTML6 fallback script failed to load."));
      };
      script.src = globalScope.QHTML6_SCRIPT_URL || new URL("qhtml6/qhtml.js", QHTML7_RUNTIME_BASE).href;
      document.head.appendChild(script);
    });
    return globalScope.__qhtml6FallbackRuntimePromise;
  }

  function createClonedQHTMLFallbackElement(tagName, source, attributes) {
    const template = document.createElement("template");
    const element = document.createElement(tagName);
    Array.from(attributes || []).forEach((attribute) => {
      if (attribute && attribute.name) {
        element.setAttribute(attribute.name, attribute.value);
      }
    });
    element.removeAttribute("ready");
    element.innerHTML = String(source || "");
    template.content.appendChild(element);
    return template.content.firstElementChild.cloneNode(true);
  }

  const QHTML_HOST_TRANSFER_KEYS = [
    "qhtmlSource",
    "qhtmlResolvedSource",
    "qhtmlParser",
    "qhtmlDomTree",
    "qhtmlDom",
    "qhtmlNode",
    "qhtmlComponentRegistry",
    "qhtmlStyles",
    "qhtmlTransitions",
    "qhtmlThemes",
    "qhtmlTimers",
    "qhtmlAnimations",
    "qhtmlPainters",
    "qhtmlComponentDefinitions",
    "qhtmlWorkers",
    "qhtmlClasses",
    "qhtmlClassInstances",
    "__qhtmlRegistry",
    "__qhtmlCallbacks",
    "__qhtmlVars",
    "__qhtml7Mounted",
    "__qhtmlAllowRuntimeFallback",
    "__qhtmlOriginalVersion",
    "__qhtmlFallbackStarted",
    "__qhtml7RuntimeDisposed"
  ];

  function markQHTMLHostReady(element, runtimeName) {
    if (!element) {
      return element;
    }
    element.setAttribute("ready", "1");
    if (runtimeName) {
      element.setAttribute("qhtml-runtime", runtimeName);
    }
    return element;
  }

  function copyQHTMLHostRuntimeState(sourceElement, targetElement) {
    if (!sourceElement || !targetElement) {
      return;
    }
    QHTML_HOST_TRANSFER_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(sourceElement, key)) {
        targetElement[key] = sourceElement[key];
      }
    });
    const registry = targetElement.__qhtmlRegistry || targetElement.qhtmlComponentRegistry;
    if (registry && typeof registry === "object") {
      registry.rootElement = targetElement;
    }
  }

  function promoteParserHostToQHTML(element, source, runtimeName) {
    if (!element) {
      return element;
    }
    markQHTMLHostReady(element, runtimeName);
    if (runtimeName === "qhtml6") {
      dispatchQHTMLContentLoadedSoon();
      resumeQHTML6RunningComponents(element);
      return element;
    }
    const currentTag = String(element.tagName || "").trim().toLowerCase();
    if (currentTag === ELEMENT_NAME) {
      element.__qhtmlFacilitatorFinalized = true;
      return element;
    }
    if (!element.parentNode) {
      return element;
    }

    const qhtmlElement = document.createElement(ELEMENT_NAME);
    Array.from(element.attributes || []).forEach((attribute) => {
      qhtmlElement.setAttribute(attribute.name, attribute.value);
    });
    if (runtimeName === "qhtml6") {
      qhtmlElement.setAttribute("version", "6");
    } else if (runtimeName === "qhtml7") {
      qhtmlElement.setAttribute("version", "7");
    }
    qhtmlElement.qhtmlSource = String(source || element.qhtmlSource || "");
    qhtmlElement.__qhtmlFacilitatorFinalized = true;
    qhtmlElement.__qhtmlParserHost = element;
    qhtmlElement.__qhtmlAllowRuntimeFallback = element.__qhtmlAllowRuntimeFallback === true;
    element.__qhtmlPromotingToQHTML = true;
    copyQHTMLHostRuntimeState(element, qhtmlElement);
    while (element.firstChild) {
      qhtmlElement.appendChild(element.firstChild);
    }
    markQHTMLHostReady(qhtmlElement, runtimeName);
    element.replaceWith(qhtmlElement);
    qhtmlElement.dispatchEvent(new CustomEvent("QHTMLReady", {
      bubbles: true,
      detail: {
        source: qhtmlElement.qhtmlSource,
        qhtmlDom: qhtmlElement.qhtmlDomTree || null,
        runtime: runtimeName || "",
        parserHost: element
      }
    }));
    dispatchQHTMLContentLoadedSoon();
    if (runtimeName === "qhtml6") {
      resumeQHTML6RunningComponents(qhtmlElement);
    }
    return qhtmlElement;
  }

  function resumeQHTML6RunningComponents(rootElement) {
    if (!rootElement || typeof rootElement.querySelectorAll !== "function") {
      return;
    }
    const selector = [
      "q-property-animation",
      "q-parallel-animation",
      "q-sequential-animation",
      "q-parallel-animation-group",
      "q-sequential-animation-group",
      "q-animation-queue"
    ].join(",");
    let attempts = 0;
    const resume = () => {
      attempts += 1;
      const components = Array.from(rootElement.querySelectorAll(selector));
      components.forEach((component) => {
        if (component.__qhtml6FallbackResumeStarted === true) {
          return;
        }
        const running = String(component.running == null ? "" : component.running).trim().toLowerCase();
        if (running !== "true" && running !== "1" && running !== "yes" && running !== "on") {
          return;
        }
        if (component.__qPropertyAnimationTimer || typeof component.start !== "function") {
          return;
        }
        component.__qhtml6FallbackResumeStarted = true;
        try {
          component.start();
        } catch (error) {
          component.__qhtml6FallbackResumeStarted = false;
          if (!reportQHTMLRuntimeError(component, error, component.__qhtmlRegistry || null)) {
            throw error;
          }
        }
      });
      if (attempts < 5) {
        globalScope.setTimeout(resume, 50);
      }
    };
    globalScope.setTimeout(resume, 0);
  }

  function replaceWithQHTMLError(element, source, error) {
    const errorElement = createClonedQHTMLFallbackElement(ELEMENT_NAME_ERROR, source, element ? element.attributes : []);
    errorElement.setAttribute("ready", "-1");
    errorElement.setAttribute("qhtml-error", error && error.message ? error.message : String(error || "QHTML mount failed"));
    if (element && element.parentNode) {
      element.replaceWith(errorElement);
    }
    return errorElement;
  }

  function stopRuntimeObjectCollection(collection) {
    if (!collection) {
      return;
    }
    const stopOne = (item) => {
      if (item && typeof item.stop === "function") {
        item.stop();
      }
    };
    if (collection instanceof Map) {
      collection.forEach(stopOne);
      return;
    }
    if (Array.isArray(collection)) {
      collection.forEach(stopOne);
      return;
    }
    Object.keys(collection).forEach((key) => stopOne(collection[key]));
  }

  function isQHTML7RegistryDisposed(registry) {
    return !!(registry && registry.rootElement && registry.rootElement.__qhtml7RuntimeDisposed === true);
  }

  function teardownQHTML7Host(element) {
    if (!element || element.__qhtml7RuntimeDisposed === true) {
      return;
    }
    element.__qhtml7RuntimeDisposed = true;
    const registry = element.__qhtmlRegistry || element.qhtmlComponentRegistry || null;
    if (registry && typeof registry.stopTimers === "function") {
      registry.stopTimers();
    }
    if (registry) {
      stopRuntimeObjectCollection(registry.timersByUuid);
      stopRuntimeObjectCollection(registry.timersByName);
      stopRuntimeObjectCollection(registry.animationsByUuid);
      stopRuntimeObjectCollection(registry.animationsByName);
      stopRuntimeObjectCollection(registry.timers);
      stopRuntimeObjectCollection(registry.animations);
    }
    stopRuntimeObjectCollection(element.qhtmlTimers);
    stopRuntimeObjectCollection(element.qhtmlAnimations);
    element.__qhtml7Mounted = false;
    element.qhtmlParser = null;
    element.qhtmlDomTree = null;
    element.qhtmlDom = null;
    element.__qhtmlRegistry = null;
    element.qhtmlComponentRegistry = null;
    element.qhtmlTimers = null;
    element.qhtmlAnimations = null;
  }

  function qhtmlRuntimeErrorHost(domElement, registry) {
    const registryRoot = registry && registry.rootElement ? registry.rootElement : null;
    if (registryRoot && registryRoot.nodeType === 1) {
      return registryRoot;
    }
    if (domElement && domElement.nodeType === 1) {
      const host = domElement.closest ? domElement.closest(`${ELEMENT_NAME_7},${ELEMENT_NAME}`) : null;
      return host || domElement;
    }
    const owner = domElement && domElement.ownerElement ? domElement.ownerElement : null;
    if (owner && owner.nodeType === 1) {
      return owner.closest ? owner.closest(`${ELEMENT_NAME_7},${ELEMENT_NAME}`) || owner : owner;
    }
    return null;
  }

  function reportQHTMLRuntimeError(domElement, error, registry) {
    const host = qhtmlRuntimeErrorHost(domElement, registry);
    if (!host) {
      return false;
    }
    if (host.__qhtmlFallbackStarted === true) {
      return true;
    }
    const tagName = String(host.tagName || "").trim().toLowerCase();
    if (tagName === ELEMENT_NAME_7) {
      host.__qhtmlFallbackStarted = true;
      host.setAttribute("ready", "-1");
      host.dispatchEvent(new CustomEvent("QHTMLError", {
        bubbles: true,
        detail: { error }
      }));
      return true;
    }
    if (tagName !== ELEMENT_NAME || host.__qhtmlAllowRuntimeFallback !== true) {
      return false;
    }
    host.__qhtmlFallbackStarted = true;
    host.setAttribute("ready", "-1");
    const source = host.qhtmlSource || host.innerHTML || "";
    transitionToQHTML6Host(host, source, error)
      .then((qhtmlElement) => {
        qhtmlElement.dispatchEvent(new CustomEvent("QHTMLFallback", {
          bubbles: true,
          detail: { qhtml7Error: error, runtime: "qhtml6" }
        }));
      })
      .catch((fallbackError) => {
        const errorElement = replaceWithQHTMLError(host, source, fallbackError);
        errorElement.dispatchEvent(new CustomEvent("QHTMLFallbackError", {
          bubbles: true,
          detail: { qhtml7Error: error, qhtml6Error: fallbackError }
        }));
      });
    return true;
  }

  function createVersionedQHTMLHost(version, source, attributes) {
    const template = document.createElement("template");
    const element = document.createElement(String(version || "") === "6" ? ELEMENT_NAME_6 : ELEMENT_NAME);
    Array.from(attributes || []).forEach((attribute) => {
      if (!attribute || !attribute.name) {
        return;
      }
      if (attribute.name === "ready" || attribute.name === "qhtml-runtime" || attribute.name === "version") {
        return;
      }
      element.setAttribute(attribute.name, attribute.value);
    });
    element.setAttribute("version", String(version || ""));
    element.innerHTML = String(source || "");
    template.content.appendChild(element);
    const clone = template.content.firstElementChild.cloneNode(true);
    clone.qhtmlSource = String(source || "");
    return clone;
  }

  function transitionToQHTML6Host(element, source, qhtml7Error) {
    const originalSource = String(source || (element && element.qhtmlSource) || "");
    const parent = element && element.parentNode ? element.parentNode : null;
    teardownQHTML7Host(element);
    const qhtml6Host = createVersionedQHTMLHost("6", originalSource, element ? element.attributes : []);
    qhtml6Host.__qhtml7RuntimeDisposed = !!qhtml7Error;
    if (qhtml7Error) {
      qhtml6Host.setAttribute("qhtml7-error", qhtml7Error && qhtml7Error.message ? qhtml7Error.message : String(qhtml7Error || ""));
    }
    qhtml6Host.setAttribute("ready", "0");
    if (element) {
      element.innerHTML = "";
    }
    if (parent && element) {
      parent.replaceChild(qhtml6Host, element);
    }
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        parent && parent.removeEventListener("QHTMLReady", onReady, true);
        parent && parent.removeEventListener("QHTMLFallbackError", onError, true);
      };
      const onReady = (event) => {
        const target = event && event.target ? event.target : null;
        if (!target || String(target.tagName || "").trim().toLowerCase() !== ELEMENT_NAME_6) {
          return;
        }
        if (target.getAttribute("version") !== "6") {
          return;
        }
        cleanup();
        resolve(target);
      };
      const onError = (event) => {
        cleanup();
        reject(event && event.detail && event.detail.qhtml6Error ? event.detail.qhtml6Error : new Error("QHTML6 fallback failed"));
      };
      if (parent) {
        parent.addEventListener("QHTMLReady", onReady, true);
        parent.addEventListener("QHTMLFallbackError", onError, true);
      }
      globalScope.setTimeout(() => {
        const current = parent && parent.querySelector ? parent.querySelector(`${ELEMENT_NAME_6}[version="6"]`) : null;
        if (current && current.getAttribute("ready") === "1") {
          cleanup();
          resolve(current);
        }
      }, 0);
    });
  }

  async function fallbackToQHTML6(element, source, qhtml7Error) {
    teardownQHTML7Host(element);
    const runtime = await loadQHTML6Runtime();
    const fallbackElement = createClonedQHTMLFallbackElement(ELEMENT_NAME_6, source, element ? element.attributes : []);
    fallbackElement.__qhtml7RuntimeDisposed = !!qhtml7Error;
    fallbackElement.setAttribute("version", "6");
    if (qhtml7Error) {
      fallbackElement.setAttribute("qhtml7-error", qhtml7Error && qhtml7Error.message ? qhtml7Error.message : String(qhtml7Error || ""));
    }
    if (element && element.parentNode) {
      element.replaceWith(fallbackElement);
    }
    try {
      const mountQHTML6 = runtime && (
        typeof runtime.mountQHtml6Element === "function"
          ? runtime.mountQHtml6Element
          : runtime.mountQHtmlElement
      );
      if (typeof mountQHTML6 === "function") {
        const binding = mountQHTML6.call(runtime, fallbackElement);
        if (binding && binding.ready && typeof binding.ready.then === "function") {
          await binding.ready;
        }
      } else if (runtime && typeof runtime.initAll === "function") {
        runtime.initAll(fallbackElement.ownerDocument || document);
      }
    } catch (error) {
      replaceWithQHTMLError(fallbackElement, source, error);
      throw error;
    }
    return promoteParserHostToQHTML(fallbackElement, source, "qhtml6");
  }

  function scopedQHTMLBinding(name, domElement, registry) {
    const wanted = String(name || "");
    let current = domElement || null;
    while (current) {
      if (current.__qhtmlCallbacks && Object.prototype.hasOwnProperty.call(current.__qhtmlCallbacks, wanted)) {
        return current.__qhtmlCallbacks[wanted];
      }
      if (current.__qhtmlVars && Object.prototype.hasOwnProperty.call(current.__qhtmlVars, wanted)) {
        return current.__qhtmlVars[wanted];
      }
      current = current.parentElement || null;
    }
    const rootElement = registry && registry.rootElement ? registry.rootElement : null;
    if (rootElement && rootElement !== domElement) {
      if (rootElement.__qhtmlCallbacks && Object.prototype.hasOwnProperty.call(rootElement.__qhtmlCallbacks, wanted)) {
        return rootElement.__qhtmlCallbacks[wanted];
      }
      if (rootElement.__qhtmlVars && Object.prototype.hasOwnProperty.call(rootElement.__qhtmlVars, wanted)) {
        return rootElement.__qhtmlVars[wanted];
      }
    }
    return undefined;
  }

  function addScopedQHTMLContextBindings(add, domElement, registry) {
    const added = new Set();
    const addStore = function (store) {
      Object.keys(store || {}).forEach((name) => {
        if (added.has(name)) {
          return;
        }
        added.add(name);
        add(name, store[name]);
      });
    };

    let current = domElement || null;
    while (current) {
      addStore(current.__qhtmlCallbacks);
      addStore(current.__qhtmlVars);
      current = current.parentElement || null;
    }

    const rootElement = registry && registry.rootElement ? registry.rootElement : null;
    if (rootElement && rootElement !== domElement) {
      addStore(rootElement.__qhtmlCallbacks);
      addStore(rootElement.__qhtmlVars);
    }
  }

  function addQHTMLRootContextBindings(add) {
    const rootContext = globalScope.QHtml && globalScope.QHtml.rootContext ? globalScope.QHtml.rootContext : null;
    Object.keys(rootContext || {}).forEach((name) => add(name, rootContext[name]));
  }

  function decodeQHTMLScriptEntities(body) {
    return String(body || "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'");
  }

  function expandQHTMLInlineScriptExpressions(body) {
    return decodeQHTMLScriptEntities(body)
      .replace(/\$\{([^}]+)\}/g, (match, expression) => `(${String(expression || "").trim()})`);
  }

  function sanitizeQHTMLPublicHtml(html) {
    return String(html || "")
      .replace(/\s+qhtml-node="[^"]*"/g, "");
  }

  function parseQHTMLJsonNodeToJs(qhtmlJsonNode) {
    if (!qhtmlJsonNode || typeof qhtmlJsonNode !== "object") {
      return undefined;
    }
    const nodeType = qhtmlNodeType(qhtmlJsonNode);
    if (!["QHTMLJsonDocument", "QHTMLJsonArray", "QHTMLJsonObject", "QHTMLJsonValue"].includes(nodeType)) {
      return undefined;
    }
    const jsonText = typeof qhtmlJsonNode.toJson === "function"
      ? qhtmlJsonNode.toJson()
      : (typeof qhtmlJsonNode.valuesLiteral === "function" ? qhtmlJsonNode.valuesLiteral() : "");
    if (typeof jsonText !== "string" || !jsonText.trim()) {
      return undefined;
    }
    return JSON.parse(jsonText);
  }

  function structuredPropertyNodeValue(propertyNode) {
    if (!propertyNode || typeof propertyNode.structuredValue !== "function") {
      return undefined;
    }
    const structuredNode = propertyNode.structuredValue();
    return parseQHTMLJsonNodeToJs(structuredNode);
  }

  function runtimeStoredPropertyValue(owner, name) {
    if (!owner || !name) {
      return undefined;
    }
    if (owner.__qhtmlRuntimeProperties &&
        Object.prototype.hasOwnProperty.call(owner.__qhtmlRuntimeProperties, name)) {
      return owner.__qhtmlRuntimeProperties[name];
    }
    if (owner.__qhtmlProperties &&
        Object.prototype.hasOwnProperty.call(owner.__qhtmlProperties, name)) {
      const entry = owner.__qhtmlProperties[name];
      return entry ? entry.value : undefined;
    }
    return undefined;
  }

  function writeRuntimeStoredProperty(owner, name, value) {
    if (!owner || !name) {
      return false;
    }
    if (owner.__qhtmlRuntimeProperties &&
        Object.prototype.hasOwnProperty.call(owner.__qhtmlRuntimeProperties, name)) {
      owner[name] = value;
      return true;
    }
    if (owner.__qhtmlProperties &&
        Object.prototype.hasOwnProperty.call(owner.__qhtmlProperties, name)) {
      owner[name] = value;
      return true;
    }
    return false;
  }

  function qhtmlReferenceResolveKey(referenceNode) {
    const uuid = qhtmlNodeUuid(referenceNode);
    if (uuid) {
      return uuid;
    }
    return `${qhtmlNodeType(referenceNode)}:${qhtmlNodeName(referenceNode)}`;
  }

  function qhtmlResolvingReferenceSet(registry) {
    if (!registry) {
      return null;
    }
    if (!registry.__qhtmlResolvingReferences) {
      registry.__qhtmlResolvingReferences = new Set();
    }
    return registry.__qhtmlResolvingReferences;
  }

  function ensureQHTMLRuntimeFunctionStore(owner) {
    if (!owner) {
      return null;
    }
    if (!owner.__qhtmlFunctions) {
      try {
        Object.defineProperty(owner, "__qhtmlFunctions", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: Object.create(null)
        });
      } catch (error) {
        return null;
      }
    }
    if (!owner.__qhtmlFunctionsByUuid) {
      try {
        Object.defineProperty(owner, "__qhtmlFunctionsByUuid", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: Object.create(null)
        });
      } catch (error) {
        return owner.__qhtmlFunctions;
      }
    }
    return owner.__qhtmlFunctions;
  }

  function storedQHTMLRuntimeFunction(owner, name, uuid) {
    if (!owner) {
      return undefined;
    }
    const functionsByName = owner.__qhtmlFunctions;
    if (functionsByName && name && typeof functionsByName[name] === "function") {
      return functionsByName[name];
    }
    const functionsByUuid = owner.__qhtmlFunctionsByUuid;
    if (functionsByUuid && uuid && typeof functionsByUuid[uuid] === "function") {
      return functionsByUuid[uuid];
    }

    // Never evaluate owner[name] here. The property may be a lexical QHTML
    // accessor whose getter called runtimeValueForQHTMLReference(), which would
    // recursively resolve the same function until the stack overflows.
    const descriptor = name ? Object.getOwnPropertyDescriptor(owner, name) : null;
    if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") &&
        typeof descriptor.value === "function") {
      return descriptor.value;
    }
    return undefined;
  }

  function runtimeValueForQHTMLReference(referenceNode, registry, selfElement) {
    if (!referenceNode || !registry) {
      return undefined;
    }
    const type = qhtmlNodeType(referenceNode);
    const name = qhtmlNodeName(referenceNode);
    const uuid = qhtmlNodeUuid(referenceNode);

    if (type === "QHTMLProperty") {
      const owner = ownerElementForQHTMLNode(referenceNode, registry) || selfElement || registry.rootElement;
      const stored = runtimeStoredPropertyValue(owner, name);
      if (typeof stored !== "undefined") {
        return stored;
      }
      const structured = structuredPropertyNodeValue(referenceNode);
      if (typeof structured !== "undefined") {
        return structured;
      }
      const rawValue = typeof referenceNode.value === "function" ? referenceNode.value() : "";
      const resolving = qhtmlResolvingReferenceSet(registry);
      const resolveKey = qhtmlReferenceResolveKey(referenceNode);
      if (resolving && resolving.has(resolveKey)) {
        return undefined;
      }
      if (resolving) {
        resolving.add(resolveKey);
      }
      try {
        return resolvePropertyValue(rawValue, owner || selfElement, referenceNode, registry);
      } finally {
        if (resolving) {
          resolving.delete(resolveKey);
        }
      }
    }

    if (type === "QHTMLPropertyAssignment") {
      const owner = ownerRuntimeObjectForQHTMLNode(referenceNode, registry) || selfElement || registry.rootElement;
      const stored = runtimeStoredPropertyValue(owner, name);
      if (typeof stored !== "undefined") {
        return stored;
      }
      const rawValue = typeof referenceNode.value === "function" ? referenceNode.value() : "";
      const resolving = qhtmlResolvingReferenceSet(registry);
      const resolveKey = qhtmlReferenceResolveKey(referenceNode);
      if (resolving && resolving.has(resolveKey)) {
        return undefined;
      }
      if (resolving) {
        resolving.add(resolveKey);
      }
      try {
        return resolvePropertyValue(rawValue, owner || selfElement, referenceNode, registry);
      } finally {
        if (resolving) {
          resolving.delete(resolveKey);
        }
      }
    }

    if (type === "QHTMLFunction") {
      const owner = ownerElementForQHTMLNode(referenceNode, registry) || selfElement || registry.rootElement;
      const candidates = [owner, selfElement, selfElement && selfElement.component];
      for (let index = 0; index < candidates.length; index += 1) {
        const callable = storedQHTMLRuntimeFunction(candidates[index], name, uuid);
        if (typeof callable === "function") {
          return callable;
        }
      }
      return undefined;
    }

    if (type === "QHTMLComponentDefinition") {
      return (uuid && registry.componentDefinitionsByUuid && registry.componentDefinitionsByUuid.get(uuid)) ||
             (name && registry.componentDefinitionsByName && registry.componentDefinitionsByName.get(name));
    }

    if (type === "QHTMLComponentInstance" ||
        type === "QHTMLDomElement" ||
        type === "QHTMLLayout" ||
        type === "QHTMLRowLayout" ||
        type === "QHTMLColumnLayout" ||
        type === "QHTMLModelView" ||
        type === "QHTMLCanvas" ||
        type === "QHTMLVideo" ||
        type === "QHTMLParticleEmitter") {
      return (uuid && registry.elementsByUuid && registry.elementsByUuid.get(uuid)) ||
             (name && registry.elementsByName && registry.elementsByName.get(name));
    }

    if (type === "QHTMLTimer") {
      return (uuid && registry.timersByUuid && registry.timersByUuid.get(uuid)) ||
             (name && registry.timersByName && registry.timersByName.get(name));
    }

    if (type === "QHTMLPropertyAnimation" || type === "QHTMLAnimationGroup") {
      return (uuid && registry.animationsByUuid && registry.animationsByUuid.get(uuid)) ||
             (name && registry.animationsByName && registry.animationsByName.get(name));
    }

    if (type === "QHTMLScriptAction") {
      return (uuid && registry.scriptActionsByUuid && registry.scriptActionsByUuid.get(uuid)) ||
             (name && registry.scriptActionsByName && registry.scriptActionsByName.get(name));
    }

    if (type === "QHTMLWorker") {
      return (uuid && registry.workersByUuid && registry.workersByUuid.get(uuid)) ||
             (name && registry.workersByName && registry.workersByName.get(name));
    }

    if (type === "QHTMLPainter") {
      return (uuid && registry.paintersByUuid && registry.paintersByUuid.get(uuid)) ||
             (name && registry.paintersByName && registry.paintersByName.get(name));
    }

    if (type === "QHTMLStyle") {
      return name && registry.stylesByName ? registry.stylesByName.get(name) : undefined;
    }

    if (type === "QHTMLTransition") {
      return (uuid && registry.transitionsByUuid && registry.transitionsByUuid.get(uuid)) ||
             (name && registry.transitionsByName && registry.transitionsByName.get(name));
    }

    if (type === "QHTMLTheme") {
      return name && registry.themesByName ? registry.themesByName.get(name) : undefined;
    }

    if (type === "QHTMLClass") {
      return (uuid && registry.qhtmlClassesByUuid && registry.qhtmlClassesByUuid.get(uuid)) ||
             (name && registry.qhtmlClassesByName && registry.qhtmlClassesByName.get(name));
    }

    return undefined;
  }

  function resolveLexicalQHTMLReference(name, registry, selfElement) {
    const contextNode = qhtmlNodeForDomElement(selfElement, registry);
    if (!contextNode) {
      return undefined;
    }
    const referenceNode = contextNode.resolve(name);
    return runtimeValueForQHTMLReference(referenceNode, registry, selfElement);
  }

  function addLexicalQHTMLContextBindings(add, domElement, registry) {
    const contextNode = qhtmlNodeForDomElement(domElement, registry);
    if (!contextNode) {
      return;
    }
    Array.from(contextNode.contextKeys() || []).forEach((name) => {
      const value = resolveLexicalQHTMLReference(name, registry, domElement);
      if (typeof value !== "undefined") {
        add(name, value);
      }
    });
  }

  function resolvePath(path, registry, selfElement) {
    const parts = String(path || "").trim().split(".").filter(Boolean);
    if (parts.length === 0 || !registry) {
      return undefined;
    }

    let value;
    if (parts[0] === "this") {
      value = selfElement;
    } else if (isOnPrefixedEventName(parts[0])) {
      value = eventSignalForPathPart(selfElement, parts[0], registry);
    } else {
      value = resolveLexicalQHTMLReference(parts[0], registry, selfElement);
    }
    if (typeof value === "undefined") {
      value = registry.elementsByName.get(parts[0]);
    }
    if (typeof value === "undefined" && registry.workersByName) {
      value = registry.workersByName.get(parts[0]);
    }
    if (typeof value === "undefined" && registry.loggersByName) {
      value = registry.loggersByName.get(parts[0]);
    }
    if (typeof value === "undefined") {
      value = selfElement ? selfElement[parts[0]] : undefined;
    }
    if (typeof value === "undefined" && registry && registry.rootElement) {
      value = registry.rootElement[parts[0]];
    }
    if (typeof value === "undefined") {
      value = scopedQHTMLBinding(parts[0], selfElement, registry);
    }
    if (typeof value === "undefined") {
      value = eventSignalForPathPart(selfElement, parts[0], registry);
    }
    if (typeof value === "undefined" && registry.qhtmlClassInstancesByName) {
      value = registry.qhtmlClassInstancesByName.get(parts[0]);
    }
    if (typeof value === "undefined" && registry.qhtmlClassesByName) {
      value = registry.qhtmlClassesByName.get(parts[0]);
    }
    if (typeof value === "undefined" && registry.animationsByName) {
      value = registry.animationsByName.get(parts[0]);
    }
    if (typeof value === "undefined" && registry.paintersByName) {
      value = registry.paintersByName.get(parts[0]);
    }
    if (typeof value === "undefined") {
      value = registry.globals && registry.globals[parts[0]];
    }

    for (let index = 1; index < parts.length; index += 1) {
      if (value == null) {
        return undefined;
      }
      if (typeof value[parts[index]] !== "undefined") {
        value = value[parts[index]];
        continue;
      }
      const eventSignal = eventSignalForPathPart(value, parts[index], registry);
      if (typeof eventSignal !== "undefined") {
        value = eventSignal;
        continue;
      }
      value = undefined;
    }
    return value;
  }

  function evaluateInlineTemplate(value, domElement, registry) {
    const text = String(value || "").trim();
    if (!(text.startsWith("`") && text.endsWith("`"))) {
      return undefined;
    }
    const templateBody = text.slice(1, -1);
    return templateBody.replace(/\$\{([^}]+)\}/g, (fullMatch, expression) => {
      const resolved = resolvePath(String(expression || "").trim(), registry, domElement);
      return typeof resolved === "undefined" || resolved === null ? "" : String(resolved);
    });
  }

  function resolvePropertyValue(rawValue, domElement, propertyNode, registry) {
    const text = String(rawValue || "").replace(/\s*\/\*[\s\S]*?\*\/\s*$/, "").trim();
    const templated = evaluateInlineTemplate(text, domElement, registry);
    if (typeof templated !== "undefined") {
      return templated;
    }

    const legacyStructured = legacyStructuredPropertyValue(propertyNode, text, domElement, registry);
    if (typeof legacyStructured !== "undefined") {
      return legacyStructured;
    }

    const structuredNode = structuredPropertyNodeValue(propertyNode);
    if (typeof structuredNode !== "undefined") {
      return structuredNode;
    }

    const structured = parseStructuredProperty(text, domElement, registry);
    if (typeof structured !== "undefined") {
      return structured;
    }

    const primitive = parsePrimitiveProperty(text);
    if (typeof primitive !== "undefined") {
      return primitive;
    }

    const callMatch = text.match(/^(.+?)\s*\(\s*\)$/);
    if (callMatch) {
      const callable = resolvePath(callMatch[1], registry, domElement);
      if (typeof callable === "function") {
        const owner = callable.__qhtmlElement || domElement;
        try {
          return callable.apply(owner, []);
        } catch (error) {
          reportQHTMLExecutionContext(error, {
            kind: "property-call-expression",
            name: callMatch[1],
            node: propertyNode,
            sender: owner,
            args: []
          }, registry);
          throw error;
        }
      }
      return undefined;
    }

    const resolved = resolvePath(text, registry, domElement);
    if (typeof resolved !== "undefined") {
      return resolved;
    }

    return text;
  }

  function bindFunction(domElement, functionNode) {
    if (!domElement || !functionNode || typeof functionNode.qhtmlName !== "function") {
      return;
    }
    const functionName = functionNode.qhtmlName();
    if (!functionName) {
      return;
    }

    const parameters = splitList(typeof functionNode.parameters === "function" ? functionNode.parameters() : "");
    const body = String(typeof functionNode.body === "function" ? functionNode.body() : "");
    const boundFunction = function (...args) {
      return executeScriptBody(domElement, parameters, args || [], body, domElement.__qhtmlRegistry, {
        kind: "function",
        name: functionName,
        functionNode,
        sender: domElement,
        args: args || []
      });
    };

    boundFunction.__qhtmlElement = domElement;
    boundFunction.__qhtmlFunctionNode = functionNode;
    boundFunction.__qhtmlFunctionBody = body;
    boundFunction.__qhtmlFunctionParameters = parameters.slice();

    const functionStore = ensureQHTMLRuntimeFunctionStore(domElement);
    if (functionStore) {
      functionStore[functionName] = boundFunction;
      const functionUuid = qhtmlNodeUuid(functionNode);
      if (functionUuid && domElement.__qhtmlFunctionsByUuid) {
        domElement.__qhtmlFunctionsByUuid[functionUuid] = boundFunction;
      }
    }
    boundFunction.__qhtmlInvokeFromSignal = function (args, signalContext) {
      return executeScriptBody(domElement, parameters, args || [], body, domElement.__qhtmlRegistry, {
        kind: "function-from-signal",
        name: functionName,
        functionNode,
        sender: signalContext && signalContext.sender ? signalContext.sender : domElement,
        signalNode: signalContext && signalContext.signal ? signalContext.signal : null,
        signalName: signalContext && signalContext.signal ? qhtmlNodeName(signalContext.signal) : "",
        args: args || []
      });
    };

    try {
      Object.defineProperty(domElement, functionName, {
        configurable: true,
        enumerable: false,
        writable: true,
        value: boundFunction
      });
    } catch (error) {
      try {
        domElement[functionName] = boundFunction;
      } catch (assignmentError) {
        // The hidden function store remains authoritative even when a native,
        // non-configurable DOM property prevents direct method exposure.
      }
    }
  }

  function createDomSignal(domElement, signalName, signalNode) {
    if (!domElement || !signalName) {
      return null;
    }
    if (!signalName) {
      return null;
    }

    const connections = [];
    const signalFunction = function (...args) {
      const transactionId = activePropertyTransactionId || signalFunction.__qhtmlPendingTransactionId || "";
      signalFunction.__qhtmlLastTransactionId = transactionId;
      signalFunction.__qhtmlPendingTransactionId = "";
      const serializedArgs = args.map((arg) => String(arg)).join(", ");
      if (typeof signalNode.emit === "function") {
        signalNode.emit(serializedArgs);
      }
      logQHTMLRuntime(
        domElement.__qhtmlRegistry,
        "QHTMLSignal",
        "Signal " + signalName + " emitted by " + (domElement.id || qhtmlNodeName(qhtmlNodeForDomElement(domElement, domElement.__qhtmlRegistry)) || "anonymous") + " with arguments [" + serializedArgs + "]",
        domElement
      );
      if (typeof domElement.dispatchEvent === "function" && typeof CustomEvent === "function") {
        domElement.dispatchEvent(new CustomEvent("QHTMLSignal", {
          bubbles: true,
          detail: { signal: signalName, signalNode, sender: domElement, args, transactionId }
        }));
      }
      const invokeConnections = () => connections.map((target) => {
        try {
          if (target && typeof target.__qhtmlInvokeFromSignal === "function") {
            return target.__qhtmlInvokeFromSignal(args, { signal: signalNode, sender: domElement, transactionId });
          }
          return typeof target === "function" ? target.apply(domElement, args) : undefined;
        } catch (error) {
          reportQHTMLExecutionContext(error, {
            kind: "signal-dispatch",
            signalName,
            signalNode,
            sender: domElement,
            args
          }, domElement.__qhtmlRegistry);
          throw error;
        }
      });
      return transactionId ? withPropertyTransaction(transactionId, invokeConnections) : invokeConnections();
    };

    signalFunction.connect = function (target) {
      if (!target) {
        return false;
      }
      if (target.__qhtmlFunctionNode && typeof signalNode.connect === "function") {
        signalNode.connect(target.__qhtmlFunctionNode);
      }
      connections.push(target);
      return true;
    };
    signalFunction.disconnectAll = function () {
      connections.length = 0;
    };
    signalFunction.disconnect = function (target) {
      const index = connections.indexOf(target);
      if (index < 0) {
        return false;
      }
      connections.splice(index, 1);
      return true;
    };
    signalFunction.connections = function () {
      return connections.slice();
    };
    signalFunction.lastTransactionId = function () {
      return signalFunction.__qhtmlLastTransactionId || "";
    };
    signalFunction.__qhtmlElement = domElement;
    signalFunction.__qhtmlSignalNode = signalNode;
    signalFunction.__qhtmlLastTransactionId = "";
    signalFunction.__qhtmlPendingTransactionId = "";

    return signalFunction;
  }

  function bindSignal(domElement, signalNode) {
    if (!domElement || !signalNode || typeof signalNode.qhtmlName !== "function") {
      return;
    }
    const signalName = signalNode.qhtmlName();
    if (!signalName) {
      return;
    }

    const signal = createDomSignal(domElement, signalName, signalNode);
    try {
      Object.defineProperty(domElement, signalName, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: signal
      });
    } catch (error) {
      domElement[signalName] = signal;
    }
    const normalizedName = String(signalName).toLowerCase();
    if (normalizedName && normalizedName !== signalName && typeof domElement[normalizedName] !== "function") {
      try {
        Object.defineProperty(domElement, normalizedName, {
          configurable: true,
          enumerable: true,
          writable: true,
          value: signal
        });
      } catch (error) {
        domElement[normalizedName] = signal;
      }
    }
  }

  function bindEventHandler(domElement, handlerNode) {
    if (!domElement || !handlerNode || typeof handlerNode.eventName !== "function") {
      return;
    }

    const eventName = stripEventOnPrefix(handlerNode.eventName());
    if (isPaintEventName(eventName) || eventName === "paint") {
      return;
    }
    const handlerUuid = typeof handlerNode.qhtmlUUID === "function" ? handlerNode.qhtmlUUID() : "";
    const bindingKey = handlerUuid || `${eventName}:${typeof handlerNode.body === "function" ? handlerNode.body() : ""}`;
    if (!domElement.__qhtmlBoundEventHandlers) {
      Object.defineProperty(domElement, "__qhtmlBoundEventHandlers", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: new Set()
      });
    }
    if (domElement.__qhtmlBoundEventHandlers.has(bindingKey)) {
      return;
    }
    const parameters = splitList(typeof handlerNode.parameters === "function" ? handlerNode.parameters() : "");
    const body = typeof handlerNode.body === "function" ? handlerNode.body() : "";
    const invoke = function (...args) {
      const invocation = eventHandlerExecution(parameters, args || []);
      return executeScriptBody(domElement, invocation.names, invocation.values, body, domElement.__qhtmlRegistry, {
        kind: "event-handler",
        name: eventName,
        eventName,
        handlerNode,
        sender: domElement,
        args: invocation.values
      });
    };
    invoke.__qhtmlElement = domElement;
    invoke.__qhtmlEventHandlerNode = handlerNode;
    invoke.__qhtmlInvokeFromSignal = function (args) {
      return invoke(...(args || []));
    };

    if (isDomElementLike(domElement) &&
        typeof handlerNode.propagate === "function" &&
        handlerNode.propagate()) {
      domElement.addEventListener(eventNameForDom(eventName), (event) => invoke(event), { capture: true });
      domElement.__qhtmlBoundEventHandlers.add(bindingKey);
      return;
    }

    const existingSignal = domElement[eventName] || domElement[eventSignalName(eventName)];
    if (existingSignal && typeof existingSignal.connect === "function") {
      existingSignal.connect(invoke);
      domElement.__qhtmlBoundEventHandlers.add(bindingKey);
      return;
    }

    const signal = ensureDomEventSignal(domElement, eventName, domElement.__qhtmlRegistry);
    if (signal && typeof signal.connect === "function") {
      signal.connect(invoke);
      domElement.__qhtmlBoundEventHandlers.add(bindingKey);
      return;
    }

    if (isDomElementLike(domElement)) {
      domElement.addEventListener(eventNameForDom(eventName), (event) => invoke(event));
      domElement.__qhtmlBoundEventHandlers.add(bindingKey);
    }
  }

  function connectDeclarations(body) {
    const text = String(body || "")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\/\/.*$/gm, " ")
      .replace(/;/g, " ");
    const tokens = text.split(/\s+/).map((token) => token.trim()).filter(Boolean);
    const declarations = [];
    for (let index = 0; index + 1 < tokens.length; index += 2) {
      declarations.push({ sourcePath: tokens[index], targetPath: tokens[index + 1] });
    }
    return declarations;
  }

  function bindConnect(domElement, connectNode, registry) {
    if (!domElement || !connectNode) {
      return;
    }
    const connectUuid = typeof connectNode.qhtmlUUID === "function" ? connectNode.qhtmlUUID() : "";
    if (connectUuid && registry && registry.boundConnectNodes && registry.boundConnectNodes.has(connectUuid)) {
      return;
    }

    let declarations = connectDeclarations(typeof connectNode.body === "function" ? connectNode.body() : "");
    const sourcePath = typeof connectNode.sourcePath === "function" ? connectNode.sourcePath() : "";
    const targetPath = typeof connectNode.targetPath === "function" ? connectNode.targetPath() : "";
    if (declarations.length === 0 && sourcePath && targetPath) {
      declarations.push({ sourcePath, targetPath });
    }

    domElement.__qhtmlConnections = domElement.__qhtmlConnections || [];
    declarations.forEach((declaration) => {
      const source = resolvePath(declaration.sourcePath, registry, domElement);
      const target = resolvePath(declaration.targetPath, registry, domElement);
      if (!source || typeof source.connect !== "function" || typeof target !== "function") {
        domElement.dispatchEvent(new CustomEvent("QHTMLConnectError", {
          bubbles: true,
          detail: { htmlNode: connectNode, sourcePath: declaration.sourcePath, targetPath: declaration.targetPath, source, target }
        }));
        return;
      }

      const connected = source.connect(target);
      domElement.__qhtmlConnections.push({
        htmlNode: connectNode,
        sourcePath: declaration.sourcePath,
        targetPath: declaration.targetPath,
        source,
        target,
        connected
      });
      domElement.dispatchEvent(new CustomEvent("QHTMLConnect", {
        bubbles: true,
        detail: { htmlNode: connectNode, sourcePath: declaration.sourcePath, targetPath: declaration.targetPath, source, target, connected }
      }));
    });
    if (connectUuid && registry && registry.boundConnectNodes) {
      registry.boundConnectNodes.add(connectUuid);
    }
  }

  function dispatchPropertyChange(domElement, propertyNode, propertyName, nextValue, transactionId) {
    withPropertyTransaction(transactionId, () => {
      syncLivePropertyToQHTMLNode(domElement, propertyName, nextValue);
      logQHTMLRuntime(
        domElement.__qhtmlRegistry,
        "QHTMLProperty",
        "Property " + propertyName + " changed on " + (domElement.id || qhtmlNodeName(qhtmlNodeForDomElement(domElement, domElement.__qhtmlRegistry)) || "anonymous") + " to " + String(nextValue),
        domElement
      );
      refreshRuntimeInterpolations(domElement, domElement.__qhtmlRegistry);
      const signalName = `${propertyName}changed`;
      if (typeof domElement[signalName] === "function") {
        domElement[signalName].__qhtmlPendingTransactionId = transactionId;
        domElement[signalName](nextValue);
      }
      if (typeof domElement.dispatchEvent === "function" && typeof CustomEvent === "function") {
        domElement.dispatchEvent(new CustomEvent(`${propertyName}changed`, {
          bubbles: true,
          detail: { property: propertyName, value: nextValue, htmlNode: propertyNode, transactionId }
        }));
        domElement.dispatchEvent(new CustomEvent("QHTMLPropertyChanged", {
          bubbles: true,
          detail: { property: propertyName, value: nextValue, htmlNode: propertyNode, transactionId }
        }));
      }
    });
  }

  function qhtmlRuntimeReferenceValue(value) {
    if (!value) {
      return null;
    }
    if (value.nodeType === 1) {
      const uuid = qhtmlDomUuid(value);
      return uuid ? { qhtmlReference: uuid } : null;
    }
    if (typeof value.qhtmlUUID === "function") {
      const uuid = String(value.qhtmlUUID() || "").trim();
      return uuid ? { qhtmlReference: uuid } : null;
    }
    if (typeof value.qhtmlUUID === "string" && value.qhtmlUUID.trim()) {
      return { qhtmlReference: value.qhtmlUUID.trim() };
    }
    if (typeof value.qhtmlObjectUuid === "string" && value.qhtmlObjectUuid.trim()) {
      return { qhtmlReference: value.qhtmlObjectUuid.trim() };
    }
    if (typeof value.uuid === "string" && value.uuid.trim()) {
      return { qhtmlReference: value.uuid.trim() };
    }
    return null;
  }

  function qhtmlGeneratedRuntimeReference(value) {
    if (!value || typeof value !== "object") {
      return null;
    }
    if (!value.__qhtmlRuntimeObjectUuid) {
      const uuid = `runtime-object-${Math.random().toString(36).slice(2)}`;
      Object.defineProperty(value, "__qhtmlRuntimeObjectUuid", {
        configurable: true,
        enumerable: false,
        writable: false,
        value: uuid
      });
    }
    return { qhtmlReference: value.__qhtmlRuntimeObjectUuid };
  }

  function isPlainSerializableObject(value) {
    if (!value || typeof value !== "object") {
      return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function qhtmlSerializablePropertyValue(value, seen) {
    if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    const reference = qhtmlRuntimeReferenceValue(value);
    if (reference) {
      return reference;
    }
    if (typeof value === "function" || typeof value === "symbol") {
      return String(value);
    }
    const activeSeen = seen || new WeakSet();
    if (typeof value === "object") {
      if (activeSeen.has(value)) {
        return { qhtmlCircularReference: true };
      }
      activeSeen.add(value);
      if (Array.isArray(value)) {
        return value.map((entry) => qhtmlSerializablePropertyValue(entry, activeSeen));
      }
      if (!isPlainSerializableObject(value)) {
        return qhtmlGeneratedRuntimeReference(value);
      }
      const out = {};
      Object.keys(value).forEach((key) => {
        out[key] = qhtmlSerializablePropertyValue(value[key], activeSeen);
      });
      return out;
    }
    return String(value);
  }

  function syncLivePropertyToQHTMLNode(domElement, propertyName, value) {
    const qhtmlNode = qhtmlNodeForDomElement(domElement, domElement && domElement.__qhtmlRegistry);
    if (!qhtmlNode || !propertyName || typeof qhtmlNode.setProperty !== "function") {
      return false;
    }
    return qhtmlNode.setProperty(String(propertyName), qhtmlSerializablePropertyValue(value)) !== false;
  }

  function syncLivePropertiesToQHTMLNode(domElement) {
    const properties = domElement && domElement.__qhtmlProperties;
    if (!properties) {
      return;
    }
    Object.keys(properties).forEach((propertyName) => {
      const entry = properties[propertyName];
      syncLivePropertyToQHTMLNode(domElement, propertyName, entry ? entry.value : undefined);
    });
  }

  function syncLivePropertiesInSubtree(rootElement) {
    if (!rootElement) {
      return;
    }
    syncLivePropertiesToQHTMLNode(rootElement);
    if (rootElement.querySelectorAll) {
      rootElement.querySelectorAll(QHTML_DOM_NODE_SELECTOR).forEach(syncLivePropertiesToQHTMLNode);
    }
  }

  function behaviorNodeForProperty(domElement, propertyName) {
    const ownerNode = qhtmlNodeForDomElement(domElement, domElement && domElement.__qhtmlRegistry);
    const count = ownerNode && typeof ownerNode.childCount === "function" ? ownerNode.childCount() : 0;
    const wanted = String(propertyName || "").toLowerCase();
    for (let index = 0; index < count; index += 1) {
      const child = ownerNode.childAt(index);
      if (qhtmlNodeType(child) !== "QHTMLBehavior") {
        continue;
      }
      const behaviorProperty = typeof child.propertyName === "function" ? child.propertyName() : qhtmlNodeName(child);
      if (String(behaviorProperty || "").toLowerCase() === wanted) {
        return child;
      }
    }
    return null;
  }

  function behaviorAnimationNode(behaviorNode) {
    const count = behaviorNode && typeof behaviorNode.childCount === "function" ? behaviorNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = behaviorNode.childAt(index);
      const type = qhtmlNodeType(child);
      if (type === "QHTMLPropertyAnimation" ||
          type === "QHTMLSequentialAnimation" ||
          type === "QHTMLParallelAnimation" ||
          type === "QHTMLScriptAction") {
        return child;
      }
    }
    return null;
  }

  function configureBehaviorAnimation(animation, propertyName, fromValue, toValue) {
    if (!animation || !animation.htmlNode) {
      return;
    }
    const node = animation.htmlNode;
    const type = qhtmlNodeType(node);
    if (type === "QHTMLPropertyAnimation") {
      animation.target = animation.ownerElement;
      animation.property = propertyName;
      if (!animationHasAssignment(node, "from") &&
          !animationHasAssignment(node, "start") &&
          !animationHasAssignment(node, "startValue")) {
        animation.from = fromValue;
      }
      animation.to = toValue;
      return;
    }
    if (typeof animation.children === "function") {
      animation.children().forEach((childAnimation) => {
        configureBehaviorAnimation(childAnimation, propertyName, fromValue, toValue);
      });
    }
  }

  function behaviorCompletionAnimation(animation, propertyName) {
    if (!animation || !animation.htmlNode) {
      return animation;
    }
    if (qhtmlNodeType(animation.htmlNode) === "QHTMLPropertyAnimation" &&
        String(animation.property || "").toLowerCase() === String(propertyName || "").toLowerCase()) {
      return animation;
    }
    if (typeof animation.children === "function") {
      const children = animation.children();
      for (let index = 0; index < children.length; index += 1) {
        const completion = behaviorCompletionAnimation(children[index], propertyName);
        if (completion) {
          return completion;
        }
      }
    }
    return animation;
  }

  function startPropertyBehavior(domElement, propertyNode, registry, propertyName, nextValue, previousValue, transactionId) {
    const behaviorNode = behaviorNodeForProperty(domElement, propertyName);
    const animationNode = behaviorAnimationNode(behaviorNode);
    const animation = runtimeAnimationForNode(animationNode, registry);
    if (!animation || typeof animation.start !== "function") {
      return false;
    }
    domElement.__qhtmlBehaviorStates = domElement.__qhtmlBehaviorStates || Object.create(null);
    const state = domElement.__qhtmlBehaviorStates[propertyName] || {};
    const token = (state.token || 0) + 1;
    state.token = token;
    state.suppress = true;
    domElement.__qhtmlBehaviorStates[propertyName] = state;
    configureBehaviorAnimation(animation, propertyName, previousValue, nextValue);
    if (state.animation && state.animation !== animation && typeof state.animation.stop === "function") {
      state.animation.stop();
    }
    state.animation = animation;
    const completionAnimation = behaviorCompletionAnimation(animation, propertyName);
    const finish = function () {
      if (completionAnimation && completionAnimation.finished && typeof completionAnimation.finished.disconnect === "function") {
        completionAnimation.finished.disconnect(finish);
      }
      if (state.token !== token) {
        return;
      }
      state.suppress = false;
      const entry = domElement.__qhtmlProperties && domElement.__qhtmlProperties[propertyName];
      if (entry) {
        entry.value = nextValue;
      }
      dispatchPropertyChange(domElement, propertyNode, propertyName, nextValue, transactionId);
    };
    if (completionAnimation && completionAnimation.finished && typeof completionAnimation.finished.connect === "function") {
      completionAnimation.finished.connect(finish);
    }
    animation.start();
    return true;
  }

  function bindProperty(domElement, propertyNode, registry) {
    try {
      if (!domElement || !propertyNode || typeof propertyNode.qhtmlName !== "function") {
        return;
      }
      const propertyName = propertyNode.qhtmlName();
      if (!propertyName) {
        return;
      }

      const rawValue = typeof propertyNode.value === "function" ? propertyNode.value() : "";
      const resolvedValue = resolvePropertyValue(rawValue, domElement, propertyNode, registry);
      const existingDescriptor = Object.getOwnPropertyDescriptor(domElement, propertyName);
      const hasPreboundValue = Boolean(existingDescriptor) &&
        Object.prototype.hasOwnProperty.call(existingDescriptor, "value");
      const initialValue = hasPreboundValue ? existingDescriptor.value : resolvedValue;
      domElement.__qhtmlProperties = Object.assign(domElement.__qhtmlProperties || {}, {
        [propertyName]: { rawValue, value: initialValue, htmlNode: propertyNode }
      });
      Object.defineProperty(domElement, propertyName, {
        configurable: true,
        enumerable: true,
        get() {
          return domElement.__qhtmlProperties[propertyName].value;
        },
        set(nextValue) {
          const entry = domElement.__qhtmlProperties[propertyName];
          const transactionId = currentPropertyTransactionId();
          const behaviorState = domElement.__qhtmlBehaviorStates && domElement.__qhtmlBehaviorStates[propertyName];
          if (behaviorState && behaviorState.suppress) {
            entry.value = nextValue;
            return;
          }
          if (entry.lastTransactionId === transactionId) {
            return;
          }
          entry.lastTransactionId = transactionId;
          if (startPropertyBehavior(domElement, propertyNode, registry, propertyName, nextValue, entry.value, transactionId)) {
            return;
          }
          entry.value = nextValue;
          syncLivePropertyToQHTMLNode(domElement, propertyName, nextValue);
          dispatchPropertyChange(domElement, propertyNode, propertyName, nextValue, transactionId);
        }
      });
    } catch (error) {
      if (reportQHTMLRuntimeError(domElement, error, registry)) {
        return;
      }
      throw error;
    }
  }

  function bindBehaviorTargetProperty(domElement, behaviorNode, registry) {
    if (!domElement || !behaviorNode) {
      return;
    }
    const propertyName = typeof behaviorNode.propertyName === "function" ? behaviorNode.propertyName() : qhtmlNodeName(behaviorNode);
    if (!propertyName || (domElement.__qhtmlProperties && domElement.__qhtmlProperties[propertyName])) {
      return;
    }
    const cssName = cssShortcutPropertyName(propertyName);
    const isCssShortcut = isCssShortcutAssignmentName(propertyName);
    const inlineValue = isCssShortcut && domElement.style
      ? domElement.style.getPropertyValue(cssName)
      : "";
    domElement.__qhtmlProperties = Object.assign(domElement.__qhtmlProperties || {}, {
      [propertyName]: { rawValue: inlineValue, value: inlineValue, htmlNode: behaviorNode }
    });
    Object.defineProperty(domElement, propertyName, {
      configurable: true,
      enumerable: true,
      get() {
        return domElement.__qhtmlProperties[propertyName].value;
      },
      set(nextValue) {
        const entry = domElement.__qhtmlProperties[propertyName];
        const transactionId = currentPropertyTransactionId();
        const behaviorState = domElement.__qhtmlBehaviorStates && domElement.__qhtmlBehaviorStates[propertyName];
        if (behaviorState && behaviorState.suppress) {
          entry.value = nextValue;
          return;
        }
        if (entry.lastTransactionId === transactionId) {
          return;
        }
        entry.lastTransactionId = transactionId;
        if (startPropertyBehavior(domElement, behaviorNode, registry, propertyName, nextValue, entry.value, transactionId)) {
          return;
        }
        entry.value = nextValue;
        if (isCssShortcut && domElement.style) {
          domElement.style.setProperty(cssName, serializeCssShortcutValue(cssName, nextValue));
        }
        syncLivePropertyToQHTMLNode(domElement, propertyName, nextValue);
        dispatchPropertyChange(domElement, behaviorNode, propertyName, nextValue, transactionId);
      }
    });
  }

  function bindBehaviorTargetProperties(domElement, qhtmlNode, registry) {
    const count = qhtmlNode && typeof qhtmlNode.childCount === "function" ? qhtmlNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLBehavior") {
        bindBehaviorTargetProperty(domElement, child, registry);
      }
    }
  }

  function propertyChangeSignalName(propertyNode) {
    const propertyName = qhtmlNodeName(propertyNode);
    return propertyName ? `${propertyName}changed` : "";
  }

  function bindPropertyChangeSignal(domElement, propertyNode, registry) {
    const signalName = propertyChangeSignalName(propertyNode);
    if (!domElement || !signalName) {
      return;
    }
    if (typeof domElement[signalName] !== "function") {
      domElement[signalName] = createDomSignal(domElement, signalName, propertyNode);
      domElement[signalName].__qhtmlPropertyNode = propertyNode;
    }
    const normalizedSignalName = signalName.toLowerCase();
    if (normalizedSignalName && normalizedSignalName !== signalName && typeof domElement[normalizedSignalName] !== "function") {
      domElement[normalizedSignalName] = domElement[signalName];
    }
    const camelSignalName = `${qhtmlNodeName(propertyNode)}Changed`;
    if (camelSignalName && camelSignalName !== signalName && typeof domElement[camelSignalName] !== "function") {
      domElement[camelSignalName] = domElement[signalName];
    }
    const definitionUuid = domElement.getAttribute && domElement.getAttribute("component-definition");
    if (definitionUuid && registry && registry.futurePropertySignalConnections) {
      const key = `${definitionUuid}::${signalName}`;
      const futureConnections = registry.futurePropertySignalConnections.get(key) || [];
      futureConnections.forEach((target) => domElement[signalName].connect(target));
    }
  }

  function componentInstanceAssignmentContext(domElement, registry) {
    const parentComponent = domElement && domElement.parentElement && domElement.parentElement.closest
      ? domElement.parentElement.closest("[component-instance]")
      : null;
    return parentComponent || (registry && registry.rootElement) || domElement;
  }

  function bindComponentInstancePropertyAssignments(domElement, instanceNode, registry) {
    if (!domElement || !instanceNode) {
      return;
    }
    const assignmentContext = componentInstanceAssignmentContext(domElement, registry);
    const count = typeof instanceNode.childCount === "function" ? instanceNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = instanceNode.childAt(index);
      if (qhtmlNodeType(child) !== "QHTMLPropertyAssignment") {
        continue;
      }
      const propertyName = qhtmlNodeName(child);
      if (!propertyName || !componentDefinitionHasProperty(instanceNode, propertyName)) {
        continue;
      }
      const rawValue = typeof child.value === "function" ? child.value() : "";
      const resolvedValue = resolvePropertyValue(rawValue, assignmentContext, child, registry);
      domElement[propertyName] = resolvedValue;
    }
  }

  function propertyNodesForDefinition(definitionNode) {
    const properties = [];
    walkQHTMLNode(definitionNode, (node) => {
      if (qhtmlNodeType(node) === "QHTMLProperty") {
        properties.push(node);
      }
    });
    return properties;
  }

  function createDefinitionPropertySignal(definitionProxy, definitionNode, signalName, registry) {
    const definitionUuid = typeof definitionNode.qhtmlUUID === "function" ? definitionNode.qhtmlUUID() : "";
    const key = `${definitionUuid}::${signalName}`;
    const signalFunction = function () {
      return [];
    };
    signalFunction.connect = function (target) {
      if (!target) {
        return false;
      }
      if (!registry.futurePropertySignalConnections.has(key)) {
        registry.futurePropertySignalConnections.set(key, []);
      }
      registry.futurePropertySignalConnections.get(key).push(target);
      return true;
    };
    signalFunction.disconnectAll = function () {
      registry.futurePropertySignalConnections.set(key, []);
    };
    signalFunction.connections = function () {
      return (registry.futurePropertySignalConnections.get(key) || []).slice();
    };
    signalFunction.__qhtmlComponentDefinition = definitionProxy;
    signalFunction.__qhtmlDefinitionNode = definitionNode;
    signalFunction.__qhtmlFuturePropertySignal = signalName;
    return signalFunction;
  }

  function createComponentDefinitionProxy(definitionNode, registry) {
    const definitionName = qhtmlNodeName(definitionNode);
    const definitionProxy = {
      name: definitionName,
      htmlNode: definitionNode,
      qhtmlUUID: typeof definitionNode.qhtmlUUID === "function" ? definitionNode.qhtmlUUID() : "",
      propertySignals: {}
    };
    propertyNodesForDefinition(definitionNode).forEach((propertyNode) => {
      const signalName = propertyChangeSignalName(propertyNode);
      if (!signalName || definitionProxy[signalName]) {
        return;
      }
      const signal = createDefinitionPropertySignal(definitionProxy, definitionNode, signalName, registry);
      definitionProxy[signalName] = signal;
      definitionProxy.propertySignals[signalName] = signal;
    });
    return definitionProxy;
  }

  function createRuntimeEventTarget() {
    if (typeof EventTarget === "function") {
      return new EventTarget();
    }
    const listeners = new Map();
    return {
      addEventListener(type, listener) {
        if (!type || typeof listener !== "function") {
          return;
        }
        if (!listeners.has(type)) {
          listeners.set(type, []);
        }
        listeners.get(type).push(listener);
      },
      removeEventListener(type, listener) {
        const bucket = listeners.get(type);
        if (!bucket) {
          return;
        }
        const index = bucket.indexOf(listener);
        if (index >= 0) {
          bucket.splice(index, 1);
        }
      },
      dispatchEvent(event) {
        const type = event && event.type ? event.type : "";
        const bucket = listeners.get(type) || [];
        bucket.slice().forEach((listener) => listener.call(this, event));
        return true;
      }
    };
  }

  function normalizeLoggerCategory(category) {
    const text = String(category == null ? "" : category).trim();
    if (!text) {
      return "";
    }
    if (text === "q-signal" || text === "signal" || text === "QHTMLSignal") {
      return "QHTMLSignal";
    }
    if (text === "q-property" || text === "property" || text === "QHTMLProperty") {
      return "QHTMLProperty";
    }
    if (text === "q-component" ||
        text === "component" ||
        text === "QHTMLComponent" ||
        text === "QHTMLComponentDefinition" ||
        text === "QHTMLComponentInstance") {
      return "QHTMLComponent";
    }
    if (text === "q-slot" ||
        text === "slot" ||
        text === "QHTMLSlot" ||
        text === "QHTMLComponentSlot" ||
        text === "QHTMLComponentInstanceSlot") {
      return "QHTMLSlot";
    }
    return text;
  }

  function loggerCategoriesFromNode(loggerNode) {
    const categories = new Set();
    const add = (value) => {
      const normalized = normalizeLoggerCategory(value);
      if (normalized) {
        categories.add(normalized);
      }
    };
    if (loggerNode && typeof loggerNode.categoryList === "function") {
      String(loggerNode.categoryList() || "").split(/\s+/).forEach(add);
    } else if (loggerNode && typeof loggerNode.categories === "function") {
      Array.from(loggerNode.categories() || []).forEach(add);
    } else {
      qhtmlNodeChildrenText(loggerNode).split(/\s+/).forEach(add);
    }
    return categories;
  }

  function callLoggerNodeMethod(loggerNode, methodName, args) {
    const jsMethodName = methodName + "Js";
    if (loggerNode && typeof loggerNode[methodName] === "function") {
      return loggerNode[methodName].apply(loggerNode, args);
    }
    if (loggerNode && typeof loggerNode[jsMethodName] === "function") {
      return loggerNode[jsMethodName].apply(loggerNode, args);
    }
    return undefined;
  }

  function createLiveLogger(loggerNode) {
    const loggerName = qhtmlNodeName(loggerNode);
    const loggerUuid = typeof loggerNode.qhtmlUUID === "function" ? loggerNode.qhtmlUUID() : "";
    const categories = loggerCategoriesFromNode(loggerNode);
    const entries = [];
    const logger = {
      htmlNode: loggerNode,
      qhtmlName: loggerName,
      qhtmlUUID: loggerUuid,
      categories() {
        return Array.from(categories);
      },
      entries() {
        return entries.slice();
      },
      setCategories(value) {
        categories.clear();
        const items = Array.isArray(value) ? value : String(value || "").split(/\s+/);
        items.forEach((item) => {
          const normalized = normalizeLoggerCategory(item);
          if (normalized) {
            categories.add(normalized);
          }
        });
        return callLoggerNodeMethod(loggerNode, "setCategoryList", [Array.from(categories).join(" ")]);
      },
      addCategory(value) {
        const normalized = normalizeLoggerCategory(value);
        if (normalized) {
          categories.add(normalized);
          return callLoggerNodeMethod(loggerNode, "addCategory", [normalized]);
        }
        return false;
      },
      removeCategory(value) {
        const normalized = normalizeLoggerCategory(value);
        categories.delete(normalized);
        return callLoggerNodeMethod(loggerNode, "removeCategory", [normalized]);
      },
      acceptsCategory(value) {
        const normalized = normalizeLoggerCategory(value);
        return !normalized || categories.size === 0 || categories.has(normalized);
      },
      log(message, category) {
        const normalized = normalizeLoggerCategory(category);
        if (!logger.acceptsCategory(normalized)) {
          return false;
        }
        const entry = normalized ? "[" + normalized + "] " + String(message) : String(message);
        entries.push(entry);
        callLoggerNodeMethod(loggerNode, "log", [String(message), normalized]);
        console.log("QHTMLLogger", entry);
        return true;
      },
      logSignal(message) {
        return logger.log(message, "QHTMLSignal");
      },
      logProperty(message) {
        return logger.log(message, "QHTMLProperty");
      },
      logComponent(message) {
        return logger.log(message, "QHTMLComponent");
      },
      logSlot(message) {
        return logger.log(message, "QHTMLSlot");
      }
    };
    return logger;
  }

  function registerRuntimeLogger(registry, loggerNode) {
    if (!registry || !loggerNode || qhtmlNodeType(loggerNode) !== "QHTMLLogger") {
      return null;
    }
    const loggerUuid = qhtmlNodeUuid(loggerNode);
    let logger = loggerUuid ? registry.loggersByUuid.get(loggerUuid) : null;
    if (!logger) {
      logger = createLiveLogger(loggerNode);
    }
    const loggerName = qhtmlNodeName(loggerNode);
    if (loggerName) {
      registry.loggersByName.set(loggerName, logger);
      registry.loggers[loggerName] = logger;
    }
    if (loggerUuid) {
      registry.loggersByUuid.set(loggerUuid, logger);
    }
    const ownerNode = qhtmlParentNode(loggerNode);
    const ownerUuid = qhtmlNodeUuid(ownerNode);
    if (ownerUuid) {
      registry.loggersByOwnerUuid.set(ownerUuid, logger);
    }
    return logger;
  }

  function refreshRuntimeLoggers(registry) {
    if (!registry || !registry.nodesByUuid) {
      return;
    }
    registry.loggersByName.clear();
    registry.loggersByUuid.clear();
    registry.loggersByOwnerUuid.clear();
    registry.loggers = {};
    registry.nodesByUuid.forEach((node) => {
      registerRuntimeLogger(registry, node);
    });
  }

  function qhtmlParentNode(node) {
    if (!node) {
      return null;
    }
    const accessors = ["qhtmlParent", "parent", "parentNode"];
    for (let index = 0; index < accessors.length; index += 1) {
      const accessor = accessors[index];
      if (typeof node[accessor] !== "function") {
        continue;
      }
      try {
        const parent = node[accessor]();
        if (parent && typeof parent.qhtmlType === "function") {
          return parent;
        }
      } catch (error) {
        continue;
      }
    }
    return null;
  }

  function qhtmlNodeChildren(node) {
    if (!node || typeof node.childList !== "function") {
      return [];
    }
    try {
      return Array.from(node.childList());
    } catch (error) {
      return [];
    }
  }

  function loggerForOwnerNode(registry, ownerNode) {
    const children = qhtmlNodeChildren(ownerNode);
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      if (qhtmlNodeType(child) !== "QHTMLLogger") {
        continue;
      }
      return registerRuntimeLogger(registry, child);
    }
    return null;
  }

  function nearestRuntimeLogger(registry, owner) {
    const ownerNode = owner && owner.nodeType === 1 ? qhtmlNodeForDomElement(owner, registry) : owner;
    let node = qhtmlTreeRoot(ownerNode) || null;
    while (node) {
      const logger = loggerForOwnerNode(registry, node);
      if (logger) {
        return logger;
      }
      node = qhtmlParentNode(node);
    }
    return null;
  }

  function logQHTMLRuntime(registry, category, message, owner) {
    if (!registry || !registry.loggersByUuid) {
      return 0;
    }
    const delivered = new Set();
    const emitToLogger = (candidate) => {
      if (!candidate) {
        return 0;
      }
      const loggerNode = candidate && candidate.nodeType === 1 ? qhtmlNodeForDomElement(candidate, registry) : (candidate.htmlNode || null);
      const loggerUuid = loggerNode ? qhtmlNodeUuid(loggerNode) : "";
      const key = loggerUuid || candidate.qhtmlUUID || "";
      if (key && delivered.has(key)) {
        return 0;
      }
      if (candidate.log(message, category)) {
        if (key) {
          delivered.add(key);
        }
        return 1;
      }
      return 0;
    };

    const logger = nearestRuntimeLogger(registry, owner);
    if (logger) {
      return emitToLogger(logger);
    }
    let count = 0;
    registry.loggersByUuid.forEach((candidate) => {
      if (count === 0) {
        count += emitToLogger(candidate);
      }
    });
    return count;
  }

  function createLiveWorker(workerNode, registry) {
    const worker = createRuntimeEventTarget();
    const workerName = qhtmlNodeName(workerNode);
    const workerUuid = typeof workerNode.qhtmlUUID === "function" ? workerNode.qhtmlUUID() : "";

    worker.htmlNode = workerNode;
    worker.qhtmlDomTree = registry ? registry.tree || null : null;
    worker.__qhtmlRegistry = registry || null;
    worker.__qhtmlWorkerNode = workerNode;
    worker.__qhtmlWorkerName = workerName;
    worker.__qhtmlWorkerUUID = workerUuid;
    installQHTMLParentFunction(worker, registry);
    worker.classList = worker.classList || {
      add() {},
      remove() {},
      contains() { return false; }
    };
    worker.style = worker.style || {
      setProperty() {},
      getPropertyValue() { return ""; }
    };
    worker.querySelector = worker.querySelector || function () { return null; };
    worker.querySelectorAll = worker.querySelectorAll || function () { return []; };
    worker.connect = function connectWorkerSignal(signalName, target) {
      const signal = typeof signalName === "string" ? worker[signalName] : signalName;
      if (signal && typeof signal.connect === "function") {
        return signal.connect(target);
      }
      return false;
    };
    worker.emit = function emitWorkerSignal(signalName, ...args) {
      const signal = worker[signalName];
      if (typeof signal === "function") {
        return signal(...args);
      }
      return undefined;
    };

    bindRuntimeChildren(worker, workerNode, registry);
    return worker;
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function qhtmlClassBodyForJavaScript(className, body) {
    let classBody = String(body || "");
    if (!className) {
      return classBody;
    }
    classBody = classBody.replace(
      new RegExp(`(^|\\n)(\\s*)${escapeRegExp(className)}\\s*\\(`, "g"),
      "$1$2constructor("
    );
    classBody = classBody.replace(
      /(^|\n)(\s*)function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g,
      "$1$2$3("
    );
    return classBody;
  }

  function parseQHTMLClassBody(body) {
    const source = String(body || "");
    const signalDeclarations = [];
    const declarationPattern = /(^|\n)([ \t]*)q-signal\s+([A-Za-z_$][A-Za-z0-9_$]*)(?:\s*\(([^)]*)\))?\s*;?[ \t]*(?=\n|$)/g;
    const strippedBody = source.replace(declarationPattern, function (match, linePrefix, indentation, signalName, parameters) {
      signalDeclarations.push({
        name: String(signalName || "").trim(),
        parameters: String(parameters || "").trim()
      });
      return linePrefix || "";
    }).trim();
    return { body: strippedBody, signalDeclarations };
  }

  function syntheticObjectSignalNode(ownerObject, signalName, parameters) {
    const normalizedName = String(signalName || "signal").trim() || "signal";
    const ownerUuid = ownerObject && ownerObject.qhtmlUUID ? String(ownerObject.qhtmlUUID) : "object";
    const uuid = `class-signal-${normalizedName}-${ownerUuid}-${Math.random().toString(36).slice(2)}`;
    const connected = [];
    return {
      qhtmlName: function () { return normalizedName; },
      qhtmlType: function () { return "QHTMLClassSignal"; },
      qhtmlUUID: function () { return uuid; },
      parameters: function () { return String(parameters || ""); },
      emit: function () {},
      connect: function (target) {
        connected.push(target);
        return true;
      },
      signalBus: function () { return null; },
      connected: function () { return connected.slice(); }
    };
  }

  function createQHTMLObjectSignal(ownerObject, signalName, parameters, signalNode) {
    const owner = ownerObject || globalScope;
    const normalizedName = String(signalName || "signal").trim() || "signal";
    const node = signalNode || syntheticObjectSignalNode(owner, normalizedName, parameters);
    return createObjectSignal(owner, node, normalizedName);
  }

  function installQHTMLSignalHelpers(target) {
    if (!target || (typeof target !== "object" && typeof target !== "function")) {
      return target;
    }
    if (typeof target.qhtmlSignal !== "function") {
      Object.defineProperty(target, "qhtmlSignal", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function qhtmlSignal(signalName, parameters) {
          const name = String(signalName || "signal").trim() || "signal";
          const signal = createQHTMLObjectSignal(this || target, name, parameters);
          if (isValidContextIdentifier(name)) {
            this[name] = signal;
          }
          return signal;
        }
      });
    }
    if (typeof target.qhtmlMakeSignal !== "function") {
      Object.defineProperty(target, "qhtmlMakeSignal", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function qhtmlMakeInstanceSignal(signalName, parameters) {
          if (typeof signalName === "string" && signalName.trim()) {
            return this.qhtmlSignal(signalName, parameters);
          }
          return createQHTMLObjectSignal(this || target, "signal", parameters);
        }
      });
    }
    return target;
  }

  function bindQHTMLClassInstanceSignals(instance, classObject) {
    if (!instance || !classObject) {
      return instance;
    }
    installQHTMLSignalHelpers(instance);
    const declarations = Array.isArray(classObject.qhtmlSignalDeclarations)
      ? classObject.qhtmlSignalDeclarations
      : [];
    declarations.forEach((declaration) => {
      const signalName = declaration && declaration.name ? String(declaration.name).trim() : "";
      if (!isValidContextIdentifier(signalName)) {
        return;
      }
      if (instance[signalName] && typeof instance[signalName].connect === "function") {
        return;
      }
      instance[signalName] = createQHTMLObjectSignal(instance, signalName, declaration.parameters);
    });
    return instance;
  }

  function qhtmlMakeSignal(ownerOrName, nameOrParameters, maybeParameters) {
    let owner = ownerOrName;
    let signalName = typeof nameOrParameters === "string" ? nameOrParameters : "signal";
    let parameters = maybeParameters;

    if (typeof ownerOrName === "string" || ownerOrName == null) {
      owner = (this && this !== globalScope) ? this : globalScope;
      signalName = ownerOrName || signalName;
      parameters = nameOrParameters;
    }

    return createQHTMLObjectSignal(owner || globalScope, signalName || "signal", parameters);
  }

  function installQHTMLSignalGlobals() {
    if (typeof globalScope.qhtmlMakeSignal !== "function") {
      Object.defineProperty(globalScope, "qhtmlMakeSignal", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: qhtmlMakeSignal
      });
    }
    if (globalScope.QHTML7 && typeof globalScope.QHTML7.makeSignal !== "function") {
      globalScope.QHTML7.makeSignal = qhtmlMakeSignal;
    }
  }

  installQHTMLSignalGlobals();

  function bindClassInstanceMethods(instance) {
    if (!instance || !instance.constructor || !instance.constructor.prototype) {
      return;
    }
    Object.getOwnPropertyNames(instance.constructor.prototype).forEach((name) => {
      if (name === "constructor" || typeof instance[name] !== "function") {
        return;
      }
      instance[name] = instance[name].bind(instance);
      instance[name].__qhtmlClassInstance = instance;
    });
  }

  function registerQHTMLClass(classNode, registry) {
    const className = qhtmlNodeName(classNode);
    if (!className || !registry) {
      return null;
    }
    if (registry.qhtmlClassesByName.has(className)) {
      return registry.qhtmlClassesByName.get(className);
    }

    const rawBody = typeof classNode.body === "function" ? classNode.body() : "";
    const parsedBody = parseQHTMLClassBody(rawBody);
    const body = parsedBody.body;
    const classBody = qhtmlClassBodyForJavaScript(className, body);
    const context = executionContextFor(registry.rootElement, registry, []);
    try {
      const factory = new Function(
        ...context.names,
        `"use strict"; return class ${className} { ${classBody} };`
      );
      const classObject = factory.apply(registry.rootElement, context.values);
      installQHTMLSignalHelpers(classObject.prototype);
      classObject.htmlNode = classNode;
      classObject.qhtmlName = className;
      classObject.qhtmlUUID = typeof classNode.qhtmlUUID === "function" ? classNode.qhtmlUUID() : "";
      classObject.qhtmlBody = body;
      classObject.qhtmlRawBody = rawBody;
      classObject.qhtmlSignalDeclarations = parsedBody.signalDeclarations;
      registry.qhtmlClassesByName.set(className, classObject);
      if (classObject.qhtmlUUID) {
        registry.qhtmlClassesByUuid.set(classObject.qhtmlUUID, classObject);
      }
      registry.qhtmlClasses[className] = classObject;
      globalScope[className] = classObject;
      registry.rootElement.dispatchEvent(new CustomEvent("QHTMLClassRegistered", {
        bubbles: true,
        detail: { htmlNode: classNode, name: className, classObject }
      }));
      return classObject;
    } catch (error) {
      registry.rootElement.dispatchEvent(new CustomEvent("QHTMLClassError", {
        bubbles: true,
        detail: { htmlNode: classNode, name: className, body, error }
      }));
      console.error("Unable to register QHTML class", className, error);
      return null;
    }
  }

  function registerQHTMLClasses(registry) {
    if (!registry || !registry.nodesByUuid) {
      return;
    }
    registry.nodesByUuid.forEach((node) => {
      if (qhtmlNodeType(node) === "QHTMLClass") {
        registerQHTMLClass(node, registry);
      }
    });
  }

  function constructorArgumentsForClassInstance(instanceNode, ownerElement, registry) {
    const args = [];
    const count = typeof instanceNode.childCount === "function" ? instanceNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = instanceNode.childAt(index);
      if (qhtmlNodeType(child) !== "QHTMLPropertyAssignment") {
        continue;
      }
      const rawValue = typeof child.value === "function" ? child.value() : "";
      args.push(resolvePropertyValue(rawValue, ownerElement, child, registry));
    }
    return args;
  }

  function instantiateQHTMLClassNode(instanceNode, registry) {
    if (!instanceNode || !registry || typeof instanceNode.keyword !== "function") {
      return null;
    }
    const className = instanceNode.keyword();
    const instanceName = qhtmlNodeName(instanceNode);
    const classObject = registry.qhtmlClassesByName.get(className);
    if (!classObject || !instanceName) {
      return null;
    }
    const instanceUuid = typeof instanceNode.qhtmlUUID === "function" ? instanceNode.qhtmlUUID() : "";
    if (instanceUuid && registry.qhtmlClassInstancesByUuid.has(instanceUuid)) {
      return registry.qhtmlClassInstancesByUuid.get(instanceUuid);
    }

    const ownerElement = ownerElementForQHTMLNode(instanceNode, registry) || registry.rootElement;
    const args = constructorArgumentsForClassInstance(instanceNode, ownerElement, registry);
    try {
      const instance = new classObject(...args);
      bindQHTMLClassInstanceSignals(instance, classObject);
      bindClassInstanceMethods(instance);
      instance.htmlNode = instanceNode;
      instance.qhtmlName = instanceName;
      instance.qhtmlUUID = instanceUuid;
      instance.qhtmlClass = classObject;
      instance.qhtmlRegistry = registry;
      installQHTMLParentFunction(instance, registry);
      registry.qhtmlClassInstancesByName.set(instanceName, instance);
      registry.qhtmlClassInstances[instanceName] = instance;
      if (instanceUuid) {
        registry.qhtmlClassInstancesByUuid.set(instanceUuid, instance);
      }
      registry.rootElement.dispatchEvent(new CustomEvent("QHTMLClassInstanceCreated", {
        bubbles: true,
        detail: { htmlNode: instanceNode, name: instanceName, className, instance }
      }));
      return instance;
    } catch (error) {
      registry.rootElement.dispatchEvent(new CustomEvent("QHTMLClassError", {
        bubbles: true,
        detail: { htmlNode: instanceNode, name: instanceName, className, error }
      }));
      console.error("Unable to instantiate QHTML class", className, instanceName, error);
      return null;
    }
  }

  function instantiateQHTMLClassNodes(registry) {
    if (!registry || !registry.nodesByUuid) {
      return;
    }
    registry.nodesByUuid.forEach((node) => {
      if (qhtmlNodeType(node) !== "QHTMLTypedNode" || typeof node.keyword !== "function") {
        return;
      }
      if (registry.qhtmlClassesByName.has(node.keyword())) {
        instantiateQHTMLClassNode(node, registry);
      }
    });
  }

  function isPaintEventName(eventName) {
    return eventName === "paintbackground" || eventName === "paintborder" || eventName === "paintmask";
  }

  function ownerElementForQHTMLNode(node, registry) {
    let current = qhtmlParentNode(node);
    let insideDefinition = false;
    while (current) {
      const type = qhtmlNodeType(current);
      if (type === "QHTMLComponentInstance") {
        const uuid = typeof current.qhtmlUUID === "function" ? current.qhtmlUUID() : "";
        return registry.elementsByUuid.get(uuid) || registry.rootElement;
      }
      if (type === "QHTMLComponentDefinition") {
        insideDefinition = true;
      }
      current = qhtmlParentNode(current);
    }
    return insideDefinition ? null : registry.rootElement;
  }

  function ownerElementsForQHTMLNode(node, registry) {
    let current = qhtmlParentNode(node);
    let insideDefinition = false;
    while (current) {
      const type = qhtmlNodeType(current);
      if (type === "QHTMLComponentInstance") {
        const uuid = typeof current.qhtmlUUID === "function" ? current.qhtmlUUID() : "";
        if (!uuid || !registry.rootElement || !registry.rootElement.querySelectorAll) {
          const singleOwner = uuid ? registry.elementsByUuid.get(uuid) : null;
          return singleOwner ? [singleOwner] : [registry.rootElement];
        }
        const rendered = Array.from(registry.rootElement.querySelectorAll(`[component-instance="${uuid}"]`));
        if (rendered.length > 0) {
          return rendered;
        }
        const singleOwner = registry.elementsByUuid.get(uuid);
        return singleOwner ? [singleOwner] : [registry.rootElement];
      }
      if (type === "QHTMLComponentDefinition") {
        insideDefinition = true;
      }
      current = qhtmlParentNode(current);
    }
    return insideDefinition ? [] : [registry.rootElement];
  }

  function owningComponentDefinitionForQHTMLNode(node) {
    let current = qhtmlParentNode(node);
    while (current) {
      if (qhtmlNodeType(current) === "QHTMLComponentDefinition") {
        return current;
      }
      current = qhtmlParentNode(current);
    }
    return null;
  }

  function componentDefinitionInstanceElements(definitionNode, registry) {
    const uuid = qhtmlNodeUuid(definitionNode);
    if (!uuid || !registry || !registry.rootElement || typeof registry.rootElement.querySelectorAll !== "function") {
      return [];
    }
    const escaped = qhtmlCssString(uuid);
    return Array.from(registry.rootElement.querySelectorAll(`[component-definition="${escaped}"]`));
  }

  function themeApplicationOwnerScopes(themeApplicationNode, registry) {
    const scopes = ownerElementsForQHTMLNode(themeApplicationNode, registry).slice();
    const definitionNode = owningComponentDefinitionForQHTMLNode(themeApplicationNode);
    componentDefinitionInstanceElements(definitionNode, registry).forEach((element) => {
      if (element && scopes.indexOf(element) < 0) {
        scopes.push(element);
      }
    });
    return scopes;
  }

  function ownerWorkerForQHTMLNode(node, registry) {
    let current = qhtmlParentNode(node);
    while (current) {
      if (qhtmlNodeType(current) === "QHTMLWorker") {
        const uuid = typeof current.qhtmlUUID === "function" ? current.qhtmlUUID() : "";
        return uuid && registry.workersByUuid ? registry.workersByUuid.get(uuid) || null : null;
      }
      if (qhtmlNodeType(current) === "QHTMLComponentDefinition") {
        return null;
      }
      current = qhtmlParentNode(current);
    }
    return null;
  }

  function ownerRuntimeObjectForQHTMLNode(node, registry) {
    return ownerWorkerForQHTMLNode(node, registry) || ownerElementForQHTMLNode(node, registry);
  }

  function runtimeObjectForQHTMLNode(node, registry, selfElement) {
    if (!node || !registry) {
      return null;
    }
    const type = qhtmlNodeType(node);
    const name = qhtmlNodeName(node);
    const uuid = qhtmlNodeUuid(node);

    if (node === registry.tree) {
      return registry.rootElement || null;
    }
    if (type === "QHTMLPropertyAnimation" || type === "QHTMLAnimationGroup") {
      return (uuid && registry.animationsByUuid && registry.animationsByUuid.get(uuid)) ||
             (name && registry.animationsByName && registry.animationsByName.get(name)) ||
             null;
    }
    if (type === "QHTMLTimer") {
      return (uuid && registry.timersByUuid && registry.timersByUuid.get(uuid)) ||
             (name && registry.timersByName && registry.timersByName.get(name)) ||
             null;
    }
    if (type === "QHTMLScriptAction") {
      return (uuid && registry.scriptActionsByUuid && registry.scriptActionsByUuid.get(uuid)) ||
             (name && registry.scriptActionsByName && registry.scriptActionsByName.get(name)) ||
             null;
    }
    if (type === "QHTMLWorker") {
      return (uuid && registry.workersByUuid && registry.workersByUuid.get(uuid)) ||
             (name && registry.workersByName && registry.workersByName.get(name)) ||
             null;
    }
    if (type === "QHTMLComponentDefinition") {
      return (uuid && registry.componentDefinitionsByUuid && registry.componentDefinitionsByUuid.get(uuid)) ||
             (name && registry.componentDefinitionsByName && registry.componentDefinitionsByName.get(name)) ||
             null;
    }
    if (type === "QHTMLComponentInstance" ||
        type === "QHTMLDomElement" ||
        type === "QHTMLLayout" ||
        type === "QHTMLRowLayout" ||
        type === "QHTMLColumnLayout" ||
        type === "QHTMLModelView" ||
        type === "QHTMLCanvas" ||
        type === "QHTMLVideo" ||
        type === "QHTMLParticleEmitter") {
      return (uuid && registry.elementsByUuid && registry.elementsByUuid.get(uuid)) ||
             (name && registry.elementsByName && registry.elementsByName.get(name)) ||
             qhtmlDomElementByUuid(registry.rootElement, uuid) ||
             null;
    }
    return runtimeValueForQHTMLReference(node, registry, selfElement) || ownerRuntimeObjectForQHTMLNode(node, registry) || null;
  }

  function liveParentForQHTMLObject(target, registry) {
    const sourceRegistry = registry || (target && target.__qhtmlRegistry) || null;
    if (!target || !sourceRegistry) {
      return null;
    }
    if (target === sourceRegistry.rootElement) {
      return null;
    }
    const node = qhtmlNodeForDomElement(target, sourceRegistry);
    const parentNode = qhtmlParentNode(node);
    const ownerElement = target.ownerElement || target.__qhtmlOwnerElement || null;
    if (!parentNode || parentNode === sourceRegistry.tree) {
      return ownerElement || sourceRegistry.rootElement || null;
    }
    if (qhtmlNodeType(parentNode) === "QHTMLComponentDefinition" && ownerElement) {
      return ownerElement;
    }
    const resolvedParent = runtimeObjectForQHTMLNode(parentNode, sourceRegistry, target);
    if (resolvedParent) {
      return resolvedParent;
    }
    if (ownerElement) {
      return ownerElement;
    }
    if (parentNode === sourceRegistry.tree) {
      return sourceRegistry.rootElement || null;
    }
    return null;
  }

  function installQHTMLParentFunction(target, registry) {
    if (!target) {
      return;
    }
    try {
      Object.defineProperty(target, "parent", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function parent() {
          return liveParentForQHTMLObject(this, registry || this.__qhtmlRegistry);
        }
      });
    } catch (error) {
      target.parent = function parent() {
        return liveParentForQHTMLObject(this, registry || this.__qhtmlRegistry);
      };
    }
  }

  function deferRuntimeStart(registry, callback) {
    if (typeof callback !== "function") {
      return;
    }
    if (registry && registry.__qhtmlInitializing === true && Array.isArray(registry.pendingRuntimeStarts)) {
      registry.pendingRuntimeStarts.push(callback);
      return;
    }
    setTimeout(callback, 0);
  }

  function flushRuntimeStarts(registry) {
    if (!registry || !Array.isArray(registry.pendingRuntimeStarts)) {
      return;
    }
    const starts = registry.pendingRuntimeStarts.splice(0);
    starts.forEach((callback) => callback());
  }

  function timerAssignmentValue(timerNode, name, ownerElement, registry, fallback) {
    const count = typeof timerNode.childCount === "function" ? timerNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = timerNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLPropertyAssignment" && qhtmlNodeName(child).toLowerCase() === name) {
        const rawValue = typeof child.value === "function" ? child.value() : "";
        const resolved = resolvePropertyValue(rawValue, ownerElement, child, registry);
        return typeof resolved === "undefined" ? fallback : resolved;
      }
    }
    return fallback;
  }

  function timerBool(value, fallback) {
    if (typeof value === "boolean") {
      return value;
    }
    const text = String(value == null ? "" : value).trim().toLowerCase();
    if (text === "true" || text === "1" || text === "yes") {
      return true;
    }
    if (text === "false" || text === "0" || text === "no") {
      return false;
    }
    return fallback;
  }

  function timerNumber(value, fallback) {
    const numeric = Number.parseInt(String(value == null ? "" : value), 10);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
  }

  function timerHandlers(timerNode) {
    const handlers = [];
    const count = typeof timerNode.childCount === "function" ? timerNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = timerNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLEventHandler" &&
          typeof child.eventName === "function" &&
          String(child.eventName() || "").toLowerCase() === "timeout") {
        handlers.push(child);
      }
    }
    return handlers;
  }

  function timerSignalNode(timerNode) {
    const count = typeof timerNode.childCount === "function" ? timerNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = timerNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLSignal" && qhtmlNodeName(child) === "timeout") {
        return child;
      }
    }
    return null;
  }

  function createTimerSignal(timerObject, signalNode, ownerElement) {
    const connections = [];
    const signalFunction = function (...args) {
      if (signalNode && typeof signalNode.emit === "function") {
        signalNode.emit(args.map((arg) => String(arg)).join(", "));
      }
      ownerElement.dispatchEvent(new CustomEvent("QHTMLTimerTimeout", {
        bubbles: true,
        detail: { timer: timerObject, signalNode, args }
      }));
      return connections.map((target) => {
        try {
          if (target && typeof target.__qhtmlInvokeFromSignal === "function") {
            return target.__qhtmlInvokeFromSignal(args, { signal: signalNode, sender: timerObject });
          }
          return typeof target === "function" ? target.apply(ownerElement, args) : undefined;
        } catch (error) {
          reportQHTMLExecutionContext(error, {
            kind: "timer-signal-dispatch",
            signalName: qhtmlNodeName(signalNode) || "timeout",
            signalNode,
            sender: timerObject,
            ownerElement,
            args
          }, ownerElement.__qhtmlRegistry);
          throw error;
        }
      });
    };
    signalFunction.connect = function (target) {
      if (!target) {
        return false;
      }
      if (target.__qhtmlFunctionNode && signalNode && typeof signalNode.connect === "function") {
        signalNode.connect(target.__qhtmlFunctionNode);
      }
      connections.push(target);
      return true;
    };
    signalFunction.disconnectAll = function () {
      connections.length = 0;
    };
    signalFunction.connections = function () {
      return connections.slice();
    };
    signalFunction.__qhtmlTimer = timerObject;
    signalFunction.__qhtmlSignalNode = signalNode;
    return signalFunction;
  }

  function createLiveTimer(timerNode, ownerElement, registry) {
    const timerName = qhtmlNodeName(timerNode);
    const liveTimer = {
      name: timerName,
      htmlNode: timerNode,
      node: timerNode,
      ownerElement,
      __qhtmlRegistry: registry,
      __qhtmlTimerId: null,
      __qhtmlRunning: false,
      __qhtmlInterval: timerNumber(timerAssignmentValue(timerNode, "interval", ownerElement, registry, 0), 0),
      __qhtmlRepeat: timerBool(timerAssignmentValue(timerNode, "repeat", ownerElement, registry, true), true),
      __qhtmlHandlers: timerHandlers(timerNode)
    };
    installQHTMLParentFunction(liveTimer, registry);

    liveTimer.timeout = createTimerSignal(liveTimer, timerSignalNode(timerNode), ownerElement);

    Object.defineProperty(liveTimer, "interval", {
      enumerable: true,
      configurable: true,
      get() {
        return liveTimer.__qhtmlInterval;
      },
      set(value) {
        liveTimer.__qhtmlInterval = timerNumber(value, liveTimer.__qhtmlInterval);
        if (timerNode && typeof timerNode.setInterval === "function") {
          timerNode.setInterval(liveTimer.__qhtmlInterval);
        }
        if (liveTimer.running) {
          liveTimer.start();
        }
      }
    });
    Object.defineProperty(liveTimer, "repeat", {
      enumerable: true,
      configurable: true,
      get() {
        return liveTimer.__qhtmlRepeat;
      },
      set(value) {
        liveTimer.__qhtmlRepeat = timerBool(value, liveTimer.__qhtmlRepeat);
        if (timerNode && typeof timerNode.setRepeat === "function") {
          timerNode.setRepeat(liveTimer.__qhtmlRepeat);
        }
        if (liveTimer.running) {
          liveTimer.start();
        }
      }
    });
    Object.defineProperty(liveTimer, "running", {
      enumerable: true,
      configurable: true,
      get() {
        return liveTimer.__qhtmlRunning;
      },
      set(value) {
        if (timerBool(value, false)) {
          liveTimer.start();
        } else {
          liveTimer.stop();
        }
      }
    });

    liveTimer.tick = function () {
      liveTimer.timeout();
      liveTimer.__qhtmlHandlers.forEach((handlerNode) => {
        const parameters = splitList(typeof handlerNode.parameters === "function" ? handlerNode.parameters() : "");
        const body = typeof handlerNode.body === "function" ? handlerNode.body() : "";
        executeScriptBody(ownerElement, parameters, [], body, registry, {
          kind: "timer-handler",
          name: timerName || "anonymous-timer",
          eventName: "timeout",
          handlerNode,
          sender: liveTimer,
          ownerElement,
          args: []
        });
      });
      if (!liveTimer.repeat) {
        liveTimer.stop();
      }
    };
    liveTimer.start = function () {
      liveTimer.stop();
      liveTimer.__qhtmlRunning = true;
      const schedule = liveTimer.repeat ? globalScope.setInterval : globalScope.setTimeout;
      liveTimer.__qhtmlTimerId = schedule(() => liveTimer.tick(), liveTimer.interval);
      ownerElement.dispatchEvent(new CustomEvent("QHTMLTimerStarted", {
        bubbles: true,
        detail: { timer: liveTimer, htmlNode: timerNode }
      }));
      return liveTimer;
    };
    liveTimer.stop = function () {
      if (liveTimer.__qhtmlTimerId !== null) {
        if (liveTimer.repeat) {
          globalScope.clearInterval(liveTimer.__qhtmlTimerId);
        } else {
          globalScope.clearTimeout(liveTimer.__qhtmlTimerId);
        }
      }
      liveTimer.__qhtmlTimerId = null;
      liveTimer.__qhtmlRunning = false;
      return liveTimer;
    };

    const initiallyRunning = timerBool(timerAssignmentValue(timerNode, "running", ownerElement, registry, false), false);
    if (initiallyRunning) {
      deferRuntimeStart(registry, () => liveTimer.start());
    }
    return liveTimer;
  }

  function bindTimerDeclaration(domElement, timerNode, registry) {
    if (!domElement || !timerNode || qhtmlNodeType(timerNode) !== "QHTMLTimer") {
      return null;
    }
    const timerUuid = typeof timerNode.qhtmlUUID === "function" ? timerNode.qhtmlUUID() : "";
    domElement.__qhtmlTimersByUuid = domElement.__qhtmlTimersByUuid || new Map();
    if (timerUuid && domElement.__qhtmlTimersByUuid.has(timerUuid)) {
      return domElement.__qhtmlTimersByUuid.get(timerUuid);
    }
    const timerName = qhtmlNodeName(timerNode);
    const timerObject = createLiveTimer(timerNode, domElement, registry);
    if (timerName) {
      domElement[timerName] = timerObject;
      if (registry && registry.timersByName) {
        registry.timersByName.set(timerName, timerObject);
      }
      if (registry && registry.timers) {
        registry.timers[timerName] = timerObject;
      }
    }
    if (timerUuid) {
      domElement.__qhtmlTimersByUuid.set(timerUuid, timerObject);
      if (registry && registry.timersByUuid) {
        registry.timersByUuid.set(timerUuid, timerObject);
      }
    }
    return timerObject;
  }

  function createObjectSignal(ownerObject, signalNode, signalName) {
    const connections = [];
    const signalFunction = function (...args) {
      if (signalNode && typeof signalNode.emit === "function") {
        signalNode.emit(args.map((arg) => String(arg)).join(", "));
      }
      return connections.map((target) => {
        try {
          if (target && typeof target.__qhtmlInvokeFromSignal === "function") {
            return target.__qhtmlInvokeFromSignal(args, { signal: signalNode, sender: ownerObject });
          }
          return typeof target === "function" ? target.apply(ownerObject, args) : undefined;
        } catch (error) {
          reportQHTMLExecutionContext(error, {
            kind: "object-signal-dispatch",
            signalName,
            signalNode,
            sender: ownerObject,
            args
          }, ownerObject && ownerObject.__qhtmlRegistry);
          throw error;
        }
      });
    };
    signalFunction.connect = function (target) {
      if (!target) {
        return false;
      }
      connections.push(target);
      return true;
    };
    signalFunction.disconnectAll = function () {
      connections.length = 0;
    };
    signalFunction.connections = function () {
      return connections.slice();
    };
    signalFunction.__qhtmlElement = ownerObject;
    signalFunction.__qhtmlSignalNode = signalNode || null;
    signalFunction.__qhtmlSignalName = signalName || "";
    return signalFunction;
  }

  function animationSignalNode(animationNode, name) {
    const count = typeof animationNode.childCount === "function" ? animationNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = animationNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLSignal" && qhtmlNodeName(child).toLowerCase() === name) {
        return child;
      }
    }
    return null;
  }

  function animationAssignment(animationNode, name, ownerElement, registry, fallback) {
    const lowerName = String(name || "").toLowerCase();
    const count = typeof animationNode.childCount === "function" ? animationNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = animationNode.childAt(index);
      if (qhtmlNodeType(child) !== "QHTMLPropertyAssignment") {
        continue;
      }
      if (qhtmlNodeName(child).toLowerCase() !== lowerName) {
        continue;
      }
      const rawValue = typeof child.value === "function" ? child.value() : "";
      const resolved = resolvePropertyValue(rawValue, ownerElement, child, registry);
      return typeof resolved === "undefined" ? fallback : resolved;
    }
    return fallback;
  }

  function animationHasAssignment(animationNode, name) {
    const lowerName = String(name || "").toLowerCase();
    const count = typeof animationNode.childCount === "function" ? animationNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = animationNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLPropertyAssignment" && qhtmlNodeName(child).toLowerCase() === lowerName) {
        return true;
      }
    }
    return false;
  }

  function animationEventHandlers(animationNode) {
    const handlers = [];
    const count = typeof animationNode.childCount === "function" ? animationNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = animationNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLEventHandler") {
        handlers.push(child);
      }
    }
    return handlers;
  }

  function inferAnimationPropertyName(animationName) {
    let propertyName = String(animationName || "").trim();
    propertyName = propertyName.replace(/(?:Animation|Anim)$/i, "");
    return propertyName || String(animationName || "").trim();
  }

  function numericValue(value, fallback) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    const parsed = Number.parseFloat(String(value == null ? "" : value));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function readTargetProperty(target, propertyName) {
    if (!target || !propertyName) {
      return 0;
    }
    if (typeof target[propertyName] !== "undefined") {
      return numericValue(target[propertyName], 0);
    }
    if (target.style && typeof target.style[propertyName] !== "undefined") {
      const inlineValue = target.style[propertyName];
      if (inlineValue !== "") {
        return numericValue(inlineValue, 0);
      }
    }
    if (target.ownerDocument && target.ownerDocument.defaultView && target.style) {
      const computed = target.ownerDocument.defaultView.getComputedStyle(target);
      if (computed && typeof computed[propertyName] !== "undefined") {
        return numericValue(computed[propertyName], 0);
      }
    }
    return 0;
  }

  function cssValueForProperty(propertyName, value) {
    const unitless = /^(?:opacity|zIndex|fontWeight|lineHeight|flexGrow|flexShrink|order)$/i;
    return unitless.test(propertyName) ? String(value) : `${value}px`;
  }

  function writeTargetProperty(target, propertyName, value) {
    if (!target || !propertyName) {
      return;
    }
    if (typeof target[propertyName] !== "undefined" && !(target.style && typeof target.style[propertyName] !== "undefined")) {
      target[propertyName] = value;
      return;
    }
    if (target.style && typeof target.style[propertyName] !== "undefined") {
      target.style[propertyName] = cssValueForProperty(propertyName, value);
      return;
    }
    target[propertyName] = value;
  }

  function defineRuntimeSyncedProperty(target, node, propertyName, initialValue, options) {
    if (!target || !propertyName) {
      return;
    }
    target.__qhtmlRuntimeProperties = target.__qhtmlRuntimeProperties || Object.create(null);
    target.__qhtmlRuntimeProperties[propertyName] = initialValue;
    try {
      Object.defineProperty(target, propertyName, {
        configurable: true,
        enumerable: true,
        get() {
          return target.__qhtmlRuntimeProperties[propertyName];
        },
        set(value) {
          target.__qhtmlRuntimeProperties[propertyName] = value;
          if ((!options || options.sync !== false) && node && typeof node.setProperty === "function") {
            node.setProperty(String(propertyName), qhtmlSerializablePropertyValue(value));
          }
        }
      });
    } catch (error) {
      target[propertyName] = initialValue;
    }
  }

  function setRuntimeSyncedProperty(target, propertyName, value) {
    target[propertyName] = value;
    return value;
  }

  function createLivePropertyAnimation(animationNode, ownerElement, registry) {
    const animationName = qhtmlNodeName(animationNode);
    const animationObject = {
      htmlNode: animationNode,
      qhtmlName: animationName,
      qhtmlUUID: typeof animationNode.qhtmlUUID === "function" ? animationNode.qhtmlUUID() : "",
      ownerElement,
      component: null,
      __qhtmlRegistry: registry,
      __qhtmlFrame: 0,
      __qhtmlStartedAt: 0,
      __qhtmlStartValue: 0,
      __qhtmlEndValue: 0,
      __qhtmlDirection: 1,
      __qhtmlRunning: false,
      currentStep: 0,
      stepAmount: 0,
      stepStones: []
    };
    animationObject.component = animationObject;
    installQHTMLParentFunction(animationObject, registry);
    if (animationName) {
      animationObject[animationName] = animationObject;
      if (registry && registry.animationsByName) {
        registry.animationsByName.set(animationName, animationObject);
        registry.animations[animationName] = animationObject;
      }
    }
    if (animationObject.qhtmlUUID && registry && registry.animationsByUuid) {
      registry.animationsByUuid.set(animationObject.qhtmlUUID, animationObject);
    }
    bindComponentContextForwarders(animationObject, ownerElement);
    installQHTMLReferenceAccessors(animationObject, animationNode, registry);
    defineRuntimeSyncedProperty(animationObject, animationNode, "target", animationObject.target, { sync: false });
    [
      "property",
      "duration",
      "steps",
      "easing",
      "repeat",
      "from",
      "to",
      "currentStep"
    ].forEach((propertyName) => defineRuntimeSyncedProperty(animationObject, animationNode, propertyName, animationObject[propertyName]));
    animationObject.querySelector = function (selector) {
      return ownerElement && typeof ownerElement.querySelector === "function"
        ? ownerElement.querySelector(selector)
        : null;
    };
    animationObject.querySelectorAll = function (selector) {
      return ownerElement && typeof ownerElement.querySelectorAll === "function"
        ? ownerElement.querySelectorAll(selector)
        : [];
    };
    animationObject.started = createObjectSignal(animationObject, animationSignalNode(animationNode, "started"), "started");
    animationObject.stopped = createObjectSignal(animationObject, animationSignalNode(animationNode, "stopped"), "stopped");
    animationObject.stepped = createObjectSignal(animationObject, animationSignalNode(animationNode, "stepped"), "stepped");
    animationObject.ended = createObjectSignal(animationObject, animationSignalNode(animationNode, "ended"), "ended");
    animationObject.finished = createObjectSignal(animationObject, animationSignalNode(animationNode, "finished"), "finished");

    animationObject.__qhtmlApplyStep = function (value, currentStep) {
      void currentStep;
      writeTargetProperty(animationObject.target, animationObject.property, value);
    };
    animationObject.stepped.connect(animationObject.__qhtmlApplyStep);

    animationObject.refresh = function () {
      setRuntimeSyncedProperty(animationObject, "target", animationAssignment(animationNode, "target", animationObject, registry, ownerElement));
      setRuntimeSyncedProperty(animationObject, "property", animationAssignment(animationNode, "property", animationObject, registry,
        animationAssignment(animationNode, "propertyName", animationObject, registry,
          animationAssignment(animationNode, "targetProperty", animationObject, registry, inferAnimationPropertyName(animationName)))));
      setRuntimeSyncedProperty(animationObject, "duration", timerNumber(animationAssignment(animationNode, "duration", animationObject, registry, 0), 0));
      setRuntimeSyncedProperty(animationObject, "steps", timerNumber(animationAssignment(animationNode, "steps", animationObject, registry, 100), 100));
      setRuntimeSyncedProperty(animationObject, "easing", animationAssignment(animationNode, "easing", animationObject, registry, "linear"));
      setRuntimeSyncedProperty(animationObject, "repeat", timerBool(animationAssignment(animationNode, "repeat", animationObject, registry, false), false));
      setRuntimeSyncedProperty(animationObject, "from", animationAssignment(animationNode, "from", animationObject, registry,
        animationAssignment(animationNode, "startValue", animationObject, registry,
          animationAssignment(animationNode, "start", animationObject, registry, undefined))));
      setRuntimeSyncedProperty(animationObject, "to", animationAssignment(animationNode, "to", animationObject, registry,
        animationAssignment(animationNode, "endValue", animationObject, registry,
          animationAssignment(animationNode, "end", animationObject, registry, undefined))));
      animationObject.__qhtmlInitialRunning = timerBool(animationAssignment(animationNode, "running", animationObject, registry, false), false);
      return animationObject;
    };

    Object.defineProperty(animationObject, "running", {
      enumerable: true,
      configurable: true,
      get() {
        return animationObject.__qhtmlRunning;
      },
      set(value) {
        if (animationNode && typeof animationNode.setProperty === "function") {
          animationNode.setProperty("running", qhtmlSerializablePropertyValue(value));
        }
        if (timerBool(value, false)) {
          if (!animationObject.__qhtmlRunning) {
            animationObject.start();
          } else {
            animationObject.__qhtmlRunning = true;
          }
        } else {
          animationObject.stop();
        }
      }
    });

    animationObject.valueAt = function (progress) {
      const eased = String(animationObject.easing || "linear").toLowerCase() === "linear"
        ? progress
        : 0.5 - Math.cos(progress * Math.PI) / 2;
      return animationObject.__qhtmlStartValue +
        (animationObject.__qhtmlEndValue - animationObject.__qhtmlStartValue) * eased;
    };

    animationObject.rebuildStepStones = function () {
      const stepCount = Math.max(0, Math.floor(Number(animationObject.steps) || 0));
      const startValue = Number(animationObject.__qhtmlStartValue) || 0;
      const endValue = Number(animationObject.__qhtmlEndValue) || 0;
      const delta = endValue - startValue;
      animationObject.stepStones = [];
      animationObject.stepAmount = stepCount > 0 ? delta / stepCount : delta;
      animationObject.__qhtmlDirection = animationObject.stepAmount < 0 ? -1 : 1;
      if (stepCount <= 0 || delta === 0) {
        return animationObject.stepStones;
      }
      for (let i = 1; i <= stepCount; i += 1) {
        animationObject.stepStones.push(startValue + animationObject.stepAmount * i);
      }
      return animationObject.stepStones;
    };

    animationObject.crossedStepStone = function (value, stone) {
      if (animationObject.__qhtmlDirection < 0) {
        return value <= stone;
      }
      return value >= stone;
    };

    animationObject.emitCrossedSteps = function (value, forceAll) {
      while (animationObject.currentStep < animationObject.stepStones.length) {
        const stone = animationObject.stepStones[animationObject.currentStep];
        if (!forceAll && !animationObject.crossedStepStone(value, stone)) {
          break;
        }
        animationObject.currentStep += 1;
        animationObject.stepped(value, animationObject.currentStep);
      }
    };

    animationObject.step = function (timestamp) {
      try {
        if (registry && registry.rootElement && registry.rootElement.__qhtml7RuntimeDisposed === true) {
          animationObject.stop();
          return;
        }
        if (!animationObject.running) {
          return;
        }
        const elapsed = timestamp - animationObject.__qhtmlStartedAt;
        const duration = Math.max(0, Number(animationObject.duration) || 0);
        const progress = duration === 0 ? 1 : Math.min(1, elapsed / duration);
        const value = animationObject.valueAt(progress);
        animationObject.emitCrossedSteps(value, false);
        if (progress < 1) {
          animationObject.__qhtmlFrame = requestAnimationFrame(animationObject.step);
          return;
        }
        animationObject.emitCrossedSteps(animationObject.__qhtmlEndValue, true);
        if (animationObject.stepStones.length === 0) {
          writeTargetProperty(animationObject.target, animationObject.property, animationObject.__qhtmlEndValue);
        }
        animationObject.__qhtmlRunning = false;
        animationObject.ended();
        animationObject.finished();
        if (timerBool(animationObject.repeat, false)) {
          animationObject.start();
        }
      } catch (error) {
        if (reportQHTMLRuntimeError(ownerElement, error, registry)) {
          return;
        }
        throw error;
      }
    };

    animationObject.start = function () {
      if (registry && registry.rootElement && registry.rootElement.__qhtml7RuntimeDisposed === true) {
        return animationObject;
      }
      const currentValue = readTargetProperty(animationObject.target, animationObject.property);
      const hasFrom = animationHasAssignment(animationNode, "from") ||
        animationHasAssignment(animationNode, "startValue") ||
        animationHasAssignment(animationNode, "start");
      const hasTo = animationHasAssignment(animationNode, "to") ||
        animationHasAssignment(animationNode, "endValue") ||
        animationHasAssignment(animationNode, "end");
      animationObject.__qhtmlStartValue = numericValue((hasFrom || typeof animationObject.from !== "undefined") ? animationObject.from : currentValue, currentValue);
      animationObject.__qhtmlEndValue = numericValue((hasTo || typeof animationObject.to !== "undefined") ? animationObject.to : currentValue, currentValue);
      animationObject.currentStep = 0;
      animationObject.rebuildStepStones();
      animationObject.__qhtmlRunning = true;
      writeTargetProperty(animationObject.target, animationObject.property, animationObject.__qhtmlStartValue);
      animationObject.started();
      animationObject.__qhtmlStartedAt = performance.now();
      if (animationObject.__qhtmlFrame) {
        cancelAnimationFrame(animationObject.__qhtmlFrame);
      }
      animationObject.__qhtmlFrame = requestAnimationFrame(animationObject.step);
      return animationObject;
    };

    animationObject.stop = function () {
      const wasRunning = animationObject.__qhtmlRunning;
      animationObject.__qhtmlRunning = false;
      if (animationObject.__qhtmlFrame) {
        cancelAnimationFrame(animationObject.__qhtmlFrame);
        animationObject.__qhtmlFrame = 0;
      }
      if (wasRunning) {
        animationObject.stopped();
      }
      return animationObject;
    };

    animationObject.refresh();
    animationEventHandlers(animationNode).forEach((handler) => bindEventHandler(animationObject, handler));
    if (timerBool(animationObject.__qhtmlInitialRunning, false)) {
      deferRuntimeStart(registry, () => {
        try {
          animationObject.start();
        } catch (error) {
          if (reportQHTMLRuntimeError(ownerElement, error, registry)) {
            return;
          }
          throw error;
        }
      });
    }
    return animationObject;
  }

  function createLiveScriptAction(actionNode, ownerElement, registry) {
    const actionName = qhtmlNodeName(actionNode);
    const actionObject = {
      htmlNode: actionNode,
      qhtmlName: actionName,
      qhtmlUUID: typeof actionNode.qhtmlUUID === "function" ? actionNode.qhtmlUUID() : "",
      ownerElement,
      component: null,
      __qhtmlRegistry: registry,
      __qhtmlRunning: false
    };
    actionObject.component = actionObject;
    installQHTMLParentFunction(actionObject, registry);
    actionObject.started = createObjectSignal(actionObject, animationSignalNode(actionNode, "started"), "started");
    actionObject.finished = createObjectSignal(actionObject, animationSignalNode(actionNode, "finished"), "finished");
    actionObject.run = function () {
      actionObject.__qhtmlRunning = true;
      actionObject.started();
      executeScriptBody(ownerElement, [], [], typeof actionNode.body === "function" ? actionNode.body() : "", registry, {
        kind: "script-action",
        name: actionName || "anonymous-action",
        actionNode,
        sender: actionObject,
        ownerElement,
        args: []
      });
      actionObject.__qhtmlRunning = false;
      actionObject.finished();
      return actionObject;
    };
    actionObject.start = actionObject.run;
    actionObject.stop = function () {
      actionObject.__qhtmlRunning = false;
      return actionObject;
    };
    Object.defineProperty(actionObject, "running", {
      enumerable: true,
      configurable: true,
      get() {
        return actionObject.__qhtmlRunning;
      },
      set(value) {
        if (timerBool(value, false)) {
          actionObject.run();
        } else {
          actionObject.stop();
        }
      }
    });
    animationEventHandlers(actionNode).forEach((handler) => bindEventHandler(actionObject, handler));
    return actionObject;
  }

  function bindPropertyAnimationDeclaration(ownerElement, node, registry) {
    if (!ownerElement || !node || qhtmlNodeType(node) !== "QHTMLPropertyAnimation") {
      return null;
    }
    const animationUuid = typeof node.qhtmlUUID === "function" ? node.qhtmlUUID() : "";
    ownerElement.__qhtmlAnimationsByUuid = ownerElement.__qhtmlAnimationsByUuid || new Map();
    if (animationUuid && ownerElement.__qhtmlAnimationsByUuid.has(animationUuid)) {
      return ownerElement.__qhtmlAnimationsByUuid.get(animationUuid);
    }
    const animationName = qhtmlNodeName(node);
    const animationObject = createLivePropertyAnimation(node, ownerElement, registry);
    if (animationName) {
      ownerElement[animationName] = animationObject;
      registry.animationsByName.set(animationName, animationObject);
      registry.animations[animationName] = animationObject;
    }
    if (animationUuid) {
      ownerElement.__qhtmlAnimationsByUuid.set(animationUuid, animationObject);
      registry.animationsByUuid.set(animationUuid, animationObject);
    }
    return animationObject;
  }

  function bindRuntimeAnimationDeclarations(ownerElement, ownerNode, registry) {
    if (!ownerElement || !ownerNode || !registry) {
      return;
    }
    const count = typeof ownerNode.childCount === "function" ? ownerNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = ownerNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLPropertyAnimation") {
        bindPropertyAnimationDeclaration(ownerElement, child, registry);
      }
    }
  }

  function animationGroupChildNodes(groupNode) {
    const children = [];
    const count = typeof groupNode.childCount === "function" ? groupNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = groupNode.childAt(index);
      const type = qhtmlNodeType(child);
      if (type === "QHTMLPropertyAnimation" ||
          type === "QHTMLSequentialAnimation" ||
          type === "QHTMLParallelAnimation" ||
          type === "QHTMLScriptAction") {
        children.push(child);
      }
    }
    return children;
  }

  function runtimeAnimationForNode(node, registry) {
    const uuid = node && typeof node.qhtmlUUID === "function" ? node.qhtmlUUID() : "";
    if (!uuid) {
      return null;
    }
    if (registry.animationsByUuid && registry.animationsByUuid.has(uuid)) {
      return registry.animationsByUuid.get(uuid);
    }
    if (registry.scriptActionsByUuid && registry.scriptActionsByUuid.has(uuid)) {
      return registry.scriptActionsByUuid.get(uuid);
    }
    return null;
  }

  function animationFinishedPromise(animation) {
    if (!animation || typeof animation.start !== "function") {
      return Promise.resolve(animation);
    }
    return new Promise((resolve) => {
      const finish = function () {
        if (animation.finished && typeof animation.finished.disconnect === "function") {
          animation.finished.disconnect(finish);
        }
        resolve(animation);
      };
      if (animation.finished && typeof animation.finished.connect === "function") {
        animation.finished.connect(finish);
      }
      animation.start();
      if (!animation.running) {
        finish();
      }
    });
  }

  function createLiveAnimationGroup(groupNode, ownerElement, registry, mode) {
    const groupName = qhtmlNodeName(groupNode);
    const groupObject = {
      htmlNode: groupNode,
      qhtmlName: groupName,
      qhtmlUUID: typeof groupNode.qhtmlUUID === "function" ? groupNode.qhtmlUUID() : "",
      ownerElement,
      component: null,
      mode,
      __qhtmlRegistry: registry,
      __qhtmlRunning: false,
      __qhtmlRunToken: 0,
      __qhtmlActiveChildren: []
    };
    groupObject.component = groupObject;
    groupObject.started = createObjectSignal(groupObject, animationSignalNode(groupNode, "started"), "started");
    groupObject.stopped = createObjectSignal(groupObject, animationSignalNode(groupNode, "stopped"), "stopped");
    groupObject.finished = createObjectSignal(groupObject, animationSignalNode(groupNode, "finished"), "finished");
    groupObject.children = function () {
      return animationGroupChildNodes(groupNode).map((child) => runtimeAnimationForNode(child, registry)).filter(Boolean);
    };
    groupObject.finish = function (token) {
      if (token !== undefined && token !== groupObject.__qhtmlRunToken) {
        return groupObject;
      }
      groupObject.__qhtmlRunning = false;
      groupObject.__qhtmlActiveChildren = [];
      groupObject.finished();
      return groupObject;
    };
    groupObject.stop = function () {
      const wasRunning = groupObject.__qhtmlRunning;
      groupObject.__qhtmlRunToken += 1;
      groupObject.__qhtmlRunning = false;
      groupObject.__qhtmlActiveChildren.slice().forEach((child) => {
        if (child && typeof child.stop === "function") {
          child.stop();
        }
      });
      groupObject.__qhtmlActiveChildren = [];
      if (wasRunning) {
        groupObject.stopped();
      }
      return groupObject;
    };
    groupObject.start = function () {
      const token = groupObject.__qhtmlRunToken + 1;
      const children = groupObject.children();
      groupObject.stop();
      groupObject.__qhtmlRunToken = token;
      groupObject.__qhtmlRunning = true;
      groupObject.__qhtmlActiveChildren = children.slice();
      groupObject.started();
      if (!children.length) {
        groupObject.finish(token);
        return groupObject;
      }
      if (mode === "parallel") {
        Promise.all(children.map((child) => animationFinishedPromise(child))).then(() => {
          groupObject.finish(token);
        });
      } else {
        children.reduce((chain, child) => {
          return chain.then(() => {
            if (!groupObject.__qhtmlRunning || token !== groupObject.__qhtmlRunToken) {
              return null;
            }
            return animationFinishedPromise(child);
          });
        }, Promise.resolve()).then(() => {
          groupObject.finish(token);
        });
      }
      return groupObject;
    };
    Object.defineProperty(groupObject, "running", {
      enumerable: true,
      configurable: true,
      get() {
        return groupObject.__qhtmlRunning;
      },
      set(value) {
        if (timerBool(value, false)) {
          groupObject.start();
        } else {
          groupObject.stop();
        }
      }
    });
    animationEventHandlers(groupNode).forEach((handler) => bindEventHandler(groupObject, handler));
    if (timerBool(animationAssignment(groupNode, "running", ownerElement, registry, false), false)) {
      deferRuntimeStart(registry, () => groupObject.start());
    }
    return groupObject;
  }

  function splitTopLevel(value) {
    const out = [];
    let current = "";
    let depth = 0;
    let quote = "";
    let escape = false;
    String(value || "").split("").forEach((ch) => {
      if (quote) {
        current += ch;
        if (escape) {
          escape = false;
        } else if (ch === "\\") {
          escape = true;
        } else if (ch === quote) {
          quote = "";
        }
        return;
      }
      if (ch === "\"" || ch === "'" || ch === "`") {
        quote = ch;
        current += ch;
        return;
      }
      if (ch === "[" || ch === "{" || ch === "(") {
        depth += 1;
      } else if (ch === "]" || ch === "}" || ch === ")") {
        depth -= 1;
      }
      if (ch === "," && depth === 0) {
        if (current.trim()) {
          out.push(current.trim());
        }
        current = "";
      } else {
        current += ch;
      }
    });
    if (current.trim()) {
      out.push(current.trim());
    }
    return out;
  }

  function cssDeclarations(cssText) {
    const declarations = [];
    splitTopLevel(String(cssText || "").replace(/\n/g, ";")).forEach((chunk) => {
      chunk.split(";").forEach((part) => {
        const colon = part.indexOf(":");
        if (colon > 0) {
          declarations.push({
            name: normalizeCssDeclarationName(part.slice(0, colon).trim()),
            value: part.slice(colon + 1).trim()
          });
        }
      });
    });
    return declarations.filter((decl) => decl.name && decl.value);
  }

  function normalizeCssDeclarationName(name) {
    const text = String(name || "").trim();
    if (!text || text.startsWith("--") || text.indexOf("-") >= 0) {
      return text;
    }
    return text.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase());
  }

  function normalizeTransitionTimeValue(value, fallback) {
    const text = stripMatchingQuotes(String(value == null ? "" : value).trim());
    if (!text) {
      return fallback;
    }
    if (/^-?(?:\d+|\d*\.\d+)$/.test(text)) {
      return `${text}ms`;
    }
    return text;
  }

  function transitionPropertyNames(text) {
    return String(text || "")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/[;,]/g, " ")
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map(cssShortcutPropertyName);
  }

  function transitionDomPropertyName(cssName) {
    return String(cssName || "").replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  function installStyleBackedTransitionProperty(domElement, cssName) {
    const domName = transitionDomPropertyName(cssName);
    if (!domElement || !domElement.style || !domName || domName in domElement) {
      return;
    }
    Object.defineProperty(domElement, domName, {
      configurable: true,
      enumerable: false,
      get() {
        return this.style.getPropertyValue(cssName) ||
               (globalScope.getComputedStyle ? globalScope.getComputedStyle(this).getPropertyValue(cssName) : "");
      },
      set(value) {
        this.style.setProperty(cssName, String(value == null ? "" : value));
      }
    });
  }

  function createLiveTransition(transitionNode) {
    const name = qhtmlNodeName(transitionNode);
    return {
      name,
      node: transitionNode,
      body() {
        return transitionNode && typeof transitionNode.body === "function" ? transitionNode.body() : "";
      },
      property() {
        return transitionNode && typeof transitionNode.property === "function" ? transitionNode.property() : "";
      },
      duration() {
        return normalizeTransitionTimeValue(
          transitionNode && typeof transitionNode.duration === "function" ? transitionNode.duration() : "",
          "0ms"
        );
      },
      timing() {
        return stripMatchingQuotes(String(
          transitionNode && typeof transitionNode.timing === "function" ? transitionNode.timing() : "ease"
        ).trim()) || "ease";
      },
      delay() {
        return normalizeTransitionTimeValue(
          transitionNode && typeof transitionNode.delay === "function" ? transitionNode.delay() : "",
          "0ms"
        );
      },
      cssEntries(propertyText) {
        const properties = transitionPropertyNames(propertyText || this.property());
        return properties.map((propertyName) => `${propertyName} ${this.duration()} ${this.timing()} ${this.delay()}`);
      }
    };
  }

  function transitionApplicationsFromStyleText(cssText, registry) {
    const applications = [];
    if (!registry || !registry.transitionsByName) {
      return applications;
    }
    parseThemeBlocks(cssText).forEach((block) => {
      const selector = String(block.selector || "").trim();
      if (selector === "q-style-transition") {
        String(block.body || "")
          .replace(/\/\*[\s\S]*?\*\//g, " ")
          .replace(/[;,]/g, " ")
          .split(/\s+/)
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((transitionName) => {
            if (registry.transitionsByName.has(transitionName)) {
              applications.push({
                transition: registry.transitionsByName.get(transitionName),
                properties: ""
              });
            }
          });
        return;
      }
      if (registry.transitionsByName.has(selector)) {
        applications.push({
          transition: registry.transitionsByName.get(selector),
          properties: block.body
        });
      }
    });
    return applications;
  }

  function cssTextWithoutTransitionBlocks(cssText, registry) {
    let out = stripTopLevelBlocksBySelector(cssText, "q-style-transition");
    if (!registry || !registry.transitionsByName) {
      return out;
    }
    registry.transitionsByName.forEach((transitionDef, transitionName) => {
      out = stripTopLevelBlocksBySelector(out, transitionName);
    });
    return out;
  }

  function applyTransitionApplications(domElement, applications) {
    if (!domElement || !domElement.style || !Array.isArray(applications) || !applications.length) {
      return;
    }
    const entries = [];
    const seenEntries = new Set();
    applications.forEach((application) => {
      const transition = application.transition;
      if (!transition || typeof transition.cssEntries !== "function") {
        return;
      }
      transition.cssEntries(application.properties).forEach((entry) => {
        if (!seenEntries.has(entry)) {
          seenEntries.add(entry);
          entries.push(entry);
        }
      });
      transitionPropertyNames(application.properties || (typeof transition.property === "function" ? transition.property() : ""))
        .forEach((propertyName) => installStyleBackedTransitionProperty(domElement, propertyName));
    });
    if (entries.length) {
      domElement.style.setProperty("transition", entries.join(", "));
    }
  }

  function applyNodeTransitionApplications(domElement, qhtmlNode, registry) {
    if (!domElement || !qhtmlNode || !registry || !registry.transitionsByName) {
      return;
    }
    const applications = [];
    const count = typeof qhtmlNode.childCount === "function" ? qhtmlNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLTransitionApplication") {
        const transitionName = qhtmlNodeName(child);
        const transition = registry.transitionsByName.get(transitionName);
        applications.push({
          transition,
          properties: child && typeof child.propertyList === "function" ? child.propertyList() : qhtmlNodeChildrenText(child, domElement, registry)
        });
      }
    }
    applyTransitionApplications(domElement, applications);
  }

  function createLiveStyle(styleNode, registry) {
    const name = qhtmlNodeName(styleNode);
    const liveStyle = {
      name,
      node: styleNode,
      cssOverride: null,
      classOverride: null,
      body() {
        return styleNode && typeof styleNode.body === "function" ? styleNode.body() : "";
      },
      cssText() {
        if (this.cssOverride !== null) {
          return this.cssOverride;
        }
        return styleNode && typeof styleNode.cssText === "function" ? styleNode.cssText() : this.body();
      },
      classList() {
        if (this.classOverride !== null) {
          return this.classOverride;
        }
        return styleNode && typeof styleNode.classList === "function" ? styleNode.classList() : "";
      },
      setBody(nextBody) {
        this.cssOverride = null;
        if (styleNode && typeof styleNode.setBody === "function") {
          styleNode.setBody(String(nextBody || ""));
        } else {
          this.cssOverride = String(nextBody || "");
        }
        this.refresh();
      },
      setCssText(nextCssText) {
        this.cssOverride = String(nextCssText || "");
        if (styleNode && typeof styleNode.setCssText === "function") {
          styleNode.setCssText(this.cssOverride);
          this.cssOverride = null;
        }
        this.refresh();
      },
      setClassList(nextClassList) {
        this.classOverride = String(nextClassList || "");
        this.refresh();
      },
      applyTo(target, options) {
        if (typeof target === "string") {
          Array.from(registry.rootElement.querySelectorAll(target)).forEach((element) => {
            applyQHTMLStyle(element, this, Object.assign({}, options || {}, { registry }));
          });
          return;
        }
        applyQHTMLStyle(target, this, Object.assign({}, options || {}, { registry }));
      },
      refresh() {
        const targets = registry.styleTargetsByName.get(name);
        if (!targets) {
          return;
        }
        targets.forEach((target) => {
          applyQHTMLStyle(target.element, this, {
            registry,
            defaultOnly: target.defaultOnly,
            track: false
          });
        });
        registry.rootElement.dispatchEvent(new CustomEvent("QHTMLStyleChanged", {
          bubbles: true,
          detail: { style: name, htmlNode: styleNode }
        }));
      }
    };
    return liveStyle;
  }


  function createLivePainter(painterNode, registry) {
    const name = qhtmlNodeName(painterNode);
    return {
      name,
      node: painterNode,
      bodyOverride: null,
      body() {
        if (this.bodyOverride !== null) {
          return this.bodyOverride;
        }
        return painterNode && typeof painterNode.body === "function" ? painterNode.body() : "";
      },
      setBody(nextBody) {
        this.bodyOverride = String(nextBody || "");
        if (painterNode && typeof painterNode.setBody === "function") {
          painterNode.setBody(this.bodyOverride);
          this.bodyOverride = null;
        }
        this.refresh();
      },
      applyTo(target, paintTarget) {
        const targetName = String(paintTarget || "background").trim() || "background";
        const applyOne = (element) => bindNamedPainterToElement(element, targetName, name, registry);
        if (typeof target === "string") {
          Array.from(registry.rootElement.querySelectorAll(target)).forEach(applyOne);
          return;
        }
        applyOne(target);
      },
      refresh() {
        if (!registry || !registry.paintBindingsByElement) {
          return;
        }
        registry.paintBindingsByElement.forEach((bindings, element) => {
          bindings.forEach((binding) => {
            if (binding && binding.painterName === name) {
              bindNamedPainterToElement(element, binding.targetName || binding.eventName, name, registry);
            }
          });
        });
      }
    };
  }

  function createLiveTheme(themeNode, registry) {
    const name = qhtmlNodeName(themeNode);
    return {
      name,
      node: themeNode,
      bodyOverride: null,
      body() {
        if (this.bodyOverride !== null) {
          return this.bodyOverride;
        }
        return themeNode && typeof themeNode.body === "function" ? themeNode.body() : "";
      },
      isDefaultTheme() {
        return themeNode && typeof themeNode.isDefaultTheme === "function" ? themeNode.isDefaultTheme() : false;
      },
      setBody(nextBody) {
        this.bodyOverride = String(nextBody || "");
        if (themeNode && typeof themeNode.setBody === "function") {
          themeNode.setBody(this.bodyOverride);
          this.bodyOverride = null;
        }
        this.refresh();
      },
      applyTo(target) {
        const scope = typeof target === "string" ? registry.rootElement.querySelector(target) : target;
        applyThemeToScope(scope || registry.rootElement, this, registry, new Set());
      },
      refresh() {
        applyThemeToScope(registry.rootElement, this, registry, new Set());
        registry.rootElement.dispatchEvent(new CustomEvent("QHTMLThemeChanged", {
          bubbles: true,
          detail: { theme: name, htmlNode: themeNode }
        }));
      }
    };
  }


  function stripTopLevelBlocksBySelector(text, selectorName) {
    let out = String(text || "");
    parseThemeBlocks(out).slice().reverse().forEach((block) => {
      if (String(block.selector || "").trim() === selectorName) {
        out = out.slice(0, block.start) + "\n" + out.slice(block.end);
      }
    });
    return out;
  }

  function stylePainterRules(cssText) {
    const rules = [];
    parseThemeBlocks(cssText).forEach((block) => {
      if (String(block.selector || "").trim() !== "q-style-painter") {
        return;
      }
      parseThemeBlocks(block.body).forEach((targetBlock) => {
        const targetName = String(targetBlock.selector || "").trim().toLowerCase();
        const painterNames = String(targetBlock.body || "")
          .replace(/\/\*[\s\S]*?\*\//g, " ")
          .replace(/;/g, " ")
          .split(/\s+/)
          .map((item) => item.trim())
          .filter(Boolean);
        painterNames.forEach((painterName) => {
          rules.push({ targetName, painterName });
        });
      });
    });
    return rules;
  }

  function cssTextWithoutStylePainters(cssText) {
    return stripTopLevelBlocksBySelector(cssText, "q-style-painter");
  }

  function paintEventNameForStyleTarget(targetName) {
    const name = String(targetName || "").trim().toLowerCase();
    if (name === "background" || name === "background-image" || name === "paintbackground") {
      return "paintbackground";
    }
    if (name === "border" || name === "border-image" || name === "border-image-source" || name === "paintborder") {
      return "paintborder";
    }
    if (name === "mask" || name === "mask-image" || name === "-webkit-mask-image" || name === "paintmask") {
      return "paintmask";
    }
    return "paintbackground";
  }

  function applyStylePainterRules(domElement, cssText, registry) {
    if (!domElement || !registry) {
      return;
    }
    stylePainterRules(cssText).forEach((rule) => {
      bindNamedPainterToElement(domElement, rule.targetName, rule.painterName, registry);
    });
  }

  function applyQHTMLStyle(domElement, styleDef, options) {
    if (!domElement || !styleDef) {
      return;
    }
    const registry = options && options.registry;
    const styleName = styleDef.name || qhtmlNodeName(styleDef);
    if (registry && styleName && (!options || options.track !== false)) {
      if (!registry.styleTargetsByName.has(styleName)) {
        registry.styleTargetsByName.set(styleName, new Map());
      }
      registry.styleTargetsByName.get(styleName).set(domElement, {
        element: domElement,
        defaultOnly: options && options.defaultOnly === true
      });
    }

    const defaultOnly = options && options.defaultOnly === true;
    const classText = typeof styleDef.classList === "function" ? styleDef.classList() : "";
    String(classText || "").split(/\s+/).filter(Boolean).forEach((className) => {
      domElement.classList.add(className);
    });

    const rawCssText = typeof styleDef.cssText === "function" ? styleDef.cssText() : "";
    if (registry) {
      applyStylePainterRules(domElement, rawCssText, registry);
      applyTransitionApplications(domElement, transitionApplicationsFromStyleText(rawCssText, registry));
    }
    const cssText = cssTextWithoutTransitionBlocks(cssTextWithoutStylePainters(rawCssText), registry);
    cssDeclarations(cssText).forEach((decl) => {
      if (defaultOnly && domElement.style.getPropertyValue(decl.name)) {
        return;
      }
      domElement.style.setProperty(decl.name, decl.value);
    });
    reapplyPaintTargetsForElement(domElement, registry);
  }

  function isInlineParentStyleNode(styleNode) {
    if (!styleNode || qhtmlNodeType(styleNode) !== "QHTMLStyle") {
      return false;
    }
    const styleName = qhtmlNodeName(styleNode);
    if (String(styleName || "").trim()) {
      return false;
    }
    if (typeof styleNode.keyword === "function") {
      return String(styleNode.keyword() || "").trim() === "style";
    }
    return true;
  }

  function applyInlineChildStyles(domElement, qhtmlNode, registry) {
    if (!domElement || !qhtmlNode) {
      return;
    }
    const count = typeof qhtmlNode.childCount === "function" ? qhtmlNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      if (isInlineParentStyleNode(child)) {
        applyQHTMLStyle(domElement, child, { registry, track: false });
      }
    }
  }

  function unwrapApplication(applicationElement) {
    if (!applicationElement || !applicationElement.parentNode) {
      return null;
    }
    const parent = applicationElement.parentNode;
    while (applicationElement.firstChild) {
      parent.insertBefore(applicationElement.firstChild, applicationElement);
    }
    parent.removeChild(applicationElement);
    return parent;
  }

  function findThemeBlockClose(text, openIndex) {
    let depth = 1;
    let index = openIndex + 1;
    let quote = "";
    let escape = false;
    for (; index < text.length; index += 1) {
      const ch = text[index];
      if (quote) {
        if (escape) {
          escape = false;
        } else if (ch === "\\") {
          escape = true;
        } else if (ch === quote) {
          quote = "";
        }
        continue;
      }
      if (ch === "\"" || ch === "'" || ch === "`") {
        quote = ch;
        continue;
      }
      if (ch === "{") {
        depth += 1;
      } else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          return index;
        }
      }
    }
    return -1;
  }

  function parseThemeBlocks(body) {
    const text = String(body || "");
    const blocks = [];
    let cursor = 0;
    while (cursor < text.length) {
      const openIndex = text.indexOf("{", cursor);
      if (openIndex < 0) {
        break;
      }
      const closeIndex = findThemeBlockClose(text, openIndex);
      if (closeIndex < 0) {
        break;
      }
      const selector = text.slice(cursor, openIndex).trim();
      if (selector) {
        blocks.push({
          selector,
          body: text.slice(openIndex + 1, closeIndex).trim(),
          start: cursor,
          open: openIndex,
          end: closeIndex + 1
        });
      }
      cursor = closeIndex + 1;
    }
    return blocks;
  }

  function parseThemeRuleBody(body) {
    let namedStyleText = String(body || "");
    const inlineStyles = [];
    const childBlocks = parseThemeBlocks(namedStyleText);

    childBlocks.slice().reverse().forEach((block) => {
      if (block.selector === "q-style") {
        inlineStyles.unshift(block.body);
        namedStyleText = namedStyleText.slice(0, block.start) + " " + namedStyleText.slice(block.end);
      }
    });

    const trimmed = namedStyleText.trim();
    const styleNames = [];
    if (trimmed) {
      if (/[;:]/.test(trimmed)) {
        inlineStyles.push(trimmed);
      } else {
        styleNames.push(...trimmed.split(/\s+/).filter(Boolean));
      }
    }

    return { styleNames, inlineStyles };
  }

  function parseThemeRules(body) {
    return parseThemeBlocks(body).map((block) => {
      const parsed = parseThemeRuleBody(block.body);
      return {
        selector: block.selector,
        styleNames: parsed.styleNames,
        inlineStyles: parsed.inlineStyles
      };
    });
  }

  function applyInlineQHTMLStyle(element, cssText, options) {
    if (!element) {
      return;
    }
    const registry = options && options.registry ? options.registry : null;
    const defaultOnly = options && options.defaultOnly === true;
    if (registry) {
      applyStylePainterRules(element, cssText, registry);
    }
    cssDeclarations(cssTextWithoutStylePainters(cssText)).forEach((decl) => {
      if (defaultOnly && element.style.getPropertyValue(decl.name)) {
        return;
      }
      element.style.setProperty(decl.name, decl.value);
    });
    if (registry) {
      reapplyPaintTargetsForElement(element, registry);
    }
  }

  function applyThemeToScope(scopeElement, themeDef, registry, seen) {
    if (!scopeElement || !themeDef || !registry) {
      return;
    }
    const themeName = themeDef.name || qhtmlNodeName(themeDef);
    const seenThemes = seen || new Set();
    if (themeName && seenThemes.has(themeName)) {
      return;
    }
    if (themeName) {
      seenThemes.add(themeName);
    }

    if (themeName && registry.themeScopesByName) {
      if (!registry.themeScopesByName.has(themeName)) {
        registry.themeScopesByName.set(themeName, new Set());
      }
      registry.themeScopesByName.get(themeName).add(scopeElement);
    }

    const defaultOnly = typeof themeDef.isDefaultTheme === "function" && themeDef.isDefaultTheme();
    parseThemeRules(typeof themeDef.body === "function" ? themeDef.body() : "").forEach((rule) => {
      if (rule.selector === "q-child-theme") {
        rule.styleNames.forEach((childThemeName) => {
          applyThemeToScope(scopeElement, registry.themesByName.get(childThemeName), registry, seenThemes);
        });
        return;
      }

      if (registry.themesByName.has(rule.selector) &&
          rule.styleNames.length === 0 &&
          rule.inlineStyles.length === 0) {
        applyThemeToScope(scopeElement, registry.themesByName.get(rule.selector), registry, seenThemes);
        return;
      }

      let matches = [];
      try {
        if (scopeElement.matches && scopeElement.matches(rule.selector)) {
          matches.push(scopeElement);
        }
        matches.push(...Array.from(scopeElement.querySelectorAll(rule.selector)));
      } catch (error) {
        console.error(`Invalid q-theme selector "${rule.selector}"`, error);
        return;
      }
      matches.forEach((element) => {
        rule.inlineStyles.forEach((cssText) => {
          applyInlineQHTMLStyle(element, cssText, { defaultOnly, registry });
        });
        rule.styleNames.forEach((styleName) => {
          const styleDef = registry.stylesByName.get(styleName);
          if (styleDef) {
            applyQHTMLStyle(element, styleDef, { defaultOnly, registry });
          }
        });
      });
    });
  }

  function renderedElementsForQHTMLNode(node, registry) {
    if (!node || !registry) {
      return [];
    }
    const uuid = qhtmlNodeUuid(node);
    if (!uuid) {
      return [];
    }
    if (qhtmlNodeType(node) === "QHTMLComponentInstance" &&
        registry.rootElement &&
        typeof registry.rootElement.querySelectorAll === "function") {
      const escaped = qhtmlCssString(uuid);
      return Array.from(registry.rootElement.querySelectorAll(`[component-instance="${escaped}"]`));
    }
    if (registry.rootElement && typeof registry.rootElement.querySelectorAll === "function") {
      const escaped = qhtmlCssString(uuid);
      const matches = Array.from(registry.rootElement.querySelectorAll(
        `[${QHTML_DOM_UUID_ATTRIBUTE}="${escaped}"], [qhtml-node="${escaped}"]`
      ));
      if (registry.rootElement.getAttribute && qhtmlDomUuid(registry.rootElement) === uuid) {
        matches.unshift(registry.rootElement);
      }
      if (matches.length > 0) {
        return matches;
      }
    }
    const element = registry.elementsByUuid && typeof registry.elementsByUuid.get === "function"
      ? registry.elementsByUuid.get(uuid)
      : qhtmlDomElementByUuid(registry.rootElement, uuid);
    return element ? [element] : [];
  }

  function collectThemeApplicationScopeElements(node, registry, out, seen) {
    if (!node || !registry) {
      return;
    }
    const activeSeen = seen || new Set();
    const uuid = qhtmlNodeUuid(node);
    if (uuid && activeSeen.has(uuid)) {
      return;
    }
    if (uuid) {
      activeSeen.add(uuid);
    }
    const rendered = renderedElementsForQHTMLNode(node, registry);
    if (rendered.length > 0) {
      rendered.forEach((element) => {
        if (element && out.indexOf(element) < 0) {
          out.push(element);
        }
      });
      return;
    }
    qhtmlNodeChildren(node).forEach((child) => {
      collectThemeApplicationScopeElements(child, registry, out, activeSeen);
    });
  }

  function applyThemeApplicationsFromQHTMLTree(registry) {
    if (!registry || !registry.nodesByUuid || !registry.themesByName) {
      return;
    }
    registry.nodesByUuid.forEach((node) => {
      if (qhtmlNodeType(node) !== "QHTMLThemeApplication") {
        return;
      }
      const themeName = qhtmlNodeName(node);
      const themeDef = registry.themesByName.get(themeName);
      if (!themeDef) {
        return;
      }
      const scopes = [];
      qhtmlNodeChildren(node).forEach((child) => {
        collectThemeApplicationScopeElements(child, registry, scopes, new Set());
      });
      themeApplicationOwnerScopes(node, registry).forEach((scopeElement) => {
        if (scopeElement && scopes.indexOf(scopeElement) < 0) {
          scopes.push(scopeElement);
        }
      });
      scopes.forEach((scopeElement) => {
        applyThemeToScope(scopeElement, themeDef, registry, new Set());
      });
    });
  }

  function applyStyleAndThemeApplications(rootElement, registry) {
    const styleApplications = Array.from(rootElement.querySelectorAll("q-style-application[qhtml-style]"));
    styleApplications.forEach((applicationElement) => {
      const styleDef = registry.stylesByName.get(applicationElement.getAttribute("qhtml-style"));
      if (styleDef) {
        Array.from(applicationElement.querySelectorAll("*")).forEach((element) => {
          if (element.tagName.toLowerCase() !== "q-style-application") {
            applyQHTMLStyle(element, styleDef, { defaultOnly: false, registry });
          }
        });
      }
      unwrapApplication(applicationElement);
    });

    applyThemeApplicationsFromQHTMLTree(registry);
  }

  function refreshThemeScopesForElement(element, registry) {
    if (!element || !registry || !registry.themeScopesByName || !registry.themesByName) {
      return;
    }
    registry.themeScopesByName.forEach((scopes, themeName) => {
      const themeDef = registry.themesByName.get(themeName);
      if (!themeDef) {
        return;
      }
      scopes.forEach((scopeElement) => {
        if (scopeElement === element ||
            (scopeElement.contains && scopeElement.contains(element)) ||
            (element.contains && element.contains(scopeElement))) {
          applyThemeToScope(scopeElement, themeDef, registry, new Set());
        }
      });
    });
  }

  function qhtmlPaintCssValue(value) {
    if (value == null) {
      return "";
    }
    if (typeof value === "number") {
      return String(value);
    }
    return String(value);
  }

  function paintPropertyEntries(domElement, handlerNode) {
    const parameters = splitList(typeof handlerNode.parameters === "function" ? handlerNode.parameters() : "");
    if (parameters.length === 0) {
      return [];
    }
    const propertyListName = parameters[0];
    const listEntry = domElement.__qhtmlProperties && domElement.__qhtmlProperties[propertyListName];
    if (!listEntry) {
      console.error(`QHTML paint handler expected q-property "${propertyListName}" to contain QHTMLProperty references`);
      return null;
    }
    const raw = String(listEntry.rawValue || "").trim();
    const inner = raw.startsWith("[") && raw.endsWith("]") ? raw.slice(1, -1) : raw;
    const entries = [];
    for (const item of splitTopLevel(inner)) {
      const name = String(item || "").trim().replace(/^this\./, "");
      const entry = domElement.__qhtmlProperties && domElement.__qhtmlProperties[name];
      if (!entry) {
        console.error(`QHTML paint property "${item}" is not a QHTMLProperty on this component`);
        return null;
      }
      entries.push({ name, entry });
    }
    return entries;
  }

  function paintPropertyEntryFromNode(domElement, propertyNode, registry) {
    const name = qhtmlNodeName(propertyNode);
    if (!name) {
      return null;
    }
    const rawValue = typeof propertyNode.value === "function" ? propertyNode.value() : "";
    return {
      name,
      entry: {
        rawValue,
        value: resolvePropertyValue(rawValue, domElement, propertyNode, registry),
        htmlNode: propertyNode
      }
    };
  }

  function painterPropertyEntries(domElement, painter, registry) {
    const painterNode = painter && (painter.node || painter);
    const entries = [];
    const count = painterNode && typeof painterNode.childCount === "function" ? painterNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = painterNode.childAt(index);
      if (qhtmlNodeType(child) !== "QHTMLProperty") {
        continue;
      }
      const entry = paintPropertyEntryFromNode(domElement, child, registry);
      if (entry) {
        entries.push(entry);
      }
    }
    return entries;
  }

  function paintTargetForEventName(eventName) {
    if (eventName === "paintbackground") {
      return ["background", "background-image"];
    }
    if (eventName === "paintborder") {
      return ["border-image-source"];
    }
    if (eventName === "paintmask") {
      return ["mask-image", "-webkit-mask-image"];
    }
    return [];
  }

  function applyPaintTargetStyles(domElement, eventName, paintName) {
    const paintValue = `paint(${paintName})`;
    paintTargetForEventName(eventName).forEach((styleName) => {
      domElement.style.setProperty(styleName, paintValue, "important");
    });
    if (eventName === "paintbackground") {
      if (!domElement.style.getPropertyValue("background-repeat")) {
        domElement.style.setProperty("background-repeat", "no-repeat");
      }
      if (!domElement.style.getPropertyValue("background-size")) {
        domElement.style.setProperty("background-size", "100% 100%");
      }
      if (!domElement.style.getPropertyValue("background-position")) {
        domElement.style.setProperty("background-position", "center");
      }
    }
    if (eventName === "paintborder") {
      if (!domElement.style.getPropertyValue("border-style")) {
        domElement.style.setProperty("border-style", "solid", "important");
      }
      const computed = globalScope.getComputedStyle ? globalScope.getComputedStyle(domElement) : null;
      const borderWidth = computed ? Number.parseFloat(computed.borderTopWidth || "0") : 0;
      if (!domElement.style.getPropertyValue("border-width") && !borderWidth) {
        domElement.style.setProperty("border-width", "16px", "important");
      }
      if (!domElement.style.getPropertyValue("border-color")) {
        domElement.style.setProperty("border-color", "transparent", "important");
      }
      if (!domElement.style.getPropertyValue("border-image-slice")) {
        domElement.style.setProperty("border-image-slice", "16 fill", "important");
      }
      if (!domElement.style.getPropertyValue("border-image-repeat")) {
        domElement.style.setProperty("border-image-repeat", "stretch", "important");
      }
    }
    if (eventName === "paintmask") {
      [
        ["mask-repeat", "no-repeat"],
        ["-webkit-mask-repeat", "no-repeat"],
        ["mask-size", "100% 100%"],
        ["-webkit-mask-size", "100% 100%"],
        ["mask-position", "center"],
        ["-webkit-mask-position", "center"]
      ].forEach(([styleName, value]) => {
        if (!domElement.style.getPropertyValue(styleName)) {
          domElement.style.setProperty(styleName, value);
        }
      });
    }
  }

  function supportsPaintWorklet() {
    return Boolean(globalScope.CSS && "paintWorklet" in globalScope.CSS && globalScope.CSS.paintWorklet);
  }

  function ensurePaintWorklet() {
    if (supportsPaintWorklet()) {
      return Promise.resolve(true);
    }
    if (!globalScope.CSS || globalScope.CSS.paintWorklet !== undefined) {
      return Promise.resolve(false);
    }
    try {
      return import("https://unpkg.com/css-paint-polyfill").then(() => supportsPaintWorklet());
    } catch (error) {
      return Promise.resolve(false);
    }
  }

  function reapplyPaintTargetsForElement(domElement, registry) {
    if (!domElement || !registry || !registry.paintBindingsByElement) {
      return;
    }
    const bindings = registry.paintBindingsByElement.get(domElement);
    if (!bindings) {
      return;
    }
    bindings.forEach((binding) => {
      if (binding && binding.registered) {
        applyPaintTargetStyles(domElement, binding.eventName, binding.paintName);
      }
    });
  }

  function preparePaintElementBox(domElement, properties) {
    if (!domElement) {
      return;
    }
    const computed = globalScope.getComputedStyle ? globalScope.getComputedStyle(domElement) : null;
    if (!computed || computed.display === "inline") {
      domElement.style.setProperty("display", "block");
    }
    domElement.style.setProperty("contain", "paint");
    const byName = new Map(properties.map((property) => [property.name, property.entry.value]));
    const width = byName.get("width");
    const height = byName.get("height");
    if (width && !domElement.style.getPropertyValue("width")) {
      domElement.style.setProperty("width", qhtmlPaintCssValue(width));
    }
    if (height && !domElement.style.getPropertyValue("height")) {
      domElement.style.setProperty("height", qhtmlPaintCssValue(height));
    }
    if (width && !domElement.style.getPropertyValue("min-width")) {
      domElement.style.setProperty("min-width", qhtmlPaintCssValue(width));
    }
    if (height && !domElement.style.getPropertyValue("min-height")) {
      domElement.style.setProperty("min-height", qhtmlPaintCssValue(height));
    }
  }

  function registerPaintProperty(propertyName, value) {
    if (!globalScope.CSS || typeof globalScope.CSS.registerProperty !== "function") {
      return;
    }
    const cssName = `--${propertyName}`;
    const text = qhtmlPaintCssValue(value);
    let syntax = "*";
    let initialValue = text || " ";
    if (/^[-+]?(?:\d+|\d*\.\d+)px$/.test(text)) {
      syntax = "<length>";
      initialValue = text;
    } else if (/^[-+]?(?:\d+|\d*\.\d+)$/.test(text)) {
      syntax = "<number>";
      initialValue = text;
    } else if (/^(?:#[0-9a-fA-F]{3,8}|[A-Za-z]+|rgb\(.*\)|rgba\(.*\)|hsl\(.*\)|hsla\(.*\))$/.test(text)) {
      syntax = "<color>";
      initialValue = text;
    }
    try {
      globalScope.CSS.registerProperty({
        name: cssName,
        syntax,
        inherits: false,
        initialValue
      });
    } catch (error) {
      // registerProperty throws when the custom property is already registered.
    }
  }

  function expandPainterInvocations(body, registry, mode) {
    let expanded = String(body || "");
    if (!registry || !registry.paintersByName || registry.paintersByName.size === 0) {
      return expanded;
    }
    const invocationMode = mode === "call" ? "call" : "inline";
    const names = Array.from(registry.paintersByName.keys())
      .filter((name) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(String(name || "")))
      .sort((a, b) => b.length - a.length);
    names.forEach((name) => {
      const rx = new RegExp(`(^|[^A-Za-z0-9_$\\.])${name}\\s*\\{\\s*\\}`, "g");
      expanded = expanded.replace(rx, (match, prefix) => {
        if (invocationMode === "call") {
          return `${prefix}__qhtmlInvokePainter(${JSON.stringify(name)});`;
        }
        const painter = registry.paintersByName.get(name);
        const painterBody = painter && typeof painter.body === "function" ? painter.body() : "";
        return `${prefix}\n${painterBody}\n`;
      });
    });
    return expanded;
  }

  function paintScopeSource() {
    return `
      const scope = {
        ctx,
        context: ctx,
        geom,
        width: geom.width,
        height: geom.height,
        clearRect(...args) {
          if (args.length <= 1) {
            ctx.clearRect(0, 0, geom.width, geom.height);
            if (args.length === 1 && args[0]) {
              ctx.fillStyle = args[0];
              ctx.fillRect(0, 0, geom.width, geom.height);
            }
            return;
          }
          return ctx.clearRect(...args);
        },
        fillRect(...args) { return ctx.fillRect(...args); },
        strokeRect(...args) { return ctx.strokeRect(...args); },
        beginPath(...args) { return ctx.beginPath(...args); },
        closePath(...args) { return ctx.closePath(...args); },
        moveTo(...args) { return ctx.moveTo(...args); },
        lineTo(...args) { return ctx.lineTo(...args); },
        arc(...args) { return ctx.arc(...args); },
        quadraticCurveTo(...args) { return ctx.quadraticCurveTo(...args); },
        bezierCurveTo(...args) { return ctx.bezierCurveTo(...args); },
        rect(...args) { return ctx.rect(...args); },
        fill(...args) { return ctx.fill(...args); },
        stroke(...args) { return ctx.stroke(...args); },
        fillText(...args) { return ctx.fillText(...args); },
        strokeText(...args) { return ctx.strokeText(...args); },
        measureText(...args) { return ctx.measureText(...args); },
        createLinearGradient(...args) { return ctx.createLinearGradient(...args); },
        createRadialGradient(...args) { return ctx.createRadialGradient(...args); },
        createConicGradient(...args) { return typeof ctx.createConicGradient === "function" ? ctx.createConicGradient(...args) : null; },
        createPattern(...args) { return ctx.createPattern(...args); },
        save(...args) { return ctx.save(...args); },
        restore(...args) { return ctx.restore(...args); },
        translate(...args) { return ctx.translate(...args); },
        rotate(...args) { return ctx.rotate(...args); },
        scale(...args) { return ctx.scale(...args); },
        setTransform(...args) { return ctx.setTransform(...args); },
        resetTransform(...args) { return typeof ctx.resetTransform === "function" ? ctx.resetTransform(...args) : ctx.setTransform(1, 0, 0, 1, 0, 0); },
        setFill(value) { ctx.fillStyle = value; },
        drawRect(x, y, width, height) { ctx.fillRect(x, y, width, height); }
      };
      ["fillStyle", "strokeStyle", "lineWidth", "lineCap", "lineJoin", "miterLimit", "font", "textAlign", "textBaseline", "globalAlpha", "globalCompositeOperation", "shadowColor", "shadowBlur", "shadowOffsetX", "shadowOffsetY"].forEach((propertyName) => {
        Object.defineProperty(scope, propertyName, {
          configurable: true,
          enumerable: true,
          get() { return ctx[propertyName]; },
          set(value) { ctx[propertyName] = value; }
        });
      });
    `;
  }

  function registerPaintWorkletBody(domElement, eventName, body, properties, registry, sourceNode, nameHint) {
    if (!domElement || !eventName) {
      return;
    }
    const safeProperties = Array.isArray(properties) ? properties : [];
    const sourceUuid = sourceNode && typeof sourceNode.qhtmlUUID === "function" ? sourceNode.qhtmlUUID() : Math.random().toString(36).slice(2);
    const hint = String(nameHint || eventName || "paint").replace(/[^A-Za-z0-9_-]/g, "-");
    const uniqueId = `${sourceUuid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const paintName = `qhtml-${eventName}-${hint}-${uniqueId}`.replace(/[^A-Za-z0-9_-]/g, "-");

    domElement.__qhtmlPaintHandlerNodes = domElement.__qhtmlPaintHandlerNodes || new Set();
    const bindingKey = `${eventName}:${paintName}`;
    if (domElement.__qhtmlPaintHandlerNodes.has(bindingKey)) {
      return;
    }
    domElement.__qhtmlPaintHandlerNodes.add(bindingKey);

    const propertyNames = safeProperties.map((property) => property.name);
    const expandedBody = decodeQHTMLScriptEntities(expandPainterInvocations(body, registry, "inline"));
    const workletBodyPrefix = [
      'var white = "white";',
      'var black = "black";',
      'var transparent = "transparent";',
      ...propertyNames
        .filter((name) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name))
        .map((name) => `var ${name} = this[${JSON.stringify(name)}];`)
    ].join("\n");
    preparePaintElementBox(domElement, safeProperties);
    safeProperties.forEach((property) => {
      registerPaintProperty(property.name, property.entry.value);
      domElement.style.setProperty(`--${property.name}`, qhtmlPaintCssValue(property.entry.value));
      domElement.addEventListener(`${property.name}changed`, (event) => {
        domElement.style.setProperty(`--${property.name}`, qhtmlPaintCssValue(event.detail.value));
        registerPaintProperty(property.name, event.detail.value);
      });
    });

    if (typeof Blob !== "function" || !globalScope.URL || typeof globalScope.URL.createObjectURL !== "function") {
      console.warn("CSS Paint Worklet is not available; QHTML paint handler was not registered.");
      domElement.dispatchEvent(new CustomEvent("QHTMLPaintWorkletUnavailable", {
        bubbles: true,
        detail: { eventName, paintName, htmlNode: sourceNode }
      }));
      return;
    }

    const workletSource = `
      class QHTMLPaintWorklet {
        static get inputProperties() { return ${JSON.stringify(propertyNames.map((name) => `--${name}`))}; }
        paint(ctx, geom, properties) {
          const read = (name) => {
            const value = properties.get("--" + name);
            return value && typeof value.toString === "function" ? value.toString().trim() : "";
          };
          const typed = (value) => {
            const text = String(value || "").trim();
            const numeric = text.match(/^[-+]?(?:\\d+|\\d*\\.\\d+)(?:px)?$/);
            return numeric ? Number.parseFloat(text) : text;
          };
          ${paintScopeSource()}
          ${JSON.stringify(propertyNames)}.forEach((name) => { scope[name] = typed(read(name)); });
          const run = function(context) {
            ${workletBodyPrefix}
            ${expandedBody}
          };
          return run.call(scope, ctx);
        }
      }
      registerPaint(${JSON.stringify(paintName)}, QHTMLPaintWorklet);
    `;
    const blobUrl = globalScope.URL.createObjectURL(new Blob([workletSource], { type: "application/javascript" }));
    domElement.__qhtmlPaintWorklets = domElement.__qhtmlPaintWorklets || {};
    domElement.__qhtmlPaintWorklets[paintName] = {
      blobUrl,
      eventName,
      paintName,
      painterName: nameHint || "",
      targetName: eventName,
      htmlNode: sourceNode,
      workletSource,
      registered: false
    };
    const paintBinding = domElement.__qhtmlPaintWorklets[paintName];
    if (registry && registry.paintBindingsByElement) {
      if (!registry.paintBindingsByElement.has(domElement)) {
        registry.paintBindingsByElement.set(domElement, new Map());
      }
      registry.paintBindingsByElement.get(domElement).set(paintName, paintBinding);
    }

    ensurePaintWorklet().then((available) => {
      if (!available) {
        console.warn("CSS Paint Worklet is not available; QHTML paint handler was not registered.");
        domElement.dispatchEvent(new CustomEvent("QHTMLPaintWorkletUnavailable", {
          bubbles: true,
          detail: { eventName, paintName, blobUrl, htmlNode: sourceNode }
        }));
        return null;
      }
      return globalScope.CSS.paintWorklet.addModule(blobUrl);
    }).then((result) => {
      if (result === null) {
        return;
      }
      paintBinding.registered = true;
      applyPaintTargetStyles(domElement, eventName, paintName);
      domElement.dispatchEvent(new CustomEvent("QHTMLPaintWorkletReady", {
        bubbles: true,
        detail: { eventName, paintName, blobUrl, htmlNode: sourceNode }
      }));
    }).catch((error) => {
      paintBinding.error = error;
      console.error("Unable to register QHTML paint worklet", error);
      domElement.dispatchEvent(new CustomEvent("QHTMLPaintWorkletError", {
        bubbles: true,
        detail: { eventName, paintName, blobUrl, htmlNode: sourceNode, error }
      }));
    });
  }

  function bindNamedPainterToElement(domElement, targetName, painterName, registry) {
    if (!domElement || !registry || !registry.paintersByName) {
      return;
    }
    const painter = registry.paintersByName.get(String(painterName || "").trim());
    if (!painter) {
      console.error(`QHTML painter "${painterName}" was not found.`);
      return;
    }
    const eventName = paintEventNameForStyleTarget(targetName);
    const properties = painterPropertyEntries(domElement, painter, registry);
    registerPaintWorkletBody(
      domElement,
      eventName,
      typeof painter.body === "function" ? painter.body() : "",
      properties,
      registry,
      painter.node || painter,
      painter.name || painterName
    );
  }

  function bindPaintHandler(domElement, handlerNode, registry) {
    const eventName = String(handlerNode.eventName() || "").toLowerCase();
    if (!isPaintEventName(eventName)) {
      return;
    }
    const handlerUuid = typeof handlerNode.qhtmlUUID === "function" ? handlerNode.qhtmlUUID() : "";
    if (handlerUuid) {
      domElement.__qhtmlPaintHandlerNodes = domElement.__qhtmlPaintHandlerNodes || new Set();
      const bindingKey = `handler:${handlerUuid}`;
      if (domElement.__qhtmlPaintHandlerNodes.has(bindingKey)) {
        return;
      }
      domElement.__qhtmlPaintHandlerNodes.add(bindingKey);
    }
    const properties = paintPropertyEntries(domElement, handlerNode);
    if (!properties) {
      return;
    }
    const body = typeof handlerNode.body === "function" ? handlerNode.body() : "";
    registerPaintWorkletBody(domElement, eventName, body, properties, registry, handlerNode, handlerUuid || eventName);
  }

  function bindPaintHandlers(domElement, instanceNode, registry) {
    if (!domElement || !instanceNode) {
      return;
    }
    const count = typeof instanceNode.childCount === "function" ? instanceNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = instanceNode.childAt(index);
      const childType = child && typeof child.qhtmlType === "function" ? child.qhtmlType() : "";
      if (childType === "QHTMLEventHandler" && isPaintEventName(String(child.eventName() || "").toLowerCase())) {
        bindPaintHandler(domElement, child, registry);
      }
    }
  }


  function installCanvasContextProxy(scope, context, width, height) {
    if (!scope || !context) {
      return scope;
    }
    Object.defineProperty(scope, "context", {
      configurable: true,
      enumerable: true,
      value: context
    });
    Object.defineProperty(scope, "ctx", {
      configurable: true,
      enumerable: true,
      value: context
    });
    Object.defineProperty(scope, "width", {
      configurable: true,
      enumerable: true,
      value: width
    });
    Object.defineProperty(scope, "height", {
      configurable: true,
      enumerable: true,
      value: height
    });
    ["clearRect", "fillRect", "strokeRect", "beginPath", "closePath", "moveTo", "lineTo", "arc", "quadraticCurveTo", "bezierCurveTo", "rect", "fill", "stroke", "fillText", "strokeText", "measureText", "save", "restore", "translate", "rotate", "scale", "setTransform", "resetTransform", "drawImage", "createLinearGradient", "createRadialGradient", "createPattern", "putImageData", "getImageData"].forEach((methodName) => {
      if (typeof context[methodName] !== "function") {
        return;
      }
      Object.defineProperty(scope, methodName, {
        configurable: true,
        enumerable: false,
        value: function (...args) {
          return context[methodName](...args);
        }
      });
    });
    ["fillStyle", "strokeStyle", "lineWidth", "lineCap", "lineJoin", "miterLimit", "font", "textAlign", "textBaseline", "globalAlpha", "globalCompositeOperation", "shadowColor", "shadowBlur", "shadowOffsetX", "shadowOffsetY", "imageSmoothingEnabled", "imageSmoothingQuality"].forEach((propertyName) => {
      Object.defineProperty(scope, propertyName, {
        configurable: true,
        enumerable: true,
        get() { return context[propertyName]; },
        set(value) { context[propertyName] = value; }
      });
    });
    scope.setFill = function setFill(value) { context.fillStyle = value; };
    scope.drawRect = function drawRect(x, y, rectWidth, rectHeight) { context.fillRect(x, y, rectWidth, rectHeight); };
    return scope;
  }

  function runCanvasPaintBody(canvasElement, context, body, registry, invokePainter) {
    const width = canvasElement.width || Math.round(canvasElement.getBoundingClientRect().width) || 0;
    const height = canvasElement.height || Math.round(canvasElement.getBoundingClientRect().height) || 0;
    const scope = installCanvasContextProxy(Object.create(canvasElement), context, width, height);
    const contextVars = executionContextFor(canvasElement, registry, ["context", "__qhtmlInvokePainter"]);
    const expandedBody = expandPainterInvocations(body, registry, "call");
    try {
      return new Function(
        "context",
        "__qhtmlInvokePainter",
        ...contextVars.names,
        `with(this) {\n${expandedBody}\n}`
      ).apply(scope, [context, invokePainter, ...contextVars.values]);
    } catch (error) {
      reportQHTMLExecutionContext(error, {
        kind: "canvas-paint",
        sender: canvasElement,
        args: [context]
      }, registry);
      if (reportQHTMLRuntimeError(canvasElement, error, registry)) {
        return undefined;
      }
      throw error;
    }
  }

  function bindCanvasRuntime(canvasElement, canvasNode, registry) {
    if (!canvasElement || !canvasNode || canvasElement.__qhtmlCanvasRuntimeBound) {
      return;
    }
    canvasElement.__qhtmlCanvasRuntimeBound = true;
    canvasElement.__qhtmlCanvasNode = canvasNode;

    const paintHandler = typeof canvasNode.paintHandler === "function" ? canvasNode.paintHandler() : null;
    const paintBody = paintHandler && typeof paintHandler.body === "function"
      ? paintHandler.body()
      : (typeof canvasNode.paintBody === "function" ? canvasNode.paintBody() : "");

    const repaint = function repaintQHTMLCanvas() {
      const rect = canvasElement.getBoundingClientRect ? canvasElement.getBoundingClientRect() : { width: 0, height: 0 };
      const cssWidth = Math.max(1, Math.round(rect.width || canvasElement.clientWidth || canvasElement.width || 300));
      const cssHeight = Math.max(1, Math.round(rect.height || canvasElement.clientHeight || canvasElement.height || 150));
      if (canvasElement.width !== cssWidth) {
        canvasElement.width = cssWidth;
      }
      if (canvasElement.height !== cssHeight) {
        canvasElement.height = cssHeight;
      }
      const context = canvasElement.getContext ? canvasElement.getContext("2d") : null;
      if (!context) {
        throw new Error("q-canvas could not create a 2D rendering context.");
      }
      context.clearRect(0, 0, canvasElement.width, canvasElement.height);
      const invokePainter = function invokePainter(painterName) {
        const painter = registry && registry.paintersByName ? registry.paintersByName.get(String(painterName || "")) : null;
        if (!painter || typeof painter.body !== "function") {
          throw new Error(`QHTML painter "${painterName}" was not found.`);
        }
        return runCanvasPaintBody(canvasElement, context, painter.body(), registry, invokePainter);
      };
      return runCanvasPaintBody(canvasElement, context, paintBody, registry, invokePainter);
    };

    canvasElement.repaint = repaint;
    canvasElement.paint = repaint;
    canvasElement.qhtmlPaint = repaint;

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(() => {
        globalScope.requestAnimationFrame(repaint);
      });
      observer.observe(canvasElement);
      canvasElement.__qhtmlCanvasResizeObserver = observer;
    }

    globalScope.requestAnimationFrame(repaint);
  }

  function handleQHTMLNodeAccessError(error, domElement, registry) {
    if (reportQHTMLRuntimeError(domElement || (registry && registry.rootElement) || null, error, registry)) {
      return "";
    }
    throw error;
  }

  function qhtmlNodeBodyText(node, domElement, registry) {
    try {
      if (!node) {
        return "";
      }
      const nodeType = qhtmlNodeType(node);
      if (typeof node.body === "function") {
        return String(node.body() || "");
      }
      if (typeof node.contents === "function") {
        return String(node.contents() || "");
      }
      if (nodeType !== "QHTMLMap" &&
          nodeType !== "QHTMLMapNode" &&
          typeof node.value === "function") {
        return String(node.value() || "");
      }
      if (typeof node.renderHtml === "function") {
        return String(node.renderHtml() || "");
      }
      return "";
    } catch (error) {
      return handleQHTMLNodeAccessError(error, domElement, registry);
    }
  }

  function qhtmlNodeChildrenText(node, domElement, registry) {
    let out = "";
    const count = node && typeof node.childCount === "function" ? node.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      out += qhtmlNodeBodyText(node.childAt(index), domElement, registry);
    }
    return out;
  }

  function normalizeAnchorEdge(value) {
    const edge = String(value || "").trim().toLowerCase();
    if (edge === "horizontalcenter" || edge === "centerx") {
      return "hcenter";
    }
    if (edge === "verticalcenter" || edge === "centery") {
      return "vcenter";
    }
    if (edge === "centre") {
      return "center";
    }
    return edge;
  }

  function anchorRuleValue(node, domElement, registry) {
    const body = qhtmlNodeChildrenText(node, domElement, registry).trim();
    if (body) {
      return body.replace(/;+\s*$/g, "").trim();
    }
    return qhtmlNodeBodyText(node, domElement, registry).replace(/;+\s*$/g, "").trim();
  }

  function collectAnchorRules(qhtmlNode, domElement, registry) {
    const rules = [];
    const count = qhtmlNode && typeof qhtmlNode.childCount === "function" ? qhtmlNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      const keyword = normalizeAnchorEdge(qhtmlNodeKeyword(child));
      if (keyword === "q-anchor") {
        const childCount = typeof child.childCount === "function" ? child.childCount() : 0;
        for (let childIndex = 0; childIndex < childCount; childIndex += 1) {
          const assignment = child.childAt(childIndex);
          if (qhtmlNodeType(assignment) !== "QHTMLPropertyAssignment") {
            continue;
          }
          const key = normalizeAnchorEdge(qhtmlNodeName(assignment));
          if (!key) {
            continue;
          }
          rules.push({ key, value: String(assignment.value() || "").trim() });
        }
        continue;
      }
      if (!keyword.startsWith("q-anchor-")) {
        continue;
      }
      const key = normalizeAnchorEdge(keyword.slice("q-anchor-".length));
      if (!key) {
        continue;
      }
      rules.push({ key, value: anchorRuleValue(child, domElement, registry) });
    }
    return rules;
  }

  function resolveAnchorTarget(expression, registry) {
    const cleaned = String(expression || "").trim().replace(/^["']|["']$/g, "");
    const match = /^([A-Za-z_$][A-Za-z0-9_$-]*)(?:\.([A-Za-z_$][A-Za-z0-9_$-]*))?$/.exec(cleaned);
    if (!match) {
      throw new Error(`Invalid q-anchor expression: ${cleaned}`);
    }
    const targetName = match[1];
    const targetEdge = normalizeAnchorEdge(match[2] || "left");
    const target = registry.elementsByName.get(targetName);
    if (!target) {
      throw new Error(`QHTML anchor target was not found: ${targetName}`);
    }
    return { target, targetEdge };
  }

  function edgeCoordinate(rect, edge, axis) {
    const normalized = normalizeAnchorEdge(edge);
    if (axis === "x") {
      if (normalized === "right") {
        return rect.right;
      }
      if (normalized === "hcenter" || normalized === "center") {
        return rect.left + rect.width / 2;
      }
      return rect.left;
    }
    if (normalized === "bottom") {
      return rect.bottom;
    }
    if (normalized === "vcenter" || normalized === "center") {
      return rect.top + rect.height / 2;
    }
    return rect.top;
  }

  function anchorTargetRect(target) {
    if (target && target.hasAttribute("component-instance") && target.firstElementChild) {
      return target.firstElementChild.getBoundingClientRect();
    }
    return target.getBoundingClientRect();
  }

  function applyAnchorRule(domElement, rule, registry, options) {
    const key = normalizeAnchorEdge(rule && rule.key);
    const value = String(rule && rule.value || "").trim();
    if (!key || !value) {
      return;
    }
    const parent = domElement.parentElement || registry.rootElement;
    const parentStyle = globalScope.getComputedStyle(parent);
    if (parentStyle.position === "static") {
      parent.style.position = "relative";
    }
    domElement.style.position = "absolute";

    const resolved = resolveAnchorTarget(value, registry);
    const parentRect = parent.getBoundingClientRect();
    const parentBorderLeft = parent.clientLeft || 0;
    const parentBorderTop = parent.clientTop || 0;
    const targetRect = anchorTargetRect(resolved.target);
    const selfRect = domElement.getBoundingClientRect();
    if (key === "left" || key === "right" || key === "hcenter" || key === "center") {
      const targetX = edgeCoordinate(targetRect, resolved.targetEdge, "x") - parentRect.left - parentBorderLeft + parent.scrollLeft;
      let left = targetX;
      if (key === "right") {
        left = targetX - selfRect.width;
      } else if (key === "hcenter" || key === "center") {
        left = targetX - selfRect.width / 2;
      }
      domElement.style.left = `${left}px`;
    }
    if (key === "top" || key === "bottom" || key === "vcenter" || key === "center") {
      const targetY = edgeCoordinate(targetRect, resolved.targetEdge, "y") - parentRect.top - parentBorderTop + parent.scrollTop;
      let top = targetY;
      if (key === "bottom") {
        top = targetY - selfRect.height;
      } else if (key === "vcenter" || key === "center") {
        top = targetY - selfRect.height / 2;
      }
      domElement.style.top = `${top}px`;
    }
    if ((!options || options.defer !== false) && typeof globalScope.requestAnimationFrame === "function") {
      globalScope.requestAnimationFrame(() => applyAnchorRule(domElement, rule, registry, { defer: false }));
    }
  }

  function applyAnchorPositioning(rootElement, registry) {
    if (!rootElement || !registry || !registry.nodesByUuid) {
      return;
    }
    const renderedElements = rootElement.querySelectorAll
      ? rootElement.querySelectorAll(QHTML_DOM_NODE_SELECTOR)
      : [];
    renderedElements.forEach((domElement) => {
      const qhtmlNode = qhtmlNodeForDomElement(domElement, registry);
      const rules = collectAnchorRules(qhtmlNode, domElement, registry);
      if (!rules.length) {
        return;
      }
      rules.forEach((rule) => applyAnchorRule(domElement, rule, registry));
    });
  }

  function refreshGeometryCssBindings(rootElement, registry) {
    if (!rootElement || !registry || !registry.nodesByUuid) {
      return;
    }
    const renderedElements = rootElement.querySelectorAll
      ? rootElement.querySelectorAll(QHTML_DOM_NODE_SELECTOR)
      : [];
    renderedElements.forEach((domElement) => {
      const qhtmlNode = qhtmlNodeForDomElement(domElement, registry);
      bindCssShortcutAssignments(domElement, qhtmlNode, registry);
    });
    if (typeof globalScope.requestAnimationFrame === "function") {
      globalScope.requestAnimationFrame(() => {
        renderedElements.forEach((domElement) => {
          const qhtmlNode = qhtmlNodeForDomElement(domElement, registry);
          bindCssShortcutAssignments(domElement, qhtmlNode, registry);
        });
      });
    }
  }

  function matchingBraceIndex(source, openIndex) {
    let depth = 0;
    let quote = "";
    let escape = false;
    for (let index = openIndex; index < source.length; index += 1) {
      const ch = source[index];
      if (quote) {
        if (escape) {
          escape = false;
        } else if (ch === "\\") {
          escape = true;
        } else if (ch === quote) {
          quote = "";
        }
        continue;
      }
      if (ch === "\"" || ch === "'" || ch === "`") {
        quote = ch;
        continue;
      }
      if (ch === "{") {
        depth += 1;
      } else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          return index;
        }
      }
    }
    return -1;
  }

  function readQuotedToken(source, startIndex) {
    const quote = source[startIndex];
    let escape = false;
    let value = quote;
    for (let index = startIndex + 1; index < source.length; index += 1) {
      const ch = source[index];
      value += ch;
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === quote) {
        return { value, end: index + 1 };
      }
    }
    return { value, end: source.length };
  }

  function readLegacyBareValue(source, startIndex) {
    let index = startIndex;
    let value = "";
    while (index < source.length) {
      const rest = source.slice(index);
      if (/^\s+[A-Za-z_][A-Za-z0-9_+\-]*\s*:/.test(rest) ||
          /^\s+[A-Za-z_][A-Za-z0-9_+\-]*\s*\{/.test(rest)) {
        break;
      }
      value += source[index];
      index += 1;
    }
    return { value: value.trim(), end: index };
  }

  function legacyScriptBlockValue(domElement, body, registry) {
    return executeScriptBody(domElement, [], [], body, registry, {
      kind: "legacy-script-block",
      sender: domElement,
      args: []
    });
  }

  function legacyDataChildrenSource(node, domElement, registry) {
    return qhtmlNodeChildrenText(node, domElement, registry);
  }

  function legacyReadIdentifier(source, startIndex) {
    const match = source.slice(startIndex).match(/^\s*([A-Za-z_$][A-Za-z0-9_$+\-]*)/);
    if (!match) {
      return { value: "", end: startIndex };
    }
    return { value: match[1], end: startIndex + match[0].length };
  }

  function legacySkipSpacesAndCommas(source, index) {
    while (index < source.length && (/[\s,]/.test(source[index]))) {
      index += 1;
    }
    return index;
  }

  function legacyReadBareScalar(source, startIndex) {
    let index = startIndex;
    let value = "";
    while (index < source.length) {
      const rest = source.slice(index);
      if (rest[0] === "," || /^\s+[A-Za-z_$][A-Za-z0-9_$+\-]*\s*:/.test(rest)) {
        break;
      }
      value += source[index];
      index += 1;
    }
    return { value: value.trim(), end: index };
  }

  function legacyScalarValue(raw) {
    const text = String(raw || "").trim();
    if (!text) {
      return "";
    }
    if ((text.startsWith("\"") && text.endsWith("\"")) ||
        (text.startsWith("'") && text.endsWith("'")) ||
        (text.startsWith("`") && text.endsWith("`"))) {
      return stripMatchingQuotes(text);
    }
    if (text === "true") return true;
    if (text === "false") return false;
    if (text === "null") return null;
    if (/^[-+]?(?:\d+|\d*\.\d+)$/.test(text)) {
      return Number(text);
    }
    return text;
  }

  function legacyParseDataValue(source, startIndex, domElement, registry) {
    let index = legacySkipSpacesAndCommas(source, startIndex);
    if (source.slice(index).startsWith("q-array")) {
      const open = source.indexOf("{", index);
      const close = open >= 0 ? matchingBraceIndex(source, open) : -1;
      return {
        value: legacyParseArraySource(open >= 0 && close >= 0 ? source.slice(open + 1, close) : "", domElement, registry),
        end: close >= 0 ? close + 1 : source.length
      };
    }
    if (source.slice(index).startsWith("q-map")) {
      const open = source.indexOf("{", index);
      const close = open >= 0 ? matchingBraceIndex(source, open) : -1;
      return {
        value: legacyParseMapSource(open >= 0 && close >= 0 ? source.slice(open + 1, close) : "", domElement, registry),
        end: close >= 0 ? close + 1 : source.length
      };
    }
    if (source.slice(index).startsWith("q-script")) {
      const open = source.indexOf("{", index);
      const close = open >= 0 ? matchingBraceIndex(source, open) : -1;
      return {
        value: legacyScriptBlockValue(domElement, open >= 0 && close >= 0 ? source.slice(open + 1, close) : "", registry),
        end: close >= 0 ? close + 1 : source.length
      };
    }
    if (source[index] === "\"" || source[index] === "'" || source[index] === "`") {
      const quoted = readQuotedToken(source, index);
      return { value: legacyScalarValue(quoted.value), end: quoted.end };
    }
    const bare = legacyReadBareScalar(source, index);
    return { value: legacyScalarValue(bare.value), end: bare.end };
  }

  function legacyParseArraySource(source, domElement, registry) {
    const values = [];
    let index = 0;
    while (index < source.length) {
      index = legacySkipSpacesAndCommas(source, index);
      if (index >= source.length) {
        break;
      }
      const parsed = legacyParseDataValue(source, index, domElement, registry);
      values.push(parsed.value);
      index = parsed.end;
    }
    return values;
  }

  function legacyParseMapSource(source, domElement, registry) {
    const object = {};
    let index = 0;
    while (index < source.length) {
      index = legacySkipSpacesAndCommas(source, index);
      if (index >= source.length) {
        break;
      }
      let key = "";
      if (source[index] === "\"" || source[index] === "'" || source[index] === "`") {
        const quoted = readQuotedToken(source, index);
        key = stripMatchingQuotes(quoted.value);
        index = quoted.end;
      } else {
        const identifier = legacyReadIdentifier(source, index);
        key = identifier.value;
        index = identifier.end;
      }
      while (index < source.length && /\s/.test(source[index])) {
        index += 1;
      }
      if (source[index] === ":") {
        index += 1;
      }
      const parsed = legacyParseDataValue(source, index, domElement, registry);
      object[key] = parsed.value;
      index = parsed.end;
    }
    return object;
  }

  function legacyStructuredPropertyValue(propertyNode, rawValue, domElement, registry) {
    const kind = String(rawValue || "").trim();
    if (kind === "q-array") {
      return legacyParseArraySource(legacyDataChildrenSource(propertyNode, domElement, registry), domElement, registry);
    }
    if (kind === "q-map") {
      return legacyParseMapSource(legacyDataChildrenSource(propertyNode, domElement, registry), domElement, registry);
    }
    if (kind === "q-model") {
      const source = legacyDataChildrenSource(propertyNode, domElement, registry);
      if (/^\s*q-array\b/.test(source)) {
        const parsed = legacyParseDataValue(source, 0, domElement, registry);
        return createQHTMLModel(parsed.value);
      }
      if (/^\s*q-map\b/.test(source)) {
        const parsed = legacyParseDataValue(source, 0, domElement, registry);
        return createQHTMLModel(parsed.value);
      }
      return createQHTMLModel(legacyParseMapSource(source, domElement, registry));
    }
    if (/^q-script\s*\{[\s\S]*\}\s*$/.test(kind)) {
      const open = kind.indexOf("{");
      const close = matchingBraceIndex(kind, open);
      return legacyScriptBlockValue(domElement, open >= 0 && close >= 0 ? kind.slice(open + 1, close) : "", registry);
    }
    return undefined;
  }

  function parseNodeValuesLiteral(node) {
    const literal = node && typeof node.valuesLiteral === "function" ? node.valuesLiteral() : "";
    return literal ? JSON.parse(literal) : undefined;
  }

  function dataObjectForNode(node) {
    const nodeType = qhtmlNodeType(node);
    if (nodeType === "QHTMLArray") {
      return createQHTMLArray(parseNodeValuesLiteral(node) || []);
    }
    if (nodeType === "QHTMLMap") {
      return createQHTMLMap(parseNodeValuesLiteral(node) || {});
    }
    if (nodeType === "QHTMLModel") {
      return createQHTMLModel(parseNodeValuesLiteral(node) || []);
    }
    return undefined;
  }

  function bindDataNode(domElement, dataNode) {
    const dataName = qhtmlNodeName(dataNode);
    if (!dataName) {
      return;
    }
    const dataObject = dataObjectForNode(dataNode);
    if (dataObject && (typeof dataObject === "object" || typeof dataObject === "function")) {
      dataObject.htmlNode = dataNode;
      dataObject.__qhtmlRegistry = domElement && domElement.__qhtmlRegistry || null;
      installQHTMLParentFunction(dataObject, dataObject.__qhtmlRegistry);
    }
    domElement[dataName] = dataObject;
  }

  function qhtmlNodeChildrenText(node, domElement, registry) {
    try {
      const count = node && typeof node.childCount === "function" ? node.childCount() : 0;
      const lines = [];
      for (let index = 0; index < count; index += 1) {
        lines.push(qhtmlNodeBodyText(node.childAt(index), domElement, registry));
      }
      return lines.join("\n").trim();
    } catch (error) {
      return handleQHTMLNodeAccessError(error, domElement, registry);
    }
  }

  function evaluateQHTMLValueExpression(expression, domElement, registry) {
    const source = decodeQHTMLScriptEntities(expression).trim().replace(/;+\s*$/, "");
    if (!source) {
      return undefined;
    }
    const context = executionContextFor(domElement, registry, []);
    try {
      return new Function(...context.names, `return (${source});`).apply(qhtmlExecutionObjectFor(domElement, registry), context.values);
    } catch (error) {
      reportQHTMLExecutionContext(error, {
        kind: "value-expression",
        name: source,
        sender: domElement,
        args: []
      }, registry);
      if (reportQHTMLRuntimeError(domElement, error, registry)) {
        return undefined;
      }
      throw error;
    }
  }

  function defineScopedQHTMLBinding(domElement, storeName, name, value) {
    domElement[storeName] = domElement[storeName] || Object.create(null);
    domElement[storeName][name] = value;
    try {
      Object.defineProperty(domElement, name, {
        configurable: true,
        enumerable: true,
        get() {
          return domElement[storeName][name];
        },
        set(nextValue) {
          domElement[storeName][name] = nextValue;
        }
      });
    } catch (error) {
      domElement[name] = value;
    }
  }

  function bindQHTMLVar(domElement, varNode, registry) {
    const varName = qhtmlNodeName(varNode);
    if (!varName) {
      return;
    }
    const value = evaluateQHTMLValueExpression(qhtmlNodeChildrenText(varNode), domElement, registry);
    defineScopedQHTMLBinding(domElement, "__qhtmlVars", varName, value);
  }

  function bindQHTMLCallback(domElement, callbackNode, registry) {
    const callbackName = qhtmlNodeName(callbackNode);
    if (!callbackName) {
      return;
    }
    const parameters = splitList(qhtmlNodeAttribute(callbackNode, "parameters"));
    const body = qhtmlNodeChildrenText(callbackNode);
    const callback = globalScope.QCallback(function qhtmlDeclarativeCallback(...args) {
      return executeScriptBody(domElement, parameters, args, body, registry, {
        kind: "q-callback",
        name: callbackName,
        node: callbackNode,
        sender: domElement,
        args
      });
    }, { creator: domElement });
    callback.__qhtmlCallbackNode = callbackNode;
    callback.__qhtmlCallbackBody = body;
    callback.__qhtmlCallbackParameters = parameters;
    defineScopedQHTMLBinding(domElement, "__qhtmlCallbacks", callbackName, callback);
  }

  function qhtmlSwitchDeclarationBody(switchNode) {
    const source = switchNode && typeof switchNode.sourceQHTML === "function" ? switchNode.sourceQHTML() : "";
    const openIndex = source.indexOf("{");
    const closeIndex = openIndex >= 0 ? matchingBraceIndex(source, openIndex) : -1;
    return openIndex >= 0 && closeIndex >= 0 ? source.slice(openIndex + 1, closeIndex) : qhtmlNodeChildrenText(switchNode);
  }

  function unwrapQHTMLUnknownFragmentSource(source) {
    let text = String(source || "").trim();
    for (;;) {
      const match = text.match(/^QHTMLUnknownFragment\s*\{/);
      if (!match) {
        return text;
      }
      const openIndex = text.indexOf("{", match[0].length - 1);
      const closeIndex = openIndex >= 0 ? matchingBraceIndex(text, openIndex) : -1;
      if (openIndex < 0 || closeIndex < 0) {
        return text;
      }
      text = text.slice(openIndex + 1, closeIndex).trim();
    }
  }

  function qhtmlSwitchCaseValue(source) {
    const text = unwrapQHTMLUnknownFragmentSource(source);
    const primitive = parsePrimitiveProperty(text);
    if (typeof primitive !== "undefined") {
      return primitive;
    }
    return text;
  }

  function readQHTMLSwitchKey(source, index) {
    let cursor = index;
    while (cursor < source.length && /\s/.test(source[cursor])) {
      cursor += 1;
    }
    if (source[cursor] === "\"" || source[cursor] === "'" || source[cursor] === "`") {
      const quoted = readQuotedToken(source, cursor);
      return { key: stripMatchingQuotes(quoted.value), end: quoted.end };
    }
    if (source[cursor] === "*") {
      return { key: "*", end: cursor + 1 };
    }
    const start = cursor;
    while (cursor < source.length && source[cursor] !== ":") {
      cursor += 1;
    }
    return { key: source.slice(start, cursor).trim(), end: cursor };
  }

  function parseQHTMLSwitchCases(source) {
    const cases = new Map();
    let defaultValue = "";
    let index = 0;
    while (index < source.length) {
      while (index < source.length && /\s/.test(source[index])) {
        index += 1;
      }
      if (index >= source.length) {
        break;
      }
      const parsedKey = readQHTMLSwitchKey(source, index);
      let cursor = parsedKey.end;
      while (cursor < source.length && /\s/.test(source[cursor])) {
        cursor += 1;
      }
      if (source[cursor] !== ":") {
        break;
      }
      cursor += 1;
      while (cursor < source.length && /\s/.test(source[cursor])) {
        cursor += 1;
      }
      if (source[cursor] !== "{") {
        break;
      }
      const closeIndex = matchingBraceIndex(source, cursor);
      if (closeIndex < 0) {
        break;
      }
      const value = qhtmlSwitchCaseValue(source.slice(cursor + 1, closeIndex));
      if (parsedKey.key === "*") {
        defaultValue = value;
      } else {
        cases.set(String(parsedKey.key), value);
      }
      index = closeIndex + 1;
    }
    return { cases, defaultValue };
  }

  function bindQHTMLSwitch(domElement, switchNode) {
    const switchName = qhtmlNodeName(switchNode);
    if (!switchName) {
      return;
    }
    const parsed = parseQHTMLSwitchCases(qhtmlSwitchDeclarationBody(switchNode));
    const switchFunction = function qhtmlSwitchLookup(value) {
      const key = String(value);
      return parsed.cases.has(key) ? parsed.cases.get(key) : parsed.defaultValue;
    };
    switchFunction.__qhtmlSwitchNode = switchNode;
    defineScopedQHTMLBinding(domElement, "__qhtmlVars", switchName, switchFunction);
  }

  function bindRuntimeOnlyDeclarations(domElement, qhtmlNode, registry) {
    const count = qhtmlNode && typeof qhtmlNode.childCount === "function" ? qhtmlNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      const keyword = qhtmlNodeKeyword(child);
      if (keyword === "q-var") {
        bindQHTMLVar(domElement, child, registry);
      } else if (keyword === "q-callback") {
        bindQHTMLCallback(domElement, child, registry);
      } else if (keyword === "q-switch") {
        bindQHTMLSwitch(domElement, child);
      } else if (qhtmlNodeType(child) === "QHTMLTimer") {
        bindTimerDeclaration(domElement, child, registry);
      }
    }
  }

  function bindComponentDefinitionDeclarations(domElement, instanceNode, registry) {
    const definitionNode = instanceNode && typeof instanceNode.componentDefinition === "function"
      ? instanceNode.componentDefinition()
      : null;
    bindRuntimeOnlyDeclarations(domElement, definitionNode, registry);
    if (applyLegacyUnknownFragments(domElement, definitionNode, registry)) {
      Array.from(domElement.childNodes || []).forEach((child) => {
        if (child.nodeType === 3 && /^q-property\s+[A-Za-z_][A-Za-z0-9_+\-]*\s*:\s*q-script\s*\{[\s\S]*\}\s*$/.test(String(child.nodeValue || "").trim())) {
          child.remove();
        }
      });
    }
  }

  function renderDynamicQHTMLCallbackChildren(domElement, qhtmlNode, registry) {
    const count = qhtmlNode && typeof qhtmlNode.childCount === "function" ? qhtmlNode.childCount() : 0;
    if (!count) {
      return;
    }

    const fragments = [];
    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      const childType = qhtmlNodeType(child);
      const childKeyword = qhtmlNodeKeyword(child);
      if (childType === "QHTMLFunction" ||
          childType === "QHTMLSignal" ||
          childType === "QHTMLEventHandler" ||
          childType === "QHTMLProperty" ||
          childKeyword === "q-var" ||
          childKeyword === "q-callback" ||
          childKeyword === "q-switch") {
        continue;
      }
      if (childType !== "QHTMLUnknownFragment") {
        return;
      }
      const source = qhtmlNodeBodyText(child);
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*\s*\([^)]*\)\s*;?$/.test(source)) {
        return;
      }
      fragments.push(source);
    }
    if (fragments.length === 0) {
      return;
    }

    domElement.innerHTML = fragments.map((source) => {
      const value = evaluateQHTMLValueExpression(source, domElement, registry);
      return String(value == null ? "" : value);
    }).join("");
  }

  function replaceFirstTextNode(rootElement, text, html) {
    const wanted = String(text || "").trim();
    if (!rootElement || !wanted || !rootElement.ownerDocument) {
      return false;
    }
    const filter = rootElement.ownerDocument.defaultView
      ? rootElement.ownerDocument.defaultView.NodeFilter
      : NodeFilter;
    const walker = rootElement.ownerDocument.createTreeWalker(rootElement, filter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (String(node.nodeValue || "").trim() === wanted) {
        const template = rootElement.ownerDocument.createElement("template");
        template.innerHTML = html;
        node.parentNode.replaceChild(template.content, node);
        return true;
      }
      node = walker.nextNode();
    }
    return false;
  }

  function renderRuntimeCallFragment(source, domElement, registry) {
    const text = String(source || "").trim().replace(/;+\s*$/, "");
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*\s*\([^)]*\)$/.test(text)) {
      return null;
    }
    const value = evaluateQHTMLValueExpression(text, domElement, registry);
    if (/^qhtml\s*\(/.test(text)) {
      return String(value == null ? "" : value);
    }
    return qhtmlRuntimeFragment(String(value == null ? "" : value));
  }

  function renderRuntimeCallFragments(domElement, qhtmlNode, registry) {
    const count = qhtmlNode && typeof qhtmlNode.childCount === "function" ? qhtmlNode.childCount() : 0;
    let rendered = false;
    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      if (qhtmlNodeType(child) !== "QHTMLUnknownFragment") {
        continue;
      }
      const source = qhtmlNodeBodyText(child);
      const html = renderRuntimeCallFragment(source, domElement, registry);
      if (html === null) {
        continue;
      }
      rendered = replaceFirstTextNode(domElement, source, html) || rendered;
    }
    return rendered;
  }

  function evaluateQHTMLTextTemplate(rawText, domElement, registry) {
    let text = String(rawText || "");
    const scriptMatch = text.trim().match(/^q-script\s*\{([\s\S]*)\}\s*;?$/);
    if (scriptMatch) {
      const result = legacyScriptBlockValue(domElement, scriptMatch[1], registry);
      return String(result == null ? "" : result);
    }
    return text.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      const value = evaluateQHTMLValueExpression(expression, domElement, registry);
      return String(value == null ? "" : value);
    });
  }

  function applyLegacyUnknownFragment(domElement, source, registry) {
    const text = decodeQHTMLScriptEntities(source);
    const legacyPropertyScriptMatch = text.trim().match(/^q-property\s+([A-Za-z_][A-Za-z0-9_+\-]*)\s*:\s*q-script\s*\{([\s\S]*)\}\s*$/);
    if (legacyPropertyScriptMatch) {
      const propertyName = legacyPropertyScriptMatch[1];
      const value = legacyScriptBlockValue(domElement, legacyPropertyScriptMatch[2], registry);
      domElement.__qhtmlProperties = Object.assign(domElement.__qhtmlProperties || {}, {
        [propertyName]: { rawValue: text, value, htmlNode: null }
      });
      try {
        Object.defineProperty(domElement, propertyName, {
          configurable: true,
          enumerable: true,
          get() {
            return domElement.__qhtmlProperties[propertyName].value;
          },
          set(nextValue) {
            domElement.__qhtmlProperties[propertyName].value = nextValue;
          }
        });
      } catch (error) {
        domElement[propertyName] = value;
      }
      return true;
    }

    let index = 0;
    let applied = false;
    while (index < text.length) {
      while (index < text.length && /\s/.test(text[index])) {
        index += 1;
      }
      if (index >= text.length) {
        break;
      }

      const blockMatch = text.slice(index).match(/^([A-Za-z_][A-Za-z0-9_+\-]*)\s*\{/);
      if (blockMatch) {
        const name = blockMatch[1];
        const openIndex = index + blockMatch[0].lastIndexOf("{");
        const closeIndex = matchingBraceIndex(text, openIndex);
        const body = closeIndex >= 0 ? text.slice(openIndex + 1, closeIndex) : "";
        if (name === "text") {
          domElement.textContent = evaluateQHTMLTextTemplate(body.trim(), domElement, registry);
        } else if (name === "html") {
          domElement.innerHTML = evaluateQHTMLTextTemplate(body.trim(), domElement, registry);
        }
        applied = true;
        index = closeIndex >= 0 ? closeIndex + 1 : text.length;
        continue;
      }

      const assignmentMatch = text.slice(index).match(/^([A-Za-z_][A-Za-z0-9_+\-]*)\s*:\s*/);
      if (!assignmentMatch) {
        break;
      }
      const name = assignmentMatch[1];
      index += assignmentMatch[0].length;
      while (index < text.length && /\s/.test(text[index])) {
        index += 1;
      }

      let value = "";
      if (text.slice(index).startsWith("q-script")) {
        const scriptOpen = text.indexOf("{", index);
        const scriptClose = scriptOpen >= 0 ? matchingBraceIndex(text, scriptOpen) : -1;
        const body = scriptOpen >= 0 && scriptClose >= 0 ? text.slice(scriptOpen + 1, scriptClose) : "";
        value = legacyScriptBlockValue(domElement, body, registry);
        index = scriptClose >= 0 ? scriptClose + 1 : text.length;
      } else if (text[index] === "\"" || text[index] === "'" || text[index] === "`") {
        const quoted = readQuotedToken(text, index);
        value = stripMatchingQuotes(quoted.value);
        index = quoted.end;
      } else {
        const bare = readLegacyBareValue(text, index);
        value = resolvePropertyValue(bare.value, domElement, null, registry);
        index = bare.end;
      }
      domElement.setAttribute(name, String(value == null ? "" : value));
      applied = true;
    }
    return applied;
  }

  function applyRuntimeTextFragments(domElement, qhtmlNode, registry, ignoreUnknownFragments) {
    if (isGeneratedForElement(domElement)) {
      return;
    }
    const count = qhtmlNode && typeof qhtmlNode.childCount === "function" ? qhtmlNode.childCount() : 0;
    const fragments = [];
    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      const childType = qhtmlNodeType(child);
      if (childType === "QHTMLTextFragment" ||
          childType === "QHTMLHTMLFragment" ||
          (childType === "QHTMLUnknownFragment" && !ignoreUnknownFragments)) {
        fragments.push(child);
        continue;
      }
      if (childType === "QHTMLUnknownFragment" && ignoreUnknownFragments) {
        continue;
      }
      if (childType === "QHTMLSignal" ||
          childType === "QHTMLEventHandler" ||
          childType === "QHTMLFunction" ||
          childType === "QHTMLPropertyAssignment" ||
          qhtmlNodeKeyword(child) === "q-var" ||
          qhtmlNodeKeyword(child) === "q-callback") {
        continue;
      }
      return;
    }
    if (fragments.length === 0) {
      return;
    }

    let html = "";
    let hasHtml = false;
    try {
      fragments.forEach((fragment) => {
        const value = evaluateQHTMLTextTemplate(qhtmlNodeBodyText(fragment), domElement, registry);
        if (qhtmlNodeType(fragment) === "QHTMLHTMLFragment") {
          hasHtml = true;
          html += value;
        } else {
          html += value;
        }
      });
    } catch (evt) {
      return;
    }
    if (hasHtml) {
      domElement.innerHTML = html;
    } else {
      domElement.textContent = html;
    }
  }

  function applyLegacyUnknownFragments(domElement, qhtmlNode, registry) {
    const count = qhtmlNode && typeof qhtmlNode.childCount === "function" ? qhtmlNode.childCount() : 0;
    let applied = false;
    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLUnknownFragment") {
        applied = applyLegacyUnknownFragment(domElement, qhtmlNodeBodyText(child), registry) || applied;
      }
    }
    return applied;
  }

  function qhtmlForCollectionValues(collection) {
    if (Array.isArray(collection)) {
      return collection.slice();
    }
    if (typeof collection === "string") {
      return [collection];
    }
    if (collection && typeof collection === "object") {
      return Object.keys(collection);
    }
    if (collection == null) {
      return [];
    }
    return [collection];
  }

  function evaluateQHTMLForExpression(expression, variableName, variableValue, domElement, registry) {
    const context = executionContextFor(domElement, registry, [variableName]);
    try {
      return new Function(variableName, ...context.names, `return (${decodeQHTMLScriptEntities(expression)});`)
        .apply(qhtmlExecutionObjectFor(domElement, registry), [variableValue, ...context.values]);
    } catch (error) {
      reportQHTMLExecutionContext(error, {
        kind: "for-expression",
        name: expression,
        sender: domElement,
        parameters: [variableName],
        args: [variableValue]
      }, registry);
      if (reportQHTMLRuntimeError(domElement, error, registry)) {
        return undefined;
      }
      throw error;
    }
  }

  function interpolateQHTMLSourceForLoop(source, variableName, variableValue, domElement, registry) {
    const text = String(source || "").replace(/\$\s*\{([^}]+)\}/g, (match, expression) => {
      const value = evaluateQHTMLForExpression(expression, variableName, variableValue, domElement, registry);
      return String(value == null ? "" : value);
    });
    const assignmentPattern = new RegExp(`(^[ \\t]*(?:q-property[ \\t]+)?[A-Za-z_$][A-Za-z0-9_+\\-]*[ \\t]*:[ \\t]*)(${variableName}(?:\\.[A-Za-z_$][A-Za-z0-9_$]*)*)[ \\t]*(?=\\r?\\n|$)`, "gm");
    return text.replace(assignmentPattern, (match, prefix, expression) => {
      const value = evaluateQHTMLForExpression(expression, variableName, variableValue, domElement, registry);
      if (typeof value === "number" || typeof value === "boolean") {
        return `${prefix}${value}`;
      }
      return `${prefix}"${String(value == null ? "" : value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
    });
  }

  function registerGeneratedQHTMLTree(tree, registry) {
    if (!tree || !registry || !registry.nodesByUuid || typeof registry.nodesByUuid.set !== "function") {
      return;
    }
    qhtmlNodeList(tree).forEach((node) => {
      const uuid = qhtmlNodeUuid(node);
      if (uuid) {
        registry.nodesByUuid.set(uuid, node);
      }
    });
  }

  function renderQHTMLSourceForLoop(source, variableName, variableValue, domElement, registry, contextNode) {
    const parsedSource = interpolateQHTMLSourceForLoop(source, variableName, variableValue, domElement, registry);
    const tree = instantiateParserTree(parsedSource, contextNode).tree;
    registerGeneratedQHTMLTree(tree, registry);
    return tree && typeof tree.renderHtml === "function" ? tree.renderHtml() : "";
  }

  function renderForNodeWithOwner(forNode, domElement, registry) {
    const variableName = forNodeVariableName(forNode);
    const collection = evaluateQHTMLValueExpression(forNodeCollectionExpression(forNode), domElement, registry);
    const values = qhtmlForCollectionValues(collection);
    const forUuid = typeof forNode.qhtmlUUID === "function" ? forNode.qhtmlUUID() : "";
    let html = "";
    const count = typeof forNode.childCount === "function" ? forNode.childCount() : 0;
    values.forEach((value) => {
      for (let index = 0; index < count; index += 1) {
        const child = forNode.childAt(index);
        const childSource = typeof child.sourceQHTML === "function"
          ? child.sourceQHTML()
          : (typeof child.renderHtml === "function" ? child.renderHtml() : "");
        html += addForMetadataToHtml(renderQHTMLSourceForLoop(childSource, variableName, value, domElement, registry, qhtmlNodeForDomElement(domElement, registry)), forUuid);
      }
    });
    return html;
  }

  function renderLegacyForFragment(source, domElement, registry) {
    const text = decodeQHTMLScriptEntities(source).trim();
    const match = text.match(/^for\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s+in\s+([\s\S]+)\)\s*\{/);
    if (!match) {
      return null;
    }
    const openIndex = text.indexOf("{", match[0].length - 1);
    const closeIndex = matchingBraceIndex(text, openIndex);
    const body = openIndex >= 0 && closeIndex >= 0 ? text.slice(openIndex + 1, closeIndex) : "";
    const variableName = match[1];
    const collectionExpression = match[2];
    const collection = evaluateQHTMLValueExpression(collectionExpression, domElement, registry);
    return qhtmlForCollectionValues(collection)
      .map((value) => renderQHTMLSourceForLoop(body, variableName, value, domElement, registry, qhtmlNodeForDomElement(domElement, registry)))
      .join("");
  }

  function renderLocalForNodes(domElement, qhtmlNode, registry) {
    const count = qhtmlNode && typeof qhtmlNode.childCount === "function" ? qhtmlNode.childCount() : 0;
    let rendered = false;
    domElement.__qhtmlRenderedLocalForNodes = domElement.__qhtmlRenderedLocalForNodes || new Set();
    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLForNode") {
        const forUuid = typeof child.qhtmlUUID === "function" ? child.qhtmlUUID() : "";
        if (forUuid && domElement.__qhtmlRenderedLocalForNodes.has(forUuid)) {
          continue;
        }
        const html = renderForNodeWithOwner(child, domElement, registry);
        if (!replaceForRange(domElement, forUuid, html)) {
          domElement.insertAdjacentHTML("beforeend", html);
        }
        if (forUuid) {
          domElement.__qhtmlRenderedLocalForNodes.add(forUuid);
        }
        rendered = true;
      } else if (qhtmlNodeType(child) === "QHTMLUnknownFragment") {
        const unknownUuid = typeof child.qhtmlUUID === "function" ? child.qhtmlUUID() : "";
        const renderKey = unknownUuid || `${qhtmlNodeUuid(qhtmlNode) || "legacy-for"}-${index}`;
        if (renderKey && domElement.__qhtmlRenderedLocalForNodes.has(renderKey)) {
          continue;
        }
        const html = renderLegacyForFragment(qhtmlNodeBodyText(child), domElement, registry);
        if (html !== null) {
          domElement.innerHTML = addForMetadataToHtml(html, renderKey);
          if (renderKey) {
            domElement.__qhtmlRenderedLocalForNodes.add(renderKey);
          }
          rendered = true;
        }
      }
    }
    if (rendered) {
      bindDynamicComponentInstances(domElement, registry);
      bindDomElementHandlers(registry.rootElement, registry);
      bindDeferredEventHandlers(registry.rootElement, registry);
      refreshThemeScopesForElement(domElement, registry);
    }
    return rendered;
  }

  function qhtmlNodeIsModelView(node) {
    const type = qhtmlNodeType(node);
    return type === "QHTMLModelView" ||
      (type === "QHTMLDomElement" && qhtmlNodeName(node).toLowerCase() === "q-model-view");
  }

  function modelViewAliasName(modelViewNode) {
    if (typeof modelViewNode.aliasName === "function") {
      const alias = modelViewNode.aliasName();
      if (alias) {
        return alias;
      }
    }
    const count = typeof modelViewNode.childCount === "function" ? modelViewNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = modelViewNode.childAt(index);
      if (qhtmlNodeName(child).toLowerCase() === "as") {
        return qhtmlNodeChildrenText(child) || "item";
      }
    }
    return "item";
  }

  function modelViewValues(modelViewNode, domElement, registry) {
    if (typeof modelViewNode.modelDocument === "function") {
      const documentNode = modelViewNode.modelDocument();
      const parsed = parseQHTMLJsonNodeToJs(documentNode);
      if (typeof parsed !== "undefined") {
        return parsed;
      }
    }
    const count = typeof modelViewNode.childCount === "function" ? modelViewNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = modelViewNode.childAt(index);
      if (qhtmlNodeType(child) !== "QHTMLModel") {
        continue;
      }
      const literal = parseNodeValuesLiteral(child);
      if (typeof literal === "string") {
        return resolvePath(literal, registry, domElement);
      }
      if (Array.isArray(literal) || (literal && typeof literal === "object")) {
        return createQHTMLModel(literal);
      }
      const reference = qhtmlNodeChildrenText(child);
      if (reference) {
        return resolvePath(reference, registry, domElement);
      }
      const parsed = dataObjectForNode(child);
      if (typeof parsed !== "undefined") {
        return parsed;
      }
    }
    return [];
  }

  function renderModelView(domElement, modelViewNode, registry) {
    if (!qhtmlNodeIsModelView(modelViewNode)) {
      return;
    }
    const aliasName = modelViewAliasName(modelViewNode);
    const modelValues = modelViewValues(modelViewNode, domElement, registry);
    const values = qhtmlForCollectionValues(modelValues);
    let html = "";
    const count = typeof modelViewNode.childCount === "function" ? modelViewNode.childCount() : 0;
    values.forEach((value) => {
      for (let index = 0; index < count; index += 1) {
        const child = modelViewNode.childAt(index);
        const childName = qhtmlNodeName(child).toLowerCase();
        if (qhtmlNodeType(child) === "QHTMLModel" || childName === "as") {
          continue;
        }
        const childSource = typeof child.sourceQHTML === "function"
          ? child.sourceQHTML()
          : (typeof child.renderHtml === "function" ? child.renderHtml() : "");
        html += addForMetadataToHtml(
          renderQHTMLSourceForLoop(childSource, aliasName, value, domElement, registry),
          qhtmlNodeUuid(modelViewNode)
        );
      }
    });
    domElement.innerHTML = html;
  }

  function qhtmlNodeUuid(node) {
    try {
      return node && typeof node.qhtmlUUID === "function" ? node.qhtmlUUID() : "";
    } catch (error) {
      return "";
    }
  }

  function findRenderedElementForNode(rootElement, node) {
    const uuid = qhtmlNodeUuid(node);
    if (!rootElement || !uuid || !rootElement.querySelectorAll) {
      return null;
    }
    const elements = rootElement.querySelectorAll(QHTML_DOM_NODE_SELECTOR);
    for (const element of elements) {
      if (qhtmlDomUuid(element) === uuid) {
        return element;
      }
    }
    return null;
  }

  function macroSlotText(slotNode) {
    return qhtmlNodeChildrenText(slotNode);
  }

  function macroInvocationSlots(invocationNode, macroNode) {
    const slots = Object.create(null);
    const count = typeof invocationNode.childCount === "function" ? invocationNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = invocationNode.childAt(index);
      const name = qhtmlNodeName(child);
      if (name) {
        slots[name] = macroSlotText(child);
      }
    }

    const defaultText = qhtmlNodeChildrenText(invocationNode);
    const macroCount = typeof macroNode.childCount === "function" ? macroNode.childCount() : 0;
    for (let index = 0; index < macroCount; index += 1) {
      const child = macroNode.childAt(index);
      if (qhtmlNodeType(child) !== "QHTMLComponentSlot") {
        continue;
      }
      const slotName = qhtmlNodeName(child);
      if (slotName && typeof slots[slotName] === "undefined") {
        slots[slotName] = defaultText;
      }
    }
    slots.default = defaultText;
    return slots;
  }

  function macroReturnNode(macroNode) {
    const count = typeof macroNode.childCount === "function" ? macroNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = macroNode.childAt(index);
      if (qhtmlNodeName(child).toLowerCase() === "return") {
        return child;
      }
    }
    return null;
  }

  function executeMacroJavaScript(body, ownerElement, registry, slots) {
    const context = executionContextFor(ownerElement, registry, []);
    const macroContext = {
      component: ownerElement && ownerElement.component ? ownerElement.component : ownerElement,
      slot(name) {
        return slots[String(name || "default")] || "";
      }
    };
    return new Function(...context.names, decodeQHTMLScriptEntities(body)).apply(macroContext, context.values);
  }

  function macroScriptBody(source) {
    const text = String(source || "").trim();
    const unknownMatch = text.match(/^QHTMLUnknownFragment\s*\{/);
    if (unknownMatch) {
      const openIndex = text.indexOf("{", unknownMatch[0].length - 1);
      const closeIndex = matchingBraceIndex(text, openIndex);
      if (openIndex >= 0 && closeIndex >= 0) {
        return text.slice(openIndex + 1, closeIndex).trim();
      }
    }
    return text;
  }

  function replaceMacroScriptBlocks(source, ownerElement, registry, slots) {
    const text = String(source || "");
    let output = "";
    let index = 0;
    while (index < text.length) {
      const matchIndex = text.indexOf("q-script", index);
      if (matchIndex < 0) {
        output += text.slice(index);
        break;
      }
      const before = text.slice(index, matchIndex);
      const openIndex = text.indexOf("{", matchIndex);
      if (openIndex < 0) {
        output += text.slice(index);
        break;
      }
      const closeIndex = matchingBraceIndex(text, openIndex);
      if (closeIndex < 0) {
        output += text.slice(index);
        break;
      }
      output += before;
      const body = macroScriptBody(text.slice(openIndex + 1, closeIndex));
      const value = executeMacroJavaScript(body, ownerElement, registry, slots);
      output += `text { ${String(value == null ? "" : value)} }`;
      index = closeIndex + 1;
    }
    return output;
  }

  function interpolateMacroSource(source, ownerElement, registry, slots) {
    let text = String(source || "");
    text = text.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      const value = executeMacroJavaScript(`return (${expression});`, ownerElement, registry, slots);
      return String(value == null ? "" : value);
    });
    return replaceMacroScriptBlocks(text, ownerElement, registry, slots);
  }

  function renderMacroInvocation(invocationElement, invocationNode, macroNode, registry) {
    if (invocationElement.__qhtmlMacroExpanded) {
      return;
    }
    const returnNode = macroReturnNode(macroNode);
    if (!returnNode) {
      return;
    }
    const slots = macroInvocationSlots(invocationNode, macroNode);
    let source = "";
    const count = typeof returnNode.childCount === "function" ? returnNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = returnNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLSignal") {
        continue;
      }
      source += "\n" + interpolateMacroSource(child.sourceQHTML(), invocationElement, registry, slots);
    }
    const parsed = instantiateParserTree(source);
    const html = parsed.tree && typeof parsed.tree.renderHtml === "function" ? parsed.tree.renderHtml() : "";
    invocationElement.__qhtmlMacroExpanded = true;
    invocationElement.outerHTML = html;
  }

  function expandLegacyMacros(rootElement, registry) {
    return;
  }

  function bindDynamicComponentInstances(rootElement, registry) {
    if (!rootElement || !registry || !registry.nodesByUuid || !rootElement.querySelectorAll) {
      return;
    }
    const renderedComponents = rootElement.matches && rootElement.matches("[component-instance]")
      ? [rootElement].concat(Array.from(rootElement.querySelectorAll("[component-instance]")))
      : Array.from(rootElement.querySelectorAll("[component-instance]"));
    renderedComponents.forEach((domElement) => {
      if (qhtmlNodeForDomElement(domElement, registry) && domElement.__qhtmlRegistry === registry) {
        return;
      }
      const instanceUuid = domElement.getAttribute("component-instance");
      const instanceNode = registry.nodesByUuid.get(instanceUuid);
      if (!instanceNode) {
        return;
      }
      setQHTMLDomUuidForNode(domElement, instanceNode);
      domElement.qhtmlDomTree = registry.tree || null;
      domElement.__qhtmlRegistry = registry;
      bindComponentFacade(domElement, registry);
      if (typeof instanceNode.qhtmlName === "function" && instanceNode.qhtmlName()) {
        const instanceName = instanceNode.qhtmlName();
        const parentComponent = domElement.parentElement && domElement.parentElement.closest
          ? domElement.parentElement.closest("[component-instance]")
          : null;
        if (parentComponent) {
          parentComponent[instanceName] = domElement;
        }
      }
      logQHTMLRuntime(
        registry,
        "QHTMLComponent",
        "Component instance " + (qhtmlNodeName(instanceNode) || instanceUuid || "anonymous") + " bound dynamically",
        instanceNode
      );
      bindComponentDefinitionDeclarations(domElement, instanceNode, registry);
      bindDeclarativeAssignmentAttributes(domElement, instanceNode, registry);
      bindRuntimeChildren(domElement, instanceNode, registry);
      bindComponentInstancePropertyAssignments(domElement, instanceNode, registry);
      bindRuntimeAnimationDeclarations(domElement, instanceNode, registry);
      bindPaintHandlers(domElement, instanceNode, registry);
    });
  }

  function refreshRuntimeInterpolations(domElement, registry) {
    const sourceRegistry = registry || (domElement && domElement.__qhtmlRegistry) || null;
    if (!domElement || !sourceRegistry) {
      return;
    }
    const refreshOne = (element) => {
      const node = qhtmlNodeForDomElement(element, sourceRegistry);
      if (element && node) {
        applyRuntimeTextFragments(element, node, sourceRegistry, false);
      }
    };
    refreshOne(domElement);
    if (domElement.querySelectorAll) {
      domElement.querySelectorAll(QHTML_DOM_NODE_SELECTOR).forEach(refreshOne);
    }
  }

  function isGeneratedForElement(domElement) {
    return Boolean(domElement && domElement.closest && domElement.closest("[qhtml-for-node]"));
  }

  function updateRuntimeElement(domElement, registry) {
    const sourceRegistry = registry || (domElement && domElement.__qhtmlRegistry) || null;
    const qhtmlNode = qhtmlNodeForDomElement(domElement, sourceRegistry);
    if (!domElement || !sourceRegistry || !qhtmlNode) {
      return domElement;
    }
    domElement.__qhtmlRenderedLocalForNodes = new Set();
    bindCssShortcutAssignments(domElement, qhtmlNode, sourceRegistry);
    applyInlineChildStyles(domElement, qhtmlNode, sourceRegistry);
    const localForRendered = renderLocalForNodes(domElement, qhtmlNode, sourceRegistry);
    if (!localForRendered && !isGeneratedForElement(domElement)) {
      applyRuntimeTextFragments(domElement, qhtmlNode, sourceRegistry, false);
    }
    renderRuntimeCallFragments(domElement, qhtmlNode, sourceRegistry);
    renderDynamicQHTMLCallbackChildren(domElement, qhtmlNode, sourceRegistry);
    renderModelView(domElement, qhtmlNode, sourceRegistry);
    refreshRuntimeInterpolations(domElement, sourceRegistry);
    return domElement;
  }

  function updateRuntimeElementTree(domElement, registry) {
    const sourceRegistry = registry || (domElement && domElement.__qhtmlRegistry) || null;
    updateRuntimeElement(domElement, sourceRegistry);
    if (domElement && domElement.querySelectorAll) {
      domElement.querySelectorAll(QHTML_DOM_NODE_SELECTOR).forEach((childElement) => {
        if (childElement !== domElement) {
          updateRuntimeElement(childElement, sourceRegistry);
        }
      });
    }
    return domElement;
  }

  function rebindRuntimeLoggersForHost(hostElement) {
    const registry = hostElement && (hostElement.__qhtmlRegistry || hostElement.qhtmlComponentRegistry);
    const tree = hostElement && hostElement.qhtmlDomTree;
    registerGeneratedQHTMLTree(tree, registry);
    refreshRuntimeLoggers(registry);
  }

  function bindComponentContextForwarders(domElement, componentElement) {
    if (!domElement || !componentElement || domElement === componentElement) {
      return;
    }
    const names = new Set();
    Object.keys(componentElement.__qhtmlProperties || {}).forEach((name) => names.add(name));
    names.forEach((name) => {
      if (!isValidContextIdentifier(name) || Object.prototype.hasOwnProperty.call(domElement, name)) {
        return;
      }
      const getter = function qhtmlComponentContextGetter() {
        const sourceRegistry = domElement.__qhtmlRegistry || componentElement.__qhtmlRegistry || null;
        const result = qhtmlExecutionLookup(domElement, name, sourceRegistry, { allowDomFallback: false });
        return result.found ? result.value : undefined;
      };
      getter.__qhtmlReferenceAccessor = true;
      try {
        Object.defineProperty(domElement, name, {
          configurable: true,
          enumerable: false,
          get: getter,
          set(value) {
            qhtmlExecutionWrite(domElement, name, value, domElement.__qhtmlRegistry || componentElement.__qhtmlRegistry || null);
          }
        });
      } catch (error) {
        return;
      }
    });
  }

  function defineRuntimeAccessor(target, name, descriptor) {
    if (!target || !isValidContextIdentifier(name) || Object.prototype.hasOwnProperty.call(target, name)) {
      return;
    }
    try {
      Object.defineProperty(target, name, Object.assign({
        configurable: true,
        enumerable: false
      }, descriptor));
    } catch (error) {
      return;
    }
  }

  function installQHTMLReferenceAccessors(target, contextNode, registry) {
    if (!target || !contextNode || typeof contextNode.contextKeys !== "function") {
      return;
    }
    Array.from(contextNode.contextKeys() || []).forEach((name) => {
      const getter = function qhtmlInheritedReferenceGetter() {
        const sourceRegistry = registry || target.__qhtmlRegistry;
        const resolving = qhtmlResolvingReferenceSet(sourceRegistry);
        const accessorKey = `accessor:${qhtmlDomUuid(target)}:${name}`;
        if (resolving && resolving.has(accessorKey)) {
          return undefined;
        }
        if (resolving) {
          resolving.add(accessorKey);
        }
        try {
          const result = qhtmlExecutionLookup(target, name, sourceRegistry, { allowDomFallback: false });
          return result.found ? result.value : undefined;
        } finally {
          if (resolving) {
            resolving.delete(accessorKey);
          }
        }
      };
      getter.__qhtmlReferenceAccessor = true;

      defineRuntimeAccessor(target, name, {
        get: getter,
        set(value) {
          const sourceRegistry = registry || target.__qhtmlRegistry;
          if (!qhtmlExecutionWrite(target, name, value, sourceRegistry)) {
            Object.defineProperty(target, name, {
              configurable: true,
              enumerable: true,
              writable: true,
              value
            });
          }
        }
      });
    });
  }

  function cssRuntimePropertyName(cssName) {
    return String(cssName || "").replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  function installCssShortcutRuntimeProperties(domElement) {
    if (!domElement || !domElement.style) {
      return;
    }
    if (!domElement.__qhtmlCssShortcutRuntimeProperties) {
      Object.defineProperty(domElement, "__qhtmlCssShortcutRuntimeProperties", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: new Set()
      });
    }
    const defineCssProperty = (propertyName, cssName) => {
      if (!isValidContextIdentifier(propertyName) ||
          domElement.__qhtmlCssShortcutRuntimeProperties.has(propertyName)) {
        return;
      }
      try {
        Object.defineProperty(domElement, propertyName, {
          configurable: true,
          enumerable: false,
          get() {
            return domElement.style.getPropertyValue(cssName);
          },
          set(value) {
            domElement.style.setProperty(cssName, serializeCssShortcutValue(cssName, value));
          }
        });
        domElement.__qhtmlCssShortcutRuntimeProperties.add(propertyName);
      } catch (error) {
        return;
      }
    };
    QHTML_CSS_SHORTCUT_CSS_NAMES.forEach((cssName) => {
      defineCssProperty(cssRuntimePropertyName(cssName), cssName);
    });
    defineCssProperty("x", "left");
    defineCssProperty("y", "top");
  }

  function currentQHTMLComponentFor(domElement, registry) {
    const componentElement = domElement && domElement.closest
      ? domElement.closest("[component-instance]")
      : null;
    return componentElement || domElement || (registry && registry.rootElement) || null;
  }

  function parentQHTMLComponentFor(domElement, registry) {
    const currentComponent = currentQHTMLComponentFor(domElement, registry);
    if (!currentComponent || !currentComponent.parentElement || !currentComponent.parentElement.closest) {
      return null;
    }
    return currentComponent.parentElement.closest("[component-instance]");
  }

  function qhtmlComponentInstanceTypeName(node) {
    if (!node) {
      return "";
    }
    if (typeof node.keyword === "function") {
      const keyword = String(node.keyword() || "").trim();
      if (keyword) {
        return keyword;
      }
    }
    if (typeof node.componentDefinition === "function") {
      const definition = node.componentDefinition();
      const definitionName = qhtmlNodeName(definition);
      if (definitionName) {
        return definitionName;
      }
    }
    return qhtmlNodeName(node);
  }

  function qhtmlDirectChildSlotNode(instanceNode, slotName) {
    const wanted = String(slotName || "").trim().toLowerCase();
    const count = instanceNode && typeof instanceNode.childCount === "function" ? instanceNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = instanceNode.childAt(index);
      const childName = String(qhtmlNodeName(child) || qhtmlNodeKeyword(child) || "").trim().toLowerCase();
      if (childName === wanted) {
        return child;
      }
    }
    return null;
  }

  function qhtmlSlotText(instanceNode, slotName, ownerElement, registry) {
    const slotNode = qhtmlDirectChildSlotNode(instanceNode, slotName);
    if (!slotNode) {
      return "";
    }
    return qhtmlNodeChildrenText(slotNode, ownerElement, registry);
  }

  function qhtmlSlotHtml(instanceNode, slotName) {
    const slotNode = qhtmlDirectChildSlotNode(instanceNode, slotName);
    if (!slotNode) {
      return "";
    }
    return qhtmlNodeChildren(slotNode).map((child) => {
      if (child && typeof child.renderHtml === "function") {
        return child.renderHtml();
      }
      return qhtmlNodeBodyText(child);
    }).join("");
  }

  function childComponentDescriptorsByType(domElement, registry, typeName) {
    const ownerNode = qhtmlNodeForDomElement(domElement, registry);
    const wanted = String(typeName || "").trim();
    const out = [];
    const count = ownerNode && typeof ownerNode.childCount === "function" ? ownerNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = ownerNode.childAt(index);
      if (qhtmlNodeType(child) !== "QHTMLComponentInstance") {
        continue;
      }
      if (qhtmlComponentInstanceTypeName(child) !== wanted) {
        continue;
      }
      const uuid = qhtmlNodeUuid(child);
      const rendered = runtimeObjectForQHTMLNode(child, registry, domElement);
      if (rendered) {
        out.push(rendered);
        continue;
      }
      const label = qhtmlSlotText(child, "name", domElement, registry) ||
        qhtmlSlotText(child, "label", domElement, registry) ||
        qhtmlSlotText(child, "title", domElement, registry) ||
        qhtmlNodeName(child);
      const body = qhtmlSlotHtml(child, "body") ||
        qhtmlSlotHtml(child, "content") ||
        qhtmlSlotText(child, "body", domElement, registry) ||
        qhtmlSlotText(child, "content", domElement, registry);
      out.push({
        htmlNode: child,
        qhtmlUUID: uuid,
        type: wanted,
        name: label,
        label,
        title: label,
        body,
        content: body
      });
    }
    return out;
  }

  const QHTML_WASM_FORWARD_METHODS = Object.freeze([
    "qhtmlType", "qhtmlUUID", "setQHTMLUUID", "qhtmlName", "setQHTMLName",
    "qhtmlParent", "parent", "parentNode", "childCount", "childAt", "childList",
    "domTree", "treeUUID", "indexInParent", "componentName", "matchesType",
    "findChildByType", "directChildrenByType", "findChildrenByType", "findByUUID",
    "findDescendantByUUID", "containsDescendantUUID", "appendChild", "insertChild",
    "removeChildAt", "clearChildren", "clear", "remove", "createQHTMLObject",
    "createQHTMLObjectAt", "createQHTMLObjects", "appendQHTMLSource", "insertQHTMLSource",
    "replaceChildWithQHTMLSource", "setProperty", "setPropertyText", "property",
    "setAttribute", "attribute", "removeAttribute", "setClass", "hasClass",
    "updateKeywordReference", "updateNamedReference", "resolve", "resolveType",
    "contextKeys", "evaluateExpression", "runtime", "renderHtml", "childrenQHTML",
    "childrenHTML", "childrenJSON", "childrenJSONText", "toHTML", "sourceQHTML",
    "toQHTML", "fromQHTML", "toJSON", "toJSONText", "fromJSON", "fromJSONText",
    "component", "componentDefinition", "componentDefinitionUUID", "renderContentHtml",
    "slots", "slotCount", "slotAt", "slotDefinitionAt", "slot", "slotDefinition",
    "slotNames", "slotHtml", "slotPlainText", "findChildComponentsOfType"
  ]);

  const QHTML_WASM_NATIVE_COLLISIONS = new Set([
    "appendChild", "children", "component", "parent", "parentNode",
    "remove", "removeAttribute", "setAttribute"
  ]);

  const QHTML_WASM_INTENTIONAL_OVERRIDES = new Set([
    "slot"
  ]);

  function qhtmlWasmMethodNames(node) {
    const names = new Set(QHTML_WASM_FORWARD_METHODS);
    let cursor = node;
    while (cursor && cursor !== Object.prototype) {
      Object.getOwnPropertyNames(cursor).forEach((name) => {
        if (name !== "constructor") {
          try {
            if (typeof node[name] === "function") {
              names.add(name);
            }
          } catch (error) {
            return;
          }
        }
      });
      cursor = Object.getPrototypeOf(cursor);
    }
    return names;
  }

  function qhtmlWasmAliasName(name) {
    const text = String(name || "");
    return text ? "qhtml" + text[0].toUpperCase() + text.slice(1) : "";
  }

  function defineLiveQHTMLWasmForwarder(domElement, registry, exposedName, wasmName) {
    if (!domElement || !exposedName || !wasmName) {
      return;
    }
    const existing = Object.getOwnPropertyDescriptor(domElement, exposedName);
    if (existing && existing.value && existing.value.__qhtmlLiveWasmForwarder === true) {
      return;
    }
    if (existing && existing.configurable === false) {
      return;
    }
    const forwarder = function qhtmlLiveWasmForwarder(...args) {
      const sourceRegistry = registry || this.__qhtmlRegistry || domElement.__qhtmlRegistry;
      const liveNode = qhtmlNodeForDomElement(domElement, sourceRegistry);
      if (!liveNode) {
        throw new Error("QHTML WASM node is no longer available for " + String(qhtmlDomUuid(domElement) || domElement.localName || "element"));
      }
      const method = liveNode[wasmName];
      if (typeof method !== "function") {
        throw new TypeError("QHTML WASM method is unavailable on the current node: " + wasmName);
      }
      return method.apply(liveNode, args);
    };
    forwarder.__qhtmlLiveWasmForwarder = true;
    forwarder.__qhtmlWasmMethodName = wasmName;
    try {
      Object.defineProperty(domElement, exposedName, {
        configurable: true,
        enumerable: false,
        writable: true,
        value: forwarder
      });
    } catch (error) {
      return;
    }
  }

  function installLiveQHTMLWasmForwarders(domElement, registry) {
    if (!domElement || !registry) {
      return domElement;
    }
    const liveNode = qhtmlNodeForDomElement(domElement, registry);
    if (!liveNode) {
      return domElement;
    }

    qhtmlWasmMethodNames(liveNode).forEach((methodName) => {
      let callable = false;
      try {
        callable = typeof liveNode[methodName] === "function";
      } catch (error) {
        callable = false;
      }
      if (!callable) {
        return;
      }

      const inheritedCollision = methodName in domElement &&
        !Object.prototype.hasOwnProperty.call(domElement, methodName);
      if (QHTML_WASM_INTENTIONAL_OVERRIDES.has(methodName)) {
        defineLiveQHTMLWasmForwarder(domElement, registry, methodName, methodName);
        return;
      }
      if (QHTML_WASM_NATIVE_COLLISIONS.has(methodName) || inheritedCollision) {
        defineLiveQHTMLWasmForwarder(domElement, registry, qhtmlWasmAliasName(methodName), methodName);
        return;
      }
      defineLiveQHTMLWasmForwarder(domElement, registry, methodName, methodName);
    });

    if (!Object.prototype.hasOwnProperty.call(domElement, "qhtmlObject")) {
      Object.defineProperty(domElement, "qhtmlObject", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function qhtmlObject() {
          return qhtmlNodeForDomElement(this, registry || this.__qhtmlRegistry);
        }
      });
    }
    return domElement;
  }

  function bindComponentFacade(domElement, registry) {
    const componentElement = currentQHTMLComponentFor(domElement, registry);
    domElement.component = componentElement;
    installQHTMLParentFunction(domElement, registry || domElement.__qhtmlRegistry);
    installLiveQHTMLWasmForwarders(domElement, registry || domElement.__qhtmlRegistry);
    if (componentElement && componentElement !== domElement) {
      installLiveQHTMLWasmForwarders(componentElement, registry || componentElement.__qhtmlRegistry || domElement.__qhtmlRegistry);
    }
    domElement.parentComponent = function parentComponent() {
      return parentQHTMLComponentFor(domElement, registry || domElement.__qhtmlRegistry);
    };
    installCssShortcutRuntimeProperties(domElement);
    bindComponentContextForwarders(domElement, componentElement);
    installQHTMLReferenceAccessors(domElement, qhtmlNodeForDomElement(domElement, registry || domElement.__qhtmlRegistry), registry || domElement.__qhtmlRegistry);
    domElement.toJSON = function componentToJSON() {
      const qhtmlNode = qhtmlNodeForDomElement(domElement, registry || domElement.__qhtmlRegistry);
      syncLivePropertiesInSubtree(domElement);
      return qhtmlNode.toJSON();
    };
    domElement.toJSONText = function componentToJSONText() {
      const qhtmlNode = qhtmlNodeForDomElement(domElement, registry || domElement.__qhtmlRegistry);
      syncLivePropertiesInSubtree(domElement);
      return typeof qhtmlNode.toJSONText === "function"
        ? qhtmlNode.toJSONText()
        : JSON.stringify(qhtmlNode.toJSON());
    };
    domElement.toQHTML = function componentToQHTML() {
      const qhtmlNode = qhtmlNodeForDomElement(domElement, registry || domElement.__qhtmlRegistry);
      syncLivePropertiesInSubtree(domElement);
      return typeof qhtmlNode.toQHTML === "function"
        ? qhtmlNode.toQHTML()
        : (typeof qhtmlNode.sourceQHTML === "function" ? qhtmlNode.sourceQHTML() : "");
    };
    domElement.toHTML = function componentToHTML() {
      const qhtmlNode = qhtmlNodeForDomElement(domElement, registry || domElement.__qhtmlRegistry);
      syncLivePropertiesInSubtree(domElement);
      return typeof qhtmlNode.toHTML === "function"
        ? qhtmlNode.toHTML()
        : (typeof qhtmlNode.renderHtml === "function" ? qhtmlNode.renderHtml() : "");
    };
    domElement.findByUUID = function componentFindByUUID(uuid) {
      const sourceRegistry = registry || domElement.__qhtmlRegistry;
      const qhtmlNode = qhtmlNodeForDomElement(domElement, sourceRegistry);
      const wanted = String(uuid || "").trim();
      if (!wanted || !qhtmlNode) {
        return null;
      }
      const cached = sourceRegistry && sourceRegistry.nodesByUuid && typeof sourceRegistry.nodesByUuid.get === "function"
        ? sourceRegistry.nodesByUuid.get(wanted, qhtmlNode)
        : null;
      if (cached) {
        return cached;
      }
      const found = qhtmlNode.findByUUID(wanted);
      if (found && sourceRegistry && sourceRegistry.nodesByUuid && typeof sourceRegistry.nodesByUuid.set === "function") {
        sourceRegistry.nodesByUuid.set(wanted, found);
      }
      return found;
    };
    domElement.findChildComponentsOfType = function componentFindChildComponentsOfType(typeName) {
      return childComponentDescriptorsByType(domElement, registry || domElement.__qhtmlRegistry, typeName);
    };
    domElement.fromJSON = function componentFromJSON(value) {
      const sourceRegistry = registry || domElement.__qhtmlRegistry;
      const qhtmlNode = qhtmlNodeForDomElement(domElement, sourceRegistry);
      const changed = qhtmlNode.fromJSON(value);
      registerGeneratedQHTMLTree(qhtmlNode, sourceRegistry);
      refreshRuntimeLoggers(sourceRegistry);
      updateRuntimeElementTree(domElement, sourceRegistry);
      return changed;
    };
    if (typeof domElement.update !== "function" || domElement.update.__qhtmlRuntimeUpdate === true) {
      const update = function () {
        return updateRuntimeElementTree(domElement, registry || domElement.__qhtmlRegistry);
      };
      update.__qhtmlRuntimeUpdate = true;
      domElement.update = update;
    }
  }

  function bindRuntimeChildren(domElement, qhtmlNode, registry) {
    if (!domElement || !qhtmlNode) {
      return;
    }
    if (isQHTML7RegistryDisposed(registry)) {
      return;
    }

    bindRuntimeOnlyDeclarations(domElement, qhtmlNode, registry);
    const count = typeof qhtmlNode.childCount === "function" ? qhtmlNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      if (isQHTML7RegistryDisposed(registry)) {
        return;
      }
      const child = qhtmlNode.childAt(index);
      const childType = qhtmlNodeType(child);
      if (childType === "QHTMLFunction") {
        bindFunction(domElement, child);
      } else if (childType === "QHTMLSignal") {
        bindSignal(domElement, child);
      } else if (childType === "QHTMLArray" ||
                 childType === "QHTMLMap" ||
                 childType === "QHTMLModel") {
        bindDataNode(domElement, child);
      }
    }

    for (let index = 0; index < count; index += 1) {
      if (isQHTML7RegistryDisposed(registry)) {
        return;
      }
      const child = qhtmlNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLProperty") {
        bindPropertyChangeSignal(domElement, child, registry);
      }
    }

    bindBehaviorTargetProperties(domElement, qhtmlNode, registry);

    for (let index = 0; index < count; index += 1) {
      if (isQHTML7RegistryDisposed(registry)) {
        return;
      }
      const child = qhtmlNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLProperty") {
        bindProperty(domElement, child, registry);
      }
    }

    for (let index = 0; index < count; index += 1) {
      if (isQHTML7RegistryDisposed(registry)) {
        return;
      }
      const child = qhtmlNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLEventHandler") {
        if (isPaintEventName(String(child.eventName() || "").toLowerCase())) {
          bindPaintHandler(domElement, child, registry);
        }
      }
    }

    applyInlineChildStyles(domElement, qhtmlNode, registry);
    applyNodeTransitionApplications(domElement, qhtmlNode, registry);
    if (isQHTML7RegistryDisposed(registry)) {
      return;
    }
    const legacyUnknownApplied = applyLegacyUnknownFragments(domElement, qhtmlNode, registry);
    if (isQHTML7RegistryDisposed(registry)) {
      return;
    }
    const localForRendered = renderLocalForNodes(domElement, qhtmlNode, registry);
    if (isQHTML7RegistryDisposed(registry)) {
      return;
    }
    if (!localForRendered && !isGeneratedForElement(domElement)) {
      applyRuntimeTextFragments(domElement, qhtmlNode, registry, legacyUnknownApplied);
    }
    if (isQHTML7RegistryDisposed(registry)) {
      return;
    }
    renderRuntimeCallFragments(domElement, qhtmlNode, registry);
    renderDynamicQHTMLCallbackChildren(domElement, qhtmlNode, registry);
    renderModelView(domElement, qhtmlNode, registry);

    if (qhtmlNodeType(qhtmlNode) === "QHTMLCanvas") {
      bindCanvasRuntime(domElement, qhtmlNode, registry);
    }
  }

  function bindDomElementHandlers(rootElement, registry) {
    if (!rootElement || !registry || !registry.nodesByUuid) {
      return;
    }
    const renderedElements = rootElement.querySelectorAll
      ? rootElement.querySelectorAll(QHTML_DOM_NODE_SELECTOR)
      : [];
    renderedElements.forEach((domElement) => {
      if (domElement !== rootElement && (!domElement.isConnected || !rootElement.contains(domElement))) {
        return;
      }
      if (domElement.hasAttribute("component-instance")) {
        return;
      }
      const node = qhtmlNodeForDomElement(domElement, registry);
      const nodeType = qhtmlNodeType(node);
      if (!node ||
          (nodeType !== "QHTMLDomElement" &&
           nodeType !== "QHTMLLayout" &&
           nodeType !== "QHTMLRowLayout" &&
           nodeType !== "QHTMLColumnLayout" &&
           nodeType !== "QHTMLModelView" &&
           nodeType !== "QHTMLCanvas")) {
        return;
      }
      setQHTMLDomUuidForNode(domElement, node);
      domElement.qhtmlDomTree = registry.tree || null;
      domElement.__qhtmlRegistry = registry;
      bindComponentFacade(domElement, registry);
      bindDeclarativeAssignmentAttributes(domElement, node, registry);
      bindRuntimeChildren(domElement, node, registry);
    });
  }

  function bindDeferredEventHandlersForNode(domElement, qhtmlNode) {
    if (!domElement || !qhtmlNode) {
      return;
    }
    const count = typeof qhtmlNode.childCount === "function" ? qhtmlNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      if (qhtmlNodeType(child) !== "QHTMLEventHandler") {
        continue;
      }
      const eventName = String(child.eventName() || "").toLowerCase();
      if (isPaintEventName(eventName) || eventName === "paint") {
        continue;
      }
      bindEventHandler(domElement, child);
    }
  }

  function bindDeferredEventHandlers(rootElement, registry) {
    if (!rootElement || !registry) {
      return;
    }

    bindDeferredEventHandlersForNode(rootElement, qhtmlNodeForDomElement(rootElement, registry) || registry.tree || null);

    if (!rootElement.querySelectorAll) {
      return;
    }

    rootElement.querySelectorAll("[component-instance]").forEach((domElement) => {
      bindDeferredEventHandlersForNode(domElement, qhtmlNodeForDomElement(domElement, registry));
    });

    rootElement.querySelectorAll(QHTML_DOM_NODE_SELECTOR).forEach((domElement) => {
      if (domElement.hasAttribute("component-instance")) {
        return;
      }
      bindDeferredEventHandlersForNode(domElement, qhtmlNodeForDomElement(domElement, registry));
    });
  }

  function bindConnectNodes(registry) {
    if (!registry || !registry.nodesByUuid) {
      return;
    }
    registry.nodesByUuid.forEach((node) => {
      if (qhtmlNodeType(node) !== "QHTMLConnect") {
        return;
      }
      const ownerElement = ownerRuntimeObjectForQHTMLNode(node, registry);
      if (ownerElement) {
        bindConnect(ownerElement, node, registry);
      }
    });
  }

  function bindScriptNodes(registry) {
    if (!registry || !registry.nodesByUuid || !registry.boundScriptNodes) {
      return;
    }
    registry.nodesByUuid.forEach((node) => {
      if (qhtmlNodeType(node) !== "QHTMLScript") {
        return;
      }
      const parent = qhtmlParentNode(node);
      const parentType = qhtmlNodeType(parent);
      if (parentType !== "QHTMLDomTree" &&
          parentType !== "QHTMLComponentInstance") {
        return;
      }
      const scriptUuid = typeof node.qhtmlUUID === "function" ? node.qhtmlUUID() : "";
      if (scriptUuid && registry.boundScriptNodes.has(scriptUuid)) {
        return;
      }
      const ownerObject = ownerRuntimeObjectForQHTMLNode(node, registry);
      if (!ownerObject) {
        return;
      }
      const body = typeof node.body === "function" ? node.body() : "";
      if (!String(body || "").trim()) {
        return;
      }
      executeScriptBody(ownerObject, [], [], body, registry, {
        kind: "q-script",
        scriptNode: node,
        sender: ownerObject,
        args: []
      });
      if (scriptUuid) {
        registry.boundScriptNodes.add(scriptUuid);
      }
    });
  }

  function forNodeVariableName(forNode) {
    if (forNode && typeof forNode.variableName === "function") {
      return String(forNode.variableName() || "");
    }
    return qhtmlNodeName(forNode);
  }

  function forNodeCollectionExpression(forNode) {
    if (forNode && typeof forNode.collectionExpression === "function") {
      return String(forNode.collectionExpression() || "");
    }
    return "";
  }

  function loopValuesFromCollection(collection, fallbackExpression, ownerElement, registry) {
    if (Array.isArray(collection)) {
      return collection.slice();
    }
    if (collection && typeof collection.valuesLiteral === "function") {
      const parsedLiteral = parseStructuredProperty(String(collection.valuesLiteral() || ""), ownerElement, registry);
      return Array.isArray(parsedLiteral) ? parsedLiteral : [];
    }
    const parsed = parseStructuredProperty(String(fallbackExpression || ""), ownerElement, registry);
    return Array.isArray(parsed) ? parsed : [];
  }

  function interpolateForHtml(html, variableName, value) {
    return String(html || "").replace(/\$\s*\{\s*([^}]+?)\s*\}/g, (match, expression) => {
      let trimmed = String(expression || "").trim();
      if (trimmed.startsWith("this.")) {
        trimmed = trimmed.slice(5).trim();
      }
      if (trimmed === variableName || trimmed === `this.${variableName}`) {
        return String(value == null ? "" : value);
      }
      const prefix = `${variableName}.`;
      if (trimmed.startsWith(prefix)) {
        let resolved = value;
        const parts = trimmed.slice(prefix.length).split(".").filter(Boolean);
        for (const part of parts) {
          if (resolved == null) {
            return "";
          }
          resolved = resolved[part];
        }
        return String(resolved == null ? "" : resolved);
      }
      return match;
    });
  }

  function addForMetadataToHtml(html, forUuid) {
    const cleanedHtml = String(html || "");
    if (!forUuid) {
      return cleanedHtml;
    }
    return cleanedHtml.replace(/<([A-Za-z][A-Za-z0-9_+\-]*)([^>]*)>/g, (match, tagName, rest) => {
      if (/\sqhtml-for-node=/.test(match)) {
        return match;
      }
      return `<${tagName} qhtml-for-node="${forUuid}"${rest}>`;
    });
  }

  function renderForNodeItems(forNode, values) {
    const variableName = forNodeVariableName(forNode);
    const forUuid = typeof forNode.qhtmlUUID === "function" ? forNode.qhtmlUUID() : "";
    const count = typeof forNode.childCount === "function" ? forNode.childCount() : 0;
    let html = "";
    values.forEach((value) => {
      for (let index = 0; index < count; index += 1) {
        const child = forNode.childAt(index);
        if (!child || typeof child.renderHtml !== "function") {
          continue;
        }
        html += addForMetadataToHtml(interpolateForHtml(child.renderHtml(), variableName, value), forUuid);
      }
    });
    return html;
  }

  function findForComment(rootElement, kind, forUuid) {
    if (!rootElement || !forUuid || !rootElement.ownerDocument) {
      return null;
    }
    const expected = `qhtml-for-${kind}:${forUuid}`;
    const nodeFilter = rootElement.ownerDocument.defaultView
      ? rootElement.ownerDocument.defaultView.NodeFilter
      : NodeFilter;
    const walker = rootElement.ownerDocument.createTreeWalker(rootElement, nodeFilter.SHOW_COMMENT);
    let node = walker.nextNode();
    while (node) {
      if (String(node.nodeValue || "").trim() === expected) {
        return node;
      }
      node = walker.nextNode();
    }
    return null;
  }

  function replaceForRange(rootElement, forUuid, html) {
    const start = findForComment(rootElement, "start", forUuid);
    const end = findForComment(rootElement, "end", forUuid);
    if (!start || !end || start.parentNode !== end.parentNode) {
      return false;
    }
    const doc = rootElement.ownerDocument;
    const range = doc.createRange();
    range.setStartAfter(start);
    range.setEndBefore(end);
    range.deleteContents();
    const template = doc.createElement("template");
    template.innerHTML = html;
    end.parentNode.insertBefore(template.content, end);
    return true;
  }

  function observeLoopCollection(collection, refresh) {
    if (!Array.isArray(collection) || typeof refresh !== "function") {
      return;
    }
    if (!collection.__qhtmlForObservers) {
      Object.defineProperty(collection, "__qhtmlForObservers", {
        configurable: true,
        enumerable: false,
        value: []
      });
    }
    if (!collection.__qhtmlForObservers.includes(refresh)) {
      collection.__qhtmlForObservers.push(refresh);
    }
    if (collection.__qhtmlForObserved === true) {
      return;
    }
    Object.defineProperty(collection, "__qhtmlForObserved", {
      configurable: true,
      enumerable: false,
      value: true
    });
    ["push", "pop", "shift", "unshift", "splice", "sort", "reverse"].forEach((methodName) => {
      const original = collection[methodName];
      if (typeof original !== "function") {
        return;
      }
      Object.defineProperty(collection, methodName, {
        configurable: true,
        enumerable: false,
        value: function (...args) {
          const result = original.apply(this, args);
          (this.__qhtmlForObservers || []).slice().forEach((observer) => observer());
          return result;
        }
      });
    });
  }

  function setupForLoopRuntime(rootElement, registry) {
    if (!rootElement || !registry || !registry.nodesByUuid) {
      return;
    }
    registry.forLoopsByUuid = registry.forLoopsByUuid || new Map();
    registry.nodesByUuid.forEach((node) => {
      if (qhtmlNodeType(node) !== "QHTMLForNode") {
        return;
      }
      const forUuid = typeof node.qhtmlUUID === "function" ? node.qhtmlUUID() : "";
      const ownerElement = ownerElementForQHTMLNode(node, registry) || rootElement;
      const collectionExpression = forNodeCollectionExpression(node);
      const refresh = () => {
        const collection = resolvePath(collectionExpression, registry, ownerElement);
        const values = loopValuesFromCollection(collection, collectionExpression, ownerElement, registry);
        replaceForRange(rootElement, forUuid, renderForNodeItems(node, values));
        bindDynamicComponentInstances(rootElement, registry);
        bindDomElementHandlers(rootElement, registry);
        bindDeferredEventHandlers(rootElement, registry);
        refreshThemeScopesForElement(rootElement, registry);
      };
      registry.forLoopsByUuid.set(forUuid, { node, ownerElement, refresh });
      observeLoopCollection(resolvePath(collectionExpression, registry, ownerElement), refresh);
      ownerElement.addEventListener("QHTMLPropertyChanged", (event) => {
        const changedProperty = event && event.detail ? event.detail.property : "";
        const collectionName = collectionExpression.replace(/^this\./, "").split(".")[0];
        if (changedProperty === collectionName) {
          observeLoopCollection(resolvePath(collectionExpression, registry, ownerElement), refresh);
          refresh();
        }
      });
    });
  }

  function emitReadySignals(rootElement, registry) {
    if (!rootElement || !registry) {
      return;
    }

    const readyElements = [];
    const seen = new Set();
    const collect = (domElement) => {
      if (!domElement || seen.has(domElement)) {
        return;
      }
      seen.add(domElement);
      readyElements.push(domElement);
    };

    collect(rootElement);

    if (rootElement.querySelectorAll) {
      rootElement.querySelectorAll("[component-instance]").forEach(collect);
      rootElement.querySelectorAll(QHTML_DOM_NODE_SELECTOR).forEach(collect);
    }

    readyElements.forEach((domElement) => {
      const qhtmlNode = qhtmlNodeForDomElement(domElement, registry);
      const storedReadySignal = domElement.__qhtmlEventSignals && domElement.__qhtmlEventSignals.ready;
      const storedReadyConnections = storedReadySignal && typeof storedReadySignal.connections === "function"
        ? storedReadySignal.connections().length
        : 0;
      const directReadyConnections = domElement.ready && typeof domElement.ready.connections === "function"
        ? domElement.ready.connections().length
        : 0;
      const readySignal = storedReadyConnections > directReadyConnections
        ? storedReadySignal
        : (typeof domElement.ready === "function" ? domElement.ready : storedReadySignal);
      domElement.dispatchEvent(new CustomEvent("ready", {
        bubbles: false,
        detail: { qhtmlNode, qhtmlDom: registry.tree || null }
      }));
      if (typeof readySignal === "function") {
        readySignal();
      }
      domElement.dispatchEvent(new CustomEvent("QHTMLNodeReady", {
        bubbles: true,
        detail: { qhtmlNode, qhtmlDom: registry.tree || null }
      }));
    });

    if (registry.workersByName) {
      registry.workersByName.forEach((worker) => {
        if (worker && typeof worker.ready === "function") {
          worker.ready();
        }
        if (worker && typeof worker.dispatchEvent === "function" && typeof CustomEvent === "function") {
          worker.dispatchEvent(new CustomEvent("QHTMLNodeReady", {
            bubbles: false,
            detail: { htmlNode: worker.htmlNode || null, qhtmlDom: registry.tree || null }
          }));
        }
      });
    }
  }

  function bindComponentDomRuntime(rootElement, tree) {
    if (!rootElement || !tree) {
      return;
    }

    const nodesByUuid = createLiveQHTMLNodeLookup(tree);
    const registry = {
      nodesByUuid,
      elementsByName: createLiveQHTMLDomElementNameLookup(rootElement, tree),
      elementsByUuid: createLiveQHTMLDomElementUuidLookup(rootElement, tree),
      componentDefinitionsByName: new Map(),
      componentDefinitionsByUuid: new Map(),
      qhtmlClassesByName: new Map(),
      qhtmlClassesByUuid: new Map(),
      qhtmlClassInstancesByName: new Map(),
      qhtmlClassInstancesByUuid: new Map(),
      workersByName: new Map(),
      workersByUuid: new Map(),
      loggersByName: new Map(),
      loggersByUuid: new Map(),
      loggersByOwnerUuid: new Map(),
      futurePropertySignalConnections: new Map(),
      stylesByName: new Map(),
      themesByName: new Map(),
      timersByName: new Map(),
      timersByUuid: new Map(),
      animationsByName: new Map(),
      animationsByUuid: new Map(),
      scriptActionsByName: new Map(),
      scriptActionsByUuid: new Map(),
      paintersByName: new Map(),
      paintersByUuid: new Map(),
      forLoopsByUuid: new Map(),
      styleTargetsByName: new Map(),
      themeScopesByName: new Map(),
      transitionsByName: new Map(),
      transitionsByUuid: new Map(),
      paintBindingsByElement: new Map(),
      boundConnectNodes: new Set(),
      boundScriptNodes: new Set(),
      pendingRuntimeStarts: [],
      __qhtmlInitializing: true,
      rootElement,
      tree,
      globals: globalScope
    };
    nodesByUuid.forEach((node) => {
      const nodeType = node && typeof node.qhtmlType === "function" ? node.qhtmlType() : "";
      const nodeName = node && typeof node.qhtmlName === "function" ? node.qhtmlName() : "";
      if (nodeType === "QHTMLStyle" && nodeName) {
        registry.stylesByName.set(nodeName, createLiveStyle(node, registry));
      } else if (nodeType === "QHTMLTransition" && nodeName) {
        const transitionDef = createLiveTransition(node);
        registry.transitionsByName.set(nodeName, transitionDef);
        if (typeof node.qhtmlUUID === "function") {
          registry.transitionsByUuid.set(node.qhtmlUUID(), transitionDef);
        }
      } else if (nodeType === "QHTMLTheme" && nodeName) {
        registry.themesByName.set(nodeName, createLiveTheme(node, registry));
      } else if (nodeType === "QHTMLPainter" && nodeName) {
        const painterDef = createLivePainter(node, registry);
        registry.paintersByName.set(nodeName, painterDef);
        if (typeof node.qhtmlUUID === "function") {
          registry.paintersByUuid.set(node.qhtmlUUID(), painterDef);
        }
      } else if (nodeType === "QHTMLComponentDefinition" && nodeName) {
        const definitionProxy = createComponentDefinitionProxy(node, registry);
        registry.componentDefinitionsByName.set(nodeName, definitionProxy);
        if (definitionProxy.qhtmlUUID) {
          registry.componentDefinitionsByUuid.set(definitionProxy.qhtmlUUID, definitionProxy);
        }
        logQHTMLRuntime(registry, "QHTMLComponent", "Component definition " + nodeName + " registered", node);
      }
    });
    registry.refreshStyle = function (styleName) {
      const styleDef = registry.stylesByName.get(styleName);
      if (styleDef && typeof styleDef.refresh === "function") {
        styleDef.refresh();
      }
    };
    registry.refreshTheme = function (themeName) {
      const themeDef = registry.themesByName.get(themeName);
      if (themeDef && typeof themeDef.refresh === "function") {
        themeDef.refresh();
      }
    };
    registry.styles = {};
    registry.transitions = {};
    registry.themes = {};
    registry.timers = {};
    registry.animations = {};
    registry.painters = {};
    registry.definitions = {};
    registry.workers = {};
    registry.loggers = {};
    registry.qhtmlClasses = {};
    registry.qhtmlClassInstances = {};
    registry.stylesByName.forEach((styleDef, styleName) => {
      registry.styles[styleName] = styleDef;
    });
    registry.transitionsByName.forEach((transitionDef, transitionName) => {
      registry.transitions[transitionName] = transitionDef;
    });
    registry.themesByName.forEach((themeDef, themeName) => {
      registry.themes[themeName] = themeDef;
    });
    registry.paintersByName.forEach((painterDef, painterName) => {
      registry.painters[painterName] = painterDef;
    });
    registry.componentDefinitionsByName.forEach((definitionDef, definitionName) => {
      registry.definitions[definitionName] = definitionDef;
    });
    registry.stopTimers = function () {
      registry.timersByUuid.forEach((timer) => {
        if (timer && typeof timer.stop === "function") {
          timer.stop();
        }
      });
      registry.animationsByUuid.forEach((animation) => {
        if (animation && typeof animation.stop === "function") {
          animation.stop();
        }
      });
    };

    bindComponentFacade(rootElement, registry);
    setQHTMLDomUuidForNode(rootElement, qhtmlTreeRoot(tree));
    rootElement.qhtmlDomTree = tree;
    rootElement.__qhtmlRegistry = registry;
    refreshRuntimeLoggers(registry);
    registry.componentDefinitionsByName.forEach((definitionProxy, definitionName) => {
      logQHTMLRuntime(registry, "QHTMLComponent", "Component definition " + definitionName + " registered", definitionProxy.htmlNode);
    });
    bindRuntimeChildren(rootElement, tree, registry);

    nodesByUuid.forEach((node) => {
      if (qhtmlNodeType(node) !== "QHTMLWorker") {
        return;
      }
      const workerName = qhtmlNodeName(node);
      const workerUuid = typeof node.qhtmlUUID === "function" ? node.qhtmlUUID() : "";
      const worker = createLiveWorker(node, registry);
      if (workerName) {
        registry.workersByName.set(workerName, worker);
        registry.workers[workerName] = worker;
      }
      if (workerUuid) {
        registry.workersByUuid.set(workerUuid, worker);
      }
    });

    const renderedComponents = rootElement.querySelectorAll
      ? rootElement.querySelectorAll("[component-instance]")
      : [];

    renderedComponents.forEach((domElement) => {
      const instanceUuid = domElement.getAttribute("component-instance");
      const instanceNode = nodesByUuid.get(instanceUuid);
      if (!instanceNode) {
        return;
      }

      setQHTMLDomUuidForNode(domElement, instanceNode);
      domElement.qhtmlDomTree = tree;
      domElement.__qhtmlRegistry = registry;
      bindComponentFacade(domElement, registry);
      if (typeof instanceNode.qhtmlName === "function" && instanceNode.qhtmlName()) {
        const instanceName = instanceNode.qhtmlName();
        const parentComponent = domElement.parentElement && domElement.parentElement.closest
          ? domElement.parentElement.closest("[component-instance]")
          : null;
        if (parentComponent) {
          parentComponent[instanceName] = domElement;
        }
      }
      logQHTMLRuntime(
        registry,
        "QHTMLComponent",
        "Component instance " + (qhtmlNodeName(instanceNode) || instanceUuid || "anonymous") + " bound",
        instanceNode
      );
    });

    renderedComponents.forEach((domElement) => {
      const instanceNode = qhtmlNodeForDomElement(domElement, registry);
      if (!instanceNode) {
        return;
      }
      bindComponentDefinitionDeclarations(domElement, instanceNode, registry);
      bindDeclarativeAssignmentAttributes(domElement, instanceNode, registry);
      bindRuntimeChildren(domElement, instanceNode, registry);
      bindComponentInstancePropertyAssignments(domElement, instanceNode, registry);
      bindRuntimeAnimationDeclarations(domElement, instanceNode, registry);

      domElement.dispatchEvent(new CustomEvent("QHTMLComponentReady", {
        bubbles: true,
        detail: { htmlNode: instanceNode, qhtmlDom: tree }
      }));
    });

    renderedComponents.forEach((domElement) => {
      bindPaintHandlers(domElement, qhtmlNodeForDomElement(domElement, registry), registry);
    });

    bindDomElementHandlers(rootElement, registry);
    setupForLoopRuntime(rootElement, registry);

    nodesByUuid.forEach((node) => {
      if (qhtmlNodeType(node) !== "QHTMLTimer") {
        return;
      }
      ownerElementsForQHTMLNode(node, registry).forEach((ownerElement) => {
        if (!ownerElement) {
          return;
        }
        bindTimerDeclaration(ownerElement, node, registry);
      });
    });

    nodesByUuid.forEach((node) => {
      if (qhtmlNodeType(node) !== "QHTMLPropertyAnimation") {
        return;
      }
      ownerElementsForQHTMLNode(node, registry).forEach((ownerElement) => {
        if (!ownerElement) {
          return;
        }
        bindPropertyAnimationDeclaration(ownerElement, node, registry);
      });
    });

    nodesByUuid.forEach((node) => {
      if (qhtmlNodeType(node) !== "QHTMLScriptAction") {
        return;
      }
      ownerElementsForQHTMLNode(node, registry).forEach((ownerElement) => {
        if (!ownerElement) {
          return;
        }
        const actionName = qhtmlNodeName(node);
        const actionUuid = typeof node.qhtmlUUID === "function" ? node.qhtmlUUID() : "";
        const actionObject = createLiveScriptAction(node, ownerElement, registry);
        if (actionName) {
          ownerElement[actionName] = actionObject;
          registry.scriptActionsByName.set(actionName, actionObject);
        }
        if (actionUuid) {
          registry.scriptActionsByUuid.set(actionUuid, actionObject);
        }
      });
    });

    Array.from(nodesByUuid.values()).reverse().forEach((node) => {
      const nodeType = qhtmlNodeType(node);
      if (nodeType !== "QHTMLSequentialAnimation" && nodeType !== "QHTMLParallelAnimation") {
        return;
      }
      ownerElementsForQHTMLNode(node, registry).forEach((ownerElement) => {
        if (!ownerElement) {
          return;
        }
        const animationName = qhtmlNodeName(node);
        const animationUuid = typeof node.qhtmlUUID === "function" ? node.qhtmlUUID() : "";
        const animationObject = createLiveAnimationGroup(
          node,
          ownerElement,
          registry,
          nodeType === "QHTMLParallelAnimation" ? "parallel" : "sequential"
        );
        if (animationName) {
          ownerElement[animationName] = animationObject;
          registry.animationsByName.set(animationName, animationObject);
          registry.animations[animationName] = animationObject;
        }
        if (animationUuid) {
          registry.animationsByUuid.set(animationUuid, animationObject);
        }
      });
    });

    registerQHTMLClasses(registry);
    instantiateQHTMLClassNodes(registry);
    bindDeferredEventHandlers(rootElement, registry);
    bindConnectNodes(registry);
    bindScriptNodes(registry);

    applyStyleAndThemeApplications(rootElement, registry);
    applyAnchorPositioning(rootElement, registry);
    refreshGeometryCssBindings(rootElement, registry);

    rootElement.qhtmlComponentRegistry = registry;
    rootElement.qhtmlStyles = registry.styles;
    rootElement.qhtmlTransitions = registry.transitions;
    rootElement.qhtmlThemes = registry.themes;
    rootElement.qhtmlTimers = registry.timers;
    rootElement.qhtmlAnimations = registry.animations;
    rootElement.qhtmlPainters = registry.painters;
    rootElement.qhtmlComponentDefinitions = registry.definitions;
    rootElement.qhtmlWorkers = registry.workers;
    rootElement.qhtmlClasses = registry.qhtmlClasses;
    rootElement.qhtmlClassInstances = registry.qhtmlClassInstances;

    registry.__qhtmlInitializing = false;
    emitReadySignals(rootElement, registry);
    flushRuntimeStarts(registry);
  }

  async function mountElement(element, options) {
    if (!element || element.__qhtml7Mounting === true) {
      return element ? element.__qhtml7MountPromise || null : null;
    }
    if (!options || options.force !== true) {
      if (element.__qhtml7Mounted === true && element.qhtmlDomTree) {
        return element.qhtmlDomTree;
      }
    }

    element.__qhtml7Mounting = true;
    element.__qhtml7MountPromise = (async () => {
      element.setAttribute("ready", "0");

      if (typeof element.qhtmlSource !== "string" || element.qhtmlSource.length === 0) {
        element.qhtmlSource = element.innerHTML;
      }
      const originalSource = element.qhtmlSource;

      if (element.qhtmlComponentRegistry && typeof element.qhtmlComponentRegistry.stopTimers === "function") {
        element.qhtmlComponentRegistry.stopTimers();
      }

      element.innerHTML = "";
      let sourceToParse = element.__qhtmlExpandedSource || element.qhtmlSource;
      if (!options || options.importsResolved !== true) {
        sourceToParse = await resolveAllImportsBeforeParse(sourceToParse, element.__qhtmlBaseUrl || document.baseURI);
      }
      element.qhtmlResolvedSource = sourceToParse;

      const parsed = instantiateParserTree(sourceToParse);
      element.qhtmlParser = parsed.parser;
      element.qhtmlDomTree = parsed.tree;
      element.qhtmlDom = parsed.tree;

      if (typeof parsed.tree.runtime === "function") {
        parsed.tree.runtime();
      }

      if (typeof parsed.tree.renderHtml === "function") {
        element.innerHTML = parsed.tree.renderHtml();
      }
      bindComponentDomRuntime(element, parsed.tree);

      if (element.__qhtml7RuntimeDisposed === true || !element.isConnected) {
        return null;
      }
      element.setAttribute("ready", "1");
      element.__qhtml7Mounted = true;
      element.dispatchEvent(new CustomEvent("QHTMLReady", {
        bubbles: true,
        detail: { source: sourceToParse, qhtmlDom: element.qhtmlDomTree }
      }));
      dispatchQHTMLContentLoadedSoon();

      return element.qhtmlDomTree;
    })();

    try {
      return await element.__qhtml7MountPromise;
    } catch (error) {
      element.qhtmlError = error;
      element.setAttribute("ready", "-1");
      element.dispatchEvent(new CustomEvent("QHTMLError", {
        bubbles: true,
        detail: { error }
      }));
      return null;
    } finally {
      element.__qhtml7Mounting = false;
      element.__qhtml7MountPromise = null;
    }
  }

  class QHTMLElement extends HTMLElement {
    constructor() {
      super();
      this.qhtmlSource = "";
      this.qhtmlParser = null;
      this.qhtmlDomTree = null;
      this.qhtmlDom = null;
      this.qhtmlResolvedSource = "";
      this.qhtmlError = null;
    }

    get innerHTML() {
      const raw = ELEMENT_INNER_HTML && ELEMENT_INNER_HTML.get
        ? ELEMENT_INNER_HTML.get.call(this)
        : "";
      return sanitizeQHTMLPublicHtml(raw);
    }

    set innerHTML(value) {
      if (ELEMENT_INNER_HTML && ELEMENT_INNER_HTML.set) {
        ELEMENT_INNER_HTML.set.call(this, value);
      }
    }

    connectedCallback() {
      if (this.__qhtml7Connected === true) {
        return;
      }
      this.__qhtml7Connected = true;
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => mountElement(this), { once: true });
      } else {
        mountElement(this);
      }
    }

    qdom() {
      if (this.__qhtmlAllowRuntimeFallback === true && this.__qhtmlFallbackStarted !== true) {
        this.__qhtmlFallbackStarted = true;
        const source = this.qhtmlSource || this.innerHTML || "";
        transitionToQHTML6Host(this, source, new Error("QHTML6 legacy qdom() requested"))
          .catch((fallbackError) => {
            replaceWithQHTMLError(this, source, fallbackError);
          });
        return createQHTMLDomFacade(this);
      }
      return createQHTMLDomFacade(this);
    }

    __qhtmlSetTree(tree) {
      if (!tree) {
        return null;
      }
      this.qhtmlDomTree = tree;
      this.qhtmlDom = tree;
      this.qhtmlSource = typeof tree.toQHTML === "function"
        ? tree.toQHTML()
        : (typeof tree.sourceQHTML === "function" ? tree.sourceQHTML() : "");
      this.qhtmlResolvedSource = this.qhtmlSource;
      this.qhtmlError = null;
      if (typeof tree.runtime === "function") {
        tree.runtime();
      }
      this.innerHTML = typeof tree.renderHtml === "function" ? tree.renderHtml() : "";
      bindComponentDomRuntime(this, tree);
      this.setAttribute("ready", "1");
      this.__qhtml7Mounted = true;
      this.dispatchEvent(new CustomEvent("QHTMLReady", {
        bubbles: true,
        detail: { source: this.qhtmlSource, qhtmlDom: tree }
      }));
      dispatchQHTMLContentLoadedSoon();
      return tree;
    }

    toJSON() {
      const tree = this.qhtmlDomTree;
      if (!tree) {
        return [];
      }
      syncLivePropertiesInSubtree(this);
      if (typeof tree.toJSON === "function") {
        return tree.toJSON();
      }
      if (typeof tree.toJSONText === "function") {
        return JSON.parse(tree.toJSONText());
      }
      return [];
    }

    toJSONText() {
      const tree = this.qhtmlDomTree;
      if (!tree) {
        return "[]";
      }
      syncLivePropertiesInSubtree(this);
      if (typeof tree.toJSONText === "function") {
        return tree.toJSONText();
      }
      return JSON.stringify(this.toJSON());
    }

    fromJSON(value) {
      const qtModule = globalScope.QHTML7.Module;
      if (typeof qtModule.QHTMLDomTree !== "function") {
        throw new Error("QHTML7 WASM module must export QHTMLDomTree");
      }
      const tree = this.qhtmlDomTree || new qtModule.QHTMLDomTree();
      let ok = false;
      if (typeof tree.fromJSON === "function") {
        ok = tree.fromJSON(value);
      } else if (typeof tree.fromJSONText === "function") {
        ok = tree.fromJSONText(typeof value === "string" ? value : JSON.stringify(value));
      } else {
        throw new Error("QHTMLDomTree does not expose fromJSON/fromJSONText");
      }
      if (!ok) {
        throw new Error("QHTML fromJSON failed: invalid JSON payload");
      }
      return this.__qhtmlSetTree(tree);
    }

    toQHTML() {
      const tree = this.qhtmlDomTree;
      if (!tree) {
        return this.qhtmlSource || "";
      }
      syncLivePropertiesInSubtree(this);
      return typeof tree.toQHTML === "function"
        ? tree.toQHTML()
        : (typeof tree.sourceQHTML === "function" ? tree.sourceQHTML() : "");
    }

    fromQHTML(source) {
      return this.setQHTMLSource(source);
    }

    toHTML() {
      const tree = this.qhtmlDomTree;
      if (!tree) {
        return "";
      }
      syncLivePropertiesInSubtree(this);
      return typeof tree.toHTML === "function"
        ? tree.toHTML()
        : (typeof tree.renderHtml === "function" ? tree.renderHtml() : "");
    }

    setQHTMLSource(source, baseUrl) {
      const nextSource = String(source || "");
      const nextBaseUrl = String(baseUrl || document.baseURI || globalScope.location.href || "");
      if (this.__qhtml7Mounting === true) {
        this.__qhtmlPendingSource = nextSource;
        this.__qhtmlPendingBaseUrl = nextBaseUrl;
        const activeMount = this.__qhtml7MountPromise || Promise.resolve(this.qhtmlDomTree || null);
        return activeMount.then(() => {
          const pendingSource = this.__qhtmlPendingSource;
          const pendingBaseUrl = this.__qhtmlPendingBaseUrl;
          this.__qhtmlPendingSource = "";
          this.__qhtmlPendingBaseUrl = "";
          if (typeof pendingSource === "string") {
            return this.setQHTMLSource(pendingSource, pendingBaseUrl);
          }
          return this.qhtmlDomTree || null;
        });
      }

      this.qhtmlSource = nextSource;
      this.__qhtmlBaseUrl = nextBaseUrl;
      this.__qhtmlExpandedSource = "";
      this.qhtmlResolvedSource = "";
      this.qhtmlError = null;
      this.__qhtml7Mounted = false;
      this.innerHTML = "";
      return mountElement(this, { force: true });
    }

    refresh(source) {
      if (typeof source === "string") {
        return this.setQHTMLSource(source);
      }
      if (this.__qhtmlLegacyDomMutated === true) {
        this.__qhtmlLegacyDomMutated = false;
        return Promise.resolve(this.qhtmlDomTree || null);
      }
      this.__qhtml7Mounted = false;
      return mountElement(this, { force: true });
    }

    update(source) {
      return this.refresh(source);
    }
  }

  class QHTMLFacilitatorElement extends HTMLElement {
    constructor() {
      super();
      this.qhtmlSource = "";
      this.qhtmlError = null;
    }

    connectedCallback() {
      if (this.__qhtmlFacilitatorFinalized === true) {
        return;
      }
      if (this.__qhtmlFacilitatorConnected === true) {
        return;
      }
      this.__qhtmlFacilitatorConnected = true;
      const start = () => this.mountForVersion();
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
      } else {
        start();
      }
    }

    mountForVersion() {
      const version = String(this.getAttribute("version") || "").trim();
      if (version === "6") {
        return this.mountQHTML6();
      }
      if (version === "7") {
        return this.mountQHTML7({ fallback: false });
      }
      const source = this.qhtmlSource || this.innerHTML || "";
      if (shouldUseQHTML6ForLegacySource(source)) {
        this.qhtmlSource = source;
        return this.mountQHTML6();
      }
      return this.mountQHTML7({ fallback: true });
    }

    mountQHTML6() {
      if (!this.parentNode) {
        return null;
      }
      const source = this.qhtmlSource || this.innerHTML || "";
      this.qhtmlSource = source;
      fallbackToQHTML6(this, source, null)
        .catch((fallbackError) => {
          const errorElement = replaceWithQHTMLError(this, source, fallbackError);
          errorElement.dispatchEvent(new CustomEvent("QHTMLFallbackError", {
            bubbles: true,
            detail: { qhtml7Error: null, qhtml6Error: fallbackError }
          }));
        });
      return this;
    }

    mountQHTML7(options) {
      if (!this.parentNode) {
        return null;
      }
      const allowFallback = !options || options.fallback !== false;
      const source = this.qhtmlSource || this.innerHTML || "";
      this.qhtmlSource = source;
      const qhtml7Element = createClonedQHTMLFallbackElement(ELEMENT_NAME_7, source, this.attributes);
      qhtml7Element.setAttribute("version", "7");
      qhtml7Element.qhtmlSource = source;
      qhtml7Element.__qhtmlAllowRuntimeFallback = allowFallback;
      qhtml7Element.__qhtmlOriginalVersion = String(this.getAttribute("version") || "").trim();
      qhtml7Element.addEventListener("QHTMLReady", () => {
        promoteParserHostToQHTML(qhtml7Element, source, "qhtml7");
      }, { once: true });
      qhtml7Element.addEventListener("QHTMLError", (event) => {
        const qhtml7Error = event && event.detail ? event.detail.error : null;
        this.qhtmlError = qhtml7Error;
        if (!allowFallback) {
          const errorElement = replaceWithQHTMLError(qhtml7Element, source, qhtml7Error);
          errorElement.dispatchEvent(new CustomEvent("QHTMLFallbackError", {
            bubbles: true,
            detail: { qhtml7Error, qhtml6Error: null }
          }));
          return;
        }
        transitionToQHTML6Host(qhtml7Element, source, qhtml7Error)
          .then((qhtmlElement) => {
            qhtmlElement.dispatchEvent(new CustomEvent("QHTMLFallback", {
              bubbles: true,
              detail: { qhtml7Error, runtime: "qhtml6" }
            }));
          })
          .catch((fallbackError) => {
            const errorElement = replaceWithQHTMLError(qhtml7Element, source, fallbackError);
            errorElement.dispatchEvent(new CustomEvent("QHTMLFallbackError", {
              bubbles: true,
              detail: { qhtml7Error, qhtml6Error: fallbackError }
            }));
          });
      }, { once: true });
      this.replaceWith(qhtml7Element);
      return qhtml7Element;
    }

    qdom() {
      if (this.getAttribute("version") === "6") {
        return globalScope.QHtml6 && typeof globalScope.QHtml6.getQDomForElement === "function"
          ? globalScope.QHtml6.getQDomForElement(this)
          : null;
      }
      if (this.__qhtmlFacilitatorFinalized === true && this.__qhtmlAllowRuntimeFallback === true) {
        const source = this.qhtmlSource || this.innerHTML || "";
        transitionToQHTML6Host(this, source, new Error("QHTML6 legacy qdom() requested"))
          .catch((fallbackError) => {
            replaceWithQHTMLError(this, source, fallbackError);
          });
        return createQHTMLDomFacade(this);
      }
      return createQHTMLDomFacade(this);
    }
  }

  class QHTML7AliasElement extends QHTMLElement {
  }

  if (!customElements.get(ELEMENT_NAME)) {
    customElements.define(ELEMENT_NAME, QHTMLElement);
  }
  if (!customElements.get(ELEMENT_NAME_7)) {
    customElements.define(ELEMENT_NAME_7, QHTML7AliasElement);
  }

  function mountAll(root) {
    const scope = root || document;
    const elements = scope.querySelectorAll ? scope.querySelectorAll(QHTML_ROOT_SELECTOR) : [];
    elements.forEach((element) => mountElement(element));
  }

  globalScope.QHTML7 = Object.assign(globalScope.QHTML7 || {}, {
    QHTML_VERSION,
    QHTML_QUICKJS_ENABLED: Boolean(globalScope.QHTML7.Module && globalScope.QHTML7.Module.QHTML_QUICKJS_ENABLED),
    QHTML_QUICKJS_SIZE_BUDGET_BYTES: globalScope.QHTML7.Module && globalScope.QHTML7.Module.QHTML_QUICKJS_SIZE_BUDGET_BYTES,
    QHTMLElement,
    QHTML7AliasElement,
    QHTMLFacilitatorElement,
    qhtmlVersion: QHTML_VERSION,
    version: QHTML_VERSION,
    readResourceText(path) {
      return qhtmlResourceText(String(path || "")) || "";
    },
    createTree(source) {
      return instantiateParserTree(source).tree;
    },
    parse(source) {
      return instantiateParserTree(source).tree;
    },
    renderSource(source) {
      const tree = instantiateParserTree(source).tree;
      if (!tree) {
        return "";
      }
      return typeof tree.toHTML === "function"
        ? tree.toHTML()
        : (typeof tree.renderHtml === "function" ? tree.renderHtml() : "");
    },
    sourceFromTree(tree) {
      if (!tree) {
        return "";
      }
      return typeof tree.toQHTML === "function"
        ? tree.toQHTML()
        : (typeof tree.sourceQHTML === "function" ? tree.sourceQHTML() : "");
    },
    bindTree(element, tree) {
      if (!element || !tree) {
        return null;
      }
      bindComponentDomRuntime(element, tree);
      return tree;
    },
    async mountTree(element, tree) {
      if (!element || !tree) {
        return null;
      }
      element.qhtmlDomTree = tree;
      element.qhtmlDom = tree;
      element.qhtmlSource = typeof tree.toQHTML === "function"
        ? tree.toQHTML()
        : (typeof tree.sourceQHTML === "function" ? tree.sourceQHTML() : "");
      element.qhtmlResolvedSource = element.qhtmlSource;
      if (typeof tree.runtime === "function") {
        tree.runtime();
      }
      element.innerHTML = typeof tree.renderHtml === "function" ? tree.renderHtml() : "";
      bindComponentDomRuntime(element, tree);
      element.setAttribute("ready", "1");
      element.__qhtml7Mounted = true;
      element.dispatchEvent(new CustomEvent("QHTMLReady", {
        bubbles: true,
        detail: { source: element.qhtmlSource, qhtmlDom: tree }
      }));
      dispatchQHTMLContentLoadedSoon();
      return tree;
    },
    mountElement,
    mountAll
  });

  document.addEventListener(QHTML_CONTENT_LOADED_EVENT, () => {
    document.querySelectorAll(QHTML_ROOT_SELECTOR).forEach((element) => {
      rebindRuntimeLoggersForHost(element);
    });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => mountAll(document), { once: true });
  } else {
    mountAll(document);
  }
})();


// Built-in QHTMLParticleEmitter browser bridge
(function installParticleEmitter(global) {
  if (!global || !global.customElements) {
    return;
  }

  const existingParticleEmitter = global.customElements.get("particle-emitter");

  if (existingParticleEmitter) {
    installParticleEmitterControls(existingParticleEmitter.prototype);
    global.ParticleEmitterElement = existingParticleEmitter;
    return;
  }

  const ATTRS = [
    "emitrate",
    "lifetime",
    "lifetimevariation",
    "x",
    "y",
    "width",
    "height",
    "xvariation",
    "yvariation",
    "xvelocity",
    "yvelocity",
    "xvelocityvariation",
    "yvelocityvariation",
    "xacceleration",
    "yacceleration",
    "xaccelerationvariation",
    "yaccelerationvariation",
    "startsize",
    "endsize",
    "startsizevariation",
    "endsizevariation",
    "startopacity",
    "endopacity",
    "startopacityvariation",
    "endopacityvariation",
    "maxactiveparticles",
    "maxactiveparticlesvariation",
    "maxparticles",
    "stopafter",
    "running",
    "interval",
    "color",
    "color-opacity",
    "coloropacity",
    "src",
    "mask",
    "emitter-mask",
    "emittermask",
    "seed",
    "zindex",
  ];

  class ParticleEmitterElement extends HTMLElement {
    static get observedAttributes() {
      return ATTRS;
    }

    constructor() {
      super();

      this._canvas = document.createElement("canvas");
      this._ctx = this._canvas.getContext("2d", { alpha: true });
      this._particles = [];
      this._sprite = new ParticleSprite();
      this._emitterMask = new ParticleEmitterMask();
      this._particleSnapshot = new Float32Array(0);
      this._snapshotActive = false;
      this._worker = null;
      this._workerUrl = "";
      this._workerReady = false;
      this._paintTimer = 0;
      this._paintInterval = 16.666;
      this._drawStride = 1;
      this._drawPhase = 0;
      this._paintPollCountdown = 1;
      this._lastPaintDuration = 0;
      this._resizeObserver = typeof ResizeObserver === "function"
        ? new ResizeObserver(() => this._resize())
        : null;
      this._boundResize = this._resize.bind(this);
      this._boundWorkerMessage = this._onWorkerMessage.bind(this);
    }

    connectedCallback() {
      this._installCanvas();
      this._reloadConfig();

      if (this._resizeObserver) {
        this._resizeObserver.observe(this.parentElement);
      } else {
        global.addEventListener("resize", this._boundResize);
      }

      this._resize();
      this._sprite.configure({
        src: this._config.src,
        mask: this._config.mask,
        color: this._config.color,
        colorOpacity: this._config.colorOpacity,
      });
      this._emitterMask.configure(this._config.emitterMask);
      this._ensureWorker();
      this._postWorkerConfig();
      this._render();

      if (this._config.running) {
        this._postWorker({ type: "start" });
        this._startPainter();
      }
    }

    disconnectedCallback() {
      this._stopPainter();
      this._destroyWorker();

      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
      } else {
        global.removeEventListener("resize", this._boundResize);
      }

      this._canvas.remove();
    }

    attributeChangedCallback() {
      if (!this.isConnected) {
        return;
      }

      const oldRunning = this._config ? this._config.running : false;
      this._reloadConfig();
      this._sprite.configure({
        src: this._config.src,
        mask: this._config.mask,
        color: this._config.color,
        colorOpacity: this._config.colorOpacity,
      });
      this._emitterMask.configure(this._config.emitterMask);

      this._postWorkerConfig();

      if (!oldRunning && this._config.running) {
        this._postWorker({ type: "start" });
        this._startPainter();
      } else if (oldRunning && !this._config.running) {
        this._postWorker({ type: "stop" });
      }

      this._applyLayerStyle();
    }

    get running() {
      return readBool(this, "running", false);
    }

    set running(value) {
      this.setAttribute("running", value ? "true" : "false");
    }

    start() {
      this.running = true;
    }

    stop() {
      this.running = false;
    }

    clear() {
      this._particles.length = 0;
      this._particleSnapshot = new Float32Array(0);
      this._snapshotActive = false;
      this._postWorker({ type: "clear" });
      this._render();

      if (!this._config || !this._config.running) {
        this._stopPainter();
      }
    }

    burst(x, y, num) {
      const centerX = readFiniteNumber(x, this._config ? this._config.x : 0);
      const centerY = readFiniteNumber(y, this._config ? this._config.y : 0);
      const count = Math.max(0, Math.floor(Number(num)));

      if (!count) {
        return 0;
      }

      this._ensureWorker();
      this._postWorker({ type: "burst", x: centerX, y: centerY, count });
      this._startPainter();
      return count;
    }

    _installCanvas() {
      const parent = this.parentElement;

      if (!parent) {
        throw new Error("<particle-emitter> must be placed inside a parent element.");
      }

      const parentStyle = getComputedStyle(parent);

      if (parentStyle.position === "static") {
        parent.style.position = "relative";
      }

      this.style.position = "absolute";
      this.style.inset = "0";
      this.style.display = "block";
      this.style.pointerEvents = "none";
      this.style.overflow = "hidden";
      this.style.zIndex = String(readNumber(this, "zIndex", 1));

      this._canvas.style.position = "absolute";
      this._canvas.style.inset = "0";
      this._canvas.style.width = "100%";
      this._canvas.style.height = "100%";
      this._canvas.style.pointerEvents = "none";
      this._canvas.style.background = "transparent";
      this._canvas.style.display = "block";

      if (!this._canvas.parentNode) {
        this.appendChild(this._canvas);
      }
    }

    _applyLayerStyle() {
      this.style.zIndex = String(this._config.zIndex);
    }

    _reloadConfig() {
      const cfg = ParticleConfig.fromElement(this);

      this._config = cfg;
      this._paintInterval = Math.max(1, cfg.interval);
      this._applyLayerStyle();
    }

    _resize() {
      const parent = this.parentElement;

      if (!parent) {
        return;
      }

      const rect = parent.getBoundingClientRect();
      const dpr = global.devicePixelRatio || 1;
      const cssWidth = Math.max(1, rect.width);
      const cssHeight = Math.max(1, rect.height);
      const pixelWidth = Math.floor(cssWidth * dpr);
      const pixelHeight = Math.floor(cssHeight * dpr);

      if (this._canvas.width !== pixelWidth || this._canvas.height !== pixelHeight) {
        this._canvas.width = pixelWidth;
        this._canvas.height = pixelHeight;
        this._canvas.style.width = `${cssWidth}px`;
        this._canvas.style.height = `${cssHeight}px`;
        this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }

    _ensureWorker() {
      if (this._worker || typeof Worker !== "function" || typeof Blob !== "function" || typeof URL === "undefined") {
        return;
      }

      try {
        const blob = new Blob([createParticleWorkerSource()], { type: "application/javascript" });
        this._workerUrl = URL.createObjectURL(blob);
        this._worker = new Worker(this._workerUrl);
        this._worker.addEventListener("message", this._boundWorkerMessage);
        this._workerReady = true;
      } catch (error) {
        this._worker = null;
        this._workerReady = false;
        if (this._workerUrl) {
          URL.revokeObjectURL(this._workerUrl);
          this._workerUrl = "";
        }
      }
    }

    _destroyWorker() {
      if (this._worker) {
        this._worker.removeEventListener("message", this._boundWorkerMessage);
        this._worker.terminate();
        this._worker = null;
      }
      if (this._workerUrl) {
        URL.revokeObjectURL(this._workerUrl);
        this._workerUrl = "";
      }
      this._workerReady = false;
    }

    _postWorker(message, transfer) {
      this._ensureWorker();
      if (!this._workerReady || !this._worker) {
        return;
      }

      this._worker.postMessage(message, transfer || []);
    }

    _postWorkerConfig() {
      if (!this._config) {
        return;
      }

      this._postWorker({ type: "config", config: serializeParticleConfig(this._config) });
    }

    _onWorkerMessage(event) {
      const data = event && event.data ? event.data : null;
      if (!data) {
        return;
      }

      if (data.type === "snapshot") {
        this._particleSnapshot = data.buffer ? new Float32Array(data.buffer) : new Float32Array(0);
        this._snapshotActive = Boolean(data.active);
        this._particles = snapshotToParticleViews(this._particleSnapshot);
        if (this._snapshotActive || this._particleSnapshot.length > 0 || (this._config && this._config.running)) {
          this._startPainter();
        }
        return;
      }

      if (data.type === "stopped") {
        this._snapshotActive = false;
        if (!this._config || !this._config.running) {
          this._render();
          this._stopPainter();
        }
        return;
      }

      if (data.type === "limitReached") {
        if (this._config && this._config.running) {
          this.setAttribute("running", "false");
        }
      }
    }

    _startPainter() {
      if (this._paintTimer) {
        return;
      }

      const delay = Math.max(1, Math.floor(this._paintInterval || (this._config ? this._config.interval : 16.666)));
      this._paintTimer = global.setTimeout(() => this._paintTick(), delay);
    }

    _stopPainter() {
      if (!this._paintTimer) {
        return;
      }

      global.clearTimeout(this._paintTimer);
      this._paintTimer = 0;
    }

    _paintTick() {
      this._paintTimer = 0;

      const shouldMeasure = this._paintPollCountdown <= 0;
      const start = shouldMeasure && global.performance ? performance.now() : 0;

      this._render(shouldMeasure);

      if (shouldMeasure && global.performance) {
        this._lastPaintDuration = performance.now() - start;
        this._adaptPainter();
        this._paintPollCountdown = 6 + Math.floor(Math.random() * 10);
      } else {
        this._paintPollCountdown -= 1;
      }

      if ((this._config && this._config.running) || this._snapshotActive || this._particleSnapshot.length > 0) {
        this._startPainter();
      }
    }

    _adaptPainter() {
      const targetInterval = Math.max(1, this._config ? this._config.interval : 16.666);
      const drawDuration = Number(this._lastPaintDuration) || 0;

      if (drawDuration > targetInterval) {
        if (this._drawStride < 2) {
          this._drawStride = 2;
          this._paintInterval = targetInterval;
        } else {
          this._paintInterval = Math.max(targetInterval, drawDuration + 20);
        }
        return;
      }

      if (drawDuration < targetInterval * 0.55) {
        if (this._paintInterval > targetInterval) {
          this._paintInterval = Math.max(targetInterval, this._paintInterval * 0.85);
        } else if (this._drawStride > 1) {
          this._drawStride = 1;
        }
      }
    }

    _render(forceAll) {
      const ctx = this._ctx;
      const width = this._canvas.clientWidth;
      const height = this._canvas.clientHeight;
      const snapshot = this._particleSnapshot;

      ctx.clearRect(0, 0, width, height);

      if (!snapshot || snapshot.length <= 0) {
        return;
      }

      const stride = forceAll ? 1 : Math.max(1, Math.floor(this._drawStride || 1));
      const phase = forceAll ? 0 : this._drawPhase % stride;

      if (!forceAll) {
        this._drawPhase = (this._drawPhase + 1) % stride;
      }

      for (let i = phase * 4; i < snapshot.length; i += stride * 4) {
        ParticleRenderer.drawSnapshot(ctx, snapshot, i, this._sprite, this._emitterMask, width, height);
      }
    }
  }

  class ParticleConfig {
    static fromElement(el) {
      const number = (name, fallback) => readNumber(el, name, fallback);
      const text = (name, fallback = "") => readAttr(el, name) ?? fallback;

      return {
        emitRate: number("emitRate", 10),
        lifetime: Math.max(1, number("lifetime", 1000)),
        lifetimeVariation: Math.max(0, number("lifetimeVariation", 0)),
        x: number("x", 0),
        y: number("y", 0),
        width: Math.max(0, number("width", 0)),
        height: Math.max(0, number("height", 0)),
        xVariation: number("xVariation", 0),
        yVariation: number("yVariation", 0),
        xVelocity: number("xVelocity", 0),
        yVelocity: number("yVelocity", 0),
        xVelocityVariation: number("xVelocityVariation", 0),
        yVelocityVariation: number("yVelocityVariation", 0),
        xAcceleration: number("xAcceleration", 0),
        yAcceleration: number("yAcceleration", 0),
        xAccelerationVariation: number("xAccelerationVariation", 0),
        yAccelerationVariation: number("yAccelerationVariation", 0),
        startSize: Math.max(0, number("startSize", 8)),
        endSize: Math.max(0, number("endSize", 8)),
        startSizeVariation: Math.max(0, number("startSizeVariation", 0)),
        endSizeVariation: Math.max(0, number("endSizeVariation", 0)),
        startOpacity: clamp(number("startOpacity", 1), 0, 1),
        endOpacity: clamp(number("endOpacity", 0), 0, 1),
        startOpacityVariation: Math.max(0, number("startOpacityVariation", 0)),
        endOpacityVariation: Math.max(0, number("endOpacityVariation", 0)),
        maxActiveParticles: Math.max(0, Math.floor(number("maxActiveParticles", 256))),
        maxActiveParticlesVariation: Math.max(0, number("maxActiveParticlesVariation", 0)),
        totalParticleLimit: Math.max(0, Math.floor(number("maxParticles", number("stopAfter", 0)))),
        running: readBool(el, "running", false),
        interval: Math.max(1, number("interval", 16.666)),
        color: text("color", ""),
        colorOpacity: readAttr(el, "colorOpacity") == null ? null : clamp(number("colorOpacity", 1), 0, 1),
        src: text("src", ""),
        mask: text("mask", ""),
        emitterMask: text("emitterMask", ""),
        seed: Math.floor(number("seed", 0xc0ffee)),
        zIndex: Math.floor(number("zIndex", 1)),
      };
    }
  }

  class ParticleFactory {
    static create(cfg, rng, origin) {
      const lifetime = vary(cfg.lifetime, cfg.lifetimeVariation, rng);
      const hasOrigin = origin && typeof origin === "object";
      const originX = hasOrigin && Number.isFinite(Number(origin.x)) ? Number(origin.x) : cfg.x;
      const originY = hasOrigin && Number.isFinite(Number(origin.y)) ? Number(origin.y) : cfg.y;
      const emitterOrigin = sampleEmitterOrigin(cfg, rng, originX, originY);

      return new Particle({
        x: vary(emitterOrigin.x, cfg.xVariation, rng),
        y: vary(emitterOrigin.y, cfg.yVariation, rng),
        vx: vary(cfg.xVelocity, cfg.xVelocityVariation, rng),
        vy: vary(cfg.yVelocity, cfg.yVelocityVariation, rng),
        ax: vary(cfg.xAcceleration, cfg.xAccelerationVariation, rng),
        ay: vary(cfg.yAcceleration, cfg.yAccelerationVariation, rng),
        startSize: Math.max(0, vary(cfg.startSize, cfg.startSizeVariation, rng)),
        endSize: Math.max(0, vary(cfg.endSize, cfg.endSizeVariation, rng)),
        startOpacity: clamp(vary(cfg.startOpacity, cfg.startOpacityVariation, rng), 0, 1),
        endOpacity: clamp(vary(cfg.endOpacity, cfg.endOpacityVariation, rng), 0, 1),
        lifetime,
      });
    }
  }

  class Particle {
    constructor(opts) {
      Object.assign(this, opts);
      this.age = 0;
      this.alive = true;
    }

    update(elapsedMs, tickScale) {
      this.age += elapsedMs;

      if (this.age >= this.lifetime) {
        this.alive = false;
        return;
      }

      this.vx += this.ax * tickScale;
      this.vy += this.ay * tickScale;
      this.x += this.vx * tickScale;
      this.y += this.vy * tickScale;
    }

    get progress() {
      return clamp(this.age / this.lifetime, 0, 1);
    }

    get size() {
      return lerp(this.startSize, this.endSize, this.progress);
    }

    get opacity() {
      return lerp(this.startOpacity, this.endOpacity, this.progress);
    }
  }

  class ParticleRenderer {
    static drawSnapshot(ctx, snapshot, offset, sprite, emitterMask, emitterWidth, emitterHeight) {
      const particle = {
        x: snapshot[offset],
        y: snapshot[offset + 1],
        size: snapshot[offset + 2],
        opacity: snapshot[offset + 3],
      };

      ParticleRenderer.draw(ctx, particle, sprite, emitterMask, emitterWidth, emitterHeight);
    }

    static draw(ctx, particle, sprite, emitterMask, emitterWidth, emitterHeight) {
      const size = particle.size;

      if (size <= 0) {
        return;
      }

      if (emitterMask && !emitterMask.allows(particle.x, particle.y, emitterWidth, emitterHeight)) {
        return;
      }

      const half = size / 2;

      ctx.save();
      ctx.globalAlpha = particle.opacity;

      if (sprite.ready) {
        ctx.drawImage(sprite.canvas, particle.x - half, particle.y - half, size, size);
      } else {
        ctx.fillStyle = sprite.color || "rgba(255,255,255,1)";
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, half, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  class ParticleEmitterMask {
    constructor() {
      this.src = "";
      this.image = null;
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d", { alpha: true, willReadFrequently: true });
      this.imageData = null;
      this.ready = false;
      this.failed = false;
    }

    configure(src) {
      const nextSrc = src || "";

      if (nextSrc === this.src) {
        return;
      }

      this.src = nextSrc;
      this.image = null;
      this.imageData = null;
      this.ready = false;
      this.failed = false;

      if (!this.src) {
        return;
      }

      const requestedSrc = this.src;

      loadImage(requestedSrc)
        .then((image) => {
          if (requestedSrc === this.src) {
            this._compose(image);
          }
        })
        .catch(() => {
          if (requestedSrc === this.src) {
            this.failed = true;
          }
        });
    }

    allows(x, y, width, height) {
      if (!this.src) {
        return true;
      }

      if (this.failed) {
        return true;
      }

      if (!this.ready || !this.imageData || width <= 0 || height <= 0) {
        return false;
      }

      if (x < 0 || y < 0 || x > width || y > height) {
        return false;
      }

      const sampleX = Math.max(
        0,
        Math.min(this.canvas.width - 1, Math.floor((x / width) * this.canvas.width))
      );
      const sampleY = Math.max(
        0,
        Math.min(this.canvas.height - 1, Math.floor((y / height) * this.canvas.height))
      );
      const alphaIndex = ((sampleY * this.canvas.width) + sampleX) * 4 + 3;

      return this.imageData.data[alphaIndex] > 0;
    }

    _compose(image) {
      const width = Math.max(1, image.naturalWidth || image.width || 1);
      const height = Math.max(1, image.naturalHeight || image.height || 1);

      this.image = image;
      this.canvas.width = width;
      this.canvas.height = height;
      this.ctx.clearRect(0, 0, width, height);
      this.ctx.drawImage(image, 0, 0, width, height);

      try {
        this.imageData = this.ctx.getImageData(0, 0, width, height);
        this.ready = true;
      } catch (error) {
        this.imageData = null;
        this.ready = false;
        this.failed = true;
      }
    }
  }

  class ParticleSprite {
    constructor() {
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d", { alpha: true });
      this.src = "";
      this.mask = "";
      this.color = "";
      this.colorOpacity = null;
      this.srcImage = null;
      this.maskImage = null;
      this.ready = false;
    }

    configure({ src, mask, color, colorOpacity }) {
      const normalizedColorOpacity = colorOpacity == null ? null : clamp(Number(colorOpacity), 0, 1);
      const changed =
        src !== this.src ||
        mask !== this.mask ||
        color !== this.color ||
        normalizedColorOpacity !== this.colorOpacity;

      if (!changed) {
        return;
      }

      this.src = src;
      this.mask = mask;
      this.color = color;
      this.colorOpacity = normalizedColorOpacity;
      this.ready = false;
      this.srcImage = null;
      this.maskImage = null;
      this._loadAssets().then(() => this._compose());
    }

    async _loadAssets() {
      const [srcImage, maskImage] = await Promise.all([
        this.src ? loadImage(this.src).catch(() => null) : Promise.resolve(null),
        this.mask ? loadImage(this.mask).catch(() => null) : Promise.resolve(null),
      ]);

      this.srcImage = srcImage;
      this.maskImage = maskImage;
    }

    _compose() {
      const baseSize = Math.max(
        1,
        this.srcImage?.naturalWidth ?? this.maskImage?.naturalWidth ?? 64,
        this.srcImage?.naturalHeight ?? this.maskImage?.naturalHeight ?? 64
      );

      this.canvas.width = baseSize;
      this.canvas.height = baseSize;

      const ctx = this.ctx;
      ctx.clearRect(0, 0, baseSize, baseSize);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      const hasSrc = Boolean(this.srcImage);
      const hasMask = Boolean(this.maskImage);
      const hasColor = Boolean(this.color);
      const colorOpacity = this.colorOpacity == null
        ? hasSrc && !hasMask ? 0.28 : 1
        : clamp(this.colorOpacity, 0, 1);

      if (hasSrc && hasMask && hasColor && colorOpacity > 0) {
        ctx.globalAlpha = colorOpacity;
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, baseSize, baseSize);
        ctx.globalAlpha = 1;
        ctx.drawImage(this.srcImage, 0, 0, baseSize, baseSize);
      } else if (hasSrc) {
        ctx.drawImage(this.srcImage, 0, 0, baseSize, baseSize);
      } else if (hasMask) {
        ctx.drawImage(this.maskImage, 0, 0, baseSize, baseSize);
      } else {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(baseSize / 2, baseSize / 2, baseSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (hasMask && hasSrc) {
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(this.maskImage, 0, 0, baseSize, baseSize);
        ctx.globalCompositeOperation = "source-over";
      }

      if (hasSrc && !hasMask && hasColor && colorOpacity > 0) {
        ctx.globalCompositeOperation = "source-atop";
        ctx.globalAlpha = colorOpacity;
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, baseSize, baseSize);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      } else if (hasColor && !hasSrc && colorOpacity > 0) {
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, baseSize, baseSize);
        ctx.globalCompositeOperation = "source-over";
      }

      this.ready = true;
    }
  }

  class SeededRandom {
    constructor(seed) {
      this.state = seed >>> 0;
    }

    next() {
      let t = this.state += 0x6d2b79f5;

      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    range(min, max) {
      return min + (max - min) * this.next();
    }
  }

  function readAttr(el, name) {
    if (el.hasAttribute(name)) {
      return el.getAttribute(name);
    }

    const lower = name.toLowerCase();

    if (el.hasAttribute(lower)) {
      return el.getAttribute(lower);
    }

    const kebab = name.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);

    if (el.hasAttribute(kebab)) {
      return el.getAttribute(kebab);
    }

    return null;
  }

  function readNumber(el, name, fallback) {
    const raw = readAttr(el, name);

    if (raw == null || raw === "") {
      return fallback;
    }

    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  function readFiniteNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function readBool(el, name, fallback) {
    const raw = readAttr(el, name);

    if (raw == null) {
      return fallback;
    }

    return !["false", "0", "no", "off"].includes(raw.trim().toLowerCase());
  }

  function vary(value, variation, rng) {
    if (!variation) {
      return value;
    }

    return value + rng.range(-variation, variation);
  }

  function sampleEmitterOrigin(cfg, rng, centerX, centerY) {
    const width = Math.max(0, Number(cfg && cfg.width) || 0);
    const height = Math.max(0, Number(cfg && cfg.height) || 0);

    return {
      x: width ? centerX + rng.range(-width, width) : centerX,
      y: height ? centerY + rng.range(-height, height) : centerY,
    };
  }

  function serializeParticleConfig(cfg) {
    return {
      emitRate: cfg.emitRate,
      lifetime: cfg.lifetime,
      lifetimeVariation: cfg.lifetimeVariation,
      x: cfg.x,
      y: cfg.y,
      width: cfg.width,
      height: cfg.height,
      xVariation: cfg.xVariation,
      yVariation: cfg.yVariation,
      xVelocity: cfg.xVelocity,
      yVelocity: cfg.yVelocity,
      xVelocityVariation: cfg.xVelocityVariation,
      yVelocityVariation: cfg.yVelocityVariation,
      xAcceleration: cfg.xAcceleration,
      yAcceleration: cfg.yAcceleration,
      xAccelerationVariation: cfg.xAccelerationVariation,
      yAccelerationVariation: cfg.yAccelerationVariation,
      startSize: cfg.startSize,
      endSize: cfg.endSize,
      startSizeVariation: cfg.startSizeVariation,
      endSizeVariation: cfg.endSizeVariation,
      startOpacity: cfg.startOpacity,
      endOpacity: cfg.endOpacity,
      startOpacityVariation: cfg.startOpacityVariation,
      endOpacityVariation: cfg.endOpacityVariation,
      maxActiveParticles: cfg.maxActiveParticles,
      maxActiveParticlesVariation: cfg.maxActiveParticlesVariation,
      totalParticleLimit: cfg.totalParticleLimit,
      running: cfg.running,
      interval: cfg.interval,
      seed: cfg.seed,
    };
  }

  function snapshotToParticleViews(snapshot) {
    const particles = [];

    for (let i = 0; i < snapshot.length; i += 4) {
      particles.push({
        x: snapshot[i],
        y: snapshot[i + 1],
        size: snapshot[i + 2],
        opacity: snapshot[i + 3],
      });
    }

    return particles;
  }

  function createParticleWorkerSource() {
    return `
      var cfg = defaultConfig();
      var particles = [];
      var rng = new SeededRandom(cfg.seed);
      var activeLimit = cfg.maxActiveParticles;
      var createdTotal = 0;
      var emitCarry = 0;
      var timer = 0;
      var lastTime = 0;

      self.onmessage = function(event) {
        var data = event && event.data ? event.data : {};

        if (data.type === "config") {
          var oldSeed = cfg.seed;
          cfg = normalizeConfig(data.config || cfg);
          if (oldSeed !== cfg.seed) {
            rng = new SeededRandom(cfg.seed);
          }
          activeLimit = rollActiveLimit();
          if (cfg.running) {
            startTimer();
          }
          return;
        }

        if (data.type === "start") {
          cfg.running = true;
          startTimer();
          return;
        }

        if (data.type === "stop") {
          cfg.running = false;
          return;
        }

        if (data.type === "clear") {
          particles = [];
          createdTotal = 0;
          emitCarry = 0;
          postSnapshot(false);
          if (!cfg.running) {
            stopTimer();
            self.postMessage({ type: "stopped" });
          }
          return;
        }

        if (data.type === "burst") {
          var created = burst(Number(data.x), Number(data.y), Number(data.count));
          postSnapshot(cfg.running || particles.length > 0);
          if (created > 0 || cfg.running) {
            startTimer();
          }
        }
      };

      function defaultConfig() {
        return {
          emitRate: 10,
          lifetime: 1000,
          lifetimeVariation: 0,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          xVariation: 0,
          yVariation: 0,
          xVelocity: 0,
          yVelocity: 0,
          xVelocityVariation: 0,
          yVelocityVariation: 0,
          xAcceleration: 0,
          yAcceleration: 0,
          xAccelerationVariation: 0,
          yAccelerationVariation: 0,
          startSize: 8,
          endSize: 8,
          startSizeVariation: 0,
          endSizeVariation: 0,
          startOpacity: 1,
          endOpacity: 0,
          startOpacityVariation: 0,
          endOpacityVariation: 0,
          maxActiveParticles: 256,
          maxActiveParticlesVariation: 0,
          totalParticleLimit: 0,
          running: false,
          interval: 16.666,
          seed: 0xc0ffee
        };
      }

      function normalizeConfig(input) {
        var next = defaultConfig();
        var key;

        for (key in input) {
          if (Object.prototype.hasOwnProperty.call(input, key)) {
            next[key] = input[key];
          }
        }

        next.emitRate = finite(next.emitRate, 10);
        next.lifetime = Math.max(1, finite(next.lifetime, 1000));
        next.lifetimeVariation = Math.max(0, finite(next.lifetimeVariation, 0));
        next.x = finite(next.x, 0);
        next.y = finite(next.y, 0);
        next.width = Math.max(0, finite(next.width, 0));
        next.height = Math.max(0, finite(next.height, 0));
        next.xVariation = finite(next.xVariation, 0);
        next.yVariation = finite(next.yVariation, 0);
        next.xVelocity = finite(next.xVelocity, 0);
        next.yVelocity = finite(next.yVelocity, 0);
        next.xVelocityVariation = finite(next.xVelocityVariation, 0);
        next.yVelocityVariation = finite(next.yVelocityVariation, 0);
        next.xAcceleration = finite(next.xAcceleration, 0);
        next.yAcceleration = finite(next.yAcceleration, 0);
        next.xAccelerationVariation = finite(next.xAccelerationVariation, 0);
        next.yAccelerationVariation = finite(next.yAccelerationVariation, 0);
        next.startSize = Math.max(0, finite(next.startSize, 8));
        next.endSize = Math.max(0, finite(next.endSize, 8));
        next.startSizeVariation = Math.max(0, finite(next.startSizeVariation, 0));
        next.endSizeVariation = Math.max(0, finite(next.endSizeVariation, 0));
        next.startOpacity = clamp(finite(next.startOpacity, 1), 0, 1);
        next.endOpacity = clamp(finite(next.endOpacity, 0), 0, 1);
        next.startOpacityVariation = Math.max(0, finite(next.startOpacityVariation, 0));
        next.endOpacityVariation = Math.max(0, finite(next.endOpacityVariation, 0));
        next.maxActiveParticles = Math.max(0, Math.floor(finite(next.maxActiveParticles, 256)));
        next.maxActiveParticlesVariation = Math.max(0, finite(next.maxActiveParticlesVariation, 0));
        next.totalParticleLimit = Math.max(0, Math.floor(finite(next.totalParticleLimit, 0)));
        next.running = Boolean(next.running);
        next.interval = Math.max(1, finite(next.interval, 16.666));
        next.seed = Math.floor(finite(next.seed, 0xc0ffee));

        return next;
      }

      function startTimer() {
        if (timer) {
          return;
        }

        lastTime = now();
        timer = setTimeout(tick, Math.max(1, Math.floor(cfg.interval)));
      }

      function stopTimer() {
        if (!timer) {
          return;
        }

        clearTimeout(timer);
        timer = 0;
      }

      function tick() {
        timer = 0;

        var current = now();
        var elapsedMs = Math.min(Math.max(0, current - lastTime), 100);
        var tickScale = elapsedMs / cfg.interval;

        lastTime = current;

        if (cfg.running) {
          emit(elapsedMs);
        }

        updateParticles(elapsedMs, tickScale);
        postSnapshot(cfg.running || particles.length > 0);

        if (cfg.running || particles.length > 0) {
          timer = setTimeout(tick, Math.max(1, Math.floor(cfg.interval)));
        } else {
          self.postMessage({ type: "stopped" });
        }
      }

      function emit(elapsedMs) {
        if (!canCreateParticle()) {
          return;
        }

        emitCarry += cfg.emitRate * (elapsedMs / 1000);

        while (emitCarry >= 1) {
          if (!createParticle(null)) {
            break;
          }

          emitCarry -= 1;
        }
      }

      function burst(x, y, count) {
        var total = Math.max(0, Math.floor(finite(count, 0)));
        var created = 0;
        var origin = {
          x: finite(x, cfg.x),
          y: finite(y, cfg.y)
        };

        while (created < total && createParticle(origin)) {
          created += 1;
        }

        return created;
      }

      function canCreateParticle() {
        if (cfg.totalParticleLimit > 0 && createdTotal >= cfg.totalParticleLimit) {
          if (cfg.running) {
            cfg.running = false;
            self.postMessage({ type: "limitReached" });
          }
          return false;
        }

        return particles.length < activeLimit;
      }

      function createParticle(origin) {
        if (!canCreateParticle()) {
          return false;
        }

        particles.push(makeParticle(origin));
        createdTotal += 1;
        return true;
      }

      function makeParticle(origin) {
        var hasOrigin = origin && typeof origin === "object";
        var originX = hasOrigin && Number.isFinite(Number(origin.x)) ? Number(origin.x) : cfg.x;
        var originY = hasOrigin && Number.isFinite(Number(origin.y)) ? Number(origin.y) : cfg.y;
        var emitterOrigin = sampleEmitterOrigin(originX, originY);

        return {
          x: vary(emitterOrigin.x, cfg.xVariation),
          y: vary(emitterOrigin.y, cfg.yVariation),
          vx: vary(cfg.xVelocity, cfg.xVelocityVariation),
          vy: vary(cfg.yVelocity, cfg.yVelocityVariation),
          ax: vary(cfg.xAcceleration, cfg.xAccelerationVariation),
          ay: vary(cfg.yAcceleration, cfg.yAccelerationVariation),
          startSize: Math.max(0, vary(cfg.startSize, cfg.startSizeVariation)),
          endSize: Math.max(0, vary(cfg.endSize, cfg.endSizeVariation)),
          startOpacity: clamp(vary(cfg.startOpacity, cfg.startOpacityVariation), 0, 1),
          endOpacity: clamp(vary(cfg.endOpacity, cfg.endOpacityVariation), 0, 1),
          lifetime: vary(cfg.lifetime, cfg.lifetimeVariation),
          age: 0
        };
      }

      function updateParticles(elapsedMs, tickScale) {
        var alive = [];
        var i;
        var particle;

        for (i = 0; i < particles.length; i += 1) {
          particle = particles[i];
          particle.age += elapsedMs;

          if (particle.age >= particle.lifetime) {
            continue;
          }

          particle.vx += particle.ax * tickScale;
          particle.vy += particle.ay * tickScale;
          particle.x += particle.vx * tickScale;
          particle.y += particle.vy * tickScale;
          alive.push(particle);
        }

        particles = alive;
      }

      function postSnapshot(active) {
        var snapshot = new Float32Array(particles.length * 4);
        var i;
        var p;
        var progress;
        var offset;

        for (i = 0; i < particles.length; i += 1) {
          p = particles[i];
          progress = clamp(p.age / p.lifetime, 0, 1);
          offset = i * 4;
          snapshot[offset] = p.x;
          snapshot[offset + 1] = p.y;
          snapshot[offset + 2] = lerp(p.startSize, p.endSize, progress);
          snapshot[offset + 3] = lerp(p.startOpacity, p.endOpacity, progress);
        }

        self.postMessage({
          type: "snapshot",
          buffer: snapshot.buffer,
          active: Boolean(active),
          count: particles.length
        }, [snapshot.buffer]);
      }

      function rollActiveLimit() {
        var varied = cfg.maxActiveParticles + rng.range(
          -cfg.maxActiveParticlesVariation,
          cfg.maxActiveParticlesVariation
        );

        return Math.max(0, Math.floor(varied));
      }

      function sampleEmitterOrigin(centerX, centerY) {
        return {
          x: cfg.width ? centerX + rng.range(-cfg.width, cfg.width) : centerX,
          y: cfg.height ? centerY + rng.range(-cfg.height, cfg.height) : centerY
        };
      }

      function vary(value, variation) {
        if (!variation) {
          return value;
        }

        return value + rng.range(-variation, variation);
      }

      function finite(value, fallback) {
        var parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      }

      function lerp(a, b, t) {
        return a + (b - a) * t;
      }

      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }

      function now() {
        return (self.performance && typeof self.performance.now === "function")
          ? self.performance.now()
          : Date.now();
      }

      function SeededRandom(seed) {
        this.state = seed >>> 0;
      }

      SeededRandom.prototype.next = function next() {
        var t = this.state += 0x6d2b79f5;

        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };

      SeededRandom.prototype.range = function range(min, max) {
        return min + (max - min) * this.next();
      };
    `;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  function installParticleEmitterControls(proto) {
    if (!proto || typeof proto !== "object") {
      return;
    }
    if (typeof proto.start !== "function") {
      proto.start = function startParticleEmitter() {
        this.running = true;
      };
    }
    if (typeof proto.stop !== "function") {
      proto.stop = function stopParticleEmitter() {
        this.running = false;
      };
    }
    if (!Object.getOwnPropertyDescriptor(proto, "running")) {
      Object.defineProperty(proto, "running", {
        configurable: true,
        enumerable: true,
        get() {
          return readBool(this, "running", false);
        },
        set(value) {
          this.setAttribute("running", value ? "true" : "false");
        },
      });
    }
    if (typeof proto.clear !== "function") {
      proto.clear = function clearParticleEmitter() {
        if (Array.isArray(this._particles)) {
          this._particles.length = 0;
        }
        if (this._particleSnapshot) {
          this._particleSnapshot = new Float32Array(0);
        }
        if (typeof this._postWorker === "function") {
          this._postWorker({ type: "clear" });
        }
        if (typeof this._render === "function") {
          this._render();
        }
      };
    }
    if (typeof proto.burst !== "function") {
      proto.burst = function burstParticleEmitter(x, y, num) {
        if (typeof this._burstImmediate === "function") {
          return this._burstImmediate(x, y, num);
        }
        return 0;
      };
    }
  }

  installParticleEmitterControls(ParticleEmitterElement.prototype);
  global.ParticleEmitterElement = ParticleEmitterElement;
  global.customElements.define("particle-emitter", ParticleEmitterElement);
})(typeof globalThis !== "undefined" ? globalThis : window);

(function installQHTMLBrowserObjectAPI(globalScope) {
  "use strict";

    const existingBridge = globalScope.QHTMLBrowserBridge;
    const bridge = existingBridge && Object.isExtensible(existingBridge)
      ? existingBridge
      : Object.assign({}, existingBridge || {});
    const pendingComponentReplacements = new Map();
    let componentFlushScheduled = false;
    let mutationHydrator = null;

    function cssEscape(value) {
      const text = String(value == null ? "" : value);
      if (globalScope.CSS && typeof globalScope.CSS.escape === "function") {
        return globalScope.CSS.escape(text);
      }
      return text.replace(/[^A-Za-z0-9_-]/g, character => `\\${character}`);
    }

    function selectorForUUID(uuid) {
      const escaped = cssEscape(uuid);
      return [
        `[qhtml-node="${escaped}"]`,
        `[component-instance="${escaped}"]`,
        `[domuuid="${escaped}"]`
      ].join(",");
    }

    function resolveTarget(uuid, root) {
      const id = String(uuid || "").trim();
      if (!id) {
        return null;
      }
      const queryRoot = root && typeof root.querySelector === "function" ? root : document;
      return queryRoot.querySelector(selectorForUUID(id));
    }

    function nodesFromHTML(html, ownerDocument) {
      const template = (ownerDocument || document).createElement("template");
      template.innerHTML = String(html || "");
      return Array.from(template.content.childNodes);
    }

    function insertHTMLAt(parent, html, index, beforeUUID) {
      if (!parent) {
        return false;
      }
      const nodes = nodesFromHTML(html, parent.ownerDocument);
      const requestedBefore = resolveTarget(beforeUUID, parent);
      const reference = requestedBefore && requestedBefore.parentNode === parent
      ? requestedBefore
      : Number.isInteger(index) && index >= 0
      ? parent.childNodes.item(index)
      : null;
      for (const node of nodes) {
        parent.insertBefore(node, reference);
      }
      return true;
    }

    function dispatchApplied(command, target) {
      const detail = { command, target: target || null };
      if (typeof mutationHydrator === "function") {
        mutationHydrator(detail);
      }
      document.dispatchEvent(new CustomEvent("QHTMLTreeMutationApplied", { detail }));
      if (globalScope.QHTML7 && typeof globalScope.QHTML7.onTreeMutationApplied === "function") {
        globalScope.QHTML7.onTreeMutationApplied(detail);
      }
    }

    function flushComponentReplacement(componentUUID) {
      const key = String(componentUUID || "").trim();
      if (!key || !pendingComponentReplacements.has(key)) {
        return false;
      }
      const mutation = pendingComponentReplacements.get(key);
      pendingComponentReplacements.delete(key);
      const target = resolveTarget(mutation.targetUUID || mutation.componentUUID);
      if (!target) {
        dispatchApplied(mutation, null);
        return false;
      }
      target.innerHTML = String(mutation.html || "");
      dispatchApplied(mutation, target);
      return true;
    }

    function flushQHTMLMutations() {
      componentFlushScheduled = false;
      let applied = false;
      for (const componentUUID of Array.from(pendingComponentReplacements.keys())) {
        applied = flushComponentReplacement(componentUUID) || applied;
      }
      return applied;
    }

    function scheduleComponentReplacement(mutation) {
      const key = String(mutation.targetUUID || mutation.componentUUID || "").trim();
      if (!key) {
        return false;
      }
      pendingComponentReplacements.set(key, mutation);
      if (!componentFlushScheduled) {
        componentFlushScheduled = true;
        const schedule = typeof globalScope.queueMicrotask === "function"
        ? globalScope.queueMicrotask.bind(globalScope)
        : callback => Promise.resolve().then(callback);
        schedule(flushQHTMLMutations);
      }
      return true;
    }

    function applyQHTMLMutation(command) {
      const mutation = command || {};
      const operation = String(mutation.operation || "");
      let target = null;
      let applied = false;

      if (operation === "component-content-replaced") {
        return scheduleComponentReplacement(mutation);
      }

      if (mutation.componentUUID) {
        flushComponentReplacement(mutation.componentUUID);
      }

      if (operation === "node-content-replaced") {
        target = resolveTarget(mutation.targetUUID);
        if (target) {
          target.innerHTML = String(mutation.html || "");
          applied = true;
        }
      } else if (operation === "node-replaced") {
        target = resolveTarget(mutation.targetUUID);
        if (target) {
          const replacementNodes = nodesFromHTML(mutation.html, target.ownerDocument);
          target.replaceWith(...replacementNodes);
          applied = true;
        }
      } else if (operation === "children-inserted") {
        target = resolveTarget(mutation.parentUUID);
        applied = insertHTMLAt(
          target,
          mutation.html,
          Number(mutation.index),
                               mutation.beforeUUID
        );
      } else if (operation === "children-cleared") {
        target = resolveTarget(mutation.targetUUID || mutation.parentUUID);
        if (target) {
          target.replaceChildren();
          applied = true;
        }
      } else if (operation === "node-removed") {
        target = resolveTarget(mutation.targetUUID);
        if (target) {
          target.remove();
          applied = true;
        }
      } else if (operation === "attribute-set") {
        target = resolveTarget(mutation.targetUUID);
        if (target) {
          target.setAttribute(String(mutation.attributeName || ""), String(mutation.attributeValue || ""));
          applied = true;
        }
      } else if (operation === "tree-only-inserted") {
        applied = true;
      } else if (operation === "attribute-removed") {
        target = resolveTarget(mutation.targetUUID);
        if (target) {
          target.removeAttribute(String(mutation.attributeName || ""));
          applied = true;
        }
      }

      dispatchApplied(mutation, target);
      return applied;
    }

    function setQHTMLMutationHydrator(callback) {
      mutationHydrator = typeof callback === "function" ? callback : null;
      return mutationHydrator;
    }

    function applyQHTMLMutationBatch(commands) {
      let applied = false;
      const mutations = Array.isArray(commands) ? commands : [];
      for (const command of mutations) {
        applied = applyQHTMLMutation(command) || applied;
      }
      return applied;
    }

    Object.assign(bridge, {
      resolveQHTMLTarget: resolveTarget,
      applyQHTMLMutation,
      applyQHTMLMutationBatch,
      flushQHTMLMutations,
      setQHTMLMutationHydrator
    });

    globalScope.QHTMLBrowserBridge = bridge;
})(typeof globalThis !== "undefined" ? globalThis : window);
