import {
    test,
    assertEqual,
    assertDeepEqual,
} from "/packages/js-testing/framework/test-framework.js";

import { EditorState } from "../../../state/editor-state.js";

test("editor-state-expansion", "expands a phase", () => {
    const state = new EditorState();

    state.expandPhase("phase-1");

    assertDeepEqual(state.getSnapshot().expandedPhaseIds, ["phase-1"]);
});

test("editor-state-expansion", "supports multiple expanded phases", () => {
    const state = new EditorState();

    state.expandPhase("phase-1");
    state.expandPhase("phase-2");

    assertDeepEqual(state.getSnapshot().expandedPhaseIds, ["phase-1", "phase-2"]);
});

test("editor-state-expansion", "collapses a phase", () => {
    const state = new EditorState();

    state.expandPhase("phase-1");
    state.expandPhase("phase-2");
    state.collapsePhase("phase-1");

    assertDeepEqual(state.getSnapshot().expandedPhaseIds, ["phase-2"]);
});

test("editor-state-expansion", "toggles phase expansion", () => {
    const state = new EditorState();

    state.togglePhase("phase-1");

    assertDeepEqual(state.getSnapshot().expandedPhaseIds, ["phase-1"]);

    state.togglePhase("phase-1");

    assertDeepEqual(state.getSnapshot().expandedPhaseIds, []);
});

test("editor-state-expansion", "expands one block at a time", () => {
    const state = new EditorState();

    state.expandBlock("block-1");
    state.expandBlock("block-2");

    assertEqual(state.getSnapshot().expandedBlockId, "block-2");
});

test("editor-state-expansion", "collapses the expanded block", () => {
    const state = new EditorState();

    state.expandBlock("block-1");
    state.collapseBlock();

    assertEqual(state.getSnapshot().expandedBlockId, undefined);
});

test("editor-state-expansion", "does not emit for repeated no-op expansion", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.expandPhase("phase-1");
    state.expandPhase("phase-1");

    assertEqual(notificationCount, 1);
});

test("editor-state-expansion", "does not emit when collapsing an already collapsed phase", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.collapsePhase("phase-1");

    assertEqual(notificationCount, 0);
});

test("editor-state-expansion", "does not emit when expanding the already expanded block", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.expandBlock("block-1");
    state.expandBlock("block-1");

    assertEqual(notificationCount, 1);
});

test("editor-state-expansion", "does not emit when no block is expanded", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.collapseBlock();

    assertEqual(notificationCount, 0);
});
