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
    "q-event",
    "q-event-listener",
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
          if (candidate.toLowerCase() === "extends") {
            continue;
          }
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
      this.isKeywordEnumerationValid = false;
      this.enumeratedKeywordsCache = [];
      this.astParent = null;
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
    invalidateKeywordEnumeration() {
      this.isKeywordEnumerationValid = false;
      this.enumeratedKeywordsCache = [];
      if (this.astParent) {
        this.astParent.invalidateKeywordEnumeration();
      }
    }
    appendAstChild(node) {
      if (node) {
        if (node.astParent && node.astParent !== this) {
          node.astParent.removeAstChild(node);
        }
        node.astParent = this;
        this.astChildren.push(node);
        this.invalidateKeywordEnumeration();
      }
    }
    takeAstChildAt(index) {
      if (index < 0 || index >= this.astChildren.length) {
        return null;
      }
      const node = this.astChildren.splice(index, 1)[0] || null;
      if (node) {
        node.astParent = null;
        this.invalidateKeywordEnumeration();
      }
      return node;
    }
    removeAstChild(node) {
      const index = this.astChildren.indexOf(node);
      return index >= 0 ? this.takeAstChildAt(index) : null;
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
      if (this.isKeywordEnumerationValid) {
        return this.enumeratedKeywordsCache;
      }
      this.astChildrenUUIDs.clear();
      this.astChildrenUUIDKeywords.clear();
      this.enumeratedKeywordsCache = [];
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
        this.enumeratedKeywordsCache.push({
          index: i,
          uuid: child.qhtmlUUID,
          keyword: child.qhtmlType()
        });
        child.enumerateKeywords();
      }
      this.applyLocalKeywordDeclarations();
      this.enumerateNamedReferencesDeep();
      this.isKeywordEnumerationValid = true;
      return this.enumeratedKeywordsCache;
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
      return ["q-event-handler", "q-event-listener", "function", "q-connect", "q-class", "q-script", "q-script-action", "script"].includes(keyword);
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
        case "q-event": return new T.QHTMLEvent(this.qhtmlName, this._attributes, this.qhtmlContent);
        case "q-event-listener": return new T.QHTMLEventListener(this.qhtmlName, this._attributes, this.qhtmlContent);
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
      "q-script-action", "q-event"
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
    if (typedSignature.valid && (typedSignature.keyword === "q-signal" || typedSignature.keyword === "q-event")) {
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
      if (parent instanceof QHTMLTypes.QHTMLStyle ||
          parent instanceof QHTMLTypes.QHTMLTheme ||
          parent instanceof QHTMLTypes.QHTMLTransition) {
        return;
      }
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
    } else if (source instanceof QHTMLTypes.QHTMLEvent) {
      clone = source.cloneEvent();
    } else if (source instanceof QHTMLTypes.QHTMLEventListener) {
      clone = source.cloneEventListener();
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
      if (source.qhtmlName() &&
          directChildNamed(instance, source.qhtmlName()) &&
          !(source instanceof QHTMLTypes.QHTMLProperty) &&
          !(source instanceof QHTMLTypes.QHTMLEventListener)) {
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
