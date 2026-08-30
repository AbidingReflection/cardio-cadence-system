/**
 * Wires keyboard-based structural protocol reordering.
 */

import {
    requestMoveBlock,
    requestMovePhase,
} from "../../controllers/protocol-structure-controller.js";

/** Registers keyboard protocol reordering interactions. */
export function wireProtocolStructureKeyboardEvents({ protocolTree, protocolModel, editorState }) {
    protocolTree.addEventListener("keydown", (event) => {
        handleStructuralReorderKeydown(event, protocolTree, protocolModel, editorState);
    });
}

/** Handles keyboard requests to move selected phases or blocks by one position. */
function handleStructuralReorderKeydown(event, protocolTree, protocolModel, editorState) {
    if (
        !event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.shiftKey ||
        (event.key !== "ArrowUp" && event.key !== "ArrowDown")
    ) {
        return;
    }

    const editorSnapshot = editorState.getSnapshot();

    if (
        event.target !== protocolTree &&
        !isSelectedStructuralToggle(event.target, editorSnapshot)
    ) {
        return;
    }

    if (editorSnapshot.editMode === "phase" && editorSnapshot.selectedPhaseId !== undefined) {
        movePhaseByKeyboard(
            event,
            protocolTree,
            editorSnapshot.selectedPhaseId,
            protocolModel,
            editorState,
        );

        return;
    }

    if (editorSnapshot.editMode === "block" && editorSnapshot.selectedBlockId !== undefined) {
        moveBlockByKeyboard(
            event,
            protocolTree,
            editorSnapshot.selectedBlockId,
            protocolModel,
            editorState,
        );
    }
}

/** Moves the selected phase one position in the requested direction. */
function movePhaseByKeyboard(event, protocolTree, phaseId, protocolModel, editorState) {
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

    const result = requestMovePhase(protocolModel, editorState, phaseId, targetIndex);

    if (result.outcome === "proceed") {
        protocolTree.focus();
    }
}

/** Moves the selected block one position in protocol order. */
function moveBlockByKeyboard(event, protocolTree, blockId, protocolModel, editorState) {
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

    const result = requestMoveBlock(
        protocolModel,
        editorState,
        blockId,
        targetPhaseId,
        targetIndex,
    );

    if (result.outcome === "proceed") {
        protocolTree.focus();
    }
}

/** Returns whether a keyboard event came from the selected item's structural toggle. */
function isSelectedStructuralToggle(target, editorSnapshot) {
    const actionElement = target.closest("[data-action]");

    if (actionElement === null) {
        return false;
    }

    const action = actionElement.dataset.action;

    if (action !== "toggle-phase" && action !== "expand-block" && action !== "collapse-block") {
        return false;
    }

    if (editorSnapshot.selectedBlockId !== undefined) {
        const blockElement = actionElement.closest(".block-card[data-block-id]");

        return (
            blockElement !== null && blockElement.dataset.blockId === editorSnapshot.selectedBlockId
        );
    }

    if (editorSnapshot.selectedPhaseId !== undefined) {
        const phaseElement = actionElement.closest(".phase-card[data-phase-id]");

        return (
            phaseElement !== null && phaseElement.dataset.phaseId === editorSnapshot.selectedPhaseId
        );
    }

    return false;
}
