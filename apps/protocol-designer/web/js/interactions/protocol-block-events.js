/**
 * Wires block-editor protocol-tree interactions such as expansion, draft
 * updates, validation focus, and form submission.
 */

import {
    applyBlockDraft,
    cancelBlockEdit,
    requestCollapseBlock,
    startBlockEdit,
} from "../controllers/block-editor-controller.js";

import { captureProtocolFieldFocus } from "./protocol-focus.js";

/** Registers delegated block-editor protocol-tree interactions. */
export function wireProtocolBlockEvents({
    protocolTree,
    protocolModel,
    editorState,
    activityType,
    setPendingFieldFocus,
    setPendingToggleFocus,
}) {
    protocolTree.addEventListener("click", (event) => {
        const validationMessage = event.target.closest("[data-validation-field]");

        if (validationMessage !== null) {
            focusValidationField(protocolTree, validationMessage);

            return;
        }

        const actionElement = event.target.closest("[data-action]");

        if (actionElement === null) {
            return;
        }

        switch (actionElement.dataset.action) {
            case "expand-block":
                expandBlock(actionElement, protocolModel, editorState, setPendingToggleFocus);
                break;

            case "collapse-block":
                collapseBlock(actionElement, editorState, setPendingToggleFocus);
                break;

            case "cancel-block-edit":
                cancelBlockEdit(editorState);
                protocolTree.focus();
                break;
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

        const applied = applyBlockDraft(protocolModel, editorState, activityType);

        if (applied) {
            protocolTree.focus();
        }
    });
}

/** Focuses the block-editor field referenced by a validation message. */
function focusValidationField(protocolTree, validationMessage) {
    const fieldPath = validationMessage.dataset.validationField;

    const field = Array.from(protocolTree.querySelectorAll("[data-field]")).find(
        (element) => element.dataset.field === fieldPath,
    );

    if (field === undefined) {
        return;
    }

    field.focus();

    if (field instanceof HTMLInputElement && field.type !== "number") {
        field.select();
    }
}

/** Expands a block and preserves focus on its toggle across rerendering. */
function expandBlock(actionElement, protocolModel, editorState, setPendingToggleFocus) {
    const blockElement = actionElement.closest("[data-block-id]");

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
}

/** Collapses the active block editor while preserving toggle focus. */
function collapseBlock(actionElement, editorState, setPendingToggleFocus) {
    const blockElement = actionElement.closest("[data-block-id]");

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
