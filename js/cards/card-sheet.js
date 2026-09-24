export function openCardSheet(card) {
    // Ficha única será compartilhada por Coleção, Baralho e Duelo.
    // A implementação visual entra na próxima etapa.
    window.dispatchEvent(new CustomEvent("cardduels:open-sheet", { detail: card }));
}