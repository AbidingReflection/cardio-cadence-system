/** Returns the phase ID containing a block. */
export function getBlockPhaseId(protocolModel, blockId) {
    const protocol = protocolModel.getSnapshot();

    for (const phase of protocol.phases) {
        if (phase.blocks.some((block) => block.id === blockId)) {
            return phase.id;
        }
    }

    throw new Error(`Block not found in protocol: "${blockId}".`);
}

/** Returns the phase containing the active expanded block editor. */
export function getActiveBlockPhaseId(protocolModel, editorSnapshot) {
    const draft = editorSnapshot.activeBlockDraft;

    if (draft?.mode === "create" && typeof draft.phaseId === "string") {
        return draft.phaseId;
    }

    const blockId = editorSnapshot.expandedBlockId;

    if (blockId === undefined) {
        return undefined;
    }

    return getBlockPhaseId(protocolModel, blockId);
}
