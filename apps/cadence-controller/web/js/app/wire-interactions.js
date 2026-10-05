/**
 * Interaction wiring responsibilities:
 * - Connect playback controls to application playback events.
 * - Connect load acknowledgement interaction to playback events.
 * - Provide cleanup for registered DOM event listeners.
 */

/** Wires Cadence Controller playback controls to playback events. */
export function wireInteractions(elements, playbackEvents) {
    const onStart = async () => {
        await playbackEvents.start();
    };

    const onPause = () => {
        playbackEvents.pause();
    };

    const onResume = async () => {
        await playbackEvents.resume();
    };

    const onStop = () => {
        playbackEvents.stop();
    };

    const onLoadAdjustmentAcknowledge = () => {
        playbackEvents.acknowledgeLoadAdjustment();
    };

    elements.startButton.addEventListener("click", onStart);
    elements.pauseButton.addEventListener("click", onPause);
    elements.resumeButton.addEventListener("click", onResume);
    elements.stopButton.addEventListener("click", onStop);
    elements.loadVisualizer.addEventListener("click", onLoadAdjustmentAcknowledge);

    /** Removes all playback control event listeners. */
    return function unwireInteractions() {
        elements.startButton.removeEventListener("click", onStart);
        elements.pauseButton.removeEventListener("click", onPause);
        elements.resumeButton.removeEventListener("click", onResume);
        elements.stopButton.removeEventListener("click", onStop);
        elements.loadVisualizer.removeEventListener("click", onLoadAdjustmentAcknowledge);
    };
}
