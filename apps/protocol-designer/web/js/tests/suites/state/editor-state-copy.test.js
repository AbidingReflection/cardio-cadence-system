import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "../../../../../../packages/js-testing/framework/test-framework.js";

import { EditorState } from "../../../state/editor-state.js";

const SUITE = "editor-state-copy";

test(SUITE, "sets phase copy mode", () => {
    const state = new EditorState();

    state.setCopyMode("phase", "phase-1");

    assertDeepEqual(state.getSnapshot().copyMode, {
        entityType: "phase",
        sourceId: "phase-1",
    });
});

test(SUITE, "sets block copy mode", () => {
    const state = new EditorState();

    state.setCopyMode("block", "block-1");

    assertDeepEqual(state.getSnapshot().copyMode, {
        entityType: "block",
        sourceId: "block-1",
    });
});

test(SUITE, "switches the active copy source", () => {
    const state = new EditorState();

    state.setCopyMode("phase", "phase-1");
    state.setCopyMode("phase", "phase-2");

    assertDeepEqual(state.getSnapshot().copyMode, {
        entityType: "phase",
        sourceId: "phase-2",
    });
});

test(SUITE, "switches between copy entity types", () => {
    const state = new EditorState();

    state.setCopyMode("phase", "phase-1");
    state.setCopyMode("block", "block-1");

    assertDeepEqual(state.getSnapshot().copyMode, {
        entityType: "block",
        sourceId: "block-1",
    });
});

test(SUITE, "clears copy mode", () => {
    const state = new EditorState();

    state.setCopyMode("phase", "phase-1");
    state.clearCopyMode();

    assertEqual(state.getSnapshot().copyMode, undefined);
});

test(SUITE, "does not emit when clearing inactive copy mode", () => {
    const state = new EditorState();
    let emissionCount = 0;

    state.subscribe(() => {
        emissionCount += 1;
    });

    state.clearCopyMode();

    assertEqual(emissionCount, 0);
});

test(SUITE, "returns a defensive copy of copy mode", () => {
    const state = new EditorState();

    state.setCopyMode("phase", "phase-1");

    const snapshot = state.getSnapshot();

    snapshot.copyMode.sourceId = "changed";

    assertDeepEqual(state.getSnapshot().copyMode, {
        entityType: "phase",
        sourceId: "phase-1",
    });
});

test(SUITE, "rejects unsupported copy entity types", () => {
    const state = new EditorState();

    assertThrows(
        () => state.setCopyMode("protocol", "protocol-1"),
        'Unsupported copy entity type: "protocol".',
    );
});

test(SUITE, "reset protocol session clears copy mode", () => {
    const state = new EditorState();

    state.setCopyMode("phase", "phase-1");
    state.resetProtocolSession();

    assertEqual(state.getSnapshot().copyMode, undefined);
});

test(SUITE, "clearing edit mode clears copy mode", () => {
    const state = new EditorState();

    state.setEditMode("phase");
    state.setCopyMode("phase", "phase-1");
    state.clearEditMode();

    assertEqual(state.getSnapshot().copyMode, undefined);
});

test(SUITE, "changing edit mode clears copy mode", () => {
    const state = new EditorState();

    state.setEditMode("phase");
    state.setCopyMode("phase", "phase-1");
    state.setEditMode("block");

    assertEqual(state.getSnapshot().copyMode, undefined);
});
