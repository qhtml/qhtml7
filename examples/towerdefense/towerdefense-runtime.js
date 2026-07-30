(function () {
  "use strict";

  var runtime = window.TowerDefenseRuntime || {};

  function ensureStyles() {
    if (document.getElementById("td-runtime-styles")) {
      return;
    }

    var style = document.createElement("style");
    style.id = "td-runtime-styles";
    style.textContent = [
      ".td-board-surface{position:relative;width:1500px;height:1000px;background:#000;display:block;overflow:hidden;}",
      ".td-store{position:fixed;left:14px;right:14px;bottom:14px;z-index:900;align-items:center;gap:12px;min-height:82px;box-sizing:border-box;padding:14px;border:1px solid rgba(10,236,40,.48);background:rgba(5,42,12,.94);color:#d1fae5;}",
      ".td-store-item{display:flex;flex-direction:column;gap:4px;align-items:flex-start;}",
      ".td-store-label{font-size:12px;line-height:1.3;color:#a7f3d0;}",
      ".td-button{min-height:44px;border:1px solid rgba(10,236,40,.64);background:rgba(10,236,40,.16);color:#d1fae5;padding:0 18px;font-weight:800;cursor:pointer;}",
      ".td-button.sell{border-color:rgba(248,113,113,.72);background:rgba(127,29,29,.56);}",
      ".td-tile{position:absolute;box-sizing:border-box;border:1px solid #f9f0f0;background:#000;}",
      ".td-tile.square{background:#000;}",
      ".td-tile.wall{background:#707070;}",
      ".td-tile.entrance{background:#087d28;}",
      ".td-tile.exit{background:#b91c1c;}",
      ".td-tile.selected{background:#fff;}",
      ".td-tile.buildable{border-color:darkGreen;}",
      ".td-tile.blocked{border-color:darkRed;}",
      ".td-gun{position:absolute;box-sizing:border-box;border:2px solid #f9f0f0;background:#000;z-index:120;}",
      ".td-gun.selected{outline:3px solid #fff;}",
      ".td-gun-particle-field{position:absolute;display:block;pointer-events:none;overflow:hidden;z-index:260;}",
      ".td-gun-particle-field particle-emitter{position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:none;}",
      ".td-enemy-hitbox{position:absolute;display:block;pointer-events:none;overflow:visible;z-index:255;}",
      ".td-enemy-hitbox particle-emitter{position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:none;}",
      ".td-entity{position:absolute;box-sizing:border-box;z-index:105;transition-property:left,top,opacity,transform;transition-timing-function:linear;}",
      ".td-projectile{position:absolute;z-index:300;pointer-events:none;transition-property:left,top,opacity,transform;transition-timing-function:linear;}",
      ".td-projectile-layer{position:absolute;inset:0;display:block;z-index:300;pointer-events:none;overflow:visible;}",
      ".td-particle-effect{position:absolute;inset:0;display:block;pointer-events:none;overflow:hidden;}",
      ".td-fill{width:100%;height:100%;object-fit:contain;display:block;}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function numericPixels(value, fallback) {
    var parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function cssValue(value) {
    return value == null ? "" : String(value);
  }

  function setStyleValue(element, property, value) {
    var next = cssValue(value);
    if (element.style[property] !== next) {
      element.style[property] = next;
    }
  }

  function setEmitterAttributes(emitter, attributes) {
    Object.keys(attributes).forEach(function (name) {
      emitter.setAttribute(name, String(attributes[name]));
    });
  }

  function applyBox(element, model) {
    element.id = model.domId;
    element.qhtmlObject = model;
    element.qhtmlObjectUuid = model.uuid;
    element.setAttribute("data-qhtml-object", model.uuid);
    setStyleValue(element, "left", model.x);
    setStyleValue(element, "top", model.y);
    setStyleValue(element, "width", model.width);
    setStyleValue(element, "height", model.height);
  }

  function setImage(element, src, alt) {
    var image = element.querySelector(":scope > img.td-fill");

    if (!image) {
      image = document.createElement("img");
      image.className = "td-fill";
      element.appendChild(image);
    }

    image.src = src;
    image.alt = alt;
    return image;
  }

  class ParticleEffectProfile {
    constructor(type, tagName, fallback) {
      this.type = Number(type);
      this.tagName = tagName;
      this.fallback = Object.assign({}, fallback || {});
    }
  }

  class ParticleEffectRegistry {
    constructor(profiles) {
      this._profiles = new Map();
      (profiles || []).forEach(function (profile) {
        this._profiles.set(profile.type, profile);
      }, this);
    }

    resolve(type) {
      return this._profiles.get(Number(type)) || this._profiles.get(4) || this._profiles.get(1);
    }
  }

  var particleEffects = new ParticleEffectRegistry([
    new ParticleEffectProfile(1, "td-particle-tank-muzzle-blast", {
      emitRate: 22,
      lifetime: 400,
      startSize: 14,
      endSize: 3,
      maxActiveParticles: 24,
      src: "assets/particles/particleA.png",
      color: "#ffc020"
    }),
    new ParticleEffectProfile(2, "td-particle-machine-gun", {
      emitRate: 90,
      lifetime: 70,
      startSize: 20,
      endSize: 2,
      maxActiveParticles: 8,
      src: "assets/particles/tracer.png",
      color: "#ffce0a"
    }),
    new ParticleEffectProfile(3, "td-flame-blast", {
      emitRate: 15,
      lifetime: 300,
      startSize: 38,
      endSize: 50,
      maxActiveParticles: 8,
      src: "assets/particles/particleflame.png",
      color: "#d39427"
    }),
    new ParticleEffectProfile(4, "td-particle-fireball", {
      emitRate: 38,
      lifetime: 240,
      startSize: 24,
      endSize: 4,
      maxActiveParticles: 32,
      src: "assets/particles/particleflame.png",
      color: "#ff400f"
    })
  ]);

  function gunParticleConfig(type) {
    var profile = particleEffects.resolve(type);
    var fallback = profile && profile.fallback ? profile.fallback : {};

    return Object.assign({
      src: "assets/particles/particleA.png",
      color: "#ffc020",
      colorOpacity: "0.85",
      emitRate: "0",
      interval: "12",
      maxActiveParticles: "72",
      maxActiveParticlesVariation: "8",
      lifetime: "260",
      lifetimeVariation: "80",
      xVariation: "0",
      yVariation: "0",
      xVelocity: "2.0",
      yVelocity: "0",
      xVelocityVariation: "0.35",
      yVelocityVariation: "0.35",
      xAcceleration: "0",
      yAcceleration: "0.002",
      xAccelerationVariation: "0.002",
      yAccelerationVariation: "0.004",
      startSize: "18",
      endSize: "3",
      startSizeVariation: "8",
      endSizeVariation: "2",
      startOpacity: "0.9",
      endOpacity: "0.02",
      startOpacityVariation: "0.12",
      endOpacityVariation: "0.02"
    }, fallback, {
      running: "false"
    });
  }

  function configureGunParticleEmitter(emitter, gun, range) {
    var config = gunParticleConfig(gun.type);
    Object.keys(config).forEach(function (key) {
      emitter.setAttribute(key, String(config[key]));
    });

    emitter.setAttribute("x", String(range));
    emitter.setAttribute("y", String(range));
    emitter.setAttribute("width", "1");
    emitter.setAttribute("height", "1");
    emitter.setAttribute("xVariation", "0");
    emitter.setAttribute("yVariation", "0");
    emitter.setAttribute("running", "false");
  }

  function ensureGunParticleEffects(board) {
    if (!board.__tdGunParticleEffects) {
      board.__tdGunParticleEffects = board.gunParticleEffects || {};
      board.gunParticleEffects = board.__tdGunParticleEffects;
      if (typeof board.setContextProperty === "function") {
        board.setContextProperty("gunParticleEffects", board.__tdGunParticleEffects);
      }
    }
    return board.__tdGunParticleEffects;
  }

  function enemyParticleLayer(board) {
    var renderer = board && board.boardRenderer;
    if (!renderer) {
      return null;
    }

    if (!renderer.__tdEnemyParticleLayer) {
      renderer.__tdEnemyParticleLayer = document.createElement("div");
      renderer.__tdEnemyParticleLayer.className = "td-particle-effect";
      renderer.appendChild(renderer.__tdEnemyParticleLayer);
    }

    return renderer.__tdEnemyParticleLayer;
  }

  function createEnemyEffectEmitter(src, config) {
    var emitter = document.createElement("particle-emitter");
    setEmitterAttributes(emitter, Object.assign({
      src: src,
      running: "false",
      emitRate: "0",
      interval: "12",
      width: "1",
      height: "1",
      xVariation: "0",
      yVariation: "0",
      xVelocity: "0",
      yVelocity: "0",
      xVelocityVariation: "0",
      yVelocityVariation: "0",
      xAcceleration: "0",
      yAcceleration: "0",
      xAccelerationVariation: "0",
      yAccelerationVariation: "0",
      zIndex: "1"
    }, config));
    return emitter;
  }

  function enemyParticleBounds(enemy) {
    var width = numericPixels(enemy.width, 50);
    var height = numericPixels(enemy.height, 50);
    var rotationSafeSize = Math.ceil(Math.sqrt((width * width) + (height * height))) + 10;
    return {
      width: rotationSafeSize * 2,
      height: rotationSafeSize * 3
    };
  }

  function enemyParticleCenter(effect) {
    return {
      x: numericPixels(effect.element.style.width, effect.width) * 0.5,
      y: numericPixels(effect.element.style.height, effect.height) * 0.5
    };
  }

  function updateEnemyParticlePosition(effect, enemy) {
    var width = numericPixels(enemy.width, 50);
    var height = numericPixels(enemy.height, 50);
    var centerX = numericPixels(enemy.x, 0) + (width * 0.5);
    var centerY = numericPixels(enemy.y, 0) + (height * 0.5) + (height * 0.33);
    var bounds = enemyParticleBounds(enemy);
    effect.width = bounds.width;
    effect.height = bounds.height;
    setStyleValue(effect.element, "left", (centerX - (effect.width * 0.5)) + "px");
    setStyleValue(effect.element, "top", (centerY - (effect.height * 0.5)) + "px");
    setStyleValue(effect.element, "width", effect.width + "px");
    setStyleValue(effect.element, "height", effect.height + "px");
    effect.emitters.forEach(function (emitter) {
      emitter.setAttribute("x", String(effect.width * 0.5));
      emitter.setAttribute("y", String(effect.height * 0.5));
    });
  }

  function createEnemyParticleDiv(layer) {
    var element = document.createElement("div");

    var rocket = createEnemyEffectEmitter("assets/particles/rocketbacklit.png", {
      color: "#f97316",
      colorOpacity: "0.38",
      maxActiveParticles: "26",
      maxActiveParticlesVariation: "5",
      lifetime: "720",
      lifetimeVariation: "120",
      startSize: "20",
      endSize: "44",
      startSizeVariation: "6",
      endSizeVariation: "18",
      startOpacity: "0.51",
      endOpacity: "0.01",
      startOpacityVariation: "0.12",
      endOpacityVariation: "0.01"
    });
    var smoke = createEnemyEffectEmitter("assets/particles/barrelpoof.png", {
      emitterMask: "assets/particles/barrelpoof.png",
      color: "#333333",
      colorOpacity: "0.5",
      maxActiveParticles: "34",
      maxActiveParticlesVariation: "6",
      lifetime: "1000",
      lifetimeVariation: "350",
      width: "6",
      height: "6",
      xVariation: "3",
      yVariation: "3",
      xVelocity: "0.08",
      yVelocity: "-0.55",
      xVelocityVariation: "0.22",
      yVelocityVariation: "0.32",
      yAcceleration: "-0.0006",
      startSize: "10",
      endSize: "30",
      startSizeVariation: "8",
      endSizeVariation: "28",
      startOpacity: "0.48",
      endOpacity: "0.01",
      startOpacityVariation: "0.12",
      endOpacityVariation: "0.02"
    });
    var effect = {
      element: element,
      emitters: [rocket, smoke],
      ember: rocket,
      rocket: rocket,
      smoke: smoke,
      width: 1,
      height: 1,
      timer: 0
    };

    element.className = "td-enemy-hitbox";
    element.style.display = "none";

    element.appendChild(rocket);
    element.appendChild(smoke);
    layer.appendChild(element);
    return effect;
  }

  function createEnemyParticleManager(board) {
    return {
      board: board,
      activeDivs: [],
      inactiveDivs: [],
      ensurePoolSize(count) {
        var layer = enemyParticleLayer(this.board);
        if (!layer) {
          return;
        }
        while ((this.activeDivs.length + this.inactiveDivs.length) < count) {
          this.inactiveDivs.push(createEnemyParticleDiv(layer));
        }
      },
      acquire() {
        var layer = enemyParticleLayer(this.board);
        if (!layer) {
          return null;
        }
        if (this.inactiveDivs.length === 0) {
          this.inactiveDivs.push(createEnemyParticleDiv(layer));
        }
        var effect = this.inactiveDivs.pop();
        this.activeDivs.push(effect);
        if (effect.timer) {
          clearTimeout(effect.timer);
          effect.timer = 0;
        }
        effect.element.style.display = "block";
        return effect;
      },
      release(effect) {
        var index = this.activeDivs.indexOf(effect);
        if (index >= 0) {
          this.activeDivs.splice(index, 1);
        }
        effect.element.style.display = "none";
        this.inactiveDivs.push(effect);
      },
      enemyKilled(enemy) {
        var effect = this.acquire();
        if (!effect) {
          return;
        }
        updateEnemyParticlePosition(effect, enemy);
        var center = enemyParticleCenter(effect);
        effect.rocket.burst(center.x, center.y, 14);
        effect.smoke.burst(center.x, center.y, 22);
        effect.timer = setTimeout(function () {
          this.release(effect);
        }.bind(this), 2300);
      },
      enemyExited() {},
      syncPool() {
        var guns = this.board.gunsList || [];
        this.ensurePoolSize(Math.max(4, guns.length + 2));
      }
    };
  }

  function ensureEnemyParticleManager(board) {
    if (!board.__tdEnemyParticleManager) {
      board.__tdEnemyParticleManager = createEnemyParticleManager(board);
      board.enemyParticleManager = board.__tdEnemyParticleManager;
      if (typeof board.setContextProperty === "function") {
        board.setContextProperty("enemyParticleManager", board.__tdEnemyParticleManager);
      }
    }
    board.__tdEnemyParticleManager.syncPool();
    return board.__tdEnemyParticleManager;
  }

  function scheduleBoardStart(board) {
    if (board.__tdStartScheduled === true) {
      return;
    }

    board.__tdStartScheduled = true;
    setTimeout(function () {
      board.__tdStartScheduled = false;
      if (!board.game) {
        var game = board.closest("td-game");
        if (game) {
          board.game = game;
        }
      }
      if (!board.game) {
        scheduleBoardStart(board);
        return;
      }
      board.startGame();
    }, 0);
  }

  class TDTileView extends HTMLElement {
    set board(value) { this.__tdBoard = value; }
    set object(value) { this.__tdObject = value; this.render(); }
    get object() { return this.__tdObject; }

    connectedCallback() {
      ensureStyles();
      this.render();
    }

    render() {
      var tile = this.__tdObject;
      if (!tile) return;

      applyBox(this, tile);
      this.className = "td-tile " + tile.kind + " " + (tile.selected ? "selected" : "") + " " + (tile.buildable ? "buildable" : "blocked");
      this.onclick = function () {
        this.__tdBoard.selectTile(tile.id);
      }.bind(this);
    }
  }

  class TDGunView extends HTMLElement {
    set board(value) { this.__tdBoard = value; }
    set object(value) { this.__tdObject = value; this.render(); }
    get object() { return this.__tdObject; }

    connectedCallback() {
      ensureStyles();
      this.render();
    }

    disconnectedCallback() {
      if (this.__tdGunParticleEmitter && typeof this.__tdGunParticleEmitter.clear === "function") {
        this.__tdGunParticleEmitter.clear();
      }
    }

    ensureParticleField(gun) {
      if (!this.__tdGunParticleField) {
        this.__tdGunParticleField = document.createElement("div");
        this.__tdGunParticleField.className = "td-gun-particle-field";
        this.__tdGunParticleEmitter = document.createElement("particle-emitter");
        this.__tdGunParticleEmitter.setAttribute("data-role", "tower-muzzle");
        this.__tdGunParticleField.appendChild(this.__tdGunParticleEmitter);
        this.appendChild(this.__tdGunParticleField);
      }

      var range = Math.max(1, Number(gun.range) || 1);
      var width = numericPixels(gun.width, 50);
      var height = numericPixels(gun.height, 50);
      var left = (width * 0.5) - range;
      var top = (height * 0.5) - range;

      this.__tdGunParticleField.style.left = left + "px";
      this.__tdGunParticleField.style.top = top + "px";
      this.__tdGunParticleField.style.width = (range * 2) + "px";
      this.__tdGunParticleField.style.height = (range * 2) + "px";
      this.__tdGunParticleField.style.transformOrigin = "50% 50%";
      this.__tdGunParticleField.style.transform = "rotate(" + gun.rotation + "deg)";
      configureGunParticleEmitter(this.__tdGunParticleEmitter, gun, range);

      if (!this.__tdGunParticleApi) {
        this.__tdGunParticleApi = {
          field: this.__tdGunParticleField,
          emitter: this.__tdGunParticleEmitter,
          range: range,
          burst: function (count) {
            var centerX = numericPixels(this.__tdGunParticleField.style.width, this.__tdGunParticleApi.range * 2) * 0.5;
            var centerY = numericPixels(this.__tdGunParticleField.style.height, this.__tdGunParticleApi.range * 2) * 0.5;
            return this.__tdGunParticleEmitter.burst(centerX, centerY, count);
          }.bind(this)
        };
      }

      this.__tdGunParticleApi.field = this.__tdGunParticleField;
      this.__tdGunParticleApi.emitter = this.__tdGunParticleEmitter;
      this.__tdGunParticleApi.range = range;

      gun.particleField = this.__tdGunParticleField;
      gun.particleEmitter = this.__tdGunParticleEmitter;
      gun.particleEffect = this.__tdGunParticleApi;

      ensureGunParticleEffects(this.__tdBoard)[gun.uuid] = this.__tdGunParticleApi;
    }

    render() {
      var gun = this.__tdObject;
      if (!gun) return;

      applyBox(this, gun);
      this.className = "td-gun " + (gun.selected ? "selected" : "");
      var image = setImage(this, "assets/guns/" + gun.type + ".png", "gun");
      image.style.transform = "rotate(" + gun.rotation + "deg)";
      image.style.transitionDuration = "200ms";
      this.ensureParticleField(gun);
      this.onclick = function () {
        this.__tdBoard.selectGun(gun.id);
      }.bind(this);
    }
  }

  class TDEnemyView extends HTMLElement {
    set board(value) { this.__tdBoard = value; }
    set object(value) { this.__tdObject = value; this.render(); }
    get object() { return this.__tdObject; }

    connectedCallback() {
      ensureStyles();
      this.render();
    }

    render() {
      var enemy = this.__tdObject;
      if (!enemy) return;

      applyBox(this, enemy);
      this.className = "td-entity";
      setStyleValue(this, "opacity", enemy.opacity);
      setStyleValue(this, "transform", "rotate(" + enemy.rotation + "deg)");
      setStyleValue(this, "transitionDuration", enemy.speed + "ms");
      setImage(this, "assets/attackers/" + enemy.type + ".png", "enemy");
    }
  }

  class TDProjectileView extends HTMLElement {
    set board(value) { this.__tdBoard = value; }
    set object(value) { this.__tdObject = value; this.render(); }
    get object() { return this.__tdObject; }

    connectedCallback() {
      ensureStyles();
      this.render();
    }

    render() {
      var projectile = this.__tdObject;
      if (!projectile) return;

      this.id = projectile.domId;
      this.qhtmlObject = projectile;
      this.qhtmlObjectUuid = projectile.uuid;
      this.setAttribute("data-qhtml-object", projectile.uuid);
      this.className = "td-projectile";
      setStyleValue(this, "width", projectile.width);
      setStyleValue(this, "height", projectile.height);
      setStyleValue(this, "opacity", projectile.opacity);
      setStyleValue(this, "transform", "rotate(" + projectile.rotation + "deg)");
      setImage(this, "assets/projectiles/" + projectile.type + ".png", "projectile");

      if (this.__tdProjectileId === projectile.id) {
        return;
      }

      this.__tdProjectileId = projectile.id;
      setStyleValue(this, "transitionDuration", "0ms");
      setStyleValue(this, "left", projectile.startX);
      setStyleValue(this, "top", projectile.startY);
      this.offsetWidth;
      setTimeout(function () {
        setStyleValue(this, "transitionDuration", projectile.duration + "ms");
        setStyleValue(this, "left", projectile.targetX);
        setStyleValue(this, "top", projectile.targetY);
      }.bind(this), 0);
    }
  }

  function syncCollection(owner, board, list, map, tagName) {
    var live = {};
    list = list || [];

    list.forEach(function (object) {
      live[object.uuid] = true;
      var element = map[object.uuid];

      if (!element) {
        element = document.createElement(tagName);
        element.board = board;
        map[object.uuid] = element;
        owner.appendChild(element);
      }

      element.board = board;
      element.object = object;
    });

    Object.keys(map).forEach(function (uuid) {
      if (!live[uuid]) {
        map[uuid].remove();
        delete map[uuid];
      }
    });
  }

  class TDBoardRenderer extends HTMLElement {
    connectedCallback() {
      ensureStyles();
      this.classList.add("td-board-surface");
      this.renderedTiles = {};
      this.renderedGuns = {};
      this.renderedEnemies = {};
      this.renderedProjectiles = {};
      var board = this.closest("td-board");

      if (board) {
        board.boardRenderer = this;
        this.sync(board);
        scheduleBoardStart(board);
      }
    }

    sync(board) {
      this.board = board;
      syncCollection(this, board, board.tilesList, this.renderedTiles, "td-tile-view");
      syncCollection(this, board, board.gunsList, this.renderedGuns, "td-gun-view");
      syncCollection(this, board, board.enemiesList, this.renderedEnemies, "td-enemy-view");
      syncCollection(this, board, board.projectilesList, this.renderedProjectiles, "td-projectile-view");
      board.renderedTiles = this.renderedTiles;
      board.renderedGuns = this.renderedGuns;
      board.renderedEnemies = this.renderedEnemies;
      board.renderedProjectiles = this.renderedProjectiles;
      ensureGunParticleEffects(board);
      ensureEnemyParticleManager(board);
      runtime.syncStores(board);
    }
  }

  function button(text, clickHandler) {
    var item = document.createElement("button");
    item.className = "td-button";
    item.type = "button";
    item.textContent = text;
    item.onclick = clickHandler;
    return item;
  }

  function upgradeItem(action, clickHandler) {
    var item = document.createElement("div");
    var control = button("", clickHandler);
    var label = document.createElement("span");
    item.className = "td-store-item";
    control.setAttribute("data-action", action);
    label.className = "td-store-label";
    label.setAttribute("data-label", action);
    item.appendChild(control);
    item.appendChild(label);
    return item;
  }

  class TDStorePanel extends HTMLElement {
    storeKind() {
      return this.getAttribute("kind") || "upgrade";
    }

    connectedCallback() {
      ensureStyles();
      this.classList.add("td-store");
      this.render();
      this.sync();
    }

    activeBoard() {
      return this.closest("td-game").board;
    }

    render() {
      var kind = this.storeKind();
      if (this.__tdRenderedKind === kind) return;

      this.__tdRenderedKind = kind;
      this.textContent = "";

      if (kind === "gun") {
        this.appendChild(button("cannon - $250", function () { this.activeBoard().placeGunOnSelected(1); }.bind(this)));
        this.appendChild(button("machine gun - $250", function () { this.activeBoard().placeGunOnSelected(2); }.bind(this)));
        this.appendChild(button("flame tower - $250", function () { this.activeBoard().placeGunOnSelected(3); }.bind(this)));
      } else {
        this.appendChild(upgradeItem("range", function () { this.activeBoard().upgradeSelectedGunRange(); }.bind(this)));
        this.appendChild(upgradeItem("damage", function () { this.activeBoard().upgradeSelectedGunDamage(); }.bind(this)));
        var sell = button("", function () { this.activeBoard().sellSelectedGun(); }.bind(this));
        sell.className = "td-button sell";
        sell.setAttribute("data-action", "sell");
        this.appendChild(sell);
      }
    }

    sync(board) {
      var activeBoard = board || this.activeBoard();

      if (!activeBoard || !activeBoard.game) {
        this.style.display = "none";
        return;
      }

      var kind = this.storeKind();
      this.style.display = kind === "gun"
        ? activeBoard.game.gunStoreDisplay
        : activeBoard.game.upgradeStoreDisplay;

      if (kind === "upgrade") {
        this.syncUpgradeLabels(activeBoard);
      }
    }

    syncUpgradeLabels(activeBoard) {
      var gun = activeBoard.guns[activeBoard.selectedGunId];
      if (!gun) return;

      this.querySelector("[data-action='range']").textContent = "Upgrade Range - $" + gun.rangeUpgradeCost;
      this.querySelector("[data-label='range']").textContent = "Upgrades: " + gun.rangeUpgrades + " | Current range: " + gun.range;
      this.querySelector("[data-action='damage']").textContent = "Upgrade Damage - $" + gun.damageUpgradeCost;
      this.querySelector("[data-label='damage']").textContent = "Upgrades: " + gun.damageUpgrades + " | Current damage: " + gun.damage;
      this.querySelector("[data-action='sell']").textContent = "Sell Tower +$" + activeBoard.selectedGunSellValue();
    }
  }

  class TDGunStore extends TDStorePanel {
    storeKind() { return "gun"; }
  }

  class TDUpgradeStore extends TDStorePanel {
    storeKind() { return "upgrade"; }
  }

  runtime.syncStores = function (board) {
    if (!board || !board.game) return;

    var game = board.game;
    Array.prototype.forEach.call(game.querySelectorAll("td-gun-store,td-upgrade-store"), function (store) {
      store.sync(board);
    });
  };

  runtime.enemyKilled = function (board, enemy) {
    ensureEnemyParticleManager(board).enemyKilled(enemy);
  };

  runtime.enemyExited = function (board, enemy) {
    ensureEnemyParticleManager(board).enemyExited(enemy);
  };

  if (!customElements.get("td-board-renderer")) customElements.define("td-board-renderer", TDBoardRenderer);
  if (!customElements.get("td-tile-view")) customElements.define("td-tile-view", TDTileView);
  if (!customElements.get("td-gun-view")) customElements.define("td-gun-view", TDGunView);
  if (!customElements.get("td-enemy-view")) customElements.define("td-enemy-view", TDEnemyView);
  if (!customElements.get("td-projectile-view")) customElements.define("td-projectile-view", TDProjectileView);
  if (!customElements.get("td-gun-store")) customElements.define("td-gun-store", TDGunStore);
  if (!customElements.get("td-upgrade-store")) customElements.define("td-upgrade-store", TDUpgradeStore);

  window.TowerDefenseRuntime = runtime;
})();
