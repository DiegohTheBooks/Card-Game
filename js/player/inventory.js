import { getAll, get, put, STORES } from "../core/database.js";
import { registerAchievementEvent } from "./achievements.js";

const TIERS = ["T1", "T2", "T3", "T4"];

async function discoverCard(originalId, source = "inventory") {
    if (originalId == null) return;

    const id = String(originalId);
    const existing = await get(STORES.CODEX, id);

    if (existing) return existing;

    return put(STORES.CODEX, {
        originalId: id,
        discoveredAt: new Date().toISOString(),
        source
    });
}

function normalizeTierQuantities(entry = {}) {
    const tiers = entry.tiers || {};
    const legacyQuantity = Math.max(0, Number(entry.quantity) || 0);

    return {
        T1: Math.max(0, Number(tiers.T1 ?? legacyQuantity) || 0),
        T2: Math.max(0, Number(tiers.T2) || 0),
        T3: Math.max(0, Number(tiers.T3) || 0),
        T4: Math.max(0, Number(tiers.T4) || 0)
    };
}

function totalTierQuantity(tiers) {
    return TIERS.reduce(
        (total, tier) => total + Math.max(0, Number(tiers[tier]) || 0),
        0
    );
}

function normalizeInventoryEntry(entry) {
    const tiers = normalizeTierQuantities(entry);

    return {
        ...entry,
        originalId: entry.originalId,
        quantity: totalTierQuantity(tiers),
        tiers
    };
}

async function migrateEntry(entry) {
    const normalized = normalizeInventoryEntry(entry);

    const changed =
        !entry.tiers ||
        Number(entry.quantity) !== normalized.quantity ||
        TIERS.some(tier =>
            Number(entry.tiers?.[tier] || 0) !== normalized.tiers[tier]
        );

    if (changed) {
        await put(STORES.INVENTORY, normalized);
    }

    return normalized;
}

export async function getInventory() {
    const entries = await getAll(STORES.INVENTORY);
    return Promise.all(entries.map(migrateEntry));
}

export async function getInventoryEntry(originalId) {
    const entry = await get(STORES.INVENTORY, originalId);

    if (!entry) return null;

    return migrateEntry(entry);
}

export async function addCardToInventory(originalId, quantity = 1) {
    const current = await getInventoryEntry(originalId);
    const tiers = normalizeTierQuantities(current || {});
    const amount = Number(quantity) || 0;

    tiers.T1 = Math.max(0, tiers.T1 + amount);

    const result = await put(STORES.INVENTORY, {
        ...(current || {}),
        originalId,
        quantity: totalTierQuantity(tiers),
        tiers
    });

    if (amount > 0) {
        await discoverCard(originalId, "inventory");
        const discovered = await getAll(STORES.CODEX);
        await registerAchievementEvent("discovery", {
            discoveredCards: discovered.length
        });
    }

    return result;
}

export async function setInventoryQuantity(originalId, quantity) {
    const current = await getInventoryEntry(originalId);
    const tiers = normalizeTierQuantities(current || {});

    tiers.T1 = Math.max(0, Number(quantity) || 0);

    return put(STORES.INVENTORY, {
        ...(current || {}),
        originalId,
        quantity: totalTierQuantity(tiers),
        tiers
    });
}

export async function evolveInventoryCard(originalId, fromTier) {
    const tier = String(fromTier || "").toUpperCase();
    const tierIndex = TIERS.indexOf(tier);

    if (tierIndex < 0 || tierIndex >= TIERS.length - 1) {
        throw new Error("Essa evolução não é válida.");
    }

    const current = await getInventoryEntry(originalId);

    if (!current) {
        throw new Error("Carta não encontrada no inventário.");
    }

    const tiers = normalizeTierQuantities(current);

    if (tiers[tier] < 2) {
        throw new Error("Você precisa de 2 cópias da mesma evolução.");
    }

    tiers[tier] -= 2;
    tiers[TIERS[tierIndex + 1]] += 1;

    return put(STORES.INVENTORY, {
        ...current,
        originalId,
        quantity: totalTierQuantity(tiers),
        tiers
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
            quantity,
            tiers: {
                T1: quantity,
                T2: 0,
                T3: 0,
                T4: 0
            }
        });

        await discoverCard(card.originalId, "starter");
    }

    if (starterTotal < 25) {
        await import("../core/database.js").then(async ({ clearStore }) => {
            await clearStore(STORES.INVENTORY);
        });

        for (let index = 0; index < 25; index++) {
            const card = cards[index % cards.length];
            const current = await getInventoryEntry(card.originalId);
            const tiers = normalizeTierQuantities(current || {});

            tiers.T1 += 1;

            await put(STORES.INVENTORY, {
                originalId: card.originalId,
                quantity: totalTierQuantity(tiers),
                tiers
            });

            await discoverCard(card.originalId, "starter-fallback");
        }
    }

    return getInventory();
}
