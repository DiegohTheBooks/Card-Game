import { getAll, get, put, STORES } from "../core/database.js";
import { addCardToInventory } from "../player/inventory.js";

export const CAMPAIGN_VERSION = 3;

const CAMPAIGN_DEFINITIONS = [
    { id: "academia-anthigonus", name: "Academia Anthigonus", work: "Academia Anthigonus", boss: { name: "Guardião", strategy: "guardian", hp: 45, minMana: 3, maxMana: 6 } },
    { id: "as-chamas-sob-a-coroa", name: "As Chamas Sob a Coroa", work: "As Chamas Sob a Coroa", boss: { name: "Berserker", strategy: "berserker", hp: 45, minMana: 3, maxMana: 6 } },
    { id: "entre-a-luz-e-as-sombras", name: "Entre a Luz e as Sombras", work: "Entre a Luz e as Sombras", boss: { name: "Caçador", strategy: "hunter", hp: 45, minMana: 3, maxMana: 6 } },
    { id: "um-casamento-politico", name: "Um Casamento Político", work: "Um Casamento Político", boss: { name: "Colosso", strategy: "colossus", hp: 50, minMana: 4, maxMana: 6 } }
];

function buildStages(campaign, campaignIndex) {
    const stages = [];

    for (let i = 1; i <= 9; i++) {
        const id = campaignIndex === 0 ? i : (campaignIndex * 10) + i;
        let minMana = 2;
        let maxMana = 2;

        if (i >= 3 && i <= 4) maxMana = 3;
        if (i >= 5 && i <= 7) maxMana = 4;
        if (i >= 8) maxMana = 5;
        if (i === 9) minMana = 3;

        stages.push({
            id,
            number: i,
            campaignId: campaign.id,
            campaignName: campaign.name,
            work: campaign.work,
            name: "Oponente " + i,
            type: "common",
            boss: false,
            strategy: ["balanced", "offensive", "defensive", "strategic", "assassin"][(i - 1) % 5],
            hp: 20 + Math.min(20, (i - 1) * 3),
            minMana,
            maxMana,
            rewardManaMin: minMana,
            rewardManaMax: maxMana,
            replayable: true
        });
    }

    const bossId = campaignIndex === 0 ? 10 : (campaignIndex * 10) + 10;

    stages.push({
        id: bossId,
        number: 10,
        campaignId: campaign.id,
        campaignName: campaign.name,
        work: campaign.work,
        name: campaign.boss.name,
        type: "boss",
        boss: true,
        strategy: campaign.boss.strategy,
        hp: campaign.boss.hp,
        minMana: campaign.boss.minMana,
        maxMana: campaign.boss.maxMana,
        rewardManaMin: 4,
        rewardManaMax: 6,
        replayable: true
    });

    return stages;
}

export const campaignData = {
    campaigns: CAMPAIGN_DEFINITIONS.map((campaign, index) => ({
        ...campaign,
        stages: buildStages(campaign, index)
    })),
    stages: []
};

campaignData.stages = campaignData.campaigns.flatMap(campaign => campaign.stages);

export function getCampaign(campaignId) {
    return campaignData.campaigns.find(campaign => campaign.id === campaignId) || null;
}

export function getStage(stageId) {
    return campaignData.stages.find(stage => Number(stage.id) === Number(stageId)) || null;
}

export function getRewardManaRange(stageId) {
    const stage = getStage(stageId);
    return stage ? { min: stage.rewardManaMin, max: stage.rewardManaMax } : { min: 2, max: 2 };
}

function progressKey() {
    return "main";
}

async function getProgress() {
    const saved = await get(STORES.CAMPAIGN, progressKey());

    return {
        version: CAMPAIGN_VERSION,
        defeated: saved?.defeated || {},
        pendingRewards: saved?.pendingRewards || {}
    };
}

async function saveProgress(progress) {
    return put(STORES.CAMPAIGN, { key: progressKey(), ...progress });
}

export async function getCampaignProgress() {
    return getProgress();
}

function randomize(items) {
    return [...items].sort(() => Math.random() - 0.5);
}

function cardBelongsToWork(card, work) {
    return String(card?.work || "").trim().toLowerCase() === String(work || "").trim().toLowerCase();
}

function eligibleRewardCards(cards, stage) {
    return cards.filter(card => {
        if (!cardBelongsToWork(card, stage.work)) return false;
        const mana = Number(card.mana);
        if (!Number.isFinite(mana)) return false;

        if (stage.boss) return mana >= 4 && mana <= 6;
        return mana >= stage.rewardManaMin && mana <= Math.min(stage.rewardManaMax, 5);
    });
}

export async function generateRewardOptions(stageId) {
    const stage = getStage(stageId);
    if (!stage) throw new Error("Oponente de campanha inválido.");

    const progress = await getProgress();

    if (Array.isArray(progress.pendingRewards[stage.id])) {
        const pendingIds = progress.pendingRewards[stage.id].map(String);
        const cards = await getAll(STORES.COLLECTION);

        return pendingIds
            .map(originalId => cards.find(card => String(card.originalId) === originalId))
            .filter(Boolean);
    }

    const cards = await getAll(STORES.COLLECTION);
    let candidates = eligibleRewardCards(cards, stage);

    // Fallback temporário para testar a estrutura antes das obras oficiais.
    if (!candidates.length) {
        candidates = cards.filter(card => {
            const mana = Number(card.mana);
            return Number.isFinite(mana) &&
                mana >= stage.rewardManaMin &&
                mana <= Math.min(stage.rewardManaMax, stage.boss ? 6 : 5);
        });
    }

    const options = randomize(candidates).slice(0, 3);
    progress.pendingRewards[stage.id] = options.map(card => String(card.originalId));
    await saveProgress(progress);
    return options;
}

export async function getEnemyDeckCards(stageId) {
    const stage = getStage(stageId);
    if (!stage) throw new Error("Oponente de campanha inválido.");

    const cards = await getAll(STORES.COLLECTION);

    let pool = cards.filter(card => {
        if (!cardBelongsToWork(card, stage.work)) return false;
        const mana = Number(card.mana);
        return Number.isFinite(mana) && mana >= stage.minMana && mana <= stage.maxMana;
    });

    // Fallback temporário enquanto as cartas das obras ainda não foram importadas.
    if (!pool.length) {
        pool = cards.filter(card => {
            const mana = Number(card.mana);
            return Number.isFinite(mana) && mana >= stage.minMana && mana <= stage.maxMana;
        });
    }

    if (!pool.length) {
        throw new Error("Não há cartas disponíveis para \"" + stage.name + "\" na faixa de Mana configurada.");
    }

    const deck = [];
    const shuffled = randomize(pool);

    for (let i = 0; i < 25; i++) {
        deck.push(shuffled[i % shuffled.length]);
    }

    return deck;
}

export async function completeStage(stageId) {
    const stage = getStage(stageId);
    if (!stage) throw new Error("Oponente de campanha inválido.");

    const progress = await getProgress();
    progress.defeated[stage.id] = Number(progress.defeated[stage.id] || 0) + 1;
    await saveProgress(progress);

    return {
        stage,
        victories: progress.defeated[stage.id],
        rewards: await generateRewardOptions(stage.id)
    };
}

export async function claimReward(stageId, originalId) {
    const stage = getStage(stageId);
    if (!stage) throw new Error("Oponente de campanha inválido.");

    const progress = await getProgress();
    const pending = progress.pendingRewards[stage.id] || [];
    const normalizedOriginalId = String(originalId);

    if (!pending.map(String).includes(normalizedOriginalId)) {
        throw new Error("Essa carta não está entre as recompensas disponíveis.");
    }

    const cards = await getAll(STORES.COLLECTION);
    const card = cards.find(item => String(item.originalId) === normalizedOriginalId);
    if (!card) throw new Error("A carta escolhida não foi encontrada na Coleção.");

    await addCardToInventory(normalizedOriginalId, 1);

    delete progress.pendingRewards[stage.id];
    await saveProgress(progress);

    return card;
}

export async function clearPendingReward(stageId) {
    const progress = await getProgress();
    delete progress.pendingRewards[stageId];
    return saveProgress(progress);
}
