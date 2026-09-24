# Card Duels — V6 Modular

Esta branch contém a nova arquitetura modular do projeto **Card Duels**.

## Estrutura

- `index.html` — menu principal
- `duelo.html` — batalha
- `campanha.html` — campanha
- `colecao.html` — coleção de cartas e importação JSON
- `baralho.html` — construção do baralho
- `css/` — estilos separados por área
- `js/` — módulos de banco de dados, cartas, inventário, baralho, batalha e campanha
- `versoes/` — versões históricas e protótipos anteriores

## Conceitos

**Coleção** é o conjunto de cartas existentes no banco do jogo e é onde ocorre a importação do JSON.

**Inventário** representa as cartas que o jogador possui.

**Baralho** é a seleção de exatamente 25 cartas do inventário usada nas batalhas.

As versões dentro de `versoes/` são mantidas como referência e não fazem parte da arquitetura principal do V6 Modular.
