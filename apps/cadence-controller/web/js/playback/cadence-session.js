/**
 * Cadence session responsibilities:
 * - Own Cadence Controller playback lifecycle and protocol elapsed time.
 * - Map protocol time onto the authoritative Web Audio clock.
 * - Schedule cadence cues through a rolling lookahead window.
 * - Keep configurable start countdown time outside protocol execution time.
 */

const SCHEDULER_INTERVAL_MS = 50;
const LOOKAHEAD_SECONDS = 0.25;

const CUE_CYCLE_INCREMENT = 0.5;
const CUE_CYCLE_EPSILON = 1e-4;

/** Coordinates protocol cadence timing with scheduled Web Audio playback. */
export class CadenceSession {
    #cadencePhase;
    #audioCueEngine;
    #timer;
    #startDelaySeconds;

    #state = "idle";
    #anchorProtocolTimeMs = 0;
    #anchorAudioTime = 0;
    #pausedProtocolTimeMs = 0;
    #nextCueCycleCount = undefined;
    #schedulerId = null;

    /** Creates a cadence playback session. */
    constructor({ cadencePhase, audioCueEngine, startDelaySeconds = 5, timer = globalThis }) {
        validateStartDelay(startDelaySeconds);

        this.#cadencePhase = cadencePhase;
        this.#audioCueEngine = audioCueEngine;
        this.#startDelaySeconds = startDelaySeconds;
        this.#timer = timer;
    }

    /** Returns the current playback state. */
    get state() {
        this.#updateLifecycle();

        return this.#state;
    }

    /** Returns current playback timing without mutating protocol execution time. */
    getSnapshot() {
        this.#updateLifecycle();

        const protocolElapsedMs = this.#getProtocolElapsedTimeMs();

        return {
            state: this.#state,
            protocolElapsedMs,
            protocolRemainingMs: this.#cadencePhase.durationMs - protocolElapsedMs,
            countdownRemainingMs: this.#getCountdownRemainingMs(),
        };
    }

    /** Starts playback after the configured preparation countdown. */
    async start() {
        if (this.#state !== "idle") {
            throw new Error(`Cannot start cadence session while ${this.#state}.`);
        }

        await this.#audioCueEngine.resume();

        const currentAudioTime = this.#audioCueEngine.currentTime;
        const protocolStartAudioTime = currentAudioTime + this.#startDelaySeconds;

        this.#anchorProtocolTimeMs = 0;
        this.#anchorAudioTime = protocolStartAudioTime;
        this.#pausedProtocolTimeMs = 0;

        this.#scheduleCountdown(currentAudioTime);

        this.#audioCueEngine.scheduleCue({
            audioTime: protocolStartAudioTime,
            type: "left",
        });

        this.#nextCueCycleCount = CUE_CYCLE_INCREMENT;

        this.#state = this.#startDelaySeconds === 0 ? "running" : "countdown";

        this.#startScheduler();
        this.#scheduleLookahead();
    }

    /** Pauses active protocol execution at its current protocol time. */
    pause() {
        this.#updateLifecycle();

        if (this.#state !== "running") {
            throw new Error(`Cannot pause cadence session while ${this.#state}.`);
        }

        this.#pausedProtocolTimeMs = this.#getProtocolElapsedTimeMs();

        this.#audioCueEngine.cancelScheduledCues();
        this.#stopScheduler();

        this.#state = "paused";
    }

    /** Resumes protocol execution from its frozen protocol time. */
    async resume() {
        if (this.#state !== "paused") {
            throw new Error(`Cannot resume cadence session while ${this.#state}.`);
        }

        await this.#audioCueEngine.resume();

        this.#anchorProtocolTimeMs = this.#pausedProtocolTimeMs;
        this.#anchorAudioTime = this.#audioCueEngine.currentTime;

        const accumulatedCycles = this.#cadencePhase.cyclesAt(this.#pausedProtocolTimeMs);

        this.#nextCueCycleCount = getNextCueCycleCount(accumulatedCycles);

        this.#state = "running";

        this.#startScheduler();
        this.#scheduleLookahead();
    }

    /** Stops playback and resets protocol execution to its initial state. */
    stop() {
        if (this.#state === "idle") {
            return;
        }

        this.#audioCueEngine.cancelScheduledCues();
        this.#stopScheduler();

        this.#state = "idle";
        this.#anchorProtocolTimeMs = 0;
        this.#anchorAudioTime = 0;
        this.#pausedProtocolTimeMs = 0;
        this.#nextCueCycleCount = undefined;
    }

    /** Advances lifecycle state and fills the current scheduling horizon. */
    #tick() {
        this.#updateLifecycle();

        if (this.#state === "countdown" || this.#state === "running") {
            this.#scheduleLookahead();
        }
    }

    /** Updates countdown and completion transitions from the audio clock. */
    #updateLifecycle() {
        if (
            this.#state === "countdown" &&
            this.#audioCueEngine.currentTime >= this.#anchorAudioTime
        ) {
            this.#state = "running";
        }

        if (
            this.#state === "running" &&
            this.#getProtocolElapsedTimeMs() >= this.#cadencePhase.durationMs
        ) {
            this.#state = "completed";
            this.#pausedProtocolTimeMs = this.#cadencePhase.durationMs;
            this.#stopScheduler();
        }
    }

    /** Schedules semantic cadence cues within the current Web Audio lookahead window. */
    #scheduleLookahead() {
        const horizonAudioTime = this.#audioCueEngine.currentTime + LOOKAHEAD_SECONDS;

        while (this.#nextCueCycleCount !== undefined) {
            const cueProtocolTimeMs = this.#cadencePhase.timeAtCycleCount(this.#nextCueCycleCount);

            if (
                cueProtocolTimeMs === undefined ||
                cueProtocolTimeMs >= this.#cadencePhase.durationMs
            ) {
                this.#nextCueCycleCount = undefined;
                break;
            }

            const cueAudioTime = this.#audioTimeForProtocolTime(cueProtocolTimeMs);

            if (cueAudioTime > horizonAudioTime) {
                break;
            }

            this.#audioCueEngine.scheduleCue({
                audioTime: cueAudioTime,
                type: getCueType(this.#nextCueCycleCount),
            });

            this.#nextCueCycleCount += CUE_CYCLE_INCREMENT;
        }
    }

    /** Schedules preparation cues without advancing protocol execution time. */
    #scheduleCountdown(startAudioTime) {
        for (let second = 0; second < this.#startDelaySeconds; second += 1) {
            this.#audioCueEngine.scheduleCue({
                audioTime: startAudioTime + second,
                type: "countdown",
            });
        }
    }

    /** Maps one absolute protocol time onto the current Web Audio timeline. */
    #audioTimeForProtocolTime(protocolTimeMs) {
        return this.#anchorAudioTime + (protocolTimeMs - this.#anchorProtocolTimeMs) / 1000;
    }

    /** Returns protocol elapsed time derived from current playback state. */
    #getProtocolElapsedTimeMs() {
        if (this.#state === "idle" || this.#state === "countdown") {
            return 0;
        }

        if (this.#state === "paused" || this.#state === "completed") {
            return this.#pausedProtocolTimeMs;
        }

        const elapsedTimeMs =
            this.#anchorProtocolTimeMs +
            (this.#audioCueEngine.currentTime - this.#anchorAudioTime) * 1000;

        return Math.min(elapsedTimeMs, this.#cadencePhase.durationMs);
    }

    /** Returns remaining countdown time without including protocol duration. */
    #getCountdownRemainingMs() {
        if (this.#state !== "countdown") {
            return 0;
        }

        return Math.max(0, (this.#anchorAudioTime - this.#audioCueEngine.currentTime) * 1000);
    }

    /** Starts the JavaScript wake-up timer used for rolling scheduling. */
    #startScheduler() {
        if (this.#schedulerId !== null) {
            return;
        }

        this.#schedulerId = this.#timer.setInterval(() => this.#tick(), SCHEDULER_INTERVAL_MS);
    }

    /** Stops the JavaScript wake-up timer. */
    #stopScheduler() {
        if (this.#schedulerId === null) {
            return;
        }

        this.#timer.clearInterval(this.#schedulerId);
        this.#schedulerId = null;
    }
}

/** Returns the first semantic half-cycle cue strictly after accumulated cycles. */
function getNextCueCycleCount(accumulatedCycles) {
    return (
        (Math.floor((accumulatedCycles + CUE_CYCLE_EPSILON) / CUE_CYCLE_INCREMENT) + 1) *
        CUE_CYCLE_INCREMENT
    );
}

/** Returns the semantic cue type for an accumulated half-cycle boundary. */
function getCueType(cycleCount) {
    return Number.isInteger(cycleCount) ? "left" : "right";
}

/** Validates a whole-second non-negative preparation delay. */
function validateStartDelay(startDelaySeconds) {
    if (!Number.isInteger(startDelaySeconds) || startDelaySeconds < 0) {
        throw new RangeError("Cadence start delay must be a non-negative whole number of seconds.");
    }
}
