import {
    test,
    assertEqual,
    assertDeepEqual,
} from "/packages/js-testing/framework/test-framework.js";

import { EditorState } from "../../../state/editor-state.js";

test("editor-state-insertion", "sets a phase insertion target", () => {
    const state = new EditorState();

    const insertion = {
        type: "phase",
        index: 1,
    };

    state.setInsertionTarget(insertion);

    assertDeepEqual(state.getSnapshot().insertionTarget, insertion);
});

test("editor-state-insertion", "sets a block insertion target", () => {
    const state = new EditorState();

    const insertion = {
        type: "block",
        phaseId: "phase-1",
        index: 2,
    };

    state.setInsertionTarget(insertion);

    assertDeepEqual(state.getSnapshot().insertionTarget, insertion);
});

test("editor-state-insertion", "isolates insertion target from source data", () => {
    const state = new EditorState();

    const insertion = {
        type: "block",
        phaseId: "phase-1",
        index: 2,
    };

    state.setInsertionTarget(insertion);

    insertion.index = 99;

    assertEqual(state.getSnapshot().insertionTarget.index, 2);
});

test("editor-state-insertion", "returns independent insertion target snapshots", () => {
    const state = new EditorState();

    state.setInsertionTarget({
        type: "block",
        phaseId: "phase-1",
        index: 2,
    });

    const snapshot = state.getSnapshot();

    snapshot.insertionTarget.index = 99;

    assertEqual(state.getSnapshot().insertionTarget.index, 2);
});

test("editor-state-insertion", "emits when pending insertion changes", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.setInsertionTarget({
        type: "phase",
        index: 1,
    });

    assertEqual(notificationCount, 1);
});

test("editor-state-insertion", "does not emit when pending insertion is unchanged", () => {
    const state = new EditorState();

    state.setInsertionTarget({
        type: "block",
        phaseId: "phase-1",
        index: 2,
    });

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.setInsertionTarget({
        index: 2,
        phaseId: "phase-1",
        type: "block",
    });

    assertEqual(notificationCount, 0);
});

test("editor-state-insertion", "clears pending insertion", () => {
    const state = new EditorState();

    state.setInsertionTarget({
        type: "phase",
        index: 1,
    });

    state.clearInsertionTarget();

    assertEqual(state.getSnapshot().clearInsertionTarget, undefined);
});

test("editor-state-insertion", "clearing pending insertion emits once", () => {
    const state = new EditorState();

    state.setInsertionTarget({
        type: "phase",
        index: 1,
    });

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.clearInsertionTarget();

    assertEqual(notificationCount, 1);
});

test("editor-state-insertion", "clearing empty pending insertion does not emit", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.clearInsertionTarget();

    assertEqual(notificationCount, 0);
});
