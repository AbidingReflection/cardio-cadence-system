/**
 * Wires delegated protocol-tree interactions to editor state, model mutations,
 * validation, and focus preservation.
 */

import {
    applyBlockDraft,
    requestCollapseBlock,
    startBlockEdit,
    cancelBlockEdit,
} from "../controllers/block-editor-controller.js";

import { captureProtocolFieldFocus } from "./protocol-focus.js";

/**
 * Registers protocol-tree event handlers and connects them to application
 * state, controllers, and pending-focus callbacks.
 */
export function wireProtocolTreeEvents({
    protocolTree,
    protocolModel,
    editorState,
    activityType,
    machineProfile,
    setPendingFieldFocus,
    setPendingToggleFocus,
}) {
    protocolTree.addEventListener("click", (event) => {
        const validationMessage = event.target.closest("[data-validation-field]");

        if (validationMessage !== null) {
            const fieldPath = validationMessage.dataset.validationField;

            const field = Array.from(protocolTree.querySelectorAll("[data-field]")).find(
                (element) => element.dataset.field === fieldPath,
            );

            if (field !== undefined) {
                field.focus();

                if (field instanceof HTMLInputElement && field.type !== "number") {
                    field.select();
                }
            }

            return;
        }

        const expandBlockToggle = event.target.closest('[data-action="expand-block"]');

        if (expandBlockToggle !== null) {
            const blockElement = expandBlockToggle.closest("[data-block-id]");

            if (blockElement === null) {
                throw new Error("Block toggle is missing its block container.");
            }

            const blockId = blockElement.dataset.blockId;

            setPendingToggleFocus({
                type: "block",
                blockId,
            });

            try {
                startBlockEdit(protocolModel, editorState, blockId);
            } finally {
                setPendingToggleFocus(undefined);
            }

            return;
        }

        const collapseBlockToggle = event.target.closest('[data-action="collapse-block"]');

        if (collapseBlockToggle !== null) {
            const blockElement = collapseBlockToggle.closest("[data-block-id]");

            if (blockElement === null) {
                throw new Error("Block toggle is missing its block container.");
            }

            setPendingToggleFocus({
                type: "block",
                blockId: blockElement.dataset.blockId,
            });

            try {
                requestCollapseBlock(editorState);
            } finally {
                setPendingToggleFocus(undefined);
            }

            return;
        }

        const cancelBlockEditButton = event.target.closest('[data-action="cancel-block-edit"]');

        if (cancelBlockEditButton !== null) {
            cancelBlockEdit(editorState);

            return;
        }

        const phaseToggle = event.target.closest('[data-action="toggle-phase"]');

        if (phaseToggle === null) {
            return;
        }

        const phaseElement = phaseToggle.closest("[data-phase-id]");

        if (phaseElement === null) {
            throw new Error("Phase toggle is missing its phase container.");
        }

        const phaseId = phaseElement.dataset.phaseId;

        setPendingToggleFocus({
            type: "phase",
            phaseId,
        });

        try {
            editorState.togglePhase(phaseId);
        } finally {
            setPendingToggleFocus(undefined);
        }
    });

    protocolTree.addEventListener("input", (event) => {
        const field = event.target.closest("input[data-field]");

        if (field === null) {
            return;
        }

        setPendingFieldFocus(captureProtocolFieldFocus(field));

        try {
            updateBlockDraftField(editorState, field.dataset.field, field.value);
        } catch (error) {
            setPendingFieldFocus(undefined);

            throw error;
        }
    });

    protocolTree.addEventListener("change", (event) => {
        const field = event.target.closest("select[data-field]");

        if (field === null) {
            return;
        }

        setPendingFieldFocus(captureProtocolFieldFocus(field));

        try {
            updateBlockDraftField(editorState, field.dataset.field, field.value);
        } catch (error) {
            setPendingFieldFocus(undefined);

            throw error;
        }
    });

    protocolTree.addEventListener("submit", (event) => {
        const form = event.target.closest("form.block-editor");

        if (form === null) {
            return;
        }

        event.preventDefault();

        const applied = applyBlockDraft(protocolModel, editorState, activityType, machineProfile);

        // if (!applied) {
        //     console.warn(
        //         "Block validation errors:",
        //         editorState.getSnapshot().validationErrors,
        //     );
        // }
    });
}

/** Updates one field in the active block draft. */
function updateBlockDraftField(editorState, fieldPath, value) {
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
