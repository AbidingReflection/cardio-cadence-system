import {
  assertEqual,
  assertThrows,
  test,
} from "/packages/js-testing/framework/test-framework.js";

import {
  initializeCadenceVisualizer,
  renderCadenceVisualizer,
} from "../../../renderers/cadence-visualizer.js";

test(
  "cadence-visualizer",
  "initializes progression circle and signal bank",
  () => {
    const container = document.createElement("div");

    initializeCadenceVisualizer(container);

    assertEqual(container.querySelectorAll(".progression-circle").length, 1);

    assertEqual(container.querySelectorAll(".signal-bank").length, 1);
  },
);

test("cadence-visualizer", "configures left and right cadence signals", () => {
  const container = document.createElement("div");

  initializeCadenceVisualizer(container);

  const left = container.querySelector('[data-signal-id="left"]');

  const right = container.querySelector('[data-signal-id="right"]');

  assertEqual(left.querySelector(".signal-bank__label").textContent, "LEFT");

  assertEqual(right.querySelector(".signal-bank__label").textContent, "RIGHT");
});

test("cadence-visualizer", "configures cadence cue notches", () => {
  const container = document.createElement("div");

  initializeCadenceVisualizer(container);

  const notches = container.querySelectorAll(".progression-circle__notch");

  assertEqual(notches.length, 2);

  assertEqual(notches[0].dataset.notchId, "left");

  assertEqual(notches[0].getAttribute("transform"), "rotate(0 50 50)");

  assertEqual(notches[1].dataset.notchId, "right");

  assertEqual(notches[1].getAttribute("transform"), "rotate(180 50 50)");
});

test("cadence-visualizer", "labels the progression circle", () => {
  const container = document.createElement("div");

  initializeCadenceVisualizer(container, "RPM");

  assertEqual(
    container.querySelector(".progression-circle__label").textContent,
              "RPM",
  );
});

test("cadence-visualizer", "renders zero cadence phase", () => {
  const container = document.createElement("div");
  const visualizer = initializeCadenceVisualizer(container);

  renderCadenceVisualizer(visualizer, {
    phase: 0,
    cadenceRpm: 60,
  });

  assertEqual(
    container
      .querySelector(".progression-circle__marker")
      .getAttribute("transform"),
    "rotate(0 50 50)",
  );
});

test("cadence-visualizer", "renders quarter cadence phase", () => {
  const container = document.createElement("div");
  const visualizer = initializeCadenceVisualizer(container);

  renderCadenceVisualizer(visualizer, {
    phase: 0.25,
    cadenceRpm: 60,
  });

  assertEqual(
    container
      .querySelector(".progression-circle__marker")
      .getAttribute("transform"),
    "rotate(90 50 50)",
  );
});

test("cadence-visualizer", "renders half cadence phase", () => {
  const container = document.createElement("div");
  const visualizer = initializeCadenceVisualizer(container);

  renderCadenceVisualizer(visualizer, {
    phase: 0.5,
    cadenceRpm: 60,
  });

  assertEqual(
    container
      .querySelector(".progression-circle__marker")
      .getAttribute("transform"),
    "rotate(180 50 50)",
  );
});

test("cadence-visualizer", "renders three-quarter cadence phase", () => {
  const container = document.createElement("div");
  const visualizer = initializeCadenceVisualizer(container);

  renderCadenceVisualizer(visualizer, {
    phase: 0.75,
    cadenceRpm: 60,
  });

  assertEqual(
    container
      .querySelector(".progression-circle__marker")
      .getAttribute("transform"),
    "rotate(270 50 50)",
  );
});

test("cadence-visualizer", "activates left at cycle start", () => {
  const container = document.createElement("div");
  const visualizer = initializeCadenceVisualizer(container);

  renderCadenceVisualizer(visualizer, {
    phase: 0,
    cadenceRpm: 60,
  });

  assertEqual(
    container.querySelector('[data-signal-id="left"]').dataset.active,
    "true",
  );

  assertEqual(
    container.querySelector('[data-signal-id="right"]').dataset.active,
    "false",
  );
});

test("cadence-visualizer", "activates right at half cycle", () => {
  const container = document.createElement("div");
  const visualizer = initializeCadenceVisualizer(container);

  renderCadenceVisualizer(visualizer, {
    phase: 0.5,
    cadenceRpm: 60,
  });

  assertEqual(
    container.querySelector('[data-signal-id="left"]').dataset.active,
    "false",
  );

  assertEqual(
    container.querySelector('[data-signal-id="right"]').dataset.active,
    "true",
  );
});

test(
  "cadence-visualizer",
  "switches active signal at half-cycle boundary",
  () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    renderCadenceVisualizer(visualizer, {
      phase: 0.49,
      cadenceRpm: 60,
    });

    assertEqual(
      container.querySelector('[data-signal-id="left"]').dataset.active,
      "true",
    );

    renderCadenceVisualizer(visualizer, {
      phase: 0.5,
      cadenceRpm: 60,
    });

    assertEqual(
      container.querySelector('[data-signal-id="left"]').dataset.active,
      "false",
    );

    assertEqual(
      container.querySelector('[data-signal-id="right"]').dataset.active,
      "true",
    );
  },
);

test("cadence-visualizer", "renders cadence to one decimal place", () => {
  const container = document.createElement("div");
  const visualizer = initializeCadenceVisualizer(container);

  renderCadenceVisualizer(visualizer, {
    phase: 0.25,
    cadenceRpm: 60.64,
  });

  assertEqual(
    container.querySelector(".progression-circle__value").textContent,
    "60.6",
  );
});

test("cadence-visualizer", "reuses component nodes across renders", () => {
  const container = document.createElement("div");
  const visualizer = initializeCadenceVisualizer(container);

  const markerBefore = container.querySelector(".progression-circle__marker");

  const valueBefore = container.querySelector(".progression-circle__value");

  const leftBefore = container.querySelector('[data-signal-id="left"]');

  const rightBefore = container.querySelector('[data-signal-id="right"]');

  renderCadenceVisualizer(visualizer, {
    phase: 0.1,
    cadenceRpm: 55,
  });

  renderCadenceVisualizer(visualizer, {
    phase: 0.6,
    cadenceRpm: 60,
  });

  renderCadenceVisualizer(visualizer, {
    phase: 0.9,
    cadenceRpm: 65,
  });

  assertEqual(
    container.querySelector(".progression-circle__marker"),
    markerBefore,
  );

  assertEqual(
    container.querySelector(".progression-circle__value"),
    valueBefore,
  );

  assertEqual(container.querySelector('[data-signal-id="left"]'), leftBefore);

  assertEqual(container.querySelector('[data-signal-id="right"]'), rightBefore);
});

test("cadence-visualizer", "rejects negative cadence phase", () => {
  const container = document.createElement("div");
  const visualizer = initializeCadenceVisualizer(container);

  assertThrows(() =>
    renderCadenceVisualizer(visualizer, {
      phase: -0.01,
      cadenceRpm: 60,
    }),
  );
});

test("cadence-visualizer", "rejects cadence phase at one", () => {
  const container = document.createElement("div");
  const visualizer = initializeCadenceVisualizer(container);

  assertThrows(() =>
    renderCadenceVisualizer(visualizer, {
      phase: 1,
      cadenceRpm: 60,
    }),
  );
});

test("cadence-visualizer", "rejects non-finite cadence phase", () => {
  const container = document.createElement("div");
  const visualizer = initializeCadenceVisualizer(container);

  assertThrows(() =>
    renderCadenceVisualizer(visualizer, {
      phase: Infinity,
      cadenceRpm: 60,
    }),
  );

  assertThrows(() =>
    renderCadenceVisualizer(visualizer, {
      phase: NaN,
      cadenceRpm: 60,
    }),
  );
});

test("cadence-visualizer", "rejects invalid cadence", () => {
  const container = document.createElement("div");
  const visualizer = initializeCadenceVisualizer(container);

  assertThrows(() =>
    renderCadenceVisualizer(visualizer, {
      phase: 0,
      cadenceRpm: NaN,
    }),
  );

  assertThrows(() =>
    renderCadenceVisualizer(visualizer, {
      phase: 0,
      cadenceRpm: Infinity,
    }),
  );

  assertThrows(() =>
    renderCadenceVisualizer(visualizer, {
      phase: 0,
      cadenceRpm: -1,
    }),
  );
});
