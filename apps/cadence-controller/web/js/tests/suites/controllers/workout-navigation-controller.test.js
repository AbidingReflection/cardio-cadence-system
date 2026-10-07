import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { WorkoutNavigationController } from "../../../controllers/workout-navigation-controller.js";

/** Creates a navigation controller with controllable playback dependencies. */
function createController({
    protocolElapsedMs = 10_000,
    currentBlock = {
        id: "block-1",
        startTimeMs: 0,
        endTimeMs: 20_000,
    },
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
    let endCalls = 0;

    const cadenceSession = {
        getSnapshot() {
            return {
                protocolElapsedMs,
            };
        },

        seek(timeMs) {
            seekCalls.push(timeMs);
        },

        end() {
            endCalls += 1;
        },
    };

    const workoutContext = {
        getSnapshot(timeMs) {
            workoutContextCalls.push(timeMs);

            return {
                currentBlock,
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
        getEndCalls() {
            return endCalls;
        },
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

test(
    "workout-navigation-controller",
    "schedules phase skip for the end of the current block",
    () => {
        const { controller } = createController();

        const scheduled = controller.scheduleSkipPhaseAfterBlock();

        const pendingAction = controller.getPendingAction();

        assertEqual(scheduled, true);
        assertEqual(pendingAction.action, "skip-phase");
        assertEqual(pendingAction.triggerTimeMs, 20_000);
        assertEqual(pendingAction.destinationTimeMs, 40_000);
    },
);

test("workout-navigation-controller", "does not schedule phase skip without a next phase", () => {
    const { controller } = createController({
        nextPhase: null,
    });

    const scheduled = controller.scheduleSkipPhaseAfterBlock();

    assertEqual(scheduled, false);
    assertEqual(controller.getPendingAction(), null);
});

test(
    "workout-navigation-controller",
    "schedules workout end for the end of the current block",
    () => {
        const { controller } = createController();

        const scheduled = controller.scheduleEndWorkoutAfterBlock();

        const pendingAction = controller.getPendingAction();

        assertEqual(scheduled, true);
        assertEqual(pendingAction.action, "end-workout");
        assertEqual(pendingAction.triggerTimeMs, 20_000);
    },
);

test(
    "workout-navigation-controller",
    "does not schedule a deferred action without a current block",
    () => {
        const { controller } = createController({
            currentBlock: null,
        });

        assertEqual(controller.scheduleSkipPhaseAfterBlock(), false);
        assertEqual(controller.scheduleEndWorkoutAfterBlock(), false);
        assertEqual(controller.getPendingAction(), null);
    },
);

test("workout-navigation-controller", "replaces an existing pending action", () => {
    const { controller } = createController();

    controller.scheduleSkipPhaseAfterBlock();
    controller.scheduleEndWorkoutAfterBlock();

    const pendingAction = controller.getPendingAction();

    assertEqual(pendingAction.action, "end-workout");
    assertEqual(pendingAction.triggerTimeMs, 20_000);
    assertEqual(pendingAction.destinationTimeMs, undefined);
});

test("workout-navigation-controller", "cancels the pending action", () => {
    const { controller } = createController();

    controller.scheduleSkipPhaseAfterBlock();

    controller.cancelPendingAction();

    assertEqual(controller.getPendingAction(), null);
});

test(
    "workout-navigation-controller",
    "does not execute a pending action before its trigger",
    () => {
        const { controller, seekCalls, getEndCalls } = createController();

        controller.scheduleSkipPhaseAfterBlock();

        controller.update(19_999);

        assertEqual(seekCalls.length, 0);
        assertEqual(getEndCalls(), 0);
        assertEqual(controller.getPendingAction().action, "skip-phase");
    },
);

test("workout-navigation-controller", "executes pending phase skip at the block boundary", () => {
    const { controller, seekCalls } = createController();

    controller.scheduleSkipPhaseAfterBlock();

    controller.update(20_000);

    assertEqual(seekCalls.length, 1);
    assertEqual(seekCalls[0], 40_000);
    assertEqual(controller.getPendingAction(), null);
});

test(
    "workout-navigation-controller",
    "executes pending phase skip after crossing the block boundary",
    () => {
        const { controller, seekCalls } = createController();

        controller.scheduleSkipPhaseAfterBlock();

        controller.update(20_016);

        assertEqual(seekCalls.length, 1);
        assertEqual(seekCalls[0], 40_000);
        assertEqual(controller.getPendingAction(), null);
    },
);

test("workout-navigation-controller", "ends workout at the exact block boundary", () => {
    const { controller, seekCalls, getEndCalls } = createController();

    controller.scheduleEndWorkoutAfterBlock();

    controller.update(20_016);

    assertEqual(seekCalls.length, 1);
    assertEqual(seekCalls[0], 20_000);
    assertEqual(getEndCalls(), 1);
    assertEqual(controller.getPendingAction(), null);
});

test("workout-navigation-controller", "does not execute a cancelled pending action", () => {
    const { controller, seekCalls, getEndCalls } = createController();

    controller.scheduleEndWorkoutAfterBlock();
    controller.cancelPendingAction();

    controller.update(20_000);

    assertEqual(seekCalls.length, 0);
    assertEqual(getEndCalls(), 0);
});

test("workout-navigation-controller", "records omitted range for immediate block skip", () => {
    const { controller } = createController({
        protocolElapsedMs: 10_000,
        nextBlock: {
            id: "block-2",
            startTimeMs: 20_000,
        },
    });

    controller.skipBlock();

    const omissions = controller.getConfirmedOmissions();

    assertEqual(omissions.length, 1);
    assertEqual(omissions[0].action, "skip-block");
    assertEqual(omissions[0].startTimeMs, 10_000);
    assertEqual(omissions[0].endTimeMs, 20_000);
});

test("workout-navigation-controller", "records omitted range for immediate phase skip", () => {
    const { controller } = createController({
        protocolElapsedMs: 10_000,
        nextPhase: {
            id: "phase-2",
            startTimeMs: 40_000,
        },
    });

    controller.skipPhase();

    const omissions = controller.getConfirmedOmissions();

    assertEqual(omissions.length, 1);
    assertEqual(omissions[0].action, "skip-phase");
    assertEqual(omissions[0].startTimeMs, 10_000);
    assertEqual(omissions[0].endTimeMs, 40_000);
});

test(
    "workout-navigation-controller",
    "records omitted range when deferred phase skip executes",
    () => {
        const { controller } = createController();

        controller.scheduleSkipPhaseAfterBlock();
        controller.update(20_000);

        const omissions = controller.getConfirmedOmissions();

        assertEqual(omissions.length, 1);
        assertEqual(omissions[0].action, "skip-phase");
        assertEqual(omissions[0].startTimeMs, 20_000);
        assertEqual(omissions[0].endTimeMs, 40_000);
    },
);

test("workout-navigation-controller", "returns confirmed omissions as copies", () => {
    const { controller } = createController();

    controller.skipBlock();

    const omissions = controller.getConfirmedOmissions();

    omissions[0].startTimeMs = 999;
    omissions.push({
        action: "skip-phase",
        startTimeMs: 0,
        endTimeMs: 999,
    });

    const freshOmissions = controller.getConfirmedOmissions();

    assertEqual(freshOmissions.length, 1);
    assertEqual(freshOmissions[0].startTimeMs, 10_000);
    assertEqual(freshOmissions[0].endTimeMs, 20_000);
});
