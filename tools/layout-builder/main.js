(() => {
  "use strict";

  function ensureLayoutBuilderChrome() {
    if (document.getElementById("lbMenu") &&
        document.getElementById("lbEditorDialog") &&
        document.getElementById("lbPropertiesDialog") &&
        document.getElementById("lbDropChoiceDialog") &&
        document.getElementById("lbReplaceChildrenDialog")) {
      return;
    }
    const template = document.createElement("template");
    template.innerHTML = `<style id="lbRuntimeChromeStyle">
    dialog.lb-drop-dialog {
      width: min(360px, calc(100vw - 32px));
    }

    .lb-drop-dialog .lb-dialog-body {
      padding: 14px 16px 4px;
    }

    .lb-drop-copy {
      margin: 0;
      color: #475569;
      font-size: 14px;
      line-height: 1.45;
    }

    .lb-drop-actions {
      justify-content: center;
      padding-top: 12px;
    }

    .lb-button.danger {
      border-color: #fecaca;
      color: #b91c1c;
    }

    .lb-menu-item:disabled {
      color: #94a3b8;
      cursor: not-allowed;
      background: transparent;
    }
  </style>

  <input id="lbOpenFile" type="file" accept=".qhtml,.txt,text/plain" hidden>

  <div id="lbMenu" class="lb-context-menu" hidden>
    <button class="lb-menu-item" type="button" data-menu-open="add">Add... <span class="lb-chevron">&rsaquo;</span></button>
    <button class="lb-menu-item" type="button" data-action="edit">Edit...</button>
    <button class="lb-menu-item" type="button" data-action="properties">Properties...</button>
    <div class="lb-menu-separator"></div>
    <button class="lb-menu-item lb-danger" type="button" data-action="delete">Delete...</button>
  </div>

  <div id="lbAddMenu" class="lb-submenu" hidden>
    <button class="lb-menu-item" type="button" data-placement-kind="q-row">Row... <span class="lb-chevron">&rsaquo;</span></button>
    <button class="lb-menu-item" type="button" data-placement-kind="q-col">Column... <span class="lb-chevron">&rsaquo;</span></button>
    <button class="lb-menu-item" type="button" data-placement-kind="q-layout">Layout... <span class="lb-chevron">&rsaquo;</span></button>
    <div class="lb-menu-separator"></div>
    <button class="lb-menu-item" type="button" data-action="add-qhtml">QHTML</button>
  </div>

  <div id="lbPlacementMenu" class="lb-submenu" hidden>
    <button class="lb-menu-item" type="button" data-placement="before">Before</button>
    <button class="lb-menu-item" type="button" data-placement="after">After</button>
    <button class="lb-menu-item" type="button" data-placement="child">as Child</button>
    <div class="lb-menu-separator"></div>
    <button class="lb-menu-item" type="button" data-placement="replace">Replace</button>
  </div>

  <dialog id="lbEditorDialog" class="lb-dialog">
    <div class="lb-dialog-header">
      <h2 id="lbEditorTitle" class="lb-dialog-title">Edit QHTML</h2>
      <button id="lbEditorClose" class="lb-button" type="button">Close</button>
    </div>
    <div class="lb-dialog-body">
      <q-editor id="lbEditor" auto-format="1"></q-editor>
    </div>
    <div class="lb-dialog-actions">
      <button id="lbEditorCancel" class="lb-button" type="button">Cancel</button>
      <button id="lbEditorSave" class="lb-button primary" type="button">Save</button>
    </div>
  </dialog>

  <dialog id="lbPropertiesDialog" class="lb-dialog">
    <div class="lb-dialog-header">
      <h2 class="lb-dialog-title">Layout Properties</h2>
      <button id="lbPropertiesClose" class="lb-button" type="button">Close</button>
    </div>
    <div class="lb-dialog-body">
      <div class="lb-form-grid">
        <div class="lb-field">
          <label for="lbPropType">Type</label>
          <select id="lbPropType">
            <option value="q-layout">q-layout</option>
            <option value="q-row">q-row</option>
            <option value="q-col">q-col</option>
          </select>
        </div>
        <div class="lb-field">
          <label for="lbPropName">Name</label>
          <input id="lbPropName" type="text" placeholder="optionalName">
        </div>
        <div class="lb-field">
          <label for="lbPropWidth">Width / Basis</label>
          <input id="lbPropWidth" type="text" placeholder="inherit">
        </div>
        <div class="lb-field">
          <label for="lbPropHeight">Height</label>
          <input id="lbPropHeight" type="text" placeholder="inherit">
        </div>
        <div class="lb-field">
          <label for="lbPropFlex">Flex</label>
          <input id="lbPropFlex" type="text" placeholder="inherit">
        </div>
        <div class="lb-field">
          <label for="lbPropGap">Gap</label>
          <input id="lbPropGap" type="text" placeholder="inherit">
        </div>
        <div class="lb-field">
          <label for="lbPropMinWidth">Min Width</label>
          <input id="lbPropMinWidth" type="text" placeholder="inherit">
        </div>
        <div class="lb-field">
          <label for="lbPropMinColWidth">Min Column Width</label>
          <input id="lbPropMinColWidth" type="text" placeholder="inherit">
        </div>
        <div class="lb-field">
          <label for="lbPropWrap">Wrap</label>
          <select id="lbPropWrap">
            <option value="">inherit</option>
            <option value="wrap">wrap</option>
            <option value="nowrap">nowrap</option>
            <option value="wrap-reverse">wrap-reverse</option>
          </select>
        </div>
      </div>
    </div>
    <div class="lb-dialog-actions">
      <button id="lbPropertiesCancel" class="lb-button" type="button">Cancel</button>
      <button id="lbPropertiesSave" class="lb-button primary" type="button">Save</button>
    </div>
  </dialog>

  <dialog id="lbDropChoiceDialog" class="lb-dialog lb-drop-dialog">
    <div class="lb-dialog-header">
      <h2 class="lb-dialog-title">Drop Action</h2>
    </div>
    <div class="lb-dialog-body">
      <p class="lb-drop-copy">Choose what should happen to the item under the cursor.</p>
    </div>
    <div class="lb-dialog-actions lb-drop-actions">
      <button class="lb-button" type="button" data-drop-action="swap">Swap</button>
      <button class="lb-button primary" type="button" data-drop-action="replace">Replace</button>
      <button class="lb-button" type="button" data-drop-action="cancel">Cancel</button>
    </div>
  </dialog>

  <dialog id="lbReplaceChildrenDialog" class="lb-dialog lb-drop-dialog">
    <div class="lb-dialog-header">
      <h2 class="lb-dialog-title">Replace Target</h2>
    </div>
    <div class="lb-dialog-body">
      <p class="lb-drop-copy">The target has child items. Choose what should happen to them.</p>
    </div>
    <div class="lb-dialog-actions lb-drop-actions">
      <button class="lb-button primary" type="button" data-children-action="move">Move Children</button>
      <button class="lb-button danger" type="button" data-children-action="delete">Delete Children</button>
      <button class="lb-button" type="button" data-children-action="cancel">Cancel</button>
    </div>
  </dialog>`;
    document.body.appendChild(template.content.cloneNode(true));
  }

  let root = null;
  let previewHost = null;
  let activeId = "";
  let menuTargetId = "";
  let pendingPlacementKind = "";
  let editorMode = "";
  let editorTargetId = "";
  let editorOriginal = "";
  let nodeCounter = 0;
  let interaction = null;
  let dropTargetId = "";
  let menuFrozen = false;
  const scopedImports = [];

  const DEFAULT_QHTML = 'div { padding: "18px"; text { Edit this QHTML content. } }';
  const menus = [];
  const EDGE_MIN = 8;
  const EDGE_MAX = 22;
  const EDGE_RATIO = 0.1;
  const DRAG_DISTANCE = 5;
  const DEFAULT_LAYOUT_VALUE = "inherit";
  const EDITABLE_LAYOUT_PROPS = [
    "width",
    "height",
    "flex",
    "gap",
    "minWidth",
    "minColWidth",
    "wrap"
  ];

  function nextId() {
    nodeCounter += 1;
    return "lb-node-" + Date.now().toString(36) + "-" + nodeCounter.toString(36);
  }

  function createNode(type, children, options) {
    const opts = options || {};
    const nodeChildren = Array.isArray(children) ? children.slice() : [];
    if (opts.label !== false && (type === "q-row" || type === "q-col")) {
      const label = {
        id: nextId(),
        type: "qhtml",
        name: "",
        props: {},
        source: type === "q-row" ? "text { row }" : "text { col }",
        children: []
      };
      nodeChildren.unshift(label);
    }
    return {
      id: nextId(),
      type: type,
      name: "",
      props: defaultPropsFor(type),
      source: type === "qhtml" ? DEFAULT_QHTML : "",
      children: nodeChildren
    };
  }

  function defaultPropsFor(type) {
    if (type === "q-layout") {
      return defaultLayoutProps();
    }
    if (type === "q-row") {
      return defaultLayoutProps();
    }
    if (type === "q-col") {
      return defaultLayoutProps();
    }
    return {};
  }

  function defaultLayoutProps() {
    return EDITABLE_LAYOUT_PROPS.reduce((props, key) => {
      props[key] = DEFAULT_LAYOUT_VALUE;
      return props;
    }, {});
  }

  function isLayoutType(type) {
    return type === "q-layout" || type === "q-row" || type === "q-col";
  }

  function normalizedPropsFor(type, props) {
    const next = Object.assign({}, props || {});
    if (!isLayoutType(type)) {
      Object.keys(next).forEach((key) => {
        if (!String(next[key] || "").trim()) {
          delete next[key];
        }
      });
      return next;
    }

    const aliases = {
      "min-width": "minWidth",
      "min-col-width": "minColWidth",
      "flex-wrap": "wrap",
      flexWrap: "wrap"
    };
    Object.keys(aliases).forEach((alias) => {
      const canonical = aliases[alias];
      if (Object.prototype.hasOwnProperty.call(next, alias)) {
        if (!String(next[canonical] || "").trim() || next[canonical] === DEFAULT_LAYOUT_VALUE) {
          next[canonical] = String(next[alias] || "").trim() || DEFAULT_LAYOUT_VALUE;
        }
        delete next[alias];
      }
    });

    EDITABLE_LAYOUT_PROPS.forEach((key) => {
      if (!String(next[key] || "").trim()) {
        next[key] = DEFAULT_LAYOUT_VALUE;
      }
    });
    Object.keys(next).forEach((key) => {
      if (!String(next[key] || "").trim()) {
        next[key] = DEFAULT_LAYOUT_VALUE;
      }
    });

    const ordered = {};
    EDITABLE_LAYOUT_PROPS.forEach((key) => {
      ordered[key] = next[key];
    });
    Object.keys(next).forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(ordered, key)) {
        ordered[key] = next[key];
      }
    });
    return ordered;
  }

  function normalizeTree(node) {
    if (!node) {
      return null;
    }
    if (node.type !== "qhtml") {
      node.props = normalizedPropsFor(node.type, node.props);
    }
    node.children = (node.children || []).map(normalizeTree).filter(Boolean);
    return node;
  }

  function buildDefaultTree() {
    return createNode("q-layout", [
      createNode("q-row", [
        createNode("q-col", [
          createNode("qhtml", [])
        ])
      ])
    ]);
  }

  function escapeQhtmlString(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function indent(level) {
    return "  ".repeat(level);
  }

  function nodeHeader(node) {
    return node.name ? node.type + " " + node.name : node.type;
  }

  function propsToQHTML(node, level) {
    const lines = [];
    const props = normalizedPropsFor(node.type, node.props);
    const orderedKeys = [
      "width",
      "height",
      "flex",
      "gap",
      "minWidth",
      "minColWidth",
      "wrap"
    ];
    const keys = orderedKeys.concat(Object.keys(props).filter((key) => !orderedKeys.includes(key)).sort());
    keys.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(props, key)) {
        return;
      }
      const value = String(props[key] || "").trim();
      if (value) {
        lines.push(indent(level) + key + ': "' + escapeQhtmlString(value) + '"');
      }
    });
    lines.push(indent(level) + 'data-layout-id: "' + escapeQhtmlString(node.id) + '"');
    return lines.join("\n");
  }

  function modelToQHTML(node, level) {
    normalizeTree(node);
    const depth = Number(level) || 0;
    if (node.type === "qhtml") {
      return String(node.source || "").split("\n").map((line) => indent(depth) + line).join("\n");
    }

    const lines = [indent(depth) + nodeHeader(node) + " {"];
    const propText = propsToQHTML(node, depth + 1);
    if (propText) {
      lines.push(propText);
    }
    node.children.forEach((child) => {
      const childText = modelToQHTML(child, depth + 1);
      if (childText.trim()) {
        lines.push(childText);
      }
    });
    lines.push(indent(depth) + "}");
    return lines.join("\n");
  }

  function addScopedImport(path) {
    const value = String(path || "").trim();
    if (value && !scopedImports.includes(value)) {
      scopedImports.push(value);
    }
  }

  function sourceWithScopedImports(source) {
    const body = String(source || "");
    if (!scopedImports.length) {
      return body;
    }
    return scopedImports.map((path) => "q-import { " + path + " }").join("\n") + "\n\n" + body;
  }

  function currentSource() {
    return sourceWithScopedImports(modelToQHTML(root, 0));
  }

  function setStatus(text) {
    const status = document.getElementById("lbStatus");
    if (status) {
      status.textContent = text;
    }
  }

  function renderPreview() {
    if (!previewHost) {
      return;
    }
    const source = currentSource();
    previewHost.qhtmlSource = source;
    if (typeof previewHost.fromQHTML === "function") {
      previewHost.fromQHTML(source);
    } else if (window.QHTML7 && window.QHTML7.runtime && typeof window.QHTML7.runtime.mountElement === "function") {
      previewHost.textContent = source;
      window.QHTML7.runtime.mountElement(previewHost);
    } else {
      previewHost.textContent = source;
    }
    window.setTimeout(refreshOutlines, 0);
  }

  function refreshOutlines() {
    const mount = document.getElementById("layoutPreviewMount");
    if (!mount) {
      return;
    }
    mount.querySelectorAll("[qhtml-layout]").forEach((item) => {
      item.removeAttribute("data-lb-active");
    });
    if (activeId) {
      const active = mount.querySelector('[data-layout-id="' + CSS.escape(activeId) + '"]');
      if (active) {
        active.setAttribute("data-lb-active", "1");
      }
    }
    if (dropTargetId) {
      const drop = mount.querySelector('[data-layout-id="' + CSS.escape(dropTargetId) + '"]');
      if (drop) {
        drop.setAttribute("data-lb-drop", "1");
      }
    }
  }

  function findNodeById(id, start, parent) {
    const current = start || root;
    if (!current) {
      return null;
    }
    if (current.id === id) {
      return { node: current, parent: parent || null };
    }
    for (let i = 0; i < current.children.length; i += 1) {
      const found = findNodeById(id, current.children[i], current);
      if (found) {
        return found;
      }
    }
    return null;
  }

  function currentTarget() {
    return findNodeById(menuTargetId || activeId) || { node: root, parent: null };
  }

  function canInsertAsChild(childType, parentType) {
    if (childType === "q-col") {
      return parentType === "q-row" || parentType === "q-layout";
    }
    if (childType === "q-row") {
      return parentType === "q-col" || parentType === "q-layout";
    }
    if (childType === "q-layout") {
      return parentType === "q-layout" || parentType === "q-row" || parentType === "q-col";
    }
    return true;
  }

  function canInsertAsSibling(childType, targetParent) {
    return !!targetParent && canInsertAsChild(childType, targetParent.type);
  }

  function canSwapNodes(sourceNode, sourceParent, targetNode, targetParent) {
    if (!sourceNode || !targetNode || sourceNode === targetNode) {
      return false;
    }
    if (sourceParent && !canInsertAsChild(targetNode.type, sourceParent.type)) {
      return false;
    }
    if (targetParent && !canInsertAsChild(sourceNode.type, targetParent.type)) {
      return false;
    }
    return true;
  }

  function canReplaceTarget(sourceNode, targetParent) {
    return !targetParent || canInsertAsChild(sourceNode.type, targetParent.type);
  }

  function clamp(value, min, max) {
    const boundedMax = Number.isFinite(max) ? Math.max(min, max) : max;
    return Math.max(min, Math.min(boundedMax, value));
  }

  function nearestLayoutElement(element, excludeId) {
    const mount = document.getElementById("layoutPreviewMount");
    const excluded = excludeId ? findNodeById(excludeId) : null;
    let current = element;
    while (current && mount && mount.contains(current)) {
      if (current.hasAttribute && current.hasAttribute("data-layout-id")) {
        const id = current.getAttribute("data-layout-id");
        const found = findNodeById(id);
        const blocked = excluded && (id === excludeId || isDescendantOf(found ? found.node : null, excluded.node));
        if (!blocked) {
          return current;
        }
      }
      current = current.parentElement;
    }
    return null;
  }

  function layoutElementFromPoint(x, y, excludeId) {
    return nearestLayoutElement(document.elementFromPoint(x, y), excludeId);
  }

  function layoutElementForEvent(event) {
    return nearestLayoutElement(event.target);
  }

  function layoutElementForResizeEvent(event) {
    const mount = document.getElementById("layoutPreviewMount");
    let current = event.target;
    while (current && mount && mount.contains(current)) {
      if (current.hasAttribute && current.hasAttribute("data-layout-id")) {
        const id = current.getAttribute("data-layout-id");
        const found = findNodeById(id);
        const region = pointerRegion(current, event);
        const edge = found && found.node ? resizeEdgeForNode(found.node, found.parent, region.edge) : "";
        if (edge) {
          return current;
        }
        if (found &&
            found.node &&
            found.node.type === "q-col" &&
            found.parent &&
            found.parent.type === "q-row" &&
            (region.edge === "left" || region.edge === "right")) {
          return current;
        }
      }
      current = current.parentElement;
    }
    return null;
  }

  function isDescendantOf(node, ancestor) {
    if (!node || !ancestor || node === ancestor) {
      return false;
    }
    const stack = (ancestor.children || []).slice();
    while (stack.length) {
      const current = stack.shift();
      if (current === node) {
        return true;
      }
      stack.push(...(current.children || []));
    }
    return false;
  }

  function edgeLimit(size) {
    return clamp(size * EDGE_RATIO, EDGE_MIN, EDGE_MAX);
  }

  function pointerRegion(element, event) {
    const rect = element.getBoundingClientRect();
    const left = event.clientX - rect.left;
    const top = event.clientY - rect.top;
    const distances = {
      left: left,
      right: rect.width - left,
      top: top,
      bottom: rect.height - top
    };
    const nearest = Object.keys(distances).sort((a, b) => distances[a] - distances[b])[0];
    const horizontalLimit = edgeLimit(rect.width);
    const verticalLimit = edgeLimit(rect.height);
    const limit = nearest === "left" || nearest === "right" ? horizontalLimit : verticalLimit;
    return {
      edge: distances[nearest] <= limit ? nearest : "",
      nearest: nearest,
      rect: rect
    };
  }

  function dropRegion(element, event) {
    const rect = element.getBoundingClientRect();
    const x = rect.width ? (event.clientX - rect.left) / rect.width : 0.5;
    const y = rect.height ? (event.clientY - rect.top) / rect.height : 0.5;
    if (x >= 0.3 && x <= 0.7 && y >= 0.3 && y <= 0.7) {
      return { edge: "", nearest: "center", rect: rect };
    }
    const distances = {
      left: x,
      right: 1 - x,
      top: y,
      bottom: 1 - y
    };
    const nearest = Object.keys(distances).sort((a, b) => distances[a] - distances[b])[0];
    return { edge: nearest, nearest: nearest, rect: rect };
  }

  function cursorForEdge(edge) {
    if (edge === "left" || edge === "right") {
      return "ew-resize";
    }
    if (edge === "top" || edge === "bottom") {
      return "ns-resize";
    }
    return "move";
  }

  function hasPreviousHorizontalLayoutSibling(node, parent) {
    const siblings = parent && parent.children ? parent.children : [];
    const index = siblings.indexOf(node);
    for (let i = 0; i < index; i += 1) {
      if (siblings[i] && (siblings[i].type === "q-col" || siblings[i].type === "q-layout")) {
        return true;
      }
    }
    return false;
  }

  function resizeEdgeForNode(node, parent, edge) {
    if (!edge) {
      return "";
    }
    if (node.type === "q-col" && parent && parent.type === "q-row") {
      if (edge === "left" && !hasPreviousHorizontalLayoutSibling(node, parent)) {
        return "";
      }
      return edge === "left" || edge === "right" ? edge : "";
    }
    return edge;
  }

  function updateCanvasCursor(event) {
    const canvas = document.getElementById("layoutCanvas");
    const element = layoutElementForResizeEvent(event) || layoutElementForEvent(event);
    if (!element) {
      canvas.style.cursor = "";
      return;
    }
    const id = element.getAttribute("data-layout-id");
    const found = findNodeById(id);
    const region = pointerRegion(element, event);
    region.edge = found && found.node ? resizeEdgeForNode(found.node, found.parent, region.edge) : "";
    canvas.style.cursor = cursorForEdge(region.edge);
  }

  function clearDropHighlight() {
    const mount = document.getElementById("layoutPreviewMount");
    if (!mount) {
      return;
    }
    mount.querySelectorAll("[data-lb-drop]").forEach((item) => {
      item.removeAttribute("data-lb-drop");
    });
    dropTargetId = "";
  }

  function updateDropHighlight(event) {
    clearDropHighlight();
    if (!interaction || interaction.type !== "drag") {
      return;
    }
    const element = layoutElementFromPoint(event.clientX, event.clientY, interaction.nodeId);
    if (!element) {
      return;
    }
    dropTargetId = element.getAttribute("data-layout-id") || "";
    element.setAttribute("data-lb-drop", "1");
  }

  function detachNode(id) {
    const detached = detachNodeWithPosition(id);
    return detached ? detached.node : null;
  }

  function detachNodeWithPosition(id) {
    const found = findNodeById(id);
    if (!found || !found.node || !found.parent) {
      return null;
    }
    const index = found.parent.children.indexOf(found.node);
    found.parent.children.splice(index, 1);
    return {
      node: found.node,
      parent: found.parent,
      index: index
    };
  }

  function restoreDetachedNode(detached) {
    if (detached && detached.parent && detached.node) {
      detached.parent.children.splice(detached.index, 0, detached.node);
    }
  }

  function insertSibling(targetId, node, after) {
    const found = findNodeById(targetId);
    if (!found || !found.parent) {
      return false;
    }
    const index = found.parent.children.indexOf(found.node);
    found.parent.children.splice(index + (after ? 1 : 0), 0, node);
    return true;
  }

  function insertChildNode(targetId, node, atEnd) {
    const found = findNodeById(targetId);
    if (!found || !found.node) {
      return false;
    }
    if (atEnd) {
      found.node.children.push(node);
    } else {
      found.node.children.unshift(node);
    }
    return true;
  }

  function createQHTMLNodeFromSource(source) {
    const node = createNode("qhtml", []);
    node.source = String(source || "").trim();
    return node;
  }

  function dropQHTMLAtPoint(source, x, y, meta) {
    const qhtmlSource = String(source || "").trim();
    if (!qhtmlSource) {
      return false;
    }

    const canvas = document.getElementById("layoutCanvas");
    const pointElement = document.elementFromPoint(x, y);
    if (!canvas || !pointElement || !canvas.contains(pointElement)) {
      return false;
    }

    const element = layoutElementFromPoint(x, y, "");
    const targetId = element ? element.getAttribute("data-layout-id") : root.id;
    const found = findNodeById(targetId);
    const target = found && found.node ? found.node : root;
    const qhtmlNode = createQHTMLNodeFromSource(qhtmlSource);
    let inserted = false;

    if (meta && Array.isArray(meta.scopeImports)) {
      meta.scopeImports.forEach(addScopedImport);
    }

    if (target.type === "q-row") {
      const col = createNode("q-col", [qhtmlNode], { label: false });
      target.children.push(col);
      activeId = col.id;
      inserted = true;
    } else {
      target.children.push(qhtmlNode);
      activeId = target.id;
      inserted = true;
    }

    if (inserted) {
      renderPreview();
      setStatus("Dropped " + (meta && meta.displayName ? meta.displayName : "palette item"));
    }
    return inserted;
  }

  function chooseReplaceChildrenAction() {
    const dialog = document.getElementById("lbReplaceChildrenDialog");
    return new Promise((resolve) => {
      const finish = (choice) => {
        dialog.removeEventListener("click", handleClick);
        dialog.removeEventListener("cancel", handleCancel);
        if (dialog.open) {
          dialog.close();
        }
        resolve(choice);
      };
      const handleClick = (event) => {
        const button = event.target.closest("[data-children-action]");
        if (button) {
          finish(button.getAttribute("data-children-action") || "cancel");
        }
      };
      const handleCancel = (event) => {
        event.preventDefault();
        finish("cancel");
      };

      dialog.addEventListener("click", handleClick);
      dialog.addEventListener("cancel", handleCancel);
      dialog.showModal();
    });
  }

  async function replaceTargetWithNode(sourceNode, targetId) {
    const found = findNodeById(targetId);
    if (!found || !found.node) {
      return false;
    }
    if (!canReplaceTarget(sourceNode, found.parent)) {
      return false;
    }
    if ((found.node.children || []).length) {
      const choice = await chooseReplaceChildrenAction();
      if (choice === "move") {
        sourceNode.children = (sourceNode.children || []).concat(found.node.children || []);
      } else if (choice !== "delete") {
        return false;
      }
    }
    if (!found.parent) {
      root = sourceNode;
      return true;
    }
    const index = found.parent.children.indexOf(found.node);
    found.parent.children.splice(index, 1, sourceNode);
    return true;
  }

  function swapNodes(sourceId, targetId) {
    const source = findNodeById(sourceId);
    const target = findNodeById(targetId);
    if (!source || !target || !source.node || !target.node || source.node === target.node) {
      return false;
    }
    if (isDescendantOf(target.node, source.node) || isDescendantOf(source.node, target.node)) {
      return false;
    }
    if (!canSwapNodes(source.node, source.parent, target.node, target.parent)) {
      return false;
    }
    if (!source.parent && !target.parent) {
      return false;
    }
    if (!source.parent) {
      const targetIndex = target.parent.children.indexOf(target.node);
      target.parent.children.splice(targetIndex, 1, source.node);
      root = target.node;
      return true;
    }
    if (!target.parent) {
      const sourceIndex = source.parent.children.indexOf(source.node);
      source.parent.children.splice(sourceIndex, 1, target.node);
      root = source.node;
      return true;
    }
    const sourceIndex = source.parent.children.indexOf(source.node);
    const targetIndex = target.parent.children.indexOf(target.node);
    source.parent.children.splice(sourceIndex, 1, target.node);
    target.parent.children.splice(targetIndex, 1, source.node);
    return true;
  }

  function chooseCenterDropAction() {
    const dialog = document.getElementById("lbDropChoiceDialog");
    return new Promise((resolve) => {
      const finish = (choice) => {
        dialog.removeEventListener("click", handleClick);
        dialog.removeEventListener("cancel", handleCancel);
        if (dialog.open) {
          dialog.close();
        }
        resolve(choice);
      };
      const handleClick = (event) => {
        const button = event.target.closest("[data-drop-action]");
        if (button) {
          finish(button.getAttribute("data-drop-action") || "cancel");
        }
      };
      const handleCancel = (event) => {
        event.preventDefault();
        finish("cancel");
      };

      dialog.addEventListener("click", handleClick);
      dialog.addEventListener("cancel", handleCancel);
      dialog.showModal();
    });
  }

  async function promptCenterDrop(sourceId, targetId) {
    const choice = await chooseCenterDropAction();
    if (choice === "swap") {
      return swapNodes(sourceId, targetId);
    }
    if (choice === "replace") {
      const detached = detachNodeWithPosition(sourceId);
      if (!detached) {
        return false;
      }
      const replaced = await replaceTargetWithNode(detached.node, targetId);
      if (!replaced) {
        restoreDetachedNode(detached);
      }
      return replaced;
    }
    return false;
  }

  async function moveNodeToTarget(sourceId, targetId, event) {
    const source = findNodeById(sourceId);
    const target = findNodeById(targetId);
    if (!source || !target || !source.node || !target.node || sourceId === targetId) {
      return false;
    }
    if (isDescendantOf(target.node, source.node)) {
      return false;
    }

    const element = document.querySelector('[data-layout-id="' + CSS.escape(targetId) + '"]');
    if (!element) {
      return false;
    }
    const region = dropRegion(element, event);

    if (!region.edge) {
      return promptCenterDrop(sourceId, targetId);
    }

    const after = region.edge === "right" || region.edge === "bottom";
    const childDrop = canInsertAsChild(source.node.type, target.node.type);
    const siblingDrop = canInsertAsSibling(source.node.type, target.parent);
    if (!childDrop && !siblingDrop) {
      return false;
    }

    const sourceNode = detachNode(sourceId);
    if (!sourceNode) {
      return false;
    }
    if (childDrop) {
      return insertChildNode(targetId, sourceNode, after);
    }
    if (siblingDrop) {
      return insertSibling(targetId, sourceNode, after);
    }
    return insertChildNode(targetId, sourceNode, after);
  }

  function parseLengthValue(value) {
    const text = String(value || "").trim();
    const match = /^(-?(?:\d+|\d*\.\d+))(px|%|vw|vh|vmin|vmax|rem|em)?$/i.exec(text);
    if (!match) {
      return null;
    }
    return {
      number: Number(match[1]),
      unit: (match[2] || "px").toLowerCase()
    };
  }

  function unitBasePixels(unit, dimension, element, renderedPixels, numericValue) {
    const horizontalDimension = dimension === "width" || dimension === "x" || dimension === "left";
    if (unit === "px") {
      return 1;
    }
    if (unit === "vw") {
      return window.innerWidth / 100;
    }
    if (unit === "vh") {
      return window.innerHeight / 100;
    }
    if (unit === "vmin") {
      return Math.min(window.innerWidth, window.innerHeight) / 100;
    }
    if (unit === "vmax") {
      return Math.max(window.innerWidth, window.innerHeight) / 100;
    }
    if (unit === "%") {
      const parent = element ? element.parentElement : null;
      const rect = parent ? parent.getBoundingClientRect() : null;
      const parentPixels = rect ? (horizontalDimension ? rect.width : rect.height) : 0;
      return parentPixels ? parentPixels / 100 : renderedPixels / numericValue;
    }
    if (unit === "rem") {
      return Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
    }
    if (unit === "em") {
      return element ? Number.parseFloat(window.getComputedStyle(element).fontSize) || 16 : 16;
    }
    return renderedPixels / numericValue;
  }

  function resizeUnitInfo(node, propName, element, renderedPixels) {
    const parsed = parseLengthValue(node.props[propName]);
    if (!parsed || !Number.isFinite(parsed.number)) {
      return { unit: "px", basePixels: 1 };
    }
    const basePixels = unitBasePixels(parsed.unit, propName, element, renderedPixels, parsed.number);
    if (!Number.isFinite(basePixels) || basePixels <= 0) {
      return { unit: "px", basePixels: 1 };
    }
    return {
      unit: parsed.unit,
      basePixels: basePixels
    };
  }

  function lengthValueToPixels(node, propName, element, dimension) {
    const parsed = parseLengthValue(node.props[propName]);
    if (!parsed || !Number.isFinite(parsed.number)) {
      return 0;
    }
    const basePixels = unitBasePixels(parsed.unit, dimension || propName, element, 0, parsed.number);
    if (!Number.isFinite(basePixels) || basePixels <= 0) {
      return parsed.unit === "px" ? parsed.number : 0;
    }
    return parsed.number * basePixels;
  }

  function formatLengthValue(pixels, unitInfo) {
    const unit = unitInfo.unit || "px";
    const basePixels = unitInfo.basePixels || 1;
    const value = unit === "px" ? Math.round(pixels) : pixels / basePixels;
    const precision = unit === "px" ? 0 : 3;
    const rounded = Number(value.toFixed(precision));
    return String(rounded) + unit;
  }

  function applyLayoutWidth(node, parent, element, widthValue) {
    node.props.width = widthValue;
    if (node.type === "q-col" && parent && parent.type === "q-row") {
      node.props.flex = "0 0 " + widthValue;
      if (String(node.props.minWidth || "").trim().toLowerCase() === DEFAULT_LAYOUT_VALUE) {
        node.props.minWidth = "max-content";
      }
    }
    if (element) {
      element.style.width = widthValue;
      if (node.type === "q-col" && parent && parent.type === "q-row") {
        element.style.flex = "0 0 " + widthValue;
        if (String(node.props.minWidth || "").trim().toLowerCase() === "max-content") {
          element.style.minWidth = "max-content";
        }
      }
    }
  }

  function applyLayoutHeight(node, parent, element, heightValue) {
    node.props.height = heightValue;
    if (node.type === "q-row" && parent && (parent.type === "q-layout" || parent.type === "q-col")) {
      node.props.flex = "0 0 " + heightValue;
      const minHeightValue = String(node.props.minHeight || node.props["min-height"] || "").trim().toLowerCase();
      if (!minHeightValue || minHeightValue === DEFAULT_LAYOUT_VALUE) {
        node.props.minHeight = "max-content";
        delete node.props["min-height"];
      }
    }
    if (element) {
      element.style.height = heightValue;
      if (node.type === "q-row" && parent && (parent.type === "q-layout" || parent.type === "q-col")) {
        element.style.flex = "0 0 " + heightValue;
        if (String(node.props.minHeight || "").trim().toLowerCase() === "max-content") {
          element.style.minHeight = "max-content";
        }
      }
    }
  }

  function parentResizeBounds(element) {
    const parent = element ? element.parentElement : null;
    const parentRect = parent ? parent.getBoundingClientRect() : null;
    const rect = element ? element.getBoundingClientRect() : null;
    const parentWidth = parentRect ? parentRect.width : Number.POSITIVE_INFINITY;
    const parentHeight = parentRect ? parentRect.height : Number.POSITIVE_INFINITY;
    const left = parentRect && rect ? clamp(rect.left - parentRect.left, 0, parentWidth) : 0;
    const top = parentRect && rect ? clamp(rect.top - parentRect.top, 0, parentHeight) : 0;
    return {
      width: parentWidth,
      height: parentHeight,
      left: left,
      top: top
    };
  }

  function horizontalSiblingBounds(node, parent, parentElement, parentWidth) {
    if (!node || !parent || node.type !== "q-col" || !parentElement) {
      return {
        minLeft: 0,
        maxRight: parentWidth
      };
    }

    const parentRect = parentElement.getBoundingClientRect();
    const siblings = parent.children || [];
    const index = siblings.indexOf(node);
    let minLeft = 0;
    let maxRight = parentWidth;

    for (let i = 0; i < siblings.length; i += 1) {
      const sibling = siblings[i];
      if (!sibling || sibling === node) {
        continue;
      }
      const siblingElement = document.querySelector('[data-layout-id="' + CSS.escape(sibling.id) + '"]');
      if (!siblingElement) {
        continue;
      }
      const rect = siblingElement.getBoundingClientRect();
      const left = clamp(rect.left - parentRect.left, 0, parentWidth);
      const right = clamp(rect.right - parentRect.left, 0, parentWidth);
      if (i < index) {
        minLeft = Math.max(minLeft, right);
      } else if (i > index) {
        maxRight = Math.min(maxRight, left);
      }
    }

    return {
      minLeft: minLeft,
      maxRight: Math.max(minLeft + 24, maxRight)
    };
  }

  function intrinsicContentWidth(element) {
    if (!element || !element.parentElement) {
      return 24;
    }
    const clone = element.cloneNode(true);
    clone.style.position = "absolute";
    clone.style.visibility = "hidden";
    clone.style.pointerEvents = "none";
    clone.style.width = "min-content";
    clone.style.minWidth = "0";
    clone.style.maxWidth = "none";
    clone.style.flex = "0 0 auto";
    clone.style.left = "-100000px";
    clone.style.top = "-100000px";
    element.parentElement.appendChild(clone);
    const width = clone.getBoundingClientRect().width || clone.scrollWidth || 24;
    clone.remove();
    return Math.max(24, Math.ceil(width));
  }

  function intrinsicContentHeight(element) {
    if (!element || !element.parentElement) {
      return 24;
    }
    const rect = element.getBoundingClientRect();
    const clone = element.cloneNode(true);
    clone.style.position = "absolute";
    clone.style.visibility = "hidden";
    clone.style.pointerEvents = "none";
    clone.style.width = Math.max(1, rect.width) + "px";
    clone.style.height = "auto";
    clone.style.minHeight = "0";
    clone.style.maxHeight = "none";
    clone.style.flex = "0 0 auto";
    clone.style.left = "-100000px";
    clone.style.top = "-100000px";
    element.parentElement.appendChild(clone);
    const height = clone.getBoundingClientRect().height || clone.scrollHeight || 24;
    clone.remove();
    return Math.max(24, Math.ceil(height));
  }

  function minimumColumnWidth(node, element) {
    const parsed = parseLengthValue(node.props.minWidth);
    if (parsed && Number.isFinite(parsed.number)) {
      const basePixels = unitBasePixels(parsed.unit, "width", element, element.getBoundingClientRect().width, parsed.number);
      if (Number.isFinite(basePixels) && basePixels > 0) {
        return Math.max(24, parsed.number * basePixels);
      }
    }
    return intrinsicContentWidth(element);
  }

  function maximumColumnWidth(node, element) {
    const value = node.props.maxWidth || node.props["max-width"];
    const parsed = parseLengthValue(value);
    if (parsed && Number.isFinite(parsed.number)) {
      const basePixels = unitBasePixels(parsed.unit, "width", element, element.getBoundingClientRect().width, parsed.number);
      if (Number.isFinite(basePixels) && basePixels > 0) {
        return Math.max(24, parsed.number * basePixels);
      }
    }
    return Number.POSITIVE_INFINITY;
  }

  function minimumRowHeight(node, element) {
    const value = node.props.minHeight || node.props["min-height"];
    const parsed = parseLengthValue(value);
    if (parsed && Number.isFinite(parsed.number)) {
      const basePixels = unitBasePixels(parsed.unit, "height", element, element.getBoundingClientRect().height, parsed.number);
      if (Number.isFinite(basePixels) && basePixels > 0) {
        return Math.max(24, parsed.number * basePixels);
      }
    }
    return intrinsicContentHeight(element);
  }

  function rowHasVerticalFlowParent(node, parent) {
    return node && parent && node.type === "q-row" && (parent.type === "q-layout" || parent.type === "q-col");
  }

  function parentHasExplicitHeight(parent) {
    if (!parent || !parent.props) {
      return false;
    }
    const value = String(parent.props.height || "").trim().toLowerCase();
    return Boolean(value && value !== DEFAULT_LAYOUT_VALUE && value !== "auto" && value !== "none");
  }

  function rightEdgeColumnAccommodationPlan(node, parent, parentElement, parentWidth) {
    if (!node || !parent || node.type !== "q-col" || parent.type !== "q-row" || !parentElement) {
      return null;
    }

    const parentRect = parentElement.getBoundingClientRect();
    const siblings = parent.children || [];
    const index = siblings.indexOf(node);
    const items = [];
    let furthestRight = 0;
    let shrinkCapacity = 0;

    for (let i = index + 1; i < siblings.length; i += 1) {
      const sibling = siblings[i];
      const siblingElement = sibling
        ? document.querySelector('[data-layout-id="' + CSS.escape(sibling.id) + '"]')
        : null;
      if (!siblingElement) {
        continue;
      }
      const rect = siblingElement.getBoundingClientRect();
      const right = rect.right - parentRect.left;
      const props = normalizedPropsFor(sibling.type, sibling.props);
      sibling.props = props;
      const startWidth = rect.width;
      const minWidth = Math.min(startWidth, minimumColumnWidth(sibling, siblingElement));
      const capacity = Math.max(0, startWidth - minWidth);
      items.push({
        node: sibling,
        element: siblingElement,
        startWidth: startWidth,
        minWidth: minWidth,
        widthUnit: resizeUnitInfo(sibling, "width", siblingElement, startWidth)
      });
      shrinkCapacity += capacity;
      furthestRight = Math.max(furthestRight, right);
    }

    if (!items.length) {
      return null;
    }

    const freeSpace = Math.max(0, parentWidth - furthestRight);
    return {
      parent: parent,
      items: items,
      freeSpace: freeSpace,
      shrinkCapacity: shrinkCapacity
    };
  }

  function leftEdgeColumnResizePlan(node, parent, parentElement, selectedElement) {
    if (!node || !parent || node.type !== "q-col" || parent.type !== "q-row" || !parentElement) {
      return null;
    }

    const parentRect = parentElement.getBoundingClientRect();
    const siblings = parent.children || [];
    const index = siblings.indexOf(node);
    if (index <= 0) {
      return null;
    }
    const previousCols = [];
    let leftmost = Number.POSITIVE_INFINITY;
    let shrinkCapacity = 0;
    let expandCapacity = 0;

    for (let i = 0; i < index; i += 1) {
      const sibling = siblings[i];
      const siblingElement = sibling
        ? document.querySelector('[data-layout-id="' + CSS.escape(sibling.id) + '"]')
        : null;
      if (!siblingElement) {
        continue;
      }
      const rect = siblingElement.getBoundingClientRect();
      const left = rect.left - parentRect.left;
      const props = normalizedPropsFor(sibling.type, sibling.props);
      sibling.props = props;
      if (sibling.type === "q-col") {
        const startWidth = rect.width;
        const minWidth = Math.min(startWidth, minimumColumnWidth(sibling, siblingElement));
        const maxWidth = maximumColumnWidth(sibling, siblingElement);
        const item = {
          node: sibling,
          element: siblingElement,
          startWidth: startWidth,
          minWidth: minWidth,
          maxWidth: Math.max(startWidth, maxWidth),
          widthUnit: resizeUnitInfo(sibling, "width", siblingElement, startWidth)
        };
        previousCols.push(item);
        shrinkCapacity += Math.max(0, startWidth - minWidth);
        expandCapacity += Number.isFinite(item.maxWidth) ? Math.max(0, item.maxWidth - startWidth) : Number.POSITIVE_INFINITY;
      }
      leftmost = Math.min(leftmost, left);
    }

    const selectedWidth = selectedElement.getBoundingClientRect().width;
    const selectedMinWidth = Math.min(selectedWidth, minimumColumnWidth(node, selectedElement));
    return {
      parent: parent,
      previousCols: previousCols,
      freeSpace: Number.isFinite(leftmost) ? Math.max(0, leftmost) : 0,
      shrinkCapacity: shrinkCapacity,
      expandCapacity: expandCapacity,
      selectedMinWidth: selectedMinWidth
    };
  }

  function topEdgeRowAccommodationPlan(node, parent, parentElement) {
    if (!rowHasVerticalFlowParent(node, parent) || !parentElement) {
      return null;
    }

    const parentRect = parentElement.getBoundingClientRect();
    const siblings = parent.children || [];
    const index = siblings.indexOf(node);
    const items = [];
    let topmost = Number.POSITIVE_INFINITY;
    let shrinkCapacity = 0;

    for (let i = 0; i < index; i += 1) {
      const sibling = siblings[i];
      const siblingElement = sibling && sibling.type === "q-row"
        ? document.querySelector('[data-layout-id="' + CSS.escape(sibling.id) + '"]')
        : null;
      if (!siblingElement) {
        continue;
      }
      const rect = siblingElement.getBoundingClientRect();
      const top = rect.top - parentRect.top;
      const props = normalizedPropsFor(sibling.type, sibling.props);
      sibling.props = props;
      const startHeight = rect.height;
      const minHeight = Math.min(startHeight, minimumRowHeight(sibling, siblingElement));
      const capacity = Math.max(0, startHeight - minHeight);
      items.push({
        node: sibling,
        element: siblingElement,
        startHeight: startHeight,
        minHeight: minHeight,
        heightUnit: resizeUnitInfo(sibling, "height", siblingElement, startHeight)
      });
      shrinkCapacity += capacity;
      topmost = Math.min(topmost, top);
    }

    if (!items.length) {
      return null;
    }

    return {
      parent: parent,
      items: items,
      freeSpace: Number.isFinite(topmost) ? Math.max(0, topmost) : 0,
      shrinkCapacity: shrinkCapacity
    };
  }

  function bottomEdgeRowConstraintPlan(node, parent, parentElement, parentHeight, startBottom) {
    if (!rowHasVerticalFlowParent(node, parent) || !parentElement || !parentHasExplicitHeight(parent)) {
      return null;
    }

    const parentRect = parentElement.getBoundingClientRect();
    const siblings = parent.children || [];
    const index = siblings.indexOf(node);
    let furthestBottom = startBottom;

    for (let i = index + 1; i < siblings.length; i += 1) {
      const sibling = siblings[i];
      const siblingElement = sibling && sibling.type === "q-row"
        ? document.querySelector('[data-layout-id="' + CSS.escape(sibling.id) + '"]')
        : null;
      if (!siblingElement) {
        continue;
      }
      const rect = siblingElement.getBoundingClientRect();
      furthestBottom = Math.max(furthestBottom, rect.bottom - parentRect.top);
    }

    return {
      maxGrowth: Math.max(0, parentHeight - furthestBottom)
    };
  }

  function isLastSibling(node, parent) {
    const siblings = parent && parent.children ? parent.children : [];
    return siblings.length > 0 && siblings[siblings.length - 1] === node;
  }

  function lastRowAncestorExpansionPlan(node, parent, element) {
    if (!rowHasVerticalFlowParent(node, parent) || !isLastSibling(node, parent) || !element) {
      return null;
    }

    const entries = [];
    let current = parent;
    while (current) {
      const currentElement = document.querySelector('[data-layout-id="' + CSS.escape(current.id) + '"]');
      if (!currentElement) {
        break;
      }
      const rect = currentElement.getBoundingClientRect();
      current.props = normalizedPropsFor(current.type, current.props);
      entries.push({
        node: current,
        parent: findNodeById(current.id).parent,
        element: currentElement,
        startHeight: rect.height,
        top: rect.top,
        heightUnit: resizeUnitInfo(current, "height", currentElement, rect.height)
      });

      const found = findNodeById(current.id);
      if (!found || !found.parent || !isLastSibling(current, found.parent)) {
        break;
      }
      current = found.parent;
    }

    if (!entries.length) {
      return null;
    }

    return {
      entries: entries
    };
  }

  function distributeShrink(items, shrinkNeeded) {
    const widths = items.map((item) => item.startWidth);
    let remaining = Math.max(0, shrinkNeeded);
    while (remaining > 0.5) {
      const shrinkable = items
        .map((item, index) => ({ item: item, index: index, capacity: widths[index] - item.minWidth }))
        .filter((entry) => entry.capacity > 0.5);
      if (!shrinkable.length) {
        break;
      }
      const share = remaining / shrinkable.length;
      let applied = 0;
      shrinkable.forEach((entry) => {
        const amount = Math.min(share, entry.capacity);
        widths[entry.index] -= amount;
        applied += amount;
      });
      if (applied <= 0.5) {
        break;
      }
      remaining -= applied;
    }
    return widths;
  }

  function distributeExpandFromRight(items, expandNeeded) {
    const widths = items.map((item) => item.startWidth);
    let remaining = Math.max(0, expandNeeded);
    for (let index = items.length - 1; index >= 0 && remaining > 0.5; index -= 1) {
      const item = items[index];
      const capacity = item.maxWidth - widths[index];
      const amount = Number.isFinite(capacity) ? Math.min(remaining, Math.max(0, capacity)) : remaining;
      widths[index] += amount;
      remaining -= amount;
    }
    return widths;
  }

  function applyLeftColumnResizePlan(plan, delta) {
    if (!plan) {
      return;
    }
    let widths;
    if (delta < -0.5) {
      widths = distributeShrink(plan.previousCols, Math.max(0, -delta - plan.freeSpace));
    } else if (delta > 0.5) {
      widths = distributeExpandFromRight(plan.previousCols, delta);
    } else {
      widths = plan.previousCols.map((item) => item.startWidth);
    }
    plan.previousCols.forEach((item, index) => {
      const value = formatLengthValue(widths[index], item.widthUnit);
      applyLayoutWidth(item.node, plan.parent, item.element, value);
    });
  }

  function applyColumnAccommodation(accommodationPlan, delta) {
    if (!accommodationPlan) {
      return;
    }
    const shrinkNeeded = Math.max(0, delta - accommodationPlan.freeSpace);
    const widths = distributeShrink(accommodationPlan.items, shrinkNeeded);
    accommodationPlan.items.forEach((item, index) => {
      const value = formatLengthValue(widths[index], item.widthUnit);
      applyLayoutWidth(item.node, accommodationPlan.parent, item.element, value);
    });
  }

  function distributeHeightShrink(items, shrinkNeeded) {
    const heights = items.map((item) => item.startHeight);
    let remaining = Math.max(0, shrinkNeeded);
    while (remaining > 0.5) {
      const shrinkable = items
        .map((item, index) => ({ item: item, index: index, capacity: heights[index] - item.minHeight }))
        .filter((entry) => entry.capacity > 0.5);
      if (!shrinkable.length) {
        break;
      }
      const share = remaining / shrinkable.length;
      let applied = 0;
      shrinkable.forEach((entry) => {
        const amount = Math.min(share, entry.capacity);
        heights[entry.index] -= amount;
        applied += amount;
      });
      if (applied <= 0.5) {
        break;
      }
      remaining -= applied;
    }
    return heights;
  }

  function applyRowAccommodation(accommodationPlan, delta) {
    if (!accommodationPlan) {
      return;
    }
    const shrinkNeeded = Math.max(0, delta - accommodationPlan.freeSpace);
    const heights = distributeHeightShrink(accommodationPlan.items, shrinkNeeded);
    accommodationPlan.items.forEach((item, index) => {
      const value = formatLengthValue(heights[index], item.heightUnit);
      applyLayoutHeight(item.node, accommodationPlan.parent, item.element, value);
    });
  }

  function applyAncestorExpansion(expansionPlan, draggedPageBottom) {
    if (!expansionPlan) {
      return;
    }
    expansionPlan.entries.forEach((entry) => {
      const overflow = draggedPageBottom - (entry.top + entry.startHeight);
      if (overflow <= 0.5) {
        return;
      }
      const heightValue = formatLengthValue(entry.startHeight + overflow, entry.heightUnit);
      applyLayoutHeight(entry.node, entry.parent, entry.element, heightValue);
    });
  }

  function expandParentForRowHeight(found, interaction, bottom) {
    if (!found.parent ||
        found.node.type !== "q-row" ||
        interaction.parentHeightConstrained ||
        bottom <= interaction.parentHeight) {
      return;
    }
    const parentElement = document.querySelector('[data-layout-id="' + CSS.escape(found.parent.id) + '"]');
    found.parent.props = normalizedPropsFor(found.parent.type, found.parent.props);
    const heightValue = formatLengthValue(bottom, interaction.parentHeightUnit);
    found.parent.props.height = heightValue;
    interaction.parentHeight = bottom;
    if (parentElement) {
      parentElement.style.height = heightValue;
    }
  }

  function updateResize(event) {
    const found = findNodeById(interaction.nodeId);
    if (!found || !found.node) {
      return;
    }
    const dx = event.clientX - interaction.startX;
    const dy = event.clientY - interaction.startY;
    const element = document.querySelector('[data-layout-id="' + CSS.escape(interaction.nodeId) + '"]');
    if (interaction.edge === "left" || interaction.edge === "right") {
      let left = interaction.startLeft;
      let right = interaction.startRight;
      if (interaction.edge === "right") {
        right = clamp(interaction.startRight + dx, interaction.startLeft + interaction.minWidth, interaction.maxRight);
        if (interaction.accommodationPlan) {
          applyColumnAccommodation(interaction.accommodationPlan, Math.max(0, right - interaction.startRight));
        }
      } else {
        left = clamp(interaction.startLeft + dx, interaction.minLeft, interaction.maxLeft);
        if (interaction.leftColumnPlan) {
          applyLeftColumnResizePlan(interaction.leftColumnPlan, left - interaction.startLeft);
        } else if (interaction.accommodationPlan) {
          applyColumnAccommodation(interaction.accommodationPlan, Math.max(0, interaction.startLeft - left));
        }
      }
      const width = Math.max(24, Math.round(right - left));
      const widthValue = formatLengthValue(width, interaction.widthUnit);
      applyLayoutWidth(found.node, found.parent, element, widthValue);
      if (interaction.edge === "left" && !interaction.leftColumnPlan && !interaction.accommodationPlan) {
        const xOffset = left - interaction.flowLeft;
        if (Math.abs(xOffset) > 0.5 || interaction.hadX) {
          const xValue = formatLengthValue(xOffset, interaction.xUnit);
          found.node.props.x = xValue;
          found.node.props.position = found.node.props.position || "relative";
          if (element) {
            element.style.left = xValue;
            element.style.position = "relative";
          }
        }
      }
    } else {
      let top = interaction.startTop;
      let bottom = interaction.startBottom;
      const minHeight = interaction.minHeight || 24;
      const maxBottom = interaction.maxBottom;
      if (interaction.edge === "bottom") {
        bottom = clamp(interaction.startBottom + dy, interaction.startTop + minHeight, maxBottom);
        if (interaction.ancestorExpansionPlan) {
          applyAncestorExpansion(interaction.ancestorExpansionPlan, interaction.parentPageTop + bottom);
        }
      } else {
        top = clamp(interaction.startTop + dy, interaction.minTop, interaction.startBottom - minHeight);
        if (interaction.rowAccommodationPlan) {
          applyRowAccommodation(interaction.rowAccommodationPlan, Math.max(0, interaction.startTop - top));
        }
      }
      expandParentForRowHeight(found, interaction, bottom);
      const height = Math.max(24, Math.round(bottom - top));
      const heightValue = formatLengthValue(height, interaction.heightUnit);
      applyLayoutHeight(found.node, found.parent, element, heightValue);
      if (interaction.edge === "top" && !interaction.rowAccommodationPlan) {
        const yOffset = top - interaction.flowTop;
        if (Math.abs(yOffset) > 0.5 || interaction.hadY) {
          const yValue = formatLengthValue(yOffset, interaction.yUnit);
          found.node.props.y = yValue;
          found.node.props.position = found.node.props.position || "relative";
          if (element) {
            element.style.top = yValue;
            element.style.position = "relative";
          }
        }
      }
    }
  }

  function insertNode(kind, placement) {
    const found = currentTarget();
    const target = found.node || root;
    const parent = found.parent;
    const next = createNode(kind, []);

    if (placement === "child") {
      if (!canInsertAsChild(kind, target.type)) {
        hideMenus();
        setStatus(kind + " cannot be a child of " + target.type);
        return;
      }
      target.children.push(next);
    } else if (placement === "replace") {
      if (!canReplaceTarget(next, parent)) {
        hideMenus();
        setStatus(kind + " cannot replace this target");
        return;
      }
      if (parent) {
        const index = parent.children.indexOf(target);
        parent.children.splice(index, 1, next);
      } else {
        root = next;
      }
    } else if ((placement === "before" || placement === "after") && parent) {
      if (!canInsertAsChild(kind, parent.type)) {
        hideMenus();
        setStatus(kind + " cannot be added beside this target");
        return;
      }
      const index = parent.children.indexOf(target);
      parent.children.splice(index + (placement === "after" ? 1 : 0), 0, next);
    } else {
      target.children.push(next);
    }

    activeId = next.id;
    hideMenus();
    renderPreview();
    setStatus(kind + " added");
  }

  function deleteActiveNode() {
    const found = currentTarget();
    if (!found.node) {
      return;
    }
    if (!found.parent) {
      root = buildDefaultTree();
      activeId = root.id;
    } else {
      const index = found.parent.children.indexOf(found.node);
      found.parent.children.splice(index, 1);
      activeId = found.parent.id;
    }
    hideMenus();
    renderPreview();
    setStatus("Deleted");
  }

  function openEditor(mode, targetId, source) {
    const dialog = document.getElementById("lbEditorDialog");
    const title = document.getElementById("lbEditorTitle");
    const editor = document.getElementById("lbEditor");
    editorMode = mode;
    editorTargetId = targetId || "";
    editorOriginal = String(source || "");
    title.textContent = mode === "add-qhtml" ? "Add QHTML" : "Edit QHTML";
    if (typeof editor.setQhtmlSource === "function") {
      editor.setQhtmlSource(editorOriginal);
    } else {
      editor.textContent = editorOriginal;
    }
    dialog.showModal();
    hideMenus();
  }

  function editorValue() {
    const editor = document.getElementById("lbEditor");
    if (typeof editor.getQhtmlSource === "function") {
      return editor.getQhtmlSource();
    }
    return editor.textContent || "";
  }

  function saveEditor() {
    const value = editorValue();
    if (editorMode === "add-qhtml") {
      const target = currentTarget().node || root;
      const next = createNode("qhtml", []);
      next.source = value;
      target.children.push(next);
      activeId = target.id;
    } else {
      const found = findNodeById(editorTargetId);
      if (found && found.node) {
        const parsed = parseLayoutSource(value);
        if (parsed && parsed.type !== "qhtml") {
          replaceNode(found.node, parsed);
          activeId = parsed.id;
        } else {
          found.node.type = "qhtml";
          found.node.props = {};
          found.node.source = value;
          found.node.children = [];
          activeId = found.node.id;
        }
      }
    }
    closeEditor(true);
    renderPreview();
    setStatus("Saved editor changes");
  }

  function replaceNode(oldNode, newNode) {
    const found = findNodeById(oldNode.id);
    if (!found || !found.parent) {
      root = newNode;
      return;
    }
    const index = found.parent.children.indexOf(oldNode);
    found.parent.children.splice(index, 1, newNode);
  }

  function closeEditor(force) {
    const dialog = document.getElementById("lbEditorDialog");
    if (!force && editorValue() !== editorOriginal) {
      const keep = window.confirm("Keep changes before closing?");
      if (keep) {
        saveEditor();
        return;
      }
    }
    dialog.close();
    editorMode = "";
    editorTargetId = "";
    editorOriginal = "";
  }

  function openProperties() {
    const found = currentTarget();
    const node = found.node || root;
    node.props = normalizedPropsFor(node.type, node.props);
    document.getElementById("lbPropType").value = node.type === "qhtml" ? "q-layout" : node.type;
    document.getElementById("lbPropName").value = node.name || "";
    document.getElementById("lbPropWidth").value = node.props.width || "";
    document.getElementById("lbPropHeight").value = node.props.height || "";
    document.getElementById("lbPropFlex").value = node.props.flex || "";
    document.getElementById("lbPropGap").value = node.props.gap || "";
    document.getElementById("lbPropMinWidth").value = node.props.minWidth || node.props["min-width"] || "";
    document.getElementById("lbPropMinColWidth").value = node.props.minColWidth || node.props["min-col-width"] || "";
    document.getElementById("lbPropWrap").value = node.props.wrap || node.props.flexWrap || node.props["flex-wrap"] || "";
    document.getElementById("lbPropertiesDialog").showModal();
    hideMenus();
  }

  function saveProperties() {
    const found = currentTarget();
    const node = found.node || root;
    const nextType = document.getElementById("lbPropType").value;
    node.type = nextType;
    node.name = document.getElementById("lbPropName").value.trim();
    const props = Object.assign({}, node.props || {});
    props.width = document.getElementById("lbPropWidth").value.trim();
    props.height = document.getElementById("lbPropHeight").value.trim();
    props.flex = document.getElementById("lbPropFlex").value.trim();
    props.gap = document.getElementById("lbPropGap").value.trim();
    props.minWidth = document.getElementById("lbPropMinWidth").value.trim();
    props.minColWidth = document.getElementById("lbPropMinColWidth").value.trim();
    props.wrap = document.getElementById("lbPropWrap").value.trim();
    delete props["min-width"];
    delete props["min-col-width"];
    delete props.flexWrap;
    delete props["flex-wrap"];
    node.props = normalizedPropsFor(nextType, props);
    document.getElementById("lbPropertiesDialog").close();
    renderPreview();
    setStatus("Properties updated");
  }

  function exportFile() {
    const blob = new Blob([currentSource() + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "layout.qhtml";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("Exported layout.qhtml");
  }

  function openFile(file) {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const source = String(reader.result || "");
      const parsed = parseLayoutSource(source);
      root = parsed || buildDefaultTree();
      activeId = root.id;
      renderPreview();
      setStatus("Opened " + file.name);
    });
    reader.readAsText(file);
  }

  function getActiveSource() {
    const found = currentTarget();
    return sourceWithScopedImports(modelToQHTML(found.node || root, 0));
  }

  function handleCanvasPointer(event) {
    if (interaction || menuFrozen) {
      return;
    }
    const mount = document.getElementById("layoutPreviewMount");
    if (!mount) {
      return;
    }
    const element = layoutElementForResizeEvent(event) || layoutElementForEvent(event);
    activeId = element && mount.contains(element) ? element.getAttribute("data-layout-id") : root.id;
    refreshOutlines();
    updateCanvasCursor(event);
  }

  function startCanvasInteraction(event) {
    if (event.button !== 0) {
      return;
    }
    const element = layoutElementForResizeEvent(event) || layoutElementForEvent(event);
    if (!element) {
      return;
    }
    const id = element.getAttribute("data-layout-id");
    const found = findNodeById(id);
    if (!found || !found.node) {
      return;
    }
    activeId = id;
    menuTargetId = "";
    hideMenus();
    refreshOutlines();

    const region = pointerRegion(element, event);
    const rawEdge = region.edge;
    region.edge = resizeEdgeForNode(found.node, found.parent, region.edge);
    if (!region.edge &&
        rawEdge &&
        found.node.type === "q-col" &&
        found.parent &&
        found.parent.type === "q-row" &&
        (rawEdge === "left" || rawEdge === "right")) {
      event.preventDefault();
      return;
    }
    if (region.edge) {
      const bounds = parentResizeBounds(element);
      found.node.props = normalizedPropsFor(found.node.type, found.node.props);
      if (found.parent) {
        found.parent.props = normalizedPropsFor(found.parent.type, found.parent.props);
      }
      const siblingBounds = horizontalSiblingBounds(found.node, found.parent, element.parentElement, bounds.width);
      const safeStartLeft = clamp(bounds.left, siblingBounds.minLeft, siblingBounds.maxRight - 24);
      const safeStartRight = clamp(bounds.left + region.rect.width, safeStartLeft + 24, siblingBounds.maxRight);
      const accommodationPlan = region.edge === "right"
        ? rightEdgeColumnAccommodationPlan(found.node, found.parent, element.parentElement, bounds.width)
        : null;
      const leftColumnPlan = region.edge === "left"
        ? leftEdgeColumnResizePlan(found.node, found.parent, element.parentElement, element)
        : null;
      const rawStartBottom = bounds.top + region.rect.height;
      const rowAccommodationPlan = region.edge === "top"
        ? topEdgeRowAccommodationPlan(found.node, found.parent, element.parentElement)
        : null;
      const rowConstraintPlan = region.edge === "bottom"
        ? bottomEdgeRowConstraintPlan(found.node, found.parent, element.parentElement, bounds.height, rawStartBottom)
        : null;
      const ancestorExpansionPlan = region.edge === "bottom"
        ? lastRowAncestorExpansionPlan(found.node, found.parent, element)
        : null;
      const parentHeightConstrained = found.node.type === "q-row" && found.parent
        ? parentHasExplicitHeight(found.parent)
        : true;
      const xOffset = lengthValueToPixels(found.node, "x", element, "x");
      const yOffset = lengthValueToPixels(found.node, "y", element, "y");
      interaction = {
        type: "resize",
        nodeId: id,
        edge: region.edge,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: region.rect.width,
        startHeight: region.rect.height,
        startLeft: safeStartLeft,
        startTop: bounds.top,
        startRight: leftColumnPlan
          ? bounds.left + region.rect.width
          : safeStartRight,
        startBottom: found.node.type === "q-row" ? rawStartBottom : Math.min(rawStartBottom, bounds.height),
        flowLeft: safeStartLeft - xOffset,
        flowTop: bounds.top - yOffset,
        hadX: Object.prototype.hasOwnProperty.call(found.node.props, "x"),
        hadY: Object.prototype.hasOwnProperty.call(found.node.props, "y"),
        parentWidth: bounds.width,
        parentHeight: bounds.height,
        parentHeightConstrained: parentHeightConstrained,
        parentPageTop: element.parentElement ? element.parentElement.getBoundingClientRect().top : 0,
        minLeft: leftColumnPlan
          ? Math.max(0, safeStartLeft - leftColumnPlan.freeSpace - leftColumnPlan.shrinkCapacity)
          : siblingBounds.minLeft,
        maxLeft: leftColumnPlan
          ? Math.min(safeStartLeft + leftColumnPlan.expandCapacity,
                     (bounds.left + region.rect.width) - leftColumnPlan.selectedMinWidth)
          : safeStartRight - 24,
        maxRight: accommodationPlan
          ? (region.edge === "right"
            ? safeStartRight + accommodationPlan.freeSpace + accommodationPlan.shrinkCapacity
            : siblingBounds.maxRight)
          : siblingBounds.maxRight,
        accommodationPlan: accommodationPlan,
        leftColumnPlan: leftColumnPlan,
        rowAccommodationPlan: rowAccommodationPlan,
        ancestorExpansionPlan: ancestorExpansionPlan,
        minTop: rowAccommodationPlan && region.edge === "top"
          ? Math.max(0, bounds.top - rowAccommodationPlan.freeSpace - rowAccommodationPlan.shrinkCapacity)
          : 0,
        maxBottom: rowConstraintPlan && region.edge === "bottom"
          ? (ancestorExpansionPlan
            ? Number.POSITIVE_INFINITY
            : rawStartBottom + rowConstraintPlan.maxGrowth)
          : found.node.type === "q-row" && !parentHeightConstrained
            ? Number.POSITIVE_INFINITY
            : bounds.height,
        minHeight: found.node.type === "q-row" ? minimumRowHeight(found.node, element) : 24,
        minWidth: found.node.type === "q-col" ? minimumColumnWidth(found.node, element) : 24,
        widthUnit: resizeUnitInfo(found.node, "width", element, region.rect.width),
        heightUnit: resizeUnitInfo(found.node, "height", element, region.rect.height),
        xUnit: resizeUnitInfo(found.node, "x", element, bounds.left),
        yUnit: resizeUnitInfo(found.node, "y", element, bounds.top),
        parentHeightUnit: found.parent
          ? resizeUnitInfo(found.parent, "height", element.parentElement, bounds.height)
          : { unit: "px", basePixels: 1 }
      };
      setStatus("Resizing " + found.node.type + " " + region.edge);
    } else if (found.parent) {
      interaction = {
        type: "drag",
        nodeId: id,
        startX: event.clientX,
        startY: event.clientY,
        moved: false
      };
      setStatus("Dragging " + found.node.type);
    }

    if (interaction) {
      event.preventDefault();
      if (event.currentTarget.setPointerCapture) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }
  }

  function updateCanvasInteraction(event) {
    if (!interaction) {
      handleCanvasPointer(event);
      return;
    }
    if (interaction.type === "resize") {
      updateResize(event);
      return;
    }
    const dx = event.clientX - interaction.startX;
    const dy = event.clientY - interaction.startY;
    interaction.moved = interaction.moved || Math.sqrt(dx * dx + dy * dy) >= DRAG_DISTANCE;
    if (interaction.moved) {
      updateDropHighlight(event);
    }
  }

  async function finishCanvasInteraction(event) {
    if (!interaction) {
      return;
    }
    const current = interaction;
    interaction = null;
    if (event.currentTarget.releasePointerCapture && event.currentTarget.hasPointerCapture && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (current.type === "resize") {
      clearDropHighlight();
      renderPreview();
      setStatus("Resized");
      return;
    }

    const targetElement = current.moved ? layoutElementFromPoint(event.clientX, event.clientY, current.nodeId) : null;
    const targetId = targetElement ? targetElement.getAttribute("data-layout-id") : "";
    clearDropHighlight();
    if (targetId && (await moveNodeToTarget(current.nodeId, targetId, event))) {
      activeId = current.nodeId;
      renderPreview();
      setStatus("Moved");
    } else {
      activeId = current.nodeId;
      refreshOutlines();
      setStatus(current.moved ? "Move cancelled" : "Selected");
    }
  }

  function showMenu(menu, x, y) {
    hideMenus();
    menuFrozen = true;
    menu.hidden = false;
    menu.style.left = Math.min(x, window.innerWidth - menu.offsetWidth - 8) + "px";
    menu.style.top = Math.min(y, window.innerHeight - menu.offsetHeight - 8) + "px";
  }

  function showSubmenu(menu, sourceButton) {
    const rect = sourceButton.getBoundingClientRect();
    menu.hidden = false;
    menu.style.left = Math.min(rect.right + 4, window.innerWidth - menu.offsetWidth - 8) + "px";
    menu.style.top = Math.min(rect.top, window.innerHeight - menu.offsetHeight - 8) + "px";
  }

  function updatePlacementMenuState(kind) {
    const found = currentTarget();
    const target = found.node || root;
    const beforeButton = document.querySelector("#lbPlacementMenu [data-placement='before']");
    const afterButton = document.querySelector("#lbPlacementMenu [data-placement='after']");
    const childButton = document.querySelector("#lbPlacementMenu [data-placement='child']");
    const replaceButton = document.querySelector("#lbPlacementMenu [data-placement='replace']");
    const siblingAllowed = found.parent ? canInsertAsChild(kind, found.parent.type) : false;
    beforeButton.disabled = !siblingAllowed;
    afterButton.disabled = !siblingAllowed;
    childButton.disabled = !canInsertAsChild(kind, target.type);
    replaceButton.disabled = !canReplaceTarget({ type: kind }, found.parent);
  }

  function hideMenus() {
    menus.forEach((menu) => {
      menu.hidden = true;
    });
    pendingPlacementKind = "";
    menuFrozen = false;
  }

  function bindMenus() {
    const menu = document.getElementById("lbMenu");
    const addMenu = document.getElementById("lbAddMenu");
    const placementMenu = document.getElementById("lbPlacementMenu");
    menus.push(menu, addMenu, placementMenu);

    menu.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) {
        return;
      }
      const action = button.getAttribute("data-action");
      const open = button.getAttribute("data-menu-open");
      if (open === "add") {
        showSubmenu(addMenu, button);
      } else if (action === "edit") {
        const target = currentTarget().node || root;
        openEditor("edit", target.id, getActiveSource());
      } else if (action === "properties") {
        openProperties();
      } else if (action === "delete") {
        deleteActiveNode();
      }
    });

    addMenu.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) {
        return;
      }
      const kind = button.getAttribute("data-placement-kind");
      const action = button.getAttribute("data-action");
      if (kind) {
        pendingPlacementKind = kind;
        updatePlacementMenuState(kind);
        showSubmenu(placementMenu, button);
      } else if (action === "add-qhtml") {
        openEditor("add-qhtml", menuTargetId, "");
      }
    });

    placementMenu.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) {
        return;
      }
      insertNode(pendingPlacementKind, button.getAttribute("data-placement"));
      pendingPlacementKind = "";
    });

    document.addEventListener("click", (event) => {
      const insideMenu = menus.some((item) => item.contains(event.target));
      if (!insideMenu) {
        hideMenus();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hideMenus();
      }
    });
  }

  function bindDialogs() {
    document.getElementById("lbEditorSave").addEventListener("click", saveEditor);
    document.getElementById("lbEditorCancel").addEventListener("click", () => closeEditor(false));
    document.getElementById("lbEditorClose").addEventListener("click", () => closeEditor(false));
    document.getElementById("lbEditorDialog").addEventListener("cancel", (event) => {
      event.preventDefault();
      closeEditor(false);
    });

    document.getElementById("lbPropertiesSave").addEventListener("click", saveProperties);
    document.getElementById("lbPropertiesCancel").addEventListener("click", () => {
      document.getElementById("lbPropertiesDialog").close();
    });
    document.getElementById("lbPropertiesClose").addEventListener("click", () => {
      document.getElementById("lbPropertiesDialog").close();
    });
  }

  function bindToolbar() {
    document.getElementById("lbNew").addEventListener("click", () => {
      root = buildDefaultTree();
      activeId = root.id;
      renderPreview();
      setStatus("New layout");
    });
    document.getElementById("lbSave").addEventListener("click", exportFile);
    document.getElementById("lbOpen").addEventListener("click", () => {
      document.getElementById("lbOpenFile").click();
    });
    document.getElementById("lbOpenFile").addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) {
        openFile(file);
      }
      event.target.value = "";
    });
  }

  function bindCanvas() {
    const canvas = document.getElementById("layoutCanvas");
    canvas.addEventListener("pointerdown", startCanvasInteraction);
    canvas.addEventListener("pointermove", updateCanvasInteraction);
    canvas.addEventListener("pointerup", finishCanvasInteraction);
    canvas.addEventListener("pointercancel", finishCanvasInteraction);
    canvas.addEventListener("mouseleave", (event) => {
      if (!interaction) {
        canvas.style.cursor = "";
        handleCanvasPointer(event);
      }
    });
    canvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      handleCanvasPointer(event);
      menuTargetId = activeId || root.id;
      showMenu(document.getElementById("lbMenu"), event.clientX, event.clientY);
    });
  }

  function stripComments(source) {
    return String(source || "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
  }

  function findMatchingBrace(source, openIndex) {
    let depth = 0;
    let quote = "";
    let escape = false;
    for (let i = openIndex; i < source.length; i += 1) {
      const ch = source[i];
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
      if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === "{") {
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

  function parseLayoutSource(source) {
    const cleaned = stripComments(source);
    const match = /\b(q-layout|q-row|q-col)\b\s*([A-Za-z_][\w-]*)?\s*\{/.exec(cleaned);
    if (!match) {
      const qhtmlNode = createNode("qhtml", []);
      qhtmlNode.source = source;
      return qhtmlNode;
    }
    return parseLayoutAt(cleaned, match.index);
  }

  function parseLayoutAt(source, start) {
    const header = /\b(q-layout|q-row|q-col)\b\s*([A-Za-z_][\w-]*)?\s*\{/.exec(source.slice(start));
    if (!header) {
      return null;
    }
    const type = header[1];
    const name = header[2] || "";
    const open = start + header.index + header[0].lastIndexOf("{");
    const close = findMatchingBrace(source, open);
    const body = close >= 0 ? source.slice(open + 1, close) : "";
    const node = createNode(type, [], { label: false });
    node.name = name;
    parseProps(body, node);
    parseChildren(body, node);
    return node;
  }

  function topLevelText(body) {
    let depth = 0;
    let quote = "";
    let escape = false;
    let out = "";
    for (let i = 0; i < body.length; i += 1) {
      const ch = body[i];
      if (quote) {
        if (depth === 0) {
          out += ch;
        }
        if (escape) {
          escape = false;
        } else if (ch === "\\") {
          escape = true;
        } else if (ch === quote) {
          quote = "";
        }
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        if (depth === 0) {
          out += ch;
        }
      } else if (ch === "{") {
        depth += 1;
        if (depth === 1) {
          out += "\n";
        }
      } else if (ch === "}") {
        depth = Math.max(0, depth - 1);
        if (depth === 0) {
          out += "\n";
        }
      } else if (depth === 0) {
        out += ch;
      }
    }
    return out;
  }

  function stripPropertyLines(source) {
    return String(source || "")
      .replace(/^\s*[A-Za-z_][\w-]*\s*:\s*("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^\s{};]+)\s*;?/gm, "")
      .trim();
  }

  function parseProps(body, node) {
    const propertySource = topLevelText(body);
    const propRe = /^\s*([A-Za-z_][\w-]*)\s*:\s*("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^\s{};]+)/gm;
    let match;
    while ((match = propRe.exec(propertySource))) {
      const key = match[1];
      let value = match[2] || "";
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
      }
      if (key === "data-layout-id") {
        node.id = value || nextId();
      } else {
        node.props[key] = value;
      }
    }
  }

  function parseChildren(body, node) {
    let cursor = 0;
    const childRe = /\b(q-layout|q-row|q-col)\b\s*([A-Za-z_][\w-]*)?\s*\{/g;
    let match;
    while ((match = childRe.exec(body))) {
      const before = stripPropertyLines(body.slice(cursor, match.index));
      if (before) {
        const qhtmlNode = createNode("qhtml", []);
        qhtmlNode.source = before;
        node.children.push(qhtmlNode);
      }
      const open = match.index + match[0].lastIndexOf("{");
      const close = findMatchingBrace(body, open);
      if (close < 0) {
        break;
      }
      const parsed = parseLayoutAt(body, match.index);
      if (parsed) {
        node.children.push(parsed);
      }
      cursor = close + 1;
      childRe.lastIndex = cursor;
    }
    const tail = body.slice(cursor).trim();
    const cleanedTail = stripPropertyLines(tail);
    if (cleanedTail) {
      const qhtmlNode = createNode("qhtml", []);
      qhtmlNode.source = cleanedTail;
      node.children.push(qhtmlNode);
    }
  }

  function createPreviewHost() {
    const mount = document.getElementById("layoutPreviewMount");
    previewHost = document.createElement("q-html7");
    previewHost.id = "layoutPreview";
    previewHost.className = "lb-preview-host";
    mount.innerHTML = "";
    mount.appendChild(previewHost);
  }

  function init() {
    ensureLayoutBuilderChrome();
    if (previewHost) {
      return;
    }
    root = buildDefaultTree();
    activeId = root.id;
    createPreviewHost();
    bindToolbar();
    bindCanvas();
    bindMenus();
    bindDialogs();
    renderPreview();
  }

  window.QHTMLLayoutBuilder = Object.assign(window.QHTMLLayoutBuilder || {}, {
    dropQHTMLAtPoint: dropQHTMLAtPoint
  });

  if (document.getElementById("layoutPreviewMount")) {
    init();
  } else {
    document.addEventListener("QHTMLContentLoaded", init, { once: true });
  }
})();
