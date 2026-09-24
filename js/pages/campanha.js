import {
    campaignData,
    getCampaignProgress,
    generateRewardOptions,
    claimReward
} from "../campaign/campaign.js";

import { getAll } from "../core/database.js";
import { getCardImage, escapeHtml } from "../core/utils.js";
import { initializeStarterInventory } from "../player/inventory.js";

const map = document.getElementById("campaignMap");
const rewardOverlay = document.getElementById("rewardOverlay");
const rewardGrid = document.getElementById("rewardGrid");
const rewardStageName = document.getElementById("rewardStageName");
const rewardStatus = document.getElementById("rewardStatus");

let cards = [];

function renderMap(progress) {
    map.innerHTML = campaignData.stages.map(stage => {
        const victories = Number(progress.defeated[stage.id] || 0);

        return `
            <article class="campaign-stage ${victories > 0 ? "defeated" : ""}">
                <div class="stage-number">${stage.number}</div>

                <div class="stage-info">
                    <span class="stage-label">OPONENTE ${stage.number}</span>
                    <h2>${escapeHtml(stage.name)}</h2>
                    <p>${stage.hp} PV</p>
                    <small>
                        Recompensa: cartas de ${stage.rewardManaMin}
                        ${stage.rewardManaMax !== stage.rewardManaMin
                            ? ` a ${stage.rewardManaMax}`
                            : ""}
                        de Mana
                    </small>
                    ${victories > 0
                        ? `<strong>Vitórias: ${victories}</strong>`
                        : ""}
                </div>

                <a
                    class="button-primary stage-button"
                    href="duelo.html?mode=campaign&stage=${stage.id}"
                >
                    ${victories > 0 ? "Desafiar novamente" : "Desafiar"}
                </a>
            </article>
        `;
    }).join("");
}

function renderRewardCards(options, stageId) {
    rewardGrid.innerHTML = "";

    if (!options.length) {
        rewardGrid.innerHTML = `
            <div class="reward-empty">
                <h3>Nenhuma carta disponível</h3>
                <p>
                    Não há cartas suficientes na Coleção dentro da faixa de
                    Mana desta recompensa.
                </p>
            </div>
        `;
        return;
    }

    rewardGrid.innerHTML = options.map(card => `
        <button class="reward-card" type="button" data-card-id="${escapeHtml(card.originalId)}">
            <img src="${getCardImage(card)}" alt="${escapeHtml(card.name || "Carta")}">
            <span class="reward-card-name">${escapeHtml(card.name || "Sem nome")}</span>
            <span class="reward-card-mana">Mana ${Number(card.mana) || 0}</span>
            <span class="reward-card-action">Escolher</span>
        </button>
    `).join("");

    rewardGrid.querySelectorAll(".reward-card").forEach(button => {
        button.addEventListener("click", async () => {
            const originalId = button.dataset.cardId;

            try {
                button.disabled = true;

                const card = await claimReward(stageId, originalId);

                rewardStatus.textContent =
                    `${card.name} foi adicionada ao seu Inventário.`;

                setTimeout(() => {
                    rewardOverlay.classList.remove("open");
                    load();
                }, 700);
            } catch (error) {
                button.disabled = false;
                rewardStatus.textContent =
                    error.message || "Não foi possível receber a recompensa.";
            }
        });
    });
}

async function openPendingReward(stageId) {
    const options = await generateRewardOptions(stageId);
    const stage = campaignData.stages.find(item => item.id === Number(stageId));

    if (!stage) return;

    rewardStageName.textContent = stage.name;
    rewardStatus.textContent = "Escolha 1 das 3 cartas.";
    renderRewardCards(options, stage.id);
    rewardOverlay.classList.add("open");
}

async function load() {
    try {
        await initializeStarterInventory();

        const [progress, collection] = await Promise.all([
            getCampaignProgress(),
            getAll("cardCollection")
        ]);

        cards = collection;
        renderMap(progress);

        for (const stage of campaignData.stages) {
            if (progress.pendingRewards[stage.id]) {
                await openPendingReward(stage.id);
                break;
            }
        }
    } catch (error) {
        console.error(error);
        map.innerHTML = `
            <div class="empty-state">
                <span>⚠</span>
                <h2>Não foi possível carregar a campanha</h2>
                <p>${escapeHtml(error.message || "Erro desconhecido.")}</p>
            </div>
        `;
    }
}

window.addEventListener("cardduels:campaign-victory", async event => {
    const stageId = Number(event.detail?.stageId);

    if (!stageId) return;

    try {
        const module = await import("../campaign/campaign.js");
        const result = await module.completeStage(stageId);

        await openPendingReward(result.stage.id);
    } catch (error) {
        console.error(error);
        rewardStatus.textContent =
            error.message || "Não foi possível gerar a recompensa.";
    }
});

document.getElementById("closeReward").addEventListener("click", () => {
    rewardOverlay.classList.remove("open");
});

rewardOverlay.addEventListener("click", event => {
    if (event.target === rewardOverlay) {
        rewardOverlay.classList.remove("open");
    }
});

load();
