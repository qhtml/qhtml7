(function () {
  var runtime = window.TowerDefenseRuntime || {};

  function ensureStyles() {
    if (document.getElementById("td-runtime-styles")) {
      return;
    }
    var style = document.createElement("style");
    style.id = "td-runtime-styles";
    style.textContent = [
      ".td-board-surface{position:absolute;inset:0;width:1500px;height:1000px;background:#000;display:block;overflow:hidden;}",
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
      ".td-tile-layer{position:absolute;inset:0;z-index:1;display:block;pointer-events:auto;}",
      ".td-tile-layer canvas{display:block;width:100%;height:100%;}",
      ".td-gun{position:absolute;box-sizing:border-box;border:2px solid #f9f0f0;background:#000;z-index:120;}",
      ".td-gun.selected{outline:3px solid #fff;}",
      ".td-entity{position:absolute;box-sizing:border-box;z-index:105;transition-property:left,top,opacity,transform;transition-timing-function:linear;}",
      ".td-projectile{position:absolute;z-index:300;pointer-events:none;transition-property:left,top,opacity,transform;transition-timing-function:linear;}",
      ".td-fill{width:100%;height:100%;object-fit:contain;display:block;}"
    ].join("\n");
    document.head.appendChild(style);
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
    if (!image) {
      image = document.createElement("img");
      image.className = "td-fill";
      element.appendChild(image);
    }
    image.src = src;
    image.alt = alt;
    return image;
  }

  class TDTileView extends HTMLElement {
    set board(value) {
      this.__tdBoard = value;
    }
    set object(value) {
      this.__tdObject = value;
      this.render();
    }
    get object() {
      return this.__tdObject;
    }
    connectedCallback() {
      ensureStyles();
      this.render();
    }
    render() {
      var tile = this.__tdObject;
      if (!tile) {
        return;
      }
      applyBox(this, tile);
      this.className = "td-tile " + tile.kind + " " + (tile.selected ? "selected" : "") + " " + (tile.buildable ? "buildable" : "blocked");
      this.onclick = function () {
        this.__tdBoard.selectTile(tile.id);
      }.bind(this);
    }
  }

  class TDTileLayer extends HTMLElement {
    connectedCallback() {
      ensureStyles();
      this.className = "td-tile-layer";
      if (!this.canvas) {
        this.canvas = document.createElement("canvas");
        this.appendChild(this.canvas);
      }
      this.onclick = function (event) {
        var board = this.__tdBoard;
        if (!board) {
          return;
        }
        var rect = this.getBoundingClientRect();
        var scaleX = Number(board.cols) * Number(board.tileWidth) / rect.width;
        var scaleY = Number(board.rows) * Number(board.tileHeight) / rect.height;
        var col = Math.floor((event.clientX - rect.left) * scaleX / Number(board.tileWidth));
        var row = Math.floor((event.clientY - rect.top) * scaleY / Number(board.tileHeight));
        var tile = board.findTile(row, col);
        board.selectTile(tile.id);
      }.bind(this);
      this.render();
    }

    set board(value) {
      this.__tdBoard = value;
      this.render();
    }

    render() {
      var board = this.__tdBoard;
      if (!board || !this.canvas) {
        return;
      }
      if (this.__tdRenderedRevision === board.boardRevision) {
        return;
      }
      this.__tdRenderedRevision = board.boardRevision;
      var width = Number(board.cols) * Number(board.tileWidth);
      var height = Number(board.rows) * Number(board.tileHeight);
      if (this.canvas.width !== width) {
        this.canvas.width = width;
      }
      if (this.canvas.height !== height) {
        this.canvas.height = height;
      }
      var context = this.canvas.getContext("2d");
      context.clearRect(0, 0, width, height);
      var tiles = board.runtimeTilesList || [];
      for (var i = 0; i < tiles.length; i += 1) {
        var tile = tiles[i];
        var x = Number(tile.col) * Number(board.tileWidth);
        var y = Number(tile.row) * Number(board.tileHeight);
        if (tile.selected === true) {
          context.fillStyle = "#ffffff";
        } else if (tile.kind === "wall") {
          context.fillStyle = "#707070";
        } else if (tile.kind === "entrance") {
          context.fillStyle = "#087d28";
        } else if (tile.kind === "exit") {
          context.fillStyle = "#b91c1c";
        } else {
          context.fillStyle = "#000000";
        }
        context.fillRect(x, y, Number(board.tileWidth), Number(board.tileHeight));
        context.strokeStyle = tile.buildable === true ? "darkGreen" : (tile.kind === "square" ? "darkRed" : "#f9f0f0");
        context.lineWidth = 1;
        context.strokeRect(x + 0.5, y + 0.5, Number(board.tileWidth) - 1, Number(board.tileHeight) - 1);
      }
    }
  }

  class TDGunView extends HTMLElement {
    set board(value) {
      this.__tdBoard = value;
    }
    set object(value) {
      this.__tdObject = value;
      this.render();
    }
    get object() {
      return this.__tdObject;
    }
    connectedCallback() {
      ensureStyles();
      this.render();
    }
    render() {
      var gun = this.__tdObject;
      if (!gun) {
        return;
      }
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
    set board(value) {
      this.__tdBoard = value;
    }
    set object(value) {
      this.__tdObject = value;
      this.render();
    }
    get object() {
      return this.__tdObject;
    }
    connectedCallback() {
      ensureStyles();
      this.render();
    }
    render() {
      var enemy = this.__tdObject;
      if (!enemy) {
        return;
      }
      applyBox(this, enemy);
      this.className = "td-entity";
      this.style.opacity = enemy.opacity;
      this.style.transform = "rotate(" + enemy.rotation + "deg)";
      this.style.transitionDuration = enemy.speed + "ms";
      setImage(this, "assets/attackers/" + enemy.type + ".png", "enemy");
    }
  }

  class TDProjectileView extends HTMLElement {
    set board(value) {
      this.__tdBoard = value;
    }
    set object(value) {
      this.__tdObject = value;
      this.render();
    }
    get object() {
      return this.__tdObject;
    }
    connectedCallback() {
      ensureStyles();
      this.render();
    }
    render() {
      var projectile = this.__tdObject;
      if (!projectile) {
        return;
      }
      if (this.__tdProjectileId !== projectile.id) {
        this.__tdProjectileId = projectile.id;
        this.__tdLaunched = false;
      }
      this.id = projectile.domId;
      this.qhtmlObject = projectile;
      this.qhtmlObjectUuid = projectile.uuid;
      this.setAttribute("data-qhtml-object", projectile.uuid);
      this.style.width = projectile.width;
      this.style.height = projectile.height;
      this.className = "td-projectile";
      this.style.opacity = projectile.opacity;
      this.style.transform = "rotate(" + projectile.rotation + "deg)";
      this.style.transitionDuration = projectile.duration + "ms";
      setImage(this, "assets/projectiles/" + projectile.type + ".png", "projectile");
      if (this.__tdLaunched === false) {
        this.__tdLaunched = true;
        this.style.left = projectile.startX;
        this.style.top = projectile.startY;
        setTimeout(function () {
          this.style.left = projectile.targetX;
          this.style.top = projectile.targetY;
        }.bind(this), 20);
      }
    }
  }

  function syncCollection(owner, board, list, map, tagName) {
    var live = {};
    var fragment = document.createDocumentFragment();
    var created = false;
    list = list || [];
    list.forEach(function (object) {
      live[object.uuid] = true;
      var element = map[object.uuid];
      if (!element) {
        element = document.createElement(tagName);
        element.board = board;
        map[object.uuid] = element;
        fragment.appendChild(element);
        created = true;
      }
      element.board = board;
      element.object = object;
    });
    if (created === true) {
      owner.appendChild(fragment);
    }
    Object.keys(map).forEach(function (uuid) {
      if (!live[uuid]) {
        map[uuid].remove();
        delete map[uuid];
      }
    });
  }

  function syncProjectileCollection(owner, board, list, map) {
    var live = {};
    var fragment = document.createDocumentFragment();
    var created = false;
    list = list || [];
    list.forEach(function (object) {
      live[object.uuid] = true;
      var element = map[object.uuid];
      if (!element) {
        element = document.createElement("td-projectile-view");
        element.board = board;
        map[object.uuid] = element;
        fragment.appendChild(element);
        created = true;
      }
      if (element.__tdRemoveTimer) {
        clearTimeout(element.__tdRemoveTimer);
        element.__tdRemoveTimer = 0;
      }
      element.board = board;
      element.object = object;
    });
    if (created === true) {
      owner.appendChild(fragment);
    }
    Object.keys(map).forEach(function (uuid) {
      if (!live[uuid] && !map[uuid].__tdRemoveTimer) {
        map[uuid].style.opacity = "0";
        map[uuid].__tdRemoveTimer = setTimeout(function () {
          map[uuid].remove();
          delete map[uuid];
        }, 420);
      }
    });
  }

  class TDBoardRenderer extends HTMLElement {
    connectedCallback() {
      ensureStyles();
      this.classList.add("td-board-surface");
      this.renderedGuns = {};
      this.renderedEnemies = {};
      this.renderedProjectiles = {};
      if (!this.tileLayer) {
        this.tileLayer = document.createElement("td-tile-layer");
        this.insertBefore(this.tileLayer, this.firstChild);
      }
      var board = this.closest("td-board");
      if (board) {
        board.boardRenderer = this;
        runtime.attachBoard(board, this);
      }
    }
    disconnectedCallback() {
      if (this.__tdLoopTimer) {
        clearInterval(this.__tdLoopTimer);
        this.__tdLoopTimer = 0;
      }
    }
    sync(board) {
      this.board = board;
      if (this.__tdBoardRevision !== board.boardRevision) {
        this.tileLayer.board = board;
        this.__tdBoardRevision = board.boardRevision;
      }
      syncCollection(this, board, board.runtimeGunsList, this.renderedGuns, "td-gun-view");
      syncCollection(this, board, board.runtimeEnemiesList, this.renderedEnemies, "td-enemy-view");
      syncProjectileCollection(this, board, board.runtimeProjectilesList, this.renderedProjectiles);
      runtime.syncStores(board);
    }
  }

  runtime.attachBoard = function (board, renderer) {
    if (board.__tdRuntimeAttached === true) {
      renderer.sync(board);
      return;
    }
    board.__tdRuntimeAttached = true;
    var start = function () {
      if (typeof board.initBoard !== "function" || typeof board.gameTick !== "function") {
        setTimeout(start, 40);
        return;
      }
      board.initBoard();
      renderer.sync(board);
      renderer.__tdLoopTimer = setInterval(function () {
        board.gameTick();
      }, 140);
    };
    setTimeout(start, 40);
  };

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
      if (this.__tdRenderedKind === kind) {
        return;
      }
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
      if (!gun) {
        return;
      }
      this.querySelector("[data-action='range']").textContent = "Upgrade Range - $" + gun.rangeUpgradeCost;
      this.querySelector("[data-label='range']").textContent = "Upgrades: " + gun.rangeUpgrades + " | Current range: " + gun.range;
      this.querySelector("[data-action='damage']").textContent = "Upgrade Damage - $" + gun.damageUpgradeCost;
      this.querySelector("[data-label='damage']").textContent = "Upgrades: " + gun.damageUpgrades + " | Current damage: " + gun.damage;
      this.querySelector("[data-action='sell']").textContent = "Sell Tower +$" + activeBoard.selectedGunSellValue();
    }
  }

  class TDGunStore extends TDStorePanel {
    storeKind() {
      return "gun";
    }
  }

  class TDUpgradeStore extends TDStorePanel {
    storeKind() {
      return "upgrade";
    }
  }

  runtime.syncStores = function (board) {
    if (!board || !board.game) {
      return;
    }
    var game = board.game;
    Array.prototype.forEach.call(game.querySelectorAll("td-gun-store,td-upgrade-store"), function (store) {
      store.sync(board);
    });
  };

  if (!customElements.get("td-board-renderer")) customElements.define("td-board-renderer", TDBoardRenderer);
  if (!customElements.get("td-tile-layer")) customElements.define("td-tile-layer", TDTileLayer);
  if (!customElements.get("td-tile-view")) customElements.define("td-tile-view", TDTileView);
  if (!customElements.get("td-gun-view")) customElements.define("td-gun-view", TDGunView);
  if (!customElements.get("td-enemy-view")) customElements.define("td-enemy-view", TDEnemyView);
  if (!customElements.get("td-projectile-view")) customElements.define("td-projectile-view", TDProjectileView);
  if (!customElements.get("td-gun-store")) customElements.define("td-gun-store", TDGunStore);
  if (!customElements.get("td-upgrade-store")) customElements.define("td-upgrade-store", TDUpgradeStore);

  window.TowerDefenseRuntime = runtime;
})();
