(function () {
  "use strict";

  const COLORS = ["red", "green", "blue", "yellow"];

  function findBoardElements() {
    return Array.from(document.querySelectorAll("boardComponent, boardcomponent"));
  }

  function findBoardSurface(board) {
    return board.querySelector("[qhtml-layout='q-layout']") || board;
  }

  function findCellComponents(board) {
    return Array.from(board.querySelectorAll("[component-instance]"))
      .filter((element) => element.querySelector(".blockwars-cell"));
  }

  function createBlockLayer(surface) {
    const existing = surface.querySelector(":scope > .blockwars-block-layer");
    if (existing) {
      existing.innerHTML = "";
      return existing;
    }
    const layer = document.createElement("div");
    layer.className = "blockwars-block-layer";
    layer.style.position = "absolute";
    layer.style.left = "0";
    layer.style.top = "0";
    layer.style.width = "100%";
    layer.style.height = "100%";
    layer.style.pointerEvents = "none";
    layer.style.zIndex = "4";
    layer.style.overflow = "visible";
    surface.appendChild(layer);
    return layer;
  }

  function styleBlockElement(element, block, spawnDirection) {
    element.className = "blockwars-block";
    element.dataset.blockId = block.blockId;
    element.dataset.row = String(block.row);
    element.dataset.col = String(block.col);
    element.style.position = "absolute";
    element.style.left = block.spawnX;
    element.style.top = block.spawnY;
    element.style.width = block.width;
    element.style.height = block.height;
    element.style.background = block.blockColor;
    element.style.border = "2px solid rgba(255,255,255,0.55)";
    element.style.borderRadius = "6px";
    element.style.boxSizing = "border-box";
    element.style.boxShadow = "0 8px 18px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.3)";
    element.style.transition = "left 520ms cubic-bezier(0.18, 0.82, 0.22, 1), top 520ms cubic-bezier(0.18, 0.82, 0.22, 1), transform 520ms cubic-bezier(0.18, 0.82, 0.22, 1)";
    element.style.transform = (spawnDirection === "up" ? "translateY(10px)" : "translateY(-10px)") + " scale(0.92)";
    element.style.pointerEvents = "auto";
  }

  function dropBlocksIntoPlace(blocks, spawnDirection) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const orderedBlocks = blocks.slice().sort((left, right) => {
          if (left.row !== right.row) {
            return spawnDirection === "up" ? left.row - right.row : right.row - left.row;
          }
          return left.col - right.col;
        });
        orderedBlocks.forEach((block, index) => {
          setTimeout(() => {
            block.element.style.left = block.x;
            block.element.style.top = block.y;
            block.element.style.transform = "translateY(0) scale(1)";
          }, index * 18);
        });
      });
    });
  }

  function initializeBlocks(board, boardIndex) {
    if (board.__blockwarsInitialized) {
      return;
    }
    const surface = findBoardSurface(board);
    surface.style.position = "relative";

    const surfaceRect = surface.getBoundingClientRect();
    const cells = findCellComponents(board);
    if (cells.length === 0) {
      return;
    }
    board.__blockwarsInitialized = true;
    const layer = createBlockLayer(surface);
    const blocks = [];
    const byCoord = new Map();
    const positionsByCoord = new Map();
    const rowNumbers = Array.from(new Set(cells.map((cell) => Number(cell.querySelector(".blockwars-cell").getAttribute("data-row"))))).sort((a, b) => a - b);
    const firstColumnCells = rowNumbers
      .map((row) => cells.find((cell) => Number(cell.querySelector(".blockwars-cell").getAttribute("data-row")) === row))
      .filter(Boolean);
    const firstRowRect = firstColumnCells[0].querySelector(".blockwars-cell").getBoundingClientRect();
    const secondRowRect = firstColumnCells[1] ? firstColumnCells[1].querySelector(".blockwars-cell").getBoundingClientRect() : null;
    const rowPitch = secondRowRect ? secondRowRect.top - firstRowRect.top : firstRowRect.height;
    const spawnOffsetY = rowPitch * rowNumbers.length;
    const defaultDirection = boardIndex % 2 === 1 ? "up" : "down";
    const spawnDirection = String(
      board.spawnDirection ||
      board.getAttribute("spawnDirection") ||
      board.getAttribute("spawndirection") ||
      defaultDirection
    ).toLowerCase();

    cells.forEach((cell, index) => {
      const cellVisual = cell.querySelector(".blockwars-cell");
      const row = Number(cellVisual.getAttribute("data-row"));
      const col = Number(cellVisual.getAttribute("data-col"));
      const rect = cellVisual.getBoundingClientRect();
      const position = {
        x: (rect.left - surfaceRect.left) + "px",
        y: (rect.top - surfaceRect.top) + "px",
        width: rect.width + "px",
        height: rect.height + "px"
      };
      const block = {
        blockId: "block-" + row + "-" + col,
        blockColor: COLORS[index % COLORS.length],
        row,
        col,
        health: 1,
        frozen: false,
        poisoned: false,
        burning: false,
        x: position.x,
        y: position.y,
        spawnX: position.x,
        spawnY: ((rect.top - surfaceRect.top) + (spawnDirection === "up" ? spawnOffsetY : -spawnOffsetY)) + "px",
        width: position.width,
        height: position.height,
        element: document.createElement("div")
      };
      styleBlockElement(block.element, block, spawnDirection);
      layer.appendChild(block.element);
      blocks.push(block);
      byCoord.set(row + "," + col, block);
      positionsByCoord.set(row + "," + col, position);
      QHTML7.setContextProperty(cell, "currentBlock", block);
    });

    const controller = {
      blocks,
      spawnDirection,
      blockAt(row, col) {
        return byCoord.get(Number(row) + "," + Number(col));
      },
      moveBlock(block, row, col) {
        const target = positionsByCoord.get(Number(row) + "," + Number(col));
        block.row = Number(row);
        block.col = Number(col);
        block.x = target.x;
        block.y = target.y;
        block.element.style.left = block.x;
        block.element.style.top = block.y;
      }
    };

    board.__blockwars = controller;
    board.setContextProperty("blocks", blocks);
    board.setContextProperty("blockwars", controller);
    board.setContextProperty("blockAt", controller.blockAt.bind(controller));
    dropBlocksIntoPlace(blocks, spawnDirection);
  }

  function boot() {
    findBoardElements().forEach((board, index) => initializeBlocks(board, index));
  }

  let bootScheduled = false;
  function scheduleBootAfterQHTMLContentLoaded() {
    if (bootScheduled) {
      return;
    }
    bootScheduled = true;
    setTimeout(() => {
      requestAnimationFrame(boot);
    }, 0);
  }

  document.addEventListener("QHTMLContentLoaded", scheduleBootAfterQHTMLContentLoaded, { once: true });
  window.addEventListener("QHTMLContentLoaded", scheduleBootAfterQHTMLContentLoaded, { once: true });

  if (document.querySelector("q-html[ready='1'], q-html7[ready='1']")) {
    scheduleBootAfterQHTMLContentLoaded();
  }
})();
