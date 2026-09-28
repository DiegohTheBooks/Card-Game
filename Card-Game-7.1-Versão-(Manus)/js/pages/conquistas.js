import {
    ACHIEVEMENTS,
    getAchievementsState,
    syncAchievementStats
} from "../player/achievements.js";
import { escapeHtml } from "../core/utils.js";

const grid = document.getElementById("achievementsGrid");
const progress = document.getElementById("achievementsProgress");
const summary = document.getElementById("achievementsSummary");

function getValue(achievement, stats) {
    if (achievement.type === "campaignStagesDefeated") {
        return stats.campaignStagesDefeated.length;
    }

    return Number(stats[achievement.type] || 0);
}

function render(state) {
    const unlocked = new Set(state.unlocked);

    const completed = ACHIEVEMENTS.filter(item =>
        unlocked.has(item.id)
    ).length;

    summary.textContent =
        completed + " / " + ACHIEVEMENTS.length + " conquistas";

    progress.style.width =
        Math.round((completed / ACHIEVEMENTS.length) * 100) + "%";

    grid.innerHTML = ACHIEVEMENTS.map(achievement => {
        const current = Math.min(
            getValue(achievement, state.stats),
            achievement.target
        );

        const isUnlocked = unlocked.has(achievement.id);
        const percent = Math.round(
            (current / achievement.target) * 100
        );

        const rewardParts = [];
        if (achievement.reward?.xp) rewardParts.push("+" + achievement.reward.xp + " XP");
        if (achievement.reward?.silver) rewardParts.push("+" + achievement.reward.silver + " Prata");
        if (achievement.reward?.gold) rewardParts.push("+" + achievement.reward.gold + " Ouro");

        return (
            '<article class="achievement-card ' +
            (isUnlocked ? "is-unlocked" : "is-locked") + '">' +
                '<div class="achievement-icon">' +
                    (isUnlocked ? "✓" : "◇") +
                '</div>' +
                '<div class="achievement-content">' +
                    '<span class="achievement-status">' +
                        (isUnlocked ? "CONQUISTADA" : "EM PROGRESSO") +
                    '</span>' +
                    '<h2>' + escapeHtml(achievement.title) + '</h2>' +
                    '<p>' + escapeHtml(achievement.description) + '</p>' +
                    '<div class="achievement-bar"><span style="width:' + percent + '%"></span></div>' +
                    '<div class="achievement-meta">' +
                        '<span>' + current + ' / ' + achievement.target + '</span>' +
                        '<strong>' + escapeHtml(rewardParts.join(" · ")) + '</strong>' +
                    '</div>' +
                '</div>' +
            '</article>'
        );
    }).join("");
}

async function load() {
    try {
        await syncAchievementStats();
        const state = await getAchievementsState();
        render(state);
    } catch (error) {
        console.error(error);
        summary.textContent = "Não foi possível carregar as conquistas.";
    }
}

load();
