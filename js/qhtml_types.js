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
    }

    setParentContext(parentContext) { this._parentContext = parentContext; }
    parentContext() { return this._parentContext; }
    clear() { this._references.clear(); }
    setReference(key, reference) {
      const name = trim(key);
      this._references.set(name, reference);
    }
    updateKeywordReference(name, value) { this.setReference(name, new QHTMLKeyword(name, value)); }
    updateNamedReference(name, uuid) { this.setReference(name, new QHTMLNamedReference(name, uuid)); }
    updateObjectReference(name, target) { this.setReference(name, new QHTMLObjectReference(name, target)); }
    resolve(key) {
      const name = trim(key);
      if (this._references.has(name)) {
        const reference = this._references.get(name);
        return reference instanceof QHTMLObjectReference ? reference.target() : reference;
      }
      return this._parentContext ? this._parentContext.resolve(name) : null;
    }
    containsLocalReference(key) { return this._references.has(trim(key)); }
    resolveTypeJs(key) { const ref = this.resolve(key); return ref ? ref.qhtmlType() : ""; }
    keys() { return Array.from(this._references.keys()); }
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
    size() { return this._references.size; }
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
    contextKeysJs() { return this.qhtmlContext ? this.qhtmlContext.visibleKeys() : []; }
    runtime() { for (const child of this.children()) child.runtime(); }
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
        throw new Error("QHTMLParser is not loaded; include js/qhtml_parser.js before calling insertQHTMLSource().");
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
    node.qhtmlContext.clear();
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
      for (const child of node.children()) {
        if (child instanceof QHTMLComponentDefinition || child instanceof QHTMLComponentInstance) {
          qhtmlRebuildReferencesInScope(child, scopeMap, scopeContext, visited);
          continue;
        }
        qhtmlApplyReferenceMap(child, scopeMap, scopeContext);
        applyChildren(child);
      }
      for (const member of node.ownedReferenceMembers()) {
        qhtmlApplyReferenceMap(member, scopeMap, scopeContext);
        applyChildren(member);
      }
    };

    applyChildren(scopeNode);
  }

  class QHTMLDomTree extends QHTMLDomNode {
    constructor() {
      super("QHTMLDomTree", "root");
      this.qhtmlSignalBus = new QHTMLSignalBus();
      this.qhtmlJavaScriptRuntime = new QHTMLJavaScriptRuntime();
    }
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
        const definition = definitionsByUuid.get(node.componentDefinitionUUID()) ||
          (componentName ? definitionsByName.get(componentName) : null) ||
          (node.definition() ? definitionsByUuid.get(node.definition().qhtmlUUID()) : null);
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
