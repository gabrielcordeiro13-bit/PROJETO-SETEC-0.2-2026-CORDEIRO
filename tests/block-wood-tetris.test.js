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
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    cancelAnimationFrame: clearTimeout,
    performance: { now: () => Date.now() }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.window;
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
