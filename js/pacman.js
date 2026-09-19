(function () {
  function createPacmanGameUi(stage) {
    stage.innerHTML = `
      <div class="pacman-game">
        <div class="pacman-panel">
          <div class="stat-box">Pontuação: <span id="pacman-score">0</span></div>
          <div class="stat-box">Vidas: <span id="pacman-lives">3</span></div>
          <button type="button" class="primary-button" id="pacman-reset">Reiniciar</button>
        </div>

        <div class="pacman-canvas-wrap">
          <canvas id="pacman-canvas" width="420" height="420" aria-label="Jogo Pac-Man"></canvas>
        </div>

        <div class="pacman-controls" aria-label="Controles de toque do Pac-Man">
          <button type="button" class="pacman-control-btn" data-direction="up" aria-label="Mover para cima">↑</button>
          <button type="button" class="pacman-control-btn" data-direction="left" aria-label="Mover para esquerda">←</button>
          <button type="button" class="pacman-control-btn" data-direction="down" aria-label="Mover para baixo">↓</button>
          <button type="button" class="pacman-control-btn" data-direction="right" aria-label="Mover para direita">→</button>
        </div>
      </div>
    `;
  }

  function initPacmanGame() {
    const stage = document.querySelector('[data-screen="pacman"] .game-stage');
    if (!stage) {
      return;
    }

    if (window.__gameRuntimeRegistry?.['pacman'] && window.__gameRuntimeRegistry['pacman'].stage === stage) {
      return;
    }

    if (window.__gameRuntimeRegistry?.['pacman'] && typeof window.__gameRuntimeRegistry['pacman'].cleanup === 'function') {
      window.__gameRuntimeRegistry['pacman'].cleanup();
    }

    createPacmanGameUi(stage);

    const canvas = document.getElementById('pacman-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('pacman-score');
    const livesEl = document.getElementById('pacman-lives');
    const tileSize = 28;
    const map = [
      '#############',
      '#o..#...#..o#',
      '#.#.#.#.#.#.#',
      '#...#...#...#',
      '#.#.###.#.#.#',
      '#...#...#...#',
      '#.#.#.#.#.#.#',
      '#o.#...#...o#',
      '#...###.###.#',
      '#.#...#...#.#',
      '#...#.#.#...#',
      '#.#.#...#.#.#',
      '#...#.#.#...#',
      '#o...#...#..o#',
      '#############',
    ];

    const rows = map.length;
    const cols = map[0].length;
    const pellets = [];
    let score = 0;
    let lives = 3;
    let level = 1;
    let gameState = 'playing';
    let powerModeUntil = 0;
    let animationId = null;
    let lastTime = 0;
    let accumulator = 0;

    const runtime = {
      stage,
      cleanup() {
        if (animationId) {
          window.cancelAnimationFrame(animationId);
          animationId = null;
        }
        if (typeof window.__pacmanKeyHandler === 'function') {
          document.removeEventListener('keydown', window.__pacmanKeyHandler);
          window.__pacmanKeyHandler = null;
        }
      },
    };

    window.__gameRuntimeRegistry = window.__gameRuntimeRegistry || {};
    window.__gameRuntimeRegistry['pacman'] = runtime;

    const player = {
      row: 1,
      col: 1,
      dir: { row: 0, col: 1 },
      nextDir: { row: 0, col: 1 },
      mouth: 0,
    };

    const ghosts = [
      { row: 7, col: 7, color: '#ff6b6b', dir: { row: 1, col: 0 }, vulnerable: false, mode: 'chase' },
      { row: 7, col: 9, color: '#f9a826', dir: { row: 0, col: -1 }, vulnerable: false, mode: 'scatter' },
      { row: 9, col: 7, color: '#8ec5ff', dir: { row: -1, col: 0 }, vulnerable: false, mode: 'chase' },
    ];

    function isWall(row, col) {
      if (row < 0 || col < 0 || row >= rows || col >= cols) {
        return true;
      }
      return map[row][col] === '#';
    }

    function isWalkable(row, col) {
      if (row < 0 || col < 0 || row >= rows || col >= cols) {
        return false;
      }
      return map[row][col] !== '#';
    }

    function getPossibleDirections(row, col) {
      const directions = [
        { row: -1, col: 0 },
        { row: 1, col: 0 },
        { row: 0, col: -1 },
        { row: 0, col: 1 },
      ];

      return directions.filter((direction) => !isWall(row + direction.row, col + direction.col));
    }

    function normalizeDirection(direction) {
      if (!direction) {
        return { row: 0, col: 1 };
      }
      return { row: direction.row || 0, col: direction.col || 0 };
    }

    function setupPellets() {
      pellets.length = 0;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          if (map[row][col] !== '#') {
            pellets.push({ row, col, power: map[row][col] === 'o' });
          }
        }
      }
    }

    function renderHud() {
      scoreEl.textContent = String(score);
      livesEl.textContent = String(lives);
    }

    function updatePlayer() {
      const desired = normalizeDirection(player.nextDir);
      if (isWalkable(player.row + desired.row, player.col + desired.col)) {
        player.dir = desired;
      }

      const nextRow = player.row + player.dir.row;
      const nextCol = player.col + player.dir.col;

      if (!isWalkable(nextRow, nextCol)) {
        return;
      }

      player.row = nextRow;
      player.col = nextCol;
      collectPelletIfNeeded();
    }

    function collectPelletIfNeeded() {
      const pelletIndex = pellets.findIndex((pellet) => pellet.row === player.row && pellet.col === player.col);
      if (pelletIndex < 0) {
        return;
      }

      const pellet = pellets[pelletIndex];
      if (pellet.power) {
        score += 25;
        powerModeUntil = performance.now() + 4000;
        ghosts.forEach((ghost) => {
          ghost.vulnerable = true;
          ghost.mode = 'frightened';
        });
      } else {
        score += 10;
      }

      pellets.splice(pelletIndex, 1);
      renderHud();

      if (!pellets.length) {
        level += 1;
        resetLevel();
      }
    }

    function resetLevel() {
      player.row = 1;
      player.col = 1;
      player.dir = { row: 0, col: 1 };
      player.nextDir = { row: 0, col: 1 };

      ghosts[0].row = 7;
      ghosts[0].col = 7;
      ghosts[1].row = 7;
      ghosts[1].col = 9;
      ghosts[2].row = 9;
      ghosts[2].col = 7;
      ghosts.forEach((ghost) => {
        ghost.vulnerable = false;
        ghost.mode = 'chase';
      });

      setupPellets();
      renderHud();
    }

    function findGhostTarget(ghost) {
      if (ghost.vulnerable || performance.now() < powerModeUntil) {
        return { row: ghost.row, col: ghost.col };
      }

      if (ghost.mode === 'scatter') {
        return { row: 0, col: cols - 1 };
      }

      const playerOptions = {
        row: player.row,
        col: player.col,
      };

      if (ghost.color === '#f9a826') {
        const rowShift = player.dir.row * 3;
        const colShift = player.dir.col * 3;
        return { row: player.row + rowShift, col: player.col + colShift };
      }

      if (ghost.color === '#8ec5ff') {
        const vectorRow = player.row - ghosts[0].row;
        const vectorCol = player.col - ghosts[0].col;
        return { row: player.row + vectorRow, col: player.col + vectorCol };
      }

      return playerOptions;
    }

    function chooseGhostDirection(ghost) {
      const currentOptions = getPossibleDirections(ghost.row, ghost.col);
      const reverse = { row: -ghost.dir.row, col: -ghost.dir.col };
      const options = currentOptions.filter((direction) => !(direction.row === reverse.row && direction.col === reverse.col));
      const target = findGhostTarget(ghost);

      if (!options.length) {
        return { row: 0, col: 0 };
      }

      if (ghost.vulnerable || performance.now() < powerModeUntil) {
        return options
          .map((direction) => ({
            direction,
            distance: Math.abs((ghost.row + direction.row) - target.row) + Math.abs((ghost.col + direction.col) - target.col),
          }))
          .sort((a, b) => b.distance - a.distance)[0].direction;
      }

      return options
        .map((direction) => ({
          direction,
          distance: Math.abs((ghost.row + direction.row) - target.row) + Math.abs((ghost.col + direction.col) - target.col),
        }))
        .sort((a, b) => a.distance - b.distance)[0].direction;
    }

    function moveGhosts() {
      ghosts.forEach((ghost) => {
        const nextDir = chooseGhostDirection(ghost);
        if (!nextDir || (nextDir.row === 0 && nextDir.col === 0)) {
          return;
        }

        ghost.dir = nextDir;
        const nextRow = ghost.row + nextDir.row;
        const nextCol = ghost.col + nextDir.col;
        if (!isWall(nextRow, nextCol)) {
          ghost.row = nextRow;
          ghost.col = nextCol;
        }
      });
    }

    function handleGhostCollision() {
      ghosts.forEach((ghost) => {
        if (ghost.row !== player.row || ghost.col !== player.col) {
          return;
        }

        if (ghost.vulnerable || performance.now() < powerModeUntil) {
          ghost.row = 7;
          ghost.col = 7;
          ghost.vulnerable = false;
          ghost.mode = 'chase';
          score += 150;
          renderHud();
          return;
        }

        lives -= 1;
        renderHud();

        player.row = 1;
        player.col = 1;
        player.dir = { row: 0, col: 1 };
        player.nextDir = { row: 0, col: 1 };

        if (lives <= 0) {
          endGame(false);
        }
      });
    }

    function endGame(isWin) {
      gameState = 'finished';
      const title = isWin ? 'Vitória' : 'Game Over';
      const message = isWin
        ? `Você passou do nível ${level} com ${score} pontos.`
        : 'Pac-Man foi capturado e o laboratório entrou em modo de segurança.';

      if (typeof window.portalModal?.open === 'function') {
        window.portalModal.open(title, message, 'Jogar Novamente', () => {
          resetGame();
        });
      }
    }

    function resetGame() {
      if (animationId) {
        window.cancelAnimationFrame(animationId);
        animationId = null;
      }

      gameState = 'playing';
      score = 0;
      lives = 3;
      level = 1;
      powerModeUntil = 0;
      lastTime = 0;
      accumulator = 0;

      player.row = 1;
      player.col = 1;
      player.dir = { row: 0, col: 1 };
      player.nextDir = { row: 0, col: 1 };

      ghosts[0].row = 7;
      ghosts[0].col = 7;
      ghosts[1].row = 7;
      ghosts[1].col = 9;
      ghosts[2].row = 9;
      ghosts[2].col = 7;
      ghosts.forEach((ghost) => {
        ghost.vulnerable = false;
        ghost.mode = 'chase';
      });

      setupPellets();
      renderHud();
      animationId = window.requestAnimationFrame(loop);
    }

    function drawMap() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = col * tileSize;
          const y = row * tileSize;

          if (map[row][col] === '#') {
            ctx.fillStyle = '#2e5dff';
            ctx.fillRect(x, y, tileSize, tileSize);
            ctx.strokeStyle = '#a9c2ff';
            ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
          } else {
            ctx.fillStyle = '#08131f';
            ctx.fillRect(x, y, tileSize, tileSize);

            const pellet = pellets.find((item) => item.row === row && item.col === col);
            if (pellet) {
              ctx.fillStyle = pellet.power ? '#fbbf24' : '#facc15';
              ctx.beginPath();
              ctx.arc(x + tileSize / 2, y + tileSize / 2, pellet.power ? 5 : 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    }

    function drawPacman(now) {
      const centerX = player.col * tileSize + tileSize / 2;
      const centerY = player.row * tileSize + tileSize / 2;
      const mouth = 0.2 + Math.abs(Math.sin(now / 130)) * 0.7;
      const angle = Math.atan2(player.dir.row, player.dir.col);

      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, tileSize * 0.42, angle - mouth, angle + mouth);
      ctx.closePath();
      ctx.fill();
    }

    function drawGhost(ghost) {
      const x = ghost.col * tileSize + tileSize / 2;
      const y = ghost.row * tileSize + tileSize / 2;
      const bodyColor = ghost.vulnerable ? '#7dd3fc' : ghost.color;

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(x, y - 8, 11, Math.PI, 0);
      ctx.lineTo(x + 12, y + 10);
      ctx.lineTo(x + 9, y + 5);
      ctx.lineTo(x + 4, y + 10);
      ctx.lineTo(x - 4, y + 5);
      ctx.lineTo(x - 9, y + 10);
      ctx.lineTo(x - 12, y + 10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x - 4, y - 2, 2.5, 0, Math.PI * 2);
      ctx.arc(x + 4, y - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    function updateGame() {
      if (gameState !== 'playing') {
        return;
      }

      updatePlayer();
      moveGhosts();
      handleGhostCollision();

      if (performance.now() >= powerModeUntil) {
        ghosts.forEach((ghost) => {
          ghost.vulnerable = false;
          ghost.mode = 'chase';
        });
      }
    }

    function loop(timestamp) {
      if (!lastTime) {
        lastTime = timestamp;
      }

      const delta = timestamp - lastTime;
      lastTime = timestamp;
      accumulator += delta;

      while (accumulator >= 120) {
        updateGame();
        accumulator -= 120;
      }

      drawMap();
      drawPacman(timestamp);
      ghosts.forEach(drawGhost);

      if (gameState !== 'finished') {
        animationId = window.requestAnimationFrame(loop);
      }
    }

    const handleKeyDown = (event) => {
      const directions = {
        ArrowUp: { row: -1, col: 0 },
        ArrowDown: { row: 1, col: 0 },
        ArrowLeft: { row: 0, col: -1 },
        ArrowRight: { row: 0, col: 1 },
        w: { row: -1, col: 0 },
        s: { row: 1, col: 0 },
        a: { row: 0, col: -1 },
        d: { row: 0, col: 1 },
      };

      const move = directions[event.key];
      if (move) {
        player.nextDir = move;
      }
    };

    const directionalButtons = document.querySelectorAll('.pacman-control-btn');
    directionalButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const direction = button.dataset.direction;
        const mapDirections = {
          up: { row: -1, col: 0 },
          down: { row: 1, col: 0 },
          left: { row: 0, col: -1 },
          right: { row: 0, col: 1 },
        };

        if (mapDirections[direction]) {
          player.nextDir = mapDirections[direction];
        }
      });
    });

    window.__pacmanKeyHandler = handleKeyDown;
    document.addEventListener('keydown', handleKeyDown);

    const resetButton = document.getElementById('pacman-reset');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        resetGame();
      });
    }

    runtime.cleanup = () => {
      if (animationId) {
        window.cancelAnimationFrame(animationId);
        animationId = null;
      }
      if (window.__pacmanKeyHandler) {
        document.removeEventListener('keydown', window.__pacmanKeyHandler);
        window.__pacmanKeyHandler = null;
      }
    };

    setupPellets();
    renderHud();
    resetGame();
  }

  window.initPacmanGame = initPacmanGame;
})();
