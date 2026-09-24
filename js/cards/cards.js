function firstValue(...values) {
    return values.find(value =>
        value !== undefined &&
        value !== null &&
        value !== ""
    );
}

export function normalizeCard(raw = {}) {
    const originalId = firstValue(
        raw.originalId,
        raw.id,
        raw.cardId
    );

    if (!originalId) {
        throw new Error("Uma carta não possui originalId/id.");
    }

    return {
        ...raw,
        originalId: String(originalId),
        name: String(firstValue(raw.name, raw.title, "Carta sem nome")),
        work: String(firstValue(
            raw.work,
            raw.collectionName,
            raw.collection,
            ""
        )),
        collectionId: firstValue(
            raw.collectionId,
            raw.collectionID,
            null
        ),
        image: String(firstValue(
            raw.image,
            raw.imageData,
            raw.imageUrl,
            raw.art,
            ""
        )),
        mana: Number(firstValue(raw.mana, raw.Mana, 0)) || 0,
        atk: Number(firstValue(raw.atk, raw.ATK, raw.attack, 0)) || 0,
        def: Number(firstValue(raw.def, raw.DEF, raw.defense, 0)) || 0,
        ability: String(firstValue(
            raw.ability,
            raw.abilityDescription,
            ""
        ))
    };
}

export function normalizeCards(cards = []) {
    const map = new Map();

    for (const raw of cards) {
        const card = normalizeCard(raw);
        map.set(card.originalId, card);
    }

    return [...map.values()];
}

export function normalizeCollection(raw = {}) {
    const id = raw.id ?? raw.collectionId;

    if (id === undefined || id === null || id === "") {
        throw new Error("Uma coleção não possui id.");
    }

    return {
        ...raw,
        id: String(id),
        name: String(raw.name ?? "Coleção sem nome"),
        createdAt: raw.createdAt ?? null
    };
}

export function normalizeCollections(collections = []) {
    const map = new Map();

    for (const raw of collections) {
        const collection = normalizeCollection(raw);
        map.set(collection.id, collection);
    }

    return [...map.values()];
}
