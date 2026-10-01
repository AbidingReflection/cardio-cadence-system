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
});

test("cadence-visualizer", "renders zero cadence phase", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    renderCadenceVisualizer(visualizer, 0);

    assertEqual(visualizer.indicator.style.transform, "rotate(0deg)");
});

test("cadence-visualizer", "renders quarter cadence phase", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    renderCadenceVisualizer(visualizer, 0.25);

    assertEqual(visualizer.indicator.style.transform, "rotate(90deg)");
});

test("cadence-visualizer", "renders half cadence phase", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    renderCadenceVisualizer(visualizer, 0.5);

    assertEqual(visualizer.indicator.style.transform, "rotate(180deg)");
});

test("cadence-visualizer", "renders three-quarter cadence phase", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    renderCadenceVisualizer(visualizer, 0.75);

    assertEqual(visualizer.indicator.style.transform, "rotate(270deg)");
});

test("cadence-visualizer", "rejects negative cadence phase", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    assertThrows(() => renderCadenceVisualizer(visualizer, -0.01), /within \[0, 1\)/);
});

test("cadence-visualizer", "rejects cadence phase at one", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    assertThrows(() => renderCadenceVisualizer(visualizer, 1), /within \[0, 1\)/);
});

test("cadence-visualizer", "rejects non-finite cadence phase", () => {
    const container = document.createElement("div");
    const visualizer = initializeCadenceVisualizer(container);

    assertThrows(() => renderCadenceVisualizer(visualizer, Infinity), /within \[0, 1\)/);

    assertThrows(() => renderCadenceVisualizer(visualizer, NaN), /within \[0, 1\)/);
});
