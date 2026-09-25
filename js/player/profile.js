import { get, put, STORES } from "../core/database.js";

export const PLAYER_PROFILE_VERSION = 1;

/*
 * V7 — Perfil do Jogador
 *
 * Este sistema representa a progressão do autor dentro do jogo.
 * Não existe PvP: evolução de HP/Mana é intencional e faz parte
 * da experiência single-player.
 *
 * XP necessário para o próximo nível ainda é uma regra provisória.
 * A curva fica centralizada aqui para poder ser ajustada sem
 * alterar o restante do jogo.
 */
export const DEFAULT_PROFILE = {
    key: "player",
    version: PLAYER_PROFILE_VERSION,
    name: "Autor",
    avatar: "",
    presentation: "Dando vida aos personagens de Um Mundo Além das Páginas.",
    level: 0,
    xp: 0,
    totalXp: 0,
    maxHp: 20,
    startingMana: 2,
    createdAt: Date.now(),
    updatedAt: Date.now()
};

export function xpToNextLevel(level) {
    const safeLevel = Math.max(0, Number(level) || 0);
    return 100 + safeLevel * 25;
}

export function getProgress(profile) {
    const currentLevelXp = xpForLevel(profile.level);
    const nextLevelXp = xpToNextLevel(profile.level);
    const progressXp = Math.max(0, profile.totalXp - currentLevelXp);

    return {
        currentLevelXp,
        nextLevelXp,
        progressXp,
        percent: Math.min(
            100,
            Math.round((progressXp / nextLevelXp) * 100)
        )
    };
}

function xpForLevel(level) {
    let total = 0;
    for (let i = 0; i < Math.max(0, level); i += 1) {
        total += xpToNextLevel(i);
    }
    return total;
}

export function calculateLevelFromXp(totalXp) {
    let level = 0;
    let remaining = Math.max(0, Number(totalXp) || 0);

    while (remaining >= xpToNextLevel(level)) {
        remaining -= xpToNextLevel(level);
        level += 1;
    }

    return level;
}

export function derivePlayerStats(level) {
    const safeLevel = Math.max(0, Number(level) || 0);

    return {
        maxHp: 20 + safeLevel,
        startingMana: 2 + Math.floor(safeLevel / 5)
    };
}

export function normalizeProfile(profile = {}) {
    const merged = {
        ...DEFAULT_PROFILE,
        ...profile
    };

    const totalXp = Math.max(0, Number(merged.totalXp) || 0);
    const level = calculateLevelFromXp(totalXp);
    const stats = derivePlayerStats(level);

    return {
        ...merged,
        key: "player",
        version: PLAYER_PROFILE_VERSION,
        level,
        xp: Math.max(0, totalXp - xpForLevel(level)),
        totalXp,
        maxHp: stats.maxHp,
        startingMana: stats.startingMana,
        updatedAt: Date.now()
    };
}

export async function getPlayerProfile() {
    const stored = await get(STORES.PLAYER_PROFILE, "player");

    if (!stored) {
        const profile = normalizeProfile(DEFAULT_PROFILE);
        await put(STORES.PLAYER_PROFILE, profile);
        return profile;
    }

    const profile = normalizeProfile(stored);

    if (
        profile.level !== stored.level ||
        profile.totalXp !== stored.totalXp ||
        profile.maxHp !== stored.maxHp ||
        profile.startingMana !== stored.startingMana
    ) {
        await put(STORES.PLAYER_PROFILE, profile);
    }

    return profile;
}

export async function savePlayerProfile(changes = {}) {
    const current = await getPlayerProfile();

    const profile = normalizeProfile({
        ...current,
        ...changes,
        totalXp:
            changes.totalXp !== undefined
                ? changes.totalXp
                : current.totalXp
    });

    await put(STORES.PLAYER_PROFILE, profile);
    return profile;
}

export async function addXp(amount) {
    const current = await getPlayerProfile();
    const value = Math.max(0, Number(amount) || 0);

    return savePlayerProfile({
        totalXp: current.totalXp + value
    });
}

export function getLevelMilestone(level) {
    const safeLevel = Math.max(0, Number(level) || 0);

    return {
        hp: 20 + safeLevel,
        startingMana: 2 + Math.floor(safeLevel / 5)
    };
}
