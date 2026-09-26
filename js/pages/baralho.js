import { getAll, STORES } from "../core/database.js";
import { getCardImage, escapeHtml } from "../core/utils.js";
import { initializeStarterInventory } from "../player/inventory.js";
import {
    isPlayerDeckEligible,
    saveStoryDeck,
    clearStoryDeck,
    STORY_DECK_SIZE
} from "../campaign/campaign.js";
import { addToDeck, removeFromDeck, clearDeck, MAX_DECK_SIZE, initializeStarterDeck } from "../player/deck.js";

const inventoryCount = document.getElementById("inventoryCount");
const deckCount = document.getElementById("deckCount");
const deckStatus = document.getElementById("deckStatus");
const inventoryGrid = document.getElementById("inventoryGrid");
const deckGrid = document.getElementById("deckGrid");
const clearDeckButton = document.getElementById("clearDeckButton");
const selectDeckButton = document.getElementById("selectDeckButton");
const deckSelectionOverlay = document.getElementById("deckSelectionOverlay");
const deckSelectionGrid = document.getElementById("deckSelectionGrid");
const deckSelectionCount = document.getElementById("deckSelectionCount");
const deckSelectionAvailable = document.getElementById("deckSelectionAvailable");
const deckSelectionStatus = document.getElementById("deckSelectionStatus");
const confirmDeckSelection = document.getElementById("confirmDeckSelection");
const cancelDeckSelection = document.getElementById("cancelDeckSelection");

let cards = [];
let inventory = [];
let deck = [];
let selectionCards = [];
let selection = new Set();

function cardById(id) {
    return cards.find(card => String(card.originalId) === String(id));
}

function deckUsage(originalId) {
    return deck.filter(item =>
        String(item.originalId) === String(originalId)
    ).length;
}


function updateSelectionSummary() {
    deckSelectionCount.textContent = selection.size;
    deckSelectionAvailable.textContent =
        selectionCards.length + " cartas elegíveis";

    confirmDeckSelection.disabled = selection.size !== STORY_DECK_SIZE;

    if (selection.size === STORY_DECK_SIZE) {
        deckSelectionStatus.textContent =
            "25 cartas selecionadas. Clique em “Usar este Deck” para aplicar.";
        deckSelectionStatus.classList.remove("is-error");
    } else {
        deckSelectionStatus.textContent =
            "Selecione " + (STORY_DECK_SIZE - selection.size) +
            " carta(s) para completar o deck.";
        deckSelectionStatus.classList.remove("is-error");
    }
}

function renderSelectionCards() {
    deckSelectionGrid.innerHTML = selectionCards.map(card => {
        const selected = selection.has(String(card.originalId));
        const image = getCardImage(card);

        return [
            '<button class="deck-selection-card ' + (selected ? 'is-selected' : '') +
                '" type="button" data-card-id="' + escapeHtml(card.originalId) + '">',
            image
                ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(card.name || "Carta") + '">'
                : '<span class="deck-selection-placeholder">?</span>',
            '<span class="deck-selection-check">✓</span>',
            '<span class="deck-selection-name">' + escapeHtml(card.name || "Sem nome") + '</span>',
            '<span class="deck-selection-meta">Mana ' + (Number(card.mana) || 0) +
                ' · ' + escapeHtml(card.collectionName || card.work || "Coleção") + '</span>',
            '</button>'
        ].join('');
    }).join('');

    updateSelectionSummary();
}

async function openDeckSelection() {
    const allCards = await getAll(STORES.COLLECTION);

    selectionCards = allCards
        .filter(isPlayerDeckEligible)
        .sort((a, b) =>
            String(a.name || "").localeCompare(String(b.name || ""), "pt-BR")
        );

    selection = new Set();

    if (selectionCards.length < STORY_DECK_SIZE) {
        deckSelectionGrid.innerHTML =
            '<div class="empty-inventory">' +
            'São necessárias pelo menos 25 cartas elegíveis para montar o deck. ' +
            'Atualmente existem ' + selectionCards.length + '.' +
            '</div>';
    } else {
        renderSelectionCards();
    }

    updateSelectionSummary();
    deckSelectionOverlay.classList.add("open");
    deckSelectionOverlay.setAttribute("aria-hidden", "false");
}

function closeDeckSelection() {
    deckSelectionOverlay.classList.remove("open");
    deckSelectionOverlay.setAttribute("aria-hidden", "true");
}

function setStatus(message, error = false) {
    deckStatus.textContent = message;
    deckStatus.classList.toggle("is-error", error);
}

function renderSummary() {
    inventoryCount.textContent = inventory.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
    );

    deckCount.textContent = deck.length + " / " + MAX_DECK_SIZE;
}

function renderInventory() {
    const owned = inventory
        .filter(item => Number(item.quantity || 0) > 0)
        .map(item => ({
            ...item,
            card: cardById(item.originalId)
        }))
        .filter(item => item.card)
        .sort((a, b) => a.card.name.localeCompare(b.card.name, "pt-BR"));

    if (!owned.length) {
        inventoryGrid.innerHTML =
            '<div class="empty-inventory">' +
            'Nenhuma carta no inventário ainda.<br>' +
            'As cartas recebidas como recompensa aparecerão aqui.' +
            '</div>';
        return;
    }

    inventoryGrid.innerHTML = owned.map(item => {
        const image = getCardImage(item.card);
        const used = deckUsage(item.originalId);

        return (
            '<button class="inventory-card" type="button" ' +
            'data-card-id="' + escapeHtml(item.originalId) + '">' +
                (image
                    ? '<img src="' + escapeHtml(image) + '" alt="' +
                      escapeHtml(item.card.name) + '">'
                    : '<span class="inventory-card-placeholder">?</span>') +
                '<span>' +
                    '<span class="inventory-card-name">' +
                        escapeHtml(item.card.name) +
                    '</span>' +
                    '<span class="inventory-card-count">' +
                        'Possui: ' + item.quantity +
                    '</span>' +
                    '<span class="inventory-card-used">' +
                        'No deck: ' + used +
                    '</span>' +
                '</span>' +
            '</button>'
        );
    }).join("");
}

function renderDeck() {
    const bySlot = new Map(
        deck.map(item => [Number(item.slot), item])
    );

    const slots = [];

    for (let slot = 1; slot <= MAX_DECK_SIZE; slot++) {
        const item = bySlot.get(slot);

        if (!item) {
            slots.push(
                '<div class="deck-slot empty">' +
                    '<span>' + slot + '</span>' +
                '</div>'
            );
            continue;
        }

        const card = cardById(item.originalId);
        const image = card ? getCardImage(card) : "";

        slots.push(
            '<div class="deck-slot" title="' +
            escapeHtml(card?.name || "Carta") + '">' +
                (image
                    ? '<img src="' + escapeHtml(image) + '" alt="' +
                      escapeHtml(card?.name || "Carta") + '">'
                    : '<div class="inventory-card-placeholder">?</div>') +
                '<span class="deck-slot-number">' + slot + '</span>' +
                '<button class="deck-slot-remove" type="button" ' +
                'data-slot="' + slot + '" aria-label="Remover carta">' +
                    '×' +
                '</button>' +
            '</div>'
        );
    }

    deckGrid.innerHTML = slots.join("");
}

async function reload() {
    cards = await getAll(STORES.COLLECTION);
    await initializeStarterInventory();
    await initializeStarterDeck();
    inventory = await getAll(STORES.INVENTORY);
    deck = await getAll(STORES.DECK);

    renderSummary();
    renderInventory();
    renderDeck();
}

inventoryGrid.addEventListener("click", async event => {
    const button = event.target.closest(".inventory-card");
    if (!button) return;

    const card = cardById(button.dataset.cardId);
    if (!card) return;

    try {
        await addToDeck(card);
        await reload();

        if (deck.length === MAX_DECK_SIZE) {
            setStatus("Deck completo: 25 cartas.");
        } else {
            setStatus("Carta adicionada ao deck.");
        }
    } catch (error) {
        setStatus(error.message, true);
    }
});

deckGrid.addEventListener("click", async event => {
    const button = event.target.closest(".deck-slot-remove");
    if (!button) return;

    try {
        await removeFromDeck(Number(button.dataset.slot));
        await reload();
        setStatus("Carta removida do deck.");
    } catch (error) {
        setStatus(error.message, true);
    }
});

selectDeckButton.addEventListener("click", async () => {
    try {
        await openDeckSelection();
    } catch (error) {
        setStatus(error.message || "Não foi possível abrir a seleção de deck.", true);
    }
});

deckSelectionGrid.addEventListener("click", event => {
    const button = event.target.closest(".deck-selection-card");
    if (!button) return;

    const id = String(button.dataset.cardId);

    if (selection.has(id)) {
        selection.delete(id);
    } else {
        if (selection.size >= STORY_DECK_SIZE) {
            deckSelectionStatus.textContent =
                "O deck já possui 25 cartas. Remova uma antes de escolher outra.";
            deckSelectionStatus.classList.add("is-error");
            return;
        }
        selection.add(id);
    }

    renderSelectionCards();
});

cancelDeckSelection.addEventListener("click", closeDeckSelection);

confirmDeckSelection.addEventListener("click", async () => {
    if (selection.size !== STORY_DECK_SIZE) return;

    confirmDeckSelection.disabled = true;
    deckSelectionStatus.textContent = "Aplicando novo deck...";

    try {
        await saveStoryDeck([...selection]);
        closeDeckSelection();
        await reload();
        setStatus("Novo deck aplicado. Ele será usado nas próximas batalhas.");
    } catch (error) {
        confirmDeckSelection.disabled = false;
        deckSelectionStatus.textContent =
            error.message || "Não foi possível aplicar o deck.";
        deckSelectionStatus.classList.add("is-error");
    }
});

clearDeckButton.addEventListener("click", async () => {
    if (!deck.length) return;

    await clearDeck();
    await clearStoryDeck();
    await reload();
    setStatus("Deck limpo. A História agora precisa de um novo deck.");
});

reload().catch(error => {
    console.error(error);
    setStatus("Não foi possível carregar o Inventário e o Deck.", true);
});
