import { addCurrency } from "./currency.js";
import { addXp, getPlayerProfile } from "./profile.js";

export const REWARD_VERSION = 1;

/*
 * V7 — Economia inicial.
 * Os valores são provisórios para os testes e ficam centralizados aqui.
 */
export const REWARDS = {
    CASUAL: {
        label: "Duelo Casual",
        xp: 25,
        silver: 100,
        gold: 0
    },

    CAMPAIGN: {
        label: "Campanha",
        xp: 50,
        silver: 300,
        gold: 0
    },

    BOSS: {
        label: "Chefe",
        xp: 100,
        silver: 500,
        gold: 50
    }
};

export async function grantReward(type) {
    const key = String(type || "").toUpperCase();
    const reward = REWARDS[key];

    if (!reward) {
        throw new Error("Tipo de recompensa inválido: " + type);
    }

    const profile = reward.xp
        ? await addXp(reward.xp)
        : await getPlayerProfile();

    const wallet = await addCurrency({
        silver: reward.silver,
        gold: reward.gold
    });

    return {
        type: key,
        reward,
        profile,
        wallet
    };
}

export function getReward(type) {
    const key = String(type || "").toUpperCase();
    return REWARDS[key] || null;
}
