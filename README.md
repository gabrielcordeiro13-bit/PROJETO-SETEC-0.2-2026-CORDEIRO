# SETEC 2026 — Portal de Experiências Tecnológicas

Projeto educacional do 2º ano de Desenvolvimento de Sistemas (Colégio Estadual Barbosa Ferraz).

## O que é
Portal de jogos em **HTML, CSS e JavaScript puro** (sem frameworks, sem backend, sem build):
- **Block Wood Puzzle** — encaixe de peças em tabuleiro 9×9 (mouse, toque e teclado)
- **Pac-Man do laboratório** — labirinto original em Canvas com túneis laterais, oito pontos de energia, quatro fantasmas, animação de morte e fases
- **Jogo da Forca** — palavras de tecnologia/educação com dicas, teclado físico e virtual

## Tecnologias e conceitos realmente usados
- HTML semântico (`header`, `main`, `section`, `nav`, `footer`), Canvas 2D
- CSS responsivo (mobile, tablet, desktop), animações com respeito a `prefers-reduced-motion`
- JavaScript: DOM, eventos (teclado/mouse/toque/pointer), `requestAnimationFrame`, estado de jogo, Canvas
- Logo original do Colégio Barbosa Ferraz como marca-d'água fixa e decorativa, servida localmente em `img/logoBarbosa.png`
- Áudio do Pac-Man: efeitos e música retrô original sintetizados localmente com Web Audio, sem gravações ou arquivos externos
- `localStorage` apenas no navegador: recordes, conquistas e preferências de acessibilidade (sem cadastro, sem dados pessoais)
- Acessibilidade: skip link, foco visível, `aria-live` para placar/resultado, alvos de toque ≥ 44px, painel com tamanho de texto, alto contraste, destaque de foco e redução de movimento

## Como rodar
Abra `index.html` no navegador ou publique a pasta no GitHub Pages (caminhos relativos, sem backend).

## Estrutura
- `index.html` — portal (início, biblioteca, progresso, sobre, 3 telas de jogo)
- `css/style.css` — identidade arcade + responsivo + acessibilidade
- `js/setec-core.js` — armazenamento local, conquistas, preferências, live region
- `js/block-wood.js`, `js/pacman.js`, `js/hangman.js` — um arquivo por jogo
- `js/main.js` — navegação entre telas e modal acessível
- `js/intro.js` — tela de entrada cinematográfica (overlay de intro com partículas em canvas, parallax ao cursor, fantasmas e pílulas dos três jogos; "ENTRAR NO PORTAL" leva ao menu, "PULAR INTRODUÇÃO" disponível e respeita `prefers-reduced-motion`)

## Diretrizes para manutenção com IA (regras permanentes)

Esta seção registra as regras que qualquer IA de programação deve seguir ao modificar este projeto.

### Antes de alterar
1. Fazer uma **análise rápida** dos arquivos HTML, CSS e JavaScript, principalmente do `index.html` e dos arquivos diretamente relacionados à solicitação.
2. **Não** realizar auditorias demoradas ou análises de arquivos sem relação com a tarefa.
3. Interpretar cuidadosamente o que foi solicitado, respeitar os limites do pedido e **não** implementar funcionalidades adicionais por iniciativa própria.

### Durante a alteração
4. Preservar a estrutura, a identidade visual, as funcionalidades e os componentes já existentes (fundos animados, neon, acessibilidade, responsividade).
5. Modificar **somente o necessário** para atender à solicitação — priorizar edições pontuais em vez de reconstruções.
6. Manter o código organizado, legível, consistente e compatível com HTML/CSS/JS puro já usados no projeto (sem frameworks, sem build).
7. Ao trabalhar com fontes, cores, espaçamentos e componentes visuais, preservar a harmonia e a identidade arcade do projeto. A fonte pixelada (`--fonte-arcade`, "Press Start 2P") é reservada a títulos de destaque; textos de leitura usam `--fonte-leitura`.

### Ao finalizar
8. Revisar novamente os arquivos JS, CSS e HTML relacionados às mudanças, procurando erros de sintaxe, conflitos de estilo e bugs.
9. **Não** considerar a tarefa concluída sem verificar que as alterações foram aplicadas corretamente e que as funcionalidades existentes continuam funcionando.
