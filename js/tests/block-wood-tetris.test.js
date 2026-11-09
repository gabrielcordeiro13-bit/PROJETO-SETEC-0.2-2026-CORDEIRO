const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadBlockWoodModule() {
  const source = fs.readFileSync(path.join(__dirname, '../js/block-wood.js'), 'utf8');
  const context = {
    window: {},
    document: {
      createElement: () => ({
        style: {},
        className: '',
        setAttribute() {},
        appendChild() {},
        addEventListener() {},
        removeEventListener() {},
        querySelector() { return null; },
        getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
        focus() {},
        innerHTML: '',
        textContent: ''
      })
    },
    console,
    setTimeout,
    clearTimeout,
    performance: { now: () => Date.now() }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.window;
}

function createBlockWoodRuntime() {
  const elements = new Map();
  const documentListeners = new Map();
  const windowListeners = new Map();
  const animationFrames = new Map();
  const timers = new Map();
  let nextFrameId = 0;
  let nextTimerId = 0;

  function createElement(tagName) {
    const classes = new Set();
    const listeners = new Map();
    const element = {
      tagName: tagName.toUpperCase(),
      children: [],
      attributes: {},
      style: {},
      textContent: '',
      classList: {
        add(name) { classes.add(name); },
        remove(...names) { names.forEach((name) => classes.delete(name)); },
        toggle(name, force) {
          const enabled = force === undefined ? !classes.has(name) : force;
          if (enabled) classes.add(name);
          else classes.delete(name);
          return enabled;
        },
        contains(name) { return classes.has(name); }
      },
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      setAttribute(name, value) { this.attributes[name] = String(value); },
      getAttribute(name) { return this.attributes[name] || ''; },
      addEventListener(type, listener) {
        const items = listeners.get(type) || [];
        items.push(listener);
        listeners.set(type, items);
      },
      removeEventListener(type, listener) {
        listeners.set(type, (listeners.get(type) || []).filter((item) => item !== listener));
      },
      dispatch(type, event = {}) {
        event.currentTarget = this;
        event.preventDefault ||= () => {};
        for (const listener of listeners.get(type) || []) listener(event);
      },
      focus() {},
      closest(selector) { return selector === '.screen.active' ? screen : null; },
      querySelector(selector) {
        const matches = (child) => selector[0] === '#'
          ? child.id === selector.slice(1)
          : selector[0] === '.' && child.classList.contains(selector.slice(1));
        const pending = this.children.slice();
        while (pending.length) {
          const child = pending.shift();
          if (matches(child)) return child;
          pending.push(...child.children);
        }
        return null;
      }
    };

    Object.defineProperty(element, 'id', {
      get() { return element._id || ''; },
      set(value) {
        element._id = value;
        if (value) elements.set(value, element);
      }
    });
    Object.defineProperty(element, 'className', {
      get() { return Array.from(classes).join(' '); },
      set(value) {
        classes.clear();
        String(value || '').split(/\s+/).filter(Boolean).forEach((name) => classes.add(name));
      }
    });
    Object.defineProperty(element, 'innerHTML', {
      set(value) {
        element._html = value;
        element.children = [];
        for (const [, id] of value.matchAll(/\bid="([^"]+)"/g)) {
          const child = createElement(id === 'block-start' ? 'button' : 'span');
          child.id = id;
          element.appendChild(child);
        }
      },
      get() { return element._html || ''; }
    });
    return element;
  }

  const screen = createElement('section');
  screen.classList.add('active');
  const stage = createElement('div');
  const document = {
    createElement,
    querySelector(selector) {
      return selector === '[data-screen="block-wood"] .game-stage' ? stage : null;
    },
    getElementById(id) { return elements.get(id) || null; },
    addEventListener(type, listener) {
      const items = documentListeners.get(type) || [];
      items.push(listener);
      documentListeners.set(type, items);
    },
    removeEventListener(type, listener) {
      documentListeners.set(type, (documentListeners.get(type) || []).filter((item) => item !== listener));
    },
    dispatch(type, event) {
      for (const listener of documentListeners.get(type) || []) listener(event);
    }
  };
  const window = {
    __gameRuntimeRegistry: {},
    requestAnimationFrame(callback) {
      const id = ++nextFrameId;
      animationFrames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) { animationFrames.delete(id); },
    setTimeout(callback, delay) {
      const id = ++nextTimerId;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    addEventListener(type, listener) {
      const items = windowListeners.get(type) || [];
      items.push(listener);
      windowListeners.set(type, items);
    },
    removeEventListener(type, listener) {
      windowListeners.set(type, (windowListeners.get(type) || []).filter((item) => item !== listener));
    }
  };

  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '../js/block-wood.js'), 'utf8'),
    { window, document, console, Math, Array, Number, String, Object, setTimeout, clearTimeout }
  );

  return {
    window,
    document,
    stage,
    elements,
    init() { window.initBlockWoodGame(); },
    pendingAnimationFrames() { return animationFrames.size; },
    key(type, key, repeat = false) {
      document.dispatch(type, { key, repeat, preventDefault() {} });
    },
    runTimer(delay) {
      const entry = Array.from(timers.entries()).find(([, timer]) => timer.delay === delay);
      assert.ok(entry, 'deveria existir um temporizador de repetição de ' + delay + ' ms');
      timers.delete(entry[0]);
      entry[1].callback();
    },
    minActivePosition() {
      const board = elements.get('block-board');
      const positions = board.children
        .map((cell, index) => cell.classList.contains('active') ? index : -1)
        .filter((index) => index >= 0);
      assert.ok(positions.length, 'a peça atual deveria estar visível (células: ' + board.children.length + ')');
      return {
        row: Math.min(...positions.map((index) => Math.floor(index / 10))),
        column: Math.min(...positions.map((index) => index % 10))
      };
    },
    ghostPositions() {
      const board = elements.get('block-board');
      return board.children
        .map((cell, index) => cell.classList.contains('ghost') ? {
          row: Math.floor(index / 10),
          column: index % 10,
          transform: cell.style.transform
        } : null)
        .filter(Boolean);
    },
    filledPositions() {
      const board = elements.get('block-board');
      return board.children
        .map((cell, index) => cell.classList.contains('filled') ? {
          row: Math.floor(index / 10),
          column: index % 10
        } : null)
        .filter(Boolean);
    }
  };
}

test('deve criar tabuleiro vazio com dimensões 10x20', () => {
  const api = loadBlockWoodModule();
  const board = api.BlockWoodTetris.createEmptyBoard(10, 20);

  assert.equal(board.length, 20);
  assert.equal(board[0].length, 10);
  assert.equal(board[0].every((cell) => cell === 0), true);
});

test('deve rotacionar matriz no sentido horário', () => {
  const api = loadBlockWoodModule();
  const matrix = [
    [1, 0],
    [1, 0],
    [1, 1]
  ];

  const rotated = api.BlockWoodTetris.rotateMatrix(matrix, 1);

  assert.equal(rotated.length, 2);
  assert.equal(rotated[0].length, 3);
  assert.equal(rotated[0].every((cell) => cell === 1), true);
  assert.equal(rotated[1][0], 1);
  assert.equal(rotated[1][1], 0);
  assert.equal(rotated[1][2], 0);
});

test('deve permitir peça encaixar perto da borda quando há espaço', () => {
  const api = loadBlockWoodModule();
  const board = api.BlockWoodTetris.createEmptyBoard(10, 20);
  const piece = { matrix: [[1, 1], [1, 1]], x: 8, y: 0 };

  assert.equal(api.BlockWoodTetris.isValidPosition(board, piece, 0, 0), true);
  assert.equal(api.BlockWoodTetris.isValidPosition(board, piece, 1, 0), false);
});

test('deve impedir que uma peça atravesse um obstáculo', () => {
  const api = loadBlockWoodModule();
  const board = api.BlockWoodTetris.createEmptyBoard(10, 20);
  const piece = { matrix: [[1]], x: 4, y: 3 };
  board[4][4] = '#obstaculo';

  assert.equal(api.BlockWoodTetris.isValidPosition(board, piece, 0, 1), false);
  assert.equal(api.BlockWoodTetris.isValidPosition(board, piece, 1, 0), true);
});

test('deve limpar linhas completas e empurrar as demais para baixo', () => {
  const api = loadBlockWoodModule();
  const board = api.BlockWoodTetris.createEmptyBoard(10, 20);
  board[19] = Array(10).fill(1);
  board[18] = Array(10).fill(1);
  board[17][0] = 0;

  const result = api.BlockWoodTetris.clearCompleteLines(board);

  assert.equal(result.cleared, 2);
  assert.equal(board[19].every((cell) => cell === 0), true);
  assert.equal(board[18][0], 0);
});

test('cada seta desloca uma célula e a repetição ao segurar é controlada', () => {
  const game = createBlockWoodRuntime();
  game.init();
  game.elements.get('block-start').dispatch('click');

  const ghostBeforeMove = game.ghostPositions();
  assert.ok(ghostBeforeMove.length, 'a sombra deveria estar visível');
  assert.ok(ghostBeforeMove.every((cell) => cell.transform === 'translateY(calc(0% + 0px))'));

  const start = game.minActivePosition();
  game.key('keydown', 'ArrowRight');
  assert.equal(game.minActivePosition().column, start.column + 1);
  const ghostAfterMove = game.ghostPositions();
  assert.equal(
    Math.min(...ghostAfterMove.map((cell) => cell.column)),
    Math.min(...ghostBeforeMove.map((cell) => cell.column)) + 1
  );

  game.key('keydown', 'ArrowRight', true);
  assert.equal(game.minActivePosition().column, start.column + 1);
  game.runTimer(240);
  assert.equal(game.minActivePosition().column, start.column + 2);
  game.runTimer(130);
  assert.equal(game.minActivePosition().column, start.column + 3);
  game.key('keyup', 'ArrowRight');

  game.key('keydown', 'ArrowUp');
  const ghostAfterRotation = game.ghostPositions();
  assert.ok(ghostAfterRotation.length, 'a sombra deveria continuar visível após a rotação');
  assert.ok(ghostAfterRotation.every((cell) => cell.transform === 'translateY(calc(0% + 0px))'));

  const afterKeyboard = game.minActivePosition();
  game.stage.querySelector('.block-touch-controls').querySelector('.right').dispatch('click');
  assert.equal(game.minActivePosition().column, afterKeyboard.column + 1);
});

test('as peças ficam paradas sem comandos e descem somente por ação manual', () => {
  const game = createBlockWoodRuntime();
  game.init();
  game.elements.get('block-start').dispatch('click');
  const start = game.minActivePosition();
  assert.equal(game.minActivePosition().row, start.row);
  assert.equal(game.pendingAnimationFrames(), 0, 'o jogo não deve iniciar uma queda temporizada');

  game.key('keydown', 'ArrowDown');
  assert.equal(game.minActivePosition().row, start.row + 1);

  game.elements.get('block-pause').dispatch('click');
  game.key('keydown', 'ArrowDown');
  assert.equal(game.minActivePosition().row, start.row + 1, 'a peça não deve se mover durante a pausa');
  game.elements.get('block-pause').dispatch('click');

  game.stage.querySelector('.block-touch-controls').querySelector('.down').dispatch('click');
  assert.equal(game.minActivePosition().row, start.row + 2);
});

test('a peça fixa ao receber comando de descida bloqueado e fica dentro do tabuleiro', () => {
  const game = createBlockWoodRuntime();
  game.init();
  game.elements.get('block-start').dispatch('click');

  let fixedCells = game.filledPositions();
  let steps = 0;
  while (fixedCells.length === 0 && steps < 21) {
    const rowBefore = game.minActivePosition().row;
    game.key('keydown', 'ArrowDown');
    fixedCells = game.filledPositions();
    steps += 1;

    if (fixedCells.length === 0) {
      assert.equal(game.minActivePosition().row, rowBefore + 1);
    }
  }

  assert.ok(fixedCells.length > 0, 'a peça deveria fixar ao encontrar o limite inferior');
  assert.ok(fixedCells.every((cell) => cell.row >= 0 && cell.row < 20 && cell.column >= 0 && cell.column < 10));
  assert.equal(game.minActivePosition().row, 0, 'a próxima peça deve surgir no topo após o travamento');
  assert.equal(game.pendingAnimationFrames(), 0);

  game.elements.get('block-reset').dispatch('click');
  assert.equal(game.minActivePosition().row, 0);
  assert.equal(game.filledPositions().length, 0);
});
