import {
  assertDeepEqual,
  assertEqual,
  assertThrows,
  test,
} from "/packages/js-testing/framework/test-framework.js";

import { CycleGuidanceController } from "../../../controllers/cycle-guidance-controller.js";

/** Records ProgressionCircle calls for controller tests. */
class ProgressionCircleFake {
  notchCalls = [];
  markerPositionCalls = [];
  valueTextCalls = [];

  setNotches(notches) {
    this.notchCalls.push(notches);
  }

  setMarkerPosition(position) {
    this.markerPositionCalls.push(position);
  }

  setValueText(text) {
    this.valueTextCalls.push(text);
  }
}

/** Records SignalBank calls for controller tests. */
class SignalBankFake {
  activeSignalCalls = [];

  setActiveSignal(signalId) {
    this.activeSignalCalls.push(signalId);
  }
}

/** Returns a representative elliptical cue pattern. */
function createEllipticalCues() {
  return [
    {
      id: "left",
      label: "LEFT",
      position: 0,
    },
    {
      id: "right",
      label: "RIGHT",
      position: 0.5,
    },
  ];
}

/** Creates a controller and its fake visual dependencies. */
function createController(cues = createEllipticalCues()) {
  const progressionCircle = new ProgressionCircleFake();
  const signalBank = new SignalBankFake();

  const controller = new CycleGuidanceController(
    progressionCircle,
    signalBank,
    cues,
  );

  return {
    controller,
    progressionCircle,
    signalBank,
  };
}

test(
  "cycle-guidance-controller",
  "configures progression circle notches from cue positions",
  () => {
    const { progressionCircle } = createController();

    assertEqual(progressionCircle.notchCalls.length, 1);

    assertDeepEqual(progressionCircle.notchCalls[0], [
      {
        id: "left",
        position: 0,
      },
      {
        id: "right",
        position: 0.5,
      },
    ]);
  },
);

test(
  "cycle-guidance-controller",
  "renders cycle phase to the progression marker",
  () => {
    const { controller, progressionCircle } = createController();

    controller.render({
      phase: 0.375,
      valueText: "60.0",
    });

    assertDeepEqual(progressionCircle.markerPositionCalls, [0.375]);
  },
);

test("cycle-guidance-controller", "renders supplied cycle value text", () => {
  const { controller, progressionCircle } = createController();

  controller.render({
    phase: 0.25,
    valueText: "64.5",
  });

  assertDeepEqual(progressionCircle.valueTextCalls, ["64.5"]);
});

test(
  "cycle-guidance-controller",
  "activates the cue whose boundary most recently occurred",
  () => {
    const { controller, signalBank } = createController();

    controller.render({
      phase: 0,
      valueText: "60.0",
    });

    controller.render({
      phase: 0.499,
      valueText: "60.0",
    });

    controller.render({
      phase: 0.5,
      valueText: "60.0",
    });

    controller.render({
      phase: 0.999,
      valueText: "60.0",
    });

    assertDeepEqual(signalBank.activeSignalCalls, [
      "left",
      "left",
      "right",
      "right",
    ]);
  },
);

test(
  "cycle-guidance-controller",
  "supports asymmetric arbitrary cue positions",
  () => {
    const cues = [
      {
        id: "legs-extended",
        label: "LEGS FULLY EXTENDED",
        position: 0,
      },
      {
        id: "back-extended",
        label: "BACK EXTENDED",
        position: 0.55,
      },
      {
        id: "arms-pull",
        label: "ARMS PULL",
        position: 0.75,
      },
    ];

    const { controller, signalBank } = createController(cues);

    controller.render({
      phase: 0.4,
      valueText: "24",
    });

    controller.render({
      phase: 0.6,
      valueText: "24",
    });

    controller.render({
      phase: 0.9,
      valueText: "24",
    });

    assertDeepEqual(signalBank.activeSignalCalls, [
      "legs-extended",
      "back-extended",
      "arms-pull",
    ]);
  },
);

test(
  "cycle-guidance-controller",
  "does not require cues to be supplied in position order",
  () => {
    const cues = [
      {
        id: "arms-pull",
        label: "ARMS PULL",
        position: 0.75,
      },
      {
        id: "legs-extended",
        label: "LEGS FULLY EXTENDED",
        position: 0,
      },
      {
        id: "back-extended",
        label: "BACK EXTENDED",
        position: 0.55,
      },
    ];

    const { controller, signalBank } = createController(cues);

    controller.render({
      phase: 0.6,
      valueText: "24",
    });

    assertDeepEqual(signalBank.activeSignalCalls, ["back-extended"]);
  },
);

test("cycle-guidance-controller", "rejects invalid cycle phases", () => {
  const { controller } = createController();

  assertThrows(() =>
    controller.render({
      phase: -0.01,
      valueText: "60.0",
    }),
  );

  assertThrows(() =>
    controller.render({
      phase: 1,
      valueText: "60.0",
    }),
  );

  assertThrows(() =>
    controller.render({
      phase: NaN,
      valueText: "60.0",
    }),
  );

  assertThrows(() =>
    controller.render({
      phase: Infinity,
      valueText: "60.0",
    }),
  );
});

test("cycle-guidance-controller", "rejects an empty cue pattern", () => {
  const progressionCircle = new ProgressionCircleFake();
  const signalBank = new SignalBankFake();

  assertThrows(
    () => new CycleGuidanceController(progressionCircle, signalBank, []),
  );
});

test(
  "cycle-guidance-controller",
  "rejects cue patterns without a cycle-start cue",
  () => {
    const progressionCircle = new ProgressionCircleFake();
    const signalBank = new SignalBankFake();

    assertThrows(
      () =>
        new CycleGuidanceController(progressionCircle, signalBank, [
          {
            id: "late",
            label: "LATE",
            position: 0.5,
          },
        ]),
    );
  },
);
