import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { WorkoutNavigationController } from "../../../controllers/workout-navigation-controller.js";

/** Creates a navigation controller with controllable playback dependencies. */
function createController({
    protocolElapsedMs = 10_000,
    nextBlock = {
        id: "block-2",
        startTimeMs: 20_000,
    },
    nextPhase = {
        id: "phase-2",
        startTimeMs: 40_000,
    },
} = {}) {
    const seekCalls = [];
    const workoutContextCalls = [];

    const cadenceSession = {
        getSnapshot() {
            return {
                protocolElapsedMs,
            };
        },

        seek(timeMs) {
            seekCalls.push(timeMs);
        },
    };

    const workoutContext = {
        getSnapshot(timeMs) {
            workoutContextCalls.push(timeMs);

            return {
                nextBlock,
                nextPhase,
            };
        },
    };

    const controller = new WorkoutNavigationController({
        cadenceSession,
        workoutContext,
    });

    return {
        controller,
        seekCalls,
        workoutContextCalls,
    };
}

test("workout-navigation-controller", "skips to the next block start", () => {
    const { controller, seekCalls, workoutContextCalls } = createController();

    const navigated = controller.skipBlock();

    assertEqual(navigated, true);
    assertEqual(workoutContextCalls.length, 1);
    assertEqual(workoutContextCalls[0], 10_000);
    assertEqual(seekCalls.length, 1);
    assertEqual(seekCalls[0], 20_000);
});

test("workout-navigation-controller", "does not skip when there is no next block", () => {
    const { controller, seekCalls } = createController({
        nextBlock: null,
    });

    const navigated = controller.skipBlock();

    assertEqual(navigated, false);
    assertEqual(seekCalls.length, 0);
});

test("workout-navigation-controller", "skips to the next phase start", () => {
    const { controller, seekCalls, workoutContextCalls } = createController();

    const navigated = controller.skipPhase();

    assertEqual(navigated, true);
    assertEqual(workoutContextCalls.length, 1);
    assertEqual(workoutContextCalls[0], 10_000);
    assertEqual(seekCalls.length, 1);
    assertEqual(seekCalls[0], 40_000);
});

test("workout-navigation-controller", "does not skip when there is no next phase", () => {
    const { controller, seekCalls } = createController({
        nextPhase: null,
    });

    const navigated = controller.skipPhase();

    assertEqual(navigated, false);
    assertEqual(seekCalls.length, 0);
});
