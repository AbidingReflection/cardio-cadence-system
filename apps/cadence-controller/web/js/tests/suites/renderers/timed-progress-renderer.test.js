import {
  assertDeepEqual,
  test,
} from "/packages/js-testing/framework/test-framework.js";

import { ProgressTrack } from "../../../components/progress-track.js";

import {
  initializeTimedProgressRenderer,
  renderTimedProgress,
} from "../../../renderers/timed-progress-renderer.js";

/** Creates one detached renderer host for each test. */
function createContainer() {
  return document.createElement("div");
}

test(
  "timed-progress-renderer",
  "initializes a persistent progress track and labels",
  () => {
    const container = createContainer();

    const visualizer = initializeTimedProgressRenderer(container);

    assertDeepEqual(visualizer.progressTrack instanceof ProgressTrack, true);

    assertDeepEqual(visualizer.timeLabel.className, "timed-progress__time");

    assertDeepEqual(
      visualizer.percentLabel.className,
      "timed-progress__percent",
    );

    assertDeepEqual(container.childElementCount, 3);
  },
);

test(
  "timed-progress-renderer",
  "renders timed progress through the persistent track",
  () => {
    const container = createContainer();

    const visualizer = initializeTimedProgressRenderer(container);

    const markerPositionCalls = [];
    const progressCalls = [];
    const markerTextCalls = [];

    visualizer.progressTrack.setMarkerPosition = (position) => {
      markerPositionCalls.push(position);
    };

    visualizer.progressTrack.setProgress = (progress) => {
      progressCalls.push(progress);
    };

    visualizer.progressTrack.setMarkerText = (text) => {
      markerTextCalls.push(text);
    };

    renderTimedProgress(visualizer, {
      elapsedTimeMs: 15_000,
      durationMs: 60_000,
      markerText: "0:15",
    });

    assertDeepEqual(markerPositionCalls, [0.25]);

    assertDeepEqual(progressCalls, [0.25]);

    assertDeepEqual(markerTextCalls, ["0:15"]);

    assertDeepEqual(visualizer.timeLabel.textContent, "0:15 / 1:00");

    assertDeepEqual(visualizer.percentLabel.textContent, "25.0%");
  },
);

test("timed-progress-renderer", "renders completed timed progress", () => {
  const container = createContainer();

  const visualizer = initializeTimedProgressRenderer(container);

  const markerPositionCalls = [];
  const progressCalls = [];

  visualizer.progressTrack.setMarkerPosition = (position) => {
    markerPositionCalls.push(position);
  };

  visualizer.progressTrack.setProgress = (progress) => {
    progressCalls.push(progress);
  };

  renderTimedProgress(visualizer, {
    elapsedTimeMs: 60_000,
    durationMs: 60_000,
    markerText: "1:00",
  });

  assertDeepEqual(markerPositionCalls, [1]);

  assertDeepEqual(progressCalls, [1]);

  assertDeepEqual(visualizer.timeLabel.textContent, "1:00 / 1:00");

  assertDeepEqual(visualizer.percentLabel.textContent, "100.0%");
});

test("timed-progress-renderer", "formats hour-scale timed progress", () => {
  const container = createContainer();

  const visualizer = initializeTimedProgressRenderer(container);

  renderTimedProgress(visualizer, {
    elapsedTimeMs: 3_661_000,
    durationMs: 7_200_000,
    markerText: "1:01:01",
  });

  assertDeepEqual(visualizer.timeLabel.textContent, "1:01:01 / 2:00:00");

  assertDeepEqual(visualizer.percentLabel.textContent, "50.8%");
});

test(
  "timed-progress-renderer",
  "reuses rendered progress track nodes across updates",
  () => {
    const container = createContainer();

    const visualizer = initializeTimedProgressRenderer(container);

    const progressTrack = visualizer.progressTrack;
    const timeLabel = visualizer.timeLabel;
    const percentLabel = visualizer.percentLabel;

    renderTimedProgress(visualizer, {
      elapsedTimeMs: 10_000,
      durationMs: 100_000,
      markerText: "0:10",
    });

    renderTimedProgress(visualizer, {
      elapsedTimeMs: 50_000,
      durationMs: 100_000,
      markerText: "0:50",
    });

    renderTimedProgress(visualizer, {
      elapsedTimeMs: 90_000,
      durationMs: 100_000,
      markerText: "1:30",
    });

    assertDeepEqual(visualizer.progressTrack === progressTrack, true);

    assertDeepEqual(visualizer.timeLabel === timeLabel, true);

    assertDeepEqual(visualizer.percentLabel === percentLabel, true);

    assertDeepEqual(container.childElementCount, 3);

    assertDeepEqual(visualizer.timeLabel.textContent, "1:30 / 1:40");

    assertDeepEqual(visualizer.percentLabel.textContent, "90.0%");
  },
);
