import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { createPlaybackEvents } from "../../../interactions/playback-events.js";

/** Records playback lifecycle calls for interaction tests. */
class CadenceSessionFake {
    startCalls = 0;
    pauseCalls = 0;
    resumeCalls = 0;
    stopCalls = 0;

    protocolElapsedMs = 0;

    async start() {
        this.startCalls += 1;
    }

    pause() {
        this.pauseCalls += 1;
    }

    async resume() {
        this.resumeCalls += 1;
    }

    stop() {
        this.stopCalls += 1;
        this.protocolElapsedMs = 0;
    }

    getSnapshot() {
        return {
            protocolElapsedMs: this.protocolElapsedMs,
        };
    }
}

/** Records load adjustment acknowledgements. */
class LoadAdjustmentTrackerFake {
    acknowledgedTimes = [];

    acknowledge(timeMs) {
        this.acknowledgedTimes.push(timeMs);
    }
}

/** Records execution-recorder calls for playback interaction tests. */
class ExecutionRecorderFake {
    pauseCalls = [];
    resumeCalls = [];
    endEarlyCalls = [];

    snapshot = {
        status: "in-progress",
    };

    pause(protocolTimeMs) {
        this.pauseCalls.push(protocolTimeMs);
    }

    resume(protocolTimeMs) {
        this.resumeCalls.push(protocolTimeMs);
    }

    endEarly(protocolTimeMs, reason) {
        this.endEarlyCalls.push({
            protocolTimeMs,
            reason,
        });
    }

    getSnapshot() {
        return this.snapshot;
    }
}

test("playback-events", "starts cadence playback", async () => {
    const cadenceSession = new CadenceSessionFake();
    const events = createPlaybackEvents(cadenceSession);

    await events.start();

    assertEqual(cadenceSession.startCalls, 1);
});

test("playback-events", "pauses cadence playback", () => {
    const cadenceSession = new CadenceSessionFake();
    const events = createPlaybackEvents(cadenceSession);

    events.pause();

    assertEqual(cadenceSession.pauseCalls, 1);
});

test("playback-events", "resumes cadence playback", async () => {
    const cadenceSession = new CadenceSessionFake();
    const events = createPlaybackEvents(cadenceSession);

    await events.resume();

    assertEqual(cadenceSession.resumeCalls, 1);
});

test("playback-events", "stops cadence playback", () => {
    const cadenceSession = new CadenceSessionFake();
    const events = createPlaybackEvents(cadenceSession);

    events.stop();

    assertEqual(cadenceSession.stopCalls, 1);
});

test("playback-events", "acknowledges load adjustment at current protocol time", () => {
    const cadenceSession = new CadenceSessionFake();
    const loadAdjustmentTracker = new LoadAdjustmentTrackerFake();

    cadenceSession.protocolElapsedMs = 42_500;

    const events = createPlaybackEvents(cadenceSession, loadAdjustmentTracker);

    events.acknowledgeLoadAdjustment();

    assertEqual(loadAdjustmentTracker.acknowledgedTimes.length, 1);
    assertEqual(loadAdjustmentTracker.acknowledgedTimes[0], 42_500);
});

test("playback-events", "ignores load acknowledgement when no tracker exists", () => {
    const cadenceSession = new CadenceSessionFake();
    const events = createPlaybackEvents(cadenceSession);

    events.acknowledgeLoadAdjustment();
});

test("playback-events", "records pause at the frozen protocol position", () => {
    const cadenceSession = new CadenceSessionFake();
    const executionRecorder = new ExecutionRecorderFake();

    cadenceSession.protocolElapsedMs = 42_500;

    const events = createPlaybackEvents(cadenceSession, undefined, executionRecorder);

    events.pause();

    assertDeepEqual(executionRecorder.pauseCalls, [42_500]);
});

test("playback-events", "records resume at the current protocol position", async () => {
    const cadenceSession = new CadenceSessionFake();
    const executionRecorder = new ExecutionRecorderFake();

    cadenceSession.protocolElapsedMs = 42_500;

    const events = createPlaybackEvents(cadenceSession, undefined, executionRecorder);

    await events.resume();

    assertDeepEqual(executionRecorder.resumeCalls, [42_500]);
});

test("playback-events", "records manual stop before playback position is reset", () => {
    const cadenceSession = new CadenceSessionFake();
    const executionRecorder = new ExecutionRecorderFake();

    cadenceSession.protocolElapsedMs = 42_500;

    const events = createPlaybackEvents(cadenceSession, undefined, executionRecorder);

    events.stop();

    assertDeepEqual(executionRecorder.endEarlyCalls, [
        {
            protocolTimeMs: 42_500,
            reason: "manual-stop",
        },
    ]);
});

test("playback-events", "does not record stop before execution has started", () => {
    const cadenceSession = new CadenceSessionFake();
    const executionRecorder = new ExecutionRecorderFake();

    executionRecorder.snapshot = null;

    const events = createPlaybackEvents(cadenceSession, undefined, executionRecorder);

    events.stop();

    assertEqual(cadenceSession.stopCalls, 1);
    assertEqual(executionRecorder.endEarlyCalls.length, 0);
});
