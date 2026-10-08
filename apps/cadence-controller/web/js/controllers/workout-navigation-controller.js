/**
 * Coordinates structural workout navigation across playback context and cadence timing.
 */
export class WorkoutNavigationController {
    #cadenceSession;
    #workoutContext;
    #executionRecorder;
    #pendingAction = null;
    #pendingNavigationTarget = null;
    #confirmedOmissions = [];

    /** Creates a workout navigation controller. */
    constructor({ cadenceSession, workoutContext, executionRecorder = undefined }) {
        this.#cadenceSession = cadenceSession;
        this.#workoutContext = workoutContext;
        this.#executionRecorder = executionRecorder;
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

        this.#pendingNavigationTarget = {
            phaseId: workoutSnapshot.nextPhase.id,
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

        this.#pendingNavigationTarget = null;

        return true;
    }

    /** Cancels any pending deferred workout action. */
    cancelPendingAction() {
        this.#pendingAction = null;
        this.#pendingNavigationTarget = null;
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
        const pendingNavigationTarget = this.#pendingNavigationTarget;

        this.#pendingAction = null;
        this.#pendingNavigationTarget = null;

        if (pendingAction.action === "skip-phase") {
            this.#confirmedOmissions.push({
                action: "skip-phase",
                startTimeMs: pendingAction.triggerTimeMs,
                endTimeMs: pendingAction.destinationTimeMs,
            });

            this.#cadenceSession.seek(pendingAction.destinationTimeMs);

            this.#executionRecorder?.navigate({
                protocolTimeMs: pendingAction.triggerTimeMs,
                destinationProtocolTimeMs: pendingAction.destinationTimeMs,
                target: pendingNavigationTarget,
                action: "skip-phase",
            });

            return;
        }

        if (pendingAction.action === "end-workout") {
            this.#cadenceSession.seek(pendingAction.triggerTimeMs);
            this.#cadenceSession.end();

            this.#executionRecorder?.endEarly(pendingAction.triggerTimeMs, "end-after-block");

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

        const action = targetKey === "nextBlock" ? "skip-block" : "skip-phase";

        let navigationTarget;

        if (this.#executionRecorder !== undefined) {
            if (action === "skip-block") {
                const destinationSnapshot = this.#workoutContext.getSnapshot(
                    destination.startTimeMs,
                );

                navigationTarget = {
                    phaseId: destinationSnapshot.currentPhase.id,
                    blockId: destinationSnapshot.currentBlock.id,
                };
            } else {
                navigationTarget = {
                    phaseId: destination.id,
                };
            }
        }

        this.#confirmedOmissions.push({
            action,
            startTimeMs: protocolElapsedMs,
            endTimeMs: destination.startTimeMs,
        });

        this.#cadenceSession.seek(destination.startTimeMs);

        if (this.#executionRecorder !== undefined) {
            this.#executionRecorder.navigate({
                protocolTimeMs: protocolElapsedMs,
                destinationProtocolTimeMs: destination.startTimeMs,
                target: navigationTarget,
                action,
            });
        }

        return true;
    }

    /** Returns workout context at the current protocol position. */
    #getCurrentWorkoutSnapshot() {
        const { protocolElapsedMs } = this.#cadenceSession.getSnapshot();

        return this.#workoutContext.getSnapshot(protocolElapsedMs);
    }
}
