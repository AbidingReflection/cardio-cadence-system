import { getActiveBlockPhaseId } from "./protocol-controller-utils.js";

import { checkBlockDraftNavigation } from "./block-editor-controller.js";

/** Requests deletion of a block while protecting its active draft. */
export function requestDeleteBlock(protocolModel, editorState, blockId) {
    if (typeof blockId !== "string" || blockId.trim() === "") {
        throw new Error("Block deletion requires a block ID.");
    }

    const editorSnapshot = editorState.getSnapshot();

    if (editorSnapshot.expandedBlockId === blockId) {
        const navigation = checkBlockDraftNavigation(editorState);

        if (navigation.outcome === "blocked") {
            return navigation;
        }

        editorState.closeBlockDraft();
    }

    protocolModel.removeBlock(blockId);

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

    return {
        outcome: "proceed",
    };
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
export function requestMoveBlock(protocolModel, editorState, blockId, targetIndex) {
    if (typeof blockId !== "string" || blockId.trim() === "") {
        throw new Error("Block move request requires a block ID.");
    }

    const editorSnapshot = editorState.getSnapshot();

    if (editorSnapshot.expandedBlockId === blockId) {
        const navigation = checkBlockDraftNavigation(editorState);

        if (navigation.outcome === "blocked") {
            return navigation;
        }
    }

    protocolModel.moveBlock(blockId, targetIndex);

    return {
        outcome: "proceed",
    };
}
