import { assertEqual, assertThrows, test } from "../../js-testing/framework/test-framework.js";

import { SvgGraphRenderer } from "../svg-graph-renderer.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Creates an empty SVG element for renderer tests. */
function createSvg() {
    return document.createElementNS(SVG_NAMESPACE, "svg");
}

test("svg-graph-renderer", "creates one renderer-owned group", () => {
    const svg = createSvg();

    new SvgGraphRenderer(svg);

    assertEqual(svg.children.length, 1);
    assertEqual(svg.children[0].tagName.toLowerCase(), "g");
    assertEqual(svg.children[0].getAttribute("class"), "graph-renderer");
});

test("svg-graph-renderer", "renders one defined run as one path", () => {
    const svg = createSvg();
    const renderer = new SvgGraphRenderer(svg);

    renderer.render({
        points: [
            { x: 60, y: 190 },
            { x: 400, y: 115 },
            { x: 740, y: 40 },
        ],
    });

    const group = svg.querySelector(".graph-renderer");
    const paths = group.querySelectorAll("path");

    assertEqual(paths.length, 1);
    assertEqual(paths[0].getAttribute("class"), "graph-series__line");
    assertEqual(paths[0].getAttribute("d"), "M 60 190 L 400 115 L 740 40");
});

test("svg-graph-renderer", "preserves duplicate coordinates at discontinuities", () => {
    const svg = createSvg();
    const renderer = new SvgGraphRenderer(svg);

    renderer.render({
        points: [
            { x: 60, y: 190 },
            { x: 400, y: 130 },
            { x: 400, y: 100 },
            { x: 740, y: 40 },
        ],
    });

    const path = svg.querySelector(".graph-series__line");

    assertEqual(path.getAttribute("d"), "M 60 190 L 400 130 L 400 100 L 740 40");
});

test("svg-graph-renderer", "splits paths across undefined samples", () => {
    const svg = createSvg();
    const renderer = new SvgGraphRenderer(svg);

    renderer.render({
        points: [
            { x: 60, y: 190 },
            { x: 200, y: 150 },
            { x: 300, y: undefined },
            { x: 500, y: 100 },
            { x: 740, y: 40 },
        ],
    });

    const paths = svg.querySelectorAll(".graph-series__line");

    assertEqual(paths.length, 2);
    assertEqual(paths[0].getAttribute("d"), "M 60 190 L 200 150");
    assertEqual(paths[1].getAttribute("d"), "M 500 100 L 740 40");
});

test("svg-graph-renderer", "replaces previous rendered content", () => {
    const svg = createSvg();
    const renderer = new SvgGraphRenderer(svg);

    renderer.render({
        points: [
            { x: 60, y: 190 },
            { x: 400, y: 115 },
        ],
    });

    renderer.render({
        points: [
            { x: 100, y: 180 },
            { x: 700, y: 50 },
        ],
    });

    const paths = svg.querySelectorAll(".graph-series__line");

    assertEqual(paths.length, 1);
    assertEqual(paths[0].getAttribute("d"), "M 100 180 L 700 50");
});

test("svg-graph-renderer", "preserves non-renderer SVG content", () => {
    const svg = createSvg();

    const existingGroup = document.createElementNS(SVG_NAMESPACE, "g");
    existingGroup.setAttribute("class", "existing-layer");
    svg.append(existingGroup);

    const renderer = new SvgGraphRenderer(svg);

    renderer.render({
        points: [
            { x: 60, y: 190 },
            { x: 740, y: 40 },
        ],
    });

    assertEqual(svg.querySelectorAll(".existing-layer").length, 1);
    assertEqual(svg.querySelectorAll(".graph-renderer").length, 1);
});

test("svg-graph-renderer", "renders no paths for entirely undefined data", () => {
    const svg = createSvg();
    const renderer = new SvgGraphRenderer(svg);

    renderer.render({
        points: [
            { x: 60, y: undefined },
            { x: 400, y: undefined },
            { x: 740, y: undefined },
        ],
    });

    assertEqual(svg.querySelectorAll(".graph-series__line").length, 0);
});

test("svg-graph-renderer", "rejects non-array point input", () => {
    const svg = createSvg();
    const renderer = new SvgGraphRenderer(svg);

    assertThrows(
        () =>
            renderer.render({
                points: null,
            }),
        /points must be an array/,
    );
});
