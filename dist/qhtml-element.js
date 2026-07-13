(function () {
  "use strict";

  const globalScope = typeof globalThis !== "undefined" ? globalThis : window;
  const ELEMENT_NAME = "q-html";
  const ELEMENT_NAME_7 = "q-html7";
  const ELEMENT_NAME_6 = "q-html6";
  const ELEMENT_NAME_ERROR = "q-html-error";
  const QHTML_VERSION = "v7.3.6";
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

  function instantiateParserTree(source) {
    const qtModule = globalScope.QHTML7.Module;
    if (typeof qtModule.QHTMLParser !== "function" || typeof qtModule.QHTMLDomTree !== "function") {
      throw new Error("QHTML7 WASM module must export QHTMLParser and QHTMLDomTree");
    }

    const parser = new qtModule.QHTMLParser();
    const tree = new qtModule.QHTMLDomTree();
    tree.loadFromAST(parser.parse(String(source || "")));
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
          response = await fetch(path, { cache: cacheMode === "nocache" ? "no-store" : "default" });
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
      return wrapped.apply(creator || this, args || []);
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

  function indexQHTMLNodes(tree) {
    const byUuid = new Map();
    const root = tree && typeof tree.root === "function" ? tree.root() : tree;
    walkQHTMLNode(root, (node) => {
      if (node && typeof node.qhtmlUUID === "function") {
        byUuid.set(node.qhtmlUUID(), node);
      }
    });
    return byUuid;
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
    return node && typeof node.qhtmlType === "function" ? node.qhtmlType() : "";
  }

  function qhtmlNodeName(node) {
    return node && typeof node.qhtmlName === "function" ? node.qhtmlName() : "";
  }

  function qhtmlNodeKeyword(node) {
    return node && typeof node.keyword === "function" ? node.keyword() : "";
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

  function cssShortcutValue(rawValue, domElement, propertyNode, registry) {
    const stripped = stripMatchingQuotes(String(rawValue || "").trim());
    if (stripped.indexOf("$") >= 0) {
      return stripped.replace(/\$\s*\{([^}]+)\}/g, (match, expression) => {
        const context = executionContextFor(domElement, registry, []);
        const value = new Function(...context.names, `with(this) { return (${decodeQHTMLScriptEntities(expression)}); }`)
          .apply(domElement, context.values);
        return String(value == null ? "" : value);
      });
    }
    return resolvePropertyValue(rawValue, domElement, propertyNode, registry);
  }

  function applyCssShortcutAssignment(domElement, propertyNode, registry) {
    if (!domElement || !propertyNode || !domElement.style) {
      return;
    }
    const rawValue = typeof propertyNode.value === "function" ? propertyNode.value() : "";
    const value = cssShortcutValue(rawValue, domElement, propertyNode, registry);
    domElement.style.setProperty(cssShortcutPropertyName(qhtmlNodeName(propertyNode)), String(value == null ? "" : value));
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
        const node = element && element.qhtmlNode ? element.qhtmlNode : null;
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
    addScopedQHTMLContextBindings(add, domElement, sourceRegistry);

    if (sourceRegistry) {
      if (sourceRegistry.elementsByName) {
        sourceRegistry.elementsByName.forEach((element, name) => add(name, element));
      }
      if (sourceRegistry.workersByName) {
        sourceRegistry.workersByName.forEach((worker, name) => add(name, worker));
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

  function executeScriptBody(domElement, parameters, args, body, registry) {
    const invocation = normalizeScriptInvocation(domElement, registry, parameters, args);
    const context = executionContextFor(domElement, registry, invocation.names);
    try {
      if (shouldUseQHTML6ForLegacySource(body) &&
          reportQHTMLRuntimeError(domElement, new Error("QHTML6 legacy script syntax requested"), registry)) {
        return undefined;
      }
      const callable = new Function(...invocation.names, ...context.names, expandQHTMLInlineScriptExpressions(body));
      return callable.apply(domElement, [...invocation.values, ...context.values]);
    } catch (error) {
      if (reportQHTMLRuntimeError(domElement, error, registry)) {
        return undefined;
      }
      throw error;
    }
  }

  function executeFunctionBody(domElement, functionNode, args, body, signalContext, registry) {
    const parameters = splitList(typeof functionNode.parameters === "function" ? functionNode.parameters() : "");
    return executeScriptBody(domElement, parameters, args || [], body, registry);
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
      return Function(...names, `return (${text});`).apply(domElement, values);
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
    return /(?:^|[^A-Za-z0-9_$])(?:this\s*\.\s*)?qdom\s*\(/.test(text) ||
      /\bthis\s*\.\s*component\s*\./.test(text);
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
        if (element && element.qhtmlNode && typeof element.qhtmlNode.sourceQHTML === "function") {
          return element.qhtmlNode.sourceQHTML();
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
    element.qhtmlNode = null;
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
    const element = document.createElement(ELEMENT_NAME);
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
        if (!target || String(target.tagName || "").trim().toLowerCase() !== ELEMENT_NAME) {
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
        const current = parent && parent.querySelector ? parent.querySelector(`${ELEMENT_NAME}[version="6"]`) : null;
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
      value = registry.elementsByName.get(parts[0]);
    }
    if (typeof value === "undefined" && registry.workersByName) {
      value = registry.workersByName.get(parts[0]);
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
        return callable.apply(owner, []);
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

    const boundFunction = function (...args) {
      const serializedArgs = args.map((arg) => String(arg)).join(", ");
      const body = typeof functionNode.call === "function"
        ? functionNode.call(serializedArgs)
        : (typeof functionNode.body === "function" ? functionNode.body() : "");
      return executeFunctionBody(domElement, functionNode, args, body, null);
    };

    boundFunction.__qhtmlElement = domElement;
    boundFunction.__qhtmlFunctionNode = functionNode;
    boundFunction.__qhtmlFunctionBody = typeof functionNode.body === "function" ? functionNode.body() : "";
    boundFunction.__qhtmlFunctionParameters = splitList(
      typeof functionNode.parameters === "function" ? functionNode.parameters() : ""
    );
    boundFunction.__qhtmlInvokeFromSignal = function (args, signalContext) {
      return executeFunctionBody(
        domElement,
        functionNode,
        args || [],
        boundFunction.__qhtmlFunctionBody,
        signalContext || null
      );
    };

    domElement[functionName] = boundFunction;
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
      if (typeof domElement.dispatchEvent === "function" && typeof CustomEvent === "function") {
        domElement.dispatchEvent(new CustomEvent("QHTMLSignal", {
          bubbles: true,
          detail: { signal: signalName, signalNode, sender: domElement, args, transactionId }
        }));
      }
      const invokeConnections = () => connections.map((target) => {
        if (target && typeof target.__qhtmlInvokeFromSignal === "function") {
          return target.__qhtmlInvokeFromSignal(args, { signal: signalNode, sender: domElement, transactionId });
        }
        return typeof target === "function" ? target.apply(domElement, args) : undefined;
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
    domElement[signalName] = signal;
    const normalizedName = String(signalName).toLowerCase();
    if (normalizedName && normalizedName !== signalName && typeof domElement[normalizedName] !== "function") {
      domElement[normalizedName] = signal;
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
    const parameters = splitList(typeof handlerNode.parameters === "function" ? handlerNode.parameters() : "");
    const body = typeof handlerNode.body === "function" ? handlerNode.body() : "";
    const invoke = function (...args) {
      const invocation = eventHandlerExecution(parameters, args || []);
      return executeScriptBody(domElement, invocation.names, invocation.values, body, domElement.__qhtmlRegistry);
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
      return;
    }

    const existingSignal = domElement[eventName] || domElement[eventSignalName(eventName)];
    if (existingSignal && typeof existingSignal.connect === "function") {
      existingSignal.connect(invoke);
      return;
    }

    const signal = ensureDomEventSignal(domElement, eventName, domElement.__qhtmlRegistry);
    if (signal && typeof signal.connect === "function") {
      signal.connect(invoke);
      return;
    }

    if (isDomElementLike(domElement)) {
      domElement.addEventListener(eventNameForDom(eventName), (event) => invoke(event));
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
          detail: { qhtmlNode: connectNode, sourcePath: declaration.sourcePath, targetPath: declaration.targetPath, source, target }
        }));
        return;
      }

      const connected = source.connect(target);
      domElement.__qhtmlConnections.push({
        qhtmlNode: connectNode,
        sourcePath: declaration.sourcePath,
        targetPath: declaration.targetPath,
        source,
        target,
        connected
      });
      domElement.dispatchEvent(new CustomEvent("QHTMLConnect", {
        bubbles: true,
        detail: { qhtmlNode: connectNode, sourcePath: declaration.sourcePath, targetPath: declaration.targetPath, source, target, connected }
      }));
    });
    if (connectUuid && registry && registry.boundConnectNodes) {
      registry.boundConnectNodes.add(connectUuid);
    }
  }

  function dispatchPropertyChange(domElement, propertyNode, propertyName, nextValue, transactionId) {
    withPropertyTransaction(transactionId, () => {
      const signalName = `${propertyName}changed`;
      if (typeof domElement[signalName] === "function") {
        domElement[signalName].__qhtmlPendingTransactionId = transactionId;
        domElement[signalName](nextValue);
      }
      if (typeof domElement.dispatchEvent === "function" && typeof CustomEvent === "function") {
        domElement.dispatchEvent(new CustomEvent(`${propertyName}changed`, {
          bubbles: true,
          detail: { property: propertyName, value: nextValue, qhtmlNode: propertyNode, transactionId }
        }));
        domElement.dispatchEvent(new CustomEvent("QHTMLPropertyChanged", {
          bubbles: true,
          detail: { property: propertyName, value: nextValue, qhtmlNode: propertyNode, transactionId }
        }));
      }
      refreshRuntimeInterpolations(domElement, domElement.__qhtmlRegistry);
    });
  }

  function behaviorNodeForProperty(domElement, propertyName) {
    const ownerNode = domElement && domElement.qhtmlNode ? domElement.qhtmlNode : null;
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
    if (!animation || !animation.qhtmlNode) {
      return;
    }
    const node = animation.qhtmlNode;
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
    const finish = function () {
      if (animation.finished && typeof animation.finished.disconnect === "function") {
        animation.finished.disconnect(finish);
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
    if (animation.finished && typeof animation.finished.connect === "function") {
      animation.finished.connect(finish);
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
      domElement.__qhtmlProperties = Object.assign(domElement.__qhtmlProperties || {}, {
        [propertyName]: { rawValue, value: resolvedValue, qhtmlNode: propertyNode }
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
      qhtmlNode: definitionNode,
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

  function createLiveWorker(workerNode, registry) {
    const worker = createRuntimeEventTarget();
    const workerName = qhtmlNodeName(workerNode);
    const workerUuid = typeof workerNode.qhtmlUUID === "function" ? workerNode.qhtmlUUID() : "";

    worker.qhtmlNode = workerNode;
    worker.qhtmlDomTree = registry ? registry.tree || null : null;
    worker.__qhtmlRegistry = registry || null;
    worker.__qhtmlWorkerNode = workerNode;
    worker.__qhtmlWorkerName = workerName;
    worker.__qhtmlWorkerUUID = workerUuid;
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
      classObject.qhtmlNode = classNode;
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
        detail: { qhtmlNode: classNode, name: className, classObject }
      }));
      return classObject;
    } catch (error) {
      registry.rootElement.dispatchEvent(new CustomEvent("QHTMLClassError", {
        bubbles: true,
        detail: { qhtmlNode: classNode, name: className, body, error }
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
      instance.qhtmlNode = instanceNode;
      instance.qhtmlName = instanceName;
      instance.qhtmlUUID = instanceUuid;
      instance.qhtmlClass = classObject;
      instance.qhtmlRegistry = registry;
      registry.qhtmlClassInstancesByName.set(instanceName, instance);
      registry.qhtmlClassInstances[instanceName] = instance;
      if (instanceUuid) {
        registry.qhtmlClassInstancesByUuid.set(instanceUuid, instance);
      }
      registry.rootElement.dispatchEvent(new CustomEvent("QHTMLClassInstanceCreated", {
        bubbles: true,
        detail: { qhtmlNode: instanceNode, name: instanceName, className, instance }
      }));
      return instance;
    } catch (error) {
      registry.rootElement.dispatchEvent(new CustomEvent("QHTMLClassError", {
        bubbles: true,
        detail: { qhtmlNode: instanceNode, name: instanceName, className, error }
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
    let current = node && typeof node.parent === "function" ? node.parent() : null;
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
      current = typeof current.parent === "function" ? current.parent() : null;
    }
    return insideDefinition ? null : registry.rootElement;
  }

  function ownerElementsForQHTMLNode(node, registry) {
    let current = node && typeof node.parent === "function" ? node.parent() : null;
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
      current = typeof current.parent === "function" ? current.parent() : null;
    }
    return insideDefinition ? [] : [registry.rootElement];
  }

  function ownerWorkerForQHTMLNode(node, registry) {
    let current = node && typeof node.parent === "function" ? node.parent() : null;
    while (current) {
      if (qhtmlNodeType(current) === "QHTMLWorker") {
        const uuid = typeof current.qhtmlUUID === "function" ? current.qhtmlUUID() : "";
        return uuid && registry.workersByUuid ? registry.workersByUuid.get(uuid) || null : null;
      }
      if (qhtmlNodeType(current) === "QHTMLComponentDefinition") {
        return null;
      }
      current = typeof current.parent === "function" ? current.parent() : null;
    }
    return null;
  }

  function ownerRuntimeObjectForQHTMLNode(node, registry) {
    return ownerWorkerForQHTMLNode(node, registry) || ownerElementForQHTMLNode(node, registry);
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
        if (target && typeof target.__qhtmlInvokeFromSignal === "function") {
          return target.__qhtmlInvokeFromSignal(args, { signal: signalNode, sender: timerObject });
        }
        return typeof target === "function" ? target.apply(ownerElement, args) : undefined;
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
      node: timerNode,
      ownerElement,
      __qhtmlTimerId: null,
      __qhtmlRunning: false,
      __qhtmlInterval: timerNumber(timerAssignmentValue(timerNode, "interval", ownerElement, registry, 0), 0),
      __qhtmlRepeat: timerBool(timerAssignmentValue(timerNode, "repeat", ownerElement, registry, true), true),
      __qhtmlHandlers: timerHandlers(timerNode)
    };

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
        executeScriptBody(ownerElement, parameters, [], body, registry);
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
        detail: { timer: liveTimer, qhtmlNode: timerNode }
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
      liveTimer.start();
    }
    return liveTimer;
  }

  function createObjectSignal(ownerObject, signalNode, signalName) {
    const connections = [];
    const signalFunction = function (...args) {
      if (signalNode && typeof signalNode.emit === "function") {
        signalNode.emit(args.map((arg) => String(arg)).join(", "));
      }
      return connections.map((target) => {
        if (target && typeof target.__qhtmlInvokeFromSignal === "function") {
          return target.__qhtmlInvokeFromSignal(args, { signal: signalNode, sender: ownerObject });
        }
        return typeof target === "function" ? target.apply(ownerObject, args) : undefined;
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

  function createLivePropertyAnimation(animationNode, ownerElement, registry) {
    const animationName = qhtmlNodeName(animationNode);
    const animationObject = {
      qhtmlNode: animationNode,
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
    animationObject.started = createObjectSignal(animationObject, animationSignalNode(animationNode, "started"), "started");
    animationObject.stopped = createObjectSignal(animationObject, animationSignalNode(animationNode, "stopped"), "stopped");
    animationObject.stepped = createObjectSignal(animationObject, animationSignalNode(animationNode, "stepped"), "stepped");
    animationObject.ended = createObjectSignal(animationObject, animationSignalNode(animationNode, "ended"), "ended");
    animationObject.finished = createObjectSignal(animationObject, animationSignalNode(animationNode, "finished"), "finished");

    animationObject.__qhtmlApplyStep = function (stepNum, value) {
      void stepNum;
      writeTargetProperty(animationObject.target, animationObject.property, value);
    };
    animationObject.stepped.connect(animationObject.__qhtmlApplyStep);

    animationObject.refresh = function () {
      animationObject.target = animationAssignment(animationNode, "target", ownerElement, registry, ownerElement);
      animationObject.property = animationAssignment(animationNode, "property", ownerElement, registry,
        animationAssignment(animationNode, "propertyName", ownerElement, registry,
          animationAssignment(animationNode, "targetProperty", ownerElement, registry, inferAnimationPropertyName(animationName))));
      animationObject.duration = timerNumber(animationAssignment(animationNode, "duration", ownerElement, registry, 0), 0);
      animationObject.steps = timerNumber(animationAssignment(animationNode, "steps", ownerElement, registry, 100), 100);
      animationObject.easing = animationAssignment(animationNode, "easing", ownerElement, registry, "linear");
      animationObject.repeat = timerBool(animationAssignment(animationNode, "repeat", ownerElement, registry, false), false);
      animationObject.from = animationAssignment(animationNode, "from", ownerElement, registry,
        animationAssignment(animationNode, "startValue", ownerElement, registry,
          animationAssignment(animationNode, "start", ownerElement, registry, undefined)));
      animationObject.to = animationAssignment(animationNode, "to", ownerElement, registry,
        animationAssignment(animationNode, "endValue", ownerElement, registry,
          animationAssignment(animationNode, "end", ownerElement, registry, undefined)));
      animationObject.__qhtmlInitialRunning = timerBool(animationAssignment(animationNode, "running", ownerElement, registry, false), false);
      return animationObject;
    };

    Object.defineProperty(animationObject, "running", {
      enumerable: true,
      configurable: true,
      get() {
        return animationObject.__qhtmlRunning;
      },
      set(value) {
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
        animationObject.stepped(animationObject.currentStep, value);
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
      setTimeout(() => {
        try {
          animationObject.start();
        } catch (error) {
          if (reportQHTMLRuntimeError(ownerElement, error, registry)) {
            return;
          }
          throw error;
        }
      }, 0);
    }
    return animationObject;
  }

  function createLiveScriptAction(actionNode, ownerElement, registry) {
    const actionName = qhtmlNodeName(actionNode);
    const actionObject = {
      qhtmlNode: actionNode,
      qhtmlName: actionName,
      qhtmlUUID: typeof actionNode.qhtmlUUID === "function" ? actionNode.qhtmlUUID() : "",
      ownerElement,
      component: null,
      __qhtmlRegistry: registry,
      __qhtmlRunning: false
    };
    actionObject.component = actionObject;
    actionObject.started = createObjectSignal(actionObject, animationSignalNode(actionNode, "started"), "started");
    actionObject.finished = createObjectSignal(actionObject, animationSignalNode(actionNode, "finished"), "finished");
    actionObject.run = function () {
      actionObject.__qhtmlRunning = true;
      actionObject.started();
      executeScriptBody(ownerElement, [], [], typeof actionNode.body === "function" ? actionNode.body() : "", registry);
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
      qhtmlNode: groupNode,
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
      setTimeout(() => groupObject.start(), 0);
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
            name: part.slice(0, colon).trim(),
            value: part.slice(colon + 1).trim()
          });
        }
      });
    });
    return declarations.filter((decl) => decl.name && decl.value);
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
          detail: { style: name, qhtmlNode: styleNode }
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
          detail: { theme: name, qhtmlNode: themeNode }
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
    }
    const cssText = cssTextWithoutStylePainters(rawCssText);
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
        matches = Array.from(scopeElement.querySelectorAll(rule.selector));
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

  function applyStyleAndThemeApplications(rootElement, registry) {
    const styleApplications = Array.from(rootElement.querySelectorAll("q-style-application[qhtml-style]"));
    styleApplications.forEach((applicationElement) => {
      const styleDef = registry.stylesByName.get(applicationElement.getAttribute("qhtml-style"));
      if (styleDef) {
        Array.from(applicationElement.querySelectorAll("*")).forEach((element) => {
          if (element.tagName.toLowerCase() !== "q-style-application" &&
              element.tagName.toLowerCase() !== "q-theme-application") {
            applyQHTMLStyle(element, styleDef, { defaultOnly: false, registry });
          }
        });
      }
      unwrapApplication(applicationElement);
    });

    const themeApplications = Array.from(rootElement.querySelectorAll("q-theme-application[qhtml-theme]"));
    themeApplications.forEach((applicationElement) => {
      const themeDef = registry.themesByName.get(applicationElement.getAttribute("qhtml-theme"));
      if (themeDef) {
        applyThemeToScope(applicationElement, themeDef, registry, new Set());
      }
      const liveScope = unwrapApplication(applicationElement);
      if (liveScope && registry.themeScopesByName) {
        const themeName = applicationElement.getAttribute("qhtml-theme");
        if (!registry.themeScopesByName.has(themeName)) {
          registry.themeScopesByName.set(themeName, new Set());
        }
        registry.themeScopesByName.get(themeName).add(liveScope);
      }
    });
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
        qhtmlNode: propertyNode
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
    const paintName = `qhtml-${eventName}-${hint}-${sourceUuid}`.replace(/[^A-Za-z0-9_-]/g, "-");

    domElement.__qhtmlPaintHandlerNodes = domElement.__qhtmlPaintHandlerNodes || new Set();
    const bindingKey = `${eventName}:${paintName}`;
    if (domElement.__qhtmlPaintHandlerNodes.has(bindingKey)) {
      return;
    }
    domElement.__qhtmlPaintHandlerNodes.add(bindingKey);

    const propertyNames = safeProperties.map((property) => property.name);
    const expandedBody = expandPainterInvocations(body, registry, "inline");
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
        detail: { eventName, paintName, qhtmlNode: sourceNode }
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
      qhtmlNode: sourceNode,
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
          detail: { eventName, paintName, blobUrl, qhtmlNode: sourceNode }
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
        detail: { eventName, paintName, blobUrl, qhtmlNode: sourceNode }
      }));
    }).catch((error) => {
      paintBinding.error = error;
      console.error("Unable to register QHTML paint worklet", error);
      domElement.dispatchEvent(new CustomEvent("QHTMLPaintWorkletError", {
        bubbles: true,
        detail: { eventName, paintName, blobUrl, qhtmlNode: sourceNode, error }
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
    return new Function(
      "context",
      "__qhtmlInvokePainter",
      ...contextVars.names,
      `with(this) {\n${expandedBody}\n}`
    ).apply(scope, [context, invokePainter, ...contextVars.values]);
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
      if (typeof node.body === "function") {
        return String(node.body() || "");
      }
      if (typeof node.contents === "function") {
        return String(node.contents() || "");
      }
      if (typeof node.value === "function") {
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
    return executeScriptBody(domElement, [], [], body, registry);
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
    domElement[dataName] = dataObjectForNode(dataNode);
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
        return new Function(...context.names, `return (${source});`).apply(domElement, context.values);
    } catch (error) {
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
      return executeScriptBody(domElement, parameters, args, body, registry);
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
        [propertyName]: { rawValue: text, value, qhtmlNode: null }
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
    return new Function(variableName, ...context.names, `return (${decodeQHTMLScriptEntities(expression)});`)
      .apply(domElement, [variableValue, ...context.values]);
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
    if (!tree || !registry || !registry.nodesByUuid) {
      return;
    }
    indexQHTMLNodes(tree).forEach((node, uuid) => {
      registry.nodesByUuid.set(uuid, node);
    });
  }

  function renderQHTMLSourceForLoop(source, variableName, variableValue, domElement, registry) {
    const parsedSource = interpolateQHTMLSourceForLoop(source, variableName, variableValue, domElement, registry);
    const tree = instantiateParserTree(parsedSource).tree;
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
        html += addForMetadataToHtml(renderQHTMLSourceForLoop(childSource, variableName, value, domElement, registry), forUuid);
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
      .map((value) => renderQHTMLSourceForLoop(body, variableName, value, domElement, registry))
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
    return node && typeof node.qhtmlUUID === "function" ? node.qhtmlUUID() : "";
  }

  function findRenderedElementForNode(rootElement, node) {
    const uuid = qhtmlNodeUuid(node);
    if (!rootElement || !uuid || !rootElement.querySelectorAll) {
      return null;
    }
    const elements = rootElement.querySelectorAll("[qhtml-node]");
    for (const element of elements) {
      if (element.getAttribute("qhtml-node") === uuid) {
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
    if (!rootElement || !registry || !registry.nodesByUuid || rootElement.__qhtmlLegacyMacrosExpanded) {
      return;
    }
    rootElement.__qhtmlLegacyMacrosExpanded = true;
    const macros = new Map();
    registry.nodesByUuid.forEach((node) => {
      const keyword = qhtmlNodeKeyword(node);
      if ((keyword === "q-macro" || keyword === "q-rewrite") && qhtmlNodeName(node)) {
        macros.set(qhtmlNodeName(node), node);
      }
    });
    if (macros.size === 0) {
      return;
    }

    macros.forEach((macroNode) => {
      const count = typeof macroNode.childCount === "function" ? macroNode.childCount() : 0;
      for (let index = 0; index < count; index += 1) {
        const rendered = findRenderedElementForNode(rootElement, macroNode.childAt(index));
        if (rendered) {
          rendered.remove();
        }
      }
    });

    const renderedElements = rootElement.querySelectorAll ? Array.from(rootElement.querySelectorAll("[qhtml-node]")) : [];
    renderedElements.forEach((element) => {
      const node = registry.nodesByUuid.get(element.getAttribute("qhtml-node"));
      const macroNode = node ? macros.get(qhtmlNodeName(node)) : null;
      if (macroNode) {
        renderMacroInvocation(element, node, macroNode, registry);
      }
    });
  }

  function bindDynamicComponentInstances(rootElement, registry) {
    if (!rootElement || !registry || !registry.nodesByUuid || !rootElement.querySelectorAll) {
      return;
    }
    const renderedComponents = rootElement.matches && rootElement.matches("[component-instance]")
      ? [rootElement].concat(Array.from(rootElement.querySelectorAll("[component-instance]")))
      : Array.from(rootElement.querySelectorAll("[component-instance]"));
    renderedComponents.forEach((domElement) => {
      if (domElement.qhtmlNode && domElement.__qhtmlRegistry === registry) {
        return;
      }
      const instanceUuid = domElement.getAttribute("component-instance");
      const instanceNode = registry.nodesByUuid.get(instanceUuid);
      if (!instanceNode) {
        return;
      }
      domElement.qhtmlNode = instanceNode;
      domElement.qhtmlDomTree = registry.tree || null;
      domElement.__qhtmlRegistry = registry;
      bindComponentFacade(domElement, registry);
      registry.elementsByUuid.set(instanceUuid, domElement);
      if (typeof instanceNode.qhtmlName === "function" && instanceNode.qhtmlName()) {
        const instanceName = instanceNode.qhtmlName();
        registry.elementsByName.set(instanceName, domElement);
        const parentComponent = domElement.parentElement && domElement.parentElement.closest
          ? domElement.parentElement.closest("[component-instance]")
          : null;
        if (parentComponent) {
          parentComponent[instanceName] = domElement;
        }
      }
      bindComponentDefinitionDeclarations(domElement, instanceNode, registry);
      bindDeclarativeAssignmentAttributes(domElement, instanceNode, registry);
      bindRuntimeChildren(domElement, instanceNode, registry);
      bindComponentInstancePropertyAssignments(domElement, instanceNode, registry);
      bindPaintHandlers(domElement, instanceNode, registry);
    });
  }

  function refreshRuntimeInterpolations(domElement, registry) {
    const sourceRegistry = registry || (domElement && domElement.__qhtmlRegistry) || null;
    if (!domElement || !sourceRegistry) {
      return;
    }
    const refreshOne = (element) => {
      if (element && element.qhtmlNode) {
        applyRuntimeTextFragments(element, element.qhtmlNode, sourceRegistry, false);
      }
    };
    refreshOne(domElement);
    if (domElement.querySelectorAll) {
      domElement.querySelectorAll("[qhtml-node]").forEach(refreshOne);
    }
  }

  function isGeneratedForElement(domElement) {
    return Boolean(domElement && domElement.closest && domElement.closest("[qhtml-for-node]"));
  }

  function updateRuntimeElement(domElement, registry) {
    const sourceRegistry = registry || (domElement && domElement.__qhtmlRegistry) || null;
    const qhtmlNode = domElement && domElement.qhtmlNode ? domElement.qhtmlNode : null;
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
      domElement.querySelectorAll("[qhtml-node]").forEach((childElement) => {
        if (childElement !== domElement) {
          updateRuntimeElement(childElement, sourceRegistry);
        }
      });
    }
    return domElement;
  }

  function bindComponentContextForwarders(domElement, componentElement) {
    if (!domElement || !componentElement || domElement === componentElement) {
      return;
    }
    const names = new Set();
    Object.keys(componentElement.__qhtmlProperties || {}).forEach((name) => names.add(name));
    Object.keys(componentElement).forEach((name) => {
      if (name.startsWith("__qhtml")) {
        return;
      }
      const value = componentElement[name];
      if (typeof value === "function" || (value && value.nodeType === 1)) {
        names.add(name);
      }
    });
    names.forEach((name) => {
      if (!isValidContextIdentifier(name) || Object.prototype.hasOwnProperty.call(domElement, name)) {
        return;
      }
      try {
        Object.defineProperty(domElement, name, {
          configurable: true,
          enumerable: false,
          get() {
            return componentElement[name];
          },
          set(value) {
            componentElement[name] = value;
          }
        });
      } catch (error) {
        return;
      }
    });
  }

  function bindComponentFacade(domElement, registry) {
    const componentElement = domElement && domElement.closest
      ? domElement.closest("[component-instance]")
      : null;
    domElement.component = componentElement || domElement || (registry && registry.rootElement) || null;
    bindComponentContextForwarders(domElement, componentElement);
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

    const count = typeof qhtmlNode.childCount === "function" ? qhtmlNode.childCount() : 0;
    bindRuntimeOnlyDeclarations(domElement, qhtmlNode, registry);
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
        } else {
          bindEventHandler(domElement, child);
        }
      }
    }

    applyInlineChildStyles(domElement, qhtmlNode, registry);
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
    expandLegacyMacros(rootElement, registry);
    const renderedElements = rootElement.querySelectorAll
      ? rootElement.querySelectorAll("[qhtml-node]")
      : [];
    renderedElements.forEach((domElement) => {
      if (domElement !== rootElement && (!domElement.isConnected || !rootElement.contains(domElement))) {
        return;
      }
      if (domElement.hasAttribute("component-instance")) {
        return;
      }
      const node = registry.nodesByUuid.get(domElement.getAttribute("qhtml-node"));
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
      domElement.qhtmlNode = node;
      domElement.qhtmlDomTree = registry.tree || null;
      domElement.__qhtmlRegistry = registry;
      bindComponentFacade(domElement, registry);
      registry.elementsByUuid.set(domElement.getAttribute("qhtml-node"), domElement);
      if (nodeType !== "QHTMLDomElement" && qhtmlNodeName(node)) {
        registry.elementsByName.set(qhtmlNodeName(node), domElement);
      }
      bindDeclarativeAssignmentAttributes(domElement, node, registry);
      bindRuntimeChildren(domElement, node, registry);
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
      executeScriptBody(ownerObject, [], [], body, registry);
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
      rootElement.querySelectorAll("[qhtml-node]").forEach(collect);
    }

    readyElements.forEach((domElement) => {
      const qhtmlNode = domElement.qhtmlNode || null;
      domElement.dispatchEvent(new CustomEvent("ready", {
        bubbles: false,
        detail: { qhtmlNode, qhtmlDom: registry.tree || null }
      }));
      if (typeof domElement.ready === "function") {
        domElement.ready();
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
            detail: { qhtmlNode: worker.qhtmlNode || null, qhtmlDom: registry.tree || null }
          }));
        }
      });
    }
  }

  function bindComponentDomRuntime(rootElement, tree) {
    if (!rootElement || !tree) {
      return;
    }

    const nodesByUuid = indexQHTMLNodes(tree);
    const registry = {
      nodesByUuid,
      elementsByName: new Map(),
      elementsByUuid: new Map(),
      componentDefinitionsByName: new Map(),
      componentDefinitionsByUuid: new Map(),
      qhtmlClassesByName: new Map(),
      qhtmlClassesByUuid: new Map(),
      qhtmlClassInstancesByName: new Map(),
      qhtmlClassInstancesByUuid: new Map(),
      workersByName: new Map(),
      workersByUuid: new Map(),
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
      paintBindingsByElement: new Map(),
      boundConnectNodes: new Set(),
      boundScriptNodes: new Set(),
      rootElement,
      tree,
      globals: globalScope
    };
    nodesByUuid.forEach((node) => {
      const nodeType = node && typeof node.qhtmlType === "function" ? node.qhtmlType() : "";
      const nodeName = node && typeof node.qhtmlName === "function" ? node.qhtmlName() : "";
      if (nodeType === "QHTMLStyle" && nodeName) {
        registry.stylesByName.set(nodeName, createLiveStyle(node, registry));
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
    registry.themes = {};
    registry.timers = {};
    registry.animations = {};
    registry.painters = {};
    registry.definitions = {};
    registry.workers = {};
    registry.qhtmlClasses = {};
    registry.qhtmlClassInstances = {};
    registry.stylesByName.forEach((styleDef, styleName) => {
      registry.styles[styleName] = styleDef;
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
    rootElement.qhtmlNode = tree;
    rootElement.qhtmlDomTree = tree;
    rootElement.__qhtmlRegistry = registry;
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

      domElement.qhtmlNode = instanceNode;
      domElement.qhtmlDomTree = tree;
      domElement.__qhtmlRegistry = registry;
      bindComponentFacade(domElement, registry);
      registry.elementsByUuid.set(instanceUuid, domElement);
      if (typeof instanceNode.qhtmlName === "function" && instanceNode.qhtmlName()) {
        const instanceName = instanceNode.qhtmlName();
        registry.elementsByName.set(instanceName, domElement);
        const parentComponent = domElement.parentElement && domElement.parentElement.closest
          ? domElement.parentElement.closest("[component-instance]")
          : null;
        if (parentComponent) {
          parentComponent[instanceName] = domElement;
        }
      }
    });

    renderedComponents.forEach((domElement) => {
      const instanceNode = domElement.qhtmlNode;
      if (!instanceNode) {
        return;
      }
      bindComponentDefinitionDeclarations(domElement, instanceNode, registry);
      bindDeclarativeAssignmentAttributes(domElement, instanceNode, registry);
      bindRuntimeChildren(domElement, instanceNode, registry);
      bindComponentInstancePropertyAssignments(domElement, instanceNode, registry);

      domElement.dispatchEvent(new CustomEvent("QHTMLComponentReady", {
        bubbles: true,
        detail: { qhtmlNode: instanceNode, qhtmlDom: tree }
      }));
    });

    renderedComponents.forEach((domElement) => {
      bindPaintHandlers(domElement, domElement.qhtmlNode, registry);
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
        const timerName = qhtmlNodeName(node);
        const timerUuid = typeof node.qhtmlUUID === "function" ? node.qhtmlUUID() : "";
        const timerObject = createLiveTimer(node, ownerElement, registry);
        if (timerName) {
          ownerElement[timerName] = timerObject;
          registry.timersByName.set(timerName, timerObject);
          registry.timers[timerName] = timerObject;
        }
        if (timerUuid) {
          registry.timersByUuid.set(timerUuid, timerObject);
        }
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
        const animationName = qhtmlNodeName(node);
        const animationUuid = typeof node.qhtmlUUID === "function" ? node.qhtmlUUID() : "";
        const animationObject = createLivePropertyAnimation(node, ownerElement, registry);
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
    bindConnectNodes(registry);
    bindScriptNodes(registry);

    applyStyleAndThemeApplications(rootElement, registry);

    rootElement.qhtmlComponentRegistry = registry;
    rootElement.qhtmlStyles = registry.styles;
    rootElement.qhtmlThemes = registry.themes;
    rootElement.qhtmlTimers = registry.timers;
    rootElement.qhtmlAnimations = registry.animations;
    rootElement.qhtmlPainters = registry.painters;
    rootElement.qhtmlComponentDefinitions = registry.definitions;
    rootElement.qhtmlWorkers = registry.workers;
    rootElement.qhtmlClasses = registry.qhtmlClasses;
    rootElement.qhtmlClassInstances = registry.qhtmlClassInstances;

    emitReadySignals(rootElement, registry);
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

  if (!customElements.get(ELEMENT_NAME)) {
    customElements.define(ELEMENT_NAME, QHTMLFacilitatorElement);
  }
  if (!customElements.get(ELEMENT_NAME_7)) {
    customElements.define(ELEMENT_NAME_7, QHTMLElement);
  }

  function mountAll(root) {
    const scope = root || document;
    const elements = scope.querySelectorAll ? scope.querySelectorAll(ELEMENT_NAME_7) : [];
    elements.forEach((element) => mountElement(element));
  }

  globalScope.QHTML7 = Object.assign(globalScope.QHTML7 || {}, {
    QHTML_VERSION,
    QHTML_QUICKJS_ENABLED: Boolean(globalScope.QHTML7.Module && globalScope.QHTML7.Module.QHTML_QUICKJS_ENABLED),
    QHTML_QUICKJS_SIZE_BUDGET_BYTES: globalScope.QHTML7.Module && globalScope.QHTML7.Module.QHTML_QUICKJS_SIZE_BUDGET_BYTES,
    QHTMLElement,
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => mountAll(document), { once: true });
  } else {
    mountAll(document);
  }
})();
