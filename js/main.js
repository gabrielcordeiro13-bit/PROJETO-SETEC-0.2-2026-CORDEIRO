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

  let currentModalAction = null;
  let navigationBound = false;
  let gameModulesInitialized = false;

  function showScreen(screenName) {
    screens.forEach((screen) => {
      const isActive = screen.dataset.screen === screenName;
      screen.classList.toggle('active', isActive);
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
      currentModalAction();
      currentModalAction = null;
    }
  }

  function initializeGameModules() {
    if (gameModulesInitialized) {
      return;
    }

    if (typeof window.initBlockWoodGame === 'function') {
      window.initBlockWoodGame();
    }

    if (typeof window.initPacmanGame === 'function') {
      window.initPacmanGame();
    }

    if (typeof window.initHangmanGame === 'function') {
      window.initHangmanGame();
    }

    gameModulesInitialized = true;
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
    initializeGameModules();
  });
})();
