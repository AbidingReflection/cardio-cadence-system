import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import {
    initializeLoadVisualizer,
    renderLoadVisualizer,
} from "../../../renderers/load-visualizer.js";

test("load-visualizer", "initializes persistent load visualizer structure", () => {
    const container = document.createElement("div");

    initializeLoadVisualizer(container);

    assertEqual(container.querySelectorAll(".load-visualizer__status").length, 1);

    assertEqual(container.querySelectorAll(".load-visualizer__circle").length, 1);

    assertEqual(container.querySelectorAll(".progression-circle").length, 1);
});

test("load-visualizer", "labels the progression circle", () => {
    const container = document.createElement("div");

    initializeLoadVisualizer(container, "Resistance");

    assertEqual(container.querySelector(".progression-circle__label").textContent, "Resistance");
});

test("load-visualizer", "renders load value", () => {
    const container = document.createElement("div");
    const visualizer = initializeLoadVisualizer(container);

    renderLoadVisualizer(visualizer, {
        value: 12,
        progress: 0.5,
    });

    assertEqual(container.querySelector(".progression-circle__value").textContent, "12");
});

test("load-visualizer", "renders load segment marker position", () => {
    const container = document.createElement("div");
    const visualizer = initializeLoadVisualizer(container);

    renderLoadVisualizer(visualizer, {
        value: 8,
        progress: 0.25,
    });

    assertEqual(
        container.querySelector(".progression-circle__marker").getAttribute("transform"),
        "rotate(90 50 50)",
    );
});

test("load-visualizer", "renders load segment progress", () => {
    const container = document.createElement("div");
    const visualizer = initializeLoadVisualizer(container);

    renderLoadVisualizer(visualizer, {
        value: 8,
        progress: 0.25,
    });

    const progress = container.querySelector(".progression-circle__progress");

    assertEqual(progress.getAttribute("stroke-dashoffset"), "0.75");

    assertEqual(progress.getAttribute("visibility"), "visible");
});

test("load-visualizer", "renders zero load segment progress", () => {
    const container = document.createElement("div");
    const visualizer = initializeLoadVisualizer(container);

    renderLoadVisualizer(visualizer, {
        value: 8,
        progress: 0,
    });

    assertEqual(
        container.querySelector(".progression-circle__marker").getAttribute("transform"),
        "rotate(0 50 50)",
    );

    assertEqual(
        container.querySelector(".progression-circle__progress").getAttribute("visibility"),
        "hidden",
    );
});

test("load-visualizer", "renders completed load segment", () => {
    const container = document.createElement("div");
    const visualizer = initializeLoadVisualizer(container);

    renderLoadVisualizer(visualizer, {
        value: 18,
        progress: 1,
    });

    const marker = container.querySelector(".progression-circle__marker");

    const progress = container.querySelector(".progression-circle__progress");

    assertEqual(marker.getAttribute("transform"), "rotate(0 50 50)");

    assertEqual(progress.getAttribute("stroke-dashoffset"), "0");

    assertEqual(progress.getAttribute("visibility"), "visible");
});

test("load-visualizer", "preserves supplied load value text", () => {
    const container = document.createElement("div");
    const visualizer = initializeLoadVisualizer(container);

    renderLoadVisualizer(visualizer, {
        value: 7.5,
        progress: 0.5,
    });

    assertEqual(container.querySelector(".progression-circle__value").textContent, "7.5");
});

test("load-visualizer", "reuses component nodes across renders", () => {
    const container = document.createElement("div");
    const visualizer = initializeLoadVisualizer(container);

    const statusBefore = container.querySelector(".load-visualizer__status");

    const circleBefore = container.querySelector(".load-visualizer__circle");

    const markerBefore = container.querySelector(".progression-circle__marker");

    const progressBefore = container.querySelector(".progression-circle__progress");

    const valueBefore = container.querySelector(".progression-circle__value");

    renderLoadVisualizer(visualizer, {
        value: 6,
        progress: 0.1,
    });

    renderLoadVisualizer(visualizer, {
        value: 8,
        progress: 0.5,
    });

    renderLoadVisualizer(visualizer, {
        value: 10,
        progress: 0.9,
    });

    assertEqual(container.querySelector(".load-visualizer__status"), statusBefore);

    assertEqual(container.querySelector(".load-visualizer__circle"), circleBefore);

    assertEqual(container.querySelector(".progression-circle__marker"), markerBefore);

    assertEqual(container.querySelector(".progression-circle__progress"), progressBefore);

    assertEqual(container.querySelector(".progression-circle__value"), valueBefore);
});

test("load-visualizer", "renders normal load adjustment state", () => {
    const container = document.createElement("div");
    const visualizer = initializeLoadVisualizer(container);

    renderLoadVisualizer(visualizer, {
        value: 8,
        progress: 0.25,
        adjustmentPending: false,
    });

    assertEqual(container.dataset.adjustmentPending, "false");
});

test("load-visualizer", "renders pending load adjustment state", () => {
    const container = document.createElement("div");
    const visualizer = initializeLoadVisualizer(container);

    renderLoadVisualizer(visualizer, {
        value: 8,
        progress: 0.25,
        adjustmentPending: true,
    });

    assertEqual(container.dataset.adjustmentPending, "true");
});

test("load-visualizer", "clears pending load adjustment state", () => {
    const container = document.createElement("div");
    const visualizer = initializeLoadVisualizer(container);

    renderLoadVisualizer(visualizer, {
        value: 8,
        progress: 0.25,
        adjustmentPending: true,
    });

    renderLoadVisualizer(visualizer, {
        value: 8,
        progress: 0.5,
        adjustmentPending: false,
    });

    assertEqual(container.dataset.adjustmentPending, "false");
});
