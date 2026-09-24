import { getAll, put, get, clearStore, STORES } from "../core/database.js";

export const MAX_DECK_SIZE = 25;

export async function getDeck() {
    return getAll(STORES.DECK);
}

export async function getDeckCount() {
    return (await getDeck()).length;
}

export async function addToDeck(card, slot = null) {
    const deck = await getDeck();

    if (deck.length >= MAX_DECK_SIZE) {
        throw new Error("O deck já possui 25 cartas.");
    }

    const owned = (await get(STORES.INVENTORY, card.originalId))?.quantity || 0;
    const used = deck.filter(item => item.originalId === card.originalId).length;

    if (used >= owned) {
        throw new Error("Você não possui cópias suficientes dessa carta.");
    }

    const occupied = new Set(deck.map(item => Number(item.slot)));
    let targetSlot = Number(slot);

    if (!Number.isInteger(targetSlot) || targetSlot < 1 || occupied.has(targetSlot)) {
        targetSlot = 1;
        while (occupied.has(targetSlot)) targetSlot++;
    }

    return put(STORES.DECK, {
        slot: targetSlot,
        originalId: card.originalId
    });
}

export async function removeFromDeck(slot) {
    const deck = await getDeck();
    const item = deck.find(card => Number(card.slot) === Number(slot));

    if (!item) return false;

    const db = await import("../core/database.js");
    const database = await db.openDatabase();

    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORES.DECK, "readwrite");
        tx.objectStore(STORES.DECK).delete(Number(slot));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}

export async function clearDeck() {
    return clearStore(STORES.DECK);
}


export async function initializeStarterDeck() {
    const currentDeck = await getDeck();

    if (currentDeck.length > 0) {
        return currentDeck;
    }

    const inventory = await getAll(STORES.INVENTORY);
    const cards = await getAll(STORES.COLLECTION);

    if (!inventory.length || !cards.length) {
        return [];
    }

    const cardById = new Map(
        cards.map(card => [String(card.originalId), card])
    );

    const owned = [];

    for (const item of inventory) {
        const quantity = Math.max(0, Number(item.quantity) || 0);

        if (!quantity || !cardById.has(String(item.originalId))) {
            continue;
        }

        for (let copy = 0; copy < quantity; copy++) {
            owned.push(cardById.get(String(item.originalId)));
        }
    }

    const selected = owned.slice(0, MAX_DECK_SIZE);

    if (selected.length < MAX_DECK_SIZE) {
        throw new Error(
            "O Inventário inicial possui menos de 25 cartas. " +
            "Não foi possível montar o deck inicial."
        );
    }

    for (let index = 0; index < selected.length; index++) {
        await put(STORES.DECK, {
            slot: index + 1,
            originalId: selected[index].originalId
        });
    }

    return getDeck();
}
