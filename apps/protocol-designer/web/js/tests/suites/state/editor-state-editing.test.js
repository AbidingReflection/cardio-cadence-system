import { test, assertEqual, assertThrows } from "/packages/js-testing/framework/test-framework.js";

import { EditorState } from "../../../state/editor-state.js";

test("editor-state-editing", "starts phase-name editing", () => {
    const state = new EditorState();

    state.startPhaseNameEdit("phase-1", "Warm-up");

    const snapshot = state.getSnapshot();

    assertEqual(snapshot.editingPhaseId, "phase-1");
    assertEqual(snapshot.phaseNameDraft, "Warm-up");
});

test("editor-state-editing", "updates the active phase-name draft", () => {
    const state = new EditorState();

    state.startPhaseNameEdit("phase-1", "Warm-up");
    state.updatePhaseNameDraft("Extended Warm-up");

    assertEqual(state.getSnapshot().phaseNameDraft, "Extended Warm-up");
});

test("editor-state-editing", "closes phase-name editing", () => {
    const state = new EditorState();

    state.startPhaseNameEdit("phase-1", "Warm-up");
    state.closePhaseNameEdit();

    const snapshot = state.getSnapshot();

    assertEqual(snapshot.editingPhaseId, undefined);
    assertEqual(snapshot.phaseNameDraft, undefined);
});

test("editor-state-editing", "rejects phase-name updates without an active edit", () => {
    const state = new EditorState();

    assertThrows(() => {
        state.updatePhaseNameDraft("Warm-up");
    });
});

test("editor-state-editing", "sets block edit mode", () => {
    const state = new EditorState();

    state.setEditMode("block");

    assertEqual(state.getSnapshot().editMode, "block");
});

test("editor-state-editing", "sets phase edit mode", () => {
    const state = new EditorState();

    state.setEditMode("phase");

    assertEqual(state.getSnapshot().editMode, "phase");
});

test("editor-state-editing", "clears edit mode", () => {
    const state = new EditorState();

    state.setEditMode("block");
    state.clearEditMode();

    assertEqual(state.getSnapshot().editMode, undefined);
});

test("editor-state-editing", "rejects unsupported edit modes", () => {
    const state = new EditorState();

    assertThrows(() => {
        state.setEditMode("banana");
    });
});
