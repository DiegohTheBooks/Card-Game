import { hasAbility as cardHasAbility } from "./abilities.js";

function hasAbility(card, abilityId) {
    return cardHasAbility(card, abilityId);
}

/**
 * Constrói a fila visual de uma resolução já calculada pelo motor.
 * O motor continua sendo a fonte da verdade; esta fila só define
 * a ordem em que os acontecimentos serão apresentados ao jogador.
 */
export function buildAttackActionQueue(result) {
    if (!result?.attacker) return [];

    const queue = [];
    const attacker = result.attacker;
    const targets = Array.isArray(result.targets) && result.targets.length
        ? result.targets
        : [{
            defender: result.defender,
            damage: result.damage,
            destroyed: result.destroyed,
            armorReduction: result.armorReduction,
            excessDamage: result.excessDamage
        }];

    if (hasAbility(attacker, "investida")) {
        queue.push({
            type: "ability",
            name: "Investida",
            text: "pode atacar neste turno."
        });
    }

    if (hasAbility(attacker, "golpe-amplo") && targets.length > 1) {
        queue.push({
            type: "ability",
            name: "Golpe Amplo",
            text: "atinge as lanes adjacentes."
        });
    }

    queue.push({
        type: "attack",
        attackerUid: attacker.uid,
        targetUid: targets[0]?.defender?.uid || null,
        direct: result.type === "direct",
        side: result.attackerSide || null
    });

    for (const target of targets) {
        if (target.defender) {
            queue.push({
                type: "impact",
                targetUid: target.defender.uid,
                damage: Number(target.damage) || 0,
                laneIndex: target.laneIndex
            });

            if (target.armorReduction > 0) {
                queue.push({
                    type: "ability",
                    name: "Armadura",
                    text: "reduziu o dano em " + target.armorReduction + ".",
                    targetUid: target.defender.uid
                });
            }

            if (target.damage > 0) {
                queue.push({
                    type: "damage",
                    targetUid: target.defender.uid,
                    amount: Number(target.damage) || 0
                });
            }

            if (target.retaliationApplied) {
                queue.push({
                    type: "ability",
                    name: "Retaliação",
                    text: "causa 2 de dano ao atacante.",
                    targetUid: target.defender.uid,
                    attackerUid: attacker.uid
                });

                queue.push({
                    type: "retaliation",
                    targetUid: attacker.uid,
                    amount: 2
                });
            }

            if (target.bleedingApplied) {
                queue.push({
                    type: "ability",
                    name: "Sangramento",
                    text: "-2 DEF por rodada.",
                    targetUid: target.defender.uid
                });
            }

            if (target.drainApplied) {
                queue.push({
                    type: "ability",
                    name: "Dreno",
                    text: "+2 DEF.",
                    targetUid: attacker.uid
                });

                queue.push({
                    type: "heal",
                    targetUid: attacker.uid,
                    amount: 2
                });
            }

            if (target.destroyed) {
                queue.push({
                    type: "destroy",
                    targetUid: target.defender.uid
                });

                if (target.stunApplied) {
                    queue.push({
                        type: "ability",
                        name: "Atordoar",
                        text: "o atacante ficará impedido de atacar no próximo turno.",
                        targetUid: attacker.uid
                    });
                }

                if (target.poisonApplied) {
                    queue.push({
                        type: "ability",
                        name: "Veneno",
                        text: "-2 DEF por rodada.",
                        targetUid: attacker.uid
                    });
                }
            }

            if (
                target.excessDamage > 0 ||
                (
                    target.destroyed &&
                    hasAbility(attacker, "rompedor") &&
                    Number(target.damage) > Number(target.effectiveDefBefore || 0)
                )
            ) {
                const excess = Number(
                    target.excessDamage ??
                    Math.max(
                        0,
                        Number(target.damage) - Number(target.effectiveDefBefore || 0)
                    )
                ) || 0;

                if (excess > 0) {
                    queue.push({
                        type: "ability",
                        name: "Rompedor",
                        text: "-" + excess + " PV.",
                        targetUid: target.defender.uid
                    });

                    queue.push({
                        type: "direct",
                        amount: excess,
                        side: result.attackerSide || null
                    });
                }
            }
        } else if (target.direct && target.damage > 0) {
            queue.push({
                type: "direct",
                amount: Number(target.damage) || 0,
                side: result.attackerSide || null
            });
        }
    }

    if (result.attackerDestroyed) {
        queue.push({
            type: "destroy",
            targetUid: attacker.uid
        });
    }

    return queue;
}

export function buildRoundActionQueue(results = []) {
    return results.flatMap(buildAttackActionQueue);
}


export function buildRoundEffectQueue(state) {
    const queue = [];

    for (const side of ["player", "enemy"]) {
        const board = side === "player"
            ? state.playerBoard
            : state.enemyBoard;

        for (const card of board) {
            if (!card) continue;

            if (card.statusEffects?.bleeding) {
                queue.push({
                    type: "round-effect",
                    name: "Sangramento",
                    text: "-2 DEF",
                    targetUid: card.uid,
                    amount: 2
                });
            }

            if (card.statusEffects?.poison) {
                queue.push({
                    type: "round-effect",
                    name: "Veneno",
                    text: "-2 DEF",
                    targetUid: card.uid,
                    amount: 2
                });
            }
        }
    }

    return queue;
}
