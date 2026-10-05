/**
 * Audio cue engine responsibilities:
 * - Own the Web Audio context used for cadence playback.
 * - Schedule semantic cadence cues against the audio clock.
 * - Synthesize short non-exclusive cue sounds.
 * - Cancel scheduled cues and release audio resources.
 */

const DEFAULT_MASTER_GAIN = 0.15;

const COUNTDOWN_FREQUENCY_HZ = 660;
const COUNTDOWN_DURATION_SECONDS = 0.05;

const LOAD_ALERT_FREQUENCY_HZ = 440;
const LOAD_ALERT_DURATION_SECONDS = 0.2;

const LEFT_FREQUENCY_HZ = 880;
const RIGHT_FREQUENCY_HZ = 720;
const CADENCE_DURATION_SECONDS = 0.06;

const ATTACK_SECONDS = 0.005;
const SILENCE_GAIN = 0.0001;

/** Schedules synthesized cadence cues against one Web Audio clock. */
export class AudioCueEngine {
    #audioContext = null;
    #masterGainNode = null;
    #scheduledCues = new Set();
    #masterGain;

    /** Creates an audio cue engine with the requested master output gain. */
    constructor({ masterGain = DEFAULT_MASTER_GAIN } = {}) {
        validateMasterGain(masterGain);

        this.#masterGain = masterGain;
    }

    /** Returns the current Web Audio clock time in seconds. */
    get currentTime() {
        this.#requireAudioContext();

        return this.#audioContext.currentTime;
    }

    /** Creates or resumes the Web Audio context for cue scheduling. */
    async resume() {
        this.#ensureAudioContext();

        if (this.#audioContext.state === "suspended") {
            await this.#audioContext.resume();
        }
    }

    /** Schedules one semantic cadence cue at an absolute Web Audio time. */
    scheduleCue({ audioTime, type }) {
        this.#requireAudioContext();
        validateAudioTime(audioTime);

        switch (type) {
            case "left":
                this.#scheduleLeftCue(audioTime);
                break;

            case "right":
                this.#scheduleRightCue(audioTime);
                break;

            case "countdown":
                this.#scheduleCountdownCue(audioTime);
                break;

            case "load-alert":
                this.#scheduleLoadAlertCue(audioTime);
                break;

            default:
                throw new RangeError(`Unsupported audio cue type "${type}".`);
        }
    }

    /** Cancels all currently scheduled cadence cues. */
    cancelScheduledCues() {
        if (this.#audioContext === null) {
            return;
        }

        const stopTime = this.#audioContext.currentTime;

        for (const cue of this.#scheduledCues) {
            cue.oscillator.stop(stopTime);
        }

        this.#scheduledCues.clear();
    }

    /** Cancels scheduled cues and closes the owned Web Audio context. */
    async close() {
        if (this.#audioContext === null) {
            return;
        }

        this.cancelScheduledCues();

        await this.#audioContext.close();

        this.#audioContext = null;
        this.#masterGainNode = null;
    }

    /** Creates the Web Audio graph on first use. */
    #ensureAudioContext() {
        if (this.#audioContext !== null) {
            return;
        }

        const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;

        if (AudioContextClass === undefined) {
            throw new Error("Web Audio is not supported by this browser.");
        }

        this.#audioContext = new AudioContextClass();

        this.#masterGainNode = this.#audioContext.createGain();

        this.#masterGainNode.gain.value = this.#masterGain;

        this.#masterGainNode.connect(this.#audioContext.destination);
    }

    /** Requires the Web Audio context to have been initialized. */
    #requireAudioContext() {
        if (this.#audioContext === null) {
            throw new Error("AudioCueEngine must be resumed before scheduling audio.");
        }
    }

    /** Schedules one short left-side cadence transient. */
    #scheduleLeftCue(audioTime) {
        this.#scheduleTone({
            audioTime,
            frequencyHz: LEFT_FREQUENCY_HZ,
            durationSeconds: CADENCE_DURATION_SECONDS,
            oscillatorType: "square",
        });
    }

    /** Schedules one short right-side cadence transient. */
    #scheduleRightCue(audioTime) {
        this.#scheduleTone({
            audioTime,
            frequencyHz: RIGHT_FREQUENCY_HZ,
            durationSeconds: CADENCE_DURATION_SECONDS,
            oscillatorType: "square",
        });
    }

    /** Schedules one short countdown preparation cue. */
    #scheduleCountdownCue(audioTime) {
        this.#scheduleTone({
            audioTime,
            frequencyHz: COUNTDOWN_FREQUENCY_HZ,
            durationSeconds: COUNTDOWN_DURATION_SECONDS,
            oscillatorType: "square",
        });
    }

    /** Schedules one distinct load-adjustment alert. */
    #scheduleLoadAlertCue(audioTime) {
        this.#scheduleTone({
            audioTime,
            frequencyHz: LOAD_ALERT_FREQUENCY_HZ,
            durationSeconds: LOAD_ALERT_DURATION_SECONDS,
            oscillatorType: "triangle",
        });
    }

    /** Schedules one synthesized transient through the shared output graph. */
    #scheduleTone({ audioTime, frequencyHz, durationSeconds, oscillatorType }) {
        const oscillator = this.#audioContext.createOscillator();

        const gainNode = this.#audioContext.createGain();

        oscillator.type = oscillatorType;
        oscillator.frequency.setValueAtTime(frequencyHz, audioTime);

        gainNode.gain.setValueAtTime(SILENCE_GAIN, audioTime);

        gainNode.gain.exponentialRampToValueAtTime(1, audioTime + ATTACK_SECONDS);

        gainNode.gain.exponentialRampToValueAtTime(SILENCE_GAIN, audioTime + durationSeconds);

        oscillator.connect(gainNode);
        gainNode.connect(this.#masterGainNode);

        const cue = {
            oscillator,
            gainNode,
        };

        this.#scheduledCues.add(cue);

        oscillator.addEventListener(
            "ended",
            () => {
                oscillator.disconnect();
                gainNode.disconnect();
                this.#scheduledCues.delete(cue);
            },
            { once: true },
        );

        oscillator.start(audioTime);
        oscillator.stop(audioTime + durationSeconds);
    }
}

/** Validates the master cue output gain. */
function validateMasterGain(masterGain) {
    if (
        typeof masterGain !== "number" ||
        !Number.isFinite(masterGain) ||
        masterGain < 0 ||
        masterGain > 1
    ) {
        throw new RangeError("Audio cue master gain must be between 0 and 1.");
    }
}

/** Validates an absolute Web Audio scheduling time. */
function validateAudioTime(audioTime) {
    if (typeof audioTime !== "number" || !Number.isFinite(audioTime) || audioTime < 0) {
        throw new RangeError("Audio cue time must be a non-negative finite number.");
    }
}
