(function () {
  "use strict";

  const globalScope = typeof globalThis !== "undefined" ? globalThis : window;
  const ELEMENT_NAME = "q-html";

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

  function executeFunctionBody(domElement, functionNode, args, body, signalContext) {
    const parameters = splitList(typeof functionNode.parameters === "function" ? functionNode.parameters() : "");
    const callable = new Function(...parameters, String(body || ""));
    return callable.apply(domElement, args || []);
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

  function bindSignal(domElement, signalNode) {
    if (!domElement || !signalNode || typeof signalNode.qhtmlName !== "function") {
      return;
    }
    const signalName = signalNode.qhtmlName();
    if (!signalName) {
      return;
    }

    const connections = [];
    const signalFunction = function (...args) {
      const serializedArgs = args.map((arg) => String(arg)).join(", ");
      if (typeof signalNode.emit === "function") {
        signalNode.emit(serializedArgs);
      }
      domElement.dispatchEvent(new CustomEvent("QHTMLSignal", {
        bubbles: true,
        detail: { signal: signalName, signalNode, sender: domElement, args }
      }));
      return connections.map((target) => {
        if (target && typeof target.__qhtmlInvokeFromSignal === "function") {
          return target.__qhtmlInvokeFromSignal(args, { signal: signalNode, sender: domElement });
        }
        return typeof target === "function" ? target.apply(domElement, args) : undefined;
      });
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
    signalFunction.__qhtmlElement = domElement;
    signalFunction.__qhtmlSignalNode = signalNode;

    domElement[signalName] = signalFunction;
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
      const callable = new Function(...parameters, String(body || ""));
      return callable.apply(domElement, args || []);
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
          entry.value = nextValue;
          domElement.dispatchEvent(new CustomEvent(`${propertyName}changed`, {
            bubbles: true,
            detail: { property: propertyName, value: nextValue, qhtmlNode: propertyNode }
          }));
          domElement.dispatchEvent(new CustomEvent("QHTMLPropertyChanged", {
            bubbles: true,
            detail: { property: propertyName, value: nextValue, qhtmlNode: propertyNode }
          }));
        }
      });
      domElement[propertyName] = resolvedValue;
    } catch (error) {
      domElement[propertyName] = resolvedValue;
    }
  }

  function isPaintEventName(eventName) {
    return eventName === "paintbackground" || eventName === "paintborder" || eventName === "paintmask";
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

  function qhtmlNodeName(node) {
    return node && typeof node.qhtmlName === "function" ? node.qhtmlName() : "";
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
      return ["backgroundImage"];
    }
    if (eventName === "paintborder") {
      return ["borderImageSource"];
    }
    if (eventName === "paintmask") {
      return ["maskImage", "webkitMaskImage"];
    }
    return [];
  }

  function bindPaintHandler(domElement, handlerNode) {
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
    properties.forEach((property) => {
      domElement.style.setProperty(`--${property.name}`, qhtmlPaintCssValue(property.entry.value));
      domElement.addEventListener(`${property.name}changed`, (event) => {
        domElement.style.setProperty(`--${property.name}`, qhtmlPaintCssValue(event.detail.value));
      });
    });

    paintTargetForEventName(eventName).forEach((styleName) => {
      domElement.style[styleName] = `paint(${paintName})`;
    });

    if (!globalScope.CSS || !globalScope.CSS.paintWorklet || typeof Blob !== "function") {
      console.warn("CSS Paint Worklet is not available; QHTML paint handler was attached as CSS only.");
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
          ${JSON.stringify(propertyNames)}.forEach((name) => { scope[name] = read(name); });
          return Function(${propertyNames
            .map((name) => JSON.stringify(name))
            .concat(JSON.stringify('const white = "white";\nconst black = "black";\nconst transparent = "transparent";\n' + body))
            .join(", ")})
            .apply(scope, ${JSON.stringify(propertyNames)}.map((name) => scope[name]));
        }
      }
      registerPaint(${JSON.stringify(paintName)}, QHTMLPaintWorklet);
    `;
    const blobUrl = URL.createObjectURL(new Blob([workletSource], { type: "application/javascript" }));
    globalScope.CSS.paintWorklet.addModule(blobUrl).catch((error) => {
      console.error("Unable to register QHTML paint worklet", error);
    });
  }

  function bindPaintHandlers(domElement, instanceNode) {
    if (!domElement || !instanceNode) {
      return;
    }
    const count = typeof instanceNode.childCount === "function" ? instanceNode.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      const child = instanceNode.childAt(index);
      const childType = child && typeof child.qhtmlType === "function" ? child.qhtmlType() : "";
      if (childType === "QHTMLEventHandler" && isPaintEventName(String(child.eventName() || "").toLowerCase())) {
        bindPaintHandler(domElement, child);
      }
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
      stylesByName: new Map(),
      themesByName: new Map(),
      styleTargetsByName: new Map(),
      themeScopesByName: new Map(),
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
    registry.stylesByName.forEach((styleDef, styleName) => {
      registry.styles[styleName] = styleDef;
    });
    registry.themesByName.forEach((themeDef, themeName) => {
      registry.themes[themeName] = themeDef;
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
      bindPaintHandlers(domElement, domElement.qhtmlNode);
    });

    applyStyleAndThemeApplications(rootElement, registry);

    rootElement.qhtmlComponentRegistry = registry;
    rootElement.qhtmlStyles = registry.styles;
    rootElement.qhtmlThemes = registry.themes;
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
