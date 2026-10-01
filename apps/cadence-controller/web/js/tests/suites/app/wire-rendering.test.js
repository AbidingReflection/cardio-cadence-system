import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { wireRendering } from "../../../app/wire-rendering.js";

/** Creates the DOM element contract required by the workout status renderer. */
function createElements() {
    return {
        playbackState: document.createElement("div"),
        countdown: document.createElement("div"),
        elapsedTime: document.createElement("div"),
        remainingTime: document.createElement("div"),
        cadenceVisualizer: document.createElement("div"),

        currentPhase: document.createElement("div"),
        currentBlock: document.createElement("div"),
        nextPhase: document.createElement("div"),
        nextBlock: document.createElement("div"),

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

    return {
        sessionSnapshots,
        workoutSnapshots,
        requestedWorkoutTimes,

        cadenceSession: {
            getSnapshot() {
                return sessionSnapshots.at(-1);
            },
        },

        cadencePhase: {
            phaseAt() {
                return 0;
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

    wireRendering(elements, playback, {
        requestFrame: frames.requestFrame,
        cancelFrame: frames.cancelFrame,
    });

    assertEqual(playback.requestedWorkoutTimes.at(-1), 12500);
    assertEqual(elements.currentBlock.textContent, "Build");
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

    frames.runNextFrame();

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
