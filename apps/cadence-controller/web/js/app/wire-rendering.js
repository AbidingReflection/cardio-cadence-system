/**
 * Rendering wiring responsibilities:
 * - Read authoritative playback and workout state.
 * - Render current application state on animation frames.
 * - Provide cleanup for the application rendering loop.
 */

import {
  initializeCadenceVisualizer,
  renderCadenceVisualizer,
} from "../renderers/cadence-visualizer.js";

import {
  initializeLoadVisualizer,
  renderLoadVisualizer,
} from "../renderers/load-visualizer.js";

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
