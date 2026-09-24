import { playCard } from "./battle.js";
import { canAttack, resolveAttack } from "./combat.js";

function cardCost(card) {
    return Number(card?.mana) || 0;
}

function chooseLane(state) {
    const empty = [];

    for (let i = 0; i < state.lanes; i++) {
        if (!state.enemyBoard[i]) empty.push(i);
    }

    if (!empty.length) return -1;

    return empty[Math.floor(Math.random() * empty.length)];
}

function choosePlayableHandIndex(state) {
    let bestIndex = -1;
    let bestScore = -Infinity;

    state.enemyHand.forEach((card, index) => {
        const cost = cardCost(card);

        if (cost > state.enemyMana) return;

        const score =
            (Number(card.atk) || 0) +
            (Number(card.def) || 0) +
            (Number(card.mana) || 0) * 0.5;

        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    });

    return bestIndex;
}

export function chooseAiAction(state) {
    const handIndex = choosePlayableHandIndex(state);
    const lane = chooseLane(state);

    if (handIndex >= 0 && lane >= 0) {
        return {
            type: "play",
            handIndex,
            lane
        };
    }

    for (let i = 0; i < state.lanes; i++) {
        if (canAttack(state, "enemy", i)) {
            return {
                type: "attack",
                lane: i
            };
        }
    }

    return { type: "pass" };
}

export function runAiTurn(state) {
    state.turn = "enemy";

    const actions = [];

    // A IA pode fazer várias jogadas enquanto tiver mana.
    let guard = 0;

    while (guard++ < 30) {
        const action = chooseAiAction(state);

        if (action.type === "play") {
            const card = playCard(
                state,
                "enemy",
                action.handIndex,
                action.lane
            );

            actions.push({
                ...action,
                card
            });

            continue;
        }

        if (action.type === "attack") {
            const result = resolveAttack(
                state,
                "enemy",
                action.lane
            );

            actions.push({
                ...action,
                result
            });

            if (state.playerHp <= 0) break;
            continue;
        }

        break;
    }

    return actions;
}
