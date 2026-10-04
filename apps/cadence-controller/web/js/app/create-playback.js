/**
 * Playback composition responsibilities:
 * - Create shared protocol interpretation for cadence playback.
 * - Assemble workout context, cadence timing, audio, and session lifecycle.
 * - Expose protocol variable semantics required by playback rendering.
 * - Keep DOM, rendering, interaction wiring, and persistence outside playback creation.
 */

import { ProtocolExpander } from "/packages/protocol-expander/protocol-expander.js";

import { AudioCueEngine } from "../audio/audio-cue-engine.js";
import { CadencePhase } from "../playback/cadence-phase.js";
import { CadenceSession } from "../playback/cadence-session.js";
import { LoadSegmentTimeline } from "../playback/load-segment-timeline.js";
import { WorkoutContext } from "../playback/workout-context.js";

/** Creates the runtime playback graph for one validated protocol bundle. */
export function createPlayback(
  protocolBundle,
  {
    startDelaySeconds = 5,
    audioCueEngine = new AudioCueEngine(),
    timer = globalThis,
  } = {},
) {
  const protocol = protocolBundle.protocol;

  const protocolExpander = new ProtocolExpander(protocol);

  const workoutContext = new WorkoutContext(protocol, protocolExpander);

  const cadencePhase = new CadencePhase(
    protocolExpander,
    protocolBundle.cadenceVariableId,
  );

  const loadVariableId = protocolBundle.loadVariableId;

  const loadSegmentTimeline =
    loadVariableId === undefined
      ? undefined
      : new LoadSegmentTimeline(protocolExpander, loadVariableId);

  const cadenceSession = new CadenceSession({
    cadencePhase,
    audioCueEngine,
    startDelaySeconds,
    timer,
  });

  return {
    protocolBundle,
    protocolExpander,
    workoutContext,
    cadencePhase,
    loadVariableId,
    loadSegmentTimeline,
    audioCueEngine,
    cadenceSession,
  };
}
