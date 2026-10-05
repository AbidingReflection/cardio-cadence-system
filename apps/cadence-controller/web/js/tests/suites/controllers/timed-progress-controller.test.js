import {
    assertDeepEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { TimedProgressController } from "../../../controllers/timed-progress-controller.js";

/** Records ProgressTrack calls for controller tests. */
class ProgressTrackFake {
    markerPositionCalls = [];
    progressCalls = [];
    markerTextCalls = [];

    setMarkerPosition(position) {
        this.markerPositionCalls.push(position);
    }

    setProgress(progress) {
        this.progressCalls.push(progress);
    }

    setMarkerText(text) {
        this.markerTextCalls.push(text);
    }
}

/** Creates a controller and its fake visual dependency. */
function createController() {
    const progressTrack = new ProgressTrackFake();

    const controller = new TimedProgressController(progressTrack);

    return {
        controller,
        progressTrack,
    };
}

test("timed-progress-controller", "renders zero timed progress", () => {
    const { controller, progressTrack } = createController();

    controller.render({
        elapsedTimeMs: 0,
        durationMs: 60_000,
        markerText: "0:00",
    });

    assertDeepEqual(progressTrack.markerPositionCalls, [0]);

    assertDeepEqual(progressTrack.progressCalls, [0]);

    assertDeepEqual(progressTrack.markerTextCalls, ["0:00"]);
});

test("timed-progress-controller", "renders normalized timed progress", () => {
    const { controller, progressTrack } = createController();

    controller.render({
        elapsedTimeMs: 15_000,
        durationMs: 60_000,
        markerText: "0:15",
    });

    assertDeepEqual(progressTrack.markerPositionCalls, [0.25]);

    assertDeepEqual(progressTrack.progressCalls, [0.25]);
});

test("timed-progress-controller", "renders completed timed progress", () => {
    const { controller, progressTrack } = createController();

    controller.render({
        elapsedTimeMs: 60_000,
        durationMs: 60_000,
        markerText: "1:00",
    });

    assertDeepEqual(progressTrack.markerPositionCalls, [1]);

    assertDeepEqual(progressTrack.progressCalls, [1]);

    assertDeepEqual(progressTrack.markerTextCalls, ["1:00"]);
});

test("timed-progress-controller", "coordinates repeated timed progress updates", () => {
    const { controller, progressTrack } = createController();

    controller.render({
        elapsedTimeMs: 10_000,
        durationMs: 100_000,
        markerText: "0:10",
    });

    controller.render({
        elapsedTimeMs: 50_000,
        durationMs: 100_000,
        markerText: "0:50",
    });

    controller.render({
        elapsedTimeMs: 90_000,
        durationMs: 100_000,
        markerText: "1:30",
    });

    assertDeepEqual(progressTrack.markerPositionCalls, [0.1, 0.5, 0.9]);

    assertDeepEqual(progressTrack.progressCalls, [0.1, 0.5, 0.9]);

    assertDeepEqual(progressTrack.markerTextCalls, ["0:10", "0:50", "1:30"]);
});

test("timed-progress-controller", "supports changing timed interval durations", () => {
    const { controller, progressTrack } = createController();

    controller.render({
        elapsedTimeMs: 15_000,
        durationMs: 60_000,
        markerText: "0:15",
    });

    controller.render({
        elapsedTimeMs: 15_000,
        durationMs: 30_000,
        markerText: "0:15",
    });

    assertDeepEqual(progressTrack.markerPositionCalls, [0.25, 0.5]);

    assertDeepEqual(progressTrack.progressCalls, [0.25, 0.5]);
});

test("timed-progress-controller", "rejects invalid duration", () => {
    const { controller } = createController();

    for (const durationMs of [0, -1, NaN, Infinity, "60000"]) {
        assertThrows(() =>
            controller.render({
                elapsedTimeMs: 0,
                durationMs,
                markerText: "0:00",
            }),
        );
    }
});

test("timed-progress-controller", "rejects invalid elapsed time", () => {
    const { controller } = createController();

    for (const elapsedTimeMs of [-1, 60_001, NaN, Infinity, "30000"]) {
        assertThrows(() =>
            controller.render({
                elapsedTimeMs,
                durationMs: 60_000,
                markerText: "0:00",
            }),
        );
    }
});
