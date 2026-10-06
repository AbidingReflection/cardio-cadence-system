import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { wireRendering } from "../../../app/wire-rendering.js";

/** Creates the DOM element contract required by application rendering. */
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
        loadVisualizer: document.createElement("div"),

        blockProgress: document.createElement("div"),
        workoutProgress: document.createElement("div"),
        phaseProgress: document.createElement("div"),

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

    const phaseRanges = [
        {
            id: "phase-1",
            startTimeMs: 0,
            endTimeMs: 30_000,
        },
        {
            id: "phase-2",
            startTimeMs: 30_000,
            endTimeMs: 60_000,
        },
    ];

    const blockRanges = [
        {
            id: "block-1",
            phaseId: "phase-1",
            startTimeMs: 0,
            endTimeMs: 10_000,
        },
        {
            id: "block-2",
            phaseId: "phase-1",
            startTimeMs: 10_000,
            endTimeMs: 30_000,
        },
        {
            id: "block-3",
            phaseId: "phase-2",
            startTimeMs: 30_000,
            endTimeMs: 45_000,
        },
        {
            id: "block-4",
            phaseId: "phase-2",
            startTimeMs: 45_000,
            endTimeMs: 60_000,
        },
    ];

    const workoutSnapshots = new Map([
        [
            0,
            {
                currentPhase: {
                    id: "phase-1",
                    name: "Warmup",
                    startTimeMs: 0,
                    endTimeMs: 60_000,
                    elapsedTimeMs: 0,
                    remainingTimeMs: 60_000,
                },
                currentBlock: {
                    id: "block-1",
                    name: "Easy",
                    startTimeMs: 0,
                    endTimeMs: 30_000,
                    elapsedTimeMs: 0,
                    remainingTimeMs: 30_000,
                },
                nextPhase: null,
                nextBlock: null,
            },
        ],
    ]);

    const requestedWorkoutTimes = [];

    const loadSegments = new Map([
        [
            0,
            {
                value: 4,
                startTimeMs: 0,
                endTimeMs: 10000,
                progress: 0,
            },
        ],
    ]);

    const requestedLoadSegmentTimes = [];

    const requestedLoadAdjustmentTimes = [];

    const loadAdjustmentSnapshot = {
        pending: true,
        fromValue: null,
        toValue: 4,
        dueTimeMs: 0,
        acknowledgedAtTimeMs: null,
    };

    return {
        sessionSnapshots,
        workoutSnapshots,
        requestedWorkoutTimes,

        loadSegments,
        requestedLoadSegmentTimes,
        requestedLoadAdjustmentTimes,
        loadAdjustmentSnapshot,

        protocolBundle: {
            cadenceVariable: {
                id: "cadence",
                name: "Cadence",
                unit: "RPM",
                role: "cadence",
            },

            loadVariable: {
                id: "resistance",
                name: "Resistance",
                unit: null,
                role: "load",
            },
        },

        protocolExpander: {
            durationMs: 60_000,

            getPhaseRanges() {
                return structuredClone(phaseRanges);
            },

            getBlockRanges() {
                return structuredClone(blockRanges);
            },
        },

        loadAdjustmentTracker: {
            update(timeMs) {
                requestedLoadAdjustmentTimes.push(timeMs);
            },

            getSnapshot() {
                return loadAdjustmentSnapshot;
            },
        },

        loadSegmentTimeline: {
            guidanceAt(timeMs) {
                requestedLoadSegmentTimes.push(timeMs);

                const currentSegment = loadSegments.get(timeMs);

                if (currentSegment === undefined) {
                    return undefined;
                }

                return {
                    currentSegment,
                    remainingTimeMs: Math.max(0, currentSegment.endTimeMs - timeMs),
                    nextAdjustment: null,
                };
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

    assertEqual(
        elements.loadVisualizer.querySelector(".progression-circle__value").textContent,
        "4",
    );

    assertEqual(playback.requestedLoadSegmentTimes.at(-1), 0);
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
            startTimeMs: 0,
            endTimeMs: 60_000,
            elapsedTimeMs: 12_500,
            remainingTimeMs: 47_500,
        },
        currentBlock: {
            id: "block-2",
            name: "Build",
            startTimeMs: 10_000,
            endTimeMs: 20_000,
            elapsedTimeMs: 2_500,
            remainingTimeMs: 7_500,
        },
        nextPhase: null,
        nextBlock: null,
    });

    playback.loadSegments.set(12500, {
        value: 8,
        startTimeMs: 10000,
        endTimeMs: 20000,
        progress: 0.25,
    });

    wireRendering(elements, playback, {
        requestFrame: frames.requestFrame,
        cancelFrame: frames.cancelFrame,
    });

    assertEqual(playback.requestedWorkoutTimes.at(-1), 12500);

    assertEqual(elements.currentBlock.textContent, "Build");

    assertEqual(playback.requestedLoadSegmentTimes.at(-1), 12500);

    assertEqual(
        elements.loadVisualizer.querySelector(".progression-circle__value").textContent,
        "8",
    );

    assertEqual(
        elements.loadVisualizer
            .querySelector(".progression-circle__marker")
            .getAttribute("transform"),
        "rotate(90 50 50)",
    );
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
            startTimeMs: 0,
            endTimeMs: 60_000,
            elapsedTimeMs: 5_000,
            remainingTimeMs: 55_000,
        },
        currentBlock: {
            id: "block-1",
            name: "Easy",
            startTimeMs: 0,
            endTimeMs: 30_000,
            elapsedTimeMs: 0,
            remainingTimeMs: 30_000,
        },
        nextPhase: null,
        nextBlock: null,
    });

    playback.loadSegments.set(5000, {
        value: 6,
        startTimeMs: 0,
        endTimeMs: 10000,
        progress: 0.5,
    });

    frames.runNextFrame();

    assertEqual(
        elements.loadVisualizer.querySelector(".progression-circle__value").textContent,
        "6",
    );

    assertEqual(
        elements.loadVisualizer
            .querySelector(".progression-circle__progress")
            .getAttribute("stroke-dashoffset"),
        "0.5",
    );

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

test("wire-rendering", "omits load visualizer when playback has no load timeline", () => {
    const elements = createElements();
    const playback = createPlaybackFake();
    const frames = createFrameScheduler();

    playback.loadSegmentTimeline = undefined;
    playback.loadAdjustmentTracker = undefined;

    wireRendering(elements, playback, {
        requestFrame: frames.requestFrame,
        cancelFrame: frames.cancelFrame,
    });

    assertEqual(elements.loadVisualizer.querySelectorAll(".progression-circle").length, 0);

    assertEqual(playback.requestedLoadSegmentTimes.length, 0);
    assertEqual(playback.requestedLoadAdjustmentTimes.length, 0);
});

test("wire-rendering", "updates load adjustment state from session protocol time", () => {
    const elements = createElements();
    const playback = createPlaybackFake();
    const frames = createFrameScheduler();

    playback.sessionSnapshots.push({
        state: "running",
        protocolElapsedMs: 30_000,
        protocolRemainingMs: 30_000,
        countdownRemainingMs: 0,
    });

    playback.loadSegments.set(30_000, {
        value: 4,
        startTimeMs: 0,
        endTimeMs: 60_000,
        progress: 0.5,
    });

    wireRendering(elements, playback, {
        requestFrame: frames.requestFrame,
        cancelFrame: frames.cancelFrame,
    });

    assertEqual(playback.requestedLoadAdjustmentTimes.at(-1), 30_000);
});

test("wire-rendering", "renders final load segment at protocol completion", () => {
    const elements = createElements();
    const playback = createPlaybackFake();
    const frames = createFrameScheduler();

    playback.sessionSnapshots.push({
        state: "completed",
        protocolElapsedMs: 60000,
        protocolRemainingMs: 0,
        countdownRemainingMs: 0,
    });

    playback.loadSegments.set(60000, {
        value: 3,
        startTimeMs: 50000,
        endTimeMs: 60000,
        progress: 1,
    });

    wireRendering(elements, playback, {
        requestFrame: frames.requestFrame,
        cancelFrame: frames.cancelFrame,
    });

    assertEqual(playback.requestedLoadSegmentTimes.at(-1), 60000);

    assertEqual(
        elements.loadVisualizer.querySelector(".progression-circle__value").textContent,
        "3",
    );

    assertEqual(
        elements.loadVisualizer
            .querySelector(".progression-circle__marker")
            .getAttribute("transform"),
        "rotate(0 50 50)",
    );

    assertEqual(
        elements.loadVisualizer
            .querySelector(".progression-circle__progress")
            .getAttribute("stroke-dashoffset"),
        "0",
    );
});

test("wire-rendering", "renders workout progress from session protocol time", () => {
    const elements = createElements();
    const playback = createPlaybackFake();
    const frames = createFrameScheduler();

    wireRendering(elements, playback, {
        requestFrame: frames.requestFrame,
        cancelFrame: frames.cancelFrame,
    });

    const markerText = elements.workoutProgress.querySelector(".progress-track__marker-text");

    assertEqual(markerText.textContent, "0:00");

    playback.sessionSnapshots.push({
        state: "running",
        protocolElapsedMs: 15000,
        protocolRemainingMs: 45000,
        countdownRemainingMs: 0,
    });

    frames.runNextFrame();

    assertEqual(markerText.textContent, "0:15");
});

test("wire-rendering", "renders phase progress from current workout phase timing", () => {
    const elements = createElements();
    const playback = createPlaybackFake();
    const frames = createFrameScheduler();

    playback.sessionSnapshots.push({
        state: "running",
        protocolElapsedMs: 20_000,
        protocolRemainingMs: 40_000,
        countdownRemainingMs: 0,
    });

    playback.workoutSnapshots.set(20_000, {
        currentPhase: {
            id: "phase-1",
            name: "Warmup",
            startTimeMs: 0,
            endTimeMs: 90_000,
            elapsedTimeMs: 20_000,
            remainingTimeMs: 70_000,
        },
        currentBlock: {
            id: "block-1",
            name: "Easy",
            startTimeMs: 0,
            endTimeMs: 30_000,
            elapsedTimeMs: 0,
            remainingTimeMs: 30_000,
        },
        nextPhase: null,
        nextBlock: null,
    });

    wireRendering(elements, playback, {
        requestFrame: frames.requestFrame,
        cancelFrame: frames.cancelFrame,
    });

    const markerText = elements.phaseProgress.querySelector(".progress-track__marker-text");

    const progress = elements.phaseProgress.querySelector(".progress-track__progress");

    assertEqual(markerText.textContent, "0:20");

    assertEqual(progress.getAttribute("x2"), "25");
});

test("wire-rendering", "renders remaining time and next distinct load adjustment", () => {
    const elements = createElements();
    const playback = createPlaybackFake();
    const frames = createFrameScheduler();

    playback.loadSegmentTimeline.guidanceAt = () => ({
        currentSegment: {
            value: 4,
            startTimeMs: 0,
            endTimeMs: 10_000,
            progress: 0.5,
        },
        remainingTimeMs: 5_000,
        nextAdjustment: {
            value: 7,
            dueTimeMs: 10_000,
        },
    });

    wireRendering(elements, playback, {
        requestFrame: frames.requestFrame,
        cancelFrame: frames.cancelFrame,
    });

    assertEqual(
        elements.loadVisualizer.querySelector(".load-visualizer__remaining-value").textContent,
        "0:05",
    );

    assertEqual(
        elements.loadVisualizer.querySelector(".load-visualizer__next-value").textContent,
        "7",
    );
});

test("wire-rendering", "renders block progress from current workout block timing", () => {
    const elements = createElements();
    const playback = createPlaybackFake();
    const frames = createFrameScheduler();

    playback.sessionSnapshots.push({
        state: "running",
        protocolElapsedMs: 20_000,
        protocolRemainingMs: 40_000,
        countdownRemainingMs: 0,
    });

    playback.workoutSnapshots.set(20_000, {
        currentPhase: {
            id: "phase-1",
            name: "Warmup",
            startTimeMs: 0,
            endTimeMs: 90_000,
            elapsedTimeMs: 20_000,
            remainingTimeMs: 70_000,
        },
        currentBlock: {
            id: "block-1",
            name: "Easy",
            startTimeMs: 10_000,
            endTimeMs: 50_000,
            elapsedTimeMs: 10_000,
            remainingTimeMs: 30_000,
        },
        nextPhase: null,
        nextBlock: null,
    });

    wireRendering(elements, playback, {
        requestFrame: frames.requestFrame,
        cancelFrame: frames.cancelFrame,
    });

    const markerText = elements.blockProgress.querySelector(".progress-track__marker-text");

    const progress = elements.blockProgress.querySelector(".progress-track__progress");

    assertEqual(markerText.textContent, "0:10");
    assertEqual(progress.getAttribute("x2"), "27.5");
});

test("wire-rendering", "renders session phase transition markers", () => {
    const elements = createElements();
    const playback = createPlaybackFake();
    const frames = createFrameScheduler();

    wireRendering(elements, playback, {
        requestFrame: frames.requestFrame,
        cancelFrame: frames.cancelFrame,
    });

    const ticks = elements.workoutProgress.querySelectorAll(".progress-track__tick");

    assertEqual(ticks.length, 1);
    assertEqual(ticks[0].dataset.tickId, "phase-2");
    assertEqual(ticks[0].style.left, "50%");
});

test("wire-rendering", "renders current phase block transition markers", () => {
    const elements = createElements();
    const playback = createPlaybackFake();
    const frames = createFrameScheduler();

    wireRendering(elements, playback, {
        requestFrame: frames.requestFrame,
        cancelFrame: frames.cancelFrame,
    });

    const ticks = elements.phaseProgress.querySelectorAll(".progress-track__tick");

    assertEqual(ticks.length, 1);
    assertEqual(ticks[0].dataset.tickId, "block-2");
    assertEqual(ticks[0].style.left, "35%");
});
