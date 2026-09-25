/* SETEC 2026 - Block Wood Puzzle.
 * Encaixe de peças 9x9: selecionar/clicar/arrastar + teclado. Sem dependências. */
(function () {
  'use strict';

  var BOARD_SIZE = 9;

  var PIECE_TEMPLATES = [
    { id: 'ponto', nome: 'Ponto 1x1', cor: '#4ade80', celulas: [[0, 0]] },
    { id: 'duo-h', nome: 'Dupla 1x2', cor: '#38bdf8', celulas: [[0, 0], [0, 1]] },
    { id: 'duo-v', nome: 'Dupla 2x1', cor: '#38bdf8', celulas: [[0, 0], [1, 0]] },
    { id: 'trio-h', nome: 'Trio 1x3', cor: '#ffd429', celulas: [[0, 0], [0, 1], [0, 2]] },
    { id: 'trio-v', nome: 'Trio 3x1', cor: '#ffd429', celulas: [[0, 0], [1, 0], [2, 0]] },
    { id: 'quad-h', nome: 'Linha 1x4', cor: '#21d4ff', celulas: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { id: 'quad-v', nome: 'Coluna 4x1', cor: '#21d4ff', celulas: [[0, 0], [1, 0], [2, 0], [3, 0]] },
    { id: 'quadrado-2', nome: 'Quadrado 2x2', cor: '#a78bfa', celulas: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    { id: 'quadrado-3', nome: 'Quadrado 3x3', cor: '#c084fc', celulas: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] },
    { id: 'linha-5', nome: 'Linha 1x5', cor: '#fb7185', celulas: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
    { id: 'coluna-5', nome: 'Coluna 5x1', cor: '#fb7185', celulas: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
    { id: 'canto-p', nome: 'Canto pequeno', cor: '#f97316', celulas: [[0, 0], [1, 0], [1, 1]] },
    { id: 'canto-g', nome: 'Canto grande', cor: '#f97316', celulas: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },
    { id: 'letra-l', nome: 'Peça L', cor: '#f472b6', celulas: [[0, 0], [1, 0], [0, 1], [0, 2]] },
    { id: 'letra-t', nome: 'Peça T', cor: '#facc15', celulas: [[0, 0], [0, 1], [0, 2], [1, 1]] },
    { id: 'letra-z', nome: 'Peça Z', cor: '#ff3b91', celulas: [[0, 0], [1, 0], [1, 1], [2, 1]] }
  ];

  function core() { return window.SetecCore || null; }
  function announce(msg) {
    var c = core();
    if (c) c.announce(msg);
  }

  function criarTabuleiroVazio() {
    var b = [];
    for (var r = 0; r < BOARD_SIZE; r += 1) {
      b.push(new Array(BOARD_SIZE).fill(null));
    }
    return b;
  }

  function limitesDaPeca(peca) {
    var maxR = 0, maxC = 0;
    peca.celulas.forEach(function (cel) {
      if (cel[0] > maxR) maxR = cel[0];
      if (cel[1] > maxC) maxC = cel[1];
    });
    return { altura: maxR + 1, largura: maxC + 1 };
  }

  function podePosicionar(tab, peca, origemL, origemC) {
    for (var i = 0; i < peca.celulas.length; i += 1) {
      var r = origemL + peca.celulas[i][0];
      var c = origemC + peca.celulas[i][1];
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
      if (tab[r][c] !== null) return false;
    }
    return true;
  }

  function existeEncaixe(tab, peca) {
    var lim = limitesDaPeca(peca);
    for (var r = 0; r <= BOARD_SIZE - lim.altura; r += 1) {
      for (var c = 0; c <= BOARD_SIZE - lim.largura; c += 1) {
        if (podePosicionar(tab, peca, r, c)) return true;
      }
    }
    return false;
  }

  function sortearPeca() {
    var t = PIECE_TEMPLATES[Math.floor(Math.random() * PIECE_TEMPLATES.length)];
    return {
      id: t.id + '-' + Date.now() + '-' + Math.floor(Math.random() * 1e6),
      nome: t.nome, cor: t.cor,
      celulas: t.celulas.map(function (c) { return [c[0], c[1]]; })
    };
  }

  function limparLinhasEColunas(tab) {
    var linhas = [], colunas = [], r, c;
    for (r = 0; r < BOARD_SIZE; r += 1) {
      var cheia = true;
      for (c = 0; c < BOARD_SIZE; c += 1) { if (tab[r][c] === null) { cheia = false; break; } }
      if (cheia) linhas.push(r);
    }
    for (c = 0; c < BOARD_SIZE; c += 1) {
      var cheiaC = true;
      for (r = 0; r < BOARD_SIZE; r += 1) { if (tab[r][c] === null) { cheiaC = false; break; } }
      if (cheiaC) colunas.push(c);
    }
    linhas.forEach(function (row) { for (var k = 0; k < BOARD_SIZE; k += 1) tab[row][k] = null; });
    colunas.forEach(function (col) { for (var k2 = 0; k2 < BOARD_SIZE; k2 += 1) tab[k2][col] = null; });
    return linhas.length + colunas.length;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  function initBlockWoodGame() {
    var stage = document.querySelector('[data-screen="block-wood"] .game-stage');
    if (!stage) return;
    var reg = window.__gameRuntimeRegistry || (window.__gameRuntimeRegistry = {});
    if (reg['block-wood'] && reg['block-wood'].stage === stage && reg['block-wood'].ativo) return;
    if (reg['block-wood'] && typeof reg['block-wood'].cleanup === 'function') {
      try { reg['block-wood'].cleanup(); } catch (e) {}
    }

    var c = core();
    if (c) c.countPlay('block-wood');

    stage.innerHTML = '';
    var root = el('div', 'block-game');
    root.setAttribute('data-block-game', '1');

    // Instruções iniciais
    var intro = el('section', 'game-intro', null);
    intro.setAttribute('aria-label', 'Como jogar Block Wood Puzzle');
    intro.innerHTML =
      '<h3>Como jogar</h3>' +
      '<ol>' +
      '<li><strong>Objetivo:</strong> encaixe as 3 peças no tabuleiro 9x9 e complete linhas ou colunas inteiras para removê-las e somar pontos.</li>' +
      '<li><strong>Mouse/toque:</strong> arraste uma peça até o tabuleiro ou toque na peça e depois toque na casa de destino.</li>' +
      '<li><strong>Teclado:</strong> pressione <kbd>1</kbd>, <kbd>2</kbd> ou <kbd>3</kbd> para escolher a peça, use as <kbd>setas</kbd> para mover o cursor e <kbd>Enter</kbd> para posicionar.</li>' +
      '<li><strong>Fim de jogo:</strong> se nenhuma peça couber, a partida termina. Tente bater seu recorde!</li>' +
      '</ol>';
    var startBtn = el('button', 'primary-button', 'Começar a jogar');
    startBtn.type = 'button';
    startBtn.id = 'block-start';
    intro.appendChild(startBtn);

    // HUD
    var hud = el('div', 'block-topbar');
    var scoreBox = el('div', 'stat-box');
    scoreBox.innerHTML = 'Pontuação: <span id="block-score">0</span>';
    var bestBox = el('div', 'stat-box');
    bestBox.innerHTML = 'Recorde: <span id="block-best">0</span>';
    var linesBox = el('div', 'stat-box');
    linesBox.innerHTML = 'Linhas: <span id="block-lines">0</span>';
    var statusBox = el('div', 'stat-box status-box', 'Escolha uma peça');
    statusBox.id = 'block-status';
    statusBox.setAttribute('role', 'status');
    statusBox.setAttribute('aria-live', 'polite');
    var resetBtn = el('button', 'primary-button', 'Reiniciar');
    resetBtn.type = 'button';
    resetBtn.id = 'block-reset';
    hud.appendChild(scoreBox); hud.appendChild(bestBox); hud.appendChild(linesBox); hud.appendChild(resetBtn);

    var grid = el('div', 'block-grid');
    var boardWrap = el('div', 'block-board-wrap');
    var boardEl = el('div', 'block-board');
    boardEl.id = 'block-board';
    boardEl.setAttribute('role', 'grid');
    boardEl.setAttribute('aria-label', 'Tabuleiro 9 por 9. Use as setas e Enter para posicionar a peça selecionada.');
    boardEl.tabIndex = 0;
    var previewLayer = el('div', 'block-preview-layer');
    previewLayer.id = 'block-preview-layer';
    previewLayer.setAttribute('aria-hidden', 'true');
    boardWrap.appendChild(boardEl);
    boardWrap.appendChild(previewLayer);

    var traySide = el('div', 'block-side');
    var trayLabel = el('p', 'tray-label', 'Peças disponíveis (teclas 1, 2 e 3):');
    trayLabel.id = 'block-tray-label';
    var trayEl = el('div', 'block-tray');
    trayEl.id = 'block-tray';
    trayEl.setAttribute('role', 'listbox');
    trayEl.setAttribute('aria-labelledby', 'block-tray-label');
    var tips = el('p', 'block-tips', 'Dica: guarde espaço para peças grandes. Completar várias linhas de uma vez vale bônus de 50 pontos por linha.');
    traySide.appendChild(trayLabel); traySide.appendChild(trayEl); traySide.appendChild(tips);

    grid.appendChild(boardWrap); grid.appendChild(traySide);
    root.appendChild(intro); root.appendChild(hud); root.appendChild(grid);
    root.appendChild(statusBox);
    stage.appendChild(root);

    var state = {
      tab: criarTabuleiroVazio(),
      pecas: [], ativo: 0, pontos: 0, linhas: 0, jogadas: 0,
      cursor: { l: 4, c: 4 }, jogando: false, terminado: false,
      arrastando: false, pecaArrasto: null, origemArrasto: null
    };

    var cellEls = [];
    (function construirCelulas() {
      boardEl.innerHTML = '';
      for (var r = 0; r < BOARD_SIZE; r += 1) {
        for (var q = 0; q < BOARD_SIZE; q += 1) {
          (function (rr, cc) {
            var cell = el('button', 'block-cell');
            cell.type = 'button';
            cell.setAttribute('role', 'gridcell');
            cell.setAttribute('aria-label', 'Linha ' + (rr + 1) + ', coluna ' + (cc + 1));
            cell.dataset.linha = String(rr);
            cell.dataset.coluna = String(cc);
            cell.addEventListener('click', function () { tentarPosicionar(rr, cc); });
            cell.addEventListener('mousemove', function () {
              if (state.arrastando || !state.jogando || state.terminado) return;
              state.cursor = { l: rr, c: cc };
              desenharCursorEPreview();
            });
            boardEl.appendChild(cell);
            cellEls.push(cell);
          })(r, q);
        }
      }
    })();

    function setStatus(msg) { statusBox.textContent = msg; }

    function atualizarHud() {
      var s = document.getElementById('block-score');
      var l = document.getElementById('block-lines');
      var b = document.getElementById('block-best');
      if (s) s.textContent = String(state.pontos);
      if (l) l.textContent = String(state.linhas);
      if (b) b.textContent = String(c ? c.getBest('block-wood') : 0);
    }

    function pintarTabuleiro() {
      for (var i = 0; i < cellEls.length; i += 1) {
        var r = Math.floor(i / BOARD_SIZE), cc = i % BOARD_SIZE;
        var cell = cellEls[i];
        var v = state.tab[r][cc];
        cell.classList.toggle('filled', v !== null);
        cell.style.background = v !== null ? v : '';
        var isCursor = (state.cursor.l === r && state.cursor.c === cc);
        cell.classList.toggle('cursor', isCursor);
        cell.classList.remove('preview-valid', 'preview-invalid');
      }
    }

    function desenharCursorEPreview() {
      pintarTabuleiro();
      previewLayer.innerHTML = '';
      var peca = state.pecas[state.ativo];
      if (!peca || !state.jogando || state.terminado) return;
      var lim = limitesDaPeca(peca);
      var origemL = state.cursor.l - Math.floor(lim.altura / 2);
      var origemC = state.cursor.c - Math.floor(lim.largura / 2);
      var valido = podePosicionar(state.tab, peca, origemL, origemC);
      peca.celulas.forEach(function (cel) {
        var r = origemL + cel[0], cc = origemC + cel[1];
        if (r < 0 || r >= BOARD_SIZE || cc < 0 || cc >= BOARD_SIZE) return;
        var idx = r * BOARD_SIZE + cc;
        cellEls[idx].classList.add(valido ? 'preview-valid' : 'preview-invalid');
      });
    }

    function desenharBandeja() {
      trayEl.innerHTML = '';
      state.pecas.forEach(function (peca, index) {
        var item = el('div', 'block-piece' + (index === state.ativo ? ' active' : ''));
        item.setAttribute('role', 'option');
        item.setAttribute('tabindex', '0');
        item.setAttribute('aria-selected', String(index === state.ativo));
        item.setAttribute('aria-label', 'Peça ' + (index + 1) + ': ' + peca.nome + (existeEncaixe(state.tab, peca) ? '' : ' (sem espaço no momento)'));
        item.dataset.pieceIndex = String(index);
        var mini = el('div', 'block-piece-grid');
        mini.setAttribute('aria-hidden', 'true');
        var lim = limitesDaPeca(peca);
        for (var r = 0; r < lim.altura; r += 1) {
          for (var cc = 0; cc < lim.largura; cc += 1) {
            var tem = peca.celulas.some(function (k) { return k[0] === r && k[1] === cc; });
            var m = el('span', 'block-piece-grid-cell' + (tem ? ' filled' : ''));
            if (tem) m.style.background = peca.cor;
            m.style.gridRow = String(r + 1);
            m.style.gridColumn = String(cc + 1);
            mini.appendChild(m);
          }
        }
        mini.style.gridTemplateColumns = 'repeat(' + lim.largura + ', 18px)';
        var nome = el('span', 'block-piece-name', (index + 1) + ' · ' + peca.nome);
        item.appendChild(mini); item.appendChild(nome);
        if (!existeEncaixe(state.tab, peca)) item.classList.add('sem-espaco');
        trayEl.appendChild(item);
      });
    }

    function reporPecas() {
      state.pecas = [sortearPeca(), sortearPeca(), sortearPeca()];
      state.ativo = 0;
      // Garante variedade: se as 3 não couberem num tabuleiro vazio (raro), tenta de novo
      desenharBandeja();
    }

    function verificarFim() {
      if (state.pecas.length === 0) return false;
      var alguma = state.pecas.some(function (p) { return existeEncaixe(state.tab, p); });
      if (!alguma) {
        state.terminado = true;
        var recorde = false;
        if (c) recorde = c.setBest('block-wood', state.pontos);
        pintarTabuleiro(); desenharBandeja();
        setStatus('Fim de jogo! Pontuação final: ' + state.pontos + ' pontos.');
        announce('Fim de jogo no Block Wood Puzzle. Pontuação final: ' + state.pontos + ' pontos.' + (recorde ? ' Novo recorde!' : ''));
        if (window.portalModal && typeof window.portalModal.open === 'function') {
          window.portalModal.open(
            'Fim de jogo',
            'Sua pontuação foi ' + state.pontos + ' pontos em ' + state.jogadas + ' jogadas, com ' + state.linhas + ' linhas/colunas removidas.' + (recorde ? ' Novo recorde!' : ''),
            'Jogar novamente',
            function () { reiniciar(); },
            function () {}
          );
        }
        return true;
      }
      return false;
    }

    function tentarPosicionar(linha, coluna) {
      if (!state.jogando || state.terminado) return;
      var peca = state.pecas[state.ativo];
      if (!peca) { setStatus('Escolha uma peça da bandeja.'); return; }
      var lim = limitesDaPeca(peca);
      var origemL = linha - Math.floor(lim.altura / 2);
      var origemC = coluna - Math.floor(lim.largura / 2);
      if (!podePosicionar(state.tab, peca, origemL, origemC)) {
        setStatus('Movimento inválido: a peça ' + peca.nome + ' não cabe na linha ' + (linha + 1) + ', coluna ' + (coluna + 1) + '. Escolha outro local.');
        announce('Movimento inválido. A peça não cabe nessa posição.');
        desenharCursorEPreview();
        return;
      }
      peca.celulas.forEach(function (cel) { state.tab[origemL + cel[0]][origemC + cel[1]] = peca.cor; });
      var base = peca.celulas.length * 8;
      var limp = limparLinhasEColunas(state.tab);
      var bonus = limp > 0 ? limp * 50 + (limp >= 2 ? 50 : 0) : 0;
      state.pontos += base + bonus;
      state.linhas += limp;
      state.jogadas += 1;
      if (c) {
        if (state.pontos >= 200) c.unlock('bloco-200');
        if (state.pontos >= 500) c.unlock('bloco-500');
        if (limp >= 2) c.unlock('bloco-limpeza-dupla');
      }
      state.pecas.splice(state.ativo, 1);
      if (state.pecas.length === 0) reporPecas();
      else state.ativo = Math.min(state.ativo, state.pecas.length - 1);
      state.cursor = { l: Math.min(8, Math.max(0, linha)), c: Math.min(8, Math.max(0, coluna)) };
      atualizarHud(); pintarTabuleiro(); desenharBandeja(); desenharCursorEPreview();
      var msg = '+' + (base + bonus) + ' pontos. Peça ' + peca.nome + ' posicionada.';
      if (limp > 0) msg += ' ' + limp + (limp === 1 ? ' linha/coluna removida!' : ' linhas/colunas removidas! Bônus!');
      setStatus(msg);
      announce(msg + ' Total: ' + state.pontos + ' pontos.');
      verificarFim();
    }

    function selecionarPeca(i) {
      if (!state.pecas[i]) return;
      state.ativo = i;
      desenharBandeja(); desenharCursorEPreview();
      setStatus('Peça ' + (i + 1) + ' selecionada: ' + state.pecas[i].nome + '. Escolha uma posição no tabuleiro.');
    }

    function reiniciar() {
      state.tab = criarTabuleiroVazio();
      state.pontos = 0; state.linhas = 0; state.jogadas = 0;
      state.cursor = { l: 4, c: 4 };
      state.terminado = false; state.jogando = true;
      reporPecas();
      atualizarHud(); pintarTabuleiro(); desenharBandeja(); desenharCursorEPreview();
      setStatus('Novo jogo! Selecione uma peça e posicione no tabuleiro.');
      announce('Novo jogo do Block Wood Puzzle iniciado.');
      boardEl.focus();
    }

    // Eventos da bandeja: clique, teclado e arrasto (mouse/toque)
    function onTrayClick(e) {
      var item = e.target.closest ? e.target.closest('.block-piece') : null;
      if (!item) return;
      selecionarPeca(Number(item.dataset.pieceIndex));
    }
    function onTrayKey(e) {
      var item = e.target.closest ? e.target.closest('.block-piece') : null;
      if (!item) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selecionarPeca(Number(item.dataset.pieceIndex)); }
    }
    function onTrayPointerDown(e) {
      var item = e.target.closest ? e.target.closest('.block-piece') : null;
      if (!item || !state.jogando || state.terminado) return;
      var idx = Number(item.dataset.pieceIndex);
      state.ativo = idx; state.arrastando = true;
      state.pecaArrasto = state.pecas[idx];
      desenharBandeja();
      if (e.pointerId !== undefined) { try { boardEl.setPointerCapture(e.pointerId); } catch (err) {} }
      e.preventDefault();
    }
    function pontoParaCasa(clientX, clientY) {
      var rect = boardEl.getBoundingClientRect();
      if (clientX < rect.left - 40 || clientX > rect.right + 40 || clientY < rect.top - 40 || clientY > rect.bottom + 40) return null;
      var relX = Math.min(Math.max(clientX - rect.left, 0), rect.width - 1);
      var relY = Math.min(Math.max(clientY - rect.top, 0), rect.height - 1);
      return {
        l: Math.floor(relY / (rect.height / BOARD_SIZE)),
        c: Math.floor(relX / (rect.width / BOARD_SIZE))
      };
    }
    function onStagePointerMove(e) {
      if (!state.arrastando || !state.pecaArrasto) return;
      var casa = pontoParaCasa(e.clientX, e.clientY);
      if (casa) { state.cursor = casa; desenharCursorEPreview(); }
    }
    function onStagePointerUp(e) {
      if (!state.arrastando) return;
      state.arrastando = false;
      var casa = pontoParaCasa(e.clientX, e.clientY);
      state.pecaArrasto = null;
      if (casa) tentarPosicionar(casa.l, casa.c);
      else desenharCursorEPreview();
    }
    function onBoardKey(e) {
      if (!state.jogando || state.terminado) return;
      var handled = true;
      if (e.key === 'ArrowUp') state.cursor.l = Math.max(0, state.cursor.l - 1);
      else if (e.key === 'ArrowDown') state.cursor.l = Math.min(8, state.cursor.l + 1);
      else if (e.key === 'ArrowLeft') state.cursor.c = Math.max(0, state.cursor.c - 1);
      else if (e.key === 'ArrowRight') state.cursor.c = Math.min(8, state.cursor.c + 1);
      else if (e.key === 'Enter' || e.key === ' ') tentarPosicionar(state.cursor.l, state.cursor.c);
      else if (e.key === '1' || e.key === '2' || e.key === '3') selecionarPeca(Number(e.key) - 1);
      else handled = false;
      if (handled) { e.preventDefault(); desenharCursorEPreview(); }
    }
    function onDocKey(e) {
      if (!stage.closest('.screen.active')) return;
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        if (state.jogando && !state.terminado) selecionarPeca(Number(e.key) - 1);
      }
    }

    startBtn.addEventListener('click', function () {
      state.jogando = true;
      intro.classList.add('concluida');
      intro.style.display = 'none';
      setStatus('Jogo iniciado! Selecione uma peça e posicione no tabuleiro.');
      announce('Jogo iniciado. Selecione uma peça.');
      boardEl.focus();
    });
    resetBtn.addEventListener('click', reiniciar);
    trayEl.addEventListener('click', onTrayClick);
    trayEl.addEventListener('keydown', onTrayKey);
    trayEl.addEventListener('pointerdown', onTrayPointerDown);
    stage.addEventListener('pointermove', onStagePointerMove);
    stage.addEventListener('pointerup', onStagePointerUp);
    stage.addEventListener('pointercancel', function () { state.arrastando = false; state.pecaArrasto = null; });
    boardEl.addEventListener('keydown', onBoardKey);
    document.addEventListener('keydown', onDocKey);

    reg['block-wood'] = {
      stage: stage, ativo: true,
      cleanup: function () {
        this.ativo = false;
        trayEl.removeEventListener('click', onTrayClick);
        trayEl.removeEventListener('keydown', onTrayKey);
        trayEl.removeEventListener('pointerdown', onTrayPointerDown);
        stage.removeEventListener('pointermove', onStagePointerMove);
        stage.removeEventListener('pointerup', onStagePointerUp);
        boardEl.removeEventListener('keydown', onBoardKey);
        document.removeEventListener('keydown', onDocKey);
        resetBtn.removeEventListener('click', reiniciar);
      }
    };

    // Estado inicial: tabuleiro visível, aguardando início
    reporPecas();
    atualizarHud(); pintarTabuleiro(); desenharBandeja();
    setStatus('Pressione "Começar a jogar" para iniciar.');
  }

  window.initBlockWoodGame = initBlockWoodGame;
})();
