/**
 * Playback event responsibilities:
 * - Translate application playback intents into CadenceSession operations.
 * - Translate load acknowledgement intents into playback state operations.
 * - Record explicit playback lifecycle events when execution recording is active.
 * - Keep DOM concerns and rendering state outside playback event handling.
 */

/** Creates application playback event handlers for one cadence session. */
export function createPlaybackEvents(
    cadenceSession,
    loadAdjustmentTracker = undefined,
    executionRecorder = undefined,
) {
    return {
        /** Starts cadence playback. */
        async start() {
            await cadenceSession.start();
        },

        /** Pauses cadence playback and records the frozen protocol position. */
        pause() {
            cadenceSession.pause();

            if (executionRecorder !== undefined) {
                const { protocolElapsedMs } = cadenceSession.getSnapshot();

                executionRecorder.pause(protocolElapsedMs);
            }
        },

        /** Resumes cadence playback and records the resumed protocol position. */
        async resume() {
            await cadenceSession.resume();

            if (executionRecorder !== undefined) {
                const { protocolElapsedMs } = cadenceSession.getSnapshot();

                executionRecorder.resume(protocolElapsedMs);
            }
        },

        /** Stops cadence playback and finalizes an active execution as ended early. */
        stop() {
            const { protocolElapsedMs } = cadenceSession.getSnapshot();
            const executionSnapshot = executionRecorder?.getSnapshot() ?? null;

            cadenceSession.stop();

            if (executionSnapshot?.status === "in-progress") {
                executionRecorder.endEarly(protocolElapsedMs, "manual-stop");
            }
        },

        /** Acknowledges the current load adjustment when load tracking is available. */
        acknowledgeLoadAdjustment() {
            if (loadAdjustmentTracker === undefined) {
                return;
            }

            const { protocolElapsedMs } = cadenceSession.getSnapshot();

            loadAdjustmentTracker.acknowledge(protocolElapsedMs);
        },
    };
}
