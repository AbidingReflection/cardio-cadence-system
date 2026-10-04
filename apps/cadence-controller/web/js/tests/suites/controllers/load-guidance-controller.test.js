import {
  assertDeepEqual,
  assertThrows,
  test,
} from "/packages/js-testing/framework/test-framework.js";

import { LoadGuidanceController } from "../../../controllers/load-guidance-controller.js";

/** Records ProgressionCircle calls for controller tests. */
class ProgressionCircleFake {
  markerPositionCalls = [];
  progressCalls = [];
  valueTextCalls = [];

  setMarkerPosition(position) {
    this.markerPositionCalls.push(position);
  }

  setProgress(progress) {
    this.progressCalls.push(progress);
  }

  setValueText(text) {
    this.valueTextCalls.push(text);
  }
}

/** Creates a controller and its fake visual dependency. */
function createController() {
  const progressionCircle = new ProgressionCircleFake();

  const controller = new LoadGuidanceController(progressionCircle);

  return {
    controller,
    progressionCircle,
  };
}

test("load-guidance-controller", "renders load segment progress", () => {
  const { controller, progressionCircle } = createController();

  controller.render({
    progress: 0.375,
    valueText: "8",
  });

  assertDeepEqual(progressionCircle.markerPositionCalls, [0.375]);

  assertDeepEqual(progressionCircle.progressCalls, [0.375]);
});

test("load-guidance-controller", "renders supplied load value text", () => {
  const { controller, progressionCircle } = createController();

  controller.render({
    progress: 0.5,
    valueText: "12",
  });

  assertDeepEqual(progressionCircle.valueTextCalls, ["12"]);
});

test("load-guidance-controller", "renders zero load segment progress", () => {
  const { controller, progressionCircle } = createController();

  controller.render({
    progress: 0,
    valueText: "4",
  });

  assertDeepEqual(progressionCircle.markerPositionCalls, [0]);

  assertDeepEqual(progressionCircle.progressCalls, [0]);
});

test(
  "load-guidance-controller",
  "renders completed load segment progress",
  () => {
    const { controller, progressionCircle } = createController();

    controller.render({
      progress: 1,
      valueText: "18",
    });

    assertDeepEqual(progressionCircle.markerPositionCalls, [0]);

    assertDeepEqual(progressionCircle.progressCalls, [1]);
  },
);

test(
  "load-guidance-controller",
  "rejects invalid load segment progress",
  () => {
    const { controller } = createController();

    assertThrows(() =>
      controller.render({
        progress: -0.01,
        valueText: "8",
      }),
    );

    assertThrows(() =>
      controller.render({
        progress: 1.01,
        valueText: "8",
      }),
    );

    assertThrows(() =>
      controller.render({
        progress: NaN,
        valueText: "8",
      }),
    );

    assertThrows(() =>
      controller.render({
        progress: Infinity,
        valueText: "8",
      }),
    );

    assertThrows(() =>
      controller.render({
        progress: "0.5",
        valueText: "8",
      }),
    );
  },
);

test(
  "load-guidance-controller",
  "coordinates repeated load guidance updates",
  () => {
    const { controller, progressionCircle } = createController();

    controller.render({
      progress: 0.1,
      valueText: "6",
    });

    controller.render({
      progress: 0.5,
      valueText: "6",
    });

    controller.render({
      progress: 0.9,
      valueText: "6",
    });

    assertDeepEqual(progressionCircle.markerPositionCalls, [0.1, 0.5, 0.9]);

    assertDeepEqual(progressionCircle.progressCalls, [0.1, 0.5, 0.9]);

    assertDeepEqual(progressionCircle.valueTextCalls, ["6", "6", "6"]);
  },
);
