import { test, assertEqual } from "/packages/js-testing/framework/test-framework.js";

import { EditorState } from "../../../state/editor-state.js";

test("editor-state-selection", "starts with no structural selection", () => {
    const state = new EditorState();

    const snapshot = state.getSnapshot();

    assertEqual(snapshot.selectedPhaseId, undefined);
    assertEqual(snapshot.selectedBlockId, undefined);
});

test("editor-state-selection", "selects one phase", () => {
    const state = new EditorState();

    state.selectPhase("phase-1");

    const snapshot = state.getSnapshot();

    assertEqual(snapshot.selectedPhaseId, "phase-1");
    assertEqual(snapshot.selectedBlockId, undefined);
});

test("editor-state-selection", "selects one block", () => {
    const state = new EditorState();

    state.selectBlock("block-1");

    const snapshot = state.getSnapshot();

    assertEqual(snapshot.selectedPhaseId, undefined);
    assertEqual(snapshot.selectedBlockId, "block-1");
});

test("editor-state-selection", "selecting a block clears the selected phase", () => {
    const state = new EditorState();

    state.selectPhase("phase-1");
    state.selectBlock("block-1");

    const snapshot = state.getSnapshot();

    assertEqual(snapshot.selectedPhaseId, undefined);
    assertEqual(snapshot.selectedBlockId, "block-1");
});

test("editor-state-selection", "selecting a phase clears the selected block", () => {
    const state = new EditorState();

    state.selectBlock("block-1");
    state.selectPhase("phase-1");

    const snapshot = state.getSnapshot();

    assertEqual(snapshot.selectedPhaseId, "phase-1");
    assertEqual(snapshot.selectedBlockId, undefined);
});

test("editor-state-selection", "clears structural selection", () => {
    const state = new EditorState();

    state.selectBlock("block-1");
    state.clearSelection();

    const snapshot = state.getSnapshot();

    assertEqual(snapshot.selectedPhaseId, undefined);
    assertEqual(snapshot.selectedBlockId, undefined);
});

test("editor-state-selection", "phase selection emits selection change type", () => {
    const editorState = new EditorState();

    let receivedChangeType;

    editorState.subscribe((_snapshot, changeType) => {
        receivedChangeType = changeType;
    });

    editorState.selectPhase("phase-1");

    assertEqual(receivedChangeType, "selection");
});

test("editor-state-selection", "block selection emits selection change type", () => {
    const editorState = new EditorState();

    let receivedChangeType;

    editorState.subscribe((_snapshot, changeType) => {
        receivedChangeType = changeType;
    });

    editorState.selectBlock("block-1");

    assertEqual(receivedChangeType, "selection");
});

test("editor-state-selection", "clearing selection emits selection change type", () => {
    const editorState = new EditorState();

    let receivedChangeType;

    editorState.selectPhase("phase-1");

    editorState.subscribe((_snapshot, changeType) => {
        receivedChangeType = changeType;
    });

    editorState.clearSelection();

    assertEqual(receivedChangeType, "selection");
});
