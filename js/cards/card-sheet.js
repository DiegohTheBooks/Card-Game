import { getCardImage, escapeHtml } from "../core/utils.js";

let sheetReady = false;

function ensureSheet() {
    if (sheetReady) return;

    const style = document.createElement("style");
    style.id = "card-sheet-styles";
    style.textContent = `
        .card-sheet-overlay {
            position: fixed;
            inset: 0;
            z-index: 1000;
            display: grid;
            place-items: center;
            padding: 20px;
            background: rgba(7, 7, 15, .78);
            backdrop-filter: blur(8px);
            opacity: 0;
            pointer-events: none;
            transition: opacity .2s ease;
        }

        .card-sheet-overlay.is-open {
            opacity: 1;
            pointer-events: auto;
        }

        .card-sheet {
            position: relative;
            width: min(900px, 100%);
            max-height: min(760px, calc(100vh - 40px));
            overflow: hidden;
            display: grid;
            grid-template-columns: minmax(220px, 310px) 1fr;
            border: 1px solid var(--ap-border);
            border-radius: 20px;
            background:
                radial-gradient(circle at top right, rgba(200,169,107,.12), transparent 20rem),
                var(--ap-panel);
            box-shadow: 0 28px 90px rgba(0,0,0,.55);
            transform: translateY(10px) scale(.98);
            transition: transform .2s ease;
        }

        .card-sheet-overlay.is-open .card-sheet {
            transform: translateY(0) scale(1);
        }

        .card-sheet-art {
            min-height: 430px;
            background: #0d0d16;
            border-right: 1px solid var(--ap-border);
        }

        .card-sheet-art img {
            display: block;
            width: 100%;
            height: 100%;
            min-height: 430px;
            object-fit: cover;
        }

        .card-sheet-art-placeholder {
            height: 100%;
            min-height: 430px;
            display: grid;
            place-items: center;
            color: var(--ap-muted);
            font-size: 4rem;
        }

        .card-sheet-content {
            min-width: 0;
            overflow: auto;
            padding: 38px 38px 34px;
        }

        .card-sheet-close {
            position: absolute;
            top: 14px;
            right: 14px;
            z-index: 2;
            width: 38px;
            height: 38px;
            border: 1px solid var(--ap-border);
            border-radius: 50%;
            background: rgba(17,17,31,.82);
            color: var(--ap-text);
            cursor: pointer;
            font-size: 1.25rem;
            line-height: 1;
        }

        .card-sheet-close:hover {
            border-color: var(--ap-gold);
            color: var(--ap-gold);
        }

        .card-sheet-label {
            margin: 0 0 7px;
            color: var(--ap-gold);
            font-size: .7rem;
            font-weight: 700;
            letter-spacing: .18em;
            text-transform: uppercase;
        }

        .card-sheet-title {
            margin: 0;
            padding-right: 35px;
            font-family: "Playfair Display", serif;
            font-size: clamp(1.8rem, 4vw, 2.8rem);
            line-height: 1.08;
        }

        .card-sheet-work {
            margin: 8px 0 26px;
            color: var(--ap-muted);
            font-size: .92rem;
        }

        .card-sheet-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 28px;
        }

        .card-sheet-stat {
            padding: 14px 10px;
            border: 1px solid var(--ap-border);
            border-radius: 12px;
            background: rgba(17,17,31,.35);
            text-align: center;
        }

        .card-sheet-stat span {
            display: block;
            margin-bottom: 5px;
            color: var(--ap-muted);
            font-size: .65rem;
            font-weight: 700;
            letter-spacing: .08em;
        }

        .card-sheet-stat strong {
            color: var(--ap-gold-bright);
            font-size: 1.35rem;
        }

        .card-sheet-section {
            padding-top: 20px;
            border-top: 1px solid var(--ap-border);
        }

        .card-sheet-section h3 {
            margin: 0 0 9px;
            font-size: .76rem;
            letter-spacing: .1em;
            text-transform: uppercase;
            color: var(--ap-gold);
        }

        .card-sheet-section p {
            margin: 0;
            color: var(--ap-text);
            line-height: 1.7;
            white-space: pre-line;
        }

        .card-sheet-id {
            margin-top: 22px !important;
            color: var(--ap-muted) !important;
            font-size: .68rem;
            word-break: break-all;
        }

        @media (max-width: 700px) {
            .card-sheet-overlay {
                padding: 10px;
            }

            .card-sheet {
                max-height: calc(100vh - 20px);
                grid-template-columns: 1fr;
                overflow: auto;
            }

            .card-sheet-art,
            .card-sheet-art img,
            .card-sheet-art-placeholder {
                min-height: 260px;
                height: 260px;
            }

            .card-sheet-art {
                border-right: 0;
                border-bottom: 1px solid var(--ap-border);
            }

            .card-sheet-content {
                padding: 26px 22px 28px;
            }
        }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement("div");
    overlay.className = "card-sheet-overlay";
    overlay.id = "cardSheetOverlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
        <div class="card-sheet" role="dialog" aria-modal="true" aria-labelledby="cardSheetTitle">
            <button class="card-sheet-close" type="button" aria-label="Fechar ficha">×</button>
            <div class="card-sheet-art" id="cardSheetArt"></div>
            <div class="card-sheet-content">
                <p class="card-sheet-label">Ficha do personagem</p>
                <h2 class="card-sheet-title" id="cardSheetTitle"></h2>
                <p class="card-sheet-work" id="cardSheetWork"></p>

                <div class="card-sheet-stats">
                    <div class="card-sheet-stat">
                        <span>MANA</span>
                        <strong id="cardSheetMana">0</strong>
                    </div>
                    <div class="card-sheet-stat">
                        <span>ATK</span>
                        <strong id="cardSheetAtk">0</strong>
                    </div>
                    <div class="card-sheet-stat">
                        <span>DEF</span>
                        <strong id="cardSheetDef">0</strong>
                    </div>
                </div>

                <section class="card-sheet-section">
                    <h3>Habilidade</h3>
                    <p id="cardSheetAbility">Nenhuma habilidade cadastrada.</p>
                </section>

                <p class="card-sheet-id" id="cardSheetId"></p>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", event => {
        if (event.target === overlay ||
            event.target.closest(".card-sheet-close")) {
            closeCardSheet();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" &&
            overlay.classList.contains("is-open")) {
            closeCardSheet();
        }
    });

    sheetReady = true;
}

export function openCardSheet(card) {
    if (!card) return;

    ensureSheet();

    const overlay = document.getElementById("cardSheetOverlay");
    const art = document.getElementById("cardSheetArt");
    const image = getCardImage(card);

    art.innerHTML = image
        ? '<img src="' + escapeHtml(image) + '" alt="' +
          escapeHtml(card.name || "Personagem") + '">'
        : '<div class="card-sheet-art-placeholder">?</div>';

    document.getElementById("cardSheetTitle").textContent =
        card.name || "Personagem";

    document.getElementById("cardSheetWork").textContent =
        card.work || "Sem obra/coleção informada";

    document.getElementById("cardSheetMana").textContent =
        Number(card.mana) || 0;

    document.getElementById("cardSheetAtk").textContent =
        Number(card.atk) || 0;

    document.getElementById("cardSheetDef").textContent =
        Number(card.def) || 0;

    document.getElementById("cardSheetAbility").textContent =
        card.ability || "Nenhuma habilidade cadastrada.";

    document.getElementById("cardSheetId").textContent =
        card.originalId ? "ID: " + card.originalId : "";

    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

export function closeCardSheet() {
    const overlay = document.getElementById("cardSheetOverlay");
    if (!overlay) return;

    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

ensureSheet();

window.addEventListener("cardduels:open-sheet", event => {
    openCardSheet(event.detail);
});
