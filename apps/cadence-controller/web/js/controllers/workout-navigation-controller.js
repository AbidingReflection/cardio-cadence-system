/**
 * Coordinates structural workout navigation across playback context and cadence timing.
 */
export class WorkoutNavigationController {
    #cadenceSession;
    #workoutContext;
    #pendingAction = null;
    #confirmedOmissions = [];

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

    /** Schedules a phase skip for the end of the current block. */
    scheduleSkipPhaseAfterBlock() {
        const workoutSnapshot = this.#getCurrentWorkoutSnapshot();

        if (workoutSnapshot.currentBlock === null || workoutSnapshot.nextPhase === null) {
            return false;
        }

        this.#pendingAction = {
            action: "skip-phase",
            triggerTimeMs: workoutSnapshot.currentBlock.endTimeMs,
            destinationTimeMs: workoutSnapshot.nextPhase.startTimeMs,
        };

        return true;
    }

    /** Schedules workout termination for the end of the current block. */
    scheduleEndWorkoutAfterBlock() {
        const workoutSnapshot = this.#getCurrentWorkoutSnapshot();

        if (workoutSnapshot.currentBlock === null) {
            return false;
        }

        this.#pendingAction = {
            action: "end-workout",
            triggerTimeMs: workoutSnapshot.currentBlock.endTimeMs,
        };

        return true;
    }

    /** Cancels any pending deferred workout action. */
    cancelPendingAction() {
        this.#pendingAction = null;
    }

    /** Returns the current pending workout action. */
    getPendingAction() {
        return this.#pendingAction === null ? null : { ...this.#pendingAction };
    }

    /** Returns confirmed omitted protocol intervals. */
    getConfirmedOmissions() {
        return this.#confirmedOmissions.map((omission) => ({ ...omission }));
    }

    /** Executes a pending workout action once its trigger time has been reached. */
    update(protocolElapsedMs) {
        if (this.#pendingAction === null || protocolElapsedMs < this.#pendingAction.triggerTimeMs) {
            return;
        }

        const pendingAction = this.#pendingAction;

        this.#pendingAction = null;

        if (pendingAction.action === "skip-phase") {
            this.#confirmedOmissions.push({
                action: "skip-phase",
                startTimeMs: pendingAction.triggerTimeMs,
                endTimeMs: pendingAction.destinationTimeMs,
            });

            this.#cadenceSession.seek(pendingAction.destinationTimeMs);
            return;
        }

        if (pendingAction.action === "end-workout") {
            this.#cadenceSession.seek(pendingAction.triggerTimeMs);
            this.#cadenceSession.end();
            return;
        }

        throw new RangeError(`Unsupported pending workout action "${pendingAction.action}".`);
    }

    /** Seeks to one upcoming structural boundary when available. */
    #navigateTo(targetKey) {
        const { protocolElapsedMs } = this.#cadenceSession.getSnapshot();

        const workoutSnapshot = this.#workoutContext.getSnapshot(protocolElapsedMs);

        const destination = workoutSnapshot[targetKey];

        if (destination === null) {
            return false;
        }

        this.#confirmedOmissions.push({
            action: targetKey === "nextBlock" ? "skip-block" : "skip-phase",
            startTimeMs: protocolElapsedMs,
            endTimeMs: destination.startTimeMs,
        });

        this.#cadenceSession.seek(destination.startTimeMs);

        return true;
    }

    /** Returns workout context at the current protocol position. */
    #getCurrentWorkoutSnapshot() {
        const { protocolElapsedMs } = this.#cadenceSession.getSnapshot();

        return this.#workoutContext.getSnapshot(protocolElapsedMs);
    }
}
