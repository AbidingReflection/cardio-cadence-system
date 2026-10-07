/**
 * Interaction wiring responsibilities:
 * - Connect playback controls to application playback events.
 * - Connect load acknowledgement interaction to playback events.
 * - Manage workout-change panel interaction.
 * - Delegate structural navigation and deferred actions to WorkoutNavigationController.
 * - Provide cleanup for registered DOM event listeners.
 */

/** Wires Cadence Controller controls to application interactions. */
export function wireInteractions(elements, playbackEvents, workoutNavigationController) {
    const closeChangeWorkoutPanel = () => {
        elements.changeWorkoutPanel.hidden = true;
    };

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
        closeChangeWorkoutPanel();
    };

    const onLoadAdjustmentAcknowledge = () => {
        playbackEvents.acknowledgeLoadAdjustment();
    };

    const onChangeWorkout = () => {
        elements.changeWorkoutPanel.hidden = false;
    };

    const onSkipBlock = () => {
        workoutNavigationController.skipBlock();
        closeChangeWorkoutPanel();
    };

    const onSkipPhase = () => {
        workoutNavigationController.skipPhase();
        closeChangeWorkoutPanel();
    };

    const onFinishBlockSkipPhase = () => {
        workoutNavigationController.scheduleSkipPhaseAfterBlock();
        closeChangeWorkoutPanel();
    };

    const onFinishBlockEndWorkout = () => {
        workoutNavigationController.scheduleEndWorkoutAfterBlock();
        closeChangeWorkoutPanel();
    };

    const onCancelPendingAction = () => {
        workoutNavigationController.cancelPendingAction();
        closeChangeWorkoutPanel();
    };

    const onCancelChangeWorkout = () => {
        closeChangeWorkoutPanel();
    };

    elements.startButton.addEventListener("click", onStart);
    elements.pauseButton.addEventListener("click", onPause);
    elements.resumeButton.addEventListener("click", onResume);
    elements.stopButton.addEventListener("click", onStop);

    elements.loadVisualizer.addEventListener("click", onLoadAdjustmentAcknowledge);

    elements.changeWorkoutButton.addEventListener("click", onChangeWorkout);
    elements.skipBlockButton.addEventListener("click", onSkipBlock);
    elements.skipPhaseButton.addEventListener("click", onSkipPhase);

    elements.finishBlockSkipPhaseButton.addEventListener("click", onFinishBlockSkipPhase);

    elements.finishBlockEndWorkoutButton.addEventListener("click", onFinishBlockEndWorkout);

    elements.cancelPendingActionButton.addEventListener("click", onCancelPendingAction);

    elements.cancelChangeWorkoutButton.addEventListener("click", onCancelChangeWorkout);

    /** Removes all registered application interaction listeners. */
    return function unwireInteractions() {
        elements.startButton.removeEventListener("click", onStart);
        elements.pauseButton.removeEventListener("click", onPause);
        elements.resumeButton.removeEventListener("click", onResume);
        elements.stopButton.removeEventListener("click", onStop);

        elements.loadVisualizer.removeEventListener("click", onLoadAdjustmentAcknowledge);

        elements.changeWorkoutButton.removeEventListener("click", onChangeWorkout);
        elements.skipBlockButton.removeEventListener("click", onSkipBlock);
        elements.skipPhaseButton.removeEventListener("click", onSkipPhase);

        elements.finishBlockSkipPhaseButton.removeEventListener("click", onFinishBlockSkipPhase);

        elements.finishBlockEndWorkoutButton.removeEventListener("click", onFinishBlockEndWorkout);

        elements.cancelPendingActionButton.removeEventListener("click", onCancelPendingAction);

        elements.cancelChangeWorkoutButton.removeEventListener("click", onCancelChangeWorkout);
    };
}
