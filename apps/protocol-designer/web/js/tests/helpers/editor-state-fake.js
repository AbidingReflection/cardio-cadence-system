/**
 * Provides a lightweight EditorState fake for controller tests, including
 * snapshot state, mutation tracking, and basic draft/navigation behavior.
 */

/** Creates a lightweight EditorState fake for controller tests. */
export function createEditorStateFake(activeBlockDraft) {
    let draft =
    activeBlockDraft === undefined
    ? undefined
    : structuredClone(activeBlockDraft);

    let validationErrors = [
        {
            scope: "block",
            field: "existing",
            message: "Existing error.",
        },
    ];

    let insertionTarget = {
        type: "block",
        phaseId: "phase-1",
        index: 0,
    };

    let editMode;

    let expandedBlockId;

    let expandedPhaseIds = ["phase-1", "phase-2"];

    const calls = {
        setValidationErrors: 0,
        clearValidationErrors: 0,
        cancelBlockDraft: 0,
        setInsertionTarget: 0,
        clearInsertionTarget: 0,
        setEditMode: 0,
        clearEditMode: 0,
        expandBlock: 0,
        collapseBlock: 0,
        collapsePhase: 0,
        closeBlockDraft: 0,
        openBlockDraft: 0,
        openBlockCreateDraft: [],
    };

    return {
        calls,

        /** Returns the fake editor-state snapshot. */
        getSnapshot() {
            return {
                activeBlockDraft:
                draft === undefined
                ? undefined
                : structuredClone(draft),
                validationErrors: structuredClone(validationErrors),
                insertionTarget:
                insertionTarget === undefined
                ? undefined
                : structuredClone(insertionTarget),
                editMode,
                expandedBlockId,
                expandedPhaseIds: [...expandedPhaseIds],
            };
        },

        /** Replaces the current validation errors. */
        setValidationErrors(errors) {
            calls.setValidationErrors++;
            validationErrors = structuredClone(errors);
        },

        /** Clears all validation errors. */
        clearValidationErrors() {
            calls.clearValidationErrors++;
            validationErrors = [];
        },

        /** Cancels the active block draft. */
        cancelBlockDraft() {
            calls.cancelBlockDraft++;
            draft = undefined;
        },

        /** Closes the active block editor. */
        closeBlockDraft() {
            calls.closeBlockDraft++;

            expandedBlockId = undefined;
            draft = undefined;
            validationErrors = [];
        },

        /** Opens a block editor with a fresh active draft. */
        openBlockDraft(blockId, newDraft) {
            calls.openBlockDraft++;

            expandedBlockId = blockId;
            draft = structuredClone(newDraft);
            validationErrors = [];
        },

        /** Opens a create-mode block draft and its insertion target atomically. */
        openBlockCreateDraft(blockId, newDraft, target) {
            calls.openBlockCreateDraft.push({
                blockId,
                draft: structuredClone(newDraft),
                                            insertionTarget: structuredClone(target),
            });

            editMode = undefined;
            insertionTarget = structuredClone(target);
            expandedBlockId = blockId;
            draft = structuredClone(newDraft);
            validationErrors = [];
        },

        /** Sets the concrete insertion target. */
        setInsertionTarget(target) {
            calls.setInsertionTarget++;
            insertionTarget = structuredClone(target);
        },

        /** Clears the concrete insertion target. */
        clearInsertionTarget() {
            calls.clearInsertionTarget++;
            insertionTarget = undefined;
        },

        /** Sets the active structural edit mode. */
        setEditMode(mode) {
            calls.setEditMode++;
            editMode = mode;
        },

        /** Clears the active structural edit mode. */
        clearEditMode() {
            calls.clearEditMode++;
            editMode = undefined;
        },

        /** Expands a block by ID. */
        expandBlock(blockId) {
            calls.expandBlock++;
            expandedBlockId = blockId;
        },

        /** Collapses the expanded block. */
        collapseBlock() {
            calls.collapseBlock++;
            expandedBlockId = undefined;
        },

        /** Collapses a phase by ID. */
        collapsePhase(phaseId) {
            calls.collapsePhase++;
            expandedPhaseIds = expandedPhaseIds.filter(
                (id) => id !== phaseId,
            );
        },
    };
}
