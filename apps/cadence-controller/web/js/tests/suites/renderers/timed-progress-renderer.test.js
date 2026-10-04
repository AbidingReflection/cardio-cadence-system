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
  "initializes a persistent progress track",
  () => {
    const container = createContainer();

    const visualizer = initializeTimedProgressRenderer(container);

    assertDeepEqual(visualizer.progressTrack instanceof ProgressTrack, true);

    assertDeepEqual(container.childElementCount, 1);
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
});

test(
  "timed-progress-renderer",
  "reuses rendered progress track nodes across updates",
  () => {
    const container = createContainer();

    const visualizer = initializeTimedProgressRenderer(container);

    const root = container.firstElementChild;

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

    assertDeepEqual(container.firstElementChild === root, true);

    assertDeepEqual(container.childElementCount, 1);
  },
);
