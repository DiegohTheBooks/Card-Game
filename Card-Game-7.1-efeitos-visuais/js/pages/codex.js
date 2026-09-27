import { getAll, get, STORES } from "../core/database.js";
import { getCardImage, escapeHtml } from "../core/utils.js";

const collectionFilter = document.getElementById("codexCollectionFilter");
const searchInput = document.getElementById("codexSearch");
const grid = document.getElementById("codexGrid");
const emptyState = document.getElementById("codexEmpty");
const progress = document.getElementById("codexProgress");
const progressBar = document.getElementById("codexProgressBar");
const stats = document.getElementById("codexStats");

let cards = [];
let collections = [];
let discoveries = [];
let view = "all";

function collectionName(card) {
    const collection = collections.find(
        item => String(item.id) === String(card.collectionId)
    );
    return collection?.name || card.work || "Sem coleção";
}

function isDiscovered(card) {
    return discoveries.some(
        item => String(item.originalId) === String(card.originalId)
    );
}

function renderCollectionOptions() {
    const current = collectionFilter.value;
    collectionFilter.innerHTML =
        '<option value="all">Todas as coleções</option>' +
        collections
            .slice()
            .sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR"))
            .map(collection =>
                '<option value="' + escapeHtml(String(collection.id)) + '">' +
                    escapeHtml(collection.name) +
                '</option>'
            ).join("");

    if ([...collectionFilter.options].some(option => option.value === current)) {
        collectionFilter.value = current;
    }
}

function filteredCards() {
    const selected = collectionFilter.value;
    const query = searchInput.value.trim().toLocaleLowerCase("pt-BR");

    return cards.filter(card => {
        const discovered = isDiscovered(card);
        const matchesView =
            view === "all" ||
            (view === "discovered" && discovered) ||
            (view === "locked" && !discovered);

        const text = (
            String(card.name || "") + " " +
            String(card.work || "") + " " +
            collectionName(card)
        ).toLocaleLowerCase("pt-BR");

        return matchesView &&
            (selected === "all" || String(card.collectionId) === selected) &&
            (!query || text.includes(query));
    });
}

function renderStats() {
    const total = cards.length;
    const discovered = cards.filter(isDiscovered).length;
    const locked = Math.max(0, total - discovered);
    const percent = total ? Math.round((discovered / total) * 100) : 0;

    progress.textContent = discovered + " / " + total;
    progressBar.style.width = percent + "%";

    stats.innerHTML =
        '<div class="codex-stat"><strong>' + total + '</strong><span>personagens registrados</span></div>' +
        '<div class="codex-stat"><strong>' + discovered + '</strong><span>descobertos</span></div>' +
        '<div class="codex-stat"><strong>' + locked + '</strong><span>não descobertos</span></div>' +
        '<div class="codex-stat"><strong>' + percent + '%</strong><span>do Códex</span></div>';
}

function render() {
    renderCollectionOptions();
    renderStats();

    if (!cards.length) {
        grid.innerHTML = "";
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;

    const visible = filteredCards();

    if (!visible.length) {
        grid.innerHTML =
            '<div class="empty-state">' +
                '<span>🔎</span>' +
                '<h2>Nenhum personagem encontrado</h2>' +
                '<p>Ajuste os filtros ou a busca.</p>' +
            '</div>';
        return;
    }

    grid.innerHTML = visible.map(card => {
        const discovered = isDiscovered(card);
        const image = getCardImage(card);

        return (
            '<article class="codex-card ' +
                (discovered ? "is-discovered" : "is-locked") +
                '" data-card-id="' + escapeHtml(String(card.originalId)) + '" ' +
                (discovered ? 'tabindex="0" title="Abrir ficha"' : '') +
            '>' +
                '<div class="codex-art">' +
                    (image
                        ? '<img src="' + escapeHtml(image) + '" alt="' +
                          escapeHtml(discovered ? card.name : "Personagem não descoberto") +
                          '" loading="lazy">'
                        : '<div class="codex-lock"><span>?</span></div>') +
                    (!discovered
                        ? '<div class="codex-lock"><span>?</span></div>'
                        : '') +
                '</div>' +
                '<div class="codex-card-info">' +
                    '<strong>' +
                        escapeHtml(discovered ? card.name : "Personagem desconhecido") +
                    '</strong>' +
                    '<small>' + escapeHtml(collectionName(card)) + '</small>' +
                    '<div class="codex-card-meta">' +
                        '<span>MANA <strong>' + escapeHtml(String(card.mana || 0)) + '</strong></span>' +
                        '<span>' + (discovered ? "✓ Descoberto" : "Bloqueado") + '</span>' +
                    '</div>' +
                '</div>' +
            '</article>'
        );
    }).join("");
}

async function load() {
    cards = await getAll(STORES.COLLECTION);
    discoveries = await getAll(STORES.CODEX);

    // Compatibilidade com saves V7 anteriores:
    // qualquer carta que já esteja no Inventário é considerada descoberta.
    const inventory = await getAll(STORES.INVENTORY);
    const ownedIds = new Set(
        inventory
            .filter(item => Number(item.quantity || 0) > 0)
            .map(item => String(item.originalId))
    );

    const missingDiscoveries = cards.filter(
        card => ownedIds.has(String(card.originalId)) &&
            !discoveries.some(item => String(item.originalId) === String(card.originalId))
    );

    if (missingDiscoveries.length) {
        for (const card of missingDiscoveries) {
            const record = {
                originalId: String(card.originalId),
                discoveredAt: new Date().toISOString(),
                source: "collection"
            };
            await import("../core/database.js").then(db =>
                db.put(STORES.CODEX, record)
            );
        }

        discoveries = await getAll(STORES.CODEX);
    }

    render();
}

grid.addEventListener("click", event => {
    const tile = event.target.closest(".codex-card.is-discovered");
    if (!tile) return;

    const card = cards.find(
        item => String(item.originalId) === String(tile.dataset.cardId)
    );

    if (card) {
        window.dispatchEvent(
            new CustomEvent("cardduels:open-sheet", { detail: card })
        );
    }
});

grid.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const tile = event.target.closest(".codex-card.is-discovered");
    if (!tile) return;
    event.preventDefault();
    tile.click();
});

collectionFilter.addEventListener("change", render);
searchInput.addEventListener("input", render);

document.querySelectorAll(".codex-view-button").forEach(button => {
    button.addEventListener("click", () => {
        view = button.dataset.view;
        document.querySelectorAll(".codex-view-button").forEach(item =>
            item.classList.toggle("is-active", item === button)
        );
        render();
    });
});

load().catch(error => {
    console.error("Não foi possível carregar o Códex:", error);
    grid.innerHTML =
        '<div class="empty-state">' +
            '<span>⚠</span>' +
            '<h2>Não foi possível abrir o Códex</h2>' +
            '<p>' + escapeHtml(error.message || "Erro desconhecido.") + '</p>' +
        '</div>';
});