import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import {
    toggleProtocolManageMode,
    wireProtocolManageKeyboardEvents,
} from "../../interactions/protocol-manage-keyboard-events.js";

import { createEditorStateFake } from "../helpers/editor-state-fake.js";
import { createProtocolModelFake } from "../helpers/protocol-model-fake.js";

/** Creates a protocol pane with manage-mode keyboard shortcuts wired. */
function createKeyboardHarness() {
    const protocolPane = document.createElement("section");
    const protocolTree = document.createElement("div");

    protocolTree.tabIndex = -1;
    protocolPane.append(protocolTree);

    const protocolModel = createProtocolModelFake();
    const editorState = createEditorStateFake();

    wireProtocolManageKeyboardEvents({
        protocolPane,
        protocolTree,
        protocolModel,
        editorState,
    });

    return {
        protocolPane,
        protocolTree,
        protocolModel,
        editorState,
    };
}

/** Dispatches a bubbling, cancelable keyboard event. */
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

/** Creates a valid block edit draft. */
function createEditDraft() {
    return {
        mode: "edit",
        blockId: "block-1",
        name: "Work",
        durationSeconds: 60,
        variables: {},
    };
}

test("protocol-manage-keyboard-events", "P toggles phase manage mode", () => {
    const { protocolTree, editorState } = createKeyboardHarness();

    dispatchKeydown(protocolTree, "p");

    assertEqual(editorState.getSnapshot().editMode, "phase");

    dispatchKeydown(protocolTree, "p");

    assertEqual(editorState.getSnapshot().editMode, undefined);
});

test("protocol-manage-keyboard-events", "B toggles block manage mode", () => {
    const { protocolTree, editorState } = createKeyboardHarness();

    dispatchKeydown(protocolTree, "b");

    assertEqual(editorState.getSnapshot().editMode, "block");

    dispatchKeydown(protocolTree, "b");

    assertEqual(editorState.getSnapshot().editMode, undefined);
});

test("protocol-manage-keyboard-events", "P and B switch manage modes", () => {
    const { protocolTree, editorState } = createKeyboardHarness();

    dispatchKeydown(protocolTree, "p");
    dispatchKeydown(protocolTree, "b");

    assertEqual(editorState.getSnapshot().editMode, "block");

    dispatchKeydown(protocolTree, "p");

    assertEqual(editorState.getSnapshot().editMode, "phase");
});

test("protocol-manage-keyboard-events", "manage shortcuts are ignored from editable fields", () => {
    const { protocolPane, editorState } = createKeyboardHarness();

    const input = document.createElement("input");
    protocolPane.append(input);

    dispatchKeydown(input, "p");

    assertEqual(editorState.getSnapshot().editMode, undefined);
});

test("protocol-manage-keyboard-events", "modified manage shortcuts are ignored", () => {
    const { protocolTree, editorState } = createKeyboardHarness();

    dispatchKeydown(protocolTree, "p", {
        ctrlKey: true,
    });

    assertEqual(editorState.getSnapshot().editMode, undefined);
});

test(
    "protocol-manage-keyboard-events",
    "Delete removes the selected phase in phase manage mode",
    () => {
        const { protocolTree, protocolModel, editorState } = createKeyboardHarness();

        editorState.setEditMode("phase");
        editorState.selectPhase("phase-1");

        const event = dispatchKeydown(protocolTree, "Delete");

        assertEqual(event.defaultPrevented, true);
        assertEqual(protocolModel.calls.removePhase[0], "phase-1");
        assertEqual(editorState.getSnapshot().selectedPhaseId, "phase-2");
    },
);

test(
    "protocol-manage-keyboard-events",
    "Delete removes the selected block in block manage mode",
    () => {
        const { protocolTree, protocolModel, editorState } = createKeyboardHarness();

        editorState.setEditMode("block");
        editorState.selectBlock("block-1");

        const event = dispatchKeydown(protocolTree, "Delete");

        assertEqual(event.defaultPrevented, true);
        assertEqual(protocolModel.calls.removeBlock[0], "block-1");
        assertEqual(editorState.getSnapshot().selectedBlockId, "block-2");
    },
);

test("protocol-manage-keyboard-events", "Delete does nothing for a mismatched selection", () => {
    const { protocolTree, protocolModel, editorState } = createKeyboardHarness();

    editorState.setEditMode("block");
    editorState.selectPhase("phase-1");

    const event = dispatchKeydown(protocolTree, "Delete");

    assertEqual(event.defaultPrevented, false);
    assertEqual(protocolModel.calls.removeBlock.length, 0);
    assertEqual(protocolModel.calls.removePhase.length, 0);
});

test("protocol-manage-keyboard-events", "Delete is ignored from editable fields", () => {
    const { protocolPane, protocolModel, editorState } = createKeyboardHarness();

    editorState.setEditMode("block");
    editorState.selectBlock("block-1");

    const input = document.createElement("input");
    protocolPane.append(input);

    const event = dispatchKeydown(input, "Delete");

    assertEqual(event.defaultPrevented, false);
    assertEqual(protocolModel.calls.removeBlock.length, 0);
});

test(
    "protocol-manage-keyboard-events",
    "Escape cancels a dirty block draft before leaving manage mode",
    () => {
        const { protocolTree, editorState } = createKeyboardHarness();

        editorState.setEditMode("block");
        editorState.openBlockDraft("block-1", createEditDraft());
        editorState.updateBlockDraft({
            name: "Changed",
        });

        const event = dispatchKeydown(protocolTree, "Escape");

        const snapshot = editorState.getSnapshot();

        assertEqual(event.defaultPrevented, true);
        assertEqual(snapshot.activeBlockDraft, undefined);
        assertEqual(snapshot.expandedBlockId, undefined);
        assertEqual(snapshot.editMode, "block");
    },
);

test(
    "protocol-manage-keyboard-events",
    "Escape exits manage mode when no dirty block draft exists",
    () => {
        const { protocolTree, editorState } = createKeyboardHarness();

        editorState.setEditMode("phase");

        const event = dispatchKeydown(protocolTree, "Escape");

        assertEqual(event.defaultPrevented, true);
        assertEqual(editorState.getSnapshot().editMode, undefined);
    },
);

test(
    "protocol-manage-keyboard-events",
    "phase-name Escape is left to the phase-name interaction",
    () => {
        const { protocolPane, editorState } = createKeyboardHarness();

        editorState.setEditMode("phase");

        const input = document.createElement("input");
        input.dataset.phaseNameField = "";
        protocolPane.append(input);

        const event = dispatchKeydown(input, "Escape");

        assertEqual(event.defaultPrevented, false);
        assertEqual(editorState.getSnapshot().editMode, "phase");
    },
);

test(
    "protocol-manage-keyboard-events",
    "dirty block drafts prevent switching away from block manage mode",
    () => {
        const draft = createEditDraft();
        const editorState = createEditorStateFake(draft);

        editorState.setEditMode("block");
        editorState.updateBlockDraft({
            name: "Changed",
        });

        const result = toggleProtocolManageMode(editorState, "phase");

        assertEqual(result.outcome, "blocked");
        assertEqual(result.reason, "dirty-draft");
        assertEqual(editorState.getSnapshot().editMode, "block");
    },
);
