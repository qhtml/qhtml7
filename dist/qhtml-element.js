(function () {
  "use strict";

  const globalScope = typeof globalThis !== "undefined" ? globalThis : window;
  const ELEMENT_NAME = "q-html";
  let activePropertyTransactionId = "";
  let propertyTransactionCounter = 0;

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

  function qhtmlImportCache() {
    if (!globalScope.QHTML7.importCache) {
      globalScope.QHTML7.importCache = new Map();
    }
    return globalScope.QHTML7.importCache;
  }

  function importCacheVersion() {
    return String(globalScope.QHTML7.importVersion || globalScope.QHTML7.version || "1");
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
      const response = await fetch(path, { cache: cacheMode === "nocache" ? "no-store" : "default" });
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

  async function resolveAllImportsBeforeParse(source, basePath) {
    let expandedSource = String(source || "");
    let currentBasePath = basePath || document.baseURI || globalScope.location.href || "";

    for (let pass = 0; pass < 32; pass += 1) {
      const declarations = collectImportDeclarationsFromSource(expandedSource, 0, expandedSource.length, []);
      if (declarations.length === 0) {
        return expandedSource;
      }

      const fetched = await Promise.all(declarations.map(async (declaration) => {
        const resolvedPath = resolveImportPath(declaration.path, currentBasePath);
        const sourceText = await fetchImportSource({
          kind: declaration.kind,
          path: resolvedPath,
          cacheMode: declaration.cacheMode
        });
        return { declaration, source: sourceText };
      }));

      fetched.sort((a, b) => b.declaration.start - a.declaration.start);
      let nextSource = expandedSource;
      fetched.forEach((entry) => {
        nextSource =
          nextSource.slice(0, entry.declaration.start) +
          "\n" + entry.source + "\n" +
          nextSource.slice(entry.declaration.end);
      });

      if (nextSource === expandedSource) {
        return expandedSource;
      }
      expandedSource = nextSource;
      currentBasePath = basePath || document.baseURI || globalScope.location.href || "";
    }

    throw new Error("QHTML q-import/q-require expansion exceeded 32 passes");
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

  function createQHTMLSelectorHelper(domElement, registry) {
    return function qhtmlSelect(selector, callback, rootOverride) {
      const selectorText = String(selector || "").trim();
      if (!selectorText) {
        return selectorText.startsWith("#") ? null : [];
      }
      const root =
        rootOverride ||
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

  function executionContextFor(domElement, registry, parameterNames) {
    const names = [];
    const values = [];
    const used = new Set(parameterNames || []);
    const add = function (name, value) {
      if (!isValidContextIdentifier(name) || used.has(name)) {
        return;
      }
      used.add(name);
      names.push(name);
      values.push(value);
    };
    const sourceRegistry = registry || (domElement && domElement.__qhtmlRegistry);
    if (sourceRegistry) {
      if (sourceRegistry.elementsByName) {
        sourceRegistry.elementsByName.forEach((element, name) => add(name, element));
      }
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
    }
    add("$", createQHTMLSelectorHelper(domElement, sourceRegistry));
    return { names, values };
  }

  function executeScriptBody(domElement, parameters, args, body, registry) {
    const context = executionContextFor(domElement, registry, parameters);
    const callable = new Function(...parameters, ...context.names, String(body || ""));
    return callable.apply(domElement, [...(args || []), ...context.values]);
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

  function resolvePath(path, registry, selfElement) {
    const parts = String(path || "").trim().split(".").filter(Boolean);
    if (parts.length === 0 || !registry) {
      return undefined;
    }

    let value;
    if (parts[0] === "this") {
      value = selfElement;
    } else {
      value = registry.elementsByName.get(parts[0]);
    }
    if (typeof value === "undefined") {
      value = selfElement ? selfElement[parts[0]] : undefined;
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
    if (typeof value === "undefined") {
      value = registry.globals && registry.globals[parts[0]];
    }

    for (let index = 1; index < parts.length; index += 1) {
      if (value == null) {
        return undefined;
      }
      value = value[parts[index]];
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
      domElement.dispatchEvent(new CustomEvent("QHTMLSignal", {
        bubbles: true,
        detail: { signal: signalName, signalNode, sender: domElement, args, transactionId }
      }));
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

  function eventNameForDom(eventName) {
    const normalized = String(eventName || "").toLowerCase();
    if (normalized === "mousepress") {
      return "mousedown";
    }
    return normalized;
  }

  function bindEventHandler(domElement, handlerNode) {
    if (!domElement || !handlerNode || typeof handlerNode.eventName !== "function") {
      return;
    }

    const eventName = String(handlerNode.eventName() || "").toLowerCase();
    if (isPaintEventName(eventName)) {
      return;
    }
    const parameters = splitList(typeof handlerNode.parameters === "function" ? handlerNode.parameters() : "");
    const body = typeof handlerNode.body === "function" ? handlerNode.body() : "";
    const invoke = function (...args) {
      return executeScriptBody(domElement, parameters, args || [], body, domElement.__qhtmlRegistry);
    };
    invoke.__qhtmlElement = domElement;
    invoke.__qhtmlEventHandlerNode = handlerNode;
    invoke.__qhtmlInvokeFromSignal = function (args) {
      return invoke(...(args || []));
    };

    const signal = domElement[eventName];
    if (signal && signal.__qhtmlSignalNode && typeof signal.connect === "function") {
      signal.connect(invoke);
      return;
    }

    domElement.addEventListener(eventNameForDom(eventName), (event) => {
      if (parameters.length === 0) {
        return invoke();
      }
      return invoke(event);
    });
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

  function bindProperty(domElement, propertyNode, registry) {
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
    try {
      Object.defineProperty(domElement, propertyName, {
        configurable: true,
        enumerable: true,
        get() {
          return domElement.__qhtmlProperties[propertyName].value;
        },
        set(nextValue) {
          const entry = domElement.__qhtmlProperties[propertyName];
          const transactionId = currentPropertyTransactionId();
          if (entry.lastTransactionId === transactionId) {
            return;
          }
          entry.lastTransactionId = transactionId;
          entry.value = nextValue;
          withPropertyTransaction(transactionId, () => {
            const signalName = `${propertyName}changed`;
            if (typeof domElement[signalName] === "function") {
              domElement[signalName].__qhtmlPendingTransactionId = transactionId;
              domElement[signalName](nextValue);
            }
            domElement.dispatchEvent(new CustomEvent(`${propertyName}changed`, {
              bubbles: true,
              detail: { property: propertyName, value: nextValue, qhtmlNode: propertyNode, transactionId }
            }));
            domElement.dispatchEvent(new CustomEvent("QHTMLPropertyChanged", {
              bubbles: true,
              detail: { property: propertyName, value: nextValue, qhtmlNode: propertyNode, transactionId }
            }));
          });
        }
      });
    } catch (error) {
      domElement[propertyName] = resolvedValue;
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
    const definitionUuid = domElement.getAttribute && domElement.getAttribute("component-definition");
    if (definitionUuid && registry && registry.futurePropertySignalConnections) {
      const key = `${definitionUuid}::${signalName}`;
      const futureConnections = registry.futurePropertySignalConnections.get(key) || [];
      futureConnections.forEach((target) => domElement[signalName].connect(target));
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

    const body = typeof classNode.body === "function" ? classNode.body() : "";
    const classBody = qhtmlClassBodyForJavaScript(className, body);
    const context = executionContextFor(registry.rootElement, registry, []);
    try {
      const factory = new Function(
        ...context.names,
        `"use strict"; return class ${className} { ${classBody} };`
      );
      const classObject = factory.apply(registry.rootElement, context.values);
      classObject.qhtmlNode = classNode;
      classObject.qhtmlName = className;
      classObject.qhtmlUUID = typeof classNode.qhtmlUUID === "function" ? classNode.qhtmlUUID() : "";
      classObject.qhtmlBody = body;
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

    animationObject.__qhtmlApplyStep = function (value) {
      writeTargetProperty(animationObject.target, animationObject.property, value);
    };
    animationObject.stepped.connect(animationObject.__qhtmlApplyStep);

    animationObject.refresh = function () {
      animationObject.target = animationAssignment(animationNode, "target", ownerElement, registry, ownerElement);
      animationObject.property = animationAssignment(animationNode, "property", ownerElement, registry,
        animationAssignment(animationNode, "propertyName", ownerElement, registry,
          animationAssignment(animationNode, "targetProperty", ownerElement, registry, inferAnimationPropertyName(animationName))));
      animationObject.duration = timerNumber(animationAssignment(animationNode, "duration", ownerElement, registry, 0), 0);
      animationObject.steps = timerNumber(animationAssignment(animationNode, "steps", ownerElement, registry, 60), 60);
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
        animationObject.stepped(value, animationObject.currentStep);
      }
    };

    animationObject.step = function (timestamp) {
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
    };

    animationObject.start = function () {
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
      setTimeout(() => animationObject.start(), 0);
    }
    return animationObject;
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

    const cssText = typeof styleDef.cssText === "function" ? styleDef.cssText() : "";
    cssDeclarations(cssText).forEach((decl) => {
      if (defaultOnly && domElement.style.getPropertyValue(decl.name)) {
        return;
      }
      domElement.style.setProperty(decl.name, decl.value);
    });
    reapplyPaintTargetsForElement(domElement, registry);
  }

  function applyInlineChildStyles(domElement, qhtmlNode, registry) {
    if (!domElement || !qhtmlNode) {
      return;
    }
    const count = typeof qhtmlNode.childCount === "function" ? qhtmlNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLStyle") {
        applyQHTMLStyle(domElement, child, { registry });
      }
    }
  }

  function unwrapApplication(applicationElement) {
    if (!applicationElement || !applicationElement.parentNode) {
      return;
    }
    const parent = applicationElement.parentNode;
    while (applicationElement.firstChild) {
      parent.insertBefore(applicationElement.firstChild, applicationElement);
    }
    parent.removeChild(applicationElement);
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
    cssDeclarations(cssText).forEach((decl) => {
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
      unwrapApplication(applicationElement);
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
    if (eventName === "paintborder" && !domElement.style.getPropertyValue("border-image-slice")) {
      domElement.style.setProperty("border-image-slice", "1", "important");
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

  function bindPaintHandler(domElement, handlerNode, registry) {
    const eventName = String(handlerNode.eventName() || "").toLowerCase();
    if (!isPaintEventName(eventName)) {
      return;
    }
    const properties = paintPropertyEntries(domElement, handlerNode);
    if (!properties) {
      return;
    }

    const handlerUuid = typeof handlerNode.qhtmlUUID === "function" ? handlerNode.qhtmlUUID() : Math.random().toString(36).slice(2);
    const paintName = `qhtml-${eventName}-${handlerUuid}`.replace(/[^A-Za-z0-9_-]/g, "-");
    const body = typeof handlerNode.body === "function" ? handlerNode.body() : "";
    const propertyNames = properties.map((property) => property.name);
    const workletBodyPrefix = [
      'const white = "white";',
      'const black = "black";',
      'const transparent = "transparent";',
      ...propertyNames
        .filter((name) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name))
        .map((name) => `const ${name} = this[${JSON.stringify(name)}];`)
    ].join("\n");
    preparePaintElementBox(domElement, properties);
    properties.forEach((property) => {
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
        detail: { eventName, paintName, qhtmlNode: handlerNode }
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
          const scope = {
            ctx,
            geom,
            clearRect(fill) {
              ctx.clearRect(0, 0, geom.width, geom.height);
              if (fill) {
                ctx.fillStyle = fill;
                ctx.fillRect(0, 0, geom.width, geom.height);
              }
            },
            setFill(value) { ctx.fillStyle = value; },
            drawRect(x, y, width, height) { ctx.fillRect(x, y, width, height); },
            strokeRect(x, y, width, height) { ctx.strokeRect(x, y, width, height); }
          };
          ${JSON.stringify(propertyNames)}.forEach((name) => { scope[name] = typed(read(name)); });
          return Function(${JSON.stringify(workletBodyPrefix + "\n" + body)}).apply(scope);
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
      qhtmlNode: handlerNode,
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
          detail: { eventName, paintName, blobUrl, qhtmlNode: handlerNode }
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
        detail: { eventName, paintName, blobUrl, qhtmlNode: handlerNode }
      }));
    }).catch((error) => {
      paintBinding.error = error;
      console.error("Unable to register QHTML paint worklet", error);
      domElement.dispatchEvent(new CustomEvent("QHTMLPaintWorkletError", {
        bubbles: true,
        detail: { eventName, paintName, blobUrl, qhtmlNode: handlerNode, error }
      }));
    });
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

  function bindRuntimeChildren(domElement, qhtmlNode, registry) {
    if (!domElement || !qhtmlNode) {
      return;
    }

    const count = typeof qhtmlNode.childCount === "function" ? qhtmlNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      const childType = qhtmlNodeType(child);
      if (childType === "QHTMLFunction") {
        bindFunction(domElement, child);
      } else if (childType === "QHTMLSignal") {
        bindSignal(domElement, child);
      }
    }

    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLProperty") {
        bindPropertyChangeSignal(domElement, child, registry);
      }
    }

    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLProperty") {
        bindProperty(domElement, child, registry);
      }
    }

    for (let index = 0; index < count; index += 1) {
      const child = qhtmlNode.childAt(index);
      if (qhtmlNodeType(child) === "QHTMLEventHandler") {
        bindEventHandler(domElement, child);
      }
    }

    applyInlineChildStyles(domElement, qhtmlNode, registry);
  }

  function bindDomElementHandlers(rootElement, registry) {
    if (!rootElement || !registry || !registry.nodesByUuid) {
      return;
    }
    const renderedElements = rootElement.querySelectorAll
      ? rootElement.querySelectorAll("[qhtml-node]")
      : [];
    renderedElements.forEach((domElement) => {
      if (domElement.hasAttribute("component-instance")) {
        return;
      }
      const node = registry.nodesByUuid.get(domElement.getAttribute("qhtml-node"));
      const nodeType = qhtmlNodeType(node);
      if (!node ||
          (nodeType !== "QHTMLDomElement" &&
           nodeType !== "QHTMLLayout" &&
           nodeType !== "QHTMLRowLayout" &&
           nodeType !== "QHTMLColumnLayout")) {
        return;
      }
      domElement.qhtmlNode = node;
      domElement.qhtmlDomTree = registry.tree || null;
      domElement.__qhtmlRegistry = registry;
      registry.elementsByUuid.set(domElement.getAttribute("qhtml-node"), domElement);
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
      const ownerElement = ownerElementForQHTMLNode(node, registry);
      if (ownerElement) {
        bindConnect(ownerElement, node, registry);
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
    return String(html || "").replace(/\$\{\s*([^}]+?)\s*\}/g, (match, expression) => {
      const trimmed = String(expression || "").trim();
      if (trimmed === variableName || trimmed === `this.${variableName}`) {
        return String(value == null ? "" : value);
      }
      return match;
    });
  }

  function addForMetadataToHtml(html, forUuid) {
    if (!forUuid) {
      return html;
    }
    return String(html || "").replace(/<([A-Za-z][A-Za-z0-9_+\-]*)([^>]*)>/g, (match, tagName, rest) => {
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
        bindDomElementHandlers(rootElement, registry);
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

    if (rootElement.querySelectorAll) {
      rootElement.querySelectorAll("[component-instance]").forEach(collect);
      rootElement.querySelectorAll("[qhtml-node]").forEach(collect);
    }

    readyElements.forEach((domElement) => {
      const qhtmlNode = domElement.qhtmlNode || null;
      if (typeof domElement.ready === "function") {
        domElement.ready();
      }
      domElement.dispatchEvent(new CustomEvent("QHTMLNodeReady", {
        bubbles: true,
        detail: { qhtmlNode, qhtmlDom: registry.tree || null }
      }));
    });
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
      futurePropertySignalConnections: new Map(),
      stylesByName: new Map(),
      themesByName: new Map(),
      timersByName: new Map(),
      timersByUuid: new Map(),
      animationsByName: new Map(),
      animationsByUuid: new Map(),
      forLoopsByUuid: new Map(),
      styleTargetsByName: new Map(),
      themeScopesByName: new Map(),
      paintBindingsByElement: new Map(),
      boundConnectNodes: new Set(),
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
    registry.definitions = {};
    registry.qhtmlClasses = {};
    registry.qhtmlClassInstances = {};
    registry.stylesByName.forEach((styleDef, styleName) => {
      registry.styles[styleName] = styleDef;
    });
    registry.themesByName.forEach((themeDef, themeName) => {
      registry.themes[themeName] = themeDef;
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

    bindRuntimeChildren(rootElement, tree, registry);

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
      registry.elementsByUuid.set(instanceUuid, domElement);
      if (typeof instanceNode.qhtmlName === "function" && instanceNode.qhtmlName()) {
        registry.elementsByName.set(instanceNode.qhtmlName(), domElement);
      }
    });

    renderedComponents.forEach((domElement) => {
      const instanceNode = domElement.qhtmlNode;
      if (!instanceNode) {
        return;
      }
      bindRuntimeChildren(domElement, instanceNode, registry);

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

    registerQHTMLClasses(registry);
    instantiateQHTMLClassNodes(registry);
    bindConnectNodes(registry);

    applyStyleAndThemeApplications(rootElement, registry);

    rootElement.qhtmlComponentRegistry = registry;
    rootElement.qhtmlStyles = registry.styles;
    rootElement.qhtmlThemes = registry.themes;
    rootElement.qhtmlTimers = registry.timers;
    rootElement.qhtmlAnimations = registry.animations;
    rootElement.qhtmlComponentDefinitions = registry.definitions;
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

      element.setAttribute("ready", "1");
      element.__qhtml7Mounted = true;
      element.dispatchEvent(new CustomEvent("QHTMLReady", {
        bubbles: true,
        detail: { source: sourceToParse, qhtmlDom: element.qhtmlDomTree }
      }));

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
      return this.qhtmlDomTree;
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
      this.__qhtml7Mounted = false;
      return mountElement(this, { force: true });
    }
  }

  if (!customElements.get(ELEMENT_NAME)) {
    customElements.define(ELEMENT_NAME, QHTMLElement);
  }

  function mountAll(root) {
    const scope = root || document;
    const elements = scope.querySelectorAll ? scope.querySelectorAll(ELEMENT_NAME) : [];
    elements.forEach((element) => mountElement(element));
  }

  globalScope.QHTML7 = Object.assign(globalScope.QHTML7 || {}, {
    QHTMLElement,
    parse(source) {
      return instantiateParserTree(source).tree;
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
