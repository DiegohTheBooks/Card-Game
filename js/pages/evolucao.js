import { getAll, STORES } from "../core/database.js";
import { getInventory, evolveInventoryCard } from "../player/inventory.js";
import { getWallet, spendSilver } from "../player/currency.js";
import { getCardImage, escapeHtml } from "../core/utils.js";

export const EVOLUTION_COSTS = { T1: 50, T2: 100, T3: 200 };
const TIER_ORDER = ["T1", "T2", "T3", "T4"];
let cards = [], inventory = [], wallet = null, selectedId = null;

const els = {
    grid: document.getElementById("evolutionGrid"),
    empty: document.getElementById("evolutionEmpty"),
    silver: document.getElementById("evolutionSilver"),
    selected: document.getElementById("evolutionSelected"),
    message: document.getElementById("evolutionMessage")
};

function getEntry(id) { return inventory.find(item => String(item.originalId) === String(id)); }
function getCard(id) { return cards.find(item => String(item.originalId) === String(id)); }
function canEvolve(entry, tier) { return tier !== "T4" && Number(entry?.tiers?.[tier] || 0) >= 2; }
function renderWallet() { els.silver.textContent = wallet?.silver ?? 0; }

function renderSelected() {
    const card = getCard(selectedId), entry = getEntry(selectedId);
    if (!card || !entry) { els.selected.hidden = true; return; }
    els.selected.hidden = false;
    const image = getCardImage(card);

    els.selected.innerHTML = `
        <div class="evolution-selected-art">
            ${image ? <img src="${escapeHtml(image)}" alt="${escapeHtml(card.name || "Personagem")}"> : <div class="evolution-art-placeholder">?</div>}
        </div>
        <div class="evolution-selected-info">
            <p class="evolution-kicker">EVOLUÇÃO DO PERSONAGEM</p>
            <h2>${escapeHtml(card.name || "Carta")}</h2>
            <p class="evolution-work">${escapeHtml(card.work || "Sem obra/coleção")}</p>
            <div class="evolution-tiers">
                ${TIER_ORDER.map(tier => `<div class="evolution-tier ${Number(entry.tiers?.[tier] || 0) > 0 ? "has-copies" : ""}"><strong>${tier}</strong><span>${Number(entry.tiers?.[tier] || 0)} cópia(s)</span></div>`).join("")}
            </div>
            <div class="evolution-actions">
                ${TIER_ORDER.slice(0, -1).map(tier => {
                    const nextTier = TIER_ORDER[TIER_ORDER.indexOf(tier) + 1];
                    const cost = EVOLUTION_COSTS[tier];
                    const copies = Number(entry.tiers?.[tier] || 0);
                    const disabled = copies < 2 || Number(wallet?.silver || 0) < cost;
                    return `<div class="evolution-action"><div><strong>${tier} → ${nextTier}</strong><small>2× ${tier} + ${cost} Prata</small></div><button type="button" class="evolution-button" data-evolve-tier="${tier}" ${disabled ? "disabled" : ""}>Evoluir</button></div>`;
                }).join("")}
            </div>
            <p class="evolution-note">A evolução altera o estágio da carta na coleção. Os atributos de combate continuam sendo os definidos para o personagem.</p>
        </div>
    `;

    els.selected.querySelectorAll("[data-evolve-tier]").forEach(button => button.addEventListener("click", () => performEvolution(button.dataset.evolveTier)));
}

function renderGrid() {
    const ownedCards = cards.filter(card => {
        const entry = getEntry(card.originalId);
        return entry && Number(entry.quantity || 0) > 0;
    });
    els.empty.hidden = ownedCards.length > 0;

    els.grid.innerHTML = ownedCards.map(card => {
        const entry = getEntry(card.originalId);
        const total = Number(entry.quantity || 0);
        const hasEvolution = ["T2", "T3", "T4"].some(tier => Number(entry.tiers?.[tier] || 0) > 0);
        const image = getCardImage(card);
        return `<button type="button" class="evolution-card ${String(card.originalId) === String(selectedId) ? "is-selected" : ""}" data-card-id="${escapeHtml(String(card.originalId))}">
            <div class="evolution-card-art">${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy">` : `<span>?</span>`}${hasEvolution ? `<span class="evolution-badge">EVOLUÍDA</span>` : ""}</div>
            <div class="evolution-card-body"><strong>${escapeHtml(card.name || "Carta")}</strong><span>${escapeHtml(card.work || "Sem coleção")}</span><small>${total} carta(s) no inventário</small></div>
        </button>`;
    }).join("");

    els.grid.querySelectorAll("[data-card-id]").forEach(button => button.addEventListener("click", () => {
        selectedId = button.dataset.cardId;
        renderGrid();
        renderSelected();
    }));
}

async function performEvolution(fromTier) {
    const entry = getEntry(selectedId), cost = EVOLUTION_COSTS[fromTier];
    if (!entry || !canEvolve(entry, fromTier)) { showMessage("Você precisa de 2 cópias desse estágio para evoluir.", true); return; }
    if (Number(wallet?.silver || 0) < cost) { showMessage("Você não possui Prata suficiente para essa evolução.", true); return; }

    const card = getCard(selectedId);
    try {
        await spendSilver(cost);
        await evolveInventoryCard(selectedId, fromTier);
        inventory = await getInventory();
        wallet = await getWallet();
        const nextTier = TIER_ORDER[TIER_ORDER.indexOf(fromTier) + 1];
        showMessage((card?.name || "Carta") + " evoluiu de " + fromTier + " para " + nextTier + ".");
        renderWallet(); renderGrid(); renderSelected();
    } catch (error) {
        showMessage(error?.message || "Não foi possível evoluir a carta.", true);
        wallet = await getWallet(); renderWallet(); renderSelected();
    }
}

function showMessage(message, error = false) {
    els.message.textContent = message;
    els.message.classList.toggle("is-error", error);
    els.message.classList.add("is-visible");
    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => els.message.classList.remove("is-visible"), 4200);
}

async function load() {
    const [collection, currentInventory, currentWallet] = await Promise.all([getAll(STORES.COLLECTION), getInventory(), getWallet()]);
    cards = collection; inventory = currentInventory; wallet = currentWallet;
    renderWallet(); renderGrid(); renderSelected();
}

load().catch(error => { console.error(error); showMessage("Não foi possível carregar a página de evolução.", true); });
