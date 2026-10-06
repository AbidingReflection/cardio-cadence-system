import {
    assert,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { ProgressionCircle } from "../../../components/progression-circle.js";

/** Creates a host element for ProgressionCircle tests. */
function createContainer() {
    return document.createElement("div");
}

test("progression-circle", "creates the SVG structure", () => {
    const container = createContainer();

    new ProgressionCircle(container);

    const svg = container.querySelector(".progression-circle");

    assert(svg instanceof SVGElement);
    assert(container.querySelector(".progression-circle__track") instanceof SVGElement);
    assert(container.querySelector(".progression-circle__progress") instanceof SVGElement);
    assert(container.querySelector(".progression-circle__notches") instanceof SVGElement);
    assert(container.querySelector(".progression-circle__marker") instanceof SVGElement);
    assert(container.querySelector(".progression-circle__value") instanceof SVGElement);
    assert(container.querySelector(".progression-circle__label") instanceof SVGElement);
    assert(container.querySelector(".progression-circle__targets") instanceof SVGElement);
});

test("progression-circle", "uses a normalized square view box", () => {
    const container = createContainer();

    new ProgressionCircle(container);

    const svg = container.querySelector(".progression-circle");

    assertEqual(svg.getAttribute("viewBox"), "0 0 100 100");
});

test("progression-circle", "positions the marker clockwise from the top", () => {
    const container = createContainer();
    const circle = new ProgressionCircle(container);

    const marker = container.querySelector(".progression-circle__marker");

    circle.setMarkerPosition(0);
    assertEqual(marker.getAttribute("transform"), "rotate(0 50 50)");

    circle.setMarkerPosition(0.25);
    assertEqual(marker.getAttribute("transform"), "rotate(90 50 50)");

    circle.setMarkerPosition(0.5);
    assertEqual(marker.getAttribute("transform"), "rotate(180 50 50)");

    circle.setMarkerPosition(0.75);
    assertEqual(marker.getAttribute("transform"), "rotate(270 50 50)");
});

test("progression-circle", "rejects invalid marker positions", () => {
    const circle = new ProgressionCircle(createContainer());

    assertThrows(() => circle.setMarkerPosition(-0.01));
    assertThrows(() => circle.setMarkerPosition(1));
    assertThrows(() => circle.setMarkerPosition(NaN));
    assertThrows(() => circle.setMarkerPosition(Infinity));
    assertThrows(() => circle.setMarkerPosition("0.5"));
});

test("progression-circle", "renders normalized progress", () => {
    const container = createContainer();
    const circle = new ProgressionCircle(container);

    const progress = container.querySelector(".progression-circle__progress");

    circle.setProgress(0);
    assertEqual(progress.getAttribute("stroke-dashoffset"), "1");

    circle.setProgress(0.25);
    assertEqual(progress.getAttribute("stroke-dashoffset"), "0.75");

    circle.setProgress(0.5);
    assertEqual(progress.getAttribute("stroke-dashoffset"), "0.5");

    circle.setProgress(1);
    assertEqual(progress.getAttribute("stroke-dashoffset"), "0");
});

test("progression-circle", "rejects invalid progress values", () => {
    const circle = new ProgressionCircle(createContainer());

    assertThrows(() => circle.setProgress(-0.01));
    assertThrows(() => circle.setProgress(1.01));
    assertThrows(() => circle.setProgress(NaN));
    assertThrows(() => circle.setProgress(Infinity));
    assertThrows(() => circle.setProgress("0.5"));
});

test("progression-circle", "renders notches at arbitrary positions", () => {
    const container = createContainer();
    const circle = new ProgressionCircle(container);

    circle.setNotches([
        {
            id: "start",
            position: 0,
        },
        {
            id: "middle",
            position: 0.5,
        },
        {
            id: "custom",
            position: 0.8125,
        },
    ]);

    const notches = container.querySelectorAll(".progression-circle__notch");

    assertEqual(notches.length, 3);

    assertEqual(notches[0].dataset.notchId, "start");
    assertEqual(notches[0].getAttribute("transform"), "rotate(0 50 50)");

    assertEqual(notches[1].dataset.notchId, "middle");
    assertEqual(notches[1].getAttribute("transform"), "rotate(180 50 50)");

    assertEqual(notches[2].dataset.notchId, "custom");
    assertEqual(notches[2].getAttribute("transform"), "rotate(292.5 50 50)");
});

test("progression-circle", "replaces existing notches", () => {
    const container = createContainer();
    const circle = new ProgressionCircle(container);

    circle.setNotches([
        {
            id: "first",
            position: 0,
        },
        {
            id: "second",
            position: 0.5,
        },
    ]);

    circle.setNotches([
        {
            id: "replacement",
            position: 0.25,
        },
    ]);

    const notches = container.querySelectorAll(".progression-circle__notch");

    assertEqual(notches.length, 1);
    assertEqual(notches[0].dataset.notchId, "replacement");
});

test("progression-circle", "rejects invalid notch positions", () => {
    const circle = new ProgressionCircle(createContainer());

    assertThrows(() =>
        circle.setNotches([
            {
                id: "invalid",
                position: -0.1,
            },
        ]),
    );

    assertThrows(() =>
        circle.setNotches([
            {
                id: "invalid",
                position: 1,
            },
        ]),
    );
});

test("progression-circle", "updates interior value text", () => {
    const container = createContainer();
    const circle = new ProgressionCircle(container);

    circle.setValueText("60.0");

    assertEqual(container.querySelector(".progression-circle__value").textContent, "60.0");
});

test("progression-circle", "updates interior label text", () => {
    const container = createContainer();
    const circle = new ProgressionCircle(container);

    circle.setLabelText("RPM");

    assertEqual(container.querySelector(".progression-circle__label").textContent, "RPM");
});

test("progression-circle", "updates visual state", () => {
    const container = createContainer();
    const circle = new ProgressionCircle(container);

    circle.setState("warning");

    assertEqual(container.querySelector(".progression-circle").dataset.state, "warning");

    circle.setState("active");

    assertEqual(container.querySelector(".progression-circle").dataset.state, "active");
});

test("progression-circle", "reuses marker element during hot-path updates", () => {
    const container = createContainer();
    const circle = new ProgressionCircle(container);

    const markerBefore = container.querySelector(".progression-circle__marker");

    circle.setMarkerPosition(0.1);
    circle.setMarkerPosition(0.2);
    circle.setMarkerPosition(0.3);

    const markerAfter = container.querySelector(".progression-circle__marker");

    assertEqual(markerAfter, markerBefore);
});

test("progression-circle", "reuses progress element during hot-path updates", () => {
    const container = createContainer();
    const circle = new ProgressionCircle(container);

    const progressBefore = container.querySelector(".progression-circle__progress");

    circle.setProgress(0.1);
    circle.setProgress(0.2);
    circle.setProgress(0.3);

    const progressAfter = container.querySelector(".progression-circle__progress");

    assertEqual(progressAfter, progressBefore);
});

test("progression-circle", "reuses text elements during hot-path updates", () => {
    const container = createContainer();
    const circle = new ProgressionCircle(container);

    const valueBefore = container.querySelector(".progression-circle__value");
    const labelBefore = container.querySelector(".progression-circle__label");

    circle.setValueText("40.0");
    circle.setValueText("50.0");
    circle.setValueText("60.0");

    circle.setLabelText("RPM");
    circle.setLabelText("Cadence");

    assertEqual(container.querySelector(".progression-circle__value"), valueBefore);

    assertEqual(container.querySelector(".progression-circle__label"), labelBefore);
});

test("progression-circle", "removes its rendered content on destroy", () => {
    const container = createContainer();
    const circle = new ProgressionCircle(container);

    circle.destroy();

    assertEqual(container.querySelector(".progression-circle"), null);
});

test("progression-circle", "starts progress at the top of the circle", () => {
    const container = createContainer();

    new ProgressionCircle(container);

    const progress = container.querySelector(".progression-circle__progress");

    assertEqual(progress.getAttribute("transform"), "rotate(-90 50 50)");
});

test("progression-circle", "hides progress at zero", () => {
    const container = createContainer();
    const circle = new ProgressionCircle(container);

    const progress = container.querySelector(".progression-circle__progress");

    circle.setProgress(0);

    assertEqual(progress.getAttribute("visibility"), "hidden");

    circle.setProgress(0.25);

    assertEqual(progress.getAttribute("visibility"), "visible");
});

test("progression-circle", "renders targets at arbitrary positions", () => {
    const container = createContainer();
    const circle = new ProgressionCircle(container);

    circle.setTargets([
        {
            id: "start",
            position: 0,
        },
        {
            id: "middle",
            position: 0.5,
        },
        {
            id: "custom",
            position: 0.8125,
        },
    ]);

    const targets = container.querySelectorAll(".progression-circle__target");

    assertEqual(targets.length, 3);

    assertEqual(targets[0].dataset.targetId, "start");
    assertEqual(targets[0].getAttribute("transform"), "rotate(0 50 50)");

    assertEqual(targets[1].dataset.targetId, "middle");
    assertEqual(targets[1].getAttribute("transform"), "rotate(180 50 50)");

    assertEqual(targets[2].dataset.targetId, "custom");
    assertEqual(targets[2].getAttribute("transform"), "rotate(292.5 50 50)");
});

test("progression-circle", "replaces existing targets", () => {
    const container = createContainer();
    const circle = new ProgressionCircle(container);

    circle.setTargets([
        {
            id: "first",
            position: 0,
        },
        {
            id: "second",
            position: 0.5,
        },
    ]);

    circle.setTargets([
        {
            id: "replacement",
            position: 0.25,
        },
    ]);

    const targets = container.querySelectorAll(".progression-circle__target");

    assertEqual(targets.length, 1);
    assertEqual(targets[0].dataset.targetId, "replacement");
});

test("progression-circle", "rejects invalid target positions", () => {
    const circle = new ProgressionCircle(createContainer());

    assertThrows(() =>
        circle.setTargets([
            {
                id: "invalid",
                position: -0.1,
            },
        ]),
    );

    assertThrows(() =>
        circle.setTargets([
            {
                id: "invalid",
                position: 1,
            },
        ]),
    );
});
