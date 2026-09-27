import { getAll, STORES } from "../core/database.js";
import { getCardImage, escapeHtml } from "../core/utils.js";
import {
    createBattleState,
    playCard,
    sacrificeCard,
    endPlayerTurn,
    startNextRound,
    isBattleOver,
    getWinner
} from "../battle/battle.js";
import { resolveAttack, getAttackBlockReason, getDynamicAtk, syncAllBoardStats } from "../battle/combat.js";
import { runAiTurnStep } from "../battle/ai.js";
import {
    buildAttackActionQueue,
    buildRoundEffectQueue
} from "../battle/combat-events.js";
import { completeStage, getStage, getEnemyDeckCards } from "../campaign/campaign.js";
import { getPlayerProfile } from "../player/profile.js";
import { grantReward } from "../player/rewards.js";
import { registerAchievementEvent } from "../player/achievements.js";
import { getStoryDeckCards } from "../campaign/campaign.js";
import { playSound, unlockAudio } from "../audio/audio.js";

let audioUnlocked = false;

async function ensureAudioUnlocked() {
    if (audioUnlocked) return;
    audioUnlocked = await unlockAudio();
}

window.addEventListener("pointerdown", ensureAudioUnlocked, { once: true });
window.addEventListener("keydown", ensureAudioUnlocked, { once: true });
loadBattle().catch(error => {
    console.error(error);

    els.status.textContent =
        error.message;

    els.message.textContent =
        error.message;

    els.endTurn.disabled = true;
    els.sacrifice.disabled = true;
});
