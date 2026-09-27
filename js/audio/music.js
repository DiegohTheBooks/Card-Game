import { getAudioSettings } from "./settings.js";

const MENU_TRACK = "./grand_project-aquarelle-magical-cinematic-storytelling-597885.mp3";
const BATTLE_TRACK = "./psychronic-chant-of-the-distorted-425666.mp3";
const STORAGE_KEY = "cardduels:music-state";
const FADE_MS = 900;

let audio = null;
let currentTrack = null;
let settings = {
    masterVolume: 1,
    musicVolume: 1,
    muted: false
};
let initialized = false;

function isBattlePage() {
    return document.body?.classList.contains("page-duelo");
}

function desiredTrack() {
    return isBattlePage() ? BATTLE_TRACK : MENU_TRACK;
}

function musicVolume() {
    if (settings.muted) return 0;
    return Math.max(0, Math.min(1,
        Number(settings.masterVolume) * Number(settings.musicVolume)
    ));
}

function saveState() {
    if (!audio || !currentTrack) return;

    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
            track: currentTrack,
            time: Number.isFinite(audio.currentTime) ? audio.currentTime : 0
        }));
    } catch (_) {
        // O jogo continua normalmente mesmo sem sessionStorage.
    }
}

function readState() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const state = JSON.parse(raw);
        return state && typeof state === "object" ? state : null;
    } catch (_) {
        return null;
    }
}

function clearState() {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {
        // Ignora falhas de armazenamento.
    }
}

function ensureAudio() {
    if (audio) return audio;

    audio = new Audio();
    audio.loop = true;
    audio.preload = "auto";
    audio.setAttribute("aria-hidden", "true");
    audio.style.display = "none";

    document.body.appendChild(audio);

    let lastSavedTime = 0;
    audio.addEventListener("timeupdate", () => {
        if (audio.currentTime > 0 && audio.currentTime - lastSavedTime >= 2) {
            lastSavedTime = audio.currentTime;
            saveState();
        }
    });

    return audio;
}

function fadeTo(target, duration = FADE_MS) {
    if (!audio) return;

    const from = Number(audio.volume) || 0;
    const to = Math.max(0, Math.min(1, target));
    const start = performance.now();

    if (duration <= 0) {
        audio.volume = to;
        return;
    }

    function step(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        audio.volume = from + (to - from) * eased;

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }

    requestAnimationFrame(step);
}

async function startTrack(track, resumeTime = 0) {
    const player = ensureAudio();

    if (currentTrack !== track) {
        player.pause();
        player.src = track;
        currentTrack = track;

        if (Number.isFinite(resumeTime) && resumeTime > 0) {
            player.addEventListener("loadedmetadata", () => {
                if (resumeTime < player.duration) {
                    player.currentTime = resumeTime;
                }
            }, { once: true });
        }
    }

    player.volume = 0;

    try {
        await player.play();
        clearState();
        fadeTo(musicVolume());
    } catch (_) {
        // O navegador pode bloquear autoplay. O primeiro clique/touch tentará novamente.
    }
}

async function switchTrack(track) {
    if (!audio) {
        await startTrack(track, 0);
        return;
    }

    if (currentTrack === track && !audio.paused) {
        fadeTo(musicVolume());
        return;
    }

    const previousTime = currentTrack === track ? audio.currentTime : 0;

    if (!audio.paused && currentTrack !== track) {
        fadeTo(0);
        await new Promise(resolve => setTimeout(resolve, FADE_MS));
    }

    await startTrack(track, previousTime);
}

async function startBackgroundMusic() {
    if (!initialized) {
        initialized = true;

        try {
            const saved = await getAudioSettings();
            settings = saved;
        } catch (_) {
            // Mantém os valores padrão.
        }

        window.addEventListener("cardduels:audio-settings", event => {
            settings = {
                ...settings,
                ...(event.detail || {})
            };

            if (audio) {
                fadeTo(musicVolume(), 250);
            }
        });

        window.addEventListener("pointerdown", () => {
            startTrack(desiredTrack(), readState()?.track === desiredTrack()
                ? Number(readState()?.time) || 0
                : 0);
        }, { once: false, passive: true });

        window.addEventListener("keydown", () => {
            startTrack(desiredTrack(), readState()?.track === desiredTrack()
                ? Number(readState()?.time) || 0
                : 0);
        }, { once: false, passive: true });

        window.addEventListener("pagehide", saveState);
        window.addEventListener("beforeunload", saveState);
    }

    const track = desiredTrack();
    const saved = readState();

    // A música tenta começar imediatamente. Se o navegador bloquear autoplay,
    // o listener de pointerdown/keydown acima fará a primeira tentativa após
    // uma interação real do usuário.
    await startTrack(
        track,
        saved?.track === track ? Number(saved.time) || 0 : 0
    );
}

export { startBackgroundMusic, saveState };
