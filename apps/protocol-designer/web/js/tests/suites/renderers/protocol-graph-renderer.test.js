import {
    assert,
    assertEqual,
    test,
} from "../../../../../../packages/js-testing/framework/test-framework.js";

import { ProtocolGraphRenderer } from "../../../renderers/protocol-graph-renderer.js";

const CADENCE_GRAPH_CONFIG = {
    variableId: "cadence",
    label: "Cadence",
    unit: "RPM",
    valueMin: 30,
    valueMax: 80,
};

const resizeObserverCallbacks = new Map();

globalThis.ResizeObserver = class {
    #callback;
    #observedElement;

    constructor(callback) {
        this.#callback = callback;
    }

    observe(element) {
        this.#observedElement = element;
        resizeObserverCallbacks.set(element, this.#callback);
    }

    disconnect() {
        if (this.#observedElement !== undefined) {
            resizeObserverCallbacks.delete(this.#observedElement);
        }
    }
};

/** Triggers the ResizeObserver callback registered for a graph container. */
function triggerResizeObserver(container, { width, height }) {
    const callback = resizeObserverCallbacks.get(container);

    if (callback === undefined) {
        throw new Error("No ResizeObserver callback is registered for the container.");
    }

    callback([
        {
            contentRect: {
                width,
                height,
            },
        },
    ]);
}

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

/** Creates a small steady-speed protocol for graph reconfiguration tests. */
function createSpeedProtocol() {
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
                            speed: {
                                type: "steady",
                                start: 5,
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

/** Creates the graph renderer used by the tests. */
function createRenderer(container) {
    return new ProtocolGraphRenderer({
        container,
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

    renderer.render(createProtocol(), {}, CADENCE_GRAPH_CONFIG);

    const paths = container.querySelectorAll(".graph-series__line");

    assertEqual(paths.length, 1);

    const pathData = paths[0].getAttribute("d");

    assertEqual(pathData.includes("L"), true);
});

test("protocol-graph-renderer", "preserves stepped vertical transitions", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createProtocol(), {}, CADENCE_GRAPH_CONFIG);

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

    renderer.render(createProtocol(), {}, CADENCE_GRAPH_CONFIG);

    const svg = container.querySelector("svg");

    assertEqual(svg.getAttribute("viewBox"), "0 0 900 300");
});

test("protocol-graph-renderer", "does not render when container width is zero", () => {
    const container = createContainer(0, 240);
    const renderer = createRenderer(container);

    renderer.render(createProtocol(), {}, CADENCE_GRAPH_CONFIG);

    assertEqual(container.querySelectorAll(".graph-series__line").length, 0);
});

test("protocol-graph-renderer", "does not render when container height is zero", () => {
    const container = createContainer(800, 0);
    const renderer = createRenderer(container);

    renderer.render(createProtocol(), {}, CADENCE_GRAPH_CONFIG);

    assertEqual(container.querySelectorAll(".graph-series__line").length, 0);
});

test(
    "protocol-graph-renderer",
    "does not render when resolved margins leave no drawable height",
    () => {
        const container = createContainer(800, 16);
        const renderer = createRenderer(container);

        renderer.render(createProtocol(), {}, CADENCE_GRAPH_CONFIG);

        assertEqual(container.querySelectorAll(".graph-series__line").length, 0);

        renderer.destroy();
    },
);

test("protocol-graph-renderer", "replaces previous rendered geometry on rerender", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createProtocol(), {}, CADENCE_GRAPH_CONFIG);

    const firstPath = container.querySelector(".graph-series__line");
    const firstPathData = firstPath.getAttribute("d");

    const updatedProtocol = createProtocol();

    updatedProtocol.phases[0].blocks[0].variables.cadence = {
        type: "stepped",
        start: 50,
        end: 60,
        step: 5,
    };

    renderer.render(updatedProtocol, {}, CADENCE_GRAPH_CONFIG);

    const paths = container.querySelectorAll(".graph-series__line");

    assertEqual(paths.length, 1);
    assertEqual(paths[0].getAttribute("d") === firstPathData, false);
});

test("protocol-graph-renderer", "renders protocol graph axis titles", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createProtocol(), {}, CADENCE_GRAPH_CONFIG);

    assertEqual(container.querySelector(".graph-axis__title--x").textContent, "Time");

    assertEqual(container.querySelector(".graph-axis__title--y").textContent, "Cadence (RPM)");
});

test("protocol-graph-renderer", "uses latest graph configuration on rerender", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createProtocol(), {}, CADENCE_GRAPH_CONFIG);

    assertEqual(container.querySelector(".graph-axis__title--y").textContent, "Cadence (RPM)");

    renderer.render(
        createSpeedProtocol(),
        {},
        {
            variableId: "speed",
            label: "Speed",
            unit: "MPH",
            valueMin: 0,
            valueMax: 10,
        },
    );

    assertEqual(container.querySelector(".graph-axis__title--y").textContent, "Speed (MPH)");
    assertEqual(container.querySelectorAll(".graph-series__line").length, 1);
});

test("protocol-graph-renderer", "renders protocol phase labels", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createProtocol(), {}, CADENCE_GRAPH_CONFIG);

    const labels = container.querySelectorAll(".graph-phase-label");

    assertEqual(labels.length, 1);
    assertEqual(labels[0].textContent, "Warm-up");
});

test("protocol-graph-renderer", "renders one phase region and band per protocol phase", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createProtocol(), {}, CADENCE_GRAPH_CONFIG);

    assertEqual(container.querySelectorAll(".graph-phase-region").length, 1);
    assertEqual(container.querySelectorAll(".graph-phase-band").length, 1);
});

test("protocol-graph-renderer", "clears rendered graph content for an empty protocol", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createProtocol(), {}, CADENCE_GRAPH_CONFIG);
    renderer.render(createEmptyProtocol(), {}, CADENCE_GRAPH_CONFIG);

    assertEqual(container.querySelectorAll(".graph-series__line").length, 0);
    assertEqual(container.querySelectorAll(".graph-phase-region").length, 0);
    assertEqual(container.querySelectorAll(".graph-phase-band").length, 0);
    assertEqual(container.querySelectorAll(".graph-phase-label").length, 0);
    assertEqual(container.querySelectorAll(".graph-phase-boundary").length, 0);
});

test("protocol-graph-renderer", "renders protocol block boundaries", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createTwoBlockProtocol(), {}, CADENCE_GRAPH_CONFIG);

    assertEqual(container.querySelectorAll(".graph-block-boundary").length, 1);
});

test("protocol-graph-renderer", "renders selected protocol phase structure", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(
        createTwoBlockProtocol(),
        {
            selectedPhaseId: "phase-1",
        },
        CADENCE_GRAPH_CONFIG,
    );

    assertEqual(container.querySelectorAll(".graph-phase-region--selected").length, 1);
    assertEqual(container.querySelectorAll(".graph-phase-band--selected").length, 1);
});

test("protocol-graph-renderer", "renders selected protocol block structure", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(
        createTwoBlockProtocol(),
        {
            selectedBlockId: "block-2",
        },
        CADENCE_GRAPH_CONFIG,
    );

    const selectedRegions = container.querySelectorAll(".graph-block-region--selected");

    assertEqual(selectedRegions.length, 1);
    assertEqual(selectedRegions[0].getAttribute("data-block-id"), "block-2");
});

test("protocol-graph-renderer", "renders an empty state when the protocol has no blocks", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createEmptyProtocol(), {}, CADENCE_GRAPH_CONFIG);

    const emptyState = container.querySelector(".graph-empty-state");

    assertEqual(emptyState.textContent, "Add a block to preview this protocol");
});

test("protocol-graph-renderer", "removes the empty state when blocks are rendered", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createEmptyProtocol(), {}, CADENCE_GRAPH_CONFIG);
    renderer.render(createProtocol(), {}, CADENCE_GRAPH_CONFIG);

    assertEqual(container.querySelector(".graph-empty-state"), null);
});

test("protocol-graph-renderer", "renders a supplied graph series", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    const createSeries = () => ({
        valueAt() {
            return 5;
        },

        valueBefore() {
            return 5;
        },

        boundariesBetween() {
            return [];
        },
    });

    renderer.render(
        createProtocol(),
        {},
        {
            createSeries,
            label: "Custom",
            unit: "units",
            valueMin: 0,
            valueMax: 10,
        },
    );

    assertEqual(container.querySelectorAll(".graph-series__line").length, 1);
    assertEqual(container.querySelector(".graph-axis__title--y").textContent, "Custom (units)");
});

test("protocol-graph-renderer", "applies a presentation value transform", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    const createSeries = () => ({
        valueAt() {
            return 0.25;
        },

        valueBefore() {
            return 0.25;
        },

        boundariesBetween() {
            return [];
        },
    });

    renderer.render(
        createProtocol(),
        {},
        {
            createSeries,
            label: "Calorie Rate",
            unit: "kcal/s",
            valueMin: 0,
            valueMax: 30,
        },
    );

    const untransformedPath = container.querySelector(".graph-series__line").getAttribute("d");

    renderer.render(
        createProtocol(),
        {},
        {
            createSeries,
            transformValue: (value) => value * 60,
            label: "Calorie Rate",
            unit: "kcal/min",
            valueMin: 0,
            valueMax: 30,
        },
    );

    const transformedPath = container.querySelector(".graph-series__line").getAttribute("d");

    assertEqual(transformedPath === untransformedPath, false);
    assertEqual(
        container.querySelector(".graph-axis__title--y").textContent,
        "Calorie Rate (kcal/min)",
    );
});

test("protocol-graph-renderer", "updates selection without resampling the graph series", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    let valueAtCalls = 0;

    const createSeries = () => ({
        valueAt() {
            valueAtCalls += 1;
            return 5;
        },

        valueBefore() {
            return 5;
        },

        boundariesBetween() {
            return [];
        },
    });

    renderer.render(
        createProtocol(),
        {},
        {
            createSeries,
            label: "Custom",
            unit: "units",
            valueMin: 0,
            valueMax: 10,
        },
    );

    const callsAfterRender = valueAtCalls;

    renderer.updateSelection({
        selectedPhaseId: "phase-1",
    });

    assertEqual(valueAtCalls, callsAfterRender);
});

test("protocol-graph-renderer", "does not rerender for unchanged observed dimensions", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    let valueAtCalls = 0;

    const createSeries = () => ({
        valueAt() {
            valueAtCalls += 1;
            return 5;
        },

        valueBefore() {
            return 5;
        },

        boundariesBetween() {
            return [];
        },
    });

    renderer.render(
        createProtocol(),
        {},
        {
            createSeries,
            label: "Custom",
            unit: "units",
            valueMin: 0,
            valueMax: 10,
        },
    );

    const callsAfterRender = valueAtCalls;

    triggerResizeObserver(container, {
        width: container.clientWidth,
        height: container.clientHeight,
    });

    assertEqual(valueAtCalls, callsAfterRender);
});

test("protocol-graph-renderer", "rerenders when observed dimensions change", () => {
    const container = createContainer();
    const renderer = createRenderer(container);

    renderer.render(createProtocol(), {}, CADENCE_GRAPH_CONFIG);

    triggerResizeObserver(container, {
        width: 640,
        height: 320,
    });

    assertEqual(container.querySelector("svg").getAttribute("viewBox"), "0 0 640 320");
});

test("protocol-graph-renderer", "reduces y-axis ticks when graph height decreases", () => {
    const container = createContainer(800, 240);
    const renderer = createRenderer(container);

    renderer.render(
        createProtocol(),
        {},
        {
            variableId: "cadence",
            label: "Cadence",
            unit: "RPM",
            valueMin: 0,
            valueMax: 120,
        },
    );

    const tallTickCount = container.querySelectorAll(".graph-axis__label--y").length;

    triggerResizeObserver(container, {
        width: 800,
        height: 100,
    });

    const shortTickCount = container.querySelectorAll(".graph-axis__label--y").length;

    assert(
        shortTickCount < tallTickCount,
        `Expected fewer y-axis ticks after resize, got ${tallTickCount} before and ${shortTickCount} after.`,
    );
});
