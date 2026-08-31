import {
    cancelBlockEdit,
    checkBlockDraftNavigation,
} from "../controllers/block-editor-controller.js";

import {
    requestDeleteBlock,
    requestDeletePhase,
} from "../controllers/protocol-structure-controller.js";

/** Registers protocol-pane manage-mode keyboard shortcuts. */
export function wireProtocolManageKeyboardEvents({
    protocolPane,
    protocolTree,
    protocolModel,
    editorState,
}) {
    protocolPane.addEventListener("keydown", (event) => {
        handleManageKeydown(event, protocolTree, protocolModel, editorState);
    });
}

/** Handles protocol-pane manage-mode keyboard shortcuts. */
function handleManageKeydown(event, protocolTree, protocolModel, editorState) {
    if (event.defaultPrevented) {
        return;
    }

    if (event.key === "Escape") {
        handleEscape(event, protocolTree, editorState);
        return;
    }

    if (isEditableTarget(event.target)) {
        return;
    }

    if (event.key === "Delete") {
        handleDelete(event, protocolModel, editorState);

        if (event.defaultPrevented) {
            protocolTree.focus();
        }

        return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }

    const key = event.key.toLowerCase();

    if (key === "p") {
        event.preventDefault();
        toggleProtocolManageMode(editorState, "phase");
        protocolTree.focus();
        return;
    }

    if (key === "b") {
        event.preventDefault();
        toggleProtocolManageMode(editorState, "block");
        protocolTree.focus();
    }
}

/** Toggles the requested structural manage mode when navigation is allowed. */
export function toggleProtocolManageMode(editorState, mode) {
    const { editMode } = editorState.getSnapshot();

    if (editMode === "block" && mode !== "block") {
        const navigation = checkBlockDraftNavigation(editorState);

        if (navigation.outcome === "blocked") {
            return navigation;
        }
    }

    if (editMode === mode) {
        editorState.clearEditMode();
    } else {
        editorState.setEditMode(mode);
    }

    return {
        outcome: "proceed",
    };
}

/** Cancels the most immediate active manage/edit operation. */
function handleEscape(event, protocolTree, editorState) {
    if (event.target.closest("input[data-phase-name-field]") !== null) {
        return;
    }

    const snapshot = editorState.getSnapshot();

    if (snapshot.activeBlockDraft !== undefined && editorState.isBlockDraftDirty()) {
        event.preventDefault();
        cancelBlockEdit(editorState);
        protocolTree.focus();
        return;
    }

    if (snapshot.editMode !== undefined) {
        event.preventDefault();
        editorState.clearEditMode();
        protocolTree.focus();
    }
}

/** Deletes the selected structure when its manage mode is active. */
function handleDelete(event, protocolModel, editorState) {
    const snapshot = editorState.getSnapshot();

    if (snapshot.editMode === "phase" && snapshot.selectedPhaseId !== undefined) {
        event.preventDefault();

        requestDeletePhase(protocolModel, editorState, snapshot.selectedPhaseId);

        return;
    }

    if (snapshot.editMode === "block" && snapshot.selectedBlockId !== undefined) {
        event.preventDefault();

        requestDeleteBlock(protocolModel, editorState, snapshot.selectedBlockId);
    }
}

/** Returns whether normal text-editing keyboard behavior should take precedence. */
function isEditableTarget(target) {
    return target.closest("input, textarea, select, [contenteditable='true']") !== null;
}
