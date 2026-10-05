import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

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
