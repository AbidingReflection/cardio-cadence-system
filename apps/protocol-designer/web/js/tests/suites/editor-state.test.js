import {
    test,
    assertEqual,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import { EditorState } from "../../state/editor-state.js";

test("editor-state", "starts with no expanded phases or block", () => {
    const state = new EditorState();

    assertDeepEqual(state.getSnapshot(), {
        expandedPhaseIds: [],
        expandedBlockId: undefined,
        activeBlockDraft: undefined,
        validationErrors: [],
        insertionTarget: undefined,
        editingPhaseId: undefined,
        phaseNameDraft: undefined,
        editMode: undefined,
    });
});

test("editor-state", "expands a phase", () => {
    const state = new EditorState();

    state.expandPhase("phase-1");

    assertDeepEqual(state.getSnapshot().expandedPhaseIds, ["phase-1"]);
});

test("editor-state", "supports multiple expanded phases", () => {
    const state = new EditorState();

    state.expandPhase("phase-1");
    state.expandPhase("phase-2");

    assertDeepEqual(state.getSnapshot().expandedPhaseIds, ["phase-1", "phase-2"]);
});

test("editor-state", "collapses a phase", () => {
    const state = new EditorState();

    state.expandPhase("phase-1");
    state.expandPhase("phase-2");
    state.collapsePhase("phase-1");

    assertDeepEqual(state.getSnapshot().expandedPhaseIds, ["phase-2"]);
});

test("editor-state", "toggles phase expansion", () => {
    const state = new EditorState();

    state.togglePhase("phase-1");

    assertDeepEqual(state.getSnapshot().expandedPhaseIds, ["phase-1"]);

    state.togglePhase("phase-1");

    assertDeepEqual(state.getSnapshot().expandedPhaseIds, []);
});

test("editor-state", "expands one block at a time", () => {
    const state = new EditorState();

    state.expandBlock("block-1");
    state.expandBlock("block-2");

    assertEqual(state.getSnapshot().expandedBlockId, "block-2");
});

test("editor-state", "collapses the expanded block", () => {
    const state = new EditorState();

    state.expandBlock("block-1");
    state.collapseBlock();

    assertEqual(state.getSnapshot().expandedBlockId, undefined);
});

test("editor-state", "notifies subscribers after state changes", () => {
    const state = new EditorState();

    let receivedSnapshot;

    state.subscribe((snapshot) => {
        receivedSnapshot = snapshot;
    });

    state.expandPhase("phase-1");

    assertDeepEqual(receivedSnapshot, {
        expandedPhaseIds: ["phase-1"],
        expandedBlockId: undefined,
        activeBlockDraft: undefined,
        validationErrors: [],
        insertionTarget: undefined,
        editingPhaseId: undefined,
        phaseNameDraft: undefined,
        editMode: undefined,
    });
});

test("editor-state", "does not emit for repeated no-op expansion", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.expandPhase("phase-1");
    state.expandPhase("phase-1");

    assertEqual(notificationCount, 1);
});

test("editor-state", "does not emit when collapsing an already collapsed phase", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.collapsePhase("phase-1");

    assertEqual(notificationCount, 0);
});

test("editor-state", "does not emit when expanding the already expanded block", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.expandBlock("block-1");
    state.expandBlock("block-1");

    assertEqual(notificationCount, 1);
});

test("editor-state", "does not emit when no block is expanded", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.collapseBlock();

    assertEqual(notificationCount, 0);
});

test("editor-state", "supports multiple subscribers", () => {
    const state = new EditorState();

    let firstCount = 0;
    let secondCount = 0;

    state.subscribe(() => {
        firstCount += 1;
    });

    state.subscribe(() => {
        secondCount += 1;
    });

    state.expandPhase("phase-1");

    assertEqual(firstCount, 1);
    assertEqual(secondCount, 1);
});

test("editor-state", "unsubscribe stops future notifications", () => {
    const state = new EditorState();

    let notificationCount = 0;

    const unsubscribe = state.subscribe(() => {
        notificationCount += 1;
    });

    state.expandPhase("phase-1");

    unsubscribe();

    state.expandPhase("phase-2");

    assertEqual(notificationCount, 1);
});

test("editor-state", "returns independent snapshots", () => {
    const state = new EditorState();

    state.expandPhase("phase-1");

    const snapshot = state.getSnapshot();

    snapshot.expandedPhaseIds.push("phase-2");

    assertDeepEqual(state.getSnapshot().expandedPhaseIds, ["phase-1"]);
});

test("editor-state", "starts a block draft", () => {
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

test("editor-state", "isolates block draft from source data", () => {
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

test("editor-state", "updates the active block draft", () => {
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

test("editor-state", "preserves unspecified draft fields during update", () => {
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

test("editor-state", "isolates updated draft data from source updates", () => {
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

test("editor-state", "rejects updating when no block draft is active", () => {
    const state = new EditorState();

    assertThrows(() => {
        state.updateBlockDraft({
            name: "Updated",
        });
    });
});

test("editor-state", "emits when block draft state changes", () => {
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

test("editor-state", "returns independent block draft snapshots", () => {
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

test("editor-state", "block draft starts clean", () => {
    const state = new EditorState();

    state.startBlockDraft({
        mode: "edit",
        blockId: "block-1",
        name: "Warmup Block",
        durationSeconds: 300,
    });

    assertEqual(state.isBlockDraftDirty(), false);
});

test("editor-state", "block draft becomes dirty after an update", () => {
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

test("editor-state", "block draft returns clean when restored to baseline", () => {
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

test("editor-state", "no active block draft is not dirty", () => {
    const state = new EditorState();

    assertEqual(state.isBlockDraftDirty(), false);
});

test("editor-state", "dirty comparison ignores object key order", () => {
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

test("editor-state", "cancels the active block draft", () => {
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

test("editor-state", "canceling a block draft emits once", () => {
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

test("editor-state", "canceling without an active draft does not emit", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.cancelBlockDraft();

    assertEqual(notificationCount, 0);
});

test("editor-state", "sets validation errors", () => {
    const state = new EditorState();

    const errors = [
        {
            scope: "block",
            entityId: "block-1",
            field: "durationSeconds",
            message: "Duration must be greater than zero.",
        },
    ];

    state.setValidationErrors(errors);

    assertDeepEqual(state.getSnapshot().validationErrors, errors);
});

test("editor-state", "isolates validation errors from source data", () => {
    const state = new EditorState();

    const errors = [
        {
            scope: "block",
            entityId: "block-1",
            field: "durationSeconds",
            message: "Duration must be greater than zero.",
        },
    ];

    state.setValidationErrors(errors);

    errors[0].message = "Changed";

    assertEqual(
        state.getSnapshot().validationErrors[0].message,
        "Duration must be greater than zero.",
    );
});

test("editor-state", "returns independent validation error snapshots", () => {
    const state = new EditorState();

    state.setValidationErrors([
        {
            scope: "block",
            entityId: "block-1",
            field: "durationSeconds",
            message: "Duration must be greater than zero.",
        },
    ]);

    const snapshot = state.getSnapshot();

    snapshot.validationErrors[0].message = "Changed";

    assertEqual(
        state.getSnapshot().validationErrors[0].message,
        "Duration must be greater than zero.",
    );
});

test("editor-state", "emits when validation errors change", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.setValidationErrors([
        {
            scope: "block",
            entityId: "block-1",
            field: "durationSeconds",
            message: "Duration must be greater than zero.",
        },
    ]);

    assertEqual(notificationCount, 1);
});

test("editor-state", "does not emit when validation errors are unchanged", () => {
    const state = new EditorState();

    const errors = [
        {
            scope: "block",
            entityId: "block-1",
            field: "durationSeconds",
            message: "Duration must be greater than zero.",
        },
    ];

    state.setValidationErrors(errors);

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.setValidationErrors(structuredClone(errors));

    assertEqual(notificationCount, 0);
});

test("editor-state", "validation error comparison ignores object key order", () => {
    const state = new EditorState();

    state.setValidationErrors([
        {
            scope: "block",
            entityId: "block-1",
            field: "durationSeconds",
            message: "Duration must be greater than zero.",
        },
    ]);

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.setValidationErrors([
        {
            message: "Duration must be greater than zero.",
            field: "durationSeconds",
            entityId: "block-1",
            scope: "block",
        },
    ]);

    assertEqual(notificationCount, 0);
});

test("editor-state", "clears validation errors", () => {
    const state = new EditorState();

    state.setValidationErrors([
        {
            scope: "block",
            entityId: "block-1",
            field: "durationSeconds",
            message: "Duration must be greater than zero.",
        },
    ]);

    state.clearValidationErrors();

    assertDeepEqual(state.getSnapshot().validationErrors, []);
});

test("editor-state", "clearing validation errors emits once", () => {
    const state = new EditorState();

    state.setValidationErrors([
        {
            scope: "block",
            entityId: "block-1",
            field: "durationSeconds",
            message: "Duration must be greater than zero.",
        },
    ]);

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.clearValidationErrors();

    assertEqual(notificationCount, 1);
});

test("editor-state", "clearing empty validation errors does not emit", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.clearValidationErrors();

    assertEqual(notificationCount, 0);
});

test("editor-state", "sets a phase insertion target", () => {
    const state = new EditorState();

    const insertion = {
        type: "phase",
        index: 1,
    };

    state.setInsertionTarget(insertion);

    assertDeepEqual(
        state.getSnapshot().insertionTarget,
        insertion,
    );
});

test("editor-state", "sets a block insertion target", () => {
    const state = new EditorState();

    const insertion = {
        type: "block",
        phaseId: "phase-1",
        index: 2,
    };

    state.setInsertionTarget(insertion);

    assertDeepEqual(
        state.getSnapshot().insertionTarget,
        insertion,
    );
});

test("editor-state", "isolates insertion target from source data", () => {
    const state = new EditorState();

    const insertion = {
        type: "block",
        phaseId: "phase-1",
        index: 2,
    };

    state.setInsertionTarget(insertion);

    insertion.index = 99;

    assertEqual(
        state.getSnapshot().insertionTarget.index,
                2,
    );
});

test("editor-state", "returns independent insertion target snapshots", () => {
    const state = new EditorState();

    state.setInsertionTarget({
        type: "block",
        phaseId: "phase-1",
        index: 2,
    });

    const snapshot = state.getSnapshot();

    snapshot.insertionTarget.index = 99;

    assertEqual(
        state.getSnapshot().insertionTarget.index,
                2,
    );
});

test("editor-state", "emits when pending insertion changes", () => {
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

test("editor-state", "does not emit when pending insertion is unchanged", () => {
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

test("editor-state", "clears pending insertion", () => {
    const state = new EditorState();

    state.setInsertionTarget({
        type: "phase",
        index: 1,
    });

    state.clearInsertionTarget();

    assertEqual(state.getSnapshot().clearInsertionTarget, undefined);
});

test("editor-state", "clearing pending insertion emits once", () => {
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

test("editor-state", "clearing empty pending insertion does not emit", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.clearInsertionTarget();

    assertEqual(notificationCount, 0);
});

test("editor-state", "starts phase-name editing", () => {
    const state = new EditorState();

    state.startPhaseNameEdit("phase-1", "Warm-up");

    const snapshot = state.getSnapshot();

    assertEqual(snapshot.editingPhaseId, "phase-1");
    assertEqual(snapshot.phaseNameDraft, "Warm-up");
});

test("editor-state", "updates the active phase-name draft", () => {
    const state = new EditorState();

    state.startPhaseNameEdit("phase-1", "Warm-up");
    state.updatePhaseNameDraft("Extended Warm-up");

    assertEqual(
        state.getSnapshot().phaseNameDraft,
                "Extended Warm-up",
    );
});

test("editor-state", "closes phase-name editing", () => {
    const state = new EditorState();

    state.startPhaseNameEdit("phase-1", "Warm-up");
    state.closePhaseNameEdit();

    const snapshot = state.getSnapshot();

    assertEqual(snapshot.editingPhaseId, undefined);
    assertEqual(snapshot.phaseNameDraft, undefined);
});

test(
    "editor-state",
     "rejects phase-name updates without an active edit",
     () => {
         const state = new EditorState();

         assertThrows(() => {
             state.updatePhaseNameDraft("Warm-up");
         });
     },
);

test("editor-state", "sets block edit mode", () => {
    const state = new EditorState();

    state.setEditMode("block");

    assertEqual(
        state.getSnapshot().editMode,
                "block",
    );
});

test("editor-state", "sets phase edit mode", () => {
    const state = new EditorState();

    state.setEditMode("phase");

    assertEqual(
        state.getSnapshot().editMode,
                "phase",
    );
});

test("editor-state", "clears edit mode", () => {
    const state = new EditorState();

    state.setEditMode("block");
    state.clearEditMode();

    assertEqual(
        state.getSnapshot().editMode,
                undefined,
    );
});

test("editor-state", "rejects unsupported edit modes", () => {
    const state = new EditorState();

    assertThrows(() => {
        state.setEditMode("banana");
    });
});

test("editor-state", "opens a block create draft atomically", () => {
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

    state.openBlockCreateDraft(
        "__new-block-draft__",
        draft,
        insertionTarget,
    );

    const snapshot = state.getSnapshot();

    assertEqual(
        snapshot.editMode,
        undefined,
    );

    assertDeepEqual(
        snapshot.insertionTarget,
        insertionTarget,
    );

    assertEqual(
        snapshot.expandedBlockId,
        "__new-block-draft__",
    );

    assertDeepEqual(
        snapshot.activeBlockDraft,
        draft,
    );

    assertDeepEqual(
        snapshot.validationErrors,
        [],
    );
});

test("editor-state", "isolates block create draft inputs from source data", () => {
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

    state.openBlockCreateDraft(
        "__new-block-draft__",
        draft,
        insertionTarget,
    );

    draft.name = "Mutated";
    draft.variables.speed.start = "99";
    insertionTarget.index = 99;

    const snapshot = state.getSnapshot();

    assertEqual(
        snapshot.activeBlockDraft.name,
        "",
    );

    assertEqual(
        snapshot.activeBlockDraft.variables.speed.start,
        "",
    );

    assertEqual(
        snapshot.insertionTarget.index,
        2,
    );
});

test("editor-state", "opening a block create draft emits once", () => {
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

    assertEqual(
        emitCount,
        1,
    );
});
