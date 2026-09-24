import { getAll, STORES } from "../core/database.js";

function cloneCard(card, uid) {
    return {
        ...card,
        uid,
        currentDef: Number(card.def) || 0,
        summonedRound: null
    };
}

function shuffle(items) {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

function buildDeck(cards, prefix) {
    return shuffle(cards).slice(0, 25).map((card, index) =>
        cloneCard(card, prefix + "-deck-" + index)
    );
}

export async function createBattleState({
    playerCards = [],
    enemyHp = 20,
    enemyCards = [],
    mode = "casual",
    stageId = null
} = {}) {
    const collection = await getAll(STORES.COLLECTION);

    if (!collection.length) {
        throw new Error("A Coleção está vazia. Importe suas cartas antes de iniciar um duelo.");
    }

    if (playerCards.length < 25) {
        throw new Error("Seu baralho precisa ter exatamente 25 cartas.");
    }

    const sourcePlayer = playerCards.map(card => ({
        ...card,
        currentDef: Number(card.def) || 0
    }));

    const sourceEnemy = enemyCards.length
        ? enemyCards
        : collection;

    const state = {
        mode,
        stageId: stageId ? Number(stageId) : null,
        playerHp: 20,
        enemyHp: Number(enemyHp) || 20,

        playerMaxMana: 2,
        playerMana: 2,
        enemyMaxMana: 2,
        enemyMana: 2,

        round: 1,
        turn: "player",
        lanes: 5,

        playerDeck: buildDeck(sourcePlayer, "player"),
        enemyDeck: buildDeck(sourceEnemy, "enemy"),

        playerHand: [],
        enemyHand: [],
        playerBoard: Array(5).fill(null),
        enemyBoard: Array(5).fill(null),

        playerGraveyard: [],
        enemyGraveyard: [],

        sacrificedThisRound: false,
        selectedHandUid: null,
        selectedAttackerUid: null,
        uidCounter: 1000,

        status: "Seu turno."
    };

    drawCards(state, "player", 5);
    drawCards(state, "enemy", 5);

    return state;
}

export function drawCards(state, side, amount = 1) {
    const deck = side === "player" ? state.playerDeck : state.enemyDeck;
    const hand = side === "player" ? state.playerHand : state.enemyHand;

    for (let i = 0; i < amount; i++) {
        if (!deck.length) return false;

        const card = deck.shift();
        card.uid = card.uid || side + "-card-" + state.uidCounter++;
        hand.push(card);
    }

    return true;
}

export function playCard(state, side, handIndex, laneIndex) {
    const isPlayer = side === "player";
    const hand = isPlayer ? state.playerHand : state.enemyHand;
    const board = isPlayer ? state.playerBoard : state.enemyBoard;
    const manaKey = isPlayer ? "playerMana" : "enemyMana";

    if (laneIndex < 0 || laneIndex >= state.lanes) {
        throw new Error("Lane inválida.");
    }

    if (board[laneIndex]) {
        throw new Error("Essa lane já está ocupada.");
    }

    const card = hand[handIndex];

    if (!card) {
        throw new Error("Carta não encontrada na mão.");
    }

    const cost = Number(card.mana) || 0;

    if (state[manaKey] < cost) {
        throw new Error("Mana insuficiente.");
    }

    hand.splice(handIndex, 1);
    state[manaKey] -= cost;

    card.currentDef = Number(card.def) || 0;
    card.summonedRound = state.round;
    board[laneIndex] = card;

    return card;
}

export function sacrificeCard(state, side, handIndex) {
    if (state.sacrificedThisRound) {
        throw new Error("Você já sacrificou uma carta neste turno.");
    }

    if (side !== "player") {
        throw new Error("Sacrifício manual disponível apenas para o jogador.");
    }

    const card = state.playerHand[handIndex];

    if (!card) {
        throw new Error("Carta não encontrada na mão.");
    }

    state.playerHand.splice(handIndex, 1);
    state.playerGraveyard.push(card);
    state.playerMaxMana += 1;
    state.playerMana += 1;
    state.sacrificedThisRound = true;

    return card;
}

export function endPlayerTurn(state) {
    if (state.turn !== "player") {
        throw new Error("Não é o turno do jogador.");
    }

    state.turn = "enemy";
    state.selectedHandUid = null;
    state.selectedAttackerUid = null;

    return state;
}

export function startNextRound(state) {
    state.round += 1;
    state.turn = "player";
    state.playerMaxMana += 1;
    state.enemyMaxMana += 1;
    state.playerMana = state.playerMaxMana;
    state.enemyMana = state.enemyMaxMana;
    state.sacrificedThisRound = false;

    drawCards(state, "player", 1);
    drawCards(state, "enemy", 1);

    state.status = "Seu turno.";
    return state;
}

export function getBoardCard(state, side, laneIndex) {
    return (side === "player" ? state.playerBoard : state.enemyBoard)[laneIndex] || null;
}

export function getCardLocation(state, side, uid) {
    const board = side === "player" ? state.playerBoard : state.enemyBoard;

    return board.findIndex(card => card?.uid === uid);
}

export function isBattleOver(state) {
    return state.playerHp <= 0 || state.enemyHp <= 0;
}

export function getWinner(state) {
    if (state.playerHp <= 0 && state.enemyHp <= 0) return "draw";
    if (state.enemyHp <= 0) return "player";
    if (state.playerHp <= 0) return "enemy";
    return null;
}
