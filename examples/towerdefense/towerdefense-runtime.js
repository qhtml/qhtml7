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

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function applyBox(element, model) {
    element.id = model.domId;
    element.qhtmlObject = model;
    element.qhtmlObjectUuid = model.uuid;
    element.setAttribute("data-qhtml-object", model.uuid);
    element.style.left = model.x;
    element.style.top = model.y;
    element.style.width = model.width;
    element.style.height = model.height;
  }

  function setImage(element, src, alt) {
    var image = element.firstElementChild;

    if (!image || image.tagName !== "IMG") {
      element.textContent = "";
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

  class ParticleEffectController {
    constructor(host, projectile, registry) {
      this.host = host;
      this.projectile = projectile;
      this.registry = registry;
      this.profile = registry.resolve(projectile.type);
      this.effect = null;
      this.emitters = [];
      this._configureAttempts = 0;
      this._destroyed = false;
      this._impacted = false;
      this._startTimers = [];
    }

    mount() {
      this.effect = document.createElement(this.profile.tagName);
      this.effect.classList.add("td-particle-effect");
      this.host.replaceChildren(this.effect);
      this._configureWhenReady();
    }

    _configureWhenReady() {
      if (this._destroyed || !this.effect) {
        return;
      }

      this.emitters = Array.prototype.slice.call(this.effect.querySelectorAll("particle-emitter"));

      if (this.emitters.length === 0 && this._configureAttempts < 12) {
        this._configureAttempts += 1;
        requestAnimationFrame(this._configureWhenReady.bind(this));
        return;
      }

      if (this.emitters.length === 0) {
        this.emitters = [this._createFallbackEmitter()];
      }

      this._configureEmitters();
    }

    _createFallbackEmitter() {
      var emitter = document.createElement("particle-emitter");
      var config = this.profile.fallback;

      emitter.setAttribute("data-role", "travel");
      Object.keys(config).forEach(function (key) {
        emitter.setAttribute(key, String(config[key]));
      });
      emitter.setAttribute("startOpacity", "1");
      emitter.setAttribute("endOpacity", "0");
      emitter.setAttribute("running", "false");
      this.effect.appendChild(emitter);
      return emitter;
    }

    _boardSize() {
      var boardSurface = this.host.parentElement;
      var rect = boardSurface ? boardSurface.getBoundingClientRect() : null;
      return {
        width: Math.max(1, rect && rect.width ? rect.width : 1500),
        height: Math.max(1, rect && rect.height ? rect.height : 1000)
      };
    }

    _coordinates() {
      var size = this._boardSize();
      var startX = numericPixels(this.projectile.startX, 0);
      var startY = numericPixels(this.projectile.startY, 0);
      var targetX = numericPixels(this.projectile.targetX, startX);
      var targetY = numericPixels(this.projectile.targetY, startY);

      return {
        startX: startX,
        startY: startY,
        targetX: targetX,
        targetY: targetY,
        path: [
          clamp(startX / size.width, 0, 1),
          clamp(startY / size.height, 0, 1),
          clamp(targetX / size.width, 0, 1),
          clamp(targetY / size.height, 0, 1)
        ].join(" ")
      };
    }

    _configureEmitters() {
      var coordinates = this._coordinates();
      var projectileDuration = Math.max(1, Number(this.projectile.duration) || 1);

      this.emitters.forEach(function (emitter) {
        var role = emitter.getAttribute("data-role") || "travel";
        var startDelay = Math.max(0, Number(emitter.getAttribute("data-start-delay")) || 0);

        emitter.setAttribute("running", "false");

        if (role === "impact") {
          emitter.setAttribute("x", String(coordinates.targetX));
          emitter.setAttribute("y", String(coordinates.targetY));
          return;
        }

        if (role === "origin") {
          emitter.setAttribute("x", String(coordinates.startX));
          emitter.setAttribute("y", String(coordinates.startY));
        } else {
          var movementDuration = Math.max(1, projectileDuration - startDelay);
          emitter.setAttribute("delay", "0");
          emitter.setAttribute("path", coordinates.path);
          // particle-emitter divides duration across points. Two points require 2x duration.
          emitter.setAttribute("duration", String(movementDuration * 2));
          emitter.setAttribute("sleep", String(projectileDuration + 1000));
        }

        var startEmitter = function () {
          if (this._destroyed || this._impacted) {
            return;
          }
          emitter.setAttribute("running", "true");
          if (typeof emitter.start === "function") {
            emitter.start();
          }
        }.bind(this);

        if (startDelay > 0) {
          this._startTimers.push(setTimeout(startEmitter, startDelay));
        } else {
          startEmitter();
        }
      }, this);
    }

    impact() {
      if (this._impacted) {
        return this.impactLifetime();
      }

      this._impacted = true;
      this._clearStartTimers();
      var coordinates = this._coordinates();

      this.emitters.forEach(function (emitter) {
        var role = emitter.getAttribute("data-role") || "travel";

        if (role === "impact") {
          var burstCount = Math.max(1, Number(emitter.getAttribute("data-burst")) || 1);
          emitter.setAttribute("x", String(coordinates.targetX));
          emitter.setAttribute("y", String(coordinates.targetY));
          if (typeof emitter.burst === "function") {
            emitter.burst(coordinates.targetX, coordinates.targetY, burstCount);
          }
          return;
        }

        if (typeof emitter.stop === "function") {
          emitter.stop();
        } else {
          emitter.setAttribute("running", "false");
        }
      });

      return this.impactLifetime();
    }

    impactLifetime() {
      var maximum = 180;

      this.emitters.forEach(function (emitter) {
        if ((emitter.getAttribute("data-role") || "travel") !== "impact") {
          return;
        }

        var lifetime = Math.max(0, Number(emitter.getAttribute("lifetime")) || 0);
        var variation = Math.max(0, Number(emitter.getAttribute("lifetimeVariation")) || 0);
        maximum = Math.max(maximum, lifetime + variation + 80);
      });

      return maximum;
    }

    _clearStartTimers() {
      this._startTimers.forEach(function (timer) {
        clearTimeout(timer);
      });
      this._startTimers = [];
    }

    destroy() {
      this._destroyed = true;
      this._clearStartTimers();
      this.emitters.forEach(function (emitter) {
        if (typeof emitter.stop === "function") {
          emitter.stop();
        }
        if (typeof emitter.clear === "function") {
          emitter.clear();
        }
      });
      this.emitters = [];
    }
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

    render() {
      var gun = this.__tdObject;
      if (!gun) return;

      applyBox(this, gun);
      this.className = "td-gun " + (gun.selected ? "selected" : "");
      var image = setImage(this, "assets/guns/" + gun.type + ".png", "gun");
      image.style.transform = "rotate(" + gun.rotation + "deg)";
      image.style.transitionDuration = "200ms";
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
      this.style.opacity = enemy.opacity;
      this.style.transform = "rotate(" + enemy.rotation + "deg)";
      this.style.transitionDuration = enemy.speed + "ms";
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

    disconnectedCallback() {
      if (this.__tdParticleController) {
        this.__tdParticleController.destroy();
        this.__tdParticleController = null;
      }
    }

    render() {
      var projectile = this.__tdObject;
      if (!projectile) return;

      this.id = projectile.domId;
      this.qhtmlObject = projectile;
      this.qhtmlObjectUuid = projectile.uuid;
      this.setAttribute("data-qhtml-object", projectile.uuid);
      this.className = "td-projectile-layer";

      if (this.__tdProjectileId === projectile.id) {
        return;
      }

      this.__tdProjectileId = projectile.id;

      if (this.__tdParticleController) {
        this.__tdParticleController.destroy();
      }

      this.__tdParticleController = new ParticleEffectController(this, projectile, particleEffects);
      this.__tdParticleController.mount();
    }

    impact() {
      return this.__tdParticleController
        ? this.__tdParticleController.impact()
        : 180;
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

  function syncProjectileCollection(owner, board, list, map) {
    var live = {};
    list = list || [];

    list.forEach(function (object) {
      live[object.uuid] = true;
      var element = map[object.uuid];

      if (!element) {
        element = document.createElement("td-projectile-view");
        element.board = board;
        map[object.uuid] = element;
        owner.appendChild(element);
      }

      if (element.__tdRemoveTimer) {
        clearTimeout(element.__tdRemoveTimer);
        element.__tdRemoveTimer = 0;
      }

      element.board = board;
      element.object = object;
    });

    Object.keys(map).forEach(function (uuid) {
      var element = map[uuid];

      if (live[uuid] || element.__tdRemoveTimer) {
        return;
      }

      var removalDelay = typeof element.impact === "function" ? element.impact() : 180;
      element.__tdRemoveTimer = setTimeout(function () {
        element.remove();
        delete map[uuid];
      }, Math.max(120, Number(removalDelay) || 180));
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
      }
    }

    sync(board) {
      this.board = board;
      syncCollection(this, board, board.tilesList, this.renderedTiles, "td-tile-view");
      syncCollection(this, board, board.gunsList, this.renderedGuns, "td-gun-view");
      syncCollection(this, board, board.enemiesList, this.renderedEnemies, "td-enemy-view");
      syncProjectileCollection(this, board, board.projectilesList, this.renderedProjectiles);
      board.renderedTiles = this.renderedTiles;
      board.renderedGuns = this.renderedGuns;
      board.renderedEnemies = this.renderedEnemies;
      board.renderedProjectiles = this.renderedProjectiles;
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

  if (!customElements.get("td-board-renderer")) customElements.define("td-board-renderer", TDBoardRenderer);
  if (!customElements.get("td-tile-view")) customElements.define("td-tile-view", TDTileView);
  if (!customElements.get("td-gun-view")) customElements.define("td-gun-view", TDGunView);
  if (!customElements.get("td-enemy-view")) customElements.define("td-enemy-view", TDEnemyView);
  if (!customElements.get("td-projectile-view")) customElements.define("td-projectile-view", TDProjectileView);
  if (!customElements.get("td-gun-store")) customElements.define("td-gun-store", TDGunStore);
  if (!customElements.get("td-upgrade-store")) customElements.define("td-upgrade-store", TDUpgradeStore);

  window.TowerDefenseRuntime = runtime;
})();
