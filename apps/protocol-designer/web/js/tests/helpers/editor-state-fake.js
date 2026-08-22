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

    let expandedBlockId;

    let expandedPhaseIds = ["phase-1", "phase-2"];

    const calls = {
        setValidationErrors: 0,
        clearValidationErrors: 0,
        cancelBlockDraft: 0,
        setInsertionTarget: 0,
        clearInsertionTarget: 0,
        expandBlock: 0,
        collapseBlock: 0,
        collapsePhase: 0,
        closeBlockDraft: 0,
        openBlockDraft: 0,
    };

    return {
        calls,

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
                expandedBlockId,
                expandedPhaseIds: [...expandedPhaseIds],
            };
        },

        setValidationErrors(errors) {
            calls.setValidationErrors++;
            validationErrors = structuredClone(errors);
        },

        clearValidationErrors() {
            calls.clearValidationErrors++;
            validationErrors = [];
        },

        cancelBlockDraft() {
            calls.cancelBlockDraft++;
            draft = undefined;
        },

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

        /** Sets the concrete insertion target. */
        setInsertionTarget(target) {
            calls.setInsertionTarget++;

            if (deepEqual(insertionTarget, target)) {
                return;
            }

            insertionTarget = structuredClone(target);
        },

        /** Clears the concrete insertion target. */
        clearInsertionTarget() {
            calls.clearInsertionTarget++;

            insertionTarget = undefined;
        },

        expandBlock(blockId) {
            calls.expandBlock++;
            expandedBlockId = blockId;
        },

        collapseBlock() {
            calls.collapseBlock++;
            expandedBlockId = undefined;
        },

        collapsePhase(phaseId) {
            calls.collapsePhase++;
            expandedPhaseIds = expandedPhaseIds.filter(
                (id) => id !== phaseId,
            );
        },
    };
}
