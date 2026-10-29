// SETEC 2026 - Tela de entrada cinematográfica.
// Partículas em canvas, parallax leve ao cursor e transição suave para o portal.
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
  var mouse = { x: 0.5, y: 0.5 };

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
    var n = Math.max(28, Math.min(70, Math.round(window.innerWidth / 22)));
    particulas = [];
    for (var i = 0; i < n; i += 1) {
      particulas.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: (Math.random() * 1.8 + 0.7) * dpr,
        vy: -(Math.random() * 0.25 + 0.06) * dpr,
        vx: (Math.random() - 0.5) * 0.12 * dpr,
        a: Math.random() * 0.45 + 0.12,
        cor: Math.random() < 0.6 ? '103, 208, 255' : (Math.random() < 0.5 ? '143, 238, 197' : '255, 209, 102')
      });
    }
  }

  function desenhar() {
    if (!ctx || !rodando) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < particulas.length; i += 1) {
      var p = particulas[i];
      p.x += p.vx; p.y += p.vy;
      if (p.y < -8 * dpr) { p.y = canvas.height + 8 * dpr; p.x = Math.random() * canvas.width; }
      if (p.x < -8 * dpr) p.x = canvas.width + 8 * dpr;
      if (p.x > canvas.width + 8 * dpr) p.x = -8 * dpr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.cor + ',' + p.a + ')';
      ctx.fill();
    }
    rafId = window.requestAnimationFrame(desenhar);
  }

  function iniciarCanvas() {
    if (!canvas || !ctx || rodando || reduzido()) return;
    rodando = true;
    redimensionar();
    criarParticulas();
    rafId = window.requestAnimationFrame(desenhar);
  }

  function pararCanvas() {
    rodando = false;
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // Parallax leve: camadas com data-parallax deslocam conforme o cursor.
  var camadas = Array.prototype.slice.call(overlay.querySelectorAll('[data-parallax]'));

  function aplicarParallax() {
    for (var i = 0; i < camadas.length; i += 1) {
      var el = camadas[i];
      var fator = parseFloat(el.getAttribute('data-parallax')) || 0;
      var dx = (mouse.x - 0.5) * fator;
      var dy = (mouse.y - 0.5) * fator;
      el.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
    }
  }

  function onMouseMove(e) {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = e.clientY / window.innerHeight;
    aplicarParallax();
  }

  function fechar(acao) {
    if (!overlay || overlay.classList.contains('saindo')) return;
    pararCanvas();
    window.removeEventListener('mousemove', onMouseMove);
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
    }, 620);
  }

  function onResize() {
    redimensionar();
    criarParticulas();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var entrar = document.getElementById('intro-entrar');
    var jogar = document.getElementById('intro-jogar-agora');
    var pular = document.getElementById('intro-pular');

    if (entrar) entrar.addEventListener('click', function () { fechar(); });
    if (pular) pular.addEventListener('click', function () { fechar(); });
    if (jogar) jogar.addEventListener('click', function () { fechar('pacman'); });

    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === 'Escape') && overlay && !overlay.classList.contains('saindo')) {
        var tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'BUTTON') return; // deixa o botão tratar
        fechar();
      }
    });

    if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduzido()) {
      overlay.classList.add('mouse-ativo');
      window.addEventListener('mousemove', onMouseMove, { passive: true });
    }

    window.addEventListener('resize', onResize);

    var primeiro = document.getElementById('intro-entrar');
    if (primeiro) primeiro.focus({ preventScroll: true });

    iniciarCanvas();
  });

  // Exposto para a tela de entrada transicionar direto a um jogo após a intro.
})();
