import {
    test,
    assertEqual,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import { ProtocolExpander } from "/packages/protocol-expander/protocol-expander.js";
import { WorkoutContext } from "../../../playback/workout-context.js";

function createProtocol() {
    return {
        id: "test-protocol",
        name: "Test Protocol",
        activityTypeId: "elliptical",
        machineProfileId: null,
        calibrationProfileId: null,
        phases: [
            {
                id: "warmup",
                name: "Warm-up",
                blocks: [
                    {
                        id: "warmup-1",
                        name: "Warm-up 1",
                        durationSeconds: 60,
                        variables: {
                            cadence: {
                                type: "steady",
                                start: 50,
                            },
                        },
                    },
                    {
                        id: "warmup-2",
                        name: "Warm-up 2",
                        durationSeconds: 30,
                        variables: {
                            cadence: {
                                type: "steady",
                                start: 55,
                            },
                        },
                    },
                ],
            },
            {
                id: "main",
                name: "Main",
                blocks: [
                    {
                        id: "main-1",
                        name: "Main 1",
                        durationSeconds: 120,
                        variables: {
                            cadence: {
                                type: "steady",
                                start: 60,
                            },
                        },
                    },
                ],
            },
        ],
    };
}

function createWorkoutContext() {
    const protocol = createProtocol();
    const protocolExpander = new ProtocolExpander(protocol);

    return new WorkoutContext(protocol, protocolExpander);
}

test("workout-context", "returns workout context at protocol start", () => {
    const workoutContext = createWorkoutContext();

    const snapshot = workoutContext.getSnapshot(0);

    assertEqual(snapshot.elapsedTimeMs, 0);
    assertEqual(snapshot.remainingTimeMs, 210000);

    assertDeepEqual(snapshot.currentPhase, {
        id: "warmup",
        name: "Warm-up",
        startTimeMs: 0,
        endTimeMs: 90000,
        elapsedTimeMs: 0,
        remainingTimeMs: 90000,
    });

    assertDeepEqual(snapshot.currentBlock, {
        id: "warmup-1",
        name: "Warm-up 1",
        startTimeMs: 0,
        endTimeMs: 60000,
        elapsedTimeMs: 0,
        remainingTimeMs: 60000,
    });
});

test("workout-context", "returns elapsed and remaining time within active structure", () => {
    const workoutContext = createWorkoutContext();

    const snapshot = workoutContext.getSnapshot(20000);

    assertEqual(snapshot.elapsedTimeMs, 20000);
    assertEqual(snapshot.remainingTimeMs, 190000);

    assertEqual(snapshot.currentPhase.elapsedTimeMs, 20000);
    assertEqual(snapshot.currentPhase.remainingTimeMs, 70000);

    assertEqual(snapshot.currentBlock.elapsedTimeMs, 20000);
    assertEqual(snapshot.currentBlock.remainingTimeMs, 40000);
});

test("workout-context", "returns the next phase and next block", () => {
    const workoutContext = createWorkoutContext();

    const snapshot = workoutContext.getSnapshot(20000);

    assertDeepEqual(snapshot.nextPhase, {
        id: "main",
        name: "Main",
        startTimeMs: 90000,
        endTimeMs: 210000,
        timeUntilMs: 70000,
    });

    assertDeepEqual(snapshot.nextBlock, {
        id: "warmup-2",
        name: "Warm-up 2",
        startTimeMs: 60000,
        endTimeMs: 90000,
        timeUntilMs: 40000,
    });
});

test("workout-context", "transitions to the next block at an exact block boundary", () => {
    const workoutContext = createWorkoutContext();

    const snapshot = workoutContext.getSnapshot(60000);

    assertEqual(snapshot.currentBlock.id, "warmup-2");
    assertEqual(snapshot.currentBlock.elapsedTimeMs, 0);
    assertEqual(snapshot.currentBlock.remainingTimeMs, 30000);

    assertDeepEqual(snapshot.nextBlock, {
        id: "main-1",
        name: "Main 1",
        startTimeMs: 90000,
        endTimeMs: 210000,
        timeUntilMs: 30000,
    });
});

test("workout-context", "transitions to the next phase at an exact phase boundary", () => {
    const workoutContext = createWorkoutContext();

    const snapshot = workoutContext.getSnapshot(90000);

    assertEqual(snapshot.currentPhase.id, "main");
    assertEqual(snapshot.currentPhase.elapsedTimeMs, 0);
    assertEqual(snapshot.currentPhase.remainingTimeMs, 120000);

    assertEqual(snapshot.currentBlock.id, "main-1");
    assertEqual(snapshot.currentBlock.elapsedTimeMs, 0);

    assertEqual(snapshot.nextPhase, null);
    assertEqual(snapshot.nextBlock, null);
});

test("workout-context", "returns completed workout context at protocol end", () => {
    const workoutContext = createWorkoutContext();

    const snapshot = workoutContext.getSnapshot(210000);

    assertDeepEqual(snapshot, {
        elapsedTimeMs: 210000,
        remainingTimeMs: 0,
        currentPhase: null,
        currentBlock: null,
        nextPhase: null,
        nextBlock: null,
    });
});

test("workout-context", "returns a next block across a phase boundary", () => {
    const workoutContext = createWorkoutContext();

    const snapshot = workoutContext.getSnapshot(80000);

    assertEqual(snapshot.currentPhase.id, "warmup");
    assertEqual(snapshot.currentBlock.id, "warmup-2");

    assertDeepEqual(snapshot.nextBlock, {
        id: "main-1",
        name: "Main 1",
        startTimeMs: 90000,
        endTimeMs: 210000,
        timeUntilMs: 10000,
    });
});

test("workout-context", "rejects negative workout time", () => {
    const workoutContext = createWorkoutContext();

    assertThrows(() => workoutContext.getSnapshot(-1));
});

test("workout-context", "rejects workout time beyond protocol duration", () => {
    const workoutContext = createWorkoutContext();

    assertThrows(() => workoutContext.getSnapshot(210001));
});

test("workout-context", "rejects non-finite workout time", () => {
    const workoutContext = createWorkoutContext();

    assertThrows(() => workoutContext.getSnapshot(NaN));
    assertThrows(() => workoutContext.getSnapshot(Infinity));
});
