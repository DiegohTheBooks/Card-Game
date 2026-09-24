import { getAll, STORES } from "../core/database.js";
import { getCardImage, escapeHtml } from "../core/utils.js";
import { initializeStarterInventory } from "../player/inventory.js";
import { addToDeck, removeFromDeck, clearDeck, MAX_DECK_SIZE, initializeStarterDeck } from "../player/deck.js";

const inventoryCount = document.getElementById("inventoryCount");
const deckCount = document.getElementById("deckCount");
const deckStatus = document.getElementById("deckStatus");
const inventoryGrid = document.getElementById("inventoryGrid");
const deckGrid = document.getElementById("deckGrid");
const clearDeckButton = document.getElementById("clearDeckButton");

let cards = [];
let inventory = [];
let deck = [];

function cardById(id) {
    return cards.find(card => String(card.originalId) === String(id));
}

function deckUsage(originalId) {
    return deck.filter(item =>
        String(item.originalId) === String(originalId)
    ).length;
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

clearDeckButton.addEventListener("click", async () => {
    if (!deck.length) return;

    await clearDeck();
    await reload();
    setStatus("Deck limpo.");
});

reload().catch(error => {
    console.error(error);
    setStatus("Não foi possível carregar o Inventário e o Deck.", true);
});
