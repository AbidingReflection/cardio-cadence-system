/**
 * Rendering wiring responsibilities:
 * - Read authoritative playback and workout state.
 * - Render current application state on animation frames.
 * - Provide cleanup for the application rendering loop.
 */

import { formatDurationCompactMs } from "/packages/utils/format-duration.js";

import {
    initializeCadenceVisualizer,
    renderCadenceVisualizer,
} from "../renderers/cadence-visualizer.js";

import { initializeLoadVisualizer, renderLoadVisualizer } from "../renderers/load-visualizer.js";

import {
    initializeTimedProgressRenderer,
    renderTimedProgress,
} from "../renderers/timed-progress-renderer.js";

import { renderWorkoutStatus } from "../renderers/workout-status-renderer.js";

/** Wires Cadence Controller state to animation-frame rendering. */
export function wireRendering(
    elements,
    playback,
    {
        requestFrame = globalThis.requestAnimationFrame.bind(globalThis),
        cancelFrame = globalThis.cancelAnimationFrame.bind(globalThis),
        workoutNavigationController = undefined,
    } = {},
) {
    const cadenceVariable = playback.protocolBundle.cadenceVariable;
    const loadVariable = playback.protocolBundle.loadVariable;

    const cadenceVisualizer = initializeCadenceVisualizer(
        elements.cadenceVisualizer,
        cadenceVariable.unit ?? cadenceVariable.name,
    );

    const loadVisualizer =
        playback.loadSegmentTimeline === undefined
            ? undefined
            : initializeLoadVisualizer(elements.loadVisualizer, loadVariable.name);

    const workoutProgressVisualizer = initializeTimedProgressRenderer(elements.workoutProgress);

    const phaseProgressVisualizer = initializeTimedProgressRenderer(elements.phaseProgress);

    const blockProgressVisualizer = initializeTimedProgressRenderer(elements.blockProgress);

    const phaseRanges = playback.protocolExpander.getPhaseRanges();
    const blockRanges = playback.protocolExpander.getBlockRanges();

    workoutProgressVisualizer.progressTrack.setTicks(
        phaseRanges.slice(1).map((phaseRange) => ({
            id: phaseRange.id,
            position: phaseRange.startTimeMs / playback.protocolExpander.durationMs,
        })),
    );

    let renderedPhaseId = null;

    let frameId = null;

    /** Renders current playback and workout state. */
    function render() {
        let sessionSnapshot = playback.cadenceSession.getSnapshot();

        workoutNavigationController?.update(sessionSnapshot.protocolElapsedMs);

        sessionSnapshot = playback.cadenceSession.getSnapshot();

        const protocolElapsedMs = sessionSnapshot.protocolElapsedMs;

        const workoutSnapshot = playback.workoutContext.getSnapshot(protocolElapsedMs);

        const cadencePhase = playback.cadencePhase.phaseAt(protocolElapsedMs);

        const cadenceRpm = playback.cadencePhase.cadenceAt(protocolElapsedMs);

        const loadGuidance = playback.loadSegmentTimeline?.guidanceAt(protocolElapsedMs);

        let loadAdjustmentSnapshot;

        if (playback.loadAdjustmentTracker !== undefined && sessionSnapshot.state === "running") {
            playback.loadAdjustmentTracker.update(protocolElapsedMs);
        }

        if (playback.loadAdjustmentTracker !== undefined) {
            loadAdjustmentSnapshot = playback.loadAdjustmentTracker.getSnapshot();
        }

        playback.loadAlertController?.update({
            playbackState: sessionSnapshot.state,
            adjustmentPending: loadAdjustmentSnapshot?.pending ?? false,
        });

        const pendingAction = workoutNavigationController?.getPendingAction() ?? null;
        renderWorkoutStatus(elements, sessionSnapshot, workoutSnapshot, pendingAction);

        renderCadenceVisualizer(cadenceVisualizer, {
            phase: cadencePhase,
            cadenceRpm,
        });

        if (loadVisualizer !== undefined && loadGuidance !== undefined) {
            renderLoadVisualizer(loadVisualizer, {
                value: loadGuidance.currentSegment.value,
                progress: loadGuidance.currentSegment.progress,
                remainingTimeMs: loadGuidance.remainingTimeMs,
                nextValue: loadGuidance.nextAdjustment?.value ?? null,
                adjustmentPending: loadAdjustmentSnapshot?.pending ?? false,
            });
        }

        renderTimedProgress(workoutProgressVisualizer, {
            elapsedTimeMs: protocolElapsedMs,
            durationMs: playback.protocolExpander.durationMs,
            markerText: formatDurationCompactMs(protocolElapsedMs),
        });

        const currentPhase = workoutSnapshot.currentPhase;

        if (currentPhase !== null) {
            if (currentPhase.id !== renderedPhaseId) {
                const phaseRange = phaseRanges.find((range) => range.id === currentPhase.id);

                const phaseDurationMs = phaseRange.endTimeMs - phaseRange.startTimeMs;

                const phaseBlockTicks = blockRanges
                    .filter(
                        (range) =>
                            range.phaseId === currentPhase.id &&
                            range.startTimeMs > phaseRange.startTimeMs &&
                            range.startTimeMs < phaseRange.endTimeMs,
                    )
                    .map((range) => ({
                        id: range.id,
                        position: (range.startTimeMs - phaseRange.startTimeMs) / phaseDurationMs,
                    }));

                phaseProgressVisualizer.progressTrack.setTicks(phaseBlockTicks);
                renderedPhaseId = currentPhase.id;
            }

            const phaseDurationMs = currentPhase.elapsedTimeMs + currentPhase.remainingTimeMs;

            renderTimedProgress(phaseProgressVisualizer, {
                elapsedTimeMs: currentPhase.elapsedTimeMs,
                durationMs: phaseDurationMs,
                markerText: formatDurationCompactMs(currentPhase.elapsedTimeMs),
            });
        } else if (renderedPhaseId !== null) {
            phaseProgressVisualizer.progressTrack.setTicks([]);
            renderedPhaseId = null;
        }

        const currentBlock = workoutSnapshot.currentBlock;

        if (currentBlock !== null) {
            const blockDurationMs = currentBlock.elapsedTimeMs + currentBlock.remainingTimeMs;

            renderTimedProgress(blockProgressVisualizer, {
                elapsedTimeMs: currentBlock.elapsedTimeMs,
                durationMs: blockDurationMs,
                markerText: formatDurationCompactMs(currentBlock.elapsedTimeMs),
            });
        }
    }

    /** Renders one frame and schedules the next. */
    function renderFrame() {
        render();

        frameId = requestFrame(renderFrame);
    }

    render();

    frameId = requestFrame(renderFrame);

    /** Stops the rendering loop. */
    return function unwireRendering() {
        if (frameId === null) {
            return;
        }

        cancelFrame(frameId);
        frameId = null;
    };
}
