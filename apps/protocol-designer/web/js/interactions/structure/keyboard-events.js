/**
 * Wires keyboard-based structural protocol reordering.
 */

import {
    requestMoveBlock,
    requestMovePhase,
} from "../../controllers/protocol-structure-controller.js";

/** Registers keyboard protocol reordering interactions. */
export function wireProtocolStructureKeyboardEvents({
    protocolTree,
    protocolModel,
    editorState,
    setPendingStructuralFocus,
}) {
    protocolTree.addEventListener("keydown", (event) => {
        handleStructuralReorderKeydown(
            event,
            protocolModel,
            editorState,
            setPendingStructuralFocus,
        );
    });
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
