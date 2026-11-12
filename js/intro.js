// SETEC 2026 - Tela de entrada cinematográfica.
// Partículas em canvas e transição suave para o portal (sem parallax de mouse).
// Não altera os jogos: apenas controla a camada #intro-overlay antes do menu.
(function () {
  'use strict';

  var overlay = document.getElementById('intro-overlay');
  if (!overlay) return;

  var canvas = document.getElementById('intro-canvas');
  var ctx = canvas ? canvas.getContext('2d') : null;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var particulas = [];
  var rafId = null;
  var rodando = false;
  var ultimoTimestamp = null;

  function reduzido() {
    var c = window.SetecCore;
    if (c && typeof c.prefersReducedMotion === 'function') return c.prefersReducedMotion();
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function redimensionar() {
    if (!canvas || !ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  }

  function criarParticulas() {
    if (!ctx) return;
    var n = Math.max(60, Math.min(120, Math.round(window.innerWidth / 12)));
    particulas = [];
    for (var i = 0; i < n; i += 1) {
      particulas.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: (Math.random() * 2.4 + 0.9) * dpr,
        vy: -(Math.random() * 0.55 + 0.15) * dpr,
        a: Math.random() * 0.5 + 0.25,
        cor: Math.random() < 0.6 ? '103, 208, 255' : (Math.random() < 0.5 ? '143, 238, 197' : '255, 209, 102')
      });
    }
  }

  function desenhar(timestamp) {
    if (!ctx || !rodando) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var delta = ultimoTimestamp === null ? 1 / 60 : Math.min(Math.max((timestamp - ultimoTimestamp) / 1000, 0), 0.05);
    ultimoTimestamp = timestamp;
    for (var i = 0; i < particulas.length; i += 1) {
      var p = particulas[i];
      p.y += p.vy * delta * 60;
      if (p.y < -10 * dpr) { p.y = canvas.height + 10 * dpr; p.x = Math.random() * canvas.width; }
      var fadeRange = 36 * dpr;
      var edgeOpacity = Math.max(0, Math.min(1, p.y / fadeRange, (canvas.height - p.y) / fadeRange));
      var alpha = p.a * edgeOpacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.cor + ',' + (alpha * 0.12).toFixed(3) + ')';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.cor + ',' + alpha.toFixed(3) + ')';
      ctx.fill();
    }
    rafId = window.requestAnimationFrame(desenhar);
  }

  function iniciarCanvas() {
    if (!canvas || !ctx || rodando || reduzido()) return;
    rodando = true;
    ultimoTimestamp = null;
    redimensionar();
    criarParticulas();
    rafId = window.requestAnimationFrame(desenhar);
  }

  function pararCanvas() {
    rodando = false;
    ultimoTimestamp = null;
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // Sem parallax/mouse-tracking: as camadas decorativas e as logos flutuam
  // sozinhas via CSS — independem da posição do cursor.

  function fechar(acao) {
    if (!overlay || overlay.classList.contains('saindo')) return;
    pararCanvas();
    window.removeEventListener('resize', onResize);
    overlay.classList.add('saindo');
    overlay.setAttribute('aria-hidden', 'true');
    window.setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (acao === 'pacman' && typeof window.showScreen === 'function') {
        window.showScreen('pacman');
      } else {
        window.scrollTo(0, 0);
      }
    }, 450);
  }

  function onResize() {
    redimensionar();
    criarParticulas();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var entrar = document.getElementById('intro-entrar');
    var jogar = document.getElementById('intro-jogar-agora');


    if (entrar) entrar.addEventListener('click', function () { fechar(); });
    if (jogar) jogar.addEventListener('click', function () { fechar('pacman'); });

    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === 'Escape') && overlay && !overlay.classList.contains('saindo')) {
        var tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'BUTTON') return; // deixa o botão tratar
        fechar();
      }
    });

    if (reduzido()) return;

    window.addEventListener('resize', onResize);

    var primeiro = document.getElementById('intro-entrar');
    if (primeiro) primeiro.focus({ preventScroll: true });

    iniciarCanvas();
  });

  // Exposto para a tela de entrada transicionar direto a um jogo após a intro.
})();
