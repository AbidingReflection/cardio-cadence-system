import {
  assertEqual,
  test,
} from "/packages/js-testing/framework/test-framework.js";

import { ProtocolExpander } from "/packages/protocol-expander/protocol-expander.js";

import { createPlayback } from "../../../app/create-playback.js";
import { AudioCueEngine } from "../../../audio/audio-cue-engine.js";
import { CadencePhase } from "../../../playback/cadence-phase.js";
import { CadenceSession } from "../../../playback/cadence-session.js";
import { WorkoutContext } from "../../../playback/workout-context.js";

import { AudioCueEngineFake } from "../../helpers/audio-cue-engine-fake.js";
import { TimeSourceFake } from "../../helpers/time-source-fake.js";

/** Creates a minimal bundle-shaped playback input. */
function createProtocolBundle() {
  return {
    cadenceVariableId: "cadence",
    loadVariableId: "resistance",
    protocol: {
      id: "test-protocol",
      name: "Test Protocol",
      activityTypeId: "elliptical",
      machineProfileId: null,
      calibrationProfileId: null,
      phases: [
        {
          id: "phase-1",
          name: "Phase 1",
          blocks: [
            {
              id: "block-1",
              name: "Block 1",
              durationSeconds: 60,
              variables: {
                cadence: {
                  type: "steady",
                  start: 60,
                },
                resistance: {
                  type: "steady",
                  start: 8,
                },
              },
            },
          ],
        },
      ],
    },
  };
}

test("create-playback", "creates the complete playback composition", () => {
  const protocolBundle = createProtocolBundle();
  const audioCueEngine = new AudioCueEngineFake();
  const timer = new TimeSourceFake();

  const playback = createPlayback(protocolBundle, {
    audioCueEngine,
    timer,
  });

  assertEqual(playback.protocolBundle, protocolBundle);
  assertEqual(playback.protocolExpander instanceof ProtocolExpander, true);
  assertEqual(playback.workoutContext instanceof WorkoutContext, true);
  assertEqual(playback.cadencePhase instanceof CadencePhase, true);
  assertEqual(playback.cadenceSession instanceof CadenceSession, true);
  assertEqual(playback.loadVariableId, "resistance");
});

test("create-playback", "uses the supplied audio cue engine", () => {
  const protocolBundle = createProtocolBundle();
  const audioCueEngine = new AudioCueEngineFake();

  const playback = createPlayback(protocolBundle, {
    audioCueEngine,
    timer: new TimeSourceFake(),
  });

  assertEqual(playback.audioCueEngine, audioCueEngine);
});

test("create-playback", "uses bundle cadence variable resolution", () => {
  const protocolBundle = createProtocolBundle();

  protocolBundle.cadenceVariableId = "pedal-rate";
  protocolBundle.protocol.phases[0].blocks[0].variables = {
    "pedal-rate": {
      type: "steady",
      start: 50,
    },
  };

  const playback = createPlayback(protocolBundle, {
    audioCueEngine: new AudioCueEngineFake(),
    timer: new TimeSourceFake(),
  });

  assertEqual(playback.cadencePhase.cyclesBetween(0, 1200), 1);
});

test(
  "create-playback",
  "shares protocol interpretation across playback components",
  () => {
    const protocolBundle = createProtocolBundle();

    const playback = createPlayback(protocolBundle, {
      audioCueEngine: new AudioCueEngineFake(),
      timer: new TimeSourceFake(),
    });

    const workoutSnapshot = playback.workoutContext.getSnapshot(1000);

    assertEqual(workoutSnapshot.currentPhase.id, "phase-1");
    assertEqual(workoutSnapshot.currentBlock.id, "block-1");

    assertEqual(playback.cadencePhase.cyclesAt(1000), 1);
  },
);

test("create-playback", "passes start delay into cadence session", async () => {
  const protocolBundle = createProtocolBundle();
  const audioCueEngine = new AudioCueEngineFake();

  const playback = createPlayback(protocolBundle, {
    audioCueEngine,
    timer: new TimeSourceFake(),
    startDelaySeconds: 7,
  });

  audioCueEngine.currentTime = 10;

  await playback.cadenceSession.start();

  const snapshot = playback.cadenceSession.getSnapshot();

  assertEqual(snapshot.state, "countdown");
  assertEqual(snapshot.countdownRemainingMs, 7000);

  playback.cadenceSession.stop();
});

test("create-playback", "defaults to a five second start delay", async () => {
  const protocolBundle = createProtocolBundle();
  const audioCueEngine = new AudioCueEngineFake();

  const playback = createPlayback(protocolBundle, {
    audioCueEngine,
    timer: new TimeSourceFake(),
  });

  audioCueEngine.currentTime = 10;

  await playback.cadenceSession.start();

  assertEqual(playback.cadenceSession.getSnapshot().countdownRemainingMs, 5000);

  playback.cadenceSession.stop();
});

test("create-playback", "creates a real audio cue engine by default", () => {
  const playback = createPlayback(createProtocolBundle());

  assertEqual(playback.audioCueEngine instanceof AudioCueEngine, true);
});

test("create-playback", "uses bundle load variable resolution", () => {
  const protocolBundle = createProtocolBundle();

  protocolBundle.loadVariableId = "level";
  protocolBundle.protocol.phases[0].blocks[0].variables = {
    cadence: {
      type: "steady",
      start: 60,
    },
    level: {
      type: "steady",
      start: 12,
    },
  };

  const playback = createPlayback(protocolBundle, {
    audioCueEngine: new AudioCueEngineFake(),
    timer: new TimeSourceFake(),
  });

  assertEqual(playback.loadVariableId, "level");
  assertEqual(
    playback.protocolExpander.valueAt(playback.loadVariableId, 0),
    12,
  );
});
