import {
    replaceCollection,
    put,
    get,
    STORES
} from "../core/database.js";

import {
    normalizeCard,
    normalizeCards,
    normalizeCollections
} from "./cards.js";

import { initializeStarterInventory } from "../player/inventory.js";
import { initializeStarterDeck } from "../player/deck.js";

export function extractCards(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.cards)) {
        return payload.cards;
    }

    if (Array.isArray(payload?.collection?.cards)) {
        return payload.collection.cards;
    }

    if (Array.isArray(payload?.data?.cards)) {
        return payload.data.cards;
    }

    if (payload?.card) {
        return [payload.card];
    }

    if (payload?.data?.card) {
        return [payload.data.card];
    }

    return [];
}

export function extractCollections(payload) {
    if (Array.isArray(payload?.collections)) {
        return payload.collections;
    }

    if (Array.isArray(payload?.data?.collections)) {
        return payload.data.collections;
    }

    return [];
}

export function detectImportType(payload) {
    if (payload?.card || payload?.data?.card) {
        return "single";
    }

    if (
        Array.isArray(payload?.cards) ||
        Array.isArray(payload?.collections) ||
        Array.isArray(payload?.data?.cards)
    ) {
        return "collection";
    }

    if (Array.isArray(payload)) {
        return "collection";
    }

    return "unknown";
}

async function ensureSingleCardCollection(card) {
    if (!card.collectionId || !card.collectionName) {
        return;
    }

    const existing = await get(STORES.COLLECTIONS, card.collectionId);

    if (existing) {
        return;
    }

    await put(STORES.COLLECTIONS, {
        id: String(card.collectionId),
        name: String(card.collectionName),
        parentId: null,
        nodeType: "collection",
        createdAt: card.createdAt ?? null
    });
}

export async function importCollectionJson(payload) {
    const rawCards = extractCards(payload);

    if (!rawCards.length) {
        throw new Error(
            "O JSON não contém nenhuma carta reconhecível."
        );
    }

    const cards = normalizeCards(rawCards);
    const collections = normalizeCollections(
        extractCollections(payload)
    );

    await replaceCollection({
        collections,
        cards
    });

    // Primeiro import: deixa o jogador pronto para jogar.
    await initializeStarterInventory();
    await initializeStarterDeck();

    return {
        type: "collection",
        cards,
        collections
    };
}

export async function importSingleCardJson(payload) {
    const rawCards = extractCards(payload);

    if (rawCards.length !== 1) {
        throw new Error(
            "O arquivo de carta individual não contém exatamente uma carta."
        );
    }

    const card = normalizeCard(rawCards[0]);

    // Importação individual nunca apaga as demais cartas.
    await ensureSingleCardCollection(card);
    await put(STORES.COLLECTION, card);

    return {
        type: "single",
        cards: [card],
        collections: card.collectionId && card.collectionName
            ? [{
                id: card.collectionId,
                name: card.collectionName,
                parentId: null,
                nodeType: "collection"
            }]
            : []
    };
}

export async function importJsonPayload(payload) {
    const type = detectImportType(payload);

    if (type === "single") {
        return importSingleCardJson(payload);
    }

    if (type === "collection") {
        return importCollectionJson(payload);
    }

    throw new Error(
        "Formato não reconhecido. Selecione um JSON exportado pelo Álbum/Criador."
    );
}
