/** Provides deterministic interval scheduling for playback tests. */

export class TimeSourceFake {
    #nextIntervalId = 1;
    #intervals = new Map();

    /** Registers a repeating callback and returns its timer ID. */
    setInterval(callback, intervalMs) {
        const id = this.#nextIntervalId;

        this.#nextIntervalId += 1;

        this.#intervals.set(id, {
            callback,
            intervalMs,
        });

        return id;
    }

    /** Removes a previously registered repeating callback. */
    clearInterval(id) {
        this.#intervals.delete(id);
    }

    /** Returns the number of currently active intervals. */
    get activeIntervalCount() {
        return this.#intervals.size;
    }

    /** Runs each currently registered interval callback once. */
    runIntervals() {
        for (const interval of [...this.#intervals.values()]) {
            interval.callback();
        }
    }
}
