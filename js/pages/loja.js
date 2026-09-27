import { getAll, put, STORES } from "../core/database.js";
import { importSingleCardJson } from "../cards/importer.js";
import { getCardImage, escapeHtml } from "../core/utils.js";

const SHOP_CARD_PRICE = 3000;
const input = document.getElementById("shopImportInput");
const grid = document.getElementById("shopGrid");
const empty = document.getElementById("shopEmpty");
const status = document.getElementById("shopStatus");

let cards = [];

function render() {
    empty.hidden = cards.length > 0;

    if (!cards.length) {
        grid.innerHTML = "";
        return;
    }

    grid.innerHTML = cards.map(card => {
        const img = getCardImage(card);
        const currency = card.shopCurrency === "gold" ? "🟡" : "🪙";

        return `
            <article class="shop-card">
                <div
                    class="shop-art"
                    role="button"
                    tabindex="0"
                    aria-label="Ver ficha de ${escapeHtml(card.name)}"
                    data-sheet-id="${escapeHtml(card.originalId)}"
                >
                    ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(card.name)}" loading="lazy">` : ""}
                </div>

                <div class="shop-info">
                    <h2>${escapeHtml(card.name)}</h2>
                    <small>${escapeHtml(card.work || "Carta especial")}</small>

                    <div class="shop-meta">
                        <span>MANA ${Number(card.mana) || 0}</span>
                        <span>${currency} ${SHOP_CARD_PRICE}</span>
                    </div>

                    <button
                        class="shop-price"
                        type="button"
                        data-buy-id="${escapeHtml(card.originalId)}"
                    >${currency} ${SHOP_CARD_PRICE}</button>
                </div>
            </article>
        `;
    }).join("");
}

async function load() {
    const entries = await getAll(STORES.SHOP);
    const collection = await getAll(STORES.COLLECTION);

    cards = entries
        .map(entry => collection.find(card =>
            String(card.originalId) === String(entry.originalId)
        ))
        .filter(Boolean);

    status.textContent = cards.length
        ? cards.length + " carta(s) especial(is) na Loja."
        : "Nenhuma carta especial cadastrada.";

    render();
}

input.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const payload = JSON.parse(await file.text());
        const result = await importSingleCardJson(payload);
        const card = result.cards[0];

        await put(STORES.SHOP, {
            originalId: String(card.originalId),
            importedAt: new Date().toISOString(),
            shopPrice: SHOP_CARD_PRICE,
            shopCurrency: "gold"
        });

        await load();
        status.textContent = 'Carta "' + card.name + '" adicionada à Loja.';
    } catch (error) {
        console.error(error);
        status.textContent = error.message || "Não foi possível importar a carta.";
    } finally {
        input.value = "";
    }
});

function openSheetFromTarget(target) {
    const id = target.dataset.sheetId;
    const card = cards.find(item => String(item.originalId) === String(id));

    if (card) {
        window.dispatchEvent(new CustomEvent("cardduels:open-sheet", {
            detail: card
        }));
    }
}

grid.addEventListener("click", event => {
    const art = event.target.closest("[data-sheet-id]");
    if (art) {
        openSheetFromTarget(art);
    }
});

grid.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const art = event.target.closest("[data-sheet-id]");
    if (!art) return;

    event.preventDefault();
    openSheetFromTarget(art);
});

grid.addEventListener("click", event => {
    const priceButton = event.target.closest("[data-buy-id]");
    if (!priceButton) return;

    // O botão já representa o valor da carta. A compra será ligada
    // ao sistema de moedas quando a economia da Loja for ativada.
});

load().catch(error => {
    console.error(error);
    status.textContent = "Não foi possível carregar a Loja.";
});
