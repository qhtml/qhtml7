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

  class QHTMLGraphicsItem {
    constructor(options) {
      const initial = options || {};
      this._uuid = String(initial.uuid || QHTMLGraphicsIdentity.create("graphics-item"));
      this._scene = null;
      this._context2d = null;
      this._painter = QHTMLGraphicsItem.emptyPainter;
      this._transform = new QHTMLGraphicsTransform(this, initial);
      this._visible = initial.visible !== false;
      if (initial.painter) {
        this.setPainter(initial.painter);
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

    get painter() {
      return this._painter;
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

    setPainter(painterFunction) {
      if (typeof painterFunction !== "function") {
        throw new TypeError("graphicsItem.setPainter() requires a function reference.");
      }
      this._painter = painterFunction;
      this._scene?.requestRepaint();
      return this;
    }

    paint() {
      if (!this._context2d) {
        return;
      }
      this._context2d.save();
      try {
        this._transform.applyTo(this._context2d);
        return this._painter.call(this, this._context2d, this._scene);
      } finally {
        this._context2d.restore();
      }
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
      return this._items.length;
    }

    createItem(options) {
      return this.addItem(new QHTMLGraphicsItem(options));
    }

    addItem(graphicsItem) {
      if (!(graphicsItem instanceof QHTMLGraphicsItem)) {
        throw new TypeError("graphics-scene.addItem() requires a QHTMLGraphicsItem.");
      }

      const existing = this._itemsByUUID.get(graphicsItem.uuid);
      if (existing === graphicsItem) {
        return graphicsItem;
      }
      if (existing) {
        throw new Error(`Graphics item UUID ${graphicsItem.uuid} already exists in this scene.`);
      }

      graphicsItem._attachToScene(this, this._context);
      this._itemsByUUID.set(graphicsItem.uuid, graphicsItem);
      this._items.push(graphicsItem);
      this.requestRepaint();
      this.dispatchEvent(new CustomEvent("graphicsitemadded", {
        bubbles: false,
        detail: { scene: this, item: graphicsItem, uuid: graphicsItem.uuid }
      }));
      return graphicsItem;
    }

    removeItem(graphicsItem) {
      if (!(graphicsItem instanceof QHTMLGraphicsItem)) {
        throw new TypeError("graphics-scene.removeItem() requires a QHTMLGraphicsItem.");
      }
      if (this._itemsByUUID.get(graphicsItem.uuid) !== graphicsItem) {
        return false;
      }

      this._itemsByUUID.delete(graphicsItem.uuid);
      const index = this._items.indexOf(graphicsItem);
      this._items.splice(index, 1);
      graphicsItem._detachFromScene(this);
      this.requestRepaint();
      this.dispatchEvent(new CustomEvent("graphicsitemremoved", {
        bubbles: false,
        detail: { scene: this, item: graphicsItem, uuid: graphicsItem.uuid }
      }));
      return true;
    }

    listItems() {
      return this._items.slice();
    }

    itemByUUID(uuid) {
      return this._itemsByUUID.get(String(uuid || ""));
    }

    clearItems() {
      const removedItems = this._items.slice();
      this._itemsByUUID.clear();
      this._items.length = 0;
      removedItems.forEach((graphicsItem) => {
        graphicsItem._detachFromScene(this);
      });
      this.requestRepaint();
      return removedItems;
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

  globalScope.QHTMLGraphicsTransform = QHTMLGraphicsTransform;
  globalScope.QHTMLGraphicsItem = QHTMLGraphicsItem;
  globalScope.QHTMLGraphicsScene = QHTMLGraphicsScene;
  globalScope.QHTMLGraphics = Object.assign(globalScope.QHTMLGraphics || {}, {
    QHTMLGraphicsTransform,
    QHTMLGraphicsItem,
    QHTMLGraphicsScene
  });

  if (!globalScope.customElements.get(GRAPHICS_SCENE_TAG)) {
    globalScope.customElements.define(GRAPHICS_SCENE_TAG, QHTMLGraphicsScene);
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
