import {
    campaignData,
    getCampaignProgress,
    generateRewardOptions,
    claimReward
} from "../campaign/campaign.js";

import { getCardImage, escapeHtml } from "../core/utils.js";
import { initializeStarterInventory } from "../player/inventory.js";

const map = document.getElementById("campaignMap");
const rewardOverlay = document.getElementById("rewardOverlay");
const rewardGrid = document.getElementById("rewardGrid");
const rewardStageName = document.getElementById("rewardStageName");
const rewardStatus = document.getElementById("rewardStatus");
const rewardCampaignName = document.getElementById("rewardCampaignName");

function renderCampaign(campaign, progress) {
    const defeatedCount = campaign.stages.filter(stage =>
        Number(progress.defeated[stage.id] || 0) > 0
    ).length;

    return [
        '<section class="campaign-block">',
        '<header class="campaign-block-header">',
        '<div>',
        '<span class="campaign-kicker">CAMPANHA ' + defeatedCount + '/10</span>',
        '<h2>' + escapeHtml(campaign.name) + '</h2>',
        '<p>Cartas da obra: <strong>' + escapeHtml(campaign.work) + '</strong></p>',
        '</div>',
        '<div class="campaign-progress"><strong>' + defeatedCount + '/10</strong><span>batalhas concluídas</span></div>',
        '</header>',
        '<div class="campaign-stages">',
        campaign.stages.map(stage => {
            const victories = Number(progress.defeated[stage.id] || 0);

            return [
                '<article class="campaign-stage ' + (stage.boss ? 'boss-stage ' : '') + (victories > 0 ? 'defeated' : '') + '">',
                '<div class="stage-number">' + stage.number + '</div>',
                '<div class="stage-info">',
                '<span class="stage-label">' + (stage.boss ? 'BOSS' : 'BATALHA COMUM') + '</span>',
                '<h3>' + escapeHtml(stage.name) + '</h3>',
                '<p>' + stage.hp + ' PV · ' + stage.minMana + '–' + stage.maxMana + ' Mana no deck</p>',
                '<small>Estratégia: ' + escapeHtml(stage.strategy) + ' · Recompensa: cartas da obra' + (stage.boss ? ' · Mana 6 permitida' : '') + '</small>',
                victories > 0 ? '<strong>Vitórias: ' + victories + '</strong>' : '',
                '</div>',
                '<a class="button-primary stage-button" href="duelo.html?mode=campaign&stage=' + stage.id + '">' +
                    (victories > 0 ? 'Desafiar novamente' : 'Desafiar') +
                '</a>',
                '</article>'
            ].join('');
        }).join(''),
        '</div>',
        '</section>'
    ].join('');
}

function renderMap(progress) {
    map.innerHTML = campaignData.campaigns
        .map(campaign => renderCampaign(campaign, progress))
        .join("");
}

function renderRewardCards(options, stageId) {
    rewardGrid.innerHTML = "";

    if (!options.length) {
        rewardGrid.innerHTML = [
            '<div class="reward-empty">',
            '<h3>Nenhuma carta disponível</h3>',
            '<p>A Coleção ainda não possui cartas compatíveis com esta campanha.</p>',
            '</div>'
        ].join("");
        return;
    }

    rewardGrid.innerHTML = options.map(card => [
        '<button class="reward-card" type="button" data-card-id="' + escapeHtml(card.originalId) + '">',
        '<img src="' + getCardImage(card) + '" alt="' + escapeHtml(card.name || "Carta") + '">',
        '<span class="reward-card-name">' + escapeHtml(card.name || "Sem nome") + '</span>',
        '<span class="reward-card-work">' + escapeHtml(card.work || "Obra") + '</span>',
        '<span class="reward-card-mana">Mana ' + (Number(card.mana) || 0) + '</span>',
        '<span class="reward-card-action">Escolher</span>',
        '</button>'
    ].join('')).join('');

    rewardGrid.querySelectorAll(".reward-card").forEach(button => {
        button.addEventListener("click", async () => {
            try {
                button.disabled = true;
                const card = await claimReward(stageId, button.dataset.cardId);

                rewardStatus.textContent = card.name + " foi adicionada ao seu Inventário.";

                setTimeout(() => {
                    rewardOverlay.classList.remove("open");
                    rewardOverlay.setAttribute("aria-hidden", "true");
                    load();
                }, 700);
            } catch (error) {
                button.disabled = false;
                rewardStatus.textContent = error.message || "Não foi possível receber a recompensa.";
            }
        });
    });
}

async function openPendingReward(stageId) {
    const options = await generateRewardOptions(stageId);
    const stage = campaignData.stages.find(item => Number(item.id) === Number(stageId));

    if (!stage) return;

    rewardCampaignName.textContent = stage.campaignName;
    rewardStageName.textContent = stage.boss ? "Boss — " + stage.name : stage.name;
    rewardStatus.textContent = stage.boss
        ? "Escolha 1 carta da obra. Bosses podem oferecer Mana 6."
        : "Escolha 1 carta da obra. As outras duas serão descartadas.";

    renderRewardCards(options, stage.id);
    rewardOverlay.classList.add("open");
    rewardOverlay.setAttribute("aria-hidden", "false");
}

async function load() {
    try {
        await initializeStarterInventory();

        const progress = await getCampaignProgress();
        renderMap(progress);

        const requestedReward = new URLSearchParams(window.location.search).get("reward");

        if (requestedReward) {
            const stageId = Number(requestedReward);
            if (progress.pendingRewards[stageId]) {
                await openPendingReward(stageId);
                return;
            }
        }

        for (const campaign of campaignData.campaigns) {
            for (const stage of campaign.stages) {
                if (progress.pendingRewards[stage.id]) {
                    await openPendingReward(stage.id);
                    return;
                }
            }
        }
    } catch (error) {
        console.error(error);
        map.innerHTML = [
            '<div class="empty-state">',
            '<span>⚠</span>',
            '<h2>Não foi possível carregar a História</h2>',
            '<p>' + escapeHtml(error.message || "Erro desconhecido.") + '</p>',
            '</div>'
        ].join('');
    }
}

document.getElementById("closeReward").addEventListener("click", () => {
    rewardOverlay.classList.remove("open");
    rewardOverlay.setAttribute("aria-hidden", "true");
});

rewardOverlay.addEventListener("click", event => {
    if (event.target === rewardOverlay) {
        rewardOverlay.classList.remove("open");
        rewardOverlay.setAttribute("aria-hidden", "true");
    }
});

load();
