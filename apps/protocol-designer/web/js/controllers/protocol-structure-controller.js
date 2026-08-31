import { getActiveBlockPhaseId, getBlockPhaseId } from "./protocol-controller-utils.js";

import { checkBlockDraftNavigation } from "./block-editor-controller.js";

/** Requests deletion of a block while protecting its active draft. */
export function requestDeleteBlock(protocolModel, editorState, blockId) {
    if (typeof blockId !== "string" || blockId.trim() === "") {
        throw new Error("Block deletion requires a block ID.");
    }

    const editorSnapshot = editorState.getSnapshot();
    const replacementSelection = getBlockDeletionSelection(protocolModel, editorSnapshot, blockId);

    if (editorSnapshot.expandedBlockId === blockId) {
        const navigation = checkBlockDraftNavigation(editorState);

        if (navigation.outcome === "blocked") {
            return navigation;
        }

        editorState.closeBlockDraft();
    }

    protocolModel.removeBlock(blockId);

    restoreDeletionSelection(editorState, replacementSelection);

    return {
        outcome: "proceed",
    };
}

/** Requests deletion of a phase while protecting drafts inside it. */
export function requestDeletePhase(protocolModel, editorState, phaseId) {
    if (typeof phaseId !== "string" || phaseId.trim() === "") {
        throw new Error("Phase deletion requires a phase ID.");
    }

    const editorSnapshot = editorState.getSnapshot();
    const replacementSelection = getPhaseDeletionSelection(protocolModel, editorSnapshot, phaseId);

    const activeBlockPhaseId = getActiveBlockPhaseId(protocolModel, editorSnapshot);

    if (activeBlockPhaseId === phaseId) {
        const navigation = checkBlockDraftNavigation(editorState);

        if (navigation.outcome === "blocked") {
            return navigation;
        }

        editorState.closeBlockDraft();
    }

    if (editorSnapshot.editingPhaseId === phaseId) {
        editorState.closePhaseNameEdit();
    }

    protocolModel.removePhase(phaseId);

    restoreDeletionSelection(editorState, replacementSelection);

    return {
        outcome: "proceed",
    };
}

/** Returns the selection that should replace a deleted selected block. */
function getBlockDeletionSelection(protocolModel, editorSnapshot, blockId) {
    if (editorSnapshot.selectedBlockId !== blockId) {
        return undefined;
    }

    const protocol = protocolModel.getSnapshot();

    for (const phase of protocol.phases) {
        const blockIndex = phase.blocks.findIndex((block) => block.id === blockId);

        if (blockIndex === -1) {
            continue;
        }

        const nextBlock = phase.blocks[blockIndex + 1];

        if (nextBlock !== undefined) {
            return {
                type: "block",
                id: nextBlock.id,
            };
        }

        const previousBlock = phase.blocks[blockIndex - 1];

        if (previousBlock !== undefined) {
            return {
                type: "block",
                id: previousBlock.id,
            };
        }

        return {
            type: "phase",
            id: phase.id,
        };
    }

    throw new Error(`Block not found in protocol: "${blockId}".`);
}

/** Returns the selection that should replace structure removed with a phase. */
function getPhaseDeletionSelection(protocolModel, editorSnapshot, phaseId) {
    const protocol = protocolModel.getSnapshot();
    const phaseIndex = protocol.phases.findIndex((phase) => phase.id === phaseId);

    if (phaseIndex === -1) {
        throw new Error(`Phase not found in protocol: "${phaseId}".`);
    }

    const selectedPhaseWillBeRemoved = editorSnapshot.selectedPhaseId === phaseId;

    const selectedBlockWillBeRemoved =
        editorSnapshot.selectedBlockId !== undefined &&
        getBlockPhaseId(protocolModel, editorSnapshot.selectedBlockId) === phaseId;

    if (!selectedPhaseWillBeRemoved && !selectedBlockWillBeRemoved) {
        return undefined;
    }

    const nextPhase = protocol.phases[phaseIndex + 1];

    if (nextPhase !== undefined) {
        return {
            type: "phase",
            id: nextPhase.id,
        };
    }

    const previousPhase = protocol.phases[phaseIndex - 1];

    if (previousPhase !== undefined) {
        return {
            type: "phase",
            id: previousPhase.id,
        };
    }

    return {
        type: "none",
    };
}

/** Restores structural selection after deletion when the selected item was removed. */
function restoreDeletionSelection(editorState, selection) {
    if (selection === undefined) {
        return;
    }

    if (selection.type === "block") {
        editorState.selectBlock(selection.id);
        return;
    }

    if (selection.type === "phase") {
        editorState.selectPhase(selection.id);
        return;
    }

    editorState.clearSelection();
}

/** Requests moving a phase while protecting a dirty draft inside it. */
export function requestMovePhase(protocolModel, editorState, phaseId, targetIndex) {
    if (typeof phaseId !== "string" || phaseId.trim() === "") {
        throw new Error("Phase move request requires a phase ID.");
    }

    const editorSnapshot = editorState.getSnapshot();

    const activeBlockPhaseId = getActiveBlockPhaseId(protocolModel, editorSnapshot);

    if (activeBlockPhaseId === phaseId) {
        const navigation = checkBlockDraftNavigation(editorState);

        if (navigation.outcome === "blocked") {
            return navigation;
        }
    }

    protocolModel.movePhase(phaseId, targetIndex);

    return {
        outcome: "proceed",
    };
}

/** Requests moving a block while protecting its active dirty draft. */
export function requestMoveBlock(protocolModel, editorState, blockId, targetPhaseId, targetIndex) {
    if (typeof blockId !== "string" || blockId.trim() === "") {
        throw new Error("Block move request requires a block ID.");
    }

    if (typeof targetPhaseId !== "string" || targetPhaseId.trim() === "") {
        throw new Error("Block move request requires a target phase ID.");
    }

    const editorSnapshot = editorState.getSnapshot();

    if (editorSnapshot.expandedBlockId === blockId) {
        const navigation = checkBlockDraftNavigation(editorState);

        if (navigation.outcome === "blocked") {
            return navigation;
        }
    }

    protocolModel.moveBlock(blockId, targetPhaseId, targetIndex);

    editorState.expandPhase(targetPhaseId);

    return {
        outcome: "proceed",
    };
}

/**
 * Requests collapse of a phase while protecting a draft inside that phase.
 */
export function requestCollapsePhase(protocolModel, editorState, phaseId) {
    if (typeof phaseId !== "string" || phaseId.trim() === "") {
        throw new Error("Phase collapse requires a phase ID.");
    }

    const editorSnapshot = editorState.getSnapshot();

    if (!editorSnapshot.expandedPhaseIds.includes(phaseId)) {
        return {
            outcome: "proceed",
        };
    }

    const activeBlockPhaseId = getActiveBlockPhaseId(protocolModel, editorSnapshot);
    const phaseContainsExpandedBlock = activeBlockPhaseId === phaseId;

    if (phaseContainsExpandedBlock) {
        const navigation = checkBlockDraftNavigation(editorState);

        if (navigation.outcome === "blocked") {
            return navigation;
        }

        editorState.closeBlockDraft();
    }

    if (
        editorSnapshot.selectedBlockId !== undefined &&
        getBlockPhaseId(protocolModel, editorSnapshot.selectedBlockId) === phaseId
    ) {
        editorState.selectPhase(phaseId);
    }

    editorState.collapsePhase(phaseId);

    return {
        outcome: "proceed",
    };
}
