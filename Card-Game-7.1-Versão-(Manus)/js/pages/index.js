import { openDatabase, getAll, STORES } from "../core/database.js";
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

function cardImage(card) {
    return card?.image || card?.imageData || card?.imageUrl || card?.art || "";
}

async function resolveAvatar(profile) {
    const value = String(profile?.avatar || "").trim();

    if (!value) return "";

    // Mantém compatibilidade com perfis antigos que eventualmente
    // tenham guardado a própria URL/data da imagem.
    if (/^(data:|https?:|blob:)/i.test(value)) {
        return value;
    }

    // O perfil atual guarda o originalId da carta/personagem escolhida.
    const cards = await getAll(STORES.COLLECTION);
    const card = cards.find(item => String(item.originalId) === value);

    return cardImage(card);
}

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
            const image = await resolveAvatar(profile);

            if (image) {
                els.playerAvatar.textContent = "";
                els.playerAvatar.classList.add("has-image");
                els.playerAvatar.style.backgroundImage = `url("${image}")`;
            } else {
                els.playerAvatar.classList.remove("has-image");
                els.playerAvatar.style.backgroundImage = "";
                const name = String(profile.name || "Autor").trim();
                els.playerAvatar.textContent = name.charAt(0).toUpperCase() || "A";
            }
        }
    } catch (error) {
        console.error("Não foi possível carregar a Home:", error);
    }
}

loadHome();
