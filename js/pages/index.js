import { openDatabase } from "../core/database.js";
import { getPlayerProfile, getProgress } from "../player/profile.js";
import { getWallet } from "../player/currency.js";

openDatabase().catch(console.error);

const els = {
    walletSilver: document.getElementById("walletSilver"),
    walletGold: document.getElementById("walletGold"),
    playerName: document.getElementById("playerName"),
    playerLevel: document.getElementById("playerLevel"),
    playerXpBar: document.getElementById("playerXpBar"),
    playerAvatar: document.getElementById("playerAvatar")
};

async function loadHome() {
    try {
        const [profile, wallet] = await Promise.all([
            getPlayerProfile(),
            getWallet()
        ]);

        if (els.walletSilver) {
            els.walletSilver.textContent = wallet.silver;
        }

        if (els.walletGold) {
            els.walletGold.textContent = wallet.gold;
        }

        if (els.playerName) {
            els.playerName.textContent = profile.name || "Autor";
        }

        if (els.playerLevel) {
            els.playerLevel.textContent = Number(profile.level) || 0;
        }

        if (els.playerXpBar) {
            const progress = getProgress(profile);
            els.playerXpBar.style.width = progress.percent + "%";
        }

        if (els.playerAvatar) {
            const avatar = String(profile.avatar || "").trim();

            if (avatar) {
                els.playerAvatar.textContent = "";
                els.playerAvatar.classList.add("has-image");
                els.playerAvatar.style.backgroundImage = `url("${avatar}")`;
            } else {
                const name = String(profile.name || "Autor").trim();
                els.playerAvatar.textContent = name.charAt(0).toUpperCase() || "A";
            }
        }
    } catch (error) {
        console.error("Não foi possível carregar a Home:", error);
    }
}

loadHome();
