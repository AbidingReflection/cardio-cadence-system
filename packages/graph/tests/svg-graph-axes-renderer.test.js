/**
 * SvgGraphAxesRenderer tests:
 * - Verify renderer-owned axis SVG content is created and replaced safely.
 * - Verify y ticks are mapped through GraphLayout geometry.
 * - Verify grid lines, tick marks, and labels are rendered consistently.
 * - Verify custom tick formatting and invalid inputs are handled correctly.
 */

import { assertEqual, assertThrows, test } from "../../js-testing/framework/test-framework.js";

import { GraphLayout } from "../graph-layout.js";
import { SvgGraphAxesRenderer } from "../svg-graph-axes-renderer.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Creates a test SVG element. */
function createSvg() {
    return document.createElementNS(SVG_NAMESPACE, "svg");
}

/** Creates the default graph layout used by axis tests. */
function createLayout() {
    return new GraphLayout({
        startTimeMs: 0,
        endTimeMs: 60_000,
        valueMin: 0,
        valueMax: 20,
        widthPx: 400,
        heightPx: 200,
        padding: {
            top: 20,
            right: 20,
            bottom: 20,
            left: 40,
        },
    });
}

test("svg-graph-axes-renderer", "creates one renderer-owned axis group", () => {
    const svg = createSvg();

    new SvgGraphAxesRenderer(svg);

    assertEqual(svg.children.length, 1);
    assertEqual(svg.children[0].getAttribute("class"), "graph-axes");
});

test("svg-graph-axes-renderer", "renders one grid line per y tick", () => {
    const svg = createSvg();
    const renderer = new SvgGraphAxesRenderer(svg);

    renderer.render({
        layout: createLayout(),
        yTicks: [0, 5, 10, 15, 20],
    });

    assertEqual(svg.querySelectorAll(".graph-grid__line--horizontal").length, 5);
});

test("svg-graph-axes-renderer", "renders one y tick mark per y tick", () => {
    const svg = createSvg();
    const renderer = new SvgGraphAxesRenderer(svg);

    renderer.render({
        layout: createLayout(),
        yTicks: [0, 5, 10, 15, 20],
    });

    assertEqual(svg.querySelectorAll(".graph-axis__tick--y").length, 5);
});

test("svg-graph-axes-renderer", "renders one y label per y tick", () => {
    const svg = createSvg();
    const renderer = new SvgGraphAxesRenderer(svg);

    renderer.render({
        layout: createLayout(),
        yTicks: [0, 5, 10, 15, 20],
    });

    const labels = svg.querySelectorAll(".graph-axis__label--y");

    assertEqual(labels.length, 5);
    assertEqual(labels[0].textContent, "0");
    assertEqual(labels[4].textContent, "20");
});

test("svg-graph-axes-renderer", "maps y tick positions through the graph layout", () => {
    const svg = createSvg();
    const layout = createLayout();
    const renderer = new SvgGraphAxesRenderer(svg);

    renderer.render({
        layout,
        yTicks: [0, 10, 20],
    });

    const labels = svg.querySelectorAll(".graph-axis__label--y");

    assertEqual(Number(labels[0].getAttribute("y")), layout.yAtValue(0));
    assertEqual(Number(labels[1].getAttribute("y")), layout.yAtValue(10));
    assertEqual(Number(labels[2].getAttribute("y")), layout.yAtValue(20));
});

test("svg-graph-axes-renderer", "renders grid lines across the plot width", () => {
    const svg = createSvg();
    const layout = createLayout();
    const renderer = new SvgGraphAxesRenderer(svg);

    renderer.render({
        layout,
        yTicks: [10],
    });

    const line = svg.querySelector(".graph-grid__line--horizontal");
    const plot = layout.plot;

    assertEqual(Number(line.getAttribute("x1")), plot.left);
    assertEqual(Number(line.getAttribute("x2")), plot.right);
});

test("svg-graph-axes-renderer", "renders y tick marks at the plot left edge", () => {
    const svg = createSvg();
    const layout = createLayout();
    const renderer = new SvgGraphAxesRenderer(svg);

    renderer.render({
        layout,
        yTicks: [10],
    });

    const tick = svg.querySelector(".graph-axis__tick--y");
    const plot = layout.plot;

    assertEqual(Number(tick.getAttribute("x2")), plot.left);
    assertEqual(Number(tick.getAttribute("x1")), plot.left - 4);
});

test("svg-graph-axes-renderer", "uses custom y tick formatting", () => {
    const svg = createSvg();
    const renderer = new SvgGraphAxesRenderer(svg);

    renderer.render({
        layout: createLayout(),
        yTicks: [10, 20],
        formatYTick: (value) => `${value} RPM`,
    });

    const labels = svg.querySelectorAll(".graph-axis__label--y");

    assertEqual(labels[0].textContent, "10 RPM");
    assertEqual(labels[1].textContent, "20 RPM");
});

test("svg-graph-axes-renderer", "replaces previous axis content on rerender", () => {
    const svg = createSvg();
    const renderer = new SvgGraphAxesRenderer(svg);

    renderer.render({
        layout: createLayout(),
        yTicks: [0, 10, 20],
    });

    renderer.render({
        layout: createLayout(),
        yTicks: [5, 15],
    });

    assertEqual(svg.querySelectorAll(".graph-grid__line--horizontal").length, 2);
    assertEqual(svg.querySelectorAll(".graph-axis__tick--y").length, 2);
    assertEqual(svg.querySelectorAll(".graph-axis__label--y").length, 2);
});

test("svg-graph-axes-renderer", "preserves unrelated SVG content", () => {
    const svg = createSvg();

    const existing = document.createElementNS(SVG_NAMESPACE, "circle");
    existing.setAttribute("class", "existing-content");
    svg.append(existing);

    const renderer = new SvgGraphAxesRenderer(svg);

    renderer.render({
        layout: createLayout(),
        yTicks: [0, 10, 20],
    });

    assertEqual(svg.querySelector(".existing-content") === existing, true);
});

test("svg-graph-axes-renderer", "places the axis group before existing SVG content", () => {
    const svg = createSvg();

    const existing = document.createElementNS(SVG_NAMESPACE, "g");
    existing.setAttribute("class", "graph-renderer");
    svg.append(existing);

    new SvgGraphAxesRenderer(svg);

    assertEqual(svg.children[0].getAttribute("class"), "graph-axes");
    assertEqual(svg.children[1].getAttribute("class"), "graph-renderer");
});

test("svg-graph-axes-renderer", "renders baselines without y ticks", () => {
    const svg = createSvg();
    const renderer = new SvgGraphAxesRenderer(svg);

    renderer.render({
        layout: createLayout(),
        yTicks: [],
    });

    assertEqual(svg.querySelectorAll(".graph-axis__line").length, 2);
    assertEqual(svg.querySelectorAll(".graph-grid__line--horizontal").length, 0);
    assertEqual(svg.querySelectorAll(".graph-axis__tick--y").length, 0);
    assertEqual(svg.querySelectorAll(".graph-axis__label--y").length, 0);
});

test("svg-graph-axes-renderer", "rejects non-array y ticks", () => {
    const svg = createSvg();
    const renderer = new SvgGraphAxesRenderer(svg);

    assertThrows(
        () =>
            renderer.render({
                layout: createLayout(),
                yTicks: "0,10,20",
            }),
        /yTicks must be an array/,
    );
});

test("svg-graph-axes-renderer", "rejects a non-function y tick formatter", () => {
    const svg = createSvg();
    const renderer = new SvgGraphAxesRenderer(svg);

    assertThrows(
        () =>
            renderer.render({
                layout: createLayout(),
                yTicks: [0, 10, 20],
                formatYTick: "invalid",
            }),
        /formatYTick must be a function/,
    );
});

test("svg-graph-axes-renderer", "renders the y-axis baseline", () => {
    const svg = createSvg();
    const layout = createLayout();
    const renderer = new SvgGraphAxesRenderer(svg);

    renderer.render({
        layout,
        yTicks: [0, 10, 20],
    });

    const line = svg.querySelector(".graph-axis__line--y");
    const plot = layout.plot;

    assertEqual(Number(line.getAttribute("x1")), plot.left);
    assertEqual(Number(line.getAttribute("x2")), plot.left);
    assertEqual(Number(line.getAttribute("y1")), plot.top);
    assertEqual(Number(line.getAttribute("y2")), plot.bottom);
});

test("svg-graph-axes-renderer", "renders the x-axis baseline", () => {
    const svg = createSvg();
    const layout = createLayout();
    const renderer = new SvgGraphAxesRenderer(svg);

    renderer.render({
        layout,
        yTicks: [0, 10, 20],
    });

    const line = svg.querySelector(".graph-axis__line--x");
    const plot = layout.plot;

    assertEqual(Number(line.getAttribute("x1")), plot.left);
    assertEqual(Number(line.getAttribute("x2")), plot.right);
    assertEqual(Number(line.getAttribute("y1")), plot.bottom);
    assertEqual(Number(line.getAttribute("y2")), plot.bottom);
});
