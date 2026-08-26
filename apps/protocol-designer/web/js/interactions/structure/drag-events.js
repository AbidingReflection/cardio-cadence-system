/**
 * Wires drag-and-drop structural protocol reordering.
 */

import {
    requestMoveBlock,
    requestMovePhase,
} from "../../controllers/protocol-structure-controller.js";

/** Registers drag-and-drop protocol reordering interactions. */
export function wireProtocolStructureDragEvents({
    protocolTree,
    protocolModel,
    editorState,
    setPendingStructuralFocus,
}) {
    let dragContext;

    protocolTree.addEventListener("dragstart", (event) => {
        dragContext = startStructuralDrag(event);

        setStructuralDragLabels(protocolTree, dragContext);
    });

    protocolTree.addEventListener("dragover", (event) => {
        handleStructuralDragOver(event, dragContext);
    });

    protocolTree.addEventListener("drop", (event) => {
        handleStructuralDrop(
            event,
            dragContext,
            protocolModel,
            editorState,
            setPendingStructuralFocus,
        );

        restoreStructuralDragLabels(protocolTree);
        clearStructuralDragStyles(protocolTree);
        dragContext = undefined;
    });

    protocolTree.addEventListener("dragend", () => {
        restoreStructuralDragLabels(protocolTree);
        clearStructuralDragStyles(protocolTree);
        dragContext = undefined;
    });
}

/** Allows structural drops over compatible drop targets. */
function handleStructuralDragOver(event, dragContext) {
    if (dragContext === undefined) {
        return;
    }

    const dropTarget = getStructuralDropTarget(event.target, dragContext);

    if (dropTarget === null) {
        return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    for (const target of event.currentTarget.querySelectorAll(".is-drop-target")) {
        if (target !== dropTarget) {
            target.classList.remove("is-drop-target");
        }
    }

    dropTarget.classList.add("is-drop-target");
}

/** Clears transient structural drag styling. */
function clearStructuralDragStyles(protocolTree) {
    for (const element of protocolTree.querySelectorAll(".is-dragging, .is-drop-target")) {
        element.classList.remove("is-dragging", "is-drop-target");
    }
}

/** Returns a compatible drop target for the active drag. */
function getStructuralDropTarget(eventTarget, dragContext) {
    if (dragContext.type === "phase") {
        return eventTarget.closest('[data-drop-target="phase"]');
    }

    if (dragContext.type === "block") {
        return (
            eventTarget.closest('[data-drop-target="block"]') ??
            eventTarget.closest("[data-block-drop-phase-id]")
        );
    }

    return null;
}

/** Captures the structural item being dragged. */
function startStructuralDrag(event) {
    const structuralItem = event.target.closest("[data-structural-item]");

    if (structuralItem === null) {
        return undefined;
    }

    structuralItem.classList.add("is-dragging");

    const type = structuralItem.dataset.structuralItem;

    if (type === "phase") {
        const phaseId = structuralItem.dataset.phaseId;

        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", phaseId);

        return {
            type: "phase",
            phaseId,
        };
    }

    if (type === "block") {
        const blockId = structuralItem.dataset.blockId;

        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", blockId);

        return {
            type: "block",
            blockId,
        };
    }

    return undefined;
}

/** Handles a structural drop request. */
function handleStructuralDrop(
    event,
    dragContext,
    protocolModel,
    editorState,
    setPendingStructuralFocus,
) {
    if (dragContext === undefined) {
        return;
    }

    const dropTarget = getStructuralDropTarget(event.target, dragContext);

    if (dropTarget === null) {
        return;
    }

    event.preventDefault();

    if (dragContext.type === "phase") {
        dropPhase(
            dragContext.phaseId,
            dropTarget,
            protocolModel,
            editorState,
            setPendingStructuralFocus,
        );

        return;
    }

    dropBlock(
        dragContext.blockId,
        dropTarget,
        protocolModel,
        editorState,
        setPendingStructuralFocus,
    );
}

/** Moves a dragged phase to the selected insertion target. */
function dropPhase(phaseId, dropTarget, protocolModel, editorState, setPendingStructuralFocus) {
    const insertionIndex = Number(dropTarget.dataset.insertionIndex);

    if (!Number.isInteger(insertionIndex)) {
        throw new Error("Phase drop target is missing a valid insertion index.");
    }

    const protocolSnapshot = protocolModel.getSnapshot();

    const sourceIndex = protocolSnapshot.phases.findIndex((phase) => phase.id === phaseId);

    if (sourceIndex === -1) {
        return;
    }

    const targetIndex = insertionIndex > sourceIndex ? insertionIndex - 1 : insertionIndex;

    if (targetIndex === sourceIndex) {
        return;
    }

    setPendingStructuralFocus({
        type: "phase",
        phaseId,
    });

    const result = requestMovePhase(protocolModel, editorState, phaseId, targetIndex);

    if (result.outcome === "blocked") {
        setPendingStructuralFocus(undefined);
    }
}

/** Moves a dragged block to the selected block or phase drop target. */
function dropBlock(blockId, dropTarget, protocolModel, editorState, setPendingStructuralFocus) {
    const protocolSnapshot = protocolModel.getSnapshot();

    const sourcePhase = protocolSnapshot.phases.find((phase) =>
        phase.blocks.some((block) => block.id === blockId),
    );

    if (sourcePhase === undefined) {
        return;
    }

    const sourceIndex = sourcePhase.blocks.findIndex((block) => block.id === blockId);

    let targetPhaseId;
    let targetIndex;

    if (dropTarget.dataset.blockDropPhaseId !== undefined) {
        targetPhaseId = dropTarget.dataset.blockDropPhaseId;

        const targetPhase = protocolSnapshot.phases.find((phase) => phase.id === targetPhaseId);

        if (targetPhase === undefined) {
            return;
        }

        targetIndex = targetPhase.blocks.length;
    } else {
        targetPhaseId = dropTarget.dataset.phaseId;

        const insertionIndex = Number(dropTarget.dataset.insertionIndex);

        if (
            typeof targetPhaseId !== "string" ||
            targetPhaseId.trim() === "" ||
            !Number.isInteger(insertionIndex)
        ) {
            throw new Error("Block drop target is missing valid insertion data.");
        }

        if (targetPhaseId === sourcePhase.id) {
            targetIndex = insertionIndex > sourceIndex ? insertionIndex - 1 : insertionIndex;
        } else {
            targetIndex = insertionIndex;
        }
    }

    if (targetPhaseId === sourcePhase.id && targetIndex === sourceIndex) {
        return;
    }

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

/** Updates insertion target labels for the active drag type. */
function setStructuralDragLabels(protocolTree, dragContext) {
    if (dragContext?.type === "phase") {
        for (const target of protocolTree.querySelectorAll('[data-drop-target="phase"]')) {
            target.textContent = "↓ Move phase here";
        }

        return;
    }

    if (dragContext?.type === "block") {
        for (const target of protocolTree.querySelectorAll('[data-drop-target="block"]')) {
            target.textContent = "↓ Move block here";
        }
    }
}

/** Restores insertion target labels after dragging ends. */
function restoreStructuralDragLabels(protocolTree) {
    for (const target of protocolTree.querySelectorAll('[data-drop-target="phase"]')) {
        target.textContent = "+ Add phase here";
    }

    for (const target of protocolTree.querySelectorAll('[data-drop-target="block"]')) {
        target.textContent = "+ Add block here";
    }
}
