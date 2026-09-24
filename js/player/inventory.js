import { getAll, put, STORES } from "../core/database.js";

export async function getInventory() {
    return getAll(STORES.INVENTORY);
}

export async function addCardToInventory(originalId, quantity = 1) {
    const inventory = (await getInventory()).find(card => card.originalId === originalId);
    const next = {
        originalId,
        quantity: Math.max(0, Number(inventory?.quantity || 0) + quantity)
    };

    return put(STORES.INVENTORY, next);
}