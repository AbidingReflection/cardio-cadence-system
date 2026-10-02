import { assertEqual, assertThrows, test } from "/packages/js-testing/framework/test-framework.js";

import {
    initializeCadenceVisualizer,
    renderCadenceVisualizer,
} from "../../../renderers/cadence-visualizer.js";

test("cadence-visualizer", "initializes owned visualizer structure", () => {
    const container = document.createElement("div");

    const visualizer = initializeCadenceVisualizer(container);

    assertEqual(visualizer.track, container.querySelector(".cadence-visualizer__track"));

    assertEqual(visualizer.indicator, container.querySelector(".cadence-visualizer__indicator"));

    assertEqual(visualizer.leftCue, container.querySelector(".cadence-visualizer__cue--left"));

    assertEqual(visualizer.rightCue, container.querySelector(".cadence-visualizer__cue--right"));

    assertEqual(
        visualizer.cadenceValue,
        container.querySelector(".cadence-visualizer__cadence-value"),
    );
});

test("cadence-visualizer", "renders zero cadence phase", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    renderCadenceVisualizer(visualizer, {
        phase: 0,
        cadenceRpm: 60,
    });

    assertEqual(visualizer.indicator.style.transform, "rotate(0deg)");
});

test("cadence-visualizer", "renders quarter cadence phase", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    renderCadenceVisualizer(visualizer, {
        phase: 0.25,
        cadenceRpm: 60,
    });

    assertEqual(visualizer.indicator.style.transform, "rotate(90deg)");
});

test("cadence-visualizer", "renders half cadence phase", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    renderCadenceVisualizer(visualizer, {
        phase: 0.5,
        cadenceRpm: 60,
    });

    assertEqual(visualizer.indicator.style.transform, "rotate(180deg)");
});

test("cadence-visualizer", "renders three-quarter cadence phase", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    renderCadenceVisualizer(visualizer, {
        phase: 0.75,
        cadenceRpm: 60,
    });

    assertEqual(visualizer.indicator.style.transform, "rotate(270deg)");
});

test("cadence-visualizer", "emphasizes left at cycle start", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    renderCadenceVisualizer(visualizer, {
        phase: 0,
        cadenceRpm: 60,
    });

    assertEqual(visualizer.leftCue.dataset.active, "true");

    assertEqual(visualizer.rightCue.dataset.active, "false");
});

test("cadence-visualizer", "emphasizes right at half cycle", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    renderCadenceVisualizer(visualizer, {
        phase: 0.5,
        cadenceRpm: 60,
    });

    assertEqual(visualizer.leftCue.dataset.active, "false");

    assertEqual(visualizer.rightCue.dataset.active, "true");
});

test("cadence-visualizer", "switches active side at half-cycle boundary", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    renderCadenceVisualizer(visualizer, {
        phase: 0.49,
        cadenceRpm: 60,
    });

    assertEqual(visualizer.leftCue.dataset.active, "true");

    renderCadenceVisualizer(visualizer, {
        phase: 0.5,
        cadenceRpm: 60,
    });

    assertEqual(visualizer.rightCue.dataset.active, "true");
});

test("cadence-visualizer", "renders rounded current cadence", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    renderCadenceVisualizer(visualizer, {
        phase: 0.25,
        cadenceRpm: 60.6,
    });

    assertEqual(visualizer.cadenceValue.textContent, "60.6");
});

test("cadence-visualizer", "rejects negative cadence phase", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    assertThrows(
        () =>
            renderCadenceVisualizer(visualizer, {
                phase: -0.01,
                cadenceRpm: 60,
            }),
        /within \[0, 1\)/,
    );
});

test("cadence-visualizer", "rejects cadence phase at one", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    assertThrows(
        () =>
            renderCadenceVisualizer(visualizer, {
                phase: 1,
                cadenceRpm: 60,
            }),
        /within \[0, 1\)/,
    );
});

test("cadence-visualizer", "rejects non-finite cadence phase", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    assertThrows(
        () =>
            renderCadenceVisualizer(visualizer, {
                phase: Infinity,
                cadenceRpm: 60,
            }),
        /within \[0, 1\)/,
    );

    assertThrows(
        () =>
            renderCadenceVisualizer(visualizer, {
                phase: NaN,
                cadenceRpm: 60,
            }),
        /within \[0, 1\)/,
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
});
