/**
 * Provides a lightweight EditorState fake for controller tests, including
 * snapshot state, mutation tracking, and basic draft/navigation behavior.
 */

/** Creates a lightweight EditorState fake for controller tests. */
export function createEditorStateFake(
    activeBlockDraft
) {
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

    let pendingInsertion = {
        type: "block",
        phaseId: "phase-1",
        index: 0,
    };

    let expandedBlockId;

    let expandedPhaseIds = [
        "phase-1",
        "phase-2",
    ];

    const calls = {
        setValidationErrors: 0,
        clearValidationErrors: 0,
        cancelBlockDraft: 0,
        clearPendingInsertion: 0,
        expandBlock: 0,
        collapseBlock: 0,
        collapsePhase: 0,
    };

    return {
        calls,

        getSnapshot() {
            return {
                activeBlockDraft:
                draft === undefined
                ? undefined
                : structuredClone(draft),
                validationErrors:
                structuredClone(validationErrors),
                pendingInsertion:
                pendingInsertion === undefined
                ? undefined
                : structuredClone(pendingInsertion),
                expandedBlockId,
                expandedPhaseIds: [
                    ...expandedPhaseIds,
                ],
            };
        },

        setValidationErrors(errors) {
            calls.setValidationErrors++;
            validationErrors =
            structuredClone(errors);
        },

        clearValidationErrors() {
            calls.clearValidationErrors++;
            validationErrors = [];
        },

        cancelBlockDraft() {
            calls.cancelBlockDraft++;
            draft = undefined;
        },

        clearPendingInsertion() {
            calls.clearPendingInsertion++;
            pendingInsertion = undefined;
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
            expandedPhaseIds =
            expandedPhaseIds.filter(
                id => id !== phaseId
            );
        },
    };
}
