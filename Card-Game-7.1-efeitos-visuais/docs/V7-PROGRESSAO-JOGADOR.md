# CARD DUELS V7 — Progressão do Jogador

## Estado
V7 inicia a evolução da V6 Modular para a experiência completa de progressão do autor.

A V6 continua sendo a base técnica. A V7 acrescenta o primeiro sistema persistente de progressão: **Perfil + XP + Nível**.

## Natureza do projeto
Card Duels é um projeto privado, offline e single-player, criado para o autor experimentar seus próprios personagens dentro do jogo.

Não haverá:
- PvP.
- matchmaking.
- ranking competitivo.
- progressão entre jogadores.
- economia entre jogadores.
- sistemas sociais.

Portanto, a evolução do jogador é uma parte estrutural e intencional da experiência.

## Perfil do jogador
O perfil é persistido em IndexedDB e contém nome, avatar/emoji, frase de apresentação, nível, XP do nível atual, XP total, HP máximo e Mana inicial.

O perfil começa em:
- Nível 0.
- 20 HP.
- 2 Mana inicial.
- 0 XP.

## Progressão
Cada nível concede +1 HP máximo. A cada 5 níveis, o jogador recebe +1 Mana inicial.

Regra:
`HP máximo = 20 + nível`
`Mana inicial = 2 + floor(nível / 5)`

| Nível | HP | Mana inicial |
|---:|---:|---:|
| 0 | 20 | 2 |
| 1 | 21 | 2 |
| 5 | 25 | 3 |
| 10 | 30 | 4 |
| 15 | 35 | 5 |
| 20 | 40 | 6 |

Esses valores são parte da progressão do jogador e não representam evolução das cartas.

## XP
A primeira implementação utiliza uma curva simples e centralizada em `js/player/profile.js`:
`XP do próximo nível = 100 + (nível × 25)`

A curva e os valores de recompensa são **provisórios para testes**, mas a existência do sistema de XP é parte da estrutura V7.

Recompensa inicial:
- vitória em duelo casual: +25 XP;
- vitória em campanha: +50 XP.

Novas fontes de XP poderão incluir participação em duelos, descoberta de cartas, progresso no Códex, conquistas e campanhas.

## Diferença entre jogador e carta
O nível do jogador **não é nível de poder de carta**.

Exemplo de jogador: `Nível 10 → 30 HP / 4 Mana inicial`
Exemplo de carta: `Mana 4 → ATK + DEF = 20`

As cartas continuam seguindo: `Mana × 5 = ATK + DEF`. A evolução visual T1 → T4 também não aumenta ATK, DEF ou Mana.

## Persistência
A V7 utiliza o banco IndexedDB existente da V6 e acrescenta o store `playerProfile`. A versão do banco sobe de 2 para 3 sem apagar os dados existentes.

## Objetivo desta etapa
Esta primeira etapa deve provar que o perfil é criado automaticamente, permanece salvo entre sessões, pode ser editado, recebe XP por vitórias, produz níveis, altera HP/Mana inicial e é utilizado na próxima batalha.

Depois dessa base validada, a V7 pode avançar para Códex, conquistas, recompensas, campanhas expandidas, Mana 6 especial e evolução visual T1–T4.

## Princípio
> O personagem é o centro. O sistema existe para dar vida ao personagem.

A progressão do jogador existe para tornar a experiência de descobrir, colecionar e jogar com esse universo cada vez mais significativa.