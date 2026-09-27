import { openDatabase } from "../core/database.js";
import { getPlayerProfile } from "../player/profile.js";
import { getWallet } from "../player/currency.js";

openDatabase().catch(console.error);

const els = {
    walletSilver: document.getElementById("walletSilver"),
    walletGold: document.getElementById("walletGold")
};

async function loadWallet() {
    try {
        const wallet = await getWallet();

        if (els.walletSilver) {
            els.walletSilver.textContent = wallet.silver;
        }

        if (els.walletGold) {
            els.walletGold.textContent = wallet.gold;
        }
    } catch (error) {
        console.error("Não foi possível carregar a carteira:", error);
    }
}

// O personagem agora possui uma única página de perfil.
// A edição acontece exclusivamente em perfil.html.
loadWallet();

// Mantém a inicialização do perfil para garantir que o registro exista.
getPlayerProfile().catch(error => {
    console.error("Não foi possível inicializar o perfil do autor:", error);
});
