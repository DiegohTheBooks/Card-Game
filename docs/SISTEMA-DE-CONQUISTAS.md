# Sistema de Conquistas — CARD DUELS V7

## Objetivo

As Conquistas são uma camada de progressão paralela. Elas não alteram as regras básicas da batalha; criam metas de curto, médio e longo prazo para conectar duelo, campanha, Códex e evolução.

## Estrutura

O estado é persistido no IndexedDB em `playerAchievements`.

O sistema guarda:

- estatísticas acumuladas;
- sequência atual de vitórias;
- melhor sequência de vitórias;
- etapas de campanha derrotadas;
- personagens descobertos no Códex;
- estágios de evolução alcançados;
- conquistas já desbloqueadas;
- data de desbloqueio.

## Conquistas iniciais

| Conquista | Objetivo | Recompensa |
|---|---|---:|
| Primeira Vitória | 1 vitória | +25 XP |
| Veterano | 10 vitórias | +100 XP |
| Vitória Imparável | sequência de 10 vitórias | +50 XP |
| Descobridor | 10 personagens no Códex | +50 XP |
| Colecionador | 25 personagens no Códex | +75 XP |
| Conquistador | 5 etapas da campanha derrotadas | +100 XP |
| Mestre da Campanha | 10 etapas da campanha derrotadas | +200 XP |
| Primeiro Passo | 1 carta em T2 | +25 XP |
| Evolução Avançada | 1 carta em T3 | +75 XP |
| Forma Suprema | 1 carta em T4 | +150 XP |

Os valores são iniciais e podem ser ajustados depois que o loop completo estiver sendo testado.

## Integrações

### Duelo

- vitória incrementa vitórias e sequência;
- derrota incrementa derrotas e zera a sequência;
- melhor sequência é preservada;
- campanhas também registram a etapa derrotada.

### Códex

Quando uma nova carta é adicionada ao Inventário, o sistema atualiza a quantidade de personagens descobertos.

### Evolução

Cada evolução registrada atualiza o estágio correspondente:

- T1 → T2;
- T2 → T3;
- T3 → T4.

### Campanha

As etapas derrotadas são armazenadas individualmente. Assim, a conquista de campanha mede etapas únicas, não apenas quantidade bruta de batalhas.

## Princípio

Conquistas não são um sistema separado do jogo. Elas funcionam como uma camada que reconhece ações que o jogador já realiza naturalmente:

**Jogar → progredir → desbloquear conquista → receber recompensa → estabelecer nova meta.**

## Próximas extensões

A estrutura foi criada para futuramente aceitar recompensas além de XP:

- Prata;
- Ouro;
- cartas;
- títulos;
- avatares;
- elementos cosméticos.

Essas extensões ficam para uma etapa posterior. A prioridade atual é validar a estrutura funcional das conquistas junto aos demais sistemas de progressão.
