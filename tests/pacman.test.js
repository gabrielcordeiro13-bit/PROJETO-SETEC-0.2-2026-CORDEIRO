const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadPacmanData() {
  const source = fs.readFileSync(path.join(__dirname, '../js/pacman.js'), 'utf8');
  const window = {};
  vm.runInNewContext(source, { window, Set, Math, Number, String, Object, Array });
  return window.PacmanMazeData;
}

function loadAudioCore() {
  const sources = [];
  const contexts = [];
  let buffersCreated = 0;

  class AudioContextMock {
    constructor() {
      this.currentTime = 0;
      this.sampleRate = 8000;
      this.destination = {};
      contexts.push(this);
    }

    createBuffer(_channels, length) {
      buffersCreated += 1;
      const samples = new Float32Array(length);
      return { duration: length / this.sampleRate, getChannelData: () => samples };
    }

    createBufferSource() {
      const source = {
        starts: 0,
        stops: 0,
        offsets: [],
        disconnect() {},
        connect() {},
        start(_when, offset = 0) { this.starts += 1; this.offsets.push(offset); },
        stop() { this.stops += 1; }
      };
      sources.push(source);
      return source;
    }

    createGain() {
      return { gain: { value: 0 }, connect() {}, disconnect() {} };
    }
  }

  const classList = { add() {}, remove() {}, toggle() {} };
  const document = {
    body: { classList },
    addEventListener() {},
    querySelectorAll: () => [],
    getElementById: () => null
  };
  const localStorage = {
    getItem: () => null,
    setItem() {},
    removeItem() {}
  };
  const window = { AudioContext: AudioContextMock, localStorage, setTimeout() {} };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '../js/setec-core.js'), 'utf8'),
    { window, document, console, Date, Math, Number, Object, String, Array, performance: { now: () => 0 } }
  );
  return {
    core: window.SetecCore,
    sources,
    contexts,
    get buffersCreated() { return buffersCreated; }
  };
}

function loadPacmanRuntime(options = {}) {
  const callbacks = new Map();
  const listeners = new Map();
  const elements = new Map();
  const canvasRadii = [];
  const pacmanRadii = [];
  let nextFrameId = 0;
  let currentTime = 0;
  const noop = () => {};
  const classList = {
    add: noop,
    remove: noop,
    toggle: noop,
    contains: () => false
  };
  const context = new Proxy({
    arc(_x, _y, radius) {
      canvasRadii.push(radius);
      if (this.fillStyle === '#ffe135') pacmanRadii.push(radius);
    }
  }, {
    get(target, property) { return property in target ? target[property] : noop; },
    set(target, property, value) { target[property] = value; return true; }
  });

  class ElementMock {
    constructor(id, direction) {
      this.id = id;
      this.direction = direction;
      this.listeners = {};
      this.classList = { ...classList };
      this.style = {};
      this.parentElement = { classList: { ...classList } };
      this.textContent = '';
      this.hidden = false;
    }

    addEventListener(type, listener) {
      (this.listeners[type] || (this.listeners[type] = [])).push(listener);
    }

    removeEventListener(type, listener) {
      this.listeners[type] = (this.listeners[type] || []).filter((item) => item !== listener);
    }

    dispatch(type, event = {}) {
      event.currentTarget = this;
      event.cancelable = false;
      for (const listener of this.listeners[type] || []) listener(event);
    }

    setAttribute() {}
    getAttribute(name) { return name === 'data-dir' ? this.direction : ''; }
    focus() {}
    closest() { return this.intro; }
    getContext() { return context; }
  }

  const stage = new ElementMock('stage');
  const intro = new ElementMock('intro');
  const screen = new ElementMock('screen');
  const directions = ['up', 'left', 'down', 'right'].map((direction) =>
    new ElementMock('control-' + direction, direction));
  stage.querySelector = (selector) => selector === '.game-intro' ? intro : null;
  stage.querySelectorAll = (selector) => selector === '.pacman-control-btn' ? directions : [];
  stage.closest = () => screen;

  const ids = [
    'pacman-canvas', 'pacman-score', 'pacman-lives', 'pacman-level', 'pacman-best',
    'pacman-power', 'pacman-sound', 'pacman-status', 'pacman-start', 'pacman-reset',
    'pacman-pause', 'pacman-continuar', 'pacman-reiniciar2', 'pacman-biblioteca',
    'pacman-pausa-overlay', 'game-modal'
  ];
  ids.forEach((id) => {
    elements.set(id, new ElementMock(id));
    elements.get(id).intro = intro;
  });
  elements.get('pacman-score').parentElement = { classList: { ...classList }, offsetWidth: 1 };

  const document = {
    hidden: false,
    querySelector: (selector) => selector === '[data-screen="pacman"] .game-stage' ? stage : null,
    getElementById: (id) => elements.get(id) || null,
    addEventListener(type, listener) {
      (listeners.get(type) || (listeners.set(type, []), listeners.get(type))).push(listener);
    },
    removeEventListener(type, listener) {
      listeners.set(type, (listeners.get(type) || []).filter((item) => item !== listener));
    }
  };
  const state = { prefs: { som: true } };
  const music = { starts: 0, pauses: 0, stops: 0 };
  const core = {
    countPlay: noop,
    getBest: () => 0,
    setBest: noop,
    unlock: noop,
    announce: noop,
    tocarSom: noop,
    prefersReducedMotion: () => false,
    getState: () => state,
    setPref(key, value) { state.prefs[key] = value; },
    iniciarMusicaPacman() { music.starts += 1; },
    pausarMusicaPacman() { music.pauses += 1; },
    pararMusicaPacman() { music.stops += 1; }
  };
  const window = {
    SetecCore: core,
    __gameRuntimeRegistry: {},
    requestAnimationFrame(callback) {
      const id = ++nextFrameId;
      callbacks.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) { callbacks.delete(id); }
  };
  const math = Object.create(Math);
  math.random = () => 0.5;
  const sandbox = {
    window,
    document,
    console,
    Set,
    Math: math,
    Number,
    String,
    Object,
    Array,
    performance: { now: () => currentTime }
  };
  let source = fs.readFileSync(path.join(__dirname, '../js/pacman.js'), 'utf8');
  if (options.playerStart) {
    source = source.replace('var JOGADOR_INI = { l: 25, c: 13 };',
      'var JOGADOR_INI = { l: ' + options.playerStart.l + ', c: ' + options.playerStart.c + ' };');
  }
  vm.runInNewContext(source, sandbox);

  return {
    window,
    document,
    elements,
    music,
    canvasRadii,
    pacmanRadii,
    init: () => window.initPacmanGame(),
    frame(timestamp) {
      currentTime = timestamp;
      const next = callbacks.entries().next().value;
      assert.ok(next, 'o laço de animação deveria estar ativo');
      callbacks.delete(next[0]);
      next[1](timestamp);
    },
    key(key) {
      for (const listener of listeners.get('keydown') || []) {
        listener({ key, preventDefault: noop });
      }
    }
  };
}

function reachablePellets(mapData) {
  const isWalkable = (row, col) => row >= 0 && row < mapData.rows &&
    col >= 0 && col < mapData.columns && ['.', 'o'].includes(mapData.map[row][col]);
  const pending = [mapData.playerStart];
  const visited = new Set([mapData.playerStart.l + ',' + mapData.playerStart.c]);

  for (let i = 0; i < pending.length; i += 1) {
    const { l, c } = pending[i];
    for (const [dl, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const row = l + dl;
      let col = c + dc;
      if (l === mapData.tunnelRow && col < 0) col = mapData.columns - 1;
      if (l === mapData.tunnelRow && col === mapData.columns) col = 0;
      const key = row + ',' + col;
      if (isWalkable(row, col) && !visited.has(key)) {
        visited.add(key);
        pending.push({ l: row, c: col });
      }
    }
  }

  return visited;
}

test('o labirinto tem dimensões fixas, linhas retangulares e ponto inicial transitável', () => {
  const maze = loadPacmanData();

  assert.equal(maze.map.length, 31);
  assert.equal(maze.map.every((row) => row.length === 28), true);
  assert.equal(maze.map[maze.playerStart.l][maze.playerStart.c], '.');
});

test('todos os pontos, inclusive os oito Power Pellets, são alcançáveis pelo jogador', () => {
  const maze = loadPacmanData();
  const reachable = reachablePellets(maze);
  const pellets = [];
  const powerPellets = [];

  maze.map.forEach((row, l) => {
    Array.from(row).forEach((cell, c) => {
      if (cell === '.' || cell === 'o') pellets.push(l + ',' + c);
      if (cell === 'o') powerPellets.push(l + ',' + c);
    });
  });

  assert.equal(powerPellets.length, 8);
  assert.equal(pellets.every((key) => reachable.has(key)), true);
});

test('o túnel conecta as duas bordas e a porta separa o jogador da casa dos fantasmas', () => {
  const maze = loadPacmanData();
  const row = maze.map[maze.tunnelRow];
  const { door, front, interior } = maze.ghostHouse;

  assert.equal(row[0] === '.' || row[0] === 'o', true);
  assert.equal(row[maze.columns - 1] === '.' || row[maze.columns - 1] === 'o', true);
  assert.equal(maze.map[door.l][door.c], '-');
  assert.equal(maze.map[front.l][front.c], '.');
  assert.equal(maze.map[interior.l][interior.c], ' ');
});

test('a música usa uma única fonte, pode pausar e reiniciar e respeita a preferência de som', () => {
  const audio = loadAudioCore();

  audio.core.iniciarMusicaPacman();
  audio.core.iniciarMusicaPacman();
  assert.equal(audio.sources.length, 1);
  assert.equal(audio.sources[0].starts, 1);
  assert.equal(audio.buffersCreated, 1);

  audio.contexts[0].currentTime = 3.25;
  audio.core.pausarMusicaPacman();
  assert.equal(audio.sources[0].stops, 1);
  audio.core.iniciarMusicaPacman();
  assert.equal(audio.sources.length, 2);
  assert.ok(audio.sources[1].offsets[0] > 3.2, 'a música deve retomar da posição pausada');

  audio.core.setPref('som', false);
  assert.equal(audio.sources[1].stops, 1);
  audio.core.iniciarMusicaPacman();
  assert.equal(audio.sources.length, 2);

  audio.core.setPref('som', true);
  assert.equal(audio.sources.length, 3);
  audio.core.pararMusicaPacman();
  assert.equal(audio.sources[2].stops, 1);
});

test('o jogo inicia, move, pausa, retoma, silencia e reinicia sem duplicar execução', () => {
  const game = loadPacmanRuntime();

  game.init();
  game.init();
  assert.equal(game.elements.get('pacman-lives').textContent, '3');
  assert.equal(game.window.__gameRuntimeRegistry.pacman.ativo, true);

  game.elements.get('pacman-start').dispatch('click');
  assert.equal(game.music.starts, 1);
  game.key('ArrowDown');
  for (let frame = 1; frame <= 30; frame += 1) game.frame(frame * 16);
  assert.ok(Number(game.elements.get('pacman-score').textContent) > 0);

  game.elements.get('pacman-pause').dispatch('click');
  assert.match(game.elements.get('pacman-status').textContent, /pausado/);
  const scoreOnPause = game.elements.get('pacman-score').textContent;
  for (let frame = 31; frame <= 45; frame += 1) game.frame(frame * 16);
  assert.equal(game.elements.get('pacman-score').textContent, scoreOnPause);

  game.elements.get('pacman-continuar').dispatch('click');
  assert.match(game.elements.get('pacman-status').textContent, /retomado/);
  game.elements.get('pacman-sound').dispatch('click');
  assert.equal(game.window.SetecCore.getState().prefs.som, false);
  assert.equal(game.elements.get('pacman-sound').textContent, '♪ Som desligado');

  game.elements.get('pacman-reset').dispatch('click');
  assert.equal(game.elements.get('pacman-score').textContent, '0');
  assert.equal(game.elements.get('pacman-lives').textContent, '3');
  assert.match(game.elements.get('pacman-status').textContent, /Novo jogo/);
});

test('a colisão anima a morte antes de reposicionar o jogador e manter vidas', () => {
  const game = loadPacmanRuntime({ playerStart: { l: 11, c: 13 } });

  game.init();
  game.elements.get('pacman-start').dispatch('click');
  let frame = 0;
  while (game.elements.get('pacman-lives').textContent === '3' && frame < 300) {
    frame += 1;
    game.frame(frame * 16);
  }
  assert.equal(game.elements.get('pacman-lives').textContent, '2');
  assert.match(game.elements.get('pacman-status').textContent, /Vida perdida/);

  for (let step = 0; step < 30; step += 1) {
    frame += 1;
    game.frame(frame * 16);
  }
  assert.equal(game.pacmanRadii.some((radius) => radius > 0 && radius < 9.2), true);

  for (let step = 0; step < 70; step += 1) {
    frame += 1;
    game.frame(frame * 16);
  }
  assert.equal(game.elements.get('pacman-lives').textContent, '2');
  assert.match(game.elements.get('pacman-status').textContent, /Cuidado/);
});
