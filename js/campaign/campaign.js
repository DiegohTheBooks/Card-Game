import { getAll, get, put, STORES } from "../core/database.js";
import { addCardToInventory } from "../player/inventory.js";

export const CAMPAIGN_VERSION = 4;

/*
 * Cada campanha aponta para uma fonte do Álbum.
 *
 * collectionId é preferencial quando conhecido.
 * collectionName permite que a campanha continue funcionando
 * mesmo quando o ID da coleção muda entre bases.
 *
 * categoryId/categoryName são opcionais. Quando informados,
 * inimigos e recompensas ficam restritos à categoria indicada.
 */
const CAMPAIGN_DEFINITIONS = [
    {
        id: "academia-anthigonus",
        name: "Academia Anthigonus",
        work: "Academia Anthigonus",
        source: { collectionName: "Academia Anthigonus" },
        boss: { name: "Guardião", strategy: "guardian", hp: 45, minMana: 3, maxMana: 6 }
    },
    {
        id: "as-chamas-sob-a-coroa",
        name: "As Chamas Sob a Coroa",
        work: "As Chamas Sob a Coroa",
        source: { collectionName: "As Chamas Sob a Coroa" },
        boss: { name: "Berserker", strategy: "berserker", hp: 45, minMana: 3, maxMana: 6 }
    },
    {
        id: "entre-a-luz-e-as-sombras",
        name: "Entre a Luz e as Sombras",
        work: "Entre a Luz e as Sombras",
        source: { collectionName: "Entre a Luz e as Sombras" },
        boss: { name: "Caçador", strategy: "hunter", hp: 45, minMana: 3, maxMana: 6 }
    },
    {
        id: "um-casamento-politico",
        name: "Um Casamento Político",
        work: "Um Casamento Político",
        source: { collectionName: "Um Casamento Político" },
        boss: { name: "Colosso", strategy: "colossus", hp: 50, minMana: 4, maxMana: 6 }
    }

    /*
     * Exemplo para o futuro:
     *
     * {
     *     id: "one-piece",
     *     name: "One Piece",
     *     work: "One Piece",
     *     source: { collectionName: "One Piece" },
     *     boss: {
     *         name: "Chefe da campanha",
     *         strategy: "offensive",
     *         hp: 45,
     *         minMana: 3,
     *         maxMana: 6
     *     }
     * }
     *
     * Para limitar uma campanha a uma categoria:
     *
     * source: {
     *     collectionName: "One Piece",
     *     categoryName: "Piratas"
     * }
     */

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
            source: { ...campaign.source },
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
        source: { ...campaign.source },
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

function normalizeText(value) {
    return String(value ?? "").trim().toLocaleLowerCase("pt-BR");
}

function cardBelongsToSource(card, source = {}) {
    const expectedCollectionId = source.collectionId;
    const expectedCollectionName = normalizeText(source.collectionName);

    let collectionMatches = true;

    if (expectedCollectionId != null && expectedCollectionId !== "") {
        collectionMatches =
            String(card.collectionId ?? "") === String(expectedCollectionId);
    }

    if (
        collectionMatches &&
        expectedCollectionName
    ) {
        collectionMatches =
            normalizeText(card.collectionName || card.work) ===
            expectedCollectionName;
    }

    if (!collectionMatches) return false;

    const expectedCategoryId = source.categoryId;
    const expectedCategoryName = normalizeText(source.categoryName);

    if (expectedCategoryId != null && expectedCategoryId !== "") {
        if (String(card.categoryId ?? "") === String(expectedCategoryId)) {
            return true;
        }
    }

    if (expectedCategoryName) {
        const path = Array.isArray(card.path)
            ? card.path.map(normalizeText)
            : [];

        return (
            normalizeText(card.categoryName) === expectedCategoryName ||
            path.includes(expectedCategoryName)
        );
    }

    return true;
}

function cardBelongsToWork(card, work) {
    return normalizeText(card.work) === normalizeText(work);
}

export function getCardsForSource(cards, source = {}) {
    return cards.filter(card => cardBelongsToSource(card, source));
}

function eligibleRewardCards(cards, stage) {
    return cards.filter(card => {
        const mana = Number(card.mana);
        if (!Number.isFinite(mana)) return false;

        if (stage.boss) return mana >= 4 && mana <= 6;

        return mana >= stage.rewardManaMin &&
            mana <= Math.min(stage.rewardManaMax, 5);
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

    const allCards = await getAll(STORES.COLLECTION);
    const sourceCards = getCardsForSource(allCards, stage.source);

    if (!sourceCards.length) {
        throw new Error(
            'A campanha "' + stage.campaignName +
            '" ainda não possui cartas importadas para a fonte "' +
            (stage.source.collectionName || stage.work) + '".'
        );
    }

    let candidates = eligibleRewardCards(sourceCards, stage);

    // Quando a coleção ainda está incompleta, usa cartas da própria
    // coleção/categoria, nunca cartas de outra obra.
    if (!candidates.length) {
        candidates = sourceCards;
    }

    const options = randomize(candidates).slice(0, 3);

    progress.pendingRewards[stage.id] =
        options.map(card => String(card.originalId));

    await saveProgress(progress);
    return options;
}

export async function getEnemyDeckCards(stageId) {
    const stage = getStage(stageId);
    if (!stage) throw new Error("Oponente de campanha inválido.");

    const allCards = await getAll(STORES.COLLECTION);
    const sourceCards = getCardsForSource(allCards, stage.source);

    if (!sourceCards.length) {
        throw new Error(
            'Não há cartas importadas para "' +
            (stage.source.collectionName || stage.work) +
            '" nesta campanha.'
        );
    }

    let pool = sourceCards.filter(card => {
        const mana = Number(card.mana);
        return Number.isFinite(mana) &&
            mana >= stage.minMana &&
            mana <= stage.maxMana;
    });

    // Conteúdo incompleto: se a coleção possui cartas, mas ainda não
    // possui cartas suficientes para esta faixa de Mana, continuamos
    // usando somente cartas da mesma fonte.
    if (!pool.length) {
        pool = sourceCards.filter(card => Number.isFinite(Number(card.mana)));
    }

    if (!pool.length) {
        throw new Error(
            'As cartas de "' +
            (stage.source.collectionName || stage.work) +
            '" não possuem Mana válida para montar este deck.'
        );
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

    if (!card) {
        throw new Error("A carta escolhida não foi encontrada na Coleção.");
    }

    if (!cardBelongsToSource(card, stage.source)) {
        throw new Error("Essa carta não pertence à fonte desta campanha.");
    }

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
