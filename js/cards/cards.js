function firstValue(...values) {
    return values.find(value =>
        value !== undefined &&
        value !== null &&
        value !== ""
    );
}

function normalizeId(value) {
    return value === undefined || value === null || value === ""
        ? null
        : String(value);
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

    const path = Array.isArray(raw.path)
        ? raw.path.map(item => String(item)).filter(Boolean)
        : [];

    const collectionId = normalizeId(firstValue(
        raw.collectionId,
        raw.collectionID,
        null
    ));

    const categoryId = normalizeId(firstValue(
        raw.categoryId,
        raw.categoryID,
        null
    ));

    const collectionName = String(firstValue(
        raw.collectionName,
        raw.work,
        raw.collection,
        ""
    ));

    const categoryName = String(firstValue(
        raw.categoryName,
        categoryId ? "" : (path.length > 1 ? path[path.length - 1] : ""),
        ""
    ));

    const abilityId = firstValue(
        raw.abilityId,
        raw.abilityID,
        null
    );

    const abilityName = String(firstValue(
        raw.abilityName,
        raw.skillName,
        ""
    ));

    const abilityDescription = String(firstValue(
        raw.abilityDescription,
        raw.ability,
        raw.skillDescription,
        ""
    ));

    return {
        ...raw,
        originalId: String(originalId),
        name: String(firstValue(raw.name, raw.title, "Carta sem nome")),
        work: String(firstValue(
            raw.work,
            collectionName,
            raw.collection,
            ""
        )),
        collectionId,
        collectionName,
        categoryId,
        categoryName,
        path,
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

        // Formato oficial do Álbum V4.
        // O ID é usado pelo motor; os demais campos são usados pela ficha.
        abilityId: abilityId === null ? null : String(abilityId),
        abilityName,
        abilityDescription,
        ability: abilityDescription
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

    const parentId =
        raw.parentId === undefined || raw.parentId === null || raw.parentId === ""
            ? null
            : String(raw.parentId);

    return {
        ...raw,
        id: String(id),
        name: String(raw.name ?? "Coleção sem nome"),
        parentId,
        nodeType: String(
            raw.nodeType ??
            (parentId === null ? "collection" : "category")
        ),
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

export function getCardPath(card = {}) {
    if (Array.isArray(card.path) && card.path.length) {
        return card.path.map(item => String(item));
    }

    const path = [];
    if (card.collectionName) path.push(String(card.collectionName));
    if (card.categoryName && String(card.categoryName) !== String(card.collectionName)) {
        path.push(String(card.categoryName));
    }

    return path;
}
