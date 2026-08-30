/**
 * Verifies selection-driven keyboard structural reordering.
 */

import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";
import { wireProtocolStructureKeyboardEvents } from "../../interactions/structure/keyboard-events.js";
import { EditorState } from "../../state/editor-state.js";
import { createProtocolModelFake } from "../helpers/protocol-model-fake.js";

/** Creates a protocol tree with structural keyboard events wired. */
function createKeyboardHarness() {
    const protocolTree = document.createElement("div");
    const protocolModel = createProtocolModelFake();
    const editorState = new EditorState();

    protocolTree.tabIndex = -1;

    wireProtocolStructureKeyboardEvents({
        protocolTree,
        protocolModel,
        editorState,
    });

    return {
        protocolTree,
        protocolModel,
        editorState,
    };
}

/** Dispatches a bubbling keyboard event and returns it. */
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

test(
    "protocol-structure-keyboard-events",
    "Ctrl ArrowDown moves the selected phase in phase edit mode",
    () => {
        const { protocolTree, protocolModel, editorState } = createKeyboardHarness();

        editorState.setEditMode("phase");
        editorState.selectPhase("phase-1");

        const event = dispatchKeydown(protocolTree, "ArrowDown", {
            ctrlKey: true,
        });

        assertDeepEqual(protocolModel.calls.movePhase, [
            {
                phaseId: "phase-1",
                targetIndex: 1,
            },
        ]);

        assertEqual(event.defaultPrevented, true);
    },
);

test(
    "protocol-structure-keyboard-events",
    "Ctrl ArrowDown moves the selected block in block edit mode",
    () => {
        const { protocolTree, protocolModel, editorState } = createKeyboardHarness();

        editorState.setEditMode("block");
        editorState.selectBlock("block-1");

        const event = dispatchKeydown(protocolTree, "ArrowDown", {
            ctrlKey: true,
        });

        assertDeepEqual(protocolModel.calls.moveBlock, [
            {
                blockId: "block-1",
                targetPhaseId: "phase-1",
                targetIndex: 1,
            },
        ]);

        assertEqual(event.defaultPrevented, true);
    },
);

test(
    "protocol-structure-keyboard-events",
    "keyboard reorder uses structural selection rather than a focused card",
    () => {
        const { protocolTree, protocolModel, editorState } = createKeyboardHarness();

        editorState.setEditMode("phase");
        editorState.selectPhase("phase-1");

        assertEqual(protocolTree.querySelector("[data-structural-item]"), null);

        dispatchKeydown(protocolTree, "ArrowDown", {
            ctrlKey: true,
        });

        assertEqual(protocolModel.calls.movePhase.length, 1);
    },
);

test(
    "protocol-structure-keyboard-events",
    "successful phase reorder preserves structural selection",
    () => {
        const { protocolTree, editorState } = createKeyboardHarness();

        editorState.setEditMode("phase");
        editorState.selectPhase("phase-1");

        dispatchKeydown(protocolTree, "ArrowDown", {
            ctrlKey: true,
        });

        const snapshot = editorState.getSnapshot();

        assertEqual(snapshot.selectedPhaseId, "phase-1");
        assertEqual(snapshot.selectedBlockId, undefined);
    },
);

test(
    "protocol-structure-keyboard-events",
    "phase selection does not reorder while block edit mode is active",
    () => {
        const { protocolTree, protocolModel, editorState } = createKeyboardHarness();

        editorState.setEditMode("block");
        editorState.selectPhase("phase-1");

        const event = dispatchKeydown(protocolTree, "ArrowDown", {
            ctrlKey: true,
        });

        assertEqual(protocolModel.calls.movePhase.length, 0);
        assertEqual(protocolModel.calls.moveBlock.length, 0);
        assertEqual(event.defaultPrevented, false);
    },
);

test(
    "protocol-structure-keyboard-events",
    "block selection does not reorder while phase edit mode is active",
    () => {
        const { protocolTree, protocolModel, editorState } = createKeyboardHarness();

        editorState.setEditMode("phase");
        editorState.selectBlock("block-1");

        dispatchKeydown(protocolTree, "ArrowDown", {
            ctrlKey: true,
        });

        assertEqual(protocolModel.calls.movePhase.length, 0);
        assertEqual(protocolModel.calls.moveBlock.length, 0);
    },
);

test(
    "protocol-structure-keyboard-events",
    "Ctrl Arrow does nothing without structural selection",
    () => {
        const { protocolTree, protocolModel, editorState } = createKeyboardHarness();

        editorState.setEditMode("phase");

        dispatchKeydown(protocolTree, "ArrowDown", {
            ctrlKey: true,
        });

        assertEqual(protocolModel.calls.movePhase.length, 0);
        assertEqual(protocolModel.calls.moveBlock.length, 0);
    },
);

test(
    "protocol-structure-keyboard-events",
    "plain Arrow does not perform structural reorder",
    () => {
        const { protocolTree, protocolModel, editorState } = createKeyboardHarness();

        editorState.setEditMode("phase");
        editorState.selectPhase("phase-1");

        dispatchKeydown(protocolTree, "ArrowDown");

        assertEqual(protocolModel.calls.movePhase.length, 0);
    },
);

test(
    "protocol-structure-keyboard-events",
    "structural reorder does not run from a focused child control",
    () => {
        const { protocolTree, protocolModel, editorState } = createKeyboardHarness();

        const button = document.createElement("button");
        protocolTree.append(button);

        editorState.setEditMode("phase");
        editorState.selectPhase("phase-1");

        const event = dispatchKeydown(button, "ArrowDown", {
            ctrlKey: true,
        });

        assertEqual(protocolModel.calls.movePhase.length, 0);
        assertEqual(event.defaultPrevented, false);
    },
);

test(
    "protocol-structure-keyboard-events",
    "successful reorder returns focus to the protocol tree",
    () => {
        const { protocolTree, editorState } = createKeyboardHarness();

        document.body.append(protocolTree);

        try {
            editorState.setEditMode("phase");
            editorState.selectPhase("phase-1");

            protocolTree.focus();

            dispatchKeydown(protocolTree, "ArrowDown", {
                ctrlKey: true,
            });

            assertEqual(document.activeElement, protocolTree);
        } finally {
            protocolTree.remove();
        }
    },
);
