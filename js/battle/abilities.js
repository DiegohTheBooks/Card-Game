/*
 * Sistema oficial de habilidades do Duel Cards.
 *
 * IMPORTANTE:
 * - abilityId é o identificador usado pelo motor.
 * - abilityName/abilityDescription são dados de apresentação.
 * - ability continua existindo apenas por compatibilidade com exports antigos.
 *
 * O combate nunca deve depender de texto livre para descobrir uma habilidade.
 */

export const ABILITIES = Object.freeze({
    INVESTIDA: {
        id: "investida",
        name: "Investida",
        description: "Pode atacar no mesmo turno em que é invocada."
    },

    SANGRAMENTO: {
        id: "sangramento",
        name: "Sangramento",
        description: "Ao atacar, causa -2 DEF contínuo ao alvo."
    },

    DRENO: {
        id: "dreno",
        name: "Dreno",
        description: "Ao causar dano, recupera +2 DEF."
    },

    ROMPEDOR: {
        id: "rompedor",
        name: "Rompedor",
        description: "Ao destruir um defensor, dano excedente vai para os PV inimigos."
    },

    GOLPE_AMPLO: {
        id: "golpe-amplo",
        name: "Golpe Amplo",
        description: "Ataca a carta da frente e as cartas das duas lanes adjacentes."
    },

    ARMADURA: {
        id: "armadura",
        name: "Armadura",
        description: "Reduz em 3 o dano de combate recebido."
    },

    RETALIACAO: {
        id: "retaliacao",
        name: "Retaliação",
        description: "Quando é atacada, causa +2 dano ao atacante."
    },

    PROTETOR: {
        id: "protetor",
        name: "Protetor",
        description: "Concede +3 DEF à carta aliada adjacente."
    },

    ATORDOAR: {
        id: "atordoar",
        name: "Atordoar",
        description: "Se for destruída após ser atacada, impede o destruidor de atacar no próximo turno."
    },

    VENENO: {
        id: "veneno",
        name: "Veneno",
        description: "Ao ser destruída, aplica -2 DEF contínuo ao atacante."
    },

    PREDADOR_SOLITARIO: {
        id: "predador-solitario",
        name: "Predador Solitário",
        description: "Recebe +2 ATK para cada lane vazia fora da própria lane."
    },

    FORTALECER: {
        id: "fortalecer",
        name: "Fortalecer",
        description: "Concede +2 ATK às cartas aliadas adjacentes."
    }
});

const ABILITY_BY_ID = Object.freeze(
    Object.values(ABILITIES).reduce((map, ability) => {
        map[ability.id] = ability;
        return map;
    }, {})
);

const LEGACY_NAME_TO_ID = Object.freeze(
    Object.values(ABILITIES).reduce((map, ability) => {
        map[normalizeAbilityText(ability.name)] = ability.id;
        return map;
    }, {})
);

function normalizeAbilityText(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

export function getAbilityId(card) {
    if (!card) return null;

    const explicitId = String(card.abilityId ?? "").trim().toLowerCase();

    if (explicitId && ABILITY_BY_ID[explicitId]) {
        return explicitId;
    }

    // Compatibilidade: cartas antigas ainda podem trazer apenas abilityName/ability.
    const legacyName = normalizeAbilityText(
        card.abilityName || card.ability || card.abilityDescription
    );

    return LEGACY_NAME_TO_ID[legacyName] ?? null;
}

export function getAbility(card) {
    const id = getAbilityId(card);
    return id ? ABILITY_BY_ID[id] : null;
}

export function hasAbility(card, abilityId) {
    if (!card || !abilityId) return false;
    return getAbilityId(card) === String(abilityId).trim().toLowerCase();
}

export function resolveAbility(card, context = {}) {
    const ability = getAbility(card);

    if (!ability) {
        return {
            triggered: false,
            card: card ?? null,
            abilityId: null,
            context
        };
    }

    return {
        triggered: true,
        card,
        abilityId: ability.id,
        ability,
        context
    };
}

export function listAbilities() {
    return Object.values(ABILITIES).map(ability => ({ ...ability }));
}
