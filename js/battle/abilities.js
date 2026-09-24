export function resolveAbility(card, context = {}) {
    if (!card) return { triggered: false, card: null, context };

    const text = String(card.ability || "").trim();

    if (!text) {
        return {
            triggered: false,
            card,
            context
        };
    }

    // V6 começa com as habilidades como descrição de ficha.
    // O motor fica preparado para efeitos reais sem misturar
    // a apresentação da carta com a lógica de combate.
    return {
        triggered: false,
        card,
        context,
        description: text
    };
}
