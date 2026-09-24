import { getAll, STORES } from "../core/database.js";
import { getCardImage, escapeHtml } from "../core/utils.js";
import {
    createBattleState,
    playCard,
    sacrificeCard,
    endPlayerTurn,
    startNextRound,
    isBattleOver,
    getWinner
} from "../battle/battle.js";
import { resolveAttack } from "../battle/combat.js";
import { runAiTurn } from "../battle/ai.js";
import { completeStage, getStage } from "../campaign/campaign.js";
import {
    initializeStarterInventory
} from "../player/inventory.js";
import {
    initializeStarterDeck
} from "../player/deck.js";
import "../cards/card-sheet.js";

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") === "campaign" ? "campaign" : "casual";
const stageId = Number(params.get("stage")) || null;

const els = {
    arena: document.getElementById("arena"),
    playerHp: document.getElementById("playerHp"),
    enemyHp: document.getElementById("enemyHp"),
    playerMana: document.getElementById("playerMana"),
    enemyMana: document.getElementById("enemyMana"),
    round: document.getElementById("roundNumber"),
    turn: document.getElementById("turnLabel"),
    enemyName: document.getElementById("enemyName"),
    enemyHandCount: document.getElementById("enemyHandCount"),
    enemyDeckCount: document.getElementById("enemyDeckCount"),
    enemyGraveCount: document.getElementById("enemyGraveCount"),
    playerDeckCount: document.getElementById("playerDeckCount"),
    playerGraveCount: document.getElementById("playerGraveCount"),
    playerLanes: document.getElementById("playerLanes"),
    enemyLanes: document.getElementById("enemyLanes"),
    playerHand: document.getElementById("playerHand"),
    playerSheet: document.getElementById("playerCardSheet"),
    enemySheet: document.getElementById("enemyCardSheet"),
    status: document.getElementById("battleStatus"),
    message: document.getElementById("arenaMessage"),
    mode: document.getElementById("duelMode"),
    playCard: document.getElementById("playCardButton"),
    attack: document.getElementById("attackButton"),
    endTurn: document.getElementById("endTurnButton"),
    sacrifice: document.getElementById("sacrificeButton"),
    resultOverlay: document.getElementById("battleResultOverlay"),
    resultTitle: document.getElementById("battleResultTitle"),
    resultText: document.getElementById("battleResultText"),
    resultPrimary: document.getElementById("resultPrimary")
};

let state = null;
let busy = false;
let selectedEnemyUid = null;
const pendingClickTimers = new Map();

function cardHtml(card, side, location, selected = false) {
    const image = getCardImage(card);

    return `
        <div class="battle-card ${selected ? "is-selected" : ""}"
             data-side="${side}"
             data-location="${location}"
             data-uid="${escapeHtml(card.uid || "")}"
             title="Clique: selecionar e consultar · Duplo clique: ação">
            ${image
                ? '<img src="' + escapeHtml(image) + '" alt="' +
                  escapeHtml(card.name || "Carta") + '">'
                : '<div class="battle-card-placeholder">?</div>'}
        </div>
    `;
}

function renderHand() {
    els.playerHand.innerHTML = "";

    state.playerHand.forEach((card, index) => {
        els.playerHand.insertAdjacentHTML(
            "beforeend",
            cardHtml(
                card,
                "player-hand",
                index,
                card.uid === state.selectedHandUid
            )
        );
    });
}

function renderLanes(container, board, side) {
    container.innerHTML = "";

    board.forEach((card, laneIndex) => {
        const lane = document.createElement("div");

        lane.className =
            "lane " +
            (side === "player" ? "player-lane" : "enemy-lane");

        lane.dataset.lane = laneIndex;
        lane.dataset.side = side;

        if (
            side === "player" &&
            state.selectedHandUid &&
            !card &&
            state.turn === "player"
        ) {
            lane.classList.add("is-target");
        }

        if (
            side === "player" &&
            card?.uid === state.selectedAttackerUid
        ) {
            lane.classList.add("selected");
        }

        if (card) {
            lane.innerHTML = cardHtml(
                card,
                side,
                laneIndex,
                card.uid === state.selectedAttackerUid
            );
        } else {
            lane.innerHTML = '<span class="lane-empty">+</span>';
        }

        container.appendChild(lane);
    });
}

function renderHud() {
    els.playerHp.textContent = state.playerHp;
    els.enemyHp.textContent = state.enemyHp;

    els.playerMana.textContent =
        state.playerMana + " / " + state.playerMaxMana;

    els.enemyMana.textContent =
        state.enemyMana + " / " + state.enemyMaxMana;

    els.round.textContent = state.round;

    els.turn.textContent =
        state.turn === "player"
            ? "SEU TURNO"
            : "TURNO INIMIGO";

    els.enemyHandCount.textContent = state.enemyHand.length;
    els.enemyDeckCount.textContent = state.enemyDeck.length;
    els.enemyGraveCount.textContent = state.enemyGraveyard.length;

    els.playerDeckCount.textContent = state.playerDeck.length;
    els.playerGraveCount.textContent = state.playerGraveyard.length;

    const canAct =
        state.turn === "player" &&
        !busy;

    els.playCard.disabled =
        !canAct ||
        !state.selectedHandUid;

    els.attack.disabled =
        !canAct ||
        !state.selectedAttackerUid;

    els.endTurn.disabled =
        !canAct;

    els.sacrifice.disabled =
        !canAct ||
        state.sacrificedThisRound;
}

function renderSideSheet(container, card, sideLabel) {
    if (!container) return;

    if (!card) {
        container.innerHTML =
            '<div class="sheet-empty">' +
            'Selecione uma carta ' +
            sideLabel +
            ' para consultar a ficha.' +
            '</div>';
        return;
    }

    const image = getCardImage(card);
    const currentDef =
        card.currentDef ?? card.def ?? "—";

    const ability =
        String(card.ability || "").trim() ||
        "Nenhuma habilidade cadastrada.";

    container.innerHTML = `
        ${image
            ? '<img class="sheet-portrait" src="' +
              escapeHtml(image) +
              '" alt="' +
              escapeHtml(card.name || "Carta") +
              '">'
            : ""}
        <div class="sheet-kicker">FICHA DO PERSONAGEM</div>
        <h3 class="sheet-name">${escapeHtml(card.name || "Carta")}</h3>
        <div class="sheet-work">${escapeHtml(card.work || "Geral")}</div>
        <div class="sheet-line"></div>

        <div class="sheet-stats">
            <div class="sheet-stat">
                <strong>${card.mana ?? "—"}</strong>
                <span>Mana</span>
            </div>
            <div class="sheet-stat">
                <strong>${card.atk ?? "—"}</strong>
                <span>ATK</span>
            </div>
            <div class="sheet-stat">
                <strong>${currentDef}</strong>
                <span>DEF</span>
            </div>
        </div>

        <div class="sheet-ability">
            <strong>Habilidade</strong><br>
            ${escapeHtml(ability)}
        </div>
    `;
}

function renderSheets() {
    const playerCard =
        findHandCard(state?.selectedHandUid) ||
        findBoardCard(state?.selectedAttackerUid)?.card ||
        null;

    const enemyCard =
        findBoardCard(selectedEnemyUid)?.card ||
        null;

    renderSideSheet(
        els.playerSheet,
        playerCard,
        "das suas cartas"
    );

    renderSideSheet(
        els.enemySheet,
        enemyCard,
        "do adversário"
    );
}

function render() {
    if (!state) return;

    renderHud();
    renderHand();
    renderLanes(
        els.playerLanes,
        state.playerBoard,
        "player"
    );
    renderLanes(
        els.enemyLanes,
        state.enemyBoard,
        "enemy"
    );

    renderSheets();

    els.status.textContent = state.status;

    if (state.selectedHandUid) {
        els.message.textContent =
            "Carta selecionada. Escolha uma lane vazia ou clique em Jogar Carta.";
    } else if (state.selectedAttackerUid) {
        els.message.textContent =
            "Carta selecionada. Clique em Atacar ou escolha outra carta.";
    } else {
        els.message.textContent =
            "Clique para selecionar/consultar uma carta · Duplo clique para ação.";
    }
}

function findHandCard(uid) {
    return state?.playerHand.find(
        card => card.uid === uid
    );
}

function findHandIndex(uid) {
    return state?.playerHand.findIndex(
        card => card.uid === uid
    ) ?? -1;
}

function findBoardCard(uid) {
    if (!state || !uid) return null;

    for (const side of ["player", "enemy"]) {
        const board =
            side === "player"
                ? state.playerBoard
                : state.enemyBoard;

        const lane =
            board.findIndex(
                card => card?.uid === uid
            );

        if (lane >= 0) {
            return {
                side,
                lane,
                card: board[lane]
            };
        }
    }

    return null;
}

function openSheet(card) {
    if (!card) return;

    window.dispatchEvent(
        new CustomEvent("cardduels:open-sheet", {
            detail: card
        })
    );
}

function createDamageNumber(target, amount) {
    if (!target || !amount) return;

    const number =
        document.createElement("div");

    number.className = "damage-number";
    number.textContent = "-" + amount;

    target.appendChild(number);

    setTimeout(
        () => number.remove(),
        800
    );
}

function findCardElement(uid) {
    return document.querySelector(
        '.battle-card[data-uid="' +
        CSS.escape(String(uid)) +
        '"]'
    );
}

function animateAttack(
    attackerUid,
    defenderUid,
    direct = false
) {
    const attacker =
        findCardElement(attackerUid);

    const defender =
        defenderUid
            ? findCardElement(defenderUid)
            : null;

    if (attacker) {
        attacker.classList.add("anim-attack");

        setTimeout(
            () => attacker.classList.remove("anim-attack"),
            430
        );
    }

    if (defender) {
        defender.classList.add("anim-hit");

        setTimeout(
            () => defender.classList.remove("anim-hit"),
            360
        );
    } else {
        const hud =
            document.querySelector(
                ".duel-player-hud.enemy"
            );

        hud?.classList.add("anim-direct");

        setTimeout(
            () => hud?.classList.remove("anim-direct"),
            520
        );
    }

    return new Promise(resolve =>
        setTimeout(
            resolve,
            direct ? 520 : 390
        )
    );
}

async function performPlayerAttack(lane) {
    if (
        busy ||
        !state ||
        state.turn !== "player"
    ) {
        return;
    }

    const card =
        state.playerBoard[lane];

    if (!card) return;

    busy = true;

    state.selectedAttackerUid =
        card.uid;

    state.selectedHandUid = null;
    selectedEnemyUid = null;
    state.status =
        "Ataque em andamento...";

    render();

    const result =
        resolveAttack(
            state,
            "player",
            lane
        );

    await animateAttack(
        result.attacker.uid,
        result.defender?.uid || null,
        result.type === "direct"
    );

    if (result.defender) {
        const defenderElement =
            findCardElement(
                result.defender.uid
            );

        if (defenderElement) {
            createDamageNumber(
                defenderElement,
                result.damage
            );

            if (result.destroyed) {
                defenderElement.classList.add(
                    "anim-destroy"
                );

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            300
                        )
                );
            }
        }
    }

    state.selectedAttackerUid = null;

    if (isBattleOver(state)) {
        busy = false;
        render();
        finishBattle();
        return;
    }

    state.status =
        result.type === "direct"
            ? "Ataque direto!"
            : result.destroyed
                ? "O defensor foi destruído."
                : "Ataque concluído.";

    busy = false;
    render();
}

function clearPendingClick(uid) {
    const timer =
        pendingClickTimers.get(uid);

    if (timer) {
        clearTimeout(timer);
        pendingClickTimers.delete(uid);
    }
}

async function handleCardDoubleClick(
    cardElement
) {
    if (
        busy ||
        !state
    ) {
        return;
    }

    const side =
        cardElement.dataset.side;

    const location =
        Number(cardElement.dataset.location);

    const uid =
        cardElement.dataset.uid;

    clearPendingClick(uid);

    if (side === "player-hand") {
        if (state.turn !== "player") {
            return;
        }

        const card =
            state.playerHand[location];

        if (!card) return;

        if (state.sacrificeMode) {
            try {
                sacrificeCard(
                    state,
                    "player",
                    location
                );

                state.sacrificeMode = false;
                state.selectedHandUid = null;

                state.status =
                    card.name +
                    " foi sacrificada. +1 Mana máxima.";

                const element =
                    findCardElement(card.uid);

                if (element) {
                    element.classList.add(
                        "anim-sacrifice"
                    );

                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                360
                            )
                    );
                }
            } catch (error) {
                state.status =
                    error.message;
            }

            render();
            return;
        }

        state.selectedHandUid =
            state.selectedHandUid === card.uid
                ? null
                : card.uid;

        state.selectedAttackerUid = null;
        selectedEnemyUid = null;

        state.status =
            state.selectedHandUid
                ? "Carta selecionada."
                : "Seleção cancelada.";

        render();
        return;
    }

    if (side === "player") {
        await performPlayerAttack(
            location
        );
        return;
    }

    if (side === "enemy") {
        const boardCard =
            findBoardCard(uid);

        if (boardCard) {
            selectedEnemyUid = uid;
            state.selectedHandUid = null;
            state.selectedAttackerUid = null;
            render();
            openSheet(boardCard.card);
        }
    }
}

async function handleArenaClick(event) {
    const cardElement =
        event.target.closest(
            ".battle-card"
        );

    if (cardElement) {
        const uid =
            cardElement.dataset.uid;

        if (event.detail === 1) {
            clearPendingClick(uid);

            const timer =
                setTimeout(() => {
                    pendingClickTimers.delete(uid);

                    if (busy) return;

                    const side =
                        cardElement.dataset.side;

                    if (side === "player-hand") {
                        const card =
                            findHandCard(uid);

                        if (!card) return;

                        state.selectedHandUid =
                            state.selectedHandUid === uid
                                ? null
                                : uid;

                        state.selectedAttackerUid = null;
                        selectedEnemyUid = null;

                        state.sacrificeMode = false;

                        render();
                        openSheet(card);
                        return;
                    }

                    if (side === "player") {
                        const boardCard =
                            findBoardCard(uid);

                        if (!boardCard) return;

                        state.selectedAttackerUid =
                            uid;

                        state.selectedHandUid = null;
                        selectedEnemyUid = null;

                        render();
                        openSheet(boardCard.card);
                        return;
                    }

                    if (side === "enemy") {
                        const boardCard =
                            findBoardCard(uid);

                        if (!boardCard) return;

                        selectedEnemyUid = uid;
                        state.selectedHandUid = null;
                        state.selectedAttackerUid = null;

                        render();
                        openSheet(boardCard.card);
                    }
                }, 180);

            pendingClickTimers.set(
                uid,
                timer
            );

            return;
        }

        return;
    }

    const lane =
        event.target.closest(
            ".player-lane"
        );

    if (
        lane &&
        state.selectedHandUid &&
        state.turn === "player" &&
        !state.playerBoard[
            Number(lane.dataset.lane)
        ]
    ) {
        await summonSelected(
            Number(lane.dataset.lane)
        );
    }
}

async function summonSelected(
    laneIndex
) {
    if (
        busy ||
        !state.selectedHandUid
    ) {
        return;
    }

    const handIndex =
        findHandIndex(
            state.selectedHandUid
        );

    if (handIndex < 0) return;

    busy = true;

    try {
        const card =
            playCard(
                state,
                "player",
                handIndex,
                laneIndex
            );

        state.selectedHandUid = null;
        state.selectedAttackerUid = null;
        selectedEnemyUid = null;

        state.status =
            card.name +
            " foi invocado.";

        render();

        const element =
            findCardElement(
                card.uid
            );

        if (element) {
            element.classList.add(
                "anim-summon"
            );

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        420
                    )
            );
        }
    } catch (error) {
        state.status =
            error.message;
    }

    busy = false;
    render();
}

async function handlePlayCard() {
    if (
        busy ||
        !state ||
        state.turn !== "player"
    ) {
        return;
    }

    if (!state.selectedHandUid) {
        state.status =
            "Selecione uma carta da mão primeiro.";
        render();
        return;
    }

    const emptyLane =
        state.playerBoard.findIndex(
            card => card === null
        );

    if (emptyLane < 0) {
        state.status =
            "Seu campo está cheio.";
        render();
        return;
    }

    await summonSelected(
        emptyLane
    );
}

async function handleAttackButton() {
    if (
        busy ||
        !state ||
        state.turn !== "player"
    ) {
        return;
    }

    if (!state.selectedAttackerUid) {
        state.status =
            "Selecione uma carta do seu campo primeiro.";
        render();
        return;
    }

    const boardCard =
        findBoardCard(
            state.selectedAttackerUid
        );

    if (
        !boardCard ||
        boardCard.side !== "player"
    ) {
        return;
    }

    await performPlayerAttack(
        boardCard.lane
    );
}

async function handleSacrifice() {
    if (
        busy ||
        state.turn !== "player" ||
        state.sacrificedThisRound
    ) {
        return;
    }

    if (!state.playerHand.length) {
        state.status =
            "Sua mão está vazia.";
        render();
        return;
    }

    state.status =
        "Selecione uma carta da mão para sacrificar.";
    state.sacrificeMode = true;
    state.selectedHandUid = null;
    state.selectedAttackerUid = null;
    render();
}

async function handleEndTurn() {
    if (
        busy ||
        state.turn !== "player"
    ) {
        return;
    }

    busy = true;

    state.sacrificeMode = false;
    state.selectedHandUid = null;
    state.selectedAttackerUid = null;
    selectedEnemyUid = null;

    endPlayerTurn(state);

    state.status =
        "Turno inimigo...";

    render();

    await new Promise(
        resolve =>
            setTimeout(
                resolve,
                350
            )
    );

    const actions =
        runAiTurn(state);

    for (const action of actions) {
        render();

        if (action.type === "play") {
            const element =
                findCardElement(
                    action.card.uid
                );

            if (element) {
                element.classList.add(
                    "anim-summon"
                );

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            320
                        )
                );
            }
        }

        if (action.type === "attack") {
            await animateAttack(
                action.result.attacker.uid,
                action.result.defender?.uid || null,
                action.result.type === "direct"
            );

            if (action.result.defender) {
                const defenderElement =
                    findCardElement(
                        action.result.defender.uid
                    );

                if (defenderElement) {
                    createDamageNumber(
                        defenderElement,
                        action.result.damage
                    );

                    if (action.result.destroyed) {
                        defenderElement.classList.add(
                            "anim-destroy"
                        );

                        await new Promise(
                            resolve =>
                                setTimeout(
                                    resolve,
                                    280
                                )
                        );
                    }
                }
            }

            render();

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        250
                    )
            );
        }

        if (isBattleOver(state)) {
            break;
        }
    }

    if (isBattleOver(state)) {
        busy = false;
        render();
        finishBattle();
        return;
    }

    startNextRound(state);

    busy = false;
    render();
}

async function finishBattle() {
    const winner =
        getWinner(state);

    if (!winner) return;

    if (winner === "player") {
        els.resultTitle.textContent =
            mode === "campaign"
                ? "Oponente derrotado"
                : "Vitória";

        els.resultText.textContent =
            mode === "campaign"
                ? "A batalha terminou. Sua recompensa será definida na Campanha."
                : "Você venceu o duelo.";

        if (
            mode === "campaign" &&
            stageId
        ) {
            const stage =
                getStage(stageId);

            els.resultPrimary.textContent =
                "Escolher recompensa";

            els.resultPrimary.href =
                "campanha.html?reward=" +
                stageId;

            try {
                await completeStage(
                    stageId
                );
            } catch (error) {
                els.resultText.textContent =
                    error.message;

                els.resultPrimary.textContent =
                    "Voltar à campanha";

                els.resultPrimary.href =
                    "campanha.html";
            }

            if (stage) {
                els.resultText.textContent +=
                    " " +
                    stage.name +
                    " foi registrado como derrotado.";
            }
        }
    } else if (winner === "enemy") {
        els.resultTitle.textContent =
            "Derrota";

        els.resultText.textContent =
            mode === "campaign"
                ? "Você pode tentar novamente. A derrota não consome sua recompensa."
                : "O duelo terminou. Tente novamente.";

        els.resultPrimary.textContent =
            mode === "campaign"
                ? "Voltar à campanha"
                : "Continuar";

        els.resultPrimary.href =
            mode === "campaign"
                ? "campanha.html"
                : "index.html";
    } else {
        els.resultTitle.textContent =
            "Empate";

        els.resultText.textContent =
            "Os dois jogadores chegaram a 0 PV.";

        els.resultPrimary.textContent =
            "Continuar";

        els.resultPrimary.href =
            "index.html";
    }

    els.resultOverlay.classList.add(
        "is-open"
    );

    els.resultOverlay.setAttribute(
        "aria-hidden",
        "false"
    );
}

async function loadBattle() {
    const collection =
        await getAll(
            STORES.COLLECTION
        );

    if (!collection.length) {
        throw new Error(
            "A Coleção está vazia. Vá até Coleção e importe suas cartas."
        );
    }

    /*
     * O primeiro import já cria essas estruturas.
     * Estas chamadas também tornam o duelo seguro caso o jogador
     * entre diretamente nesta página.
     */
    await initializeStarterInventory();
    await initializeStarterDeck();

    const deckSlots =
        await getAll(
            STORES.DECK
        );

    if (deckSlots.length !== 25) {
        throw new Error(
            "Seu baralho precisa ter exatamente 25 cartas. " +
            "O jogo tentou criar o deck inicial automaticamente, " +
            "mas o Inventário não possui 25 cartas válidas."
        );
    }

    const playerCards = [];

    for (
        const slot of deckSlots.sort(
            (a, b) =>
                Number(a.slot) -
                Number(b.slot)
        )
    ) {
        const card =
            collection.find(
                item =>
                    item.originalId ===
                    slot.originalId
            );

        if (!card) {
            throw new Error(
                "Uma carta do seu baralho não foi encontrada na Coleção."
            );
        }

        playerCards.push({
            ...card
        });
    }

    let enemyHp = 20;
    let enemyName = "OPONENTE";

    if (mode === "campaign") {
        const stage =
            getStage(stageId);

        if (!stage) {
            throw new Error(
                "Oponente de campanha inválido."
            );
        }

        enemyHp = stage.hp;
        enemyName = stage.name;

        els.mode.textContent =
            "CAMPANHA · " +
            stage.number;
    } else {
        els.mode.textContent =
            "CASUAL";
    }

    state =
        await createBattleState({
            playerCards,
            enemyHp,
            enemyCards: collection,
            mode,
            stageId
        });

    els.enemyName.textContent =
        enemyName;

    render();
}

els.arena.addEventListener(
    "click",
    handleArenaClick
);

els.arena.addEventListener(
    "dblclick",
    event => {
        const cardElement =
            event.target.closest(
                ".battle-card"
            );

        if (cardElement) {
            handleCardDoubleClick(
                cardElement
            );
        }
    }
);

els.playCard.addEventListener(
    "click",
    handlePlayCard
);

els.attack.addEventListener(
    "click",
    handleAttackButton
);

els.endTurn.addEventListener(
    "click",
    handleEndTurn
);

els.sacrifice.addEventListener(
    "click",
    handleSacrifice
);

loadBattle().catch(error => {
    console.error(error);

    els.status.textContent =
        error.message;

    els.message.textContent =
        error.message;

    els.playCard.disabled = true;
    els.attack.disabled = true;
    els.endTurn.disabled = true;
    els.sacrifice.disabled = true;
});
