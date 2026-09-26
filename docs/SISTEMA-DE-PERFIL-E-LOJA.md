# Sistema de Perfil do Autor e Loja — V7

## Perfil do Autor
O Perfil é uma página independente, perfil.html, e representa a página do personagem do jogador.

Exibe:
- nome editável;
- frase do personagem editável;
- avatar escolhido entre personagens descobertos;
- nível;
- XP atual e XP necessário para o próximo nível;
- PV máximo;
- Mana inicial;
- cartas descobertas;
- conquistas;
- progresso das quatro campanhas.

O Perfil não cria uma nova fonte de verdade. Ele consulta Player Profile, Códex, Conquistas e Campanha.

## Importar Carta
A Coleção possui duas operações:
- Importar Coleção: substitui o banco da Coleção com um backup/conjunto completo.
- Importar Carta: adiciona ou atualiza uma única carta sem substituir as cartas existentes.

## Loja
A Loja, loja.html, recebe cartas individuais exportadas pelo Criador. A carta é registrada no banco da Coleção e também em shopItems, separando conteúdo especial/limitado do conjunto base.

A compra/resgate e os preços ainda não fazem parte desta etapa. Os metadados shopPrice e shopCurrency podem ser enviados no JSON e serão preservados no cadastro da Loja.

## Fluxo
Criador → JSON individual → Loja → Coleção + shopItems.
Criador → JSON individual → Coleção → nova carta adicionada sem substituir a Coleção.

O sistema continua local/offline e usa IndexedDB.