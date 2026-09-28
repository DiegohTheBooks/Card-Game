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

Cada carta da Loja custa **3.000 de ouro**. O preço é fixo para as cartas vendidas pela Loja nesta versão, independentemente do valor enviado no JSON. A compra/resgate utiliza ouro e será integrada ao sistema de moedas da Loja conforme a economia do jogo for finalizada.

## Economia da Loja\n\nO valor de 3.000 de ouro foi definido como um preço significativo, mas alcançável: o ouro deve ser obtido naturalmente durante a exploração do jogo e pelas recompensas, mantendo as cartas da Loja como uma aquisição que exige planejamento sem tornar a coleção inacessível.\n\n## Fluxo
Criador → JSON individual → Loja → Coleção + shopItems.
Criador → JSON individual → Coleção → nova carta adicionada sem substituir a Coleção.

O sistema continua local/offline e usa IndexedDB.