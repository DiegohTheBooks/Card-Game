import { playCard } from "./battle.js";
import { canAttack, resolveAttack } from "./combat.js";

function cardCost(card) { return Number(card?.mana) || 0; }
function cardAtk(card) { return Number(card?.atk) || 0; }
function cardDef(card) { return Number(card?.def) || 0; }
function abilityText(card) { return String(card?.ability || "").toLowerCase(); }

function chooseLane(state, strategy) {
    const empty = [];

    for (let i = 0; i < state.lanes; i++) {
        if (!state.enemyBoard[i]) empty.push(i);
    }

    if (!empty.length) return -1;

    if (strategy === "guardian") {
        return empty.reduce((best, lane) => {
            const score =
                (state.enemyBoard[lane - 1] ? 1 : 0) +
                (state.enemyBoard[lane + 1] ? 1 : 0);

            return score > best.score ? { lane, score } : best;
        }, { lane: empty[0], score: -1 }).lane;
    }

    if (strategy === "colossus") {
        return empty.reduce((best, lane) =>
            Math.abs(lane - 2) > Math.abs(best - 2) ? lane : best
        );
    }

    return empty[Math.floor(Math.random() * empty.length)];
}

function scoreCard(card, strategy) {
    const cost = cardCost(card);
    const atk = cardAtk(card);
    const def = cardDef(card);
    const ability = abilityText(card);

    if (strategy === "guardian") {
        let score = def * 1.7 + atk * 0.7 + cost * 0.25;
        if (ability.includes("protetor")) score += 8;
        if (ability.includes("armadura")) score += 6;
        if (ability.includes("fortalecer")) score += 5;
        return score;
    }

    if (strategy === "berserker") {
        let score = atk * 1.9 + def * 0.45 + cost * 0.8;
        if (ability.includes("investida")) score += 8;
        if (ability.includes("sangramento")) score += 5;
        if (ability.includes("retaliação")) score += 3;
        return score;
    }

    if (strategy === "hunter") {
        let score = atk + def * 0.45 + (6 - Math.min(cost, 6)) * 2.5;
        if (cost <= 3) score += 6;
        if (ability.includes("veneno")) score += 4;
        if (ability.includes("golpe amplo")) score += 3;
        return score;
    }

    if (strategy === "colossus") {
        let score = atk * 1.25 + def * 1.35 + cost * 1.5;
        if (cost >= 5) score += 8;
        if (cost === 6) score += 15;
        return score;
    }

    if (strategy === "offensive") return atk * 1.6 + def * 0.5;
    if (strategy === "defensive") return def * 1.5 + atk * 0.6;
    if (strategy === "assassin") return atk * 1.5 + def * 0.5;

    return atk + def + cost * 0.5;
}

function choosePlayableHandIndex(state, strategy) {
    let bestIndex = -1;
    let bestScore = -Infinity;

    state.enemyHand.forEach((card, index) => {
        if (cardCost(card) > state.enemyMana) return;

        const score = scoreCard(card, strategy);
        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    });

    return bestIndex;
}

function chooseAttack(state, strategy) {
    const available = [];

    for (let lane = 0; lane < state.lanes; lane++) {
        if (canAttack(state, "enemy", lane)) available.push(lane);
    }

    if (!available.length) return null;

    if (strategy === "berserker" || strategy === "offensive") {
        const direct = available.find(lane => !state.playerBoard[lane]);
        if (direct !== undefined) return direct;
    }

    if (strategy === "colossus" || strategy === "guardian" || strategy === "hunter") {
        return available.reduce((best, lane) => {
            const target = state.playerBoard[lane];
            const bestTarget = state.playerBoard[best];

            if (!target) return lane;
            if (!bestTarget) return best;

            return cardDef(target) < cardDef(bestTarget) ? lane : best;
        }, available[0]);
    }

    return available[0];
}

export function chooseAiAction(state) {
    const strategy = state.aiStrategy || "balanced";
    const handIndex = choosePlayableHandIndex(state, strategy);
    const lane = chooseLane(state, strategy);

    if (handIndex >= 0 && lane >= 0) {
        return { type: "play", handIndex, lane };
    }

    const attackLane = chooseAttack(state, strategy);
    if (attackLane !== null) return { type: "attack", lane: attackLane };

    return { type: "pass" };
}

export function runAiTurn(state) {
    state.turn = "enemy";

    const actions = [];
    let guard = 0;

    while (guard++ < 30) {
        const action = chooseAiAction(state);

        if (action.type === "play") {
            const card = playCard(state, "enemy", action.handIndex, action.lane);
            actions.push({ ...action, card });
            continue;
        }

        if (action.type === "attack") {
            const result = resolveAttack(state, "enemy", action.lane);
            actions.push({ ...action, result });
            if (state.playerHp <= 0) break;
            continue;
        }

        break;
    }

    return actions;
}
