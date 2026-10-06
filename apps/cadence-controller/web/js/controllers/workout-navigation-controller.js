/**
 * Coordinates structural workout navigation across playback context and cadence timing.
 */
export class WorkoutNavigationController {
    #cadenceSession;
    #workoutContext;

    /** Creates a workout navigation controller. */
    constructor({ cadenceSession, workoutContext }) {
        this.#cadenceSession = cadenceSession;
        this.#workoutContext = workoutContext;
    }

    /** Skips immediately to the next block boundary. */
    skipBlock() {
        return this.#navigateTo("nextBlock");
    }

    /** Skips immediately to the next phase boundary. */
    skipPhase() {
        return this.#navigateTo("nextPhase");
    }

    /** Seeks to one upcoming structural boundary when available. */
    #navigateTo(targetKey) {
        const { protocolElapsedMs } = this.#cadenceSession.getSnapshot();

        const workoutSnapshot = this.#workoutContext.getSnapshot(protocolElapsedMs);
        const destination = workoutSnapshot[targetKey];

        if (destination === null) {
            return false;
        }

        this.#cadenceSession.seek(destination.startTimeMs);

        return true;
    }
}
