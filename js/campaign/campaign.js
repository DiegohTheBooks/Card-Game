import { getAll, get, put, STORES } from "../core/database.js";
import { addCardToInventory } from "../player/inventory.js";

export const CAMPAIGN_VERSION = 2;

export const campaignData = {
    stages: Array.from({ length: 10 }, (_, index) => {
        const level = index + 1;

        let minMana = 2;
        let maxMana = 2;

        if (level >= 4 && level <= 6) {
            maxMana = 3;
        } else if (level >= 7 && level <= 9) {
            maxMana = 4;
        } else if (level === 10) {
            minMana = 3;
            maxMana = 5;
        }

        return {
            id: level,
            number: level,
            name: `Oponente ${level}`,
            hp: 20 + ((level - 1) * 5),
            rewardManaMin: minMana,
            rewardManaMax: maxMana
        };
    })
};

function progressKey() {
    return "main";
}

async function getProgress() {
    const saved = await get("campaignProgress", progressKey());

    return {
        version: CAMPAIGN_VERSION,
        defeated: saved?.defeated || {},
        pendingRewards: saved?.pendingRewards || {}
    };
}

async function saveProgress(progress) {
    return put("campaignProgress", {
        key: progressKey(),
        ...progress
    });
}

export async function getCampaignProgress() {
    return getProgress();
}

export function getStage(stageId) {
    return campaignData.stages.find(
        stage => Number(stage.id) === Number(stageId)
    ) || null;
}

export function getRewardManaRange(stageId) {
    const stage = getStage(stageId);

    if (!stage) {
        return { min: 2, max: 2 };
    }

    return {
        min: stage.rewardManaMin,
        max: stage.rewardManaMax
    };
}

function randomize(items) {
    return [...items].sort(() => Math.random() - 0.5);
}

export async function generateRewardOptions(stageId) {
    const stage = getStage(stageId);

    if (!stage) {
        throw new Error("Oponente de campanha inválido.");
    }

    const progress = await getProgress();

    if (Array.isArray(progress.pendingRewards[stage.id])) {
        const pendingIds = progress.pendingRewards[stage.id].map(id => String(id));
        const cards = await getAll(STORES.COLLECTION);

        // O progresso salva apenas os originalIds para manter o estado leve.
        // Ao recarregar a campanha, reconstruímos as recompensas como objetos
        // completos, incluindo imagem, nome, atributos e habilidade.
        return pendingIds
            .map(originalId => cards.find(card =>
                String(card.originalId) === originalId
            ))
            .filter(Boolean);
    }

    // As recompensas sempre são retiradas da Coleção real do jogo.
    // O Inventário não participa da seleção: ele apenas recebe a cópia
    // depois que o jogador escolhe uma das opções.
    const cards = await getAll(STORES.COLLECTION);

    const candidates = cards.filter(card => {
        const mana = Number(card.mana);

        return Number.isFinite(mana) &&
            mana >= stage.rewardManaMin &&
            mana <= stage.rewardManaMax;
    });

    const shuffled = randomize(candidates);
    const options = shuffled.slice(0, 3);

    progress.pendingRewards[stage.id] = options.map(card => String(card.originalId));

    await saveProgress(progress);

    return options.map(originalId => {
        return cards.find(card =>
            String(card.originalId) === String(originalId)
        );
    }).filter(Boolean);
}

export async function completeStage(stageId) {
    const stage = getStage(stageId);

    if (!stage) {
        throw new Error("Oponente de campanha inválido.");
    }

    const progress = await getProgress();

    progress.defeated[stage.id] =
        Number(progress.defeated[stage.id] || 0) + 1;

    await saveProgress(progress);

    return {
        stage,
        victories: progress.defeated[stage.id],
        rewards: await generateRewardOptions(stage.id)
    };
}

export async function claimReward(stageId, originalId) {
    const stage = getStage(stageId);

    if (!stage) {
        throw new Error("Oponente de campanha inválido.");
    }

    const progress = await getProgress();
    const pending = progress.pendingRewards[stage.id] || [];

    const normalizedOriginalId = String(originalId);
    const pendingIds = pending.map(id => String(id));

    if (!pendingIds.includes(normalizedOriginalId)) {
        throw new Error("Essa carta não está entre as recompensas disponíveis.");
    }

    // Confirma novamente na Coleção antes de entregar a recompensa.
    // Isso evita colocar no Inventário uma carta que não exista mais.
    const cards = await getAll(STORES.COLLECTION);
    const card = cards.find(item =>
        String(item.originalId) === normalizedOriginalId
    );

    if (!card) {
        throw new Error("A carta escolhida não foi encontrada na Coleção.");
    }

    await addCardToInventory(String(card.originalId), 1);

    delete progress.pendingRewards[stage.id];
    await saveProgress(progress);

    return card;
}

export async function clearPendingReward(stageId) {
    const progress = await getProgress();

    delete progress.pendingRewards[stageId];

    return saveProgress(progress);
}
