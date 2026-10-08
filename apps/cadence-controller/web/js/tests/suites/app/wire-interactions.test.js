import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { wireInteractions } from "../../../app/wire-interactions.js";

/** Creates playback control elements for interaction wiring tests. */
function createElements() {
    return {
        startButton: document.createElement("button"),
        pauseButton: document.createElement("button"),
        resumeButton: document.createElement("button"),
        stopButton: document.createElement("button"),
        changeWorkoutButton: document.createElement("button"),
        changeWorkoutPanel: document.createElement("div"),
        skipBlockButton: document.createElement("button"),
        skipPhaseButton: document.createElement("button"),
        finishBlockSkipPhaseButton: document.createElement("button"),
        finishBlockEndWorkoutButton: document.createElement("button"),
        cancelPendingActionButton: document.createElement("button"),
        cancelChangeWorkoutButton: document.createElement("button"),
        loadVisualizer: document.createElement("div"),
    };
}

/** Records playback event calls for wiring tests. */
function createPlaybackEventsFake() {
    return {
        startCalls: 0,
        pauseCalls: 0,
        resumeCalls: 0,
        stopCalls: 0,
        acknowledgeLoadAdjustmentCalls: 0,

        async start() {
            this.startCalls += 1;
        },

        pause() {
            this.pauseCalls += 1;
        },

        async resume() {
            this.resumeCalls += 1;
        },

        stop() {
            this.stopCalls += 1;
        },

        acknowledgeLoadAdjustment() {
            this.acknowledgeLoadAdjustmentCalls += 1;
        },
    };
}

/** Records workout navigation calls for wiring tests. */
function createWorkoutNavigationControllerFake({
    pendingAction = null,
    confirmedOmissions = [],
} = {}) {
    return {
        skipBlockCalls: 0,
        skipPhaseCalls: 0,
        scheduleSkipPhaseAfterBlockCalls: 0,
        scheduleEndWorkoutAfterBlockCalls: 0,
        cancelPendingActionCalls: 0,
        updateCalls: [],

        skipBlock() {
            this.skipBlockCalls += 1;
        },

        skipPhase() {
            this.skipPhaseCalls += 1;
        },

        scheduleSkipPhaseAfterBlock() {
            this.scheduleSkipPhaseAfterBlockCalls += 1;
        },

        scheduleEndWorkoutAfterBlock() {
            this.scheduleEndWorkoutAfterBlockCalls += 1;
        },

        cancelPendingAction() {
            this.cancelPendingActionCalls += 1;
        },

        update(protocolElapsedMs) {
            this.updateCalls.push(protocolElapsedMs);
        },

        getPendingAction() {
            return pendingAction === null ? null : { ...pendingAction };
        },

        getConfirmedOmissions() {
            return confirmedOmissions.map((omission) => ({ ...omission }));
        },
    };
}

/** Creates a fake execution exporter for interaction wiring tests. */
function createFakeExecutionExporter({ available = false } = {}) {
    return {
        downloadCalls: 0,

        /** Returns whether a finalized execution is available for download. */
        isAvailable() {
            return available;
        },

        /** Records one execution download request. */
        download() {
            this.downloadCalls += 1;
        },
    };
}

test("wire-interactions", "wires playback controls to playback events", async () => {
    const elements = createElements();
    const playbackEvents = createPlaybackEventsFake();

    const workoutNavigationController = createWorkoutNavigationControllerFake();

    wireInteractions(elements, playbackEvents, workoutNavigationController);

    elements.startButton.click();
    elements.pauseButton.click();
    elements.resumeButton.click();
    elements.stopButton.click();

    await Promise.resolve();

    assertEqual(playbackEvents.startCalls, 1);
    assertEqual(playbackEvents.pauseCalls, 1);
    assertEqual(playbackEvents.resumeCalls, 1);
    assertEqual(playbackEvents.stopCalls, 1);
});

test("wire-interactions", "does not cross-wire playback controls", async () => {
    const elements = createElements();
    const playbackEvents = createPlaybackEventsFake();

    const workoutNavigationController = createWorkoutNavigationControllerFake();

    wireInteractions(elements, playbackEvents, workoutNavigationController);

    elements.pauseButton.click();

    await Promise.resolve();

    assertEqual(playbackEvents.startCalls, 0);
    assertEqual(playbackEvents.pauseCalls, 1);
    assertEqual(playbackEvents.resumeCalls, 0);
    assertEqual(playbackEvents.stopCalls, 0);
    assertEqual(playbackEvents.acknowledgeLoadAdjustmentCalls, 0);
    assertEqual(workoutNavigationController.skipBlockCalls, 0);
    assertEqual(workoutNavigationController.skipPhaseCalls, 0);
});

test("wire-interactions", "acknowledges load adjustment from load visualizer", () => {
    const elements = createElements();
    const playbackEvents = createPlaybackEventsFake();

    const workoutNavigationController = createWorkoutNavigationControllerFake();

    wireInteractions(elements, playbackEvents, workoutNavigationController);

    elements.loadVisualizer.click();

    assertEqual(playbackEvents.acknowledgeLoadAdjustmentCalls, 1);
});

test("wire-interactions", "removes registered playback listeners", async () => {
    const elements = createElements();
    const playbackEvents = createPlaybackEventsFake();

    const workoutNavigationController = createWorkoutNavigationControllerFake();
    const unwire = wireInteractions(elements, playbackEvents, workoutNavigationController);

    unwire();

    elements.startButton.click();
    elements.pauseButton.click();
    elements.resumeButton.click();
    elements.stopButton.click();
    elements.loadVisualizer.click();

    await Promise.resolve();

    assertEqual(playbackEvents.startCalls, 0);
    assertEqual(playbackEvents.pauseCalls, 0);
    assertEqual(playbackEvents.resumeCalls, 0);
    assertEqual(playbackEvents.stopCalls, 0);
    assertEqual(playbackEvents.acknowledgeLoadAdjustmentCalls, 0);
});

test("wire-interactions", "wires workout navigation controls", () => {
    const elements = createElements();
    const playbackEvents = createPlaybackEventsFake();
    const workoutNavigationController = createWorkoutNavigationControllerFake();

    wireInteractions(elements, playbackEvents, workoutNavigationController);

    elements.skipBlockButton.click();
    elements.skipPhaseButton.click();

    assertEqual(workoutNavigationController.skipBlockCalls, 1);
    assertEqual(workoutNavigationController.skipPhaseCalls, 1);
});

test("wire-interactions", "wires deferred workout actions", () => {
    const elements = createElements();
    const playbackEvents = createPlaybackEventsFake();
    const workoutNavigationController = createWorkoutNavigationControllerFake();

    wireInteractions(elements, playbackEvents, workoutNavigationController);

    elements.finishBlockSkipPhaseButton.click();
    elements.finishBlockEndWorkoutButton.click();
    elements.cancelPendingActionButton.click();

    assertEqual(workoutNavigationController.scheduleSkipPhaseAfterBlockCalls, 1);
    assertEqual(workoutNavigationController.scheduleEndWorkoutAfterBlockCalls, 1);
    assertEqual(workoutNavigationController.cancelPendingActionCalls, 1);
});

test("wire-interactions", "downloads finalized execution from change workout control", () => {
    const elements = createElements();
    const playbackEvents = createPlaybackEventsFake();
    const workoutNavigationController = createWorkoutNavigationControllerFake();
    const executionExporter = createFakeExecutionExporter({
        available: true,
    });

    elements.changeWorkoutPanel.hidden = true;

    wireInteractions(elements, playbackEvents, workoutNavigationController, executionExporter);

    elements.changeWorkoutButton.click();

    assertEqual(executionExporter.downloadCalls, 1);
    assertEqual(elements.changeWorkoutPanel.hidden, true);
});
