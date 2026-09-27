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
                insertBlock(actionElement, protocolModel, editorState, setPendingFieldFocus);
                break;

            case "copy-phase":
                togglePhaseCopy(actionElement, editorState);
                protocolTree.focus();
                break;

            case "copy-block":
                toggleBlockCopy(actionElement, editorState);
                protocolTree.focus();
                break;

            case "copy-phase-here":
                copyPhaseHere(actionElement, protocolModel, editorState);
                break;

            case "copy-block-here":
                copyBlockHere(actionElement, protocolModel, editorState);
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
function insertBlock(actionElement, protocolModel, editorState, setPendingFieldFocus) {
    const phaseId = actionElement.dataset.phaseId;
    const index = Number(actionElement.dataset.insertionIndex);

    if (phaseId === undefined || !Number.isInteger(index)) {
        throw new Error("Block insertion target is missing valid insertion data.");
    }

    const { activityType } = protocolModel.getSetupContext();

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

/** Starts, switches, or cancels phase-copy placement mode. */
function togglePhaseCopy(actionElement, editorState) {
    const phaseId = actionElement.dataset.phaseId;

    if (typeof phaseId !== "string" || phaseId.trim() === "") {
        throw new Error("Phase copy action is missing a phase ID.");
    }

    const { copyMode } = editorState.getSnapshot();

    if (copyMode?.entityType === "phase" && copyMode.sourceId === phaseId) {
        editorState.clearCopyMode();
        return;
    }

    editorState.setCopyMode("phase", phaseId);
}

/** Starts, switches, or cancels block-copy placement mode. */
function toggleBlockCopy(actionElement, editorState) {
    const blockId = actionElement.dataset.blockId;

    if (typeof blockId !== "string" || blockId.trim() === "") {
        throw new Error("Block copy action is missing a block ID.");
    }

    const { copyMode } = editorState.getSnapshot();

    if (copyMode?.entityType === "block" && copyMode.sourceId === blockId) {
        editorState.clearCopyMode();
        return;
    }

    editorState.setCopyMode("block", blockId);
}

/** Copies the active source phase to the selected insertion target. */
function copyPhaseHere(actionElement, protocolModel, editorState) {
    const index = Number(actionElement.dataset.insertionIndex);
    const { copyMode } = editorState.getSnapshot();

    if (!Number.isInteger(index)) {
        throw new Error("Phase copy target is missing a valid insertion index.");
    }

    if (
        copyMode?.entityType !== "phase" ||
        typeof copyMode.sourceId !== "string" ||
        copyMode.sourceId.trim() === ""
    ) {
        throw new Error("Phase copy target requires an active phase copy source.");
    }

    protocolModel.copyPhase(copyMode.sourceId, index);

    editorState.clearCopyMode();
}

/** Copies the active source block to the selected insertion target. */
function copyBlockHere(actionElement, protocolModel, editorState) {
    const phaseId = actionElement.dataset.phaseId;
    const index = Number(actionElement.dataset.insertionIndex);
    const { copyMode } = editorState.getSnapshot();

    if (typeof phaseId !== "string" || phaseId.trim() === "" || !Number.isInteger(index)) {
        throw new Error("Block copy target is missing valid insertion data.");
    }

    if (
        copyMode?.entityType !== "block" ||
        typeof copyMode.sourceId !== "string" ||
        copyMode.sourceId.trim() === ""
    ) {
        throw new Error("Block copy target requires an active block copy source.");
    }
    protocolModel.copyBlock(copyMode.sourceId, phaseId, index);

    editorState.clearCopyMode();
}
