import { playSound, unlockAudio } from "./audio.js";

const CARD_SELECTORS = [
    ".battle-card",
    ".menu-card",
    ".inventory-card",
    ".deck-card",
    ".collection-card",
    ".codex-card",
    ".evolution-card",
    ".shop-card",
    ".campaign-card",
    ".campaign-node",
    ".story-deck-card",
    ".reward-card"
];

function isInteractiveElement(element) {
    if (!element) return false;
    return Boolean(
        element.closest(
            "button, a, label, select, input[type=\"checkbox\"], input[type=\"radio\"], " +
            "[role=\"button\"], [data-ui-sound], " + CARD_SELECTORS.join(", ")
        )
    );
}

function getTarget(event) {
    if (!(event.target instanceof Element)) return null;

    const explicit = event.target.closest("[data-ui-sound]");
    if (explicit) return explicit;

    const control = event.target.closest(
        "button, a, label, select, input[type=\"checkbox\"], input[type=\"radio\"], [role=\"button\"]"
    );
    if (control) return control;

    for (const selector of CARD_SELECTORS) {
        const card = event.target.closest(selector);
        if (card) return card;
    }

    return null;
}

function getSoundType(target) {
    const explicit = target?.dataset?.uiSound;
    if (explicit) return explicit;

    if (CARD_SELECTORS.some(selector => target.matches(selector))) {
        return "select";
    }

    if (target.matches("a")) {
        return "navigate";
    }

    if (target.matches("label")) {
        return "click";
    }

    if (target.matches("select, input[type=\"checkbox\"], input[type=\"radio\"]")) {
        return "select";
    }

    if (target.matches("button, [role=\"button\"]")) {
        const text = (target.getAttribute("aria-label") || target.textContent || "")
            .trim()
            .toLowerCase();

        if (
            text.includes("fechar") ||
            text.includes("cancelar") ||
            text === "×" ||
            text === "x"
        ) {
            return "close";
        }

        if (
            text.includes("salvar") ||
            text.includes("confirmar") ||
            text.includes("usar este") ||
            text.includes("comprar")
        ) {
            return "confirm";
        }

        return "click";
    }

    return "click";
}

let installed = false;

export function installInterfaceAudio() {
    if (installed) return;
    installed = true;

    window.addEventListener("pointerdown", async event => {
        const target = getTarget(event);
        if (!target || !isInteractiveElement(target)) return;
        if (target.dataset.noUiSound === "true") return;
        if (target.disabled) return;

        await unlockAudio();
        playSound(getSoundType(target));
    }, { capture: true });
}

installInterfaceAudio();
