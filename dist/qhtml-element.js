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
