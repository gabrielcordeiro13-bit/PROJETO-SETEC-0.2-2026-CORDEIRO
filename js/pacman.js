/* SETEC 2026 - Pac-Man estilo arcade clássico (inspirado no original de labirinto):
 * movimento suave em pixels, túnel lateral, casinha dos fantasmas com saída
 * programada, fruta bônus, modos perseguir/dispersar/energia.
 * Mapa, desenho e código recriados do zero para o projeto. Sem assets de terceiros. */
(function () {
  'use strict';

  /* Labirinto 19x15, simétrico. '#' parede, '.' ponto, 'o' energia,
   * ' ' interior da casinha (só fantasmas), '-' porta (só fantasmas). */
  var MAPA = [
    '###################',
    '#........#........#',
    '#o##.###.#.###.##o#',
    '#.................#',
    '#.#..#.......#..#.#',
    '#....#.......#....#',
    '#......##-##......#',
    '.......#   #.......',
    '#......#####......#',
    '#....#.......#....#',
    '#.#..#.......#..#.#',
    '#o..#.........#..o#',
    '#.##.#.......#.##.#',
    '#........#........#',
    '###################'
  ];
  var ROWS = MAPA.length;          // 15
  var COLS = MAPA[0].length;       // 19
  var TILE = 24;
  var LARG = COLS * TILE;          // 456
  var ALT = ROWS * TILE;           // 360
  var TURMA = '2° D.S';

  var PORTA = { l: 6, c: 9 };      // porta da casinha
  var FRENTE_PORTA = { l: 5, c: 9 };
  var INTERIOR = { l: 7, c: 9 };
  var JOGADOR_INI = { l: 11, c: 9 };
  var LINHA_TUNEL = 7;
  var FRUTA_POS = { l: 9, c: 9 };

  function core() { return window.SetecCore || null; }
  function announce(m) { var c = core(); if (c) c.announce(m); }

  function charDe(l, c) {
    if (l < 0 || l >= ROWS) return '#';
    var cc = ((c % COLS) + COLS) % COLS;
    return MAPA[l].charAt(cc);
  }
  function andaFantasma(l, c) {
    var ch = charDe(l, c);
    return ch !== '#';
  }
  function andaJogador(l, c) {
    var ch = charDe(l, c);
    return ch === '.' || ch === 'o';
  }

  var DIRS = [
    { l: -1, c: 0, nome: 'up' },
    { l: 1, c: 0, nome: 'down' },
    { l: 0, c: -1, nome: 'left' },
    { l: 0, c: 1, nome: 'right' }
  ];
  function dirPorNome(nome) {
    for (var i = 0; i < DIRS.length; i += 1) {
      if (DIRS[i].nome === nome) return { l: DIRS[i].l, c: DIRS[i].c };
    }
    return null;
  }

  function criarUi(stage) {
    stage.innerHTML =
      '<div class="pacman-game">' +
      '<section class="game-intro" aria-label="Como jogar Pac-Man">' +
      '<h3>Como jogar</h3>' +
      '<ol>' +
      '<li><strong>Objetivo:</strong> coma todos os pontos do labirinto sem ser capturado pelos fantasmas.</li>' +
      '<li><strong>Teclado:</strong> setas ou WASD para mover. <kbd>P</kbd> pausa, <kbd>R</kbd> reinicia.</li>' +
      '<li><strong>Toque:</strong> use o direcional abaixo ou deslize o dedo sobre o labirinto.</li>' +
      '<li><strong>Túnel:</strong> as laterais do meio se conectam: entre de um lado e saia do outro!</li>' +
      '<li><strong>Energia e fruta:</strong> os 4 pontos grandes deixam os fantasmas vulneráveis. Coma a fruta bônus quando ela aparecer!</li>' +
      '</ol>' +
      '<button type="button" class="primary-button" id="pacman-start">Começar a jogar</button>' +
      '</section>' +
      '<div class="pacman-panel">' +
      '<div class="stat-box">Pontos: <span id="pacman-score">0</span></div>' +
      '<div class="stat-box">Vidas: <span id="pacman-lives">3</span></div>' +
      '<div class="stat-box">Fase: <span id="pacman-level">1</span></div>' +
      '<div class="stat-box">Recorde: <span id="pacman-best">0</span></div>' +
      '<div class="stat-box" id="pacman-power" hidden>ENERGIA!</div>' +
      '<button type="button" class="secondary-button" id="pacman-pause">Pausar</button>' +
      '<button type="button" class="primary-button" id="pacman-reset">Reiniciar</button>' +
      '</div>' +
      '<p class="pacman-status" id="pacman-status" role="status" aria-live="polite">Pressione Começar para jogar.</p>' +
      '<div class="pacman-canvas-wrap">' +
      '<canvas id="pacman-canvas" tabindex="0" width="' + LARG + '" height="' + ALT + '" role="img" aria-label="Labirinto do Pac-Man da turma 2 D S. Use as setas ou as letras W A S D para mover."></canvas>' +
      '</div>' +
      '<p class="pacman-turma" aria-hidden="true">★ TURMA ' + TURMA + ' ★</p>' +
      '<div class="pacman-controls" aria-label="Controles de toque">' +
      '<span></span><button type="button" class="pacman-control-btn" data-dir="up" aria-label="Mover para cima">▲</button><span></span>' +
      '<button type="button" class="pacman-control-btn" data-dir="left" aria-label="Mover para esquerda">◀</button>' +
      '<button type="button" class="pacman-control-btn" data-dir="down" aria-label="Mover para baixo">▼</button>' +
      '<button type="button" class="pacman-control-btn" data-dir="right" aria-label="Mover para direita">▶</button>' +
      '</div>' +
      '</div>';
  }

  function centroDe(l, c) {
    return { x: c * TILE + TILE / 2, y: l * TILE + TILE / 2 };
  }

  /* Caminho em largura (BFS) para os olhos voltarem à casinha. */
  function bfsCaminho(deL, deC, paraL, paraC) {
    deC = ((deC % COLS) + COLS) % COLS;
    var chave = function (l, c) { return l + ',' + c; };
    var veioDe = {};
    var fila = [{ l: deL, c: deC }];
    veioDe[chave(deL, deC)] = null;
    while (fila.length) {
      var at = fila.shift();
      if (at.l === paraL && at.c === paraC) break;
      for (var i = 0; i < DIRS.length; i += 1) {
        var nl = at.l + DIRS[i].l;
        var nc = ((at.c + DIRS[i].c) % COLS + COLS) % COLS;
        if (nl < 0 || nl >= ROWS) continue;
        if (!andaFantasma(nl, nc)) continue;
        if (charDe(nl, nc) === '-' || charDe(nl, nc) === ' ') continue;
        var k = chave(nl, nc);
        if (veioDe[k] !== undefined) continue;
        veioDe[k] = at;
        fila.push({ l: nl, c: nc });
      }
    }
    var caminho = [];
    var fim = chave(paraL, paraC);
    if (veioDe[fim] === undefined) return caminho;
    var cur = { l: paraL, c: paraC };
    while (cur) {
      caminho.unshift(cur);
      cur = veioDe[chave(cur.l, cur.c)];
    }
    return caminho;
  }

  function initPacmanGame() {
    var stage = document.querySelector('[data-screen="pacman"] .game-stage');
    if (!stage) return;
    var reg = window.__gameRuntimeRegistry || (window.__gameRuntimeRegistry = {});
    if (reg.pacman && reg.pacman.stage === stage && reg.pacman.ativo) return;
    if (reg.pacman && typeof reg.pacman.cleanup === 'function') {
      try { reg.pacman.cleanup(); } catch (e) {}
    }
    var c = core();
    if (c) c.countPlay('pacman');

    criarUi(stage);

    var canvas = document.getElementById('pacman-canvas');
    var ctx = canvas.getContext('2d');
    var scoreEl = document.getElementById('pacman-score');
    var livesEl = document.getElementById('pacman-lives');
    var levelEl = document.getElementById('pacman-level');
    var bestEl = document.getElementById('pacman-best');
    var powerEl = document.getElementById('pacman-power');
    var statusEl = document.getElementById('pacman-status');

    var pellets = new Set();
    var powerSet = new Set();
    var totalDaFase = 0;
    var comidosFase = 0;

    var jogador = { x: 0, y: 0, dir: { l: 0, c: -1 }, prox: { l: 0, c: -1 }, movendo: false };

    var fantasmas = [
      { cor: '#ff3b3b', canto: { l: 1, c: 17 }, soltaEm: 0.5, modo: 'casa', x: 0, y: 0, dir: { l: 0, c: -1 }, vuln: false, pontos: null, espera: 0 },
      { cor: '#ffb8de', canto: { l: 1, c: 1 }, soltaEm: 3.5, modo: 'casa', x: 0, y: 0, dir: { l: 0, c: 1 }, vuln: false, pontos: null, espera: 0 },
      { cor: '#00e8ff', canto: { l: 13, c: 17 }, soltaEm: 7, modo: 'casa', x: 0, y: 0, dir: { l: 0, c: -1 }, vuln: false, pontos: null, espera: 0 },
      { cor: '#ffb847', canto: { l: 13, c: 1 }, soltaEm: 10.5, modo: 'casa', x: 0, y: 0, dir: { l: 0, c: 1 }, vuln: false, pontos: null, espera: 0 }
    ];

    var pontos = 0, vidas = 3, fase = 1;
    var estado = 'pronto'; // pronto | jogando | pausa | fim
    var energiaAte = 0;
    var tempoJogo = 0;
    var modoFantasmas = 'dispersar';
    var trocaModoEm = 5;
    var cadeiaFantasmas = 0;
    var fruta = null; // {x, y, someEm}
    var frutaGerada = false;
    var rafId = null, ultimoTs = 0;
    var invencivelAte = 0;

    function velJogador() { return TILE * (6.4 + Math.min(2, (fase - 1) * 0.4)); }
    function velFantasma() { return TILE * (5.8 + Math.min(2, (fase - 1) * 0.4)); }
    function duracaoEnergia() { return Math.max(3.5, 6.5 - (fase - 1) * 0.6); }

    function montarPellets() {
      pellets.clear(); powerSet.clear();
      for (var l = 0; l < ROWS; l += 1) {
        for (var cc = 0; cc < COLS; cc += 1) {
          var ch = MAPA[l].charAt(cc);
          if (ch !== '.' && ch !== 'o') continue;
          if (l === LINHA_TUNEL && (cc === 0 || cc === COLS - 1)) continue; // túnel sem pontos
          if (l === JOGADOR_INI.l && cc === JOGADOR_INI.c) continue; // casa inicial vazia
          var k = l + ',' + cc;
          pellets.add(k);
          if (ch === 'o') powerSet.add(k);
        }
      }
      totalDaFase = pellets.size;
      comidosFase = 0;
      fruta = null;
      frutaGerada = false;
    }

    function hud() {
      scoreEl.textContent = String(pontos);
      livesEl.textContent = String(vidas);
      levelEl.textContent = String(fase);
      bestEl.textContent = String(c ? c.getBest('pacman') : 0);
      powerEl.hidden = !(performance.now() < energiaAte);
    }
    function setStatus(m) { statusEl.textContent = m; }

    function posarEntidades() {
      var pj = centroDe(JOGADOR_INI.l, JOGADOR_INI.c);
      jogador.x = pj.x; jogador.y = pj.y;
      jogador.dir = { l: 0, c: -1 }; jogador.prox = { l: 0, c: -1 };
      jogador.movendo = false;
      var vagas = [
        centroDe(INTERIOR.l, INTERIOR.c - 1),
        centroDe(INTERIOR.l, INTERIOR.c),
        centroDe(INTERIOR.l, INTERIOR.c + 1),
        centroDe(INTERIOR.l, INTERIOR.c)
      ];
      fantasmas.forEach(function (f, i) {
        f.x = vagas[i].x; f.y = vagas[i].y;
        f.y0 = vagas[i].y;
        f.dir = { l: 0, c: i % 2 === 0 ? -1 : 1 };
        f.modo = 'casa'; f.vuln = false; f.pontos = null; f.espera = 0;
      });
      MODO_INI();
    }
    function MODO_INI() {
      modoFantasmas = 'dispersar';
      trocaModoEm = 5;
      energiaAte = 0;
      cadeiaFantasmas = 0;
      tempoJogo = 0;
    }

    function tileDe(x, y) {
      var cc = Math.floor(x / TILE);
      var l = Math.floor(y / TILE);
      cc = ((cc % COLS) + COLS) % COLS;
      if (l < 0) l = 0;
      if (l >= ROWS) l = ROWS - 1;
      return { l: l, c: cc };
    }

    function comerSeHouver() {
      var t = tileDe(jogador.x, jogador.y);
      var k = t.l + ',' + t.c;
      if (!pellets.has(k)) return;
      var ehPower = powerSet.has(k);
      pellets.delete(k); powerSet.delete(k);
      comidosFase += 1;
      if (ehPower) {
        pontos += 50;
        energiaAte = performance.now() + duracaoEnergia() * 1000;
        cadeiaFantasmas = 0;
        fantasmas.forEach(function (f) { if (f.modo === 'ativo') f.vuln = true; });
        setStatus('Energia! Fantasmas vulneráveis — coma-os!');
        announce('Modo energia ativado. Fantasmas vulneráveis.');
      } else {
        pontos += 10;
      }
      if (!frutaGerada && comidosFase >= 30) {
        frutaGerada = true;
        var fp = centroDe(FRUTA_POS.l, FRUTA_POS.c);
        fruta = { x: fp.x, y: fp.y, someEm: performance.now() + 9000 };
        setStatus('Uma fruta bônus apareceu no centro!');
        announce('Fruta bônus no centro do labirinto.');
      }
      salvarRecorde();
      hud();
      if (c && pontos >= 500) c.unlock('pacman-500');
      if (pellets.size === 0) concluirFase();
    }

    function salvarRecorde() {
      if (c && pontos > c.getBest('pacman')) c.setBest('pacman', pontos);
    }

    function comerFrutaSeHouver() {
      if (!fruta) return;
      if (performance.now() > fruta.someEm) { fruta = null; return; }
      var dx = jogador.x - fruta.x, dy = jogador.y - fruta.y;
      if (dx * dx + dy * dy < (TILE * 0.7) * (TILE * 0.7)) {
        pontos += 100;
        fruta = null;
        setStatus('Fruta bônus! +100 pontos.');
        announce('Fruta bônus comida. Mais 100 pontos.');
        salvarRecorde();
        hud();
      }
    }

    function concluirFase() {
      estado = 'fim';
      if (c) { c.unlock('pacman-fase'); c.setBest('pacman', pontos); }
      announce('Fase ' + fase + ' concluída com ' + pontos + ' pontos!');
      hud();
      if (window.portalModal && typeof window.portalModal.open === 'function') {
        window.portalModal.open(
          'Fase ' + fase + ' concluída!',
          'Você comeu todos os ' + totalDaFase + ' pontos com ' + pontos + ' pontos totais. Avançar para a fase ' + (fase + 1) + '?',
          'Próxima fase',
          function () {
            fase += 1;
            montarPellets(); posarEntidades();
            estado = 'jogando';
            setStatus('Fase ' + fase + '. Boa sorte!');
            hud();
            ultimoTs = 0;
            if (!rafId) rafId = window.requestAnimationFrame(laco);
          },
          function () { estado = 'pronto'; setStatus('Fase concluída. Pressione Reiniciar para jogar de novo.'); }
        );
      }
    }

    function perderVida() {
      if (performance.now() < invencivelAte) return;
      vidas -= 1;
      hud();
      announce('Vida perdida. Restam ' + vidas + ' vidas.');
      if (vidas <= 0) { encerrar(); return; }
      posarEntidades();
      invencivelAte = performance.now() + 1200;
      setStatus('Cuidado! Restam ' + vidas + ' vidas.');
      hud();
    }

    function encerrar() {
      estado = 'fim';
      if (c) c.setBest('pacman', pontos);
      hud();
      announce('Fim de jogo no Pac-Man. Pontuação: ' + pontos + ' pontos na fase ' + fase + '.');
      if (window.portalModal && typeof window.portalModal.open === 'function') {
        window.portalModal.open(
          'Fim de jogo',
          'O laboratório entrou em modo de segurança na fase ' + fase + ' com ' + pontos + ' pontos.',
          'Jogar novamente',
          function () { reiniciarTudo(); },
          function () {}
        );
      }
    }

    /* ---- movimento suave do jogador ---- */
    function passoJogador(dt) {
      var vel = velJogador() * dt;
      while (vel > 0.0001) {
        var d = jogador.movendo ? jogador.dir : jogador.prox;
        var centro = centroMaisProximo(jogador.x, jogador.y, d);
        var dist = Math.abs(centro.x - jogador.x) + Math.abs(centro.y - jogador.y);
        if (dist > vel) {
          jogador.x += d.c * vel; jogador.y += d.l * vel;
          jogador.x = envolverX(jogador.x);
          vel = 0;
        } else {
          jogador.x = centro.x; jogador.y = centro.y;
          vel -= dist;
          var t = tileDe(jogador.x, jogador.y);
          // tenta virar para a direção pedida
          if ((jogador.prox.l !== d.l || jogador.prox.c !== d.c) &&
              andaJogador(t.l + jogador.prox.l, t.c + jogador.prox.c)) {
            jogador.dir = { l: jogador.prox.l, c: jogador.prox.c };
            jogador.movendo = true;
            d = jogador.dir;
          }
          if (!jogador.movendo) {
            if (andaJogador(t.l + d.l, t.c + d.c)) { jogador.dir = { l: d.l, c: d.c }; jogador.movendo = true; }
            else { vel = 0; } // parado até receber direção livre
          } else if (!andaJogador(t.l + d.l, t.c + d.c)) {
            // tenta manter virando com a pedida, senão para
            if (andaJogador(t.l + jogador.prox.l, t.c + jogador.prox.c)) {
              jogador.dir = { l: jogador.prox.l, c: jogador.prox.c };
            } else { jogador.movendo = false; vel = 0; }
          }
          comerSeHouver();
          if (estado !== 'jogando') return;
        }
      }
      comerFrutaSeHouver();
    }

    function centroMaisProximo(x, y, d) {
      var t = tileDe(x, y);
      var cx = t.c * TILE + TILE / 2, cy = t.l * TILE + TILE / 2;
      // se já passou do centro na direção do movimento, mira o próximo
      if (d.c > 0 && x > cx + 0.5) cx += TILE;
      if (d.c < 0 && x < cx - 0.5) cx -= TILE;
      if (d.l > 0 && y > cy + 0.5) cy += TILE;
      if (d.l < 0 && y < cy - 0.5) cy -= TILE;
      return { x: cx, y: cy };
    }
    function envolverX(x) {
      if (x < 0) return x + LARG;
      if (x >= LARG) return x - LARG;
      return x;
    }

    /* ---- fantasmas ---- */
    function alvoDoFantasma(f, idx) {
      var jt = tileDe(jogador.x, jogador.y);
      if (modoFantasmas === 'dispersar') return f.canto;
      if (idx === 1) return { l: jt.l + jogador.dir.l * 3, c: jt.c + jogador.dir.c * 3 };
      if (idx === 2) {
        var b = tileDe(fantasmas[0].x, fantasmas[0].y);
        return { l: jt.l + (jt.l - b.l), c: jt.c + (jt.c - b.c) };
      }
      if (idx === 3) {
        var dx = jt.c - tileDe(f.x, f.y).c, dy = jt.l - tileDe(f.x, f.y).l;
        if (Math.abs(dx) + Math.abs(dy) < 5) return f.canto; // tímido de perto
        return jt;
      }
      return jt;
    }

    function opcoesEm(l, c, dirAtual, fantasma) {
      var lista = [];
      for (var i = 0; i < DIRS.length; i += 1) {
        var nl = l + DIRS[i].l, nc = c + DIRS[i].c;
        if (!andaFantasma(nl, nc)) continue;
        var ch = charDe(nl, nc);
        if (ch === '-' || ch === ' ') continue; // porta/interior só em script
        if (DIRS[i].l === -dirAtual.l && DIRS[i].c === -dirAtual.c) continue; // sem reverter
        lista.push(DIRS[i]);
      }
      return lista;
    }

    function passoFantasma(f, idx, dt) {
      var base = (f.vuln ? 0.72 : 1) * velFantasma() * dt;
      if (f.modo === 'casa') {
        if (tempoJogo >= f.soltaEm) {
          f.modo = 'saindo';
          f.pontos = null;
        } else {
          // balança dentro da casinha (sem sair do lugar)
          f.y = (f.y0 || f.y) + Math.sin(performance.now() / 240 + idx * 1.7) * 3;
          return;
        }
      }
      if (f.modo === 'saindo') {
        var portaX = centroDe(PORTA.l, PORTA.c).x;
        if (Math.abs(f.x - portaX) > 1) {
          f.x += (f.x < portaX ? 1 : -1) * Math.min(Math.abs(f.x - portaX), velFantasma() * dt);
          return;
        }
        f.x = portaX;
        var alvoY = centroDe(FRENTE_PORTA.l, FRENTE_PORTA.c).y;
        f.y -= Math.min(f.y - alvoY, velFantasma() * dt);
        if (f.y <= alvoY + 0.5) {
          f.y = alvoY;
          f.modo = 'ativo';
          f.dir = { l: 0, c: -1 };
        }
        return;
      }
      if (f.modo === 'olhos') {
        if (!f.pontos || !f.pontos.length) {
          var t = tileDe(f.x, f.y);
          f.pontos = bfsCaminho(t.l, t.c, FRENTE_PORTA.l, FRENTE_PORTA.c);
          f.pontos.shift();
          if (!f.pontos.length) { voltarParaCasa(f); return; }
        }
        var dest = centroDe(f.pontos[0].l, f.pontos[0].c);
        var dx = dest.x - f.x, dy = dest.y - f.y;
        var dist = Math.abs(dx) + Math.abs(dy);
        var passo = velFantasma() * 1.7 * dt;
        if (dist <= passo) {
          f.x = envolverX(dest.x); f.y = dest.y;
          f.pontos.shift();
          if (!f.pontos.length) {
            // entra pela porta e revive
            f.modo = 'entrando';
          }
        } else {
          f.x = envolverX(f.x + (dx / dist) * passo);
          f.y = f.y + (dy / dist) * passo;
        }
        return;
      }
      if (f.modo === 'entrando') {
        var portaX2 = centroDe(PORTA.l, PORTA.c).x;
        if (Math.abs(f.x - portaX2) > 1) {
          f.x += (f.x < portaX2 ? 1 : -1) * Math.min(Math.abs(f.x - portaX2), velFantasma() * dt);
          return;
        }
        var dentroY = centroDe(INTERIOR.l, INTERIOR.c).y;
        f.y += Math.min(dentroY - f.y, velFantasma() * dt);
        if (f.y >= dentroY - 0.5) {
          f.y = dentroY; f.vuln = false; f.modo = 'saindo';
        }
        return;
      }
      // modo ativo: anda até o centro do próximo tile e decide
      var rest = base;
      var guard = 0;
      while (rest > 0.0001 && guard < 6) {
        guard += 1;
        var centro = centroMaisProximo(f.x, f.y, f.dir);
        var d2 = Math.abs(centro.x - f.x) + Math.abs(centro.y - f.y);
        if (d2 > rest) {
          f.x = envolverX(f.x + f.dir.c * rest);
          f.y += f.dir.l * rest;
          rest = 0;
        } else {
          f.x = centro.x; f.y = centro.y;
          rest -= d2;
          var tt = tileDe(f.x, f.y);
          var ops = opcoesEm(tt.l, tt.c, f.dir, f);
          if (!ops.length) {
            f.dir = { l: -f.dir.l, c: -f.dir.c }; // beco: reverte
            continue;
          }
          var escolha;
          if (f.vuln || Math.random() < 0.12) {
            escolha = ops[Math.floor(Math.random() * ops.length)];
          } else {
            var alvo = alvoDoFantasma(f, idx);
            var melhor = ops[0], md = Infinity;
            for (var i = 0; i < ops.length; i += 1) {
              var dd = Math.abs((tt.l + ops[i].l) - alvo.l) + Math.abs((tt.c + ops[i].c) - alvo.c);
              if (dd < md) { md = dd; melhor = ops[i]; }
            }
            escolha = melhor;
          }
          f.dir = { l: escolha.l, c: escolha.c };
        }
      }
    }

    function voltarParaCasa(f) { f.modo = 'entrando'; f.pontos = null; }

    function checarColisoes() {
      var jt = tileDe(jogador.x, jogador.y);
      for (var i = 0; i < fantasmas.length; i += 1) {
        var f = fantasmas[i];
        if (f.modo === 'casa' || f.modo === 'saindo' || f.modo === 'entrando') continue;
        var ft = tileDe(f.x, f.y);
        var mesmaCasa = (ft.l === jt.l && ft.c === jt.c);
        var dx = f.x - jogador.x, dy = f.y - jogador.y;
        if (!mesmaCasa && dx * dx + dy * dy > (TILE * 0.6) * (TILE * 0.6)) continue;
        if (f.modo === 'olhos') continue;
        if (f.vuln || performance.now() < energiaAte) {
          var ganho = 200 * Math.pow(2, cadeiaFantasmas);
          cadeiaFantasmas = Math.min(3, cadeiaFantasmas + 1);
          pontos += ganho;
          f.vuln = false;
          f.modo = 'olhos'; f.pontos = null;
          setStatus('Fantasma capturado! +' + ganho + ' pontos.');
          announce('Fantasma capturado. Mais ' + ganho + ' pontos. Total: ' + pontos + '.');
          if (c) { c.unlock('pacman-fantasma'); if (pontos >= 500) c.unlock('pacman-500'); }
          salvarRecorde();
          hud();
        } else {
          perderVida();
          return;
        }
      }
      if (performance.now() >= energiaAte) {
        fantasmas.forEach(function (f) { f.vuln = false; });
        cadeiaFantasmas = 0;
      }
    }

    /* ---- desenho ---- */
    function desenhar(agora) {
      ctx.clearRect(0, 0, LARG, ALT);
      desenharMarcaDagua();
      // paredes com visual neon arredondado
      for (var l = 0; l < ROWS; l += 1) {
        for (var cc = 0; cc < COLS; cc += 1) {
          var ch = MAPA[l].charAt(cc);
          var x = cc * TILE, y = l * TILE;
          if (ch === '#') {
            ctx.fillStyle = '#0a1c44';
            ctx.fillRect(x, y, TILE, TILE);
            ctx.strokeStyle = '#2e5dff';
            ctx.lineWidth = 2;
            var m = 3;
            ctx.beginPath();
            if (MAPA[l].charAt(cc - 1) !== '#') { ctx.moveTo(x + m, y); ctx.lineTo(x + m, y + TILE); }
            if (cc + 1 >= COLS || MAPA[l].charAt(cc + 1) !== '#') { ctx.moveTo(x + TILE - m, y); ctx.lineTo(x + TILE - m, y + TILE); }
            if (l - 1 < 0 || MAPA[l - 1].charAt(cc) !== '#') { ctx.moveTo(x, y + m); ctx.lineTo(x + TILE, y + m); }
            if (l + 1 >= ROWS || MAPA[l + 1].charAt(cc) !== '#') { ctx.moveTo(x, y + TILE - m); ctx.lineTo(x + TILE, y + TILE - m); }
            ctx.stroke();
          } else {
            ctx.fillStyle = '#050b14';
            ctx.fillRect(x, y, TILE, TILE);
            if (pellets.has(l + ',' + cc)) {
              var power = powerSet.has(l + ',' + cc);
              var pulso = (power && c && !c.prefersReducedMotion()) ? 1 + Math.sin(agora / 220) * 0.25 : 1;
              ctx.fillStyle = power ? '#ffd429' : '#9fdcff';
              ctx.beginPath();
              ctx.arc(x + TILE / 2, y + TILE / 2, (power ? TILE * 0.2 : TILE * 0.11) * pulso, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
      // porta da casinha
      var pd = centroDe(PORTA.l, PORTA.c);
      ctx.fillStyle = '#ff9ecb';
      ctx.fillRect(pd.x - TILE / 2 + 3, pd.y - 2, TILE - 6, 4);
      desenharFruta();
      desenharJogador(agora);
      fantasmas.forEach(desenharFantasma);
    }

    function desenharMarcaDagua() {
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.translate(LARG / 2, ALT / 2);
      ctx.rotate(-Math.PI / 2); // deitada lateralmente
      ctx.fillStyle = '#21d4ff';
      ctx.font = '900 ' + Math.floor(TILE * 2.6) + 'px Impact, "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(TURMA, 0, 0);
      ctx.restore();
    }

    function desenharJogador(agora) {
      var boca = (c && c.prefersReducedMotion()) ? 0.25 : 0.15 + Math.abs(Math.sin(agora / 120)) * 0.5;
      var ang = Math.atan2(jogador.dir.l, jogador.dir.c);
      var raio = TILE * 0.46;
      ctx.fillStyle = '#ffe135';
      ctx.beginPath();
      ctx.moveTo(jogador.x, jogador.y);
      if (estado === 'fim' && vidas <= 0) ctx.arc(jogador.x, jogador.y, raio, 0, Math.PI * 2);
      else ctx.arc(jogador.x, jogador.y, raio, ang + boca, ang - boca + Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }

    function desenharFantasma(f) {
      var w = TILE * 0.4, cima = TILE * 0.3, base = TILE * 0.36;
      if (f.modo === 'olhos') {
        // só os olhos voltando para casa
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(f.x - w * 0.35, f.y - cima * 0.3, w * 0.22, 0, Math.PI * 2);
        ctx.arc(f.x + w * 0.35, f.y - cima * 0.3, w * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2e5dff';
        ctx.beginPath();
        ctx.arc(f.x - w * 0.35 + f.dir.c * 1.5, f.y - cima * 0.3, w * 0.11, 0, Math.PI * 2);
        ctx.arc(f.x + w * 0.35 + f.dir.c * 1.5, f.y - cima * 0.3, w * 0.11, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      var vulneravel = f.vuln || performance.now() < energiaAte;
      var piscando = vulneravel && (energiaAte - performance.now() < 1500) && Math.floor(performance.now() / 250) % 2 === 0;
      ctx.fillStyle = vulneravel ? (piscando ? '#ffffff' : '#2e5dff') : f.cor;
      ctx.beginPath();
      ctx.arc(f.x, f.y - cima * 0.4, w, Math.PI, 0);
      ctx.lineTo(f.x + w, f.y + base);
      ctx.lineTo(f.x + w * 0.66, f.y + base * 0.62);
      ctx.lineTo(f.x + w * 0.33, f.y + base);
      ctx.lineTo(f.x, f.y + base * 0.62);
      ctx.lineTo(f.x - w * 0.33, f.y + base);
      ctx.lineTo(f.x - w * 0.66, f.y + base * 0.62);
      ctx.lineTo(f.x - w, f.y + base);
      ctx.closePath();
      ctx.fill();
      var olhoY = f.y - cima * 0.35, olhoR = TILE * 0.09;
      var olhaX = f.dir.c * 1.2, olhaY = f.dir.l * 1.2;
      if (vulneravel) {
        ctx.fillStyle = piscando ? '#2e5dff' : '#ffb8b8';
        ctx.beginPath();
        ctx.arc(f.x - olhoR, olhoY, olhoR * 0.6, 0, Math.PI * 2);
        ctx.arc(f.x + olhoR, olhoY, olhoR * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(f.x - w * 0.5, f.y + base * 0.35);
        ctx.lineTo(f.x + w * 0.5, f.y + base * 0.35);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(f.x - olhoR * 1.4 + olhaX, olhoY + olhaY, olhoR, 0, Math.PI * 2);
        ctx.arc(f.x + olhoR * 1.4 + olhaX, olhoY + olhaY, olhoR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2438ff';
        ctx.beginPath();
        ctx.arc(f.x - olhoR * 1.4 + olhaX * 2, olhoY + olhaY * 2, olhoR * 0.5, 0, Math.PI * 2);
        ctx.arc(f.x + olhoR * 1.4 + olhaX * 2, olhoY + olhaY * 2, olhoR * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function desenharFruta() {
      if (!fruta || performance.now() > fruta.someEm) return;
      var pisca = (fruta.someEm - performance.now() < 2000) && Math.floor(performance.now() / 200) % 2 === 0;
      if (pisca) return;
      var x = fruta.x, y = fruta.y, r = TILE * 0.22;
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - r * 1.2);
      ctx.quadraticCurveTo(x + 2, y - r * 2, x + r * 1.2, y - r * 2.2);
      ctx.stroke();
      ctx.fillStyle = '#ff3b3b';
      ctx.beginPath(); ctx.arc(x - r * 0.55, y + r * 0.3, r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.55, y + r * 0.3, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath(); ctx.arc(x - r * 0.8, y, r * 0.28, 0, Math.PI * 2); ctx.fill();
    }

    /* ---- laço principal ---- */
    function laco(ts) {
      if (estado === 'fim') { rafId = null; return; }
      if (!ultimoTs) ultimoTs = ts;
      var dt = Math.min((ts - ultimoTs) / 1000, 0.05);
      ultimoTs = ts;
      if (estado === 'jogando') {
        tempoJogo += dt;
        if (tempoJogo >= trocaModoEm) {
          modoFantasmas = (modoFantasmas === 'perseguir') ? 'dispersar' : 'perseguir';
          trocaModoEm = tempoJogo + (modoFantasmas === 'perseguir' ? 8 : 5);
        }
        passoJogador(dt);
        if (estado === 'jogando') {
          for (var i = 0; i < fantasmas.length; i += 1) passoFantasma(fantasmas[i], i, dt);
          checarColisoes();
        }
      }
      desenhar(ts || 0);
      hud();
      rafId = window.requestAnimationFrame(laco);
    }

    function iniciar() {
      var intro = stage.querySelector('.game-intro');
      if (intro) intro.style.display = 'none';
      estado = 'jogando';
      setStatus('Coma todos os pontos! Fase ' + fase + '.');
      announce('Pac-Man iniciado. Coma todos os pontos e desvie dos fantasmas.');
      ultimoTs = 0;
      if (!rafId) rafId = window.requestAnimationFrame(laco);
      try { canvas.focus({ preventScroll: true }); } catch (err) { try { canvas.focus(); } catch (e2) {} }
    }

    function reiniciarTudo() {
      var intro = stage.querySelector('.game-intro');
      if (intro) intro.style.display = 'none';
      pontos = 0; vidas = 3; fase = 1;
      montarPellets(); posarEntidades();
      estado = 'jogando';
      setStatus('Novo jogo! Coma todos os pontos.');
      hud(); ultimoTs = 0;
      if (!rafId) rafId = window.requestAnimationFrame(laco);
    }

    var mapaTeclas = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
      W: 'up', S: 'down', A: 'left', D: 'right'
    };

    function onKey(e) {
      if (!stage.closest('.screen.active')) return;
      var nome = mapaTeclas[e.key];
      if (nome) {
        e.preventDefault();
        var d = dirPorNome(nome);
        if (d) {
          jogador.prox = d;
          marcarBotaoAtivo(null, nome);
          if (estado === 'pronto') iniciar();
        }
        return;
      }
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); alternarPausa(); }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); reiniciarTudo(); }
    }

    function alternarPausa() {
      var btn = document.getElementById('pacman-pause');
      if (estado === 'jogando') {
        estado = 'pausa';
        setStatus('Jogo pausado. Pressione P ou o botão Continuar.');
        if (btn) btn.textContent = 'Continuar';
        announce('Jogo pausado.');
      } else if (estado === 'pausa') {
        estado = 'jogando';
        setStatus('Jogo retomado!');
        if (btn) btn.textContent = 'Pausar';
        ultimoTs = 0;
        announce('Jogo retomado.');
      }
    }

    function definirDir(nome) {
      var d = dirPorNome(nome);
      if (d) {
        jogador.prox = d;
        if (estado === 'pronto') iniciar();
      }
    }

    var botoes = stage.querySelectorAll('.pacman-control-btn');
    function marcarBotaoAtivo(botao, nome) {
      botoes.forEach(function (b) {
        var on = botao ? b === botao : b.getAttribute('data-dir') === nome;
        b.classList.toggle('ativo', !!on);
      });
    }
    function onBtn(e) {
      if (e.cancelable) e.preventDefault();
      var botao = e.currentTarget;
      marcarBotaoAtivo(botao, null);
      definirDir(botao.getAttribute('data-dir'));
    }
    botoes.forEach(function (b) {
      b.addEventListener('pointerdown', onBtn);
      b.addEventListener('click', onBtn);
      b.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          marcarBotaoAtivo(b, null);
          definirDir(b.getAttribute('data-dir'));
        }
      });
    });

    var toqueIni = null;
    function onTouchStart(e) {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      var t = e.changedTouches[0];
      toqueIni = { x: t.clientX, y: t.clientY };
    }
    function onTouchEnd(e) {
      if (!toqueIni || !e.changedTouches || !e.changedTouches[0]) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - toqueIni.x, dy = t.clientY - toqueIni.y;
      toqueIni = null;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
      var nome = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      marcarBotaoAtivo(null, nome);
      definirDir(nome);
      e.preventDefault();
    }
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    document.getElementById('pacman-start').addEventListener('click', function (ev) {
      ev.currentTarget.closest('.game-intro').style.display = 'none';
      iniciar();
    });
    document.getElementById('pacman-reset').addEventListener('click', reiniciarTudo);
    document.getElementById('pacman-pause').addEventListener('click', alternarPausa);
    document.addEventListener('keydown', onKey);

    reg.pacman = {
      stage: stage, ativo: true,
      cleanup: function () {
        this.ativo = false;
        if (rafId) { window.cancelAnimationFrame(rafId); rafId = null; }
        document.removeEventListener('keydown', onKey);
        botoes.forEach(function (b) {
          b.removeEventListener('pointerdown', onBtn);
          b.removeEventListener('click', onBtn);
        });
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchend', onTouchEnd);
      }
    };

    montarPellets(); posarEntidades(); hud();
    desenhar(0);
    rafId = window.requestAnimationFrame(laco);
  }

  window.initPacmanGame = initPacmanGame;
})();
