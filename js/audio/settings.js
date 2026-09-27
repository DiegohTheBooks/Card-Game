import { get, put, STORES } from "../core/database.js";

export const DEFAULT_SETTINGS = Object.freeze({
    masterVolume: 1,
    effectsVolume: 0.72,
    musicVolume: 1,
    muted: false
});

let settingsCache = null;
let loadPromise = null;

function clamp(value, fallback = 0) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(1, number));
}

export async function getAudioSettings() {
    if (settingsCache) return { ...settingsCache };
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
        const saved = await get(STORES.SETTINGS, "audio");

        settingsCache = {
            ...DEFAULT_SETTINGS,
            ...(saved?.value || {})
        };

        settingsCache.masterVolume = clamp(
            settingsCache.masterVolume,
            DEFAULT_SETTINGS.masterVolume
        );

        settingsCache.effectsVolume = clamp(
            settingsCache.effectsVolume,
            DEFAULT_SETTINGS.effectsVolume
        );

        settingsCache.musicVolume = clamp(
            settingsCache.musicVolume,
            DEFAULT_SETTINGS.musicVolume
        );

        settingsCache.muted = Boolean(settingsCache.muted);

        return { ...settingsCache };
    })().finally(() => {
        loadPromise = null;
    });

    return loadPromise;
}

export async function saveAudioSettings(patch = {}) {
    const current = await getAudioSettings();

    settingsCache = {
        ...current,
        ...patch
    };

    settingsCache.masterVolume = clamp(
        settingsCache.masterVolume,
        DEFAULT_SETTINGS.masterVolume
    );

    settingsCache.effectsVolume = clamp(
        settingsCache.effectsVolume,
        DEFAULT_SETTINGS.effectsVolume
    );

    settingsCache.musicVolume = clamp(
        settingsCache.musicVolume,
        DEFAULT_SETTINGS.musicVolume
    );

    settingsCache.muted = Boolean(settingsCache.muted);

    await put(STORES.SETTINGS, {
        key: "audio",
        value: { ...settingsCache }
    });

    return { ...settingsCache };
}
