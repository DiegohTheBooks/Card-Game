export function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function getCardImage(card) {
    return card?.image ||
        card?.imageData ||
        card?.imageUrl ||
        card?.art ||
        "";
}

export function formatNumber(value) {
    return new Intl.NumberFormat("pt-BR").format(Number(value) || 0);
}
