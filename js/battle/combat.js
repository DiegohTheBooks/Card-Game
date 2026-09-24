import { isBattleOver } from "./battle.js";

export function calculateAttack(attackerAtk, defenderDef) {
    const atk = Math.max(0, Number(attackerAtk) || 0);
    const def = Math.max(0, Number(defenderDef) || 0);

    return {
        damage: atk,
        remainingDef: Math.max(0, def - atk)
    };
}

export function canAttack(state, side, laneIndex) {
    if (state.turn !== side) return false;

    const board = side === "player"
        ? state.playerBoard
        : state.enemyBoard;

    const card = board[laneIndex];

    if (!card || state.round <= Number(card.summonedRound)) {
        return false;
    }

    return true;
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
    const defender = defendingBoard[laneIndex];

    const atk = Math.max(0, Number(attacker.atk) || 0);

    if (!defender) {
        if (side === "player") {
            state.enemyHp = Math.max(0, state.enemyHp - atk);
        } else {
            state.playerHp = Math.max(0, state.playerHp - atk);
        }

        return {
            type: "direct",
            attacker,
            defender: null,
            damage: atk,
            laneIndex,
            destroyed: false
        };
    }

    const result = calculateAttack(atk, defender.currentDef ?? defender.def);
    defender.currentDef = result.remainingDef;

    const destroyed = defender.currentDef <= 0;

    if (destroyed) {
        if (side === "player") {
            state.enemyGraveyard.push(defender);
            state.enemyBoard[laneIndex] = null;
        } else {
            state.playerGraveyard.push(defender);
            state.playerBoard[laneIndex] = null;
        }
    }

    return {
        type: "lane",
        attacker,
        defender,
        damage: result.damage,
        remainingDef: result.remainingDef,
        laneIndex,
        destroyed
    };
}
