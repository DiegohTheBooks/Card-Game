import { openDatabase } from "../core/database.js";
import { getAudioSettings, saveAudioSettings } from "../audio/settings.js";
import {
    setMuted,
    setVolume,
    setEffectsVolume,
    setMusicVolume
} from "../audio/audio.js";

const els = {
    master: document.getElementById("masterVolume"),
    masterValue: document.getElementById("masterVolumeValue"),
    effects: document.getElementById("effectsVolume"),
    effectsValue: document.getElementById("effectsVolumeValue"),
    music: document.getElementById("musicVolume"),
    musicValue: document.getElementById("musicVolumeValue"),
    mute: document.getElementById("muteAll"),
    feedback: document.getElementById("settingsFeedback")
};

function percent(value) {
    return Math.round(Number(value) * 100);
}

function updateOutput(input, output) {
    if (input && output) {
        output.value = `${input.value}%`;
        output.textContent = `${input.value}%`;
    }
}

function showSaved() {
    if (!els.feedback) return;
    els.feedback.textContent = "Configurações salvas automaticamente.";
}

function applySettings(settings) {
    const master = Number(settings.masterVolume);
    const effects = Number(settings.effectsVolume);
    const music = Number(settings.musicVolume);

    els.master.value = percent(master);
    els.effects.value = percent(effects);
    els.music.value = percent(music);
    els.mute.checked = Boolean(settings.muted);

    updateOutput(els.master, els.masterValue);
    updateOutput(els.effects, els.effectsValue);
    updateOutput(els.music, els.musicValue);

    setVolume(master);
    setEffectsVolume(effects);
    setMusicVolume(music);
    setMuted(settings.muted);
}

async function saveCurrent() {
    const settings = await saveAudioSettings({
        masterVolume: Number(els.master.value) / 100,
        effectsVolume: Number(els.effects.value) / 100,
        musicVolume: Number(els.music.value) / 100,
        muted: els.mute.checked
    });

    applySettings(settings);
    showSaved();
}

async function init() {
    try {
        await openDatabase();
        const settings = await getAudioSettings();
        applySettings(settings);
    } catch (error) {
        console.error("Não foi possível carregar as configurações:", error);
        if (els.feedback) {
            els.feedback.textContent = "Não foi possível carregar as configurações de áudio.";
        }
    }
}

els.master?.addEventListener("input", () => {
    const value = Number(els.master.value) / 100;
    updateOutput(els.master, els.masterValue);
    setVolume(value);
});

els.master?.addEventListener("change", saveCurrent);

els.effects?.addEventListener("input", () => {
    const value = Number(els.effects.value) / 100;
    updateOutput(els.effects, els.effectsValue);
    setEffectsVolume(value);
});

els.effects?.addEventListener("change", saveCurrent);

els.music?.addEventListener("input", () => {
    const value = Number(els.music.value) / 100;
    updateOutput(els.music, els.musicValue);
    setMusicVolume(value);
});

els.mute?.addEventListener("change", async () => {
    setMuted(els.mute.checked);
    await saveCurrent();
});

init();
