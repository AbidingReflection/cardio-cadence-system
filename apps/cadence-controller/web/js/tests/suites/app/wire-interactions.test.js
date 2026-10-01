import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { wireInteractions } from "../../../app/wire-interactions.js";

/** Creates playback control elements for interaction wiring tests. */
function createElements() {
    return {
        startButton: document.createElement("button"),
        pauseButton: document.createElement("button"),
        resumeButton: document.createElement("button"),
        stopButton: document.createElement("button"),
    };
}

/** Records playback event calls for wiring tests. */
function createPlaybackEventsFake() {
    return {
        startCalls: 0,
        pauseCalls: 0,
        resumeCalls: 0,
        stopCalls: 0,

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
    };
}

test("wire-interactions", "wires playback controls to playback events", async () => {
    const elements = createElements();
    const playbackEvents = createPlaybackEventsFake();

    wireInteractions(elements, playbackEvents);

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

    wireInteractions(elements, playbackEvents);

    elements.pauseButton.click();

    await Promise.resolve();

    assertEqual(playbackEvents.startCalls, 0);
    assertEqual(playbackEvents.pauseCalls, 1);
    assertEqual(playbackEvents.resumeCalls, 0);
    assertEqual(playbackEvents.stopCalls, 0);
});

test("wire-interactions", "removes registered playback listeners", async () => {
    const elements = createElements();
    const playbackEvents = createPlaybackEventsFake();

    const unwire = wireInteractions(elements, playbackEvents);

    unwire();

    elements.startButton.click();
    elements.pauseButton.click();
    elements.resumeButton.click();
    elements.stopButton.click();

    await Promise.resolve();

    assertEqual(playbackEvents.startCalls, 0);
    assertEqual(playbackEvents.pauseCalls, 0);
    assertEqual(playbackEvents.resumeCalls, 0);
    assertEqual(playbackEvents.stopCalls, 0);
});
