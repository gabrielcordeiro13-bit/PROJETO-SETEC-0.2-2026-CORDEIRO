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
      </div>
    `;
  }

  function initPacmanGame() {
    const stage = document.querySelector('[data-screen="pacman"] .game-stage');
    if (!stage) {
      return;
    }

    if (window.__pacmanRuntime && window.__pacmanRuntime.stage === stage) {
      return;
    }

    if (window.__pacmanRuntime && typeof window.__pacmanRuntime.cleanup === 'function') {
      window.__pacmanRuntime.cleanup();
    }

    createPacmanGameUi(stage);

    const canvas = document.getElementById('pacman-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('pacman-score');
    const livesEl = document.getElementById('pacman-lives');
    const tileSize = 28;
    const map = [
      '#############',
      '#o...#...#o#',
      '#.#.#.#.#.#.#',
      '#...#...#...#',
      '#.#.###.#.#.#',
      '#...#...#...#',
      '#.#.#.#.#.#.#',
      '#.#...#...#.#',
      '#...###.###.#',
      '#.#...#...#.#',
      '#...#.#.#...#',
      '#.#.#...#.#.#',
      '#...#.#.#...#',
      '#o...#...#o.#',
      '#############',
    ];

    const rows = map.length;
    const cols = map[0].length;
    const pellets = [];
    const powerPellets = [];

    let score = 0;
    let lives = 3;
    let gameState = 'playing';
    let powerModeUntil = 0;
    let animationId = null;

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

    window.__pacmanRuntime = runtime;

    const player = {
      row: 1,
      col: 1,
      dir: { row: 0, col: 1 },
      nextDir: { row: 0, col: 1 },
      mouth: 0,
    };

    const ghosts = [
      { row: 7, col: 7, color: '#ff6b6b', dir: { row: 1, col: 0 }, vulnerable: false },
      { row: 7, col: 9, color: '#f9a826', dir: { row: 0, col: -1 }, vulnerable: false },
      { row: 9, col: 7, color: '#8ec5ff', dir: { row: -1, col: 0 }, vulnerable: false },
    ];

    function isWall(row, col) {
      if (row < 0 || col < 0 || row >= rows || col >= cols) {
        return true;
      }
      return map[row][col] === '#';
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

    function setupPellets() {
      pellets.length = 0;
      powerPellets.length = 0;

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const cell = map[row][col];
          if (cell !== '#') {
            const pellet = { row, col, power: cell === 'o' };
            pellets.push(pellet);

            if (pellet.power) {
              powerPellets.push(pellet);
            }
          }
        }
      }
    }

    function candidateGhostDirection(ghost, targetRow, targetCol, preferFlee) {
      const options = getPossibleDirections(ghost.row, ghost.col).filter((dir) => !(dir.row === -ghost.dir.row && dir.col === -ghost.dir.col));

      if (!options.length) {
        return { row: 0, col: 0 };
      }

      const target = options
        .map((direction) => ({
          direction,
          distance: Math.abs((ghost.row + direction.row) - targetRow) + Math.abs((ghost.col + direction.col) - targetCol),
        }))
        .sort((a, b) => {
          const aValue = preferFlee ? -a.distance : a.distance;
          const bValue = preferFlee ? -b.distance : b.distance;
          return aValue - bValue;
        });

      return target[0].direction;
    }

    function collectPelletIfNeeded() {
      const pelletIndex = pellets.findIndex((pellet) => pellet.row === player.row && pellet.col === player.col);

      if (pelletIndex >= 0) {
        const pellet = pellets[pelletIndex];
        if (pellet.power) {
          score += 25;
          powerModeUntil = performance.now() + 3500;
          ghosts.forEach((ghost) => {
            ghost.vulnerable = true;
          });
        } else {
          score += 10;
        }

        pellets.splice(pelletIndex, 1);
      }

      renderHud();
      if (!pellets.length) {
        endGame(true);
      }
    }

    function renderHud() {
      scoreEl.textContent = String(score);
      livesEl.textContent = String(lives);
    }

    function endGame(isWin) {
      gameState = 'finished';
      const title = isWin ? 'Vitória' : 'Game Over';
      const message = isWin
        ? `Você coletou todas as pastilhas com ${score} pontos.`
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
      player.row = 1;
      player.col = 1;
      player.dir = { row: 0, col: 1 };
      player.nextDir = { row: 0, col: 1 };

      ghosts[0].row = 7;
      ghosts[0].col = 7;
      ghosts[0].vulnerable = false;
      ghosts[1].row = 7;
      ghosts[1].col = 9;
      ghosts[1].vulnerable = false;
      ghosts[2].row = 9;
      ghosts[2].col = 7;
      ghosts[2].vulnerable = false;

      setupPellets();
      renderHud();
      animationId = window.requestAnimationFrame(loop);
    }

    function updatePlayer() {
      player.nextDir = normalizeDirection(player.nextDir);
      if (isWalkable(player.row + player.nextDir.row, player.col + player.nextDir.col)) {
        player.dir = player.nextDir;
      }

      const nextRow = player.row + player.dir.row;
      const nextCol = player.col + player.dir.col;

      if (isWalkable(nextRow, nextCol)) {
        player.row = nextRow;
        player.col = nextCol;
        collectPelletIfNeeded();
      }
    }

    function normalizeDirection(direction) {
      if (!direction) {
        return { row: 0, col: 1 };
      }
      return { row: direction.row || 0, col: direction.col || 0 };
    }

    function isWalkable(row, col) {
      if (row < 0 || col < 0 || row >= rows || col >= cols) {
        return false;
      }
      return map[row][col] !== '#';
    }

    function moveGhost(ghost) {
      const targetRow = player.row;
      const targetCol = player.col;
      const preferFlee = ghost.vulnerable || performance.now() < powerModeUntil;
      const nextDir = candidateGhostDirection(ghost, targetRow, targetCol, preferFlee);

      if (!nextDir || (nextDir.row === 0 && nextDir.col === 0)) {
        ghost.dir = { row: 0, col: 0 };
        return;
      }

      ghost.dir = nextDir;
      const nextRow = ghost.row + nextDir.row;
      const nextCol = ghost.col + nextDir.col;

      if (!isWall(nextRow, nextCol)) {
        ghost.row = nextRow;
        ghost.col = nextCol;
      }
    }

    function checkGhostCollisions() {
      ghosts.forEach((ghost) => {
        if (ghost.row === player.row && ghost.col === player.col) {
          if (ghost.vulnerable || performance.now() < powerModeUntil) {
            ghost.row = 7;
            ghost.col = 7;
            score += 100;
            renderHud();
          } else {
            lives -= 1;
            renderHud();

            player.row = 1;
            player.col = 1;
            player.dir = { row: 0, col: 1 };
            player.nextDir = { row: 0, col: 1 };

            if (lives <= 0) {
              endGame(false);
            }
          }
        }
      });
    }

    function updateGame() {
      if (gameState !== 'playing') {
        return;
      }

      updatePlayer();
      moveGhosts();
      checkGhostCollisions();

      if (performance.now() >= powerModeUntil) {
        ghosts.forEach((ghost) => {
          ghost.vulnerable = false;
        });
      }
    }

    function moveGhosts() {
      ghosts.forEach((ghost) => {
        moveGhost(ghost);
      });
    }

    function drawPacman(now) {
      const centerX = player.col * tileSize + tileSize / 2;
      const centerY = player.row * tileSize + tileSize / 2;
      const mouth = 0.2 + Math.abs(Math.sin(now / 130)) * 0.7;

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      const angle = Math.atan2(player.dir.row, player.dir.col);
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
      ctx.lineTo(x + 8, y + 5);
      ctx.lineTo(x + 4, y + 10);
      ctx.lineTo(x - 4, y + 5);
      ctx.lineTo(x - 8, y + 10);
      ctx.lineTo(x - 12, y + 10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x - 4, y - 2, 2.5, 0, Math.PI * 2);
      ctx.arc(x + 4, y - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawMap() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = col * tileSize;
          const y = row * tileSize;

          if (map[row][col] === '#') {
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(x, y, tileSize, tileSize);
            ctx.strokeStyle = '#93c5fd';
            ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
          } else {
            ctx.fillStyle = '#07131f';
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

    function loop(now) {
      if (gameState !== 'finished') {
        updateGame();
      }

      drawMap();
      drawPacman(now);
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

    window.__pacmanKeyHandler = handleKeyDown;
    document.addEventListener('keydown', handleKeyDown);

    const resetButton = document.getElementById('pacman-reset');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        if (animationId) {
          window.cancelAnimationFrame(animationId);
          animationId = null;
        }
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
    animationId = window.requestAnimationFrame(loop);
  }

  window.initPacmanGame = initPacmanGame;
})();
