import {
    assert,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { GraphPaneController } from "../../../controllers/graph-pane-controller.js";

/** Creates a graph pane fixture. */
function createGraphPane(id, { collapsed = false } = {}) {
    const pane = document.createElement("section");
    const toggleButton = document.createElement("button");

    pane.dataset.collapsed = String(collapsed);

    toggleButton.type = "button";

    return {
        id,
        pane,
        toggleButton,
    };
}

test("graph-pane-controller", "starts an expanded pane expanded", () => {
    const definition = createGraphPane("cadence");

    const controller = new GraphPaneController([definition]);

    assertEqual(controller.isExpanded("cadence"), true);
    assertEqual(definition.pane.dataset.collapsed, "false");
    assertEqual(definition.toggleButton.getAttribute("aria-expanded"), "true");
});

test("graph-pane-controller", "preserves an initially collapsed pane", () => {
    const definition = createGraphPane("cadence", {
        collapsed: true,
    });

    const controller = new GraphPaneController([definition]);

    assertEqual(controller.isExpanded("cadence"), false);
    assertEqual(definition.pane.dataset.collapsed, "true");
    assertEqual(definition.toggleButton.getAttribute("aria-expanded"), "false");
});

test("graph-pane-controller", "collapses an expanded pane", () => {
    const definition = createGraphPane("cadence");
    const controller = new GraphPaneController([definition]);

    controller.setExpanded("cadence", false);

    assertEqual(controller.isExpanded("cadence"), false);
    assertEqual(definition.pane.dataset.collapsed, "true");
    assertEqual(definition.toggleButton.getAttribute("aria-expanded"), "false");
});

test("graph-pane-controller", "expands a collapsed pane", () => {
    const definition = createGraphPane("cadence", {
        collapsed: true,
    });

    const controller = new GraphPaneController([definition]);

    controller.setExpanded("cadence", true);

    assertEqual(controller.isExpanded("cadence"), true);
    assertEqual(definition.pane.dataset.collapsed, "false");
    assertEqual(definition.toggleButton.getAttribute("aria-expanded"), "true");
});

test("graph-pane-controller", "toggles a pane from the toggle button", () => {
    const definition = createGraphPane("cadence");
    const controller = new GraphPaneController([definition]);

    definition.toggleButton.click();

    assertEqual(controller.isExpanded("cadence"), false);

    definition.toggleButton.click();

    assertEqual(controller.isExpanded("cadence"), true);
});

test("graph-pane-controller", "tracks panes independently", () => {
    const cadence = createGraphPane("cadence");
    const load = createGraphPane("load");

    const controller = new GraphPaneController([cadence, load]);

    controller.setExpanded("cadence", false);

    assertEqual(controller.isExpanded("cadence"), false);
    assertEqual(controller.isExpanded("load"), true);
});

test("graph-pane-controller", "does not notify subscribers for unchanged state", () => {
    const definition = createGraphPane("cadence");
    const controller = new GraphPaneController([definition]);

    let notificationCount = 0;

    controller.subscribe(() => {
        notificationCount += 1;
    });

    controller.setExpanded("cadence", true);

    assertEqual(notificationCount, 0);
});

test("graph-pane-controller", "unsubscribe stops future notifications", () => {
    const definition = createGraphPane("cadence");
    const controller = new GraphPaneController([definition]);

    let notificationCount = 0;

    const unsubscribe = controller.subscribe(() => {
        notificationCount += 1;
    });

    controller.setExpanded("cadence", false);

    unsubscribe();

    controller.setExpanded("cadence", true);

    assertEqual(notificationCount, 1);
});

test("graph-pane-controller", "supports multiple subscribers", () => {
    const definition = createGraphPane("cadence");
    const controller = new GraphPaneController([definition]);

    let firstCount = 0;
    let secondCount = 0;

    controller.subscribe(() => {
        firstCount += 1;
    });

    controller.subscribe(() => {
        secondCount += 1;
    });

    controller.setExpanded("cadence", false);

    assertEqual(firstCount, 1);
    assertEqual(secondCount, 1);
});

test("graph-pane-controller", "rejects an unknown graph pane ID", () => {
    const controller = new GraphPaneController([createGraphPane("cadence")]);

    assertThrows(() => {
        controller.isExpanded("missing");
    });
});

test("graph-pane-controller", "rejects duplicate graph pane IDs", () => {
    assertThrows(() => {
        new GraphPaneController([createGraphPane("cadence"), createGraphPane("cadence")]);
    });
});

test("graph-pane-controller", "rejects non-boolean expanded state", () => {
    const controller = new GraphPaneController([createGraphPane("cadence")]);

    assertThrows(() => {
        controller.setExpanded("cadence", "false");
    });
});

test("graph-pane-controller", "rejects non-function subscribers", () => {
    const controller = new GraphPaneController([createGraphPane("cadence")]);

    assertThrows(() => {
        controller.subscribe(null);
    });
});

test("graph-pane-controller", "rejects an invalid pane collection", () => {
    assertThrows(() => {
        new GraphPaneController(null);
    });
});
