**UM MUNDO ALÉM DAS PÁGINAS — CARD DUELS Card Duels**

**Documento de Visão e Game Design**  
**Fase de Progressão e Jogabilidade**  
**Objetivo deste documento** 

Este documento registra a direção de gameplay definida para a próxima fase do projeto. Ele deve servir como contexto para futuras conversas, versões e decisões de desenvolvimento. O objetivo não é substituir a documentação técnica do V6 Modular, mas explicar que jogo queremos construir a partir de uma base já funcional. 

**Estado atual**

 O V6 Modular é considerado a base funcional e estável do Card Duels. O jogo já consegue importar cartas, armazená-las em IndexedDB, trabalhar com coleção, inventário e baralho, realizar duelos, executar campanha, oferecer recompensas e exibir a ficha dos personagens. A partir deste ponto, a prioridade deixa de ser simplesmente fazer o sistema funcionar e passa a ser fazer o jogo ser desejável de jogar repetidamente. 

**Mudança de objetivo** 

Antes: “Precisamos de um jogo funcional.” Agora: “Precisamos de um jogo jogável, com motivos para o jogador querer voltar.” O principal gargalo atual é a progressão. Se, depois de várias partidas, nada significativo muda além de algumas cartas novas, o jogador pode sentir que está repetindo a mesma experiência. A nova fase deve criar objetivos de curto, médio e longo prazo sem transformar o projeto em um RPG excessivamente complexo.

1. PRINCÍPIO CENTRAL DO GAMEPLAY 

O Card Duels deve manter a simplicidade da batalha — cinco linhas, cartas, mana e combate — enquanto constrói uma camada de progressão em torno dela. O jogador deve sentir que cada partida contribui para alguma coisa: evolução do personagem, descoberta de cartas, progresso no Códex, conquistas, avanço de campanha ou evolução visual de cartas repetidas. 

**Loop desejado:** 

Jogar → ganhar XP / cartas / progresso → evoluir ou desbloquear algo → estabelecer uma nova meta → jogar novamente. A batalha faz o jogador jogar. A progressão deve fazer o jogador querer jogar novamente. 

2. PROGRESSÃO DO PERSONAGEM 

O jogador terá um perfil/personagem próprio. A progressão principal será baseada em XP e níveis. Não haverá evolução individual de atributos das cartas como regra central. 

**Perfil previsto** 

* Nome do jogador/personagem.   
* Avatar ou foto.   
* Frase de apresentação editável.   
* Nível.   
* XP atual.   
* XP necessário para o próximo nível.   
* PV máximo.   
* Mana inicial.   
* Futuramente, estatísticas, títulos e outras recompensas. 

**Regra de evolução** 

Cada nível aumenta \+1 PV. A cada múltiplo de 5 — níveis 5, 10, 15, 20 e assim por diante — o jogador recebe também \+1 Mana inicial.

| Nível | PV | Mana inicial |
| :---: | :---: | :---: |
| 0 | 20 | 2 |
| 1 | 21 | 2 |
| 2 | 22 | 2 |
| 3 | 23 | 2 |
| 4 | 24 | 2 |
| 5 | 25 | 3 |
| 6 | 26 | 3 |
| 7 | 27 | 3 |
| 8 | 28 | 3 |
| 9 | 29 | 3 |
| 10 | 30 | 4 |
| 15 | 35 | 5 |
| 20 | 40 | 6 |

Observação: os valores exatos de XP necessários por nível ainda não estão fechados. A progressão de PV/Mana acima representa a regra discutida, enquanto a curva de XP será definida durante o desenho do sistema. 

3. DE ONDE VEM O XP 

XP não deve depender exclusivamente de vitórias. A ideia é que o jogador progrida naturalmente por jogar, descobrir conteúdo e cumprir objetivos. 

* Vitórias e participação em duelos.   
* Vitórias e progresso na campanha. •  
* Descoberta de novas cartas.   
* Progresso ou conclusão de coleções.   
* Conquistas.   
* Outras fontes futuras, caso façam sentido. 

Os valores de XP são provisórios. O importante nesta fase é definir as fontes e o papel do XP no loop, não congelar números prematuramente. 

4. CÓDEX 

O Códex será um sistema de registro e coleção, inspirado na sensação de completar um álbum. Ele é diferente da Coleção/Inventário: a Coleção representa as cartas que o jogador possui e pode usar; o Códex registra o que o jogador já descobriu. 

**As cartas serão organizadas por obras/coleções, por exemplo:** 

* Um Casamento Político   
* Entre a Luz e as Sombras   
* Enid, a Garota Lobo   
* Gotei 13   
* Academia Anthigonus   
* Outras obras que forem incorporadas ao jogo. 

Exemplo conceitual: **Entre a Luz e as Sombras — 18/25 personagens registrados**. Cartas ainda não descobertas podem aparecer como espaços bloqueados/interrogações, criando naturalmente o desejo de descobrir onde encontrá-las. O Códex não deve exigir uma mecânica complicada. A regra desejada é**: jogar → receber uma carta → registrar a descoberta no Códex**. 

5. CONQUISTAS 

As conquistas são objetivos paralelos que dão ao jogador metas além de simplesmente vencer uma partida. Exemplos discutidos: 

* Vitória Imparável: vencer 10 partidas consecutivas → \+50 XP.   
* Colecionador: registrar 25 cartas no Códex → \+75 XP.   
* Vencer determinado número de partidas.   
* Derrotar determinados oponentes.   
* Completar uma coleção.   
* Evoluir uma carta para T2, T3 ou T4.   
* Conquistas futuras com recompensas que não sejam apenas XP. As recompensas adicionais — cartas, títulos, cosméticos, avatares ou outros elementos — podem ser decididas posteriormente. Nesta fase, a prioridade é criar uma estrutura de objetivos.  
    
6. MODO HISTÓRIA E CAMPANHAS 

O Modo História será composto por campanhas relacionadas às obras do universo “Um Mundo Além das Páginas”. Cada campanha funciona como uma jornada/mapa em que o jogador enfrenta batalhas para avançar e conquistar cartas daquela coleção. 

**Exemplos:** 

• Campanha — Entre a Luz e as Sombras   
• Campanha — Enid, a Garota Lobo   
• Campanha — Um Casamento Político   
• Campanha — Gotei 13   
• Outras campanhas futuras.   
A inspiração é a estrutura de jogos mobile de campanha em mapa, como a referência citada pelo projeto: o jogador percorre etapas e pode enfrentar um chefe cuja carta/recompensa não está disponível nas batalhas normais. Princípio importante: chefes podem possuir cartas exclusivas. Assim, o jogador pode ver uma carta no Códex e descobrir que precisa avançar em determinada campanha para obtê-la. Campanhas concluídas devem permanecer rejogáveis para permitir busca de cartas, XP, conquistas e outros objetivos futuros. 

7. OBTENÇÃO DE CARTAS 

As cartas devem ter diferentes fontes, evitando que apenas um modo de jogo seja relevante. 

• Duelo: pode oferecer cartas, XP e progresso. 

• História: oferece principalmente cartas relacionadas à campanha e personagens exclusivos de chefes. 

• Conquistas: podem futuramente oferecer cartas ou outras recompensas especiais. 

O objetivo é que o jogador tenha motivos para jogar diferentes partes do jogo, sem transformar a obtenção de cartas em uma obrigação artificial. 

8. EVOLUÇÃO VISUAL DAS CARTAS 

Cartas repetidas terão utilidade por meio de uma evolução visual. Não haverá, como regra central, aumento de ATK/DEF/Mana causado pela evolução. 

A evolução é tratada como uma espécie de skin/estágio visual de RPG: o mesmo personagem pode possuir quatro versões visuais. 

Estrutura: 

2 × T1 → T2 

2 × T2 → T3 

2 × T3 → T4 

Portanto, uma carta T4 exige 8 cópias T1 do mesmo personagem, seguindo a cadeia de fusão. 

**Importante:** T1, T2, T3 e T4 não representam níveis de poder. As estatísticas de combate permanecem iguais. A progressão é principalmente visual e colecionável. A evolução pode alterar moldura, acabamento, efeitos, brilho, composição visual ou eventualmente arte alternativa. O objetivo é fazer o jogador sentir que possui uma versão especial sem criar uma escalada de balanceamento por carta. Esse sistema dá significado às cartas repetidas, especialmente porque o jogador terá um baralho limitado a 25 cartas e poderá receber muitas cópias ao longo da jornada. 

9. CÓDEX \+ EVOLUÇÃO 

O Códex pode registrar não apenas a descoberta do personagem, mas também os estágios visuais já obtidos. Exemplo conceitual: 

Luna Nirven 

T1 ✓ T2 ✓ T3 ■ T4 ■ 

Assim, a meta pode evoluir de “quero descobrir Luna” para “quero completar todas as versões visuais de Luna”. Isso cria uma camada de coleção de longo prazo sem exigir novos atributos ou sistemas complexos. 

10. LOOP DE PROGRESSÃO DESEJADO 

A estrutura pretendida pode ser resumida desta forma: 

JOGAR ↓

 Ganhar XP / cartas / progresso 

↓ 

Subir de nível / registrar no Códex / evoluir cartas / cumprir conquistas 

↓ 

Ficar mais forte ou completar novos objetivos 

↓ 

Explorar campanhas e buscar cartas específicas 

↓ 

JOGAR NOVAMENTE 

O jogador deve ter simultaneamente metas de curto, médio e longo prazo: 

* Curto prazo: ganhar a próxima partida, completar uma conquista ou conseguir uma carta.   
* Médio prazo: subir de nível, atingir um marco de Mana ou avançar numa campanha.   
* Longo prazo: completar coleções, preencher o Códex e evoluir personagens até T4.  
    
11. PRINCÍPIOS DE DESIGN   
* Manter a batalha simples: progressão não deve obrigar a transformar o combate em um RPG complexo.   
* Dar significado às recompensas: receber cartas deve alimentar coleção, Códex e evolução.   
* Evitar desperdício: cartas repetidas devem continuar tendo valor.   
* Progressão visível: o jogador deve perceber que seu personagem e sua coleção estão crescendo.   
* Objetivos naturais: muitos objetivos devem ser cumpridos simplesmente jogando, sem tarefas artificiais.   
* Conteúdo conectado: campanha, Códex, conquistas, XP e evolução devem reforçar uns aos outros.   
* Não criar complexidade sem benefício: cada novo sistema deve existir porque melhora a experiência do jogador.   
* V6 Modular é a base: futuras versões devem evoluir a partir da base funcional existente, evitando quebrar sistemas estáveis sem necessidade.   
    
12. O QUE NÃO ESTÁ DEFINIDO AINDA   
* Curva exata de XP por nível.   
* Quantidade de XP dada por cada atividade.   
* Número de etapas de cada campanha.   
* Lista final de cartas por campanha.   
* Quais cartas são exclusivas de chefes. • Nome oficial dos estágios T1/T2/T3/T4.   
* Quais recompensas adicionais as conquistas poderão oferecer.   
* Sistema visual definitivo das evoluções.   
* Regras futuras para equilíbrio entre níveis. Esses pontos devem ser decididos depois que a estrutura geral de gameplay estiver consolidada. Este documento registra a direção, não pretende congelar detalhes que ainda estão em discussão.   
    
13. DIREÇÃO DO PROJETO 

O Card Duels já possui uma base funcional. A próxima fase não deve ser guiada pela quantidade de código ou pelo número de sistemas adicionados, mas pela capacidade de criar uma experiência que desperte vontade de continuar jogando. O objetivo é que o jogador abra o jogo e tenha sempre alguma coisa que deseja alcançar: uma carta, uma coleção, uma conquista, um nível, uma campanha, uma evolução T4 ou simplesmente a próxima etapa da sua jornada. Visão: um card game simples de jogar, mas com uma camada de progressão e coleção suficientemente rica para fazer cada partida parecer parte de uma jornada maior. Este documento deve ser usado como referência conceitual em futuras conversas e versões do projeto. Antes de implementar a próxima versão, as ideias aqui registradas devem ser discutidas e refinadas; somente depois disso devem ser transformadas em requisitos técnicos.