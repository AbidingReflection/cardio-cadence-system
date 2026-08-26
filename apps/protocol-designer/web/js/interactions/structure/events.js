/**
 * Wires structural protocol-tree interactions such as insertion, deletion,
 * keyboard reordering, and drag-and-drop reordering.
 */

import { startBlockCreate } from "../../controllers/block-editor-controller.js";

import {
    requestDeleteBlock,
    requestDeletePhase,
} from "../../controllers/protocol-structure-controller.js";

import { wireProtocolStructureKeyboardEvents } from "./keyboard-events.js";
import { wireProtocolStructureDragEvents } from "./drag-events.js";

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
        const structuralItem = event.target.closest("[data-structural-item]");

        if (structuralItem !== null) {
            const interactiveElement = event.target.closest("button, input, select, textarea, a");

            if (interactiveElement === null) {
                structuralItem.focus();
            }
        }

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

    wireProtocolStructureKeyboardEvents({
        protocolTree,
        protocolModel,
        editorState,
        setPendingStructuralFocus,
    });

    wireProtocolStructureDragEvents({
        protocolTree,
        protocolModel,
        editorState,
        setPendingStructuralFocus,
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
