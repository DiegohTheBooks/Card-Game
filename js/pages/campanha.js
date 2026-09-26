import {
    campaignData,
    getCampaignProgress,
    generateRewardOptions,
    claimReward,
    getStoryDeckCards,
    saveStoryDeck,
    isPlayerDeckEligible,
    STORY_DECK_SIZE,
    getCardsForSource
} from "../campaign/campaign.js";

import { getCardImage, escapeHtml } from "../core/utils.js";
import { initializeStarterInventory } from "../player/inventory.js";

const map = document.getElementById("campaignMap");
const rewardOverlay = document.getElementById("rewardOverlay");
const rewardGrid = document.getElementById("rewardGrid");
const rewardStageName = document.getElementById("rewardStageName");
const rewardStatus = document.getElementById("rewardStatus");
const rewardCampaignName = document.getElementById("rewardCampaignName");

const storyDeckOverlay = document.getElementById("storyDeckOverlay");
const storyDeckGrid = document.getElementById("storyDeckGrid");
const storyDeckSelectedCount = document.getElementById("storyDeckSelectedCount");
const storyDeckAvailableCount = document.getElementById("storyDeckAvailableCount");
const storyDeckStatus = document.getElementById("storyDeckStatus");
const confirmStoryDeck = document.getElementById("confirmStoryDeck");

let storyDeckSelection = new Set();
let storyDeckCards = [];
let storyDeckReady = false;



function updateStoryDeckSummary() {
    storyDeckSelectedCount.textContent = storyDeckSelection.size;
    storyDeckAvailableCount.textContent =
        storyDeckCards.length + " cartas disponíveis para escolha.";

    confirmStoryDeck.disabled =
        storyDeckSelection.size !== STORY_DECK_SIZE;

    if (storyDeckSelection.size === STORY_DECK_SIZE) {
        storyDeckStatus.textContent =
            "25 cartas selecionadas. Você pode confirmar seu Baralho da História.";
        storyDeckStatus.classList.remove("is-error");
    } else if (storyDeckCards.length < STORY_DECK_SIZE) {
        storyDeckStatus.textContent =
            "Você precisa importar pelo menos 25 cartas elegíveis para criar o Baralho da História.";
        storyDeckStatus.classList.add("is-error");
    } else {
        storyDeckStatus.textContent =
            "Selecione " + (STORY_DECK_SIZE - storyDeckSelection.size) +
            " carta(s) para completar o baralho.";
        storyDeckStatus.classList.remove("is-error");
    }
}

function renderStoryDeckCards() {
    storyDeckGrid.innerHTML = storyDeckCards.map(card => {
        const selected = storyDeckSelection.has(String(card.originalId));
        const image = getCardImage(card);

        return [
            '<button class="story-deck-card ' + (selected ? 'is-selected' : '') +
                '" type="button" data-card-id="' + escapeHtml(card.originalId) + '">',
            image
                ? '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(card.name || "Carta") + '">'
                : '<span class="story-deck-card-placeholder">?</span>',
            '<span class="story-deck-check">✓</span>',
            '<span class="story-deck-card-name">' + escapeHtml(card.name || "Sem nome") + '</span>',
            '<span class="story-deck-card-meta">Mana ' + (Number(card.mana) || 0) +
                ' · ' + escapeHtml(card.collectionName || card.work || "Coleção") + '</span>',
            '</button>'
        ].join('');
    }).join('');

    updateStoryDeckSummary();
}

async function openStoryDeckSetup() {
    const allCards = await import("../core/database.js").then(({ getAll, STORES }) =>
        getAll(STORES.COLLECTION)
    );

    storyDeckCards = allCards
        .filter(isPlayerDeckEligible)
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"));

    storyDeckSelection = new Set();

    if (!storyDeckCards.length) {
        storyDeckGrid.innerHTML =
            '<div class="reward-empty"><h3>Nenhuma carta disponível</h3>' +
            '<p>Importe cartas do Álbum antes de criar o Baralho da História.</p></div>';
    } else {
        renderStoryDeckCards();
    }

    storyDeckOverlay.classList.add("open");
    storyDeckOverlay.setAttribute("aria-hidden", "false");
}

function closeStoryDeckSetup() {
    storyDeckOverlay.classList.remove("open");
    storyDeckOverlay.setAttribute("aria-hidden", "true");
}

function renderCampaign(campaign, progress, sourceCards) {
    const defeatedCount = campaign.stages.filter(stage =>
        Number(progress.defeated[stage.id] || 0) > 0
    ).length;

    const sourceAvailable = sourceCards.length > 0;

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
                '<small>Estratégia: ' + escapeHtml(stage.strategy) +
                    ' · Fonte: ' + escapeHtml(stage.source?.collectionName || stage.work || 'Coleção') +
                    (stage.source?.categoryName ? ' · Categoria: ' + escapeHtml(stage.source.categoryName) : '') +
                    ' · Recompensa: cartas da fonte' +
                    (stage.boss ? ' · Mana 6 permitida' : '') +
                '</small>',
                victories > 0 ? '<strong>Vitórias: ' + victories + '</strong>' : '',
                '</div>',
                storyDeckReady && sourceAvailable
                    ? '<a class="button-primary stage-button" href="duelo.html?mode=campaign&stage=' + stage.id + '">' +
                        (victories > 0 ? 'Desafiar novamente' : 'Desafiar') +
                      '</a>'
                    : '<button class="button-primary stage-button" type="button" disabled title="' +
                        (sourceAvailable ? 'Defina primeiro o Baralho da História.' : 'Importe cartas desta obra para liberar a campanha.') +
                      '">' +
                        (sourceAvailable ? 'Defina seu baralho' : 'Sem cartas importadas') +
                      '</button>',
                '</article>'
            ].join('');
        }).join(''),
        '</div>',
        '</section>'
    ].join('');
}

function renderMap(progress, allCards) {
    map.innerHTML = campaignData.campaigns
        .map(campaign =>
            renderCampaign(
                campaign,
                progress,
                getCardsForSource(allCards, campaign.source)
            )
        )
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
        ? "Escolha 1 carta da fonte. Bosses podem oferecer Mana 6."
        : "Escolha 1 carta da fonte. As outras duas serão descartadas.";

    renderRewardCards(options, stage.id);
    rewardOverlay.classList.add("open");
    rewardOverlay.setAttribute("aria-hidden", "false");
}

async function load() {
    try {
        const storyDeck = await getStoryDeckCards();
        storyDeckReady = Boolean(storyDeck);

        const progress = await getCampaignProgress();
        const allCards = await import("../core/database.js").then(({ getAll, STORES }) =>
            getAll(STORES.COLLECTION)
        );

        renderMap(progress, allCards);

        if (!storyDeckReady) {
            await openStoryDeckSetup();
        }

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


storyDeckGrid.addEventListener("click", event => {
    const button = event.target.closest(".story-deck-card");
    if (!button) return;

    const id = String(button.dataset.cardId);

    if (storyDeckSelection.has(id)) {
        storyDeckSelection.delete(id);
    } else {
        if (storyDeckSelection.size >= STORY_DECK_SIZE) {
            storyDeckStatus.textContent =
                "O baralho já possui 25 cartas. Remova uma antes de escolher outra.";
            storyDeckStatus.classList.add("is-error");
            return;
        }

        storyDeckSelection.add(id);
    }

    renderStoryDeckCards();
});

confirmStoryDeck.addEventListener("click", async () => {
    if (storyDeckSelection.size !== STORY_DECK_SIZE) return;

    confirmStoryDeck.disabled = true;
    storyDeckStatus.textContent = "Salvando seu Baralho da História...";
    storyDeckStatus.classList.remove("is-error");

    try {
        await saveStoryDeck([...storyDeckSelection]);
        storyDeckReady = true;
        closeStoryDeckSetup();

        const progress = await getCampaignProgress();
        const allCards = await import("../core/database.js").then(({ getAll, STORES }) =>
            getAll(STORES.COLLECTION)
        );
        renderMap(progress, allCards);
    } catch (error) {
        storyDeckStatus.textContent =
            error.message || "Não foi possível salvar o baralho.";
        storyDeckStatus.classList.add("is-error");
        confirmStoryDeck.disabled = false;
    }
});

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
