/**
 * Tests delegated protocol-tree selection interactions.
 */

import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { wireProtocolSelectionEvents } from "../../interactions/protocol-selection-events.js";
import { EditorState } from "../../state/editor-state.js";

/** Creates an empty protocol-tree container with selection events wired. */
function createSelectionHarness() {
    const protocolTree = document.createElement("div");
    const editorState = new EditorState();

    wireProtocolSelectionEvents({
        protocolTree,
        editorState,
    });

    return {
        protocolTree,
        editorState,
    };
}

/** Creates a phase container with a structural toggle. */
function createPhaseToggle(phaseId = "phase-1") {
    const phase = document.createElement("article");
    phase.dataset.phaseId = phaseId;

    const toggle = document.createElement("button");
    toggle.dataset.action = "toggle-phase";

    phase.append(toggle);

    return {
        phase,
        toggle,
    };
}

/** Creates a block container with a structural toggle. */
function createBlockToggle(blockId = "block-1", phaseId = "phase-1") {
    const phase = document.createElement("article");
    phase.dataset.phaseId = phaseId;

    const block = document.createElement("article");
    block.dataset.blockId = blockId;

    const toggle = document.createElement("button");
    toggle.dataset.action = "expand-block";

    block.append(toggle);
    phase.append(block);

    return {
        phase,
        block,
        toggle,
    };
}

/** Dispatches a bubbling focus-in event from an element. */
function dispatchFocusIn(element) {
    element.dispatchEvent(
        new FocusEvent("focusin", {
            bubbles: true,
        }),
    );
}

/** Dispatches a bubbling keydown event from an element. */
function dispatchKeydown(element, key, options = {}) {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...options,
    });

    element.dispatchEvent(event);

    return event;
}

/** Creates one visible phase card. */
function createPhaseCard(phaseId) {
    const phase = document.createElement("article");

    phase.className = "phase-card";
    phase.dataset.phaseId = phaseId;

    return phase;
}

/** Creates one visible block card. */
function createBlockCard(blockId) {
    const block = document.createElement("article");

    block.className = "block-card";
    block.dataset.blockId = blockId;

    return block;
}

/** Adds a structural toggle button to a phase card. */
function appendPhaseToggle(phaseElement) {
    const header = document.createElement("header");
    header.className = "phase-header";

    const toggle = document.createElement("button");
    toggle.dataset.action = "toggle-phase";

    header.append(toggle);
    phaseElement.prepend(header);

    return toggle;
}

/** Adds a structural toggle button to a block card. */
function appendBlockToggle(blockElement, action = "expand-block") {
    const toggle = document.createElement("button");
    toggle.dataset.action = action;

    blockElement.append(toggle);

    return toggle;
}

test("protocol-selection-events", "Space activates the selected phase toggle", () => {
    const { protocolTree, editorState } = createSelectionHarness();
    const phase = createPhaseCard("phase-1");
    const toggle = appendPhaseToggle(phase);

    let clickCount = 0;

    toggle.addEventListener("click", () => {
        clickCount += 1;
    });

    protocolTree.append(phase);
    editorState.selectPhase("phase-1");

    const event = dispatchKeydown(protocolTree, " ");

    assertEqual(clickCount, 1);
    assertEqual(event.defaultPrevented, true);
});

test("protocol-selection-events", "Space activates the selected block toggle", () => {
    const { protocolTree, editorState } = createSelectionHarness();
    const block = createBlockCard("block-1");
    const toggle = appendBlockToggle(block);

    let clickCount = 0;

    toggle.addEventListener("click", () => {
        clickCount += 1;
    });

    protocolTree.append(block);
    editorState.selectBlock("block-1");

    const event = dispatchKeydown(protocolTree, " ");

    assertEqual(clickCount, 1);
    assertEqual(event.defaultPrevented, true);
});

test(
    "protocol-selection-events",
    "Space activates the selected expanded-block collapse toggle",
    () => {
        const { protocolTree, editorState } = createSelectionHarness();
        const block = createBlockCard("block-1");
        const toggle = appendBlockToggle(block, "collapse-block");

        let clickCount = 0;

        toggle.addEventListener("click", () => {
            clickCount += 1;
        });

        protocolTree.append(block);
        editorState.selectBlock("block-1");

        dispatchKeydown(protocolTree, " ");

        assertEqual(clickCount, 1);
    },
);

test("protocol-selection-events", "Space does nothing without a structural selection", () => {
    const { protocolTree } = createSelectionHarness();
    const phase = createPhaseCard("phase-1");
    const toggle = appendPhaseToggle(phase);

    let clickCount = 0;

    toggle.addEventListener("click", () => {
        clickCount += 1;
    });

    protocolTree.append(phase);

    const event = dispatchKeydown(protocolTree, " ");

    assertEqual(clickCount, 0);
    assertEqual(event.defaultPrevented, false);
});

test(
    "protocol-selection-events",
    "Space from an interactive control preserves native control behavior",
    () => {
        const { protocolTree, editorState } = createSelectionHarness();

        const phase = createPhaseCard("phase-1");
        const phaseToggle = appendPhaseToggle(phase);

        const button = document.createElement("button");
        button.dataset.action = "some-other-action";

        phase.append(button);
        protocolTree.append(phase);

        editorState.selectPhase("phase-1");

        let phaseToggleClickCount = 0;

        phaseToggle.addEventListener("click", () => {
            phaseToggleClickCount += 1;
        });

        const event = dispatchKeydown(button, " ");

        assertEqual(phaseToggleClickCount, 0);
        assertEqual(event.defaultPrevented, false);
    },
);

test(
    "protocol-selection-events",
    "Space does nothing when the selected item has no rendered toggle",
    () => {
        const { protocolTree, editorState } = createSelectionHarness();

        protocolTree.append(createPhaseCard("phase-1"));
        editorState.selectPhase("phase-1");

        const event = dispatchKeydown(protocolTree, " ");

        assertEqual(event.defaultPrevented, false);
        assertEqual(editorState.getSnapshot().selectedPhaseId, "phase-1");
    },
);

test(
    "protocol-selection-events",
    "modified Space is ignored by structural selection handling",
    () => {
        const { protocolTree, editorState } = createSelectionHarness();

        const phase = createPhaseCard("phase-1");
        const toggle = appendPhaseToggle(phase);

        let clickCount = 0;

        toggle.addEventListener("click", () => {
            clickCount += 1;
        });

        protocolTree.append(phase);
        editorState.selectPhase("phase-1");

        const event = dispatchKeydown(protocolTree, " ", {
            ctrlKey: true,
        });

        assertEqual(clickCount, 0);
        assertEqual(event.defaultPrevented, false);
    },
);

test("protocol-selection-events", "Space navigation returns focus to the protocol tree", () => {
    const { protocolTree, editorState } = createSelectionHarness();
    const phase = createPhaseCard("phase-1");

    appendPhaseToggle(phase);
    protocolTree.append(phase);
    document.body.append(protocolTree);

    try {
        editorState.selectPhase("phase-1");

        dispatchKeydown(protocolTree, " ");

        assertEqual(document.activeElement, protocolTree);
    } finally {
        protocolTree.remove();
    }
});

test(
    "protocol-selection-events",
    "focus entering a phase toggle establishes an initial phase selection",
    () => {
        const { protocolTree, editorState } = createSelectionHarness();
        const { phase, toggle } = createPhaseToggle("phase-1");

        protocolTree.append(phase);

        dispatchFocusIn(toggle);

        const snapshot = editorState.getSnapshot();

        assertEqual(snapshot.selectedPhaseId, "phase-1");
        assertEqual(snapshot.selectedBlockId, undefined);
    },
);

test(
    "protocol-selection-events",
    "focus entering a block toggle establishes an initial block selection",
    () => {
        const { protocolTree, editorState } = createSelectionHarness();
        const { phase, toggle } = createBlockToggle("block-1", "phase-1");

        protocolTree.append(phase);

        dispatchFocusIn(toggle);

        const snapshot = editorState.getSnapshot();

        assertEqual(snapshot.selectedPhaseId, undefined);
        assertEqual(snapshot.selectedBlockId, "block-1");
    },
);

test(
    "protocol-selection-events",
    "focus entering another structural toggle preserves an existing selection",
    () => {
        const { protocolTree, editorState } = createSelectionHarness();
        const first = createBlockToggle("block-1", "phase-1");
        const second = createPhaseToggle("phase-2");

        protocolTree.append(first.phase, second.phase);

        editorState.selectBlock("block-1");

        dispatchFocusIn(second.toggle);

        const snapshot = editorState.getSnapshot();

        assertEqual(snapshot.selectedPhaseId, undefined);
        assertEqual(snapshot.selectedBlockId, "block-1");
    },
);

test(
    "protocol-selection-events",
    "focus entering a non-structural action does not establish selection",
    () => {
        const { protocolTree, editorState } = createSelectionHarness();

        const phase = document.createElement("article");
        phase.dataset.phaseId = "phase-1";

        const action = document.createElement("button");
        action.dataset.action = "edit-phase-name";

        phase.append(action);
        protocolTree.append(phase);

        dispatchFocusIn(action);

        const snapshot = editorState.getSnapshot();

        assertEqual(snapshot.selectedPhaseId, undefined);
        assertEqual(snapshot.selectedBlockId, undefined);
    },
);

test(
    "protocol-selection-events",
    "focus entering a block collapse toggle establishes an initial block selection",
    () => {
        const { protocolTree, editorState } = createSelectionHarness();
        const { phase, toggle } = createBlockToggle("block-1", "phase-1");

        toggle.dataset.action = "collapse-block";
        protocolTree.append(phase);

        dispatchFocusIn(toggle);

        const snapshot = editorState.getSnapshot();

        assertEqual(snapshot.selectedPhaseId, undefined);
        assertEqual(snapshot.selectedBlockId, "block-1");
    },
);

test(
    "protocol-selection-events",
    "ArrowDown moves selection from a phase to its first visible block",
    () => {
        const { protocolTree, editorState } = createSelectionHarness();

        const phase = createPhaseCard("phase-1");
        const block = createBlockCard("block-1");

        phase.append(block);
        protocolTree.append(phase);

        editorState.selectPhase("phase-1");

        dispatchKeydown(protocolTree, "ArrowDown");

        const snapshot = editorState.getSnapshot();

        assertEqual(snapshot.selectedPhaseId, undefined);
        assertEqual(snapshot.selectedBlockId, "block-1");
    },
);

test("protocol-selection-events", "ArrowDown moves selection between visible blocks", () => {
    const { protocolTree, editorState } = createSelectionHarness();

    const phase = createPhaseCard("phase-1");
    const block1 = createBlockCard("block-1");
    const block2 = createBlockCard("block-2");

    phase.append(block1, block2);
    protocolTree.append(phase);

    editorState.selectBlock("block-1");

    dispatchKeydown(protocolTree, "ArrowDown");

    assertEqual(editorState.getSnapshot().selectedBlockId, "block-2");
});

test(
    "protocol-selection-events",
    "ArrowDown moves from the last block in a phase to the next phase",
    () => {
        const { protocolTree, editorState } = createSelectionHarness();

        const phase1 = createPhaseCard("phase-1");
        phase1.append(createBlockCard("block-1"));

        const phase2 = createPhaseCard("phase-2");

        protocolTree.append(phase1, phase2);

        editorState.selectBlock("block-1");

        dispatchKeydown(protocolTree, "ArrowDown");

        const snapshot = editorState.getSnapshot();

        assertEqual(snapshot.selectedPhaseId, "phase-2");
        assertEqual(snapshot.selectedBlockId, undefined);
    },
);

test(
    "protocol-selection-events",
    "ArrowUp moves from a phase to the previous visible block",
    () => {
        const { protocolTree, editorState } = createSelectionHarness();

        const phase1 = createPhaseCard("phase-1");
        phase1.append(createBlockCard("block-1"));

        const phase2 = createPhaseCard("phase-2");

        protocolTree.append(phase1, phase2);

        editorState.selectPhase("phase-2");

        dispatchKeydown(protocolTree, "ArrowUp");

        assertEqual(editorState.getSnapshot().selectedBlockId, "block-1");
    },
);

test(
    "protocol-selection-events",
    "collapsed phases contribute no block items to navigation",
    () => {
        const { protocolTree, editorState } = createSelectionHarness();

        const phase1 = createPhaseCard("phase-1");
        const phase2 = createPhaseCard("phase-2");

        protocolTree.append(phase1, phase2);

        editorState.selectPhase("phase-1");

        dispatchKeydown(protocolTree, "ArrowDown");

        assertEqual(editorState.getSnapshot().selectedPhaseId, "phase-2");
    },
);

test("protocol-selection-events", "ArrowUp does nothing at the first visible item", () => {
    const { protocolTree, editorState } = createSelectionHarness();

    protocolTree.append(createPhaseCard("phase-1"), createPhaseCard("phase-2"));

    editorState.selectPhase("phase-1");

    const event = dispatchKeydown(protocolTree, "ArrowUp");

    assertEqual(editorState.getSnapshot().selectedPhaseId, "phase-1");
    assertEqual(event.defaultPrevented, false);
});

test("protocol-selection-events", "ArrowDown does nothing at the last visible item", () => {
    const { protocolTree, editorState } = createSelectionHarness();

    protocolTree.append(createPhaseCard("phase-1"), createPhaseCard("phase-2"));

    editorState.selectPhase("phase-2");

    const event = dispatchKeydown(protocolTree, "ArrowDown");

    assertEqual(editorState.getSnapshot().selectedPhaseId, "phase-2");
    assertEqual(event.defaultPrevented, false);
});

test("protocol-selection-events", "Ctrl ArrowDown is ignored by selection navigation", () => {
    const { protocolTree, editorState } = createSelectionHarness();

    protocolTree.append(createPhaseCard("phase-1"), createPhaseCard("phase-2"));

    editorState.selectPhase("phase-1");

    const event = dispatchKeydown(protocolTree, "ArrowDown", {
        ctrlKey: true,
    });

    assertEqual(editorState.getSnapshot().selectedPhaseId, "phase-1");
    assertEqual(event.defaultPrevented, false);
});

test("protocol-selection-events", "arrow navigation does not leave an editable input", () => {
    const { protocolTree, editorState } = createSelectionHarness();

    const phase1 = createPhaseCard("phase-1");
    const phase2 = createPhaseCard("phase-2");

    const input = document.createElement("input");

    phase1.append(input);
    protocolTree.append(phase1, phase2);

    editorState.selectPhase("phase-1");

    const event = dispatchKeydown(input, "ArrowDown");

    assertEqual(editorState.getSnapshot().selectedPhaseId, "phase-1");
    assertEqual(event.defaultPrevented, false);
});

test("protocol-selection-events", "successful arrow navigation focuses the protocol tree", () => {
    const { protocolTree, editorState } = createSelectionHarness();

    document.body.append(protocolTree);

    try {
        protocolTree.append(createPhaseCard("phase-1"), createPhaseCard("phase-2"));

        editorState.selectPhase("phase-1");

        dispatchKeydown(protocolTree, "ArrowDown");

        assertEqual(document.activeElement, protocolTree);
    } finally {
        protocolTree.remove();
    }
});

test(
    "protocol-selection-events",
    "clicking a phase card selects it and focuses the protocol tree",
    () => {
        const { protocolTree, editorState } = createSelectionHarness();
        const phase = createPhaseCard("phase-1");

        protocolTree.append(phase);
        document.body.append(protocolTree);

        try {
            phase.dispatchEvent(
                new MouseEvent("click", {
                    bubbles: true,
                }),
            );

            assertEqual(editorState.getSnapshot().selectedPhaseId, "phase-1");
            assertEqual(document.activeElement, protocolTree);
        } finally {
            protocolTree.remove();
        }
    },
);
