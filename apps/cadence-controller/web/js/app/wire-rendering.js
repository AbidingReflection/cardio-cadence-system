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

import {
  initializeLoadVisualizer,
  renderLoadVisualizer,
} from "../renderers/load-visualizer.js";

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
  } = {},
) {
  const cadenceVisualizer = initializeCadenceVisualizer(
    elements.cadenceVisualizer,
  );

  const loadVisualizer =
    playback.loadSegmentTimeline === undefined
      ? undefined
      : initializeLoadVisualizer(elements.loadVisualizer);

  const workoutProgressVisualizer = initializeTimedProgressRenderer(
    elements.workoutProgress,
  );

  const phaseProgressVisualizer = initializeTimedProgressRenderer(
    elements.phaseProgress,
  );

  let frameId = null;

  /** Renders current playback and workout state. */
  function render() {
    const sessionSnapshot = playback.cadenceSession.getSnapshot();

    const protocolElapsedMs = sessionSnapshot.protocolElapsedMs;

    const workoutSnapshot =
      playback.workoutContext.getSnapshot(protocolElapsedMs);

    const cadencePhase = playback.cadencePhase.phaseAt(protocolElapsedMs);

    const cadenceRpm = playback.cadencePhase.cadenceAt(protocolElapsedMs);

    const loadSegment =
      playback.loadSegmentTimeline?.segmentAt(protocolElapsedMs);

    renderWorkoutStatus(elements, sessionSnapshot, workoutSnapshot);

    renderCadenceVisualizer(cadenceVisualizer, {
      phase: cadencePhase,
      cadenceRpm,
    });

    if (loadVisualizer !== undefined && loadSegment !== undefined) {
      renderLoadVisualizer(loadVisualizer, {
        value: loadSegment.value,
        progress: loadSegment.progress,
      });
    }

    renderTimedProgress(workoutProgressVisualizer, {
      elapsedTimeMs: protocolElapsedMs,
      durationMs: playback.protocolExpander.durationMs,
      markerText: formatDurationCompactMs(protocolElapsedMs),
    });

    const currentPhase = workoutSnapshot.currentPhase;

    if (currentPhase !== null) {
      const phaseDurationMs =
        currentPhase.elapsedTimeMs + currentPhase.remainingTimeMs;

      renderTimedProgress(phaseProgressVisualizer, {
        elapsedTimeMs: currentPhase.elapsedTimeMs,
        durationMs: phaseDurationMs,
        markerText: formatDurationCompactMs(currentPhase.elapsedTimeMs),
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
