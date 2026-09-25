// SETEC 2026 - Navegação do portal, modal acessível e painel de acessibilidade.
(function () {
  'use strict';

  function core() { return window.SetecCore || null; }

  var screens, modal, modalTitle, modalMessage, modalActionButton, modalCancelButton;
  var loadingOverlay, a11yPanel, a11yToggle;
  var currentConfirm = null;
  var currentCancel = null;
  var lastFocus = null;
  var navBound = false;

  var gameDefinitions = [
    { key: 'block-wood', init: 'initBlockWoodGame' },
    { key: 'pacman', init: 'initPacmanGame' },
    { key: 'hangman', init: 'initHangmanGame' }
  ];

  function cleanupGame(key) {
    var r = window.__gameRuntimeRegistry && window.__gameRuntimeRegistry[key];
    if (r && typeof r.cleanup === 'function') {
      try { r.cleanup(); } catch (e) {}
    }
  }
  function cleanupAll() { gameDefinitions.forEach(function (d) { cleanupGame(d.key); }); }

  function showLoading() {
    if (!loadingOverlay) return;
    loadingOverlay.classList.remove('hidden');
    loadingOverlay.setAttribute('aria-hidden', 'false');
  }
  function hideLoading() {
    if (!loadingOverlay) return;
    loadingOverlay.classList.add('hidden');
    loadingOverlay.setAttribute('aria-hidden', 'true');
  }

  function showScreen(name, opts) {
    opts = opts || {};
    if (screens) {
      screens.forEach(function (s) {
        s.classList.toggle('active', s.dataset.screen === name);
      });
    }
    if (name === 'menu') {
      cleanupAll();
      hideLoading();
      if (opts.anchor) {
        var target = document.querySelector(opts.anchor);
        if (target) {
          window.setTimeout(function () {
            target.scrollIntoView({ behavior: 'auto', block: 'start' });
            if (!opts.keepFocus) {
              target.setAttribute('tabindex', '-1');
              target.focus({ preventScroll: true });
            }
          }, 30);
        }
      } else if (!opts.keepFocus) {
        window.scrollTo(0, 0);
      }
      return;
    }
    gameDefinitions.forEach(function (d) { if (d.key !== name) cleanupGame(d.key); });
    showLoading();
    window.requestAnimationFrame(function () {
      var def = null;
      for (var i = 0; i < gameDefinitions.length; i += 1) {
        if (gameDefinitions[i].key === name) { def = gameDefinitions[i]; break; }
      }
      if (def && typeof window[def.init] === 'function') {
        try { window[def.init](); } catch (e) { /* não quebra a navegação */ }
      }
      window.requestAnimationFrame(function () { hideLoading(); });
      var heading = document.querySelector('[data-screen="' + name + '"] h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
      var scr = document.querySelector('[data-screen="' + name + '"]');
      if (scr) scr.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
  }

  // Modal: o callback de confirmação SÓ roda no botão principal.
  // Fechar pelo X, overlay ou Esc apenas dispensa (roda onCancel, sem reiniciar jogo).
  function openModal(title, message, actionText, onConfirm, onCancel) {
    if (!modal) return;
    lastFocus = document.activeElement;
    modalTitle.textContent = String(title);
    modalMessage.textContent = String(message);
    modalActionButton.textContent = String(actionText || 'Continuar');
    currentConfirm = (typeof onConfirm === 'function') ? onConfirm : null;
    currentCancel = (typeof onCancel === 'function') ? onCancel : null;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    modalActionButton.focus();
  }
  function closeModal(confirmed) {
    if (!modal || modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    var cb = confirmed ? currentConfirm : currentCancel;
    currentConfirm = null; currentCancel = null;
    if (lastFocus && typeof lastFocus.focus === 'function') {
      try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
    }
    if (typeof cb === 'function') {
      window.setTimeout(cb, 0);
    }
  }

  function bindA11y() {
    if (!a11yPanel || !a11yToggle) return;
    function setOpen(open) {
      a11yPanel.classList.toggle('hidden', !open);
      a11yPanel.setAttribute('aria-hidden', String(!open));
      a11yToggle.setAttribute('aria-expanded', String(open));
      if (open) {
        var first = a11yPanel.querySelector('button');
        if (first) first.focus();
      }
    }
    a11yToggle.addEventListener('click', function () {
      setOpen(a11yPanel.classList.contains('hidden'));
    });
    document.getElementById('a11y-fechar').addEventListener('click', function () {
      setOpen(false);
      a11yToggle.focus();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !a11yPanel.classList.contains('hidden')) {
        setOpen(false);
        a11yToggle.focus();
      }
    });

    var c = core();
    document.querySelectorAll('[data-a11y-fonte]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (c) { c.setPref('fonte', b.getAttribute('data-a11y-fonte')); }
      });
    });
    document.getElementById('a11y-contraste').addEventListener('click', function () {
      if (!c) return;
      c.setPref('contraste', !c.getState().prefs.contraste);
    });
    document.getElementById('a11y-foco').addEventListener('click', function () {
      if (!c) return;
      c.setPref('foco', !c.getState().prefs.foco);
    });
    ['reduzido', 'completo', 'auto'].forEach(function (modo) {
      var id = modo === 'reduzido' ? 'a11y-mov-reduzido' : modo === 'completo' ? 'a11y-mov-completo' : 'a11y-mov-auto';
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', function () { if (c) c.setPref('movimento', modo); });
    });
    document.getElementById('a11y-limpar').addEventListener('click', function () {
      if (c) c.clear();
    });
  }

  function bindNav() {
    if (navBound) return;
    document.querySelectorAll('[data-open-game]').forEach(function (btn) {
      btn.addEventListener('click', function () { showScreen(btn.dataset.openGame); });
    });
    document.querySelectorAll('[data-nav-menu]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href');
        if (href && href.charAt(0) === '#') {
          e.preventDefault();
          showScreen('menu', { anchor: href });
          try { window.history.replaceState(null, '', href); } catch (err) {}
        }
      });
    });
    document.querySelectorAll('[data-back-to-menu]').forEach(function (btn) {
      btn.addEventListener('click', function () { showScreen('menu'); });
    });
    document.getElementById('limpar-dados-rodape').addEventListener('click', function () {
      var c = core();
      if (c) c.clear();
    });
    modalActionButton.addEventListener('click', function () { closeModal(true); });
    modalCancelButton.addEventListener('click', function () { closeModal(false); });
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal(false);
    });
    // Foco trap simples no modal
    modal.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusables = [modalCancelButton, modalActionButton];
      var idx = focusables.indexOf(document.activeElement);
      if (e.shiftKey && (idx <= 0)) { e.preventDefault(); modalActionButton.focus(); }
      else if (!e.shiftKey && idx === focusables.length - 1) { e.preventDefault(); modalCancelButton.focus(); }
    });
    navBound = true;
  }

  window.portalModal = { open: openModal, close: function () { closeModal(false); } };

  document.addEventListener('DOMContentLoaded', function () {
    screens = document.querySelectorAll('[data-screen]');
    modal = document.getElementById('game-modal');
    modalTitle = document.getElementById('modal-title');
    modalMessage = document.getElementById('modal-message');
    modalActionButton = document.getElementById('modal-action-button');
    modalCancelButton = document.getElementById('modal-cancel-button');
    loadingOverlay = document.getElementById('loading-overlay');
    a11yPanel = document.getElementById('painel-acessibilidade');
    a11yToggle = document.getElementById('botao-acessibilidade');
    bindNav();
    bindA11y();
    var c = core();
    if (c) { c.applyPrefs(); c.renderRecords(); c.renderAchievements(); }
    showScreen('menu', { keepFocus: true });
  });
})();
