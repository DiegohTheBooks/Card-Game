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
} from "../battle/battle.js?v=20260928-vfx72";
import { resolveAttack, getAttackBlockReason, getDynamicAtk, syncAllBoardStats } from "../battle/combat.js";
import { runAiTurnStep } from "../battle/ai.js";
import {
    buildAttackActionQueue,
    buildRoundEffectQueue
} from "../battle/combat-events.js";
import { completeStage, getStage, getEnemyDeckCards } from "../campaign/campaign.js";
import { getPlayerProfile } from "../player/profile.js";
import { grantReward } from "../player/rewards.js";
import { registerAchievementEvent } from "../player/achievements.js";
import { getStoryDeckCards } from "../campaign/campaign.js";
import { playSound, unlockAudio } from "../audio/audio.js";

let audioUnlocked = false;

async function ensureAudioUnlocked() {
    if (audioUnlocked) return;
    audioUnlocked = await unlockAudio();
}

window.addEventListener("pointerdown", ensureAudioUnlocked, { once: true });
window.addEventListener("keydown", ensureAudioUnlocked, { once: true });

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") === "campaign" ? "campaign" : "casual";
const stageId = Number(params.get("stage")) || null;

const els = {
    arena: document.getElementById("arena"),
    playerHp: document.getElementById("playerHp"),
    playerHpBar: document.getElementById("playerHpBar"),
    playerHpPercent: document.getElementById("playerHpPercent"),
    enemyHp: document.getElementById("enemyHp"),
    enemyHpBar: document.getElementById("enemyHpBar"),
    enemyHpPercent: document.getElementById("enemyHpPercent"),
    playerMana: document.getElementById("playerMana"),
    enemyMana: document.getElementById("enemyMana"),
    round: document.getElementById("roundNumber"),
    turn: document.getElementById("turnLabel"),
    enemyName: document.getElementById("enemyName"),
    enemyCounters: document.getElementById("enemyCounters"),
    playerCounters: document.getElementById("playerCounters"),
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
    endTurn: document.getElementById("endTurnButton"),
    sacrifice: document.getElementById("sacrificeButton"),
    resultOverlay: document.getElementById("battleResultOverlay"),
    resultTitle: document.getElementById("battleResultTitle"),
    resultText: document.getElementById("battleResultText"),
    resultPrimary: document.getElementById("resultPrimary"),
    fxLayer: document.getElementById("combatFxLayer")
};

let state = null;
let busy = false;
let selectedEnemyUid = null;
const pendingClickTimers = new Map();

function renderCardStats(card, side, location) {
    let atk = Number(card?.atk) || 0;
    let def = Number(card?.currentDef ?? card?.def) || 0;

    if (state && (side === "player" || side === "enemy")) {
        const lane = Number(location);
        const board = side === "player" ? state.playerBoard : state.enemyBoard;
        if (Number.isInteger(lane) && board[lane]?.uid === card.uid) {
            atk = getDynamicAtk(state, side, lane, card);
            def = Number(card.currentDef) || 0;
        }
    }

    return '<div class="card-stats">' +
        '<div class="card-stat mana"><span>◆</span><strong>' + (Number(card?.mana) || 0) + '</strong></div>' +
        '<div class="card-stat atk"><span>⚔</span><strong>' + atk + '</strong></div>' +
        '<div class="card-stat def"><span>♥</span><strong>' + def + '</strong></div>' +
        '</div>';
}

function getCardAuraClasses(card, side, location) {
    if (!card || side === "player-hand") return "";

    const classes = [];
    const abilityId = String(card.abilityId || "").toLowerCase();

    // A aura da habilidade identifica a função própria da carta.
    const abilityAura = {
        "investida": "aura-gold",
        "sangramento": "aura-red-source",
        "dreno": "aura-teal",
        "rompedor": "aura-orange",
        "golpe-amplo": "aura-purple",
        "armadura": "aura-silver",
        "retaliacao": "aura-yellow",
        "protetor": "aura-green-source",
        "atordoar": "aura-orange",
        "veneno": "aura-red-source",
        "predador-solitario": "aura-violet",
        "fortalecer": "aura-blue-source"
    };

    if (abilityAura[abilityId]) {
        classes.push(abilityAura[abilityId]);
    }

    const board = side === "player" ? state?.playerBoard : state?.enemyBoard;
    const lane = Number(location);

    // A carta que recebe um buff usa uma aura mais suave da mesma família.
    if (board && Number.isInteger(lane)) {
        if (lane > 0) {
            const left = board[lane - 1];
            if (left && String(left.abilityId || "").toLowerCase() === "fortalecer") {
                classes.push("aura-blue-received");
            }
            if (left && String(left.abilityId || "").toLowerCase() === "protetor") {
                classes.push("aura-green-received");
            }
        }

        if (lane < board.length - 1) {
            const right = board[lane + 1];
            if (right && String(right.abilityId || "").toLowerCase() === "fortalecer") {
                classes.push("aura-blue-received");
            }
            if (right && String(right.abilityId || "").toLowerCase() === "protetor") {
                classes.push("aura-green-received");
            }
        }
    }

    // Estados negativos pertencem à carta afetada, não à carta que os aplicou.
    if (card.statusEffects?.bleeding) {
        classes.push("aura-bleeding");
    }

    if (card.statusEffects?.poison) {
        classes.push("aura-poison");
    }

    // Atordoamento é um estado recebido.
    if (
        card.stunnedUntilRound &&
        state &&
        state.round <= Number(card.stunnedUntilRound)
    ) {
        classes.push("aura-stunned");
    }

    return [...new Set(classes)].join(" ");
}

function cardHtml(card, side, location, selected = false) {
    const image = getCardImage(card);
    const auraClasses = getCardAuraClasses(card, side, location);

    return '<div class="battle-card ' + auraClasses + " " + (selected ? "is-selected" : "") +
        '" data-side="' + side + '" data-location="' + location +
        '" data-uid="' + escapeHtml(card.uid || "") + '">' +
        '<div class="battle-card-art">' +
        (image ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(card.name || "Carta") + '">' :
            '<div class="battle-card-placeholder">?</div>') +
        '</div>' +
        renderCardStats(card, side, location) +
        '</div>';
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

function updateHealthMeter(value, maximum, bar, label) {
    if (!bar || !label) return;

    const max = Math.max(1, Number(maximum) || 1);
    const ratio = Math.max(0, Math.min(1, (Number(value) || 0) / max));
    const hud = bar.closest(".duel-player-hud");

    bar.style.width = (ratio * 100) + "%";
    label.textContent = Math.round(ratio * 100) + "%";

    hud?.classList.toggle("is-hurt", ratio < 0.72);
    hud?.classList.toggle("is-critical", ratio <= 0.32);
}

function renderHud() {
    els.playerHp.textContent = state.playerHp;
    els.enemyHp.textContent = state.enemyHp;

    updateHealthMeter(
        state.playerHp,
        state.playerMaxHp,
        els.playerHpBar,
        els.playerHpPercent
    );

    updateHealthMeter(
        state.enemyHp,
        state.enemyMaxHp || Math.max(20, Number(state.enemyHp) || 0),
        els.enemyHpBar,
        els.enemyHpPercent
    );

    els.playerMana.textContent =
        state.playerMana + " / " + state.playerMaxMana;

    els.enemyMana.textContent =
        state.enemyMana + " / " + state.enemyMaxMana;

    els.round.textContent = state.round;

    els.turn.textContent =
        state.turn === "player"
            ? "SEU TURNO"
            : "TURNO INIMIGO";

    els.enemyCounters.innerHTML =
        "Mão: " + state.enemyHand.length +
        " · Deck: " + state.enemyDeck.length +
        " · Cemitério: " + state.enemyGraveyard.length;

    els.playerCounters.innerHTML =
        "Deck: <strong>" + state.playerDeck.length +
        "</strong> · Cemitério: <strong>" +
        state.playerGraveyard.length + "</strong>";

    els.playerDeckCount.textContent = state.playerDeck.length;
    els.playerGraveCount.textContent = state.playerGraveyard.length;

    const canAct =
        state.turn === "player" &&
        !busy;

    els.endTurn.disabled =
        !canAct;

    els.sacrifice.disabled =
        !canAct ||
        state.sacrificedThisRound;
}

function renderSideSheet(container, card, sideLabel) {
    if (!container) return;
    if (!card) {
        container.innerHTML = '<div class="sheet-empty">Selecione uma carta ' + sideLabel + ' para consultar a ficha.</div>';
        return;
    }
    const image = getCardImage(card);
    const currentDef = card.currentDef ?? card.def ?? "—";
    const ability = String(card.ability || "").trim() || "Nenhuma habilidade cadastrada.";
    container.innerHTML = `
        <div class="sheet-card-area">
            ${image ? '<img class="sheet-portrait" src="' + escapeHtml(image) + '" alt="' + escapeHtml(card.name || "Carta") + '">' : '<div class="sheet-portrait-placeholder">Carta</div>'}
        </div>
        <div class="sheet-stats">
            <div class="sheet-stat"><strong>${card.mana ?? "—"}</strong><span>Mana</span></div>
            <div class="sheet-stat"><strong>${card.atk ?? "—"}</strong><span>ATK</span></div>
            <div class="sheet-stat"><strong>${currentDef}</strong><span>DEF</span></div>
        </div>
        <div class="sheet-character-info">
            <div class="sheet-kicker">FICHA DO PERSONAGEM</div>
            <h3 class="sheet-name">${escapeHtml(card.name || "Carta")}</h3>
            <div class="sheet-work">${escapeHtml(card.work || "Geral")}</div>
            <div class="sheet-line"></div>
            <div class="sheet-ability"><strong>Habilidade</strong><br>${escapeHtml(ability)}</div>
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

    syncAllBoardStats(state);
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
            "Carta selecionada. Escolha uma lane vazia para posicioná-la.";
    } else if (state.selectedAttackerUid) {
        els.message.textContent =
            "Carta selecionada. O ataque será resolvido ao avançar para a próxima rodada.";
    } else {
        els.message.textContent =
            "Clique em uma carta para consultar ou selecionar.";
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

function createFloatingNumber(target, amount, positive = false) {
    if (!target || !amount) return;

    const number = document.createElement("div");
    number.className = "damage-number" + (positive ? " heal-number" : "");
    number.textContent = (positive ? "+" : "-") + amount;
    target.appendChild(number);

    setTimeout(() => number.remove(), 800);
}

function findCardElement(uid) {
    return document.querySelector(
        '.battle-card[data-uid="' +
        CSS.escape(String(uid)) +
        '"]'
    );
}

function getElementCenter(element) {
    if (!element?.getBoundingClientRect) return null;

    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

function spawnBurst(target, tone = "damage", count = 9) {
    const point = getElementCenter(target);
    if (!point || !els.fxLayer) return;

    const burst = document.createElement("div");
    burst.className = "vfx-burst vfx-" + tone;
    burst.style.left = point.x + "px";
    burst.style.top = point.y + "px";

    for (let index = 0; index < count; index++) {
        const spark = document.createElement("i");
        spark.className = "vfx-spark";
        spark.style.setProperty(
            "--spark-angle",
            (index * (360 / count)) + "deg"
        );
        burst.appendChild(spark);
    }

    els.fxLayer.appendChild(burst);
    setTimeout(() => burst.remove(), 720);
}

function spawnProjectile(originTarget, destinationTarget, tone = "attack", side = "player") {
    const origin = getElementCenter(originTarget);
    const destination = getElementCenter(destinationTarget);
    if (!origin || !destination || !els.fxLayer) return;

    const projectile = document.createElement("span");
    projectile.className = "vfx-projectile" +
        (tone === "direct" ? " direct" : "") +
        (side === "enemy" ? " enemy-shot" : "");
    projectile.style.left = origin.x + "px";
    projectile.style.top = origin.y + "px";
    projectile.style.setProperty("--projectile-dx", (destination.x - origin.x) + "px");
    projectile.style.setProperty("--projectile-dy", (destination.y - origin.y) + "px");

    els.fxLayer.appendChild(projectile);
    requestAnimationFrame(() => projectile.classList.add("is-flying"));
    setTimeout(() => projectile.remove(), 470);
}

function spawnScreenFlash(side = "enemy") {
    if (!els.fxLayer) return;

    const flash = document.createElement("div");
    flash.className = "screen-flash " +
        (side === "player" ? "player-hit" : "enemy-hit");
    els.fxLayer.appendChild(flash);
    setTimeout(() => flash.remove(), 520);
}

function triggerScreenShake() {
    document.body.classList.remove("battle-screen-shake");
    requestAnimationFrame(() => document.body.classList.add("battle-screen-shake"));
    setTimeout(() => document.body.classList.remove("battle-screen-shake"), 380);
}

function showCombatCallout(name, text = "") {
    const callout = document.createElement("div");
    callout.className = "combat-callout";

    const title = document.createElement("strong");
    title.textContent = name;
    callout.appendChild(title);

    if (text) {
        const detail = document.createElement("span");
        detail.textContent = text;
        callout.appendChild(detail);
    }

    document.body.appendChild(callout);

    requestAnimationFrame(() => callout.classList.add("is-visible"));

    return new Promise(resolve => {
        setTimeout(() => {
            callout.classList.remove("is-visible");
            setTimeout(() => callout.remove(), 180);
            resolve();
        }, text ? 520 : 420);
    });
}

function pulseCard(uid, className = "anim-ability") {
    const element = uid ? findCardElement(uid) : null;
    if (!element) return;

    element.classList.add(className);
    setTimeout(() => element.classList.remove(className), 520);
}

function animateAttackLaunch(attackerUid, side, targetUid = null, direct = false) {
    playSound("attack");
    const attacker = findCardElement(attackerUid);
    const destination = targetUid
        ? findCardElement(targetUid)
        : document.querySelector(
            side === "player"
                ? ".duel-player-hud.enemy"
                : ".duel-player-hud.player"
        );

    if (attacker) {
        spawnBurst(
            attacker,
            side === "player" ? "attack" : "enemy-attack",
            7
        );
        spawnProjectile(
            attacker,
            destination,
            direct ? "direct" : "attack",
            side
        );
        attacker.classList.add("anim-attack", side === "player"
            ? "anim-attack-player"
            : "anim-attack-enemy");

        setTimeout(() => {
            attacker.classList.remove("anim-attack", "anim-attack-player", "anim-attack-enemy");
        }, 470);
    }

    return new Promise(resolve => setTimeout(resolve, 430));
}

function animateImpact(targetUid, amount = 0) {
    playSound("impact");
    const target = findCardElement(targetUid);

    if (!target) {
        return new Promise(resolve => setTimeout(resolve, 120));
    }

    target.classList.add("anim-hit", "vfx-hit-flash");
    spawnBurst(target, amount >= 5 ? "critical" : "damage", amount >= 5 ? 12 : 9);

    if (amount >= 4) {
        triggerScreenShake();
    }

    if (amount > 0) {
        createFloatingNumber(target, amount);
    }

    setTimeout(() => target.classList.remove("anim-hit", "vfx-hit-flash"), 380);

    return new Promise(resolve => setTimeout(resolve, 300));
}

function animateDirectHit(side, amount) {
    playSound("direct");
    const hudClass = side === "player" ? ".duel-player-hud.enemy" : ".duel-player-hud.player";
    const hud = document.querySelector(hudClass);

    if (hud) {
        renderHud();
        hud.classList.add("anim-direct");
        spawnBurst(hud, "direct", 14);
        spawnScreenFlash(side === "player" ? "enemy" : "player");
        triggerScreenShake();
        createFloatingNumber(hud, amount);
        setTimeout(() => hud.classList.remove("anim-direct"), 520);
    }

    return new Promise(resolve => setTimeout(resolve, 520));
}

async function animateDestroy(uid) {
    playSound("destroy");
    const element = findCardElement(uid);
    if (!element) return;

    element.classList.add("anim-destroy", "vfx-destroy-flash");
    spawnBurst(element, "destroy", 14);
    triggerScreenShake();
    setTimeout(() => element.classList.remove("vfx-destroy-flash"), 500);
    await new Promise(resolve => setTimeout(resolve, 430));
}

function getAbilitySound(name) {
    const normalized = String(name || "").toLowerCase();
    if (normalized.includes("dreno")) return "drain";
    if (normalized.includes("veneno")) return "poison";
    if (normalized.includes("sangramento")) return "bleeding";
    if (normalized.includes("atordoar")) return "stun";
    return "ability";
}

function getAbilityTone(name) {
    const normalized = String(name || "").toLowerCase();
    if (normalized.includes("veneno")) return "poison";
    if (normalized.includes("sangramento")) return "bleeding";
    if (normalized.includes("dreno") || normalized.includes("cura")) return "heal";
    if (normalized.includes("retalia")) return "critical";
    return "ability";
}

async function animateCombatAction(action) {
    switch (action.type) {
        case "attack":
            state.status = action.direct
                ? "Ataque direto ao PV!"
                : "A carta está atacando...";
            // Não redesenhar o tabuleiro aqui: o motor já pode ter removido
            // um defensor letal, mas a carta precisa permanecer visível até
            // a etapa de impacto e destruição terminarem.
            els.status.textContent = state.status;
            await animateAttackLaunch(
                action.attackerUid,
                action.side || "player",
                action.targetUid,
                action.direct
            );
            return;

        case "impact":
            state.status = "Impacto!";
            await animateImpact(action.targetUid, action.damage);
            return;

        case "damage":
            // O dano já foi calculado pelo motor. O número visual foi
            // apresentado junto ao impacto para manter o ritmo da batalha.
            return;

        case "ability":
            playSound(getAbilitySound(action.name));
            state.status = action.name + (action.text ? " — " + action.text : "");
            pulseCard(action.targetUid);
            spawnBurst(
                findCardElement(action.targetUid),
                getAbilityTone(action.name),
                10
            );
            await showCombatCallout(action.name, action.text);
            return;

        case "retaliation":
            playSound("retaliation");
            pulseCard(action.targetUid, "anim-retaliation");
            spawnBurst(findCardElement(action.targetUid), "critical", 10);
            createFloatingNumber(findCardElement(action.targetUid), action.amount);
            await new Promise(resolve => setTimeout(resolve, 430));
            return;

        case "heal":
            playSound("heal");
            pulseCard(action.targetUid, "anim-heal");
            spawnBurst(findCardElement(action.targetUid), "heal", 10);
            createFloatingNumber(findCardElement(action.targetUid), action.amount, true);
            await new Promise(resolve => setTimeout(resolve, 430));
            return;

        case "direct":
            state.status = "Dano direto: -" + action.amount + " PV.";
            await animateDirectHit(action.side || "player", action.amount);
            return;

        case "destroy":
            state.status = "Carta destruída.";
            await animateDestroy(action.targetUid);
            return;

        case "round-effect":
            playSound(action.name === "Sangramento" ? "bleeding" : "poison");
            state.status = action.name + " — " + action.text;
            pulseCard(action.targetUid);
            spawnBurst(
                findCardElement(action.targetUid),
                action.name === "Sangramento" ? "bleeding" : "poison",
                10
            );
            createFloatingNumber(findCardElement(action.targetUid), action.amount);
            await showCombatCallout(action.name, action.text);
            return;

        default:
            return;
    }
}

async function playCombatActionQueue(result) {
    const queue = buildAttackActionQueue(result);

    for (const action of queue) {
        await animateCombatAction(action);
        if (isBattleOver(state)) break;
    }

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
        state.selectedAttackerUid =
            state.selectedAttackerUid === uid ? null : uid;
        state.selectedHandUid = null;
        selectedEnemyUid = null;
        render();
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

                        // Em modo de sacrifício, um clique na carta
                        // confirma imediatamente o sacrifício.
                        // Antes, este bloco desligava sacrificeMode
                        // antes que a ação pudesse acontecer.
                        if (
                            state.sacrificeMode &&
                            state.turn === "player"
                        ) {
                            try {
                                sacrificeCard(
                                    state,
                                    "player",
                                    findHandIndex(uid)
                                );

                                state.sacrificeMode = false;
                                state.selectedHandUid = null;
                                state.selectedAttackerUid = null;

                                state.status =
                                    card.name +
                                    " foi sacrificada. +1 Mana máxima e +1 Mana atual.";

                                playSound("sacrifice");
                            } catch (error) {
                                state.status =
                                    error?.message ||
                                    "Não foi possível sacrificar esta carta.";
                            }

                            render();
                            return;
                        }

                        state.selectedHandUid =
                            state.selectedHandUid === uid
                                ? null
                                : uid;

                        state.selectedAttackerUid = null;
                        selectedEnemyUid = null;

                        state.sacrificeMode = false;

                        render();
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
    await ensureAudioUnlocked();

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

        playSound("summon");
        render();

        const element =
            findCardElement(
                card.uid
            );

        if (element) {
            spawnBurst(element, "summon", 13);
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

    const hasEmptyLane =
        state.playerBoard.some(
            card => card === null
        );

    if (!hasEmptyLane) {
        state.status =
            "Seu campo está cheio.";
        render();
        return;
    }

    /*
     * IMPORTANTE:
     * O botão não escolhe mais automaticamente a primeira lane.
     * Ele apenas ativa a carta selecionada para posicionamento.
     * O jogador precisa clicar na lane onde deseja colocá-la.
     */
    state.sacrificeMode = false;
    state.selectedAttackerUid = null;

    state.status =
        "Escolha uma das lanes vazias para colocar " +
        (findHandCard(state.selectedHandUid)?.name || "a carta") +
        ".";

    render();
}

async function handleSacrifice() {
    await ensureAudioUnlocked();

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
    if (busy || !state || state.turn !== "player") return;

    await ensureAudioUnlocked();

    busy = true;
    state.sacrificeMode = false;
    state.selectedHandUid = null;
    state.selectedAttackerUid = null;
    selectedEnemyUid = null;

    state.status = "Preparando o combate...";
    render();

    playSound("combat");
    await showCombatCallout("MOMENTO DE COMBATE");

    // Cada ataque é resolvido pelo motor antes de sua sequência visual.
    // A fila mantém a apresentação ordenada e previsível.
    for (let lane = 0; lane < state.lanes; lane++) {
        if (isBattleOver(state)) break;

        const card = state.playerBoard[lane];
        if (!card || getAttackBlockReason(state, "player", lane)) continue;

        const result = resolveAttack(state, "player", lane);
        await playCombatActionQueue(result);

        if (isBattleOver(state)) break;

        await new Promise(resolve => setTimeout(resolve, 180));
    }

    if (isBattleOver(state)) {
        busy = false;
        render();
        await finishBattle();
        return;
    }

    endPlayerTurn(state);
    state.status = "Turno do inimigo...";
    render();

    await showCombatCallout("TURNO DO INIMIGO");

    // A IA agora executa uma ação por vez. Assim, o jogador vê a
    // entrada de cada carta e cada ataque no mesmo ritmo do próprio lado.
    while (!isBattleOver(state)) {
        const action = runAiTurnStep(state);

        if (action.type === "pass") break;

        render();

        if (action.type === "play") {
            state.status = action.card.name + " foi invocado pelo inimigo.";
            playSound("summon");
            render();

            const element = findCardElement(action.card.uid);
            if (element) {
                spawnBurst(element, "summon", 13);
                element.classList.add("anim-summon");
                await new Promise(resolve => setTimeout(resolve, 420));
                element.classList.remove("anim-summon");
            }

            await new Promise(resolve => setTimeout(resolve, 160));
            continue;
        }

        if (action.type === "attack") {
            await playCombatActionQueue(action.result);

            if (isBattleOver(state)) break;

            await new Promise(resolve => setTimeout(resolve, 180));
        }
    }

    if (isBattleOver(state)) {
        busy = false;
        render();
        await finishBattle();
        return;
    }

    state.status = "Fim da rodada.";
    render();

    await new Promise(resolve => setTimeout(resolve, 300));

    // Os efeitos contínuos são calculados pelo motor e apresentados
    // antes de a nova rodada redesenhar o campo.
    const roundEffects = buildRoundEffectQueue(state);
    startNextRound(state);

    for (const effect of roundEffects) {
        await animateCombatAction(effect);
        if (isBattleOver(state)) break;
    }

    if (isBattleOver(state)) {
        busy = false;
        render();
        await finishBattle();
        return;
    }

    playSound("round");
    await showCombatCallout("NOVA RODADA");

    busy = false;
    render();
}
async function finishBattle() {
    const winner =
        getWinner(state);

    if (!winner) return;

    if (winner === "player") {
        playSound("victory");
        const stage = mode === "campaign" ? getStage(stageId) : null;
        const rewardType = mode === "campaign" ? (stage?.boss ? "BOSS" : "CAMPAIGN") : "CASUAL";
        const previousProfile = await getPlayerProfile();
        const previousLevel = previousProfile.level;
        const rewardResult = await grantReward(rewardType);
        const { reward, profile, wallet } = rewardResult;
        const leveledUp = profile.level > previousLevel;
        await registerAchievementEvent("battle", { won: true });

        if (mode === "campaign") {
            await registerAchievementEvent("campaign", { stageId });
        }

        if (mode === "campaign") {
            els.resultTitle.textContent = stage?.boss ? "Boss derrotado" : "Oponente derrotado";
            els.resultText.textContent =
                "Recompensa: +" + reward.xp + " XP, +" +
                reward.silver + " Prata." +
                (reward.gold > 0
                    ? " +" + reward.gold + " Ouro."
                    : "") +
                (leveledUp
                    ? " Você alcançou o nível " + profile.level + "!"
                    : "");
        } else {
            els.resultTitle.textContent = "Vitória";
            els.resultText.textContent =
                "Recompensa: +" + reward.xp + " XP, +" +
                reward.silver + " Prata." +
                (reward.gold > 0
                    ? " +" + reward.gold + " Ouro."
                    : "") +
                (leveledUp
                    ? " Você alcançou o nível " + profile.level + "!"
                    : "");
        }

        if (mode === "campaign" && stageId) {
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
        playSound("defeat");
        await registerAchievementEvent("battle", { won: false });

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
        playSound("combat");
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

    let playerCards = [];

    if (mode === "campaign") {
        const storyDeck = await getStoryDeckCards();

        if (!storyDeck) {
            throw new Error(
                "Seu Baralho da História está vazio ou incompleto. " +
                "Volte à página Baralho e use Selecionar Deck para escolher 25 cartas."
            );
        }

        playerCards = storyDeck.map(card => ({ ...card }));
    } else {
        const deckSlots = await getAll(STORES.DECK);

        if (deckSlots.length !== 25) {
            throw new Error(
                "Seu baralho precisa ter exatamente 25 cartas. " +
                "Configure-o na página Baralho antes de iniciar um duelo casual."
            );
        }

        for (const slot of deckSlots.sort(
            (a, b) => Number(a.slot) - Number(b.slot)
        )) {
            const card = collection.find(
                item => String(item.originalId) === String(slot.originalId)
            );

            if (!card) {
                throw new Error(
                    "Uma carta do seu baralho não foi encontrada na Coleção."
                );
            }

            playerCards.push({ ...card });
        }
    }

    let enemyHp = 20;
    let enemyName = "OPONENTE";
    let enemyCards = collection;
    let aiStrategy = "balanced";

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
        aiStrategy = stage.strategy;
        enemyCards = await getEnemyDeckCards(stage.id);

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
            enemyCards,
            mode,
            stageId
        });

    state.aiStrategy = aiStrategy;

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

    els.endTurn.disabled = true;
    els.sacrifice.disabled = true;
});
