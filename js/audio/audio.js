import { getAudioSettings as loadSavedAudioSettings } from "./settings.js";

const AudioEngine = (() => {
    let context = null;
    let master = null;
    let noiseBuffer = null;
    let muted = false;
    let masterVolume = 1;
    let effectsVolume = 0.72;
    let musicVolume = 1;
    let settingsLoaded = false;

    function effectiveEffectsVolume() {
        return masterVolume * effectsVolume;
    }

    function applyVolume() {
        if (master) master.gain.value = muted ? 0 : effectiveEffectsVolume();
    }

    async function loadSettings() {
        if (settingsLoaded) return;
        settingsLoaded = true;

        try {
            const settings = await loadSavedAudioSettings();
            masterVolume = settings.masterVolume;
            effectsVolume = settings.effectsVolume;
            musicVolume = settings.musicVolume;
            muted = settings.muted;
            applyVolume();
        } catch (error) {
            settingsLoaded = false;
            console.error("Não foi possível carregar as configurações de áudio:", error);
        }
    }

    function getContext() {
        if (!context) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return null;

            context = new AudioContextClass();
            master = context.createGain();
            master.gain.value = muted ? 0 : effectiveEffectsVolume();
            master.connect(context.destination);
        }

        return context;
    }

    async function ready() {
        await loadSettings();

        const ctx = getContext();
        if (!ctx) return null;

        if (ctx.state === "suspended") {
            try {
                await ctx.resume();
            } catch (_) {
                return null;
            }
        }

        return ctx;
    }

    function getNoiseBuffer(ctx) {
        if (noiseBuffer) return noiseBuffer;

        const length = Math.floor(ctx.sampleRate * 0.35);
        noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);

        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        return noiseBuffer;
    }

    function tone(ctx, frequency, duration, options = {}) {
        const {
            type = "sine",
            startFrequency = frequency,
            endFrequency = frequency,
            gain = 0.08,
            attack = 0.008,
            release = 0.12,
            when = ctx.currentTime
        } = options;

        const oscillator = ctx.createOscillator();
        const envelope = ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(startFrequency, when);
        oscillator.frequency.exponentialRampToValueAtTime(
            Math.max(20, endFrequency),
            when + Math.max(0.01, duration)
        );

        envelope.gain.setValueAtTime(0.0001, when);
        envelope.gain.exponentialRampToValueAtTime(
            Math.max(0.0002, gain),
            when + attack
        );
        envelope.gain.exponentialRampToValueAtTime(
            0.0001,
            when + Math.max(attack + 0.01, duration - release)
        );

        oscillator.connect(envelope);
        envelope.connect(master);

        oscillator.start(when);
        oscillator.stop(when + duration + 0.03);
    }

    function noise(ctx, duration, options = {}) {
        const {
            gain = 0.08,
            filterFrequency = 1400,
            when = ctx.currentTime
        } = options;

        const source = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const envelope = ctx.createGain();

        source.buffer = getNoiseBuffer(ctx);

        filter.type = "bandpass";
        filter.frequency.setValueAtTime(filterFrequency, when);
        filter.Q.value = 0.7;

        envelope.gain.setValueAtTime(0.0001, when);
        envelope.gain.exponentialRampToValueAtTime(
            Math.max(0.0002, gain),
            when + 0.008
        );
        envelope.gain.exponentialRampToValueAtTime(
            0.0001,
            when + duration
        );

        source.connect(filter);
        filter.connect(envelope);
        envelope.connect(master);

        source.start(when);
        source.stop(when + duration + 0.02);
    }

    function play(type) {
        if (muted) return;

        const ctx = getContext();
        if (!ctx) return;

        const when = ctx.currentTime + 0.005;

        switch (type) {
            case "click":
                tone(ctx, 620, 0.055, {
                    type: "sine",
                    startFrequency: 620,
                    endFrequency: 520,
                    gain: 0.025,
                    attack: 0.004,
                    release: 0.035
                });
                break;

            case "select":
                tone(ctx, 520, 0.075, {
                    type: "triangle",
                    startFrequency: 480,
                    endFrequency: 680,
                    gain: 0.032,
                    attack: 0.004,
                    release: 0.045
                });
                break;

            case "navigate":
                tone(ctx, 430, 0.085, {
                    type: "triangle",
                    startFrequency: 390,
                    endFrequency: 560,
                    gain: 0.028,
                    attack: 0.004,
                    release: 0.055
                });
                break;

            case "open":
                tone(ctx, 420, 0.10, {
                    type: "sine",
                    startFrequency: 360,
                    endFrequency: 560,
                    gain: 0.028,
                    attack: 0.005,
                    release: 0.06
                });
                tone(ctx, 680, 0.10, {
                    type: "sine",
                    startFrequency: 680,
                    endFrequency: 820,
                    gain: 0.022,
                    when: when + 0.055,
                    attack: 0.004,
                    release: 0.05
                });
                break;

            case "close":
                tone(ctx, 560, 0.09, {
                    type: "sine",
                    startFrequency: 560,
                    endFrequency: 390,
                    gain: 0.025,
                    attack: 0.004,
                    release: 0.055
                });
                break;

            case "error":
                tone(ctx, 180, 0.13, {
                    type: "square",
                    startFrequency: 190,
                    endFrequency: 125,
                    gain: 0.028,
                    attack: 0.004,
                    release: 0.075
                });
                break;

            case "confirm":
                tone(ctx, 480, 0.08, {
                    type: "triangle",
                    startFrequency: 440,
                    endFrequency: 620,
                    gain: 0.03,
                    attack: 0.004,
                    release: 0.05
                });
                tone(ctx, 700, 0.12, {
                    type: "sine",
                    startFrequency: 700,
                    endFrequency: 860,
                    gain: 0.025,
                    when: when + 0.055,
                    attack: 0.004,
                    release: 0.065
                });
                break;

            case "card":
            case "summon":
                tone(ctx, 260, 0.16, {
                    type: "triangle",
                    startFrequency: 180,
                    endFrequency: 520,
                    gain: 0.07
                });
                tone(ctx, 520, 0.12, {
                    type: "sine",
                    startFrequency: 520,
                    endFrequency: 760,
                    gain: 0.045,
                    when: when + 0.07
                });
                break;

            case "attack":
                noise(ctx, 0.22, {
                    gain: 0.055,
                    filterFrequency: 900
                });
                tone(ctx, 170, 0.24, {
                    type: "sawtooth",
                    startFrequency: 170,
                    endFrequency: 75,
                    gain: 0.035
                });
                break;

            case "impact":
                noise(ctx, 0.16, {
                    gain: 0.11,
                    filterFrequency: 950
                });
                tone(ctx, 105, 0.16, {
                    type: "square",
                    startFrequency: 125,
                    endFrequency: 55,
                    gain: 0.055
                });
                break;

            case "direct":
                noise(ctx, 0.22, {
                    gain: 0.12,
                    filterFrequency: 650
                });
                tone(ctx, 90, 0.28, {
                    type: "sawtooth",
                    startFrequency: 120,
                    endFrequency: 45,
                    gain: 0.07
                });
                break;

            case "ability":
                tone(ctx, 330, 0.18, {
                    type: "triangle",
                    startFrequency: 330,
                    endFrequency: 440,
                    gain: 0.055
                });
                tone(ctx, 494, 0.24, {
                    type: "sine",
                    startFrequency: 494,
                    endFrequency: 660,
                    gain: 0.045,
                    when: when + 0.08
                });
                break;

            case "retaliation":
                tone(ctx, 230, 0.18, {
                    type: "square",
                    startFrequency: 310,
                    endFrequency: 150,
                    gain: 0.06
                });
                noise(ctx, 0.11, {
                    gain: 0.045,
                    filterFrequency: 1800,
                    when: when + 0.04
                });
                break;

            case "heal":
            case "drain":
                tone(ctx, 390, 0.24, {
                    type: "sine",
                    startFrequency: 300,
                    endFrequency: 620,
                    gain: 0.05
                });
                tone(ctx, 620, 0.26, {
                    type: "sine",
                    startFrequency: 620,
                    endFrequency: 880,
                    gain: 0.04,
                    when: when + 0.10
                });
                break;

            case "bleeding":
            case "poison":
            case "debuff":
                tone(ctx, 125, 0.32, {
                    type: "sawtooth",
                    startFrequency: 180,
                    endFrequency: 75,
                    gain: 0.045
                });
                noise(ctx, 0.16, {
                    gain: 0.035,
                    filterFrequency: 500,
                    when: when + 0.08
                });
                break;

            case "stun":
                tone(ctx, 780, 0.18, {
                    type: "square",
                    startFrequency: 780,
                    endFrequency: 300,
                    gain: 0.045
                });
                tone(ctx, 300, 0.26, {
                    type: "sine",
                    startFrequency: 300,
                    endFrequency: 180,
                    gain: 0.035,
                    when: when + 0.10
                });
                break;

            case "destroy":
                noise(ctx, 0.28, {
                    gain: 0.10,
                    filterFrequency: 500
                });
                tone(ctx, 180, 0.30, {
                    type: "sawtooth",
                    startFrequency: 240,
                    endFrequency: 45,
                    gain: 0.06
                });
                break;

            case "sacrifice":
                tone(ctx, 300, 0.30, {
                    type: "triangle",
                    startFrequency: 360,
                    endFrequency: 80,
                    gain: 0.05
                });
                break;

            case "round":
                tone(ctx, 440, 0.20, {
                    type: "triangle",
                    startFrequency: 440,
                    endFrequency: 520,
                    gain: 0.045
                });
                tone(ctx, 660, 0.28, {
                    type: "sine",
                    startFrequency: 660,
                    endFrequency: 880,
                    gain: 0.045,
                    when: when + 0.11
                });
                break;

            case "combat":
                tone(ctx, 220, 0.20, {
                    type: "triangle",
                    startFrequency: 220,
                    endFrequency: 330,
                    gain: 0.05
                });
                tone(ctx, 330, 0.24, {
                    type: "triangle",
                    startFrequency: 330,
                    endFrequency: 440,
                    gain: 0.04,
                    when: when + 0.10
                });
                break;

            case "victory":
                tone(ctx, 392, 0.24, {
                    type: "triangle",
                    startFrequency: 392,
                    endFrequency: 523,
                    gain: 0.06
                });
                tone(ctx, 523, 0.25, {
                    type: "triangle",
                    startFrequency: 523,
                    endFrequency: 659,
                    gain: 0.055,
                    when: when + 0.14
                });
                tone(ctx, 659, 0.40, {
                    type: "sine",
                    startFrequency: 659,
                    endFrequency: 784,
                    gain: 0.05,
                    when: when + 0.29
                });
                break;

            case "defeat":
                tone(ctx, 260, 0.30, {
                    type: "sawtooth",
                    startFrequency: 300,
                    endFrequency: 180,
                    gain: 0.055
                });
                tone(ctx, 180, 0.42, {
                    type: "triangle",
                    startFrequency: 180,
                    endFrequency: 75,
                    gain: 0.045,
                    when: when + 0.18
                });
                break;

            case "draw":
                tone(ctx, 420, 0.12, {
                    type: "sine",
                    startFrequency: 360,
                    endFrequency: 520,
                    gain: 0.035
                });
                break;

            default:
                tone(ctx, 300, 0.12, {
                    type: "sine",
                    gain: 0.035
                });
        }
    }


    async function unlock() {
        const ctx = await ready();
        return Boolean(ctx);
    }

    async function playSound(type) {
        const ctx = await ready();

        if (!ctx || muted) return;

        play(type);
    }

    function setMuted(value) {
        muted = Boolean(value);
        applyVolume();
    }

    function toggleMute() {
        muted = !muted;
        applyVolume();
        return muted;
    }

    function setVolume(value) {
        masterVolume = Math.max(0, Math.min(1, Number(value) || 0));
        applyVolume();
    }

    function setEffectsVolume(value) {
        effectsVolume = Math.max(0, Math.min(1, Number(value) || 0));
        applyVolume();
    }

    function setMusicVolume(value) {
        musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
    }

    function getSettings() {
        return {
            masterVolume,
            effectsVolume,
            musicVolume,
            muted
        };
    }

    loadSettings();

    return {
        playSound,
        unlock,
        setMuted,
        toggleMute,
        setVolume,
        setEffectsVolume,
        setMusicVolume,
        getSettings,
        isMuted: () => muted
    };
})();

export const playSound = AudioEngine.playSound;
export const unlockAudio = AudioEngine.unlock;
export const setMuted = AudioEngine.setMuted;
export const toggleMute = AudioEngine.toggleMute;
export const setVolume = AudioEngine.setVolume;
export const setEffectsVolume = AudioEngine.setEffectsVolume;
export const setMusicVolume = AudioEngine.setMusicVolume;
export const getAudioSettings = AudioEngine.getSettings;
export const isMuted = AudioEngine.isMuted;
