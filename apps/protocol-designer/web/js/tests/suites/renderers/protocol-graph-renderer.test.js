/**
 * ProtocolGraphRenderer tests:
 * - Verify protocol data renders through the full graph pipeline.
 * - Verify renderer-owned SVG content is created and replaced safely.
 * - Verify empty and non-drawable graph states are handled cleanly.
 * - Verify container dimensions drive rendered SVG geometry.
 */

import {
    assertEqual,
    test,
} from "../../../../../../packages/js-testing/framework/test-framework.js";

import { ProtocolGraphRenderer } from "../../../renderers/protocol-graph-renderer.js";

/** Creates a small stepped-cadence protocol for graph rendering tests. */
function createProtocol() {
    return {
        phases: [
            {
                id: "phase-1",
                name: "Warm-up",
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

/** Creates a two-block protocol for graph structure integration tests. */
function createTwoBlockProtocol() {
    return {
        phases: [
            {
                id: "phase-1",
                name: "Work",
                blocks: [
                    {
                        id: "block-1",
                        durationSeconds: 6,
                        variables: {
                            cadence: {
                                type: "stepped",
                                start: 40,
                                end: 45,
                                step: 5,
                            },
                        },
                    },
                    {
                        id: "block-2",
                        durationSeconds: 6,
                        variables: {
                            cadence: {
                                type: "stepped",
                                start: 45,
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

test("protocol-graph-renderer", "renders protocol graph axis titles", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createProtocol());

    assertEqual(container.querySelector(".graph-axis__title--x").textContent, "Time");

    assertEqual(container.querySelector(".graph-axis__title--y").textContent, "Cadence (RPM)");
});

test("protocol-graph-renderer", "renders protocol phase labels", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createProtocol());

    const labels = container.querySelectorAll(".graph-phase-label");

    assertEqual(labels.length, 1);
    assertEqual(labels[0].textContent, "Warm-up");
});

test("protocol-graph-renderer", "renders one phase region and band per protocol phase", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createProtocol());

    assertEqual(container.querySelectorAll(".graph-phase-region").length, 1);
    assertEqual(container.querySelectorAll(".graph-phase-band").length, 1);
});

test("protocol-graph-renderer", "clears rendered graph content for an empty protocol", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createProtocol());
    renderer.render(createEmptyProtocol());

    assertEqual(container.querySelectorAll(".graph-series__line").length, 0);
    assertEqual(container.querySelectorAll(".graph-phase-region").length, 0);
    assertEqual(container.querySelectorAll(".graph-phase-band").length, 0);
    assertEqual(container.querySelectorAll(".graph-phase-label").length, 0);
    assertEqual(container.querySelectorAll(".graph-phase-boundary").length, 0);
});

test("protocol-graph-renderer", "renders protocol block boundaries", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createTwoBlockProtocol());

    assertEqual(container.querySelectorAll(".graph-block-boundary").length, 1);
});

test("protocol-graph-renderer", "renders selected protocol phase structure", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createTwoBlockProtocol(), {
        selectedPhaseId: "phase-1",
    });

    assertEqual(container.querySelectorAll(".graph-phase-region--selected").length, 1);
    assertEqual(container.querySelectorAll(".graph-phase-band--selected").length, 1);
});

test("protocol-graph-renderer", "renders selected protocol block structure", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createTwoBlockProtocol(), {
        selectedBlockId: "block-2",
    });

    const selectedRegions = container.querySelectorAll(".graph-block-region--selected");

    assertEqual(selectedRegions.length, 1);
    assertEqual(selectedRegions[0].getAttribute("data-block-id"), "block-2");
});

test("protocol-graph-renderer", "renders an empty state when the protocol has no blocks", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createEmptyProtocol());

    const emptyState = container.querySelector(".graph-empty-state");

    assertEqual(emptyState.textContent, "Add a block to preview this protocol");
});

test("protocol-graph-renderer", "removes the empty state when blocks are rendered", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createEmptyProtocol());
    renderer.render(createProtocol());

    assertEqual(container.querySelector(".graph-empty-state"), null);
});
