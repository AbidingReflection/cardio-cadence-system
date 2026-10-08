/**
 * Workout status renderer responsibilities:
 * - Render playback lifecycle and workout timing.
 * - Render current and upcoming protocol structure.
 * - Reflect playback state in available controls.
 */

import { formatDurationCompactMs } from "/packages/utils/format-duration.js";

/** Renders current Cadence Controller playback and workout status. */
export function renderWorkoutStatus(
    elements,
    sessionSnapshot,
    workoutSnapshot,
    pendingAction = null,
) {
    setTextContent(elements.playbackState, formatPlaybackState(sessionSnapshot.state));

    setTextContent(elements.countdown, formatCountdown(sessionSnapshot.countdownRemainingMs));

    setTextContent(
        elements.elapsedTime,
        formatDurationCompactMs(sessionSnapshot.protocolElapsedMs),
    );

    setTextContent(
        elements.remainingTime,
        formatDurationCompactMs(sessionSnapshot.protocolRemainingMs),
    );

    setTextContent(elements.currentPhase, formatStructure(workoutSnapshot.currentPhase));

    setTextContent(elements.phaseRemainingTime, formatPhaseRemaining(workoutSnapshot.currentPhase));

    setTextContent(elements.currentBlock, formatStructure(workoutSnapshot.currentBlock));

    setTextContent(elements.nextPhase, formatStructure(workoutSnapshot.nextPhase));

    setTextContent(elements.nextBlock, formatStructure(workoutSnapshot.nextBlock));

    renderControls(elements, sessionSnapshot.state, workoutSnapshot, pendingAction);
}

/** Formats remaining time in the current phase. */
function formatPhaseRemaining(currentPhase) {
    if (currentPhase === null) {
        return "—";
    }

    return formatDurationCompactMs(currentPhase.remainingTimeMs);
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

/** Formats one current or upcoming protocol structure item. */
function formatStructure(structure) {
    return structure?.name ?? "—";
}

/** Updates playback control availability from session and workout state. */
function renderControls(elements, state, workoutSnapshot, pendingAction) {
    const controls = getControlState(state);

    setDisabled(elements.startButton, !controls.start);
    setDisabled(elements.pauseButton, !controls.pause);
    setDisabled(elements.resumeButton, !controls.resume);
    setDisabled(elements.stopButton, !controls.stop);

    const navigationAvailable =
        (state === "running" || state === "paused") &&
        (workoutSnapshot.nextBlock !== null || workoutSnapshot.nextPhase !== null);

    setDisabled(elements.changeWorkoutButton, !navigationAvailable);

    const pending = pendingAction !== null;

    setTextContent(elements.changeWorkoutButton, pending ? "After Block" : "Change");

    setClassEnabled(elements.changeWorkoutButton, "playback-control--pending", pending);

    setHidden(elements.cancelPendingActionButton, !pending);
}

/** Updates text content only when its rendered value has changed. */
function setTextContent(element, value) {
    const text = String(value);

    if (element.textContent !== text) {
        element.textContent = text;
    }
}

/** Updates a disabled state only when its value has changed. */
function setDisabled(element, disabled) {
    if (element.disabled !== disabled) {
        element.disabled = disabled;
    }
}

/** Updates element visibility only when its value has changed. */
function setHidden(element, hidden) {
    if (element.hidden !== hidden) {
        element.hidden = hidden;
    }
}

/** Updates one class state only when its value has changed. */
function setClassEnabled(element, className, enabled) {
    if (element.classList.contains(className) !== enabled) {
        element.classList.toggle(className, enabled);
    }
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
