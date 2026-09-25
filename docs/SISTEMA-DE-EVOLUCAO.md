# Sistema de Evolução — V7

A evolução está conectada diretamente ao Inventário do jogador.

## Princípio

O jogador não evolui uma carta apenas por abrir uma página específica. Para evoluir, precisa:

1. possuir cópias da carta no Inventário;
2. possuir duas cópias do mesmo estágio;
3. possuir Prata suficiente;
4. confirmar a evolução.

A evolução não aumenta automaticamente Mana, ATK ou DEF. Ela representa progressão visual e de coleção.

## Estágios

- T1 → T2: 2 cópias T1
- T2 → T3: 2 cópias T2
- T3 → T4: 2 cópias T3

Assim, uma carta T4 representa 8 cópias T1 acumuladas.

## Custos atuais de teste

| Evolução | Cartas | Prata |
|---|---:|---:|
| T1 → T2 | 2× T1 | 50 |
| T2 → T3 | 2× T2 | 100 |
| T3 → T4 | 2× T3 | 200 |

Os valores de Prata são provisórios e ficam centralizados no módulo da página de evolução.

## Inventário

O registro da carta mantém as quantidades por estágio:

    {
        originalId: "...",
        quantity: 4,
        tiers: {
            T1: 4,
            T2: 0,
            T3: 0,
            T4: 0
        }
    }

quantity continua representando o total de cópias para manter compatibilidade com o sistema existente.

Ao evoluir 2× T1 para T2:

    T1: 4 → 2
    T2: 0 → 1
    quantity: 4 → 3

O mesmo princípio vale para T2 → T3 e T3 → T4.

## Página de Evolução

evolucao.html lê:

- Coleção, para obter os dados e imagens das cartas;
- Inventário, para saber quais personagens o jogador possui e quantas cópias de cada estágio;
- Carteira, para verificar a Prata disponível.

A página não cria cópias novas fora do Inventário.

## Atributos

A evolução visual não altera automaticamente:

- Mana
- ATK
- DEF

Os atributos continuam sendo os definidos para o personagem.

As futuras diferenças entre T1, T2, T3 e T4 poderão ser:

- moldura;
- acabamento;
- efeitos;
- brilho;
- composição;
- arte alternativa;
- outros elementos visuais.

## Próximas integrações

Quando o sistema de cartas oficiais estiver consolidado:

- integrar visual T1–T4 ao card renderer;
- registrar estágios no Códex;
- permitir que o Deck Builder identifique o estágio da cópia;
- criar artes/frames específicos;
- refinar os custos de Prata após testes.
