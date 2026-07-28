(function (globalScope) {
  const QHTML_VERSION = "7.4.2";
  globalScope.QHTML_VERSION = QHTML_VERSION;
})(typeof globalThis !== "undefined" ? globalThis : window);

/* ---- js/qhtml.js ---- */



(function () {
  "use strict";
try {
  const globalScope = typeof globalThis !== "undefined" ? globalThis : window;
  const currentScript = document.currentScript;
  if (!currentScript || !currentScript.src) {
    console.log("qhtml.js must be loaded from a script URL");
  }

  const base = new URL(".", currentScript.src).href;
  const QHTML_VERSION = String(globalScope.QHTML_VERSION || "7.4.0");
  const QHTML_LOADING_INDICATOR_ATTRIBUTE = "data-qhtml-loading-indicator";

  function qhtmlVersionQuery() {
    const value = String(QHTML_VERSION || "").trim();
    return value ? "v" + value.replace(/^v/i, "") : "";
  }

  function versionedUrl(src) {
    const text = String(src || "");
    const version = qhtmlVersionQuery();
    if (!version || text.includes("?" + version) || text.includes("&" + version)) {
      return text;
    }
    const hashIndex = text.indexOf("#");
    const beforeHash = hashIndex >= 0 ? text.slice(0, hashIndex) : text;
    const hash = hashIndex >= 0 ? text.slice(hashIndex) : "";
    return beforeHash + (beforeHash.includes("?") ? "&" : "?") + version + hash;
  }

  const qhtml6Url = versionedUrl(new URL("qhtml6/qhtml.js", base).href);
  const qhtml7ScriptUrls = [
    "qhtml_types.js",
    "qhtml_parser.js",
    "qhtml-graphics-scene.js",
    "qhtml-element.js"
  ].map((path) => versionedUrl(new URL(path, base).href));
  let qhtml6Promise = null;
  let qhtml7Promise = null;

  globalScope.QHTML_ENTRYPOINT_EXECUTED = true;
  globalScope.QHTML_JS_ENTRYPOINT_EXECUTED = true;
  globalScope.QHTML_SCRIPT_BASE = base;
  globalScope.QHTML7_SCRIPT_BASE = base;
  globalScope.QHTML6_SCRIPT_URL = globalScope.QHTML6_SCRIPT_URL || qhtml6Url;

  function ensureQHTMLLoadingStyle() {
    if (document.querySelector("style[data-qhtml-loading-style]") || !document.head) {
      return;
    }
    const style = document.createElement("style");
    style.setAttribute("data-qhtml-loading-style", "1");
    style.textContent = [
      "@keyframes qhtml-loading-spin{to{transform:rotate(360deg)}}",
      "[data-qhtml-loading-indicator]{display:inline-grid;place-items:center;min-width:48px;min-height:48px;margin:8px;color:#2563eb}",
      "[data-qhtml-loading-indicator] svg{display:block;animation:qhtml-loading-spin 840ms linear infinite;filter:drop-shadow(0 8px 18px rgba(37,99,235,0.20))}",
      "@media (prefers-reduced-motion: reduce){[data-qhtml-loading-indicator] svg{animation:none!important}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function createQHTMLLoadingIndicator() {
    const indicator = document.createElement("span");
    indicator.setAttribute(QHTML_LOADING_INDICATOR_ATTRIBUTE, "1");
    indicator.setAttribute("aria-live", "polite");
    indicator.setAttribute("aria-label", "Loading QHTML");
    indicator.innerHTML = [
      '<svg viewBox="0 0 50 50" width="34" height="34" role="img" aria-hidden="true">',
      '<circle cx="25" cy="25" r="20" fill="none" stroke="rgba(15, 23, 42, 0.14)" stroke-width="5"></circle>',
      '<path d="M45 25a20 20 0 0 1-20 20" fill="none" stroke="#2563eb" stroke-linecap="round" stroke-width="5"></path>',
      '</svg>'
    ].join("");
    return indicator;
  }

  function insertQHTMLLoadingIndicators() {
    ensureQHTMLLoadingStyle();
    document.querySelectorAll("q-html,q-html7,q-html6").forEach((item) => {
      const previous = item.previousElementSibling;
      if (previous && previous.hasAttribute(QHTML_LOADING_INDICATOR_ATTRIBUTE)) {
        return;
      }
      if (item.parentNode) {
        item.parentNode.insertBefore(createQHTMLLoadingIndicator(), item);
      }
    });
  }

  function removeQHTMLLoadingIndicators() {
    document.querySelectorAll(`[${QHTML_LOADING_INDICATOR_ATTRIBUTE}]`).forEach((indicator) => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    });
    const style = document.querySelector("style[data-qhtml-loading-style]");
    if (style && style.parentNode) {
      style.parentNode.removeChild(style);
    }
  }

  document.addEventListener("QHTMLContentLoaded", removeQHTMLLoadingIndicators);

  (function hideUnprocessedQHTMLHosts() {
    const hidden = new WeakSet();
    const hideHosts = function () {
      insertQHTMLLoadingIndicators();
      document.querySelectorAll("q-html,q-html7,q-html6").forEach((item) => {
        hidden.add(item);
        item.style.display = "none";
      });
    };
    if (document.readyState === "loading" && !document.body) {
      document.addEventListener("DOMContentLoaded", hideHosts, { once: true });
    } else {
      hideHosts();
    }
    document.addEventListener("QHTMLContentLoaded", function restoreQHTMLHosts() {
      document.querySelectorAll("q-html,q-html7,q-html6").forEach((item) => {
        if (hidden.has(item)) {
          item.style.removeProperty("display");
        }
      });
    });
  })();

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts || []).find((script) => script.src === src);
      if (existing && existing.__qhtmlLoadComplete === true) {
        resolve(existing);
        return;
      }
      if (existing && existing.__qhtmlLoadPromise) {
        existing.__qhtmlLoadPromise.then(() => resolve(existing), reject);
        return;
      }

      const script = existing || document.createElement("script");
      script.async = false;
      script.__qhtmlLoadPromise = new Promise((innerResolve, innerReject) => {
        script.onload = function onQHTMLScriptLoaded() {
          script.__qhtmlLoadComplete = true;
          innerResolve(script);
        };
        script.onerror = function onQHTMLScriptError() {
          innerReject(console.log("Failed to load " + src));
        };
      });
      script.__qhtmlLoadPromise.then(resolve, reject);
      if (!existing) {
        script.src = src;
        document.head.appendChild(script);
      }
    });
  }

  function loadQHTML6() {
    if (!qhtml6Promise) {
      qhtml6Promise = loadScript(versionedUrl(globalScope.QHTML6_SCRIPT_URL || qhtml6Url));
    }
    return qhtml6Promise;
  }

  function loadQHTML7() {
    if (!qhtml7Promise) {
      qhtml7Promise = (async () => {
        globalScope.QHTML7 = Object.assign(globalScope.QHTML7 || {}, {
          runtime: "native-js",
          nativeRuntime: true,
          QHTML_VERSION,
          qhtmlVersion: QHTML_VERSION,
          version: QHTML_VERSION
        });
        for (const url of qhtml7ScriptUrls) {
          const path = new URL(url, base).pathname.split("/").pop();
          if (path === "qhtml_types.js" && globalScope.QHTMLTypes) {
            continue;
          }
          if (path === "qhtml_parser.js" && globalScope.QHTMLParser) {
            continue;
          }
          if (path === "qhtml-graphics-scene.js" && globalScope.customElements.get("graphics-scene")) {
            continue;
          }
          if (path === "qhtml-element.js" && globalScope.customElements.get("q-html7")) {
            continue;
          }
          await loadScript(url);
        }
        return globalScope.QHTML7;
      })();
    }
    return qhtml7Promise;
  }

  function routeAll() {
    const needsQHTML6 = document.querySelector("q-html6") !== null;
    const needsQHTML7 = document.querySelector("q-html,q-html7") !== null;

    const loads = [];
    if (needsQHTML6) {
      loads.push(loadQHTML6());
    }
    if (needsQHTML7) {
      loads.push(loadQHTML7());
    }

    return Promise.all(loads);
  }

  const start = () => {
    const hasQHTMLHosts = document.querySelector("q-html,q-html7,q-html6") !== null;
    insertQHTMLLoadingIndicators();
    globalScope.QHTMLReady = routeAll();
    if (!hasQHTMLHosts && globalScope.QHTMLReady && typeof globalScope.QHTMLReady.finally === "function") {
      globalScope.QHTMLReady.finally(removeQHTMLLoadingIndicators);
    }
  };

  const scheduleStart = () => globalScope.setTimeout(start, 0);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleStart, { once: true });
  } else {
    scheduleStart();
  }
} catch (err) { console.log("QHTML Error:",err);}
})();


/* ---- js/qhtml_types.js ---- */
(function qhtmlTypesModule(globalScope) {
  "use strict";

  const QHTML_VERSION_FALLBACK = "7.4.0";

  const CSS_SHORTCUTS = new Map(Object.entries({
    alignContent: "align-content",
    alignItems: "align-items",
    alignSelf: "align-self",
    aspectRatio: "aspect-ratio",
    background: "background",
    backgroundColor: "background-color",
    backgroundImage: "background-image",
    backgroundPosition: "background-position",
    backgroundRepeat: "background-repeat",
    backgroundSize: "background-size",
    borderColor: "border-color",
    borderRadius: "border-radius",
    borderStyle: "border-style",
    borderWidth: "border-width",
    bottom: "bottom",
    boxShadow: "box-shadow",
    boxSizing: "box-sizing",
    color: "color",
    columnGap: "column-gap",
    cursor: "cursor",
    display: "display",
    filter: "filter",
    flex: "flex",
    flexBasis: "flex-basis",
    flexDirection: "flex-direction",
    flexGrow: "flex-grow",
    flexShrink: "flex-shrink",
    flexWrap: "flex-wrap",
    fontFamily: "font-family",
    fontSize: "font-size",
    fontStyle: "font-style",
    fontWeight: "font-weight",
    gap: "gap",
    gridArea: "grid-area",
    gridColumn: "grid-column",
    gridRow: "grid-row",
    height: "height",
    justifyContent: "justify-content",
    justifyItems: "justify-items",
    justifySelf: "justify-self",
    left: "left",
    letterSpacing: "letter-spacing",
    lineHeight: "line-height",
    listStyle: "list-style",
    listStyleType: "list-style-type",
    margin: "margin",
    marginBottom: "margin-bottom",
    marginLeft: "margin-left",
    marginRight: "margin-right",
    marginTop: "margin-top",
    maxHeight: "max-height",
    maxWidth: "max-width",
    minHeight: "min-height",
    minWidth: "min-width",
    objectFit: "object-fit",
    objectPosition: "object-position",
    opacity: "opacity",
    order: "order",
    overflow: "overflow",
    overflowX: "overflow-x",
    overflowY: "overflow-y",
    padding: "padding",
    paddingBottom: "padding-bottom",
    paddingLeft: "padding-left",
    paddingRight: "padding-right",
    paddingTop: "padding-top",
    pointerEvents: "pointer-events",
    position: "position",
    right: "right",
    rowGap: "row-gap",
    textAlign: "text-align",
    textDecoration: "text-decoration",
    textOverflow: "text-overflow",
    textTransform: "text-transform",
    top: "top",
    transform: "transform",
    transformOrigin: "transform-origin",
    transition: "transition",
    visibility: "visibility",
    whiteSpace: "white-space",
    width: "width",
    wordBreak: "word-break",
    x: "left",
    y: "top",
    zIndex: "z-index"
  }));

  function qhtmlVersionString() {
    return globalScope.QHTML_VERSION || QHTML_VERSION_FALLBACK;
  }

  function createUUID() {
    if (globalScope.crypto && typeof globalScope.crypto.randomUUID === "function") {
      return globalScope.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function replaceUuid(ch) {
      const n = Math.random() * 16 | 0;
      const value = ch === "x" ? n : (n & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  function trim(value) {
    return String(value == null ? "" : value).trim();
  }

  function qhtmlCssShortcutPropertyName(name) {
    const key = trim(name);
    if (CSS_SHORTCUTS.has(key)) {
      return CSS_SHORTCUTS.get(key);
    }
    const lower = key.toLowerCase();
    for (const [shortcut, cssName] of CSS_SHORTCUTS) {
      if (shortcut.toLowerCase() === lower || cssName.toLowerCase() === lower) {
        return cssName;
      }
    }
    return "";
  }

  function qhtmlIsCssShortcutProperty(name) {
    return qhtmlCssShortcutPropertyName(name) !== "";
  }

  function qhtmlScalarValue(value) {
    const source = trim(value);
    if (source.length >= 2) {
      const first = source[0];
      const last = source[source.length - 1];
      if ((first === "\"" && last === "\"") || (first === "'" && last === "'") || (first === "`" && last === "`")) {
        return source.slice(1, -1);
      }
    }
    return source;
  }

  function qhtmlSourceQuote(value) {
    return "\"" + String(value == null ? "" : value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + "\"";
  }

  function qhtmlEscapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function qhtmlEscapeAttribute(value) {
    return qhtmlEscapeText(value).replace(/"/g, "&quot;");
  }

  function qhtmlSourceIndent(indentLevel) {
    return " ".repeat(Math.max(0, indentLevel | 0) * 2);
  }

  function qhtmlSourceBlock(header, body, indentLevel) {
    const pad = qhtmlSourceIndent(indentLevel);
    const trimmedBody = trim(body);
    if (trimmedBody === "") {
      return pad + header + " { }";
    }
    return pad + header + " {\n" +
      trimmedBody.split("\n").map(line => qhtmlSourceIndent(indentLevel + 1) + line).join("\n") +
      "\n" + pad + "}";
  }

  function qhtmlScriptBody(value) {
    return String(value == null ? "" : value).replace(/<\/script/gi, "<\\/script");
  }

  function valueToSource(value) {
    if (value === undefined) {
      return "undefined";
    }
    if (value === null) {
      return "null";
    }
    if (typeof value === "string") {
      return qhtmlSourceQuote(value);
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (value instanceof QHTMLReference) {
      return value.qhtmlName() || qhtmlSourceQuote(value.qhtmlUUID());
    }
    return JSON.stringify(value);
  }

  function parseSourceValue(value) {
    const source = trim(value);
    if (source === "true") {
      return true;
    }
    if (source === "false") {
      return false;
    }
    if (source === "null") {
      return null;
    }
    if (/^-?(?:\d+|\d*\.\d+)(?:e[+-]?\d+)?$/i.test(source)) {
      return Number(source);
    }
    if ((source.startsWith("\"") && source.endsWith("\"")) ||
        (source.startsWith("'") && source.endsWith("'")) ||
        (source.startsWith("`") && source.endsWith("`"))) {
      return qhtmlScalarValue(source);
    }
    if ((source.startsWith("[") && source.endsWith("]")) || (source.startsWith("{") && source.endsWith("}"))) {
      return JSON.parse(source);
    }
    return source;
  }

  function parseParameters(value) {
    return trim(value).split(",").map(part => part.trim()).filter(Boolean);
  }

  function childArray(node) {
    const out = [];
    if (node instanceof QHTMLFunction && node.body().trim() !== "") {
      out.push({
        qhtmlType: "QHTMLJavaScriptBlock",
        qhtmlName: "script",
        qhtmlContents: base64EncodeUtf8(node.body()),
        body: base64EncodeUtf8(node.body()),
        qhtmlContentsEncoding: "base64",
        bodyEncoding: "base64"
      });
    }
    for (const child of node.children()) {
      out.push(child.toJSON());
    }
    return out;
  }

  function bodyJsonFields(body) {
    const encoded = base64EncodeUtf8(body || "");
    return {
      qhtmlContents: encoded,
      body: encoded,
      qhtmlContentsEncoding: "base64",
      bodyEncoding: "base64"
    };
  }

  function base64EncodeUtf8(value) {
    const text = String(value == null ? "" : value);
    if (typeof Buffer !== "undefined") {
      return Buffer.from(text, "utf8").toString("base64");
    }
    return btoa(unescape(encodeURIComponent(text)));
  }

  function base64DecodeUtf8(value) {
    const text = String(value == null ? "" : value);
    if (typeof Buffer !== "undefined") {
      return Buffer.from(text, "base64").toString("utf8");
    }
    return decodeURIComponent(escape(atob(text)));
  }

  function firstString(object, keys, fallback = "") {
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(object, key)) {
        continue;
      }
      const value = object[key];
      if (value === undefined) {
        continue;
      }
      if (typeof value === "string") {
        return value;
      }
      if (value === null) {
        return "null";
      }
      if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
      }
      return JSON.stringify(value);
    }
    return fallback;
  }

  function hashFromObject(object) {
    return Object.assign({}, object || {});
  }

  function qhtmlComponentThisFor(contextNode) {
    let current = contextNode || null;
    while (current) {
      if (current instanceof QHTMLComponentInstance) {
        return current;
      }
      current = current.parent();
    }
    return contextNode || null;
  }

  function qhtmlResolveExpressionValue(expression, contextNode, resolving = new Set(), depth = 0) {
    const source = trim(expression);
    if (source === "") {
      return "";
    }
    if (depth > 64 || resolving.has(source)) {
      return source;
    }
    resolving.add(source);

    if (source === "this") {
      resolving.delete(source);
      return qhtmlComponentThisFor(contextNode);
    }
    if (source === "parent" || source === "this.parent") {
      resolving.delete(source);
      const selfNode = qhtmlComponentThisFor(contextNode);
      return selfNode ? selfNode.parent() : null;
    }

    const parts = source.split(".").filter(Boolean);
    let current = null;
    if (parts[0] === "this") {
      current = qhtmlComponentThisFor(contextNode);
      parts.shift();
    } else if (contextNode) {
      current = contextNode.qhtmlResolve(parts[0]);
      if (!current && contextNode.qhtmlName() === parts[0]) {
        current = contextNode;
      }
      parts.shift();
    }

    function unwrapExpressionValue(value) {
      if (value instanceof QHTMLKeyword) {
        const raw = value.value();
        try {
          return parseSourceValue(raw);
        } catch (error) {
          return raw;
        }
      }
      if (value instanceof QHTMLProperty) {
        if (value.value() === "q-array") return value.valueArray();
        if (value.value() === "q-map") return value.valueObject();
        return qhtmlResolvePropertyValue(value.value(), value.parent() || contextNode, resolving, depth + 1);
      }
      if (value instanceof QHTMLPropertyAssignment) {
        return qhtmlResolvePropertyValue(value.value(), value.parent() || contextNode, resolving, depth + 1);
      }
      return value;
    }

    current = unwrapExpressionValue(current);
    for (const part of parts) {
      current = unwrapExpressionValue(current);
      if (current instanceof QHTMLNode) {
        if (part === "parent" || part === "parent()") {
          current = current.parent();
        } else {
          current = current.qhtmlResolve(part) || current.findChildByName(part);
        }
      } else if (current && typeof current === "object") {
        current = current[part];
      } else {
        current = null;
      }
    }

    let out = unwrapExpressionValue(current);
    resolving.delete(source);
    return out == null ? "" : out;
  }

  function qhtmlResolvePropertyValue(rawValue, contextNode, resolving = new Set(), depth = 0) {
    const value = trim(rawValue);
    if (value === "") {
      return "";
    }
    if (value.includes("${")) {
      return qhtmlInterpolateTextForContext(value, contextNode);
    }
    if ((value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith("`") && value.endsWith("`"))) {
      return qhtmlScalarValue(value);
    }
    if ((value.startsWith("[") && value.endsWith("]")) || (value.startsWith("{") && value.endsWith("}"))) {
      return parseSourceValue(value);
    }
    const resolved = qhtmlResolveExpressionValue(value, contextNode, resolving, depth + 1);
    if (resolved instanceof QHTMLReference) {
      return resolved.qhtmlName() || resolved.qhtmlUUID();
    }
    return resolved === "" ? qhtmlScalarValue(value) : String(resolved);
  }

  function qhtmlResolveCssValueForContext(value, contextNode) {
    return qhtmlResolvePropertyValue(value, contextNode);
  }

  function qhtmlInterpolateTextForContext(value, contextNode) {
    return String(value == null ? "" : value).replace(/\$\{([^}]+)\}/g, function interpolate(_, expression) {
      const resolved = qhtmlResolveExpressionValue(expression, contextNode);
      if (resolved instanceof QHTMLReference) {
        return resolved.qhtmlName() || resolved.qhtmlUUID();
      }
      return String(resolved == null ? "" : resolved);
    });
  }

  function childAssignmentValue(node, name) {
    const wanted = trim(name).toLowerCase();
    for (const child of node.children()) {
      if (child instanceof QHTMLPropertyAssignment && child.qhtmlName().toLowerCase() === wanted) {
        return qhtmlScalarValue(child.value());
      }
      if (child instanceof QHTMLProperty && child.qhtmlName().toLowerCase() === wanted) {
        return qhtmlScalarValue(child.value());
      }
      if (child.qhtmlName && child.qhtmlName().toLowerCase() === wanted && child.childCount && child.childCount() > 0) {
        return trim(child.children().map(grandchild => {
          if (grandchild instanceof QHTMLTextFragment || grandchild instanceof QHTMLHTMLFragment || grandchild instanceof QHTMLUnknownFragment) {
            return grandchild.value();
          }
          if (grandchild.value) {
            return grandchild.value();
          }
          return grandchild.sourceQHTML ? grandchild.sourceQHTML(0) : "";
        }).join(" "));
      }
    }
    return "";
  }

  class QHTMLHash {
    constructor(values) {
      this._map = new Map();
      if (values instanceof Map) {
        for (const [key, value] of values) {
          this.insert(key, value);
        }
      } else if (values && typeof values === "object") {
        for (const key of Object.keys(values)) {
          this.insert(key, values[key]);
        }
      }
    }

    insert(key, value) { this._map.set(String(key), value); }
    value(key, fallback = undefined) { return this._map.has(String(key)) ? this._map.get(String(key)) : fallback; }
    contains(key) { return this._map.has(String(key)); }
    remove(key) { return this._map.delete(String(key)); }
    take(key) { const value = this.value(key); this.remove(key); return value; }
    keys() { return Array.from(this._map.keys()); }
    values() { return Array.from(this._map.values()); }
    clear() { this._map.clear(); }
    size() { return this._map.size; }
    toObject() { return Object.fromEntries(this._map); }
  }

  class QHTMLString {
    constructor(value = "") {
      this.value = String(value == null ? "" : value);
    }

    trimmed() { return this.value.trim(); }
    isEmpty() { return this.value.length === 0; }
    toStdString() { return this.value; }
    toString() { return this.value; }
  }

  class QHTMLReference {
    constructor(type = "QHTMLReference", name = "", uuid = "") {
      this._qhtmlType = type;
      this._qhtmlName = name || "";
      this._qhtmlUUID = uuid || createUUID();
    }

    qhtmlType() { return this._qhtmlType; }
    qhtmlTypeJs() { return this.qhtmlType(); }
    qhtmlUUID() { return this._qhtmlUUID; }
    qhtmlUUIDJs() { return this.qhtmlUUID(); }
    setQHTMLUUID(uuid) { this._qhtmlUUID = String(uuid || ""); }
    setQHTMLUUIDJs(uuid) { this.setQHTMLUUID(uuid); }
    qhtmlName() { return this._qhtmlName; }
    qhtmlNameJs() { return this.qhtmlName(); }
    setQHTMLName(name) { this._qhtmlName = String(name || ""); }
    setQHTMLNameJs(name) { this.setQHTMLName(name); }
    setQHTMLType(type) { this._qhtmlType = String(type || "QHTMLReference"); }
    clone() { return new QHTMLReference(this.qhtmlType(), this.qhtmlName(), this.qhtmlUUID()); }
    static createUUID() { return createUUID(); }
  }

  class QHTMLKeyword extends QHTMLReference {
    constructor(name = "", value = "") {
      super("QHTMLKeyword", name);
      this._value = String(value == null ? "" : value);
    }

    value() { return this._value; }
    valueJs() { return this.value(); }
    setValue(value) { this._value = String(value == null ? "" : value); }
    setValueJs(value) { this.setValue(value); }
    clone() { return new QHTMLKeyword(this.qhtmlName(), this.value()); }
  }

  class QHTMLNamedReference extends QHTMLReference {
    constructor(name = "", targetUUID = "") {
      super("QHTMLNamedReference", name);
      this._targetUUID = String(targetUUID || "");
    }

    targetUUID() { return this._targetUUID; }
    targetUUIDJs() { return this.targetUUID(); }
    setTargetUUID(uuid) { this._targetUUID = String(uuid || ""); }
    setTargetUUIDJs(uuid) { this.setTargetUUID(uuid); }
    clone() { return new QHTMLNamedReference(this.qhtmlName(), this.targetUUID()); }
  }

  class QHTMLObjectReference extends QHTMLReference {
    constructor(name = "", target = null) {
      super("QHTMLObjectReference", name, target ? target.qhtmlUUID() : "");
      this._target = target;
    }

    target() { return this._target; }
    clone() { return new QHTMLObjectReference(this.qhtmlName(), this.target()); }
  }

  class QHTMLContext {
    constructor(parentContext = null) {
      this._parentContext = parentContext;
      this._references = new Map();
      this._contextProperties = new Map();
    }

    setParentContext(parentContext) { this._parentContext = parentContext; }
    parentContext() { return this._parentContext; }
    clear() {
      this._references.clear();
      this._contextProperties.clear();
    }
    clearReferences() { this._references.clear(); }
    clearContextProperties() { this._contextProperties.clear(); }
    setReference(key, reference) {
      const name = trim(key);
      if (!name) {
        return false;
      }
      this._references.set(name, reference);
      return true;
    }
    setContextProperty(key, value) {
      const name = trim(key);
      if (!name) {
        throw new TypeError("QHTML context property names must not be empty");
      }
      this._contextProperties.set(name, value);
      return value;
    }
    contextProperty(key, fallback = undefined) {
      const name = trim(key);
      return this._contextProperties.has(name) ? this._contextProperties.get(name) : fallback;
    }
    hasContextProperty(key) { return this._contextProperties.has(trim(key)); }
    removeContextProperty(key) { return this._contextProperties.delete(trim(key)); }
    contextPropertyKeys() { return Array.from(this._contextProperties.keys()); }
    updateKeywordReference(name, value) { this.setReference(name, new QHTMLKeyword(name, value)); }
    updateNamedReference(name, uuid) { this.setReference(name, new QHTMLNamedReference(name, uuid)); }
    updateObjectReference(name, target) { this.setReference(name, new QHTMLObjectReference(name, target)); }
    resolve(key) {
      const name = trim(key);
      if (this._contextProperties.has(name)) {
        return this._contextProperties.get(name);
      }
      if (this._references.has(name)) {
        const reference = this._references.get(name);
        return reference instanceof QHTMLObjectReference ? reference.target() : reference;
      }
      return this._parentContext ? this._parentContext.resolve(name) : null;
    }
    containsLocalReference(key) { return this._references.has(trim(key)); }
    containsLocalContextProperty(key) { return this.hasContextProperty(key); }
    resolveTypeJs(key) {
      const value = this.resolve(key);
      if (value == null) {
        return "";
      }
      if (typeof value.qhtmlType === "function") {
        return value.qhtmlType();
      }
      if (typeof value === "object" && value.constructor && value.constructor.name) {
        return value.constructor.name;
      }
      return typeof value;
    }
    keys() {
      const out = this.contextPropertyKeys();
      for (const key of this._references.keys()) {
        if (!out.includes(key)) {
          out.push(key);
        }
      }
      return out;
    }
    visibleKeys() {
      const out = this.keys();
      if (this._parentContext) {
        for (const key of this._parentContext.visibleKeys()) {
          if (!out.includes(key)) {
            out.push(key);
          }
        }
      }
      return out;
    }
    size() { return this.keys().length; }
  }

  class QHTMLNode extends QHTMLReference {
    constructor(type = "QHTMLNode", name = "") {
      super(type, name);
      this.qhtmlParent = null;
      this.qhtmlChildren = [];
      this.qhtmlProperties = new Map();
      this.qhtmlReferences = new Map();
      this._qhtmlReferenceNames = new Map();
      this.qhtmlContext = new QHTMLContext();
      this.qhtmlLogger = null;
    }

    parent() { return this.qhtmlParent; }
    parentJs() { return this.parent(); }
    rootNode() {
      let current = this;
      while (current && current.parent()) {
        current = current.parent();
      }
      return current || this;
    }
    rootNodeJs() { return this.rootNode(); }
    childCount() { return this.qhtmlChildren.length; }
    childAt(index) { return this.qhtmlChildren[index] || null; }
    children() { return this.qhtmlChildren.slice(); }
    childList() { return this.children(); }
    childListJs() { return this.childList(); }
    ownedReferenceMembers() { return []; }
    findChildByName(name) { return this.children().find(child => child.qhtmlName() === name) || null; }
    collectChildrenByType(typeName, out) {
      for (const child of this.children()) {
        if (child.qhtmlType() === typeName) {
          out.push(child);
        }
        child.collectChildrenByType(typeName, out);
      }
    }
    findChildrenByType(typeName) {
      const out = [];
      this.collectChildrenByType(String(typeName), out);
      return out;
    }
    findChildrenByTypeJs(typeName) { return this.findChildrenByType(typeName); }
    findDescendantByUUID(uuid) {
      const wanted = trim(uuid);
      for (const child of this.children().concat(this.ownedReferenceMembers())) {
        if (child.qhtmlUUID() === wanted) {
          return child;
        }
        const found = child.findDescendantByUUID(wanted);
        if (found) {
          return found;
        }
      }
      return null;
    }
    findByUUID(uuid) {
      return this.qhtmlUUID() === trim(uuid) ? this : this.findDescendantByUUID(uuid);
    }
    containsDescendantUUID(uuid) { return this.findDescendantByUUID(uuid) !== null; }
    appendChild(child) {
      child.qhtmlParent = this;
      child.qhtmlContext.setParentContext(this.qhtmlContext);
      this.qhtmlChildren.push(child);
      this.adoptLoggerFromChild(child);
      if (this.qhtmlLogger) {
        qhtmlBindLoggerToNode(this.qhtmlLogger, child);
      }
      if (child.qhtmlName()) {
        this.updateObjectReference(child.qhtmlName(), child);
        this.addQHTMLReference(child.qhtmlName(), child);
      }
      return child;
    }
    appendChildJs(child) { return this.appendChild(child); }
    insertChild(index, child) {
      child.qhtmlParent = this;
      child.qhtmlContext.setParentContext(this.qhtmlContext);
      this.qhtmlChildren.splice(Math.max(0, Math.min(index, this.qhtmlChildren.length)), 0, child);
      this.adoptLoggerFromChild(child);
      if (this.qhtmlLogger) {
        qhtmlBindLoggerToNode(this.qhtmlLogger, child);
      }
      if (child.qhtmlName()) {
        this.updateObjectReference(child.qhtmlName(), child);
        this.addQHTMLReference(child.qhtmlName(), child);
      }
      return child;
    }
    insertChildJs(index, child) { return this.insertChild(index, child); }
    takeChildAt(index) {
      const child = this.qhtmlChildren.splice(index, 1)[0] || null;
      if (child) {
        child.qhtmlParent = null;
        child.qhtmlContext.setParentContext(null);
      }
      return child;
    }
    removeChildAt(index) { return this.takeChildAt(index) !== null; }
    removeChildAtJs(index) { return this.removeChildAt(index); }
    clearChildren() {
      for (const child of this.qhtmlChildren) {
        child.qhtmlParent = null;
        child.qhtmlContext.setParentContext(null);
      }
      this.qhtmlChildren = [];
    }
    clearChildrenJs() { this.clearChildren(); }
    setProperty(key, value) {
      const name = trim(key);
      this.qhtmlProperties.set(name, String(value == null ? "" : value));
    }
    property(key) { return this.qhtmlProperties.get(trim(key)) || ""; }
    propertyJs(key) { return this.property(key); }
    setPropertyValue(key, value) {
      const name = trim(key);
      let target = null;
      for (const child of this.children()) {
        if (child.qhtmlName() === name && (child instanceof QHTMLProperty || child instanceof QHTMLPropertyAssignment)) {
          target = child;
          break;
        }
      }
      if (!target) {
        const reference = this.resolve(name);
        if (reference instanceof QHTMLProperty || reference instanceof QHTMLPropertyAssignment) {
          target = reference;
        }
      }
      if (target) {
        target.setValue(String(value == null ? "" : value));
        this.updateObjectReference(name, target);
        this.setProperty(name, value);
        return true;
      }
      const assignment = new QHTMLPropertyAssignment(name, { value: String(value == null ? "" : value) });
      this.appendChild(assignment);
      this.updateObjectReference(name, assignment);
      this.setProperty(name, value);
      return true;
    }
    setPropertyTextJs(key, value) { return this.setPropertyValue(key, value); }
    setPropertyText(key, value) { return this.setPropertyValue(key, value); }
    setPropertyJs(key, value) { return this.setPropertyValue(key, valueToSource(value)); }
    logger() { return this.qhtmlLogger || (this.qhtmlParent ? this.qhtmlParent.logger() : null); }
    loggerJs() { return this.logger(); }
    setLogger(logger) {
      this.qhtmlLogger = logger;
      if (logger) {
        this.setProperty("logger", logger.qhtmlUUID());
        qhtmlBindLoggerToNode(logger, this);
      } else {
        this.qhtmlProperties.delete("logger");
      }
    }
    setLoggerJs(logger) { this.setLogger(logger); }
    adoptLoggerFromChild(child) {
      if (child instanceof QHTMLLogger) {
        this.setLogger(child);
      }
    }
    loggerCategory() {
      const type = this.qhtmlType();
      if (type === "QHTMLSignal") return "QHTMLSignal";
      if (type === "QHTMLProperty") return "QHTMLProperty";
      if (type === "QHTMLComponentDefinition" || type === "QHTMLComponentInstance") return "QHTMLComponent";
      if (type === "QHTMLComponentSlot" || type === "QHTMLSlot" || type === "QHTMLSlotDefault" || type === "QHTMLComponentInstanceSlot") return "QHTMLSlot";
      return type;
    }
    maybeLog(message) {
      const logger = this.logger();
      return logger ? logger.log(message, this.loggerCategory()) : false;
    }
    maybeLogJs(message) { return this.maybeLog(message); }
    updateKeywordReference(name, value) { this.qhtmlContext.updateKeywordReference(name, value); }
    updateKeywordReferenceJs(name, value) { this.updateKeywordReference(name, value); }
    updateNamedReference(name, uuid) { this.qhtmlContext.updateNamedReference(name, uuid); }
    updateNamedReferenceJs(name, uuid) { this.updateNamedReference(name, uuid); }
    updateObjectReference(name, target) { this.qhtmlContext.updateObjectReference(name, target); }
    setContextProperty(name, value) { return this.qhtmlContext.setContextProperty(name, value); }
    setContextPropertyJs(name, value) { return this.setContextProperty(name, value); }
    contextProperty(name, fallback = undefined) { return this.qhtmlContext.contextProperty(name, fallback); }
    contextPropertyJs(name, fallback = undefined) { return this.contextProperty(name, fallback); }
    hasContextProperty(name) { return this.qhtmlContext.hasContextProperty(name); }
    hasContextPropertyJs(name) { return this.hasContextProperty(name); }
    removeContextProperty(name) { return this.qhtmlContext.removeContextProperty(name); }
    removeContextPropertyJs(name) { return this.removeContextProperty(name); }
    addQHTMLReference(visibleName, reference) {
      const ref = reference === undefined ? visibleName : reference;
      const name = reference === undefined && visibleName ? visibleName.qhtmlName() : trim(visibleName);
      this.qhtmlReferences.set(ref.qhtmlUUID(), ref);
      if (name) {
        this._qhtmlReferenceNames.set(name, ref.qhtmlUUID());
      }
      return true;
    }
    removeQHTMLReference(uuid) {
      const normalized = trim(uuid);
      const removed = this.qhtmlReferences.delete(normalized);
      for (const [name, id] of Array.from(this._qhtmlReferenceNames)) {
        if (id === normalized) {
          this._qhtmlReferenceNames.delete(name);
        }
      }
      return removed;
    }
    clearQHTMLReferences() {
      this._qhtmlReferenceNames.clear();
      this.qhtmlReferences.clear();
    }
    hasQHTMLReferenceUUID(uuid) { return this.qhtmlReferences.has(trim(uuid)); }
    hasQHTMLReferenceName(name) { return this._qhtmlReferenceNames.has(trim(name)); }
    qhtmlHasReference(nameOrUUID) {
      const key = trim(nameOrUUID);
      return this._qhtmlReferenceNames.has(key) || this.qhtmlReferences.has(key);
    }
    qhtmlReferenceByUUID(uuid) { return this.qhtmlReferences.get(trim(uuid)) || null; }
    qhtmlReferenceByName(name) {
      const uuid = this._qhtmlReferenceNames.get(trim(name));
      return uuid ? this.qhtmlReferenceByUUID(uuid) : null;
    }
    qhtmlReferenceUUIDs() { return Array.from(this.qhtmlReferences.keys()).sort(); }
    qhtmlReferenceNames() { return this.qhtmlReferenceNamesList(); }
    qhtmlReferenceNamesList() { return Array.from(this._qhtmlReferenceNames.keys()).sort(); }
    qhtmlResolve(nameOrUUID) {
      const key = trim(nameOrUUID);
      if (key === "this") {
        return qhtmlComponentThisFor(this);
      }
      if (key === "parent" || key === "this.parent") {
        const selfNode = qhtmlComponentThisFor(this);
        return selfNode ? selfNode.parent() : null;
      }
      return this.qhtmlReferenceByName(key) || this.qhtmlReferenceByUUID(key) || this.resolve(key);
    }
    resolve(key) {
      const name = trim(key);
      if (name === "this") {
        return qhtmlComponentThisFor(this);
      }
      if (name === "parent" || name === "this.parent") {
        const selfNode = qhtmlComponentThisFor(this);
        return selfNode ? selfNode.parent() : null;
      }
      return this.qhtmlContext ? this.qhtmlContext.resolve(name) : null;
    }
    resolveJs(key) { return this.resolve(key); }
    resolveTypeJs(key) { return this.qhtmlContext ? this.qhtmlContext.resolveTypeJs(key) : ""; }
    contextKeys() { return this.qhtmlContext ? this.qhtmlContext.visibleKeys() : []; }
    contextKeysJs() { return this.contextKeys(); }
    runtime() { for (const child of this.children()) child.runtime(); }
    render() {
      const root = this.rootNode();
      if (root && typeof root.prepareRender === "function") {
        root.prepareRender();
      }
      if (root && typeof root.renderHandler === "function") {
        const handler = root.renderHandler();
        if (typeof handler === "function") {
          return handler(this);
        }
      }
      return this.renderHtmlInContext(this);
    }
    renderJs() { return this.render(); }
    renderHtml() { return this.children().map(child => child.renderHtml()).join(""); }
    renderHtmlInContext(contextNode) { return this.renderHtml(); }
    renderHtmlJs() { return this.renderHtml(); }
    sourceQHTML(indentLevel = 0) { return this.children().map(child => child.sourceQHTML(indentLevel)).join("\n"); }
    sourceQHTMLJs() { return this.sourceQHTML(); }
    toQHTML(indentLevel = 0) { return this.sourceQHTML(indentLevel); }
    toQHTMLJs() { return this.toQHTML(); }
    fromQHTML(source) {
      this.clearChildren();
      this.clearQHTMLReferences();
      return this.appendQHTMLSource(source);
    }
    fromQHTMLJs(source) { return this.fromQHTML(source); }
    toHTML() { return this.renderHtml(); }
    toHTMLJs() { return this.toHTML(); }
    toJSON() { return this.toJsonObject(); }
    toJSONJs() { return this.toJSON(); }
    toJSONText() { return JSON.stringify(this.toJSON()); }
    toJSONTextJs() { return this.toJSONText(); }
    toJsonObject() {
      return {
        qhtmlType: this.qhtmlType(),
        qhtmlName: this.qhtmlName(),
        qhtmlUUID: this.qhtmlUUID(),
        qhtmlProperties: Object.fromEntries(this.qhtmlProperties),
        qhtmlChildren: childArray(this)
      };
    }
    toJsonValue() { return this.toJsonObject(); }
    fromJSON(value) { return this.fromJsonObject(value); }
    fromJSONJs(value) { return this.fromJSON(value); }
    fromJSONText(json) { return this.fromJSON(JSON.parse(json)); }
    fromJSONTextJs(json) { return this.fromJSONText(json); }
    fromJsonValue(value) { return this.fromJsonObject(value); }
    fromJsonObject(object) {
      this.clearChildren();
      this.clearQHTMLReferences();
      if (object.qhtmlUUID) {
        this.setQHTMLUUID(object.qhtmlUUID);
      }
      if (object.qhtmlName !== undefined) {
        this.setQHTMLName(object.qhtmlName);
      }
      this.qhtmlProperties = new Map(Object.entries(object.qhtmlProperties || object.properties || {}));
      for (const childObject of object.qhtmlChildren || []) {
        this.appendChild(QHTMLNode.nodeFromJsonObject(childObject, this));
      }
      return true;
    }
    evaluateExpression(expression) { return String(qhtmlResolveExpressionValue(expression, this)); }
    evaluateExpressionJs(expression) { return this.evaluateExpression(expression); }
    appendQHTMLSource(source) { return this.insertQHTMLSource(this.childCount(), source); }
    appendQHTMLSourceJs(source) { return this.appendQHTMLSource(source); }
    insertQHTMLSource(index, source) {
      const Parser = globalScope.QHTMLParser || (globalScope.QHTMLTypes && globalScope.QHTMLTypes.QHTMLParser);
      if (typeof Parser !== "function") {
        console.log("QHTMLParser is not loaded; include js/qhtml_parser.js before calling insertQHTMLSource().");
      }
      const parser = new Parser();
      const parsedTree = parser.parseTree(String(source || ""), this);
      let inserted = 0;
      const boundedIndex = Math.max(0, Math.min(Number(index) || 0, this.childCount()));
      while (parsedTree.childCount() > 0) {
        this.insertChild(boundedIndex + inserted, parsedTree.takeChildAt(0));
        inserted += 1;
      }
      const root = this.rootNode();
      if (root && typeof root.rebuildQHTMLReferences === "function") {
        root.rebuildQHTMLReferences();
      }
      return inserted;
    }
    insertQHTMLSourceJs(index, source) { return this.insertQHTMLSource(index, source); }
    replaceChildWithQHTMLSource(index, source) {
      if (index < 0 || index >= this.childCount()) {
        return 0;
      }
      this.removeChildAt(index);
      return this.insertQHTMLSource(index, source);
    }
    replaceChildWithQHTMLSourceJs(index, source) { return this.replaceChildWithQHTMLSource(index, source); }
    cloneShallow() {
      const node = new QHTMLNode(this.qhtmlType(), this.qhtmlName());
      node.setQHTMLUUID(this.qhtmlUUID());
      return node;
    }
    static escapeText(value) { return qhtmlEscapeText(value); }
    static escapeAttribute(value) { return qhtmlEscapeAttribute(value); }
    static sourceIndent(indentLevel) { return qhtmlSourceIndent(indentLevel); }
    static sourceQuote(value) { return qhtmlSourceQuote(value); }
    static sourceBlock(header, body, indentLevel) { return qhtmlSourceBlock(header, body, indentLevel); }
    static nodeFromJsonObject(object, ownerScope = null) {
      const type = firstString(object, ["qhtmlType", "type"], "QHTMLNode");
      const name = firstString(object, ["qhtmlName", "name"], "");
      const attributes = hashFromObject(object.qhtmlAttributes || object.attributes);
      let node;
      switch (type) {
        case "QHTMLDomElement":
          node = new QHTMLDomElement(firstString(object, ["tagName", "qhtmlName", "name"], name), attributes);
          break;
        case "QHTMLTextFragment":
          node = new QHTMLTextFragment(readBody(object));
          break;
        case "QHTMLHTMLFragment":
          node = new QHTMLHTMLFragment(readBody(object));
          break;
        case "QHTMLUnknownFragment":
          node = new QHTMLUnknownFragment(readBody(object));
          break;
        case "QHTMLLogger":
          node = new QHTMLLogger(name, attributes);
          break;
        case "QHTMLJavaScriptBlock":
          node = new QHTMLJavaScriptBlock(readBody(object));
          break;
        case "QHTMLFunction":
          node = new QHTMLFunction(name, attributes, readBody(object));
          break;
        case "QHTMLSignal":
          node = new QHTMLSignal(name, attributes);
          break;
        case "QHTMLComponentSlot":
          node = new QHTMLComponentSlot(name, attributes);
          break;
        case "QHTMLSlotDefault":
          node = new QHTMLSlotDefault(name, attributes);
          break;
        case "QHTMLPropertyAssignment":
          node = new QHTMLPropertyAssignment(name, Object.assign({}, attributes, { value: firstString(object, ["value"], attributes.value || "") }));
          break;
        case "QHTMLArray":
          node = new QHTMLArray(name, attributes);
          break;
        case "QHTMLMap":
          node = new QHTMLMap(name, attributes);
          break;
        case "QHTMLJsonValue":
          node = new QHTMLJsonValue(name, Object.prototype.hasOwnProperty.call(object, "value") ? object.value : null);
          break;
        case "QHTMLJsonArray":
          node = new QHTMLJsonArray(name, Array.isArray(object.value) ? object.value : []);
          break;
        case "QHTMLJsonObject":
          node = new QHTMLJsonObject(name, object.value && typeof object.value === "object" && !Array.isArray(object.value) ? object.value : {});
          break;
        case "QHTMLJsonDocument":
          node = new QHTMLJsonDocument(name, Object.prototype.hasOwnProperty.call(object, "value") ? object.value : null);
          break;
        case "QHTMLLayout":
          node = new QHTMLLayout(firstString(object, ["qhtmlKeyword", "keyword"], "q-layout"), name, attributes);
          break;
        case "QHTMLRowLayout":
          node = new QHTMLRowLayout(name, attributes);
          break;
        case "QHTMLColumnLayout":
          node = new QHTMLColumnLayout(name, attributes);
          break;
        case "QHTMLComponentDefinition":
          node = new QHTMLComponentDefinition(name, attributes);
          break;
        case "QHTMLComponentInstance":
          node = new QHTMLComponentInstance(name, attributes, ownerScope instanceof QHTMLNode ? ownerScope.qhtmlResolve(firstString(object, ["componentDefinitionUUID", "definition"], "")) : null);
          break;
        case "QHTMLComponentInstanceSlot":
          node = new QHTMLComponentInstanceSlot(null, null, name);
          break;
        case "QHTMLProperty":
          node = new QHTMLProperty(name, Object.assign({}, attributes, { value: firstString(object, ["value"], attributes.value || "") }));
          break;
        case "QHTMLImportNode":
          node = new QHTMLImportNode(firstString(object, ["qhtmlKeyword", "keyword"], "q-import"), attributes, readBody(object));
          break;
        case "QHTMLForNode":
          node = new QHTMLForNode(firstString(object, ["qhtmlVariable", "variable"], name), Object.assign({}, attributes, {
            collection: firstString(object, ["qhtmlCollection", "collection"], attributes.collection || "")
          }), readBody(object));
          break;
        case "QHTMLEventHandler":
          node = new QHTMLEventHandler(firstString(object, ["eventName", "qhtmlEventName"], name), attributes, readBody(object));
          break;
        case "QHTMLPainter":
          node = new QHTMLPainter(name, attributes, readBody(object));
          break;
        case "QHTMLCanvas":
          node = new QHTMLCanvas(name, attributes);
          break;
        case "QHTMLVideo":
          node = new QHTMLVideo(name, attributes);
          break;
        case "QHTMLParticleEmitter":
          node = new QHTMLParticleEmitter(name, attributes);
          break;
        case "QHTMLConnect":
          node = new QHTMLConnect(name, attributes, readBody(object));
          break;
        case "QHTMLTimer":
          node = new QHTMLTimer(name, attributes);
          break;
        case "QHTMLPropertyAnimation":
          node = new QHTMLPropertyAnimation(name, attributes);
          break;
        case "QHTMLScriptAction":
          node = new QHTMLScriptAction(name, attributes, readBody(object));
          break;
        case "QHTMLSequentialAnimation":
          node = new QHTMLSequentialAnimation(name, attributes);
          break;
        case "QHTMLParallelAnimation":
          node = new QHTMLParallelAnimation(name, attributes);
          break;
        case "QHTMLBehavior":
          node = new QHTMLBehavior(name, attributes);
          break;
        case "QHTMLStyle":
          node = new QHTMLStyle(name, attributes, readBody(object));
          break;
        case "QHTMLTheme":
          node = new QHTMLTheme(name, attributes, readBody(object));
          break;
        case "QHTMLTransition":
          node = new QHTMLTransition(name, attributes, readBody(object));
          break;
        case "QHTMLStyleApplication":
          node = new QHTMLStyleApplication(name, attributes);
          break;
        case "QHTMLThemeApplication":
          node = new QHTMLThemeApplication(name, attributes);
          break;
        case "QHTMLSlot":
          node = new QHTMLSlot(name, attributes);
          break;
        case "QHTMLClass":
          node = new QHTMLClass(name, attributes, readBody(object));
          break;
        case "QHTMLScript":
          node = new QHTMLScript(name, attributes, readBody(object));
          break;
        case "QHTMLModelView":
          node = new QHTMLModelView(name, attributes);
          break;
        case "QHTMLFactory":
          node = new QHTMLFactory(name, attributes);
          break;
        case "QHTMLMethod":
          node = new QHTMLMethod(name, attributes, readBody(object));
          break;
        case "QHTMLDomTree":
          node = new QHTMLDomTree();
          break;
        default:
          node = new QHTMLTypedNode(firstString(object, ["qhtmlKeyword", "keyword"], type), name, attributes);
          node.setQHTMLType(type);
          break;
      }
      if (object.qhtmlUUID) {
        node.setQHTMLUUID(object.qhtmlUUID);
      }
      node.qhtmlProperties = new Map(Object.entries(object.qhtmlProperties || object.properties || {}));
      if (node instanceof QHTMLComponentInstance) {
        const componentName = firstString(object, ["qhtmlComponentName", "componentName"], "");
        if (componentName) {
          node.setProperty("qhtmlComponentName", componentName);
          node.setProperty("componentName", componentName);
        }
      }
      for (const childObject of object.qhtmlChildren || []) {
        node.appendChild(QHTMLNode.nodeFromJsonObject(childObject, node));
      }
      return node;
    }
  }

  function readBody(object) {
    const body = firstString(object, ["qhtmlContents", "body", "value", "contents"], "");
    const encoding = firstString(object, ["qhtmlContentsEncoding", "bodyEncoding"], "");
    return encoding === "base64" ? base64DecodeUtf8(body) : body;
  }

  class QHTMLDomNode extends QHTMLNode {
    constructor(type = "QHTMLDomNode", name = "") {
      super(type, name);
    }
  }

  class QHTMLDomElement extends QHTMLDomNode {
    constructor(tagName = "", attributes = {}) {
      super("QHTMLDomElement", tagName);
      this._tagName = trim(tagName);
      this._attributes = Object.assign({}, attributes);
    }

    tagName() { return this._tagName; }
    tagNameJs() { return this.tagName(); }
    setTagName(tagName) {
      this._tagName = trim(tagName);
      this.setQHTMLName(this._tagName);
    }
    setTagNameJs(tagName) { this.setTagName(tagName); }
    attributes() { return Object.assign({}, this._attributes); }
    clearAttributes() { this._attributes = {}; }
    setAttributes(attributes) { this._attributes = Object.assign({}, attributes || {}); }
    setAttribute(key, value) { this._attributes[trim(key)] = String(value == null ? "" : value); }
    setAttributeJs(key, value) { this.setAttribute(key, value); }
    attribute(key) { return this._attributes[trim(key)] || ""; }
    attributeJs(key) { return this.attribute(key); }
    inlineStyleForContext(contextNode = this) {
      const declarations = [];
      if (trim(this._attributes.style) !== "") {
        declarations.push(qhtmlInterpolateTextForContext(this._attributes.style, contextNode));
      }
      const emitted = new Set();
      for (const child of this.children()) {
        if (!(child instanceof QHTMLPropertyAssignment)) {
          continue;
        }
        const cssName = qhtmlCssShortcutPropertyName(child.qhtmlName());
        if (cssName === "" || emitted.has(cssName)) {
          continue;
        }
        declarations.push(cssName + ":" + qhtmlResolveCssValueForContext(child.value(), contextNode));
        emitted.add(cssName);
      }
      return declarations.join(";");
    }
    assignmentAttributesForContext(contextNode = this) {
      const declaredProperties = new Set(this.children()
        .filter(child => child instanceof QHTMLProperty)
        .map(child => child.qhtmlName().toLowerCase()));
      const emitted = new Set(Object.keys(this._attributes).map(key => key.toLowerCase()));
      const out = [];
      for (const child of this.children()) {
        if (!(child instanceof QHTMLPropertyAssignment)) {
          continue;
        }
        const name = child.qhtmlName();
        const lower = name.toLowerCase();
        if (!name || emitted.has(lower) || declaredProperties.has(lower) || qhtmlIsCssShortcutProperty(name) || lower === "style") {
          continue;
        }
        out.push(" " + name + "=\"" + qhtmlEscapeAttribute(qhtmlInterpolateTextForContext(qhtmlScalarValue(child.value()), contextNode)) + "\"");
        emitted.add(lower);
      }
      return out.join("");
    }
    renderHtml() { return this.renderHtmlForContext(null); }
    renderHtmlInContext(contextNode) { return this.renderHtmlForContext(contextNode); }
    renderHtmlForContext(contextNode) {
      if (this._tagName === "") {
        return super.renderHtml();
      }
      const childContext = contextNode || this;
      let out = "<" + this._tagName;
      for (const key of Object.keys(this._attributes)) {
        if (key === "style") {
          continue;
        }
        const value = this._attributes[key];
        if (String(value) !== "") {
          out += " " + key + "=\"" + qhtmlEscapeAttribute(qhtmlInterpolateTextForContext(value, childContext)) + "\"";
        }
      }
      out += this.assignmentAttributesForContext(childContext);
      const style = this.inlineStyleForContext(childContext);
      if (style.trim() !== "") {
        out += " style=\"" + qhtmlEscapeAttribute(style) + "\"";
      }
      out += " qhtml-node=\"" + qhtmlEscapeAttribute(this.qhtmlUUID()) + "\">";
      out += this.children().map(child => child.renderHtmlInContext(childContext)).join("");
      out += "</" + this._tagName + ">";
      return out;
    }
    sourceQHTML(indentLevel = 0) {
      let header = this._tagName;
      const id = trim(this._attributes.id);
      const klass = trim(this._attributes.class);
      if (id) {
        header += "#" + id;
      }
      if (klass) {
        header += klass.split(/\s+/).map(part => "." + part).join("");
      }
      const lines = [];
      for (const key of Object.keys(this._attributes)) {
        if (key !== "id" && key !== "class") {
          lines.push(key + ": " + qhtmlSourceQuote(this._attributes[key]));
        }
      }
      for (const child of this.children()) {
        lines.push(child.sourceQHTML(0));
      }
      return qhtmlSourceBlock(header, lines.join("\n"), indentLevel);
    }
    toJsonObject() {
      return Object.assign(super.toJsonObject(), { tagName: this.tagName(), attributes: this.attributes() });
    }
  }

  class QHTMLTextFragment extends QHTMLDomNode {
    constructor(value = "") {
      super("QHTMLTextFragment", "text");
      this._value = String(value == null ? "" : value);
    }
    value() { return this._value; }
    valueJs() { return this.value(); }
    setValue(value) { this._value = String(value == null ? "" : value); }
    setValueJs(value) { this.setValue(value); }
    renderHtml() { return qhtmlEscapeText(this._value); }
    renderHtmlInContext(contextNode) { return qhtmlEscapeText(qhtmlInterpolateTextForContext(this._value, contextNode)); }
    sourceQHTML(indentLevel = 0) { return qhtmlSourceBlock("text", this._value, indentLevel); }
    toJsonObject() { const json = super.toJsonObject(); json.value = this._value; json.qhtmlContents = this._value; return json; }
  }

  class QHTMLHTMLFragment extends QHTMLTextFragment {
    constructor(value = "") {
      super(value);
      this.setQHTMLType("QHTMLHTMLFragment");
      this.setQHTMLName("html");
    }
    renderHtml() { return this.value(); }
    renderHtmlInContext(contextNode) { return qhtmlInterpolateTextForContext(this.value(), contextNode); }
    sourceQHTML(indentLevel = 0) { return qhtmlSourceBlock("html", this.value(), indentLevel); }
  }

  class QHTMLUnknownFragment extends QHTMLTextFragment {
    constructor(value = "") {
      super(trim(value));
      this.setQHTMLType("QHTMLUnknownFragment");
      this.setQHTMLName("");
    }
    renderHtml() { return qhtmlEscapeText(this.value()); }
    renderHtmlInContext(contextNode) { return qhtmlEscapeText(qhtmlInterpolateTextForContext(this.value(), contextNode)); }
    sourceQHTML(indentLevel = 0) { return qhtmlSourceBlock(this.qhtmlName() || this.qhtmlType(), this.value(), indentLevel); }
  }

  class QHTMLTypedNode extends QHTMLDomNode {
    constructor(keyword = "", name = "", attributes = {}) {
      super("QHTMLTypedNode", name);
      this._keyword = trim(keyword);
      this._attributes = Object.assign({}, attributes);
      this.setProperty("keyword", this._keyword);
    }
    keyword() { return this._keyword; }
    keywordJs() { return this.keyword(); }
    setKeyword(keyword) { this._keyword = trim(keyword); this.setProperty("keyword", this._keyword); }
    setKeywordJs(keyword) { this.setKeyword(keyword); }
    attributes() { return Object.assign({}, this._attributes); }
    attribute(key) { return this._attributes[trim(key)] || ""; }
    attributeJs(key) { return this.attribute(key); }
    clearAttributes() { this._attributes = {}; }
    setAttributes(attributes) { this._attributes = Object.assign({}, attributes || {}); }
    setAttribute(key, value) { this._attributes[trim(key)] = String(value == null ? "" : value); }
    renderHtml() {
      if (["q-keyword", "q-var", "q-callback", "q-macro", "q-rewrite", "q-switch", "q-anchor"].includes(this._keyword) ||
          this._keyword.startsWith("q-anchor-")) {
        return "";
      }
      return super.renderHtml();
    }
    sourceQHTML(indentLevel = 0) {
      let header = this._keyword;
      if (trim(this.qhtmlName()) !== "") {
        header += " " + trim(this.qhtmlName());
      }
      const lines = [];
      for (const key of Object.keys(this._attributes)) {
        if (trim(key) !== "" && String(this._attributes[key]) !== "") {
          lines.push(key + ": " + qhtmlSourceQuote(this._attributes[key]));
        }
      }
      for (const child of this.children()) {
        lines.push(child.sourceQHTML(0));
      }
      return qhtmlSourceBlock(header, lines.join("\n"), indentLevel);
    }
    toJsonObject() {
      return Object.assign(super.toJsonObject(), { keyword: this.keyword(), attributes: this.attributes() });
    }
  }

  class QHTMLLogger extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) {
      super("q-logger", name, attributes);
      this.setQHTMLType("QHTMLLogger");
      this.setProperty("kind", "logger");
      this._categories = [];
      this._entries = [];
      this.setCategories(QHTMLLogger.parseCategorySource(attributes.categories || ""));
    }
    categories() {
      const out = this._categories.slice();
      for (const child of this.children()) {
        for (const category of QHTMLLogger.parseCategorySource(child.sourceQHTML(0))) {
          if (!out.includes(category)) out.push(category);
        }
      }
      return out;
    }
    categoriesJs() { return this.categories(); }
    categoryList() { return this.categories().join(" "); }
    categoryListJs() { return this.categoryList(); }
    setCategories(categories) {
      this._categories = [];
      for (const category of categories || []) {
        this.addCategory(category);
      }
      this.setAttribute("categories", this.categoryList());
    }
    setCategoryList(categories) { this.setCategories(QHTMLLogger.parseCategorySource(categories)); }
    setCategoryListJs(categories) { this.setCategoryList(categories); }
    setCategoriesJs(categories) { this.setCategories(Array.isArray(categories) ? categories : QHTMLLogger.parseCategorySource(categories)); }
    addCategory(category) {
      const normalized = QHTMLLogger.normalizeCategory(category);
      if (normalized && !this._categories.includes(normalized)) {
        this._categories.push(normalized);
      }
    }
    addCategoryJs(category) { this.addCategory(category); }
    removeCategory(category) {
      const normalized = QHTMLLogger.normalizeCategory(category);
      this._categories = this._categories.filter(item => item !== normalized);
      this.setAttribute("categories", this.categoryList());
    }
    removeCategoryJs(category) { this.removeCategory(category); }
    acceptsCategory(category) {
      const normalized = QHTMLLogger.normalizeCategory(category);
      return normalized === "" || this.categories().length === 0 || this.categories().includes(normalized);
    }
    acceptsCategoryJs(category) { return this.acceptsCategory(category); }
    maybeLog(message) { return this.log(message); }
    logSignal(message) { return this.log(message, "QHTMLSignal"); }
    logProperty(message) { return this.log(message, "QHTMLProperty"); }
    logComponent(message) { return this.log(message, "QHTMLComponent"); }
    logSlot(message) { return this.log(message, "QHTMLSlot"); }
    log(message, category = "") {
      if (!this.acceptsCategory(category)) {
        return false;
      }
      const normalized = QHTMLLogger.normalizeCategory(category);
      const entry = normalized === "" ? String(message) : "[" + normalized + "] " + String(message);
      this._entries.push(entry);
      console.info("QHTMLLogger", entry);
      return true;
    }
    logJs(message, category = "") { return this.log(message, category); }
    logSignalJs(message) { return this.logSignal(message); }
    logPropertyJs(message) { return this.logProperty(message); }
    logComponentJs(message) { return this.logComponent(message); }
    logSlotJs(message) { return this.logSlot(message); }
    entries() { return this._entries.slice(); }
    entriesJs() { return this.entries(); }
    renderHtml() { return ""; }
    sourceQHTML(indentLevel = 0) {
      return qhtmlSourceBlock("q-logger" + (this.qhtmlName() ? " " + this.qhtmlName() : ""), this.categoryList(), indentLevel);
    }
    static normalizeCategory(category) {
      const value = trim(category);
      if (value === "") return "";
      if (value === "q-signal" || value === "signal") return "QHTMLSignal";
      if (value === "q-property" || value === "property") return "QHTMLProperty";
      if (value === "q-component" || value === "component" || value === "QHTMLComponentDefinition" || value === "QHTMLComponentInstance") return "QHTMLComponent";
      if (value === "q-slot" || value === "slot" || value === "QHTMLComponentSlot" || value === "QHTMLComponentInstanceSlot") return "QHTMLSlot";
      return value;
    }
    static parseCategorySource(source) {
      const out = [];
      for (const part of trim(source).replace(/[{},;]/g, " ").split(/\s+/).filter(Boolean)) {
        const normalized = QHTMLLogger.normalizeCategory(part);
        if (normalized && !out.includes(normalized)) {
          out.push(normalized);
        }
      }
      return out;
    }
  }

  function qhtmlBindLoggerToNode(logger, node) {
    node.qhtmlLogger = logger;
    for (const child of node.children()) {
      qhtmlBindLoggerToNode(logger, child);
    }
  }

  class QHTMLJavaScriptBlock extends QHTMLDomNode {
    constructor(contents = "") {
      super("QHTMLJavaScriptBlock", "script");
      this._contents = trim(contents);
    }
    contents() { return this._contents; }
    body() { return this._contents; }
    value() { return this._contents; }
    contentsJs() { return this.contents(); }
    setContents(contents) { this._contents = trim(contents); }
    setContentsJs(contents) { this.setContents(contents); }
    renderHtml() { return ""; }
    sourceQHTML(indentLevel = 0) {
      return this._contents.split("\n").map(line => qhtmlSourceIndent(indentLevel) + line).join("\n");
    }
    toJsonObject() {
      const json = super.toJsonObject();
      json.qhtmlContents = base64EncodeUtf8(this._contents);
      json.body = json.qhtmlContents;
      json.qhtmlContentsEncoding = "base64";
      json.bodyEncoding = "base64";
      return json;
    }
  }

  class QHTMLFunction extends QHTMLTypedNode {
    constructor(name = "", attributes = {}, body = "") {
      super("function", name, attributes);
      this.setQHTMLType("QHTMLFunction");
      this.setProperty("kind", "function");
      this._parameters = parseParameters(attributes.parameters || "");
      this._body = trim(body);
      this._lastArguments = [];
      this._lastSenderUUID = "";
      this._lastSignalUUID = "";
      this._callCount = 0;
    }
    parameters() { return this._parameters.slice(); }
    parameterList() { return this._parameters.join(", "); }
    parameterListJs() { return this.parameterList(); }
    setParameters(parameters) { this._parameters = parameters.slice(); this.setAttribute("parameters", this.parameterList()); }
    setParameterList(parameters) { this.setParameters(parseParameters(parameters)); }
    setParameterListJs(parameters) { this.setParameterList(parameters); }
    body() { return this._body; }
    bodyJs() { return this.body(); }
    setBody(body) { this._body = trim(body); }
    setBodyJs(body) { this.setBody(body); }
    lastArguments() { return this._lastArguments.slice(); }
    lastArgumentList() { return this._lastArguments.join(", "); }
    lastArgumentListJs() { return this.lastArgumentList(); }
    lastSenderUUID() { return this._lastSenderUUID; }
    lastSenderUUIDJs() { return this.lastSenderUUID(); }
    lastSignalUUID() { return this._lastSignalUUID; }
    lastSignalUUIDJs() { return this.lastSignalUUID(); }
    callCount() { return this._callCount; }
    call(argumentsList, sender = null, signal = null) {
      const args = argumentsList || [];
      this._lastArguments = args.slice();
      this._lastSenderUUID = sender ? sender.qhtmlUUID() : "";
      this._lastSignalUUID = signal ? signal.qhtmlUUID() : "";
      this._callCount += 1;
      for (let i = 0; i < this._parameters.length && i < args.length; i += 1) {
        this.qhtmlContext.updateKeywordReference(this._parameters[i], args[i]);
      }
      return this._body;
    }
    callJs(argumentList) { return this.call(parseParameters(argumentList)); }
    cloneFunction() { return new QHTMLFunction(this.qhtmlName(), Object.assign({}, this.attributes(), { parameters: this.parameterList() }), this._body); }
    renderHtml() { return ""; }
    sourceQHTML(indentLevel = 0) { return qhtmlSourceBlock("function " + this.qhtmlName() + "(" + this.parameterList() + ")", this._body, indentLevel); }
    toJsonObject() {
      return Object.assign(super.toJsonObject(), bodyJsonFields(this._body), {
        parameters: this.parameterList()
      });
    }
    static parseParameters(value) { return parseParameters(value); }
  }

  class QHTMLSignal extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) {
      super("q-signal", name, attributes);
      this.setQHTMLType("QHTMLSignal");
      this.setProperty("kind", "signal");
      this._parameters = parseParameters(attributes.parameters || "");
      this._signalBus = null;
      this._maybeLogListeners = [];
    }
    setSignalBus(bus) { this._signalBus = bus; }
    signalBus() { return this._signalBus; }
    signalBusJs() { return this.signalBus(); }
    parameters() { return this._parameters.slice(); }
    parameterList() { return this._parameters.join(", "); }
    parameterListJs() { return this.parameterList(); }
    setParameters(parameters) { this._parameters = parameters.slice(); this.setAttribute("parameters", this.parameterList()); }
    setParameterList(parameters) { this.setParameters(parseParameters(parameters)); }
    setParameterListJs(parameters) { this.setParameterList(parameters); }
    connect(functionNode) { return this._signalBus ? this._signalBus.connect(this, functionNode) : false; }
    connections() { return this._signalBus ? (this._signalBus._connections.get(this.qhtmlUUID()) || []).slice() : []; }
    onMaybeLog(callback) { this._maybeLogListeners.push(callback); }
    emitSignal(argumentsList = [], sender = null) {
      const resolvedSender = sender || this.parent();
      const message = "Signal " + this.qhtmlName() + " emitted by " + (resolvedSender ? resolvedSender.qhtmlUUID() : "<none>") +
        " with arguments [" + argumentsList.join(", ") + "]";
      for (const listener of this._maybeLogListeners) {
        listener(message);
      }
      this.maybeLog(message);
      return this._signalBus ? this._signalBus.emitSignal(this, resolvedSender, argumentsList) : 0;
    }
    emitSignalJs(argumentList) { return this.emitSignal(parseParameters(argumentList)); }
    emit(...args) { return this.emitSignal(args, this.parent()); }
    cloneSignal() { const cloned = new QHTMLSignal(this.qhtmlName(), Object.assign({}, this.attributes(), { parameters: this.parameterList() })); cloned.setSignalBus(this._signalBus); return cloned; }
    renderHtml() { return ""; }
    sourceQHTML(indentLevel = 0) { return qhtmlSourceIndent(indentLevel) + "q-signal " + this.qhtmlName() + "(" + this.parameterList() + ")"; }
  }

  class QHTMLSignalConnection {
    constructor(signal = null, functionNode = null) {
      this._signal = signal;
      this._function = functionNode;
    }
    signal() { return this._signal; }
    function() { return this._function; }
    signalUUID() { return this._signal ? this._signal.qhtmlUUID() : ""; }
    functionUUID() { return this._function ? this._function.qhtmlUUID() : ""; }
    receiverUUID() { return this._function && this._function.parent() ? this._function.parent().qhtmlUUID() : ""; }
  }

  class QHTMLSignalBus {
    constructor() {
      this._connections = new Map();
      this._lastArguments = [];
      this._lastSignalUUID = "";
      this._lastSenderUUID = "";
      this._lastFunctionUUID = "";
      this._lastReceiverUUID = "";
      this._lastScriptBody = "";
      this._lastDispatchCount = 0;
    }
    connect(signal, functionNode) {
      const key = signal.qhtmlUUID();
      const list = this._connections.get(key) || [];
      if (!list.some(connection => connection.function() === functionNode)) {
        list.push(new QHTMLSignalConnection(signal, functionNode));
      }
      this._connections.set(key, list);
      return true;
    }
    connectJs(signal, functionNode) { return this.connect(signal, functionNode); }
    emitSignal(signal, sender, argumentsList) {
      this._lastSignalUUID = signal.qhtmlUUID();
      this._lastSenderUUID = sender ? sender.qhtmlUUID() : "";
      this._lastArguments = (argumentsList || []).slice();
      let invoked = 0;
      for (const connection of this._connections.get(signal.qhtmlUUID()) || []) {
        const functionNode = connection.function();
        this._lastFunctionUUID = functionNode.qhtmlUUID();
        this._lastReceiverUUID = connection.receiverUUID();
        this._lastScriptBody = functionNode.call(argumentsList || [], sender, signal);
        invoked += 1;
      }
      this._lastDispatchCount = invoked;
      return invoked;
    }
    emitSignalJs(signal, sender, argumentList) { return this.emitSignal(signal, sender, parseParameters(argumentList)); }
    connectionCount(signal) { return signal ? (this._connections.get(signal.qhtmlUUID()) || []).length : 0; }
    lastSignalUUID() { return this._lastSignalUUID; }
    lastSignalUUIDJs() { return this.lastSignalUUID(); }
    lastSenderUUID() { return this._lastSenderUUID; }
    lastSenderUUIDJs() { return this.lastSenderUUID(); }
    lastFunctionUUID() { return this._lastFunctionUUID; }
    lastFunctionUUIDJs() { return this.lastFunctionUUID(); }
    lastReceiverUUID() { return this._lastReceiverUUID; }
    lastReceiverUUIDJs() { return this.lastReceiverUUID(); }
    lastScriptBody() { return this._lastScriptBody; }
    lastScriptBodyJs() { return this.lastScriptBody(); }
    lastArgumentList() { return this._lastArguments.join(", "); }
    lastArgumentListJs() { return this.lastArgumentList(); }
    lastDispatchCount() { return this._lastDispatchCount; }
  }

  class QHTMLComponentSlot extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) {
      super("slot", name, attributes);
      this.setQHTMLType("QHTMLComponentSlot");
      this.setProperty("kind", "component-slot");
    }
    renderHtmlInContext(contextNode) {
      if (contextNode instanceof QHTMLComponentInstance) {
        return contextNode.renderSlotForOwnedDefinition(this);
      }
      return super.renderHtml();
    }
    cloneSlot() {
      const slot = new QHTMLComponentSlot(this.qhtmlName(), this.attributes());
      for (const child of this.children()) {
        slot.appendChild(cloneNode(child));
      }
      return slot;
    }
  }

  class QHTMLSlotDefault extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) {
      super("q-slot-default", name, attributes);
      this.setQHTMLType("QHTMLSlotDefault");
      this.setProperty("kind", "slot-default");
    }
    renderHtml() { return ""; }
    sourceQHTML(indentLevel = 0) { return qhtmlSourceBlock("q-slot-default " + this.qhtmlName(), this.children().map(child => child.sourceQHTML(0)).join("\n"), indentLevel); }
  }

  class QHTMLPropertyAssignment extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) {
      super("q-property-assignment", name, attributes);
      this.setQHTMLType("QHTMLPropertyAssignment");
      this.setProperty("kind", "property-assignment");
      this._value = attributes.value == null ? "" : String(attributes.value);
    }
    value() { return this._value; }
    valueJs() { return this.value(); }
    setValue(value) { this._value = String(value == null ? "" : value); this.setAttribute("value", this._value); }
    setValueJs(value) { this.setValue(value); }
    cloneAssignment() { return new QHTMLPropertyAssignment(this.qhtmlName(), Object.assign({}, this.attributes(), { value: this._value })); }
    renderHtml() { return ""; }
    sourceQHTML(indentLevel = 0) {
      if (this.attribute("sourceSyntax") === "block") {
        return qhtmlSourceBlock(this.qhtmlName(), this._value, indentLevel);
      }
      return qhtmlSourceIndent(indentLevel) + this.qhtmlName() + ": " + this._value;
    }
    toJsonObject() { return Object.assign(super.toJsonObject(), { value: this._value }); }
  }

  class QHTMLLayout extends QHTMLTypedNode {
    constructor(keyword = "q-layout", name = "", attributes = {}, direction = "column", layoutType = "QHTMLLayout") {
      super(keyword, name, attributes);
      this.setQHTMLType(layoutType);
      this._direction = direction;
      this.setProperty("kind", "layout");
      this.setProperty("direction", direction);
    }
    direction() { return this._direction; }
    directionJs() { return this.direction(); }
    addRow(row) { return this.appendChild(row); }
    addRowJs(row) { return this.addRow(row); }
    addCol(col) { return this.appendChild(col); }
    addColJs(col) { return this.addCol(col); }
    addLayout(layout) { return this.appendChild(layout); }
    addLayoutJs(layout) { return this.addLayout(layout); }
    layoutInlineStyle(contextNode = this) {
      const direction = this instanceof QHTMLRowLayout ? "row" : "column";
      const declarations = [
        "display:flex",
        "flex-direction:" + direction,
        direction === "row" ? "flex-wrap:wrap" : "",
        "align-items:stretch",
        "box-sizing:border-box",
        "min-width:0",
        "min-height:0"
      ].filter(Boolean);
      for (const child of this.children()) {
        if (!(child instanceof QHTMLPropertyAssignment)) {
          continue;
        }
        const cssName = qhtmlCssShortcutPropertyName(child.qhtmlName());
        if (cssName) {
          declarations.push(cssName + ":" + qhtmlResolveCssValueForContext(child.value(), contextNode));
        }
      }
      return declarations.join(";");
    }
    renderHtmlInContext(contextNode) { return this.renderHtmlForContext(contextNode || this); }
    renderHtml() { return this.renderHtmlForContext(this); }
    renderHtmlForContext(contextNode) {
      let out = "<div qhtml-layout=\"" + qhtmlEscapeAttribute(this.keyword()) + "\" qhtml-node=\"" + qhtmlEscapeAttribute(this.qhtmlUUID()) +
        "\" class=\"qhtml-layout\" style=\"" + qhtmlEscapeAttribute(this.layoutInlineStyle(contextNode)) + "\">";
      for (const child of this.children()) {
        if (child instanceof QHTMLPropertyAssignment || child instanceof QHTMLProperty) {
          continue;
        }
        out += renderNodeWithSlotsForInstance(child, contextNode);
      }
      out += "</div>";
      return out;
    }
  }

  class QHTMLRowLayout extends QHTMLLayout {
    constructor(name = "", attributes = {}) {
      super("q-row", name, attributes, "row", "QHTMLRowLayout");
    }
  }

  class QHTMLColumnLayout extends QHTMLLayout {
    constructor(name = "", attributes = {}) {
      super("q-col", name, attributes, "column", "QHTMLColumnLayout");
    }
  }

  class QHTMLComponentInstanceSlot extends QHTMLTypedNode {
    constructor(owner = null, definitionSlot = null, name = "") {
      super("q-component-instance-slot", name || (definitionSlot ? definitionSlot.qhtmlName() : ""), {});
      this.setQHTMLType("QHTMLComponentInstanceSlot");
      this._owner = owner;
      this._definitionSlot = definitionSlot;
    }
    owner() { return this._owner; }
    ownerJs() { return this.owner(); }
    definitionSlot() { return this._definitionSlot; }
    definitionSlotJs() { return this.definitionSlot(); }
    append(node) { return this.appendChild(node); }
    appendJs(node) { return this.append(node); }
    remove(node) {
      const index = this.qhtmlChildren.indexOf(node);
      return index >= 0 ? this.removeChildAt(index) : false;
    }
    removeJs(node) { return this.remove(node); }
    childrenJs() { return this.children(); }
    renderHtml() { return this.children().map(child => child.renderHtml()).join(""); }
  }

  class QHTMLComponentDefinition extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) {
      super("q-component", name, attributes);
      this.setQHTMLType("QHTMLComponentDefinition");
      this.setProperty("kind", "component-definition");
    }
    renderHtml() { return ""; }
    renderTemplateHtml() { return super.renderHtml(); }
    renderTemplateHtmlJs() { return this.renderTemplateHtml(); }
    extendsList() {
      const value = trim(this.attribute("extends")).replace(/,/g, " ");
      return value ? value.split(/\s+/) : [];
    }
    extendsListJs() { return this.extendsList().join(", "); }
    hasExtends() { return this.extendsList().length > 0; }
  }

  class QHTMLComponentInstance extends QHTMLTypedNode {
    constructor(name = "", attributes = {}, definition = null) {
      if (name instanceof QHTMLComponentDefinition) {
        definition = name;
        name = "";
        attributes = {};
      }
      super("q-component-instance", name, attributes);
      this.setQHTMLType("QHTMLComponentInstance");
      this.setProperty("kind", "component-instance");
      this._definition = definition;
      this._referenceMembers = [];
      this._slotViews = [];
      this.ensureSlotViews();
    }
    setDefinition(definition) {
      this._referenceMembers = [];
      this._slotViews = [];
      this._definition = definition;
      this.ensureSlotViews();
      this.maybeLog("Component instance " + this.qhtmlName() + " definition set to " + (definition ? definition.qhtmlName() : "<none>"));
    }
    definition() { return this._definition; }
    definitionJs() { return this.definition(); }
    componentDefinition() { return this._definition; }
    componentDefinitionJs() { return this.componentDefinition(); }
    componentDefinitionUUID() { return this._definition ? this._definition.qhtmlUUID() : ""; }
    componentDefinitionUUIDJs() { return this.componentDefinitionUUID(); }
    referenceMemberCount() { return this._referenceMembers.length; }
    referenceMemberAt(index) { return this._referenceMembers[index] || null; }
    referenceMembers() { return this._referenceMembers.slice(); }
    ownedReferenceMembers() { return this._referenceMembers.concat(this._slotViews); }
    appendReferenceMember(member) {
      member.qhtmlParent = this;
      member.qhtmlContext.setParentContext(this.qhtmlContext);
      this._referenceMembers.push(member);
      this.addQHTMLReference(member.qhtmlName(), member);
      return true;
    }
    takeReferenceMemberAt(index) {
      const member = this._referenceMembers.splice(index, 1)[0] || null;
      if (member) {
        this.removeQHTMLReference(member.qhtmlUUID());
        member.qhtmlParent = null;
        member.qhtmlContext.setParentContext(null);
      }
      return member;
    }
    clearReferenceMembers() {
      while (this._referenceMembers.length) {
        this.takeReferenceMemberAt(this._referenceMembers.length - 1);
      }
    }
    collectSlots() {
      const out = [];
      function walk(node) {
        if (!node) return;
        if (node instanceof QHTMLComponentSlot) out.push(node);
        for (const child of node.children()) walk(child);
      }
      walk(this._definition);
      return out;
    }
    slotCount() { return this.collectSlots().length; }
    slotsJs() { this.ensureSlotViews(); return this._slotViews.slice(); }
    slotAt(index) { return this.collectSlots()[index] || null; }
    slot(name) { return this.collectSlots().find(item => item.qhtmlName() === name) || null; }
    slotJs(name) { return this.slot(name); }
    ensureSlotViews() {
      if (!this._definition) return;
      const names = new Set(this._slotViews.map(view => view.qhtmlName()));
      for (const slot of this.collectSlots()) {
        if (!names.has(slot.qhtmlName())) {
          const view = new QHTMLComponentInstanceSlot(this, slot);
          view.qhtmlParent = this;
          view.qhtmlContext.setParentContext(this.qhtmlContext);
          this._slotViews.push(view);
          this.addQHTMLReference(view.qhtmlName(), view);
        }
      }
    }
    slotViewAt(index) { this.ensureSlotViews(); return this._slotViews[index] || null; }
    slotView(name) { this.ensureSlotViews(); return this._slotViews.find(view => view.qhtmlName() === name) || null; }
    slotViewJs(name) { return this.slotView(name); }
    slotNames() { return Array.from(new Set(this.collectSlots().map(slot => slot.qhtmlName()).filter(Boolean))).join(", "); }
    slotNamesJs() { return this.slotNames(); }
    appendToSlot(slotName, node) {
      const view = this.slotView(slotName);
      return view ? view.appendChild(cloneNode(node)) : null;
    }
    removeFromSlot(slotName, node) {
      const view = this.slotView(slotName);
      return view ? view.remove(node) : false;
    }
    slotDefault(slotName) {
      if (!this._definition) return null;
      return this._definition.findChildrenByType("QHTMLSlotDefault").find(item => item.qhtmlName() === slotName) || null;
    }
    slotDefaultJs(slotName) { return this.slotDefault(slotName); }
    slotOverride(slotName) {
      return this.children().find(child => child instanceof QHTMLComponentInstanceSlot && child.qhtmlName() === slotName) || null;
    }
    slotOverrideJs(slotName) { return this.slotOverride(slotName); }
    slotChildren(slotName) {
      const childOverride = this.slotOverride(slotName);
      if (childOverride) return childOverride.children();
      const view = this.slotView(slotName);
      if (view && view.childCount() > 0) return view.children();
      const slotDefault = this.slotDefault(slotName);
      if (slotDefault) return slotDefault.children();
      const slot = this.slot(slotName);
      return slot ? slot.children() : [];
    }
    renderSlotForOwnedDefinition(componentSlot) {
      const slotName = componentSlot.qhtmlName();
      const childOverride = this.slotOverride(slotName);
      if (childOverride) return childOverride.children().map(child => child.renderHtmlInContext(this)).join("");
      const view = this.slotView(slotName);
      if (view && view.childCount() > 0) return view.children().map(child => child.renderHtmlInContext(this)).join("");
      const slotDefault = this.slotDefault(slotName);
      if (slotDefault) return slotDefault.children().map(child => child.renderHtmlInContext(this)).join("");
      return componentSlot.children().map(child => child.renderHtmlInContext(this)).join("");
    }
    renderHtml() {
      if (!this._definition) {
        return super.renderHtml();
      }
      const tagName = trim(this._definition.qhtmlName());
      const body = this._definition.children().map(child => {
        if (child instanceof QHTMLComponentSlot) {
          return this.renderSlotForOwnedDefinition(child);
        }
        if (child instanceof QHTMLSlotDefault || child instanceof QHTMLProperty || child instanceof QHTMLFunction || child instanceof QHTMLSignal) {
          return "";
        }
        return renderNodeWithSlotsForInstance(child, this);
      }).join("") + this.children().filter(child => !(child instanceof QHTMLComponentInstanceSlot) && !(child instanceof QHTMLPropertyAssignment)).map(child => child.renderHtmlInContext(this)).join("");
      if (!tagName) {
        return body;
      }
      let out = "<" + tagName;
      for (const [key, value] of Object.entries(this.attributes())) {
        if (key !== "style" && String(value) !== "") {
          out += " " + key + "=\"" + qhtmlEscapeAttribute(value) + "\"";
        }
      }
      const style = this.instanceInlineStyle();
      if (style) {
        out += " style=\"" + qhtmlEscapeAttribute(style) + "\"";
      }
      out += " component-definition=\"" + qhtmlEscapeAttribute(this._definition.qhtmlUUID()) + "\" component-instance=\"" + qhtmlEscapeAttribute(this.qhtmlUUID()) + "\">";
      out += body + "</" + tagName + ">";
      return out;
    }
    instanceInlineStyle() {
      const declarations = [];
      if (trim(this.attribute("style")) !== "") declarations.push(qhtmlInterpolateTextForContext(this.attribute("style"), this));
      for (const child of this.children()) {
        if (child instanceof QHTMLPropertyAssignment) {
          const cssName = qhtmlCssShortcutPropertyName(child.qhtmlName());
          if (cssName) declarations.push(cssName + ":" + qhtmlResolveCssValueForContext(child.value(), this));
        }
      }
      return declarations.join(";");
    }
    sourceQHTML(indentLevel = 0) {
      let header = this._definition ? trim(this._definition.qhtmlName()) : trim(this.keyword());
      if (!header) header = "q-component-instance";
      if (trim(this.qhtmlName())) header += " " + trim(this.qhtmlName());
      return qhtmlSourceBlock(header, this.children().map(child => child.sourceQHTML(0)).join("\n"), indentLevel);
    }
    toJsonObject() {
      return Object.assign(super.toJsonObject(), {
        componentDefinitionUUID: this.componentDefinitionUUID(),
        referenceMembers: this._referenceMembers.map(member => member.toJSON())
      });
    }
  }

  function renderNodeWithSlotsForInstance(node, instance) {
    if (node instanceof QHTMLComponentSlot) return instance.renderSlotForOwnedDefinition(node);
    if (node instanceof QHTMLStyleApplication) {
      return "<q-style-application qhtml-style=\"" + qhtmlEscapeAttribute(node.qhtmlName()) + "\" qhtml-node=\"" +
        qhtmlEscapeAttribute(node.qhtmlUUID()) + "\">" +
        node.children().map(child => renderNodeWithSlotsForInstance(child, instance)).join("") +
        "</q-style-application>";
    }
    if (node instanceof QHTMLThemeApplication) {
      return "<q-theme-application qhtml-theme=\"" + qhtmlEscapeAttribute(node.qhtmlName()) + "\" qhtml-node=\"" +
        qhtmlEscapeAttribute(node.qhtmlUUID()) + "\">" +
        node.children().map(child => renderNodeWithSlotsForInstance(child, instance)).join("") +
        "</q-theme-application>";
    }
    if (node instanceof QHTMLDomElement) {
      let out = "<" + node.tagName();
      for (const [key, value] of Object.entries(node.attributes())) {
        if (key !== "style" && String(value) !== "") out += " " + key + "=\"" + qhtmlEscapeAttribute(value) + "\"";
      }
      const style = node.inlineStyleForContext(instance);
      if (style) out += " style=\"" + qhtmlEscapeAttribute(style) + "\"";
      out += " qhtml-node=\"" + qhtmlEscapeAttribute(node.qhtmlUUID()) + "\">";
      out += node.children().filter(child => !(child instanceof QHTMLPropertyAssignment)).map(child => renderNodeWithSlotsForInstance(child, instance)).join("");
      return out + "</" + node.tagName() + ">";
    }
    return node.renderHtmlInContext(instance);
  }

  function cloneNode(node) {
    return QHTMLNode.nodeFromJsonObject(node.toJSON());
  }

  function reassignNodeUUIDs(node) {
    if (!node || typeof node.setQHTMLUUID !== "function") {
      return;
    }
    node.setQHTMLUUID(createUUID());
    for (const child of node.children()) {
      reassignNodeUUIDs(child);
    }
    if (typeof node.ownedReferenceMembers === "function") {
      for (const member of node.ownedReferenceMembers()) {
        reassignNodeUUIDs(member);
      }
    }
  }

  function iterationValueForExpression(expression, variableName, item) {
    const source = trim(expression);
    if (!source ||
        (source.startsWith("\"") && source.endsWith("\"")) ||
        (source.startsWith("'") && source.endsWith("'")) ||
        (source.startsWith("`") && source.endsWith("`"))) {
      return { matched: false, value: undefined };
    }

    let path = source;
    if (path.startsWith("this.")) {
      path = path.slice(5);
    }
    if (path === variableName) {
      return { matched: true, value: item };
    }

    const prefix = `${variableName}.`;
    if (!path.startsWith(prefix)) {
      return { matched: false, value: undefined };
    }

    let resolved = item;
    for (const part of path.slice(prefix.length).split(".").filter(Boolean)) {
      if (resolved == null) {
        return { matched: true, value: undefined };
      }
      resolved = resolved[part];
    }
    return { matched: true, value: resolved };
  }

  function materializeIterationValue(node, variableName, item) {
    if (!node) {
      return;
    }
    if ((node instanceof QHTMLProperty || node instanceof QHTMLPropertyAssignment) &&
        typeof node.value === "function" &&
        typeof node.setValue === "function") {
      const resolved = iterationValueForExpression(node.value(), variableName, item);
      if (resolved.matched) {
        node.setValue(valueToSource(resolved.value));
      }
    }
    for (const child of node.children()) {
      materializeIterationValue(child, variableName, item);
    }
    if (typeof node.ownedReferenceMembers === "function") {
      for (const member of node.ownedReferenceMembers()) {
        materializeIterationValue(member, variableName, item);
      }
    }
  }

  class QHTMLArrayNode extends QHTMLNode {
    constructor(name = "", values = []) {
      super("QHTMLArrayNode", name);
      this._values = values.slice();
    }
    values() { return this._values.slice(); }
    valueAt(index) { return this._values[index]; }
    append(value) { this._values.push(value); return value; }
    toJsonObject() { return Object.assign(super.toJsonObject(), { values: this.values() }); }
  }

  class QHTMLMapNode extends QHTMLNode {
    constructor(name = "", values = {}) {
      super("QHTMLMapNode", name);
      this._values = Object.assign({}, values);
    }
    values() { return Object.assign({}, this._values); }
    value(key) { return this._values[key]; }
    insert(key, value) { this._values[key] = value; }
    toJsonObject() { return Object.assign(super.toJsonObject(), { values: this.values() }); }
  }

  class QHTMLJsonValue extends QHTMLNode {
    constructor(name = "", value = null) {
      super("QHTMLJsonValue", name);
      this._value = value;
    }
    value() { return this._value; }
    setValue(value) { this._value = value; }
    toJson() { return JSON.stringify(this._value); }
    toJsonJs() { return this.toJson(); }
    valuesLiteral() { return this.toJson(); }
    valuesLiteralJs() { return this.valuesLiteral(); }
    toJsonObject() { return Object.assign(super.toJsonObject(), { value: this._value }); }
  }

  class QHTMLJsonArray extends QHTMLJsonValue {
    constructor(name = "", value = []) { super(name, value); this.setQHTMLType("QHTMLJsonArray"); }
  }

  class QHTMLJsonObject extends QHTMLJsonValue {
    constructor(name = "", value = {}) { super(name, value); this.setQHTMLType("QHTMLJsonObject"); }
  }

  class QHTMLJsonDocument extends QHTMLJsonValue {
    constructor(name = "", value = null) { super(name, value); this.setQHTMLType("QHTMLJsonDocument"); }
    fromJSONText(json) { this._value = JSON.parse(json); return true; }
    toJSONText() { return JSON.stringify(this._value); }
    parse(json) { return this.fromJSONText(json); }
    parseJs(json) { return this.parse(json); }
    isArray() { return Array.isArray(this._value); }
    isObject() { return this._value !== null && typeof this._value === "object" && !Array.isArray(this._value); }
    isEmpty() { return this._value == null || (typeof this._value === "object" && Object.keys(this._value).length === 0); }
    parseError() { return ""; }
    size() { return Array.isArray(this._value) ? this._value.length : (this.isObject() ? Object.keys(this._value).length : 0); }
    rootValue() { return new QHTMLJsonValue("root", this._value); }
    rootValueJs() { return this.rootValue(); }
    array() { return new QHTMLJsonArray(this.qhtmlName(), Array.isArray(this._value) ? this._value : []); }
    arrayJs() { return this.array(); }
    object() { return new QHTMLJsonObject(this.qhtmlName(), this.isObject() ? this._value : {}); }
    objectJs() { return this.object(); }
  }

  class QHTMLArray extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) { super("q-array", name, attributes); this.setQHTMLType("QHTMLArray"); }
    valueArray() {
      return this.children().map(child => {
        if (child instanceof QHTMLProperty) {
          return parseSourceValue(child.value());
        }
        if (child instanceof QHTMLMap) {
          return child.valueObject();
        }
        if (child instanceof QHTMLArray) {
          return child.valueArray();
        }
        if (child instanceof QHTMLJsonValue) {
          return child.value();
        }
        return child.toJSON();
      });
    }
    arrayValue() { return new QHTMLJsonArray(this.qhtmlName(), this.valueArray()); }
    arrayValueJs() { return this.arrayValue(); }
    jsonDocument() { return new QHTMLJsonDocument(this.qhtmlName(), this.valueArray()); }
    jsonDocumentJs() { return this.jsonDocument(); }
    valuesLiteral() { return JSON.stringify(this.valueArray()); }
    valuesLiteralJs() { return this.valuesLiteral(); }
  }

  class QHTMLMap extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) { super("q-map", name, attributes); this.setQHTMLType("QHTMLMap"); }
    valueObject() {
      const out = {};
      for (const child of this.children()) {
        if (child.qhtmlName()) {
          if (child instanceof QHTMLProperty || child instanceof QHTMLPropertyAssignment) {
            out[child.qhtmlName()] = parseSourceValue(child.value());
          } else if (child instanceof QHTMLMap) {
            out[child.qhtmlName()] = child.valueObject();
          } else if (child instanceof QHTMLArray) {
            out[child.qhtmlName()] = child.valueArray();
          } else if (child instanceof QHTMLJsonValue) {
            out[child.qhtmlName()] = child.value();
          } else {
            out[child.qhtmlName()] = child.toJSON();
          }
        }
      }
      return out;
    }
    objectValue() { return new QHTMLJsonObject(this.qhtmlName(), this.valueObject()); }
    objectValueJs() { return this.objectValue(); }
    jsonDocument() { return new QHTMLJsonDocument(this.qhtmlName(), this.valueObject()); }
    jsonDocumentJs() { return this.jsonDocument(); }
    value(key) { return this.valueObject()[key]; }
    valueJs(key) { return this.value(key); }
    keysLiteral() { return JSON.stringify(Object.keys(this.valueObject())); }
    keysLiteralJs() { return this.keysLiteral(); }
    valuesLiteral() { return JSON.stringify(this.valueObject()); }
    valuesLiteralJs() { return this.valuesLiteral(); }
  }

  class QHTMLModel extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) { super("q-model", name, attributes); this.setQHTMLType("QHTMLModel"); }
    jsonDocument() {
      const child = this.children().find(item => item instanceof QHTMLArray || item instanceof QHTMLMap || item instanceof QHTMLJsonDocument);
      if (child instanceof QHTMLJsonDocument) return child;
      if (child instanceof QHTMLArray) return child.jsonDocument();
      if (child instanceof QHTMLMap) return child.jsonDocument();
      return new QHTMLJsonDocument(this.qhtmlName(), []);
    }
    jsonDocumentJs() { return this.jsonDocument(); }
    valuesLiteral() { return this.jsonDocument().toJSONText(); }
    valuesLiteralJs() { return this.valuesLiteral(); }
  }

  class QHTMLProperty extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) {
      super("q-property", name, attributes);
      this.setQHTMLType("QHTMLProperty");
      this.setProperty("kind", "property");
      this._value = attributes.value == null ? "" : String(attributes.value);
      this._structuredValue = undefined;
    }
    value() { return this._value; }
    valueJs() { return this.value(); }
    setValue(value) { this._value = String(value == null ? "" : value); this.setAttribute("value", this._value); this.maybeLog("Property " + this.qhtmlName() + " set to " + this._value); }
    setValueJs(value) { this.setValue(value); }
    jsValue() { return parseSourceValue(this._value); }
    structuredType() {
      const value = this.jsValue();
      if (Array.isArray(value)) return "QHTMLJsonArray";
      if (value && typeof value === "object") return "QHTMLJsonObject";
      return "";
    }
    structuredTypeJs() { return this.structuredType(); }
    structuredValue() { return this._structuredValue; }
    structuredValueJs() {
      if (this._structuredValue) return this._structuredValue;
      const value = this.jsValue();
      if (Array.isArray(value)) return new QHTMLJsonArray(this.qhtmlName(), value);
      if (value && typeof value === "object") return new QHTMLJsonObject(this.qhtmlName(), value);
      return null;
    }
    valueArray() {
      if (this._structuredValue && Array.isArray(this._structuredValue)) {
        return this._structuredValue.slice();
      }
      if (this._value === "q-array") {
        return this.children().map(child => {
          if (child instanceof QHTMLMap) return child.valueObject();
          if (child instanceof QHTMLArray) return child.valueArray();
          if (child instanceof QHTMLProperty) return child.jsValue();
          if (child instanceof QHTMLPropertyAssignment) return parseSourceValue(child.value());
          if (child instanceof QHTMLJsonValue) return child.value();
          return child.toJSON();
        });
      }
      const value = this.jsValue();
      return Array.isArray(value) ? value.slice() : [];
    }
    valueArrayJs() { return this.valueArray(); }
    valueObject() {
      if (this._structuredValue && typeof this._structuredValue === "object" && !Array.isArray(this._structuredValue)) {
        return Object.assign({}, this._structuredValue);
      }
      if (this._value === "q-map") {
        const out = {};
        for (const child of this.children()) {
          if (child.qhtmlName()) {
            out[child.qhtmlName()] = child instanceof QHTMLPropertyAssignment || child instanceof QHTMLProperty
              ? parseSourceValue(child.value())
              : child.toJSON();
          }
        }
        return out;
      }
      const value = this.jsValue();
      return value && typeof value === "object" && !Array.isArray(value) ? Object.assign({}, value) : {};
    }
    valueObjectJs() { return this.valueObject(); }
    valuesLiteral() {
      if (this._value === "q-array") return JSON.stringify(this.valueArray());
      if (this._value === "q-map") return JSON.stringify(this.valueObject());
      return JSON.stringify(this.jsValue());
    }
    valuesLiteralJs() { return this.valuesLiteral(); }
    setStructuredValue(value) { this._structuredValue = value; this._value = valueToSource(value); }
    cloneProperty() {
      return QHTMLNode.nodeFromJsonObject(this.toJSON());
    }
    renderHtml() { return ""; }
    sourceQHTML(indentLevel = 0) {
      return qhtmlSourceIndent(indentLevel) + "q-property " + this.qhtmlName() + (this._value !== "" ? ": " + this._value : "");
    }
    toJsonObject() { return Object.assign(super.toJsonObject(), { value: this._value }); }
  }

  class QHTMLJavaScriptRuntime {
    constructor() { this._compiled = []; }
    isAvailable() { return false; }
    compileOnly(source) { this._compiled.push(String(source)); return true; }
    compiledSources() { return this._compiled.slice(); }
  }

  class QHTMLImportNode extends QHTMLTypedNode {
    constructor(name = "", attributes = {}, body = "") {
      super(name === "q-require" ? "q-require" : "q-import", "", attributes);
      this.setQHTMLType("QHTMLImportNode");
      this._body = trim(body);
    }
    body() { return this._body; }
    bodyJs() { return this.body(); }
    setBody(body) { this._body = trim(body); }
    setBodyJs(body) { this.setBody(body); }
    path() { return (this._body.replace(/[{}]/g, "").trim().split(/\s+/).filter(Boolean)[0] || "").replace(/^["'`]|["'`]$/g, ""); }
    pathJs() { return this.path(); }
    cacheMode() {
      const parts = this._body.split(/\s+/).filter(Boolean);
      return parts.includes("cache") ? "cache" : (parts.includes("nocache") ? "nocache" : "default");
    }
    cacheModeJs() { return this.cacheMode(); }
    isRequire() { return this.keyword() === "q-require"; }
    importKind() { return this.keyword(); }
    importKindJs() { return this.importKind(); }
    renderHtml() { return ""; }
    sourceQHTML(indentLevel = 0) { return qhtmlSourceBlock("q-import", this._body, indentLevel); }
    toJsonObject() { return Object.assign(super.toJsonObject(), bodyJsonFields(this._body)); }
  }

  class QHTMLForNode extends QHTMLTypedNode {
    constructor(name = "", attributes = {}, body = "") {
      super("q-for", name, attributes);
      this.setQHTMLType("QHTMLForNode");
      this._variableName = name || attributes.as || attributes.variable || "item";
      this._collectionExpression = attributes.collection || attributes.in || attributes.model || attributes.items || "";
      this._body = trim(body);
      this._lastRenderedIterationNodes = [];
    }
    variableName() { return this._variableName; }
    variableNameJs() { return this.variableName(); }
    setVariableName(value) { this._variableName = trim(value); this.setQHTMLName(this._variableName); }
    collectionExpression() { return this._collectionExpression; }
    collectionExpressionJs() { return this.collectionExpression(); }
    setCollectionExpression(value) { this._collectionExpression = trim(value); this.setAttribute("collection", this._collectionExpression); }
    body() { return this._body; }
    bodyJs() { return this.body(); }
    setBody(body) { this._body = trim(body); }
    setBodyJs(body) { this.setBody(body); }
    renderHtmlInContext(contextNode) {
      const collectionName = this.collectionExpression();
      const itemName = this.variableName();
      const collection = qhtmlResolveExpressionValue(collectionName, contextNode);
      let values = [];
      if (Array.isArray(collection)) {
        values = collection;
      } else if (collection && typeof collection.valueArray === "function") {
        values = collection.valueArray();
      } else if (collection && typeof collection.valuesLiteral === "function") {
        try {
          const parsedValues = JSON.parse(collection.valuesLiteral());
          values = Array.isArray(parsedValues) ? parsedValues : [];
        } catch (error) {
          values = [];
        }
      }
      this._lastRenderedIterationNodes = [];
      return values.map(item => {
        const local = new QHTMLNode("QHTMLForIteration", itemName);
        local.qhtmlContext.setParentContext(contextNode ? contextNode.qhtmlContext : null);
        local.updateKeywordReference(itemName, typeof item === "object" ? JSON.stringify(item) : String(item));
        return this.children().map(child => {
          const cloned = cloneNode(child);
          reassignNodeUUIDs(cloned);
          if (cloned instanceof QHTMLComponentInstance && child instanceof QHTMLComponentInstance) {
            cloned.setDefinition(child.definition());
          }
          materializeIterationValue(cloned, itemName, item);
          local.appendChild(cloned);
          this._lastRenderedIterationNodes.push(cloned);
          return cloned.renderHtmlInContext(local);
        }).join("");
      }).join("");
    }
    lastRenderedIterationNodes() { return this._lastRenderedIterationNodes.slice(); }
    lastRenderedIterationNodesJs() { return this.lastRenderedIterationNodes(); }
    renderHtml() { return "<!--qhtml-for-start:" + this.qhtmlUUID() + "--><!--qhtml-for-end:" + this.qhtmlUUID() + "-->"; }
    toJsonObject() {
      return Object.assign(super.toJsonObject(), bodyJsonFields(this._body), {
        qhtmlVariable: this._variableName,
        variable: this._variableName,
        qhtmlCollection: this._collectionExpression,
        collection: this._collectionExpression
      });
    }
  }

  class QHTMLEventHandler extends QHTMLTypedNode {
    constructor(name = "", attributes = {}, body = "") {
      super(name || "onclick", "", attributes);
      this.setQHTMLType("QHTMLEventHandler");
      this._eventName = name || attributes.eventName || attributes.event || "";
      this._parameters = parseParameters(attributes.parameters || "");
      this._body = trim(body);
      this._propagate = attributes.propagate === "true" || attributes.propagate === true;
    }
    eventName() { return this._eventName; }
    eventNameJs() { return this.eventName(); }
    parameters() { return this.parameterList(); }
    parameterList() { return this._parameters.join(", "); }
    parameterListJs() { return this.parameterList(); }
    body() { return this._body; }
    bodyJs() { return this.body(); }
    propagate() { return this._propagate; }
    renderHtml() { return ""; }
    sourceQHTML(indentLevel = 0) {
      const eventHeader = "on" + this._eventName + (this.parameterList() ? "(" + this.parameterList() + ")" : "");
      return qhtmlSourceBlock(eventHeader, this._body, indentLevel);
    }
    toJsonObject() { return Object.assign(super.toJsonObject(), { eventName: this._eventName, body: base64EncodeUtf8(this._body), bodyEncoding: "base64" }); }
  }

  class QHTMLPainter extends QHTMLTypedNode {
    constructor(name = "", attributes = {}, body = "") {
      super("q-painter", name, attributes);
      this.setQHTMLType("QHTMLPainter");
      this._body = trim(body);
    }
    body() { return this._body; }
    setBody(body) { this._body = trim(body); }
    setBodyJs(body) { this.setBody(body); }
    paintHandler() {
      return this.children().find(child => child instanceof QHTMLEventHandler && /^(?:on)?paint/i.test(child.eventName())) || null;
    }
    paintHandlerJs() { return this.paintHandler(); }
    renderHtml() { return ""; }
    sourceQHTML(indentLevel = 0) { return qhtmlSourceBlock("q-painter" + (this.qhtmlName() ? " " + this.qhtmlName() : ""), this._body, indentLevel); }
    toJsonObject() { return Object.assign(super.toJsonObject(), bodyJsonFields(this._body)); }
  }

  class QHTMLCanvas extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) {
      super("q-canvas", name, attributes);
      this.setQHTMLType("QHTMLCanvas");
    }
    renderHtml() {
      const attrs = Object.entries(this.attributes()).map(([key, value]) => " " + key + "=\"" + qhtmlEscapeAttribute(value) + "\"").join("");
      return "<canvas" + attrs + " qhtml-node=\"" + qhtmlEscapeAttribute(this.qhtmlUUID()) + "\"></canvas>";
    }
    paintHandler() {
      return this.children().find(child => child instanceof QHTMLEventHandler && /^(?:on)?paint/i.test(child.eventName())) || null;
    }
    paintHandlerJs() { return this.paintHandler(); }
    paintBody() {
      const handler = this.paintHandler();
      return handler ? handler.body() : "";
    }
    paintBodyJs() { return this.paintBody(); }
  }

  class QHTMLVideoAsset extends QHTMLReference {
    constructor(name = "", attributes = {}) { super("QHTMLVideoAsset", name); this.attributes = Object.assign({}, attributes); }
  }

  class QHTMLVideoPlayer extends QHTMLReference {
    constructor(name = "", attributes = {}) { super("QHTMLVideoPlayer", name); this.attributes = Object.assign({}, attributes); }
  }

  class QHTMLVideo extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) {
      super("q-video", name, attributes);
      this.setQHTMLType("QHTMLVideo");
    }
    renderHtml() {
      const attrs = Object.entries(this.attributes()).map(([key, value]) => " " + key + "=\"" + qhtmlEscapeAttribute(value) + "\"").join("");
      return "<video" + attrs + " qhtml-node=\"" + qhtmlEscapeAttribute(this.qhtmlUUID()) + "\">" + super.renderHtml() + "</video>";
    }
  }

  class QHTMLParticleEmitter extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) {
      super("particle-emitter", name, attributes);
      this.setQHTMLType("QHTMLParticleEmitter");
    }
    renderHtml() {
      const attrs = Object.entries(this.attributes()).map(([key, value]) => " " + key + "=\"" + qhtmlEscapeAttribute(value) + "\"").join("");
      return "<particle-emitter" + attrs + " qhtml-node=\"" + qhtmlEscapeAttribute(this.qhtmlUUID()) + "\"></particle-emitter>";
    }
  }

  class QHTMLConnect extends QHTMLTypedNode {
    constructor(name = "", attributes = {}, body = "") {
      super("connect", name, attributes);
      this.setQHTMLType("QHTMLConnect");
      this._body = trim(body);
    }
    body() { return this._body; }
    bodyJs() { return this.body(); }
    setBody(body) { this._body = trim(body); }
    setBodyJs(body) { this.setBody(body); }
    sourcePath() { return this.attribute("source") || this.attribute("from"); }
    sourcePathJs() { return this.sourcePath(); }
    targetPath() { return this.attribute("target") || this.attribute("to"); }
    targetPathJs() { return this.targetPath(); }
    renderHtml() { return ""; }
    toJsonObject() { return Object.assign(super.toJsonObject(), bodyJsonFields(this._body)); }
  }

  class QHTMLTimer extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) {
      super("q-timer", name, attributes);
      this.setQHTMLType("QHTMLTimer");
      this._timeoutSignal = new QHTMLSignal("timeout");
      this.appendChild(this._timeoutSignal);
    }
    timeoutSignal() { return this._timeoutSignal; }
    renderHtml() { return ""; }
  }

  class QHTMLPropertyAnimation extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) {
      super("q-property-animation", name, attributes);
      this.setQHTMLType("QHTMLPropertyAnimation");
      this._signals = {
        started: new QHTMLSignal("started"),
        stopped: new QHTMLSignal("stopped"),
        stepped: new QHTMLSignal("stepped", { parameters: "value, currentStep" }),
        ended: new QHTMLSignal("ended"),
        finished: new QHTMLSignal("finished")
      };
      for (const signal of Object.values(this._signals)) {
        this.appendChild(signal);
      }
    }
    startedSignal() { return this._signals.started; }
    stoppedSignal() { return this._signals.stopped; }
    steppedSignal() { return this._signals.stepped; }
    endedSignal() { return this._signals.ended; }
    finishedSignal() { return this._signals.finished; }
    renderHtml() { return ""; }
  }

  class QHTMLScriptAction extends QHTMLTypedNode {
    constructor(name = "", attributes = {}, body = "") { super("q-script-action", name, attributes); this.setQHTMLType("QHTMLScriptAction"); this._body = trim(body); }
    body() { return this._body; }
    bodyJs() { return this.body(); }
    setBody(body) { this._body = trim(body); }
    setBodyJs(body) { this.setBody(body); }
    renderHtml() { return ""; }
    toJsonObject() { return Object.assign(super.toJsonObject(), bodyJsonFields(this._body)); }
  }

  class QHTMLAnimationGroup extends QHTMLTypedNode {
    constructor(keyword = "q-animation-group", name = "", attributes = {}) { super(keyword, name, attributes); this.setQHTMLType("QHTMLAnimationGroup"); }
    renderHtml() { return ""; }
  }
  class QHTMLSequentialAnimation extends QHTMLAnimationGroup {
    constructor(name = "", attributes = {}) { super("q-sequential-animation", name, attributes); this.setQHTMLType("QHTMLSequentialAnimation"); }
  }
  class QHTMLParallelAnimation extends QHTMLAnimationGroup {
    constructor(name = "", attributes = {}) { super("q-parallel-animation", name, attributes); this.setQHTMLType("QHTMLParallelAnimation"); }
  }
  class QHTMLBehavior extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) { super("q-behavior", name, attributes); this.setQHTMLType("QHTMLBehavior"); }
    propertyName() { return this.attribute("property") || this.qhtmlName(); }
    propertyNameJs() { return this.propertyName(); }
    renderHtml() { return ""; }
    sourceQHTML(indentLevel = 0) {
      return qhtmlSourceBlock("behavior on " + this.propertyName(), this.children().map(child => child.sourceQHTML(0)).join("\n"), indentLevel);
    }
  }

  class QHTMLStyle extends QHTMLTypedNode {
    constructor(name = "", attributes = {}, body = "") { super("q-style", name, attributes); this.setQHTMLType("QHTMLStyle"); this._body = trim(body); }
    body() { return this._body; }
    bodyJs() { return this.body(); }
    setBody(body) { this._body = trim(body); }
    setBodyJs(body) { this.setBody(body); }
    cssText() { return this.attribute("cssText") || this._body || this.declarations(this); }
    cssTextJs() { return this.cssText(); }
    setCssText(value) { this._body = String(value == null ? "" : value); }
    setCssTextJs(value) { this.setCssText(value); }
    classList() { return this.attribute("class") || this.attribute("classes") || ""; }
    classListJs() { return this.classList(); }
    declarations(contextNode = this) {
      return this.children().filter(child => child instanceof QHTMLPropertyAssignment).map(child => {
        const cssName = qhtmlCssShortcutPropertyName(child.qhtmlName()) || child.qhtmlName();
        return cssName + ":" + qhtmlResolveCssValueForContext(child.value(), contextNode);
      }).join(";");
    }
    renderHtml() { return ""; }
    toJsonObject() { return Object.assign(super.toJsonObject(), bodyJsonFields(this._body)); }
  }

  class QHTMLTransition extends QHTMLTypedNode {
    constructor(name = "", attributes = {}, body = "") { super("q-transition", name, attributes); this.setQHTMLType("QHTMLTransition"); this._body = trim(body); }
    body() { return this._body; }
    bodyJs() { return this.body(); }
    setBody(body) { this._body = trim(body); }
    setBodyJs(body) { this.setBody(body); }
    property() { return this.attribute("property"); }
    duration() { return this.attribute("duration") || childAssignmentValue(this, "duration"); }
    timing() { return this.attribute("timing") || childAssignmentValue(this, "timing") || "ease"; }
    delay() { return this.attribute("delay") || childAssignmentValue(this, "delay"); }
    renderHtml() { return ""; }
    toJsonObject() { return Object.assign(super.toJsonObject(), bodyJsonFields(this._body)); }
  }

  class QHTMLTransitionApplication extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) { super("q-transition-application", name, attributes); this.setQHTMLType("QHTMLTransitionApplication"); }
    propertyList() { return this.property("properties") || this.children().map(child => child.sourceQHTML(0)).join(" "); }
    propertyListJs() { return this.propertyList(); }
    renderHtml() { return ""; }
    sourceQHTML(indentLevel = 0) { return qhtmlSourceBlock(this.qhtmlName(), this.propertyList(), indentLevel); }
  }

  class QHTMLTheme extends QHTMLTypedNode {
    constructor(name = "", attributes = {}, body = "") { super("q-theme", name, attributes); this.setQHTMLType("QHTMLTheme"); this._body = trim(body); }
    body() { return this._body; }
    bodyJs() { return this.body(); }
    setBody(body) { this._body = trim(body); }
    setBodyJs(body) { this.setBody(body); }
    isDefaultTheme() { return this.keyword() === "q-default-theme" || this.attribute("default") === "true"; }
    renderHtml() { return ""; }
    sourceQHTML(indentLevel = 0) {
      let header = this.keyword();
      if (this.qhtmlName()) {
        header += " " + this.qhtmlName();
      }
      return qhtmlSourceBlock(header, this._body || this.children().map(child => child.sourceQHTML(0)).join("\n"), indentLevel);
    }
    toJsonObject() { return Object.assign(super.toJsonObject(), bodyJsonFields(this._body)); }
  }

  class QHTMLStyleApplication extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) { super("q-style-application", name, attributes); this.setQHTMLType("QHTMLStyleApplication"); }
    renderHtml() {
      return "<q-style-application qhtml-style=\"" + qhtmlEscapeAttribute(this.qhtmlName()) + "\" qhtml-node=\"" +
        qhtmlEscapeAttribute(this.qhtmlUUID()) + "\">" +
        this.children().map(child => child.renderHtml()).join("") +
        "</q-style-application>";
    }
  }

  class QHTMLThemeApplication extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) { super("q-theme-application", name, attributes); this.setQHTMLType("QHTMLThemeApplication"); }
    renderHtml() {
      return "<q-theme-application qhtml-theme=\"" + qhtmlEscapeAttribute(this.qhtmlName()) + "\" qhtml-node=\"" +
        qhtmlEscapeAttribute(this.qhtmlUUID()) + "\">" +
        this.children().map(child => child.renderHtml()).join("") +
        "</q-theme-application>";
    }
  }

  class QHTMLSlot extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) { super("slot", name, attributes); this.setQHTMLType("QHTMLSlot"); }
  }
  class QHTMLClass extends QHTMLTypedNode {
    constructor(name = "", attributes = {}, body = "") { super("q-class", name, attributes); this.setQHTMLType("QHTMLClass"); this._body = trim(body); }
    body() { return this._body; }
    bodyJs() { return this.body(); }
    setBody(body) { this._body = trim(body); }
    setBodyJs(body) { this.setBody(body); }
    renderHtml() { return ""; }
    toJsonObject() { return Object.assign(super.toJsonObject(), bodyJsonFields(this._body)); }
  }
  class QHTMLVar extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) { super("q-var", name, attributes); this.setQHTMLType("QHTMLVar"); }
    renderHtml() { return ""; }
  }
  class QHTMLTemplate extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) { super("q-template", name, attributes); this.setQHTMLType("QHTMLTemplate"); }
    renderHtml() { return ""; }
  }
  class QHTMLScript extends QHTMLTypedNode {
    constructor(name = "", attributes = {}, body = "") { super("q-script", name, attributes); this.setQHTMLType("QHTMLScript"); this._body = trim(body); }
    body() { return this._body; }
    renderHtml() { return ""; }
    toJsonObject() { return Object.assign(super.toJsonObject(), bodyJsonFields(this._body)); }
  }
  class QHTMLModelView extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) { super("q-model-view", name, attributes); this.setQHTMLType("QHTMLModelView"); }
    aliasName() { return this.attribute("as") || this.attribute("alias") || "item"; }
    aliasNameJs() { return this.aliasName(); }
    modelDocument() {
      const modelChild = this.children().find(child => child instanceof QHTMLModel || child instanceof QHTMLArray || child instanceof QHTMLMap || child instanceof QHTMLJsonDocument);
      return modelChild instanceof QHTMLJsonDocument ? modelChild : null;
    }
    modelDocumentJs() { return this.modelDocument(); }
  }
  class QHTMLFactory extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) { super("q-factory", name, attributes); this.setQHTMLType("QHTMLFactory"); }
  }
  class QHTMLMethod extends QHTMLTypedNode {
    constructor(name = "", attributes = {}, body = "") { super("q-method", name, attributes); this.setQHTMLType("QHTMLMethod"); this._body = trim(body); }
    body() { return this._body; }
    bodyJs() { return this.body(); }
    renderHtml() { return ""; }
    toJsonObject() { return Object.assign(super.toJsonObject(), bodyJsonFields(this._body)); }
  }
  class QHTMLSourceFragment extends QHTMLTypedNode {
    constructor(value = "") { super("q-source-fragment", "source", {}); this.setQHTMLType("QHTMLSourceFragment"); this._value = String(value || ""); }
    sourceQHTML(indentLevel = 0) { return this._value.split("\n").map(line => qhtmlSourceIndent(indentLevel) + line).join("\n"); }
    renderHtml() { return ""; }
  }

  class QHTMLWorker extends QHTMLTypedNode {
    constructor(name = "", attributes = {}) { super("q-worker", name, attributes); this.setQHTMLType("QHTMLWorker"); }
    renderHtml() { return ""; }
  }

  function qhtmlReferenceBearingNode(node) {
    return node instanceof QHTMLComponentDefinition ||
      node instanceof QHTMLComponentInstance ||
      node instanceof QHTMLProperty ||
      node instanceof QHTMLPropertyAssignment ||
      node instanceof QHTMLFunction ||
      node instanceof QHTMLSignal ||
      node instanceof QHTMLComponentInstanceSlot ||
      node instanceof QHTMLTimer ||
      node instanceof QHTMLPropertyAnimation ||
      node instanceof QHTMLSequentialAnimation ||
      node instanceof QHTMLParallelAnimation ||
      node instanceof QHTMLScriptAction ||
      node instanceof QHTMLWorker ||
      node instanceof QHTMLPainter ||
      node instanceof QHTMLStyle ||
      node instanceof QHTMLTheme ||
      node instanceof QHTMLTransition ||
      node instanceof QHTMLClass ||
      node instanceof QHTMLCanvas ||
      node instanceof QHTMLVideo ||
      node instanceof QHTMLParticleEmitter ||
      node instanceof QHTMLModelView ||
      node instanceof QHTMLLayout ||
      node instanceof QHTMLRowLayout ||
      node instanceof QHTMLColumnLayout;
  }

  function qhtmlAddNamedReference(map, node) {
    if (!node || !qhtmlReferenceBearingNode(node) || !node.qhtmlName()) {
      return;
    }
    map.set(node.qhtmlName(), node);
  }

  function qhtmlCloneReferenceMap(map) {
    return new Map(map ? Array.from(map.entries()) : []);
  }

  function qhtmlCollectScopeReferences(node, map, visited = new Set()) {
    if (!node || visited.has(node.qhtmlUUID())) {
      return;
    }
    visited.add(node.qhtmlUUID());
    for (const child of node.children()) {
      qhtmlAddNamedReference(map, child);
      if (child instanceof QHTMLComponentDefinition || child instanceof QHTMLComponentInstance) {
        continue;
      }
      qhtmlCollectScopeReferences(child, map, visited);
    }
    for (const member of node.ownedReferenceMembers()) {
      qhtmlAddNamedReference(map, member);
    }
  }

  function qhtmlApplyReferenceMap(node, map, parentContext = null) {
    node.clearQHTMLReferences();
    node.qhtmlContext.clearReferences();
    node.qhtmlContext.setParentContext(parentContext);
    map.forEach((reference, name) => {
      if (!reference || reference.qhtmlUUID() === node.qhtmlUUID()) {
        return;
      }
      node.addQHTMLReference(name, reference);
      node.updateObjectReference(name, reference);
    });
  }

  function qhtmlRebuildReferencesInScope(scopeNode, inheritedMap = new Map(), parentContext = null, visited = new Set()) {
    if (!scopeNode || visited.has(scopeNode.qhtmlUUID())) {
      return;
    }
    visited.add(scopeNode.qhtmlUUID());

    const scopeMap = qhtmlCloneReferenceMap(inheritedMap);
    if (scopeNode instanceof QHTMLComponentInstance && scopeNode.definition()) {
      qhtmlCollectScopeReferences(scopeNode.definition(), scopeMap);
    }
    qhtmlCollectScopeReferences(scopeNode, scopeMap);

    qhtmlApplyReferenceMap(scopeNode, scopeMap, parentContext);
    const scopeContext = scopeNode.qhtmlContext;

    const applyChildren = function (node) {
      const nodeContext = node.qhtmlContext || scopeContext;
      for (const child of node.children()) {
        if (child instanceof QHTMLComponentDefinition || child instanceof QHTMLComponentInstance) {
          qhtmlRebuildReferencesInScope(child, scopeMap, nodeContext, visited);
          continue;
        }
        qhtmlApplyReferenceMap(child, scopeMap, nodeContext);
        applyChildren(child);
      }
      for (const member of node.ownedReferenceMembers()) {
        qhtmlApplyReferenceMap(member, scopeMap, nodeContext);
        applyChildren(member);
      }
    };

    applyChildren(scopeNode);
  }

  function qhtmlComponentDefinitionFromContextValue(value) {
    if (value instanceof QHTMLComponentDefinition) {
      return value;
    }
    if (value instanceof QHTMLComponentInstance) {
      return value.definition();
    }
    if (!value) {
      return null;
    }
    if (value.qhtmlNode instanceof QHTMLComponentDefinition) {
      return value.qhtmlNode;
    }
    if (typeof value.componentDefinition === "function") {
      const definition = value.componentDefinition();
      if (definition instanceof QHTMLComponentDefinition) {
        return definition;
      }
    }
    if (typeof value.definition === "function") {
      const definition = value.definition();
      if (definition instanceof QHTMLComponentDefinition) {
        return definition;
      }
    }
    return null;
  }

  function qhtmlMoveChildren(sourceNode, targetNode) {
    while (sourceNode.childCount() > 0) {
      targetNode.appendChild(sourceNode.takeChildAt(0));
    }
  }

  function qhtmlPromoteDomElementToComponentInstance(node, definition) {
    const attributes = node.attributes();
    const instanceName = trim(attributes.id || attributes.name || "");
    const instance = new QHTMLComponentInstance(instanceName, attributes, definition);
    instance.setQHTMLUUID(node.qhtmlUUID());
    instance.setProperty("qhtmlComponentName", definition.qhtmlName());
    instance.setProperty("componentName", definition.qhtmlName());

    const slotsByName = new Map();
    for (const slot of definition.findChildrenByType("QHTMLComponentSlot")) {
      if (slot.qhtmlName()) {
        slotsByName.set(slot.qhtmlName(), slot);
      }
    }

    while (node.childCount() > 0) {
      const child = node.takeChildAt(0);
      const slotName = child instanceof QHTMLDomElement ? child.tagName() : "";
      if (slotName && slotsByName.has(slotName)) {
        const slotView = new QHTMLComponentInstanceSlot(instance, slotsByName.get(slotName), slotName);
        slotView.setQHTMLUUID(child.qhtmlUUID());
        qhtmlMoveChildren(child, slotView);
        instance.appendChild(slotView);
      } else {
        instance.appendChild(child);
      }
    }
    return instance;
  }

  function qhtmlResolveDynamicComponentsInContainer(container) {
    let promoted = 0;
    for (let index = 0; index < container.childCount(); index += 1) {
      let child = container.childAt(index);
      if (child instanceof QHTMLDomElement) {
        const componentName = child.tagName();
        const definition = qhtmlComponentDefinitionFromContextValue(child.resolve(componentName));
        if (definition) {
          const replacement = qhtmlPromoteDomElementToComponentInstance(child, definition);
          container.takeChildAt(index);
          container.insertChild(index, replacement);
          child = replacement;
          promoted += 1;
        }
      }
      promoted += qhtmlResolveDynamicComponentsInContainer(child);
      for (const member of child.ownedReferenceMembers()) {
        promoted += qhtmlResolveDynamicComponentsInContainer(member);
      }
    }
    return promoted;
  }

  class QHTMLDomTree extends QHTMLDomNode {
    constructor() {
      super("QHTMLDomTree", "root");
      this.qhtmlSignalBus = new QHTMLSignalBus();
      this.qhtmlJavaScriptRuntime = new QHTMLJavaScriptRuntime();
      this._qhtmlRenderHandler = null;
    }
    setRenderHandler(handler) {
      this._qhtmlRenderHandler = typeof handler === "function" ? handler : null;
      return this;
    }
    setRenderHandlerJs(handler) { return this.setRenderHandler(handler); }
    renderHandler() { return this._qhtmlRenderHandler; }
    clearRenderHandler() { this._qhtmlRenderHandler = null; }
    clear() { this.clearChildren(); }
    root() { return this; }
    rootJs() { return this.root(); }
    signalBus() { return this.qhtmlSignalBus; }
    signalBusJs() { return this.signalBus(); }
    javascriptRuntime() { return this.qhtmlJavaScriptRuntime; }
    quickJSAvailable() { return this.qhtmlJavaScriptRuntime.isAvailable(); }
    quickJSAvailableJs() { return this.quickJSAvailable(); }
    compileJavaScript(source) { return this.qhtmlJavaScriptRuntime.compileOnly(source); }
    compileJavaScriptJs(source) { return this.compileJavaScript(source); }
    renderHtml() { return this.children().map(child => child.renderHtml()).join(""); }
    fromJSON(value) {
      if (Array.isArray(value)) {
        this.clearChildren();
        this.clearQHTMLReferences();
        for (const childObject of value) {
          this.appendChild(QHTMLNode.nodeFromJsonObject(childObject, this));
        }
        this.resolveComponentInstanceDefinitions();
        this.rebuildQHTMLReferences();
        return true;
      }
      const loaded = QHTMLNode.prototype.fromJsonObject.call(this, value);
      this.resolveComponentInstanceDefinitions();
      this.rebuildQHTMLReferences();
      return loaded;
    }
    fromJsonValue(value) { return this.fromJSON(value); }
    fromJsonObject(object) {
      const loaded = QHTMLNode.prototype.fromJsonObject.call(this, object);
      this.resolveComponentInstanceDefinitions();
      this.rebuildQHTMLReferences();
      return loaded;
    }
    fromJSONText(json) { return this.fromJSON(JSON.parse(json)); }
    fromJSONTextJs(json) { return this.fromJSONText(json); }
    toJSON() { return this.children().map(child => child.toJSON()); }
    toJSONJs() { return this.toJSON(); }
    toJSONText() { return JSON.stringify(this.toJSON()); }
    toJSONTextJs() { return this.toJSONText(); }
    walk(visitor) {
      const visit = (node) => {
        visitor(node);
        for (const child of node.children()) {
          visit(child);
        }
        for (const member of node.ownedReferenceMembers()) {
          visit(member);
        }
      };
      visit(this);
    }
    resolveDynamicComponentDefinitions() {
      return qhtmlResolveDynamicComponentsInContainer(this);
    }
    resolveDynamicComponentDefinitionsJs() { return this.resolveDynamicComponentDefinitions(); }
    resolveComponentInstanceDefinitions() {
      const definitionsByName = new Map();
      const definitionsByUuid = new Map();
      this.walk((node) => {
        if (node instanceof QHTMLComponentDefinition) {
          if (node.qhtmlName()) {
            definitionsByName.set(node.qhtmlName(), node);
          }
          definitionsByUuid.set(node.qhtmlUUID(), node);
        }
      });
      this.walk((node) => {
        if (!(node instanceof QHTMLComponentInstance)) {
          return;
        }
        const componentName = node.property("qhtmlComponentName") || node.property("componentName");
        const contextualDefinition = componentName
          ? qhtmlComponentDefinitionFromContextValue(node.resolve(componentName))
          : null;
        const definition = definitionsByUuid.get(node.componentDefinitionUUID()) ||
          (componentName ? definitionsByName.get(componentName) : null) ||
          contextualDefinition ||
          (node.definition() ? definitionsByUuid.get(node.definition().qhtmlUUID()) || node.definition() : null);
        if (definition) {
          node.setDefinition(definition);
          node.setProperty("qhtmlComponentName", definition.qhtmlName());
          node.setProperty("componentName", definition.qhtmlName());
        }
      });
    }
    rebuildQHTMLReferences() {
      qhtmlRebuildReferencesInScope(this, new Map(), this.qhtmlContext.parentContext ? this.qhtmlContext.parentContext() : null);
      return true;
    }
    rebuildQHTMLReferencesJs() { return this.rebuildQHTMLReferences(); }
    prepareRender() {
      this.resolveDynamicComponentDefinitions();
      this.resolveComponentInstanceDefinitions();
      this.rebuildQHTMLReferences();
      this.runtime();
      return this;
    }
    prepareRenderJs() { return this.prepareRender(); }
    toHTML() {
      const body = this.renderHtml();
      return "<!doctype html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<meta name=\"generator\" content=\"QHTML7 standalone web exporter " + qhtmlEscapeAttribute(qhtmlVersionString()) + "\">\n<title>QHTML Export</title>\n</head>\n<body>\n" + body + "\n</body>\n</html>";
    }
    toJsonObject() { return Object.assign(super.toJsonObject(), { qhtmlType: "QHTMLDomTree" }); }
  }

  const QHTMLJsonTools = Object.freeze({
    parse: JSON.parse.bind(JSON),
    stringify: JSON.stringify.bind(JSON)
  });

  const api = {
    QHTML_VERSION_FALLBACK,
    CSS_SHORTCUTS,
    QHTMLHash,
    QHTMLString,
    QHTMLReference,
    QHTMLKeyword,
    QHTMLNamedReference,
    QHTMLObjectReference,
    QHTMLContext,
    QHTMLNode,
    QHTMLDomNode,
    QHTMLDomElement,
    QHTMLTextFragment,
    QHTMLHTMLFragment,
    QHTMLUnknownFragment,
    QHTMLTypedNode,
    QHTMLLogger,
    QHTMLJavaScriptBlock,
    QHTMLFunction,
    QHTMLSignal,
    QHTMLSignalConnection,
    QHTMLSignalBus,
    QHTMLComponentSlot,
    QHTMLSlotDefault,
    QHTMLPropertyAssignment,
    QHTMLLayout,
    QHTMLRowLayout,
    QHTMLColumnLayout,
    QHTMLComponentInstanceSlot,
    QHTMLComponentDefinition,
    QHTMLComponentInstance,
    QHTMLWorker,
    QHTMLArrayNode,
    QHTMLMapNode,
    QHTMLJsonTools,
    QHTMLJsonValue,
    QHTMLJsonArray,
    QHTMLJsonObject,
    QHTMLJsonDocument,
    QHTMLArray,
    QHTMLMap,
    QHTMLModel,
    QHTMLProperty,
    QHTMLJavaScriptRuntime,
    QHTMLImportNode,
    QHTMLForNode,
    QHTMLEventHandler,
    QHTMLPainter,
    QHTMLCanvas,
    QHTMLVideoAsset,
    QHTMLVideoPlayer,
    QHTMLVideo,
    QHTMLParticleEmitter,
    QHTMLConnect,
    QHTMLTimer,
    QHTMLPropertyAnimation,
    QHTMLScriptAction,
    QHTMLAnimationGroup,
    QHTMLSequentialAnimation,
    QHTMLParallelAnimation,
    QHTMLBehavior,
    QHTMLStyle,
    QHTMLTransition,
    QHTMLTransitionApplication,
    QHTMLTheme,
    QHTMLStyleApplication,
    QHTMLThemeApplication,
    QHTMLSlot,
    QHTMLClass,
    QHTMLVar,
    QHTMLTemplate,
    QHTMLScript,
    QHTMLModelView,
    QHTMLFactory,
    QHTMLMethod,
    QHTMLSourceFragment,
    QHTMLDomTree,
    createUUID,
    qhtmlVersionString,
    qhtmlCssShortcutPropertyName,
    qhtmlIsCssShortcutProperty,
    qhtmlScalarValue,
    qhtmlSourceQuote,
    qhtmlEscapeText,
    qhtmlEscapeAttribute,
    qhtmlInterpolateTextForContext,
    qhtmlResolveExpressionValue,
    qhtmlResolvePropertyValue,
    qhtmlResolveCssValueForContext,
    qhtmlScriptBody
  };

  globalScope.QHTMLTypes = Object.freeze(api);
  for (const [key, value] of Object.entries(api)) {
    if (globalScope[key] === undefined) {
      globalScope[key] = value;
    }
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);


/* ---- js/qhtml_parser.js ---- */
(function qhtmlParserModule(globalScope) {
  "use strict";

  const QHTMLTypes = globalScope.QHTMLTypes;
  if (!QHTMLTypes) {
    console.log("qhtml_parser.js must be loaded after qhtml_types.js");
  }

  const DEFAULT_KEYWORDS = Object.freeze([
    "q-component",
    "q-worker",
    "q-logger",
    "q-property",
    "q-signal",
    "q-class",
    "q-var",
    "q-callback",
    "q-array",
    "q-map",
    "q-model",
    "q-template",
    "q-macro",
    "q-rewrite",
    "q-switch",
    "q-script",
    "behavior",
    "q-model-view",
    "q-factory",
    "q-timer",
    "q-property-animation",
    "q-sequential-animation",
    "q-parallel-animation",
    "q-script-action",
    "q-painter",
    "q-canvas",
    "q-video",
    "q-vid-player",
    "native-vid-player",
    "particle-emitter",
    "q-particle-emitter",
    "q-style-painter",
    "q-layout",
    "q-row",
    "q-col",
    "q-column",
    "q-connect",
    "for",
    "q-import",
    "q-require",
    "style",
    "q-style",
    "q-style-class",
    "q-transition",
    "q-theme",
    "q-default-theme",
    "q-child-theme",
    "function",
    "q-event-handler",
    "slot",
    "q-slot",
    "q-slot-default",
    "html",
    "text"
  ]);

  function trim(value) {
    return String(value == null ? "" : value).trim();
  }

  function createUUID() {
    return QHTMLTypes.createUUID();
  }

  function isSpace(ch) {
    return /\s/.test(ch);
  }

  function isWordStart(ch) {
    return /^[A-Za-z_]$/.test(ch || "");
  }

  function isWordChar(ch) {
    return /^[A-Za-z0-9_+-]$/.test(ch || "");
  }

  function isKeywordToken(token) {
    const text = trim(token);
    if (!text || !isWordStart(text[0])) {
      return false;
    }
    for (const ch of text) {
      if (!isWordChar(ch)) {
        return false;
      }
    }
    return true;
  }

  function isTypePathToken(token) {
    const text = trim(token);
    return text !== "" && text.split(".").every(isKeywordToken);
  }

  function parseSelector(selector) {
    const text = trim(selector);
    const out = { tagName: "", attributes: {}, valid: false };
    if (!text || !isWordStart(text[0])) {
      return out;
    }
    let index = 0;
    while (index < text.length && isWordChar(text[index])) {
      out.tagName += text[index++];
    }
    let id = "";
    const classes = [];
    while (index < text.length) {
      const marker = text[index++];
      if (marker !== "#" && marker !== ".") {
        return { tagName: "", attributes: {}, valid: false };
      }
      if (index >= text.length || !isWordStart(text[index])) {
        return { tagName: "", attributes: {}, valid: false };
      }
      let value = "";
      while (index < text.length && isWordChar(text[index])) {
        value += text[index++];
      }
      if (marker === "#") {
        id = value;
      } else {
        classes.push(value);
      }
    }
    if (id) {
      out.attributes.id = id;
    }
    if (classes.length) {
      out.attributes.class = classes.join(" ");
    }
    out.valid = out.tagName !== "";
    return out;
  }

  function parseTypedSignature(header) {
    const text = trim(header);
    const space = text.search(/\s/);
    const out = { keyword: "", name: "", extendsNames: [], attributes: {}, valid: false };
    if (space < 0) {
      return out;
    }
    out.keyword = trim(text.slice(0, space));
    if (!isTypePathToken(out.keyword)) {
      return { keyword: "", name: "", extendsNames: [], attributes: {}, valid: false };
    }
    let nameExpression = trim(text.slice(space + 1));
    let parameters = "";
    const openParen = nameExpression.indexOf("(");
    if (openParen >= 0) {
      const closeParen = nameExpression.lastIndexOf(")");
      if (closeParen < openParen || closeParen !== nameExpression.length - 1) {
        return { keyword: "", name: "", extendsNames: [], attributes: {}, valid: false };
      }
      parameters = trim(nameExpression.slice(openParen + 1, closeParen));
      nameExpression = trim(nameExpression.slice(0, openParen));
    }
    if (out.keyword === "q-component") {
      const match = /\s+extends\s+/i.exec(nameExpression);
      if (match) {
        const extendsExpression = trim(nameExpression.slice(match.index + match[0].length)).replace(/,/g, " ");
        nameExpression = trim(nameExpression.slice(0, match.index));
        for (const candidate of extendsExpression.split(/\s+/).filter(Boolean)) {
          if (!isTypePathToken(candidate)) {
            return { keyword: "", name: "", extendsNames: [], attributes: {}, valid: false };
          }
          out.extendsNames.push(candidate);
        }
      }
    }
    const selector = parseSelector(nameExpression);
    if (!selector.valid) {
      return { keyword: "", name: "", extendsNames: [], attributes: {}, valid: false };
    }
    out.name = selector.tagName;
    out.attributes = Object.assign({}, selector.attributes);
    if (out.extendsNames.length) {
      out.attributes.extends = out.extendsNames.join(", ");
    }
    if (parameters) {
      out.attributes.parameters = parameters;
    }
    out.valid = true;
    return out;
  }

  function stripComments(source) {
    const text = String(source || "");
    let out = "";
    let quote = "";
    let escape = false;
    let blockComment = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const next = text[i + 1] || "";
      if (blockComment) {
        if (ch === "*" && next === "/") {
          out += "  ";
          blockComment = false;
          i += 1;
        } else {
          out += ch === "\n" ? "\n" : " ";
        }
        continue;
      }
      if (quote) {
        out += ch;
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
        out += "  ";
        blockComment = true;
        i += 1;
        continue;
      }
      if (ch === "\"" || ch === "'" || ch === "`") {
        quote = ch;
      }
      out += ch;
    }
    return out;
  }

  function findMatchingBrace(source, openIndex) {
    let depth = 0;
    let quote = "";
    let escape = false;
    let lineComment = false;
    let blockComment = false;
    for (let i = openIndex; i < source.length; i += 1) {
      const ch = source[i];
      const next = source[i + 1] || "";
      if (lineComment) {
        if (ch === "\n") {
          lineComment = false;
        }
        continue;
      }
      if (blockComment) {
        if (ch === "*" && next === "/") {
          blockComment = false;
          i += 1;
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
      if (ch === "/" && next === "/") {
        lineComment = true;
        i += 1;
        continue;
      }
      if (ch === "/" && next === "*") {
        blockComment = true;
        i += 1;
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
          return i;
        }
      }
    }
    return -1;
  }

  function headerLooksLikeInlineValueStatement(header) {
    const text = trim(header);
    return /^q-property\s+[A-Za-z_][A-Za-z0-9_+-]*\s*:\s*$/.test(text) ||
      /^[A-Za-z_][A-Za-z0-9_+-]*\s*:\s*$/.test(text);
  }

  function expectedCloserForStructuredOpener(opener) {
    if (opener === "[") return "]";
    if (opener === "{") return "}";
    if (opener === "(") return ")";
    return "";
  }

  function isStructuredValueOpener(ch) {
    return ch === "[" || ch === "{";
  }

  function findStructuredValueEnd(source, valueStartIndex) {
    if (valueStartIndex < 0 || valueStartIndex >= source.length || !isStructuredValueOpener(source[valueStartIndex])) {
      return -1;
    }
    const expectedClosers = [expectedCloserForStructuredOpener(source[valueStartIndex])];
    let quote = "";
    let escape = false;
    let lineComment = false;
    let blockComment = false;
    for (let i = valueStartIndex + 1; i < source.length; i += 1) {
      const ch = source[i];
      const next = source[i + 1] || "";
      if (lineComment) {
        if (ch === "\n") lineComment = false;
        continue;
      }
      if (blockComment) {
        if (ch === "*" && next === "/") {
          blockComment = false;
          i += 1;
        }
        continue;
      }
      if (quote) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === quote) quote = "";
        continue;
      }
      if (ch === "/" && next === "/") {
        lineComment = true;
        i += 1;
        continue;
      }
      if (ch === "/" && next === "*") {
        blockComment = true;
        i += 1;
        continue;
      }
      if (ch === "\"" || ch === "'" || ch === "`") {
        quote = ch;
        continue;
      }
      if (ch === "[" || ch === "{" || ch === "(") {
        expectedClosers.push(expectedCloserForStructuredOpener(ch));
        continue;
      }
      if (ch === "]" || ch === "}" || ch === ")") {
        if (!expectedClosers.length || ch !== expectedClosers[expectedClosers.length - 1]) {
          return -1;
        }
        expectedClosers.pop();
        if (!expectedClosers.length) {
          return i + 1;
        }
      }
    }
    return -1;
  }

  function structuredValueStatementAt(source, cursor) {
    let index = cursor;
    while (index < source.length && isSpace(source[index])) index += 1;
    const remaining = source.slice(index);
    const match = /^(q-property\s+[A-Za-z_][A-Za-z0-9_+-]*\s*:|[A-Za-z_][A-Za-z0-9_+-]*\s*:)/.exec(remaining);
    if (!match) {
      return { matched: false, endIndex: -1, statement: "" };
    }
    let valueStart = index + match[0].length;
    while (valueStart < source.length && isSpace(source[valueStart])) valueStart += 1;
    if (valueStart >= source.length || !isStructuredValueOpener(source[valueStart])) {
      return { matched: false, endIndex: -1, statement: "" };
    }
    const valueEnd = findStructuredValueEnd(source, valueStart);
    if (valueEnd < 0) {
      return { matched: false, endIndex: -1, statement: "" };
    }
    let end = valueEnd;
    while (end < source.length && isSpace(source[end]) && source[end] !== "\n") end += 1;
    if (source[end] === ";") end += 1;
    return {
      matched: true,
      endIndex: end,
      statement: trim(source.slice(index, valueEnd))
    };
  }

  function inlineAssignmentStatementAt(source, cursor) {
    let index = cursor;
    while (index < source.length && isSpace(source[index])) index += 1;
    if (index >= source.length || !isWordStart(source[index])) {
      return { matched: false, endIndex: -1, statement: "" };
    }
    let name = "";
    let cursorAfterName = index;
    while (cursorAfterName < source.length && isWordChar(source[cursorAfterName])) {
      name += source[cursorAfterName++];
    }
    if (name === "q-property") {
      return { matched: false, endIndex: -1, statement: "" };
    }
    let colonIndex = cursorAfterName;
    while (colonIndex < source.length && isSpace(source[colonIndex]) && source[colonIndex] !== "\n") colonIndex += 1;
    if (source[colonIndex] !== ":") {
      return { matched: false, endIndex: -1, statement: "" };
    }
    let valueStart = colonIndex + 1;
    while (valueStart < source.length && isSpace(source[valueStart]) && source[valueStart] !== "\n") valueStart += 1;
    if (valueStart >= source.length || source[valueStart] === "{" || source[valueStart] === "[") {
      return { matched: false, endIndex: -1, statement: "" };
    }
    let valueEnd = valueStart;
    const firstValueChar = source[valueStart];
    if (firstValueChar === "\"" || firstValueChar === "'" || firstValueChar === "`") {
      const quote = firstValueChar;
      let escape = false;
      valueEnd += 1;
      while (valueEnd < source.length) {
        const ch = source[valueEnd];
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === quote) {
          valueEnd += 1;
          break;
        }
        valueEnd += 1;
      }
    } else {
      let depth = 0;
      while (valueEnd < source.length) {
        const ch = source[valueEnd];
        if ((ch === "\n" || ch === ";") && depth === 0) {
          break;
        }
        if (ch === "{" && depth === 0) {
          break;
        }
        if (ch === "[" || ch === "(") {
          depth += 1;
        } else if ((ch === "]" || ch === ")") && depth > 0) {
          depth -= 1;
        }
        valueEnd += 1;
      }
      while (valueEnd > valueStart && isSpace(source[valueEnd - 1])) {
        valueEnd -= 1;
      }
    }
    if (valueEnd <= valueStart) {
      return { matched: false, endIndex: -1, statement: "" };
    }
    let end = valueEnd;
    while (end < source.length && isSpace(source[end]) && source[end] !== "\n") end += 1;
    if (source[end] === ";" || source[end] === ",") end += 1;
    return {
      matched: true,
      endIndex: end,
      statement: trim(source.slice(index, valueEnd))
    };
  }

  function findNextQHTMLBlockOpen(source, cursor) {
    let quote = "";
    let escape = false;
    let lineComment = false;
    let blockComment = false;
    let squareParenDepth = 0;
    for (let i = cursor; i < source.length; i += 1) {
      const ch = source[i];
      const next = source[i + 1] || "";
      if (lineComment) {
        if (ch === "\n") lineComment = false;
        continue;
      }
      if (blockComment) {
        if (ch === "*" && next === "/") {
          blockComment = false;
          i += 1;
        }
        continue;
      }
      if (quote) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === quote) quote = "";
        continue;
      }
      if (ch === "/" && next === "/") {
        lineComment = true;
        i += 1;
        continue;
      }
      if (ch === "/" && next === "*") {
        blockComment = true;
        i += 1;
        continue;
      }
      if (ch === "\"" || ch === "'" || ch === "`") {
        quote = ch;
        continue;
      }
      if (ch === "[" || ch === "(") {
        squareParenDepth += 1;
        continue;
      }
      if (ch === "]" || ch === ")") {
        if (squareParenDepth > 0) squareParenDepth -= 1;
        continue;
      }
      if (ch !== "{" || squareParenDepth !== 0) {
        continue;
      }
      const header = trim(source.slice(cursor, i));
      if (headerLooksLikeInlineValueStatement(header)) {
        const closeIndex = findMatchingBrace(source, i);
        if (closeIndex >= 0) {
          i = closeIndex;
          continue;
        }
      }
      return i;
    }
    return -1;
  }

  function findStatementBoundaryBeforeBlock(source, cursor, blockOpenIndex) {
    let quote = "";
    let escape = false;
    let lineComment = false;
    let blockComment = false;
    let depth = 0;
    for (let i = cursor; i < blockOpenIndex && i < source.length; i += 1) {
      const ch = source[i];
      const next = source[i + 1] || "";
      if (lineComment) {
        if (ch === "\n") {
          lineComment = false;
          if (depth === 0) return i;
        }
        continue;
      }
      if (blockComment) {
        if (ch === "*" && next === "/") {
          blockComment = false;
          i += 1;
        }
        continue;
      }
      if (quote) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === quote) quote = "";
        continue;
      }
      if (ch === "/" && next === "/") {
        lineComment = true;
        i += 1;
        continue;
      }
      if (ch === "/" && next === "*") {
        blockComment = true;
        i += 1;
        continue;
      }
      if (ch === "\"" || ch === "'" || ch === "`") {
        quote = ch;
        continue;
      }
      if (ch === "[" || ch === "{" || ch === "(") {
        depth += 1;
        continue;
      }
      if (ch === "]" || ch === "}" || ch === ")") {
        if (depth > 0) depth -= 1;
        continue;
      }
      if ((ch === "\n" || ch === ";") && depth === 0) {
        return i;
      }
    }
    return -1;
  }

  function splitSelectors(header) {
    return String(header || "").split(",").map(trim).filter(Boolean);
  }

  function splitWords(header) {
    return trim(header).split(/\s+/).filter(Boolean);
  }

  function splitStatements(source) {
    const statements = [];
    let current = "";
    let depth = 0;
    let quote = "";
    let escape = false;
    let lineComment = false;
    let blockComment = false;
    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i];
      const next = source[i + 1] || "";
      if (lineComment) {
        if (ch === "\n") {
          lineComment = false;
          const statement = trim(current);
          if (statement) statements.push(statement);
          current = "";
        } else {
          current += ch;
        }
        continue;
      }
      if (blockComment) {
        current += ch;
        if (ch === "*" && next === "/") {
          current += next;
          blockComment = false;
          i += 1;
        }
        continue;
      }
      if (quote) {
        current += ch;
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === quote) quote = "";
        continue;
      }
      if (ch === "/" && next === "/") {
        lineComment = true;
        i += 1;
        continue;
      }
      if (ch === "/" && next === "*") {
        blockComment = true;
        current += ch + next;
        i += 1;
        continue;
      }
      if (ch === "\"" || ch === "'" || ch === "`") {
        quote = ch;
        current += ch;
        continue;
      }
      if (ch === "[" || ch === "{" || ch === "(") depth += 1;
      else if (ch === "]" || ch === "}" || ch === ")") depth -= 1;
      if ((ch === ";" || ch === "\n") && depth === 0) {
        const statement = trim(current);
        if (statement) statements.push(statement);
        current = "";
        continue;
      }
      current += ch;
    }
    const statement = trim(current);
    if (statement) statements.push(statement);
    return statements;
  }

  function specialSelectorIsOnlyAtEnd(selectors) {
    for (let i = 0; i < selectors.length; i += 1) {
      const parts = parseSelector(selectors[i]);
      if (!parts.valid) {
        return false;
      }
      const special = parts.tagName === "text" || parts.tagName === "html";
      if (special && i !== selectors.length - 1) {
        return false;
      }
    }
    return true;
  }

  function buildAnonymousChain(selectors, index, content) {
    const parts = parseSelector(selectors[index]);
    if (!parts.valid) {
      return null;
    }
    const last = index === selectors.length - 1;
    const attributes = Object.assign({}, parts.attributes, { "__qhtml-anonymous-chain": "" });
    const node = new QHTMLAstAnonNode(parts.tagName, attributes, last ? content : "", last);
    if (!last) {
      node.appendAstChild(buildAnonymousChain(selectors, index + 1, content));
    }
    return node;
  }

  class QHTMLAstNode {
    constructor(source = "", scanNow = true) {
      this.astChildren = [];
      this.astChildrenUUIDs = new Map();
      this.astChildrenUUIDKeywords = new Map();
      this.qhtmlName = "";
      this.qhtmlContent = String(source || "");
      this.qhtmlUUID = createUUID();
      this.qhtmlKeyword = "";
      this.qhtmlNode = new QHTMLTypes.QHTMLNode("QHTMLAstContextNode");
      if (scanNow) {
        this.scan(this.qhtmlContent);
      }
    }

    astType() { return "QHTMLAstNode"; }
    astTypeJs() { return this.astType(); }
    qhtmlType() { return this.qhtmlKeyword; }
    qhtmlTypeJs() { return this.qhtmlType(); }
    childCount() { return this.astChildren.length; }
    childAt(index) { return this.astChildren[index] || null; }
    appendAstChild(node) {
      if (node) {
        this.astChildren.push(node);
      }
    }
    uuidForChildIndex(index) { return this.astChildrenUUIDs.get(index) || ""; }
    uuidForChildIndexJs(index) { return this.uuidForChildIndex(index); }
    uuidForChild(node) {
      const index = this.astChildren.indexOf(node);
      return index >= 0 ? this.uuidForChildIndex(index) : "";
    }
    findChildByUUID(uuid) {
      return this.astChildren.find(child => child.qhtmlUUID === uuid) || null;
    }
    installDefaultKeywordsDeep() {
      for (const keyword of DEFAULT_KEYWORDS) {
        this.qhtmlNode.updateKeywordReference(keyword, keyword);
      }
      for (const child of this.astChildren) {
        child.installDefaultKeywordsDeep();
      }
    }
    updateKeywordReferenceDeep(name, value) {
      this.qhtmlNode.updateKeywordReference(name, value);
      for (const child of this.astChildren) {
        child.updateKeywordReferenceDeep(name, value);
      }
    }
    applyLocalKeywordDeclarations() {
      for (const child of this.astChildren) {
        if (child && child.qhtmlType() === "q-keyword") {
          const name = trim(child.qhtmlName);
          const value = trim(child.qhtmlContent);
          if (name && isKeywordToken(value)) {
            this.updateKeywordReferenceDeep(name, value);
          }
        }
      }
    }
    enumerateNamedReferencesDeep() {
      for (const child of this.astChildren) {
        if (!child) {
          continue;
        }
        if (child.astType() === "QHTMLAstNamedTypeNode" && trim(child.qhtmlName) !== "") {
          this.qhtmlNode.updateNamedReference(child.qhtmlName, child.qhtmlUUID);
          child.qhtmlNode.updateNamedReference(child.qhtmlName, child.qhtmlUUID);
        }
        child.enumerateNamedReferencesDeep();
      }
    }
    enumerateKeywords() {
      this.installDefaultKeywordsDeep();
      for (let i = 0; i < this.astChildren.length; i += 1) {
        const child = this.astChildren[i];
        if (!child) {
          continue;
        }
        if (!child.qhtmlUUID) {
          child.qhtmlUUID = createUUID();
        }
        this.astChildrenUUIDs.set(i, child.qhtmlUUID);
        this.astChildrenUUIDKeywords.set(child.qhtmlUUID, child.qhtmlType());
        child.enumerateKeywords();
      }
      this.applyLocalKeywordDeclarations();
      this.enumerateNamedReferencesDeep();
    }
    scan(source) {
      const cleanedSource = stripComments(source);
      let cursor = 0;
      while (cursor < cleanedSource.length) {
        while (cursor < cleanedSource.length &&
               (isSpace(cleanedSource[cursor]) || cleanedSource[cursor] === "," || cleanedSource[cursor] === ";")) {
          cursor += 1;
        }
        if (cursor >= cleanedSource.length) {
          break;
        }
        const structuredStatement = structuredValueStatementAt(cleanedSource, cursor);
        if (structuredStatement.matched) {
          this.appendAstChild(nodeFromStatement(structuredStatement.statement) ||
            new QHTMLAstUnknownFragment(structuredStatement.statement));
          cursor = structuredStatement.endIndex;
          continue;
        }
        const inlineAssignment = inlineAssignmentStatementAt(cleanedSource, cursor);
        if (inlineAssignment.matched) {
          this.appendAstChild(nodeFromStatement(inlineAssignment.statement) ||
            new QHTMLAstUnknownFragment(inlineAssignment.statement));
          cursor = inlineAssignment.endIndex;
          continue;
        }
        const openIndex = findNextQHTMLBlockOpen(cleanedSource, cursor);
        if (openIndex < 0) {
          const fragment = trim(cleanedSource.slice(cursor));
          if (fragment) {
            appendStatementOrUnknown(this, fragment);
          }
          break;
        }
        const statementBoundaryBeforeBlock = findStatementBoundaryBeforeBlock(cleanedSource, cursor, openIndex);
        if (statementBoundaryBeforeBlock >= 0 && statementBoundaryBeforeBlock < openIndex) {
          const statement = trim(cleanedSource.slice(cursor, statementBoundaryBeforeBlock));
          const node = nodeFromStatement(statement);
          if (node) {
            this.appendAstChild(node);
            cursor = statementBoundaryBeforeBlock + 1;
            continue;
          }
        }
        const header = trim(cleanedSource.slice(cursor, openIndex));
        const closeIndex = findMatchingBrace(cleanedSource, openIndex);
        if (closeIndex < 0) {
          this.appendAstChild(new QHTMLAstUnknownFragment(trim(cleanedSource.slice(cursor))));
          break;
        }
        const content = cleanedSource.slice(openIndex + 1, closeIndex);
        if (!appendLegacyPropertyList(this, header, content)) {
          this.appendAstChild(scalarBlockNodeForContext(this, header, content) || nodeFromHeader(header, content));
        }
        cursor = closeIndex + 1;
      }
    }
    toQHTMLNode() {
      const node = new QHTMLTypes.QHTMLNode("QHTMLNode", this.qhtmlName);
      node.setQHTMLUUID(this.qhtmlUUID);
      for (const child of this.astChildren) {
        node.appendChild(child.toQHTMLNode());
      }
      return node;
    }
  }

  class QHTMLAstAnonNode extends QHTMLAstNode {
    constructor(tagName, attributes, innerText, scanInner = true) {
      super(innerText, false);
      this._tagName = trim(tagName);
      this._attributes = Object.assign({}, attributes || {});
      this.qhtmlName = this._tagName;
      if (scanInner && !this.isSpecialFragment()) {
        this.scan(innerText);
      }
    }
    astType() { return "QHTMLAstAnonNode"; }
    tagName() { return this._tagName; }
    isSpecialFragment() { return this._tagName === "text" || this._tagName === "html"; }
    toQHTMLNode() {
      let node;
      if (this._tagName === "text") {
        node = new QHTMLTypes.QHTMLTextFragment(trim(this.qhtmlContent));
      } else if (this._tagName === "html") {
        node = new QHTMLTypes.QHTMLHTMLFragment(trim(this.qhtmlContent));
      } else if (this._tagName === "q-anchor" || this._tagName.startsWith("q-anchor-")) {
        node = new QHTMLTypes.QHTMLTypedNode(this._tagName, "", this._attributes);
      } else {
        node = new QHTMLTypes.QHTMLDomElement(this._tagName, this._attributes);
      }
      node.setQHTMLUUID(this.qhtmlUUID);
      for (const child of this.astChildren) {
        node.appendChild(child.toQHTMLNode());
      }
      return node;
    }
  }

  class QHTMLAstNamedTypeNode extends QHTMLAstNode {
    constructor(keyword, name, attributes, innerText) {
      super(innerText, false);
      this.qhtmlKeyword = trim(keyword);
      this.qhtmlName = trim(name);
      this._attributes = Object.assign({}, attributes || {});
      if (!QHTMLAstNamedTypeNode.isRawScriptBodyKeyword(this.qhtmlKeyword)) {
        this.scan(innerText);
      }
    }
    astType() { return "QHTMLAstNamedTypeNode"; }
    qhtmlType() { return this.qhtmlKeyword; }
    static isRawScriptBodyKeyword(keyword) {
      return ["q-event-handler", "function", "q-connect", "q-class", "q-script", "q-script-action", "script"].includes(keyword);
    }
    createTypedNode() {
      const T = QHTMLTypes;
      let node;
      switch (this.qhtmlKeyword) {
        case "q-component": return new T.QHTMLComponentDefinition(this.qhtmlName, this._attributes);
        case "q-worker": return new T.QHTMLWorker(this.qhtmlName, this._attributes);
        case "q-logger": return new T.QHTMLLogger(this.qhtmlName, this._attributes);
        case "q-property": return new T.QHTMLProperty(this.qhtmlName, this._attributes);
        case "q-signal": return new T.QHTMLSignal(this.qhtmlName, this._attributes);
        case "slot":
        case "q-slot": return new T.QHTMLComponentSlot(this.qhtmlName, this._attributes);
        case "q-slot-default": return new T.QHTMLSlotDefault(this.qhtmlName, this._attributes);
        case "q-property-assignment": return new T.QHTMLPropertyAssignment(this.qhtmlName, this._attributes);
        case "q-class": return new T.QHTMLClass(this.qhtmlName, this._attributes, this.qhtmlContent);
        case "q-var": return new T.QHTMLVar(this.qhtmlName, this._attributes);
        case "q-array": return new T.QHTMLArray(this.qhtmlName, this._attributes);
        case "q-map": return new T.QHTMLMap(this.qhtmlName, this._attributes);
        case "q-model": return new T.QHTMLModel(this.qhtmlName, this._attributes);
        case "q-template": return new T.QHTMLTemplate(this.qhtmlName, this._attributes);
        case "q-macro":
        case "q-rewrite":
        case "q-switch": return new T.QHTMLTypedNode(this.qhtmlKeyword, this.qhtmlName, this._attributes);
        case "q-script":
        case "script": return new T.QHTMLScript(this.qhtmlName, this._attributes, this.qhtmlContent);
        case "behavior": return new T.QHTMLBehavior(this.qhtmlName, this._attributes);
        case "q-model-view": return new T.QHTMLModelView(this.qhtmlName, this._attributes);
        case "q-factory": return new T.QHTMLFactory(this.qhtmlName, this._attributes);
        case "q-timer": return new T.QHTMLTimer(this.qhtmlName, this._attributes);
        case "q-property-animation": return new T.QHTMLPropertyAnimation(this.qhtmlName, this._attributes);
        case "q-sequential-animation": return new T.QHTMLSequentialAnimation(this.qhtmlName, this._attributes);
        case "q-parallel-animation": return new T.QHTMLParallelAnimation(this.qhtmlName, this._attributes);
        case "q-script-action": return new T.QHTMLScriptAction(this.qhtmlName, this._attributes, this.qhtmlContent);
        case "q-painter": return new T.QHTMLPainter(this.qhtmlName, this._attributes, this.qhtmlContent);
        case "q-canvas": return new T.QHTMLCanvas(this.qhtmlName, this._attributes);
        case "q-video":
        case "q-vid-player":
        case "native-vid-player":
          node = new T.QHTMLVideo(this.qhtmlName, this._attributes);
          node.setKeyword(this.qhtmlKeyword);
          return node;
        case "particle-emitter":
        case "q-particle-emitter":
          node = new T.QHTMLParticleEmitter(this.qhtmlName, this._attributes);
          node.setKeyword(this.qhtmlKeyword);
          return node;
        case "q-layout": return new T.QHTMLLayout(this.qhtmlKeyword, this.qhtmlName, this._attributes);
        case "q-row": return new T.QHTMLRowLayout(this.qhtmlName, this._attributes);
        case "q-col":
        case "q-column":
          node = new T.QHTMLColumnLayout(this.qhtmlName, this._attributes);
          if (this.qhtmlKeyword === "q-column") node.setKeyword("q-column");
          return node;
        case "for": return new T.QHTMLForNode(this.qhtmlName, this._attributes, this.qhtmlContent);
        case "q-import":
        case "q-require": return new T.QHTMLImportNode(this.qhtmlKeyword, this._attributes, this.qhtmlContent);
        case "q-connect": return new T.QHTMLConnect("", this._attributes, this.qhtmlContent);
        case "q-style":
        case "style":
          node = new T.QHTMLStyle(this.qhtmlName, this._attributes, this.qhtmlContent);
          node.setKeyword(this.qhtmlKeyword);
          return node;
        case "q-transition": return new T.QHTMLTransition(this.qhtmlName, this._attributes, this.qhtmlContent);
        case "q-theme":
        case "q-default-theme":
          node = new T.QHTMLTheme(this.qhtmlName, this._attributes, this.qhtmlContent);
          node.setKeyword(this.qhtmlKeyword);
          return node;
        case "function": return new T.QHTMLFunction(this.qhtmlName, this._attributes, this.qhtmlContent);
        case "q-event-handler": return new T.QHTMLEventHandler(this.qhtmlName, this._attributes, this.qhtmlContent);
        case "q-source": return new T.QHTMLSourceFragment(this.qhtmlContent || this.qhtmlName);
        default: return new T.QHTMLTypedNode(this.qhtmlKeyword, this.qhtmlName, this._attributes);
      }
    }
    toQHTMLNode() {
      const node = this.createTypedNode();
      node.setQHTMLUUID(this.qhtmlUUID);
      for (const child of this.astChildren) {
        node.appendChild(child.toQHTMLNode());
      }
      return node;
    }
  }

  class QHTMLAstUnknownFragment extends QHTMLAstNode {
    constructor(source) {
      super(source, false);
      this.qhtmlName = "unknown";
    }
    astType() { return "QHTMLAstUnknownFragment"; }
    toQHTMLNode() {
      return new QHTMLTypes.QHTMLUnknownFragment(this.qhtmlContent);
    }
  }

  function nodeFromHeader(header, content) {
    const trimmedHeader = trim(header);
    if (!trimmedHeader) {
      return new QHTMLAstUnknownFragment(content);
    }
    if (trimmedHeader === "slot" || trimmedHeader === "q-slot") {
      const slotName = trim(content);
      if (slotName && isKeywordToken(slotName)) {
        return new QHTMLAstNamedTypeNode("slot", slotName, {}, "");
      }
    }
    let match = /^for\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([^)]+?)\s*\)$/i.exec(trimmedHeader);
    if (match) {
      return new QHTMLAstNamedTypeNode("for", trim(match[1]), { collection: trim(match[2]) }, content);
    }
    match = /^q-property\s+([A-Za-z_][A-Za-z0-9_+-]*)\s*:\s*(q-array|q-map|q-model)\s*$/.exec(trimmedHeader);
    if (match) {
      return new QHTMLAstNamedTypeNode("q-property", trim(match[1]), { value: trim(match[2]) }, content);
    }
    match = /^q-property\s+([A-Za-z_][A-Za-z0-9_+-]*)\s*:\s*$/.exec(trimmedHeader);
    if (match) {
      return new QHTMLAstNamedTypeNode("q-property", trim(match[1]), { value: "{" + trim(content) + "}" }, "");
    }
    match = /^(?:(propagate|propogate)\s+)?on([A-Za-z_][A-Za-z0-9_+-]*)(?:\s*\((.*?)\))?$/i.exec(trimmedHeader);
    if (match) {
      const attributes = { parameters: trim(match[3] || "") };
      if (trim(match[1] || "")) {
        attributes.propagate = "true";
      }
      return new QHTMLAstNamedTypeNode("q-event-handler", trim(match[2]).toLowerCase(), attributes, content);
    }
    const selectors = splitSelectors(trimmedHeader);
    if (selectors.length > 1 && specialSelectorIsOnlyAtEnd(selectors)) {
      return buildAnonymousChain(selectors, 0, content);
    }
    if (trimmedHeader === "q-connect") {
      return new QHTMLAstNamedTypeNode("q-connect", "", {}, content);
    }
    if (trimmedHeader === "style") {
      return new QHTMLAstNamedTypeNode("style", "", {}, content);
    }
    match = /^behavior\s+on\s+([A-Za-z_][A-Za-z0-9_+-]*)$/i.exec(trimmedHeader);
    if (match) {
      return new QHTMLAstNamedTypeNode("behavior", trim(match[1]), {}, content);
    }
    if (trimmedHeader === "q-import" || trimmedHeader === "q-require") {
      return new QHTMLAstNamedTypeNode(trimmedHeader, "", {}, content);
    }
    if ([
      "q-array", "q-map", "q-model", "q-logger", "q-layout", "q-row", "q-col", "q-column",
      "q-canvas", "q-property-animation", "q-sequential-animation", "q-parallel-animation",
      "q-script-action"
    ].includes(trimmedHeader)) {
      return new QHTMLAstNamedTypeNode(trimmedHeader, "", {}, content);
    }
    const singleSelector = parseSelector(trimmedHeader);
    if (singleSelector.valid) {
      return new QHTMLAstAnonNode(singleSelector.tagName, singleSelector.attributes, content);
    }
    const typedSignature = parseTypedSignature(trimmedHeader);
    if (typedSignature.valid) {
      return new QHTMLAstNamedTypeNode(typedSignature.keyword, typedSignature.name, typedSignature.attributes, content);
    }
    return new QHTMLAstUnknownFragment(trimmedHeader + " { " + content + " }");
  }

  function appendLegacyPropertyList(parent, header, content) {
    if (!parent || trim(header) !== "q-property") {
      return false;
    }
    const names = splitWords(content);
    if (!names.length || names.some(name => !isKeywordToken(name))) {
      return false;
    }
    for (const name of names) {
      parent.appendAstChild(new QHTMLAstNamedTypeNode("q-property", name, {}, ""));
    }
    return true;
  }

  function unquoteQHTMLCallArgument(value) {
    const text = trim(value);
    if (text.length >= 2) {
      const first = text[0];
      const last = text[text.length - 1];
      if ((first === "\"" && last === "\"") || (first === "'" && last === "'") || (first === "`" && last === "`")) {
        return text.slice(1, -1);
      }
    }
    return text;
  }

  function nodeFromStatement(statement) {
    const text = trim(statement);
    if (text === ";") {
      return null;
    }
    let match = /^qhtml\s*\(([\s\S]*)\)\s*$/.exec(text);
    if (match) {
      return new QHTMLAstAnonNode("html", {}, unquoteQHTMLCallArgument(match[1]), false);
    }
    if (/^(?:[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)+\s*(?:\(|(?:\*\*|<<|>>>|>>|&&|\|\||\?\?|[-+*/%&|^])?=)|(?:const|let|var)\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=)/s.test(text)) {
      return new QHTMLAstNamedTypeNode("q-script", "", {}, text);
    }
    match = /^q-property\s+([A-Za-z_][A-Za-z0-9_+-]*)\s*:\s*([\s\S]*?)\s*$/.exec(text);
    if (match) {
      return new QHTMLAstNamedTypeNode("q-property", trim(match[1]), { value: trim(match[2]) }, "");
    }
    match = /^(?:(propagate|propogate)\s+)?on([A-Za-z_][A-Za-z0-9_+-]*)(?:\s*\((.*?)\))?\s*\{([\s\S]*)\}\s*$/i.exec(text);
    if (match) {
      const attributes = { parameters: trim(match[3] || "") };
      if (trim(match[1] || "")) {
        attributes.propagate = "true";
      }
      return new QHTMLAstNamedTypeNode("q-event-handler", trim(match[2]).toLowerCase(), attributes, match[4]);
    }
    match = /^([A-Za-z_][A-Za-z0-9_+-]*)\s*:\s*([\s\S]*?)\s*$/.exec(text);
    if (match) {
      return new QHTMLAstNamedTypeNode("q-property-assignment", trim(match[1]), { value: trim(match[2]) }, "");
    }
    const typedSignature = parseTypedSignature(text);
    if (typedSignature.valid && typedSignature.keyword === "q-signal") {
      return new QHTMLAstNamedTypeNode(typedSignature.keyword, typedSignature.name, typedSignature.attributes, "");
    }
    return null;
  }

  function scalarBlockNodeForContext(parent, header, content) {
    const parentKeyword = parent && parent.qhtmlKeyword ? String(parent.qhtmlKeyword).trim() : "";
    const scalarHeaders = parentKeyword === "q-transition"
      ? new Set(["property", "duration", "timing", "delay"])
      : null;
    const name = trim(header);
    if (!scalarHeaders || !scalarHeaders.has(name)) {
      return null;
    }
    return new QHTMLAstNamedTypeNode("q-property-assignment", name, {
      value: trim(content),
      sourceSyntax: "block"
    }, "");
  }

  function appendStatementOrUnknown(parent, source) {
    for (const part of splitStatements(source)) {
      const statement = trim(part);
      if (!statement) {
        continue;
      }
      if (parent && parent.qhtmlKeyword === "q-logger") {
        parent.appendAstChild(new QHTMLAstUnknownFragment(statement));
        continue;
      }
      parent.appendAstChild(nodeFromStatement(statement) || new QHTMLAstUnknownFragment(statement));
    }
  }

  function collectComponentDefinitions(root) {
    const definitionsByName = new Map();
    const definitionsByUuid = new Map();
    root.walk(node => {
      if (node instanceof QHTMLTypes.QHTMLComponentDefinition) {
        if (node.qhtmlName()) {
          definitionsByName.set(node.qhtmlName(), node);
        }
        definitionsByUuid.set(node.qhtmlUUID(), node);
      }
    });
    return { definitionsByName, definitionsByUuid };
  }

  function collectNamedApplications(root) {
    const stylesByName = new Map();
    const themesByName = new Map();
    const transitionsByName = new Map();
    root.walk(node => {
      if (node instanceof QHTMLTypes.QHTMLStyle && node.qhtmlName()) {
        stylesByName.set(node.qhtmlName(), node);
      } else if (node instanceof QHTMLTypes.QHTMLTheme && node.qhtmlName()) {
        themesByName.set(node.qhtmlName(), node);
      } else if (node instanceof QHTMLTypes.QHTMLTransition && node.qhtmlName()) {
        transitionsByName.set(node.qhtmlName(), node);
      }
    });
    return { stylesByName, themesByName, transitionsByName };
  }

  function replaceChildren(parent, transform) {
    const original = parent.children();
    for (let i = original.length - 1; i >= 0; i -= 1) {
      parent.takeChildAt(i);
    }
    for (const child of original) {
      parent.appendChild(transform(parent, child));
    }
  }

  function transformComponentInstances(root) {
    const { definitionsByName } = collectComponentDefinitions(root);
    const visit = (parent) => {
      replaceChildren(parent, (owner, child) => {
        let node = child;
        if (child instanceof QHTMLTypes.QHTMLDomElement) {
          const fromCommaChain = Object.prototype.hasOwnProperty.call(child.attributes(), "__qhtml-anonymous-chain");
          const definition = !fromCommaChain ? definitionsByName.get(child.tagName()) : null;
          if (definition) {
            node = new QHTMLTypes.QHTMLComponentInstance(child.qhtmlName(), child.attributes(), definition);
            node.setQHTMLUUID(child.qhtmlUUID());
            node.setProperty("qhtmlComponentName", definition.qhtmlName());
            node.setProperty("componentName", definition.qhtmlName());
            while (child.childCount() > 0) {
              node.appendChild(child.takeChildAt(0));
            }
          }
        } else if (child instanceof QHTMLTypes.QHTMLTypedNode &&
            !(child instanceof QHTMLTypes.QHTMLComponentDefinition) &&
            !(child instanceof QHTMLTypes.QHTMLComponentInstance)) {
          const definition = definitionsByName.get(child.keyword());
          if (definition) {
            node = new QHTMLTypes.QHTMLComponentInstance(child.qhtmlName(), child.attributes(), definition);
            node.setQHTMLUUID(child.qhtmlUUID());
            node.setProperty("qhtmlComponentName", definition.qhtmlName());
            node.setProperty("componentName", definition.qhtmlName());
            while (child.childCount() > 0) {
              node.appendChild(child.takeChildAt(0));
            }
          }
        }
        visit(node);
        return node;
      });
    };
    visit(root);
    root.resolveComponentInstanceDefinitions();
  }

  function isDefinitionClone(node) {
    return node && typeof node.property === "function" && node.property("__qhtmlDefinitionMember") !== "";
  }

  function directChildNamed(node, name, Type) {
    return node.children().find(child => child.qhtmlName() === name && (!Type || child instanceof Type)) || null;
  }

  function directPropertyOverride(instance, propertyName) {
    const childOverride = instance.children().find(child =>
      child.qhtmlName() === propertyName &&
      !isDefinitionClone(child) &&
      (child instanceof QHTMLTypes.QHTMLPropertyAssignment || child instanceof QHTMLTypes.QHTMLProperty)
    ) || null;
    if (childOverride) {
      return childOverride;
    }
    if (typeof instance.attribute === "function") {
      const attributes = instance.attributes();
      const directKey = Object.keys(attributes).find(key => key.toLowerCase() === propertyName.toLowerCase());
      if (directKey) {
        return new QHTMLTypes.QHTMLPropertyAssignment(propertyName, { value: attributes[directKey] });
      }
    }
    return null;
  }

  function hasClonedDefinitionMember(instance, source) {
    return instance.children().some(child => child.property("__qhtmlDefinitionMember") === source.qhtmlUUID());
  }

  function cloneDefinitionMember(source, instance) {
    let clone = null;
    if (source instanceof QHTMLTypes.QHTMLProperty) {
      clone = source.cloneProperty();
      const override = directPropertyOverride(instance, source.qhtmlName());
      if (override) {
        clone.setValue(override.value());
      }
    } else if (source instanceof QHTMLTypes.QHTMLFunction) {
      clone = source.cloneFunction();
    } else if (source instanceof QHTMLTypes.QHTMLSignal) {
      clone = source.cloneSignal();
    } else if (source instanceof QHTMLTypes.QHTMLEventHandler) {
      clone = new QHTMLTypes.QHTMLEventHandler(source.eventName(), Object.assign({}, source.attributes(), {
        parameters: source.parameterList(),
        propagate: source.propagate() ? "true" : ""
      }), source.body());
    } else if (source instanceof QHTMLTypes.QHTMLConnect) {
      clone = new QHTMLTypes.QHTMLConnect(source.qhtmlName(), Object.assign({}, source.attributes()), source.body());
    } else if (source instanceof QHTMLTypes.QHTMLTimer ||
        source instanceof QHTMLTypes.QHTMLPropertyAnimation ||
        source instanceof QHTMLTypes.QHTMLScriptAction ||
        source instanceof QHTMLTypes.QHTMLAnimationGroup ||
        source instanceof QHTMLTypes.QHTMLBehavior ||
        source instanceof QHTMLTypes.QHTMLStyle ||
        source instanceof QHTMLTypes.QHTMLTransition ||
        source instanceof QHTMLTypes.QHTMLTheme ||
        source instanceof QHTMLTypes.QHTMLLogger) {
      clone = QHTMLTypes.QHTMLNode.nodeFromJsonObject(source.toJSON(), instance);
    }
    if (!clone) {
      return null;
    }
    clone.setProperty("__qhtmlDefinitionMember", source.qhtmlUUID());
    clone.setProperty("__qhtmlDefinitionOwner", instance.qhtmlUUID());
    return clone;
  }

  function cloneDefinitionMembers(instance) {
    const definition = instance.definition();
    if (!definition) {
      return;
    }
    for (const source of definition.children()) {
      if (source instanceof QHTMLTypes.QHTMLComponentSlot ||
          source instanceof QHTMLTypes.QHTMLSlotDefault ||
          source instanceof QHTMLTypes.QHTMLPropertyAssignment ||
          source instanceof QHTMLTypes.QHTMLDomElement ||
          source instanceof QHTMLTypes.QHTMLComponentInstance) {
        continue;
      }
      if (source.qhtmlName() && directChildNamed(instance, source.qhtmlName()) && !(source instanceof QHTMLTypes.QHTMLProperty)) {
        continue;
      }
      if (hasClonedDefinitionMember(instance, source)) {
        continue;
      }
      const clone = cloneDefinitionMember(source, instance);
      if (clone) {
        instance.appendChild(clone);
      }
    }
  }

  function bindComponentMembers(root) {
    root.walk(node => {
      if (node instanceof QHTMLTypes.QHTMLComponentInstance) {
        cloneDefinitionMembers(node);
        node.ensureSlotViews();
      }
    });
  }

  function transformStyleThemeApplications(root) {
    const { stylesByName, themesByName, transitionsByName } = collectNamedApplications(root);
    const childSourceText = (node) => {
      const parts = [];
      const count = node && typeof node.childCount === "function" ? node.childCount() : 0;
      for (let index = 0; index < count; index += 1) {
        const child = node.childAt(index);
        if (child && typeof child.value === "function") {
          parts.push(child.value());
        } else if (child && typeof child.body === "function") {
          parts.push(child.body());
        } else if (child && typeof child.sourceQHTML === "function") {
          parts.push(child.sourceQHTML(0));
        }
      }
      return parts.join(" ").trim();
    };
    const visit = (parent) => {
      replaceChildren(parent, (owner, child) => {
        let node = child;
        let name = "";
        let attributes = {};
        if (child instanceof QHTMLTypes.QHTMLDomElement) {
          name = child.tagName();
          attributes = child.attributes();
        } else if (child instanceof QHTMLTypes.QHTMLTypedNode) {
          name = child.keyword();
          attributes = child.attributes();
        }
        if (name && stylesByName.has(name)) {
          const style = stylesByName.get(name);
          node = new QHTMLTypes.QHTMLStyleApplication(style.qhtmlName(), attributes);
          node.setQHTMLUUID(child.qhtmlUUID());
          node.setProperty("styleUUID", style.qhtmlUUID());
          while (child.childCount() > 0) {
            node.appendChild(child.takeChildAt(0));
          }
        } else if (name && transitionsByName.has(name)) {
          const transition = transitionsByName.get(name);
          node = new QHTMLTypes.QHTMLTransitionApplication(transition.qhtmlName(), attributes);
          node.setQHTMLUUID(child.qhtmlUUID());
          node.setProperty("transitionUUID", transition.qhtmlUUID());
          node.setProperty("properties", childSourceText(child));
          while (child.childCount() > 0) {
            node.appendChild(child.takeChildAt(0));
          }
        } else if (name && themesByName.has(name)) {
          const theme = themesByName.get(name);
          node = new QHTMLTypes.QHTMLThemeApplication(theme.qhtmlName(), attributes);
          node.setQHTMLUUID(child.qhtmlUUID());
          node.setProperty("themeUUID", theme.qhtmlUUID());
          while (child.childCount() > 0) {
            node.appendChild(child.takeChildAt(0));
          }
        }
        visit(node);
        return node;
      });
    };
    visit(root);
  }

  function slotNamesForDefinition(definition) {
    return new Set(definition.findChildrenByType("QHTMLComponentSlot").map(slot => slot.qhtmlName()).filter(Boolean));
  }

  function transformInstanceSlots(root) {
    root.walk(node => {
      if (!(node instanceof QHTMLTypes.QHTMLComponentInstance) || !node.definition()) {
        return;
      }
      const slotNames = slotNamesForDefinition(node.definition());
      if (!slotNames.size) {
        return;
      }
      replaceChildren(node, (owner, child) => {
        if (child instanceof QHTMLTypes.QHTMLComponentInstanceSlot) {
          return child;
        }
        let slotName = "";
        if (child instanceof QHTMLTypes.QHTMLDomElement) {
          slotName = child.tagName();
        } else if (child instanceof QHTMLTypes.QHTMLTypedNode) {
          slotName = child.keyword() || child.qhtmlName();
        } else {
          slotName = child.qhtmlName();
        }
        if (!slotNames.has(slotName)) {
          return child;
        }
        const slot = new QHTMLTypes.QHTMLComponentInstanceSlot(node, node.slot(slotName), slotName);
        slot.setQHTMLUUID(child.qhtmlUUID());
        while (child.childCount() > 0) {
          slot.appendChild(child.takeChildAt(0));
        }
        return slot;
      });
      node.ensureSlotViews();
    });
  }

  function loadTreeFromAST(astRoot, contextNode) {
    const tree = new QHTMLTypes.QHTMLDomTree();
    tree.clearChildren();
    if (tree.qhtmlContext) {
      tree.qhtmlContext.clear();
      tree.qhtmlContext.setParentContext(contextNode && contextNode.qhtmlContext ? contextNode.qhtmlContext : null);
    }
    if (!astRoot) {
      return tree;
    }
    astRoot.enumerateKeywords();
    for (const child of astRoot.astChildren) {
      tree.appendChild(child.toQHTMLNode());
    }
    transformStyleThemeApplications(tree);
    transformComponentInstances(tree);
    bindComponentMembers(tree);
    transformInstanceSlots(tree);
    tree.resolveComponentInstanceDefinitions();
    tree.rebuildQHTMLReferences();
    return tree;
  }

  class QHTMLParser {
    constructor() {
      this._lastRoot = null;
    }
    parse(source) {
      this.clear();
      this._lastRoot = new QHTMLAstNode(String(source || ""));
      this._lastRoot.enumerateKeywords();
      return this._lastRoot;
    }
    parseTree(source, contextNode = null) {
      const ast = this.parse(source);
      return loadTreeFromAST(ast, contextNode);
    }
    parseToJSON(source, contextNode = null) {
      return this.parseTree(source, contextNode).toJSON();
    }
    lastRoot() {
      return this._lastRoot;
    }
    clear() {
      this._lastRoot = null;
    }
  }

  const api = {
    QHTMLAstNode,
    QHTMLAstAnonNode,
    QHTMLAstNamedTypeNode,
    QHTMLAstUnknownFragment,
    QHTMLParser,
    stripComments,
    parseSelector,
    parseTypedSignature,
    splitStatements
  };

  globalScope.QHTMLParser = QHTMLParser;
  globalScope.QHTMLAstNode = QHTMLAstNode;
  globalScope.QHTMLAstAnonNode = QHTMLAstAnonNode;
  globalScope.QHTMLAstNamedTypeNode = QHTMLAstNamedTypeNode;
  globalScope.QHTMLAstUnknownFragment = QHTMLAstUnknownFragment;
  globalScope.QHTMLParserTools = Object.freeze(api);
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);


/* ---- js/qhtml-graphics-scene.js ---- */
(function (globalScope) {
  "use strict";

  const GRAPHICS_SCENE_TAG = "graphics-scene";
  const DEFAULT_SCENE_WIDTH = 300;
  const DEFAULT_SCENE_HEIGHT = 150;
  let graphicsIdentityCounter = 0;

  class QHTMLGraphicsIdentity {
    static create(prefix) {
      if (globalScope.crypto && typeof globalScope.crypto.randomUUID === "function") {
        return `${prefix}-${globalScope.crypto.randomUUID()}`;
      }
      graphicsIdentityCounter += 1;
      return `${prefix}-${Date.now().toString(36)}-${graphicsIdentityCounter.toString(36)}`;
    }
  }

  class QHTMLGraphicsPainterDescriptor {
    constructor(parameters, body, source, sourceKind) {
      const parameterList = Array.isArray(parameters)
        ? parameters.slice()
        : String(parameters || "").split(",");
      this._parameters = parameterList
        .map((parameter) => String(parameter).trim())
        .filter((parameter) => parameter.length > 0);
      this._body = body == null ? "" : String(body);
      this._source = source == null ? null : String(source).trim();
      this._sourceKind = this._source ? String(sourceKind || "") : "";
      this._validateParameters();
      this._validateSource();
    }

    static fromFunction(painterFunction) {
      if (typeof painterFunction !== "function") {
        throw new TypeError("Graphics painter source requires a function reference.");
      }
      const cachedDescriptor = QHTMLGraphicsPainterDescriptor._functionDescriptors.get(painterFunction);
      if (cachedDescriptor !== undefined) {
        return cachedDescriptor;
      }

      let source;
      try {
        source = Function.prototype.toString.call(painterFunction).trim();
      } catch (error) {
        QHTMLGraphicsPainterDescriptor._functionDescriptors.set(painterFunction, null);
        return null;
      }
      if (!source || source.includes("[native code]")) {
        QHTMLGraphicsPainterDescriptor._functionDescriptors.set(painterFunction, null);
        return null;
      }

      if (QHTMLGraphicsPainterDescriptor._tryCompileSource(source, "expression")) {
        const descriptor = new QHTMLGraphicsPainterDescriptor([], "", source, "expression");
        QHTMLGraphicsPainterDescriptor._functionDescriptors.set(painterFunction, descriptor);
        return descriptor;
      }
      if (QHTMLGraphicsPainterDescriptor._tryCompileSource(source, "method")) {
        const descriptor = new QHTMLGraphicsPainterDescriptor([], "", source, "method");
        QHTMLGraphicsPainterDescriptor._functionDescriptors.set(painterFunction, descriptor);
        return descriptor;
      }
      QHTMLGraphicsPainterDescriptor._functionDescriptors.set(painterFunction, null);
      return null;
    }

    static fromJSON(value) {
      if (value instanceof QHTMLGraphicsPainterDescriptor) {
        return value;
      }
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError("Graphics painter JSON must be an object.");
      }
      return new QHTMLGraphicsPainterDescriptor(
        value.parameters,
        value.body,
        value.source,
        value.sourceKind
      );
    }

    get parameters() {
      return this._parameters.slice();
    }

    get body() {
      return this._body;
    }

    get source() {
      return this._source;
    }

    get sourceKind() {
      return this._sourceKind;
    }

    compile() {
      if (this._source) {
        return QHTMLGraphicsPainterDescriptor._compileSource(this._source, this._sourceKind);
      }
      return new Function(...this._parameters, this._body);
    }

    toJSON() {
      const record = {
        qhtmlType: "QHTMLGraphicsPainter",
        type: "QHTMLGraphicsPainter",
        parameters: this._parameters.slice(),
        body: this._body
      };
      if (this._source) {
        record.source = this._source;
        record.sourceKind = this._sourceKind;
      }
      return record;
    }

    _validateParameters() {
      const names = new Set();
      this._parameters.forEach((parameter) => {
        if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(parameter)) {
          throw new SyntaxError(`Invalid graphics painter parameter name "${parameter}".`);
        }
        if (names.has(parameter)) {
          throw new SyntaxError(`Duplicate graphics painter parameter name "${parameter}".`);
        }
        names.add(parameter);
      });
    }

    _validateSource() {
      if (!this._source) {
        return;
      }
      if (this._sourceKind !== "expression" && this._sourceKind !== "method") {
        throw new SyntaxError(`Invalid graphics painter source kind "${this._sourceKind}".`);
      }
      QHTMLGraphicsPainterDescriptor._compileSource(this._source, this._sourceKind);
    }

    static _tryCompileSource(source, sourceKind) {
      try {
        return typeof QHTMLGraphicsPainterDescriptor._compileSource(source, sourceKind) === "function";
      } catch (error) {
        return false;
      }
    }

    static _compileSource(source, sourceKind) {
      if (sourceKind === "expression") {
        const painterFunction = new Function(`return (${source});`)();
        if (typeof painterFunction !== "function") {
          throw new TypeError("Serialized graphics painter expression did not produce a function.");
        }
        return painterFunction;
      }

      if (sourceKind === "method") {
        const methodContainer = new Function(`return ({${source}});`)();
        const methodKey = Reflect.ownKeys(methodContainer).find((key) => {
          const descriptor = Object.getOwnPropertyDescriptor(methodContainer, key);
          return descriptor && typeof descriptor.value === "function";
        });
        if (methodKey === undefined) {
          throw new TypeError("Serialized graphics painter method did not produce a function.");
        }
        return methodContainer[methodKey];
      }

      throw new SyntaxError(`Unsupported graphics painter source kind "${sourceKind}".`);
    }
  }

  QHTMLGraphicsPainterDescriptor._functionDescriptors = new WeakMap();

  class QHTMLGraphicsMaskerDescriptor extends QHTMLGraphicsPainterDescriptor {
    static fromFunction(maskerFunction) {
      if (typeof maskerFunction !== "function") {
        throw new TypeError("Graphics masker source requires a function reference.");
      }
      const cachedDescriptor = QHTMLGraphicsMaskerDescriptor._functionDescriptors.get(maskerFunction);
      if (cachedDescriptor !== undefined) {
        return cachedDescriptor;
      }

      const painterDescriptor = QHTMLGraphicsPainterDescriptor.fromFunction(maskerFunction);
      const maskerDescriptor = painterDescriptor
        ? new QHTMLGraphicsMaskerDescriptor(
          painterDescriptor.parameters,
          painterDescriptor.body,
          painterDescriptor.source,
          painterDescriptor.sourceKind
        )
        : null;
      QHTMLGraphicsMaskerDescriptor._functionDescriptors.set(maskerFunction, maskerDescriptor);
      return maskerDescriptor;
    }

    static fromJSON(value) {
      if (value instanceof QHTMLGraphicsMaskerDescriptor) {
        return value;
      }
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError("Graphics masker JSON must be an object.");
      }
      return new QHTMLGraphicsMaskerDescriptor(
        value.parameters,
        value.body,
        value.source,
        value.sourceKind
      );
    }

    toJSON() {
      const record = super.toJSON();
      record.qhtmlType = "QHTMLGraphicsMasker";
      record.type = "QHTMLGraphicsMasker";
      return record;
    }
  }

  QHTMLGraphicsMaskerDescriptor._functionDescriptors = new WeakMap();

  class QHTMLGraphicsRasterLayer {
    constructor() {
      this._canvas = typeof globalScope.OffscreenCanvas === "function"
        ? new globalScope.OffscreenCanvas(1, 1)
        : document.createElement("canvas");
      this._context = this._canvas.getContext("2d");
      if (!this._context) {
        throw new Error("graphics-scene could not create a raster-layer 2D context.");
      }
    }

    get canvas() {
      return this._canvas;
    }

    get context() {
      return this._context;
    }

    prepare(sourceContext, width, height) {
      if (this._canvas.width !== width) {
        this._canvas.width = width;
      }
      if (this._canvas.height !== height) {
        this._canvas.height = height;
      }

      this._context.setTransform(1, 0, 0, 1, 0, 0);
      this._context.globalAlpha = 1;
      this._context.globalCompositeOperation = "source-over";
      this._context.clearRect(0, 0, width, height);

      const sourceTransform = sourceContext.getTransform();
      this._context.setTransform(
        sourceTransform.a,
        sourceTransform.b,
        sourceTransform.c,
        sourceTransform.d,
        sourceTransform.e,
        sourceTransform.f
      );
      this._context.globalAlpha = sourceContext.globalAlpha;
      return this._context;
    }

    compositeTo(destinationContext) {
      destinationContext.save();
      try {
        destinationContext.setTransform(1, 0, 0, 1, 0, 0);
        destinationContext.globalAlpha = 1;
        destinationContext.globalCompositeOperation = "source-over";
        destinationContext.drawImage(this._canvas, 0, 0);
      } finally {
        destinationContext.restore();
      }
    }

    applyMask(maskCanvas) {
      this._context.save();
      try {
        this._context.setTransform(1, 0, 0, 1, 0, 0);
        this._context.globalAlpha = 1;
        this._context.globalCompositeOperation = "destination-in";
        this._context.drawImage(maskCanvas, 0, 0);
      } finally {
        this._context.restore();
      }
    }
  }

  class QHTMLGraphicsRasterLayerPool {
    constructor() {
      this._layers = [];
      this._activeLayers = [];
    }

    acquire(sourceContext, width, height) {
      const layerIndex = this._activeLayers.length;
      const rasterLayer = this._layers[layerIndex] || new QHTMLGraphicsRasterLayer();
      if (!this._layers[layerIndex]) {
        this._layers.push(rasterLayer);
      }
      rasterLayer.prepare(sourceContext, width, height);
      this._activeLayers.push(rasterLayer);
      return rasterLayer;
    }

    release(rasterLayer) {
      const activeLayer = this._activeLayers.pop();
      if (activeLayer !== rasterLayer) {
        throw new Error("Graphics raster layers must be released in nested rendering order.");
      }
    }
  }

  class QHTMLGraphicsTransform {
    constructor(owner, options) {
      const initial = options || {};
      this._owner = owner;
      this._x = this._number(initial.x, 0, "x");
      this._y = this._number(initial.y, 0, "y");
      this._width = this._nonNegative(initial.width, 0, "width");
      this._height = this._nonNegative(initial.height, 0, "height");
      this._opacity = this._bounded(initial.opacity, 1, 0, 1, "opacity");
      this._rotation = this._number(initial.rotation, 0, "rotation");
      this._scaleX = this._number(initial.scaleX, 1, "scaleX");
      this._scaleY = this._number(initial.scaleY, 1, "scaleY");
      this._originX = this._number(initial.transformOriginX, 0, "transformOriginX");
      this._originY = this._number(initial.transformOriginY, 0, "transformOriginY");
      this._matrix = new Float64Array(6);
      this._matrixDirty = true;
      this._identityMatrix = false;
    }

    get x() {
      return this._x;
    }

    set x(value) {
      this._set("_x", this._number(value, 0, "x"));
    }

    get y() {
      return this._y;
    }

    set y(value) {
      this._set("_y", this._number(value, 0, "y"));
    }

    get width() {
      return this._width;
    }

    set width(value) {
      this._set("_width", this._nonNegative(value, 0, "width"), false);
    }

    get height() {
      return this._height;
    }

    set height(value) {
      this._set("_height", this._nonNegative(value, 0, "height"), false);
    }

    get opacity() {
      return this._opacity;
    }

    set opacity(value) {
      this._set("_opacity", this._bounded(value, 1, 0, 1, "opacity"), false);
    }

    get rotation() {
      return this._rotation;
    }

    set rotation(value) {
      this._set("_rotation", this._number(value, 0, "rotation"));
    }

    get scaleX() {
      return this._scaleX;
    }

    set scaleX(value) {
      this._set("_scaleX", this._number(value, 1, "scaleX"));
    }

    get scaleY() {
      return this._scaleY;
    }

    set scaleY(value) {
      this._set("_scaleY", this._number(value, 1, "scaleY"));
    }

    get originX() {
      return this._originX;
    }

    set originX(value) {
      this._set("_originX", this._number(value, 0, "transformOriginX"));
    }

    get originY() {
      return this._originY;
    }

    set originY(value) {
      this._set("_originY", this._number(value, 0, "transformOriginY"));
    }

    setPosition(x, y) {
      const nextX = this._number(x, 0, "x");
      const nextY = this._number(y, 0, "y");
      return this._setPair("_x", nextX, "_y", nextY);
    }

    setSize(width, height) {
      const nextWidth = this._nonNegative(width, 0, "width");
      const nextHeight = this._nonNegative(height, 0, "height");
      return this._setPair("_width", nextWidth, "_height", nextHeight, false);
    }

    setScale(scaleX, scaleY) {
      const nextScaleX = this._number(scaleX, 1, "scaleX");
      const nextScaleY = this._number(scaleY, nextScaleX, "scaleY");
      return this._setPair("_scaleX", nextScaleX, "_scaleY", nextScaleY);
    }

    setOrigin(originX, originY) {
      const nextOriginX = this._number(originX, 0, "transformOriginX");
      const nextOriginY = this._number(originY, 0, "transformOriginY");
      return this._setPair("_originX", nextOriginX, "_originY", nextOriginY);
    }

    applyTo(context2d) {
      if (this._opacity !== 1) {
        context2d.globalAlpha *= this._opacity;
      }
      this._updateMatrix();
      if (!this._identityMatrix) {
        context2d.transform(
          this._matrix[0],
          this._matrix[1],
          this._matrix[2],
          this._matrix[3],
          this._matrix[4],
          this._matrix[5]
        );
      }
    }

    _set(propertyName, value, affectsMatrix = true) {
      if (Object.is(this[propertyName], value)) {
        return this;
      }
      this[propertyName] = value;
      if (affectsMatrix) {
        this._matrixDirty = true;
      }
      this._owner._transformChanged();
      return this;
    }

    _setPair(firstProperty, firstValue, secondProperty, secondValue, affectsMatrix = true) {
      if (
        Object.is(this[firstProperty], firstValue)
        && Object.is(this[secondProperty], secondValue)
      ) {
        return this;
      }
      this[firstProperty] = firstValue;
      this[secondProperty] = secondValue;
      if (affectsMatrix) {
        this._matrixDirty = true;
      }
      this._owner._transformChanged();
      return this;
    }

    _updateMatrix() {
      if (!this._matrixDirty) {
        return;
      }

      const angle = this._rotation * Math.PI / 180;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const a = cosine * this._scaleX;
      const b = sine * this._scaleX;
      const c = -sine * this._scaleY;
      const d = cosine * this._scaleY;
      const e = this._x + this._originX - a * this._originX - c * this._originY;
      const f = this._y + this._originY - b * this._originX - d * this._originY;

      this._matrix[0] = a;
      this._matrix[1] = b;
      this._matrix[2] = c;
      this._matrix[3] = d;
      this._matrix[4] = e;
      this._matrix[5] = f;
      this._identityMatrix = a === 1 && b === 0 && c === 0 && d === 1 && e === 0 && f === 0;
      this._matrixDirty = false;
    }

    _number(value, fallback, propertyName) {
      if (value === undefined) {
        return fallback;
      }
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        throw new TypeError(`Graphics item ${propertyName} must be a finite number.`);
      }
      return numericValue;
    }

    _nonNegative(value, fallback, propertyName) {
      return Math.max(0, this._number(value, fallback, propertyName));
    }

    _bounded(value, fallback, minimum, maximum, propertyName) {
      return Math.min(
        maximum,
        Math.max(minimum, this._number(value, fallback, propertyName))
      );
    }
  }

  function collectGraphicsItemSubtree(rootItem) {
    const collectedItems = [];
    const visitedItems = new Set();
    const itemsByUUID = new Map();

    const visitItem = (graphicsItem) => {
      if (visitedItems.has(graphicsItem)) {
        throw new Error(`Graphics item hierarchy contains a cycle at ${graphicsItem.uuid}.`);
      }
      const existingUUIDItem = itemsByUUID.get(graphicsItem.uuid);
      if (existingUUIDItem) {
        throw new Error(`Graphics item hierarchy contains duplicate UUID ${graphicsItem.uuid}.`);
      }

      visitedItems.add(graphicsItem);
      itemsByUUID.set(graphicsItem.uuid, graphicsItem);
      collectedItems.push(graphicsItem);
      graphicsItem._items.forEach(visitItem);
    };

    visitItem(rootItem);
    return collectedItems;
  }

  class QHTMLGraphicsItem {
    constructor(options) {
      const initial = options || {};
      this._uuid = String(initial.uuid || QHTMLGraphicsIdentity.create("graphics-item"));
      this._scene = null;
      this._context2d = null;
      this._parentItem = null;
      this._items = [];
      this._painter = QHTMLGraphicsItem.emptyPainter;
      this._painterDescriptor = null;
      this._masker = null;
      this._maskerDescriptor = null;
      this._transform = new QHTMLGraphicsTransform(this, initial);
      this._visible = initial.visible !== false;
      if (initial.painterSource) {
        const descriptor = QHTMLGraphicsPainterDescriptor.fromJSON(initial.painterSource);
        this.setPainter(descriptor.compile(), descriptor);
      } else if (initial.painter) {
        this.setPainter(initial.painter, initial.painterDescriptor);
      }
      if (initial.maskerSource) {
        const descriptor = QHTMLGraphicsMaskerDescriptor.fromJSON(initial.maskerSource);
        this.setMasker(descriptor.compile(), descriptor);
      } else if (initial.masker) {
        this.setMasker(initial.masker, initial.maskerDescriptor);
      }
    }

    static emptyPainter(context2d, scene) {
      void context2d;
      void scene;
    }

    get uuid() {
      return this._uuid;
    }

    get scene() {
      return this._scene;
    }

    get context() {
      return this._context2d;
    }

    get context2d() {
      return this._context2d;
    }

    get parentItem() {
      return this._parentItem;
    }

    get itemCount() {
      return this._items.length;
    }

    get painter() {
      return this._painter;
    }

    get painterDescriptor() {
      return this._painterDescriptor;
    }

    get masker() {
      return this._masker;
    }

    get maskerDescriptor() {
      return this._maskerDescriptor;
    }

    get hasMask() {
      return this._masker !== null;
    }

    get transform() {
      return this._transform;
    }

    get x() {
      return this._transform.x;
    }

    set x(value) {
      this._transform.x = value;
    }

    get y() {
      return this._transform.y;
    }

    set y(value) {
      this._transform.y = value;
    }

    get width() {
      return this._transform.width;
    }

    set width(value) {
      this._transform.width = value;
    }

    get height() {
      return this._transform.height;
    }

    set height(value) {
      this._transform.height = value;
    }

    get opacity() {
      return this._transform.opacity;
    }

    set opacity(value) {
      this._transform.opacity = value;
    }

    get rotation() {
      return this._transform.rotation;
    }

    set rotation(value) {
      this._transform.rotation = value;
    }

    get scaleX() {
      return this._transform.scaleX;
    }

    set scaleX(value) {
      this._transform.scaleX = value;
    }

    get scaleY() {
      return this._transform.scaleY;
    }

    set scaleY(value) {
      this._transform.scaleY = value;
    }

    get transformOriginX() {
      return this._transform.originX;
    }

    set transformOriginX(value) {
      this._transform.originX = value;
    }

    get transformOriginY() {
      return this._transform.originY;
    }

    set transformOriginY(value) {
      this._transform.originY = value;
    }

    get visible() {
      return this._visible;
    }

    set visible(value) {
      const nextVisible = Boolean(value);
      if (this._visible === nextVisible) {
        return;
      }
      this._visible = nextVisible;
      this._transformChanged();
    }

    setPainter(painterFunction, painterDescriptor) {
      if (typeof painterFunction !== "function") {
        throw new TypeError("graphicsItem.setPainter() requires a function reference.");
      }
      this._painter = painterFunction;
      this._painterDescriptor = painterDescriptor
        ? QHTMLGraphicsPainterDescriptor.fromJSON(painterDescriptor)
        : QHTMLGraphicsPainterDescriptor.fromFunction(painterFunction);
      this._scene?.requestRepaint();
      return this;
    }

    setPainterSource(parameters, body) {
      const descriptor = new QHTMLGraphicsPainterDescriptor(parameters, body);
      return this.setPainter(descriptor.compile(), descriptor);
    }

    setMasker(maskerFunction, maskerDescriptor) {
      if (typeof maskerFunction !== "function") {
        throw new TypeError("graphicsItem.setMasker() requires a function reference.");
      }
      this._masker = maskerFunction;
      this._maskerDescriptor = maskerDescriptor
        ? QHTMLGraphicsMaskerDescriptor.fromJSON(maskerDescriptor)
        : QHTMLGraphicsMaskerDescriptor.fromFunction(maskerFunction);
      this._scene?.requestRepaint();
      return this;
    }

    setMaskerSource(parameters, body) {
      const descriptor = new QHTMLGraphicsMaskerDescriptor(parameters, body);
      return this.setMasker(descriptor.compile(), descriptor);
    }

    clearMasker() {
      if (!this._masker) {
        return this;
      }
      this._masker = null;
      this._maskerDescriptor = null;
      this._scene?.requestRepaint();
      return this;
    }

    paint() {
      if (!this._context2d) {
        return;
      }
      return this._paintTo(this._context2d);
    }

    _paintTo(context2d) {
      if (this._masker) {
        return this._paintMaskedTo(context2d);
      }
      return this._paintContentTo(context2d);
    }

    _paintContentTo(context2d) {
      context2d.save();
      try {
        this._transform.applyTo(context2d);
        context2d.save();
        let painterResult;
        try {
          painterResult = this._painter.call(this, context2d, this._scene);
        } finally {
          context2d.restore();
        }
        this._items.forEach((graphicsItem) => {
          if (graphicsItem.visible) {
            graphicsItem._paintTo(context2d);
          }
        });
        return painterResult;
      } finally {
        context2d.restore();
      }
    }

    _paintMaskedTo(destinationContext) {
      const contentLayer = this._scene._acquireRasterLayer(destinationContext);
      try {
        const painterResult = this._paintContentTo(contentLayer.context);
        const maskLayer = this._scene._acquireRasterLayer(destinationContext);
        try {
          this._paintMaskTo(maskLayer.context);
          contentLayer.applyMask(maskLayer.canvas);
        } finally {
          this._scene._releaseRasterLayer(maskLayer);
        }
        contentLayer.compositeTo(destinationContext);
        return painterResult;
      } finally {
        this._scene._releaseRasterLayer(contentLayer);
      }
    }

    _paintMaskTo(context2d) {
      context2d.save();
      try {
        this._transform.applyTo(context2d);
        context2d.globalAlpha = 1;
        context2d.globalCompositeOperation = "source-over";
        return this._masker.call(this, context2d, this._scene);
      } finally {
        context2d.restore();
      }
    }

    addItem(graphicsItem) {
      if (!(graphicsItem instanceof QHTMLGraphicsItem)) {
        throw new TypeError("graphicsItem.addItem() requires a QHTMLGraphicsItem.");
      }
      if (graphicsItem === this) {
        throw new Error("A graphics item cannot be added as a child of itself.");
      }
      for (let ancestorItem = this; ancestorItem; ancestorItem = ancestorItem._parentItem) {
        if (ancestorItem === graphicsItem) {
          throw new Error("A graphics item cannot be added beneath one of its descendants.");
        }
      }
      if (graphicsItem._parentItem === this) {
        return graphicsItem;
      }

      if (this._scene) {
        return this._scene._addChildItem(this, graphicsItem);
      }
      if (graphicsItem._scene) {
        throw new Error(
          `Graphics item ${graphicsItem.uuid} belongs to a scene and cannot be added to a detached parent.`
        );
      }

      const thisRoot = this._rootItem();
      const graphicsItemRoot = graphicsItem._rootItem();
      if (thisRoot !== graphicsItemRoot) {
        const currentUUIDs = new Set(
          collectGraphicsItemSubtree(thisRoot).map((item) => item.uuid)
        );
        collectGraphicsItemSubtree(graphicsItem).forEach((item) => {
          if (currentUUIDs.has(item.uuid)) {
            throw new Error(`Graphics item UUID ${item.uuid} already exists in this hierarchy.`);
          }
        });
      }

      graphicsItem._parentItem?._removeDirectItem(graphicsItem);
      this._appendDirectItem(graphicsItem);
      return graphicsItem;
    }

    removeItem(graphicsItem) {
      if (!(graphicsItem instanceof QHTMLGraphicsItem)) {
        throw new TypeError("graphicsItem.removeItem() requires a QHTMLGraphicsItem.");
      }
      if (graphicsItem._parentItem !== this) {
        return false;
      }
      if (this._scene) {
        return this._scene._removeAttachedItem(graphicsItem);
      }

      this._removeDirectItem(graphicsItem);
      return true;
    }

    listItems() {
      return this._items.slice();
    }

    setX(x) {
      this.x = x;
      return this;
    }

    setY(y) {
      this.y = y;
      return this;
    }

    setPosition(x, y) {
      this._transform.setPosition(x, y);
      return this;
    }

    setWidth(width) {
      this.width = width;
      return this;
    }

    setHeight(height) {
      this.height = height;
      return this;
    }

    setSize(width, height) {
      this._transform.setSize(width, height);
      return this;
    }

    setOpacity(opacity) {
      this.opacity = opacity;
      return this;
    }

    setRotation(rotation) {
      this.rotation = rotation;
      return this;
    }

    setScale(scaleX, scaleY) {
      this._transform.setScale(scaleX, scaleY);
      return this;
    }

    setTransformOrigin(originX, originY) {
      this._transform.setOrigin(originX, originY);
      return this;
    }

    setVisible(visible) {
      this.visible = visible;
      return this;
    }

    toJSON() {
      return {
        qhtmlType: "QHTMLGraphicsItem",
        qhtmlUUID: this._uuid,
        type: "QHTMLGraphicsItem",
        uuid: this._uuid,
        properties: {
          x: this.x,
          y: this.y,
          width: this.width,
          height: this.height,
          opacity: this.opacity,
          rotation: this.rotation,
          scaleX: this.scaleX,
          scaleY: this.scaleY,
          transformOriginX: this.transformOriginX,
          transformOriginY: this.transformOriginY,
          visible: this.visible
        },
        painter: this._painterDescriptor ? this._painterDescriptor.toJSON() : null,
        masker: this._maskerDescriptor ? this._maskerDescriptor.toJSON() : null,
        items: this._items.map((graphicsItem) => graphicsItem.toJSON())
      };
    }

    static fromJSON(value) {
      const record = typeof value === "string" ? JSON.parse(value) : value;
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        throw new TypeError("Graphics item JSON must be an object.");
      }
      const type = String(record.qhtmlType || record.type || "QHTMLGraphicsItem");
      if (type !== "QHTMLGraphicsItem") {
        throw new TypeError(`Cannot restore graphics item from type "${type}".`);
      }

      const properties = record.properties && typeof record.properties === "object"
        ? record.properties
        : record;
      const item = new QHTMLGraphicsItem({
        uuid: record.qhtmlUUID || record.uuid,
        x: properties.x,
        y: properties.y,
        width: properties.width,
        height: properties.height,
        opacity: properties.opacity,
        rotation: properties.rotation,
        scaleX: properties.scaleX,
        scaleY: properties.scaleY,
        transformOriginX: properties.transformOriginX,
        transformOriginY: properties.transformOriginY,
        visible: properties.visible
      });

      if (record.painter) {
        const descriptor = QHTMLGraphicsPainterDescriptor.fromJSON(record.painter);
        item.setPainter(descriptor.compile(), descriptor);
      }
      if (record.masker) {
        const descriptor = QHTMLGraphicsMaskerDescriptor.fromJSON(record.masker);
        item.setMasker(descriptor.compile(), descriptor);
      }
      if (record.items !== undefined && !Array.isArray(record.items)) {
        throw new TypeError("Graphics item JSON items must be an array.");
      }
      (record.items || []).forEach((itemRecord) => {
        item.addItem(QHTMLGraphicsItem.fromJSON(itemRecord));
      });
      return item;
    }

    _transformChanged() {
      this._scene?.requestRepaint();
    }

    _attachToScene(scene, context2d) {
      if (this._scene && this._scene !== scene) {
        throw new Error(`Graphics item ${this._uuid} already belongs to another scene.`);
      }
      this._scene = scene;
      this._context2d = context2d;
    }

    _detachFromScene(scene) {
      if (this._scene === scene) {
        this._scene = null;
        this._context2d = null;
      }
    }

    _rootItem() {
      let rootItem = this;
      while (rootItem._parentItem) {
        rootItem = rootItem._parentItem;
      }
      return rootItem;
    }

    _appendDirectItem(graphicsItem) {
      graphicsItem._parentItem = this;
      this._items.push(graphicsItem);
    }

    _removeDirectItem(graphicsItem) {
      const itemIndex = this._items.indexOf(graphicsItem);
      if (itemIndex === -1) {
        return false;
      }
      this._items.splice(itemIndex, 1);
      graphicsItem._parentItem = null;
      return true;
    }
  }

  class QHTMLGraphicsScene extends HTMLElement {
    constructor() {
      super();
      this._itemsByUUID = new Map();
      this._items = [];
      this._frameRequest = 0;
      this._logicalWidth = DEFAULT_SCENE_WIDTH;
      this._logicalHeight = DEFAULT_SCENE_HEIGHT;
      this._pixelRatio = 1;
      this._rasterLayerPool = new QHTMLGraphicsRasterLayerPool();

      this._canvas = document.createElement("canvas");
      this._canvas.setAttribute("data-qhtml-graphics-surface", "");
      this._canvas.width = DEFAULT_SCENE_WIDTH;
      this._canvas.height = DEFAULT_SCENE_HEIGHT;
      this._canvas.style.display = "block";
      this._canvas.style.width = "100%";
      this._canvas.style.height = "100%";

      this._context = this._canvas.getContext("2d");
      if (!this._context) {
        throw new Error("graphics-scene could not create a 2D rendering context.");
      }

      this._resizeObserver = new ResizeObserver(() => {
        this.requestRepaint();
      });
    }

    connectedCallback() {
      if (this._canvas.parentNode !== this) {
        this.prepend(this._canvas);
      }
      if (!this.style.display) {
        this.style.display = "block";
      }
      this._resizeObserver.observe(this);
      this.requestRepaint();
    }

    disconnectedCallback() {
      this._resizeObserver.disconnect();
      if (this._frameRequest) {
        globalScope.cancelAnimationFrame(this._frameRequest);
        this._frameRequest = 0;
      }
    }

    get canvas() {
      return this._canvas;
    }

    get context() {
      return this._context;
    }

    get itemCount() {
      return this._itemsByUUID.size;
    }

    createItem(options) {
      return this.addItem(new QHTMLGraphicsItem(options));
    }

    addItem(graphicsItem) {
      if (!(graphicsItem instanceof QHTMLGraphicsItem)) {
        throw new TypeError("graphics-scene.addItem() requires a QHTMLGraphicsItem.");
      }

      if (graphicsItem._scene === this) {
        if (!graphicsItem._parentItem) {
          return graphicsItem;
        }
        graphicsItem._parentItem._removeDirectItem(graphicsItem);
        this._items.push(graphicsItem);
        this.requestRepaint();
        return graphicsItem;
      }

      this._validateSubtreeForAttachment(graphicsItem);
      graphicsItem._parentItem?._removeDirectItem(graphicsItem);
      this._items.push(graphicsItem);
      this._registerSubtree(graphicsItem);
      this.requestRepaint();
      this._dispatchItemEvent("graphicsitemadded", graphicsItem);
      return graphicsItem;
    }

    removeItem(graphicsItem) {
      if (!(graphicsItem instanceof QHTMLGraphicsItem)) {
        throw new TypeError("graphics-scene.removeItem() requires a QHTMLGraphicsItem.");
      }
      if (this._itemsByUUID.get(graphicsItem.uuid) !== graphicsItem) {
        return false;
      }
      return this._removeAttachedItem(graphicsItem);
    }

    listItems() {
      return this._items.slice();
    }

    itemByUUID(uuid) {
      return this._itemsByUUID.get(String(uuid || ""));
    }

    clearItems() {
      const removedItems = this._items.slice();
      this._items.length = 0;
      removedItems.forEach((graphicsItem) => {
        this._unregisterSubtree(graphicsItem);
      });
      this._itemsByUUID.clear();
      this.requestRepaint();
      return removedItems;
    }

    toJSON() {
      return {
        qhtmlType: "QHTMLGraphicsScene",
        type: "QHTMLGraphicsScene",
        version: 1,
        items: this._items.map((graphicsItem) => graphicsItem.toJSON())
      };
    }

    fromJSON(value) {
      const record = typeof value === "string" ? JSON.parse(value) : value;
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        throw new TypeError("Graphics scene JSON must be an object.");
      }
      const type = String(record.qhtmlType || record.type || "QHTMLGraphicsScene");
      if (type !== "QHTMLGraphicsScene") {
        throw new TypeError(`Cannot restore graphics scene from type "${type}".`);
      }
      if (!Array.isArray(record.items)) {
        throw new TypeError("Graphics scene JSON items must be an array.");
      }

      const restoredItems = record.items.map((itemRecord) => QHTMLGraphicsItem.fromJSON(itemRecord));
      const restoredUUIDs = new Set();
      restoredItems.forEach((graphicsItem) => {
        collectGraphicsItemSubtree(graphicsItem).forEach((subtreeItem) => {
          if (restoredUUIDs.has(subtreeItem.uuid)) {
            throw new Error(`Graphics scene JSON contains duplicate UUID ${subtreeItem.uuid}.`);
          }
          restoredUUIDs.add(subtreeItem.uuid);
        });
      });

      this.clearItems();
      restoredItems.forEach((graphicsItem) => {
        this.addItem(graphicsItem);
      });
      return this;
    }

    requestRepaint() {
      if (this._frameRequest) {
        return;
      }
      this._frameRequest = globalScope.requestAnimationFrame(() => {
        this._frameRequest = 0;
        this.repaint();
      });
    }

    repaint() {
      this._resizeSurface();
      this._context.setTransform(this._pixelRatio, 0, 0, this._pixelRatio, 0, 0);
      this._context.clearRect(0, 0, this._logicalWidth, this._logicalHeight);
      this._items.forEach((graphicsItem) => {
        if (graphicsItem.visible) {
          graphicsItem.paint();
        }
      });
    }

    _addChildItem(parentItem, graphicsItem) {
      if (parentItem._scene !== this) {
        throw new Error(`Graphics item ${parentItem.uuid} does not belong to this scene.`);
      }
      if (graphicsItem._scene && graphicsItem._scene !== this) {
        throw new Error(`Graphics item ${graphicsItem.uuid} already belongs to another scene.`);
      }

      if (graphicsItem._scene === this) {
        this._unlinkItemPosition(graphicsItem);
        parentItem._appendDirectItem(graphicsItem);
        this.requestRepaint();
        return graphicsItem;
      }

      this._validateSubtreeForAttachment(graphicsItem);
      graphicsItem._parentItem?._removeDirectItem(graphicsItem);
      parentItem._appendDirectItem(graphicsItem);
      this._registerSubtree(graphicsItem);
      this.requestRepaint();
      this._dispatchItemEvent("graphicsitemadded", graphicsItem);
      return graphicsItem;
    }

    _removeAttachedItem(graphicsItem) {
      if (this._itemsByUUID.get(graphicsItem.uuid) !== graphicsItem) {
        return false;
      }

      this._unlinkItemPosition(graphicsItem);
      this._unregisterSubtree(graphicsItem);
      this.requestRepaint();
      this._dispatchItemEvent("graphicsitemremoved", graphicsItem);
      return true;
    }

    _unlinkItemPosition(graphicsItem) {
      if (graphicsItem._parentItem) {
        graphicsItem._parentItem._removeDirectItem(graphicsItem);
        return;
      }
      const rootIndex = this._items.indexOf(graphicsItem);
      if (rootIndex !== -1) {
        this._items.splice(rootIndex, 1);
      }
    }

    _validateSubtreeForAttachment(graphicsItem) {
      collectGraphicsItemSubtree(graphicsItem).forEach((subtreeItem) => {
        if (subtreeItem._scene && subtreeItem._scene !== this) {
          throw new Error(`Graphics item ${subtreeItem.uuid} already belongs to another scene.`);
        }
        const existingItem = this._itemsByUUID.get(subtreeItem.uuid);
        if (existingItem && existingItem !== subtreeItem) {
          throw new Error(`Graphics item UUID ${subtreeItem.uuid} already exists in this scene.`);
        }
      });
    }

    _registerSubtree(graphicsItem) {
      collectGraphicsItemSubtree(graphicsItem).forEach((subtreeItem) => {
        subtreeItem._attachToScene(this, this._context);
        this._itemsByUUID.set(subtreeItem.uuid, subtreeItem);
      });
    }

    _unregisterSubtree(graphicsItem) {
      collectGraphicsItemSubtree(graphicsItem).forEach((subtreeItem) => {
        if (this._itemsByUUID.get(subtreeItem.uuid) === subtreeItem) {
          this._itemsByUUID.delete(subtreeItem.uuid);
        }
        subtreeItem._detachFromScene(this);
      });
    }

    _dispatchItemEvent(eventName, graphicsItem) {
      this.dispatchEvent(new CustomEvent(eventName, {
        bubbles: false,
        detail: { scene: this, item: graphicsItem, uuid: graphicsItem.uuid }
      }));
    }

    _acquireRasterLayer(sourceContext) {
      return this._rasterLayerPool.acquire(
        sourceContext,
        this._canvas.width,
        this._canvas.height
      );
    }

    _releaseRasterLayer(rasterLayer) {
      this._rasterLayerPool.release(rasterLayer);
    }

    _resizeSurface() {
      const bounds = this.getBoundingClientRect();
      const logicalWidth = Math.max(1, bounds.width || this._canvas.clientWidth || DEFAULT_SCENE_WIDTH);
      const logicalHeight = Math.max(1, bounds.height || this._canvas.clientHeight || DEFAULT_SCENE_HEIGHT);
      const pixelRatio = Math.max(1, Number(globalScope.devicePixelRatio) || 1);
      const backingWidth = Math.ceil(logicalWidth * pixelRatio);
      const backingHeight = Math.ceil(logicalHeight * pixelRatio);

      this._logicalWidth = logicalWidth;
      this._logicalHeight = logicalHeight;
      this._pixelRatio = pixelRatio;

      if (this._canvas.width !== backingWidth) {
        this._canvas.width = backingWidth;
      }
      if (this._canvas.height !== backingHeight) {
        this._canvas.height = backingHeight;
      }
    }
  }

  globalScope.QHTMLGraphicsPainterDescriptor = QHTMLGraphicsPainterDescriptor;
  globalScope.QHTMLGraphicsMaskerDescriptor = QHTMLGraphicsMaskerDescriptor;
  globalScope.QHTMLGraphicsRasterLayer = QHTMLGraphicsRasterLayer;
  globalScope.QHTMLGraphicsRasterLayerPool = QHTMLGraphicsRasterLayerPool;
  globalScope.QHTMLGraphicsTransform = QHTMLGraphicsTransform;
  globalScope.QHTMLGraphicsItem = QHTMLGraphicsItem;
  globalScope.QHTMLGraphicsScene = QHTMLGraphicsScene;
  globalScope.QHTMLGraphics = Object.assign(globalScope.QHTMLGraphics || {}, {
    QHTMLGraphicsPainterDescriptor,
    QHTMLGraphicsMaskerDescriptor,
    QHTMLGraphicsRasterLayer,
    QHTMLGraphicsRasterLayerPool,
    QHTMLGraphicsTransform,
    QHTMLGraphicsItem,
    QHTMLGraphicsScene
  });

  if (!globalScope.customElements.get(GRAPHICS_SCENE_TAG)) {
    globalScope.customElements.define(GRAPHICS_SCENE_TAG, QHTMLGraphicsScene);
  }
})(typeof globalThis !== "undefined" ? globalThis : window);


/* ---- js/qhtml-element.js ---- */
(function () {
  "use strict";

  const globalScope = typeof globalThis !== "undefined" ? globalThis : window;
  const ELEMENT_NAME = "q-html";
  const ELEMENT_NAME_7 = "q-html7";
  const ELEMENT_NAME_6 = "q-html6";
  const ELEMENT_NAME_ERROR = "q-html-error";
  const QHTML_VERSION = String(globalScope.QHTML_VERSION || "7.4.0");
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
  const qhtmlReferenceFacades = new WeakMap();
  const qhtmlReferenceNodeFacades = new WeakMap();
  const qhtmlReferenceAliases = new WeakMap();
  const QHTML_DIRECT_ALIAS_RESERVED_NAMES = new Set([
    "qhtmlNode",
    "qhtmlDomTree",
    "qhtmlResolve",
    "qhtmlResolveNode",
    "qhtmlHasReference",
    "qhtmlReferenceNames",
    "qhtmlReferenceUUIDs",
    "qhtmlReferences",
    "qhtmlReferenceNodes",
    "setContextProperty",
    "render",
    "__qhtmlRegistry"
  ]);

  globalScope.QHTML7 = Object.assign(globalScope.QHTML7 || {}, {
    runtime: "native-js",
    nativeRuntime: true
  });

  if (!globalScope.QHTMLTypes || typeof globalScope.QHTMLTypes.QHTMLDomTree !== "function") {
    console.log("qhtml-element.js must be loaded after qhtml_types.js initializes QHTMLTypes");
  }

  const QHTMLTypes = globalScope.QHTMLTypes;

  function qhtmlTreeFromJson(json) {
    const tree = new QHTMLTypes.QHTMLDomTree();
    if (typeof tree.fromJSON === "function") {
      const ok = tree.fromJSON(json);
      if (!ok) {
        throw new Warning("QHTMLTypes.QHTMLDomTree fromJSON failed");

      }
      return tree;
    }
    if (typeof tree.fromJSONText === "function") {
      const ok = tree.fromJSONText(JSON.stringify(json));
      if (!ok) {
        console.log("QHTMLTypes.QHTMLDomTree fromJSONText failed");
      }
      return tree;
    }
    console.log("QHTMLTypes.QHTMLDomTree does not expose fromJSON/fromJSONText");
  }

  function instantiateParserTree(source, contextNode) {
    const Parser = QHTMLTypes.QHTMLParser || globalScope.QHTMLParser;
    if (typeof Parser !== "function") {
      console.log("js/qhtml_parser.js must expose QHTMLParser before qhtml-element.js can parse QHTML source");
    }

    const parser = new Parser();
    if (typeof parser.parseTree === "function") {
      const tree = parser.parseTree(String(source || ""), contextNode || null);
      return { parser, tree };
    }
    if (typeof parser.parseToJSON === "function") {
      return { parser, tree: qhtmlTreeFromJson(parser.parseToJSON(String(source || ""), contextNode || null)) };
    }
    if (typeof parser.parse === "function") {
      const parsed = parser.parse(String(source || ""), contextNode || null);
      if (parsed instanceof QHTMLTypes.QHTMLDomTree) {
        return { parser, tree: parsed };
      }
      if (Array.isArray(parsed) || (parsed && typeof parsed === "object")) {
        return { parser, tree: qhtmlTreeFromJson(parsed) };
      }
    }
    console.log("QHTMLParser must expose parseTree(), parseToJSON(), or parse() returning a QHTMLDomTree/JSON tree");
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
      console.log(
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
        console.log(`QHTML resource not found: ${path}`);
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
        console.log(`QHTML ${importDef.kind} failed for ${path}: ${fetchError && fetchError.message ? fetchError.message : fetchError}`);
      }
      if (!response.ok) {
        console.log(`QHTML ${importDef.kind} failed for ${path}: ${response.status} ${response.statusText}`);
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
    console.log("QHTML q-require nesting exceeded 8 expansion passes");
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

  function walkQHTMLNode(node, visitor, visited = new Set()) {
    if (!node || typeof visitor !== "function") {
      return;
    }
    const uuid = qhtmlNodeUuid(node);
    const identity = uuid || node;
    if (visited.has(identity)) {
      return;
    }
    visited.add(identity);
    visitor(node);
    const count = typeof node.childCount === "function" ? node.childCount() : 0;
    for (let index = 0; index < count; index += 1) {
      walkQHTMLNode(node.childAt(index), visitor, visited);
    }
    if (typeof node.componentDefinition === "function") {
      const definition = node.componentDefinition();
      if (definition && definition !== node) {
        walkQHTMLNode(definition, visitor, visited);
      }
    }
    if (typeof node.lastRenderedIterationNodes === "function") {
      node.lastRenderedIterationNodes().forEach((child) => {
        walkQHTMLNode(child, visitor, visited);
      });
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

  const QHTML_JAVASCRIPT_RESERVED_WORDS = new Set([
    "await", "break", "case", "catch", "class", "const", "continue", "debugger",
    "default", "delete", "do", "else", "enum", "export", "extends", "false",
    "finally", "for", "function", "if", "implements", "import", "in",
    "instanceof", "interface", "let", "new", "null", "package", "private",
    "protected", "public", "return", "static", "super", "switch", "this",
    "throw", "true", "try", "typeof", "var", "void", "while", "with",
    "yield", "arguments", "eval"
  ]);

  function isValidPropertyIdentifier(name) {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(String(name || ""));
  }

  function isValidContextIdentifier(name) {
    const text = String(name || "");
    return isValidPropertyIdentifier(text) && !QHTML_JAVASCRIPT_RESERVED_WORDS.has(text);
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


  const QHTML_LAYOUT_SELECTOR = [
    '[qhtml-layout="q-layout"]',
    '[qhtml-layout="q-row"]',
    '[qhtml-layout="q-col"]'
  ].join(',');

  function qhtmlLayoutElements(rootElement) {
    if (!rootElement) {
      return [];
    }
    const elements = [];
    if (rootElement.matches && rootElement.matches(QHTML_LAYOUT_SELECTOR)) {
      elements.push(rootElement);
    }
    if (rootElement.querySelectorAll) {
      rootElement.querySelectorAll(QHTML_LAYOUT_SELECTOR).forEach((element) => elements.push(element));
    }
    return elements;
  }

  /*
   * The browser runtime intentionally does not perform editor geometry work.
   * Layout-builder resizing, gaps, ancestor growth, intrinsic minimums, and
   * constraint redistribution belong to the layout-builder implementation.
   *
   * Runtime layout semantics are limited to the natural cross-axis fill rule:
   *   - q-row fills the available width of its parent layout.
   *   - q-col fills the available height of its parent layout.
   *
   * The authored/resized axis is left untouched: q-row height and q-col width
   * remain exactly as declared by QHTML or by the layout builder.
   */
  function createQHTMLLayoutController(rootElement, registry) {
    const previousInlineStyles = new WeakMap();
    let mutationObserver = null;
    let animationFrame = 0;
    let disposed = false;

    function rememberInlineStyle(element, propertyName) {
      let properties = previousInlineStyles.get(element);
      if (!properties) {
        properties = new Map();
        previousInlineStyles.set(element, properties);
      }
      if (!properties.has(propertyName)) {
        properties.set(propertyName, {
          value: element.style.getPropertyValue(propertyName),
          priority: element.style.getPropertyPriority(propertyName)
        });
      }
    }

    function setManagedStyle(element, propertyName, value) {
      if (!element || !element.style) {
        return;
      }
      rememberInlineStyle(element, propertyName);
      if (element.style.getPropertyValue(propertyName) !== value) {
        element.style.setProperty(propertyName, value);
      }
    }

    function releaseManagedStyle(element, propertyName) {
      const properties = previousInlineStyles.get(element);
      if (!properties || !properties.has(propertyName) || !element || !element.style) {
        return;
      }
      const previous = properties.get(propertyName);
      if (previous.value) {
        element.style.setProperty(propertyName, previous.value, previous.priority || '');
      } else {
        element.style.removeProperty(propertyName);
      }
      properties.delete(propertyName);
      if (!properties.size) {
        previousInlineStyles.delete(element);
      }
    }

    function applyParentFill(element) {
      if (!element || !element.style) {
        return;
      }
      const type = String(element.getAttribute('qhtml-layout') || '').toLowerCase();
      setManagedStyle(element, 'box-sizing', 'border-box');

      if (type === 'q-row') {
        releaseManagedStyle(element, 'height');
        setManagedStyle(element, 'width', '100%');
        setManagedStyle(element, 'align-self', 'stretch');
        return;
      }
      if (type === 'q-col') {
        releaseManagedStyle(element, 'width');
        setManagedStyle(element, 'height', '100%');
        setManagedStyle(element, 'align-self', 'stretch');
        return;
      }

      releaseManagedStyle(element, 'width');
      releaseManagedStyle(element, 'height');
      releaseManagedStyle(element, 'align-self');
    }

    function run() {
      animationFrame = 0;
      if (disposed || isQHTML7RegistryDisposed(registry)) {
        return false;
      }
      qhtmlLayoutElements(rootElement).forEach(applyParentFill);
      return true;
    }

    function schedule() {
      if (disposed || animationFrame) {
        return false;
      }
      animationFrame = globalScope.requestAnimationFrame(run);
      return true;
    }

    function refresh() {
      return schedule();
    }

    function refreshNow() {
      if (disposed) {
        return false;
      }
      if (animationFrame) {
        globalScope.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
      return run();
    }

    function start() {
      if (disposed) {
        return false;
      }
      if (typeof MutationObserver === 'function') {
        mutationObserver = new MutationObserver(schedule);
        mutationObserver.observe(rootElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['qhtml-layout']
        });
      }
      return schedule();
    }

    function restoreManagedStyles(element) {
      const properties = previousInlineStyles.get(element);
      if (!properties || !element || !element.style) {
        return;
      }
      properties.forEach((previous, propertyName) => {
        if (previous.value) {
          element.style.setProperty(propertyName, previous.value, previous.priority || '');
        } else {
          element.style.removeProperty(propertyName);
        }
      });
      previousInlineStyles.delete(element);
    }

    function dispose() {
      disposed = true;
      if (animationFrame) {
        globalScope.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
      qhtmlLayoutElements(rootElement).forEach(restoreManagedStyles);
    }

    return { start, schedule, refresh, refreshNow, run, dispose };
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
    const cssName = cssShortcutPropertyName(qhtmlNodeName(propertyNode));
    const geometryValue = cssGeometryReferenceValue(cssName, rawValue, domElement, registry);
    const value = typeof geometryValue !== "undefined"
      ? geometryValue
      : cssShortcutValue(rawValue, domElement, propertyNode, registry);
    domElement.style.setProperty(cssName, serializeCssShortcutValue(cssName, value, cssShortcutRawValue(domElement, cssName)));
    if (typeof geometryValue !== "undefined" && typeof globalScope.requestAnimationFrame === "function") {
      globalScope.requestAnimationFrame(() => {
        const nextValue = cssGeometryReferenceValue(cssName, rawValue, domElement, registry);
          if (typeof nextValue !== "undefined") {
            domElement.style.setProperty(cssName, nextValue);
          }
      });
    }
  }

  function parseCssRuntimeValue(value) {
    if (value instanceof QHTMLCssRuntimeValue) {
      return {
        number: value.number,
        unit: value.unit,
        text: value.text,
        element: value.element,
        property: value.property
      };
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return { number: value, unit: "", text: String(value), element: null, property: "" };
    }
    const text = String(value == null ? "" : value).trim();
    const match = text.match(/^([-+]?(?:\d*\.\d+|\d+))(.*)$/);
    if (!match) {
      return { number: Number.NaN, unit: "", text, element: null, property: "" };
    }
    return {
      number: Number.parseFloat(match[1]),
      unit: String(match[2] || "").trim(),
      text,
      element: null,
      property: ""
    };
  }

  function cssShortcutRawValue(domElement, cssName) {
    if (!domElement || !domElement.style) {
      return "";
    }
    const inlineValue = domElement.style.getPropertyValue(cssName);
    if (inlineValue !== "") {
      return inlineValue.trim();
    }
    const view = domElement.ownerDocument && domElement.ownerDocument.defaultView;
    const computed = view && typeof view.getComputedStyle === "function"
      ? view.getComputedStyle(domElement)
      : null;
    return computed ? String(computed.getPropertyValue(cssName) || "").trim() : "";
  }

  function cssShortcutNumericValue(domElement, cssName) {
    const parsed = parseCssRuntimeValue(cssShortcutRawValue(domElement, cssName));
    return Number.isFinite(parsed.number) ? parsed.number : 0;
  }

  class QHTMLCssRuntimeValue {
    constructor(element, property, text) {
      const parsed = parseCssRuntimeValue(text);
      this.element = element || null;
      this.property = cssShortcutPropertyName(property);
      this.text = parsed.text;
      this.number = Number.isFinite(parsed.number) ? parsed.number : 0;
      this.unit = parsed.unit;
    }

    toString() {
      return this.text;
    }

    valueOf() {
      return this.number;
    }

    [Symbol.toPrimitive](hint) {
      return hint === "string" ? this.toString() : this.valueOf();
    }

    with(number, unit) {
      const nextUnit = unit == null ? this.unit : String(unit);
      return new QHTMLCssRuntimeValue(this.element, this.property, `${number}${nextUnit}`);
    }

    add(other) {
      return this._combine(other, 1);
    }

    sub(other) {
      return this._combine(other, -1);
    }

    mul(other) {
      const parsed = parseCssRuntimeValue(other);
      return this.with(this.number * (Number.isFinite(parsed.number) ? parsed.number : 0), this.unit);
    }

    div(other) {
      const parsed = parseCssRuntimeValue(other);
      const divisor = Number.isFinite(parsed.number) && parsed.number !== 0 ? parsed.number : 1;
      return this.with(this.number / divisor, this.unit);
    }

    _combine(other, direction) {
      const parsed = parseCssRuntimeValue(other);
      if (!Number.isFinite(parsed.number)) {
        return this.with(this.number, this.unit);
      }
      if (!parsed.unit || parsed.unit === this.unit) {
        return this.with(this.number + direction * parsed.number, this.unit || parsed.unit);
      }
      if (parsed.unit === "%") {
        return this.with(this.number * (1 + direction * parsed.number / 100), this.unit);
      }
      if (this.unit === "%") {
        const oldPixels = cssShortcutNumericValue(this.element, this.property);
        if (oldPixels !== 0 && parsed.unit === "px") {
          const nextPixels = oldPixels + direction * parsed.number;
          return this.with(this.number * (nextPixels / oldPixels), this.unit);
        }
      }
      if (parsed.unit === "px") {
        const oldPixels = cssShortcutNumericValue(this.element, this.property);
        if (oldPixels !== 0) {
          const nextPixels = oldPixels + direction * parsed.number;
          return this.with(this.number * (nextPixels / oldPixels), this.unit);
        }
      }
      return this.with(this.number + direction * parsed.number, this.unit);
    }
  }

  function qhtmlCssRuntimeValueFromReceiver(receiver) {
    const primitive = receiver && typeof receiver.valueOf === "function"
      ? receiver.valueOf()
      : receiver;
    return new QHTMLCssRuntimeValue(null, "", String(primitive == null ? "" : primitive));
  }

  function installCssRuntimeValuePrototypeHelpers() {
    const install = function (prototype, name, callback) {
      if (!prototype || Object.prototype.hasOwnProperty.call(prototype, name)) {
        return;
      }
      try {
        Object.defineProperty(prototype, name, {
          configurable: true,
          enumerable: false,
          writable: true,
          value: callback
        });
      } catch (error) {
        // Non-extensible host prototypes keep their native behavior.
      }
    };
    install(String.prototype, "add", function qhtmlCssStringAdd(value) {
      return qhtmlCssRuntimeValueFromReceiver(this).add(value);
    });
    install(String.prototype, "sub", function qhtmlCssStringSub(value) {
      return qhtmlCssRuntimeValueFromReceiver(this).sub(value);
    });
    install(String.prototype, "mul", function qhtmlCssStringMul(value) {
      return qhtmlCssRuntimeValueFromReceiver(this).mul(value);
    });
    install(String.prototype, "div", function qhtmlCssStringDiv(value) {
      return qhtmlCssRuntimeValueFromReceiver(this).div(value);
    });
  }

  installCssRuntimeValuePrototypeHelpers();

  function serializeCssShortcutValue(cssName, value, previousValue) {
    if (value == null) {
      return "";
    }
    if (value instanceof QHTMLCssRuntimeValue) {
      return value.toString();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      const previous = parseCssRuntimeValue(previousValue);
      if (previous.unit) {
        return `${value}${previous.unit}`;
      }
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

  const QHTML_CSS_SHORTCUT_ACCESSOR_NAMES = (() => {
    const names = new Map();
    const add = function (name) {
      const text = String(name || "").trim();
      if (!text) {
        return;
      }
      names.set(text, cssShortcutPropertyName(text));
    };
    QHTML_CSS_SHORTCUT_NAMES.forEach(add);
    QHTML_CSS_SHORTCUT_CSS_NAMES.forEach((cssName) => {
      add(cssName);
      add(cssName.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase()));
    });
    return names;
  })();

  function installCssShortcutAccessors(domElement) {
    if (!domElement || !domElement.style || domElement.__qhtmlCssShortcutAccessorsInstalled === true) {
      return;
    }
    Object.defineProperty(domElement, "__qhtmlCssShortcutAccessorsInstalled", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: true
    });
    QHTML_CSS_SHORTCUT_ACCESSOR_NAMES.forEach((cssName, accessorName) => {
      try {
        Object.defineProperty(domElement, accessorName, {
          configurable: true,
          enumerable: true,
          get() {
            return cssShortcutRawValue(domElement, cssName);
          },
          set(nextValue) {
            const previousValue = cssShortcutRawValue(domElement, cssName);
            const value = serializeCssShortcutValue(cssName, nextValue, previousValue);
            domElement.style.setProperty(cssName, value);
            if (domElement.__qhtmlProperties && domElement.__qhtmlProperties[accessorName]) {
              domElement.__qhtmlProperties[accessorName].value = value;
            }
            if (domElement.__qhtmlProperties && domElement.__qhtmlProperties[cssName]) {
              domElement.__qhtmlProperties[cssName].value = value;
            }
          }
        });
      } catch (error) {
        // Some host objects expose non-configurable DOM properties. Those keep
        // their native behavior; QHTML can still set the same CSS value through
        // declarative assignment or element.style.
      }
    });
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

  function qhtmlSignalsBlocked(target) {
    return !!(target && Number(target.__qhtmlSignalBlockDepth || 0) > 0);
  }

  function installSignalBlocker(target) {
    if (!target || (typeof target !== "object" && typeof target !== "function") || target.__qhtmlSignalBlockerInstalled === true) {
      return target;
    }
    try {
      Object.defineProperty(target, "__qhtmlSignalBlockerInstalled", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: true
      });
      Object.defineProperty(target, "__qhtmlSignalBlockDepth", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: Number(target.__qhtmlSignalBlockDepth || 0)
      });
      Object.defineProperty(target, "blockSignals", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function blockSignals(block) {
          const previous = qhtmlSignalsBlocked(this);
          if (block === false) {
            this.__qhtmlSignalBlockDepth = Math.max(0, Number(this.__qhtmlSignalBlockDepth || 0) - 1);
          } else if (block === true || typeof block === "undefined") {
            this.__qhtmlSignalBlockDepth = Number(this.__qhtmlSignalBlockDepth || 0) + 1;
          } else {
            this.__qhtmlSignalBlockDepth = block ? Number(this.__qhtmlSignalBlockDepth || 0) + 1 : 0;
          }
          return previous;
        }
      });
      Object.defineProperty(target, "signalsBlocked", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function signalsBlocked() {
          return qhtmlSignalsBlocked(this);
        }
      });
    } catch (error) {
      target.blockSignals = target.blockSignals || function blockSignals(block) {
        const previous = qhtmlSignalsBlocked(this);
        this.__qhtmlSignalBlockDepth = block === false
          ? Math.max(0, Number(this.__qhtmlSignalBlockDepth || 0) - 1)
          : Number(this.__qhtmlSignalBlockDepth || 0) + 1;
        return previous;
      };
      target.signalsBlocked = target.signalsBlocked || function signalsBlocked() {
        return qhtmlSignalsBlocked(this);
      };
    }
    return target;
  }

  function withQHTMLSignalsBlocked(target, callback) {
    if (!target || typeof callback !== "function") {
      return undefined;
    }
    installSignalBlocker(target);
    target.blockSignals(true);
    try {
      return callback();
    } finally {
      target.blockSignals(false);
    }
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
    const scriptThis = qhtmlScriptThisFor(domElement, sourceRegistry);
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
    reserve("$", createQHTMLSelectorHelper(scriptThis, sourceRegistry));
    reserve("qhtmlResolve", function (nameOrUUID) {
      return resolveQHTMLRuntimeReference(scriptThis, nameOrUUID, sourceRegistry);
    });
    reserve("qhtmlResolveNode", function (nameOrUUID) {
      return resolveQHTMLReferenceNode(scriptThis, nameOrUUID, sourceRegistry);
    });
    reserve("qhtmlReferences", qhtmlReferenceFacadeFor(scriptThis, sourceRegistry, false));
    reserve("qhtmlReferenceNodes", qhtmlReferenceFacadeFor(scriptThis, sourceRegistry, true));
    reserve("qhtmlMakeSignal", globalScope.qhtmlMakeSignal);
    reserve("qhtml", qhtmlRuntimeFragment);
    reserve("QMap", globalScope.QMap);
    reserve("QArray", globalScope.QArray);
    reserve("QModel", globalScope.QModel);
    reserve("QCallback", globalScope.QCallback);
    reserve("QHTMLComponentInstance", QHTMLTypes.QHTMLComponentInstance);
    addLexicalQHTMLContextBindings(add, scriptThis, sourceRegistry);
    addScopedQHTMLContextBindings(add, scriptThis, sourceRegistry);

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
      addDomElementContextBindings(add, scriptThis, sourceRegistry);
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
      "$": createQHTMLSelectorHelper(qhtmlScriptThisFor(domElement, sourceRegistry), sourceRegistry)
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

  class QHTMLScriptRegistry {
    constructor(registry) {
      this.registry = registry;
      this.callers = new Map();
      this.syntheticScriptCounter = 0;
      this.compilationCount = 0;
      this.invocationCount = 0;
    }

    callerUUID(caller) {
      const node = caller && caller.qhtmlNode ? caller.qhtmlNode : caller;
      const uuid = qhtmlNodeUuid(node);
      if (uuid) {
        return uuid;
      }
      if (!caller.__qhtmlScriptCallerUUID) {
        this.syntheticScriptCounter += 1;
        Object.defineProperty(caller, "__qhtmlScriptCallerUUID", {
          configurable: true,
          enumerable: false,
          value: `qhtml-script-caller-${this.syntheticScriptCounter}`
        });
      }
      return caller.__qhtmlScriptCallerUUID;
    }

    scriptUUID(scriptNode, keyHint) {
      const uuid = qhtmlNodeUuid(scriptNode);
      if (uuid) {
        return uuid;
      }
      return String(keyHint || "qhtml-inline-script");
    }

    signature(parameterNames, contextNames, expandedBody) {
      return JSON.stringify([parameterNames, contextNames, expandedBody]);
    }

    register(caller, scriptNode, parameterNames, body, keyHint) {
      const callerUUID = this.callerUUID(caller);
      const scriptUUID = this.scriptUUID(scriptNode, keyHint);
      const parameters = Array.isArray(parameterNames)
        ? parameterNames.slice()
        : splitList(parameterNames);
      const context = executionContextFor(caller, this.registry, parameters);
      const expandedBody = expandQHTMLInlineScriptExpressions(body);
      const signature = this.signature(parameters, context.names, expandedBody);

      let callerScripts = this.callers.get(callerUUID);
      if (!callerScripts) {
        callerScripts = new Map();
        this.callers.set(callerUUID, callerScripts);
      }
      let scriptEntries = callerScripts.get(scriptUUID);
      if (!scriptEntries) {
        scriptEntries = new Map();
        callerScripts.set(scriptUUID, scriptEntries);
      }
      if (!scriptEntries.has(signature)) {
        const thisObject = qhtmlScriptThisFor(caller, this.registry);
        this.compilationCount += 1;
        scriptEntries.set(signature, {
          caller,
          thisObject,
          callerUUID,
          scriptNode,
          scriptUUID,
          signature,
          parameterNames: parameters,
          contextNames: context.names,
          contextValues: context.values,
          callable: new Function(...parameters, ...context.names, expandedBody)
        });
      }
      return scriptEntries.get(signature);
    }

    invoke(callerUUID, scriptUUID, signature, parameterValues) {
      this.invocationCount += 1;
      const callerScripts = this.callers.get(callerUUID);
      const scriptEntries = callerScripts && callerScripts.get(scriptUUID);
      const entry = scriptEntries && scriptEntries.get(signature);
      const invocation = normalizeScriptInvocation(
        entry.thisObject || entry.caller,
        this.registry,
        entry.parameterNames,
        parameterValues
      );
      return entry.callable.apply(
        entry.thisObject || entry.caller,
        [...invocation.values, ...entry.contextValues]
      );
    }

    removeCaller(callerUUID) {
      this.callers.delete(String(callerUUID || ""));
    }

    clear() {
      this.callers.clear();
    }

    stats() {
      let scripts = 0;
      let signatures = 0;
      this.callers.forEach((callerScripts) => {
        scripts += callerScripts.size;
        callerScripts.forEach((scriptEntries) => {
          signatures += scriptEntries.size;
        });
      });
      return {
        callers: this.callers.size,
        scripts,
        signatures,
        compilations: this.compilationCount,
        invocations: this.invocationCount
      };
    }
  }

  function registerQHTMLScript(domElement, parameters, body, registry, scriptNode, keyHint) {
    return registry.scriptRegistry.register(
      domElement,
      scriptNode,
      parameters,
      String(body || ""),
      keyHint
    );
  }

  function doScript(registry, binding, args) {
    try {
      return registry.scriptRegistry.invoke(
        binding.callerUUID,
        binding.scriptUUID,
        binding.signature,
        args || []
      );
    } catch (error) {
      if (reportQHTMLRuntimeError(binding.caller, error, registry)) {
        return undefined;
      }
      //throw error;
    }
  }

  function executeScriptBody(domElement, parameters, args, body, registry, scriptNode, keyHint) {
    if (shouldUseQHTML6ForLegacySource(body) &&
        reportQHTMLRuntimeError(domElement, new Error("QHTML6 legacy script syntax requested"), registry)) {
      return undefined;
    }
    const binding = registerQHTMLScript(
      domElement,
      parameters,
      body,
      registry,
      scriptNode,
      keyHint || String(body || "")
    );
    return doScript(registry, binding, args);
  }

  function executeFunctionBody(domElement, functionNode, args, body, signalContext, registry) {
    const parameters = splitList(typeof functionNode.parameters === "function" ? functionNode.parameters() : "");
    return executeScriptBody(domElement, parameters, args || [], body, registry, functionNode);
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
       // throw new TypeError("this.qdom(...).slot is not a function");
      },
      slots() {
        if (requestQHTML6LegacyQDomFallback(rootElement, "slots")) {
          return [];
        }
        //throw new TypeError("this.qdom(...).slots is not a function");
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
          //  throw error;
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
     // throw error;
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

  function ownQHTMLRuntimeMember(owner, name, type) {
    if (!owner || !name) {
      return undefined;
    }

    if ((type === "QHTMLProperty" || type === "QHTMLPropertyAssignment") &&
        owner.__qhtmlProperties &&
        Object.prototype.hasOwnProperty.call(owner.__qhtmlProperties, name)) {
      return owner.__qhtmlProperties[name].value;
    }

    const descriptor = Object.getOwnPropertyDescriptor(owner, name);
    if (!descriptor) {
      return undefined;
    }
    if (descriptor.get && descriptor.get.__qhtmlReferenceAlias === true) {
      return undefined;
    }
    if (Object.prototype.hasOwnProperty.call(descriptor, "value")) {
      const value = descriptor.value;
      if (type === "QHTMLFunction" && value && value.__qhtmlFunctionNode) {
        return value;
      }
      if (type === "QHTMLSignal" && value && value.__qhtmlSignalNode) {
        return value;
      }
      if (type === "QHTMLProperty" || type === "QHTMLPropertyAssignment") {
        return value;
      }
    }
    if (typeof descriptor.get === "function" && (type === "QHTMLProperty" || type === "QHTMLPropertyAssignment")) {
      return descriptor.get.call(owner);
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

    if (type === "QHTMLProperty" || type === "QHTMLPropertyAssignment") {
      const owner = ownerElementForQHTMLNode(referenceNode, registry) || selfElement || registry.rootElement;
      const boundValue = ownQHTMLRuntimeMember(owner, name, type);
      if (typeof boundValue !== "undefined") {
        return boundValue;
      }
      const structured = structuredPropertyNodeValue(referenceNode);
      if (typeof structured !== "undefined") {
        return structured;
      }
      const rawValue = typeof referenceNode.value === "function" ? referenceNode.value() : "";
      return resolvePropertyValue(rawValue, owner || selfElement, referenceNode, registry);
    }

    if (type === "QHTMLFunction" || type === "QHTMLSignal") {
      const owner = ownerElementForQHTMLNode(referenceNode, registry) || selfElement || registry.rootElement;
      return ownQHTMLRuntimeMember(owner, name, type);
    }

    if (type === "QHTMLComponentInstanceSlot") {
      return referenceNode;
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
      if (uuid && registry.elementsByUuid) {
        return registry.elementsByUuid.get(uuid);
      }
      return name && registry.elementsByName ? registry.elementsByName.get(name) : undefined;
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

    return referenceNode;
  }

  function isQHTMLWasmReference(value) {
    return Boolean(value &&
      typeof value.qhtmlType === "function" &&
      typeof value.qhtmlUUID === "function");
  }

  function registryForQHTMLTarget(target) {
    if (target && target.__qhtmlRegistry) {
      return target.__qhtmlRegistry;
    }
    if (target && target.qhtmlComponentRegistry) {
      return target.qhtmlComponentRegistry;
    }
    if (!isQHTMLWasmReference(target) || !document.querySelectorAll) {
      return null;
    }
    const uuid = qhtmlNodeUuid(target);
    const roots = document.querySelectorAll(QHTML_ROOT_SELECTOR);
    for (let index = 0; index < roots.length; index += 1) {
      const registry = roots[index].__qhtmlRegistry || roots[index].qhtmlComponentRegistry || null;
      if (!registry) {
        continue;
      }
      if ((uuid && registry.nodesByUuid && registry.nodesByUuid.has(uuid)) ||
          registry.tree === target) {
        return registry;
      }
    }
    return null;
  }

  function qhtmlNodeForReferenceTarget(target, registry) {
    if (isQHTMLWasmReference(target)) {
      return target;
    }
    if (target && isQHTMLWasmReference(target.qhtmlNode)) {
      return target.qhtmlNode;
    }
    const sourceRegistry = registry || registryForQHTMLTarget(target);
    if (!target || !sourceRegistry || !sourceRegistry.nodesByUuid) {
      return null;
    }
    const uuid = typeof target.getAttribute === "function"
      ? (target.getAttribute("component-instance") || target.getAttribute("qhtml-node"))
      : "";
    return uuid ? sourceRegistry.nodesByUuid.get(uuid) || null : null;
  }

  function qhtmlReferenceNameMap(target, registry) {
    const node = qhtmlNodeForReferenceTarget(target, registry);
    const out = Object.create(null);
    if (!node) {
      return out;
    }

    const isReferenceBearingNode = function (sourceNode) {
      const type = qhtmlNodeType(sourceNode);
      return type === "QHTMLComponentInstance" ||
        type === "QHTMLProperty" ||
        type === "QHTMLPropertyAssignment" ||
        type === "QHTMLFunction" ||
        type === "QHTMLSignal" ||
        type === "QHTMLComponentInstanceSlot" ||
        type === "QHTMLTimer" ||
        type === "QHTMLPropertyAnimation" ||
        type === "QHTMLSequentialAnimation" ||
        type === "QHTMLParallelAnimation" ||
        type === "QHTMLScriptAction" ||
        type === "QHTMLWorker" ||
        type === "QHTMLPainter" ||
        type === "QHTMLStyle" ||
        type === "QHTMLTheme" ||
        type === "QHTMLTransition" ||
        type === "QHTMLClass" ||
        type === "QHTMLCanvas" ||
        type === "QHTMLVideo" ||
        type === "QHTMLParticleEmitter" ||
        type === "QHTMLModelView" ||
        type === "QHTMLLayout" ||
        type === "QHTMLRowLayout" ||
        type === "QHTMLColumnLayout";
    };

    const addReferenceNode = function (sourceNode, overwrite) {
      const name = qhtmlNodeName(sourceNode);
      const uuid = qhtmlNodeUuid(sourceNode);
      if (name && uuid && isReferenceBearingNode(sourceNode) &&
          (overwrite || !Object.prototype.hasOwnProperty.call(out, String(name)))) {
        out[String(name)] = uuid;
      }
    };

    const addNodeReferences = function (sourceNode, overwrite) {
      if (!sourceNode) {
        return;
      }
      addReferenceNode(sourceNode, overwrite);
      if (typeof sourceNode.qhtmlReferenceNames === "function" &&
          typeof sourceNode.qhtmlReferenceByName === "function") {
        Array.from(sourceNode.qhtmlReferenceNames() || []).forEach((name) => {
          const reference = sourceNode.qhtmlReferenceByName(String(name || ""));
          const uuid = qhtmlNodeUuid(reference);
          if (name && uuid && (overwrite || !Object.prototype.hasOwnProperty.call(out, String(name)))) {
            out[String(name)] = uuid;
          }
        });
        return;
      }
      if (typeof sourceNode.qhtmlReferenceMap === "function") {
        const map = sourceNode.qhtmlReferenceMap() || {};
        Object.keys(map).forEach((name) => {
          const uuid = String(map[name] || "");
          if (name && uuid && (overwrite || !Object.prototype.hasOwnProperty.call(out, String(name)))) {
            out[String(name)] = uuid;
          }
        });
      }
    };

    const addDescendantReferences = function (sourceNode, overwrite) {
      if (!sourceNode || typeof sourceNode.childCount !== "function" || typeof sourceNode.childAt !== "function") {
        return;
      }
      const count = sourceNode.childCount();
      for (let index = 0; index < count; index += 1) {
        const child = sourceNode.childAt(index);
        if (qhtmlNodeType(child) === "QHTMLComponentDefinition") {
          continue;
        }
        addNodeReferences(child, overwrite);
        addDescendantReferences(child, overwrite);
      }
    };

    const nodeType = qhtmlNodeType(node);
    if (nodeType === "QHTMLComponentInstance") {
      const definitionNode = typeof node.componentDefinition === "function"
        ? node.componentDefinition()
        : (typeof node.definition === "function" ? node.definition() : null);
      addNodeReferences(definitionNode, false);
      addDescendantReferences(definitionNode, false);
    }

    addNodeReferences(node, true);
    addDescendantReferences(node, true);
    return out;
  }

  function qhtmlDirectReferenceNameMap(target, registry) {
    const sourceRegistry = registry || registryForQHTMLTarget(target);
    const node = qhtmlNodeForReferenceTarget(target, sourceRegistry);
    const out = Object.create(null);
    if (!node) {
      return out;
    }
    const ownerUuid = qhtmlNodeUuid(node);
    const localMap = qhtmlReferenceNameMap(node, sourceRegistry);
    Object.keys(localMap).forEach((name) => {
      const referenceUuid = String(localMap[name] || "");
      if (referenceUuid && referenceUuid !== ownerUuid) {
        out[name] = referenceUuid;
      }
    });
    return out;
  }

  function resolveQHTMLReferenceNode(target, nameOrUUID, registry) {
    const sourceRegistry = registry || registryForQHTMLTarget(target);
    const node = qhtmlNodeForReferenceTarget(target, sourceRegistry);
    const key = String(nameOrUUID == null ? "" : nameOrUUID).trim();
    if (!node || !key) {
      return null;
    }

    if (sourceRegistry &&
        sourceRegistry.nodesByUuid &&
        sourceRegistry.nodesByUuid.has(key)) {
      return sourceRegistry.nodesByUuid.get(key);
    }
    if (typeof node.qhtmlReferenceByName === "function") {
      const byName = node.qhtmlReferenceByName(key);
      if (byName) {
        return byName;
      }
    }
    if (typeof node.qhtmlReferenceByUUID === "function") {
      const byUuid = node.qhtmlReferenceByUUID(key);
      if (byUuid) {
        return byUuid;
      }
    }
    if (typeof node.qhtmlResolve === "function") {
      const resolved = node.qhtmlResolve(key);
      if (resolved !== null && typeof resolved !== "undefined") {
        return resolved;
      }
      if (typeof node.contextKeys === "function" && Array.from(node.contextKeys() || []).includes(key)) {
        return resolved;
      }
    }
    if (typeof node.resolve === "function") {
      const resolved = node.resolve(key);
      if (resolved !== null && typeof resolved !== "undefined") {
        return resolved;
      }
      if (typeof node.contextKeys === "function" && Array.from(node.contextKeys() || []).includes(key)) {
        return resolved;
      }
    }
    return undefined;
  }

  function resolveQHTMLRuntimeReference(target, nameOrUUID, registry) {
    const sourceRegistry = registry || registryForQHTMLTarget(target);
    const referenceNode = resolveQHTMLReferenceNode(target, nameOrUUID, sourceRegistry);
    if (typeof referenceNode === "undefined") {
      return undefined;
    }
    if (!isQHTMLWasmReference(referenceNode) || !sourceRegistry) {
      return referenceNode;
    }
    const selfElement = isQHTMLWasmReference(target) ? null : target;
    const value = runtimeValueForQHTMLReference(referenceNode, sourceRegistry, selfElement);
    return typeof value === "undefined" ? referenceNode : value;
  }

  function qhtmlReferenceFacadeFor(domElement, registry, rawNodes) {
    const cache = rawNodes ? qhtmlReferenceNodeFacades : qhtmlReferenceFacades;
    if (cache.has(domElement)) {
      return cache.get(domElement);
    }
    const facade = new Proxy(Object.create(null), {
      get(target, property) {
        if (property === Symbol.toStringTag) {
          return rawNodes ? "QHTMLReferenceNodes" : "QHTMLReferences";
        }
        if (property === "toJSON") {
          return function () {
            const map = qhtmlReferenceNameMap(domElement, registry || domElement.__qhtmlRegistry);
            const result = {};
            Object.keys(map).forEach((name) => {
              result[name] = rawNodes
                ? resolveQHTMLReferenceNode(domElement, name, registry || domElement.__qhtmlRegistry)
                : resolveQHTMLRuntimeReference(domElement, name, registry || domElement.__qhtmlRegistry);
            });
            return result;
          };
        }
        if (typeof property !== "string") {
          return undefined;
        }
        return rawNodes
          ? resolveQHTMLReferenceNode(domElement, property, registry || domElement.__qhtmlRegistry)
          : resolveQHTMLRuntimeReference(domElement, property, registry || domElement.__qhtmlRegistry);
      },
      has(target, property) {
        if (typeof property !== "string") {
          return false;
        }
        const map = qhtmlReferenceNameMap(domElement, registry || domElement.__qhtmlRegistry);
        return Object.prototype.hasOwnProperty.call(map, property) ||
          Object.values(map).includes(property);
      },
      ownKeys() {
        return Object.keys(qhtmlReferenceNameMap(domElement, registry || domElement.__qhtmlRegistry));
      },
      getOwnPropertyDescriptor(target, property) {
        if (typeof property !== "string") {
          return undefined;
        }
        const map = qhtmlReferenceNameMap(domElement, registry || domElement.__qhtmlRegistry);
        if (!Object.prototype.hasOwnProperty.call(map, property)) {
          return undefined;
        }
        return { configurable: true, enumerable: true };
      }
    });
    cache.set(domElement, facade);
    return facade;
  }

  function installQHTMLReferenceAccess(domElement, registry, installAliases) {
    if (!domElement) {
      return;
    }
    const sourceRegistry = registry || domElement.__qhtmlRegistry || null;
    const define = function (name, descriptor) {
      try {
        Object.defineProperty(domElement, name, Object.assign({ configurable: true, enumerable: false }, descriptor));
        return true;
      } catch (error) {
        return false;
      }
    };
    define("qhtmlResolveNode", {
      value(nameOrUUID) {
        return resolveQHTMLReferenceNode(domElement, nameOrUUID, sourceRegistry || domElement.__qhtmlRegistry);
      }
    });
    define("qhtmlResolve", {
      value(nameOrUUID) {
        return resolveQHTMLRuntimeReference(domElement, nameOrUUID, sourceRegistry || domElement.__qhtmlRegistry);
      }
    });
    define("qhtmlHasReference", {
      value(nameOrUUID) {
        return Boolean(resolveQHTMLReferenceNode(domElement, nameOrUUID, sourceRegistry || domElement.__qhtmlRegistry));
      }
    });
    define("qhtmlReferenceNames", {
      value() {
        return Object.keys(qhtmlReferenceNameMap(domElement, sourceRegistry || domElement.__qhtmlRegistry));
      }
    });
    define("qhtmlReferenceUUIDs", {
      value() {
        return Object.values(qhtmlReferenceNameMap(domElement, sourceRegistry || domElement.__qhtmlRegistry));
      }
    });
    define("qhtmlReferences", {
      get() {
        return qhtmlReferenceFacadeFor(domElement, sourceRegistry || domElement.__qhtmlRegistry, false);
      }
    });
    define("qhtmlReferenceNodes", {
      get() {
        return qhtmlReferenceFacadeFor(domElement, sourceRegistry || domElement.__qhtmlRegistry, true);
      }
    });
    define("setContextProperty", {
      value(name, value) {
        const activeRegistry = sourceRegistry || domElement.__qhtmlRegistry;
        const node = qhtmlNodeForReferenceTarget(domElement, activeRegistry);
        if (!node || typeof node.setContextProperty !== "function") {
          throw new TypeError("The target is not bound to a QHTMLNode context");
        }
        const result = node.setContextProperty(name, value);
        installQHTMLReferenceAccess(domElement, activeRegistry, true);
        return result;
      }
    });
    define("render", {
      value() {
        const activeRegistry = sourceRegistry || domElement.__qhtmlRegistry;
        const node = qhtmlNodeForReferenceTarget(domElement, activeRegistry);
        if (!node || typeof node.render !== "function") {
          return null;
        }
        return node.render();
      }
    });

    if (!installAliases) {
      return;
    }
    const activeRegistry = sourceRegistry || domElement.__qhtmlRegistry;
    const map = qhtmlDirectReferenceNameMap(domElement, activeRegistry);
    const contextNode = qhtmlNodeForReferenceTarget(domElement, activeRegistry);
    const aliasNames = new Set(Object.keys(map));
    if (contextNode && typeof contextNode.contextKeys === "function") {
      Array.from(contextNode.contextKeys() || []).forEach((name) => aliasNames.add(String(name || "")));
    }
    const hasAliasName = function (name) { return aliasNames.has(name); };
    const previous = qhtmlReferenceAliases.get(domElement) || new Set();
    previous.forEach((name) => {
      if (hasAliasName(name)) {
        return;
      }
      const descriptor = Object.getOwnPropertyDescriptor(domElement, name);
      if (descriptor && descriptor.get && descriptor.get.__qhtmlReferenceAlias === true) {
        try {
          delete domElement[name];
        } catch (error) {
          // Ignore non-configurable host-object properties.
        }
      }
    });
    const installed = new Set();
    previous.forEach((name) => {
      if (!hasAliasName(name)) {
        return;
      }
      const descriptor = Object.getOwnPropertyDescriptor(domElement, name);
      if (descriptor && descriptor.get && descriptor.get.__qhtmlReferenceAlias === true) {
        installed.add(name);
      }
    });
    Array.from(aliasNames).forEach((name) => {
      if (!isValidPropertyIdentifier(name) ||
          installed.has(name) ||
          QHTML_DIRECT_ALIAS_RESERVED_NAMES.has(name)) {
        return;
      }

      const currentDescriptor = Object.getOwnPropertyDescriptor(domElement, name);
      const currentIsReferenceAlias = Boolean(
        currentDescriptor &&
        currentDescriptor.get &&
        currentDescriptor.get.__qhtmlReferenceAlias === true
      );

      // QHTML references may shadow properties inherited from HTMLElement and
      // its prototypes, but they must not replace a concrete runtime member
      // that has already been installed directly on this element.
      if (currentDescriptor && !currentIsReferenceAlias) {
        return;
      }

      let prototype = Object.getPrototypeOf(domElement);
      while (prototype) {
        const inheritedDescriptor = Object.getOwnPropertyDescriptor(prototype, name);
        if (inheritedDescriptor) {
          if (!inheritedDescriptor.get || inheritedDescriptor.get.__qhtmlReferenceAlias !== true) {
            return;
          }
          break;
        }
        prototype = Object.getPrototypeOf(prototype);
      }

      const getter = function () {
        return resolveQHTMLRuntimeReference(
          domElement,
          name,
          sourceRegistry || domElement.__qhtmlRegistry
        );
      };
      getter.__qhtmlReferenceAlias = true;

      // Some direct children (animations, timers, script actions, workers,
      // and future runtime types) are materialized after reference access is
      // installed.  Their normal assignment must replace the provisional
      // alias rather than fail against a getter-only property.
      const setter = function (value) {
        try {
          Object.defineProperty(domElement, name, {
            configurable: true,
            enumerable: false,
            writable: true,
            value: value
          });
          const aliases = qhtmlReferenceAliases.get(domElement);
          if (aliases) {
            aliases.delete(name);
          }
        } catch (error) {
          // Leave the lazy resolver in place when the host object refuses the
          // replacement.  qhtmlResolve(name) remains available either way.
        }
      };
      setter.__qhtmlReferenceAlias = true;

      if (define(name, { get: getter, set: setter })) {
        installed.add(name);
      }
    });
    qhtmlReferenceAliases.set(domElement, installed);
  }

  function resolveLexicalQHTMLReference(name, registry, selfElement) {
    const referenceNode = resolveQHTMLReferenceNode(selfElement, name, registry);
    if (!isQHTMLWasmReference(referenceNode)) {
      return referenceNode;
    }
    const value = runtimeValueForQHTMLReference(referenceNode, registry, selfElement);
    return typeof value === "undefined" ? referenceNode : value;
  }

  function addLexicalQHTMLContextBindings(add, domElement, registry) {
    const contextNode = qhtmlNodeForReferenceTarget(domElement, registry);
    if (!contextNode) {
      return;
    }
    const names = [];
    const seen = new Set();
    const addNames = function (values) {
      Array.from(values || []).forEach((name) => {
        const text = String(name || "");
        if (text && !seen.has(text)) {
          seen.add(text);
          names.push(text);
        }
      });
    };
    if (typeof contextNode.qhtmlReferenceNames === "function") {
      addNames(contextNode.qhtmlReferenceNames());
    }
    if (typeof contextNode.contextKeys === "function") {
      addNames(contextNode.contextKeys());
    }
    names.forEach((name) => {
      add(name, resolveLexicalQHTMLReference(name, registry, domElement));
    });
  }

  function resolvePath(path, registry, selfElement) {
    const parts = String(path || "").trim().split(".").filter(Boolean);
    if (parts.length === 0 || !registry) {
      return undefined;
    }
    const scriptThis = qhtmlScriptThisFor(selfElement, registry);

    let value;
    if (parts[0] === "this") {
      value = scriptThis;
    } else if (isOnPrefixedEventName(parts[0])) {
      value = eventSignalForPathPart(scriptThis, parts[0], registry);
    } else {
      value = resolveLexicalQHTMLReference(parts[0], registry, scriptThis);
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
      value = scriptThis ? scriptThis[parts[0]] : undefined;
    }
    if (typeof value === "undefined" && registry && registry.rootElement) {
      value = registry.rootElement[parts[0]];
    }
    if (typeof value === "undefined") {
      value = scopedQHTMLBinding(parts[0], scriptThis, registry);
    }
    if (typeof value === "undefined") {
      value = eventSignalForPathPart(scriptThis, parts[0], registry);
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

    const parameters = splitList(typeof functionNode.parameters === "function" ? functionNode.parameters() : "");
    const body = String(typeof functionNode.body === "function" ? functionNode.body() : "");
    const registry = domElement.__qhtmlRegistry;
    const binding = registerQHTMLScript(
      domElement,
      parameters,
      body,
      registry,
      functionNode,
      `function:${functionName}`
    );
    const boundFunction = function (...args) {
      return doScript(registry, binding, args);
    };

    boundFunction.__qhtmlElement = domElement;
    boundFunction.__qhtmlFunctionNode = functionNode;
    boundFunction.__qhtmlFunctionBody = body;
    boundFunction.__qhtmlFunctionParameters = parameters.slice();
    boundFunction.__qhtmlInvokeFromSignal = function (args, signalContext) {
      return doScript(registry, binding, args);
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
      if (qhtmlSignalsBlocked(domElement)) {
        return [];
      }
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
        "Signal " + signalName + " emitted by " + (domElement.id || qhtmlNodeName(domElement.qhtmlNode) || "anonymous") + " with arguments [" + serializedArgs + "]",
        domElement
      );
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
    const registry = domElement.__qhtmlRegistry;
    const executionParameters = eventHandlerExecution(parameters, []).names;
    const binding = registerQHTMLScript(
      domElement,
      executionParameters,
      body,
      registry,
      handlerNode,
      `event:${eventName}`
    );
    const invoke = function (...args) {
      const invocation = eventHandlerExecution(parameters, args || []);
      return doScript(registry, binding, invocation.values);
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
    if (qhtmlSignalsBlocked(domElement)) {
      return;
    }
    withPropertyTransaction(transactionId, () => {
      logQHTMLRuntime(
        domElement.__qhtmlRegistry,
        "QHTMLProperty",
        "Property " + propertyName + " changed on " + (domElement.id || qhtmlNodeName(domElement.qhtmlNode) || "anonymous") + " to " + String(nextValue),
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
          detail: { property: propertyName, value: nextValue, qhtmlNode: propertyNode, transactionId }
        }));
        domElement.dispatchEvent(new CustomEvent("QHTMLPropertyChanged", {
          bubbles: true,
          detail: { property: propertyName, value: nextValue, qhtmlNode: propertyNode, transactionId }
        }));
      }
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

  function behaviorCompletionAnimation(animation, propertyName) {
    if (!animation || !animation.qhtmlNode) {
      return animation;
    }
    if (qhtmlNodeType(animation.qhtmlNode) === "QHTMLPropertyAnimation" &&
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

  function createTransitionAnimationNode(propertyName, transition, durationMs, steps, fromValue, toValue) {
    const node = new QHTMLTypes.QHTMLPropertyAnimation("");
    node.appendChild(new QHTMLTypes.QHTMLPropertyAssignment("property", { value: JSON.stringify(propertyName) }));
    node.appendChild(new QHTMLTypes.QHTMLPropertyAssignment("duration", { value: String(durationMs) }));
    node.appendChild(new QHTMLTypes.QHTMLPropertyAssignment("steps", { value: String(steps) }));
    node.appendChild(new QHTMLTypes.QHTMLPropertyAssignment("from", { value: valueToQHTMLExpression(fromValue) }));
    node.appendChild(new QHTMLTypes.QHTMLPropertyAssignment("to", { value: valueToQHTMLExpression(toValue) }));
    const timing = transition && typeof transition.timing === "function" ? transition.timing() : "linear";
    node.appendChild(new QHTMLTypes.QHTMLPropertyAssignment("easing", { value: JSON.stringify(timing || "linear") }));
    return node;
  }

  function valueToQHTMLExpression(value) {
    if (value instanceof QHTMLCssRuntimeValue) {
      return JSON.stringify(value.toString());
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    return JSON.stringify(String(value == null ? "" : value));
  }

  function startPropertyTransition(domElement, propertyNode, registry, propertyName, nextValue, previousValue, transactionId) {
    const transitionState = domElement && domElement.__qhtmlTransitionStates
      ? domElement.__qhtmlTransitionStates[propertyName]
      : null;
    const transition = transitionState ? transitionState.transition : null;
    if (!transition) {
      return false;
    }
    const durationMs = transitionTimeToMs(typeof transition.duration === "function" ? transition.duration() : "", 0);
    const delayMs = transitionTimeToMs(typeof transition.delay === "function" ? transition.delay() : "", 0);
    if (durationMs <= 0 && delayMs <= 0) {
      return false;
    }
    const previousNumber = numericValue(previousValue, Number.NaN);
    const nextNumber = numericValue(nextValue, Number.NaN);
    if (!Number.isFinite(previousNumber) || !Number.isFinite(nextNumber)) {
      const state = transitionState;
      const token = (state.token || 0) + 1;
      state.token = token;
      state.suppress = true;
      if (state.animation && typeof state.animation.stop === "function") {
        state.animation.stop();
      }
      if (state.timerId) {
        clearTimeout(state.timerId);
      }
      withQHTMLSignalsBlocked(domElement, () => {
        writeAnimationFrameProperty(domElement, propertyName, nextValue);
      });
      state.timerId = setTimeout(() => {
        if (state.token !== token) {
          return;
        }
        state.suppress = false;
        state.timerId = 0;
        const entry = domElement.__qhtmlProperties && domElement.__qhtmlProperties[propertyName];
        if (entry) {
          entry.value = nextValue;
        }
        dispatchPropertyChange(domElement, propertyNode, propertyName, nextValue, transactionId);
      }, Math.max(0, durationMs + delayMs));
      return true;
    }
    const steps = Math.max(1, Math.round(durationMs / 25));
    const animationNode = createTransitionAnimationNode(propertyName, transition, durationMs, steps, previousValue, nextValue);
    const animation = createLivePropertyAnimation(animationNode, domElement, registry);
    const state = transitionState;
    const token = (state.token || 0) + 1;
    state.token = token;
    state.suppress = true;
    if (state.animation && typeof state.animation.stop === "function") {
      state.animation.stop();
    }
    if (state.timerId) {
      clearTimeout(state.timerId);
      state.timerId = 0;
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
      state.timerId = 0;
      const entry = domElement.__qhtmlProperties && domElement.__qhtmlProperties[propertyName];
      if (entry) {
        entry.value = nextValue;
      }
      dispatchPropertyChange(domElement, propertyNode, propertyName, nextValue, transactionId);
    };
    if (animation.finished && typeof animation.finished.connect === "function") {
      animation.finished.connect(finish);
    }
    if (delayMs > 0) {
      state.timerId = setTimeout(() => animation.start(), delayMs);
    } else {
      animation.start();
    }
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
          if (qhtmlSignalsBlocked(domElement)) {
            entry.value = nextValue;
            return;
          }
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
          if (startPropertyBehavior(domElement, propertyNode, registry, propertyName, nextValue, entry.value, transactionId) ||
              startPropertyTransition(domElement, propertyNode, registry, propertyName, nextValue, entry.value, transactionId)) {
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
     // throw error;
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
      [propertyName]: { rawValue: inlineValue, value: inlineValue, qhtmlNode: behaviorNode }
    });
    Object.defineProperty(domElement, propertyName, {
      configurable: true,
      enumerable: true,
      get() {
        return domElement.__qhtmlProperties[propertyName].value;
      },
      set(nextValue) {
        const entry = domElement.__qhtmlProperties[propertyName];
        if (qhtmlSignalsBlocked(domElement)) {
          entry.value = nextValue;
          if (isCssShortcut && domElement.style) {
            domElement.style.setProperty(cssName, serializeCssShortcutValue(cssName, nextValue, cssShortcutRawValue(domElement, cssName)));
          }
          return;
        }
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
        if (startPropertyBehavior(domElement, behaviorNode, registry, propertyName, nextValue, entry.value, transactionId) ||
            startPropertyTransition(domElement, behaviorNode, registry, propertyName, nextValue, entry.value, transactionId)) {
          return;
        }
        entry.value = nextValue;
        if (isCssShortcut && domElement.style) {
          domElement.style.setProperty(cssName, serializeCssShortcutValue(cssName, nextValue, cssShortcutRawValue(domElement, cssName)));
        }
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
      qhtmlNode: loggerNode,
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
    const ownerNode = loggerNode.parent();
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

  function nearestRuntimeLogger(registry, owner) {
    const ownerNode = owner && owner.qhtmlNode ? owner.qhtmlNode : owner;
    let node = ownerNode || null;
    while (node) {
      const uuid = qhtmlNodeUuid(node);
      if (uuid && registry.loggersByOwnerUuid.has(uuid)) {
        return registry.loggersByOwnerUuid.get(uuid);
      }
      node = node.parent();
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
      const loggerNode = candidate.qhtmlNode || null;
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
          if (isValidPropertyIdentifier(name)) {
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
      if (!isValidPropertyIdentifier(signalName)) {
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
      console.log("Unable to register QHTML class", className, error);
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
      console.log("Unable to instantiate QHTML class", className, instanceName, error);
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
      __qhtmlHandlers: timerHandlers(timerNode).map((handlerNode) => {
        const parameters = splitList(typeof handlerNode.parameters === "function" ? handlerNode.parameters() : "");
        const body = typeof handlerNode.body === "function" ? handlerNode.body() : "";
        return {
          node: handlerNode,
          binding: registerQHTMLScript(
            ownerElement,
            parameters,
            body,
            registry,
            handlerNode,
            `timer:${timerName}:timeout`
          )
        };
      })
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
      liveTimer.__qhtmlHandlers.forEach((handler) => {
        doScript(registry, handler.binding, []);
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
      if (qhtmlSignalsBlocked(ownerObject)) {
        return [];
      }
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

  function readTargetPropertyRaw(target, propertyName) {
    if (!target || !propertyName) {
      return "";
    }
    if (target.style && isCssShortcutAssignmentName(propertyName)) {
      return cssShortcutRawValue(target, cssShortcutPropertyName(propertyName));
    }
    if (typeof target[propertyName] !== "undefined") {
      return target[propertyName];
    }
    return "";
  }

  function animationValueUnit(value) {
    const parsed = parseCssRuntimeValue(value);
    return parsed.unit || "";
  }

  function animationFrameValue(animationObject, value) {
    const unit = animationObject && animationObject.__qhtmlValueUnit ? animationObject.__qhtmlValueUnit : "";
    if (!unit || !animationObject || !animationObject.target || !animationObject.property) {
      return value;
    }
    if (animationObject.target.style && isCssShortcutAssignmentName(animationObject.property)) {
      return new QHTMLCssRuntimeValue(
        animationObject.target,
        cssShortcutPropertyName(animationObject.property),
        `${value}${unit}`
      );
    }
    return value;
  }

  function cssValueForProperty(propertyName, value, previousValue) {
    const cssName = cssShortcutPropertyName(propertyName);
    const unitless = /^(?:opacity|z-index|font-weight|line-height|flex-grow|flex-shrink|order)$/i;
    if (typeof value === "number" && Number.isFinite(value) && QHTML_CSS_LENGTH_SHORTCUT_PROPERTIES.has(cssName)) {
      const previous = parseCssRuntimeValue(previousValue);
      return `${value}${previous.unit || "px"}`;
    }
    return unitless.test(cssName) ? String(value) : String(value);
  }

  function writeTargetProperty(target, propertyName, value) {
    if (!target || !propertyName) {
      return;
    }
    if (target.style && isCssShortcutAssignmentName(propertyName)) {
      const cssName = cssShortcutPropertyName(propertyName);
      const previousValue = cssShortcutRawValue(target, cssName);
      const cssValue = value instanceof QHTMLCssRuntimeValue
        ? value.toString()
        : cssValueForProperty(cssName, value, previousValue);
      target.style.setProperty(cssName, cssValue);
      if (target.__qhtmlProperties && target.__qhtmlProperties[propertyName]) {
        target.__qhtmlProperties[propertyName].value = cssValue;
      }
      if (target.__qhtmlProperties && target.__qhtmlProperties[cssName]) {
        target.__qhtmlProperties[cssName].value = cssValue;
      }
      return;
    }
    if (typeof target[propertyName] !== "undefined" && !(target.style && typeof target.style[propertyName] !== "undefined")) {
      target[propertyName] = value;
      return;
    }
    if (target.style && typeof target.style[propertyName] !== "undefined") {
      const previousValue = target.style[propertyName] || cssShortcutRawValue(target, cssShortcutPropertyName(propertyName));
      target.style[propertyName] = cssValueForProperty(propertyName, value, previousValue);
      return;
    }
    target[propertyName] = value;
  }

  function writeAnimationFrameProperty(target, propertyName, value) {
    if (!target || !propertyName) {
      return;
    }
    if (target.style && isCssShortcutAssignmentName(propertyName)) {
      const cssName = cssShortcutPropertyName(propertyName);
      const previousValue = cssShortcutRawValue(target, cssName);
      const cssValue = value instanceof QHTMLCssRuntimeValue
        ? value.toString()
        : cssValueForProperty(cssName, value, previousValue);
      target.style.setProperty(cssName, cssValue);
      if (target.__qhtmlProperties && target.__qhtmlProperties[propertyName]) {
        target.__qhtmlProperties[propertyName].value = cssValue;
      }
      if (target.__qhtmlProperties && target.__qhtmlProperties[cssName]) {
        target.__qhtmlProperties[cssName].value = cssValue;
      }
      return;
    }
    writeTargetProperty(target, propertyName, value);
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
      __qhtmlTimerId: 0,
      __qhtmlTimerInterval: 0,
      __qhtmlStartedAt: 0,
      __qhtmlCurrentValue: 0,
      __qhtmlStartValue: 0,
      __qhtmlEndValue: 0,
      __qhtmlValueUnit: "",
      __qhtmlDirection: 1,
      __qhtmlRunning: false,
      __qhtmlFinalStepPending: false,
      currentStep: 0,
      stepAmount: 0,
      stepStones: []
    };
    installSignalBlocker(animationObject);
    animationObject.component = ownerElement;
    animationObject.parent = function parent() {
      return ownerElement && typeof ownerElement.parent === "function" ? ownerElement.parent() : null;
    };
    animationObject.started = createObjectSignal(animationObject, animationSignalNode(animationNode, "started"), "started");
    animationObject.stopped = createObjectSignal(animationObject, animationSignalNode(animationNode, "stopped"), "stopped");
    animationObject.stepped = createObjectSignal(animationObject, animationSignalNode(animationNode, "stepped"), "stepped");
    animationObject.ended = createObjectSignal(animationObject, animationSignalNode(animationNode, "ended"), "ended");
    animationObject.finished = createObjectSignal(animationObject, animationSignalNode(animationNode, "finished"), "finished");

    animationObject.__qhtmlApplyFrame = function (value) {
      withQHTMLSignalsBlocked(animationObject.target, () => {
        writeAnimationFrameProperty(
          animationObject.target,
          animationObject.property,
          animationFrameValue(animationObject, value)
        );
      });
    };

    animationObject.__qhtmlApplyStep = function (value, currentStep) {
      void value;
      void currentStep;
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
        animationObject.stepped(value, animationObject.currentStep);
      }
    };

    animationObject.step = function () {
      try {
        if (registry && registry.rootElement && registry.rootElement.__qhtml7RuntimeDisposed === true) {
          animationObject.stop();
          return;
        }
        if (!animationObject.running) {
          return;
        }
        const finish = function () {
          animationObject.__qhtmlRunning = false;
          animationObject.__qhtmlTimerId = 0;
          animationObject.__qhtmlFinalStepPending = false;
          animationObject.ended();
          animationObject.finished();
          if (timerBool(animationObject.repeat, false)) {
            animationObject.start();
          }
        };
        if (animationObject.__qhtmlFinalStepPending) {
          animationObject.__qhtmlCurrentValue = animationObject.__qhtmlEndValue;
          animationObject.__qhtmlApplyFrame(animationObject.__qhtmlEndValue);
          animationObject.currentStep += 1;
          animationObject.stepped(animationObject.__qhtmlEndValue, animationObject.currentStep);
          finish();
          return;
        }
        const absStepAmount = Math.abs(Number(animationObject.stepAmount) || 0);
        if (absStepAmount <= 0) {
          animationObject.__qhtmlCurrentValue = animationObject.__qhtmlEndValue;
          animationObject.__qhtmlApplyFrame(animationObject.__qhtmlEndValue);
          animationObject.currentStep += 1;
          animationObject.stepped(animationObject.__qhtmlEndValue, animationObject.currentStep);
          finish();
          return;
        }
        const nextValue = animationObject.__qhtmlCurrentValue + animationObject.stepAmount;
        const reachedEnd = animationObject.stepAmount >= 0
          ? nextValue >= animationObject.__qhtmlEndValue
          : nextValue <= animationObject.__qhtmlEndValue;
        const value = reachedEnd ? animationObject.__qhtmlEndValue : nextValue;
        animationObject.__qhtmlCurrentValue = value;
        animationObject.__qhtmlApplyFrame(value);
        animationObject.currentStep += 1;
        animationObject.stepped(value, animationObject.currentStep);
        if (!reachedEnd) {
          const remainingDistance = Math.abs(animationObject.__qhtmlEndValue - animationObject.__qhtmlCurrentValue);
          if (remainingDistance <= absStepAmount) {
            animationObject.__qhtmlFinalStepPending = true;
            const finalInterval = Math.max(0, Math.abs(remainingDistance / animationObject.stepAmount) * animationObject.__qhtmlTimerInterval);
            animationObject.__qhtmlTimerId = setTimeout(animationObject.step, finalInterval);
          } else {
            animationObject.__qhtmlTimerId = setTimeout(animationObject.step, animationObject.__qhtmlTimerInterval);
          }
          return;
        }
        finish();
      } catch (error) {
        if (reportQHTMLRuntimeError(ownerElement, error, registry)) {
          return;
        }
       // throw error;
      }
    };

    animationObject.start = function () {
      if (registry && registry.rootElement && registry.rootElement.__qhtml7RuntimeDisposed === true) {
        return animationObject;
      }
      const currentRawValue = readTargetPropertyRaw(animationObject.target, animationObject.property);
      const currentValue = numericValue(currentRawValue, readTargetProperty(animationObject.target, animationObject.property));
      const hasFrom = animationHasAssignment(animationNode, "from") ||
        animationHasAssignment(animationNode, "startValue") ||
        animationHasAssignment(animationNode, "start");
      const hasTo = animationHasAssignment(animationNode, "to") ||
        animationHasAssignment(animationNode, "endValue") ||
        animationHasAssignment(animationNode, "end");
      const fromSource = (hasFrom || typeof animationObject.from !== "undefined") ? animationObject.from : currentRawValue;
      const toSource = (hasTo || typeof animationObject.to !== "undefined") ? animationObject.to : currentRawValue;
      animationObject.__qhtmlValueUnit =
        animationValueUnit(toSource) ||
        animationValueUnit(fromSource) ||
        animationValueUnit(currentRawValue);
      animationObject.__qhtmlStartValue = numericValue(fromSource, currentValue);
      animationObject.__qhtmlEndValue = numericValue(toSource, currentValue);
      animationObject.currentStep = 0;
      animationObject.rebuildStepStones();
      animationObject.__qhtmlCurrentValue = animationObject.__qhtmlStartValue;
      animationObject.__qhtmlFinalStepPending = false;
      animationObject.__qhtmlTimerInterval = Math.max(0, (Number(animationObject.duration) || 0) / Math.max(1, Math.floor(Number(animationObject.steps) || 0)));
      animationObject.__qhtmlRunning = true;
      animationObject.__qhtmlApplyFrame(animationObject.__qhtmlStartValue);
      animationObject.started();
      animationObject.__qhtmlStartedAt = performance.now();
      if (animationObject.__qhtmlFrame) {
        cancelAnimationFrame(animationObject.__qhtmlFrame);
        animationObject.__qhtmlFrame = 0;
      }
      if (animationObject.__qhtmlTimerId) {
        clearTimeout(animationObject.__qhtmlTimerId);
        animationObject.__qhtmlTimerId = 0;
      }
      if (animationObject.__qhtmlStartValue === animationObject.__qhtmlEndValue || Math.floor(Number(animationObject.steps) || 0) <= 0) {
        animationObject.step();
      } else {
        animationObject.__qhtmlTimerId = setTimeout(animationObject.step, animationObject.__qhtmlTimerInterval);
      }
      return animationObject;
    };

    animationObject.stop = function () {
      const wasRunning = animationObject.__qhtmlRunning;
      animationObject.__qhtmlRunning = false;
      animationObject.__qhtmlFinalStepPending = false;
      if (animationObject.__qhtmlFrame) {
        cancelAnimationFrame(animationObject.__qhtmlFrame);
        animationObject.__qhtmlFrame = 0;
      }
      if (animationObject.__qhtmlTimerId) {
        clearTimeout(animationObject.__qhtmlTimerId);
        animationObject.__qhtmlTimerId = 0;
      }
      if (wasRunning) {
        animationObject.stopped();
      }
      return animationObject;
    };
    animationObject.restart = function () {
      animationObject.stop();
      return animationObject.start();
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
         // throw error;
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
    actionObject.component = ownerElement;
    actionObject.parent = function parent() {
      return ownerElement && typeof ownerElement.parent === "function" ? ownerElement.parent() : null;
    };
    actionObject.started = createObjectSignal(actionObject, animationSignalNode(actionNode, "started"), "started");
    actionObject.finished = createObjectSignal(actionObject, animationSignalNode(actionNode, "finished"), "finished");
    const actionBody = typeof actionNode.body === "function" ? actionNode.body() : "";
    const actionBinding = registerQHTMLScript(
      ownerElement,
      [],
      actionBody,
      registry,
      actionNode,
      `script-action:${actionName}`
    );
    actionObject.run = function () {
      actionObject.__qhtmlRunning = true;
      actionObject.started();
      doScript(registry, actionBinding, []);
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
    groupObject.component = ownerElement;
    groupObject.parent = function parent() {
      return ownerElement && typeof ownerElement.parent === "function" ? ownerElement.parent() : null;
    };
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
      .map((item) => item.replace(/^this\./, ""))
      .map(cssShortcutPropertyName);
  }

  function transitionTimeToMs(value, fallback) {
    const text = stripMatchingQuotes(String(value == null ? "" : value).trim());
    if (!text) {
      return fallback;
    }
    const number = Number.parseFloat(text);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return /s$/i.test(text) && !/ms$/i.test(text) ? number * 1000 : number;
  }

  function installTransitionTargetProperty(domElement, cssName, transition) {
    if (!domElement || !cssName || !transition) {
      return;
    }
    const propertyName = transitionDomPropertyName(cssName);
    domElement.__qhtmlTransitionStates = domElement.__qhtmlTransitionStates || Object.create(null);
    domElement.__qhtmlTransitionStates[propertyName] = Object.assign(
      domElement.__qhtmlTransitionStates[propertyName] || {},
      { transition, cssName, propertyName }
    );
    if (domElement.__qhtmlProperties && domElement.__qhtmlProperties[propertyName]) {
      return;
    }
    const initialValue = domElement.style && isCssShortcutAssignmentName(propertyName)
      ? cssShortcutRawValue(domElement, cssName)
      : (typeof domElement[propertyName] !== "undefined" ? domElement[propertyName] : "");
    domElement.__qhtmlProperties = Object.assign(domElement.__qhtmlProperties || {}, {
      [propertyName]: { rawValue: initialValue, value: initialValue, qhtmlNode: transition.node || null }
    });
    Object.defineProperty(domElement, propertyName, {
      configurable: true,
      enumerable: true,
      get() {
        return domElement.__qhtmlProperties[propertyName].value;
      },
      set(nextValue) {
        const entry = domElement.__qhtmlProperties[propertyName];
        if (qhtmlSignalsBlocked(domElement)) {
          entry.value = nextValue;
          if (domElement.style && isCssShortcutAssignmentName(propertyName)) {
            domElement.style.setProperty(cssName, serializeCssShortcutValue(cssName, nextValue, cssShortcutRawValue(domElement, cssName)));
          }
          return;
        }
        const transactionId = currentPropertyTransactionId();
        const transitionState = domElement.__qhtmlTransitionStates && domElement.__qhtmlTransitionStates[propertyName];
        if (transitionState && transitionState.suppress) {
          entry.value = nextValue;
          return;
        }
        const behaviorState = domElement.__qhtmlBehaviorStates && domElement.__qhtmlBehaviorStates[propertyName];
        if (behaviorState && behaviorState.suppress) {
          entry.value = nextValue;
          return;
        }
        if (entry.lastTransactionId === transactionId) {
          return;
        }
        entry.lastTransactionId = transactionId;
        if (startPropertyBehavior(domElement, entry.qhtmlNode || transition.node, domElement.__qhtmlRegistry, propertyName, nextValue, entry.value, transactionId) ||
            startPropertyTransition(domElement, entry.qhtmlNode || transition.node, domElement.__qhtmlRegistry, propertyName, nextValue, entry.value, transactionId)) {
          return;
        }
        entry.value = nextValue;
        if (domElement.style && isCssShortcutAssignmentName(propertyName)) {
          domElement.style.setProperty(cssName, serializeCssShortcutValue(cssName, nextValue, cssShortcutRawValue(domElement, cssName)));
        }
        dispatchPropertyChange(domElement, entry.qhtmlNode || transition.node, propertyName, nextValue, transactionId);
      }
    });
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
        .forEach((propertyName) => {
          installStyleBackedTransitionProperty(domElement, propertyName);
          installTransitionTargetProperty(domElement, propertyName, transition);
        });
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
        if (painterNode && typeof painterNode.paintHandler === "function") {
          const handler = painterNode.paintHandler();
          if (handler && typeof handler.body === "function") {
            return handler.body();
          }
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
        const directBody = themeNode && typeof themeNode.body === "function" ? themeNode.body() : "";
        if (String(directBody || "").trim()) {
          return directBody;
        }
        const count = themeNode && typeof themeNode.childCount === "function" ? themeNode.childCount() : 0;
        const parts = [];
        for (let index = 0; index < count; index += 1) {
          const child = themeNode.childAt(index);
          if (child && typeof child.sourceQHTML === "function") {
            parts.push(child.sourceQHTML(0));
          }
        }
        return parts.join("\n");
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
      applyTransitionApplications(domElement, transitionApplicationsFromStyleText(rawCssText, registry));
    }
    const cssText = cssTextWithoutTransitionBlocks(cssTextWithoutStylePainters(rawCssText), registry);
    cssDeclarations(cssText).forEach((decl) => {
      const cssName = cssShortcutPropertyName(decl.name);
      if (defaultOnly && domElement.style.getPropertyValue(cssName)) {
        return;
      }
      domElement.style.setProperty(cssName, decl.value);
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
      const cssName = cssShortcutPropertyName(decl.name);
      if (defaultOnly && element.style.getPropertyValue(cssName)) {
        return;
      }
      element.style.setProperty(cssName, decl.value);
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
        console.log(`Invalid q-theme selector "${rule.selector}"`, error);
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
      console.log(`QHTML paint handler expected q-property "${propertyListName}" to contain QHTMLProperty references`);
      return null;
    }
    const raw = String(listEntry.rawValue || "").trim();
    const inner = raw.startsWith("[") && raw.endsWith("]") ? raw.slice(1, -1) : raw;
    const entries = [];
    for (const item of splitTopLevel(inner)) {
      const name = String(item || "").trim().replace(/^this\./, "");
      const entry = domElement.__qhtmlProperties && domElement.__qhtmlProperties[name];
      if (!entry) {
        console.log(`QHTML paint property "${item}" is not a QHTMLProperty on this component`);
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
      console.log("Unable to register QHTML paint worklet", error);
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
      console.log(`QHTML painter "${painterName}" was not found.`);
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
        console.log("q-canvas could not create a 2D rendering context.");
      }
      context.clearRect(0, 0, canvasElement.width, canvasElement.height);
      const invokePainter = function invokePainter(painterName) {
        const painter = registry && registry.paintersByName ? registry.paintersByName.get(String(painterName || "")) : null;
        if (!painter || typeof painter.body !== "function") {
          console.log(`QHTML painter "${painterName}" was not found.`);
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
  //  throw error;
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
      console.log(`Invalid q-anchor expression: ${cleaned}`);
    }
    const targetName = match[1];
    const targetEdge = normalizeAnchorEdge(match[2] || "left");
    const target = registry.elementsByName.get(targetName);
    if (!target) {
      console.log(`QHTML anchor target was not found: ${targetName}`);
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
      ? rootElement.querySelectorAll("[qhtml-node]")
      : [];
    renderedElements.forEach((domElement) => {
      const qhtmlNode = registry.nodesByUuid.get(domElement.getAttribute("qhtml-node"));
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
      ? rootElement.querySelectorAll("[qhtml-node]")
      : [];
    renderedElements.forEach((domElement) => {
      const qhtmlNode = registry.nodesByUuid.get(domElement.getAttribute("qhtml-node"));
      bindCssShortcutAssignments(domElement, qhtmlNode, registry);
    });
    if (typeof globalScope.requestAnimationFrame === "function") {
      globalScope.requestAnimationFrame(() => {
        renderedElements.forEach((domElement) => {
          const qhtmlNode = registry.nodesByUuid.get(domElement.getAttribute("qhtml-node"));
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
    const binding = registerQHTMLScript(
      domElement,
      parameters,
      body,
      registry,
      callbackNode,
      `callback:${callbackName}`
    );
    const callback = globalScope.QCallback(function qhtmlDeclarativeCallback(...args) {
      return doScript(registry, binding, args);
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
    let definitionNode = instanceNode && typeof instanceNode.componentDefinition === "function"
      ? instanceNode.componentDefinition()
      : null;
    if (!definitionNode && domElement && typeof domElement.getAttribute === "function" && registry && registry.nodesByUuid) {
      const definitionUuid = domElement.getAttribute("component-definition");
      definitionNode = definitionUuid ? registry.nodesByUuid.get(definitionUuid) || null : null;
    }
    bindRuntimeOnlyDeclarations(domElement, definitionNode, registry);
    bindBehaviorTargetProperties(domElement, definitionNode, registry);
    applyNodeTransitionApplications(domElement, definitionNode, registry);
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
        html += addForMetadataToHtml(renderQHTMLSourceForLoop(childSource, variableName, value, domElement, registry, domElement.qhtmlNode || null), forUuid);
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
      .map((value) => renderQHTMLSourceForLoop(body, variableName, value, domElement, registry, domElement.qhtmlNode || null))
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
        if (forUuid && forRangeHasRenderedContent(domElement, forUuid)) {
          domElement.__qhtmlRenderedLocalForNodes.add(forUuid);
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
      bindPaintHandlers(domElement, instanceNode, registry);
      installQHTMLReferenceAccess(domElement, registry, true);
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

  function renderBoundQHTMLTree(targetNode, registry) {
    const activeRegistry = registry || registryForQHTMLTarget(targetNode);
    const rootElement = activeRegistry && activeRegistry.rootElement;
    const tree = activeRegistry && activeRegistry.tree;
    if (!rootElement || !tree) {
      return null;
    }

    const targetUuid = qhtmlNodeUuid(targetNode);
    if (typeof activeRegistry.stopTimers === "function") {
      activeRegistry.stopTimers();
    }

    rootElement.innerHTML = typeof tree.renderHtml === "function" ? tree.renderHtml() : "";
    bindComponentDomRuntime(rootElement, tree);
    rootElement.qhtmlDomTree = tree;
    rootElement.qhtmlDom = tree;
    rootElement.qhtmlNode = tree;
    rootElement.__qhtml7Mounted = true;
    rootElement.setAttribute("ready", "1");

    const nextRegistry = rootElement.__qhtmlRegistry || rootElement.qhtmlComponentRegistry;
    const renderedTarget = targetNode === tree
      ? rootElement
      : (targetUuid && nextRegistry && nextRegistry.elementsByUuid
        ? nextRegistry.elementsByUuid.get(targetUuid) || null
        : null);

    rootElement.dispatchEvent(new CustomEvent("QHTMLRendered", {
      bubbles: true,
      detail: {
        qhtmlNode: targetNode || tree,
        qhtmlDom: tree,
        element: renderedTarget || rootElement
      }
    }));
    return renderedTarget || rootElement;
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
      if (!isValidPropertyIdentifier(name) || Object.prototype.hasOwnProperty.call(domElement, name)) {
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

  function currentQHTMLComponentFor(domElement, registry) {
    const componentElement = domElement && domElement.closest
      ? domElement.closest("[component-instance]")
      : null;
    return componentElement || domElement || (registry && registry.rootElement) || null;
  }

  function componentElementForQHTMLNode(node, registry) {
    if (!node || !registry || qhtmlNodeType(node) !== "QHTMLComponentInstance") {
      return null;
    }
    const uuid = qhtmlNodeUuid(node);
    return uuid && registry.elementsByUuid ? registry.elementsByUuid.get(uuid) || null : null;
  }

  function nearestComponentElementForQHTMLNode(node, registry) {
    let current = node || null;
    while (current) {
      const componentElement = componentElementForQHTMLNode(current, registry);
      if (componentElement) {
        return componentElement;
      }
      current = typeof current.parent === "function" ? current.parent() : null;
    }
    return registry && registry.rootElement ? registry.rootElement : null;
  }

  function qhtmlScriptThisFor(target, registry) {
    const sourceRegistry = registry || registryForQHTMLTarget(target);
    if (isDomElementLike(target)) {
      return currentQHTMLComponentFor(target, sourceRegistry);
    }
    if (target && isDomElementLike(target.ownerElement)) {
      return currentQHTMLComponentFor(target.ownerElement, sourceRegistry);
    }
    if (target && isDomElementLike(target.__qhtmlElement)) {
      return currentQHTMLComponentFor(target.__qhtmlElement, sourceRegistry);
    }
    const node = qhtmlNodeForReferenceTarget(target, sourceRegistry);
    const componentElement = nearestComponentElementForQHTMLNode(node, sourceRegistry);
    return componentElement || (sourceRegistry && sourceRegistry.rootElement) || target || null;
  }

  function parentQHTMLComponentFor(domElement, registry) {
    const currentComponent = currentQHTMLComponentFor(domElement, registry);
    if (!currentComponent || !currentComponent.parentElement || !currentComponent.parentElement.closest) {
      return null;
    }
    return currentComponent.parentElement.closest("[component-instance]");
  }

  function bindComponentFacade(domElement, registry) {
    const componentElement = currentQHTMLComponentFor(domElement, registry);
    installSignalBlocker(domElement);
    installCssShortcutAccessors(domElement);
    domElement.component = componentElement;
    domElement.parent = function parent() {
      return parentQHTMLComponentFor(domElement, registry || domElement.__qhtmlRegistry);
    };
    domElement.parentComponent = function parentComponent() {
      return parentQHTMLComponentFor(domElement, registry || domElement.__qhtmlRegistry);
    };
    bindComponentContextForwarders(domElement, componentElement);
    installQHTMLReferenceAccess(domElement, registry || domElement.__qhtmlRegistry, false);
    domElement.toJSON = function componentToJSON() {
      return domElement.qhtmlNode.toJSON();
    };
    domElement.fromJSON = function componentFromJSON(value) {
      const changed = domElement.qhtmlNode.fromJSON(value);
      registerGeneratedQHTMLTree(domElement.qhtmlNode, registry || domElement.__qhtmlRegistry);
      refreshRuntimeLoggers(registry || domElement.__qhtmlRegistry);
      updateRuntimeElementTree(domElement, registry || domElement.__qhtmlRegistry);
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

    installCssShortcutAccessors(domElement);
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
      installQHTMLReferenceAccess(domElement, registry, true);
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

    bindDeferredEventHandlersForNode(rootElement, rootElement.qhtmlNode || registry.tree || null);

    if (!rootElement.querySelectorAll) {
      return;
    }

    rootElement.querySelectorAll("[component-instance]").forEach((domElement) => {
      bindDeferredEventHandlersForNode(domElement, domElement.qhtmlNode || null);
    });

    rootElement.querySelectorAll("[qhtml-node]").forEach((domElement) => {
      if (domElement.hasAttribute("component-instance")) {
        return;
      }
      bindDeferredEventHandlersForNode(domElement, domElement.qhtmlNode || null);
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
      const parent = typeof node.parent === "function" ? node.parent() : null;
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
      executeScriptBody(ownerObject, [], [], body, registry, node, `script:${scriptUuid}`);
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

  function forRangeHasRenderedContent(rootElement, forUuid) {
    const start = findForComment(rootElement, "start", forUuid);
    const end = findForComment(rootElement, "end", forUuid);
    if (!start || !end || start.parentNode !== end.parentNode) {
      return false;
    }
    let node = start.nextSibling;
    while (node && node !== end) {
      if (node.nodeType === 1) {
        return true;
      }
      if (node.nodeType === 3 && String(node.nodeValue || "").trim() !== "") {
        return true;
      }
      node = node.nextSibling;
    }
    return false;
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
      rootElement.querySelectorAll("[qhtml-node]").forEach(collect);
    }

    readyElements.forEach((domElement) => {
      const qhtmlNode = domElement.qhtmlNode || null;
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
      rootElement,
      tree,
      globals: globalScope
    };
    if (typeof tree.setRenderHandler === "function") {
      tree.setRenderHandler(function qhtmlBoundTreeRenderer(targetNode) {
        return renderBoundQHTMLTree(
          targetNode || tree,
          rootElement.__qhtmlRegistry || rootElement.qhtmlComponentRegistry || registry
        );
      });
    }
    registry.scriptRegistry = new QHTMLScriptRegistry(registry);
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
      if (registry.layoutController && typeof registry.layoutController.dispose === "function") {
        registry.layoutController.dispose();
        registry.layoutController = null;
      }
      registry.scriptRegistry.clear();
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
    refreshRuntimeLoggers(registry);
    registry.componentDefinitionsByName.forEach((definitionProxy, definitionName) => {
      logQHTMLRuntime(registry, "QHTMLComponent", "Component definition " + definitionName + " registered", definitionProxy.qhtmlNode);
    });
    bindRuntimeChildren(rootElement, tree, registry);
    installQHTMLReferenceAccess(rootElement, registry, true);

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
      }
      logQHTMLRuntime(
        registry,
        "QHTMLComponent",
        "Component instance " + (qhtmlNodeName(instanceNode) || instanceUuid || "anonymous") + " bound",
        instanceNode
      );
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
      installQHTMLReferenceAccess(domElement, registry, true);

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
    bindDeferredEventHandlers(rootElement, registry);
    bindConnectNodes(registry);
    bindScriptNodes(registry);

    applyStyleAndThemeApplications(rootElement, registry);
    applyAnchorPositioning(rootElement, registry);
    refreshGeometryCssBindings(rootElement, registry);

    registry.layoutController = createQHTMLLayoutController(rootElement, registry);
    registry.layoutController.start();
    rootElement.qhtmlRefreshLayouts = function () {
      return registry.layoutController && typeof registry.layoutController.refresh === "function"
        ? registry.layoutController.refresh()
        : false;
    };

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
    rootElement.qhtmlScriptRegistry = registry.scriptRegistry;

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
      const tree = this.qhtmlDomTree || new QHTMLTypes.QHTMLDomTree();
      let ok = false;
      if (typeof tree.fromJSON === "function") {
        ok = tree.fromJSON(value);
      } else if (typeof tree.fromJSONText === "function") {
        ok = tree.fromJSONText(typeof value === "string" ? value : JSON.stringify(value));
      } else {
        console.log("QHTMLDomTree does not expose fromJSON/fromJSONText");
      }
      if (!ok) {
        console.log("QHTML fromJSON failed: invalid JSON payload");
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
    resolveReference(target, nameOrUUID) {
      return resolveQHTMLRuntimeReference(target, nameOrUUID, registryForQHTMLTarget(target));
    },
    resolveReferenceNode(target, nameOrUUID) {
      return resolveQHTMLReferenceNode(target, nameOrUUID, registryForQHTMLTarget(target));
    },
    resolveReferenceUUID(target, uuid) {
      return resolveQHTMLRuntimeReference(target, uuid, registryForQHTMLTarget(target));
    },
    referenceMapFor(target) {
      return Object.assign({}, qhtmlReferenceNameMap(target, registryForQHTMLTarget(target)));
    },
    referencesFor(target) {
      if (target && !isQHTMLWasmReference(target)) {
        return qhtmlReferenceFacadeFor(target, registryForQHTMLTarget(target), false);
      }
      const map = qhtmlReferenceNameMap(target, registryForQHTMLTarget(target));
      const out = {};
      Object.keys(map).forEach((name) => {
        out[name] = resolveQHTMLRuntimeReference(target, name, registryForQHTMLTarget(target));
      });
      return out;
    },
    referenceNodesFor(target) {
      if (target && !isQHTMLWasmReference(target)) {
        return qhtmlReferenceFacadeFor(target, registryForQHTMLTarget(target), true);
      }
      const map = qhtmlReferenceNameMap(target, registryForQHTMLTarget(target));
      const out = {};
      Object.keys(map).forEach((name) => {
        out[name] = resolveQHTMLReferenceNode(target, name, registryForQHTMLTarget(target));
      });
      return out;
    },
    hasReference(target, nameOrUUID) {
      return Boolean(resolveQHTMLReferenceNode(target, nameOrUUID, registryForQHTMLTarget(target)));
    },
    setContextProperty(target, name, value) {
      const registry = registryForQHTMLTarget(target);
      const node = qhtmlNodeForReferenceTarget(target, registry);
      if (!node || typeof node.setContextProperty !== "function") {
        throw new TypeError("The target is not bound to a QHTMLNode context");
      }
      const result = node.setContextProperty(name, value);
      if (target && !isQHTMLWasmReference(target)) {
        installQHTMLReferenceAccess(target, registry, true);
      }
      return result;
    },
    render(target) {
      const registry = registryForQHTMLTarget(target);
      const node = qhtmlNodeForReferenceTarget(target, registry);
      if (!node || typeof node.render !== "function") {
        return null;
      }
      return node.render();
    },
    refreshLayouts(target, synchronous) {
      const refreshController = (controller) => {
        if (!controller) {
          return false;
        }
        if (synchronous && typeof controller.refreshNow === "function") {
          return controller.refreshNow();
        }
        return typeof controller.refresh === "function" ? controller.refresh() : false;
      };
      if (!target) {
        let refreshed = false;
        document.querySelectorAll(QHTML_ROOT_SELECTOR).forEach((rootElement) => {
          const registry = rootElement.__qhtmlRegistry || rootElement.qhtmlComponentRegistry;
          refreshed = refreshController(registry && registry.layoutController) || refreshed;
        });
        return refreshed;
      }
      const registry = registryForQHTMLTarget(target);
      return refreshController(registry && registry.layoutController);
    },
    setLayoutProperty(target, name, value) {
      const registry = registryForQHTMLTarget(target);
      const node = qhtmlNodeForReferenceTarget(target, registry);
      if (!node || typeof node.setPropertyText !== "function") {
        return false;
      }
      node.setPropertyText(String(name || ""), String(value == null ? "" : value));
      const controller = registry && registry.layoutController;
      if (controller && typeof controller.refresh === "function") {
        controller.refresh();
      }
      return true;
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
    "path",
    "duration",
    "delay",
    "sleep",
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
      this._pathFrame = 0;
      this._pathStartedAt = 0;
      this._pathSettingPosition = false;
      this._pathOriginalX = null;
      this._pathOriginalY = null;
      this._pathOriginalCaptured = false;
      this._resizeObserver = typeof ResizeObserver === "function"
        ? new ResizeObserver(() => this._resize())
        : null;
      this._boundResize = this._resize.bind(this);
      this._boundWorkerMessage = this._onWorkerMessage.bind(this);
    }

    connectedCallback() {
      this._capturePathFallbackPosition();
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
        this._startPathAnimation(true);
      }
    }

    disconnectedCallback() {
      this._stopPathAnimation(false);
      this._stopPainter();
      this._destroyWorker();

      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
      } else {
        global.removeEventListener("resize", this._boundResize);
      }

      this._canvas.remove();
    }

    attributeChangedCallback(name, oldValue, newValue) {
      const attributeName = String(name || "").toLowerCase();

      if ((attributeName === "x" || attributeName === "y") &&
          this._pathOriginalCaptured &&
          !this._pathSettingPosition) {
        if (attributeName === "x") {
          this._pathOriginalX = newValue;
        } else {
          this._pathOriginalY = newValue;
        }
      }

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
        this._startPathAnimation(true);
      } else if (oldRunning && !this._config.running) {
        this._stopPathAnimation(true);
        this._postWorker({ type: "stop" });
      } else if (attributeName === "path" ||
                 attributeName === "duration" ||
                 attributeName === "delay" ||
                 attributeName === "sleep") {
        if (this._config.running && this._readPathPoints().length > 0) {
          this._startPathAnimation(true);
        } else {
          this._stopPathAnimation(true);
        }
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
        console.log("<particle-emitter> must be placed inside a parent element.");
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

    _capturePathFallbackPosition() {
      if (this._pathOriginalCaptured) {
        return;
      }

      this._pathOriginalCaptured = true;
      this._pathOriginalX = this.getAttribute("x");
      this._pathOriginalY = this.getAttribute("y");
    }

    _readPathPoints() {
      const values = String(this.getAttribute("path") || "")
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean);
      const points = [];

      for (let index = 0; index + 1 < values.length; index += 2) {
        const x = Number(values[index]);
        const y = Number(values[index + 1]);

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          continue;
        }

        points.push([clamp(x, 0, 1), clamp(y, 0, 1)]);
      }

      return points;
    }

    _pathParentSize() {
      const parent = this.parentElement;

      if (!parent) {
        return [0, 0];
      }

      const style = global.getComputedStyle(parent);
      const rect = parent.getBoundingClientRect();
      const width = Number.parseFloat(style.width) || Number(rect.width) || Number(parent.clientWidth) || 0;
      const height = Number.parseFloat(style.height) || Number(rect.height) || Number(parent.clientHeight) || 0;
      return [width, height];
    }

    _applyPathPosition(normalizedX, normalizedY, pathPosition) {
      const size = this._pathParentSize();
      const x = clamp(Number(normalizedX) || 0, 0, 1) * size[0];
      const y = clamp(Number(normalizedY) || 0, 0, 1) * size[1];

      this.setAttribute("pathPos", String(pathPosition));

      this._pathSettingPosition = true;
      try {
        this.setAttribute("x", String(x));
        this.setAttribute("y", String(y));
      } finally {
        this._pathSettingPosition = false;
      }
    }

    _restorePathFallbackPosition() {
      if (!this._pathOriginalCaptured) {
        return;
      }

      this._pathSettingPosition = true;
      try {
        if (this._pathOriginalX == null) {
          this.removeAttribute("x");
        } else {
          this.setAttribute("x", this._pathOriginalX);
        }

        if (this._pathOriginalY == null) {
          this.removeAttribute("y");
        } else {
          this.setAttribute("y", this._pathOriginalY);
        }
      } finally {
        this._pathSettingPosition = false;
      }

      this.removeAttribute("pathPos");
    }

    _startPathAnimation(reset) {
      const points = this._readPathPoints();

      if (!this.running || points.length === 0) {
        return;
      }

      if (reset || !this._pathStartedAt) {
        this._pathStartedAt = global.performance && typeof global.performance.now === "function"
          ? global.performance.now()
          : Date.now();
      }

      this._updatePathAnimation();
    }

    _stopPathAnimation(restorePosition) {
      if (this._pathFrame) {
        if (typeof global.cancelAnimationFrame === "function") {
          global.cancelAnimationFrame(this._pathFrame);
        } else {
          global.clearTimeout(this._pathFrame);
        }
        this._pathFrame = 0;
      }

      this._pathStartedAt = 0;

      if (restorePosition) {
        this._restorePathFallbackPosition();
      }
    }

    _schedulePathAnimation() {
      if (this._pathFrame || !this.running || this._readPathPoints().length < 2) {
        return;
      }

      if (typeof global.requestAnimationFrame === "function") {
        this._pathFrame = global.requestAnimationFrame(() => {
          this._pathFrame = 0;
          this._updatePathAnimation();
        });
      } else {
        this._pathFrame = global.setTimeout(() => {
          this._pathFrame = 0;
          this._updatePathAnimation();
        }, 16);
      }
    }

    _updatePathAnimation() {
      const points = this._readPathPoints();

      if (!this.running || points.length === 0) {
        this._stopPathAnimation(false);
        return;
      }

      if (points.length === 1) {
        this._applyPathPosition(points[0][0], points[0][1], 0);
        return;
      }

      const now = global.performance && typeof global.performance.now === "function"
        ? global.performance.now()
        : Date.now();
      const duration = Math.max(1, Number(this.getAttribute("duration")) || 1000);
      const delay = Math.max(0, Number(this.getAttribute("delay")) || 0);
      const sleep = Math.max(0, Number(this.getAttribute("sleep")) || 0);
      const segmentDuration = duration / points.length;
      const movementDuration = segmentDuration * (points.length - 1);
      const cycleDuration = delay + movementDuration + sleep;
      const elapsed = Math.max(0, now - this._pathStartedAt);
      const cycleElapsed = cycleDuration > 0 ? elapsed % cycleDuration : 0;

      if (cycleElapsed < delay) {
        this._applyPathPosition(points[0][0], points[0][1], 0);
        this._schedulePathAnimation();
        return;
      }

      const movementElapsed = cycleElapsed - delay;

      if (movementElapsed >= movementDuration) {
        const last = points[points.length - 1];
        this._applyPathPosition(last[0], last[1], points.length - 1);
        this._schedulePathAnimation();
        return;
      }

      const pathPosition = Math.min(
        points.length - 2,
        Math.floor(movementElapsed / segmentDuration)
      );
      const progress = clamp(
        (movementElapsed - (pathPosition * segmentDuration)) / segmentDuration,
        0,
        1
      );
      const start = points[pathPosition];
      const end = points[pathPosition + 1];
      const x = start[0] + ((end[0] - start[0]) * progress);
      const y = start[1] + ((end[1] - start[1]) * progress);

      this._applyPathPosition(x, y, pathPosition);
      this._schedulePathAnimation();
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

      if (this.running && this._readPathPoints().length > 0) {
        this._updatePathAnimation();
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
