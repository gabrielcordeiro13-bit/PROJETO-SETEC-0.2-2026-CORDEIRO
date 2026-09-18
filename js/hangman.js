(function () {
  const WORDS = [
    { word: 'HTML', hint: 'Linguagem de marcação usada para estruturar páginas web.' },
    { word: 'CSS', hint: 'Tecnologia que controla estilo, layout e aparência visual.' },
    { word: 'JAVASCRIPT', hint: 'Linguagem de programação que torna páginas interativas.' },
    { word: 'ALGORITMO', hint: 'Sequência lógica de passos para resolver um problema.' },
    { word: 'VARIAVEL', hint: 'Armazena valores em um programa.' },
    { word: 'FUNCAO', hint: 'Bloco reutilizável de código para executar uma tarefa.' },
    { word: 'ARRAY', hint: 'Estrutura que guarda vários valores em uma lista.' },
    { word: 'OBJETO', hint: 'Estrutura que pode conter dados e comportamentos.' },
    { word: 'NAVEGADOR', hint: 'Software usado para abrir páginas da internet.' },
    { word: 'SERVIDOR', hint: 'Computador que entrega dados e serviços para outros dispositivos.' },
    { word: 'PROGRAMA', hint: 'Conjunto de instruções que executa uma tarefa.' },
    { word: 'BANCO', hint: 'Sistema que armazena dados de forma organizada.' },
    { word: 'COMPUTADOR', hint: 'Máquina que processa informações e executa programas.' },
    { word: 'INTERNET', hint: 'Rede mundial de computadores interconectados.' },
    { word: 'SOFTWARE', hint: 'Parte lógica do computador, como programas e aplicativos.' },
    { word: 'HARDWARE', hint: 'Parte física de um computador.' },
    { word: 'TECLADO', hint: 'Dispositivo usado para digitar instruções e textos.' },
    { word: 'MOUSE', hint: 'Dispositivo apontador usado em computadores.' },
    { word: 'BROWSER', hint: 'Termo em inglês para navegador.' },
    { word: 'DOM', hint: 'Modelo de objetos da página usado pelo JavaScript.' },
    { word: 'LOOP', hint: 'Estrutura que repete instruções várias vezes.' },
    { word: 'STRING', hint: 'Tipo de dado usado para representar texto.' },
    { word: 'BOOLEAN', hint: 'Tipo de dado que assume verdadeiro ou falso.' },
    { word: 'APLICATIVO', hint: 'Programa preparado para uma tarefa específica.' },
    { word: 'BACKEND', hint: 'Parte do sistema que trata lógica e dados no servidor.' },
    { word: 'FRONTEND', hint: 'Parte do sistema que o usuário vê e usa.' },
    { word: 'DESENVOLVIMENTO', hint: 'Processo de criação de software e sistemas.' },
  ];

  function createHangmanUi(stage) {
    stage.innerHTML = `
      <div class="hangman-game">
        <div class="hangman-topbar">
          <div class="stat-box">Erros: <span id="hangman-errors">0</span>/6</div>
          <button type="button" class="primary-button" id="hangman-reset">Reiniciar</button>
        </div>

        <div class="hangman-area">
          <div class="hangman-canvas-wrap">
            <canvas id="hangman-canvas" width="240" height="240" aria-label="Forca do jogo da forca"></canvas>
          </div>

          <div class="hangman-panel">
            <div class="word-display" id="word-display" aria-live="polite"></div>
            <div class="hint-box" id="hint-box"></div>
            <div class="keyboard" id="keyboard" aria-label="Teclado virtual"></div>
          </div>
        </div>
      </div>
    `;
  }

  function initHangmanGame() {
    const stage = document.querySelector('[data-screen="hangman"] .game-stage');
    if (!stage) {
      return;
    }

    if (window.__hangmanRuntime && window.__hangmanRuntime.stage === stage) {
      return;
    }

    if (window.__hangmanRuntime && typeof window.__hangmanRuntime.cleanup === 'function') {
      window.__hangmanRuntime.cleanup();
    }

    createHangmanUi(stage);

    const canvas = document.getElementById('hangman-canvas');
    const context = canvas.getContext('2d');
    const wordDisplay = document.getElementById('word-display');
    const keyboard = document.getElementById('keyboard');
    const hintBox = document.getElementById('hint-box');
    const errorCounter = document.getElementById('hangman-errors');

    let selectedWord = '';
    let hint = '';
    let guessedLetters = [];
    let mistakes = 0;
    let finished = false;

    const runtime = {
      stage,
      cleanup() {
        if (typeof window.__hangmanKeyHandler === 'function') {
          document.removeEventListener('keydown', window.__hangmanKeyHandler);
          window.__hangmanKeyHandler = null;
        }
      },
    };

    window.__hangmanRuntime = runtime;

    function chooseRandomWord() {
      const item = WORDS[Math.floor(Math.random() * WORDS.length)];
      selectedWord = item.word.toUpperCase();
      hint = item.hint;
    }

    function renderWord() {
      wordDisplay.innerHTML = '';
      const letters = selectedWord.split('');

      letters.forEach((letter) => {
        const cell = document.createElement('span');
        cell.className = 'word-letter';
        cell.textContent = guessedLetters.includes(letter) ? letter : '_';
        wordDisplay.appendChild(cell);
      });
    }

    function renderKeyboard() {
      keyboard.innerHTML = '';
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

      alphabet.forEach((letter) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'key-button';
        button.textContent = letter;
        const used = guessedLetters.includes(letter);
        button.disabled = used || finished;

        if (used) {
          button.classList.add('used');
        }

        button.addEventListener('click', () => {
          if (!used && !finished) {
            evaluateLetter(letter);
          }
        });
        keyboard.appendChild(button);
      });
    }

    function drawHangman() {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = '#8ff0d4';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(30, 210);
      context.lineTo(190, 210);
      context.moveTo(60, 210);
      context.lineTo(60, 30);
      context.lineTo(150, 30);
      context.lineTo(150, 55);
      context.stroke();

      const parts = [
        () => {
          context.beginPath();
          context.arc(150, 75, 20, 0, Math.PI * 2);
          context.stroke();
        },
        () => {
          context.beginPath();
          context.moveTo(150, 95);
          context.lineTo(150, 150);
          context.stroke();
        },
        () => {
          context.beginPath();
          context.moveTo(150, 110);
          context.lineTo(120, 128);
          context.stroke();
        },
        () => {
          context.beginPath();
          context.moveTo(150, 110);
          context.lineTo(180, 128);
          context.stroke();
        },
        () => {
          context.beginPath();
          context.moveTo(150, 150);
          context.lineTo(125, 185);
          context.stroke();
        },
        () => {
          context.beginPath();
          context.moveTo(150, 150);
          context.lineTo(175, 185);
          context.stroke();
        },
      ];

      for (let index = 0; index < mistakes; index += 1) {
        parts[index]?.();
      }
    }

    function revealResult(isWin) {
      finished = true;
      const title = isWin ? 'Parabéns!' : 'Você perdeu';
      const message = isWin
        ? `Você acertou a palavra: ${selectedWord}.`
        : `A palavra era: ${selectedWord}. Dica: ${hint}`;

      if (typeof window.portalModal?.open === 'function') {
        window.portalModal.open(title, message, 'Jogar Novamente', () => {
          resetGame();
        });
      }
    }

    function evaluateLetter(letter) {
      if (finished || guessedLetters.includes(letter)) {
        return;
      }

      guessedLetters.push(letter);

      if (selectedWord.includes(letter)) {
        renderWord();
        renderKeyboard();

        const hasWon = selectedWord.split('').every((char) => guessedLetters.includes(char));
        if (hasWon) {
          revealResult(true);
        }
      } else {
        mistakes += 1;
        errorCounter.textContent = String(mistakes);
        drawHangman();
        renderKeyboard();

        if (mistakes >= 6) {
          revealResult(false);
          renderWord();
        }
      }
    }

    function resetGame() {
      chooseRandomWord();
      guessedLetters = [];
      mistakes = 0;
      finished = false;
      errorCounter.textContent = '0';
      hintBox.textContent = `Dica: ${hint}`;
      renderWord();
      renderKeyboard();
      drawHangman();
    }

    const handleKeyDown = (event) => {
      if (finished) {
        return;
      }

      if (event.repeat) {
        return;
      }

      const key = event.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        evaluateLetter(key);
      }
    };

    window.__hangmanKeyHandler = handleKeyDown;
    document.addEventListener('keydown', handleKeyDown);

    runtime.cleanup = () => {
      if (window.__hangmanKeyHandler) {
        document.removeEventListener('keydown', window.__hangmanKeyHandler);
        window.__hangmanKeyHandler = null;
      }
    };

    const resetButton = document.getElementById('hangman-reset');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        resetGame();
      });
    }

    resetGame();
  }

  window.initHangmanGame = initHangmanGame;
})();
