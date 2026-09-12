/** Starts editing the requested phase name from committed protocol data. */
export function startPhaseNameEdit(protocolModel, editorState, phaseId) {
    const phase = protocolModel.getSnapshot().phases.find((candidate) => candidate.id === phaseId);

    if (phase === undefined) {
        throw new Error(`Cannot edit missing phase "${phaseId}".`);
    }

    editorState.startPhaseNameEdit(phaseId, phase.name);
}

/** Applies the active phase-name draft when it contains a valid name. */
export function applyPhaseNameDraft(protocolModel, editorState) {
    const { editingPhaseId: phaseId, phaseNameDraft } = editorState.getSnapshot();

    if (phaseId === undefined || typeof phaseNameDraft !== "string") {
        throw new Error("Cannot save a phase name without an active phase-name edit.");
    }

    const name = phaseNameDraft.trim();

    if (name === "") {
        return {
            applied: false,
            phaseId,
        };
    }

    protocolModel.updatePhase(phaseId, {
        name,
    });

    return {
        applied: true,
        phaseId,
    };
}
