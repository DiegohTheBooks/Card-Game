# Card Duels V7 — Especificação e Plano

## 1. Conceito
Um Mundo Além das Páginas — Card Duels é um jogo de cartas colecionáveis local/offline para dar vida aos personagens criados no universo Um Mundo Além das Páginas.

Princípio central:
**O personagem é o centro; o sistema existe para dar vida ao personagem.**

Não são objetivos do projeto: multiplayer, servidor, contas, backend, níveis numéricos de personagem, árvore de evolução complexa ou dezenas de atributos.

## 2. Batalha
- Campo com 5 lanes.
- 20 HP por jogador.
- Deck de 25 cartas.
- Mão inicial de 5 cartas.
- Mana cresce durante a partida.
- Objetivo: reduzir o HP adversário a zero.

## 3. Mana e sacrifício
A Mana é a hierarquia natural das cartas.

Progressão normal:
- Turno 1: 2 Mana
- Turno 2: 3 Mana
- Turno 3: 4 Mana
- Turno 4: 5 Mana

Uma vez por rodada, o jogador pode sacrificar uma carta da mão para receber +1 Mana máxima e +1 Mana atual.

## 4. Hierarquia e distribuição
Não haverá raridades artificiais como Comum, Rara, Épica ou Lendária. A própria Mana cria a hierarquia natural: 2, 3, 4, 5 e 6 Mana.

Pool normal planejado:
- 15 cartas de 2 Mana
- 15 cartas de 3 Mana
- 10 cartas de 4 Mana
- 10 cartas de 5 Mana
- Total: 50 cartas

Essa distribuição é do pool da coleção, não uma obrigação para decks de 25 cartas.

## 5. Cartas de 6 Mana
Cartas de 6 Mana são cartas especiais de conquista.

Não podem ser obtidas por:
- recompensa aleatória comum;
- geração aleatória;
- criação automática de deck;
- adversário aleatório;
- outros sistemas comuns de aquisição.

Só podem ser adicionadas à coleção por:
- Eventos;
- Conquistas;
- Bosses.

Depois de conquistadas, podem ser usadas normalmente em decks.

Uma carta de 6 Mana pode existir no banco de dados sem estar desbloqueada para o jogador. Isso permite cadastrar todas as cartas especiais antecipadamente sem risco de elas aparecerem por acidente.

Regra estrutural:
- Banco de cartas: contém todas as cartas.
- Coleção: contém apenas cartas desbloqueadas.
- Deck: utiliza apenas cartas da coleção.
- Recompensas normais: não sorteiam Mana 6.
- Adversários aleatórios: não recebem Mana 6.
- Bosses e eventos: podem receber ou conceder Mana 6 quando explicitamente configurados.

## 6. Atributos
Regra oficial:
**Mana × 5 = ATK + DEF**

- Mana 2 = 10 pontos
- Mana 3 = 15 pontos
- Mana 4 = 20 pontos
- Mana 5 = 25 pontos
- Mana 6 = 30 pontos

A distribuição entre ATK e DEF depende do perfil do personagem.

## 7. Perfis
- Ofensivo: prioriza ATK.
- Defensivo: prioriza DEF.
- Equilibrado: distribuição equilibrada.
- Suporte: auxilia outras cartas.
- Assassino: ofensivo e especializado em eliminar alvos.
- Estratégico: depende especialmente da situação do campo.

Os perfis orientam a criação e não precisam funcionar como classes rígidas na batalha.

## 8. Habilidades oficiais

### Ofensivas
1. Investida — pode atacar no mesmo turno em que é colocada em campo.
2. Sangramento — quando ataca, aplica Sangramento: -2 DEF ao alvo.
3. Dreno — quando causa dano, recupera +2 DEF.
4. Rompedor — ao destruir um defensor, causa o dano excedente diretamente ao HP inimigo.
5. Golpe Amplo — atinge a carta à frente e as cartas ao lado. Restrição obrigatória: ATK ≤ 5.

### Defensivas
6. Armadura — reduz em 3 o dano recebido em combate.
7. Retaliação — quando atacada, causa +2 de dano à carta atacante.
8. Protetor — concede +3 DEF a uma carta aliada adjacente.
9. Atordoar — se for destruída após ser atacada, a carta que a destruiu não poderá atacar no próximo turno.

### Especiais/Estratégicas
10. Veneno — quando é destruída, aplica Veneno à carta que a destruiu: -2 DEF contínuo.
11. Predador Solitário — recebe +2 ATK para cada lane adjacente vazia.
12. Fortalecer — aumenta em +2 ATK as cartas aliadas adjacentes.

Diferença importante:
- Sangramento acontece no ataque e aplica -2 DEF ao alvo.
- Veneno acontece na destruição e aplica -2 DEF contínuo ao destruidor.

## 9. Combate
ATK do atacante reduz a DEF do defensor.

Exemplo: ATK 5 contra DEF 8 deixa o defensor com DEF 3.

Se DEF chegar a zero, a carta é destruída.

Se a lane adversária estiver vazia, o ataque causa dano diretamente ao HP.

Rompedor permite que o dano excedente após destruir um defensor atinja o HP inimigo.

## 10. Invocação
Uma carta colocada em campo normalmente não pode atacar no mesmo turno.
Investida é a exceção.

## 11. Cartas limpas e ficha
As cartas de batalha devem permanecer visualmente limpas. ATK, DEF, Mana e habilidade não precisam ficar sobrepostos à arte.

Ao clicar na carta, abrir a Ficha do Personagem com:
- nome;
- obra;
- arte;
- Mana;
- ATK;
- DEF;
- nome da habilidade;
- descrição da habilidade.

## 12. Criador V4
O Criador V4 estabelece o fluxo:
Personagem → Perfil → Mana → ATK/DEF → Habilidade → Carta.

Já possui:
- características do personagem;
- perfis;
- Mana 2–6;
- geração de ATK/DEF;
- geração de habilidade;
- geração novamente;
- edição manual;
- estilos visuais;
- validação das regras.

Filosofia:
**IA = criatividade; Regras = validação; Usuário = decisão final.**

## 13. Estilos e evolução
Estilos atuais:
- Moldura dourada;
- Ornamental — Curvas;
- Ornamental — Linhas;
- Clássico.

A evolução é principalmente visual, como skins de RPG. Pode mudar arte, moldura e acabamento, mas não aumenta automaticamente ATK, DEF ou Mana. Não há necessidade de níveis numéricos.

## 14. Coleção, desbloqueio e deck
Separar claramente:
Banco de cartas → todas as cartas existentes.
Coleção → cartas desbloqueadas pelo jogador.
Deck → cartas escolhidas da coleção.
Batalha → cartas efetivamente utilizadas.

Existir no banco não significa estar desbloqueada.

Deck possui 25 cartas. A distribuição 15/15/10/10 é do pool de coleção, não da construção obrigatória de decks.

## 15. Campanha e Bosses

O Modo História é formado por **4 campanhas independentes**, cada uma ligada diretamente a uma obra:

1. Academia Anthigonus
2. As Chamas Sob a Coroa
3. Entre a Luz e as Sombras
4. Um Casamento Político

Cada campanha possui **10 batalhas**:
- 9 adversários comuns;
- 1 Boss na décima batalha.

Total do Modo História: **40 batalhas**.

As campanhas são independentes e os adversários já derrotados podem ser enfrentados novamente.

### Cartas por obra

Cada carta criada no Criador possui a obra do personagem. A campanha utiliza esse campo para montar seus decks.

Exemplo:
- Campanha Academia Anthigonus → cartas de Academia Anthigonus.
- Campanha As Chamas Sob a Coroa → cartas de As Chamas Sob a Coroa.
- Campanha Entre a Luz e as Sombras → cartas de Entre a Luz e as Sombras.
- Campanha Um Casamento Político → cartas de Um Casamento Político.

Enquanto as cartas oficiais ainda não estiverem importadas, existe um fallback temporário de desenvolvimento para permitir testar as batalhas com a coleção de teste. Esse fallback deverá ser removido quando o banco oficial das quatro obras estiver pronto.

### Progressão dos adversários

Os 9 adversários comuns utilizam faixas de Mana progressivas, sem receber Mana 6.

O décimo adversário é sempre o Boss e possui um estilo próprio:

- **Guardião** — defensivo; prioriza DEF e cartas de proteção.
- **Berserker** — agressivo; prioriza ATK e pressão.
- **Caçador** — utiliza cartas mais baratas e pressão por quantidade.
- **Colosso** — prioriza cartas caras, especialmente Mana 5 e 6.

### Mana 6

Bosses podem utilizar cartas de Mana 6.

Mana 6 continua restrita aos sistemas especiais de conquista. Ela não aparece em adversários comuns ou recompensas normais.

### Recompensas

As recompensas de batalha são vinculadas à campanha:
- adversário comum → opções de cartas da obra da campanha;
- Boss → opções de cartas da obra, podendo incluir Mana 6.

A recompensa é escolhida pelo jogador entre as opções geradas.

### Arquitetura

A campanha é orientada por dados:

Campanha → Obra → Adversários → Estratégia → Deck permitido → Boss → Recompensas.

O código não precisa conhecer personagens específicos. Quando novas cartas da obra são adicionadas à Coleção, elas podem automaticamente participar dos decks compatíveis com aquela campanha.

## 16. Recompensas e adversários
Recompensas normais podem fornecer Mana 2–5.

Mana 6 só aparece como recompensa quando vinculada explicitamente a Evento, Conquista ou Boss.

Adversários aleatórios devem usar um pool permitido de Mana 2–5. Mana 6 só pode aparecer quando estiver explicitamente configurada para aquele adversário especial ou Boss.

## 17. JSON
Existem dois formatos distintos.

Backup do Álbum:
Um Mundo Além das Páginas — Álbum

Exportação para o Game:
Um Mundo Além das Páginas — Game Card
gameVersion: 1

Os formatos não devem ser misturados.

## 18. Arquitetura
Fluxo:
Criador V4 → Álbum → JSON Game Card V1 → Card Duels V7 → IndexedDB → Coleção → Deck → Batalha/Campanha.

O V6 Modular já estabeleceu a base de arquitetura modular, IndexedDB, importação do JSON otimizado, normalização das cartas, coleção, deck, batalha/campanha e ficha.

O V7 deve evoluir essa arquitetura, não descartá-la.

## 19. Objetivos do V7
### V7.1 — Fundação
- importação Game Card V1;
- coleção;
- deck de 25;
- Mana;
- 5 lanes;
- HP;
- compra;
- sacrifício;
- invocação;
- ataque;
- destruição.

### V7.2 — Habilidades
Implementar e testar as 12 habilidades oficiais.

### V7.3 — Ficha
Transformar o clique na carta em acesso direto à ficha do personagem.

### V7.4 — Coleção e desbloqueios
Implementar cartas desbloqueadas e a regra especial de Mana 6.

### V7.5 — Adversários
Criar pools separados para adversários comuns, adversários especiais e Bosses.

### V7.6 — Bosses
Implementar decks próprios, cartas específicas, estratégias, recompensas e replay.

## 20. O que não adicionar sem necessidade
- níveis de personagem;
- XP;
- raridades artificiais;
- dezenas de atributos;
- equipamentos;
- árvore de habilidades;
- multiplayer;
- servidor;
- contas;
- economia complexa;
- crafting;
- evolução numérica;
- centenas de efeitos diferentes.

A complexidade deve crescer apenas quando os testes reais de jogabilidade mostrarem necessidade.

## 21. Filosofia de desenvolvimento
Criar personagens → criar cartas → colocar cartas no jogo → jogar → observar → identificar problemas → ajustar regras → jogar novamente.

O balanceamento deve ser descoberto principalmente por partidas reais.

## 22. Visão do sistema
CRIADOR V4
→ PERSONAGEM
→ PERFIL
→ MANA
→ ATK + DEF
→ HABILIDADE
→ CARTA
→ COLEÇÃO
→ DECK
→ CARD DUELS V7
→ BATALHA
→ VITÓRIA
→ RECOMPENSA
→ carta normal Mana 2–5 ou carta especial Mana 6 por Evento/Conquista/Boss.

## Princípio final
**O personagem é o centro.**

A Mana cria a hierarquia natural das cartas.
As habilidades dão identidade e estratégia.
A coleção dá valor às cartas.
Eventos, conquistas e Bosses dão significado às cartas de 6 Mana.
A batalha existe para dar vida aos personagens.
