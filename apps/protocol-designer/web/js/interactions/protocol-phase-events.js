/**
 * Wires phase-specific protocol-tree interactions such as expansion and
 * phase-name editing.
 */

import { requestCollapsePhase } from "../controllers/block-editor-controller.js";
import { applyPhaseNameDraft, startPhaseNameEdit } from "../controllers/phase-name-controller.js";

import { capturePhaseNameFocus } from "./protocol-focus.js";

/** Registers delegated phase-specific protocol-tree interactions. */
export function wireProtocolPhaseEvents({
    protocolTree,
    protocolModel,
    editorState,
    setPendingToggleFocus,
    setPendingPhaseNameFocus,
}) {
    protocolTree.addEventListener("click", (event) => {
        const actionElement = event.target.closest("[data-action]");

        if (actionElement === null) {
            return;
        }

        switch (actionElement.dataset.action) {
            case "edit-phase-name":
                editPhaseName(actionElement, protocolModel, editorState, setPendingPhaseNameFocus);
                break;

            case "save-phase-name":
                savePhaseName(protocolTree, protocolModel, editorState, setPendingPhaseNameFocus);
                break;

            case "cancel-phase-name":
                cancelPhaseName(actionElement, editorState, setPendingPhaseNameFocus);
                break;

            case "toggle-phase":
                togglePhase(actionElement, protocolModel, editorState, setPendingToggleFocus);
                break;
        }
    });

    protocolTree.addEventListener("input", (event) => {
        const phaseNameField = event.target.closest("input[data-phase-name-field]");

        if (phaseNameField === null) {
            return;
        }

        setPendingPhaseNameFocus(capturePhaseNameFocus(phaseNameField));

        try {
            editorState.updatePhaseNameDraft(phaseNameField.value);
        } catch (error) {
            setPendingPhaseNameFocus(undefined);

            throw error;
        }
    });

    protocolTree.addEventListener("keydown", (event) => {
        const phaseNameField = event.target.closest("input[data-phase-name-field]");

        if (phaseNameField === null) {
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();

            savePhaseName(protocolTree, protocolModel, editorState, setPendingPhaseNameFocus);

            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();

            const phaseElement = phaseNameField.closest("[data-phase-id]");

            if (phaseElement === null) {
                throw new Error("Phase-name field is missing its phase container.");
            }

            closePhaseNameEditor(
                phaseElement.dataset.phaseId,
                editorState,
                setPendingPhaseNameFocus,
            );
        }
    });
}

/** Starts inline editing for the requested phase name. */
function editPhaseName(actionElement, protocolModel, editorState, setPendingPhaseNameFocus) {
    const phaseElement = actionElement.closest("[data-phase-id]");

    if (phaseElement === null) {
        throw new Error("Phase-name edit action is missing its phase container.");
    }

    const phaseId = phaseElement.dataset.phaseId;

    setPendingPhaseNameFocus({
        phaseId,
        target: "editor",
    });

    try {
        startPhaseNameEdit(protocolModel, editorState, phaseId);
    } finally {
        setPendingPhaseNameFocus(undefined);
    }
}

/** Cancels the active phase-name edit and restores focus to its edit action. */
function cancelPhaseName(actionElement, editorState, setPendingPhaseNameFocus) {
    const phaseElement = actionElement.closest("[data-phase-id]");

    if (phaseElement === null) {
        throw new Error("Phase-name cancel action is missing its phase container.");
    }

    closePhaseNameEditor(phaseElement.dataset.phaseId, editorState, setPendingPhaseNameFocus);
}

/** Expands or collapses a phase while preserving toggle focus. */
function togglePhase(actionElement, protocolModel, editorState, setPendingToggleFocus) {
    const phaseElement = actionElement.closest("[data-phase-id]");

    if (phaseElement === null) {
        throw new Error("Phase toggle is missing its phase container.");
    }

    const phaseId = phaseElement.dataset.phaseId;

    setPendingToggleFocus({
        type: "phase",
        phaseId,
    });

    try {
        const { expandedPhaseIds } = editorState.getSnapshot();

        if (expandedPhaseIds.includes(phaseId)) {
            requestCollapsePhase(protocolModel, editorState, phaseId);
        } else {
            editorState.expandPhase(phaseId);
        }
    } finally {
        setPendingToggleFocus(undefined);
    }
}

/** Commits the active phase-name draft and restores edit-action focus. */
function savePhaseName(protocolTree, protocolModel, editorState, setPendingPhaseNameFocus) {
    const { applied, phaseId } = applyPhaseNameDraft(protocolModel, editorState);

    if (!applied) {
        const phaseElement = Array.from(protocolTree.querySelectorAll("[data-phase-id]")).find(
            (element) => element.dataset.phaseId === phaseId,
        );

        const field = phaseElement?.querySelector("[data-phase-name-field]");

        if (field !== undefined && field !== null) {
            field.setCustomValidity("Phase name is required.");
            field.reportValidity();
            field.focus();
        }

        return;
    }

    closePhaseNameEditor(phaseId, editorState, setPendingPhaseNameFocus);
}

/** Closes phase-name editing while restoring focus to its edit action. */
function closePhaseNameEditor(phaseId, editorState, setPendingPhaseNameFocus) {
    setPendingPhaseNameFocus({
        phaseId,
        target: "edit-action",
    });

    try {
        editorState.closePhaseNameEdit();
    } finally {
        setPendingPhaseNameFocus(undefined);
    }
}
