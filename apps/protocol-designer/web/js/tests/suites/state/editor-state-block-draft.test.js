import {
    test,
    assertEqual,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import { EditorState } from "../../../state/editor-state.js";

test("editor-state-block-draft", "starts a block draft", () => {
    const state = new EditorState();

    const draft = {
        mode: "edit",
        blockId: "block-1",
        name: "Warmup Block",
        durationSeconds: 300,
        variables: {
            speed: {
                type: "steady",
                start: 4,
            },
        },
    };

    state.startBlockDraft(draft);

    assertDeepEqual(state.getSnapshot().activeBlockDraft, draft);
});

test("editor-state-block-draft", "isolates block draft from source data", () => {
    const state = new EditorState();

    const draft = {
        mode: "edit",
        blockId: "block-1",
        name: "Warmup Block",
        variables: {
            speed: {
                type: "steady",
                start: 4,
            },
        },
    };

    state.startBlockDraft(draft);

    draft.name = "Changed";
    draft.variables.speed.start = 9;

    assertDeepEqual(state.getSnapshot().activeBlockDraft, {
        mode: "edit",
        blockId: "block-1",
        name: "Warmup Block",
        variables: {
            speed: {
                type: "steady",
                start: 4,
            },
        },
    });
});

test("editor-state-block-draft", "updates the active block draft", () => {
    const state = new EditorState();

    state.startBlockDraft({
        mode: "edit",
        blockId: "block-1",
        name: "Warmup Block",
        durationSeconds: 300,
    });

    state.updateBlockDraft({
        name: "Updated Warmup",
        durationSeconds: 600,
    });

    assertDeepEqual(state.getSnapshot().activeBlockDraft, {
        mode: "edit",
        blockId: "block-1",
        name: "Updated Warmup",
        durationSeconds: 600,
    });
});

test("editor-state-block-draft", "preserves unspecified draft fields during update", () => {
    const state = new EditorState();

    state.startBlockDraft({
        mode: "edit",
        blockId: "block-1",
        name: "Warmup Block",
        durationSeconds: 300,
    });

    state.updateBlockDraft({
        name: "Updated Warmup",
    });

    assertEqual(state.getSnapshot().activeBlockDraft.durationSeconds, 300);
});

test("editor-state-block-draft", "isolates updated draft data from source updates", () => {
    const state = new EditorState();

    state.startBlockDraft({
        mode: "edit",
        blockId: "block-1",
        variables: {},
    });

    const updates = {
        variables: {
            speed: {
                type: "steady",
                start: 4,
            },
        },
    };

    state.updateBlockDraft(updates);

    updates.variables.speed.start = 9;

    assertEqual(state.getSnapshot().activeBlockDraft.variables.speed.start, 4);
});

test("editor-state-block-draft", "rejects updating when no block draft is active", () => {
    const state = new EditorState();

    assertThrows(() => {
        state.updateBlockDraft({
            name: "Updated",
        });
    });
});

test("editor-state-block-draft", "emits when block draft state changes", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.startBlockDraft({
        mode: "edit",
        blockId: "block-1",
        name: "Warmup Block",
    });

    assertEqual(notificationCount, 1);

    state.updateBlockDraft({
        name: "Updated Warmup",
    });

    assertEqual(notificationCount, 2);
});

test("editor-state-block-draft", "returns independent block draft snapshots", () => {
    const state = new EditorState();

    state.startBlockDraft({
        mode: "edit",
        blockId: "block-1",
        variables: {
            speed: {
                type: "steady",
                start: 4,
            },
        },
    });

    const snapshot = state.getSnapshot();

    snapshot.activeBlockDraft.variables.speed.start = 9;

    assertEqual(state.getSnapshot().activeBlockDraft.variables.speed.start, 4);
});

test("editor-state-block-draft", "block draft starts clean", () => {
    const state = new EditorState();

    state.startBlockDraft({
        mode: "edit",
        blockId: "block-1",
        name: "Warmup Block",
        durationSeconds: 300,
    });

    assertEqual(state.isBlockDraftDirty(), false);
});

test("editor-state-block-draft", "block draft becomes dirty after an update", () => {
    const state = new EditorState();

    state.startBlockDraft({
        mode: "edit",
        blockId: "block-1",
        name: "Warmup Block",
        durationSeconds: 300,
    });

    state.updateBlockDraft({
        name: "Updated Warmup",
    });

    assertEqual(state.isBlockDraftDirty(), true);
});

test("editor-state-block-draft", "block draft returns clean when restored to baseline", () => {
    const state = new EditorState();

    state.startBlockDraft({
        mode: "edit",
        blockId: "block-1",
        name: "Warmup Block",
        durationSeconds: 300,
    });

    state.updateBlockDraft({
        name: "Updated Warmup",
    });

    state.updateBlockDraft({
        name: "Warmup Block",
    });

    assertEqual(state.isBlockDraftDirty(), false);
});

test("editor-state-block-draft", "no active block draft is not dirty", () => {
    const state = new EditorState();

    assertEqual(state.isBlockDraftDirty(), false);
});

test("editor-state-block-draft", "dirty comparison ignores object key order", () => {
    const state = new EditorState();

    state.startBlockDraft({
        mode: "edit",
        blockId: "block-1",
        variables: {
            speed: {
                type: "steady",
                start: 4,
            },
        },
    });

    state.updateBlockDraft({
        variables: {
            speed: {
                start: 4,
                type: "steady",
            },
        },
    });

    assertEqual(state.isBlockDraftDirty(), false);
});

test("editor-state-block-draft", "cancels the active block draft", () => {
    const state = new EditorState();

    state.startBlockDraft({
        mode: "edit",
        blockId: "block-1",
        name: "Warmup Block",
    });

    state.cancelBlockDraft();

    assertEqual(state.getSnapshot().activeBlockDraft, undefined);

    assertEqual(state.isBlockDraftDirty(), false);
});

test("editor-state-block-draft", "canceling a block draft emits once", () => {
    const state = new EditorState();

    state.startBlockDraft({
        mode: "edit",
        blockId: "block-1",
        name: "Warmup Block",
    });

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.cancelBlockDraft();

    assertEqual(notificationCount, 1);
});

test("editor-state-block-draft", "canceling without an active draft does not emit", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.cancelBlockDraft();

    assertEqual(notificationCount, 0);
});

test(
    "editor-state-block-draft",
    "opens a block create draft atomically without clearing edit mode",
    () => {
        const state = new EditorState();

        state.setEditMode("block");

        const draft = {
            mode: "create",
            phaseId: "phase-1",
            name: "",
            duration: "",
            variables: {
                speed: {
                    type: "steady",
                    start: "",
                },
            },
        };

        const insertionTarget = {
            type: "block",
            phaseId: "phase-1",
            index: 2,
        };

        state.openBlockCreateDraft("__new-block-draft__", draft, insertionTarget);

        const snapshot = state.getSnapshot();

        assertEqual(snapshot.editMode, "block");

        assertDeepEqual(snapshot.insertionTarget, insertionTarget);

        assertEqual(snapshot.expandedBlockId, "__new-block-draft__");

        assertDeepEqual(snapshot.activeBlockDraft, draft);

        assertDeepEqual(snapshot.validationErrors, []);
    },
);

test("editor-state-block-draft", "isolates block create draft inputs from source data", () => {
    const state = new EditorState();

    const draft = {
        mode: "create",
        phaseId: "phase-1",
        name: "",
        duration: "",
        variables: {
            speed: {
                type: "steady",
                start: "",
            },
        },
    };

    const insertionTarget = {
        type: "block",
        phaseId: "phase-1",
        index: 2,
    };

    state.openBlockCreateDraft("__new-block-draft__", draft, insertionTarget);

    draft.name = "Mutated";
    draft.variables.speed.start = "99";
    insertionTarget.index = 99;

    const snapshot = state.getSnapshot();

    assertEqual(snapshot.activeBlockDraft.name, "");

    assertEqual(snapshot.activeBlockDraft.variables.speed.start, "");

    assertEqual(snapshot.insertionTarget.index, 2);
});

test("editor-state-block-draft", "opening a block create draft emits once", () => {
    const state = new EditorState();

    state.setEditMode("block");

    let emitCount = 0;

    state.subscribe(() => {
        emitCount++;
    });

    state.openBlockCreateDraft(
        "__new-block-draft__",
        {
            mode: "create",
            phaseId: "phase-1",
            name: "",
            duration: "",
            variables: {},
        },
        {
            type: "block",
            phaseId: "phase-1",
            index: 1,
        },
    );

    assertEqual(emitCount, 1);
});
