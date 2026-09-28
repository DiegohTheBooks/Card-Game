import { get, put, STORES } from "../core/database.js";

export const CURRENCY_VERSION = 1;

export const DEFAULT_WALLET = {
    key: "player",
    version: CURRENCY_VERSION,
    silver: 0,
    gold: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
};

function normalizeAmount(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
}

export function normalizeWallet(wallet = {}) {
    return {
        ...DEFAULT_WALLET,
        ...wallet,
        key: "player",
        version: CURRENCY_VERSION,
        silver: normalizeAmount(wallet.silver),
        gold: normalizeAmount(wallet.gold),
        updatedAt: Date.now()
    };
}

export async function getWallet() {
    const stored = await get(STORES.PLAYER_WALLET, "player");

    if (!stored) {
        const wallet = normalizeWallet(DEFAULT_WALLET);
        await put(STORES.PLAYER_WALLET, wallet);
        return wallet;
    }

    const wallet = normalizeWallet(stored);

    if (
        wallet.silver !== stored.silver ||
        wallet.gold !== stored.gold
    ) {
        await put(STORES.PLAYER_WALLET, wallet);
    }

    return wallet;
}

export async function saveWallet(changes = {}) {
    const current = await getWallet();

    const wallet = normalizeWallet({
        ...current,
        ...changes
    });

    await put(STORES.PLAYER_WALLET, wallet);
    return wallet;
}

export async function addSilver(amount) {
    const value = normalizeAmount(amount);
    const wallet = await getWallet();

    return saveWallet({
        silver: wallet.silver + value
    });
}

export async function addGold(amount) {
    const value = normalizeAmount(amount);
    const wallet = await getWallet();

    return saveWallet({
        gold: wallet.gold + value
    });
}

export async function addCurrency({ silver = 0, gold = 0 } = {}) {
    const wallet = await getWallet();

    return saveWallet({
        silver: wallet.silver + normalizeAmount(silver),
        gold: wallet.gold + normalizeAmount(gold)
    });
}

export async function spendSilver(amount) {
    const value = normalizeAmount(amount);
    const wallet = await getWallet();

    if (wallet.silver < value) {
        throw new Error("Prata insuficiente.");
    }

    return saveWallet({
        silver: wallet.silver - value
    });
}

export async function spendGold(amount) {
    const value = normalizeAmount(amount);
    const wallet = await getWallet();

    if (wallet.gold < value) {
        throw new Error("Ouro insuficiente.");
    }

    return saveWallet({
        gold: wallet.gold - value
    });
}

export async function spendCurrency({ silver = 0, gold = 0 } = {}) {
    const silverValue = normalizeAmount(silver);
    const goldValue = normalizeAmount(gold);
    const wallet = await getWallet();

    if (wallet.silver < silverValue) {
        throw new Error("Prata insuficiente.");
    }

    if (wallet.gold < goldValue) {
        throw new Error("Ouro insuficiente.");
    }

    return saveWallet({
        silver: wallet.silver - silverValue,
        gold: wallet.gold - goldValue
    });
}
