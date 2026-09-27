# Card Duels V7 — Sistema de Economia

## Objetivo

O V7 possui duas moedas com funções diferentes:

- **Prata** — moeda comum de progressão. É obtida naturalmente e será usada principalmente para evoluir cartas.
- **Ouro** — moeda escassa/especial. Será usada principalmente para cartas limitadas de Mana 5 e 6 e, futuramente, outros conteúdos especiais da Loja.

XP continua sendo um recurso separado das moedas.

## Carteira

A carteira do jogador é persistida no IndexedDB no store playerWallet.

Estrutura:

    {
        key: "player",
        version: 1,
        silver: 0,
        gold: 0
    }

## Recompensas atuais de teste

| Atividade | XP | Prata | Ouro |
|---|---:|---:|---:|
| Duelo Casual | 25 | 100 | 0 |
| Campanha | 50 | 300 | 0 |
| Chefe | 100 | 500 | 50 |

### Casual

Recompensa pequena para um modo livre.

### Campanha

Recompensa maior. Os valores atuais são temporários para teste.

### Chefe

Fonte principal de Ouro neste estágio.

Recompensa atual de teste:

- 100 XP
- 500 Prata
- 50 Ouro

Essa fonte de Ouro é temporária. Quando novos modos, eventos e conquistas existirem, a distribuição poderá ser ampliada.

## Ouro

O Ouro não é uma versão mais cara da Prata.

Ele é propositalmente mais escasso e tem usos diferentes. O jogador pode guardá-lo para conteúdos especiais.

Mana 5 e Mana 6 podem futuramente aparecer em ofertas especiais da Loja. Isso não altera a regra de que Mana 6 também pode ser obtida por fontes especiais como eventos, conquistas e chefes.

## Prata

A Prata é o recurso de uso frequente.

Seu primeiro uso planejado é a evolução:

    2x T1 + Prata -> T2
    2x T2 + Prata -> T3
    2x T3 + Prata -> T4

Os custos exatos serão definidos quando a evolução for implementada.

## Arquitetura

A economia é centralizada:

    Batalha
       ↓
    Rewards
       ↓
    XP + Currency
       ↓
    Profile / Wallet

Os modos não devem alterar moedas diretamente. Devem chamar o sistema de recompensas.

## Regra importante

A estrutura da economia é permanente; os valores são provisórios.

Objetivos desta etapa:

1. persistência da carteira;
2. ganho de Prata;
3. ganho de Ouro;
4. integração com recompensas;
5. separação entre XP, Prata e Ouro.
