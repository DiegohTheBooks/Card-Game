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
    // O deck inicial agora é escolhido pelo jogador no primeiro acesso à História.
    // Mantemos esta função por compatibilidade com versões anteriores.
    return getInventory();
}
