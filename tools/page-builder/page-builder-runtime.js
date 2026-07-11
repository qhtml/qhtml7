(function () {
  "use strict";

  const VERSION = "7.3.4-page-builder";
  const FILE_KEY = "qhtml7:page-builder:files";
  const LAST_KEY = "qhtml7:page-builder:last";
  const PALETTE_KEY = "qhtml7:page-builder:palette";

  function clone(value) {
    return JSON.parse(JSON.stringify(value == null ? null : value));
  }

  function uid(prefix) {
    return String(prefix || "pb") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  }

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (isObject(value) && Array.isArray(value.qhtmlChildren)) return value.qhtmlChildren;
    if (value == null) return [];
    return [value];
  }

  function qType(node) {
    return isObject(node) ? String(node.qhtmlType || node.type || "") : "";
  }

  function qName(node) {
    return isObject(node) ? String(node.qhtmlName || node.name || "") : "";
  }

  function childrenOf(node) {
    if (!isObject(node)) return [];
    if (!Array.isArray(node.qhtmlChildren)) node.qhtmlChildren = [];
    return node.qhtmlChildren;
  }

  function attrsOf(node) {
    if (!isObject(node)) return {};
    if (!isObject(node.qhtmlAttributes)) node.qhtmlAttributes = {};
    return node.qhtmlAttributes;
  }

  function propsOf(node) {
    if (!isObject(node)) return {};
    if (!isObject(node.qhtmlProperties)) node.qhtmlProperties = {};
    return node.qhtmlProperties;
  }

  function isDefinition(node) {
    return qType(node) === "QHTMLComponentDefinition";
  }

  function isInstance(node) {
    return qType(node) === "QHTMLComponentInstance" || !!(isObject(node) && node.qhtmlComponentName);
  }

  function isLayout(node) {
    const type = qType(node);
    return type === "QHTMLLayout" || type === "QHTMLRowLayout" || type === "QHTMLColumnLayout";
  }

  function layoutKind(node) {
    const type = qType(node);
    if (type === "QHTMLRowLayout") return "row";
    if (type === "QHTMLColumnLayout") return "col";
    if (type === "QHTMLLayout") return "layout";
    return "";
  }

  function firstByType(nodes, predicate) {
    const stack = asArray(nodes).slice();
    while (stack.length) {
      const node = stack.shift();
      if (predicate(node)) return node;
      stack.unshift(...childrenOf(node));
    }
    return null;
  }

  function walk(nodes, visitor, parent, path) {
    asArray(nodes).forEach((node, index) => {
      const nextPath = (path || []).concat(index);
      visitor(node, parent || null, index, nextPath);
      walk(childrenOf(node), visitor, node, nextPath.concat("qhtmlChildren"));
    });
  }

  function findNodePath(nodes, predicate) {
    let found = null;
    function scan(list, parent, path) {
      list.forEach((node, index) => {
        if (found) return;
        const currentPath = path.concat(index);
        if (predicate(node)) {
          found = { node, parent, index, path: currentPath };
          return;
        }
        scan(childrenOf(node), node, currentPath.concat("qhtmlChildren"));
      });
    }
    scan(asArray(nodes), null, []);
    return found;
  }

  function findByInstanceId(nodes, id) {
    return findNodePath(nodes, (node) => attrsOf(node)["data-pb-instance-id"] === id || propsOf(node)["data-pb-instance-id"] === id);
  }

  function setNodeAttribute(node, name, value) {
    attrsOf(node)[name] = String(value);
    propsOf(node)[name] = String(value);
  }

  function makeTextNode(text) {
    return {
      qhtmlType: "QHTMLTextFragment",
      qhtmlName: "",
      qhtmlContents: String(text || "")
    };
  }

  function makeAnon(tagName, attrs, kids) {
    return {
      qhtmlType: "QHTMLDomElement",
      qhtmlTagName: String(tagName || "div"),
      qhtmlName: "",
      qhtmlAttributes: Object.assign({}, attrs || {}),
      qhtmlProperties: Object.assign({}, attrs || {}),
      qhtmlChildren: kids || []
    };
  }

  function makeLayout(kind, attrs, kids) {
    const type = kind === "row" ? "QHTMLRowLayout" : kind === "col" ? "QHTMLColumnLayout" : "QHTMLLayout";
    const keyword = kind === "row" ? "q-row" : kind === "col" ? "q-col" : "q-layout";
    return {
      qhtmlType: type,
      qhtmlKeyword: keyword,
      qhtmlName: "",
      qhtmlAttributes: Object.assign({}, attrs || {}),
      qhtmlProperties: Object.assign({}, attrs || {}),
      qhtmlChildren: kids || []
    };
  }

  function makeDefaultCanvasJson() {
    return [makeLayout("layout", {
      id: "pb-builder-layout",
      "data-pb-slot": "canvas",
      width: "100%",
      minHeight: "70vh",
      gap: "14px"
    }, [
      makeLayout("row", { height: "auto" }, [
        makeLayout("col", { width: "auto" }, [
          makeAnon("div", { class: "pb-empty-drop" }, [makeTextNode("Drop palette items here")])
        ])
      ])
    ])];
  }

  function removeEmptyDrop(node) {
    const kids = childrenOf(node);
    for (let index = kids.length - 1; index >= 0; index -= 1) {
      const child = kids[index];
      const attrs = attrsOf(child);
      if (String(attrs.class || attrs.className || "").split(/\s+/).includes("pb-empty-drop")) {
        kids.splice(index, 1);
      }
    }
  }


  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value || ""));
    return String(value || "").replace(/[^A-Za-z0-9_-]/g, "\\$&");
  }

  function serializePretty(value) {
    return JSON.stringify(value, null, 2);
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([String(text || "")], { type: type || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function readFileText(accept) {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept || ".json,.qhtml,.txt";
      input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        if (!file) {
          resolve("");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("File read failed"));
        reader.readAsText(file);
      }, { once: true });
      input.click();
    });
  }

  function editorValue(element) {
    if (!element) return "";
    if (typeof element.value === "string") return element.value;
    if (typeof element.getValue === "function") return String(element.getValue() || "");
    if (element.editor && typeof element.editor.getValue === "function") return String(element.editor.getValue() || "");
    return String(element.textContent || "");
  }

  function setEditorValue(element, value) {
    if (!element) return;
    const text = String(value || "");
    if (typeof element.setValue === "function") {
      element.setValue(text);
      return;
    }
    if (element.editor && typeof element.editor.setValue === "function") {
      element.editor.setValue(text);
      return;
    }
    if ("value" in element) {
      element.value = text;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    element.textContent = text;
  }

  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return null;
    if (typeof dialog.showModal === "function" && !dialog.open) {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "open");
      dialog.style.display = "block";
    }
    return dialog;
  }

  function closeDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    if (typeof dialog.close === "function" && dialog.open) {
      dialog.close();
    }
    dialog.removeAttribute("open");
    dialog.style.display = "";
  }

  class QHTMLConverter {
    constructor() {
      this.element = null;
    }

    host() {
      if (this.element && this.element.isConnected) return this.element;
      const element = document.createElement("q-html");
      element.id = "pb-qhtml-converter";
      element.style.display = "none";
      element.setAttribute("aria-hidden", "true");
      element.textContent = "";
      document.body.appendChild(element);
      this.element = element;
      return element;
    }

    async sourceToJSON(source) {
      const element = this.host();
      if (typeof element.setQHTMLSource === "function") {
        await Promise.resolve(element.setQHTMLSource(String(source || "")));
      } else if (window.QHTML7 && typeof window.QHTML7.parse === "function") {
        element.qhtmlDomTree = window.QHTML7.parse(String(source || ""));
      } else {
        throw new Error("QHTML conversion API is not available");
      }
      const json = typeof element.toJSON === "function" ? element.toJSON() : [];
      return clone(json);
    }

    async jsonToQHTML(json) {
      const element = this.host();
      if (typeof element.fromJSON !== "function") {
        return this.fallbackQHTML(json);
      }
      await Promise.resolve(element.fromJSON(clone(json)));
      if (typeof element.toQHTML === "function") return String(element.toQHTML() || "");
      return this.fallbackQHTML(json);
    }

    async jsonToHTML(json) {
      const element = this.host();
      if (typeof element.fromJSON !== "function") {
        const source = await this.jsonToQHTML(json);
        return this.sourceToHTML(source);
      }
      await Promise.resolve(element.fromJSON(clone(json)));
      if (typeof element.toHTML === "function") return String(element.toHTML() || "");
      const source = typeof element.toQHTML === "function" ? element.toQHTML() : this.fallbackQHTML(json);
      return this.sourceToHTML(source);
    }

    async sourceToHTML(source) {
      if (window.QHTML7 && typeof window.QHTML7.renderSource === "function") {
        return String(window.QHTML7.renderSource(String(source || "")) || "");
      }
      const element = this.host();
      if (typeof element.setQHTMLSource === "function") {
        await Promise.resolve(element.setQHTMLSource(String(source || "")));
        if (typeof element.toHTML === "function") return String(element.toHTML() || "");
      }
      return "";
    }

    fallbackQHTML(json) {
      const source = [];
      asArray(json).forEach((node) => {
        source.push(this.nodeToQHTML(node, 0));
      });
      return source.filter(Boolean).join("\n");
    }

    nodeToQHTML(node, depth) {
      const indent = "  ".repeat(depth || 0);
      if (!isObject(node)) return "";
      if (node.qhtmlSource) return String(node.qhtmlSource || "");
      const type = qType(node);
      const name = qName(node);
      const body = childrenOf(node).map((child) => this.nodeToQHTML(child, (depth || 0) + 1)).filter(Boolean).join("\n");
      if (type === "QHTMLTextFragment") return indent + "text { " + String(node.qhtmlContents || node.value || "") + " }";
      if (type === "QHTMLHTMLFragment") return indent + "html { " + String(node.qhtmlContents || node.value || "") + " }";
      if (type === "QHTMLComponentDefinition") return indent + "q-component " + name + " {\n" + body + "\n" + indent + "}";
      if (type === "QHTMLComponentInstance") return indent + String(node.qhtmlComponentName || node.componentName || name || "component") + " " + name + " {\n" + body + "\n" + indent + "}";
      if (type === "QHTMLLayout") return indent + "q-layout {\n" + body + "\n" + indent + "}";
      if (type === "QHTMLRowLayout") return indent + "q-row {\n" + body + "\n" + indent + "}";
      if (type === "QHTMLColumnLayout") return indent + "q-col {\n" + body + "\n" + indent + "}";
      if (type === "QHTMLDomElement") return indent + String(node.qhtmlTagName || "div") + " {\n" + body + "\n" + indent + "}";
      return indent + (node.qhtmlKeyword || type || "div") + (name ? " " + name : "") + " {\n" + body + "\n" + indent + "}";
    }
  }

  class PageBuilderModel {
    constructor(converter) {
      this.converter = converter;
      this.pageInfo = { name: "Untitled Page", author: "", canonicalUrl: "" };
      this.palette = [];
      this.canvas = makeDefaultCanvasJson();
      this.usedDefinitions = new Map();
      this.selectedInstanceId = "";
      this.selectedFilePath = "/";
      this.pendingDrop = null;
    }

    documentJSON() {
      return {
        qhtmlType: "QHTMLPageBuilderDocument",
        qhtmlVersion: VERSION,
        pageInfo: clone(this.pageInfo),
        palette: clone(this.palette),
        canvas: clone(this.canvas)
      };
    }

    loadDocument(json) {
      const data = isObject(json) ? json : {};
      this.pageInfo = Object.assign({ name: "Untitled Page", author: "", canonicalUrl: "" }, data.pageInfo || {});
      this.palette = Array.isArray(data.palette) ? clone(data.palette) : this.palette;
      this.canvas = Array.isArray(data.canvas) ? clone(data.canvas) : makeDefaultCanvasJson();
      this.usedDefinitions = new Map();
      walk(this.canvas, (node) => {
        const name = node.qhtmlComponentName || node.componentName;
        if (name) this.usedDefinitions.set(String(name), true);
      });
    }

    qhtmlPayload() {
      const defs = [];
      const seen = new Set();
      this.palette.forEach((item) => {
        if (this.usedDefinitions.has(item.component) && item.definitionJson) {
          const candidates = asArray(item.definitionJson).filter(isDefinition);
          candidates.forEach((definition) => {
            const key = qName(definition) || item.component;
            if (!seen.has(key)) {
              seen.add(key);
              defs.push(clone(definition));
            }
          });
        }
      });
      return defs.concat(clone(this.canvas));
    }

    addPaletteItem(item) {
      const next = Object.assign({}, item);
      next.id = next.id || uid("palette");
      this.palette = this.palette.filter((existing) => existing.component !== next.component);
      this.palette.push(next);
      return next;
    }

    removePaletteItem(componentName) {
      this.palette = this.palette.filter((item) => item.component !== componentName);
    }

    paletteItem(idOrComponent) {
      return this.palette.find((item) => item.id === idOrComponent || item.component === idOrComponent) || null;
    }
  }

  class PageBuilderController {
    constructor() {
      this.converter = new QHTMLConverter();
      this.model = new PageBuilderModel(this.converter);
      this.host = null;
      this.initialized = false;
      this.dragPaletteId = "";
      this.hoverTarget = null;
      this.contextTargetId = "";
      this.files = this.readFiles();
      this.folderPicker = { mode: "", callback: null };
    }

    async init(host) {
      if (this.initialized) return;
      this.host = host || document.getElementById("page-builder-host");
      await this.waitForBuilderDOM();
      this.ensureDomAnchors();
      this.initialized = true;
      this.bindStaticEvents();
      await this.loadPaletteFromDOM();
      this.loadLastDocument();
      await this.renderAll();
      this.status("Ready");
    }

    waitForBuilderDOM() {
      return new Promise((resolve) => {
        const ready = () => document.querySelector("q-palette-toolbox-button") && document.querySelector(".pb-render-host");
        if (ready()) {
          resolve();
          return;
        }
        let attempts = 0;
        const timer = setInterval(() => {
          attempts += 1;
          if (ready() || attempts > 100) {
            clearInterval(timer);
            resolve();
          }
        }, 50);
      });
    }

    ensureDomAnchors() {
      const render = document.getElementById("pb-canvas-render") || document.querySelector(".pb-render-host");
      if (render && !render.id) render.id = "pb-canvas-render";
      const stage = document.getElementById("pb-builder-stage") || document.querySelector(".pb-stage");
      if (stage && !stage.id) stage.id = "pb-builder-stage";
      const status = document.getElementById("pb-builder-status") || document.querySelector(".pb-status");
      if (status && !status.id) status.id = "pb-builder-status";
      const output = document.getElementById("pb-export-output") || document.querySelector(".pb-export-panel q-editor");
      if (output && !output.id) output.id = "pb-export-output";
    }

    bindStaticEvents() {
      document.addEventListener("dragstart", (event) => this.onDragStart(event));
      document.addEventListener("dragover", (event) => this.onDragOver(event));
      document.addEventListener("dragleave", () => this.clearDropHighlights());
      document.addEventListener("drop", (event) => this.onDrop(event));
      document.addEventListener("click", (event) => this.onClick(event));
      document.addEventListener("contextmenu", (event) => this.onContextMenu(event));
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") this.hideContextMenu();
      });
      window.addEventListener("beforeunload", () => this.persistLastDocument());
    }

    status(message) {
      this.ensureDomAnchors();
      const el = document.getElementById("pb-builder-status");
      if (el) el.textContent = String(message || "Ready");
    }

    async loadPaletteFromDOM() {
      const buttons = Array.from(document.querySelectorAll("q-palette-toolbox-button"));
      const saved = this.readPaletteStorage();
      if (saved.length) {
        this.model.palette = saved;
      }
      for (const button of buttons) {
        button.setAttribute("draggable", "true");
        const createComponent = button.getAttribute("data-pb-create-component") === "true";
        if (createComponent) {
          button.addEventListener("click", () => this.openComponentBuilder());
          continue;
        }
        const name = button.getAttribute("name") || button.getAttribute("title") || "Component";
        const component = button.getAttribute("component") || name.replace(/[^A-Za-z0-9_]/g, "");
        const definitionSource = this.readPaletteSource(button, "qhtml", "qhtml-source") || "q-component " + component + " { div { text { " + name + " } } }";
        const instanceSource = this.readPaletteSource(button, "instance-qhtml", "instance-source") || component + " " + component + "Instance { }";
        const existing = this.model.paletteItem(component);
        if (!existing) {
          const definitionJson = await this.sourceToJSONSafe(definitionSource);
          const instanceJson = await this.sourceToJSONSafe(definitionSource + "\n" + instanceSource);
          this.model.addPaletteItem({
            id: uid("palette"),
            name,
            component,
            definitionSource,
            instanceSource,
            definitionJson,
            instanceJson
          });
        }
        this.decoratePaletteButton(button, component);
      }
      this.renderPaletteDynamicItems();
    }

    readPaletteSource(button, attributeName, childName) {
      const attr = button.getAttribute(attributeName);
      if (attr) return String(attr).trim();
      const child = button.querySelector(childName);
      if (child) return String(child.textContent || "").trim();
      return "";
    }

    decoratePaletteButton(button, component) {
      button.dataset.pbPaletteComponent = component;
      if (!button.querySelector(".pb-palette-edit")) {
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "pb-palette-edit";
        edit.textContent = "✎";
        edit.title = "Edit palette definition";
        edit.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.openPaletteEditor(component);
        });
        button.appendChild(edit);
      }
    }

    renderPaletteDynamicItems() {
      const toolbox = document.querySelector("q-palette-toolbox");
      if (!toolbox) return;
      this.model.palette.forEach((item) => {
        const existing = document.querySelector('q-palette-toolbox-button[data-pb-palette-component="' + cssEscape(item.component) + '"]');
        if (existing) return;
        const button = document.createElement("q-palette-toolbox-button");
        button.setAttribute("name", item.name || item.component);
        button.setAttribute("component", item.component);
        button.setAttribute("draggable", "true");
        button.dataset.pbPaletteComponent = item.component;
        button.innerHTML = '<div class="pb-palette-preview card"><h3>' + this.escapeHTML(item.name || item.component) + '</h3><p>Imported component</p></div>';
        toolbox.appendChild(button);
        this.decoratePaletteButton(button, item.component);
      });
    }

    async sourceToJSONSafe(source) {
      try {
        return await this.converter.sourceToJSON(source);
      } catch (error) {
        console.warn("QHTML source to JSON failed", error);
        return [];
      }
    }

    async renderAll() {
      this.renderPaletteDynamicItems();
      await this.renderCanvas();
      await this.exportToPanel(false);
      this.persistLastDocument();
    }

    async renderCanvas() {
      this.ensureDomAnchors();
      const target = document.getElementById("pb-canvas-render");
      if (!target) return;
      const payload = this.model.qhtmlPayload();
      let html = "";
      try {
        html = await this.converter.jsonToHTML(payload);
      } catch (error) {
        console.warn("JSON to HTML failed", error);
        const qhtml = await this.converter.jsonToQHTML(payload);
        html = await this.converter.sourceToHTML(qhtml);
      }
      target.innerHTML = html || '<div class="pb-empty-drop">Drop palette items here</div>';
      target.querySelectorAll("[data-pb-instance-id]").forEach((element) => {
        element.setAttribute("draggable", "true");
      });
      if (!target.querySelector("[data-pb-instance-id]") && target.textContent.trim() === "") {
        target.innerHTML = '<div class="pb-empty-drop">Drop palette items here</div>';
      }
      this.status("Canvas rendered from JSON");
    }

    async exportToPanel(showStatus) {
      this.ensureDomAnchors();
      const output = document.getElementById("pb-export-output");
      const qhtml = await this.exportQHTML();
      setEditorValue(output, qhtml);
      if (showStatus !== false) this.status("Exported QHTML from JSON");
      return qhtml;
    }

    async exportQHTML() {
      const header = [
        "/*",
        "Page: " + (this.model.pageInfo.name || "Untitled Page"),
        "Author: " + (this.model.pageInfo.author || ""),
        "Canonical: " + (this.model.pageInfo.canonicalUrl || ""),
        "*/"
      ].join("\n");
      const qhtml = await this.converter.jsonToQHTML(this.model.qhtmlPayload());
      return header + "\n" + qhtml;
    }

    onDragStart(event) {
      this.ensureDomAnchors();
      const paletteButton = event.target.closest && event.target.closest("q-palette-toolbox-button");
      if (paletteButton && paletteButton.dataset.pbPaletteComponent) {
        const item = this.model.paletteItem(paletteButton.dataset.pbPaletteComponent);
        if (!item) return;
        this.dragPaletteId = item.id;
        event.dataTransfer.setData("text/qhtml-palette-id", item.id);
        event.dataTransfer.setData("text/plain", item.component);
        event.dataTransfer.effectAllowed = "copy";
        this.status("Dragging " + item.name);
        return;
      }
      const instance = event.target.closest && event.target.closest("[data-pb-instance-id]");
      if (instance) {
        event.dataTransfer.setData("text/qhtml-instance-id", instance.getAttribute("data-pb-instance-id"));
        event.dataTransfer.effectAllowed = "move";
      }
    }

    onDragOver(event) {
      this.ensureDomAnchors();
      const render = document.getElementById("pb-canvas-render");
      if (!render) return;
      const insideCanvas = event.target === render || render.contains(event.target);
      if (!insideCanvas) return;
      event.preventDefault();
      const target = this.dropTargetForEvent(event);
      this.clearDropHighlights();
      if (target && target.element) {
        target.element.classList.add(target.className);
        this.hoverTarget = target;
      }
    }

    async onDrop(event) {
      this.ensureDomAnchors();
      const render = document.getElementById("pb-canvas-render");
      if (!render) return;
      const insideCanvas = event.target === render || render.contains(event.target);
      if (!insideCanvas) return;
      event.preventDefault();
      this.clearDropHighlights();
      const paletteId = event.dataTransfer.getData("text/qhtml-palette-id") || this.dragPaletteId;
      const movingId = event.dataTransfer.getData("text/qhtml-instance-id");
      const target = this.dropTargetForEvent(event);
      if (paletteId) {
        await this.dropPaletteItem(paletteId, target);
      } else if (movingId) {
        await this.moveExistingInstance(movingId, target);
      }
      this.dragPaletteId = "";
    }

    dropTargetForEvent(event) {
      return this.dropTargetForPoint(event.target, event.clientX, event.clientY);
    }

    dropTargetForPoint(startElement, clientX, clientY) {
      this.ensureDomAnchors();
      const render = document.getElementById("pb-canvas-render");
      const targetElement = startElement || (document.elementFromPoint ? document.elementFromPoint(clientX, clientY) : null) || render;
      const instanceElement = targetElement.closest && targetElement.closest("[data-pb-instance-id]");
      if (instanceElement && render.contains(instanceElement)) {
        const rect = instanceElement.getBoundingClientRect();
        const x = rect.width ? (clientX - rect.left) / rect.width : 0.5;
        const y = rect.height ? (clientY - rect.top) / rect.height : 0.5;
        const info = findByInstanceId(this.model.canvas, instanceElement.getAttribute("data-pb-instance-id"));
        const parentKind = info && info.parent ? layoutKind(info.parent) : "";
        if (parentKind === "row") {
          if (x < 0.25) return { mode: "before", className: "pb-drop-highlight-before", element: instanceElement, instanceId: instanceElement.getAttribute("data-pb-instance-id") };
          if (x > 0.75) return { mode: "after", className: "pb-drop-highlight-after", element: instanceElement, instanceId: instanceElement.getAttribute("data-pb-instance-id") };
        }
        if (parentKind === "col") {
          if (y < 0.25) return { mode: "before", className: "pb-drop-highlight-top", element: instanceElement, instanceId: instanceElement.getAttribute("data-pb-instance-id") };
          if (y > 0.75) return { mode: "after", className: "pb-drop-highlight-bottom", element: instanceElement, instanceId: instanceElement.getAttribute("data-pb-instance-id") };
        }
        return { mode: "center", className: "pb-drop-highlight-center", element: instanceElement, instanceId: instanceElement.getAttribute("data-pb-instance-id") };
      }
      const layoutElement = targetElement.closest && targetElement.closest("q-layout, q-row, q-col, [qhtml-layout], [data-pb-slot]");
      if (layoutElement && render.contains(layoutElement)) {
        return { mode: "append", className: "pb-drop-highlight-center", element: layoutElement, slotName: layoutElement.getAttribute("data-pb-slot") || "canvas" };
      }
      return { mode: "append", className: "pb-drop-highlight-center", element: render, slotName: "canvas" };
    }

    dropPaletteComponentAtPoint(component, clientX, clientY) {
      this.ensureDomAnchors();
      const render = document.getElementById("pb-canvas-render");
      const targetElement = document.elementFromPoint ? document.elementFromPoint(clientX, clientY) : render;
      if (!render || !(targetElement === render || render.contains(targetElement))) return false;
      const item = this.model.paletteItem(component);
      if (!item) return false;
      const target = this.dropTargetForPoint(targetElement, clientX, clientY);
      this.dropPaletteItem(item.id, target).catch((error) => {
        console.error("Page-builder palette drop failed", error);
        this.status(error.message || String(error));
      });
      return true;
    }

    clearDropHighlights() {
      document.querySelectorAll(".pb-drop-highlight-before,.pb-drop-highlight-after,.pb-drop-highlight-top,.pb-drop-highlight-bottom,.pb-drop-highlight-center").forEach((element) => {
        element.classList.remove("pb-drop-highlight-before", "pb-drop-highlight-after", "pb-drop-highlight-top", "pb-drop-highlight-bottom", "pb-drop-highlight-center");
      });
      this.hoverTarget = null;
    }

    async dropPaletteItem(paletteId, target) {
      const item = this.model.paletteItem(paletteId);
      if (!item) return;
      const instance = await this.instanceFromPaletteItem(item);
      if (!instance) return;
      if (target && target.mode === "center" && target.instanceId) {
        this.model.pendingDrop = { itemId: paletteId, instance, target };
        const summary = document.getElementById("pb-drop-dialog-summary");
        if (summary) summary.textContent = "Drop " + item.name + " onto the selected component.";
        openDialog("pb-drop-dialog");
        return;
      }
      this.insertInstance(instance, target || { mode: "append" });
      this.model.usedDefinitions.set(item.component, true);
      await this.renderAll();
    }

    async instanceFromPaletteItem(item) {
      const instanceJson = item.instanceJson && item.instanceJson.length ? clone(item.instanceJson) : await this.sourceToJSONSafe((item.definitionSource || "") + "\n" + (item.instanceSource || ""));
      let instance = firstByType(instanceJson, isInstance);
      if (!instance) {
        const parsed = await this.sourceToJSONSafe(item.instanceSource || item.component + " " + item.component + "Instance { }");
        instance = firstByType(parsed, isInstance) || parsed[0];
      }
      if (!instance) return null;
      instance = clone(instance);
      const id = uid("inst");
      if (!qName(instance)) instance.qhtmlName = item.component + "Instance";
      instance.qhtmlComponentName = instance.qhtmlComponentName || item.component;
      setNodeAttribute(instance, "data-pb-instance-id", id);
      setNodeAttribute(instance, "data-pb-component", item.component);
      return instance;
    }

    insertInstance(instance, target) {
      const mode = target && target.mode ? target.mode : "append";
      const targetInfo = target && target.instanceId ? findByInstanceId(this.model.canvas, target.instanceId) : null;
      if ((mode === "before" || mode === "after") && targetInfo && targetInfo.parent) {
        const siblings = childrenOf(targetInfo.parent);
        const offset = mode === "after" ? 1 : 0;
        siblings.splice(targetInfo.index + offset, 0, instance);
        return;
      }
      if (mode === "replace" && targetInfo && targetInfo.parent) {
        childrenOf(targetInfo.parent).splice(targetInfo.index, 1, instance);
        return;
      }
      if (mode === "slot" && targetInfo) {
        childrenOf(targetInfo.node).push(instance);
        return;
      }
      const container = this.appendContainer(target && target.slotName);
      removeEmptyDrop(container);
      childrenOf(container).push(instance);
    }

    appendContainer(slotName) {
      if (slotName) {
        const slotNode = firstByType(this.model.canvas, (node) => attrsOf(node)["data-pb-slot"] === slotName || propsOf(node)["data-pb-slot"] === slotName);
        if (slotNode) {
          if (qType(slotNode) === "QHTMLLayout") {
            const col = firstByType([slotNode], (node) => qType(node) === "QHTMLColumnLayout");
            return col || slotNode;
          }
          return slotNode;
        }
      }
      const col = firstByType(this.model.canvas, (node) => qType(node) === "QHTMLColumnLayout");
      return col || this.model.canvas[0];
    }

    async moveExistingInstance(instanceId, target) {
      const info = findByInstanceId(this.model.canvas, instanceId);
      if (!info || !info.parent) return;
      const node = clone(info.node);
      childrenOf(info.parent).splice(info.index, 1);
      this.insertInstance(node, target || { mode: "append" });
      await this.renderAll();
    }

    async applyPendingDrop(action) {
      const pending = this.model.pendingDrop;
      if (!pending) return;
      this.insertInstance(pending.instance, { mode: action, instanceId: pending.target.instanceId });
      const item = this.model.paletteItem(pending.itemId);
      if (item) this.model.usedDefinitions.set(item.component, true);
      this.model.pendingDrop = null;
      closeDialog("pb-drop-dialog");
      await this.renderAll();
    }

    cancelPendingDrop() {
      this.model.pendingDrop = null;
      closeDialog("pb-drop-dialog");
    }

    onClick(event) {
      const edit = event.target.closest && event.target.closest("[data-pb-instance-id]");
      if (edit && document.getElementById("pb-canvas-render") && document.getElementById("pb-canvas-render").contains(edit)) {
        if (event.detail >= 2) this.openInstanceEditor(edit.getAttribute("data-pb-instance-id"));
      }
      if (!event.target.closest || !event.target.closest("#pb-canvas-context-menu")) this.hideContextMenu();
    }

    onContextMenu(event) {
      const render = document.getElementById("pb-canvas-render");
      if (!render || !(event.target === render || render.contains(event.target))) return;
      event.preventDefault();
      const instance = event.target.closest("[data-pb-instance-id]");
      this.contextTargetId = instance ? instance.getAttribute("data-pb-instance-id") : "";
      this.showContextMenu(event.clientX, event.clientY);
    }

    showContextMenu(x, y) {
      let menu = document.getElementById("pb-canvas-context-menu");
      if (!menu) {
        menu = document.createElement("div");
        menu.id = "pb-canvas-context-menu";
        menu.className = "pb-context-menu";
        document.body.appendChild(menu);
      }
      menu.innerHTML = "";
      [
        ["Edit Instance", () => this.openInstanceEditor(this.contextTargetId)],
        ["Wrap in Layout", () => this.wrapContextTarget()],
        ["Unwrap Layout", () => this.unwrapContextTargetLayout()],
        ["Add Row", () => this.addLayoutChild("row")],
        ["Add Column", () => this.addLayoutChild("col")],
        ["Set Row Count", () => this.setLayoutProperty("rows")],
        ["Set Column Count", () => this.setLayoutProperty("cols")],
        ["Set Width", () => this.setLayoutProperty("width")],
        ["Set Height", () => this.setLayoutProperty("height")],
        ["More: backgroundColor", () => this.setLayoutProperty("backgroundColor")],
        ["More: paddingLeft", () => this.setLayoutProperty("paddingLeft")],
        ["More: x", () => this.setLayoutProperty("x")],
        ["More: y", () => this.setLayoutProperty("y")]
      ].forEach(([label, handler]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.addEventListener("click", async () => {
          this.hideContextMenu();
          await handler();
        });
        menu.appendChild(button);
      });
      menu.style.left = Math.min(x, window.innerWidth - 240) + "px";
      menu.style.top = Math.min(y, window.innerHeight - 360) + "px";
      menu.style.display = "block";
    }

    hideContextMenu() {
      const menu = document.getElementById("pb-canvas-context-menu");
      if (menu) menu.style.display = "none";
    }

    contextInfo() {
      if (this.contextTargetId) return findByInstanceId(this.model.canvas, this.contextTargetId);
      return { node: this.model.canvas[0], parent: null, index: 0 };
    }

    async wrapContextTarget() {
      const info = this.contextInfo();
      if (!info || !info.node || !info.parent) return;
      const wrapped = makeLayout("layout", { width: "100%", gap: "12px" }, [makeLayout("row", {}, [makeLayout("col", {}, [info.node])])]);
      childrenOf(info.parent).splice(info.index, 1, wrapped);
      await this.renderAll();
    }

    async unwrapContextTargetLayout() {
      const info = this.contextInfo();
      if (!info || !info.node || !info.parent) return;
      let layout = info.parent;
      let layoutParent = findNodePath(this.model.canvas, (node) => node === layout);
      if (!isLayout(layout)) return;
      const replacement = [];
      walk(childrenOf(layout), (node) => {
        if (!isLayout(node)) replacement.push(node);
      });
      if (layoutParent && layoutParent.parent) {
        childrenOf(layoutParent.parent).splice(layoutParent.index, 1, ...replacement);
      }
      await this.renderAll();
    }

    async addLayoutChild(kind) {
      const info = this.contextInfo();
      const node = info && info.node ? info.node : this.model.canvas[0];
      const target = isLayout(node) ? node : (info && info.parent ? info.parent : this.model.canvas[0]);
      childrenOf(target).push(makeLayout(kind, kind === "row" ? { height: "auto" } : { width: "auto" }, []));
      await this.renderAll();
    }

    async setLayoutProperty(name) {
      const info = this.contextInfo();
      let target = info && info.node ? info.node : this.model.canvas[0];
      if (!isLayout(target) && info && info.parent) target = info.parent;
      const current = attrsOf(target)[name] || propsOf(target)[name] || "";
      const value = prompt("Set " + name, current);
      if (value == null) return;
      setNodeAttribute(target, name, value);
      await this.renderAll();
    }

    togglePalette() {
      document.body.classList.toggle("pb-sidebar-collapsed");
    }

    async clearCanvas() {
      if (!confirm("Clear the current canvas JSON?")) return;
      this.model.canvas = makeDefaultCanvasJson();
      this.model.usedDefinitions = new Map();
      await this.renderAll();
      this.status("Canvas cleared");
    }

    newLayoutFile() {
      this.model.pageInfo = { name: "Untitled Page", author: "", canonicalUrl: "" };
      this.model.canvas = makeDefaultCanvasJson();
      this.model.usedDefinitions = new Map();
      this.renderAll();
    }

    async saveLayout() {
      const name = prompt("Save page as", this.model.pageInfo.name || "Untitled Page");
      if (!name) return;
      this.model.pageInfo.name = name;
      this.files["/" + name + ".json"] = this.model.documentJSON();
      this.writeFiles();
      downloadText(name.replace(/[^A-Za-z0-9_-]+/g, "-") + ".page-builder.json", serializePretty(this.model.documentJSON()), "application/json;charset=utf-8");
      this.status("Saved " + name);
    }

    async loadLayout() {
      const text = await readFileText(".json,.qhtml,.txt");
      if (!text.trim()) {
        this.openFileDialog();
        return;
      }
      if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          this.model.canvas = json;
        } else {
          this.model.loadDocument(json);
        }
      } else {
        const json = await this.converter.sourceToJSON(text);
        this.model.canvas = json.filter((node) => !isDefinition(node));
        json.filter(isDefinition).forEach((definition) => {
          const component = qName(definition);
          this.model.addPaletteItem({ id: uid("palette"), name: component, component, definitionSource: definition.qhtmlSource || "", instanceSource: component + " " + component + "Instance { }", definitionJson: [definition], instanceJson: [] });
        });
      }
      await this.renderAll();
      this.status("Loaded file");
    }

    openFileDialog() {
      this.renderFileTree("pb-file-tree", false);
      openDialog("pb-file-dialog");
    }

    closeFileDialog() { closeDialog("pb-file-dialog"); }
    openFileManager() { this.renderFileTree("pb-file-manager-tree", true); openDialog("pb-file-manager"); }
    closeFileManager() { closeDialog("pb-file-manager"); }
    closeFolderPicker() { closeDialog("pb-folder-picker"); }
    confirmFolderPicker() { closeDialog("pb-folder-picker"); }
    newFileFolder() { this.status("Folder placeholders are represented by path prefixes in localStorage."); }
    newFile() { this.newLayoutFile(); }

    readFiles() {
      try { return JSON.parse(localStorage.getItem(FILE_KEY) || "{}"); } catch (error) { return {}; }
    }

    writeFiles() {
      localStorage.setItem(FILE_KEY, JSON.stringify(this.files));
    }

    renderFileTree(id, manage) {
      const tree = document.getElementById(id);
      if (!tree) return;
      const keys = Object.keys(this.files).sort();
      tree.innerHTML = keys.length ? "" : '<p>No saved files yet.</p>';
      keys.forEach((path) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "pb-action secondary";
        row.style.margin = "4px";
        row.textContent = path;
        row.addEventListener("click", async () => {
          this.model.loadDocument(this.files[path]);
          this.model.selectedFilePath = path;
          const selected = document.getElementById(manage ? "pb-file-manager-selected" : "pb-file-selected");
          if (selected) selected.textContent = path;
          if (!manage) {
            closeDialog("pb-file-dialog");
            await this.renderAll();
          }
        });
        tree.appendChild(row);
      });
    }

    renameManagedFile() {
      const oldPath = this.model.selectedFilePath;
      if (!this.files[oldPath]) return;
      const next = prompt("Rename file", oldPath.replace(/^\//, ""));
      if (!next) return;
      const newPath = next.startsWith("/") ? next : "/" + next;
      this.files[newPath] = this.files[oldPath];
      delete this.files[oldPath];
      this.writeFiles();
      this.renderFileTree("pb-file-manager-tree", true);
    }

    moveManagedFile() { this.renameManagedFile(); }

    deleteManagedFile() {
      const path = this.model.selectedFilePath;
      if (!this.files[path]) return;
      if (!confirm("Delete " + path + "?")) return;
      delete this.files[path];
      this.writeFiles();
      this.renderFileTree("pb-file-manager-tree", true);
    }

    persistLastDocument() {
      try { localStorage.setItem(LAST_KEY, JSON.stringify(this.model.documentJSON())); } catch (error) {}
    }

    loadLastDocument() {
      try {
        const text = localStorage.getItem(LAST_KEY);
        if (text) this.model.loadDocument(JSON.parse(text));
      } catch (error) {}
    }

    readPaletteStorage() {
      try { return JSON.parse(localStorage.getItem(PALETTE_KEY) || "[]"); } catch (error) { return []; }
    }

    writePaletteStorage() {
      localStorage.setItem(PALETTE_KEY, JSON.stringify(this.model.palette));
    }

    savePalette() {
      this.writePaletteStorage();
      downloadText("qhtml7-palette.json", serializePretty(this.model.palette), "application/json;charset=utf-8");
      this.status("Palette saved");
    }

    async loadPalette() {
      const text = await readFileText(".json,.qhtml,.txt");
      if (!text.trim()) return;
      if (text.trim().startsWith("[")) {
        this.model.palette = JSON.parse(text);
      } else {
        await this.importPaletteQHTML(text);
      }
      this.writePaletteStorage();
      this.renderPaletteDynamicItems();
      this.status("Palette loaded");
    }

    async importPaletteItem() {
      const source = prompt("Paste a q-component definition or leave blank to load a file", "");
      let text = source || "";
      if (!text.trim()) text = await readFileText(".qhtml,.txt");
      if (!text.trim()) return;
      await this.importPaletteQHTML(text);
      this.writePaletteStorage();
      this.renderPaletteDynamicItems();
      this.status("Palette item imported");
    }

    async importPaletteQHTML(source) {
      const json = await this.converter.sourceToJSON(source);
      const definitions = json.filter(isDefinition);
      if (!definitions.length) throw new Error("No q-component definition found");
      definitions.forEach((definition) => {
        const component = qName(definition);
        this.model.addPaletteItem({
          id: uid("palette"),
          name: component,
          component,
          definitionSource: definition.qhtmlSource || source,
          instanceSource: component + " " + component + "Instance { }",
          definitionJson: [definition],
          instanceJson: []
        });
      });
    }

    openComponentBuilder() {
      setEditorValue(document.getElementById("pb-component-builder-definition"), "q-component myComponent {\n  div { text { New component } }\n}");
      setEditorValue(document.getElementById("pb-component-builder-instance"), "myComponent myComponentInstance { }");
      const name = document.getElementById("pb-component-builder-name");
      if (name) name.value = "myComponent";
      openDialog("pb-component-builder");
    }

    closeComponentBuilder() { closeDialog("pb-component-builder"); }

    async createComponentBuilderItem() {
      const definitionSource = editorValue(document.getElementById("pb-component-builder-definition"));
      const instanceSource = editorValue(document.getElementById("pb-component-builder-instance"));
      const error = document.getElementById("pb-component-builder-error");
      try {
        const definitionJson = await this.converter.sourceToJSON(definitionSource);
        const definition = definitionJson.find(isDefinition);
        if (!definition) throw new Error("Definition source must contain q-component.");
        const component = qName(definition);
        const instanceJson = await this.converter.sourceToJSON(definitionSource + "\n" + (instanceSource || component + " " + component + "Instance { }"));
        this.model.addPaletteItem({ id: uid("palette"), name: component, component, definitionSource, instanceSource, definitionJson, instanceJson });
        this.writePaletteStorage();
        this.renderPaletteDynamicItems();
        if (error) error.textContent = "";
        closeDialog("pb-component-builder");
      } catch (err) {
        if (error) error.textContent = err.message || String(err);
      }
    }

    openPaletteEditor(component) {
      const item = this.model.paletteItem(component);
      if (!item) return;
      const hidden = document.getElementById("pb-palette-editor-component");
      if (hidden) hidden.value = item.component;
      setEditorValue(document.getElementById("pb-palette-editor-source"), item.definitionSource || "");
      setEditorValue(document.getElementById("pb-palette-editor-instance-source"), item.instanceSource || "");
      openDialog("pb-palette-editor");
    }

    closePaletteEditor() { closeDialog("pb-palette-editor"); }

    async savePaletteEdit() {
      const component = document.getElementById("pb-palette-editor-component").value;
      const item = this.model.paletteItem(component);
      if (!item) return;
      const definitionSource = editorValue(document.getElementById("pb-palette-editor-source"));
      const instanceSource = editorValue(document.getElementById("pb-palette-editor-instance-source"));
      const error = document.getElementById("pb-palette-editor-error");
      try {
        const definitionJson = await this.converter.sourceToJSON(definitionSource);
        const definition = definitionJson.find(isDefinition);
        if (!definition) throw new Error("Source must contain q-component.");
        const nextComponent = qName(definition);
        const instanceJson = await this.converter.sourceToJSON(definitionSource + "\n" + (instanceSource || nextComponent + " " + nextComponent + "Instance { }"));
        Object.assign(item, { component: nextComponent, name: nextComponent, definitionSource, instanceSource, definitionJson, instanceJson });
        this.writePaletteStorage();
        if (error) error.textContent = "";
        closeDialog("pb-palette-editor");
        await this.renderAll();
      } catch (err) {
        if (error) error.textContent = err.message || String(err);
      }
    }

    openInstanceEditor(instanceId) {
      const id = instanceId || this.model.selectedInstanceId;
      if (!id) return;
      const info = findByInstanceId(this.model.canvas, id);
      if (!info) return;
      this.model.selectedInstanceId = id;
      const select = document.getElementById("pb-instance-editor-instance");
      if (select) {
        select.innerHTML = "";
        walk(this.model.canvas, (node) => {
          const nodeId = attrsOf(node)["data-pb-instance-id"];
          if (!nodeId) return;
          const option = document.createElement("option");
          option.value = nodeId;
          option.textContent = qName(node) || node.qhtmlComponentName || nodeId;
          if (nodeId === id) option.selected = true;
          select.appendChild(option);
        });
      }
      this.populateSlotSelect(info.node);
      this.converter.jsonToQHTML([info.node]).then((source) => {
        setEditorValue(document.getElementById("pb-instance-editor-source"), source);
      });
      openDialog("pb-instance-editor");
    }

    populateSlotSelect(node) {
      const select = document.getElementById("pb-instance-editor-slot");
      if (!select) return;
      select.innerHTML = "";
      const root = document.createElement("option");
      root.value = "";
      root.textContent = "Whole instance";
      select.appendChild(root);
      walk([node], (child) => {
        const slot = attrsOf(child)["data-pb-slot"] || propsOf(child)["data-pb-slot"];
        if (!slot) return;
        const option = document.createElement("option");
        option.value = slot;
        option.textContent = slot;
        select.appendChild(option);
      });
    }

    closeInstanceEditor() { closeDialog("pb-instance-editor"); }
    selectInstanceEditTarget(id) { this.openInstanceEditor(id); }
    selectInstanceEditSlot() {}

    async saveInstanceEdit() {
      const id = this.model.selectedInstanceId;
      const info = findByInstanceId(this.model.canvas, id);
      if (!info || !info.parent) return;
      const error = document.getElementById("pb-instance-editor-error");
      try {
        const source = editorValue(document.getElementById("pb-instance-editor-source"));
        const json = await this.converter.sourceToJSON(source);
        const next = firstByType(json, isInstance) || json[0];
        if (!next) throw new Error("No QHTML node parsed from editor source.");
        setNodeAttribute(next, "data-pb-instance-id", id);
        if (info.node.qhtmlComponentName && !next.qhtmlComponentName) next.qhtmlComponentName = info.node.qhtmlComponentName;
        childrenOf(info.parent).splice(info.index, 1, next);
        if (error) error.textContent = "";
        closeDialog("pb-instance-editor");
        await this.renderAll();
      } catch (err) {
        if (error) error.textContent = err.message || String(err);
      }
    }

    editPageInfo() {
      const info = this.model.pageInfo;
      const name = document.getElementById("pb-page-info-name");
      const author = document.getElementById("pb-page-info-author");
      const canonical = document.getElementById("pb-page-info-canonical");
      if (name) name.value = info.name || "";
      if (author) author.value = info.author || "";
      if (canonical) canonical.value = info.canonicalUrl || "";
      openDialog("pb-page-info-dialog");
    }

    closePageInfo() { closeDialog("pb-page-info-dialog"); }

    async savePageInfo() {
      this.model.pageInfo = {
        name: (document.getElementById("pb-page-info-name") || {}).value || "Untitled Page",
        author: (document.getElementById("pb-page-info-author") || {}).value || "",
        canonicalUrl: (document.getElementById("pb-page-info-canonical") || {}).value || ""
      };
      closeDialog("pb-page-info-dialog");
      await this.renderAll();
    }

    openJsonInspector() {
      setEditorValue(document.getElementById("pb-json-inspector-source"), serializePretty(this.model.documentJSON()));
      openDialog("pb-json-dialog");
    }

    closeJsonInspector() { closeDialog("pb-json-dialog"); }

    async applyJsonInspector() {
      const error = document.getElementById("pb-json-inspector-error");
      try {
        const json = JSON.parse(editorValue(document.getElementById("pb-json-inspector-source")));
        this.model.loadDocument(json);
        if (error) error.textContent = "";
        closeDialog("pb-json-dialog");
        await this.renderAll();
      } catch (err) {
        if (error) error.textContent = err.message || String(err);
      }
    }

    registerProxy() {}
    switchComponentBuilderTab() {}
    updateComponentBuilderGeneral() {}
    insertComponentBuilderSnippet() {}
    indentComponentBuilderEditor() {}
    outdentComponentBuilderEditor() {}
    openComponentBuilderAnimationTool() {}

    escapeHTML(value) {
      return String(value || "").replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
    }
  }

  const controller = new PageBuilderController();
  window.QPageBuilder = controller;

  function maybeInit(event) {
    const host = document.getElementById("page-builder-host");
    if (!host) return;
    if (event && event.target !== host) return;
    controller.init(host).catch((error) => {
      console.error("QHTML Page Builder init failed", error);
      controller.status(error.message || String(error));
    });
  }

  document.addEventListener("QHTMLReady", maybeInit);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(maybeInit, 0), { once: true });
  } else {
    setTimeout(maybeInit, 0);
  }
})();
