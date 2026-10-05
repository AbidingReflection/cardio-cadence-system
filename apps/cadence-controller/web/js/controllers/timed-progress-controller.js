/** Coordinates timed progress on a linear progress track. */
export class TimedProgressController {
    #progressTrack;

    /** Creates timed progress guidance for the supplied track. */
    constructor(progressTrack) {
        this.#progressTrack = progressTrack;
    }

    /** Renders current progress within a timed interval. */
    render({ elapsedTimeMs, durationMs, markerText }) {
        validateDuration(durationMs);

        validateElapsedTime(elapsedTimeMs, durationMs);

        const progress = elapsedTimeMs / durationMs;

        this.#progressTrack.setMarkerPosition(progress);

        this.#progressTrack.setProgress(progress);

        this.#progressTrack.setMarkerText(markerText);
    }
}

/** Requires a finite positive duration. */
function validateDuration(durationMs) {
    if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs <= 0) {
        throw new RangeError("Timed progress duration must be a finite positive number.");
    }
}

/** Requires elapsed time within the closed timed interval. */
function validateElapsedTime(elapsedTimeMs, durationMs) {
    if (
        typeof elapsedTimeMs !== "number" ||
        !Number.isFinite(elapsedTimeMs) ||
        elapsedTimeMs < 0 ||
        elapsedTimeMs > durationMs
    ) {
        throw new RangeError(
            "Timed progress elapsed time must be a finite number within the duration.",
        );
    }
}
