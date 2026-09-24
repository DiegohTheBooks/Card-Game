import { getAll, put, STORES } from "../core/database.js";

export const MAX_DECK_SIZE = 25;

export async function getDeck() {
    return getAll(STORES.DECK);
}

export async function getDeckCount() {
    return (await getDeck()).length;
}

export async function addToDeck(card, slot) {
    const deck = await getDeck();

    if (deck.length >= MAX_DECK_SIZE) {
        throw new Error("O deck já possui 25 cartas.");
    }

    return put(STORES.DECK, {
        slot,
        originalId: card.originalId
    });
}