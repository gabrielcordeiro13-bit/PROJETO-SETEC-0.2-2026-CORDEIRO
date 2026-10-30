// SETEC 2026 - Sistema de partículas e personagens das telas de jogo.
// Usa EXATAMENTE o mesmo visual/comportamento da tela de entrada (js/intro.js):
//  - partículas em <canvas> subindo de baixo para cima, com glow neon,
//    oscilação senoidal individual e pulso de brilho (mesmos parâmetros);
//  - fantasmas, pastilhas e peças em DOM com a animação CSS "intro-subir-fundo".
// Camada única por tela de jogo (indicada por data-screen), criada como filho
// absoluto atrás do conteúdo (z-index 0). Pausa quando a aba fica oculta e
// quando o usuário prefere movimento reduzido. Sem impacto na jogabilidade:
// pointer-events: none e desenho leve em rAF compartilhado.
(function () {
  'use strict';

  var CAPAS = {};            // data-screen -> capa ativa
  var VISIBILIDADE_PAUSA = false;

  function reduzido() {
    var c = window.SetecCore;
    if (c && typeof c.prefersReducedMotion === 'function') return c.prefersReducedMotion();
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function criarCanvas() {
    var canvas = document.createElement('canvas');
    canvas.className = 'setec-efeitos-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    return canvas;
  }

  function criarPersonagem(tagBase, variacao) {
    var span = document.createElement('span');
    span.className = tagBase + ' ' + variacao;
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  // Mesma paleta/formação da intro: 3 fantasmas, 2 pastilhas, 2 peças.
  function montarPersonagens(cap) {
    ['g1', 'g2', 'g3'].forEach(function (v) { cap.personagens.push(criarPersonagem('intro-ghost', v)); });
    ['p1', 'p2'].forEach(function (v) { cap.personagens.push(criarPersonagem('intro-pill', v)); });
    ['q1', 'q2'].forEach(function (v) { cap.personagens.push(criarPersonagem('intro-peca', v)); });
    cap.personagens.forEach(function (el) { cap.raiz.appendChild(el); });
  }

  function definirTamanho(cap) {
    if (!cap.canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cap.dpr = dpr;
    cap.canvas.width = Math.round(cap.raiz.clientWidth * dpr);
    cap.canvas.height = Math.round(cap.raiz.clientHeight * dpr);
  }

  // Mesmos parâmetros de criarParticulas() da intro.
  function criarParticulas(cap) {
    if (!cap.canvas) return;
    var n = Math.max(60, Math.min(120, Math.round(cap.raiz.clientWidth / 12)));
    cap.particulas = [];
    for (var i = 0; i < n; i += 1) {
      cap.particulas.push({
        x: Math.random() * cap.canvas.width,
        y: Math.random() * cap.canvas.height,
        r: (Math.random() * 2.4 + 0.9) * cap.dpr,
        vy: -(Math.random() * 0.55 + 0.15) * cap.dpr,
        fase: Math.random() * Math.PI * 2,
        freq: Math.random() * 0.9 + 0.3,
        amp: (Math.random() * 0.35 + 0.1) * cap.dpr,
        pulso: Math.random() * 0.9 + 0.4,
        a: Math.random() * 0.5 + 0.25,
        cor: Math.random() < 0.6 ? '103, 208, 255' : (Math.random() < 0.5 ? '143, 238, 197' : '255, 209, 102')
      });
    }
  }

  // Mesmo desenho da intro: halo suave + ponto central.
  function desenhar(cap) {
    var ctx = cap.ctx;
    var t = cap.tempo * 0.016;
    ctx.clearRect(0, 0, cap.canvas.width, cap.canvas.height);
    for (var i = 0; i < cap.particulas.length; i += 1) {
      var p = cap.particulas[i];
      p.y += p.vy;
      var osc = Math.sin(t * p.freq + p.fase) * p.amp;
      var raio = p.r * (0.85 + 0.15 * Math.sin(t * p.pulso + p.fase));
      if (p.y < -10 * cap.dpr) { p.y = cap.canvas.height + 10 * cap.dpr; p.x = Math.random() * cap.canvas.width; }
      ctx.beginPath();
      ctx.arc(p.x + osc, p.y, raio * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.cor + ',' + (p.a * 0.12).toFixed(3) + ')';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x + osc, p.y, raio, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.cor + ',' + p.a + ')';
      ctx.fill();
    }
    cap.tempo += 1;
  }

  // Um único rAF global alimenta todas as capas ativas (economia de recursos).
  function lacoGlobal() {
    rafGlobal = null;
    var algumaVisivel = false;
    Object.keys(CAPAS).forEach(function (key) {
      var cap = CAPAS[key];
      if (!cap.ativa) return;
      if (document.hidden || VISIBILIDADE_PAUSA) {
        algumaVisivel = true; // continua agendando; desenho é pulado abaixo
        return;
      }
      algumaVisivel = true;
      desenhar(cap);
    });
    if (algumaVisivel) rafGlobal = window.requestAnimationFrame(lacoGlobal);
  }

  var rafGlobal = null;

  function garantirLaco() {
    if (rafGlobal === null && !VISIBILIDADE_PAUSA) {
      rafGlobal = window.requestAnimationFrame(lacoGlobal);
    }
  }

  document.addEventListener('visibilitychange', function () {
    VISIBILIDADE_PAUSA = document.hidden;
    if (!document.hidden) garantirLaco();
  });

  function iniciarCapa(key) {
    var tela = document.querySelector('[data-screen="' + key + '"]');
    if (!tela) return null;
    var existente = CAPAS[key];
    if (existente) {
      existente.ativa = true;
      garantirLaco();
      return existente;
    }
    var raiz = tela.querySelector('.setec-efeitos-fundo');
    if (!raiz) {
      raiz = document.createElement('div');
      raiz.className = 'setec-efeitos-fundo';
      raiz.setAttribute('aria-hidden', 'true');
      // Insere como primeiro filho: o CSS garante conteúdo em z-index 1 acima.
      tela.insertBefore(raiz, tela.firstChild);
    }
    var cap = {
      raiz: raiz,
      ativa: true,
      tempo: 0,
      dpr: 1,
      particulas: [],
      personagens: [],
      canvas: null,
      ctx: null
    };
    if (!reduzido()) {
      cap.canvas = criarCanvas();
      raiz.insertBefore(cap.canvas, raiz.firstChild);
      cap.ctx = cap.canvas.getContext('2d');
    }
    montarPersonagens(cap);
    CAPAS[key] = cap;
    definirTamanho(cap);
    if (cap.canvas) criarParticulas(cap);
    garantirLaco();
    return cap;
  }

  function pararCapa(key) {
    var cap = CAPAS[key];
    if (cap) cap.ativa = false;
  }

  function redimensionar() {
    Object.keys(CAPAS).forEach(function (key) {
      var cap = CAPAS[key];
      if (!cap.ativa || !cap.canvas) return;
      definirTamanho(cap);
      criarParticulas(cap);
    });
  }
  window.addEventListener('resize', redimensionar);

  // API pública usada pelo main.js.
  window.SetecEfeitos = {
    /** Ativa o fundo animado na tela de jogo informada (data-screen). */
    ativar: function (key) {
      try { iniciarCapa(key); } catch (e) { /* nunca impacta o jogo */ }
    },
    /** Suspende o fundo da tela informada (conteúdo DOM permanece, sem custo). */
    pausar: function (key) {
      try { pararCapa(key); } catch (e) { }
    }
  };
})();
