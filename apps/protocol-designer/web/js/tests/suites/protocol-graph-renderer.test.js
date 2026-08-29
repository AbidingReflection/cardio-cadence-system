/**
 * ProtocolGraphRenderer tests:
 * - Verify protocol data renders through the full graph pipeline.
 * - Verify renderer-owned SVG content is created and replaced safely.
 * - Verify empty and non-drawable graph states are handled cleanly.
 * - Verify container dimensions drive rendered SVG geometry.
 */

import { assertEqual, test } from "../../../../../packages/js-testing/framework/test-framework.js";

import { ProtocolGraphRenderer } from "../../renderers/protocol-graph-renderer.js";

/** Creates a small stepped-cadence protocol for graph rendering tests. */
function createProtocol() {
    return {
        phases: [
            {
                id: "phase-1",
                blocks: [
                    {
                        id: "block-1",
                        durationSeconds: 12,
                        variables: {
                            cadence: {
                                type: "stepped",
                                start: 40,
                                end: 50,
                                step: 5,
                            },
                        },
                    },
                ],
            },
        ],
    };
}

/** Creates an empty protocol fixture. */
function createEmptyProtocol() {
    return {
        phases: [],
    };
}

/** Creates a graph container with configurable dimensions. */
function createContainer(widthPx = 800, heightPx = 240) {
    const container = document.createElement("div");

    Object.defineProperty(container, "clientWidth", {
        configurable: true,
        value: widthPx,
    });

    Object.defineProperty(container, "clientHeight", {
        configurable: true,
        value: heightPx,
    });

    return container;
}

/** Creates the default cadence graph renderer used by the tests. */
function createRenderer(container) {
    return new ProtocolGraphRenderer({
        container,
        variableId: "cadence",
        label: "Cadence",
        unit: "RPM",
        valueMin: 30,
        valueMax: 80,
    });
}

test("protocol-graph-renderer", "creates one renderer-owned SVG", () => {
    const container = createContainer();

    createRenderer(container);

    assertEqual(container.children.length, 1);
    assertEqual(container.children[0].tagName.toLowerCase(), "svg");
});

test("protocol-graph-renderer", "renders stepped protocol data into SVG paths", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createProtocol());

    const paths = container.querySelectorAll(".graph-series__line");

    assertEqual(paths.length, 1);

    const pathData = paths[0].getAttribute("d");

    assertEqual(pathData.includes("L"), true);
});

test("protocol-graph-renderer", "preserves stepped vertical transitions", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createProtocol());

    const path = container.querySelector(".graph-series__line");
    const pathData = path.getAttribute("d");

    const coordinatePairs = pathData
        .split(/[ML] /)
        .filter((value) => value.length > 0)
        .map((value) => {
            const [x, y] = value.trim().split(" ").map(Number);

            return { x, y };
        });

    const hasVerticalTransition = coordinatePairs.some(
        (point, index) =>
            index > 0 &&
            point.x === coordinatePairs[index - 1].x &&
            point.y !== coordinatePairs[index - 1].y,
    );

    assertEqual(hasVerticalTransition, true);
});

test("protocol-graph-renderer", "uses current container dimensions for the viewBox", () => {
    const container = createContainer(900, 300);
    const renderer = createRenderer(container);

    renderer.render(createProtocol());

    const svg = container.querySelector("svg");

    assertEqual(svg.getAttribute("viewBox"), "0 0 900 300");
});

test("protocol-graph-renderer", "clears rendered paths for an empty protocol", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createProtocol());

    assertEqual(container.querySelectorAll(".graph-series__line").length, 1);

    renderer.render(createEmptyProtocol());

    assertEqual(container.querySelectorAll(".graph-series__line").length, 0);
});

test("protocol-graph-renderer", "does not render when container width is zero", () => {
    const container = createContainer(0, 240);
    const renderer = createRenderer(container);

    renderer.render(createProtocol());

    assertEqual(container.querySelectorAll(".graph-series__line").length, 0);
});

test("protocol-graph-renderer", "does not render when container height is zero", () => {
    const container = createContainer(800, 0);
    const renderer = createRenderer(container);

    renderer.render(createProtocol());

    assertEqual(container.querySelectorAll(".graph-series__line").length, 0);
});

test(
    "protocol-graph-renderer",
    "does not render when resolved margins leave no drawable height",
    () => {
        const container = createContainer(800, 16);
        const renderer = createRenderer(container);

        renderer.render(createProtocol());

        assertEqual(container.querySelectorAll(".graph-series__line").length, 0);

        renderer.destroy();
    },
);

test("protocol-graph-renderer", "replaces previous rendered geometry on rerender", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createProtocol());

    const firstPath = container.querySelector(".graph-series__line");
    const firstPathData = firstPath.getAttribute("d");

    const updatedProtocol = createProtocol();

    updatedProtocol.phases[0].blocks[0].variables.cadence = {
        type: "stepped",
        start: 50,
        end: 60,
        step: 5,
    };

    renderer.render(updatedProtocol);

    const paths = container.querySelectorAll(".graph-series__line");

    assertEqual(paths.length, 1);
    assertEqual(paths[0].getAttribute("d") === firstPathData, false);
});
