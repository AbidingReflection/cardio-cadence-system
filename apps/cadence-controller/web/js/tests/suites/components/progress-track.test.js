import {
    assert,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { ProgressTrack } from "../../../components/progress-track.js";

/** Creates a host element for ProgressTrack tests. */
function createContainer() {
    return document.createElement("div");
}

test("progress-track", "creates the persistent track structure", () => {
    const container = createContainer();

    new ProgressTrack(container);

    const root = container.querySelector(".progress-track");
    const svg = container.querySelector(".progress-track__svg");

    assert(root instanceof HTMLElement);
    assert(svg instanceof SVGElement);

    assert(container.querySelector(".progress-track__track") instanceof SVGElement);
    assert(container.querySelector(".progress-track__progress") instanceof SVGElement);
    assert(container.querySelector(".progress-track__ticks") instanceof HTMLElement);
    assert(container.querySelector(".progress-track__marker") instanceof SVGElement);

    assert(container.querySelector(".progress-track__marker-text") instanceof HTMLElement);

    assert(container.querySelector(".progress-track__tick-labels") instanceof HTMLElement);
});

test("progress-track", "uses a normalized horizontal view box", () => {
    const container = createContainer();

    new ProgressTrack(container);

    const svg = container.querySelector(".progress-track__svg");

    assertEqual(svg.getAttribute("viewBox"), "0 0 100 30");
    assertEqual(svg.getAttribute("preserveAspectRatio"), "none");
});

test("progress-track", "positions marker across normalized track range", () => {
    const container = createContainer();
    const track = new ProgressTrack(container);

    const marker = container.querySelector(".progress-track__marker");

    track.setMarkerPosition(0);
    assertEqual(marker.getAttribute("transform"), "translate(5 0)");

    track.setMarkerPosition(0.25);
    assertEqual(marker.getAttribute("transform"), "translate(27.5 0)");

    track.setMarkerPosition(0.5);
    assertEqual(marker.getAttribute("transform"), "translate(50 0)");

    assertEqual(container.querySelector(".progress-track__marker-text").style.left, "50%");

    track.setMarkerPosition(1);
    assertEqual(container.querySelector(".progress-track__marker-text").style.left, "95%");
    assertEqual(marker.getAttribute("transform"), "translate(95 0)");
});

test("progress-track", "rejects invalid marker positions", () => {
    const track = new ProgressTrack(createContainer());

    assertThrows(() => track.setMarkerPosition(-0.01));
    assertThrows(() => track.setMarkerPosition(1.01));
    assertThrows(() => track.setMarkerPosition(NaN));
    assertThrows(() => track.setMarkerPosition(Infinity));
    assertThrows(() => track.setMarkerPosition("0.5"));
});

test("progress-track", "renders normalized progress", () => {
    const container = createContainer();
    const track = new ProgressTrack(container);

    const progress = container.querySelector(".progress-track__progress");

    track.setProgress(0);
    assertEqual(progress.getAttribute("x2"), "5");

    track.setProgress(0.25);
    assertEqual(progress.getAttribute("x2"), "27.5");

    track.setProgress(0.5);
    assertEqual(progress.getAttribute("x2"), "50");

    track.setProgress(1);
    assertEqual(progress.getAttribute("x2"), "95");
});

test("progress-track", "rejects invalid progress values", () => {
    const track = new ProgressTrack(createContainer());

    assertThrows(() => track.setProgress(-0.01));
    assertThrows(() => track.setProgress(1.01));
    assertThrows(() => track.setProgress(NaN));
    assertThrows(() => track.setProgress(Infinity));
    assertThrows(() => track.setProgress("0.5"));
});

test("progress-track", "updates marker text", () => {
    const container = createContainer();
    const track = new ProgressTrack(container);

    track.setMarkerText("13:23");

    assertEqual(container.querySelector(".progress-track__marker-text").textContent, "13:23");
});

test("progress-track", "renders ticks at arbitrary positions", () => {
    const container = createContainer();
    const track = new ProgressTrack(container);

    track.setTicks([
        {
            id: "start",
            position: 0,
        },
        {
            id: "middle",
            position: 0.5,
            label: "Primary",
        },
        {
            id: "end",
            position: 1,
            label: "End",
        },
    ]);

    const ticks = container.querySelectorAll(".progress-track__tick");

    assertEqual(ticks.length, 3);

    assertEqual(ticks[0].dataset.tickId, "start");
    assertEqual(ticks[0].style.left, "5%");

    assertEqual(ticks[1].dataset.tickId, "middle");
    assertEqual(ticks[1].style.left, "50%");

    assertEqual(ticks[2].dataset.tickId, "end");
    assertEqual(ticks[2].style.left, "95%");

    const tickMarkers = container.querySelectorAll(".progress-track__tick-marker");

    assertEqual(tickMarkers.length, 3);
    assert(tickMarkers[0] instanceof HTMLElement);
});

test("progress-track", "renders optional tick labels outside the SVG", () => {
    const container = createContainer();
    const track = new ProgressTrack(container);

    track.setTicks([
        {
            id: "unlabeled",
            position: 0.25,
        },
        {
            id: "labeled",
            position: 0.75,
            label: "Cool-down",
        },
    ]);

    const labels = container.querySelectorAll(".progress-track__tick-label");

    assertEqual(labels.length, 1);
    assertEqual(labels[0].dataset.tickId, "labeled");
    assertEqual(labels[0].textContent, "Cool-down");
    assertEqual(labels[0].style.left, "72.5%");
});

test("progress-track", "replaces existing ticks", () => {
    const container = createContainer();
    const track = new ProgressTrack(container);

    track.setTicks([
        {
            id: "first",
            position: 0.25,
        },
        {
            id: "second",
            position: 0.75,
        },
    ]);

    track.setTicks([
        {
            id: "replacement",
            position: 0.5,
        },
    ]);

    const ticks = container.querySelectorAll(".progress-track__tick");

    assertEqual(ticks.length, 1);
    assertEqual(ticks[0].dataset.tickId, "replacement");
});

test("progress-track", "rejects invalid tick positions", () => {
    const track = new ProgressTrack(createContainer());

    assertThrows(() =>
        track.setTicks([
            {
                id: "invalid",
                position: -0.1,
            },
        ]),
    );

    assertThrows(() =>
        track.setTicks([
            {
                id: "invalid",
                position: 1.1,
            },
        ]),
    );
});

test("progress-track", "updates visual state", () => {
    const container = createContainer();
    const track = new ProgressTrack(container);

    track.setState("warning");

    assertEqual(container.querySelector(".progress-track").dataset.state, "warning");

    track.setState("active");

    assertEqual(container.querySelector(".progress-track").dataset.state, "active");
});

test("progress-track", "reuses marker element during hot-path updates", () => {
    const container = createContainer();
    const track = new ProgressTrack(container);

    const markerBefore = container.querySelector(".progress-track__marker");

    track.setMarkerPosition(0.1);
    track.setMarkerPosition(0.2);
    track.setMarkerPosition(0.3);

    const markerAfter = container.querySelector(".progress-track__marker");

    assertEqual(markerAfter, markerBefore);
});

test("progress-track", "reuses progress element during hot-path updates", () => {
    const container = createContainer();
    const track = new ProgressTrack(container);

    const progressBefore = container.querySelector(".progress-track__progress");

    track.setProgress(0.1);
    track.setProgress(0.2);
    track.setProgress(0.3);

    const progressAfter = container.querySelector(".progress-track__progress");

    assertEqual(progressAfter, progressBefore);
});

test("progress-track", "reuses marker text during hot-path updates", () => {
    const container = createContainer();
    const track = new ProgressTrack(container);

    const textBefore = container.querySelector(".progress-track__marker-text");

    track.setMarkerText("1:00");
    track.setMarkerText("2:00");
    track.setMarkerText("3:00");

    const textAfter = container.querySelector(".progress-track__marker-text");

    assertEqual(textAfter, textBefore);
});

test("progress-track", "removes its rendered content on destroy", () => {
    const container = createContainer();
    const track = new ProgressTrack(container);

    track.destroy();

    assertEqual(container.querySelector(".progress-track"), null);
});

test("progress-track", "keeps text outside the stretched SVG", () => {
    const container = createContainer();

    new ProgressTrack(container);

    const svg = container.querySelector(".progress-track__svg");

    const markerText = container.querySelector(".progress-track__marker-text");

    const tickLabels = container.querySelector(".progress-track__tick-labels");

    assertEqual(svg.contains(markerText), false);
    assertEqual(svg.contains(tickLabels), false);
});
