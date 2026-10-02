import {
  assertEqual,
  test,
} from "/packages/js-testing/framework/test-framework.js";

import { wireRendering } from "../../../app/wire-rendering.js";

/** Creates the DOM element contract required by the workout status renderer. */
function createElements() {
  return {
    playbackState: document.createElement("div"),
    countdown: document.createElement("div"),

    elapsedTime: document.createElement("div"),
    remainingTime: document.createElement("div"),
    phaseRemainingTime: document.createElement("div"),

    currentPhase: document.createElement("div"),
    currentBlock: document.createElement("div"),
    nextPhase: document.createElement("div"),
    nextBlock: document.createElement("div"),

    cadenceVisualizer: document.createElement("div"),
    resistanceValue: document.createElement("div"),

    startButton: document.createElement("button"),
    pauseButton: document.createElement("button"),
    resumeButton: document.createElement("button"),
    stopButton: document.createElement("button"),
  };
}

/** Creates controllable playback state for rendering tests. */
function createPlaybackFake() {
  const sessionSnapshots = [
    {
      state: "idle",
      protocolElapsedMs: 0,
      protocolRemainingMs: 60000,
      countdownRemainingMs: 0,
    },
  ];

  const workoutSnapshots = new Map([
    [
      0,
      {
        currentPhase: {
          id: "phase-1",
          name: "Warmup",
        },
        currentBlock: {
          id: "block-1",
          name: "Easy",
        },
        nextPhase: null,
        nextBlock: null,
      },
    ],
  ]);

  const requestedWorkoutTimes = [];

  const loadValues = new Map([[0, 4]]);

  const requestedLoadTimes = [];
  const requestedLoadBeforeTimes = [];

  return {
    sessionSnapshots,
    workoutSnapshots,
    requestedWorkoutTimes,

    loadVariableId: "resistance",
    loadValues,
    requestedLoadTimes,
    requestedLoadBeforeTimes,

    protocolExpander: {
      durationMs: 60000,

      valueAt(variableId, timeMs) {
        assertEqual(variableId, "resistance");

        requestedLoadTimes.push(timeMs);

        return loadValues.get(timeMs);
      },

      valueBefore(variableId, timeMs) {
        assertEqual(variableId, "resistance");

        requestedLoadBeforeTimes.push(timeMs);

        return loadValues.get(timeMs);
      },
    },

    cadenceSession: {
      getSnapshot() {
        return sessionSnapshots.at(-1);
      },
    },

    cadencePhase: {
      phaseAt() {
        return 0;
      },

      cadenceAt() {
        return 60;
      },
    },

    workoutContext: {
      getSnapshot(timeMs) {
        requestedWorkoutTimes.push(timeMs);

        return (
          workoutSnapshots.get(timeMs) ?? {
            currentPhase: null,
            currentBlock: null,
            nextPhase: null,
            nextBlock: null,
          }
        );
      },
    },
  };
}

/** Provides deterministic requestAnimationFrame behavior for rendering tests. */
function createFrameScheduler() {
  let nextId = 1;
  const callbacks = new Map();
  const cancelledIds = [];

  return {
    requestFrame(callback) {
      const id = nextId;

      nextId += 1;
      callbacks.set(id, callback);

      return id;
    },

    cancelFrame(id) {
      cancelledIds.push(id);
      callbacks.delete(id);
    },

    runNextFrame() {
      const entry = callbacks.entries().next().value;

      if (entry === undefined) {
        return;
      }

      const [id, callback] = entry;

      callbacks.delete(id);
      callback();
    },

    get pendingFrameCount() {
      return callbacks.size;
    },

    get cancelledIds() {
      return cancelledIds;
    },
  };
}

test("wire-rendering", "renders current state immediately", () => {
  const elements = createElements();
  const playback = createPlaybackFake();
  const frames = createFrameScheduler();

  wireRendering(elements, playback, {
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
  });

  assertEqual(elements.playbackState.textContent, "Idle");
  assertEqual(elements.elapsedTime.textContent, "0:00");
  assertEqual(elements.remainingTime.textContent, "1:00");
  assertEqual(elements.currentPhase.textContent, "Warmup");
  assertEqual(elements.currentBlock.textContent, "Easy");
  assertEqual(elements.resistanceValue.textContent, "4");
});

test("wire-rendering", "uses session protocol time for workout context", () => {
  const elements = createElements();
  const playback = createPlaybackFake();
  const frames = createFrameScheduler();

  playback.sessionSnapshots.push({
    state: "running",
    protocolElapsedMs: 12500,
    protocolRemainingMs: 47500,
    countdownRemainingMs: 0,
  });

  playback.workoutSnapshots.set(12500, {
    currentPhase: {
      id: "phase-1",
      name: "Warmup",
    },
    currentBlock: {
      id: "block-2",
      name: "Build",
    },
    nextPhase: null,
    nextBlock: null,
  });

  playback.loadValues.set(12500, 8);

  wireRendering(elements, playback, {
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
  });

  assertEqual(playback.requestedWorkoutTimes.at(-1), 12500);
  assertEqual(elements.currentBlock.textContent, "Build");
  assertEqual(playback.requestedLoadTimes.at(-1), 12500);
  assertEqual(elements.resistanceValue.textContent, "8");
});

test("wire-rendering", "rerenders on animation frames", () => {
  const elements = createElements();
  const playback = createPlaybackFake();
  const frames = createFrameScheduler();

  wireRendering(elements, playback, {
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
  });

  playback.sessionSnapshots.push({
    state: "running",
    protocolElapsedMs: 5000,
    protocolRemainingMs: 55000,
    countdownRemainingMs: 0,
  });

  playback.workoutSnapshots.set(5000, {
    currentPhase: {
      id: "phase-1",
      name: "Warmup",
    },
    currentBlock: {
      id: "block-1",
      name: "Easy",
    },
    nextPhase: null,
    nextBlock: null,
  });

  playback.loadValues.set(5000, 6);
  frames.runNextFrame();

  assertEqual(elements.resistanceValue.textContent, "6");
  assertEqual(elements.playbackState.textContent, "Running");
  assertEqual(elements.elapsedTime.textContent, "0:05");
  assertEqual(elements.remainingTime.textContent, "0:55");
  assertEqual(frames.pendingFrameCount, 1);
});

test("wire-rendering", "cancels the scheduled frame on teardown", () => {
  const elements = createElements();
  const playback = createPlaybackFake();
  const frames = createFrameScheduler();

  const unwire = wireRendering(elements, playback, {
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
  });

  assertEqual(frames.pendingFrameCount, 1);

  unwire();

  assertEqual(frames.pendingFrameCount, 0);
  assertEqual(frames.cancelledIds.length, 1);
});

test(
  "wire-rendering",
  "renders dash when playback has no load variable",
  () => {
    const elements = createElements();
    const playback = createPlaybackFake();
    const frames = createFrameScheduler();

    playback.loadVariableId = undefined;

    wireRendering(elements, playback, {
      requestFrame: frames.requestFrame,
      cancelFrame: frames.cancelFrame,
    });

    assertEqual(elements.resistanceValue.textContent, "—");
    assertEqual(playback.requestedLoadTimes.length, 0);
  },
);

test(
  "wire-rendering",
  "renders final load value at protocol completion",
  () => {
    const elements = createElements();
    const playback = createPlaybackFake();
    const frames = createFrameScheduler();

    playback.sessionSnapshots.push({
      state: "completed",
      protocolElapsedMs: 60000,
      protocolRemainingMs: 0,
      countdownRemainingMs: 0,
    });

    playback.loadValues.set(60000, 3);

    wireRendering(elements, playback, {
      requestFrame: frames.requestFrame,
      cancelFrame: frames.cancelFrame,
    });

    assertEqual(playback.requestedLoadTimes.length, 0);
    assertEqual(playback.requestedLoadBeforeTimes.at(-1), 60000);
    assertEqual(elements.resistanceValue.textContent, "3");
  },
);
