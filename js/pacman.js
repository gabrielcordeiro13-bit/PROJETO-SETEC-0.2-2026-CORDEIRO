/* SETEC 2026 - Pac-Man recriado com mecânicas próprias (labirinto, pellets,
 * fantasmas, vidas, fases). Sem assets de terceiros. */
(function () {
  'use strict';

  var MAPA = [
    '#############',
    '#.....#.....#',
    '#o##..#..##o#',
    '#..#.....#..#',
    '##.#.###.#.##',
    '#.....#.....#',
    '#.###...###.#',
    '#...#...#...#',
    '###.#.#.#.###',
    '#.....#.....#',
    '#.###.#.###.#',
    '#o..#...#..o#',
    '#.#.#...#.#.#',
    '#.....#.....#',
    '#############'
  ];
  var ROWS = MAPA.length;
  var COLS = MAPA[0].length;
  var TILE = 32;
  var TURMA = '2° D.S';

  function core() { return window.SetecCore || null; }
  function announce(m) { var c = core(); if (c) c.announce(m); }

  function ehParede(r, c) {
    if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return true;
    return MAPA[r][c] === '#';
  }
  function podeAndar(r, c) { return !ehParede(r, c); }

  var DIRS = [
    { l: -1, c: 0 }, { l: 1, c: 0 }, { l: 0, c: -1 }, { l: 0, c: 1 }
  ];

  function criarUi(stage) {
    stage.innerHTML =
      '<div class="pacman-game">' +
      '<section class="game-intro" aria-label="Como jogar Pac-Man">' +
      '<h3>Como jogar</h3>' +
      '<ol>' +
      '<li><strong>Objetivo:</strong> coma todos os pontos do labirinto sem ser capturado pelos fantasmas.</li>' +
      '<li><strong>Teclado:</strong> setas ou WASD para mover. <kbd>P</kbd> pausa, <kbd>R</kbd> reinicia.</li>' +
      '<li><strong>Toque:</strong> use o direcional abaixo ou deslize o dedo sobre o labirinto.</li>' +
      '<li><strong>Energia:</strong> os 4 pontos grandes deixam os fantasmas vulneráveis por alguns segundos: coma-os para bônus!</li>' +
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
      '<canvas id="pacman-canvas" tabindex="0" width="' + (COLS * TILE) + '" height="' + (ROWS * TILE) + '" role="img" aria-label="Labirinto do Pac-Man da turma 2 D S. Use as setas ou as letras W A S D para mover."></canvas>' +
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

    var jogador = { l: 1, c: 1, dir: { l: 0, c: 1 }, prox: { l: 0, c: 1 } };
    var CASA = { l: 6, c: 6 };
    var fantasmas = [
      { l: 6, c: 5, cor: '#ff6b6b', dir: { l: 0, c: 1 }, vuln: false, base: { l: 6, c: 5 }, canto: { l: 1, c: 11 } },
      { l: 6, c: 7, cor: '#f9a826', dir: { l: 0, c: -1 }, vuln: false, base: { l: 6, c: 7 }, canto: { l: 1, c: 1 } },
      { l: 7, c: 6, cor: '#8ec5ff', dir: { l: -1, c: 0 }, vuln: false, base: { l: 7, c: 6 }, canto: { l: 13, c: 11 } }
    ];
    // Alternância perseguir/dispersar para os fantasmas percorrerem o mapa
    var MODO_FANTASMA = 'perseguir';
    var trocaModoAte = 0;

    var pontos = 0, vidas = 3, fase = 1;
    var estado = 'pronto'; // pronto | jogando | pausa | fim
    var energiaAte = 0;
    var rafId = null, ultimo = 0, acumulador = 0;
    var invencivelAte = 0;

    function velocidadeTick() { return Math.max(85, 135 - (fase - 1) * 10); }

    function modoAtualFantasmas() {
      var agora = performance.now();
      if (agora >= trocaModoAte) {
        MODO_FANTASMA = (MODO_FANTASMA === 'perseguir') ? 'dispersar' : 'perseguir';
        trocaModoAte = agora + (MODO_FANTASMA === 'perseguir' ? 7000 : 5000);
      }
      return MODO_FANTASMA;
    }

    function montarPellets() {
      pellets.clear(); powerSet.clear();
      for (var r = 0; r < ROWS; r += 1) {
        for (var cc = 0; cc < COLS; cc += 1) {
          var ch = MAPA[r][cc];
          if (ch === '.' || ch === 'o') {
            // Casa inicial do jogador começa vazia para não coletar parado
            if (r === 1 && cc === 1) continue;
            var chave = r + ',' + cc;
            pellets.add(chave);
            if (ch === 'o') powerSet.add(chave);
          }
        }
      }
      totalDaFase = pellets.size;
    }

    function hud() {
      scoreEl.textContent = String(pontos);
      livesEl.textContent = String(vidas);
      levelEl.textContent = String(fase);
      bestEl.textContent = String(c ? c.getBest('pacman') : 0);
      var comEnergia = performance.now() < energiaAte;
      powerEl.hidden = !comEnergia;
    }

    function setStatus(m) { statusEl.textContent = m; }

    function resetarPosicoes() {
      jogador.l = 1; jogador.c = 1;
      jogador.dir = { l: 0, c: 1 }; jogador.prox = { l: 0, c: 1 };
      fantasmas.forEach(function (f) {
        f.l = f.base.l; f.c = f.base.c; f.vuln = false;
        f.dir = { l: 0, c: 1 };
      });
      MODO_FANTASMA = 'perseguir';
      trocaModoAte = performance.now() + 7000;
      energiaAte = 0;
    }

    function comerSeHouver() {
      var chave = jogador.l + ',' + jogador.c;
      if (!pellets.has(chave)) return;
      var ehPower = powerSet.has(chave);
      pellets.delete(chave); powerSet.delete(chave);
      if (ehPower) {
        pontos += 25;
        energiaAte = performance.now() + 5000;
        fantasmas.forEach(function (f) { f.vuln = true; });
        setStatus('Energia! Fantasmas vulneráveis — coma-os!');
        announce('Modo energia ativado. Fantasmas vulneráveis.');
      } else {
        pontos += 10;
      }
      if (c && pontos >= 500) c.unlock('pacman-500');
      hud();
      if (pontos > (c ? c.getBest('pacman') : 0)) { if (c) c.setBest('pacman', pontos); hud(); }
      if (pellets.size === 0) concluirFase();
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
            montarPellets(); resetarPosicoes();
            estado = 'jogando';
            setStatus('Fase ' + fase + '. Boa sorte!');
            hud();
            ultimo = 0; acumulador = 0;
            if (!rafId) rafId = window.requestAnimationFrame(laco);
          },
          function () { estado = 'pronto'; setStatus('Fase concluída. Pressione Reiniciar para jogar de novo.'); }
        );
      }
    }

    function perderVida() {
      var agora = performance.now();
      if (agora < invencivelAte) return;
      vidas -= 1;
      hud();
      announce('Vida perdida. Restam ' + vidas + ' vidas.');
      if (vidas <= 0) {
        encerrar(false);
        return;
      }
      resetarPosicoes();
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

    function passoJogador() {
      var d = jogador.prox;
      if (podeAndar(jogador.l + d.l, jogador.c + d.c)) jogador.dir = { l: d.l, c: d.c };
      var nl = jogador.l + jogador.dir.l, nc = jogador.c + jogador.dir.c;
      if (!podeAndar(nl, nc)) return;
      jogador.l = nl; jogador.c = nc;
      comerSeHouver();
    }

    function alvoDoFantasma(f, idx) {
      var agora = performance.now();
      if (f.vuln || agora < energiaAte) return null; // fugindo: escolhe aleatório
      if (modoAtualFantasmas() === 'dispersar') return f.canto; // cada um patrulha um canto
      if (idx === 1) return { l: jogador.l + jogador.dir.l * 3, c: jogador.c + jogador.dir.c * 3 }; // emboscada à frente
      if (idx === 2) return { l: jogador.l + (jogador.l - fantasmas[0].l), c: jogador.c + (jogador.c - fantasmas[0].c) }; // flanco
      return { l: jogador.l, c: jogador.c }; // perseguição direta
    }

    function escolherDirecao(f, idx) {
      var opcoes = DIRS.filter(function (d) { return podeAndar(f.l + d.l, f.c + d.c); });
      if (opcoes.length === 0) return null;
      if (opcoes.length === 1) return opcoes[0];
      var reverso = { l: -f.dir.l, c: -f.dir.c };
      var semReverso = opcoes.filter(function (d) { return !(d.l === reverso.l && d.c === reverso.c); });
      // Em beco sem saída, permite reverter em vez de travar.
      var candidatas = semReverso.length > 0 ? semReverso : opcoes;
      var fugindo = f.vuln || performance.now() < energiaAte;
      // Fantasma vulnerável ou passeando: movimento aleatório (imprevisível, mas capturável)
      if (fugindo || Math.random() < 0.18) {
        return candidatas[Math.floor(Math.random() * candidatas.length)];
      }
      var alvo = alvoDoFantasma(f, idx);
      var melhor = candidatas[0], melhorDist = Infinity;
      candidatas.forEach(function (d) {
        var dist = Math.abs((f.l + d.l) - alvo.l) + Math.abs((f.c + d.c) - alvo.c);
        if (dist < melhorDist) { melhorDist = dist; melhor = d; }
      });
      return melhor;
    }

    function passoFantasmas() {
      fantasmas.forEach(function (f, idx) {
        var d = escolherDirecao(f, idx);
        if (!d) return;
        f.dir = d;
        var nl = f.l + d.l, nc = f.c + d.c;
        if (podeAndar(nl, nc)) { f.l = nl; f.c = nc; }
      });
    }

    function checarColisoes() {
      var atingido = false;
      fantasmas.forEach(function (f) {
        if (atingido) return;
        if (f.l !== jogador.l || f.c !== jogador.c) return;
        var comEnergia = performance.now() < energiaAte || f.vuln;
        if (comEnergia) {
          pontos += 150;
          f.l = f.base.l; f.c = f.base.c; f.vuln = false;
          setStatus('Fantasma capturado! +150 pontos.');
          announce('Fantasma capturado. Mais 150 pontos. Total: ' + pontos + '.');
          if (c) { c.unlock('pacman-fantasma'); if (pontos >= 500) c.unlock('pacman-500'); }
          hud();
        } else {
          atingido = true;
          perderVida();
        }
      });
      if (performance.now() >= energiaAte) fantasmas.forEach(function (f) { f.vuln = false; });
    }

    function desenhar(agora) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var r = 0; r < ROWS; r += 1) {
        for (var cc = 0; cc < COLS; cc += 1) {
          var x = cc * TILE, y = r * TILE;
          if (MAPA[r][cc] === '#') {
            ctx.fillStyle = '#123a75';
            ctx.fillRect(x, y, TILE, TILE);
            ctx.strokeStyle = 'rgba(33,212,255,.75)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
          } else {
            ctx.fillStyle = '#050b14';
            ctx.fillRect(x, y, TILE, TILE);
            if (pellets.has(r + ',' + cc)) {
              var power = powerSet.has(r + ',' + cc);
              var pulso = power && !window.SetecCore.prefersReducedMotion() ? 1 + Math.sin(agora / 220) * 0.25 : 1;
              ctx.fillStyle = power ? '#ffd429' : '#9fdcff';
              ctx.beginPath();
              ctx.arc(x + TILE / 2, y + TILE / 2, (power ? 6 : 3) * pulso, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
      // jogador (círculo amarelo com boca e sigla da turma)
      var cx = jogador.c * TILE + TILE / 2, cy = jogador.l * TILE + TILE / 2;
      var boca = window.SetecCore.prefersReducedMotion() ? 0.25 : 0.2 + Math.abs(Math.sin(agora / 130)) * 0.55;
      var ang = Math.atan2(jogador.dir.l, jogador.dir.c);
      var raio = TILE * 0.44;
      ctx.fillStyle = '#ffd429';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      if (estado === 'fim' && vidas <= 0) ctx.arc(cx, cy, raio, 0, Math.PI * 2);
      else ctx.arc(cx, cy, raio, ang + boca, ang - boca + Math.PI * 2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#050609';
      ctx.beginPath(); ctx.arc(cx - raio * 0.25, cy - raio * 0.35, raio * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold ' + Math.max(7, Math.floor(TILE * 0.24)) + 'px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(TURMA, cx, cy + raio * 0.35);
      // fantasmas (com a sigla da turma no corpo)
      fantasmas.forEach(function (f) {
        var gx = f.c * TILE + TILE / 2, gy = f.l * TILE + TILE / 2;
        var vulneravel = performance.now() < energiaAte || f.vuln;
        var w = TILE * 0.34, topo = TILE * 0.26, base = TILE * 0.34;
        ctx.fillStyle = vulneravel ? '#7dd3fc' : f.cor;
        ctx.beginPath();
        ctx.arc(gx, gy - topo * 0.4, w, Math.PI, 0);
        ctx.lineTo(gx + w, gy + base);
        ctx.lineTo(gx + w * 0.6, gy + base * 0.6);
        ctx.lineTo(gx + w * 0.2, gy + base);
        ctx.lineTo(gx - w * 0.2, gy + base * 0.6);
        ctx.lineTo(gx - w * 0.6, gy + base);
        ctx.lineTo(gx - w, gy + base);
        ctx.closePath(); ctx.fill();
        var olhoY = gy - topo * 0.35, olhoR = TILE * 0.075;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(gx - olhoR * 1.5, olhoY, olhoR, 0, Math.PI * 2);
        ctx.arc(gx + olhoR * 1.5, olhoY, olhoR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = vulneravel ? '#7dd3fc' : '#0b1525';
        ctx.beginPath();
        ctx.arc(gx - olhoR * 1.5, olhoY, olhoR * 0.45, 0, Math.PI * 2);
        ctx.arc(gx + olhoR * 1.5, olhoY, olhoR * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = vulneravel ? '#083344' : '#ffffff';
        ctx.font = 'bold ' + Math.max(6, Math.floor(TILE * 0.2)) + 'px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(TURMA, gx, gy + base * 0.45);
      });
    }

    function atualizar() {
      if (estado !== 'jogando') return;
      passoJogador();
      if (estado !== 'jogando') return; // pode ter concluído a fase
      passoFantasmas();
      checarColisoes();
    }

    function laco(ts) {
      if (estado === 'fim') { rafId = null; return; }
      if (!ultimo) ultimo = ts;
      var delta = Math.min(ts - ultimo, 500);
      ultimo = ts;
      if (estado === 'jogando') {
        acumulador += delta;
        var tick = velocidadeTick();
        var passos = 0;
        while (acumulador >= tick && passos < 4) { atualizar(); acumulador -= tick; passos += 1; }
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
      ultimo = 0; acumulador = 0;
      if (!rafId) rafId = window.requestAnimationFrame(laco);
      try { canvas.focus({ preventScroll: true }); } catch (err) { try { canvas.focus(); } catch (e2) {} }
    }

    function reiniciarTudo() {
      var intro = stage.querySelector('.game-intro');
      if (intro) intro.style.display = 'none';
      pontos = 0; vidas = 3; fase = 1;
      montarPellets(); resetarPosicoes();
      estado = 'jogando';
      setStatus('Novo jogo! Coma todos os pontos.');
      hud(); ultimo = 0; acumulador = 0;
      if (!rafId) rafId = window.requestAnimationFrame(laco);
    }

    var mapaTeclas = {
      ArrowUp: { l: -1, c: 0 }, ArrowDown: { l: 1, c: 0 },
      ArrowLeft: { l: 0, c: -1 }, ArrowRight: { l: 0, c: 1 },
      w: { l: -1, c: 0 }, s: { l: 1, c: 0 }, a: { l: 0, c: -1 }, d: { l: 0, c: 1 },
      W: { l: -1, c: 0 }, S: { l: 1, c: 0 }, A: { l: 0, c: -1 }, D: { l: 0, c: 1 }
    };

    function onKey(e) {
      if (!stage.closest('.screen.active')) return;
      if (mapaTeclas[e.key]) {
        e.preventDefault();
        jogador.prox = mapaTeclas[e.key];
        if (estado === 'pronto') iniciar();
        return;
      }
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); alternarPausa(); }
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); reiniciarTudo(); }
    }

    function alternarPausa() {
      if (estado === 'jogando') {
        estado = 'pausa';
        setStatus('Jogo pausado. Pressione P ou o botão Continuar.');
        document.getElementById('pacman-pause').textContent = 'Continuar';
        announce('Jogo pausado.');
      } else if (estado === 'pausa') {
        estado = 'jogando';
        setStatus('Jogo retomado!');
        document.getElementById('pacman-pause').textContent = 'Pausar';
        ultimo = 0;
        announce('Jogo retomado.');
      }
    }

    function definirDir(nome) {
      var mapa = {
        up: { l: -1, c: 0 }, down: { l: 1, c: 0 },
        left: { l: 0, c: -1 }, right: { l: 0, c: 1 }
      };
      if (mapa[nome]) {
        jogador.prox = mapa[nome];
        if (estado === 'pronto') iniciar();
      }
    }

    // Toque e mouse: direcional + deslize no canvas (com fallback e resposta visual)
    var botoes = stage.querySelectorAll('.pacman-control-btn');
    function marcarBotaoAtivo(botao) {
      botoes.forEach(function (b) { b.classList.remove('ativo'); });
      if (botao) botao.classList.add('ativo');
    }
    function onBtn(e) {
      if (e.cancelable) e.preventDefault();
      var botao = e.currentTarget;
      marcarBotaoAtivo(botao);
      definirDir(botao.getAttribute('data-dir'));
    }
    botoes.forEach(function (b) {
      b.addEventListener('pointerdown', onBtn);
      b.addEventListener('click', onBtn); // fallback: garante o toque/clique em qualquer navegador
      b.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          marcarBotaoAtivo(b);
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
      if (Math.abs(dx) > Math.abs(dy)) definirDir(dx > 0 ? 'right' : 'left');
      else definirDir(dy > 0 ? 'down' : 'up');
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

    montarPellets(); resetarPosicoes(); hud();
    desenhar(0);
    rafId = window.requestAnimationFrame(laco);
  }

  window.initPacmanGame = initPacmanGame;
})();
