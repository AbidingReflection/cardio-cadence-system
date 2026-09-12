import { formatDuration } from "../../../../../packages/utils/format-duration.js";
import { validateBlockDraft } from "../editor/block-draft-validation.js";
import { getActiveBlockPhaseId } from "./protocol-controller-utils.js";

const NEW_BLOCK_DRAFT_ID = "__new-block-draft__";

/**
 * Applies the active block draft to the protocol model.
 */
export function applyBlockDraft(protocolModel, editorState, activityType) {
    const editorSnapshot = editorState.getSnapshot();
    const draft = editorSnapshot.activeBlockDraft;

    if (draft === undefined) {
        throw new Error("Cannot apply block draft: no active block draft.");
    }

    const validationResult = validateBlockDraft(draft, activityType);

    if (!validationResult.isValid) {
        editorState.setValidationErrors(validationResult.errors);

        return false;
    }

    const mode = draft.mode;

    if (mode !== "create" && mode !== "edit") {
        throw new Error(`Unknown block draft mode: "${mode}".`);
    }

    if (mode === "create" && (typeof draft.phaseId !== "string" || draft.phaseId.trim() === "")) {
        throw new Error("New block draft requires a phase ID.");
    }

    if (mode === "edit" && (typeof draft.blockId !== "string" || draft.blockId.trim() === "")) {
        throw new Error("Existing block draft requires a block ID.");
    }

    if (mode === "create") {
        applyNewBlock(protocolModel, editorState, draft, validationResult.blockData);
    } else {
        applyExistingBlock(protocolModel, draft, validationResult.blockData);
    }

    editorState.closeBlockDraft();

    return true;
}

/** Cancels the active block edit and discards its draft. */
export function cancelBlockEdit(editorState) {
    const snapshot = editorState.getSnapshot();

    if (snapshot.expandedBlockId === undefined) {
        return;
    }

    if (snapshot.activeBlockDraft?.mode === "create") {
        editorState.clearInsertionTarget();
    }

    editorState.closeBlockDraft();
}

/** Adds a validated new block to the protocol. */
function applyNewBlock(protocolModel, editorState, draft, blockData) {
    const { insertionTarget } = editorState.getSnapshot();

    if (
        insertionTarget?.type !== "block" ||
        insertionTarget.phaseId !== draft.phaseId ||
        !Number.isInteger(insertionTarget.index)
    ) {
        throw new Error("New block draft requires a valid insertion target.");
    }

    protocolModel.addBlock(draft.phaseId, blockData, insertionTarget.index);

    editorState.clearInsertionTarget();
}

/** Applies validated changes to an existing block. */
function applyExistingBlock(protocolModel, draft, blockData) {
    protocolModel.updateBlock(draft.blockId, blockData);
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
 * Requests expansion of a block while protecting an active block draft.
 */
export function requestExpandBlock(editorState, blockId) {
    if (typeof blockId !== "string" || blockId.trim() === "") {
        throw new Error("Block expansion requires a block ID.");
    }

    const snapshot = editorState.getSnapshot();

    if (snapshot.expandedBlockId === blockId) {
        return {
            outcome: "proceed",
        };
    }

    const navigation = checkBlockDraftNavigation(editorState);

    if (navigation.outcome === "blocked") {
        return navigation;
    }

    if (snapshot.activeBlockDraft !== undefined) {
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

    const navigation = checkBlockDraftNavigation(editorState);

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

    editorState.collapsePhase(phaseId);

    return {
        outcome: "proceed",
    };
}

/**
 * Starts an edit draft for a committed block.
 */
export function startBlockEdit(protocolModel, editorState, blockId) {
    if (typeof blockId !== "string" || blockId.trim() === "") {
        throw new Error("Block editing requires a block ID.");
    }

    const snapshot = editorState.getSnapshot();

    if (snapshot.expandedBlockId === blockId && snapshot.activeBlockDraft?.blockId === blockId) {
        return {
            outcome: "proceed",
        };
    }

    const navigation = checkBlockDraftNavigation(editorState);

    if (navigation.outcome === "blocked") {
        return navigation;
    }

    const block = getProtocolBlock(protocolModel, blockId);

    const draft = createEditDraft(block);

    editorState.openBlockDraft(blockId, draft);

    return {
        outcome: "proceed",
    };
}

/** Starts a create draft for a new block at a selected insertion target. */
export function startBlockCreate(editorState, activityType, phaseId, index) {
    if (typeof phaseId !== "string" || phaseId.trim() === "") {
        throw new Error("Block creation requires a phase ID.");
    }

    if (!Number.isInteger(index) || index < 0) {
        throw new Error("Block creation requires a valid insertion index.");
    }

    const navigation = checkBlockDraftNavigation(editorState);

    if (navigation.outcome === "blocked") {
        return navigation;
    }

    const snapshot = editorState.getSnapshot();

    if (snapshot.activeBlockDraft !== undefined) {
        editorState.closeBlockDraft();
    }

    const draft = createCreateDraft(activityType, phaseId);

    editorState.openBlockCreateDraft(NEW_BLOCK_DRAFT_ID, draft, {
        type: "block",
        phaseId,
        index,
    });

    return {
        outcome: "proceed",
    };
}

/** Updates one field in the active block draft. */
export function updateBlockDraftField(editorState, fieldPath, value) {
    const editorSnapshot = editorState.getSnapshot();

    const draft = editorSnapshot.activeBlockDraft;

    if (draft === undefined) {
        throw new Error("Cannot update a block field without an active draft.");
    }

    if (fieldPath === "name" || fieldPath === "duration") {
        editorState.updateBlockDraft({
            [fieldPath]: value,
        });

        return;
    }

    const parts = fieldPath.split(".");

    if (parts.length !== 3 || parts[0] !== "variables") {
        throw new Error(`Unsupported block draft field: "${fieldPath}".`);
    }

    const variableId = parts[1];
    const variableField = parts[2];

    const progression = draft.variables?.[variableId];

    if (progression === undefined) {
        throw new Error(`Block draft has no variable "${variableId}".`);
    }

    editorState.updateBlockDraft({
        variables: {
            ...draft.variables,

            [variableId]: {
                ...progression,
                [variableField]: value,
            },
        },
    });
}

/** Creates a blank create-mode block draft for an activity type. */
function createCreateDraft(activityType, phaseId) {
    const variables = {};

    for (const variable of activityType.variables) {
        variables[variable.id] = {
            type: "steady",
            start: "",
        };
    }

    return {
        mode: "create",
        phaseId,
        name: "",
        duration: "",
        variables,
    };
}

/** Returns a committed block by ID. */
function getProtocolBlock(protocolModel, blockId) {
    const protocol = protocolModel.getSnapshot();

    for (const phase of protocol.phases) {
        const block = phase.blocks.find((candidate) => candidate.id === blockId);

        if (block !== undefined) {
            return block;
        }
    }

    throw new Error(`Protocol block "${blockId}" does not exist.`);
}

/** Creates an editor draft from committed block data. */
function createEditDraft(block) {
    const variables = {};

    for (const [variableId, progression] of Object.entries(block.variables)) {
        variables[variableId] = createProgressionDraft(progression);
    }

    return {
        mode: "edit",
        blockId: block.id,
        name: block.name,
        duration: formatDuration(block.durationSeconds),
        variables,
    };
}

/** Creates raw editor values from a committed progression. */
function createProgressionDraft(progression) {
    const draft = {
        type: progression.type,
        start: String(progression.start),
    };

    if (progression.end !== undefined) {
        draft.end = String(progression.end);
    }

    if (progression.step !== undefined) {
        draft.step = String(progression.step);
    }

    return draft;
}
