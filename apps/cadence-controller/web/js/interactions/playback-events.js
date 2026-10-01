/**
 * Playback event responsibilities:
 * - Translate application playback intents into CadenceSession operations.
 * - Keep DOM concerns and rendering state outside playback event handling.
 */

/** Creates application playback event handlers for one cadence session. */
export function createPlaybackEvents(cadenceSession) {
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
    };
}
