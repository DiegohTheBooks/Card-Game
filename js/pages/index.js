import { openDatabase } from "../core/database.js";
import {
    getPlayerProfile,
    getProgress,
    savePlayerProfile
} from "../player/profile.js";
import { getWallet } from "../player/currency.js";

openDatabase().catch(console.error);

const els = {
    avatar: document.getElementById("profileAvatar"),
    title: document.getElementById("profileTitle"),
    presentation: document.getElementById("profilePresentation"),
    level: document.getElementById("profileLevel"),
    xp: document.getElementById("profileXp"),
    xpNext: document.getElementById("profileXpNext"),
    xpBar: document.getElementById("profileXpBar"),
    hp: document.getElementById("profileHp"),
    mana: document.getElementById("profileMana"),
    walletSilver: document.getElementById("walletSilver"),
    walletGold: document.getElementById("walletGold"),
    dialog: document.getElementById("profileDialog"),
    edit: document.getElementById("editProfileButton"),
    cancel: document.getElementById("cancelProfileButton"),
    form: document.getElementById("profileForm"),
    nameInput: document.getElementById("profileNameInput"),
    avatarInput: document.getElementById("profileAvatarInput"),
    presentationInput: document.getElementById("profilePresentationInput")
};

let profile = null;
let wallet = null;

function render() {
    if (!profile) return;

    const progress = getProgress(profile);

    els.avatar.textContent = profile.avatar || "✦";
    els.title.textContent = profile.name || "Autor";
    els.presentation.textContent = profile.presentation || "";
    els.level.textContent = profile.level;
    els.xp.textContent = progress.progressXp;
    els.xpNext.textContent = progress.nextLevelXp;
    els.xpBar.style.width = progress.percent + "%";
    els.hp.textContent = profile.maxHp;
    els.mana.textContent = profile.startingMana;

    if (wallet) {
        els.walletSilver.textContent = wallet.silver;
        els.walletGold.textContent = wallet.gold;
    }
}

function openEditor() {
    els.nameInput.value = profile.name || "";
    els.avatarInput.value = profile.avatar || "";
    els.presentationInput.value = profile.presentation || "";

    if (typeof els.dialog.showModal === "function") {
        els.dialog.showModal();
    } else {
        els.dialog.setAttribute("open", "");
    }
}

function closeEditor() {
    if (typeof els.dialog.close === "function") {
        els.dialog.close();
    } else {
        els.dialog.removeAttribute("open");
    }
}

els.edit.addEventListener("click", openEditor);
els.cancel.addEventListener("click", closeEditor);

els.form.addEventListener("submit", async event => {
    event.preventDefault();

    try {
        profile = await savePlayerProfile({
            name: els.nameInput.value.trim() || "Autor",
            avatar: els.avatarInput.value.trim(),
            presentation:
                els.presentationInput.value.trim() ||
                "Dando vida aos personagens de Um Mundo Além das Páginas."
        });

        render();
        closeEditor();
    } catch (error) {
        console.error("Não foi possível salvar o perfil:", error);
    }
});

Promise.all([getPlayerProfile(), getWallet()])
    .then(([profileResult, walletResult]) => {
        profile = profileResult;
        wallet = walletResult;
        render();
    })
    .catch(error => {
        console.error("Não foi possível carregar o perfil:", error);
    });
