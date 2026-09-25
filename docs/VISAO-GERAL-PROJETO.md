# Um Mundo Além das Páginas — Card Duels

## Visão geral

Projeto pessoal, local e offline de batalhas com cartas de personagens criadas pelo usuário. O objetivo é dar vida aos personagens do universo Um Mundo Além das Páginas sem transformar o projeto em um card game excessivamente complexo.

## Princípio central

**O personagem é o centro; o sistema existe para dar vida ao personagem.**

As cartas devem permanecer visualmente limpas durante a batalha. Atributos e habilidades aparecem na ficha do personagem quando a carta é selecionada.

## Fluxo

Criador de Cartas → Álbum → JSON otimizado → Card Duels → IndexedDB → Coleção → Inventário → Baralho → Batalha / Campanha.

## Objetivos do V6 Modular

- arquitetura modular;
- jogo local/offline;
- IndexedDB como persistência;
- suporte ao JSON otimizado do Álbum;
- preservação de originalId e collectionId;
- cartas visualmente limpas;
- ficha do personagem ao clicar na carta;
- campanha, batalha rápida e replay;
- versões históricas separadas da arquitetura atual.

## Evolução

A evolução das cartas é principalmente visual, como skins de RPG. Uma personagem pode possuir versões visuais diferentes sem precisar de níveis numéricos.
