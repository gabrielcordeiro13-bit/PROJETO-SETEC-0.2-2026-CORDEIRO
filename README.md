# SETEC 2026 — Portal de Experiências Tecnológicas

Projeto educacional do 2º ano de Desenvolvimento de Sistemas (Colégio Estadual Barbosa Ferraz).

## O que é
Portal de jogos em **HTML, CSS e JavaScript puro** (sem frameworks, sem backend, sem build):
- **Block Wood Puzzle** — encaixe de peças em tabuleiro 9×9 (mouse, toque e teclado)
- **Pac-Man do laboratório** — labirinto em Canvas com pellets, energia, 3 fantasmas, vidas e fases
- **Jogo da Forca** — palavras de tecnologia/educação com dicas, teclado físico e virtual

## Tecnologias e conceitos realmente usados
- HTML semântico (`header`, `main`, `section`, `nav`, `footer`), Canvas 2D
- CSS responsivo (mobile, tablet, desktop), animações com respeito a `prefers-reduced-motion`
- JavaScript: DOM, eventos (teclado/mouse/toque/pointer), `requestAnimationFrame`, estado de jogo, Canvas
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
