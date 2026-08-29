import { assertEqual, test } from "../../js-testing/framework/test-framework.js";
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
            top: 20,
            right: 20,
            bottom: 40,
            left: 60,
        },
    });
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
        phaseRanges: [
            {
                id: "warmup",
                startTimeMs: 0,
                endTimeMs: 15_000,
            },
            {
                id: "work",
                startTimeMs: 15_000,
                endTimeMs: 45_000,
            },
            {
                id: "cooldown",
                startTimeMs: 45_000,
                endTimeMs: 60_000,
            },
        ],
    });

    assertEqual(svg.querySelectorAll(".graph-phase-boundary").length, 2);
});

test("svg-graph-structure-renderer", "maps phase boundaries through the graph layout", () => {
    const svg = createSvg();
    const layout = createLayout();
    const renderer = new SvgGraphStructureRenderer(svg);

    renderer.render({
        layout,
        phaseRanges: [
            {
                id: "warmup",
                startTimeMs: 0,
                endTimeMs: 15_000,
            },
            {
                id: "work",
                startTimeMs: 15_000,
                endTimeMs: 45_000,
            },
        ],
    });

    const boundary = svg.querySelector(".graph-phase-boundary");
    const expectedX = layout.xAtTime(15_000);

    assertEqual(Number(boundary.getAttribute("x1")), expectedX);
    assertEqual(Number(boundary.getAttribute("x2")), expectedX);
});

test("svg-graph-structure-renderer", "renders phase boundaries across the plot height", () => {
    const svg = createSvg();
    const layout = createLayout();
    const renderer = new SvgGraphStructureRenderer(svg);

    renderer.render({
        layout,
        phaseRanges: [
            {
                id: "warmup",
                startTimeMs: 0,
                endTimeMs: 15_000,
            },
            {
                id: "work",
                startTimeMs: 15_000,
                endTimeMs: 45_000,
            },
        ],
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
        phaseRanges: [
            {
                id: "only-phase",
                startTimeMs: 0,
                endTimeMs: 60_000,
            },
        ],
    });

    assertEqual(svg.querySelectorAll(".graph-phase-boundary").length, 0);
});

test("svg-graph-structure-renderer", "replaces previous structure content on rerender", () => {
    const svg = createSvg();
    const renderer = new SvgGraphStructureRenderer(svg);

    renderer.render({
        layout: createLayout(),
        phaseRanges: [
            { id: "a", startTimeMs: 0, endTimeMs: 20_000 },
            { id: "b", startTimeMs: 20_000, endTimeMs: 40_000 },
            { id: "c", startTimeMs: 40_000, endTimeMs: 60_000 },
        ],
    });

    renderer.render({
        layout: createLayout(),
        phaseRanges: [
            { id: "a", startTimeMs: 0, endTimeMs: 30_000 },
            { id: "b", startTimeMs: 30_000, endTimeMs: 60_000 },
        ],
    });

    assertEqual(svg.querySelectorAll(".graph-phase-boundary").length, 1);
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
