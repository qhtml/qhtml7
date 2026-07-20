(() => {
  "use strict";

  function ensureLayoutBuilderChrome() {
    if (document.getElementById("lbMenu") &&
        document.getElementById("lbEditorDialog") &&
        document.getElementById("lbPropertiesDialog") &&
        document.getElementById("lbCssColorDialog") &&
        document.getElementById("lbCssLengthDialog") &&
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

    .lb-preview-host [data-lb-builder-root="1"] {
      width: max-content !important;
      height: max-content !important;
      padding: 5vh 5vw !important;
      overflow: visible !important;
      box-sizing: border-box !important;
      background: rgba(248, 250, 252, 0.45);
    }

    .lb-preview-host [data-lb-builder-root="1"][data-lb-active="1"] {
      outline: 2px dashed rgba(37, 99, 235, 0.65);
      outline-offset: -2px;
      background: rgba(37, 99, 235, 0.035);
    }

    .lb-outline-list,
    .lb-outline-children {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .lb-outline-children {
      margin-left: 14px;
      padding-left: 8px;
      border-left: 1px solid #e2e8f0;
    }

    .lb-outline-row {
      width: 100%;
      min-height: 30px;
      display: grid;
      grid-template-columns: 22px minmax(0, 1fr);
      align-items: center;
      gap: 4px;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: #0f172a;
      padding: 3px 6px;
      text-align: left;
      cursor: pointer;
    }

    .lb-outline-row:hover {
      background: #eff6ff;
    }

    .lb-outline-row.active {
      background: #dbeafe;
      color: #1d4ed8;
      font-weight: 850;
    }

    .lb-outline-marker {
      width: 18px;
      height: 18px;
      display: inline-grid;
      place-items: center;
      border-radius: 5px;
      color: #64748b;
      font-size: 12px;
      font-weight: 850;
    }

    .lb-outline-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      line-height: 1.25;
    }

    .lb-outline-type {
      color: #64748b;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .layout-builder-workspace.collapsed .layout-builder-outline-title,
    .layout-builder-workspace.collapsed .layout-builder-outline-tree {
      display: none;
    }

    .layout-builder-workspace.collapsed .layout-builder-outline {
      overflow: visible;
    }

    .layout-builder-workspace.collapsed .layout-builder-outline-header {
      min-height: 100%;
      justify-content: center;
      padding: 0;
      border-bottom: 0;
    }

    .layout-builder-workspace.collapsed .layout-builder-outline-toggle {
      position: absolute;
      top: 10px;
      right: 1px;
      z-index: 5001;
      width: 18px;
      height: 34px;
      min-width: 18px;
      padding: 0;
      border-radius: 7px 0 0 7px;
    }

    .layout-builder-workspace.collapsed {
      grid-template-columns: minmax(0, 1fr) 12px !important;
    }

    /*
     * The runtime emits the QHTML layout nodes as flex boxes.  Keep the
     * alternating row/column cross axis fluid while the main axis is governed
     * by the builder's min/max constraints.
     */
    .lb-preview-host [qhtml-layout="q-row"] {
      align-items: stretch !important;
    }

    .lb-preview-host [qhtml-layout="q-row"] > [qhtml-layout="q-col"],
    .lb-preview-host [qhtml-layout="q-row"] > [qhtml-layout="q-layout"] {
      height: auto !important;
      align-self: stretch !important;
    }

    .lb-preview-host [qhtml-layout="q-col"],
    .lb-preview-host [qhtml-layout="q-layout"] {
      align-items: stretch !important;
    }

    .lb-preview-host [qhtml-layout="q-col"] > [qhtml-layout="q-row"],
    .lb-preview-host [qhtml-layout="q-layout"] > [qhtml-layout="q-row"] {
      width: 100% !important;
      align-self: stretch !important;
    }
  </style>

  <input id="lbOpenFile" type="file" accept=".qhtml,.txt,text/plain" hidden>

  <div id="lbMenu" class="lb-context-menu" hidden>
    <button class="lb-menu-item" type="button" data-menu-open="add">Add... <span class="lb-chevron">&rsaquo;</span></button>
    <button class="lb-menu-item" type="button" data-action="edit">Edit...</button>
    <button class="lb-menu-item" type="button" data-action="properties">Properties...</button>
    <button class="lb-menu-item" type="button" data-menu-open="css">CSS... <span class="lb-chevron">&rsaquo;</span></button>
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

  <div id="lbCssMenu" class="lb-submenu" hidden>
    <button class="lb-menu-item" type="button" data-css-menu-open="colors">Colors <span class="lb-chevron">&rsaquo;</span></button>
    <button class="lb-menu-item" type="button" data-css-menu-open="size">Size <span class="lb-chevron">&rsaquo;</span></button>
    <button class="lb-menu-item" type="button" data-css-menu-open="spacing">Spacing <span class="lb-chevron">&rsaquo;</span></button>
    <button class="lb-menu-item" type="button" data-css-menu-open="border">Border <span class="lb-chevron">&rsaquo;</span></button>
    <button class="lb-menu-item" type="button" data-css-menu-open="text">Text <span class="lb-chevron">&rsaquo;</span></button>
  </div>

  <div id="lbCssColorsMenu" class="lb-submenu lb-css-property-menu" hidden>
    <button class="lb-menu-item" type="button" data-css-kind="color" data-css-property="backgroundColor">Background Color</button>
    <button class="lb-menu-item" type="button" data-css-kind="color" data-css-property="color">Text Color</button>
    <button class="lb-menu-item" type="button" data-css-kind="color" data-css-property="borderColor">Border Color</button>
  </div>

  <div id="lbCssSizeMenu" class="lb-submenu lb-css-property-menu" hidden>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="width" data-css-dimension="width">Width</button>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="height" data-css-dimension="height">Height</button>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="minWidth" data-css-dimension="width">Min Width</button>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="minHeight" data-css-dimension="height">Min Height</button>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="maxWidth" data-css-dimension="width">Max Width</button>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="maxHeight" data-css-dimension="height">Max Height</button>
  </div>

  <div id="lbCssSpacingMenu" class="lb-submenu lb-css-property-menu" hidden>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="gap" data-css-dimension="width">Gap</button>
    <div class="lb-menu-separator"></div>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="padding" data-css-dimension="width">Padding</button>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="paddingLeft" data-css-dimension="width">Padding Left</button>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="paddingRight" data-css-dimension="width">Padding Right</button>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="paddingTop" data-css-dimension="height">Padding Top</button>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="paddingBottom" data-css-dimension="height">Padding Bottom</button>
    <div class="lb-menu-separator"></div>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="marginLeft" data-css-dimension="width">Margin Left</button>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="marginRight" data-css-dimension="width">Margin Right</button>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="marginTop" data-css-dimension="height">Margin Top</button>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="marginBottom" data-css-dimension="height">Margin Bottom</button>
  </div>

  <div id="lbCssBorderMenu" class="lb-submenu lb-css-property-menu" hidden>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="borderWidth" data-css-dimension="width">Border Width</button>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="borderRadius" data-css-dimension="width">Border Radius</button>
  </div>

  <div id="lbCssTextMenu" class="lb-submenu lb-css-property-menu" hidden>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="fontSize" data-css-dimension="width">Font Size</button>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="letterSpacing" data-css-dimension="width">Letter Spacing</button>
    <button class="lb-menu-item" type="button" data-css-kind="length" data-css-property="lineHeight" data-css-dimension="height">Line Height</button>
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
          <label for="lbPropMinHeight">Min Height</label>
          <input id="lbPropMinHeight" type="text" placeholder="inherit">
        </div>
        <div class="lb-field">
          <label for="lbPropMaxWidth">Max Width</label>
          <input id="lbPropMaxWidth" type="text" placeholder="inherit">
        </div>
        <div class="lb-field">
          <label for="lbPropMaxHeight">Max Height</label>
          <input id="lbPropMaxHeight" type="text" placeholder="inherit">
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

  <dialog id="lbCssColorDialog" class="lb-dialog lb-drop-dialog">
    <div class="lb-dialog-header">
      <h2 id="lbCssColorTitle" class="lb-dialog-title">CSS Color</h2>
      <button id="lbCssColorClose" class="lb-button" type="button">Close</button>
    </div>
    <div class="lb-dialog-body">
      <div class="lb-form-grid">
        <div class="lb-field">
          <label for="lbCssColorValue">Color</label>
          <input id="lbCssColorValue" type="color" value="#ffffff">
        </div>
        <div class="lb-field">
          <label for="lbCssColorText">Value</label>
          <input id="lbCssColorText" type="text" placeholder="#ffffff">
        </div>
      </div>
    </div>
    <div class="lb-dialog-actions">
      <button id="lbCssColorCancel" class="lb-button" type="button">Cancel</button>
      <button id="lbCssColorSave" class="lb-button primary" type="button">Save</button>
    </div>
  </dialog>

  <dialog id="lbCssLengthDialog" class="lb-dialog lb-drop-dialog">
    <div class="lb-dialog-header">
      <h2 id="lbCssLengthTitle" class="lb-dialog-title">CSS Length</h2>
      <button id="lbCssLengthClose" class="lb-button" type="button">Close</button>
    </div>
    <div class="lb-dialog-body">
      <div class="lb-form-grid">
        <div class="lb-field">
          <label for="lbCssLengthNumber">Number</label>
          <input id="lbCssLengthNumber" type="number" step="0.01">
        </div>
        <div class="lb-field">
          <label for="lbCssLengthUnit">Unit</label>
          <select id="lbCssLengthUnit">
            <option value="px">px</option>
            <option value="%">%</option>
            <option value="vw">vw</option>
            <option value="vh">vh</option>
            <option value="vmin">vmin</option>
            <option value="vmax">vmax</option>
            <option value="rem">rem</option>
            <option value="em">em</option>
          </select>
        </div>
      </div>
    </div>
    <div class="lb-dialog-actions">
      <button id="lbCssLengthCancel" class="lb-button" type="button">Cancel</button>
      <button id="lbCssLengthSave" class="lb-button primary" type="button">Save</button>
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
  let cssEditState = null;
  let nodeCounter = 0;
  let interaction = null;
  let dropTargetId = "";
  let menuFrozen = false;
  let outlineCollapsed = false;
  const scopedImports = [];
  const scopedImportSources = Object.create(null);
  const collapsedOutlineIds = new Set();

  const DEFAULT_QHTML = 'div { padding: "18px"; text { Edit this QHTML content. } }';
  const menus = [];
  const EDGE_MIN = 8;
  const EDGE_MAX = 22;
  const EDGE_RATIO = 0.1;
  const DRAG_DISTANCE = 5;
  const DEFAULT_LAYOUT_VALUE = "inherit";
  const BUILDER_ROOT_PADDING = "5vh 5vw";
  const CSS_LABELS = {
    backgroundColor: "Background Color",
    color: "Text Color",
    borderColor: "Border Color",
    width: "Width",
    height: "Height",
    minWidth: "Min Width",
    minHeight: "Min Height",
    maxWidth: "Max Width",
    maxHeight: "Max Height",
    gap: "Gap",
    padding: "Padding",
    paddingLeft: "Padding Left",
    paddingRight: "Padding Right",
    paddingTop: "Padding Top",
    paddingBottom: "Padding Bottom",
    marginLeft: "Margin Left",
    marginRight: "Margin Right",
    marginTop: "Margin Top",
    marginBottom: "Margin Bottom",
    borderWidth: "Border Width",
    borderRadius: "Border Radius",
    fontSize: "Font Size",
    letterSpacing: "Letter Spacing",
    lineHeight: "Line Height"
  };
  const EDITABLE_LAYOUT_PROPS = [
    "width",
    "height",
    "flex",
    "gap",
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight",
    "minColWidth",
    "wrap"
  ];

  const RESIZE_AXIS = Object.freeze({
    horizontal: Object.freeze({
      name: "horizontal",
      coordinate: "clientX",
      size: "width",
      min: "minWidth",
      max: "maxWidth",
      startEdge: "left",
      endEdge: "right",
      rectStart: "left",
      rectEnd: "right",
      scrollSize: "scrollWidth",
      gapStyle: "columnGap"
    }),
    vertical: Object.freeze({
      name: "vertical",
      coordinate: "clientY",
      size: "height",
      min: "minHeight",
      max: "maxHeight",
      startEdge: "top",
      endEdge: "bottom",
      rectStart: "top",
      rectEnd: "bottom",
      scrollSize: "scrollHeight",
      gapStyle: "rowGap"
    })
  });
  const RESIZE_MINIMUM_PIXELS = 24;
  const RESIZE_EPSILON = 0.5;

  function nextId() {
    nodeCounter += 1;
    return "lb-node-" + Date.now().toString(36) + "-" + nodeCounter.toString(36);
  }

  function createNode(type, children, options) {
    const nodeChildren = Array.isArray(children) ? children.slice() : [];
    return {
      id: nextId(),
      type: type,
      name: "",
      props: defaultPropsFor(type),
      propEntries: [],
      source: type === "qhtml" ? DEFAULT_QHTML : "",
      children: nodeChildren
    };
  }

  function defaultPropsFor(type) {
    if (type === "q-layout") {
      return defaultLayoutProps();
    }
    if (type === "q-row") {
      return defaultLayoutProps({
        width: DEFAULT_LAYOUT_VALUE,
        height: "20vh",
        minWidth: "1vw",
        minHeight: "1vh"
      });
    }
    if (type === "q-col") {
      return defaultLayoutProps({
        width: "20vw",
        height: DEFAULT_LAYOUT_VALUE,
        minWidth: "1vw"
      });
    }
    return {};
  }

  function defaultLayoutProps(overrides) {
    const values = overrides || {};
    return EDITABLE_LAYOUT_PROPS.reduce((props, key) => {
      props[key] = Object.prototype.hasOwnProperty.call(values, key) ? values[key] : DEFAULT_LAYOUT_VALUE;
      return props;
    }, {});
  }

  function isLayoutType(type) {
    return type === "q-layout" || type === "q-row" || type === "q-col";
  }

  function isBuilderRoot(node) {
    return !!(node && node.builderRoot === true);
  }

  function createBuilderRoot(children) {
    const node = createNode("q-layout", Array.isArray(children) ? children : [], { label: false });
    node.builderRoot = true;
    node.name = "";
    node.props = normalizedPropsFor("q-layout", {
      width: "max-content",
      height: "max-content",
      minWidth: "75vw",
      minHeight: "75vh",
      padding: BUILDER_ROOT_PADDING,
      gap: "12px",
      overflow: "visible",
      "data-lb-builder-root": "1"
    });
    return node;
  }

  function userRootNodes() {
    if (!root) {
      return [];
    }
    return isBuilderRoot(root) ? (root.children || []) : [root];
  }

  function firstUserRoot() {
    return userRootNodes()[0] || null;
  }

  function wrapAsBuilderRoot(node) {
    if (!node) {
      return createBuilderRoot([buildDefaultUserTree()]);
    }
    if (isBuilderRoot(node)) {
      return node;
    }
    return createBuilderRoot([node]);
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
      "min-height": "minHeight",
      "max-width": "maxWidth",
      "max-height": "maxHeight",
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

  function canonicalLayoutPropKey(key) {
    const aliases = {
      "min-width": "minWidth",
      "min-height": "minHeight",
      "max-width": "maxWidth",
      "max-height": "maxHeight",
      "min-col-width": "minColWidth",
      "flex-wrap": "wrap",
      flexWrap: "wrap"
    };
    return aliases[key] || key;
  }

  function recordPropertyEntry(node, key, kind) {
    if (!node || !key) {
      return;
    }
    if (!Array.isArray(node.propEntries)) {
      node.propEntries = [];
    }
    const canonical = canonicalLayoutPropKey(key);
    if (node.propEntries.some((entry) => entry && canonicalLayoutPropKey(entry.key) === canonical)) {
      return;
    }
    node.propEntries.push({
      key: key,
      kind: kind || "assignment"
    });
  }

  function setNodeProp(node, key, value, kind) {
    if (!node || !key) {
      return;
    }
    node.props = normalizedPropsFor(node.type, node.props);
    const canonical = canonicalLayoutPropKey(key);
    recordPropertyEntry(node, key, kind);
    node.props[canonical] = value;
  }

  function layoutFlowAxis(parent) {
    if (!parent) {
      return "";
    }
    return parent.type === "q-row" ? "horizontal" : "vertical";
  }

  function normalizeLayoutFillTree(node, parent) {
    if (!node) {
      return null;
    }
    if (node.type !== "qhtml") {
      node.props = normalizedPropsFor(node.type, node.props);
      if (parent && layoutFlowAxis(parent) === "horizontal") {
        node.props.height = DEFAULT_LAYOUT_VALUE;
      }
      if (parent && layoutFlowAxis(parent) === "vertical") {
        node.props.width = DEFAULT_LAYOUT_VALUE;
      }
    }
    node.children = (node.children || [])
      .map((child) => normalizeLayoutFillTree(child, node))
      .filter(Boolean);
    return node;
  }

  function normalizeTree(node) {
    return normalizeLayoutFillTree(node, null);
  }

  function enforceRenderedFill(node, parent) {
    if (!node) {
      return;
    }
    if (node.type !== "qhtml") {
      const element = layoutElementById(node.id);
      if (element) {
        element.style.alignItems = "stretch";
        if (parent && layoutFlowAxis(parent) === "horizontal") {
          element.style.height = "auto";
          element.style.alignSelf = "stretch";
        }
        if (parent && layoutFlowAxis(parent) === "vertical") {
          element.style.width = "100%";
          element.style.alignSelf = "stretch";
        }
      }
    }
    (node.children || []).forEach((child) => enforceRenderedFill(child, node));
  }

  function buildDefaultUserTree() {
    return createNode("q-layout", [
      createNode("q-row", [
        createNode("q-col", [
          createNode("qhtml", [])
        ])
      ])
    ]);
  }

  function buildDefaultTree() {
    return createBuilderRoot([buildDefaultUserTree()]);
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
      "minHeight",
      "maxWidth",
      "maxHeight",
      "minColWidth",
      "wrap"
    ];
    const emitted = new Set();
    (node.propEntries || []).forEach((entry) => {
      if (!entry || !entry.key || entry.key === "data-layout-id") {
        return;
      }
      const canonical = canonicalLayoutPropKey(entry.key);
      if (emitted.has(canonical)) {
        return;
      }
      const value = String(Object.prototype.hasOwnProperty.call(props, canonical) ? props[canonical] : props[entry.key] || "").trim();
      if (!value) {
        return;
      }
      const prefix = entry.kind === "q-property" ? "q-property " : "";
      lines.push(indent(level) + prefix + entry.key + ': "' + escapeQhtmlString(value) + '"');
      emitted.add(canonical);
    });

    const keys = orderedKeys.concat(Object.keys(props).filter((key) => !orderedKeys.includes(key)).sort());
    keys.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(props, key)) {
        return;
      }
      const canonical = canonicalLayoutPropKey(key);
      if (emitted.has(canonical) || key === "data-layout-id") {
        return;
      }
      const value = String(props[key] || "").trim();
      if (value) {
        lines.push(indent(level) + key + ': "' + escapeQhtmlString(value) + '"');
        emitted.add(canonical);
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
      fetchScopedImportSource(value);
    }
  }

  function clearScopedImports() {
    scopedImports.splice(0, scopedImports.length);
  }

  function sourceWithScopedImports(source) {
    const body = String(source || "");
    if (!scopedImports.length) {
      return body;
    }
    return scopedImports.map((path) => "q-import { " + path + " }").join("\n") + "\n\n" + body;
  }

  function importUrl(path) {
    return new URL(String(path || ""), document.baseURI).href;
  }

  function fetchScopedImportSource(path) {
    const key = String(path || "").trim();
    if (!key) {
      return Promise.resolve("");
    }
    const cached = scopedImportSources[key];
    if (cached && Object.prototype.hasOwnProperty.call(cached, "source")) {
      return Promise.resolve(cached.source);
    }
    if (cached && cached.promise) {
      return cached.promise;
    }
    const promise = fetch(importUrl(key))
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to inline q-import " + key + ": " + response.status);
        }
        return response.text();
      })
      .then((text) => {
        scopedImportSources[key] = { source: text };
        return text;
      });
    scopedImportSources[key] = { promise: promise };
    return promise;
  }

  function topLevelComponentBlocks(source) {
    const text = String(source || "");
    const blocks = [];
    const componentRe = /\bq-component\s+([A-Za-z_][\w-]*)\b[^{]*\{/y;
    let quote = "";
    let escape = false;
    for (let index = 0; index < text.length; index += 1) {
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
      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        continue;
      }
      componentRe.lastIndex = index;
      const match = componentRe.exec(text);
      if (!match) {
        continue;
      }
      const open = componentRe.lastIndex - 1;
      const close = findMatchingBrace(text, open);
      if (close < 0) {
        continue;
      }
      blocks.push({
        name: match[1],
        source: text.slice(index, close + 1).trim()
      });
      index = close;
    }
    return blocks;
  }

  function inlineImportSource(path, source) {
    const normalizedPath = String(path || "").replace(/\\/g, "/");
    if (normalizedPath.endsWith("page-builder/palette.qhtml")) {
      return topLevelComponentBlocks(source)
        .filter((block) => block.name !== "pageBuilderPalette" && block.name !== "page-builder-palette")
        .map((block) => block.source)
        .join("\n\n");
    }
    return String(source || "").trim();
  }

  async function sourceWithInlinedImports(source) {
    const body = String(source || "").trim();
    if (!scopedImports.length) {
      return body;
    }
    const inlined = [];
    for (const path of scopedImports) {
      const importSource = await fetchScopedImportSource(path);
      const portableSource = inlineImportSource(path, importSource);
      if (portableSource.trim()) {
        inlined.push(portableSource.trim());
      }
    }
    return inlined.concat(body ? [body] : []).join("\n\n");
  }

  function normalizeEditorQHTMLSource(source) {
    const normalized = normalizeQHTMLThroughDomTree(source);
    const split = splitTopLevelImports(normalized);
    split.imports.forEach(addScopedImport);
    return split.source || "";
  }

  function qhtmlModule() {
    return window.QHTML7 && window.QHTML7.Module ? window.QHTML7.Module : null;
  }

  function createQHTMLDomTree(source) {
    const Module = qhtmlModule();
    if (!Module || typeof Module.QHTMLDomTree !== "function") {
      return null;
    }
    const tree = new Module.QHTMLDomTree();
    if (typeof tree.fromQHTML === "function") {
      tree.fromQHTML(String(source || ""));
      return tree;
    }
    if (typeof Module.QHTMLParser === "function" && typeof tree.loadFromAST === "function") {
      const parser = new Module.QHTMLParser();
      tree.loadFromAST(parser.parse(String(source || "")));
      if (typeof parser.delete === "function") {
        parser.delete();
      }
      return tree;
    }
    return tree;
  }

  function disposeQHTMLObject(value) {
    if (value && typeof value.delete === "function") {
      value.delete();
    }
  }

  function normalizeQHTMLThroughDomTree(source) {
    const tree = createQHTMLDomTree(source);
    if (!tree) {
      return String(source || "");
    }
    try {
      if (typeof tree.toQHTML === "function") {
        return tree.toQHTML();
      }
      if (typeof tree.sourceQHTML === "function") {
        return tree.sourceQHTML();
      }
      return String(source || "");
    } finally {
      disposeQHTMLObject(tree);
    }
  }

  function qhtmlChildArray(node) {
    if (!node) {
      return [];
    }
    const list = typeof node.childList === "function" ? node.childList() : null;
    const count = typeof node.childCount === "function"
      ? Number(node.childCount()) || 0
      : Number(list && list.length) || 0;
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const child = typeof node.childAt === "function" ? node.childAt(i) : list[i];
      if (child) {
        out.push(child);
      }
    }
    return out;
  }

  function sourceHasSingleLayoutRoot(source) {
    const tree = createQHTMLDomTree(source);
    if (!tree) {
      return false;
    }
    try {
      const children = qhtmlChildArray(tree).filter(Boolean);
      if (children.length !== 1 || typeof children[0].qhtmlType !== "function") {
        return false;
      }
      return isLayoutQHTMLType(children[0].qhtmlType());
    } finally {
      disposeQHTMLObject(tree);
    }
  }

  function isLayoutQHTMLType(type) {
    return type === "QHTMLLayout" || type === "QHTMLRowLayout" || type === "QHTMLColumnLayout";
  }

  function splitTopLevelImports(source) {
    const text = String(source || "");
    const imports = [];
    let output = "";
    let cursor = 0;
    let depth = 0;
    let quote = "";
    let escape = false;
    const importRe = /\bq-import\s*\{/y;

    for (let index = 0; index < text.length; index += 1) {
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
      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        continue;
      }
      if (ch === "{") {
        depth += 1;
        continue;
      }
      if (ch === "}") {
        depth = Math.max(0, depth - 1);
        continue;
      }
      if (depth !== 0) {
        continue;
      }
      importRe.lastIndex = index;
      const match = importRe.exec(text);
      if (!match) {
        continue;
      }
      const open = importRe.lastIndex - 1;
      const close = findMatchingBrace(text, open);
      if (close < 0) {
        continue;
      }
      output += text.slice(cursor, index);
      imports.push(text.slice(open + 1, close).trim());
      cursor = close + 1;
      index = close;
    }

    output += text.slice(cursor);
    return {
      imports: imports,
      source: output.trim()
    };
  }

  function qhtmlAssignmentValue(node, name) {
    const children = qhtmlChildArray(node);
    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];
      if (!child ||
          typeof child.qhtmlType !== "function" ||
          typeof child.qhtmlName !== "function" ||
          child.qhtmlType() !== "QHTMLPropertyAssignment" ||
          child.qhtmlName() !== name) {
        continue;
      }
      const source = typeof child.sourceQHTML === "function" ? child.sourceQHTML() : child.toQHTML();
      const match = /^[^:]+:\s*("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^\s{};]+)/.exec(String(source || "").trim());
      if (!match) {
        return "";
      }
      let value = match[1];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
      }
      return value;
    }
    return "";
  }

  function qhtmlNodeByLayoutId(node, id) {
    if (!node) {
      return null;
    }
    if (qhtmlAssignmentValue(node, "data-layout-id") === id) {
      return node;
    }
    const children = qhtmlChildArray(node);
    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];
      if (!child || typeof child.qhtmlType !== "function" || !isLayoutQHTMLType(child.qhtmlType())) {
        continue;
      }
      const found = qhtmlNodeByLayoutId(child, id);
      if (found) {
        return found;
      }
    }
    return null;
  }

  function qhtmlNodeIsLayoutScaffold(node) {
    if (!node || typeof node.qhtmlType !== "function") {
      return false;
    }
    const type = node.qhtmlType();
    if (type !== "QHTMLDomTree" && !isLayoutQHTMLType(type) && type !== "QHTMLPropertyAssignment") {
      return false;
    }
    const children = qhtmlChildArray(node);
    for (let i = 0; i < children.length; i += 1) {
      if (!qhtmlNodeIsLayoutScaffold(children[i])) {
        return false;
      }
    }
    return true;
  }

  function qhtmlChildIndex(parent, child) {
    const children = qhtmlChildArray(parent);
    const childUuid = child && typeof child.qhtmlUUID === "function" ? child.qhtmlUUID() : "";
    for (let i = 0; i < children.length; i += 1) {
      const current = children[i];
      if (current === child) {
        return i;
      }
      if (childUuid && current && typeof current.qhtmlUUID === "function" && current.qhtmlUUID() === childUuid) {
        return i;
      }
    }
    return -1;
  }

  function loadPreviewSourceFromDomTree(source) {
    const parsed = parseLayoutSource(source);
    root = wrapAsBuilderRoot(parsed || buildDefaultUserTree());
  }

  function insertNodeViaDomTree(kind, placement) {
    const found = currentTarget();
    const target = found.node || root;
    const parent = found.parent;
    const next = createNode(kind, []);
    const tree = createQHTMLDomTree(previewSource());
    if (!tree) {
      return false;
    }
    try {
      if (!qhtmlNodeIsLayoutScaffold(tree)) {
        return false;
      }
      const targetNode = qhtmlNodeByLayoutId(tree, target.id);
      if (!targetNode) {
        return false;
      }
      const parentNode = parent ? qhtmlNodeByLayoutId(tree, parent.id) : null;
      const nextSource = modelToQHTML(next, 0);
      if (placement === "child") {
        if (!canInsertAsChild(kind, target.type)) {
          hideMenus();
          setStatus(kind + " cannot be a child of " + target.type);
          return true;
        }
        targetNode.appendQHTMLSource(nextSource);
      } else if (placement === "replace") {
        if (isBuilderRoot(target)) {
          hideMenus();
          setStatus("The builder root cannot be replaced");
          return true;
        }
        if (!canReplaceTarget(next, parent)) {
          hideMenus();
          setStatus(kind + " cannot replace this target");
          return true;
        }
        if (parentNode) {
          const index = qhtmlChildIndex(parentNode, targetNode);
          parentNode.replaceChildWithQHTMLSource(index, nextSource);
        } else {
          tree.clearChildren();
          tree.appendQHTMLSource(nextSource);
        }
      } else if ((placement === "before" || placement === "after") && parentNode) {
        if (!canInsertAsChild(kind, parent.type)) {
          hideMenus();
          setStatus(kind + " cannot be added beside this target");
          return true;
        }
        const index = qhtmlChildIndex(parentNode, targetNode);
        parentNode.insertQHTMLSource(index + (placement === "after" ? 1 : 0), nextSource);
      } else {
        targetNode.appendQHTMLSource(nextSource);
      }
      loadPreviewSourceFromDomTree(tree.toQHTML());
      activeId = next.id;
      hideMenus();
      renderPreview();
      setStatus(kind + " added");
      return true;
    } finally {
      disposeQHTMLObject(tree);
    }
  }

  function currentSource() {
    const roots = userRootNodes();
    const source = roots.length
      ? roots.map((node) => modelToQHTML(node, 0)).join("\n\n")
      : "";
    return sourceWithScopedImports(source);
  }

  function previewSource() {
    normalizeLayoutFillTree(root, null);
    return modelToQHTML(root, 0);
  }

  function renderedPreviewSource() {
    return sourceWithScopedImports(previewSource());
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
    const source = renderedPreviewSource();
    previewHost.qhtmlSource = source;
    if (typeof previewHost.fromQHTML === "function") {
      previewHost.fromQHTML(source);
    } else if (window.QHTML7 && window.QHTML7.runtime && typeof window.QHTML7.runtime.mountElement === "function") {
      previewHost.textContent = source;
      window.QHTML7.runtime.mountElement(previewHost);
    } else {
      previewHost.textContent = source;
    }
    window.setTimeout(() => {
      enforceRenderedFill(root, null);
      refreshOutlines();
    }, 0);
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
    renderOutline();
  }

  function outlineTypeLabel(node) {
    if (isBuilderRoot(node)) {
      return "root";
    }
    if (!node) {
      return "";
    }
    if (node.type === "q-layout") {
      return "layout";
    }
    if (node.type === "q-row") {
      return "row";
    }
    if (node.type === "q-col") {
      return "column";
    }
    return "qhtml";
  }

  function qhtmlNodeSummary(node) {
    if (node.meta && node.meta.displayName) {
      return String(node.meta.displayName);
    }
    const source = String(node.source || "")
      .replace(/^\s*q-import\s*\{[^}]*\}\s*$/gm, "")
      .trim();
    const first = /^([A-Za-z_][\w-]*(?:[#.][^\s{]+)?)/.exec(source);
    return first ? first[1] : "QHTML Content";
  }

  function outlineLabel(node) {
    if (isBuilderRoot(node)) {
      return "Canvas Root";
    }
    if (node.type === "q-layout") {
      return node.name ? "Layout " + node.name : "Layout";
    }
    if (node.type === "q-row") {
      return node.name ? "Row " + node.name : "Row";
    }
    if (node.type === "q-col") {
      return node.name ? "Column " + node.name : "Column";
    }
    return qhtmlNodeSummary(node);
  }

  function renderOutlineNode(parent, node) {
    const item = document.createElement("li");
    const row = document.createElement("button");
    const marker = document.createElement("span");
    const labelWrap = document.createElement("span");
    const title = document.createElement("span");
    const type = document.createElement("span");
    const children = node.children || [];
    const hasChildren = children.length > 0;
    const collapsed = collapsedOutlineIds.has(node.id);

    item.className = "lb-outline-item";
    item.dataset.nodeId = node.id;
    row.type = "button";
    row.className = "lb-outline-row" + (node.id === activeId ? " active" : "");
    row.dataset.nodeId = node.id;
    marker.className = "lb-outline-marker";
    marker.textContent = hasChildren ? (collapsed ? ">" : "v") : "";
    labelWrap.className = "lb-outline-label";
    title.textContent = outlineLabel(node);
    type.className = "lb-outline-type";
    type.textContent = outlineTypeLabel(node);

    labelWrap.appendChild(title);
    labelWrap.appendChild(document.createTextNode(" "));
    labelWrap.appendChild(type);
    row.appendChild(marker);
    row.appendChild(labelWrap);
    row.addEventListener("click", () => {
      activeId = node.id;
      menuTargetId = "";
      refreshOutlines();
      setStatus("Selected " + outlineLabel(node));
    });
    marker.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!hasChildren) {
        return;
      }
      if (collapsedOutlineIds.has(node.id)) {
        collapsedOutlineIds.delete(node.id);
      } else {
        collapsedOutlineIds.add(node.id);
      }
      renderOutline();
    });
    item.appendChild(row);

    if (hasChildren && !collapsed) {
      const list = document.createElement("ul");
      list.className = "lb-outline-children";
      children.forEach((child) => {
        renderOutlineNode(list, child);
      });
      item.appendChild(list);
    }

    parent.appendChild(item);
  }

  function renderOutline() {
    const host = document.getElementById("lbOutlineTree");
    if (!host || !root) {
      return;
    }
    host.innerHTML = "";
    const list = document.createElement("ul");
    list.className = "lb-outline-list";
    renderOutlineNode(list, root);
    host.appendChild(list);
  }

  function applyOutlineCollapsed() {
    const workspace = document.getElementById("layoutBuilderWorkspace");
    const button = document.getElementById("lbOutlineToggle");
    if (workspace) {
      workspace.classList.toggle("collapsed", outlineCollapsed);
      workspace.style.gridTemplateColumns = outlineCollapsed ? "minmax(0, 1fr) 12px" : "minmax(0, 1fr) 300px";
    }
    if (button) {
      button.textContent = outlineCollapsed ? "<" : ">";
      button.setAttribute("aria-expanded", outlineCollapsed ? "false" : "true");
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
    return nearestLayoutElement(document.elementFromPoint(event.clientX, event.clientY) || event.target);
  }

  function layoutElementForResizeEvent(event) {
    const mount = document.getElementById("layoutPreviewMount");
    let current = document.elementFromPoint(event.clientX, event.clientY) || event.target;
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

  function resizeEdgeForNode(node, parent, edge) {
    if (!edge || !node || isBuilderRoot(node)) {
      return "";
    }
    const axis = axisForEdge(edge);
    if (!axis) {
      return "";
    }

    if (node.type === "q-col") {
      if (axis.name !== "horizontal") {
        return "";
      }
      if (edge === "left" &&
          parent &&
          layoutFlowAxis(parent) === "horizontal" &&
          !hasPreviousFlowSibling(node, parent, axis, null)) {
        return "";
      }
      return edge;
    }

    if (node.type === "q-row") {
      if (axis.name !== "vertical") {
        return "";
      }
      if (edge === "top" &&
          parent &&
          layoutFlowAxis(parent) === "vertical" &&
          !hasPreviousFlowSibling(node, parent, axis, null)) {
        return "";
      }
      return edge;
    }

    if (node.type === "q-layout") {
      if (edgeIsStart(edge, axis) &&
          parent &&
          layoutFlowAxis(parent) === axis.name &&
          !hasPreviousFlowSibling(node, parent, axis, null)) {
        return "";
      }
      return edge;
    }

    return "";
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

  function createQHTMLNodeFromSource(source, meta) {
    const node = createNode("qhtml", []);
    node.source = String(source || "").trim();
    node.meta = meta || {};
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
    const qhtmlNode = createQHTMLNodeFromSource(qhtmlSource, meta);
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
    if (isBuilderRoot(found.node)) {
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
    if (!found.parent || isBuilderRoot(found.node)) {
      root = wrapAsBuilderRoot(sourceNode);
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
    if (isBuilderRoot(source.node) || isBuilderRoot(target.node)) {
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
      if (isBuilderRoot(target.node)) {
        const sourceNode = detachNode(sourceId);
        if (!sourceNode) {
          return false;
        }
        target.node.children.push(sourceNode);
        return true;
      }
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

  function selectedElementForNode(node) {
    if (!node || node.type === "qhtml") {
      return null;
    }
    return layoutElementById(node.id);
  }

  function layoutElementById(id, scope) {
    if (!id) {
      return null;
    }
    const selector = '[data-layout-id="' + CSS.escape(id) + '"]';
    if (scope) {
      const direct = Array.from(scope.children || []).find((child) => {
        return child.getAttribute && child.getAttribute("data-layout-id") === id;
      });
      if (direct) {
        return direct;
      }
      const scoped = scope.querySelector(selector);
      if (scoped) {
        return scoped;
      }
    }
    return document.querySelector(selector);
  }

  function layoutDescendantBounds(element) {
    if (!element) {
      return null;
    }
    const own = element.getBoundingClientRect();
    const descendants = Array.from(element.querySelectorAll("*")).filter((child) => {
      const rect = child.getBoundingClientRect();
      return rect.width > 0 || rect.height > 0;
    });
    if (!descendants.length) {
      return {
        width: Math.max(RESIZE_MINIMUM_PIXELS, own.width),
        height: Math.max(RESIZE_MINIMUM_PIXELS, own.height)
      };
    }

    let left = own.left;
    let top = own.top;
    let right = own.left;
    let bottom = own.top;
    descendants.forEach((child) => {
      const rect = child.getBoundingClientRect();
      left = Math.min(left, rect.left);
      top = Math.min(top, rect.top);
      right = Math.max(right, rect.right);
      bottom = Math.max(bottom, rect.bottom);
    });
    return {
      width: Math.max(RESIZE_MINIMUM_PIXELS, Math.ceil(right - own.left)),
      height: Math.max(RESIZE_MINIMUM_PIXELS, Math.ceil(bottom - own.top))
    };
  }

  function renderedMinimumSize(node) {
    const element = selectedElementForNode(node);
    const bounds = layoutDescendantBounds(element);
    if (!bounds) {
      return {
        width: RESIZE_MINIMUM_PIXELS,
        height: RESIZE_MINIMUM_PIXELS
      };
    }
    return bounds;
  }

  function applyRenderedMinimums(node) {
    if (!node || !isLayoutType(node.type)) {
      return;
    }
    node.props = normalizedPropsFor(node.type, node.props);
    const minimum = renderedMinimumSize(node);
    setNodeProp(node, "minWidth", Math.max(RESIZE_MINIMUM_PIXELS, Math.ceil(minimum.width)) + "px");
    setNodeProp(node, "minHeight", Math.max(RESIZE_MINIMUM_PIXELS, Math.ceil(minimum.height)) + "px");
  }

  function normalizeHexColor(value) {
    const text = String(value || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(text)) {
      return text;
    }
    if (/^#[0-9a-f]{3}$/i.test(text)) {
      return "#" + text.slice(1).split("").map((part) => part + part).join("");
    }
    const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(text);
    if (rgb) {
      return "#" + [rgb[1], rgb[2], rgb[3]].map((part) => {
        return clamp(Number(part) || 0, 0, 255).toString(16).padStart(2, "0");
      }).join("");
    }
    return "#ffffff";
  }

  function openCssColorEditor(propertyName) {
    const found = currentTarget();
    const node = found.node || root;
    if (isBuilderRoot(node)) {
      hideMenus();
      setStatus("The builder root has no editable CSS");
      return;
    }
    const value = String((node.props || {})[propertyName] || "").trim();
    const colorValue = normalizeHexColor(value);
    cssEditState = {
      kind: "color",
      nodeId: node.id,
      propertyName: propertyName
    };
    document.getElementById("lbCssColorTitle").textContent = CSS_LABELS[propertyName] || propertyName;
    document.getElementById("lbCssColorValue").value = colorValue;
    document.getElementById("lbCssColorText").value = value || colorValue;
    document.getElementById("lbCssColorDialog").showModal();
    hideMenus();
  }

  function lengthUnitBaseForDialog(unit, dimension, element) {
    const rendered = element ? element.getBoundingClientRect()[dimension === "height" ? "height" : "width"] : 0;
    return unitBasePixels(unit, dimension, element, rendered || 100, 1);
  }

  function openCssLengthEditor(propertyName, dimension) {
    const found = currentTarget();
    const node = found.node || root;
    if (isBuilderRoot(node)) {
      hideMenus();
      setStatus("The builder root has no editable CSS");
      return;
    }
    const element = selectedElementForNode(node);
    const currentValue = String((node.props || {})[propertyName] || "").trim();
    const parsed = parseLengthValue(currentValue);
    const rect = element ? element.getBoundingClientRect() : null;
    const fallbackPixels = rect ? rect[dimension === "height" ? "height" : "width"] : 0;
    const pixels = parsed ? lengthValueToPixels(node, propertyName, element, dimension) : fallbackPixels;
    const unit = parsed ? parsed.unit : (dimension === "height" ? "vh" : "vw");
    const base = lengthUnitBaseForDialog(unit, dimension, element);
    const number = base ? pixels / base : (parsed ? parsed.number : 0);
    cssEditState = {
      kind: "length",
      nodeId: node.id,
      propertyName: propertyName,
      dimension: dimension,
      pixels: Number.isFinite(pixels) && pixels > 0 ? pixels : 0
    };
    document.getElementById("lbCssLengthTitle").textContent = CSS_LABELS[propertyName] || propertyName;
    document.getElementById("lbCssLengthNumber").value = String(Number((number || 0).toFixed(3)));
    document.getElementById("lbCssLengthUnit").value = unit;
    document.getElementById("lbCssLengthDialog").showModal();
    hideMenus();
  }

  function saveCssColorEditor() {
    const state = cssEditState;
    const found = state ? findNodeById(state.nodeId) : null;
    if (found && found.node) {
      setNodeProp(found.node, state.propertyName, document.getElementById("lbCssColorText").value.trim());
      activeId = found.node.id;
      renderPreview();
      setStatus("Updated " + (CSS_LABELS[state.propertyName] || state.propertyName));
    }
    document.getElementById("lbCssColorDialog").close();
    cssEditState = null;
  }

  function saveCssLengthEditor() {
    const state = cssEditState;
    const found = state ? findNodeById(state.nodeId) : null;
    if (found && found.node) {
      const number = Number(document.getElementById("lbCssLengthNumber").value) || 0;
      const unit = document.getElementById("lbCssLengthUnit").value || "px";
      setNodeProp(found.node, state.propertyName, String(Number(number.toFixed(3))) + unit);
      activeId = found.node.id;
      renderPreview();
      setStatus("Updated " + (CSS_LABELS[state.propertyName] || state.propertyName));
    }
    document.getElementById("lbCssLengthDialog").close();
    cssEditState = null;
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

  function axisForEdge(edge) {
    if (edge === "left" || edge === "right") {
      return RESIZE_AXIS.horizontal;
    }
    if (edge === "top" || edge === "bottom") {
      return RESIZE_AXIS.vertical;
    }
    return null;
  }

  function edgeIsStart(edge, axis) {
    return Boolean(axis && edge === axis.startEdge);
  }

  function numericStyleValue(style, name) {
    const value = Number.parseFloat(style ? style[name] : "");
    return Number.isFinite(value) ? value : 0;
  }

  function contentAxisBounds(element, axis) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const startPadding = axis.name === "horizontal"
      ? numericStyleValue(style, "paddingLeft")
      : numericStyleValue(style, "paddingTop");
    const endPadding = axis.name === "horizontal"
      ? numericStyleValue(style, "paddingRight")
      : numericStyleValue(style, "paddingBottom");
    const start = rect[axis.rectStart] + startPadding;
    const end = rect[axis.rectEnd] - endPadding;
    return {
      start: start,
      end: Math.max(start, end),
      size: Math.max(0, end - start),
      gap: Math.max(0, numericStyleValue(style, axis.gapStyle)),
      rect: rect,
      style: style
    };
  }

  function buildWasmLayoutOrderMap() {
    const order = new Map();
    const tree = createQHTMLDomTree(previewSource());
    if (!tree) {
      return order;
    }
    try {
      const visit = (qhtmlNode) => {
        if (!qhtmlNode) {
          return;
        }
        const children = qhtmlChildArray(qhtmlNode);
        const childIds = [];
        children.forEach((child) => {
          if (!child || typeof child.qhtmlType !== "function") {
            return;
          }
          if (isLayoutQHTMLType(child.qhtmlType())) {
            const id = qhtmlAssignmentValue(child, "data-layout-id");
            if (id) {
              childIds.push(id);
            }
          }
        });
        const ownId = qhtmlAssignmentValue(qhtmlNode, "data-layout-id");
        if (ownId) {
          order.set(ownId, childIds);
        }
        children.forEach(visit);
      };
      visit(tree);
    } finally {
      disposeQHTMLObject(tree);
    }
    return order;
  }

  function orderedLayoutChildren(parent, orderMap) {
    const modelChildren = (parent && parent.children ? parent.children : [])
      .filter((child) => child && isLayoutType(child.type));
    if (!parent || !orderMap || !orderMap.has(parent.id)) {
      return modelChildren;
    }
    const byId = new Map(modelChildren.map((child) => [child.id, child]));
    const ordered = [];
    orderMap.get(parent.id).forEach((id) => {
      const child = byId.get(id);
      if (child) {
        ordered.push(child);
        byId.delete(id);
      }
    });
    modelChildren.forEach((child) => {
      if (byId.has(child.id)) {
        ordered.push(child);
      }
    });
    return ordered;
  }

  function hasPreviousFlowSibling(node, parent, axis, orderMap) {
    if (!node || !parent || layoutFlowAxis(parent) !== axis.name) {
      return false;
    }
    const siblings = orderedLayoutChildren(parent, orderMap);
    return siblings.indexOf(node) > 0;
  }

  function nodeResizeState(node, axis) {
    if (!node._lbResizeState) {
      Object.defineProperty(node, "_lbResizeState", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: {}
      });
    }
    if (!node._lbResizeState[axis.name]) {
      node._lbResizeState[axis.name] = {};
    }
    return node._lbResizeState[axis.name];
  }

  function intrinsicAxisMinimum(element, axis) {
    return axis.name === "horizontal"
      ? intrinsicContentWidth(element)
      : intrinsicContentHeight(element);
  }

  function constraintUnitInfo(node, element, axis, renderedPixels) {
    const candidates = [axis.max, axis.min, axis.size];
    for (let index = 0; index < candidates.length; index += 1) {
      const propertyName = candidates[index];
      if (parseLengthValue(node.props[propertyName])) {
        return resizeUnitInfo(node, propertyName, element, renderedPixels);
      }
    }
    return { unit: "px", basePixels: 1 };
  }

  function hardAxisMinimum(node, element, axis) {
    const state = nodeResizeState(node, axis);
    const intrinsic = intrinsicAxisMinimum(element, axis);
    if (!Number.isFinite(state.hardMinimum)) {
      const declared = lengthValueToPixels(node, axis.min, element, axis.size);
      state.hardMinimum = Math.max(
        RESIZE_MINIMUM_PIXELS,
        intrinsic,
        Number.isFinite(declared) ? declared : 0
      );
    }
    return Math.max(RESIZE_MINIMUM_PIXELS, intrinsic, state.hardMinimum);
  }

  function captureConstraintItem(node, parent, parentElement, axis) {
    const element = layoutElementById(node.id, parentElement);
    if (!element) {
      return null;
    }
    const rect = element.getBoundingClientRect();
    const startSize = Math.max(RESIZE_MINIMUM_PIXELS, rect[axis.size]);
    node.props = normalizedPropsFor(node.type, node.props);
    return {
      node: node,
      parent: parent,
      element: element,
      rect: rect,
      startSize: startSize,
      minimum: Math.min(startSize, hardAxisMinimum(node, element, axis)),
      unitInfo: constraintUnitInfo(node, element, axis, startSize)
    };
  }

  function parentWraps(parent, parentElement) {
    const configured = String(parent && parent.props ? parent.props.wrap || "" : "")
      .trim()
      .toLowerCase();
    if (configured === "wrap" || configured === "wrap-reverse") {
      return true;
    }
    if (configured === "nowrap") {
      return false;
    }
    const computed = parentElement ? window.getComputedStyle(parentElement).flexWrap : "";
    return computed === "wrap" || computed === "wrap-reverse";
  }

  function captureFlowLevel(parent, selected, axis, edge, orderMap) {
    if (!parent || !selected || layoutFlowAxis(parent) !== axis.name) {
      return null;
    }
    const parentElement = layoutElementById(parent.id);
    if (!parentElement) {
      return null;
    }
    const children = orderedLayoutChildren(parent, orderMap);
    const items = children
      .map((child) => captureConstraintItem(child, parent, parentElement, axis))
      .filter(Boolean);
    const selectedIndex = items.findIndex((item) => item.node === selected);
    if (selectedIndex < 0) {
      return null;
    }
    const bounds = contentAxisBounds(parentElement, axis);
    const nearestStart = items.reduce((value, item) => {
      return Math.min(value, item.rect[axis.rectStart]);
    }, bounds.end);
    const furthestEnd = items.reduce((value, item) => {
      return Math.max(value, item.rect[axis.rectEnd]);
    }, bounds.start);
    const startSide = edgeIsStart(edge, axis);
    const sideIndexes = [];
    if (startSide) {
      for (let index = selectedIndex - 1; index >= 0; index -= 1) {
        sideIndexes.push(index);
      }
    } else {
      for (let index = selectedIndex + 1; index < items.length; index += 1) {
        sideIndexes.push(index);
      }
    }
    return {
      parent: parent,
      parentElement: parentElement,
      axis: axis,
      edge: edge,
      items: items,
      selectedIndex: selectedIndex,
      sideIndexes: sideIndexes,
      freeSpace: startSide
        ? Math.max(0, nearestStart - bounds.start)
        : Math.max(0, bounds.end - furthestEnd),
      wraps: parentWraps(parent, parentElement),
      bounds: bounds
    };
  }

  function findAxisCarrier(container, axis) {
    let current = container;
    const bridge = [];
    while (current) {
      const found = findNodeById(current.id);
      if (!found || !found.parent) {
        return null;
      }
      if (layoutFlowAxis(found.parent) === axis.name) {
        return {
          carrier: current,
          parent: found.parent,
          bridge: bridge
        };
      }
      bridge.push(current);
      current = found.parent;
    }
    return null;
  }

  function terminalAxisNode(container, axis) {
    let current = container;
    let candidate = null;
    while (current) {
      if (!isBuilderRoot(current)) {
        if (current.type === "q-layout" ||
            (axis.name === "horizontal" && current.type === "q-col") ||
            (axis.name === "vertical" && current.type === "q-row")) {
          candidate = current;
        }
      }
      const found = findNodeById(current.id);
      current = found ? found.parent : null;
    }
    return candidate;
  }

  function captureResizePlan(found, element, edge) {
    const axis = axisForEdge(edge);
    if (!axis || !found || !found.node) {
      return null;
    }
    const orderMap = buildWasmLayoutOrderMap();
    const levels = [];
    let currentContainer = found.parent;
    let directLevel = null;
    let selfItem = null;

    if (found.parent && layoutFlowAxis(found.parent) === axis.name) {
      directLevel = captureFlowLevel(found.parent, found.node, axis, edge, orderMap);
      if (directLevel) {
        levels.push(directLevel);
      }
    } else {
      selfItem = captureConstraintItem(found.node, found.parent, element.parentElement, axis);
    }

    const visited = new Set();
    while (currentContainer && !visited.has(currentContainer.id)) {
      visited.add(currentContainer.id);
      const carrier = findAxisCarrier(currentContainer, axis);
      if (!carrier) {
        break;
      }
      const level = captureFlowLevel(carrier.parent, carrier.carrier, axis, edge, orderMap);
      if (!level) {
        break;
      }
      level.bridge = carrier.bridge;
      levels.push(level);
      currentContainer = carrier.parent;
    }

    const terminalNode = terminalAxisNode(currentContainer || found.parent || found.node, axis);
    const terminalParent = terminalNode ? (findNodeById(terminalNode.id) || {}).parent : null;
    const terminalElement = terminalNode ? layoutElementById(terminalNode.id) : null;
    const terminal = terminalNode && terminalElement &&
      !levels.some((level) => level.items[level.selectedIndex].node === terminalNode)
      ? captureConstraintItem(terminalNode, terminalParent, terminalElement.parentElement, axis)
      : null;

    return {
      axis: axis,
      edge: edge,
      levels: levels,
      selfItem: selfItem,
      terminal: terminal,
      startPointer: 0
    };
  }

  function distributeConstraintShrink(level, sizes, amount) {
    let remaining = Math.max(0, amount);
    while (remaining > RESIZE_EPSILON) {
      const candidates = level.sideIndexes.filter((index) => {
        return sizes[index] - level.items[index].minimum > RESIZE_EPSILON;
      });
      if (!candidates.length) {
        break;
      }
      const share = remaining / candidates.length;
      let applied = 0;
      candidates.forEach((index) => {
        const capacity = sizes[index] - level.items[index].minimum;
        const change = Math.min(capacity, share);
        sizes[index] -= change;
        applied += change;
      });
      if (applied <= RESIZE_EPSILON) {
        break;
      }
      remaining -= applied;
    }
    return Math.max(0, amount - remaining);
  }

  function distributeConstraintGrowth(level, sizes, amount) {
    const candidates = level.sideIndexes.slice();
    if (!candidates.length) {
      return 0;
    }
    const growth = Math.max(0, amount);
    sizes[candidates[0]] += growth;
    return growth;
  }

  function clearAxisOffset(node, element, axis) {
    const offsetProperty = axis.name === "horizontal" ? "x" : "y";
    delete node.props[offsetProperty];
    if (!node.props.x && !node.props.y) {
      delete node.props.position;
    }
    if (element) {
      if (axis.name === "horizontal") {
        element.style.left = "";
      } else {
        element.style.top = "";
      }
      if (!node.props.position) {
        element.style.position = "";
      }
    }
  }

  function applyConstraintItemSize(item, axis, pixels) {
    const size = Math.max(item.minimum, pixels);
    const value = formatLengthValue(size, item.unitInfo);
    item.node.props = normalizedPropsFor(item.node.type, item.node.props);
    const controlsParentFlow = item.parent && layoutFlowAxis(item.parent) === axis.name;
    setNodeProp(item.node, axis.size, DEFAULT_LAYOUT_VALUE);
    setNodeProp(item.node, axis.min, value);
    setNodeProp(item.node, axis.max, value);
    if (controlsParentFlow) {
      setNodeProp(item.node, "flex", "0 0 " + value);
    }
    clearAxisOffset(item.node, item.element, axis);
    if (item.element) {
      item.element.style[axis.size] = "auto";
      item.element.style[axis.min] = value;
      item.element.style[axis.max] = value;
      if (controlsParentFlow) {
        item.element.style.flex = "0 0 " + value;
      }
      item.element.style.boxSizing = "border-box";
    }
    return size;
  }

  function expandWrappedContainer(level) {
    if (!level.wraps || !level.parentElement) {
      return;
    }
    const crossAxis = level.axis.name === "horizontal"
      ? RESIZE_AXIS.vertical
      : RESIZE_AXIS.horizontal;
    const element = level.parentElement;
    const rect = element.getBoundingClientRect();
    const required = Math.max(rect[crossAxis.size], element[crossAxis.scrollSize] || 0);
    if (required <= rect[crossAxis.size] + RESIZE_EPSILON) {
      return;
    }
    const found = findNodeById(level.parent.id);
    const item = captureConstraintItem(
      level.parent,
      found ? found.parent : null,
      element.parentElement,
      crossAxis
    );
    if (item) {
      applyConstraintItemSize(item, crossAxis, required);
    }
  }

  function solveFlowLevel(level, requestedGrowth) {
    const sizes = level.items.map((item) => item.startSize);
    const selected = level.items[level.selectedIndex];
    const desired = Math.max(selected.minimum, selected.startSize + requestedGrowth);
    const actualGrowth = desired - selected.startSize;
    sizes[level.selectedIndex] = desired;
    let residual = 0;

    if (actualGrowth > RESIZE_EPSILON) {
      const pressure = Math.max(0, actualGrowth - level.freeSpace);
      const absorbed = distributeConstraintShrink(level, sizes, pressure);
      residual = Math.max(0, pressure - absorbed);
      if (residual > RESIZE_EPSILON && level.wraps) {
        residual = 0;
      }
    } else if (actualGrowth < -RESIZE_EPSILON) {
      const released = -actualGrowth;
      const absorbed = distributeConstraintGrowth(level, sizes, released);
      residual = -(released - absorbed);
    }

    level.items.forEach((item, index) => {
      applyConstraintItemSize(item, level.axis, sizes[index]);
    });
    if (level.wraps) {
      const wrap = String(level.parent.props.wrap || "").toLowerCase();
      level.parentElement.style.flexWrap = wrap === "wrap-reverse" ? "wrap-reverse" : "wrap";
      expandWrappedContainer(level);
    }
    return Math.abs(residual) <= RESIZE_EPSILON ? 0 : residual;
  }

  function solveStandaloneItem(item, axis, requestedGrowth) {
    if (!item) {
      return requestedGrowth;
    }
    const desired = Math.max(item.minimum, item.startSize + requestedGrowth);
    const actual = desired - item.startSize;
    applyConstraintItemSize(item, axis, desired);
    return requestedGrowth - actual;
  }

  function applyConstraintResizePlan(plan, pointerPosition) {
    if (!plan) {
      return;
    }
    const pointerDelta = pointerPosition - plan.startPointer;
    let growth = edgeIsStart(plan.edge, plan.axis) ? -pointerDelta : pointerDelta;

    if (plan.selfItem) {
      const unconsumed = solveStandaloneItem(plan.selfItem, plan.axis, growth);
      growth -= unconsumed;
    }

    let residual = growth;
    plan.levels.forEach((level) => {
      if (Math.abs(residual) <= RESIZE_EPSILON) {
        return;
      }
      residual = solveFlowLevel(level, residual);
    });

    if (plan.terminal && Math.abs(residual) > RESIZE_EPSILON) {
      const desired = Math.max(
        plan.terminal.minimum,
        plan.terminal.startSize + residual
      );
      applyConstraintItemSize(plan.terminal, plan.axis, desired);
      residual = 0;
    }

    enforceRenderedFill(root, null);
  }

  function updateResize(event) {
    if (!interaction || interaction.type !== "resize" || !interaction.resizePlan) {
      return;
    }
    const axis = interaction.resizePlan.axis;
    applyConstraintResizePlan(interaction.resizePlan, event[axis.coordinate]);
  }

  function insertNode(kind, placement) {
    if (insertNodeViaDomTree(kind, placement)) {
      return;
    }
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
      if (isBuilderRoot(target)) {
        hideMenus();
        setStatus("The builder root cannot be replaced");
        return;
      }
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
    if (isBuilderRoot(found.node)) {
      hideMenus();
      setStatus("The builder root cannot be deleted");
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
    const value = normalizeEditorQHTMLSource(editorValue());
    if (editorMode === "add-qhtml") {
      const target = currentTarget().node || root;
      const next = createNode("qhtml", []);
      next.source = value;
      target.children.push(next);
      activeId = target.id;
    } else {
      const found = findNodeById(editorTargetId);
      if (found && found.node) {
        const parsed = sourceHasSingleLayoutRoot(value) ? parseLayoutSource(value) : null;
        if (isBuilderRoot(found.node)) {
          root = forceBuilderRoot(parsed && parsed.type !== "qhtml" ? parsed : parseLayoutSource(value));
          activeId = root.id;
        } else if (parsed && parsed.type !== "qhtml") {
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

  function setPropertyFieldEnabled(id, enabled) {
    const field = document.getElementById(id);
    if (field) {
      field.disabled = !enabled;
    }
  }

  function configurePropertyDialogForNode(node) {
    const found = findNodeById(node ? node.id : "");
    const rootOnly = isRestrictedRootPropertiesNode(node, found ? found.parent : null);
    const editableForRoot = new Set([
      "lbPropMinWidth",
      "lbPropMinHeight",
      "lbPropMaxWidth",
      "lbPropMaxHeight",
      "lbPropWrap"
    ]);
    [
      "lbPropType",
      "lbPropName",
      "lbPropWidth",
      "lbPropHeight",
      "lbPropFlex",
      "lbPropGap",
      "lbPropMinWidth",
      "lbPropMinHeight",
      "lbPropMaxWidth",
      "lbPropMaxHeight",
      "lbPropMinColWidth",
      "lbPropWrap"
    ].forEach((id) => {
      setPropertyFieldEnabled(id, !rootOnly || editableForRoot.has(id));
    });
  }

  function isRestrictedRootPropertiesNode(node, parent) {
    const userRoot = firstUserRoot();
    return isBuilderRoot(node) ||
      Boolean(node && node.type === "q-layout" &&
        ((!parent || isBuilderRoot(parent)) || (userRoot && userRoot.id === node.id)));
  }

  function replaceNode(oldNode, newNode) {
    const found = findNodeById(oldNode.id);
    if (!found || isBuilderRoot(found.node)) {
      return;
    }
    if (!found.parent) {
      root = wrapAsBuilderRoot(newNode);
      return;
    }
    const index = found.parent.children.indexOf(oldNode);
    found.parent.children.splice(index, 1, newNode);
  }

  function forceBuilderRoot(node) {
    const next = node && node.type === "q-layout" ? node : createBuilderRoot(node ? [node] : []);
    next.builderRoot = true;
    next.name = "";
    next.props = normalizedPropsFor("q-layout", next.props);
    setNodeProp(next, "data-lb-builder-root", "1");
    return next;
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
    if (isLayoutType(node.type)) {
      applyRenderedMinimums(node);
    }
    node.props = normalizedPropsFor(node.type, node.props);
    configurePropertyDialogForNode(node);
    document.getElementById("lbPropType").value = node.type === "qhtml" ? "q-layout" : node.type;
    document.getElementById("lbPropName").value = node.name || "";
    document.getElementById("lbPropWidth").value = node.props.width || "";
    document.getElementById("lbPropHeight").value = node.props.height || "";
    document.getElementById("lbPropFlex").value = node.props.flex || "";
    document.getElementById("lbPropGap").value = node.props.gap || "";
    document.getElementById("lbPropMinWidth").value = node.props.minWidth || node.props["min-width"] || "";
    document.getElementById("lbPropMinHeight").value = node.props.minHeight || node.props["min-height"] || "";
    document.getElementById("lbPropMaxWidth").value = node.props.maxWidth || node.props["max-width"] || "";
    document.getElementById("lbPropMaxHeight").value = node.props.maxHeight || node.props["max-height"] || "";
    document.getElementById("lbPropMinColWidth").value = node.props.minColWidth || node.props["min-col-width"] || "";
    document.getElementById("lbPropWrap").value = node.props.wrap || node.props.flexWrap || node.props["flex-wrap"] || "";
    document.getElementById("lbPropertiesDialog").showModal();
    hideMenus();
  }

  function saveProperties() {
    const found = currentTarget();
    const node = found.node || root;
    const rootOnly = isRestrictedRootPropertiesNode(node, found.parent);
    const nextType = rootOnly ? node.type : document.getElementById("lbPropType").value;
    if (!rootOnly) {
      node.type = nextType;
      node.name = document.getElementById("lbPropName").value.trim();
    }
    node.props = normalizedPropsFor(nextType, node.props);
    if (!rootOnly) {
      setNodeProp(node, "width", document.getElementById("lbPropWidth").value.trim());
      setNodeProp(node, "height", document.getElementById("lbPropHeight").value.trim());
      setNodeProp(node, "flex", document.getElementById("lbPropFlex").value.trim());
      setNodeProp(node, "gap", document.getElementById("lbPropGap").value.trim());
      setNodeProp(node, "minColWidth", document.getElementById("lbPropMinColWidth").value.trim());
    }
    setNodeProp(node, "minWidth", document.getElementById("lbPropMinWidth").value.trim());
    setNodeProp(node, "minHeight", document.getElementById("lbPropMinHeight").value.trim());
    setNodeProp(node, "maxWidth", document.getElementById("lbPropMaxWidth").value.trim());
    setNodeProp(node, "maxHeight", document.getElementById("lbPropMaxHeight").value.trim());
    setNodeProp(node, "wrap", document.getElementById("lbPropWrap").value.trim());
    delete node.props["min-width"];
    delete node.props["min-height"];
    delete node.props["max-width"];
    delete node.props["max-height"];
    delete node.props["min-col-width"];
    delete node.props.flexWrap;
    delete node.props["flex-wrap"];
    node.props = normalizedPropsFor(nextType, node.props);
    if (isLayoutType(node.type)) {
      applyRenderedMinimums(node);
    }
    document.getElementById("lbPropertiesDialog").close();
    renderPreview();
    setStatus("Properties updated");
  }

  async function exportFile() {
    try {
      const roots = userRootNodes();
      const source = roots.length
        ? roots.map((node) => modelToQHTML(node, 0)).join("\n\n")
        : "";
      const portableSource = await sourceWithInlinedImports(source);
      const blob = new Blob([portableSource + "\n"], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "layout.qhtml";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus("Exported layout.qhtml");
    } catch (error) {
      setStatus(error && error.message ? error.message : "Export failed");
      throw error;
    }
  }

  function openFile(file) {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      clearScopedImports();
      const source = normalizeQHTMLThroughDomTree(String(reader.result || ""));
      const parsed = parseLayoutSource(source);
      root = wrapAsBuilderRoot(parsed || buildDefaultUserTree());
      activeId = firstUserRoot() ? firstUserRoot().id : root.id;
      renderPreview();
      setStatus("Opened " + file.name);
    });
    reader.readAsText(file);
  }

  function getActiveSource() {
    const found = currentTarget();
    if (isBuilderRoot(found.node)) {
      return modelToQHTML(root, 0);
    }
    return modelToQHTML(found.node || firstUserRoot() || root, 0);
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
    if (isBuilderRoot(found.node)) {
      event.preventDefault();
      return;
    }
    if (!region.edge && rawEdge) {
      event.preventDefault();
      return;
    }

    if (region.edge) {
      found.node.props = normalizedPropsFor(found.node.type, found.node.props);
      if (found.parent) {
        found.parent.props = normalizedPropsFor(found.parent.type, found.parent.props);
      }
      const resizePlan = captureResizePlan(found, element, region.edge);
      if (!resizePlan) {
        event.preventDefault();
        return;
      }
      resizePlan.startPointer = event[resizePlan.axis.coordinate];
      interaction = {
        type: "resize",
        nodeId: id,
        element: element,
        edge: region.edge,
        resizePlan: resizePlan
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

  function hideCssPropertyMenus() {
    document.querySelectorAll(".lb-css-property-menu").forEach((menu) => {
      menu.hidden = true;
    });
  }

  function updatePlacementMenuState(kind) {
    const found = currentTarget();
    const target = found.node || root;
    const beforeButton = document.querySelector("#lbPlacementMenu [data-placement='before']");
    const afterButton = document.querySelector("#lbPlacementMenu [data-placement='after']");
    const childButton = document.querySelector("#lbPlacementMenu [data-placement='child']");
    const replaceButton = document.querySelector("#lbPlacementMenu [data-placement='replace']");
    const siblingAllowed = found.parent && !isBuilderRoot(target) ? canInsertAsChild(kind, found.parent.type) : false;
    beforeButton.disabled = !siblingAllowed;
    afterButton.disabled = !siblingAllowed;
    childButton.disabled = !canInsertAsChild(kind, target.type);
    replaceButton.disabled = isBuilderRoot(target) || !canReplaceTarget({ type: kind }, found.parent);
  }

  function updateContextMenuState() {
    const found = currentTarget();
    const target = found.node || root;
    const rootTarget = isBuilderRoot(target);
    const editButton = document.querySelector("#lbMenu [data-action='edit']");
    const propertiesButton = document.querySelector("#lbMenu [data-action='properties']");
    const deleteButton = document.querySelector("#lbMenu [data-action='delete']");
    const cssButton = document.querySelector("#lbMenu [data-menu-open='css']");
    if (editButton) {
      editButton.disabled = false;
    }
    if (propertiesButton) {
      propertiesButton.disabled = false;
    }
    if (deleteButton) {
      deleteButton.disabled = rootTarget;
    }
    if (cssButton) {
      cssButton.disabled = rootTarget;
    }
  }

  function hideMenus() {
    menus.forEach((menu) => {
      menu.hidden = true;
    });
    hideCssPropertyMenus();
    pendingPlacementKind = "";
    menuFrozen = false;
  }

  function bindMenus() {
    const menu = document.getElementById("lbMenu");
    const addMenu = document.getElementById("lbAddMenu");
    const placementMenu = document.getElementById("lbPlacementMenu");
    const cssMenu = document.getElementById("lbCssMenu");
    const cssPropertyMenus = {
      colors: document.getElementById("lbCssColorsMenu"),
      size: document.getElementById("lbCssSizeMenu"),
      spacing: document.getElementById("lbCssSpacingMenu"),
      border: document.getElementById("lbCssBorderMenu"),
      text: document.getElementById("lbCssTextMenu")
    };
    menus.push(
      menu,
      addMenu,
      placementMenu,
      cssMenu,
      cssPropertyMenus.colors,
      cssPropertyMenus.size,
      cssPropertyMenus.spacing,
      cssPropertyMenus.border,
      cssPropertyMenus.text
    );

    menu.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) {
        return;
      }
      const action = button.getAttribute("data-action");
      const open = button.getAttribute("data-menu-open");
      if (open === "add") {
        showSubmenu(addMenu, button);
      } else if (open === "css") {
        showSubmenu(cssMenu, button);
      } else if (action === "edit") {
        const target = currentTarget().node || root;
        openEditor("edit", target.id, getActiveSource());
      } else if (action === "properties") {
        openProperties();
      } else if (action === "delete") {
        deleteActiveNode();
      }
    });

    cssMenu.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) {
        return;
      }
      const open = button.getAttribute("data-css-menu-open");
      if (open) {
        hideCssPropertyMenus();
        showSubmenu(cssPropertyMenus[open], button);
        return;
      }
    });

    Object.keys(cssPropertyMenus).forEach((key) => {
      cssPropertyMenus[key].addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) {
          return;
        }
        openCssPropertyEditor(button);
      });
    });

    function openCssPropertyEditor(button) {
      const kind = button.getAttribute("data-css-kind");
      const propertyName = button.getAttribute("data-css-property");
      const dimension = button.getAttribute("data-css-dimension") || "width";
      if (kind === "color") {
        openCssColorEditor(propertyName);
      } else if (kind === "length") {
        openCssLengthEditor(propertyName, dimension);
      }
    }

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

    document.getElementById("lbCssColorValue").addEventListener("input", (event) => {
      document.getElementById("lbCssColorText").value = event.target.value;
    });
    document.getElementById("lbCssColorText").addEventListener("input", (event) => {
      const value = normalizeHexColor(event.target.value);
      document.getElementById("lbCssColorValue").value = value;
    });
    document.getElementById("lbCssColorSave").addEventListener("click", saveCssColorEditor);
    document.getElementById("lbCssColorCancel").addEventListener("click", () => {
      document.getElementById("lbCssColorDialog").close();
      cssEditState = null;
    });
    document.getElementById("lbCssColorClose").addEventListener("click", () => {
      document.getElementById("lbCssColorDialog").close();
      cssEditState = null;
    });

    document.getElementById("lbCssLengthUnit").addEventListener("change", (event) => {
      const state = cssEditState;
      const found = state ? findNodeById(state.nodeId) : null;
      const element = found && found.node ? selectedElementForNode(found.node) : null;
      const unit = event.target.value || "px";
      const base = state ? lengthUnitBaseForDialog(unit, state.dimension, element) : 1;
      const next = state && base ? state.pixels / base : 0;
      document.getElementById("lbCssLengthNumber").value = String(Number((next || 0).toFixed(3)));
    });
    document.getElementById("lbCssLengthNumber").addEventListener("input", (event) => {
      const state = cssEditState;
      const found = state ? findNodeById(state.nodeId) : null;
      const element = found && found.node ? selectedElementForNode(found.node) : null;
      const unit = document.getElementById("lbCssLengthUnit").value || "px";
      const base = state ? lengthUnitBaseForDialog(unit, state.dimension, element) : 1;
      if (state) {
        state.pixels = (Number(event.target.value) || 0) * base;
      }
    });
    document.getElementById("lbCssLengthSave").addEventListener("click", saveCssLengthEditor);
    document.getElementById("lbCssLengthCancel").addEventListener("click", () => {
      document.getElementById("lbCssLengthDialog").close();
      cssEditState = null;
    });
    document.getElementById("lbCssLengthClose").addEventListener("click", () => {
      document.getElementById("lbCssLengthDialog").close();
      cssEditState = null;
    });
  }

  function bindToolbar() {
    document.getElementById("lbNew").addEventListener("click", () => {
      clearScopedImports();
      root = buildDefaultTree();
      activeId = firstUserRoot() ? firstUserRoot().id : root.id;
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
      updateContextMenuState();
      showMenu(document.getElementById("lbMenu"), event.clientX, event.clientY);
    });
  }

  function bindOutline() {
    const button = document.getElementById("lbOutlineToggle");
    if (button) {
      button.addEventListener("click", () => {
        outlineCollapsed = !outlineCollapsed;
        applyOutlineCollapsed();
      });
    }
    applyOutlineCollapsed();
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
    const normalized = normalizeQHTMLThroughDomTree(source);
    const split = splitTopLevelImports(normalized);
    split.imports.forEach(addScopedImport);
    const layoutSource = split.source;
    const cleaned = stripComments(layoutSource);
    const matches = topLevelLayoutMatches(cleaned);
    if (!matches.length) {
      const qhtmlNode = createNode("qhtml", []);
      qhtmlNode.source = normalized;
      return qhtmlNode;
    }

    if (matches.length === 1 && !cleaned.slice(0, matches[0].index).trim()) {
      const open = matches[0].index + matches[0][0].lastIndexOf("{");
      const close = findMatchingBrace(cleaned, open);
      if (close >= 0 && !cleaned.slice(close + 1).trim()) {
        return parseLayoutAt(cleaned, matches[0].index);
      }
    }

    const children = [];
    let cursor = 0;
    for (const match of matches) {
      const before = cleaned.slice(cursor, match.index).trim();
      if (before) {
        const qhtmlNode = createNode("qhtml", []);
        qhtmlNode.source = before;
        children.push(qhtmlNode);
      }
      const open = match.index + match[0].lastIndexOf("{");
      const close = findMatchingBrace(cleaned, open);
      if (close < 0) {
        break;
      }
      const parsed = parseLayoutAt(cleaned, match.index);
      if (parsed) {
        children.push(parsed);
      }
      cursor = close + 1;
    }
    const tail = cleaned.slice(cursor).trim();
    if (tail) {
      const qhtmlNode = createNode("qhtml", []);
      qhtmlNode.source = tail;
      children.push(qhtmlNode);
    }
    return createBuilderRoot(children);
  }

  function firstTopLevelLayoutMatch(source) {
    const matches = topLevelLayoutMatches(source);
    return matches.length ? matches[0] : null;
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
    if (node.props["data-lb-builder-root"] === "1") {
      node.builderRoot = true;
    }
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
    const text = String(source || "");
    const lines = text.split("\n");
    let depth = 0;
    let quote = "";
    let escape = false;
    const out = [];
    const propertyLineRe = /^\s*(?:q-property\s+)?[A-Za-z_][\w-]*\s*:\s*("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^\s{};]+)\s*;?\s*$/;

    lines.forEach((line) => {
      const startDepth = depth;
      if (!(startDepth === 0 && propertyLineRe.test(line))) {
        out.push(line);
      }

      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
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
        if (ch === '"' || ch === "'" || ch === "`") {
          quote = ch;
        } else if (ch === "{") {
          depth += 1;
        } else if (ch === "}") {
          depth = Math.max(0, depth - 1);
        }
      }
    });

    return out.join("\n").trim();
  }

  function parseProps(body, node) {
    const propertySource = topLevelText(body);
    const propRe = /^\s*(q-property\s+)?([A-Za-z_][\w-]*)\s*:\s*("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^\s{};]+)/gm;
    let match;
    while ((match = propRe.exec(propertySource))) {
      const kind = match[1] ? "q-property" : "assignment";
      const key = match[2];
      let value = match[3] || "";
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
      }
      if (key === "data-layout-id") {
        node.id = value || nextId();
      } else {
        setNodeProp(node, key, value, kind);
      }
    }
  }

  function parseChildren(body, node) {
    let cursor = 0;
    const matches = topLevelLayoutMatches(body);
    for (const match of matches) {
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
    }
    const tail = body.slice(cursor).trim();
    const cleanedTail = stripPropertyLines(tail);
    if (cleanedTail) {
      const qhtmlNode = createNode("qhtml", []);
      qhtmlNode.source = cleanedTail;
      node.children.push(qhtmlNode);
    }
  }

  function topLevelLayoutMatches(source) {
    const text = String(source || "");
    const matches = [];
    let depth = 0;
    let quote = "";
    let escape = false;
    const layoutRe = /\b(q-layout|q-row|q-col)\b\s*([A-Za-z_][\w-]*)?\s*\{/y;

    for (let index = 0; index < text.length; index += 1) {
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
      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        continue;
      }
      if (ch === "{") {
        depth += 1;
        continue;
      }
      if (ch === "}") {
        depth = Math.max(0, depth - 1);
        continue;
      }
      if (depth !== 0) {
        continue;
      }
      layoutRe.lastIndex = index;
      const match = layoutRe.exec(text);
      if (match) {
        const open = layoutRe.lastIndex - 1;
        const close = findMatchingBrace(text, open);
        matches.push({
          index,
          close,
          0: match[0],
          1: match[1],
          2: match[2] || ""
        });
        index = close >= 0 ? close : layoutRe.lastIndex - 1;
      }
    }
    return matches;
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
    activeId = firstUserRoot() ? firstUserRoot().id : root.id;
    createPreviewHost();
    bindToolbar();
    bindCanvas();
    bindOutline();
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
