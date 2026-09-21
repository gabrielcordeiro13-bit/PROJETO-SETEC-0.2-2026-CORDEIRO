// Controle da navegação do portal.
// Cada tela é alternada por classes CSS sem recarregar a página.

(function () {
  const screens = document.querySelectorAll('[data-screen]');
  const menuTriggerButtons = document.querySelectorAll('[data-open-game]');
  const backButtons = document.querySelectorAll('[data-back-to-menu]');
  const modal = document.getElementById('game-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalActionButton = document.getElementById('modal-action-button');
  const loadingOverlay = document.getElementById('loading-overlay');

  let currentModalAction = null;
  let navigationBound = false;
  let navigationRequest = 0;

  const gameDefinitions = [
    { key: 'block-wood', init: 'initBlockWoodGame' },
    { key: 'pacman', init: 'initPacmanGame' },
    { key: 'hangman', init: 'initHangmanGame' },
  ];

  function cleanupGameRuntime(key) {
    const runtime = window.__gameRuntimeRegistry && window.__gameRuntimeRegistry[key];
    if (runtime && typeof runtime.cleanup === 'function') {
      runtime.cleanup();
    }
  }

  function cleanupAllGames() {
    gameDefinitions.forEach((definition) => cleanupGameRuntime(definition.key));
  }

  function ensureGameVisible(key) {
    const definition = gameDefinitions.find((item) => item.key === key);
    if (!definition) {
      return;
    }

    if (typeof window[definition.init] === 'function') {
      window[definition.init]();
    }
  }

  function showLoading() {
    if (!loadingOverlay) {
      return;
    }

    loadingOverlay.classList.remove('hidden');
    loadingOverlay.setAttribute('aria-hidden', 'false');
  }

  function hideLoading() {
    if (!loadingOverlay) {
      return;
    }

    loadingOverlay.classList.add('hidden');
    loadingOverlay.setAttribute('aria-hidden', 'true');
  }

  function showScreen(screenName) {
    navigationRequest += 1;
    const requestId = navigationRequest;

    screens.forEach((screen) => {
      const isActive = screen.dataset.screen === screenName;
      screen.classList.toggle('active', isActive);
    });

    if (screenName === 'menu') {
      cleanupAllGames();
      hideLoading();
      return;
    }

    gameDefinitions.forEach((definition) => {
      if (definition.key !== screenName) {
        cleanupGameRuntime(definition.key);
      }
    });

    showLoading();
    window.requestAnimationFrame(() => {
      if (requestId !== navigationRequest) {
        return;
      }

      ensureGameVisible(screenName);
      window.requestAnimationFrame(() => {
        if (requestId === navigationRequest) {
          hideLoading();
        }
      });
    });
  }

  function openModal(title, message, actionText, actionCallback) {
    if (!modal || !modalTitle || !modalMessage || !modalActionButton) {
      return;
    }

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalActionButton.textContent = actionText;
    currentModalAction = actionCallback || null;

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    modalActionButton.focus();
  }

  function closeModal() {
    if (!modal) {
      return;
    }

    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');

    if (modalActionButton) {
      modalActionButton.blur();
    }

    if (typeof currentModalAction === 'function') {
      const callback = currentModalAction;
      currentModalAction = null;
      callback();
    }
  }

  window.portalModal = {
    open: openModal,
    close: closeModal,
  };

  function bindNavigation() {
    if (navigationBound) {
      return;
    }

    menuTriggerButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.dataset.openGame;
        showScreen(target);
      });
    });

    document.querySelectorAll('.main-nav a, .hero-actions a').forEach((link) => {
      link.addEventListener('click', () => {
        if (link.getAttribute('href')?.startsWith('#')) {
          showScreen('menu');
        }
      });
    });

    backButtons.forEach((button) => {
      button.addEventListener('click', () => {
        showScreen('menu');
      });
    });

    modalActionButton.addEventListener('click', () => {
      closeModal();
    });

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });

    navigationBound = true;
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindNavigation();
    showScreen('menu');
  });
})();
