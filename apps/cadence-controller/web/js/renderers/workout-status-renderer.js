/**
 * Workout status renderer responsibilities:
 * - Render playback lifecycle and workout timing.
 * - Render current and upcoming protocol structure.
 * - Reflect playback state in available controls.
 */

/** Renders current Cadence Controller playback and workout status. */
export function renderWorkoutStatus(elements, sessionSnapshot, workoutSnapshot) {
    elements.playbackState.textContent = formatPlaybackState(sessionSnapshot.state);

    elements.countdown.textContent = formatCountdown(sessionSnapshot.countdownRemainingMs);

    elements.elapsedTime.textContent = formatDuration(sessionSnapshot.protocolElapsedMs);

    elements.remainingTime.textContent = formatDuration(sessionSnapshot.protocolRemainingMs);

    elements.currentPhase.textContent = formatStructure(workoutSnapshot.currentPhase);

    elements.phaseRemainingTime.textContent = formatPhaseRemaining(workoutSnapshot.currentPhase);

    elements.currentBlock.textContent = formatStructure(workoutSnapshot.currentBlock);

    elements.nextPhase.textContent = formatStructure(workoutSnapshot.nextPhase);

    elements.nextBlock.textContent = formatStructure(workoutSnapshot.nextBlock);

    renderControls(elements, sessionSnapshot.state);
}

/** Formats remaining time in the current phase. */
function formatPhaseRemaining(currentPhase) {
    if (currentPhase === null) {
        return "—";
    }

    return formatDuration(currentPhase.remainingTimeMs);
}

/** Formats a playback lifecycle state for display. */
function formatPlaybackState(state) {
    switch (state) {
        case "idle":
            return "Idle";

        case "countdown":
            return "Starting";

        case "running":
            return "Running";

        case "paused":
            return "Paused";

        case "completed":
            return "Completed";

        default:
            throw new RangeError(`Unsupported playback state "${state}".`);
    }
}

/** Formats countdown time as the next whole second remaining. */
function formatCountdown(remainingMs) {
    if (remainingMs <= 0) {
        return "";
    }

    return String(Math.ceil(remainingMs / 1000));
}

/** Formats elapsed milliseconds as H:MM:SS or M:SS. */
function formatDuration(timeMs) {
    const totalSeconds = Math.floor(timeMs / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return [hours, String(minutes).padStart(2, "0"), String(seconds).padStart(2, "0")].join(
            ":",
        );
    }

    return [minutes, String(seconds).padStart(2, "0")].join(":");
}

/** Formats one current or upcoming protocol structure item. */
function formatStructure(structure) {
    return structure?.name ?? "—";
}

/** Updates playback control availability from session state. */
function renderControls(elements, state) {
    const controls = getControlState(state);

    elements.startButton.disabled = !controls.start;
    elements.pauseButton.disabled = !controls.pause;
    elements.resumeButton.disabled = !controls.resume;
    elements.stopButton.disabled = !controls.stop;
}

/** Returns available playback actions for one lifecycle state. */
function getControlState(state) {
    switch (state) {
        case "idle":
            return {
                start: true,
                pause: false,
                resume: false,
                stop: false,
            };

        case "countdown":
            return {
                start: false,
                pause: false,
                resume: false,
                stop: true,
            };

        case "running":
            return {
                start: false,
                pause: true,
                resume: false,
                stop: true,
            };

        case "paused":
            return {
                start: false,
                pause: false,
                resume: true,
                stop: true,
            };

        case "completed":
            return {
                start: false,
                pause: false,
                resume: false,
                stop: true,
            };

        default:
            throw new RangeError(`Unsupported playback state "${state}".`);
    }
}
