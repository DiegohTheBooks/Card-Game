# Arquitetura V6 Modular

## Estrutura

- index.html — menu principal
- duelo.html — batalha
- campanha.html — campanha
- colecao.html — coleção e importação
- baralho.html — construção do baralho
- css/ — estilos
- js/ — módulos de dados, cartas, inventário, baralho, batalha e campanha
- versions/ — versões históricas e protótipos
- docs/ — documentação permanente

## Persistência

IndexedDB é a base de persistência do jogo. localStorage não deve ser o banco principal das cartas.

## Importação

O jogo deve aceitar o JSON otimizado exportado pelo Álbum. O formato-base é Um Mundo Além das Páginas — Álbum. Cada carta deve preservar originalId e resolver collectionId pela coleção correspondente.

## Separação

Álbum/Criador cria e armazena cartas. O exportador prepara o JSON otimizado. Coleção armazena cartas disponíveis. Inventário controla cópias. Baralho seleciona exatamente 25 cartas. Batalha executa combate. Campanha controla oponentes, recompensas e replay.

## IA do Criador

A IA pode auxiliar na geração de ATK, DEF e habilidade, mas deve operar dentro das regras determinísticas de mana e compatibilidade. IA = criatividade; regras = validação; usuário = decisão final.
