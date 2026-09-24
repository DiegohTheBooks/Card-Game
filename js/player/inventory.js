import { getAll, get, put, STORES } from "../core/database.js";

export async function getInventory() {
    return getAll(STORES.INVENTORY);
}

export async function getInventoryEntry(originalId) {
    return get(STORES.INVENTORY, originalId);
}

export async function addCardToInventory(originalId, quantity = 1) {
    const current = await getInventoryEntry(originalId);

    const nextQuantity =
        Math.max(0, Number(current?.quantity || 0) + Number(quantity));

    return put(STORES.INVENTORY, {
        originalId,
        quantity: nextQuantity
    });
}

export async function setInventoryQuantity(originalId, quantity) {
    return put(STORES.INVENTORY, {
        originalId,
        quantity: Math.max(0, Number(quantity) || 0)
    });
}

export async function initializeStarterInventory() {
    const cards = await getAll(STORES.COLLECTION);
    const inventory = await getInventory();

    if (inventory.length > 0 || cards.length === 0) {
        return inventory;
    }

    const starter = [
        ["Guardião", 2],
        ["Cavaleiro", 2],
        ["Mago", 2],
        ["Colosso", 2],
        ["Batedor", 5],
        ["Guerreiro", 4],
        ["Arqueiro", 4],
        ["Assassino", 4]
    ];

    const used = new Set();
    let starterTotal = 0;

    for (const [name, quantity] of starter) {
        const card = cards.find(item =>
            !used.has(item.originalId) &&
            String(item.name).trim().toLocaleLowerCase("pt-BR") ===
            name.toLocaleLowerCase("pt-BR")
        );

        if (!card) continue;

        used.add(card.originalId);
        starterTotal += quantity;

        await put(STORES.INVENTORY, {
            originalId: card.originalId,
            quantity
        });
    }

    /*
     * Se a Coleção importada não possuir as cartas-base antigas
     * (Guardião, Cavaleiro, etc.), ainda precisamos deixar o jogador
     * pronto para testar o jogo. Nesse caso, usamos as primeiras
     * cartas importadas como inventário inicial até completar 25 cartas.
     */
    if (starterTotal < 25) {
        await import("../core/database.js").then(async ({ clearStore }) => {
            await clearStore(STORES.INVENTORY);
        });

        for (let index = 0; index < 25; index++) {
            const card = cards[index % cards.length];

            const current = await getInventoryEntry(card.originalId);

            await put(STORES.INVENTORY, {
                originalId: card.originalId,
                quantity: Number(current?.quantity || 0) + 1
            });
        }
    }

    return getInventory();
}
