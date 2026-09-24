export function normalizeCard(raw = {}) {
    return {
        ...raw,
        originalId: raw.originalId ?? raw.id ?? crypto.randomUUID(),
        name: raw.name ?? raw.title ?? "Carta sem nome",
        work: raw.work ?? raw.collectionName ?? raw.collection ?? "",
        image: raw.image ?? raw.imageData ?? raw.imageUrl ?? raw.art ?? "",
        mana: Number(raw.mana ?? raw.Mana ?? 0),
        atk: Number(raw.atk ?? raw.ATK ?? raw.attack ?? 0),
        def: Number(raw.def ?? raw.DEF ?? raw.defense ?? 0),
        ability: raw.ability ?? raw.abilityDescription ?? ""
    };
}

export function normalizeCards(cards = []) {
    return cards.map(normalizeCard);
}