# Sistema de Códex — V7

## Objetivo

O Códex registra os personagens existentes no banco do jogo e separa **conhecimento** de **posse**.

- **Coleção:** cartas que existem no banco e podem ser utilizadas pelo sistema.
- **Inventário/Baralho:** cartas e cópias que o jogador possui.
- **Códex:** personagens que o jogador já descobriu.

## Primeira implementação

Todo personagem cadastrado em `cardCollection` aparece no Códex.

Quando o personagem ainda não foi descoberto:
- a arte fica escurecida;
- o nome fica oculto;
- aparece `?`;
- seus detalhes de personagem não ficam disponíveis.

Quando é descoberto:
- a arte original é exibida;
- o nome e a obra aparecem;
- a carta pode abrir a ficha existente do jogo.

## Regra de descoberta V7

A descoberta acontece quando o jogador **obtém a carta**, ou seja, quando ela entra no Inventário.

Saves anteriores ao Códex são compatíveis: ao abrir o Códex, cartas que já estavam no Inventário são registradas automaticamente como descobertas.

## Futuras fontes de descoberta

O sistema foi separado para permitir futuramente:
- descoberta por recompensa;
- descoberta em campanha;
- descoberta por encontro com o personagem;
- eventos;
- conquistas;
- personagens especiais de Mana 6.

## Mana 6

Mana 6 continua sendo uma categoria especial. Existir no banco não significa estar desbloqueado ou descoberto pelo jogador.

## Evolução futura

O Códex poderá futuramente registrar:
- T1, T2, T3 e T4;
- datas de descoberta;
- quantidade de cópias;
- primeira aparição;
- origem da descoberta;
- conquistas relacionadas;
- páginas completas por obra.

A evolução visual não altera Mana, ATK ou DEF.