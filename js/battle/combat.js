import { isBattleOver } from "./battle.js";

function abilityText(card) {
    return String(
        card?.abilityName ||
        card?.ability ||
        card?.abilityDescription ||
        ""
    ).toLowerCase();
}

function hasAbility(card, name) {
    return abilityText(card).includes(name);
}

function ensureCardState(card) {
    if (!card) return;

    if (!card.statusEffects) {
        card.statusEffects = {
            bleeding: false,
            poison: false
        };
    }

    if (typeof card.baseCurrentDef !== "number") {
        card.baseCurrentDef = Number(card.currentDef ?? card.def) || 0;
    }

    if (typeof card.currentDef !== "number") {
        card.currentDef = card.baseCurrentDef;
    }
}

function getAdjacentEmptyCount(state, side, laneIndex) {
    const board = side === "player"
        ? state.playerBoard
        : state.enemyBoard;

    // Predador Solitário considera os outros espaços do campo.
    // Em 5 lanes, pode haver até 4 espaços vazios: +8 ATK.
    let count = 0;

    for (let lane = 0; lane < state.lanes; lane++) {
        if (lane !== laneIndex && !board[lane]) {
            count += 1;
        }
    }

    return count;
}

function getDynamicAtk(state, side, laneIndex, card) {
    ensureCardState(card);

    let atk = Math.max(0, Number(card.atk) || 0);

    if (hasAbility(card, "predador solitário")) {
        atk += getAdjacentEmptyCount(state, side, laneIndex) * 2;
    }

    const board = side === "player"
        ? state.playerBoard
        : state.enemyBoard;

    if (laneIndex > 0) {
        const left = board[laneIndex - 1];
        if (left && hasAbility(left, "fortalecer")) atk += 2;
    }

    if (laneIndex < state.lanes - 1) {
        const right = board[laneIndex + 1];
        if (right && hasAbility(right, "fortalecer")) atk += 2;
    }

    return atk;
}

function getDynamicDefBonus(state, side, laneIndex) {
    const board = side === "player"
        ? state.playerBoard
        : state.enemyBoard;

    let bonus = 0;

    if (laneIndex > 0) {
        const left = board[laneIndex - 1];
        if (left && hasAbility(left, "protetor")) bonus += 3;
    }

    if (laneIndex < state.lanes - 1) {
        const right = board[laneIndex + 1];
        if (right && hasAbility(right, "protetor")) bonus += 3;
    }

    return bonus;
}

function syncCardDef(state, side, laneIndex) {
    const board = side === "player"
        ? state.playerBoard
        : state.enemyBoard;

    const card = board[laneIndex];
    if (!card) return 0;

    ensureCardState(card);

    const bonus = getDynamicDefBonus(state, side, laneIndex);
    card.currentDef = Math.max(0, card.baseCurrentDef + bonus);

    return card.currentDef;
}

function syncAllBoardStats(state) {
    for (const side of ["player", "enemy"]) {
        const board = side === "player"
            ? state.playerBoard
            : state.enemyBoard;

        board.forEach((card, lane) => {
            if (card) syncCardDef(state, side, lane);
        });
    }
}

function destroyCard(state, side, laneIndex) {
    const board = side === "player"
        ? state.playerBoard
        : state.enemyBoard;

    const graveyard = side === "player"
        ? state.playerGraveyard
        : state.enemyGraveyard;

    const card = board[laneIndex];
    if (!card) return null;

    graveyard.push(card);
    board[laneIndex] = null;

    return card;
}

function applyDefDamage(state, side, laneIndex, amount, options = {}) {
    const board = side === "player"
        ? state.playerBoard
        : state.enemyBoard;

    const card = board[laneIndex];
    if (!card) {
        return {
            damage: 0,
            remainingDef: 0,
            destroyed: false
        };
    }

    ensureCardState(card);
    syncCardDef(state, side, laneIndex);

    const incoming = Math.max(0, Number(amount) || 0);
    const armorReduction =
        !options.ignoreArmor && hasAbility(card, "armadura")
            ? 3
            : 0;
    const damage = Math.max(0, incoming - armorReduction);

    // currentDef inclui os bônus dinâmicos de Protetor.
    // O dano é aplicado sobre a DEF efetiva e o resultado é
    // convertido de volta para a DEF própria da carta.
    const effectiveDef = card.currentDef;
    const remainingEffectiveDef = Math.max(0, effectiveDef - damage);
    const dynamicBonus = getDynamicDefBonus(state, side, laneIndex);

    card.baseCurrentDef = Math.max(
        0,
        remainingEffectiveDef - dynamicBonus
    );

    syncCardDef(state, side, laneIndex);

    const destroyed = card.currentDef <= 0;

    return {
        damage,
        incomingDamage: incoming,
        armorReduction,
        effectiveDefBefore: effectiveDef,
        remainingDef: card.currentDef,
        destroyed
    };
}

function applyContinuousEffect(card, effect) {
    ensureCardState(card);
    card.statusEffects[effect] = true;
}

function applyRoundEffectToBoard(state, side, laneIndex, effect) {
    const board = side === "player"
        ? state.playerBoard
        : state.enemyBoard;

    const card = board[laneIndex];
    if (!card || !card.statusEffects?.[effect]) return null;

    ensureCardState(card);

    card.baseCurrentDef = Math.max(0, card.baseCurrentDef - 2);
    syncCardDef(state, side, laneIndex);

    if (card.currentDef <= 0) {
        return destroyCard(state, side, laneIndex);
    }

    return null;
}

export function applyRoundEffects(state) {
    // Cada efeito contínuo ativo reduz 2 DEF no começo da rodada.
    // Se uma carta possuir os dois efeitos, perde 4 DEF.
    for (const side of ["player", "enemy"]) {
        const board = side === "player"
            ? state.playerBoard
            : state.enemyBoard;

        for (let lane = 0; lane < board.length; lane++) {
            const card = board[lane];
            if (!card) continue;

            if (card.statusEffects?.bleeding) {
                applyRoundEffectToBoard(state, side, lane, "bleeding");
            }

            // A carta pode ter sido destruída pelo Sangramento.
            if (!board[lane]) continue;

            if (board[lane]?.statusEffects?.poison) {
                applyRoundEffectToBoard(state, side, lane, "poison");
            }
        }
    }

    syncAllBoardStats(state);
}

export function calculateAttack(attackerAtk, defenderDef) {
    const atk = Math.max(0, Number(attackerAtk) || 0);
    const def = Math.max(0, Number(defenderDef) || 0);

    return {
        damage: atk,
        remainingDef: Math.max(0, def - atk)
    };
}

export function getAttackBlockReason(state, side, laneIndex) {
    if (state.turn !== side) {
        return "Não é o seu turno.";
    }

    const board = side === "player"
        ? state.playerBoard
        : state.enemyBoard;

    const card = board[laneIndex];

    if (!card) {
        return "Não há carta nessa lane.";
    }

    const hasInvestida = hasAbility(card, "investida");

    if (
        !hasInvestida &&
        state.round <= Number(card.summonedRound)
    ) {
        return "Esta carta foi colocada neste turno e não pode atacar ainda.";
    }

    if (
        card.stunnedUntilRound &&
        state.round <= Number(card.stunnedUntilRound)
    ) {
        return "Esta carta está atordoada e não pode atacar neste turno.";
    }

    if (card.attackedRound === state.round) {
        return "Esta carta já atacou neste turno.";
    }

    return null;
}

export function canAttack(state, side, laneIndex) {
    return getAttackBlockReason(state, side, laneIndex) === null;
}

function resolveSingleTarget(state, side, laneIndex, attacker, targetLane, atk) {
    const defendingSide = side === "player" ? "enemy" : "player";
    const defendingBoard = defendingSide === "player"
        ? state.playerBoard
        : state.enemyBoard;

    const defender = defendingBoard[targetLane];

    if (!defender) {
        return {
            laneIndex: targetLane,
            defender: null,
            damage: 0,
            destroyed: false
        };
    }

    const result = applyDefDamage(
        state,
        defendingSide,
        targetLane,
        atk
    );

    const destroyedCard = result.destroyed
        ? destroyCard(state, defendingSide, targetLane)
        : null;

    if (destroyedCard) {
        // Atordoar só funciona quando a destruição ocorreu como
        // consequência de um ataque contra a carta.
        if (hasAbility(destroyedCard, "atordoar")) {
            attacker.stunnedUntilRound = state.round + 1;
        }

        // Veneno é aplicado ao atacante imediatamente.
        if (hasAbility(destroyedCard, "veneno")) {
            applyContinuousEffect(attacker, "poison");
        }
    }

    return {
        laneIndex: targetLane,
        defender,
        damage: result.damage,
        incomingDamage: result.incomingDamage,
        armorReduction: result.armorReduction,
        effectiveDefBefore: result.effectiveDefBefore,
        remainingDef: result.remainingDef,
        destroyed: Boolean(destroyedCard)
    };
}

export function resolveAttack(state, side, laneIndex) {
    if (isBattleOver(state)) {
        throw new Error("A batalha já terminou.");
    }

    if (!canAttack(state, side, laneIndex)) {
        throw new Error("Essa carta não pode atacar agora.");
    }

    const attackingBoard = side === "player"
        ? state.playerBoard
        : state.enemyBoard;

    const defendingBoard = side === "player"
        ? state.enemyBoard
        : state.playerBoard;

    const attacker = attackingBoard[laneIndex];

    if (!attacker) {
        throw new Error("Não há carta atacante nessa lane.");
    }

    const broad = hasAbility(attacker, "golpe amplo");
    const targets = broad
        ? [laneIndex - 1, laneIndex, laneIndex + 1]
            .filter(lane => lane >= 0 && lane < state.lanes)
        : [laneIndex];

    const atk = getDynamicAtk(state, side, laneIndex, attacker);

    // Registra o ataque antes dos efeitos para impedir uma segunda ação
    // durante a mesma rodada.
    attacker.attackedRound = state.round;

    const results = [];

    for (const targetLane of targets) {
        const result = resolveSingleTarget(
            state,
            side,
            laneIndex,
            attacker,
            targetLane,
            atk
        );

        results.push(result);

        // Retaliação é resolvida imediatamente após o ataque à carta.
        if (result.defender && hasAbility(result.defender, "retaliação")) {
            applyDefDamage(
                state,
                side,
                laneIndex,
                2,
                { ignoreArmor: true }
            );

            if (attacker.currentDef <= 0) {
                const attackerLane = laneIndex;
                destroyCard(state, side, attackerLane);
                break;
            }
        }

        // Sangramento é aplicado ao alvo atingido pelo ataque.
        if (result.defender && !result.destroyed && hasAbility(attacker, "sangramento")) {
            applyContinuousEffect(result.defender, "bleeding");
        }

        // Dreno recupera 2 DEF sempre que o ataque causou dano.
        if (
            result.defender &&
            result.damage > 0 &&
            hasAbility(attacker, "dreno")
        ) {
            ensureCardState(attacker);

            const attackerLane = attackingBoard.findIndex(
                card => card?.uid === attacker.uid
            );

            if (attackerLane >= 0) {
                const maxDef = Number(attacker.def) || 0;

                attacker.baseCurrentDef = Math.min(
                    maxDef,
                    attacker.baseCurrentDef + 2
                );

                syncCardDef(state, side, attackerLane);
            }
        }
    }

    // Rompedor: se destruiu o defensor central, todo dano excedente
    // é convertido em dano ao PV. Para Golpe Amplo, cada alvo é tratado
    // separadamente e o excesso não é somado entre lanes.
    const primary = results.find(result => result.laneIndex === laneIndex) || results[0];

    if (primary?.defender && primary.destroyed && hasAbility(attacker, "rompedor")) {
        const defenderDefBefore = Number(primary.effectiveDefBefore) || 0;
        const excess = Math.max(0, Number(primary.damage) - defenderDefBefore);

        if (excess > 0) {
            if (side === "player") {
                state.enemyHp = Math.max(0, state.enemyHp - excess);
            } else {
                state.playerHp = Math.max(0, state.playerHp - excess);
            }
        }

        primary.excessDamage = excess;
    }

    syncAllBoardStats(state);

    const destroyed = results.some(result => result.destroyed);

    return {
        type: broad ? "wide" : "lane",
        attacker,
        defender: primary?.defender || null,
        damage: primary?.damage || 0,
        remainingDef: primary?.remainingDef ?? null,
        laneIndex,
        destroyed,
        targets: results,
        atk
    };
}
