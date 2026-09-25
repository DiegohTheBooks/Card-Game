import { get, getAll, put, STORES } from "../core/database.js";
import { addCurrency } from "./currency.js";
import { addXp } from "./profile.js";

export const ACHIEVEMENT_VERSION = 1;

const DEFAULT_STATS = {
    victories: 0,
    defeats: 0,
    winStreak: 0,
    bestWinStreak: 0,
    campaignVictories: 0,
    campaignStagesDefeated: [],
    discoveredCards: 0,
    evolvedT2: 0,
    evolvedT3: 0,
    evolvedT4: 0
};

export const ACHIEVEMENTS = [
    { id:"first-victory", title:"Primeira Vitória", description:"Vença seu primeiro duelo.", type:"victories", target:1, reward:{xp:25} },
    { id:"veteran", title:"Veterano", description:"Vença 10 duelos.", type:"victories", target:10, reward:{xp:100} },
    { id:"unstoppable", title:"Vitória Imparável", description:"Consiga uma sequência de 10 vitórias consecutivas.", type:"bestWinStreak", target:10, reward:{xp:50} },
    { id:"discoverer", title:"Descobridor", description:"Registre 10 personagens no Códex.", type:"discoveredCards", target:10, reward:{xp:50} },
    { id:"collector", title:"Colecionador", description:"Registre 25 personagens no Códex.", type:"discoveredCards", target:25, reward:{xp:75} },
    { id:"campaigner", title:"Conquistador", description:"Derrote 5 etapas da campanha.", type:"campaignStagesDefeated", target:5, reward:{xp:100} },
    { id:"campaign-master", title:"Mestre da Campanha", description:"Derrote todas as 10 etapas da campanha.", type:"campaignStagesDefeated", target:10, reward:{xp:200} },
    { id:"first-evolution", title:"Primeiro Passo", description:"Evolua uma carta para T2.", type:"evolvedT2", target:1, reward:{xp:25} },
    { id:"advanced-evolution", title:"Evolução Avançada", description:"Tenha uma carta em T3.", type:"evolvedT3", target:1, reward:{xp:75} },
    { id:"master-evolution", title:"Forma Suprema", description:"Tenha uma carta em T4.", type:"evolvedT4", target:1, reward:{xp:150} }
];

function normalizeStats(stats = {}) {
    return {
        ...DEFAULT_STATS,
        ...stats,
        campaignStagesDefeated: Array.isArray(stats.campaignStagesDefeated)
            ? [...new Set(stats.campaignStagesDefeated.map(Number).filter(Number.isFinite))]
            : []
    };
}

async function saveState(state) {
    return put(STORES.ACHIEVEMENTS, {
        ...state,
        version: ACHIEVEMENT_VERSION,
        updatedAt: Date.now()
    });
}

export async function getAchievementsState() {
    const stored = await get(STORES.ACHIEVEMENTS, "player");

    if (!stored) {
        return saveState({
            key:"player",
            version:ACHIEVEMENT_VERSION,
            stats:{...DEFAULT_STATS},
            unlocked:[],
            unlockedAt:{},
            updatedAt:Date.now()
        });
    }

    return saveState({
        ...stored,
        key:"player",
        stats:normalizeStats(stored.stats),
        unlocked:Array.isArray(stored.unlocked) ? stored.unlocked : [],
        unlockedAt:stored.unlockedAt || {}
    });
}

function getProgressValue(achievement, stats) {
    if (achievement.type === "campaignStagesDefeated") {
        return stats.campaignStagesDefeated.length;
    }

    return Number(stats[achievement.type] || 0);
}

async function unlockAchievement(state, achievement) {
    if (state.unlocked.includes(achievement.id)) return false;

    state.unlocked.push(achievement.id);
    state.unlockedAt[achievement.id] = new Date().toISOString();

    const reward = achievement.reward || {};

    if (reward.xp) {
        await addXp(reward.xp);
    }

    if (reward.silver || reward.gold) {
        await addCurrency({
            silver: reward.silver || 0,
            gold: reward.gold || 0
        });
    }

    return true;
}

export async function evaluateAchievements() {
    const state = await getAchievementsState();
    const unlockedNow = [];

    for (const achievement of ACHIEVEMENTS) {
        const progress = getProgressValue(achievement, state.stats);

        if (
            progress >= achievement.target &&
            !state.unlocked.includes(achievement.id)
        ) {
            const unlocked = await unlockAchievement(state, achievement);

            if (unlocked) {
                unlockedNow.push(achievement);
            }
        }
    }

    if (unlockedNow.length) {
        await saveState(state);
    }

    return unlockedNow;
}

export async function registerAchievementEvent(type, data = {}) {
    const state = await getAchievementsState();
    const stats = state.stats;

    switch (String(type || "").toLowerCase()) {
        case "battle":
            if (data.won) {
                stats.victories += 1;
                stats.winStreak += 1;
                stats.bestWinStreak = Math.max(
                    stats.bestWinStreak,
                    stats.winStreak
                );
            } else {
                stats.defeats += 1;
                stats.winStreak = 0;
            }
            break;

        case "campaign":
            stats.campaignVictories += 1;

            if (data.stageId != null) {
                const stageId = Number(data.stageId);

                if (
                    Number.isFinite(stageId) &&
                    !stats.campaignStagesDefeated.includes(stageId)
                ) {
                    stats.campaignStagesDefeated.push(stageId);
                }
            }
            break;

        case "discovery":
            if (data.discoveredCards != null) {
                stats.discoveredCards = Math.max(
                    stats.discoveredCards,
                    Number(data.discoveredCards) || 0
                );
            }
            break;

        case "evolution":
            if (data.toTier === "T2") stats.evolvedT2 += 1;
            if (data.toTier === "T3") stats.evolvedT3 += 1;
            if (data.toTier === "T4") stats.evolvedT4 += 1;
            break;

        default:
            return [];
    }

    await saveState(state);
    return evaluateAchievements();
}

export async function syncAchievementStats() {
    const state = await getAchievementsState();

    const [codex, inventory, campaign] = await Promise.all([
        getAll(STORES.CODEX),
        getAll(STORES.INVENTORY),
        get(STORES.CAMPAIGN, "main")
    ]);

    state.stats.discoveredCards = Math.max(
        state.stats.discoveredCards,
        codex.length
    );

    const stages = Object.keys(campaign?.defeated || {})
        .map(Number)
        .filter(Number.isFinite)
        .filter(id => Number(campaign.defeated[id]) > 0);

    state.stats.campaignStagesDefeated = [
        ...new Set([
            ...state.stats.campaignStagesDefeated,
            ...stages
        ])
    ];

    let t2 = 0;
    let t3 = 0;
    let t4 = 0;

    for (const entry of inventory) {
        t2 += Number(entry.tiers?.T2 || 0);
        t3 += Number(entry.tiers?.T3 || 0);
        t4 += Number(entry.tiers?.T4 || 0);
    }

    state.stats.evolvedT2 = Math.max(state.stats.evolvedT2, t2);
    state.stats.evolvedT3 = Math.max(state.stats.evolvedT3, t3);
    state.stats.evolvedT4 = Math.max(state.stats.evolvedT4, t4);

    await saveState(state);
    await evaluateAchievements();

    return state;
}
