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
    let dragContext;

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
