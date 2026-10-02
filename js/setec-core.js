/* SETEC 2026 - Núcleo: armazenamento local, conquistas, acessibilidade e sons.
 * Apenas HTML/CSS/JS puro, sem dependências. Sem coleta de dados pessoais.
 * Sons via WebAudio (sem arquivos externos), desligáveis no painel. */
(function () {
  'use strict';

  var STORAGE_KEY = 'setec2026:estado:v1';

  var ACHIEVEMENTS = [
    { id: 'primeiro-jogo', nome: 'Primeiros passos', descricao: 'Abriu um jogo pela primeira vez.' },
    { id: 'bloco-200', nome: 'Construtor 200', descricao: 'Fez 200 pontos no Block Wood Puzzle.' },
    { id: 'bloco-500', nome: 'Mestre dos blocos', descricao: 'Fez 500 pontos no Block Wood Puzzle.' },
    { id: 'bloco-limpeza-dupla', nome: 'Limpeza dupla', descricao: 'Removeu 2 ou mais linhas/colunas de uma vez.' },
    { id: 'pacman-500', nome: 'Caçador de energia', descricao: 'Fez 500 pontos no Pac-Man.' },
    { id: 'pacman-fantasma', nome: 'Fantasma capturado', descricao: 'Capturou um fantasma no modo energia.' },
    { id: 'pacman-fase', nome: 'Fase concluída', descricao: 'Limpou todos os itens de uma fase no Pac-Man.' },
    { id: 'forca-vitoria', nome: 'Detetive de palavras', descricao: 'Venceu uma partida na Forca.' },
    { id: 'forca-perfeita', nome: 'Palavra perfeita', descricao: 'Venceu a Forca sem errar nenhuma letra.' },
    { id: 'forca-sequencia-3', nome: 'Sequência 3', descricao: 'Venceu 3 partidas seguidas na Forca.' }
  ];

  function defaultState() {
    return {
      recordes: { 'block-wood': 0, pacman: 0, hangman: 0 },
      jogadas: { 'block-wood': 0, pacman: 0, hangman: 0 },
      vitoriasForcaSeq: 0,
      conquistas: {},
      prefs: { fonte: 'media', contraste: false, foco: false, movimento: 'auto', som: true }
    };
  }

  function loadState() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      var base = defaultState();
      if (parsed && typeof parsed === 'object') {
        if (parsed.recordes) {
          ['block-wood', 'pacman', 'hangman'].forEach(function (k) {
            var v = Number(parsed.recordes[k]);
            if (Number.isFinite(v) && v >= 0) base.recordes[k] = Math.floor(v);
          });
        }
        if (parsed.jogadas) {
          ['block-wood', 'pacman', 'hangman'].forEach(function (k) {
            var j = Number(parsed.jogadas[k]);
            if (Number.isFinite(j) && j >= 0) base.jogadas[k] = Math.floor(j);
          });
        }
        if (Number.isFinite(Number(parsed.vitoriasForcaSeq))) {
          base.vitoriasForcaSeq = Math.max(0, Math.floor(Number(parsed.vitoriasForcaSeq)));
        }
        if (parsed.conquistas && typeof parsed.conquistas === 'object') {
          Object.keys(parsed.conquistas).forEach(function (k) {
            if (parsed.conquistas[k]) base.conquistas[k] = true;
          });
        }
        if (parsed.prefs && typeof parsed.prefs === 'object') {
          if (['pequena', 'media', 'grande', 'extra'].indexOf(parsed.prefs.fonte) >= 0) base.prefs.fonte = parsed.prefs.fonte;
          base.prefs.contraste = parsed.prefs.contraste === true;
          base.prefs.foco = parsed.prefs.foco === true;
          if (['auto', 'reduzido', 'completo'].indexOf(parsed.prefs.movimento) >= 0) base.prefs.movimento = parsed.prefs.movimento;
          if (typeof parsed.prefs.som === 'boolean') base.prefs.som = parsed.prefs.som;
        }
      }
      return base;
    } catch (e) {
      return defaultState();
    }
  }

  var state = loadState();

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* armazenamento indisponível: segue sem persistir */ }
  }

  function clearState() {
    state = defaultState();
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    applyPrefs();
    renderAchievements();
    renderRecords();
    announce('Dados locais apagados. Recordes, conquistas e preferências foram removidos.');
  }

  function getBest(gameKey) {
    return state.recordes[gameKey] || 0;
  }

  function setBest(gameKey, value) {
    var v = Math.max(0, Math.floor(Number(value) || 0));
    if (v > (state.recordes[gameKey] || 0)) {
      state.recordes[gameKey] = v;
      saveState();
      renderRecords();
      return true;
    }
    return false;
  }

  function getPlays(gameKey) {
    return state.jogadas[gameKey] || 0;
  }

  function totalPlays() {
    return getPlays('block-wood') + getPlays('pacman') + getPlays('hangman');
  }

  function countPlay(gameKey) {
    state.jogadas[gameKey] = (state.jogadas[gameKey] || 0) + 1;
    saveState();
    renderRecords();
    if (state.jogadas[gameKey] === 1) unlock('primeiro-jogo');
  }

  function ensureToastRegion() {
    var region = document.getElementById('setec-toast');
    if (region) return region;
    region = document.createElement('div');
    region.id = 'setec-toast';
    region.className = 'setec-toast';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
    return region;
  }

  function ensureLiveRegion() {
    var live = document.getElementById('setec-live');
    if (live) return live;
    live = document.createElement('div');
    live.id = 'setec-live';
    live.className = 'sr-only';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    document.body.appendChild(live);
    return live;
  }

  function announce(message) {
    var live = ensureLiveRegion();
    live.textContent = '';
    window.setTimeout(function () { live.textContent = String(message); }, 30);
  }

  function unlock(id) {
    var def = null;
    for (var i = 0; i < ACHIEVEMENTS.length; i += 1) {
      if (ACHIEVEMENTS[i].id === id) { def = ACHIEVEMENTS[i]; break; }
    }
    if (!def || state.conquistas[id]) return false;
    state.conquistas[id] = true;
    saveState();
    renderAchievements();
    var region = ensureToastRegion();
    var toast = document.createElement('div');
    toast.className = 'toast-item';
    var title = document.createElement('strong');
    title.textContent = '★ Conquista: ' + def.nome;
    var desc = document.createElement('span');
    desc.textContent = def.descricao;
    toast.appendChild(title);
    toast.appendChild(desc);
    region.appendChild(toast);
    announce('Conquista desbloqueada: ' + def.nome + '. ' + def.descricao);
    window.setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 5000);
    return true;
  }

  /* ---- efeitos sonoros discretos (WebAudio, sem arquivos) ---- */
  var audioCtx = null;
  var ultimoBipPonto = 0;

  function garantirAudio() {
    try {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    } catch (e) {
      return null;
    }
  }

  function bip(freq, duracao, tipo, volume, atraso) {
    try {
      var ctx = garantirAudio();
      if (!ctx) return;
      var t0 = ctx.currentTime + (atraso || 0);
      var osc = ctx.createOscillator();
      var ganho = ctx.createGain();
      osc.type = tipo || 'square';
      osc.frequency.setValueAtTime(freq, t0);
      ganho.gain.setValueAtTime(volume || 0.035, t0);
      ganho.gain.exponentialRampToValueAtTime(0.0001, t0 + duracao);
      osc.connect(ganho);
      ganho.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duracao + 0.02);
    } catch (e) { /* som indisponível: jogo segue em silêncio */ }
  }

  function tocarSom(nome) {
    try {
      if (!state.prefs.som) return;
      var agora = (window.performance && performance.now()) || Date.now();
      switch (nome) {
        case 'ponto':
          if (agora - ultimoBipPonto < 70) return; // evita saraivada em sequências rápidas
          ultimoBipPonto = agora;
          bip(660, 0.05, 'square', 0.025);
          break;
        case 'colocar': bip(440, 0.07, 'triangle', 0.04); break;
        case 'linha': bip(523, 0.08, 'triangle', 0.045); bip(784, 0.1, 'triangle', 0.045, 0.08); break;
        case 'energia': bip(330, 0.09, 'sawtooth', 0.03); bip(660, 0.12, 'sawtooth', 0.03, 0.09); break;
        case 'fantasma': bip(880, 0.1, 'square', 0.04); bip(440, 0.14, 'square', 0.04, 0.1); break;
        case 'fruta': bip(988, 0.08, 'sine', 0.05); bip(1319, 0.12, 'sine', 0.05, 0.08); break;
        case 'acerto': bip(740, 0.07, 'sine', 0.045); break;
        case 'erro': bip(196, 0.16, 'sawtooth', 0.035); break;
        case 'recorde': bip(659, 0.09, 'triangle', 0.05); bip(880, 0.09, 'triangle', 0.05, 0.09); bip(1175, 0.16, 'triangle', 0.05, 0.18); break;
        case 'vitoria': bip(523, 0.1, 'triangle', 0.05); bip(659, 0.1, 'triangle', 0.05, 0.1); bip(784, 0.18, 'triangle', 0.05, 0.2); break;
        case 'derrota': bip(330, 0.14, 'sawtooth', 0.035); bip(220, 0.2, 'sawtooth', 0.035, 0.14); break;
        default: break;
      }
    } catch (e) { /* nunca quebra o jogo por causa de som */ }
  }

  function applyPrefs() {
    var body = document.body;
    body.classList.remove('font-pequena', 'font-media', 'font-grande', 'font-extra');
    body.classList.add('font-' + state.prefs.fonte);
    body.classList.toggle('alto-contraste', state.prefs.contraste === true);
    body.classList.toggle('foco-forte', state.prefs.foco === true);
    body.classList.toggle('reduzir-movimento', state.prefs.movimento === 'reduzido');
    body.classList.toggle('movimento-completo', state.prefs.movimento === 'completo');
    try {
      var fontBtns = document.querySelectorAll('[data-a11y-fonte]');
      fontBtns.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-a11y-fonte') === state.prefs.fonte));
      });
      var c = document.getElementById('a11y-contraste');
      if (c) c.setAttribute('aria-pressed', String(state.prefs.contraste));
      var f = document.getElementById('a11y-foco');
      if (f) f.setAttribute('aria-pressed', String(state.prefs.foco));
      var mRed = document.getElementById('a11y-mov-reduzido');
      var mFull = document.getElementById('a11y-mov-completo');
      var mAuto = document.getElementById('a11y-mov-auto');
      if (mRed) mRed.setAttribute('aria-pressed', String(state.prefs.movimento === 'reduzido'));
      if (mFull) mFull.setAttribute('aria-pressed', String(state.prefs.movimento === 'completo'));
      if (mAuto) mAuto.setAttribute('aria-pressed', String(state.prefs.movimento === 'auto'));
      var s = document.getElementById('a11y-som');
      if (s) s.setAttribute('aria-pressed', String(state.prefs.som === true));
    } catch (e) {}
  }

  function setPref(key, value) {
    state.prefs[key] = value;
    saveState();
    applyPrefs();
  }

  function renderRecords() {
    document.querySelectorAll('[data-recorde]').forEach(function (el) {
      var game = el.getAttribute('data-recorde');
      el.textContent = String(getBest(game));
    });
    document.querySelectorAll('[data-recorde-texto]').forEach(function (el) {
      var game = el.getAttribute('data-recorde-texto');
      el.textContent = getPlays(game) > 0 ? (String(getBest(game)) + ' pts') : 'Ainda não jogado';
    });
    document.querySelectorAll('[data-partidas]').forEach(function (el) {
      el.textContent = String(getPlays(el.getAttribute('data-partidas')));
    });
    var tot = document.getElementById('total-partidas');
    if (tot) tot.textContent = String(totalPlays());
  }

  function renderAchievements() {
    var list = document.getElementById('conquistas-lista');
    if (!list) return;
    list.innerHTML = '';
    ACHIEVEMENTS.forEach(function (a) {
      var li = document.createElement('li');
      li.className = 'conquista' + (state.conquistas[a.id] ? ' desbloqueada' : '');
      var name = document.createElement('strong');
      name.textContent = (state.conquistas[a.id] ? '★ ' : '○ ') + a.nome;
      var desc = document.createElement('span');
      desc.textContent = a.descricao;
      li.appendChild(name);
      li.appendChild(desc);
      list.appendChild(li);
    });
    var count = document.getElementById('conquistas-contagem');
    if (count) {
      var total = ACHIEVEMENTS.length;
      var got = Object.keys(state.conquistas).length;
      count.textContent = got + ' de ' + total + ' desbloqueadas';
    }
  }

  function prefersReducedMotion() {
    if (state.prefs.movimento === 'reduzido') return true;
    if (state.prefs.movimento === 'completo') return false;
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  window.SetecCore = {
    getState: function () { return state; },
    save: saveState,
    clear: clearState,
    getBest: getBest,
    setBest: setBest,
    getPlays: getPlays,
    totalPlays: totalPlays,
    countPlay: countPlay,
    unlock: unlock,
    announce: announce,
    tocarSom: tocarSom,
    applyPrefs: applyPrefs,
    setPref: setPref,
    renderRecords: renderRecords,
    renderAchievements: renderAchievements,
    prefersReducedMotion: prefersReducedMotion,
    achievements: ACHIEVEMENTS
  };

  document.addEventListener('DOMContentLoaded', function () {
    applyPrefs();
    renderRecords();
    renderAchievements();
  });
})();
