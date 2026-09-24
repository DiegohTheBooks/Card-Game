import { getAll, STORES } from "../core/database.js";
import { importJsonPayload } from "../cards/importer.js";
import { getCardImage, escapeHtml } from "../core/utils.js";

const input = document.getElementById("jsonImportInput");
const status = document.getElementById("collectionStatus");
const grid = document.getElementById("collectionGrid");
const emptyState = document.getElementById("collectionEmpty");
const refreshButton = document.getElementById("refreshCollectionButton");
const collectionFilter = document.getElementById("collectionFilter");
const cardSearch = document.getElementById("cardSearch");
const totalCards = document.getElementById("totalCards");
const totalCollections = document.getElementById("totalCollections");
const visibleCards = document.getElementById("visibleCards");

let cards = [];
let collections = [];

function collectionName(card) {
    const collection = collections.find(
        item => item.id === String(card.collectionId)
    );

    return collection?.name || card.work || "Sem coleção";
}

function renderCollectionOptions() {
    const current = collectionFilter.value;

    const html = [
        '<option value="all">Todas as coleções</option>'
    ];

    collections
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
        .forEach(collection => {
            html.push(
                '<option value="' +
                escapeHtml(collection.id) +
                '">' +
                escapeHtml(collection.name) +
                '</option>'
            );
        });

    collectionFilter.innerHTML = html.join("");

    if ([...collectionFilter.options]
        .some(option => option.value === current)) {
        collectionFilter.value = current;
    }
}

function getFilteredCards() {
    const selectedCollection = collectionFilter.value;
    const search = cardSearch.value.trim().toLocaleLowerCase("pt-BR");

    return cards.filter(card => {
        const matchesCollection =
            selectedCollection === "all" ||
            String(card.collectionId) === selectedCollection;

        const text = (
            card.name + " " +
            card.work + " " +
            collectionName(card)
        ).toLocaleLowerCase("pt-BR");

        return matchesCollection &&
            (!search || text.includes(search));
    });
}

function render() {
    totalCards.textContent = cards.length;
    totalCollections.textContent = collections.length;

    renderCollectionOptions();

    const filtered = getFilteredCards();
    visibleCards.textContent = filtered.length;

    if (!cards.length) {
        grid.innerHTML = "";
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;

    if (!filtered.length) {
        grid.innerHTML =
            '<div class="empty-state">' +
            '<span>🔎</span>' +
            '<h2>Nenhuma carta encontrada</h2>' +
            '<p>Ajuste a coleção selecionada ou o termo de busca.</p>' +
            '</div>';
        return;
    }

    grid.innerHTML = filtered.map(card => {
        const image = getCardImage(card);

        return (
            '<article class="card-tile" data-card-id="' +
            escapeHtml(card.originalId) +
            '" tabindex="0" title="Abrir ficha">' +

                '<div class="card-tile-image">' +
                    (
                        image
                            ? '<img src="' + escapeHtml(image) +
                              '" alt="' + escapeHtml(card.name) +
                              '" loading="lazy">'
                            : '<div class="card-tile-placeholder">?</div>'
                    ) +
                '</div>' +

                '<div class="card-tile-info">' +
                    '<strong>' + escapeHtml(card.name) + '</strong>' +
                    '<small>' + escapeHtml(collectionName(card)) + '</small>' +

                    '<div class="card-tile-stats">' +
                        '<span class="card-stat">MANA <strong>' +
                            card.mana + '</strong></span>' +
                        '<span class="card-stat">ATK <strong>' +
                            card.atk + '</strong></span>' +
                        '<span class="card-stat">DEF <strong>' +
                            card.def + '</strong></span>' +
                    '</div>' +
                '</div>' +
            '</article>'
        );
    }).join("");
}

async function loadCollection() {
    cards = await getAll(STORES.COLLECTION);
    collections = await getAll(STORES.COLLECTIONS);

    status.textContent = cards.length
        ? cards.length + " carta(s) cadastrada(s) na Coleção."
        : "Nenhuma carta carregada ainda.";

    render();
}

input.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        status.textContent = "Importando JSON otimizado...";

        const payload = JSON.parse(await file.text());
        const result = await importJsonPayload(payload);

        await loadCollection();

        if (result.type === "single") {
            status.textContent =
                'Carta "' + result.cards[0].name +
                '" adicionada/atualizada na Coleção.';
        } else {
            status.textContent =
                result.cards.length +
                " carta(s) importada(s) e atualizada(s) na Coleção.";
        }
    } catch (error) {
        console.error("Erro ao importar coleção:", error);
        status.textContent =
            error.message || "Não foi possível importar o JSON.";
    } finally {
        input.value = "";
    }
});

collectionFilter.addEventListener("change", render);
cardSearch.addEventListener("input", render);

refreshButton.addEventListener("click", () => {
    loadCollection().catch(error => {
        console.error(error);
        status.textContent = "Erro ao atualizar a Coleção.";
    });
});

grid.addEventListener("click", event => {
    const tile = event.target.closest(".card-tile");
    if (!tile) return;

    const card = cards.find(
        item => item.originalId === tile.dataset.cardId
    );

    if (!card) return;

    window.dispatchEvent(
        new CustomEvent("cardduels:open-sheet", { detail: card })
    );
});

loadCollection().catch(error => {
    console.error(error);
    status.textContent = "Erro ao abrir a Coleção.";
});
