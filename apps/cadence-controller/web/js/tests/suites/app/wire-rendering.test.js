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
        changeWorkoutButton: document.createElement("button"),
        cancelPendingActionButton: document.createElement("button"),
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

/** Records execution-recorder calls for rendering lifecycle tests. */
class ExecutionRecorderFake {
    startCalls = [];
    updateCalls = [];
    completeCalls = [];

    snapshot = null;

    /** Returns the current fake execution status. */
    get status() {
        return this.snapshot?.status ?? null;
    }

    /** Records execution start and transitions the fake to in-progress. */
    start(protocolTimeMs) {
        this.startCalls.push(protocolTimeMs);

        this.snapshot = {
            status: "in-progress",
        };
    }

    /** Records one active execution heartbeat. */
    update(protocolTimeMs) {
        this.updateCalls.push(protocolTimeMs);
    }

    /** Records natural execution completion and transitions the fake to completed. */
    complete(protocolTimeMs) {
        this.completeCalls.push(protocolTimeMs);

        this.snapshot = {
            status: "completed",
        };
    }

    /** Returns the current fake execution snapshot. */
    getSnapshot() {
        return this.snapshot;
    }
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

test("wire-rendering", "updates workout navigation from protocol time", () => {
    const elements = createElements();
    const playback = createPlaybackFake();
    const frameScheduler = createFrameScheduler();

    const updateCalls = [];

    const workoutNavigationController = {
        update(protocolElapsedMs) {
            updateCalls.push(protocolElapsedMs);
        },

        getPendingAction() {
            return null;
        },

        getConfirmedOmissions() {
            return [];
        },
    };

    wireRendering(elements, playback, {
        requestFrame: frameScheduler.requestFrame,
        cancelFrame: frameScheduler.cancelFrame,
        workoutNavigationController,
    });

    assertEqual(updateCalls.length, 1);
    assertEqual(updateCalls[0], 0);

    playback.sessionSnapshots.push({
        state: "running",
        protocolElapsedMs: 12_500,
        protocolRemainingMs: 47_500,
        countdownRemainingMs: 0,
    });

    frameScheduler.runNextFrame();

    assertEqual(updateCalls.length, 2);
    assertEqual(updateCalls[1], 12_500);
});

test("wire-rendering", "renders pending workout navigation state", () => {
    const elements = createElements();
    const playback = createPlaybackFake();
    const frameScheduler = createFrameScheduler();

    const workoutNavigationController = {
        update() {},

        getPendingAction() {
            return {
                action: "skip-phase",
                triggerTimeMs: 20_000,
                destinationTimeMs: 40_000,
            };
        },

        getConfirmedOmissions() {
            return [];
        },
    };

    wireRendering(elements, playback, {
        requestFrame: frameScheduler.requestFrame,
        cancelFrame: frameScheduler.cancelFrame,
        workoutNavigationController,
    });

    assertEqual(elements.changeWorkoutButton.textContent, "After Block");
    assertEqual(elements.changeWorkoutButton.classList.contains("playback-control--pending"), true);
});

test("wire-rendering", "passes pending workout action to load guidance", () => {
    const elements = createElements();
    const playback = createPlaybackFake();
    const frameScheduler = createFrameScheduler();

    const guidanceCalls = [];

    playback.loadSegmentTimeline = {
        guidanceAt(timeMs, pendingAction) {
            guidanceCalls.push({
                timeMs,
                pendingAction,
            });

            return undefined;
        },
    };

    const pendingAction = {
        action: "skip-phase",
        triggerTimeMs: 20_000,
        destinationTimeMs: 30_000,
    };

    const workoutNavigationController = {
        update() {},

        getPendingAction() {
            return pendingAction;
        },

        getConfirmedOmissions() {
            return [];
        },
    };

    wireRendering(elements, playback, {
        requestFrame: frameScheduler.requestFrame,
        cancelFrame: frameScheduler.cancelFrame,
        workoutNavigationController,
    });

    assertEqual(guidanceCalls.length, 1);
    assertEqual(guidanceCalls[0].timeMs, 0);
    assertEqual(guidanceCalls[0].pendingAction, pendingAction);
});

test("wire-rendering", "renders pending omission on session progress", () => {
    const elements = createElements();
    const playback = createPlaybackFake();

    const workoutNavigationController = {
        update() {},

        getPendingAction() {
            return {
                action: "skip-phase",
                triggerTimeMs: 20_000,
                destinationTimeMs: 50_000,
            };
        },

        getConfirmedOmissions() {
            return [];
        },
    };

    wireRendering(elements, playback, {
        requestFrame() {
            return 1;
        },

        cancelFrame() {},

        workoutNavigationController,
    });

    const range = elements.workoutProgress.querySelector(
        '.progress-track__range[data-range-id="pending-omission"]',
    );

    assertEqual(range !== null, true);
    assertEqual(range.dataset.state, "pending-omission");
    assertEqual(range.getAttribute("x1"), "35");
    assertEqual(range.getAttribute("x2"), "80");
});

test("wire-rendering", "renders pending omission on current phase progress", () => {
    const elements = createElements();
    const playback = createPlaybackFake();

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
            endTimeMs: 30_000,
            elapsedTimeMs: 20_000,
            remainingTimeMs: 10_000,
        },
        currentBlock: {
            id: "block-2",
            name: "Build",
            startTimeMs: 10_000,
            endTimeMs: 30_000,
            elapsedTimeMs: 10_000,
            remainingTimeMs: 10_000,
        },
        nextPhase: {
            id: "phase-2",
            name: "Work",
            startTimeMs: 30_000,
            endTimeMs: 60_000,
        },
        nextBlock: {
            id: "block-3",
            name: "Hard",
            startTimeMs: 30_000,
            endTimeMs: 45_000,
        },
    });

    const workoutNavigationController = {
        update() {},

        getPendingAction() {
            return {
                action: "skip-phase",
                triggerTimeMs: 20_000,
                destinationTimeMs: 50_000,
            };
        },

        getConfirmedOmissions() {
            return [];
        },
    };

    wireRendering(elements, playback, {
        requestFrame() {
            return 1;
        },

        cancelFrame() {},

        workoutNavigationController,
    });

    const range = elements.phaseProgress.querySelector(
        '.progress-track__range[data-range-id="pending-omission"]',
    );

    assertEqual(range !== null, true);
    assertEqual(range.getAttribute("x1"), "65");
    assertEqual(range.getAttribute("x2"), "95");
});

test("wire-rendering", "does not render pending omission outside current phase", () => {
    const elements = createElements();
    const playback = createPlaybackFake();

    playback.sessionSnapshots.push({
        state: "running",
        protocolElapsedMs: 10_000,
        protocolRemainingMs: 50_000,
        countdownRemainingMs: 0,
    });

    playback.workoutSnapshots.set(10_000, {
        currentPhase: {
            id: "phase-1",
            name: "Warmup",
            startTimeMs: 0,
            endTimeMs: 30_000,
            elapsedTimeMs: 10_000,
            remainingTimeMs: 20_000,
        },
        currentBlock: {
            id: "block-1",
            name: "Easy",
            startTimeMs: 0,
            endTimeMs: 10_000,
            elapsedTimeMs: 10_000,
            remainingTimeMs: 0,
        },
        nextPhase: {
            id: "phase-2",
            name: "Work",
            startTimeMs: 30_000,
            endTimeMs: 60_000,
        },
        nextBlock: {
            id: "block-2",
            name: "Build",
            startTimeMs: 10_000,
            endTimeMs: 30_000,
        },
    });

    const workoutNavigationController = {
        update() {},

        getPendingAction() {
            return {
                action: "skip-phase",
                triggerTimeMs: 40_000,
                destinationTimeMs: 50_000,
            };
        },

        getConfirmedOmissions() {
            return [];
        },
    };

    wireRendering(elements, playback, {
        requestFrame() {
            return 1;
        },

        cancelFrame() {},

        workoutNavigationController,
    });

    assertEqual(elements.phaseProgress.querySelectorAll(".progress-track__range").length, 0);
});

test("wire-rendering", "renders confirmed omissions on session progress", () => {
    const elements = createElements();
    const playback = createPlaybackFake();

    const workoutNavigationController = {
        update() {},

        getPendingAction() {
            return null;
        },

        getConfirmedOmissions() {
            return [
                {
                    action: "skip-block",
                    startTimeMs: 10_000,
                    endTimeMs: 20_000,
                },
                {
                    action: "skip-phase",
                    startTimeMs: 30_000,
                    endTimeMs: 50_000,
                },
            ];
        },
    };

    wireRendering(elements, playback, {
        requestFrame() {
            return 1;
        },

        cancelFrame() {},

        workoutNavigationController,
    });

    const ranges = elements.workoutProgress.querySelectorAll(
        '.progress-track__range[data-state="confirmed-omission"]',
    );

    assertEqual(ranges.length, 2);

    assertEqual(ranges[0].getAttribute("x1"), "20");
    assertEqual(ranges[0].getAttribute("x2"), "35");

    assertEqual(ranges[1].getAttribute("x1"), "50");
    assertEqual(ranges[1].getAttribute("x2"), "80");
});

test("wire-rendering", "renders confirmed omission intersecting current phase", () => {
    const elements = createElements();
    const playback = createPlaybackFake();

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
            endTimeMs: 30_000,
            elapsedTimeMs: 20_000,
            remainingTimeMs: 10_000,
        },
        currentBlock: {
            id: "block-2",
            name: "Build",
            startTimeMs: 10_000,
            endTimeMs: 30_000,
            elapsedTimeMs: 10_000,
            remainingTimeMs: 10_000,
        },
        nextPhase: {
            id: "phase-2",
            name: "Work",
            startTimeMs: 30_000,
            endTimeMs: 60_000,
        },
        nextBlock: null,
    });

    const workoutNavigationController = {
        update() {},

        getPendingAction() {
            return null;
        },

        getConfirmedOmissions() {
            return [
                {
                    action: "skip-block",
                    startTimeMs: 10_000,
                    endTimeMs: 20_000,
                },
            ];
        },
    };

    wireRendering(elements, playback, {
        requestFrame() {
            return 1;
        },

        cancelFrame() {},

        workoutNavigationController,
    });

    const range = elements.phaseProgress.querySelector(
        '.progress-track__range[data-state="confirmed-omission"]',
    );

    assertEqual(range !== null, true);
    assertEqual(range.getAttribute("x1"), "35");
    assertEqual(range.getAttribute("x2"), "65");
});

test("wire-rendering", "starts execution recording when playback begins running", () => {
    const elements = createElements();
    const playback = createPlaybackFake();
    const frames = createFrameScheduler();
    const executionRecorder = new ExecutionRecorderFake();

    playback.sessionSnapshots.push({
        state: "countdown",
        protocolElapsedMs: 0,
        protocolRemainingMs: 60_000,
        countdownRemainingMs: 1_000,
    });

    wireRendering(elements, playback, {
        requestFrame: frames.requestFrame,
        cancelFrame: frames.cancelFrame,
        executionRecorder,
    });

    assertEqual(executionRecorder.startCalls.length, 0);

    playback.sessionSnapshots.push({
        state: "running",
        protocolElapsedMs: 0,
        protocolRemainingMs: 60_000,
        countdownRemainingMs: 0,
    });

    frames.runNextFrame();
    frames.runNextFrame();

    assertEqual(executionRecorder.startCalls.length, 1);
    assertEqual(executionRecorder.startCalls[0], 0);
});

test("wire-rendering", "updates execution recording on subsequent running frames", () => {
    const elements = createElements();
    const playback = createPlaybackFake();
    const frames = createFrameScheduler();
    const executionRecorder = new ExecutionRecorderFake();

    playback.sessionSnapshots.push({
        state: "running",
        protocolElapsedMs: 5_000,
        protocolRemainingMs: 55_000,
        countdownRemainingMs: 0,
    });

    wireRendering(elements, playback, {
        requestFrame: frames.requestFrame,
        cancelFrame: frames.cancelFrame,
        executionRecorder,
    });

    playback.sessionSnapshots.push({
        state: "running",
        protocolElapsedMs: 6_000,
        protocolRemainingMs: 54_000,
        countdownRemainingMs: 0,
    });

    frames.runNextFrame();

    assertEqual(executionRecorder.startCalls.length, 1);
    assertEqual(executionRecorder.startCalls[0], 5_000);
    assertEqual(executionRecorder.updateCalls.length, 1);
    assertEqual(executionRecorder.updateCalls[0], 6_000);
});

test("wire-rendering", "completes execution recording once at natural completion", () => {
    const elements = createElements();
    const playback = createPlaybackFake();
    const frames = createFrameScheduler();
    const executionRecorder = new ExecutionRecorderFake();

    executionRecorder.snapshot = {
        status: "in-progress",
    };

    playback.sessionSnapshots.push({
        state: "completed",
        protocolElapsedMs: 60_000,
        protocolRemainingMs: 0,
        countdownRemainingMs: 0,
    });

    wireRendering(elements, playback, {
        requestFrame: frames.requestFrame,
        cancelFrame: frames.cancelFrame,
        executionRecorder,
    });

    frames.runNextFrame();

    assertEqual(executionRecorder.completeCalls.length, 1);
    assertEqual(executionRecorder.completeCalls[0], 60_000);
});
