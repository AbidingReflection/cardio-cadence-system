/**
 * Coordinates repeating load-adjustment alert cues from playback state.
 */
export class LoadAlertController {
    #audioCueEngine;
    #timer;
    #repeatIntervalMs;
    #intervalId = null;
    #alerting = false;

    constructor({ audioCueEngine, timer = globalThis, repeatIntervalMs = 200 }) {
        this.#audioCueEngine = audioCueEngine;
        this.#timer = timer;
        this.#repeatIntervalMs = repeatIntervalMs;
    }

    /** Updates load alerting from current playback and adjustment state. */
    update({ playbackState, adjustmentPending }) {
        const shouldAlert = playbackState === "running" && adjustmentPending;

        if (shouldAlert) {
            this.#startAlerting();
            return;
        }

        this.#stopAlerting();
    }

    /** Starts immediate and repeating load alert cues. */
    #startAlerting() {
        if (this.#alerting) {
            return;
        }

        this.#alerting = true;

        this.#scheduleAlert();

        this.#intervalId = this.#timer.setInterval(() => {
            this.#scheduleAlert();
        }, this.#repeatIntervalMs);
    }

    /** Stops repeating load alert cues. */
    #stopAlerting() {
        if (!this.#alerting) {
            return;
        }

        this.#alerting = false;

        if (this.#intervalId !== null) {
            this.#timer.clearInterval(this.#intervalId);
            this.#intervalId = null;
        }
    }

    /** Schedules one load alert at the current Web Audio time. */
    #scheduleAlert() {
        this.#audioCueEngine.scheduleCue({
            audioTime: this.#audioCueEngine.currentTime,
            type: "load-alert",
        });
    }
}
