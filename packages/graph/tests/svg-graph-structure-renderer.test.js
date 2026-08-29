import { assertEqual, assertThrows, test } from "../../js-testing/framework/test-framework.js";

import { GraphLayout } from "../graph-layout.js";
import { SvgGraphStructureRenderer } from "../svg-graph-structure-renderer.js";

/** Creates a test SVG element. */
function createSvg() {
    return document.createElementNS("http://www.w3.org/2000/svg", "svg");
}

/** Creates the default graph layout used by structure-renderer tests. */
function createLayout() {
    return new GraphLayout({
        startTimeMs: 0,
        endTimeMs: 60_000,
        valueMin: 0,
        valueMax: 100,
        widthPx: 800,
        heightPx: 240,
        padding: {
            top: 40,
            right: 20,
            bottom: 40,
            left: 60,
        },
    });
}

/** Creates the default three-phase structure used by renderer tests. */
function createPhases() {
    return [
        {
            id: "warmup",
            label: "Warm-up",
            startTimeMs: 0,
            endTimeMs: 15_000,
        },
        {
            id: "work",
            label: "Work",
            startTimeMs: 15_000,
            endTimeMs: 45_000,
        },
        {
            id: "cooldown",
            label: "Cooldown",
            startTimeMs: 45_000,
            endTimeMs: 60_000,
        },
    ];
}

test("svg-graph-structure-renderer", "creates one renderer-owned structure group", () => {
    const svg = createSvg();

    new SvgGraphStructureRenderer(svg);

    assertEqual(svg.querySelectorAll(".graph-structure").length, 1);
});

test("svg-graph-structure-renderer", "renders internal phase boundaries", () => {
    const svg = createSvg();
    const renderer = new SvgGraphStructureRenderer(svg);

    renderer.render({
        layout: createLayout(),
        phases: createPhases(),
    });

    assertEqual(svg.querySelectorAll(".graph-phase-boundary").length, 2);
});

test("svg-graph-structure-renderer", "maps phase boundaries through the graph layout", () => {
    const svg = createSvg();
    const layout = createLayout();
    const renderer = new SvgGraphStructureRenderer(svg);

    renderer.render({
        layout,
        phases: createPhases(),
    });

    const boundaries = svg.querySelectorAll(".graph-phase-boundary");

    assertEqual(Number(boundaries[0].getAttribute("x1")), layout.xAtTime(15_000));
    assertEqual(Number(boundaries[0].getAttribute("x2")), layout.xAtTime(15_000));

    assertEqual(Number(boundaries[1].getAttribute("x1")), layout.xAtTime(45_000));
    assertEqual(Number(boundaries[1].getAttribute("x2")), layout.xAtTime(45_000));
});

test("svg-graph-structure-renderer", "renders phase boundaries across the plot height", () => {
    const svg = createSvg();
    const layout = createLayout();
    const renderer = new SvgGraphStructureRenderer(svg);

    renderer.render({
        layout,
        phases: createPhases(),
    });

    const boundary = svg.querySelector(".graph-phase-boundary");
    const plot = layout.plot;

    assertEqual(Number(boundary.getAttribute("y1")), plot.top);
    assertEqual(Number(boundary.getAttribute("y2")), plot.bottom);
});

test("svg-graph-structure-renderer", "renders no boundaries for one phase", () => {
    const svg = createSvg();
    const renderer = new SvgGraphStructureRenderer(svg);

    renderer.render({
        layout: createLayout(),
        phases: [
            {
                id: "only-phase",
                label: "Only Phase",
                startTimeMs: 0,
                endTimeMs: 60_000,
            },
        ],
    });

    assertEqual(svg.querySelectorAll(".graph-phase-boundary").length, 0);
});

test("svg-graph-structure-renderer", "renders one phase region per phase", () => {
    const svg = createSvg();
    const renderer = new SvgGraphStructureRenderer(svg);

    renderer.render({
        layout: createLayout(),
        phases: createPhases(),
    });

    assertEqual(svg.querySelectorAll(".graph-phase-region").length, 3);
});

test("svg-graph-structure-renderer", "renders one phase band per phase", () => {
    const svg = createSvg();
    const renderer = new SvgGraphStructureRenderer(svg);

    renderer.render({
        layout: createLayout(),
        phases: createPhases(),
    });

    assertEqual(svg.querySelectorAll(".graph-phase-band").length, 3);
});

test("svg-graph-structure-renderer", "renders one phase label per phase", () => {
    const svg = createSvg();
    const renderer = new SvgGraphStructureRenderer(svg);

    renderer.render({
        layout: createLayout(),
        phases: createPhases(),
    });

    const labels = svg.querySelectorAll(".graph-phase-label");

    assertEqual(labels.length, 3);
    assertEqual(labels[0].textContent, "Warm-up");
    assertEqual(labels[1].textContent, "Work");
    assertEqual(labels[2].textContent, "Cooldown");
});

test("svg-graph-structure-renderer", "maps phase region spans through the graph layout", () => {
    const svg = createSvg();
    const layout = createLayout();
    const renderer = new SvgGraphStructureRenderer(svg);

    renderer.render({
        layout,
        phases: [
            {
                id: "work",
                label: "Work",
                startTimeMs: 15_000,
                endTimeMs: 45_000,
            },
        ],
    });

    const region = svg.querySelector(".graph-phase-region");
    const expectedStart = layout.xAtTime(15_000);
    const expectedEnd = layout.xAtTime(45_000);

    assertEqual(Number(region.getAttribute("x")), expectedStart);
    assertEqual(Number(region.getAttribute("width")), expectedEnd - expectedStart);
});

test("svg-graph-structure-renderer", "renders phase regions across the plot height", () => {
    const svg = createSvg();
    const layout = createLayout();
    const renderer = new SvgGraphStructureRenderer(svg);

    renderer.render({
        layout,
        phases: [
            {
                id: "work",
                label: "Work",
                startTimeMs: 15_000,
                endTimeMs: 45_000,
            },
        ],
    });

    const region = svg.querySelector(".graph-phase-region");
    const plot = layout.plot;

    assertEqual(Number(region.getAttribute("y")), plot.top);
    assertEqual(Number(region.getAttribute("height")), plot.bottom - plot.top);
});

test("svg-graph-structure-renderer", "maps phase bands through the graph layout", () => {
    const svg = createSvg();
    const layout = createLayout();
    const renderer = new SvgGraphStructureRenderer(svg);

    renderer.render({
        layout,
        phases: [
            {
                id: "work",
                label: "Work",
                startTimeMs: 15_000,
                endTimeMs: 45_000,
            },
        ],
    });

    const band = svg.querySelector(".graph-phase-band");
    const expectedStart = layout.xAtTime(15_000);
    const expectedEnd = layout.xAtTime(45_000);

    assertEqual(Number(band.getAttribute("x")), expectedStart);
    assertEqual(Number(band.getAttribute("width")), expectedEnd - expectedStart);
});

test("svg-graph-structure-renderer", "centers phase labels within their phase spans", () => {
    const svg = createSvg();
    const layout = createLayout();
    const renderer = new SvgGraphStructureRenderer(svg);

    renderer.render({
        layout,
        phases: [
            {
                id: "work",
                label: "Work",
                startTimeMs: 15_000,
                endTimeMs: 45_000,
            },
        ],
    });

    const label = svg.querySelector(".graph-phase-label");

    const expectedStart = layout.xAtTime(15_000);
    const expectedEnd = layout.xAtTime(45_000);

    assertEqual(Number(label.getAttribute("x")), (expectedStart + expectedEnd) / 2);
});

test("svg-graph-structure-renderer", "renders indexed phase presentation classes", () => {
    const svg = createSvg();
    const renderer = new SvgGraphStructureRenderer(svg);

    renderer.render({
        layout: createLayout(),
        phases: createPhases(),
    });

    assertEqual(svg.querySelectorAll(".graph-phase-region--0").length, 1);
    assertEqual(svg.querySelectorAll(".graph-phase-region--1").length, 1);
    assertEqual(svg.querySelectorAll(".graph-phase-region--2").length, 1);

    assertEqual(svg.querySelectorAll(".graph-phase-band--0").length, 1);
    assertEqual(svg.querySelectorAll(".graph-phase-band--1").length, 1);
    assertEqual(svg.querySelectorAll(".graph-phase-band--2").length, 1);
});

test("svg-graph-structure-renderer", "renders no phase structure for an empty phase list", () => {
    const svg = createSvg();
    const renderer = new SvgGraphStructureRenderer(svg);

    renderer.render({
        layout: createLayout(),
        phases: [],
    });

    assertEqual(svg.querySelectorAll(".graph-phase-region").length, 0);
    assertEqual(svg.querySelectorAll(".graph-phase-band").length, 0);
    assertEqual(svg.querySelectorAll(".graph-phase-label").length, 0);
    assertEqual(svg.querySelectorAll(".graph-phase-boundary").length, 0);
});

test("svg-graph-structure-renderer", "replaces previous structure content on rerender", () => {
    const svg = createSvg();
    const renderer = new SvgGraphStructureRenderer(svg);

    renderer.render({
        layout: createLayout(),
        phases: createPhases(),
    });

    renderer.render({
        layout: createLayout(),
        phases: [
            {
                id: "single",
                label: "Single",
                startTimeMs: 0,
                endTimeMs: 60_000,
            },
        ],
    });

    assertEqual(svg.querySelectorAll(".graph-phase-region").length, 1);
    assertEqual(svg.querySelectorAll(".graph-phase-band").length, 1);
    assertEqual(svg.querySelectorAll(".graph-phase-label").length, 1);
    assertEqual(svg.querySelectorAll(".graph-phase-boundary").length, 0);
});

test("svg-graph-structure-renderer", "places structure before series content", () => {
    const svg = createSvg();

    const seriesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

    seriesGroup.setAttribute("class", "graph-renderer");
    svg.append(seriesGroup);

    new SvgGraphStructureRenderer(svg);

    const structureGroup = svg.querySelector(".graph-structure");

    assertEqual(structureGroup.nextElementSibling === seriesGroup, true);
});

test("svg-graph-structure-renderer", "rejects non-array phases", () => {
    const svg = createSvg();
    const renderer = new SvgGraphStructureRenderer(svg);

    assertThrows(
        () =>
            renderer.render({
                layout: createLayout(),
                phases: null,
            }),
        /phases must be an array/,
    );
});
