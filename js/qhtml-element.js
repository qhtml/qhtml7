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
      if (sourceRegistry.timersByName) {
        sourceRegistry.timersByName.forEach((timer, name) => add(name, timer));
      }
    }
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

    domElement[signalName] = createDomSignal(domElement, signalName, signalNode);
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

  function parseThemeRules(body) {
    const text = String(body || "");
    const rules = [];
    let cursor = 0;
    while (cursor < text.length) {
      const openIndex = text.indexOf("{", cursor);
      if (openIndex < 0) {
        break;
      }
      const selector = text.slice(cursor, openIndex).trim();
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
            break;
          }
        }
      }
      const styleNames = text.slice(openIndex + 1, index).trim().split(/\s+/).filter(Boolean);
      if (selector && styleNames.length > 0) {
        rules.push({ selector, styleNames });
      }
      cursor = index + 1;
    }
    return rules;
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

      let matches = [];
      try {
        matches = Array.from(scopeElement.querySelectorAll(rule.selector));
      } catch (error) {
        console.error(`Invalid q-theme selector "${rule.selector}"`, error);
        return;
      }
      matches.forEach((element) => {
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
      if (!node || qhtmlNodeType(node) !== "QHTMLDomElement") {
        return;
      }
      domElement.qhtmlNode = node;
      domElement.__qhtmlRegistry = registry;
      const count = typeof node.childCount === "function" ? node.childCount() : 0;
      for (let index = 0; index < count; index += 1) {
        const child = node.childAt(index);
        if (qhtmlNodeType(child) === "QHTMLEventHandler") {
          bindEventHandler(domElement, child);
        }
      }
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
      futurePropertySignalConnections: new Map(),
      stylesByName: new Map(),
      themesByName: new Map(),
      timersByName: new Map(),
      timersByUuid: new Map(),
      styleTargetsByName: new Map(),
      themeScopesByName: new Map(),
      paintBindingsByElement: new Map(),
      rootElement,
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
    registry.definitions = {};
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
    };

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

      const count = typeof instanceNode.childCount === "function" ? instanceNode.childCount() : 0;
      for (let index = 0; index < count; index += 1) {
        const child = instanceNode.childAt(index);
        const childType = child && typeof child.qhtmlType === "function" ? child.qhtmlType() : "";
        if (childType === "QHTMLFunction") {
          bindFunction(domElement, child);
        } else if (childType === "QHTMLSignal") {
          bindSignal(domElement, child);
        }
      }
    });

    renderedComponents.forEach((domElement) => {
      const instanceNode = domElement.qhtmlNode;
      if (!instanceNode) {
        return;
      }

      const count = typeof instanceNode.childCount === "function" ? instanceNode.childCount() : 0;
      for (let index = 0; index < count; index += 1) {
        const child = instanceNode.childAt(index);
        if (qhtmlNodeType(child) === "QHTMLProperty") {
          bindPropertyChangeSignal(domElement, child, registry);
        }
      }
    });

    renderedComponents.forEach((domElement) => {
      const instanceNode = domElement.qhtmlNode;
      if (!instanceNode) {
        return;
      }

      const count = typeof instanceNode.childCount === "function" ? instanceNode.childCount() : 0;
      for (let index = 0; index < count; index += 1) {
        const child = instanceNode.childAt(index);
        const childType = child && typeof child.qhtmlType === "function" ? child.qhtmlType() : "";
        if (childType === "QHTMLEventHandler") {
          bindEventHandler(domElement, child);
        }
      }
    });

    renderedComponents.forEach((domElement) => {
      const instanceNode = domElement.qhtmlNode;
      if (!instanceNode) {
        return;
      }

      const count = typeof instanceNode.childCount === "function" ? instanceNode.childCount() : 0;
      for (let index = 0; index < count; index += 1) {
        const child = instanceNode.childAt(index);
        const childType = child && typeof child.qhtmlType === "function" ? child.qhtmlType() : "";
        if (childType === "QHTMLProperty") {
          bindProperty(domElement, child, registry);
        }
      }

      domElement.dispatchEvent(new CustomEvent("QHTMLComponentReady", {
        bubbles: true,
        detail: { qhtmlNode: instanceNode, qhtmlDom: tree }
      }));
    });

    renderedComponents.forEach((domElement) => {
      bindPaintHandlers(domElement, domElement.qhtmlNode, registry);
    });

    bindDomElementHandlers(rootElement, registry);

    nodesByUuid.forEach((node) => {
      if (qhtmlNodeType(node) !== "QHTMLTimer") {
        return;
      }
      const ownerElement = ownerElementForQHTMLNode(node, registry);
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

    applyStyleAndThemeApplications(rootElement, registry);

    rootElement.qhtmlComponentRegistry = registry;
    rootElement.qhtmlStyles = registry.styles;
    rootElement.qhtmlThemes = registry.themes;
    rootElement.qhtmlTimers = registry.timers;
    rootElement.qhtmlComponentDefinitions = registry.definitions;
  }

  function mountElement(element, options) {
    if (!element || element.__qhtml7Mounting === true) {
      return;
    }
    if (!options || options.force !== true) {
      if (element.__qhtml7Mounted === true && element.qhtmlDomTree) {
        return;
      }
    }

    element.__qhtml7Mounting = true;
    try {
      element.setAttribute("ready", "0");

      if (typeof element.qhtmlSource !== "string" || element.qhtmlSource.length === 0) {
        element.qhtmlSource = element.innerHTML;
      }

      if (element.qhtmlComponentRegistry && typeof element.qhtmlComponentRegistry.stopTimers === "function") {
        element.qhtmlComponentRegistry.stopTimers();
      }

      element.innerHTML = "";
      const parsed = instantiateParserTree(element.qhtmlSource);
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
        detail: { source: element.qhtmlSource, qhtmlDom: element.qhtmlDomTree }
      }));
    } catch (error) {
      element.qhtmlError = error;
      element.setAttribute("ready", "-1");
      element.dispatchEvent(new CustomEvent("QHTMLError", {
        bubbles: true,
        detail: { error }
      }));
      throw error;
    } finally {
      element.__qhtml7Mounting = false;
    }
  }

  class QHTMLElement extends HTMLElement {
    constructor() {
      super();
      this.setAttribute("ready", "0");
      this.qhtmlSource = "";
      this.qhtmlParser = null;
      this.qhtmlDomTree = null;
      this.qhtmlDom = null;
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

    refresh(source) {
      if (typeof source === "string") {
        this.qhtmlSource = source;
      }
      this.__qhtml7Mounted = false;
      mountElement(this, { force: true });
      return this.qhtmlDomTree;
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
