import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { LoadAlertController } from "../../../controllers/load-alert-controller.js";
import { AudioCueEngineFake } from "../../helpers/audio-cue-engine-fake.js";
import { TimeSourceFake } from "../../helpers/time-source-fake.js";

/** Creates a load alert controller with deterministic dependencies. */
function createController({ repeatIntervalMs = 2500 } = {}) {
    const audioCueEngine = new AudioCueEngineFake();
    const timer = new TimeSourceFake();

    const controller = new LoadAlertController({
        audioCueEngine,
        timer,
        repeatIntervalMs,
    });

    return {
        controller,
        audioCueEngine,
        timer,
    };
}

/** Returns scheduled load-alert cues. */
function getLoadAlertCues(audioCueEngine) {
    return audioCueEngine.scheduledCues.filter((cue) => cue.type === "load-alert");
}

test("load-alert-controller", "plays immediately when a pending adjustment becomes active", () => {
    const { controller, audioCueEngine, timer } = createController();

    audioCueEngine.currentTime = 12.5;

    controller.update({
        playbackState: "running",
        adjustmentPending: true,
    });

    assertEqual(getLoadAlertCues(audioCueEngine).length, 1);
    assertEqual(getLoadAlertCues(audioCueEngine)[0].audioTime, 12.5);
    assertEqual(timer.activeIntervalCount, 1);
});

test("load-alert-controller", "repeats while adjustment remains pending", () => {
    const { controller, audioCueEngine, timer } = createController();

    audioCueEngine.currentTime = 10;

    controller.update({
        playbackState: "running",
        adjustmentPending: true,
    });

    audioCueEngine.currentTime = 12.5;
    timer.runIntervals();

    audioCueEngine.currentTime = 15;
    timer.runIntervals();

    assertEqual(getLoadAlertCues(audioCueEngine).length, 3);
    assertEqual(getLoadAlertCues(audioCueEngine)[0].audioTime, 10);
    assertEqual(getLoadAlertCues(audioCueEngine)[1].audioTime, 12.5);
    assertEqual(getLoadAlertCues(audioCueEngine)[2].audioTime, 15);
});

test(
    "load-alert-controller",
    "does not create duplicate repeat timers during repeated updates",
    () => {
        const { controller, audioCueEngine, timer } = createController();

        controller.update({
            playbackState: "running",
            adjustmentPending: true,
        });

        controller.update({
            playbackState: "running",
            adjustmentPending: true,
        });

        controller.update({
            playbackState: "running",
            adjustmentPending: true,
        });

        assertEqual(getLoadAlertCues(audioCueEngine).length, 1);
        assertEqual(timer.activeIntervalCount, 1);
    },
);

test("load-alert-controller", "stops repeating when adjustment is acknowledged", () => {
    const { controller, audioCueEngine, timer } = createController();

    controller.update({
        playbackState: "running",
        adjustmentPending: true,
    });

    controller.update({
        playbackState: "running",
        adjustmentPending: false,
    });

    assertEqual(timer.activeIntervalCount, 0);

    timer.runIntervals();

    assertEqual(getLoadAlertCues(audioCueEngine).length, 1);
});

test("load-alert-controller", "suppresses alerts while playback is paused", () => {
    const { controller, audioCueEngine, timer } = createController();

    controller.update({
        playbackState: "running",
        adjustmentPending: true,
    });

    controller.update({
        playbackState: "paused",
        adjustmentPending: true,
    });

    assertEqual(timer.activeIntervalCount, 0);

    timer.runIntervals();

    assertEqual(getLoadAlertCues(audioCueEngine).length, 1);
});

test(
    "load-alert-controller",
    "resumes alerting when pending adjustment returns to running playback",
    () => {
        const { controller, audioCueEngine, timer } = createController();

        controller.update({
            playbackState: "running",
            adjustmentPending: true,
        });

        controller.update({
            playbackState: "paused",
            adjustmentPending: true,
        });

        audioCueEngine.currentTime = 20;

        controller.update({
            playbackState: "running",
            adjustmentPending: true,
        });

        assertEqual(getLoadAlertCues(audioCueEngine).length, 2);
        assertEqual(getLoadAlertCues(audioCueEngine)[1].audioTime, 20);
        assertEqual(timer.activeIntervalCount, 1);
    },
);

test("load-alert-controller", "does not alert when adjustment is not pending", () => {
    const { controller, audioCueEngine, timer } = createController();

    controller.update({
        playbackState: "running",
        adjustmentPending: false,
    });

    assertEqual(getLoadAlertCues(audioCueEngine).length, 0);
    assertEqual(timer.activeIntervalCount, 0);
});

test("load-alert-controller", "does not alert while playback is idle", () => {
    const { controller, audioCueEngine, timer } = createController();

    controller.update({
        playbackState: "idle",
        adjustmentPending: true,
    });

    assertEqual(getLoadAlertCues(audioCueEngine).length, 0);
    assertEqual(timer.activeIntervalCount, 0);
});

test("load-alert-controller", "stops alerting when playback completes", () => {
    const { controller, audioCueEngine, timer } = createController();

    controller.update({
        playbackState: "running",
        adjustmentPending: true,
    });

    controller.update({
        playbackState: "completed",
        adjustmentPending: true,
    });

    assertEqual(timer.activeIntervalCount, 0);
});
