import { put, STORES } from "../core/database.js";
import { normalizeCards } from "./cards.js";

export function extractCards(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.cards)) return payload.cards;
    if (Array.isArray(payload?.collection?.cards)) return payload.collection.cards;
    if (Array.isArray(payload?.data?.cards)) return payload.data.cards;
    return [];
}

export async function importCollectionJson(payload) {
    const cards = normalizeCards(extractCards(payload));

    for (const card of cards) {
        await put(STORES.COLLECTION, card);
    }

    return cards;
}