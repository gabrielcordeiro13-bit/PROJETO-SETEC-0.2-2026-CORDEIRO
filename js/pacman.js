/* SETEC 2026 - Pac-Man estilo arcade clássico (inspirado no original de labirinto):
 * movimento suave em pixels, túnel lateral, casinha dos fantasmas com saída
 * programada, fruta bônus, modos perseguir/dispersar/energia.
 * Mapa, desenho e código recriados do zero para o projeto. Sem assets de terceiros. */
(function () {
  'use strict';

  /* Labirinto 28x31. '#': parede, '.': ponto, 'o': energia,
   * ' ' interior da casinha e '-': porta exclusiva dos fantasmas. */
  var ROWS = 31;
  var COLS = 28;
  var TILE = 20;
  var PORTA = { l: 12, c: 13 };
  var FRENTE_PORTA = { l: 11, c: 13 };
  var INTERIOR = { l: 14, c: 13 };
  var JOGADOR_INI = { l: 25, c: 13 };
  var LINHA_TUNEL = 14;
  var FRUTA_POS = { l: 21, c: 13 };
  var MAPA = construirMapa();
  var LARG = COLS * TILE;
  var ALT = ROWS * TILE;
  var TURMA = '2° D.S';

  function construirMapa() {
    var mapa = [];
    for (var l = 0; l < ROWS; l += 1) mapa.push(new Array(COLS).fill('#'));

    function abrir(l, c, ch) {
      if (l >= 0 && l < ROWS && c >= 0 && c < COLS) mapa[l][c] = ch || '.';
    }
    var horizontais = {
      1: [[1, 10], [17, 26]],
      3: [[1, 10], [17, 26]],
      5: [[1, 26]],
      7: [[1, 6], [8, 10], [17, 19], [21, 26]],
      9: [[1, 26]],
      11: [[1, 10], [13, 13], [17, 26]],
      13: [[1, 10], [17, 26]],
      15: [[1, 10], [17, 26]],
      17: [[1, 10], [17, 26]],
      19: [[1, 26]],
      21: [[1, 26]],
      23: [[1, 6], [8, 10], [17, 19], [21, 26]],
      25: [[1, 10], [17, 26]],
      27: [[1, 10], [17, 26]],
      29: [[1, 26]]
    };
    Object.keys(horizontais).forEach(function (linha) {
      horizontais[linha].forEach(function (trecho) {
        for (var c = trecho[0]; c <= trecho[1]; c += 1) abrir(Number(linha), c);
      });
    });

    // Corredores verticais intercalados com as paredes reproduzem as câmaras do labirinto.
    [1, 26].forEach(function (coluna) {
      for (var r = 1; r < ROWS - 1; r += 1) abrir(r, coluna);
    });
    [10, 17].forEach(function (coluna) {
      for (var r = 1; r <= 11; r += 1) abrir(r, coluna);
      for (var r2 = 17; r2 < ROWS - 1; r2 += 1) abrir(r2, coluna);
    });
    abrir(9, 13);
    abrir(10, 13);
    abrir(11, 13);
    [13, 14].forEach(function (coluna) {
      for (var r = 17; r < ROWS - 1; r += 1) abrir(r, coluna);
    });

    // O túnel lateral contorna a casinha central e conecta os dois extremos.
    for (var tc = 0; tc <= 10; tc += 1) abrir(LINHA_TUNEL, tc);
    for (var tc2 = 17; tc2 < COLS; tc2 += 1) abrir(LINHA_TUNEL, tc2);

    // A casinha permanece inacessível ao jogador e só pode ser atravessada pela porta.
    for (var hr = 12; hr <= 16; hr += 1) {
      for (var hc = 11; hc <= 16; hc += 1) abrir(hr, hc, '#');
    }
    for (var ir = 13; ir <= 15; ir += 1) {
      for (var ic = 12; ic <= 15; ic += 1) abrir(ir, ic, ' ');
    }
    abrir(PORTA.l, PORTA.c, '-');

    [[3, 1], [3, 26], [5, 4], [5, 23], [14, 1], [14, 26], [27, 1], [27, 26]]
      .forEach(function (pos) {
        if (mapa[pos[0]][pos[1]] !== '.') {
          throw new Error('Ponto de energia fora de um corredor: ' + pos.join(','));
        }
        abrir(pos[0], pos[1], 'o');
    });
    return mapa.map(function (row) { return row.join(''); });
  }

  window.PacmanMazeData = {
    rows: ROWS,
    columns: COLS,
    map: MAPA.slice(),
    playerStart: { l: JOGADOR_INI.l, c: JOGADOR_INI.c },
    ghostHouse: { door: PORTA, front: FRENTE_PORTA, interior: INTERIOR },
    tunnelRow: LINHA_TUNEL
  };

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
      '<section class="game-intro" role="dialog" aria-label="Como jogar Pac-Man">' +
      '<div class="intro-card">' +
      '<h3>Como jogar</h3>' +
      '<ol>' +
      '<li><strong>Objetivo:</strong> coma todos os pontos; os 8 grandes dão energia para capturar fantasmas.</li>' +
      '<li><strong>Controles:</strong> setas ou WASD (<kbd>P</kbd> pausa, <kbd>R</kbd> reinicia). No toque: direcional ou deslize.</li>' +
      '<li><strong>Extras:</strong> o túnel do meio liga os dois lados. A fruta bônus vale +100.</li>' +
      '</ol>' +
      '<button type="button" class="primary-button" id="pacman-start">Começar a jogar</button>' +
      '</div>' +
      '</section>' +
      '<div class="pacman-panel">' +
      '<div class="stat-box">Pontos: <span id="pacman-score">0</span></div>' +
      '<div class="stat-box">Vidas: <span id="pacman-lives">3</span></div>' +
      '<div class="stat-box">Fase: <span id="pacman-level">1</span></div>' +
      '<div class="stat-box">Recorde: <span id="pacman-best">0</span></div>' +
      '<div class="stat-box" id="pacman-power" hidden>ENERGIA!</div>' +
      '<button type="button" class="secondary-button" id="pacman-sound" aria-pressed="true">♪ Som ligado</button>' +
      '<button type="button" class="secondary-button" id="pacman-pause">Pausar</button>' +
      '<button type="button" class="primary-button" id="pacman-reset">Reiniciar</button>' +
      '</div>' +
      '<p class="pacman-status" id="pacman-status" role="status" aria-live="polite">Pressione Começar para jogar.</p>' +
      '<div class="pausa-overlay hidden" id="pacman-pausa-overlay" role="dialog" aria-label="Jogo pausado">' +
      '<div class="pausa-card"><h3>Jogo pausado</h3><p>Respire e continue quando quiser.</p>' +
      '<button type="button" class="primary-button" id="pacman-continuar">Continuar</button>' +
      '<button type="button" class="secondary-button" id="pacman-reiniciar2">Reiniciar</button>' +
      '<button type="button" class="secondary-button" id="pacman-biblioteca">Voltar à biblioteca</button>' +
      '</div></div>' +
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
    if (c && typeof c.tocarSom !== 'function') {
      try { c.tocarSom = function () {}; } catch (e) {} // núcleo antigo: segue sem som
    }
    if (c) c.countPlay('pacman');

    criarUi(stage);

    var canvas = document.getElementById('pacman-canvas');
    var ctx = canvas.getContext('2d');
    var scoreEl = document.getElementById('pacman-score');
    var livesEl = document.getElementById('pacman-lives');
    var levelEl = document.getElementById('pacman-level');
    var bestEl = document.getElementById('pacman-best');
    var powerEl = document.getElementById('pacman-power');
    var soundEl = document.getElementById('pacman-sound');
    var statusEl = document.getElementById('pacman-status');

    var pellets = new Set();
    var powerSet = new Set();
    var totalDaFase = 0;
    var comidosFase = 0;

    var jogador = { x: 0, y: 0, dir: { l: 0, c: -1 }, prox: { l: 0, c: -1 }, movendo: false };

    var fantasmas = [
      { cor: '#ff3b3b', canto: { l: 1, c: 26 }, soltaEm: 0.5, atrasoCasa: 0.5, modo: 'casa', x: 0, y: 0, dir: { l: 0, c: -1 }, vuln: false, pontos: null, espera: 0 },
      { cor: '#ffb8de', canto: { l: 1, c: 1 }, soltaEm: 3.5, atrasoCasa: 3.5, modo: 'casa', x: 0, y: 0, dir: { l: 0, c: 1 }, vuln: false, pontos: null, espera: 0 },
      { cor: '#00e8ff', canto: { l: 29, c: 26 }, soltaEm: 7, atrasoCasa: 7, modo: 'casa', x: 0, y: 0, dir: { l: 0, c: -1 }, vuln: false, pontos: null, espera: 0 },
      { cor: '#ffb847', canto: { l: 29, c: 1 }, soltaEm: 10.5, atrasoCasa: 10.5, modo: 'casa', x: 0, y: 0, dir: { l: 0, c: 1 }, vuln: false, pontos: null, espera: 0 }
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
    var flutuantes = []; // textos "+200" desenhados no canvas
    var rafId = null, ultimoTs = 0;
    var invencivelAte = 0;
    var morteInicio = 0;
    var morteProgresso = 0;
    var duracaoMorte = 0.95;

    function pulsoPlacar() {
      var box = scoreEl && scoreEl.parentElement;
      if (!box) return;
      box.classList.remove('pulso');
      void box.offsetWidth;
      box.classList.add('pulso');
    }

    function flutuar(x, y, texto) {
      flutuantes.push({ x: x, y: y, texto: texto, ate: tempoJogo + 0.9 });
      if (flutuantes.length > 12) flutuantes.shift();
    }

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
      powerEl.hidden = !(tempoJogo < energiaAte);
      var somLigado = !c || !c.getState || c.getState().prefs.som;
      soundEl.textContent = somLigado ? '♪ Som ligado' : '♪ Som desligado';
      soundEl.setAttribute('aria-pressed', String(somLigado));
    }
    function setStatus(m) { statusEl.textContent = m; }
    function iniciarMusica() {
      if (c && typeof c.iniciarMusicaPacman === 'function') c.iniciarMusicaPacman();
    }
    function pausarMusica() {
      if (c && typeof c.pausarMusicaPacman === 'function') c.pausarMusicaPacman();
    }
    function pararMusica() {
      if (c && typeof c.pararMusicaPacman === 'function') c.pararMusicaPacman();
    }

    function posarEntidades() {
      var pj = centroDe(JOGADOR_INI.l, JOGADOR_INI.c);
      jogador.x = pj.x; jogador.y = pj.y;
      jogador.dir = { l: 0, c: -1 }; jogador.prox = { l: 0, c: -1 };
      jogador.movendo = false; jogador.alvo = null;
      var vagas = [
        centroDe(INTERIOR.l, INTERIOR.c - 1),
        centroDe(INTERIOR.l, INTERIOR.c),
        centroDe(INTERIOR.l, INTERIOR.c + 1),
        centroDe(INTERIOR.l, INTERIOR.c)
      ];
      fantasmas.forEach(function (f, i) {
        f.x = vagas[i].x; f.y = vagas[i].y;
        f.y0 = vagas[i].y;
        f.alvo = null;
        f.dir = { l: 0, c: i % 2 === 0 ? -1 : 1 };
        f.modo = 'casa'; f.vuln = false; f.pontos = null; f.espera = 0;
        f.reverter = false;
      });
      morteProgresso = 0;
      MODO_INI();
    }
    function MODO_INI() {
      tempoJogo = 0;
      modoFantasmas = 'dispersar';
      trocaModoEm = 5;
      energiaAte = 0;
      cadeiaFantasmas = 0;
      fantasmas.forEach(function (f) { f.soltaEm = f.atrasoCasa; });
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
        pontos += 25;
        energiaAte = tempoJogo + duracaoEnergia();
        cadeiaFantasmas = 0;
        fantasmas.forEach(function (f) {
          if (f.modo !== 'ativo') return;
          f.vuln = true;
          f.reverter = true;
        });
        setStatus('Energia! Fantasmas vulneráveis — coma-os!');
        announce('Modo energia ativado. Fantasmas vulneráveis.');
        if (c) c.tocarSom('energia');
      } else {
        pontos += 10;
        if (c) c.tocarSom('ponto');
      }
      pulsoPlacar();
      if (!frutaGerada && comidosFase >= Math.ceil(totalDaFase * 0.25)) {
        frutaGerada = true;
        var fp = centroDe(FRUTA_POS.l, FRUTA_POS.c);
        fruta = { x: fp.x, y: fp.y, someEm: tempoJogo + 9 };
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
      if (tempoJogo > fruta.someEm) { fruta = null; return; }
      var dx = jogador.x - fruta.x, dy = jogador.y - fruta.y;
      if (dx * dx + dy * dy < (TILE * 0.7) * (TILE * 0.7)) {
        pontos += 100;
        flutuar(fruta.x, fruta.y - TILE, '+100');
        fruta = null;
        setStatus('Fruta bônus! +100 pontos.');
        announce('Fruta bônus comida. Mais 100 pontos.');
        salvarRecorde();
        hud();
        pulsoPlacar();
        if (c) c.tocarSom('fruta');
      }
    }

    function concluirFase() {
      estado = 'fim';
      pausarMusica();
      var recorde = false;
      if (c) {
        c.unlock('pacman-fase');
        recorde = c.setBest('pacman', pontos);
        c.tocarSom('vitoria');
        if (recorde) c.tocarSom('recorde');
      }
      announce('Fase ' + fase + ' concluída com ' + pontos + ' pontos!' + (recorde ? ' Novo recorde!' : ''));
      hud();
      if (window.portalModal && typeof window.portalModal.open === 'function') {
        window.portalModal.open(
          recorde ? '★ Novo recorde! ★' : 'Fase ' + fase + ' concluída!',
          'Você comeu todos os ' + totalDaFase + ' pontos com ' + pontos + ' pontos totais.' +
          (recorde ? ' ★ Novo recorde! ★' : '') + ' Avançar para a fase ' + (fase + 1) + '?',
          'Próxima fase',
          function () {
            fase += 1;
            montarPellets(); posarEntidades();
            estado = 'jogando';
            setStatus('Fase ' + fase + '. Boa sorte!');
            iniciarMusica();
            hud();
            ultimoTs = 0;
            if (!rafId) rafId = window.requestAnimationFrame(laco);
          },
          function () {
            estado = 'pronto';
            pararMusica();
            setStatus('Fase concluída. Pressione Reiniciar para jogar de novo.');
          }
        );
      }
    }

    function perderVida(agora) {
      if (tempoJogo < invencivelAte) return;
      vidas -= 1;
      hud();
      announce('Vida perdida. Restam ' + vidas + ' vidas.');
      if (c) c.tocarSom('erro');
      estado = 'morte';
      morteInicio = agora;
      morteProgresso = 0;
      pausarMusica();
      setStatus(vidas > 0 ? 'Vida perdida. Preparando para continuar...' : 'Fim de jogo...');
    }

    function encerrar() {
      estado = 'fim';
      pararMusica();
      var recorde = false;
      if (c) {
        recorde = c.setBest('pacman', pontos);
        c.tocarSom('derrota');
        if (recorde) c.tocarSom('recorde');
      }
      hud();
      announce('Fim de jogo no Pac-Man. Pontuação: ' + pontos + ' pontos na fase ' + fase + '.' + (recorde ? ' Novo recorde!' : ''));
      if (window.portalModal && typeof window.portalModal.open === 'function') {
        window.portalModal.open(
          recorde ? '★ Novo recorde! ★' : 'Fim de jogo',
          'O laboratório entrou em modo de segurança na fase ' + fase + ' com ' + pontos + ' pontos.' +
          (recorde ? ' ★ Novo recorde! ★' : ''),
          'Jogar novamente',
          function () { reiniciarTudo(); },
          function () {}
        );
      }
    }

    /* ---- movimento suave do jogador (alvo = próximo centro de tile) ---- */
    function proximoCentro(x, y, d) {
      var t = tileDe(x, y);
      return { x: (t.c + d.c) * TILE + TILE / 2, y: (t.l + d.l) * TILE + TILE / 2 };
    }

    function passoJogador(dt) {
      var vel = velJogador() * dt;
      var guard = 0;
      while (vel > 0.0001 && guard < 8) {
        guard += 1;
        if (!jogador.movendo || !jogador.alvo) {
          var t0 = tileDe(jogador.x, jogador.y);
          if (andaJogador(t0.l + jogador.prox.l, t0.c + jogador.prox.c)) {
            jogador.dir = { l: jogador.prox.l, c: jogador.prox.c };
            jogador.movendo = true;
            jogador.alvo = proximoCentro(jogador.x, jogador.y, jogador.dir);
          } else {
            jogador.movendo = false;
            jogador.alvo = null;
            break;
          }
        }
        var falta = Math.abs(jogador.alvo.x - jogador.x) + Math.abs(jogador.alvo.y - jogador.y);
        if (falta > vel) {
          jogador.x += jogador.dir.c * vel;
          jogador.y += jogador.dir.l * vel;
          vel = 0;
        } else {
          jogador.x = jogador.alvo.x;
          jogador.y = jogador.alvo.y;
          vel -= falta;
          if (jogador.x < 0 || jogador.x >= LARG) jogador.x = envolverX(jogador.x); // túnel
          var t = tileDe(jogador.x, jogador.y);
          comerSeHouver();
          if (estado !== 'jogando') return;
          var d = jogador.dir;
          if ((jogador.prox.l !== d.l || jogador.prox.c !== d.c) &&
              andaJogador(t.l + jogador.prox.l, t.c + jogador.prox.c)) {
            jogador.dir = { l: jogador.prox.l, c: jogador.prox.c };
          }
          d = jogador.dir;
          if (andaJogador(t.l + d.l, t.c + d.c)) {
            jogador.alvo = proximoCentro(jogador.x, jogador.y, d);
          } else {
            jogador.movendo = false;
            jogador.alvo = null;
            vel = 0;
          }
        }
      }
      comerFrutaSeHouver();
    }

    function envolverX(x) {
      if (x < 0) return x + LARG;
      if (x >= LARG) return x - LARG;
      return x;
    }
    /* Posições X extras para desenhar atravessando o túnel sem sumir. */
    function xsDesenho(x) {
      if (x < TILE) return [x, x + LARG];
      if (x > LARG - TILE) return [x, x - LARG];
      return [x];
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
          f.alvo = null;
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
      // modo ativo: persegue o alvo até o próximo centro e decide a direção
      var rest = base;
      var guard = 0;
      while (rest > 0.0001 && guard < 8) {
        guard += 1;
        if (!f.alvo) {
          var tt = tileDe(f.x, f.y);
          if (f.reverter) {
            var volta = { l: -f.dir.l, c: -f.dir.c };
            var chVolta = charDe(tt.l + volta.l, tt.c + volta.c);
            if (andaFantasma(tt.l + volta.l, tt.c + volta.c) && chVolta !== '-' && chVolta !== ' ') {
              f.dir = volta;
              f.alvo = proximoCentro(f.x, f.y, f.dir);
            }
            f.reverter = false;
          }
          if (f.alvo) continue;
          var ops = opcoesEm(tt.l, tt.c, f.dir, f);
          if (!ops.length) {
            f.dir = { l: -f.dir.l, c: -f.dir.c }; // beco: reverte
            f.alvo = proximoCentro(f.x, f.y, f.dir);
          } else {
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
            f.alvo = proximoCentro(f.x, f.y, f.dir);
          }
        }
        var falta = Math.abs(f.alvo.x - f.x) + Math.abs(f.alvo.y - f.y);
        if (falta > rest) {
          f.x = envolverX(f.x + f.dir.c * rest);
          f.y += f.dir.l * rest;
          rest = 0;
        } else {
          f.x = f.alvo.x; f.y = f.alvo.y;
          rest -= falta;
          if (f.x < 0 || f.x >= LARG) f.x = envolverX(f.x);
          f.alvo = null;
        }
      }
    }

    function voltarParaCasa(f) { f.modo = 'entrando'; f.pontos = null; }

    function checarColisoes(agora) {
      var jt = tileDe(jogador.x, jogador.y);
      for (var i = 0; i < fantasmas.length; i += 1) {
        var f = fantasmas[i];
        if (f.modo === 'casa' || f.modo === 'saindo' || f.modo === 'entrando') continue;
        var ft = tileDe(f.x, f.y);
        var mesmaCasa = (ft.l === jt.l && ft.c === jt.c);
        var dx = Math.abs(f.x - jogador.x), dy = Math.abs(f.y - jogador.y);
        dx = Math.min(dx, LARG - dx);
        if (!mesmaCasa && dx * dx + dy * dy > (TILE * 0.6) * (TILE * 0.6)) continue;
        if (f.modo === 'olhos') continue;
        if (f.vuln || tempoJogo < energiaAte) {
          var ganho = 200 * Math.pow(2, cadeiaFantasmas);
          cadeiaFantasmas = Math.min(3, cadeiaFantasmas + 1);
          pontos += ganho;
          f.vuln = false;
          f.reverter = false;
          f.alvo = null;
          f.modo = 'olhos'; f.pontos = null;
          flutuar(f.x, f.y - TILE, '+' + ganho);
          setStatus('Fantasma capturado! +' + ganho + ' pontos.');
          announce('Fantasma capturado. Mais ' + ganho + ' pontos. Total: ' + pontos + '.');
          if (c) { c.unlock('pacman-fantasma'); if (pontos >= 500) c.unlock('pacman-500'); c.tocarSom('fantasma'); }
          salvarRecorde();
          hud();
          pulsoPlacar();
        } else {
          perderVida(agora);
          return;
        }
      }
      if (tempoJogo >= energiaAte) {
        fantasmas.forEach(function (f) { f.vuln = false; });
        cadeiaFantasmas = 0;
      }
    }

    /* ---- desenho ---- */
    function desenhar(agora) {
      ctx.clearRect(0, 0, LARG, ALT);
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
      // marca d'água da turma sobre o labirinto (bem apagada) e
      // personagens por cima dela: visível sem atrapalhar o jogo
      desenharMarcaDagua();
      // porta da casinha
      var pd = centroDe(PORTA.l, PORTA.c);
      ctx.fillStyle = '#ff9ecb';
      ctx.fillRect(pd.x - TILE / 2 + 3, pd.y - 2, TILE - 6, 4);
      desenharFruta();
      desenharJogador(agora);
      fantasmas.forEach(desenharFantasma);
      desenharFlutuantes();
    }

    function desenharFlutuantes() {
      var agoraMs = tempoJogo;
      flutuantes = flutuantes.filter(function (fl) { return agoraMs < fl.ate; });
      flutuantes.forEach(function (fl) {
        var resto = (fl.ate - agoraMs) / 0.9; // 1 -> 0
        ctx.save();
        ctx.globalAlpha = Math.min(1, resto * 1.5);
        ctx.fillStyle = '#ffd429';
        ctx.font = '900 ' + Math.floor(TILE * 0.55) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fl.texto, fl.x, fl.y - (1 - resto) * TILE * 0.8);
        ctx.restore();
      });
    }

    function desenharMarcaDagua() {
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#21d4ff';
      ctx.font = '900 ' + Math.floor(TILE * 2.4) + 'px Impact, "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      try { ctx.letterSpacing = '6px'; } catch (e) {}
      ctx.fillText(TURMA, LARG / 2, ALT / 2);
      try { ctx.letterSpacing = '0px'; } catch (e2) {}
      ctx.restore();
    }

    function desenharJogador(agora) {
      var morrendo = estado === 'morte';
      var boca = (c && c.prefersReducedMotion()) ? 0.25 : 0.15 + Math.abs(Math.sin(agora / 120)) * 0.5;
      var ang = Math.atan2(jogador.dir.l, jogador.dir.c);
      var progressoBoca = morrendo ? Math.min(1, morteProgresso / 0.4) : 0;
      var escala = !morrendo || morteProgresso <= 0.4 ? 1 : (1 - morteProgresso) / 0.6;
      if (morrendo) boca *= 1 - progressoBoca;
      var raio = TILE * 0.46 * Math.max(0, escala);
      var xs = xsDesenho(jogador.x);
      for (var k = 0; k < xs.length; k += 1) {
        (function (px) {
          ctx.fillStyle = '#ffe135';
          ctx.beginPath();
          ctx.moveTo(px, jogador.y);
          ctx.arc(px, jogador.y, raio, ang + boca, ang - boca + Math.PI * 2);
          ctx.closePath();
          ctx.fill();
        })(xs[k]);
      }
    }

    function desenharFantasma(f) {
      var xs = xsDesenho(f.x);
      for (var k = 0; k < xs.length; k += 1) {
        desenharFantasmaEm(f, xs[k], f.y);
      }
    }

    function desenharFantasmaEm(f, gx, gy) {
      var w = TILE * 0.4, cima = TILE * 0.3, base = TILE * 0.36;
      if (f.modo === 'olhos') {
        // só os olhos voltando para casa
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(gx - w * 0.35, gy - cima * 0.3, w * 0.22, 0, Math.PI * 2);
        ctx.arc(gx + w * 0.35, gy - cima * 0.3, w * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2e5dff';
        ctx.beginPath();
        ctx.arc(gx - w * 0.35 + f.dir.c * 1.5, gy - cima * 0.3, w * 0.11, 0, Math.PI * 2);
        ctx.arc(gx + w * 0.35 + f.dir.c * 1.5, gy - cima * 0.3, w * 0.11, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      var vulneravel = f.vuln || tempoJogo < energiaAte;
      var piscando = vulneravel && (energiaAte - tempoJogo < 1.5) && Math.floor(tempoJogo / 0.25) % 2 === 0;
      ctx.fillStyle = vulneravel ? (piscando ? '#ffffff' : '#2e5dff') : f.cor;
      ctx.beginPath();
      ctx.arc(gx, gy - cima * 0.4, w, Math.PI, 0);
      ctx.lineTo(gx + w, gy + base);
      ctx.lineTo(gx + w * 0.66, gy + base * 0.62);
      ctx.lineTo(gx + w * 0.33, gy + base);
      ctx.lineTo(gx, gy + base * 0.62);
      ctx.lineTo(gx - w * 0.33, gy + base);
      ctx.lineTo(gx - w * 0.66, gy + base * 0.62);
      ctx.lineTo(gx - w, gy + base);
      ctx.closePath();
      ctx.fill();
      var olhoY = gy - cima * 0.35, olhoR = TILE * 0.09;
      var olhaX = f.dir.c * 1.2, olhaY = f.dir.l * 1.2;
      if (vulneravel) {
        ctx.fillStyle = piscando ? '#2e5dff' : '#ffb8b8';
        ctx.beginPath();
        ctx.arc(gx - olhoR, olhoY, olhoR * 0.6, 0, Math.PI * 2);
        ctx.arc(gx + olhoR, olhoY, olhoR * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(gx - w * 0.5, gy + base * 0.35);
        ctx.lineTo(gx + w * 0.5, gy + base * 0.35);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(gx - olhoR * 1.4 + olhaX, olhoY + olhaY, olhoR, 0, Math.PI * 2);
        ctx.arc(gx + olhoR * 1.4 + olhaX, olhoY + olhaY, olhoR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2438ff';
        ctx.beginPath();
        ctx.arc(gx - olhoR * 1.4 + olhaX * 2, olhoY + olhaY * 2, olhoR * 0.5, 0, Math.PI * 2);
        ctx.arc(gx + olhoR * 1.4 + olhaX * 2, olhoY + olhaY * 2, olhoR * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function desenharFruta() {
      if (!fruta || tempoJogo > fruta.someEm) return;
      var pisca = (fruta.someEm - tempoJogo < 2) && Math.floor(tempoJogo / 0.2) % 2 === 0;
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
          checarColisoes(ts);
        }
      }
      if (estado === 'morte') {
        morteProgresso = Math.min(1, (ts - morteInicio) / (duracaoMorte * 1000));
        desenhar(ts || 0);
        hud();
        if (morteProgresso >= 1) {
          if (vidas <= 0) {
            encerrar();
          } else {
            posarEntidades();
            estado = 'jogando';
            invencivelAte = tempoJogo + 1.2;
            setStatus('Cuidado! Restam ' + vidas + ' vidas.');
            iniciarMusica();
          }
        }
        rafId = window.requestAnimationFrame(laco);
        return;
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
      iniciarMusica();
      announce('Pac-Man iniciado. Coma todos os pontos e desvie dos fantasmas.');
      ultimoTs = 0;
      if (!rafId) rafId = window.requestAnimationFrame(laco);
      try { canvas.focus({ preventScroll: true }); } catch (err) { try { canvas.focus(); } catch (e2) {} }
    }

    function onSoundToggle() {
      if (!c || typeof c.setPref !== 'function' || typeof c.getState !== 'function') return;
      c.setPref('som', !c.getState().prefs.som);
      hud();
    }

    function onVisibilityChange() {
      if (document.hidden || (estado !== 'jogando' && estado !== 'morte')) {
        pausarMusica();
      } else if (estado === 'jogando') {
        iniciarMusica();
      }
    }

    function reiniciarTudo() {
      var intro = stage.querySelector('.game-intro');
      if (intro) intro.style.display = 'none';
      pontos = 0; vidas = 3; fase = 1; flutuantes = [];
      invencivelAte = 0;
      montarPellets(); posarEntidades();
      estado = 'jogando';
      setStatus('Novo jogo! Coma todos os pontos.');
      iniciarMusica();
      hud(); ultimoTs = 0;
      mostrarPausa(false);
      var pauseBtn = document.getElementById('pacman-pause');
      if (pauseBtn) pauseBtn.textContent = 'Pausar';
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
        if (estado === 'morte' || estado === 'fim') return;
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
      if (e.key === 'Escape') {
        var modal = document.getElementById('game-modal');
        if (modal && !modal.classList.contains('hidden')) return; // modal trata o ESC
        if (estado === 'jogando' || estado === 'pausa') { e.preventDefault(); alternarPausa(); }
      }
    }

    function overlayPausa() { return document.getElementById('pacman-pausa-overlay'); }

    function mostrarPausa(aberta) {
      var ov = overlayPausa();
      if (!ov) return;
      ov.classList.toggle('hidden', !aberta);
      if (aberta) {
        var cont = document.getElementById('pacman-continuar');
        if (cont) cont.focus();
      }
    }

    function alternarPausa() {
      var btn = document.getElementById('pacman-pause');
      if (estado === 'jogando') {
        estado = 'pausa';
        pausarMusica();
        setStatus('Jogo pausado. Continue, reinicie ou volte à biblioteca.');
        if (btn) btn.textContent = 'Continuar';
        mostrarPausa(true);
        announce('Jogo pausado.');
      } else if (estado === 'pausa') {
        estado = 'jogando';
        iniciarMusica();
        setStatus('Jogo retomado!');
        if (btn) btn.textContent = 'Pausar';
        mostrarPausa(false);
        ultimoTs = 0;
        announce('Jogo retomado.');
      }
    }

    function irParaBiblioteca() {
      mostrarPausa(false);
      var voltar = stage.querySelector('[data-back-to-menu]');
      if (voltar) voltar.click();
    }

    function definirDir(nome) {
      if (estado === 'morte' || estado === 'fim') return;
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
    soundEl.addEventListener('click', onSoundToggle);
    document.getElementById('pacman-pause').addEventListener('click', alternarPausa);
    document.getElementById('pacman-continuar').addEventListener('click', alternarPausa);
    document.getElementById('pacman-reiniciar2').addEventListener('click', reiniciarTudo);
    document.getElementById('pacman-biblioteca').addEventListener('click', irParaBiblioteca);
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibilityChange);

    reg.pacman = {
      stage: stage, ativo: true,
      cleanup: function () {
        this.ativo = false;
        if (rafId) { window.cancelAnimationFrame(rafId); rafId = null; }
        pararMusica();
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        soundEl.removeEventListener('click', onSoundToggle);
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
