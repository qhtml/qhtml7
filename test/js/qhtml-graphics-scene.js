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
