import {
    test,
    assertEqual,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import { ExecutionRecorder } from "../../execution/execution-recorder.js";

const STARTED_AT = 1_000;

/** Creates an execution recorder with a controllable clock. */
function createRecorder() {
    let now = STARTED_AT;

    return {
        recorder: new ExecutionRecorder({
            now: () => now,
        }),

        setNow(value) {
            now = value;
        },
    };
}

test("execution-recorder", "starts an in-progress execution", () => {
    const { recorder } = createRecorder();

    recorder.start(0);

    assertDeepEqual(recorder.getSnapshot(), {
        status: "in-progress",
        startedAtUnixMs: STARTED_AT,
        endedAtUnixMs: undefined,
        lastKnownActiveAtUnixMs: STARTED_AT,
        lastKnownProtocolTimeMs: 0,
        completionReason: undefined,
        events: [],
    });
});

test("execution-recorder", "updates the latest active protocol position", () => {
    const { recorder, setNow } = createRecorder();

    recorder.start(0);

    setNow(2_000);
    recorder.update(15_000);

    const snapshot = recorder.getSnapshot();

    assertEqual(snapshot.lastKnownActiveAtUnixMs, 2_000);
    assertEqual(snapshot.lastKnownProtocolTimeMs, 15_000);
});

test("execution-recorder", "records pause and resume events", () => {
    const { recorder, setNow } = createRecorder();

    recorder.start(0);

    setNow(2_000);
    recorder.pause(10_000);

    setNow(3_000);
    recorder.resume(10_000);

    assertDeepEqual(recorder.getSnapshot().events, [
        {
            type: "pause",
            occurredAtUnixMs: 2_000,
        },
        {
            type: "resume",
            occurredAtUnixMs: 3_000,
        },
    ]);
});

test("execution-recorder", "completes an execution", () => {
    const { recorder, setNow } = createRecorder();

    recorder.start(0);

    setNow(5_000);
    recorder.complete(100_000);

    const snapshot = recorder.getSnapshot();

    assertEqual(snapshot.status, "completed");
    assertEqual(snapshot.endedAtUnixMs, 5_000);
    assertEqual(snapshot.lastKnownActiveAtUnixMs, 5_000);
    assertEqual(snapshot.lastKnownProtocolTimeMs, 100_000);
    assertEqual(snapshot.completionReason, undefined);
});

test("execution-recorder", "ends an execution early with a reason", () => {
    const { recorder, setNow } = createRecorder();

    recorder.start(0);

    setNow(4_000);
    recorder.endEarly(60_000, "manual-stop");

    const snapshot = recorder.getSnapshot();

    assertEqual(snapshot.status, "ended-early");
    assertEqual(snapshot.endedAtUnixMs, 4_000);
    assertEqual(snapshot.lastKnownActiveAtUnixMs, 4_000);
    assertEqual(snapshot.lastKnownProtocolTimeMs, 60_000);
    assertEqual(snapshot.completionReason, "manual-stop");
});

test("execution-recorder", "cannot start twice", () => {
    const { recorder } = createRecorder();

    recorder.start(0);

    assertThrows(() => recorder.start(0), /start/i);
});

test("execution-recorder", "records a block navigation event", () => {
    const { recorder, setNow } = createRecorder();

    recorder.start(0);

    setNow(2_000);
    recorder.navigate({
        protocolTimeMs: 15_000,
        destinationProtocolTimeMs: 30_000,
        target: {
            phaseId: "phase-2",
            blockId: "block-3",
        },
        action: "skip-block",
    });

    assertDeepEqual(recorder.getSnapshot().events, [
        {
            type: "navigate",
            occurredAtUnixMs: 2_000,
            protocolTimeMs: 15_000,
            target: {
                phaseId: "phase-2",
                blockId: "block-3",
            },
            action: "skip-block",
        },
    ]);
});

test("execution-recorder", "records a phase navigation event", () => {
    const { recorder, setNow } = createRecorder();

    recorder.start(0);

    setNow(2_000);
    recorder.navigate({
        protocolTimeMs: 20_000,
        destinationProtocolTimeMs: 45_000,
        target: {
            phaseId: "phase-3",
        },
        action: "skip-phase",
    });

    assertDeepEqual(recorder.getSnapshot().events, [
        {
            type: "navigate",
            occurredAtUnixMs: 2_000,
            protocolTimeMs: 20_000,
            target: {
                phaseId: "phase-3",
            },
            action: "skip-phase",
        },
    ]);
});

test("execution-recorder", "updates latest active position to navigation destination", () => {
    const { recorder, setNow } = createRecorder();

    recorder.start(0);

    setNow(2_500);
    recorder.navigate({
        protocolTimeMs: 25_000,
        destinationProtocolTimeMs: 40_000,
        target: {
            phaseId: "phase-2",
        },
        action: "jump",
    });

    const snapshot = recorder.getSnapshot();

    assertEqual(snapshot.lastKnownActiveAtUnixMs, 2_500);
    assertEqual(snapshot.lastKnownProtocolTimeMs, 40_000);
});

test("execution-recorder", "rejects an unsupported navigation action", () => {
    const { recorder } = createRecorder();

    recorder.start(0);

    assertThrows(
        () =>
            recorder.navigate({
                protocolTimeMs: 10_000,
                destinationProtocolTimeMs: 20_000,
                target: {
                    phaseId: "phase-2",
                },
                action: "teleport",
            }),
        /action/i,
    );
});

test("execution-recorder", "reports current execution status", () => {
    const recorder = new ExecutionRecorder({
        now: () => 1_000,
    });

    assertEqual(recorder.status, null);

    recorder.start(0);

    assertEqual(recorder.status, "in-progress");

    recorder.complete(60_000);

    assertEqual(recorder.status, "completed");
});

test("execution-recorder", "normalizes recorded protocol positions to integer milliseconds", () => {
    const recorder = new ExecutionRecorder({
        now: () => 1_000,
    });

    recorder.start(100.4);
    assertEqual(recorder.getSnapshot().lastKnownProtocolTimeMs, 100);

    recorder.update(200.6);
    assertEqual(recorder.getSnapshot().lastKnownProtocolTimeMs, 201);

    recorder.navigate({
        protocolTimeMs: 300.4,
        destinationProtocolTimeMs: 400.6,
        target: {
            phaseId: "phase-1",
            blockId: "block-2",
        },
        action: "skip-block",
    });

    const snapshot = recorder.getSnapshot();

    assertEqual(snapshot.events[0].protocolTimeMs, 300);
    assertEqual(snapshot.lastKnownProtocolTimeMs, 401);
});
