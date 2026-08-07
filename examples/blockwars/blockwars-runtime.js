(function () {
  "use strict";

  const COLORS = ["#ef4444", "#22c55e", "#3b82f6", "#eab308"];
  const BOARD_ROWS = 6;
  const controllers = new Map();
  let gameElement = null;

  function findBoardElements(root) {
    return Array.from((root || document).querySelectorAll("boardComponent, boardcomponent"));
  }

  function findBoardSurface(board) {
    return board.querySelector("[qhtml-layout='q-layout']") || board;
  }

  function findCellComponents(board) {
    return Array.from(board.querySelectorAll("blockwarsCell, blockwarscell"));
  }

  function findBlockComponents(board) {
    return Array.from(board.querySelectorAll("blockwarsBlock, blockwarsblock"));
  }

  function key(row, col) {
    return Number(row) + "," + Number(col);
  }

  function numberProperty(element, name, fallback) {
    const value = Number(element[name] || element.getAttribute(name) || element.getAttribute(name.toLowerCase()));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function stringProperty(element, name, fallback) {
    return String(element[name] || element.getAttribute(name) || element.getAttribute(name.toLowerCase()) || fallback || "");
  }

  function cellVisual(cell) {
    return cell.querySelector(".blockwars-cell");
  }

  function parseCell(cell) {
    const visual = cellVisual(cell);
    return {
      cell,
      visual,
      row: Number(visual.getAttribute("data-row")),
      col: Number(visual.getAttribute("data-col"))
    };
  }

  function cellPosition(surfaceRect, parsedCell) {
    const rect = parsedCell.visual.getBoundingClientRect();
    return {
      x: (rect.left - surfaceRect.left) + "px",
      y: (rect.top - surfaceRect.top) + "px",
      width: rect.width + "px",
      height: rect.height + "px"
    };
  }

  function blockIndex(block, fallback) {
    return Number(block.blockIndex || block.getAttribute("blockIndex") || block.getAttribute("blockindex") || fallback);
  }

  function setBlockDataset(block, id, row, col) {
    block.dataset.blockId = id;
    block.dataset.row = String(row);
    block.dataset.col = String(col);
  }

  function connectBlockSignals(controller, block) {
    if (block.__blockwarsSignalsConnected) {
      return;
    }
    block.__blockwarsSignalsConnected = true;
    block.animationStarted.connect(function (blockId) {
      controller.board.trackAnimationStarted(blockId);
    });
    block.animationDone.connect(function (blockId) {
      controller.board.trackAnimationDone(blockId);
    });
  }

  function prepareBlock(controller, block, index) {
    const blockNumber = blockIndex(block, index + 1);
    block.__blockwarsBoard = controller;
    block.__blockwarsAssigned = false;
    block.__blockwarsActive = false;
    block.__blockwarsMoving = false;
    block.blockId = "block-" + controller.boardNumber + "-" + blockNumber;
    block.blockColor = COLORS[(blockNumber - 1) % COLORS.length];
    block.setContextProperty("blockId", block.blockId);
    setBlockDataset(block, block.blockId, 0, 0);
    connectBlockSignals(controller, block);
  }

  function sortedRows(controller) {
    return controller.rowNumbers.slice().sort((a, b) => a - b);
  }

  function sortedCols(controller) {
    return controller.colNumbers.slice().sort((a, b) => a - b);
  }

  function fillOrderRows(controller) {
    const rows = sortedRows(controller);
    return controller.spawnDirection === "up" ? rows : rows.slice().reverse();
  }

  function spawnRows(controller) {
    const rows = sortedRows(controller);
    return controller.spawnDirection === "up" ? rows.slice().reverse() : rows;
  }

  function spawnPositionFor(controller, position, spawnSlot) {
    const rowOffset = controller.rowPitch * 8;
    const currentY = Number.parseFloat(position.y) || 0;
    const spawnY = controller.spawnDirection === "up"
      ? currentY + rowOffset
      : currentY - rowOffset;
    return {
      x: position.x,
      y: spawnY + "px",
      width: position.width,
      height: position.height
    };
  }

  function assignBlockToCell(controller, block, row, col, spawnSlot) {
    const position = controller.positionsByCoord.get(key(row, col));
    const spawn = spawnPositionFor(controller, position, spawnSlot);
    block.__blockwarsAssigned = true;
    block.__blockwarsActive = true;
    block.__blockwarsRow = Number(row);
    block.__blockwarsCol = Number(col);
    block.rowNum = Number(row);
    block.colNum = Number(col);
    setBlockDataset(block, block.blockId, row, col);
    block.prepareAt(spawn.x, spawn.y, spawn.width, spawn.height, block.blockColor);
    controller.byCoord.set(key(row, col), block);
    controller.cellByCoord.get(key(row, col)).cell.setContextProperty("currentBlock", block);
    block.moveTo(position.x, position.y);
  }

  function moveExistingBlock(controller, block, row, col) {
    const oldKey = key(block.__blockwarsRow, block.__blockwarsCol);
    const nextKey = key(row, col);
    const position = controller.positionsByCoord.get(nextKey);
    controller.byCoord.delete(oldKey);
    controller.byCoord.set(nextKey, block);
    block.__blockwarsRow = Number(row);
    block.__blockwarsCol = Number(col);
    block.rowNum = Number(row);
    block.colNum = Number(col);
    setBlockDataset(block, block.blockId, row, col);
    controller.cellByCoord.get(nextKey).cell.setContextProperty("currentBlock", block);
    block.moveTo(position.x, position.y);
  }

  function emptyCellContext(controller, row, col) {
    controller.cellByCoord.get(key(row, col)).cell.setContextProperty("currentBlock", null);
  }

  function nextInactiveBlock(controller) {
    const block = controller.blocks.find((candidate) => !candidate.__blockwarsActive);
    block.__blockwarsActive = true;
    return block;
  }

  function completeBoardAction(controller) {
    const actionName = controller.activeAction;
    controller.activeAction = "";
    controller.board.boardState = "";
    controller.board.animatingBlocks = [];
    if (gameElement && typeof gameElement.actionCompleted === "function") {
      gameElement.actionCompleted(controller.boardNumber, actionName);
    } else if (typeof controller.board.actionCompleted === "function") {
      controller.board.actionCompleted(controller.boardNumber, actionName);
    }
  }

  function startBoardAction(controller, actionName) {
    controller.activeAction = actionName;
    controller.board.boardState = actionName;
    controller.animatingBlockIds.clear();
    controller.board.animatingBlocks = [];
  }

  function controllerForBoard(board) {
    if (controllers.has(board)) {
      return controllers.get(board);
    }

    const surface = findBoardSurface(board);
    surface.style.position = "relative";
    const surfaceRect = surface.getBoundingClientRect();
    const parsedCells = findCellComponents(board).map(parseCell);
    const cellByCoord = new Map();
    const positionsByCoord = new Map();
    parsedCells.forEach((parsed) => {
      cellByCoord.set(key(parsed.row, parsed.col), parsed);
      positionsByCoord.set(key(parsed.row, parsed.col), cellPosition(surfaceRect, parsed));
    });

    const rowNumbers = Array.from(new Set(parsedCells.map((cell) => cell.row))).sort((a, b) => a - b);
    const colNumbers = Array.from(new Set(parsedCells.map((cell) => cell.col))).sort((a, b) => a - b);
    const firstColumn = rowNumbers.map((row) => cellByCoord.get(key(row, colNumbers[0]))).filter(Boolean);
    const firstRect = firstColumn[0].visual.getBoundingClientRect();
    const secondRect = firstColumn[1] ? firstColumn[1].visual.getBoundingClientRect() : null;

    const controller = {
      board,
      surface,
      boardNumber: numberProperty(board, "boardNumber", controllers.size + 1),
      spawnDirection: stringProperty(board, "spawnDirection", controllers.size % 2 === 0 ? "down" : "up").toLowerCase(),
      rowNumbers,
      colNumbers,
      rowPitch: secondRect ? Math.abs(secondRect.top - firstRect.top) : firstRect.height,
      cellByCoord,
      positionsByCoord,
      byCoord: new Map(),
      blocks: findBlockComponents(board),
      animatingBlockIds: new Set(),
      activeAction: "",
      blockAt(row, col) {
        return this.byCoord.get(key(row, col)) || null;
      }
    };

    controller.blocks.forEach((block, index) => prepareBlock(controller, block, index));
    board.__blockwars = controller;
    board.setContextProperty("blockwars", controller);
    board.setContextProperty("blocks", controller.blocks);
    board.setContextProperty("blockAt", controller.blockAt.bind(controller));
    controllers.set(board, controller);
    return controller;
  }

  function fillBoard(board) {
    const controller = controllerForBoard(board);
    startBoardAction(controller, "fillBoard");

    const rows = fillOrderRows(controller);
    const newByCoord = new Map();
    const moves = [];

    sortedCols(controller).forEach((col) => {
      const existing = rows.map((row) => controller.byCoord.get(key(row, col))).filter(Boolean);
      rows.forEach((row) => emptyCellContext(controller, row, col));
      existing.forEach((block, index) => {
        const targetRow = rows[index];
        newByCoord.set(key(targetRow, col), block);
        if (block.__blockwarsRow !== targetRow || block.__blockwarsCol !== col) {
          moves.push({ block, row: targetRow, col });
        } else {
          controller.cellByCoord.get(key(targetRow, col)).cell.setContextProperty("currentBlock", block);
        }
      });
    });

    controller.byCoord = newByCoord;

    moves.forEach((move) => {
      moveExistingBlock(controller, move.block, move.row, move.col);
    });

    if (controller.animatingBlockIds.size === 0) {
      completeBoardAction(controller);
    }
  }

  function spawnBlocks(board) {
    const controller = controllerForBoard(board);
    startBoardAction(controller, "spawnBlocks");

    sortedCols(controller).forEach((col) => {
      const emptyRows = spawnRows(controller).filter((row) => !controller.byCoord.has(key(row, col)));
      emptyRows.forEach((row, spawnIndex) => {
        const block = nextInactiveBlock(controller);
        assignBlockToCell(controller, block, row, col, spawnIndex + 1);
      });
    });

    if (controller.animatingBlockIds.size === 0) {
      completeBoardAction(controller);
    }
  }

  function trackAnimationStarted(board, blockId) {
    const controller = controllerForBoard(board);
    controller.animatingBlockIds.add(String(blockId));
    controller.board.animatingBlocks = Array.from(controller.animatingBlockIds);
  }

  function trackAnimationDone(board, blockId) {
    const controller = controllerForBoard(board);
    controller.animatingBlockIds.delete(String(blockId));
    controller.board.animatingBlocks = Array.from(controller.animatingBlockIds);
    if (controller.activeAction && controller.animatingBlockIds.size === 0) {
      completeBoardAction(controller);
    }
  }

  function attachGame(game) {
    gameElement = game;
    game.setContextProperty("blockwarsControllers", controllers);
    findBoardElements(game).forEach((board) => controllerForBoard(board));
  }

  function recordActionCompleted(game, boardNum, actionName) {
    const completedActions = Object.assign({}, game.completedActions || {});
    const boardNumber = Number(boardNum);
    const list = Array.isArray(completedActions[actionName]) ? completedActions[actionName].slice() : [];
    if (!list.includes(boardNumber)) {
      list.push(boardNumber);
    }
    completedActions[actionName] = list;
    game.completedActions = completedActions;
    game.completedBoards = list;
    if (actionName === "fillBoard") {
      game.spawnBlocks(boardNumber);
    }
  }

  window.BlockwarsRuntime = {
    attachGame,
    fillBoard,
    spawnBlocks,
    trackAnimationStarted,
    trackAnimationDone,
    recordActionCompleted,
    controllerForBoard
  };
})();
