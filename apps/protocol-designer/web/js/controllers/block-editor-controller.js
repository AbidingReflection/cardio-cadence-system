import {
    validateBlockDraft,
} from "../editor/block-draft-validation.js";


/**
 * Applies the active block draft to the protocol model.
 */
export function applyBlockDraft(
    protocolModel,
    editorState,
    activityType,
    machineProfile = undefined
) {
    const editorSnapshot = editorState.getSnapshot();
    const draft = editorSnapshot.activeBlockDraft;

    if (draft === undefined) {
        throw new Error(
            "Cannot apply block draft: no active block draft."
        );
    }

    const validationResult = validateBlockDraft(
        draft,
        activityType,
        machineProfile
    );

    if (!validationResult.isValid) {
        editorState.setValidationErrors(
            validationResult.errors
        );

        return false;
    }

    const mode = draft.mode;

    if (mode !== "create" && mode !== "edit") {
        throw new Error(
            `Unknown block draft mode: "${mode}".`
        );
    }

    if (
        mode === "create" &&
        (
            typeof draft.phaseId !== "string" ||
            draft.phaseId.trim() === ""
        )
    ) {
        throw new Error(
            "New block draft requires a phase ID."
        );
    }

    if (
        mode === "edit" &&
        (
            typeof draft.blockId !== "string" ||
            draft.blockId.trim() === ""
        )
    ) {
        throw new Error(
            "Existing block draft requires a block ID."
        );
    }

    if (mode === "create") {
        applyNewBlock(
            protocolModel,
            editorState,
            draft,
            validationResult.blockData
        );
    } else {
        applyExistingBlock(
            protocolModel,
            draft,
            validationResult.blockData
        );
    }

    editorState.clearValidationErrors();
    editorState.cancelBlockDraft();

    return true;
}


/** Adds a validated new block to the protocol. */
function applyNewBlock(
    protocolModel,
    editorState,
    draft,
    blockData
) {
    const blockId = protocolModel.addBlock(
        draft.phaseId,
        blockData
    );

    editorState.clearPendingInsertion();
    editorState.expandBlock(blockId);
}


/** Applies validated changes to an existing block. */
function applyExistingBlock(
    protocolModel,
    draft,
    blockData
) {
    protocolModel.updateBlock(
        draft.blockId,
        blockData
    );
}


/**
 * Returns whether block navigation can proceed without resolving the draft.
 */
export function checkBlockDraftNavigation(editorState) {
    const snapshot = editorState.getSnapshot();

    if (snapshot.activeBlockDraft === undefined) {
        return {
            outcome: "proceed",
        };
    }

    if (!editorState.isBlockDraftDirty()) {
        return {
            outcome: "proceed",
        };
    }

    return {
        outcome: "blocked",
        reason: "dirty-draft",
    };
}


/**
 * Resolves a dirty block draft before navigation continues.
 */
export function resolveBlockDraftNavigation(
    choice,
    protocolModel,
    editorState,
    activityType,
    machineProfile = undefined
) {
    if (
        choice !== "apply" &&
        choice !== "discard" &&
        choice !== "stay"
    ) {
        throw new Error(
            `Unknown block draft navigation choice: "${choice}".`
        );
    }

    if (choice === "stay") {
        return {
            outcome: "stay",
        };
    }

    if (choice === "discard") {
        editorState.clearValidationErrors();
        editorState.cancelBlockDraft();

        return {
            outcome: "proceed",
        };
    }

    const applied = applyBlockDraft(
        protocolModel,
        editorState,
        activityType,
        machineProfile
    );

    if (!applied) {
        return {
            outcome: "stay",
        };
    }

    return {
        outcome: "proceed",
    };
}


/**
 * Requests expansion of a block while protecting an active block draft.
 */
export function requestExpandBlock(
    editorState,
    blockId
) {
    if (
        typeof blockId !== "string" ||
        blockId.trim() === ""
    ) {
        throw new Error(
            "Block expansion requires a block ID."
        );
    }

    const snapshot = editorState.getSnapshot();

    if (snapshot.expandedBlockId === blockId) {
        return {
            outcome: "proceed",
        };
    }

    const navigation =
    checkBlockDraftNavigation(
        editorState
    );

    if (navigation.outcome === "blocked") {
        return navigation;
    }

    if (
        snapshot.activeBlockDraft !== undefined
    ) {
        editorState.clearValidationErrors();
        editorState.cancelBlockDraft();
    }

    editorState.expandBlock(blockId);

    return {
        outcome: "proceed",
    };
}

/**
 * Requests collapse of the expanded block while protecting an active draft.
 */
export function requestCollapseBlock(editorState) {
    const snapshot = editorState.getSnapshot();

    if (snapshot.expandedBlockId === undefined) {
        return {
            outcome: "proceed",
        };
    }

    const navigation =
    checkBlockDraftNavigation(
        editorState
    );

    if (navigation.outcome === "blocked") {
        return navigation;
    }

    editorState.closeBlockDraft();

    return {
        outcome: "proceed",
    };
}

/**
 * Requests collapse of a phase while protecting a draft inside that phase.
 */
export function requestCollapsePhase(
    protocolModel,
    editorState,
    phaseId
) {
    if (
        typeof phaseId !== "string" ||
        phaseId.trim() === ""
    ) {
        throw new Error(
            "Phase collapse requires a phase ID."
        );
    }

    const editorSnapshot =
    editorState.getSnapshot();

    if (
        !editorSnapshot.expandedPhaseIds.includes(
            phaseId
        )
    ) {
        return {
            outcome: "proceed",
        };
    }

    const activeBlockPhaseId =
    getActiveBlockPhaseId(
        protocolModel,
        editorSnapshot
    );

    const phaseContainsExpandedBlock =
    activeBlockPhaseId === phaseId;

    if (phaseContainsExpandedBlock) {
        const navigation =
        checkBlockDraftNavigation(
            editorState
        );

        if (
            navigation.outcome === "blocked"
        ) {
            return navigation;
        }

        editorState.closeBlockDraft();
    }

    editorState.collapsePhase(phaseId);

    return {
        outcome: "proceed",
    };
}


/** Returns the phase ID containing a block. */
function getBlockPhaseId(
    protocolModel,
    blockId
) {
    const protocol =
    protocolModel.getSnapshot();

    for (const phase of protocol.phases) {
        if (
            phase.blocks.some(
                block => block.id === blockId
            )
        ) {
            return phase.id;
        }
    }

    throw new Error(
        `Expanded block not found in protocol: "${blockId}".`
    );
}

/** Returns the phase containing the active expanded block editor. */
function getActiveBlockPhaseId(
    protocolModel,
    editorSnapshot
) {
    const draft =
    editorSnapshot.activeBlockDraft;

    if (
        draft?.mode === "create" &&
        typeof draft.phaseId === "string"
    ) {
        return draft.phaseId;
    }

    const blockId =
    editorSnapshot.expandedBlockId;

    if (blockId === undefined) {
        return undefined;
    }

    return getBlockPhaseId(
        protocolModel,
        blockId
    );
}

/**
 * Starts an edit draft for a committed block.
 */
export function startBlockEdit(
    protocolModel,
    editorState,
    blockId
) {
    if (
        typeof blockId !== "string" ||
        blockId.trim() === ""
    ) {
        throw new Error(
            "Block editing requires a block ID."
        );
    }

    const snapshot =
    editorState.getSnapshot();

    if (
        snapshot.expandedBlockId === blockId &&
        snapshot.activeBlockDraft?.blockId === blockId
    ) {
        return {
            outcome: "proceed",
        };
    }

    const navigation =
    checkBlockDraftNavigation(
        editorState
    );

    if (navigation.outcome === "blocked") {
        return navigation;
    }

    const block =
    getProtocolBlock(
        protocolModel,
        blockId
    );

    const draft =
    createEditDraft(block);

    editorState.openBlockDraft(
        blockId,
        draft
    );

    return {
        outcome: "proceed",
    };
}


/** Returns a committed block by ID. */
function getProtocolBlock(
    protocolModel,
    blockId
) {
    const protocol =
    protocolModel.getSnapshot();

    for (const phase of protocol.phases) {
        const block =
        phase.blocks.find(
            candidate =>
            candidate.id === blockId
        );

        if (block !== undefined) {
            return block;
        }
    }

    throw new Error(
        `Protocol block "${blockId}" does not exist.`
    );
}


/** Creates an editor draft from committed block data. */
function createEditDraft(block) {
    const variables = {};

    for (
        const [
            variableId,
         progression,
        ] of Object.entries(block.variables)
    ) {
        variables[variableId] =
        createProgressionDraft(
            progression
        );
    }

    return {
        mode: "edit",
        blockId: block.id,
        name: block.name,
        duration:
        formatDuration(
            block.durationSeconds
        ),
        variables,
    };
}


/** Creates raw editor values from a committed progression. */
function createProgressionDraft(
    progression
) {
    const draft = {
        type: progression.type,
        start: String(
            progression.start
        ),
    };

    if (progression.end !== undefined) {
        draft.end =
        String(progression.end);
    }

    if (
        progression.stepIntervalSeconds !==
        undefined
    ) {
        draft.stepInterval =
        formatDuration(
            progression.stepIntervalSeconds
        );
    }

    return draft;
}


/** Formats seconds as H:MM:SS or M:SS. */
function formatDuration(totalSeconds) {
    const hours =
    Math.floor(totalSeconds / 3600);

    const minutes =
    Math.floor(
        (totalSeconds % 3600) / 60
    );

    const seconds =
    totalSeconds % 60;

    if (hours > 0) {
        return [
            hours,
            String(minutes).padStart(
                2,
                "0"
            ),
            String(seconds).padStart(
                2,
                "0"
            ),
        ].join(":");
    }

    return [
        minutes,
        String(seconds).padStart(
            2,
            "0"
        ),
    ].join(":");
}
