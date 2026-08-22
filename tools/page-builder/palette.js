(function () {
  "use strict";

  var state = {
    activeDrag: null,
    selectedPaletteId: "",
    paletteDefinitions: Object.create(null),
    paletteDefinitionSources: Object.create(null),
    paletteDefinitionSourcesByName: Object.create(null),
    paletteItems: Object.create(null),
    canvasInstances: Object.create(null),
    topLevelCanvasItems: Object.create(null),
    slotPlacements: Object.create(null),
    pendingSlotMigrations: Object.create(null),
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
        slots: detail.slotNames ? detail.slotNames.split(/\s*,\s*/) : [],
        source: state.paletteDefinitionSources[detail.paletteId] || state.paletteDefinitionSourcesByName[detail.definitionName] || ""
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

  function sourceQHTML(node) {
    if (!node) return "";
    if (typeof node.sourceQHTML === "function") return String(node.sourceQHTML(0) || "");
    if (typeof node.toQHTML === "function") return String(node.toQHTML(0) || "");
    return "";
  }

  function resolveDefinition(component, definitionName, event) {
    var name = String(definitionName || "").trim();
    var target = event && event.currentTarget ? event.currentTarget : null;
    var host = target && target.closest ? target.closest("q-html,q-html7") : null;
    if (component && name && typeof component.qhtmlResolve === "function") {
      var local = component.qhtmlResolve(name);
      if (local) return local;
    }
    if (host && host.qhtmlNode && name && typeof host.qhtmlNode.qhtmlResolve === "function") {
      var hosted = host.qhtmlNode.qhtmlResolve(name);
      if (hosted) return hosted;
    }
    var roots = document.querySelectorAll("q-html,q-html7");
    for (var i = 0; i < roots.length; i += 1) {
      var root = roots[i];
      if (root.qhtmlNode && name && typeof root.qhtmlNode.qhtmlResolve === "function") {
        var resolved = root.qhtmlNode.qhtmlResolve(name);
        if (resolved) return resolved;
      }
    }
    return null;
  }

  function paletteIdForDefinitionName(definitionName) {
    var wanted = String(definitionName || "").trim();
    var found = "";
    Object.keys(state.paletteItems).some(function (paletteId) {
      var item = state.paletteItems[paletteId];
      if (item && item.detail && item.detail.definitionName === wanted) {
        found = paletteId;
        return true;
      }
      return false;
    });
    return found;
  }

  function definitionSourceForDetail(component, detail, event) {
    if (!detail) return "";
    if (detail.paletteId && state.paletteDefinitionSources[detail.paletteId]) {
      return state.paletteDefinitionSources[detail.paletteId];
    }
    if (detail.definitionName && state.paletteDefinitionSourcesByName[detail.definitionName]) {
      return state.paletteDefinitionSourcesByName[detail.definitionName];
    }
    return sourceQHTML(resolveDefinition(component, detail.definitionName, event));
  }

  function qhtmlModule() {
    return window.QHTML7 && window.QHTML7.Module ? window.QHTML7.Module : null;
  }

  function definitionSlotsFromSource(source, definitionName) {
    var Module = qhtmlModule();
    if (!Module || typeof Module.QHTMLDomTree !== "function") return [];
    var tree = new Module.QHTMLDomTree();
    try {
      if (typeof tree.fromQHTML === "function") {
        tree.fromQHTML(String(source || ""));
      }
      if (definitionName && typeof tree.qhtmlResolve === "function") {
        return slotsFromDefinition(tree.qhtmlResolve(String(definitionName || "")));
      }
      return [];
    } finally {
      if (tree && typeof tree.delete === "function") tree.delete();
    }
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
      detail.definitionSource = definitionSourceForDetail(component, detail, event);
      emit("qhtml-page-builder-palette-edit-request", detail);
    },

    requestButtonEdit: function (component, event) {
      var detail = registerPaletteItem(component);
      detail.definitionSource = definitionSourceForDetail(component, detail, event);
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
      var resolvedDefinition = resolveDefinition(buttonComponent, detail.definitionName);
      if (resolvedDefinition) {
        api.registerPaletteDefinition(detail.paletteId, resolvedDefinition);
      }
      var definitionSlots = slotsFromDefinition(resolvedDefinition) || slotsFromDefinition(componentDefinition);
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
      state.paletteDefinitions[paletteId].source = state.paletteDefinitionSources[paletteId] || sourceQHTML(definition);
      emit("qhtml-page-builder-palette-definition-registered", state.paletteDefinitions[paletteId]);
      return state.paletteDefinitions[paletteId];
    },

    applyPaletteDefinitionSource: function (paletteId, definitionName, source) {
      var id = String(paletteId || "").trim() || paletteIdForDefinitionName(definitionName);
      var name = String(definitionName || "").trim();
      var text = String(source || "").trim();
      if (!id && name) id = paletteIdForDefinitionName(name);
      if (id) state.paletteDefinitionSources[id] = text;
      if (name) state.paletteDefinitionSourcesByName[name] = text;
      if (id) {
        state.paletteDefinitions[id] = state.paletteDefinitions[id] || {};
        state.paletteDefinitions[id].name = name || state.paletteDefinitions[id].name || "";
        state.paletteDefinitions[id].source = text;
        state.paletteDefinitions[id].slots = definitionSlotsFromSource(text, name);
      }
      emit("qhtml-page-builder-palette-definition-source-change", {
        paletteId: id,
        definitionName: name,
        source: text
      });
      return text;
    },

    definitionSource: function (paletteId, definitionName) {
      var id = String(paletteId || "").trim() || paletteIdForDefinitionName(definitionName);
      var name = String(definitionName || "").trim();
      return (id && state.paletteDefinitionSources[id]) || (name && state.paletteDefinitionSourcesByName[name]) || "";
    },

    serializedDefinitionOverrides: function () {
      return Object.keys(state.paletteDefinitionSources)
        .map(function (paletteId) { return state.paletteDefinitionSources[paletteId]; })
        .filter(function (source) { return String(source || "").trim(); })
        .join("\n\n");
    },

    paletteIdForDefinitionName: paletteIdForDefinitionName,

    isPaletteDefinitionName: function (definitionName) {
      return !!paletteIdForDefinitionName(definitionName);
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
