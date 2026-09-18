(function () {
  const BOARD_SIZE = 9;
  const PIECE_TEMPLATES = [
    {
      id: 'l-piece',
      name: 'L',
      color: '#f97316',
      cells: [[0, 0], [1, 0], [0, 1], [0, 2]],
    },
    {
      id: 'line-piece',
      name: 'I',
      color: '#38bdf8',
      cells: [[0, 0], [0, 1], [0, 2], [0, 3]],
    },
    {
      id: 'square-piece',
      name: '2x2',
      color: '#a78bfa',
      cells: [[0, 0], [0, 1], [1, 0], [1, 1]],
    },
    {
      id: 'dot-piece',
      name: 'Ponto',
      color: '#4ade80',
      cells: [[0, 0]],
    },
    {
      id: 'zig-piece',
      name: 'Z',
      color: '#f472b6',
      cells: [[0, 0], [1, 0], [1, 1], [2, 1]],
    },
    {
      id: 't-piece',
      name: 'T',
      color: '#facc15',
      cells: [[0, 0], [0, 1], [0, 2], [1, 1]],
    },
  ];

  function makeBoard() {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function getPieceBounds(piece) {
    const rows = piece.cells.map(([row]) => row);
    const cols = piece.cells.map(([, col]) => col);
    return {
      width: Math.max(...cols) - Math.min(...cols) + 1,
      height: Math.max(...rows) - Math.min(...rows) + 1,
    };
  }

  function canPlacePiece(board, piece, originRow, originCol) {
    for (const [rowOffset, colOffset] of piece.cells) {
      const row = originRow + rowOffset;
      const col = originCol + colOffset;

      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
        return false;
      }

      if (board[row][col] !== 0) {
        return false;
      }
    }

    return true;
  }

  function findAnyPlacement(board, piece) {
    const { width, height } = getPieceBounds(piece);

    for (let row = 0; row <= BOARD_SIZE - height; row += 1) {
      for (let col = 0; col <= BOARD_SIZE - width; col += 1) {
        if (canPlacePiece(board, piece, row, col)) {
          return { row, col };
        }
      }
    }

    return null;
  }

  function pickRandomPiece() {
    const available = PIECE_TEMPLATES.filter((template) => {
      const piece = {
        id: template.id,
        name: template.name,
        color: template.color,
        cells: template.cells.map(([row, col]) => [row, col]),
      };
      return findAnyPlacement(makeBoard(), piece) !== null;
    });

    const template = available[Math.floor(Math.random() * available.length)];
    if (!template) {
      return null;
    }

    return {
      id: `${template.id}-${Date.now()}-${Math.random()}`,
      name: template.name,
      color: template.color,
      cells: template.cells.map(([row, col]) => [row, col]),
    };
  }

  function buildGameUi(stage) {
    stage.innerHTML = `
      <div class="block-game">
        <div class="block-topbar">
          <div class="stat-box">Pontuação: <span id="block-score">0</span></div>
          <button type="button" class="primary-button" id="block-reset">Reiniciar</button>
        </div>

        <div class="block-grid">
          <div class="block-board-wrap">
            <div class="block-board" id="block-board" aria-label="Tabuleiro do puzzle"></div>
            <div class="block-preview-layer" id="block-preview-layer" aria-hidden="true"></div>
          </div>

          <div class="block-tray" id="block-tray" aria-label="Peças disponíveis"></div>
        </div>

        <p class="block-tips">Organize as peças para completar linhas e colunas e ganhar bônus.</p>
      </div>
    `;
  }

  function renderBoard(boardState, activePiece, origin) {
    const boardEl = document.getElementById('block-board');
    const previewLayer = document.getElementById('block-preview-layer');

    if (!boardEl || !previewLayer) {
      return;
    }

    boardEl.innerHTML = '';

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const cell = document.createElement('div');
        cell.className = 'block-cell';

        if (boardState[row][col] !== 0) {
          cell.classList.add('filled');
          cell.style.background = boardState[row][col];
        }

        boardEl.appendChild(cell);
      }
    }

    previewLayer.innerHTML = '';
    if (!activePiece || !origin) {
      return;
    }

    const valid = isPlacementValid(boardState, activePiece, origin.row, origin.col);

    activePiece.cells.forEach(([rowOffset, colOffset]) => {
      const row = origin.row + rowOffset;
      const col = origin.col + colOffset;

      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
        return;
      }

      const previewCell = document.createElement('div');
      previewCell.className = `block-preview-cell ${valid ? 'valid' : 'invalid'}`;
      previewCell.style.left = `${(col / BOARD_SIZE) * 100}%`;
      previewCell.style.top = `${(row / BOARD_SIZE) * 100}%`;
      previewCell.style.background = activePiece.color;
      previewLayer.appendChild(previewCell);
    });
  }

  function renderTray(currentPieces, activeIndex) {
    const trayEl = document.getElementById('block-tray');
    if (!trayEl) {
      return;
    }

    trayEl.innerHTML = '';

    currentPieces.forEach((piece, index) => {
      const pieceEl = document.createElement('div');
      pieceEl.className = `block-piece ${activeIndex === index ? 'active' : ''}`;
      pieceEl.dataset.pieceIndex = String(index);
      pieceEl.setAttribute('tabindex', '0');

      const grid = document.createElement('div');
      grid.className = 'block-piece-grid';

      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          const cell = document.createElement('div');
          cell.className = 'block-piece-grid-cell';
          const isFilled = piece.cells.some(([pieceRow, pieceCol]) => pieceRow === row && pieceCol === col);
          if (isFilled) {
            cell.classList.add('filled');
            cell.style.background = piece.color;
          }
          grid.appendChild(cell);
        }
      }

      const name = document.createElement('span');
      name.className = 'block-piece-name';
      name.textContent = piece.name;

      pieceEl.appendChild(grid);
      pieceEl.appendChild(name);
      trayEl.appendChild(pieceEl);
    });
  }

  function isPlacementValid(boardState, piece, row, col) {
    if (!canPlacePiece(boardState, piece, row, col)) {
      return false;
    }

    return true;
  }

  function clearCompletedLinesAndColumns(boardState) {
    const rowsToClear = [];
    const colsToClear = [];

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      if (boardState[row].every((value) => value !== 0)) {
        rowsToClear.push(row);
      }
    }

    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const hasCompleteColumn = Array.from({ length: BOARD_SIZE }, (_, row) => boardState[row][col]).every((value) => value !== 0);
      if (hasCompleteColumn) {
        colsToClear.push(col);
      }
    }

    let clearedCount = 0;

    rowsToClear.forEach((row) => {
      boardState[row].fill(0);
      clearedCount += 1;
    });

    colsToClear.forEach((col) => {
      for (let row = 0; row < BOARD_SIZE; row += 1) {
        boardState[row][col] = 0;
      }
      clearedCount += 1;
    });

    return clearedCount;
  }

  function updateScore(points) {
    const scoreEl = document.getElementById('block-score');
    if (!scoreEl) {
      return;
    }

    const current = Number(scoreEl.textContent) || 0;
    scoreEl.textContent = String(current + points);
  }

  function summarizePlacement(boardState, piece, row, col) {
    const placedCells = piece.cells.length;
    const basePoints = placedCells * 8;

    const nextBoard = cloneBoard(boardState);
    piece.cells.forEach(([pieceRow, pieceCol]) => {
      nextBoard[row + pieceRow][col + pieceCol] = piece.color;
    });

    const cleared = clearCompletedLinesAndColumns(nextBoard);
    const lineBonus = cleared === 0 ? 0 : cleared * 50;
    const totalPoints = basePoints + lineBonus;

    return { board: nextBoard, totalPoints, cleared };
  }

  function hasAnyPlacementForPieces(boardState, pieces) {
    return pieces.some((piece) => findAnyPlacement(boardState, piece) !== null);
  }

  function showGameOver(scoreValue) {
    if (typeof window.portalModal?.open === 'function') {
      window.portalModal.open(
        'Game Over',
        `Sua pontuação final foi ${scoreValue}. Tente outra sequência de peças.`,
        'Jogar Novamente',
        () => {
          initBlockWoodGame();
        }
      );
    }
  }

  function setActivePieceFromIndex(index) {
    const tray = document.getElementById('block-tray');
    const pieces = window.blockWoodState?.pieces || [];
    if (!tray || !pieces[index]) {
      return;
    }

    window.blockWoodState.activeIndex = index;
    renderTray(pieces, index);
  }

  function initBlockWoodGame() {
    const stage = document.querySelector('[data-screen="block-wood"] .game-stage');
    if (!stage) {
      return;
    }

    if (stage.dataset.blockWoodInitialized === 'true') {
      return;
    }

    stage.dataset.blockWoodInitialized = 'true';

    buildGameUi(stage);

    const state = {
      board: makeBoard(),
      pieces: [],
      activeIndex: 0,
      score: 0,
      isDragging: false,
      dragOrigin: null,
      dragPiece: null,
      pointerId: null,
    };

    window.blockWoodState = state;

    function refillPieces() {
      const next = [];
      while (next.length < 3) {
        const piece = pickRandomPiece();
        if (piece) {
          next.push(piece);
        }
      }
      state.pieces = next;
      state.activeIndex = 0;
      renderTray(state.pieces, state.activeIndex);
    }

    function endTurn() {
      const currentScore = Number(document.getElementById('block-score')?.textContent || 0);
      if (!hasAnyPlacementForPieces(state.board, state.pieces)) {
        showGameOver(currentScore);
      }
    }

    function dropPieceOnBoard(event) {
      if (!state.dragPiece || state.isDragging === false || state.dragOrigin === null) {
        return;
      }

      const boardEl = document.getElementById('block-board');
      const rect = boardEl.getBoundingClientRect();
      const size = rect.width / BOARD_SIZE;
      const col = Math.max(0, Math.min(BOARD_SIZE - 1, Math.floor((event.clientX - rect.left) / size)));
      const row = Math.max(0, Math.min(BOARD_SIZE - 1, Math.floor((event.clientY - rect.top) / size)));

      const piece = state.dragPiece;
      const origin = {
        row: row - Math.floor(getPieceBounds(piece).height / 2),
        col: col - Math.floor(getPieceBounds(piece).width / 2),
      };

      if (isPlacementValid(state.board, piece, origin.row, origin.col)) {
        const result = summarizePlacement(state.board, piece, origin.row, origin.col);
        state.board = result.board;
        updateScore(result.totalPoints);
        state.pieces.splice(state.activeIndex, 1);

        if (state.pieces.length === 0) {
          refillPieces();
        } else {
          state.activeIndex = Math.min(state.activeIndex, state.pieces.length - 1);
          renderTray(state.pieces, state.activeIndex);
        }

        renderBoard(state.board, null, null);
        endTurn();
      } else {
        renderBoard(state.board, null, null);
      }

      state.isDragging = false;
      state.dragPiece = null;
      state.dragOrigin = null;
      state.pointerId = null;
      renderTray(state.pieces, state.activeIndex);
    }

    function handlePointerMove(event) {
      if (!state.dragPiece) {
        return;
      }

      const boardEl = document.getElementById('block-board');
      if (!boardEl) {
        return;
      }

      const rect = boardEl.getBoundingClientRect();
      const size = rect.width / BOARD_SIZE;
      const col = Math.max(0, Math.min(BOARD_SIZE - 1, Math.floor((event.clientX - rect.left) / size)));
      const row = Math.max(0, Math.min(BOARD_SIZE - 1, Math.floor((event.clientY - rect.top) / size)));

      const pieceBounds = getPieceBounds(state.dragPiece);
      const origin = {
        row: row - Math.floor(pieceBounds.height / 2),
        col: col - Math.floor(pieceBounds.width / 2),
      };

      state.dragOrigin = origin;
      renderBoard(state.board, state.dragPiece, origin);
    }

    function startDragging(index, event) {
      if (state.pieces[index] == null) {
        return;
      }

      state.dragPiece = state.pieces[index];
      state.activeIndex = index;
      state.isDragging = true;
      state.pointerId = event.pointerId;
      renderTray(state.pieces, index);
      handlePointerMove(event);
    }

    function bindPieceEvents() {
      stage.addEventListener('pointermove', (event) => {
        if (state.isDragging) {
          handlePointerMove(event);
        }
      });

      stage.addEventListener('pointerup', (event) => {
        if (state.isDragging) {
          dropPieceOnBoard(event);
        }
      });

      stage.addEventListener('pointercancel', () => {
        state.isDragging = false;
        state.dragPiece = null;
        state.dragOrigin = null;
        renderBoard(state.board, null, null);
      });
    }

    function bindTrayInteractions() {
      const tray = document.getElementById('block-tray');
      if (!tray) {
        return;
      }

      tray.addEventListener('click', (event) => {
        const pieceEl = event.target.closest('.block-piece');
        if (!pieceEl) {
          return;
        }

        const targetIndex = Number(pieceEl.dataset.pieceIndex);
        setActivePieceFromIndex(targetIndex);
      });

      tray.addEventListener('pointerdown', (event) => {
        const pieceEl = event.target.closest('.block-piece');
        if (!pieceEl) {
          return;
        }
        const targetIndex = Number(pieceEl.dataset.pieceIndex);
        startDragging(targetIndex, event);
      });
    }

    const resetButton = document.getElementById('block-reset');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        state.board = makeBoard();
        state.score = 0;
        const scoreEl = document.getElementById('block-score');
        if (scoreEl) {
          scoreEl.textContent = '0';
        }
        refillPieces();
        renderBoard(state.board, null, null);
      });
    }

    refillPieces();
    renderBoard(state.board, null, null);
    bindTrayInteractions();
    bindPieceEvents();
  }

  window.initBlockWoodGame = initBlockWoodGame;
})();
