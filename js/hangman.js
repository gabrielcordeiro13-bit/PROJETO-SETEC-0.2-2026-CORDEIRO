/* SETEC 2026 - Jogo da Forca: palavras de tecnologia/educação, teclado físico
 * e virtual, pontuação, sequência e recorde local. */
(function () {
  'use strict';

  var PALAVRAS = [
    // Programação
    { categoria: 'Programação', palavra: 'ALGORITMO', dica: 'Passo a passo lógico para resolver um problema.' },
    { categoria: 'Programação', palavra: 'VARIAVEL', dica: 'Guarda um valor que pode mudar no programa.' },
    { categoria: 'Programação', palavra: 'FUNCAO', dica: 'Bloco de código reutilizável que executa uma tarefa.' },
    { categoria: 'Programação', palavra: 'ARRAY', dica: 'Lista que guarda vários valores em ordem.' },
    { categoria: 'Programação', palavra: 'OBJETO', dica: 'Estrutura com dados e ações organizadas por chaves.' },
    { categoria: 'Programação', palavra: 'CODIGO', dica: 'Texto com instruções que o computador executa.' },
    // Tecnologia
    { categoria: 'Tecnologia', palavra: 'HTML', dica: 'Marca o conteúdo das páginas da web.' },
    { categoria: 'Tecnologia', palavra: 'CSS', dica: 'Define cores, layout e estilo das páginas.' },
    { categoria: 'Tecnologia', palavra: 'JAVASCRIPT', dica: 'Deixa páginas interativas e cria jogos na web.' },
    { categoria: 'Tecnologia', palavra: 'NAVEGADOR', dica: 'Programa usado para abrir sites.' },
    { categoria: 'Tecnologia', palavra: 'SERVIDOR', dica: 'Computador que entrega sites e dados pela rede.' },
    { categoria: 'Tecnologia', palavra: 'BATERIA', dica: 'Armazena a energia de celulares e notebooks.' },
    // Ciência
    { categoria: 'Ciência', palavra: 'EXPERIMENTO', dica: 'Teste feito para descobrir como algo funciona.' },
    { categoria: 'Ciência', palavra: 'ATOMO', dica: 'Parte muito pequena que forma todas as coisas.' },
    { categoria: 'Ciência', palavra: 'GRAVIDADE', dica: 'Força que puxa tudo para o chão.' },
    { categoria: 'Ciência', palavra: 'MICROSCOPIO', dica: 'Instrumento que amplia coisas minúsculas.' },
    // Jogos
    { categoria: 'Jogos', palavra: 'JOYSTICK', dica: 'Controle usado para jogar.' },
    { categoria: 'Jogos', palavra: 'FASE', dica: 'Etapa ou nível de um jogo.' },
    { categoria: 'Jogos', palavra: 'PONTUACAO', dica: 'Total de pontos que o jogador conquista.' },
    { categoria: 'Jogos', palavra: 'AVATAR', dica: 'Personagem que representa o jogador.' },
    // Inteligência artificial
    { categoria: 'Inteligência Artificial', palavra: 'ROBO', dica: 'Máquina programada para executar tarefas.' },
    { categoria: 'Inteligência Artificial', palavra: 'DADOS', dica: 'Informações usadas para treinar sistemas inteligentes.' },
    { categoria: 'Inteligência Artificial', palavra: 'MODELO', dica: 'Sistema treinado que aprende padrões e responde.' },
    // Segurança digital
    { categoria: 'Segurança Digital', palavra: 'SENHA', dica: 'Código secreto que protege contas.' },
    { categoria: 'Segurança Digital', palavra: 'ANTIVIRUS', dica: 'Programa que protege contra ameaças digitais.' },
    { categoria: 'Segurança Digital', palavra: 'PRIVACIDADE', dica: 'Direito de controlar os próprios dados.' },
    // Espaço
    { categoria: 'Espaço', palavra: 'PLANETA', dica: 'Corpo celeste como a Terra que orbita uma estrela.' },
    { categoria: 'Espaço', palavra: 'ASTRONAUTA', dica: 'Pessoa que viaja para o espaço.' },
    { categoria: 'Espaço', palavra: 'SATELITE', dica: 'Objeto que orbita a Terra e ajuda na comunicação.' },
    { categoria: 'Espaço', palavra: 'GALAXIA', dica: 'Conjunto gigante de estrelas, como a Via Láctea.' },
    // Sustentabilidade
    { categoria: 'Sustentabilidade', palavra: 'RECICLAGEM', dica: 'Transforma materiais usados em novos produtos.' },
    { categoria: 'Sustentabilidade', palavra: 'ENERGIA SOLAR', dica: 'Eletricidade gerada a partir da luz do sol.' },
    { categoria: 'Sustentabilidade', palavra: 'FLORESTA', dica: 'Grande área cheia de árvores e vida.' },
    { categoria: 'Sustentabilidade', palavra: 'COMPOSTAGEM', dica: 'Transforma restos de comida em adubo natural.' }
  ];
  var MAX_ERROS = 6;

  function core() { return window.SetecCore || null; }
  function announce(m) { var c = core(); if (c) c.announce(m); }

  function dificuldadeDa(palavra) {
    var letras = palavra.replace(/[^A-Z]/g, '').length;
    if (letras <= 4) return 'Fácil';
    if (letras <= 7) return 'Média';
    return 'Difícil';
  }

  function criarUi(stage) {
    stage.innerHTML =
      '<div class="hangman-game">' +
      '<section class="game-intro" aria-label="Como jogar o Jogo da Forca">' +
      '<h3>Como jogar</h3>' +
      '<ol>' +
      '<li><strong>Objetivo:</strong> descubra a palavra secreta antes de completar o desenho (6 erros).</li>' +
      '<li><strong>Como tentar:</strong> toque nas letras na tela ou digite no teclado. Letras repetidas não contam.</li>' +
      '<li><strong>Dicas:</strong> cada palavra mostra a categoria e uma dica educativa.</li>' +
      '<li><strong>Pontos:</strong> acertos valem pontos, vitória sem erros vale bônus. Vitórias seguidas aumentam a sequência!</li>' +
      '</ol>' +
      '<button type="button" class="primary-button" id="hangman-start">Começar a jogar</button>' +
      '</section>' +
      '<div class="hangman-topbar">' +
      '<div class="stat-box">Tentativas: <span id="hangman-left">6</span></div>' +
      '<div class="stat-box">Erros: <span id="hangman-errors">0</span>/6</div>' +
      '<div class="stat-box">Pontos: <span id="hangman-score">0</span></div>' +
      '<div class="stat-box">Sequência: <span id="hangman-streak">0</span></div>' +
      '<div class="stat-box">Recorde: <span id="hangman-best">0</span></div>' +
      '<button type="button" class="primary-button" id="hangman-reset">Nova palavra</button>' +
      '</div>' +
      '<div class="hangman-area">' +
      '<div class="hangman-canvas-wrap">' +
      '<canvas id="hangman-canvas" width="240" height="240" role="img" aria-label="Desenho da forca com o progresso dos erros"></canvas>' +
      '</div>' +
      '<div class="hangman-panel">' +
      '<p class="hangman-meta" id="hangman-meta"></p>' +
      '<div class="word-display" id="word-display" role="status" aria-live="polite" aria-label="Palavra secreta"></div>' +
      '<p class="hint-box" id="hint-box"></p>' +
      '<p class="hangman-msg" id="hangman-msg" role="status" aria-live="polite"></p>' +
      '<div class="keyboard" id="keyboard" aria-label="Teclado com as letras de A a Z"></div>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  function initHangmanGame() {
    var stage = document.querySelector('[data-screen="hangman"] .game-stage');
    if (!stage) return;
    var reg = window.__gameRuntimeRegistry || (window.__gameRuntimeRegistry = {});
    if (reg.hangman && reg.hangman.stage === stage && reg.hangman.ativo) return;
    if (reg.hangman && typeof reg.hangman.cleanup === 'function') {
      try { reg.hangman.cleanup(); } catch (e) {}
    }
    var c = core();
    if (c) c.countPlay('hangman');

    criarUi(stage);

    var canvas = document.getElementById('hangman-canvas');
    var ctx = canvas.getContext('2d');
    var wordDisplay = document.getElementById('word-display');
    var keyboard = document.getElementById('keyboard');
    var hintBox = document.getElementById('hint-box');
    var meta = document.getElementById('hangman-meta');
    var msg = document.getElementById('hangman-msg');
    var errorsEl = document.getElementById('hangman-errors');
    var leftEl = document.getElementById('hangman-left');
    var scoreEl = document.getElementById('hangman-score');
    var streakEl = document.getElementById('hangman-streak');
    var bestEl = document.getElementById('hangman-best');

    var item = null, tentadas = [], erros = 0, fim = false, jogando = false;
    var pontos = 0, sequencia = 0;
    if (c) sequencia = Number(c.getState().vitoriasForcaSeq) || 0;

    function hud() {
      errorsEl.textContent = String(erros);
      leftEl.textContent = String(MAX_ERROS - erros);
      scoreEl.textContent = String(pontos);
      streakEl.textContent = String(sequencia);
      bestEl.textContent = String(c ? c.getBest('hangman') : 0);
    }

    function sortear() {
      var disponiveis = PALAVRAS.filter(function (p) { return p.palavra !== (item && item.palavra); });
      item = disponiveis[Math.floor(Math.random() * disponiveis.length)];
      tentadas = []; erros = 0; fim = false;
    }

    function desenharForca() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#21d4ff';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(30, 210); ctx.lineTo(190, 210);
      ctx.moveTo(60, 210); ctx.lineTo(60, 30);
      ctx.lineTo(150, 30); ctx.lineTo(150, 55);
      ctx.stroke();
      ctx.strokeStyle = '#ffd429';
      var partes = [
        function () { ctx.beginPath(); ctx.arc(150, 75, 20, 0, Math.PI * 2); ctx.stroke(); },
        function () { ctx.beginPath(); ctx.moveTo(150, 95); ctx.lineTo(150, 150); ctx.stroke(); },
        function () { ctx.beginPath(); ctx.moveTo(150, 110); ctx.lineTo(120, 128); ctx.stroke(); },
        function () { ctx.beginPath(); ctx.moveTo(150, 110); ctx.lineTo(180, 128); ctx.stroke(); },
        function () { ctx.beginPath(); ctx.moveTo(150, 150); ctx.lineTo(125, 185); ctx.stroke(); },
        function () { ctx.beginPath(); ctx.moveTo(150, 150); ctx.lineTo(175, 185); ctx.stroke(); }
      ];
      for (var i = 0; i < erros && i < partes.length; i += 1) partes[i]();
    }

    function renderPalavra() {
      wordDisplay.innerHTML = '';
      var letras = item.palavra.split('');
      var progresso = [];
      letras.forEach(function (ch) {
        if (ch === ' ') {
          var esp = document.createElement('span');
          esp.className = 'word-space';
          esp.textContent = ' ';
          wordDisplay.appendChild(esp);
          progresso.push(' ');
          return;
        }
        var cell = document.createElement('span');
        cell.className = 'word-letter';
        var revelada = tentadas.indexOf(ch) >= 0;
        cell.textContent = revelada ? ch : '_';
        if (!revelada) cell.setAttribute('aria-hidden', 'true');
        wordDisplay.appendChild(cell);
        progresso.push(revelada ? ch : '_');
      });
      wordDisplay.setAttribute('aria-label', 'Palavra: ' + progresso.join(' '));
    }

    function renderTeclado() {
      keyboard.innerHTML = '';
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function (letra) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'key-button';
        b.textContent = letra;
        b.setAttribute('aria-label', 'Letra ' + letra);
        var usada = tentadas.indexOf(letra) >= 0;
        b.disabled = usada || fim || !jogando;
        if (usada) {
          b.classList.add('used');
          b.classList.add(item.palavra.indexOf(letra) >= 0 ? 'correct' : 'incorrect');
          b.setAttribute('aria-pressed', 'true');
        }
        b.addEventListener('click', function () { tentar(letra); });
        keyboard.appendChild(b);
      });
    }

    function renderTudo() {
      meta.textContent = 'Categoria: ' + item.categoria + ' · Dificuldade: ' + dificuldadeDa(item.palavra) + ' · ' + item.palavra.replace(/[^A-Z]/g, '').length + ' letras';
      hintBox.textContent = 'Dica: ' + item.dica;
      renderPalavra(); renderTeclado(); desenharForca(); hud();
    }

    function setMsg(t) { msg.textContent = t; }

    function novaRodada(manterPontos) {
      sortear();
      if (manterPontos !== true) { /* pontos acumulam na sessão */ }
      renderTudo();
      setMsg('Escolha uma letra para começar. Restam ' + (MAX_ERROS - erros) + ' tentativas.');
    }

    function tentar(letra) {
      if (!jogando) { setMsg('Pressione "Começar a jogar" para iniciar.'); return; }
      if (fim) return;
      letra = String(letra || '').toUpperCase();
      if (!/^[A-Z]$/.test(letra)) return;
      if (tentadas.indexOf(letra) >= 0) {
        setMsg('A letra ' + letra + ' já foi usada. Tente outra letra.');
        announce('Letra ' + letra + ' repetida. Escolha outra.');
        return;
      }
      tentadas.push(letra);
      if (item.palavra.indexOf(letra) >= 0) {
        var ocorrencias = item.palavra.split('').filter(function (k) { return k === letra; }).length;
        var ganho = ocorrencias * 20;
        pontos += ganho;
        renderPalavra(); renderTeclado(); hud();
        var venceu = item.palavra.split('').every(function (k) { return k === ' ' || tentadas.indexOf(k) >= 0; });
        if (venceu) { vencer(); return; }
        setMsg('Boa! A letra ' + letra + ' aparece ' + ocorrencias + (ocorrencias === 1 ? ' vez' : ' vezes') + ' (+' + ganho + ' pontos).');
        announce('Acertou a letra ' + letra + '. ' + (MAX_ERROS - erros) + ' tentativas restantes.');
      } else {
        erros += 1;
        pontos = Math.max(0, pontos - 5);
        desenharForca(); renderTeclado(); hud();
        if (erros >= MAX_ERROS) { perder(); return; }
        setMsg('A letra ' + letra + ' não está na palavra. Restam ' + (MAX_ERROS - erros) + ' tentativas.');
        announce('Errou a letra ' + letra + '. Restam ' + (MAX_ERROS - erros) + ' tentativas.');
      }
    }

    function vencer() {
      fim = true;
      var bonus = erros === 0 ? 100 : 50;
      pontos += bonus;
      sequencia += 1;
      if (c) {
        c.getState().vitoriasForcaSeq = sequencia;
        c.save();
        c.setBest('hangman', pontos);
        c.unlock('forca-vitoria');
        if (erros === 0) c.unlock('forca-perfeita');
        if (sequencia >= 3) c.unlock('forca-sequencia-3');
      }
      renderTeclado(); hud();
      renderPalavra();
      var texto = 'Você acertou: ' + item.palavra + '. Bônus de +' + bonus + ' pontos. Total: ' + pontos + ' pontos. Sequência: ' + sequencia + '.';
      setMsg('Parabéns! ' + texto);
      announce('Vitória! ' + texto);
      if (window.portalModal && typeof window.portalModal.open === 'function') {
        window.portalModal.open('Parabéns, você venceu!', texto + ' Categoria: ' + item.categoria + '.', 'Próxima palavra',
          function () { fim = false; novaRodada(true); },
          function () {});
      }
    }

    function perder() {
      fim = true;
      sequencia = 0;
      if (c) {
        c.getState().vitoriasForcaSeq = 0;
        c.save();
        c.setBest('hangman', pontos);
      }
      // Revela a palavra
      item.palavra.split('').forEach(function (k) {
        if (k !== ' ' && tentadas.indexOf(k) < 0) tentadas.push(k);
      });
      renderPalavra(); renderTeclado(); hud();
      var texto = 'A palavra era: ' + item.palavra + ' (' + item.categoria + '). Dica: ' + item.dica + ' Total: ' + pontos + ' pontos.';
      setMsg('Não foi dessa vez. ' + texto);
      announce('Derrota. ' + texto);
      if (window.portalModal && typeof window.portalModal.open === 'function') {
        window.portalModal.open('Fim de jogo', texto, 'Tentar outra palavra',
          function () { fim = false; novaRodada(false); pontos = 0; hud(); },
          function () {});
      }
    }

    function onKey(e) {
      if (!stage.closest('.screen.active')) return;
      if (!jogando || fim || e.repeat) return;
      // Ignora quando o foco está em campo de texto (não há, mas por segurança)
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      var k = String(e.key || '').toUpperCase();
      if (/^[A-Z]$/.test(k)) { e.preventDefault(); tentar(k); }
    }

    document.getElementById('hangman-start').addEventListener('click', function (ev) {
      jogando = true;
      ev.currentTarget.closest('.game-intro').style.display = 'none';
      renderTeclado(); hud();
      setMsg('Jogo iniciado! Escolha uma letra.');
      announce('Jogo da Forca iniciado. Categoria: ' + item.categoria + '.');
      var first = keyboard.querySelector('.key-button:not(:disabled)');
      if (first) first.focus();
    });
    document.getElementById('hangman-reset').addEventListener('click', function () {
      if (!jogando) { setMsg('Pressione "Começar a jogar" primeiro.'); return; }
      fim = false;
      novaRodada(true);
      setMsg('Nova palavra sorteada! Categoria: ' + item.categoria + '.');
      announce('Nova palavra da categoria ' + item.categoria + '.');
    });
    document.addEventListener('keydown', onKey);

    reg.hangman = {
      stage: stage, ativo: true,
      cleanup: function () {
        this.ativo = false;
        document.removeEventListener('keydown', onKey);
      }
    };

    sortear();
    renderTudo();
    setMsg('Pressione "Começar a jogar" para iniciar a partida.');
  }

  window.initHangmanGame = initHangmanGame;
})();
