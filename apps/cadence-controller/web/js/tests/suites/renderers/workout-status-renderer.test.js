import { assertEqual, assertThrows, test } from "/packages/js-testing/framework/test-framework.js";

import { renderWorkoutStatus } from "../../../renderers/workout-status-renderer.js";

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

        startButton: document.createElement("button"),
        pauseButton: document.createElement("button"),
        resumeButton: document.createElement("button"),
        stopButton: document.createElement("button"),
        changeWorkoutButton: document.createElement("button"),
    };
}

/** Creates a representative running session snapshot. */
function createSessionSnapshot(overrides = {}) {
    return {
        state: "running",
        protocolElapsedMs: 65000,
        protocolRemainingMs: 125000,
        countdownRemainingMs: 0,
        ...overrides,
    };
}

/** Creates representative current and upcoming workout context. */
function createWorkoutSnapshot(overrides = {}) {
    return {
        currentPhase: {
            id: "phase-1",
            name: "Warmup",
        },
        currentBlock: {
            id: "block-1",
            name: "Build",
        },
        nextPhase: {
            id: "phase-2",
            name: "Intervals",
        },
        nextBlock: {
            id: "block-2",
            name: "Work 1",
        },
        ...overrides,
    };
}

test("workout-status-renderer", "renders running workout status", () => {
    const elements = createElements();

    renderWorkoutStatus(elements, createSessionSnapshot(), createWorkoutSnapshot());

    assertEqual(elements.playbackState.textContent, "Running");
    assertEqual(elements.countdown.textContent, "");

    assertEqual(elements.elapsedTime.textContent, "1:05");
    assertEqual(elements.remainingTime.textContent, "2:05");

    assertEqual(elements.currentPhase.textContent, "Warmup");
    assertEqual(elements.currentBlock.textContent, "Build");
    assertEqual(elements.nextPhase.textContent, "Intervals");
    assertEqual(elements.nextBlock.textContent, "Work 1");
    assertEqual(elements.changeWorkoutButton.disabled, false);
});

test("workout-status-renderer", "renders countdown as whole seconds remaining", () => {
    const elements = createElements();

    renderWorkoutStatus(
        elements,
        createSessionSnapshot({
            state: "countdown",
            protocolElapsedMs: 0,
            countdownRemainingMs: 4100,
        }),
        createWorkoutSnapshot(),
    );

    assertEqual(elements.playbackState.textContent, "Starting");
    assertEqual(elements.countdown.textContent, "5");
    assertEqual(elements.elapsedTime.textContent, "0:00");
});

test("workout-status-renderer", "clears countdown when no countdown remains", () => {
    const elements = createElements();

    renderWorkoutStatus(
        elements,
        createSessionSnapshot({
            countdownRemainingMs: 0,
        }),
        createWorkoutSnapshot(),
    );

    assertEqual(elements.countdown.textContent, "");
});

test("workout-status-renderer", "formats hour-long workout times", () => {
    const elements = createElements();

    renderWorkoutStatus(
        elements,
        createSessionSnapshot({
            protocolElapsedMs: 3661000,
            protocolRemainingMs: 7322000,
        }),
        createWorkoutSnapshot(),
    );

    assertEqual(elements.elapsedTime.textContent, "1:01:01");
    assertEqual(elements.remainingTime.textContent, "2:02:02");
});

test("workout-status-renderer", "renders unavailable workout structure as dash", () => {
    const elements = createElements();

    renderWorkoutStatus(
        elements,
        createSessionSnapshot({
            state: "completed",
            protocolRemainingMs: 0,
        }),
        createWorkoutSnapshot({
            currentPhase: null,
            currentBlock: null,
            nextPhase: null,
            nextBlock: null,
        }),
    );

    assertEqual(elements.currentPhase.textContent, "—");
    assertEqual(elements.currentBlock.textContent, "—");
    assertEqual(elements.nextPhase.textContent, "—");
    assertEqual(elements.nextBlock.textContent, "—");
});

test("workout-status-renderer", "enables only start while idle", () => {
    const elements = createElements();

    renderWorkoutStatus(
        elements,
        createSessionSnapshot({
            state: "idle",
            protocolElapsedMs: 0,
        }),
        createWorkoutSnapshot(),
    );

    assertEqual(elements.startButton.disabled, false);
    assertEqual(elements.pauseButton.disabled, true);
    assertEqual(elements.resumeButton.disabled, true);
    assertEqual(elements.stopButton.disabled, true);
    assertEqual(elements.changeWorkoutButton.disabled, true);
});

test("workout-status-renderer", "enables only stop during countdown", () => {
    const elements = createElements();

    renderWorkoutStatus(
        elements,
        createSessionSnapshot({
            state: "countdown",
            protocolElapsedMs: 0,
            countdownRemainingMs: 5000,
        }),
        createWorkoutSnapshot(),
    );

    assertEqual(elements.startButton.disabled, true);
    assertEqual(elements.pauseButton.disabled, true);
    assertEqual(elements.resumeButton.disabled, true);
    assertEqual(elements.stopButton.disabled, false);
    assertEqual(elements.changeWorkoutButton.disabled, true);
});

test("workout-status-renderer", "enables pause and stop while running", () => {
    const elements = createElements();

    renderWorkoutStatus(
        elements,
        createSessionSnapshot({
            state: "running",
        }),
        createWorkoutSnapshot(),
    );

    assertEqual(elements.startButton.disabled, true);
    assertEqual(elements.pauseButton.disabled, false);
    assertEqual(elements.resumeButton.disabled, true);
    assertEqual(elements.stopButton.disabled, false);
});

test("workout-status-renderer", "enables resume and stop while paused", () => {
    const elements = createElements();

    renderWorkoutStatus(
        elements,
        createSessionSnapshot({
            state: "paused",
        }),
        createWorkoutSnapshot(),
    );

    assertEqual(elements.startButton.disabled, true);
    assertEqual(elements.pauseButton.disabled, true);
    assertEqual(elements.resumeButton.disabled, false);
    assertEqual(elements.stopButton.disabled, false);
    assertEqual(elements.changeWorkoutButton.disabled, false);
});

test("workout-status-renderer", "enables only stop after completion", () => {
    const elements = createElements();

    renderWorkoutStatus(
        elements,
        createSessionSnapshot({
            state: "completed",
            protocolRemainingMs: 0,
        }),
        createWorkoutSnapshot({
            currentPhase: null,
            currentBlock: null,
            nextPhase: null,
            nextBlock: null,
        }),
    );

    assertEqual(elements.startButton.disabled, true);
    assertEqual(elements.pauseButton.disabled, true);
    assertEqual(elements.resumeButton.disabled, true);
    assertEqual(elements.stopButton.disabled, false);
    assertEqual(elements.changeWorkoutButton.disabled, true);
});

test("workout-status-renderer", "rejects unsupported playback states", () => {
    const elements = createElements();

    assertThrows(
        () =>
            renderWorkoutStatus(
                elements,
                createSessionSnapshot({
                    state: "teleporting",
                }),
                createWorkoutSnapshot(),
            ),
        /Unsupported playback state/,
    );
});

test("workout-status-renderer", "renders unavailable phase remaining time as dash", () => {
    const elements = createElements();

    const workoutSnapshot = createWorkoutSnapshot({
        currentPhase: null,
    });

    renderWorkoutStatus(elements, createSessionSnapshot(), workoutSnapshot);

    assertEqual(elements.phaseRemainingTime.textContent, "—");
});

test("workout-status-renderer", "renders current phase remaining time", () => {
    const elements = createElements();

    const workoutSnapshot = createWorkoutSnapshot({
        currentPhase: {
            name: "Warm-up",
            remainingTimeMs: 125000,
        },
    });

    renderWorkoutStatus(elements, createSessionSnapshot(), workoutSnapshot);

    assertEqual(elements.phaseRemainingTime.textContent, "2:05");
});

test("workout-status-renderer", "disables unavailable workout navigation", () => {
    const elements = createElements();

    renderWorkoutStatus(
        elements,
        createSessionSnapshot({
            state: "running",
        }),
        createWorkoutSnapshot({
            nextBlock: null,
            nextPhase: null,
        }),
    );

    assertEqual(elements.changeWorkoutButton.disabled, true);
});
