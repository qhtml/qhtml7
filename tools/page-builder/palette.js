(function () {
  "use strict";

  var state = {
    activeDrag: null,
    selectedPaletteId: "",
    paletteDefinitions: Object.create(null),
    paletteItems: Object.create(null),
    canvasInstances: Object.create(null),
    topLevelCanvasItems: Object.create(null),
    slotPlacements: Object.create(null),
    pendingSlotMigrations: Object.create(null),
    customComponents: Object.create(null),
    newComponentDialog: null,
    pointerDrag: null
  };

  function componentValue(component, key) {
    if (!component) return "";
    if (component[key] !== undefined && component[key] !== null) return String(component[key]);
    if (component.getAttribute) return component.getAttribute(key) || "";
    return "";
  }

  function eventDetail(component) {
    var detail = {
      paletteId: componentValue(component, "paletteId") || componentValue(component, "data-palette-id"),
      canvasInstanceId: componentValue(component, "canvasInstanceId"),
      definitionName: componentValue(component, "definitionName") || componentValue(component, "data-definition-name"),
      definitionUUID: componentValue(component, "definitionUUID") || componentValue(component, "data-definition-uuid"),
      displayName: componentValue(component, "displayName"),
      category: componentValue(component, "category"),
      instanceName: componentValue(component, "instanceName"),
      instanceQHTML: componentValue(component, "instanceQHTML") || componentValue(component, "data-instance-qhtml"),
      slotNames: componentValue(component, "slotNames") || componentValue(component, "data-slot-names")
    };
    if (!detail.instanceQHTML && detail.definitionName) {
      detail.instanceQHTML = detail.definitionName + " " + (detail.instanceName || detail.definitionName + "Instance") + " { }";
    }
    return detail;
  }

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, {
      detail: detail,
      bubbles: true
    }));
  }

  function registerPaletteItem(component) {
    var detail = eventDetail(component);
    if (!detail.paletteId) return detail;
    state.paletteItems[detail.paletteId] = {
      component: component,
      detail: detail
    };
    if (detail.definitionUUID || detail.definitionName) {
      state.paletteDefinitions[detail.paletteId] = {
        uuid: detail.definitionUUID,
        name: detail.definitionName,
        slots: detail.slotNames ? detail.slotNames.split(/\s*,\s*/) : []
      };
    }
    return detail;
  }

  function qhtmlNodeType(node) {
    var type = "";
    if (node && node.qhtmlType !== undefined) type = typeof node.qhtmlType === "function" ? node.qhtmlType() : node.qhtmlType;
    if (!type && node && node.type !== undefined) type = typeof node.type === "function" ? node.type() : node.type;
    return String(type || "");
  }

  function qhtmlNodeName(node) {
    var name = "";
    if (node && node.qhtmlName !== undefined) name = typeof node.qhtmlName === "function" ? node.qhtmlName() : node.qhtmlName;
    if (!name && node && node.name !== undefined) name = typeof node.name === "function" ? node.name() : node.name;
    return String(name || "");
  }

  function appendUnique(list, value) {
    var item = String(value || "").trim();
    if (item && list.indexOf(item) === -1) list.push(item);
  }

  function childrenOf(node) {
    if (node && typeof node.childList === "function") return Array.prototype.slice.call(node.childList());
    return [];
  }

  function slotsFromChildList(node, slots) {
    childrenOf(node).forEach(function (child) {
      var type = qhtmlNodeType(child);
      if (type === "QHTMLSlot" || type === "QHTMLSlotDefault" || type === "QHTMLComponentSlot") {
        appendUnique(slots, qhtmlNodeName(child));
      }
      slotsFromChildList(child, slots);
    });
  }

  function slotsFromDefinition(definition) {
    var slots = [];
    if (definition && typeof definition.findChildrenByType === "function") {
      ["QHTMLSlot", "QHTMLSlotDefault", "QHTMLComponentSlot"].forEach(function (typeName) {
        Array.prototype.slice.call(definition.findChildrenByType(typeName)).forEach(function (slot) {
          appendUnique(slots, qhtmlNodeName(slot));
        });
      });
    }
    slotsFromChildList(definition, slots);
    return slots;
  }

  function transferDragData(event, detail) {
    if (!event || !event.dataTransfer) return;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/qhtml-palette+json", JSON.stringify(detail));
    event.dataTransfer.setData("text/qhtml-palette-id", detail.paletteId);
    event.dataTransfer.setData("text/qhtml-definition-name", detail.definitionName);
    event.dataTransfer.setData("text/qhtml-instance", detail.instanceQHTML);
    event.dataTransfer.setData("text/plain", detail.definitionName);
  }

  function scanPaletteItems() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-builder-palette-button],[data-builder-palette-item]"), function (node) {
      registerPaletteItem(node);
    });
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function validComponentName(value) {
    return /^[A-Za-z_][A-Za-z0-9_\/-]*$/.test(String(value || "").trim());
  }

  function validReferenceName(value) {
    return /^[A-Za-z_][A-Za-z0-9_\/-]*$/.test(String(value || "").trim());
  }

  function splitInlineList(value) {
    return String(value || "").split(/[\n,]+/).map(function (item) {
      return item.trim();
    }).filter(Boolean);
  }

  function listBoxValues(select) {
    return select ? Array.prototype.map.call(select.options, function (option) {
      return option.value;
    }) : [];
  }

  function setListBoxValues(select, values) {
    if (!select) return;
    select.innerHTML = "";
    values.forEach(function (value) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  function addListBoxValue(select, value) {
    var item = String(value || "").trim();
    if (!select || !item || listBoxValues(select).indexOf(item) !== -1) return false;
    var option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
    return true;
  }

  function removeSelectedListBoxValues(select) {
    if (!select) return [];
    var removed = [];
    Array.prototype.slice.call(select.selectedOptions).forEach(function (option) {
      removed.push(option.value);
      option.remove();
    });
    return removed;
  }

  function signalSpec(value) {
    var text = String(value || "").trim();
    var match = /^([A-Za-z_][A-Za-z0-9_\/-]*)(?:\(([^)]*)\))?$/.exec(text);
    if (!match) {
      return null;
    }
    return {
      name: match[1],
      parameters: String(match[2] || "").trim()
    };
  }

  function signalSpecText(spec) {
    return spec.parameters ? spec.name + "(" + spec.parameters + ")" : spec.name;
  }

  function componentSignature(name, extendsList) {
    var header = "q-component " + String(name || "").trim();
    extendsList.forEach(function (item) {
      header += " extends " + item;
    });
    return header;
  }

  function sourceForChild(child, indentLevel) {
    var indent = typeof indentLevel === "number" ? indentLevel : 1;
    if (!child) return "";
    if (typeof child.toQHTML === "function") return child.toQHTML(indent);
    if (typeof child.sourceQHTML === "function") return child.sourceQHTML(indent);
    return "";
  }

  function childArray(node) {
    if (node && typeof node.childList === "function") {
      return Array.prototype.slice.call(node.childList());
    }
    return [];
  }

  function innerSourceFromDefinition(definition) {
    var lines = [];
    childArray(definition).forEach(function (child) {
      if (qhtmlNodeType(child) === "QHTMLSignal") {
        return;
      }
      var source = sourceForChild(child, 0);
      if (source) lines.push(source);
    });
    return lines.join("\n");
  }

  function signalsFromDefinition(definition) {
    return childArray(definition).filter(function (child) {
      return qhtmlNodeType(child) === "QHTMLSignal";
    }).map(function (signal) {
      var parameters = typeof signal.parameters === "function" ? String(signal.parameters() || "") : "";
      return signalSpecText({
        name: qhtmlNodeName(signal),
        parameters: parameters
      });
    }).filter(Boolean);
  }

  function parseComponentSource(source) {
    var Parser = window.QHTMLParser;
    if (!Parser) {
      throw new Error("QHTMLParser is not available");
    }
    var parser = new Parser();
    var tree = parser.parseTree(String(source || ""));
    var definitions = tree.findChildrenByType("QHTMLComponentDefinition");
    if (!definitions || !definitions.length) {
      throw new Error("No q-component definition found");
    }
    return {
      tree: tree,
      definition: definitions[0]
    };
  }

  function componentSourceFromDraft(draft) {
    var source = componentSignature(draft.name, draft.extendsList) + " {\n";
    draft.signals.forEach(function (value) {
      var spec = signalSpec(value);
      if (spec) {
        source += "  q-signal " + spec.name + "(" + spec.parameters + ") { }\n";
      }
    });
    var inner = String(draft.innerSource || "").trim();
    if (inner) {
      source += inner.split("\n").map(function (line) {
        return "  " + line;
      }).join("\n") + "\n";
    }
    source += "}";
    return source;
  }

  function componentPaletteId(name) {
    return "builder.custom." + String(name || "component").replace(/[^A-Za-z0-9_\/-]+/g, "-").toLowerCase();
  }

  function componentInstanceName(name) {
    var clean = String(name || "component").split(/[\/-]+/).filter(Boolean).pop() || "component";
    return clean.charAt(0).toLowerCase() + clean.slice(1) + "Instance";
  }

  function dialogControls(dialogElement) {
    var dialog = dialogElement || byId("pbNewComponentDialog");
    return {
      dialog: dialog,
      discardDialog: byId("pbDiscardComponentDialog"),
      name: byId("pbComponentName"),
      extendsList: byId("pbComponentExtendsList"),
      extendsInput: byId("pbComponentExtendsInput"),
      extendsAdd: byId("pbComponentExtendsAdd"),
      extendsRemove: byId("pbComponentExtendsRemove"),
      signalsList: byId("pbComponentSignalsList"),
      signalInput: byId("pbComponentSignalInput"),
      signalAdd: byId("pbComponentSignalAdd"),
      signalRemove: byId("pbComponentSignalRemove"),
      editor: byId("pbComponentCodeEditor"),
      status: byId("pbComponentCodeStatus"),
      save: byId("pbNewComponentSave"),
      cancel: byId("pbNewComponentCancel"),
      discardConfirm: byId("pbDiscardComponentConfirm"),
      discardCancel: byId("pbDiscardComponentCancel")
    };
  }

  function setStatus(controls, text, isError) {
    if (!controls.status) return;
    controls.status.textContent = text;
    controls.status.classList.toggle("error", Boolean(isError));
  }

  function validateNameInput(input) {
    var ok = validComponentName(input ? input.value : "");
    if (input) {
      input.borderColor = ok ? "" : "red";
      input.style.borderColor = ok ? "" : "red";
    }
    return ok;
  }

  function publishComponentDraft(controls, draft) {
    if (controls.dialog && typeof controls.dialog.setContextProperty === "function") {
      controls.dialog.setContextProperty("componentDraft", draft);
      controls.dialog.setContextProperty("generatedComponent", draft.componentNode || null);
    }
  }

  function refreshDraftFromLists(controls, draft) {
    draft.name = String(controls.name.value || "").trim();
    draft.extendsList = listBoxValues(controls.extendsList);
    draft.signals = listBoxValues(controls.signalsList);
  }

  function commitEditorSource(controls, draft, source) {
    try {
      var parsed = parseComponentSource(source);
      var definition = parsed.definition;
      draft.tree = parsed.tree;
      draft.componentNode = definition;
      draft.innerSource = innerSourceFromDefinition(definition);
      draft.name = qhtmlNodeName(definition) || draft.name;
      draft.extendsList = typeof definition.extendsList === "function" ? definition.extendsList() : draft.extendsList;
      draft.signals = signalsFromDefinition(definition);
      draft.definitionSource = componentSourceFromDraft(draft);
      setStatus(controls, "Component source is valid", false);
      publishComponentDraft(controls, draft);
      return true;
    } catch (error) {
      draft.lastError = error;
      setStatus(controls, error && error.message ? error.message : "Invalid QHTML source", true);
      return false;
    }
  }

  function syncControlsFromDraft(controls, draft) {
    controls.name.value = draft.name;
    setListBoxValues(controls.extendsList, draft.extendsList);
    setListBoxValues(controls.signalsList, draft.signals);
    validateNameInput(controls.name);
  }

  function setEditorSource(controls, draft, source) {
    draft.settingEditor = true;
    if (controls.editor && typeof controls.editor.setQhtmlSource === "function") {
      controls.editor.setQhtmlSource(source);
    } else if (controls.editor) {
      controls.editor.textContent = source;
    }
    draft.settingEditor = false;
  }

  function rebuildEditorFromControls(controls, draft) {
    refreshDraftFromLists(controls, draft);
    if (!validateNameInput(controls.name)) {
      setStatus(controls, "Component name is invalid", true);
      return false;
    }
    var source = componentSourceFromDraft(draft);
    setEditorSource(controls, draft, source);
    return commitEditorSource(controls, draft, source);
  }

  function currentEditorSource(controls) {
    if (controls.editor && typeof controls.editor.getQhtmlSource === "function") {
      return controls.editor.getQhtmlSource();
    }
    return controls.editor ? String(controls.editor.textContent || "") : "";
  }

  function ensureNewComponentDialog(dialogElement) {
    var controls = dialogControls(dialogElement);
    if (!controls.dialog || controls.dialog.__qhtmlPageBuilderDialogReady) {
      return controls;
    }
    controls.dialog.__qhtmlPageBuilderDialogReady = true;

    controls.name.addEventListener("input", function () {
      rebuildEditorFromControls(dialogControls(controls.dialog), state.newComponentDialog);
    });
    controls.extendsAdd.addEventListener("click", function () {
      var current = dialogControls(controls.dialog);
      splitInlineList(current.extendsInput.value).forEach(function (value) {
        if (validReferenceName(value)) addListBoxValue(current.extendsList, value);
      });
      current.extendsInput.value = "";
      rebuildEditorFromControls(current, state.newComponentDialog);
    });
    controls.extendsRemove.addEventListener("click", function () {
      var current = dialogControls(controls.dialog);
      removeSelectedListBoxValues(current.extendsList);
      rebuildEditorFromControls(current, state.newComponentDialog);
    });
    controls.signalAdd.addEventListener("click", function () {
      var current = dialogControls(controls.dialog);
      splitInlineList(current.signalInput.value).forEach(function (value) {
        if (signalSpec(value)) addListBoxValue(current.signalsList, value);
      });
      current.signalInput.value = "";
      rebuildEditorFromControls(current, state.newComponentDialog);
    });
    controls.signalRemove.addEventListener("click", function () {
      var current = dialogControls(controls.dialog);
      removeSelectedListBoxValues(current.signalsList);
      rebuildEditorFromControls(current, state.newComponentDialog);
    });
    controls.editor.addEventListener("q-editor-output", function () {
      var current = dialogControls(controls.dialog);
      var draft = state.newComponentDialog;
      if (!draft || draft.settingEditor) return;
      if (commitEditorSource(current, draft, currentEditorSource(current))) {
        syncControlsFromDraft(current, draft);
      }
    });
    controls.save.addEventListener("click", function () {
      saveNewComponentDialog();
    });
    controls.cancel.addEventListener("click", function () {
      requestCloseNewComponentDialog();
    });
    controls.discardConfirm.addEventListener("click", function () {
      var current = dialogControls(controls.dialog);
      if (current.discardDialog.open) current.discardDialog.close();
      if (current.dialog.open) current.dialog.close();
    });
    controls.discardCancel.addEventListener("click", function () {
      var current = dialogControls(controls.dialog);
      if (current.discardDialog.open) current.discardDialog.close();
    });
    return controls;
  }

  function createNewComponentDraft() {
    return {
      name: "customComponent",
      extendsList: [],
      signals: [],
      innerSource: 'div { padding: "18px" text { New component } }',
      definitionSource: "",
      componentNode: null,
      tree: null,
      settingEditor: false
    };
  }

  function requestCloseNewComponentDialog() {
    var draft = state.newComponentDialog;
    var controls = dialogControls(draft ? draft.dialogElement : null);
    if (controls.discardDialog && typeof controls.discardDialog.showModal === "function") {
      controls.discardDialog.showModal();
    } else if (controls.dialog) {
      controls.dialog.close();
    }
  }

  function instantiateCustomPaletteItem(component) {
    var detail = registerPaletteItem(component);
    var custom = state.customComponents[detail.paletteId];
    var instance = {
      paletteId: detail.paletteId,
      canvasInstanceId: "pb-instance-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
      definitionName: detail.definitionName,
      definitionUUID: detail.definitionUUID,
      paletteDefinitionName: detail.definitionName,
      paletteDefinition: custom ? custom.componentNode : null,
      displayName: detail.displayName,
      category: detail.category,
      instanceName: detail.instanceName,
      instanceQHTML: detail.definitionName + " " + detail.instanceName + " { }",
      slots: custom ? slotsFromDefinition(custom.componentNode) : [],
      scopeImports: [],
      scopeDefinitions: custom ? [custom.definitionSource] : []
    };
    state.canvasInstances[instance.canvasInstanceId] = {
      paletteId: instance.paletteId,
      node: instance,
      parentLayoutId: ""
    };
    emit("qhtml-page-builder-palette-instance-created", instance);
    return instance;
  }

  function appendCustomPaletteButton(draft) {
    var list = byId("pbCustomComponentList");
    if (!list) return null;
    var paletteId = componentPaletteId(draft.name);
    var detail = {
      paletteId: paletteId,
      definitionName: draft.name,
      definitionUUID: draft.componentNode && typeof draft.componentNode.qhtmlUUID === "function" ? draft.componentNode.qhtmlUUID() : "",
      displayName: draft.name,
      category: "Custom Components",
      description: "User component",
      iconLabel: "N",
      instanceName: componentInstanceName(draft.name),
      slotNames: slotsFromDefinition(draft.componentNode).join(","),
      definitionSource: draft.definitionSource,
      componentNode: draft.componentNode
    };
    state.customComponents[paletteId] = detail;
    state.paletteDefinitions[paletteId] = {
      uuid: detail.definitionUUID,
      name: detail.definitionName,
      slots: normalizeSlotList(detail.slotNames),
      definition: draft.componentNode
    };

    var button = document.createElement("button");
    button.type = "button";
    button.className = "builder-palette-button";
    button.setAttribute("data-builder-palette-button", "1");
    button.setAttribute("data-palette-id", detail.paletteId);
    button.setAttribute("data-definition-name", detail.definitionName);
    button.setAttribute("data-definition-uuid", detail.definitionUUID);
    button.setAttribute("data-slot-names", detail.slotNames);
    button.innerHTML = '<span class="builder-palette-icon"></span><span class="builder-palette-name"></span><span class="builder-palette-description"></span>';
    button.querySelector(".builder-palette-icon").textContent = detail.iconLabel;
    button.querySelector(".builder-palette-name").textContent = detail.displayName;
    button.querySelector(".builder-palette-description").textContent = detail.description;

    var component = Object.assign(button, detail, {
      instantiatePaletteItem: function () {
        return instantiateCustomPaletteItem(component);
      }
    });
    button.__qhtmlPaletteComponent = component;
    button.addEventListener("pointerdown", function (event) {
      api.beginButtonPointerDrag(component, event);
    });
    button.addEventListener("click", function (event) {
      api.selectButton(component, event);
    });
    list.appendChild(button);
    registerPaletteItem(component);
    return button;
  }

  function saveNewComponentDialog() {
    var draft = state.newComponentDialog;
    if (!draft) return false;
    var controls = dialogControls(draft.dialogElement);
    if (!commitEditorSource(controls, draft, currentEditorSource(controls)) || !validateNameInput(controls.name)) {
      setStatus(controls, "Fix the component before saving", true);
      return false;
    }
    appendCustomPaletteButton(draft);
    if (controls.dialog.open) controls.dialog.close();
    emit("qhtml-page-builder-component-created", {
      name: draft.name,
      source: draft.definitionSource
    });
    return true;
  }

  function normalizeSlotList(slots) {
    if (Array.isArray(slots)) return slots.map(String);
    if (typeof slots === "string") return slots.split(/\s*,\s*/).filter(Boolean);
    return [];
  }

  function pointerDistance(drag, event) {
    var dx = event.clientX - drag.startX;
    var dy = event.clientY - drag.startY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function dragSourceElement(event) {
    return event && event.currentTarget && event.currentTarget.closest
      ? event.currentTarget.closest(".builder-palette-button")
      : null;
  }

  function createDragClone(drag, event) {
    var source = drag.sourceElement || dragSourceElement(event);
    var clone = source ? source.cloneNode(true) : document.createElement("div");
    clone.classList.add("builder-palette-drag-clone");
    clone.removeAttribute("id");
    clone.style.position = "fixed";
    clone.style.left = "0";
    clone.style.top = "0";
    clone.style.width = source ? source.getBoundingClientRect().width + "px" : "220px";
    clone.style.pointerEvents = "none";
    clone.style.zIndex = "100000";
    clone.style.opacity = "0.92";
    clone.style.transform = "translate3d(" + event.clientX + "px," + event.clientY + "px,0)";
    clone.style.boxShadow = "0 22px 56px rgba(15, 23, 42, 0.28)";
    document.body.appendChild(clone);
    drag.clone = clone;
  }

  function moveDragClone(drag, event) {
    if (!drag.clone) {
      createDragClone(drag, event);
    }
    drag.clone.style.transform = "translate3d(" + (event.clientX + 12) + "px," + (event.clientY + 12) + "px,0)";
  }

  function removeDragClone(drag) {
    if (drag && drag.clone && drag.clone.parentNode) {
      drag.clone.parentNode.removeChild(drag.clone);
    }
  }

  function cleanupPointerDrag() {
    var drag = state.pointerDrag;
    removeDragClone(drag);
    state.pointerDrag = null;
    window.removeEventListener("pointermove", handlePointerMove, true);
    window.removeEventListener("pointerup", handlePointerUp, true);
    window.removeEventListener("pointercancel", handlePointerCancel, true);
  }

  function handlePointerMove(event) {
    var drag = state.pointerDrag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    if (!drag.moved && pointerDistance(drag, event) >= 4) {
      drag.moved = true;
      emit("qhtml-page-builder-palette-pointer-drag-start", drag.detail);
    }
    if (drag.moved) {
      moveDragClone(drag, event);
      event.preventDefault();
    }
  }

  function handlePointerUp(event) {
    var drag = state.pointerDrag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.moved) {
      event.preventDefault();
      var instance = drag.component.instantiatePaletteItem();
      var dropped = false;
      if (window.QHTMLLayoutBuilder && typeof window.QHTMLLayoutBuilder.dropQHTMLAtPoint === "function") {
        dropped = window.QHTMLLayoutBuilder.dropQHTMLAtPoint(instance.instanceQHTML, event.clientX, event.clientY, instance);
      }
      emit("qhtml-page-builder-palette-drop", {
        instance: instance,
        dropped: dropped,
        x: event.clientX,
        y: event.clientY
      });
    }
    cleanupPointerDrag();
  }

  function handlePointerCancel(event) {
    var drag = state.pointerDrag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    cleanupPointerDrag();
  }

  var api = {
    state: state,

    openNewComponentDialog: function (dialogElement) {
      var controls = ensureNewComponentDialog(dialogElement);
      var draft = createNewComponentDraft();
      draft.dialogElement = controls.dialog;
      state.newComponentDialog = draft;
      syncControlsFromDraft(controls, draft);
      setEditorSource(controls, draft, componentSourceFromDraft(draft));
      commitEditorSource(controls, draft, currentEditorSource(controls));
      if (controls.dialog && typeof controls.dialog.showModal === "function") {
        controls.dialog.showModal();
      }
      if (byId("pbNewComponentTabs") && typeof byId("pbNewComponentTabs").buildTabs === "function") {
        byId("pbNewComponentTabs").buildTabs();
      }
      return draft;
    },

    beginDrag: function (component, event) {
      var detail = registerPaletteItem(component);
      state.activeDrag = detail;
      transferDragData(event, detail);
      emit("qhtml-page-builder-palette-drag-start", detail);
    },

    endDrag: function (component, event) {
      var detail = eventDetail(component);
      state.activeDrag = null;
      emit("qhtml-page-builder-palette-drag-end", detail);
    },

    selectItem: function (component, event) {
      var detail = registerPaletteItem(component);
      state.selectedPaletteId = detail.paletteId;
      emit("qhtml-page-builder-palette-selection-change", detail);
    },

    selectButton: function (component, event) {
      var detail = registerPaletteItem(component);
      state.selectedPaletteId = detail.paletteId;
      emit("qhtml-page-builder-palette-selection-change", detail);
    },

    requestEdit: function (component, event) {
      var detail = registerPaletteItem(component);
      emit("qhtml-page-builder-palette-edit-request", detail);
    },

    requestButtonEdit: function (component, event) {
      var detail = registerPaletteItem(component);
      emit("qhtml-page-builder-palette-edit-request", detail);
    },

    beginButtonPointerDrag: function (component, event) {
      var detail = registerPaletteItem(component);
      state.pointerDrag = {
        component: component,
        detail: detail,
        sourceElement: dragSourceElement(event),
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        moved: false,
        clone: null
      };
      window.addEventListener("pointermove", handlePointerMove, true);
      window.addEventListener("pointerup", handlePointerUp, true);
      window.addEventListener("pointercancel", handlePointerCancel, true);
    },

    createInstanceFromType: function (buttonComponent, componentDefinition) {
      var detail = registerPaletteItem(buttonComponent);
      var definitionSlots = slotsFromDefinition(componentDefinition);
      var instance = {
        paletteId: detail.paletteId,
        canvasInstanceId: detail.canvasInstanceId || "pb-instance-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
        definitionName: detail.definitionName,
        definitionUUID: detail.definitionUUID,
        paletteDefinitionName: qhtmlNodeName(componentDefinition),
        paletteDefinition: componentDefinition,
        displayName: detail.displayName,
        category: detail.category,
        instanceName: detail.instanceName,
        instanceQHTML: detail.instanceQHTML,
        slots: definitionSlots.length ? definitionSlots : normalizeSlotList(detail.slotNames),
        scopeImports: ["page-builder/palette.qhtml"]
      };
      state.canvasInstances[instance.canvasInstanceId] = {
        paletteId: instance.paletteId,
        node: instance,
        parentLayoutId: ""
      };
      emit("qhtml-page-builder-palette-instance-created", instance);
      return instance;
    },

    previewInstance: function (buttonComponent, instance, event) {
      emit("qhtml-page-builder-palette-instance-preview", {
        button: buttonComponent,
        instance: instance
      });
    },

    registerCanvasInstance: function (canvasInstanceId, paletteId, node, parentLayoutId) {
      state.canvasInstances[canvasInstanceId] = {
        paletteId: paletteId,
        node: node,
        parentLayoutId: parentLayoutId || ""
      };
      if (parentLayoutId) {
        state.topLevelCanvasItems[canvasInstanceId] = state.canvasInstances[canvasInstanceId];
      }
      emit("qhtml-page-builder-canvas-instance-registered", state.canvasInstances[canvasInstanceId]);
    },

    unregisterCanvasInstance: function (canvasInstanceId) {
      delete state.canvasInstances[canvasInstanceId];
      delete state.topLevelCanvasItems[canvasInstanceId];
      Object.keys(state.slotPlacements).forEach(function (slotKey) {
        state.slotPlacements[slotKey] = state.slotPlacements[slotKey].filter(function (placement) {
          return placement.canvasInstanceId !== canvasInstanceId;
        });
      });
    },

    recordSlotPlacement: function (ownerCanvasInstanceId, slotName, childCanvasInstanceId, childNode) {
      var key = ownerCanvasInstanceId + ":" + slotName;
      state.slotPlacements[key] = state.slotPlacements[key] || [];
      state.slotPlacements[key].push({
        ownerCanvasInstanceId: ownerCanvasInstanceId,
        slotName: slotName,
        canvasInstanceId: childCanvasInstanceId,
        node: childNode
      });
      emit("qhtml-page-builder-slot-placement-recorded", {
        ownerCanvasInstanceId: ownerCanvasInstanceId,
        slotName: slotName,
        canvasInstanceId: childCanvasInstanceId
      });
    },

    registerPaletteDefinition: function (paletteId, definition) {
      state.paletteDefinitions[paletteId] = state.paletteDefinitions[paletteId] || {};
      state.paletteDefinitions[paletteId].definition = definition;
      state.paletteDefinitions[paletteId].name = qhtmlNodeName(definition) || state.paletteDefinitions[paletteId].name || "";
      state.paletteDefinitions[paletteId].slots = slotsFromDefinition(definition);
      emit("qhtml-page-builder-palette-definition-registered", state.paletteDefinitions[paletteId]);
      return state.paletteDefinitions[paletteId];
    },

    beginSlotMigration: function (paletteId, nextSlots) {
      var definition = state.paletteDefinitions[paletteId] || { slots: [] };
      var oldSlots = normalizeSlotList(definition.slots);
      var newSlots = nextSlots && typeof nextSlots.childList === "function" ? slotsFromDefinition(nextSlots) : normalizeSlotList(nextSlots);
      var removed = oldSlots.filter(function (slotName) { return newSlots.indexOf(slotName) === -1; });
      var added = newSlots.filter(function (slotName) { return oldSlots.indexOf(slotName) === -1; });
      var affected = [];

      Object.keys(state.slotPlacements).forEach(function (key) {
        var slotName = key.split(":").slice(1).join(":");
        if (removed.indexOf(slotName) !== -1) {
          affected = affected.concat(state.slotPlacements[key]);
        }
      });

      var migration = {
        paletteId: paletteId,
        oldSlots: oldSlots,
        newSlots: newSlots,
        removedSlots: removed,
        addedSlots: added,
        affectedPlacements: affected
      };
      state.pendingSlotMigrations[paletteId] = migration;
      emit("qhtml-page-builder-slot-migration-request", migration);
      return migration;
    },

    applySlotMigration: function (paletteId, remap) {
      var migration = state.pendingSlotMigrations[paletteId];
      if (!migration) return null;
      migration.affectedPlacements.forEach(function (placement) {
        var nextSlot = remap && remap[placement.slotName];
        placement.nextSlotName = nextSlot || "";
        placement.deleted = nextSlot === "";
      });
      delete state.pendingSlotMigrations[paletteId];
      emit("qhtml-page-builder-slot-migration-apply", migration);
      return migration;
    },

    removeSlotContent: function (ownerCanvasInstanceId, slotName, childCanvasInstanceId) {
      var key = ownerCanvasInstanceId + ":" + slotName;
      state.slotPlacements[key] = (state.slotPlacements[key] || []).filter(function (placement) {
        return placement.canvasInstanceId !== childCanvasInstanceId;
      });
      emit("qhtml-page-builder-slot-content-removed", {
        ownerCanvasInstanceId: ownerCanvasInstanceId,
        slotName: slotName,
        canvasInstanceId: childCanvasInstanceId
      });
    },

    paletteItem: function (paletteId) {
      return state.paletteItems[paletteId] || null;
    },

    slotsFromDefinition: slotsFromDefinition,

    scan: scanPaletteItems
  };

  window.QHTMLPageBuilderPalette = api;
  document.addEventListener("DOMContentLoaded", scanPaletteItems);
  document.addEventListener("QHTMLContentLoaded", scanPaletteItems);
})();
