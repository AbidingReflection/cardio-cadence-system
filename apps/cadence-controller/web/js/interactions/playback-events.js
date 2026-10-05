/**
 * Playback event responsibilities:
 * - Translate application playback intents into CadenceSession operations.
 * - Translate load acknowledgement intents into playback state operations.
 * - Keep DOM concerns and rendering state outside playback event handling.
 */

/** Creates application playback event handlers for one cadence session. */
export function createPlaybackEvents(cadenceSession, loadAdjustmentTracker = undefined) {
    return {
        async start() {
            await cadenceSession.start();
        },

        pause() {
            cadenceSession.pause();
        },

        async resume() {
            await cadenceSession.resume();
        },

        stop() {
            cadenceSession.stop();
        },

        acknowledgeLoadAdjustment() {
            if (loadAdjustmentTracker === undefined) {
                return;
            }

            const { protocolElapsedMs } = cadenceSession.getSnapshot();

            loadAdjustmentTracker.acknowledge(protocolElapsedMs);
        },
    };
}
