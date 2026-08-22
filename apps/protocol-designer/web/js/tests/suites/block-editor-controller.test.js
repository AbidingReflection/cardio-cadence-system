import {
    test,
    assertEqual,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import {
    applyBlockDraft,
    cancelBlockEdit,
    checkBlockDraftNavigation,
    resolveBlockDraftNavigation,
    requestExpandBlock,
    requestCollapseBlock,
    requestCollapsePhase,
} from "../../controllers/block-editor-controller.js";

import { createEditorStateFake } from "../helpers/editor-state-fake.js";

import { createProtocolModelFake } from "../helpers/protocol-model-fake.js";

const ACTIVITY_TYPE = {
    id: "treadmill",
    variables: [
        {
            id: "speed",
            name: "Speed",
            unit: "MPH",
            role: "pace",
        },
        {
            id: "incline",
            name: "Incline",
            unit: "%",
            role: "load",
        },
    ],
};

/** Creates a valid edit-mode block draft. */
function createEditDraft() {
    return {
        mode: "edit",
        blockId: "block-1",
        phaseId: "phase-1",
        name: "Climb",
        duration: "3:00",
        variables: {
            speed: {
                type: "linear",
                start: "3.5",
                end: "5",
            },
            incline: {
                type: "steady",
                start: "2",
            },
        },
    };
}

/** Creates a valid create-mode block draft. */
function createCreateDraft() {
    const draft = createEditDraft();

    draft.mode = "create";
    delete draft.blockId;

    return draft;
}

test("block-editor-controller", "applies a valid edit draft", () => {
    const protocolModel = createProtocolModelFake();

    const editorState = createEditorStateFake(createEditDraft());

    const result = applyBlockDraft(protocolModel, editorState, ACTIVITY_TYPE);

    assertEqual(result, true);

    assertDeepEqual(protocolModel.calls.updateBlock, [
        {
            blockId: "block-1",
            blockData: {
                name: "Climb",
                durationSeconds: 180,
                variables: {
                    speed: {
                        type: "linear",
                        start: 3.5,
                        end: 5,
                    },
                    incline: {
                        type: "steady",
                        start: 2,
                    },
                },
            },
        },
    ]);

    assertDeepEqual(protocolModel.calls.addBlock, []);

    assertEqual(editorState.calls.closeBlockDraft, 1);

    assertEqual(editorState.calls.openBlockDraft, 0);

    assertEqual(editorState.calls.clearValidationErrors, 0);

    assertEqual(editorState.calls.cancelBlockDraft, 0);

    assertEqual(editorState.getSnapshot().expandedBlockId, undefined);

    assertEqual(editorState.getSnapshot().activeBlockDraft, undefined);
});

test("block-editor-controller", "applies a valid create draft", () => {
    const protocolModel = createProtocolModelFake();

    const editorState = createEditorStateFake(createCreateDraft());

    const result = applyBlockDraft(protocolModel, editorState, ACTIVITY_TYPE);

    assertEqual(result, true);

    assertDeepEqual(protocolModel.calls.addBlock, [
        {
            phaseId: "phase-1",
            blockData: {
                name: "Climb",
                durationSeconds: 180,
                variables: {
                    speed: {
                        type: "linear",
                        start: 3.5,
                        end: 5,
                    },
                    incline: {
                        type: "steady",
                        start: 2,
                    },
                },
            },
        },
    ]);

    assertDeepEqual(protocolModel.calls.updateBlock, []);

    assertEqual(editorState.calls.clearInsertionTarget, 1);

    assertEqual(editorState.getSnapshot().insertionTarget, undefined);

    assertEqual(editorState.calls.closeBlockDraft, 1);

    assertEqual(editorState.calls.openBlockDraft, 0);

    assertEqual(editorState.calls.expandBlock, 0);

    assertEqual(editorState.calls.cancelBlockDraft, 0);

    assertEqual(editorState.getSnapshot().expandedBlockId, undefined);

    assertEqual(editorState.getSnapshot().activeBlockDraft, undefined);
});

test(
    "block-editor-controller",
    "stores draft validation errors without mutating the protocol",
    () => {
        const draft = createEditDraft();
        draft.duration = "";

        const protocolModel = createProtocolModelFake();

        const editorState = createEditorStateFake(draft);

        const result = applyBlockDraft(protocolModel, editorState, ACTIVITY_TYPE);

        assertEqual(result, false);

        assertDeepEqual(protocolModel.calls.addBlock, []);

        assertDeepEqual(protocolModel.calls.updateBlock, []);

        assertEqual(editorState.calls.setValidationErrors, 1);

        assertEqual(editorState.calls.clearValidationErrors, 0);

        assertEqual(editorState.calls.cancelBlockDraft, 0);

        assertEqual(editorState.getSnapshot().validationErrors[0].field, "duration");

        assertDeepEqual(editorState.getSnapshot().activeBlockDraft, draft);
    },
);

test("block-editor-controller", "throws when there is no active block draft", () => {
    const protocolModel = createProtocolModelFake();

    const editorState = createEditorStateFake(undefined);

    assertThrows(
        () => applyBlockDraft(protocolModel, editorState, ACTIVITY_TYPE),
        "no active block draft",
    );
});

test("block-editor-controller", "throws for an unknown draft mode", () => {
    const draft = createEditDraft();
    draft.mode = "unknown";

    const protocolModel = createProtocolModelFake();

    const editorState = createEditorStateFake(draft);

    assertThrows(
        () => applyBlockDraft(protocolModel, editorState, ACTIVITY_TYPE),
        'Unknown block draft mode: "unknown".',
    );

    assertDeepEqual(protocolModel.calls.addBlock, []);

    assertDeepEqual(protocolModel.calls.updateBlock, []);
});

test("block-editor-controller", "throws when a create draft has no phase ID", () => {
    const draft = createCreateDraft();
    delete draft.phaseId;

    const protocolModel = createProtocolModelFake();

    const editorState = createEditorStateFake(draft);

    assertThrows(
        () => applyBlockDraft(protocolModel, editorState, ACTIVITY_TYPE),
        "New block draft requires a phase ID.",
    );

    assertDeepEqual(protocolModel.calls.addBlock, []);
});

test("block-editor-controller", "throws when an edit draft has no block ID", () => {
    const draft = createEditDraft();
    delete draft.blockId;

    const protocolModel = createProtocolModelFake();

    const editorState = createEditorStateFake(draft);

    assertThrows(
        () => applyBlockDraft(protocolModel, editorState, ACTIVITY_TYPE),
        "Existing block draft requires a block ID.",
    );

    assertDeepEqual(protocolModel.calls.updateBlock, []);
});

test("block-editor-controller", "propagates ProtocolModel mutation errors", () => {
    const protocolModel = createProtocolModelFake();

    protocolModel.updateBlock = () => {
        throw new Error("ProtocolModel rejected mutation.");
    };

    const editorState = createEditorStateFake(createEditDraft());

    assertThrows(
        () => applyBlockDraft(protocolModel, editorState, ACTIVITY_TYPE),
        "ProtocolModel rejected mutation.",
    );

    assertEqual(editorState.calls.setValidationErrors, 0);

    assertEqual(editorState.calls.clearValidationErrors, 0);

    assertEqual(editorState.calls.cancelBlockDraft, 0);
});

test("block-editor-controller", "allows navigation when there is no active block draft", () => {
    const editorState = createEditorStateFake(undefined);

    const result = checkBlockDraftNavigation(editorState);

    assertDeepEqual(result, {
        outcome: "proceed",
    });
});

test("block-editor-controller", "allows navigation when the active block draft is clean", () => {
    const editorState = createEditorStateFake(createEditDraft());

    editorState.isBlockDraftDirty = () => false;

    const result = checkBlockDraftNavigation(editorState);

    assertDeepEqual(result, {
        outcome: "proceed",
    });
});

test("block-editor-controller", "blocks navigation when the active block draft is dirty", () => {
    const editorState = createEditorStateFake(createEditDraft());

    editorState.isBlockDraftDirty = () => true;

    const result = checkBlockDraftNavigation(editorState);

    assertDeepEqual(result, {
        outcome: "blocked",
        reason: "dirty-draft",
    });
});

test("block-editor-controller", "stay leaves the dirty draft unchanged", () => {
    const draft = createEditDraft();

    const protocolModel = createProtocolModelFake();

    const editorState = createEditorStateFake(draft);

    const result = resolveBlockDraftNavigation("stay", protocolModel, editorState, ACTIVITY_TYPE);

    assertDeepEqual(result, {
        outcome: "stay",
    });

    assertDeepEqual(editorState.getSnapshot().activeBlockDraft, draft);

    assertEqual(editorState.calls.cancelBlockDraft, 0);

    assertEqual(editorState.calls.clearValidationErrors, 0);
});

test("block-editor-controller", "discard clears the draft and validation errors", () => {
    const protocolModel = createProtocolModelFake();

    const editorState = createEditorStateFake(createEditDraft());

    const result = resolveBlockDraftNavigation(
        "discard",
        protocolModel,
        editorState,
        ACTIVITY_TYPE,
    );

    assertDeepEqual(result, {
        outcome: "proceed",
    });

    assertEqual(editorState.calls.closeBlockDraft, 1);

    assertEqual(editorState.calls.clearValidationErrors, 0);

    assertEqual(editorState.calls.cancelBlockDraft, 0);

    assertEqual(editorState.getSnapshot().activeBlockDraft, undefined);

    assertEqual(editorState.getSnapshot().expandedBlockId, undefined);

    assertDeepEqual(editorState.getSnapshot().validationErrors, []);
});

test("block-editor-controller", "apply proceeds when the draft commits successfully", () => {
    const protocolModel = createProtocolModelFake();

    const editorState = createEditorStateFake(createEditDraft());

    const result = resolveBlockDraftNavigation("apply", protocolModel, editorState, ACTIVITY_TYPE);

    assertDeepEqual(result, {
        outcome: "proceed",
    });

    assertEqual(protocolModel.calls.updateBlock.length, 1);

    assertEqual(editorState.calls.closeBlockDraft, 1);

    assertEqual(editorState.calls.openBlockDraft, 0);

    assertEqual(editorState.calls.cancelBlockDraft, 0);

    assertEqual(editorState.getSnapshot().expandedBlockId, undefined);

    assertEqual(editorState.getSnapshot().activeBlockDraft, undefined);
});

test("block-editor-controller", "apply stays when draft validation fails", () => {
    const draft = createEditDraft();
    draft.duration = "";

    const protocolModel = createProtocolModelFake();

    const editorState = createEditorStateFake(draft);

    const result = resolveBlockDraftNavigation("apply", protocolModel, editorState, ACTIVITY_TYPE);

    assertDeepEqual(result, {
        outcome: "stay",
    });

    assertDeepEqual(protocolModel.calls.updateBlock, []);

    assertEqual(editorState.calls.setValidationErrors, 1);

    assertEqual(editorState.calls.cancelBlockDraft, 0);

    assertDeepEqual(editorState.getSnapshot().activeBlockDraft, draft);
});

test("block-editor-controller", "throws for an unknown navigation choice", () => {
    const protocolModel = createProtocolModelFake();

    const editorState = createEditorStateFake(createEditDraft());

    assertThrows(
        () => resolveBlockDraftNavigation("unknown", protocolModel, editorState, ACTIVITY_TYPE),
        'Unknown block draft navigation choice: "unknown".',
    );
});

test("block-editor-controller", "expands a block when no draft is active", () => {
    const editorState = createEditorStateFake(undefined);

    const result = requestExpandBlock(editorState, "block-2");

    assertDeepEqual(result, {
        outcome: "proceed",
    });

    assertEqual(editorState.calls.expandBlock, 1);

    assertEqual(editorState.getSnapshot().expandedBlockId, "block-2");

    assertEqual(editorState.calls.cancelBlockDraft, 0);
});

test("block-editor-controller", "does nothing when the requested block is already expanded", () => {
    const editorState = createEditorStateFake(createEditDraft());

    editorState.expandBlock("block-1");

    const expandCallsBefore = editorState.calls.expandBlock;

    const result = requestExpandBlock(editorState, "block-1");

    assertDeepEqual(result, {
        outcome: "proceed",
    });

    assertEqual(editorState.calls.expandBlock, expandCallsBefore);

    assertEqual(editorState.calls.cancelBlockDraft, 0);
});

test("block-editor-controller", "expands another block after discarding a clean draft", () => {
    const editorState = createEditorStateFake(createEditDraft());

    editorState.isBlockDraftDirty = () => false;

    const result = requestExpandBlock(editorState, "block-2");

    assertDeepEqual(result, {
        outcome: "proceed",
    });

    assertEqual(editorState.calls.clearValidationErrors, 1);

    assertEqual(editorState.calls.cancelBlockDraft, 1);

    assertEqual(editorState.calls.expandBlock, 1);

    assertEqual(editorState.getSnapshot().activeBlockDraft, undefined);

    assertEqual(editorState.getSnapshot().expandedBlockId, "block-2");
});

test("block-editor-controller", "blocks expansion of another block when the draft is dirty", () => {
    const draft = createEditDraft();

    const editorState = createEditorStateFake(draft);

    editorState.expandBlock("block-1");
    editorState.isBlockDraftDirty = () => true;

    const expandCallsBefore = editorState.calls.expandBlock;

    const result = requestExpandBlock(editorState, "block-2");

    assertDeepEqual(result, {
        outcome: "blocked",
        reason: "dirty-draft",
    });

    assertEqual(editorState.calls.expandBlock, expandCallsBefore);

    assertEqual(editorState.calls.cancelBlockDraft, 0);

    assertEqual(editorState.getSnapshot().expandedBlockId, "block-1");

    assertDeepEqual(editorState.getSnapshot().activeBlockDraft, draft);
});

test(
    "block-editor-controller",
    "does not block the already-expanded block when its draft is dirty",
    () => {
        const editorState = createEditorStateFake(createEditDraft());

        editorState.expandBlock("block-1");
        editorState.isBlockDraftDirty = () => true;

        const expandCallsBefore = editorState.calls.expandBlock;

        const result = requestExpandBlock(editorState, "block-1");

        assertDeepEqual(result, {
            outcome: "proceed",
        });

        assertEqual(editorState.calls.expandBlock, expandCallsBefore);

        assertEqual(editorState.calls.cancelBlockDraft, 0);
    },
);

test("block-editor-controller", "throws when block expansion has no block ID", () => {
    const editorState = createEditorStateFake(undefined);

    assertThrows(() => requestExpandBlock(editorState, ""), "Block expansion requires a block ID.");
});

test("block-editor-controller", "collapse block proceeds when no block is expanded", () => {
    const editorState = createEditorStateFake(undefined);

    const result = requestCollapseBlock(editorState);

    assertDeepEqual(result, {
        outcome: "proceed",
    });

    assertEqual(editorState.calls.collapseBlock, 0);
});

test("block-editor-controller", "collapse block collapses an expanded block with no draft", () => {
    const editorState = createEditorStateFake(undefined);

    editorState.expandBlock("block-1");

    const result = requestCollapseBlock(editorState);

    assertDeepEqual(result, {
        outcome: "proceed",
    });

    assertEqual(editorState.calls.closeBlockDraft, 1);

    assertEqual(editorState.getSnapshot().expandedBlockId, undefined);

    assertEqual(editorState.getSnapshot().activeBlockDraft, undefined);
});

test("block-editor-controller", "collapse block discards a clean draft before collapsing", () => {
    const editorState = createEditorStateFake(createEditDraft());

    editorState.expandBlock("block-1");
    editorState.isBlockDraftDirty = () => false;

    const result = requestCollapseBlock(editorState);

    assertDeepEqual(result, {
        outcome: "proceed",
    });

    assertEqual(editorState.calls.closeBlockDraft, 1);

    assertEqual(editorState.getSnapshot().expandedBlockId, undefined);

    assertEqual(editorState.getSnapshot().activeBlockDraft, undefined);

    assertDeepEqual(editorState.getSnapshot().validationErrors, []);
});

test("block-editor-controller", "collapse block is blocked by a dirty draft", () => {
    const draft = createEditDraft();

    const editorState = createEditorStateFake(draft);

    editorState.expandBlock("block-1");
    editorState.isBlockDraftDirty = () => true;

    const result = requestCollapseBlock(editorState);

    assertDeepEqual(result, {
        outcome: "blocked",
        reason: "dirty-draft",
    });

    assertEqual(editorState.calls.collapseBlock, 0);

    assertEqual(editorState.calls.cancelBlockDraft, 0);

    assertEqual(editorState.getSnapshot().expandedBlockId, "block-1");

    assertDeepEqual(editorState.getSnapshot().activeBlockDraft, draft);
});

test("block-editor-controller", "collapse phase throws without a phase ID", () => {
    const protocolModel = createProtocolModelFake();

    const editorState = createEditorStateFake(createEditDraft());

    assertThrows(
        () => requestCollapsePhase(protocolModel, editorState, ""),
        "Phase collapse requires a phase ID.",
    );
});

test(
    "block-editor-controller",
    "collapse phase is a no-op when the phase is already collapsed",
    () => {
        const protocolModel = createProtocolModelFake();

        const editorState = createEditorStateFake(createEditDraft());

        editorState.collapsePhase("phase-2");

        const callsBefore = editorState.calls.collapsePhase;

        const result = requestCollapsePhase(protocolModel, editorState, "phase-2");

        assertDeepEqual(result, {
            outcome: "proceed",
        });

        assertEqual(editorState.calls.collapsePhase, callsBefore);
    },
);

test(
    "block-editor-controller",
    "collapse phase collapses immediately when no active block is inside it",
    () => {
        const protocolModel = createProtocolModelFake();

        const editorState = createEditorStateFake(undefined);

        editorState.expandBlock("block-3");

        const result = requestCollapsePhase(protocolModel, editorState, "phase-1");

        assertDeepEqual(result, {
            outcome: "proceed",
        });

        assertEqual(editorState.calls.collapsePhase, 1);

        assertEqual(editorState.calls.collapseBlock, 0);

        assertEqual(editorState.getSnapshot().expandedBlockId, "block-3");
    },
);

test("block-editor-controller", "collapse phase ignores a dirty draft in another phase", () => {
    const draft = createEditDraft();
    draft.blockId = "block-3";
    draft.phaseId = "phase-2";

    const protocolModel = createProtocolModelFake();

    const editorState = createEditorStateFake(draft);

    editorState.expandBlock("block-3");
    editorState.isBlockDraftDirty = () => true;

    const result = requestCollapsePhase(protocolModel, editorState, "phase-1");

    assertDeepEqual(result, {
        outcome: "proceed",
    });

    assertEqual(editorState.calls.collapsePhase, 1);

    assertEqual(editorState.calls.cancelBlockDraft, 0);

    assertDeepEqual(editorState.getSnapshot().activeBlockDraft, draft);
});

test(
    "block-editor-controller",
    "collapse phase is blocked by a dirty draft inside the phase",
    () => {
        const draft = createEditDraft();

        const protocolModel = createProtocolModelFake();

        const editorState = createEditorStateFake(draft);

        editorState.expandBlock("block-1");
        editorState.isBlockDraftDirty = () => true;

        const result = requestCollapsePhase(protocolModel, editorState, "phase-1");

        assertDeepEqual(result, {
            outcome: "blocked",
            reason: "dirty-draft",
        });

        assertEqual(editorState.calls.collapsePhase, 0);

        assertEqual(editorState.calls.collapseBlock, 0);

        assertEqual(editorState.calls.cancelBlockDraft, 0);
    },
);

test("block-editor-controller", "collapse phase discards a clean draft inside the phase", () => {
    const protocolModel = createProtocolModelFake();

    const editorState = createEditorStateFake(createEditDraft());

    editorState.expandBlock("block-1");
    editorState.isBlockDraftDirty = () => false;

    const result = requestCollapsePhase(protocolModel, editorState, "phase-1");

    assertDeepEqual(result, {
        outcome: "proceed",
    });

    assertEqual(editorState.calls.closeBlockDraft, 1);

    assertEqual(editorState.calls.collapsePhase, 1);

    assertEqual(editorState.getSnapshot().expandedBlockId, undefined);

    assertEqual(editorState.getSnapshot().activeBlockDraft, undefined);

    assertDeepEqual(editorState.getSnapshot().validationErrors, []);
});

test(
    "block-editor-controller",
    "collapse phase uses create draft phase ID for an uncommitted block",
    () => {
        const draft = createCreateDraft();

        draft.phaseId = "phase-1";

        const protocolModel = createProtocolModelFake();

        const editorState = createEditorStateFake(draft);

        editorState.expandBlock("temporary-block");

        editorState.isBlockDraftDirty = () => true;

        const result = requestCollapsePhase(protocolModel, editorState, "phase-1");

        assertDeepEqual(result, {
            outcome: "blocked",
            reason: "dirty-draft",
        });

        assertEqual(editorState.calls.collapsePhase, 0);
    },
);

test(
    "block-editor-controller",
    "collapse phase throws when an expanded committed block is missing from the protocol",
    () => {
        const protocolModel = createProtocolModelFake();

        const editorState = createEditorStateFake(undefined);

        editorState.expandBlock("missing-block");

        assertThrows(
            () => requestCollapsePhase(protocolModel, editorState, "phase-1"),
            'Expanded block not found in protocol: "missing-block".',
        );
    },
);

test(
    "block-editor-controller",
    "cancel block edit discards the draft and collapses the block",
    () => {
        const editorState = createEditorStateFake(createEditDraft());

        editorState.expandBlock("block-1");

        cancelBlockEdit(editorState);

        assertEqual(editorState.calls.closeBlockDraft, 1);

        assertEqual(editorState.getSnapshot().expandedBlockId, undefined);

        assertEqual(editorState.getSnapshot().activeBlockDraft, undefined);
    },
);

test("block-editor-controller", "cancel block edit is a no-op when no block is expanded", () => {
    const editorState = createEditorStateFake();

    cancelBlockEdit(editorState);

    assertEqual(editorState.calls.closeBlockDraft, 0);
});
