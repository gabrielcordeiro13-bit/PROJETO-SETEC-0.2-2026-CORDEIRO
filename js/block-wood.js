/* SETEC 2026 - Block Wood Puzzle / Tetris clássico.
 * Queda automática, rotação, linhas, nível, recorde e renderização responsiva.
 * Sem dependências externas. */
(function () {
  'use strict';

  var BOARD_WIDTH = 10;
  var BOARD_HEIGHT = 20;
  var BASE_DROP_MS = 800;
  var MIN_DROP_MS = 110;
  var LINE_SCORES = [0, 100, 300, 500, 800];

  var SHAPES = {
    I: { color: '#5bd1ff', matrix: [[1, 1, 1, 1]] },
    O: { color: '#ffd166', matrix: [[1, 1], [1, 1]] },
    T: { color: '#c3a9ff', matrix: [[0, 1, 0], [1, 1, 1]] },
    S: { color: '#7ef0b0', matrix: [[0, 1, 1], [1, 1, 0]] },
    Z: { color: '#ff7d7d', matrix: [[1, 1, 0], [0, 1, 1]] },
    J: { color: '#76a8ff', matrix: [[1, 0, 0], [1, 1, 1]] },
    L: { color: '#ffb86b', matrix: [[0, 0, 1], [1, 1, 1]] }
  };

  var BAG = [];

  function core() { return window.SetecCore || null; }
  function announce(msg) {
    var c = core();
    if (c) c.announce(msg);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function cloneMatrix(matrix) {
    return matrix.map(function (row) { return row.slice(); });
  }
  function shuffleArray(items) {
    var copy = items.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }
  function pullNextType() {
    if (BAG.length === 0) {
      BAG = shuffleArray(Object.keys(SHAPES));
    }
    return BAG.pop();
  }
  function createEmptyBoard(width, height) {
    var board = [];
    for (var row = 0; row < height; row += 1) {
      board.push(Array(width).fill(0));
    }
    return board;
  }
  function createPiece(type, x, y) {
    var def = SHAPES[type];
    return {
      type: type,
      color: def.color,
      matrix: cloneMatrix(def.matrix),
      x: typeof x === 'number' ? x : Math.floor((BOARD_WIDTH - def.matrix[0].length) / 2),
      y: typeof y === 'number' ? y : 0
    };
  }
  function rotateMatrix(matrix, direction) {
    var rows = matrix.length;
    var cols = matrix[0].length;
    var rotated = Array.from({ length: cols }, function () { return Array(rows).fill(0); });

    for (var row = 0; row < rows; row += 1) {
      for (var col = 0; col < cols; col += 1) {
        if (direction > 0) {
          rotated[col][rows - 1 - row] = matrix[row][col];
        } else {
          rotated[cols - 1 - col][row] = matrix[row][col];
        }
      }
    }

    return rotated;
  }
  function isValidPosition(board, piece, offsetX, offsetY) {
    var dx = offsetX || 0;
    var dy = offsetY || 0;

    for (var row = 0; row < piece.matrix.length; row += 1) {
      for (var col = 0; col < piece.matrix[row].length; col += 1) {
        if (!piece.matrix[row][col]) continue;

        var nextX = piece.x + col + dx;
        var nextY = piece.y + row + dy;

        if (nextX < 0 || nextX >= BOARD_WIDTH || nextY >= BOARD_HEIGHT) return false;
        if (nextY >= 0 && board[nextY][nextX] !== 0) return false;
      }
    }

    return true;
  }
  function mergePiece(board, piece) {
    for (var row = 0; row < piece.matrix.length; row += 1) {
      for (var col = 0; col < piece.matrix[row].length; col += 1) {
        if (!piece.matrix[row][col]) continue;
        var boardY = piece.y + row;
        var boardX = piece.x + col;
        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
          board[boardY][boardX] = piece.color;
        }
      }
    }
  }
  function clearCompleteLines(board) {
    var cleared = 0;
    var row = BOARD_HEIGHT - 1;

    while (row >= 0) {
      if (board[row].every(function (cell) { return cell !== 0; })) {
        board.splice(row, 1);
        board.unshift(Array(BOARD_WIDTH).fill(0));
        cleared += 1;
        continue;
      }
      row -= 1;
    }

    return { cleared: cleared, board: board };
  }
  function getDropInterval(level) {
    return Math.max(MIN_DROP_MS, BASE_DROP_MS - (level - 1) * 65);
  }
  function getLineScore(count) {
    return LINE_SCORES[count] || 0;
  }

  function buildGhostPiece(board, piece) {
    if (!piece) return null;
    var ghost = {
      type: piece.type,
      color: piece.color,
      matrix: cloneMatrix(piece.matrix),
      x: piece.x,
      y: piece.y
    };

    while (isValidPosition(board, ghost, 0, 1)) {
      ghost.y += 1;
    }

    return ghost;
  }

  function resetBag() {
    BAG = [];
  }

  function initBlockWoodGame() {
    var stage = document.querySelector('[data-screen="block-wood"] .game-stage');
    if (!stage) return;

    var reg = window.__gameRuntimeRegistry || (window.__gameRuntimeRegistry = {});
    if (reg['block-wood'] && reg['block-wood'].stage === stage && reg['block-wood'].ativo) return;
    if (reg['block-wood'] && typeof reg['block-wood'].cleanup === 'function') {
      try { reg['block-wood'].cleanup(); } catch (e) {}
    }

    var c = core();
    if (c) {
      c.countPlay('block-wood');
    }

    resetBag();
    stage.innerHTML = '';

    var root = el('div', 'block-game');
    var intro = el('section', 'game-intro');
    intro.setAttribute('role', 'dialog');
    intro.setAttribute('aria-label', 'Como jogar Block Wood Puzzle');
    intro.innerHTML =
      '<div class="intro-card">' +
      '<h3>Como jogar</h3>' +
      '<ol>' +
      '<li><strong>Objetivo:</strong> organize as peças e complete linhas para ganhar pontos.</li>' +
      '<li><strong>Controles:</strong> use as setas para mover, <kbd>↑</kbd> ou <kbd>X</kbd> para girar, <kbd>Z</kbd> para girar no sentido contrário, <kbd>↓</kbd> para cair mais rápido e <kbd>Espaço</kbd> para queda imediata.</li>' +
      '<li><strong>Extras:</strong> <kbd>P</kbd> pausa, <kbd>R</kbd> reinicia e o jogo termina quando não houver espaço para a próxima peça.</li>' +
      '</ol>' +
      '<button type="button" class="primary-button" id="block-start">Começar a jogar</button>' +
      '</div>';
    var startBtn = intro.querySelector('#block-start');

    var hud = el('div', 'tetris-topbar');
    var scoreBox = el('div', 'stat-box');
    scoreBox.innerHTML = 'Pontuação: <span id="block-score">0</span>';
    var bestBox = el('div', 'stat-box');
    bestBox.innerHTML = 'Recorde: <span id="block-best">0</span>';
    var linesBox = el('div', 'stat-box');
    linesBox.innerHTML = 'Linhas: <span id="block-lines">0</span>';
    var levelBox = el('div', 'stat-box');
    levelBox.innerHTML = 'Nível: <span id="block-level">1</span>';
    var resetBtn = el('button', 'primary-button', 'Reiniciar');
    resetBtn.type = 'button';
    resetBtn.id = 'block-reset';
    hud.appendChild(scoreBox);
    hud.appendChild(bestBox);
    hud.appendChild(linesBox);
    hud.appendChild(levelBox);
    hud.appendChild(resetBtn);

    var shell = el('div', 'tetris-shell');
    var boardWrap = el('div', 'tetris-board-wrap');
    var boardEl = el('div', 'tetris-board');
    boardEl.id = 'block-board';
    boardEl.setAttribute('role', 'grid');
    boardEl.setAttribute('aria-label', 'Tabuleiro de Tetris do Block Wood Puzzle');
    boardEl.tabIndex = 0;

    var boardCells = [];
    for (var row = 0; row < BOARD_HEIGHT; row += 1) {
      for (var col = 0; col < BOARD_WIDTH; col += 1) {
        var cell = el('span', 'tetris-cell');
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', 'Linha ' + (row + 1) + ', coluna ' + (col + 1));
        boardEl.appendChild(cell);
        boardCells.push(cell);
      }
    }
    boardWrap.appendChild(boardEl);

    var side = el('aside', 'tetris-side');
    var panelNext = el('div', 'tetris-panel');
    var nextHeading = el('p', 'tetris-panel-label', 'Próxima peça');
    var nextPreview = el('div', 'tetris-next-preview');
    nextPreview.setAttribute('aria-label', 'Prévia da próxima peça');
    panelNext.appendChild(nextHeading);
    panelNext.appendChild(nextPreview);

    var panelInfo = el('div', 'tetris-panel');
    var infoTitle = el('p', 'tetris-panel-label', 'Controles');
    var controls = el('ul', 'tetris-controls');
    controls.innerHTML = '<li>← / →: mover</li><li>↓: descer</li><li>↑ / X: girar</li><li>Z: girar para trás</li><li>Espaço: queda rápida</li><li>P: pausar</li><li>R: reiniciar</li>';
    panelInfo.appendChild(infoTitle);
    panelInfo.appendChild(controls);

    var pauseBtn = el('button', 'secondary-button', 'Pausar');
    pauseBtn.type = 'button';
    pauseBtn.id = 'block-pause';

    var statusBox = el('div', 'tetris-status');
    statusBox.id = 'block-status';
    statusBox.setAttribute('role', 'status');
    statusBox.setAttribute('aria-live', 'polite');

    side.appendChild(panelNext);
    side.appendChild(panelInfo);
    side.appendChild(pauseBtn);
    side.appendChild(statusBox);

    shell.appendChild(boardWrap);
    shell.appendChild(side);
    root.appendChild(intro);
    root.appendChild(hud);
    root.appendChild(shell);
    stage.appendChild(root);

    var state = {
      board: createEmptyBoard(BOARD_WIDTH, BOARD_HEIGHT),
      currentPiece: null,
      nextPiece: null,
      score: 0,
      lines: 0,
      level: 1,
      started: false,
      paused: false,
      gameOver: false,
      dropInterval: getDropInterval(1),
      lastFrameTime: 0,
      animationId: null,
      best: c ? c.getBest('block-wood') : 0,
      boardCells: boardCells,
      nextPreview: nextPreview,
      statusBox: statusBox,
      pauseBtn: pauseBtn,
      resetBtn: resetBtn,
      boardEl: boardEl,
      nextCells: []
    };

    function updateHud() {
      var scoreEl = document.getElementById('block-score');
      var linesEl = document.getElementById('block-lines');
      var bestEl = document.getElementById('block-best');
      var levelEl = document.getElementById('block-level');
      if (scoreEl) scoreEl.textContent = String(state.score);
      if (linesEl) linesEl.textContent = String(state.lines);
      if (bestEl) bestEl.textContent = String(c ? c.getBest('block-wood') : state.best);
      if (levelEl) levelEl.textContent = String(state.level);
    }
    function setStatus(message) {
      state.statusBox.textContent = message;
    }
    function renderNextPreview() {
      state.nextPreview.innerHTML = '';
      var previewMatrix = state.nextPiece ? state.nextPiece.matrix : [[0]];
      var previewSize = Math.max(previewMatrix.length, previewMatrix[0].length);
      var cells = [];
      for (var row = 0; row < 4; row += 1) {
        for (var col = 0; col < 4; col += 1) {
          var cell = el('span', 'tetris-mini-cell');
          cells.push(cell);
          state.nextPreview.appendChild(cell);
        }
      }
      state.nextCells = cells;

      var offsetY = Math.floor((4 - previewMatrix.length) / 2);
      var offsetX = Math.floor((4 - previewMatrix[0].length) / 2);
      for (var row = 0; row < previewMatrix.length; row += 1) {
        for (var col = 0; col < previewMatrix[row].length; col += 1) {
          if (!previewMatrix[row][col]) continue;
          var idx = (row + offsetY) * 4 + (col + offsetX);
          if (state.nextCells[idx]) {
            state.nextCells[idx].classList.add('filled');
            state.nextCells[idx].style.background = state.nextPiece.color;
          }
        }
      }
    }
    function renderBoard() {
      for (var i = 0; i < state.boardCells.length; i += 1) {
        var cell = state.boardCells[i];
        cell.classList.remove('filled', 'ghost', 'active');
        cell.style.background = '';
        cell.style.boxShadow = '';
      }

      for (var row = 0; row < BOARD_HEIGHT; row += 1) {
        for (var col = 0; col < BOARD_WIDTH; col += 1) {
          var index = row * BOARD_WIDTH + col;
          var cell = state.boardCells[index];
          var value = state.board[row][col];
          if (value !== 0) {
            cell.classList.add('filled');
            cell.style.background = value;
          }
        }
      }

      if (state.currentPiece && !state.gameOver) {
        var ghost = buildGhostPiece(state.board, state.currentPiece);
        var ghostMap = {};
        if (ghost) {
          for (var ghostRow = 0; ghostRow < ghost.matrix.length; ghostRow += 1) {
            for (var ghostCol = 0; ghostCol < ghost.matrix[ghostRow].length; ghostCol += 1) {
              if (!ghost.matrix[ghostRow][ghostCol]) continue;
              var ghostY = ghost.y + ghostRow;
              var ghostX = ghost.x + ghostCol;
              if (ghostY >= 0 && ghostY < BOARD_HEIGHT && ghostX >= 0 && ghostX < BOARD_WIDTH) {
                ghostMap[ghostY + ':' + ghostX] = true;
              }
            }
          }
        }

        var currentMap = {};
        for (var pieceRow = 0; pieceRow < state.currentPiece.matrix.length; pieceRow += 1) {
          for (var pieceCol = 0; pieceCol < state.currentPiece.matrix[pieceRow].length; pieceCol += 1) {
            if (!state.currentPiece.matrix[pieceRow][pieceCol]) continue;
            var currentY = state.currentPiece.y + pieceRow;
            var currentX = state.currentPiece.x + pieceCol;
            if (currentY >= 0 && currentY < BOARD_HEIGHT && currentX >= 0 && currentX < BOARD_WIDTH) {
              currentMap[currentY + ':' + currentX] = true;
            }
          }
        }

        for (var ghostRow2 = 0; ghostRow2 < BOARD_HEIGHT; ghostRow2 += 1) {
          for (var ghostCol2 = 0; ghostCol2 < BOARD_WIDTH; ghostCol2 += 1) {
            var ghostKey = ghostRow2 + ':' + ghostCol2;
            if (ghostMap[ghostKey] && state.board[ghostRow2][ghostCol2] === 0) {
              var ghostCell = state.boardCells[ghostRow2 * BOARD_WIDTH + ghostCol2];
              ghostCell.classList.add('ghost');
              ghostCell.style.background = 'rgba(91, 209, 255, 0.28)';
              ghostCell.style.boxShadow = 'inset 0 0 0 1px rgba(91, 209, 255, 0.65)';
            }
            if (currentMap[ghostKey] && state.board[ghostRow2][ghostCol2] === 0) {
              var activeCell = state.boardCells[ghostRow2 * BOARD_WIDTH + ghostCol2];
              activeCell.classList.add('active');
              activeCell.style.background = state.currentPiece.color;
              activeCell.style.boxShadow = 'inset 0 0 0 2px rgba(255,255,255,0.18), 0 10px 18px rgba(6, 15, 25, 0.28)';
            }
          }
        }
      }
    }
    function spawnPiece() {
      var nextType = state.nextPiece ? state.nextPiece.type : pullNextType();
      state.currentPiece = createPiece(nextType, Math.floor((BOARD_WIDTH - 4) / 2), 0);
      state.nextPiece = createPiece(pullNextType(), 0, 0);

      if (!isValidPosition(state.board, state.currentPiece, 0, 0)) {
        endGame();
      }

      renderNextPreview();
      renderBoard();
    }
    function lockCurrentPiece() {
      if (!state.currentPiece) return;
      mergePiece(state.board, state.currentPiece);
      var result = clearCompleteLines(state.board);
      var cleared = result.cleared;
      if (cleared > 0) {
        state.lines += cleared;
        state.score += (getLineScore(cleared) * state.level) + (cleared === 4 ? 200 : 0);
        if (c) {
          if (cleared >= 2) c.unlock('bloco-limpeza-dupla');
        }
        if (c) c.tocarSom('linha');
      } else if (c) {
        c.tocarSom('colocar');
      }
      state.level = 1 + Math.floor(state.lines / 10);
      state.dropInterval = getDropInterval(state.level);
      state.currentPiece = null;
      spawnPiece();
      updateHud();
      renderBoard();
      if (cleared > 0) {
        setStatus('Linha limpa! +' + ((getLineScore(cleared) * state.level) + (cleared === 4 ? 200 : 0)) + ' pontos.');
      } else {
        setStatus('Peça travada. Próxima peça em ação.');
      }
    }
    function movePiece(dx, dy) {
      if (!state.currentPiece || state.gameOver || state.paused || !state.started) return false;
      if (isValidPosition(state.board, state.currentPiece, dx, dy)) {
        state.currentPiece.x += dx;
        state.currentPiece.y += dy;
        if (dy > 0 && dx === 0) {
          state.score += 1;
          updateHud();
        }
        renderBoard();
        return true;
      }
      if (dy > 0) {
        lockCurrentPiece();
      }
      return false;
    }
    function rotateCurrentPiece(direction) {
      if (!state.currentPiece || state.gameOver || state.paused || !state.started) return;
      var nextMatrix = rotateMatrix(state.currentPiece.matrix, direction);
      var nextPiece = {
        type: state.currentPiece.type,
        color: state.currentPiece.color,
        matrix: nextMatrix,
        x: state.currentPiece.x,
        y: state.currentPiece.y
      };

      var kicks = [0, -1, 1, -2, 2];
      for (var i = 0; i < kicks.length; i += 1) {
        if (isValidPosition(state.board, nextPiece, kicks[i], 0)) {
          state.currentPiece.matrix = nextMatrix;
          state.currentPiece.x += kicks[i];
          renderBoard();
          return;
        }
      }
    }
    function hardDrop() {
      if (!state.currentPiece || state.gameOver || state.paused || !state.started) return;
      var rows = 0;
      while (isValidPosition(state.board, state.currentPiece, 0, 1)) {
        state.currentPiece.y += 1;
        rows += 1;
      }
      if (rows > 0) {
        state.score += rows * 2;
        updateHud();
      }
      lockCurrentPiece();
      setStatus('Queda rápida! ' + rows + ' linhas alcançadas.');
      announce('Queda rápida ativada.');
    }
    function endGame() {
      state.gameOver = true;
      state.started = false;
      if (state.animationId) {
        window.cancelAnimationFrame(state.animationId);
        state.animationId = null;
      }
      var previousBest = c ? c.getBest('block-wood') : state.best;
      var isNewBest = false;
      if (c) {
        isNewBest = c.setBest('block-wood', state.score);
        c.tocarSom('derrota');
        if (isNewBest) c.tocarSom('recorde');
      }
      state.best = c ? c.getBest('block-wood') : Math.max(state.best, state.score);
      updateHud();
      renderBoard();
      setStatus('Fim de jogo — pontuação final: ' + state.score + ' pontos.' + (isNewBest ? ' Novo recorde!' : ''));
      announce('Fim de jogo no Block Wood Puzzle. Pontuação final: ' + state.score + ' pontos.' + (isNewBest ? ' Novo recorde!' : ''));

      if (window.portalModal && typeof window.portalModal.open === 'function') {
        window.portalModal.open(
          isNewBest ? '★ Novo recorde! ★' : 'Fim de jogo',
          'Sua pontuação foi ' + state.score + ' pontos. Recorde atual: ' + (c ? c.getBest('block-wood') : state.best) + '. Deseja jogar novamente?',
          'Jogar novamente',
          function () { resetGame(); },
          function () {}
        );
      }
    }
    function resetGame() {
      state.board = createEmptyBoard(BOARD_WIDTH, BOARD_HEIGHT);
      state.score = 0;
      state.lines = 0;
      state.level = 1;
      state.paused = false;
      state.gameOver = false;
      state.started = true;
      state.dropInterval = getDropInterval(state.level);
      state.currentPiece = null;
      state.nextPiece = createPiece(pullNextType(), 0, 0);
      state.pauseBtn.textContent = 'Pausar';
      spawnPiece();
      updateHud();
      setStatus('Jogo iniciado. Use as setas e a barra de espaço para jogar.');
      announce('Novo jogo do Block Wood Puzzle iniciado.');
      state.boardEl.focus();
    }
    function togglePause() {
      if (state.gameOver) return;
      state.paused = !state.paused;
      state.pauseBtn.textContent = state.paused ? 'Continuar' : 'Pausar';
      if (state.paused) {
        setStatus('Jogo pausado. Pressione P para continuar.');
      } else {
        setStatus('Jogo retomado. Aproveite a queda.');
      }
      renderBoard();
    }
    function tick(timestamp) {
      if (!state.started || state.gameOver) {
        state.animationId = null;
        return;
      }

      if (state.paused) {
        state.animationId = window.requestAnimationFrame(tick);
        return;
      }

      if (!state.lastFrameTime) {
        state.lastFrameTime = timestamp;
      }

      if (timestamp - state.lastFrameTime >= state.dropInterval) {
        state.lastFrameTime = timestamp;
        movePiece(0, 1);
      }

      state.animationId = window.requestAnimationFrame(tick);
    }
    function onKeyDown(event) {
      if (!stage.closest('.screen.active')) return;
      var key = event.key;
      var handledKeys = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'x', 'X', 'z', 'Z', 'p', 'P', 'r', 'R'];
      if (handledKeys.indexOf(key) >= 0) {
        event.preventDefault();
      }

      if (key === 'p' || key === 'P') {
        togglePause();
        return;
      }

      if (key === 'r' || key === 'R') {
        resetGame();
        return;
      }

      if (!state.started || state.paused || state.gameOver) return;

      if (key === 'ArrowLeft') movePiece(-1, 0);
      else if (key === 'ArrowRight') movePiece(1, 0);
      else if (key === 'ArrowDown') movePiece(0, 1);
      else if (key === 'ArrowUp' || key === 'x' || key === 'X') rotateCurrentPiece(1);
      else if (key === 'z' || key === 'Z') rotateCurrentPiece(-1);
      else if (key === ' ') hardDrop();
    }

    function cleanup() {
      if (state.animationId) {
        window.cancelAnimationFrame(state.animationId);
        state.animationId = null;
      }
      state.started = false;
      state.paused = false;
      state.gameOver = true;
      state.boardEl.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keydown', onKeyDown);
      resetBtn.removeEventListener('click', resetGame);
      pauseBtn.removeEventListener('click', togglePause);
      if (startBtn) {
        startBtn.removeEventListener('click', handleStart);
      }
    }

    function handleStart() {
      intro.classList.add('concluida');
      state.started = true;
      setStatus('Jogo iniciado. Use as setas e a barra de espaço para jogar.');
      announce('Jogo iniciado.');
      state.boardEl.focus();
    }

    document.addEventListener('keydown', onKeyDown);
    state.boardEl.addEventListener('keydown', onKeyDown);
    resetBtn.addEventListener('click', resetGame);
    pauseBtn.addEventListener('click', togglePause);
    if (startBtn) {
      startBtn.addEventListener('click', handleStart);
    }

    reg['block-wood'] = {
      stage: stage,
      ativo: true,
      cleanup: cleanup
    };

    state.nextPiece = createPiece(pullNextType(), 0, 0);
    spawnPiece();
    updateHud();
    renderBoard();
    setStatus('Pressione "Começar a jogar" para iniciar a partida.');
    state.animationId = window.requestAnimationFrame(tick);
  }

  window.BlockWoodTetris = {
    BOARD_WIDTH: BOARD_WIDTH,
    BOARD_HEIGHT: BOARD_HEIGHT,
    createEmptyBoard: createEmptyBoard,
    rotateMatrix: rotateMatrix,
    isValidPosition: isValidPosition,
    clearCompleteLines: clearCompleteLines,
    getDropInterval: getDropInterval,
    createPiece: createPiece
  };

  window.initBlockWoodGame = initBlockWoodGame;
})();

