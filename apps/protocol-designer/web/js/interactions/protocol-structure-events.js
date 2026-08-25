/**
 * Wires structural protocol-tree interactions such as insertion and deletion.
 */

import { startBlockCreate } from "../controllers/block-editor-controller.js";

import {
    requestDeleteBlock,
    requestDeletePhase,
    requestMoveBlock,
    requestMovePhase,
} from "../controllers/protocol-structure-controller.js";

/** Registers delegated structural protocol-tree interactions. */
export function wireProtocolStructureEvents({
    protocolTree,
    protocolModel,
    editorState,
    activityType,
    setPendingFieldFocus,
    setPendingPhaseNameFocus,
    setPendingStructuralFocus,
}) {
    protocolTree.addEventListener("click", (event) => {
        const actionElement = event.target.closest("[data-action]");

        if (actionElement === null) {
            return;
        }

        switch (actionElement.dataset.action) {
            case "insert-phase":
                insertPhase(actionElement, protocolModel, editorState, setPendingPhaseNameFocus);
                break;

            case "insert-block":
                insertBlock(actionElement, editorState, activityType, setPendingFieldFocus);
                break;

            case "delete-block":
                deleteBlock(actionElement, protocolModel, editorState);
                break;

            case "delete-phase":
                deletePhase(actionElement, protocolModel, editorState);
                break;
        }
    });

    protocolTree.addEventListener("keydown", (event) => {
        handleStructuralReorderKeydown(
            event,
            protocolModel,
            editorState,
            setPendingStructuralFocus,
        );
    });
}

/** Inserts a new phase at the selected structural target. */
function insertPhase(actionElement, protocolModel, editorState, setPendingPhaseNameFocus) {
    const index = Number(actionElement.dataset.insertionIndex);

    if (!Number.isInteger(index)) {
        throw new Error("Phase insertion target is missing a valid insertion index.");
    }

    const phaseName = "New Phase";

    const phaseId = protocolModel.addPhase(phaseName, index);

    editorState.expandPhase(phaseId);

    setPendingPhaseNameFocus({
        phaseId,
        target: "editor",
    });

    try {
        editorState.startPhaseNameEdit(phaseId, phaseName);
    } finally {
        setPendingPhaseNameFocus(undefined);
    }
}

/** Starts a new block draft at the selected structural target. */
function insertBlock(actionElement, editorState, activityType, setPendingFieldFocus) {
    const phaseId = actionElement.dataset.phaseId;
    const index = Number(actionElement.dataset.insertionIndex);

    if (phaseId === undefined || !Number.isInteger(index)) {
        throw new Error("Block insertion target is missing valid insertion data.");
    }

    setPendingFieldFocus({
        blockId: "__new-block-draft__",
        fieldPath: "name",
    });

    try {
        startBlockCreate(editorState, activityType, phaseId, index);
    } finally {
        setPendingFieldFocus(undefined);
    }
}

/** Deletes the requested block through the structural controller. */
function deleteBlock(actionElement, protocolModel, editorState) {
    const blockId = actionElement.dataset.blockId;

    if (typeof blockId !== "string" || blockId.trim() === "") {
        throw new Error("Block delete action is missing a block ID.");
    }

    requestDeleteBlock(protocolModel, editorState, blockId);
}

/** Deletes the requested phase through the structural controller. */
function deletePhase(actionElement, protocolModel, editorState) {
    const phaseId = actionElement.dataset.phaseId;

    if (typeof phaseId !== "string" || phaseId.trim() === "") {
        throw new Error("Phase delete action is missing a phase ID.");
    }

    requestDeletePhase(protocolModel, editorState, phaseId);
}

/** Handles keyboard requests to move phases or blocks by one position. */
function handleStructuralReorderKeydown(
    event,
    protocolModel,
    editorState,
    setPendingStructuralFocus,
) {
    if (!event.ctrlKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) {
        return;
    }

    const structuralItem = event.target.closest("[data-structural-item]");

    if (!structuralItem) {
        return;
    }

    if (event.target !== structuralItem) {
        return;
    }

    if (structuralItem.dataset.structuralItem === "block") {
        moveBlockByKeyboard(
            event,
            structuralItem,
            protocolModel,
            editorState,
            setPendingStructuralFocus,
        );

        return;
    }

    if (structuralItem.dataset.structuralItem === "phase") {
        movePhaseByKeyboard(
            event,
            structuralItem,
            protocolModel,
            editorState,
            setPendingStructuralFocus,
        );
    }
}

/** Moves the focused phase one position in the requested direction. */
function movePhaseByKeyboard(
    event,
    phaseElement,
    protocolModel,
    editorState,
    setPendingStructuralFocus,
) {
    const editorSnapshot = editorState.getSnapshot();

    if (editorSnapshot.editMode !== "phase") {
        return;
    }

    const phaseId = phaseElement.dataset.phaseId;

    const protocolSnapshot = protocolModel.getSnapshot();

    const currentIndex = protocolSnapshot.phases.findIndex((phase) => phase.id === phaseId);

    if (currentIndex === -1) {
        return;
    }

    const targetIndex = event.key === "ArrowUp" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= protocolSnapshot.phases.length) {
        return;
    }

    event.preventDefault();

    setPendingStructuralFocus({
        type: "phase",
        phaseId,
    });

    const result = requestMovePhase(protocolModel, editorState, phaseId, targetIndex);

    if (result.outcome === "blocked") {
        setPendingStructuralFocus(undefined);
    }
}

/** Moves the focused block one position in protocol order. */
function moveBlockByKeyboard(
    event,
    blockElement,
    protocolModel,
    editorState,
    setPendingStructuralFocus,
) {
    const editorSnapshot = editorState.getSnapshot();

    if (editorSnapshot.editMode !== "block") {
        return;
    }

    const blockId = blockElement.dataset.blockId;
    const protocolSnapshot = protocolModel.getSnapshot();

    const sourcePhaseIndex = protocolSnapshot.phases.findIndex((phase) =>
        phase.blocks.some((block) => block.id === blockId),
    );

    if (sourcePhaseIndex === -1) {
        return;
    }

    const sourcePhase = protocolSnapshot.phases[sourcePhaseIndex];

    const sourceIndex = sourcePhase.blocks.findIndex((block) => block.id === blockId);

    let targetPhaseId;
    let targetIndex;

    if (event.key === "ArrowUp") {
        if (sourceIndex > 0) {
            targetPhaseId = sourcePhase.id;
            targetIndex = sourceIndex - 1;
        } else {
            const previousPhase = protocolSnapshot.phases[sourcePhaseIndex - 1];

            if (previousPhase === undefined) {
                return;
            }

            targetPhaseId = previousPhase.id;
            targetIndex = previousPhase.blocks.length;
        }
    } else {
        if (sourceIndex < sourcePhase.blocks.length - 1) {
            targetPhaseId = sourcePhase.id;
            targetIndex = sourceIndex + 1;
        } else {
            const nextPhase = protocolSnapshot.phases[sourcePhaseIndex + 1];

            if (nextPhase === undefined) {
                return;
            }

            targetPhaseId = nextPhase.id;
            targetIndex = 0;
        }
    }

    event.preventDefault();

    setPendingStructuralFocus({
        type: "block",
        blockId,
    });

    const result = requestMoveBlock(
        protocolModel,
        editorState,
        blockId,
        targetPhaseId,
        targetIndex,
    );

    if (result.outcome === "blocked") {
        setPendingStructuralFocus(undefined);
    }
}
