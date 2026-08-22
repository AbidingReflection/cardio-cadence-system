/**
 * Wires delegated protocol-tree interactions to editor state, model mutations,
 * validation, and focus preservation.
 */

import {
    applyBlockDraft,
    requestCollapseBlock,
    startBlockEdit,
    startBlockCreate,
    cancelBlockEdit,
} from "../controllers/block-editor-controller.js";

import {
    captureProtocolFieldFocus,
    capturePhaseNameFocus,
} from "./protocol-focus.js";

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
    setPendingPhaseNameFocus,
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

        const insertPhaseTarget = event.target.closest(
            '[data-action="insert-phase"]',
        );

        if (insertPhaseTarget !== null) {
            const index = Number(
                insertPhaseTarget.dataset.insertionIndex,
            );

            if (!Number.isInteger(index)) {
                throw new Error(
                    "Phase insertion target is missing a valid insertion index.",
                );
            }

            const phaseName = "New Phase";

            const phaseId = protocolModel.addPhase(
                phaseName,
                index,
            );

            editorState.clearInsertionMode();
            editorState.expandPhase(phaseId);

            setPendingPhaseNameFocus({
                phaseId,
                target: "editor",
            });

            try {
                editorState.startPhaseNameEdit(
                    phaseId,
                    phaseName,
                );
            } finally {
                setPendingPhaseNameFocus(undefined);
            }

            return;
        }

        const insertBlockTarget = event.target.closest(
            '[data-action="insert-block"]',
        );

        if (insertBlockTarget !== null) {
            const phaseId = insertBlockTarget.dataset.phaseId;
            const index = Number(
                insertBlockTarget.dataset.insertionIndex,
            );

            if (
                phaseId === undefined ||
                !Number.isInteger(index)
            ) {
                throw new Error(
                    "Block insertion target is missing valid insertion data.",
                );
            }

            setPendingFieldFocus({
                blockId: "__new-block-draft__",
                fieldPath: "name",
            });

            try {
                startBlockCreate(
                    editorState,
                    activityType,
                    phaseId,
                    index,
                );
            } finally {
                setPendingFieldFocus(undefined);
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

        const editPhaseNameButton = event.target.closest(
            '[data-action="edit-phase-name"]',
        );

        if (editPhaseNameButton !== null) {
            const phaseElement = editPhaseNameButton.closest(
                "[data-phase-id]",
            );

            if (phaseElement === null) {
                throw new Error(
                    "Phase-name edit action is missing its phase container.",
                );
            }

            const phaseId = phaseElement.dataset.phaseId;

            const phase = protocolModel
            .getSnapshot()
            .phases
            .find(
                (candidate) => candidate.id === phaseId,
            );

            if (phase === undefined) {
                throw new Error(
                    `Cannot edit missing phase "${phaseId}".`,
                );
            }

            setPendingPhaseNameFocus({
                phaseId,
                target: "editor",
            });

            try {
                editorState.startPhaseNameEdit(
                    phaseId,
                    phase.name,
                );
            } finally {
                setPendingPhaseNameFocus(undefined);
            }

            return;
        }

        const savePhaseNameButton = event.target.closest(
            '[data-action="save-phase-name"]',
        );

        if (savePhaseNameButton !== null) {
            savePhaseName(
                protocolTree,
                protocolModel,
                editorState,
                setPendingPhaseNameFocus,
            );

            return;
        }

        const cancelPhaseNameButton = event.target.closest(
            '[data-action="cancel-phase-name"]',
        );

        if (cancelPhaseNameButton !== null) {
            const phaseElement = cancelPhaseNameButton.closest(
                "[data-phase-id]",
            );

            if (phaseElement === null) {
                throw new Error(
                    "Phase-name cancel action is missing its phase container.",
                );
            }

            setPendingPhaseNameFocus({
                phaseId: phaseElement.dataset.phaseId,
                target: "edit-action",
            });

            try {
                editorState.closePhaseNameEdit();
            } finally {
                setPendingPhaseNameFocus(undefined);
            }

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
        const phaseNameField = event.target.closest(
            "input[data-phase-name-field]",
        );

        if (phaseNameField !== null) {
            setPendingPhaseNameFocus(
                capturePhaseNameFocus(phaseNameField),
            );

            try {
                editorState.updatePhaseNameDraft(
                    phaseNameField.value,
                );
            } catch (error) {
                setPendingPhaseNameFocus(undefined);

                throw error;
            }

            return;
        }

        const field = event.target.closest(
            "input[data-field]",
        );

        if (field === null) {
            return;
        }

        setPendingFieldFocus(
            captureProtocolFieldFocus(field),
        );

        try {
            updateBlockDraftField(
                editorState,
                field.dataset.field,
                field.value,
            );
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

    protocolTree.addEventListener("keydown", (event) => {
        const phaseNameField = event.target.closest(
            "input[data-phase-name-field]",
        );

        if (phaseNameField === null) {
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();

            savePhaseName(
                protocolTree,
                protocolModel,
                editorState,
                setPendingPhaseNameFocus,
            );

            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();

            const phaseElement = phaseNameField.closest(
                "[data-phase-id]",
            );

            if (phaseElement === null) {
                throw new Error(
                    "Phase-name field is missing its phase container.",
                );
            }

            setPendingPhaseNameFocus({
                phaseId: phaseElement.dataset.phaseId,
                target: "edit-action",
            });

            try {
                editorState.closePhaseNameEdit();
            } finally {
                setPendingPhaseNameFocus(undefined);
            }
        }
    });
}

/** Commits the active phase-name draft when it contains a non-empty name. */
function savePhaseName(
    protocolTree,
    protocolModel,
    editorState,
    setPendingPhaseNameFocus,
) {
    const snapshot = editorState.getSnapshot();

    const phaseId = snapshot.editingPhaseId;
    const draftName = snapshot.phaseNameDraft;

    if (
        phaseId === undefined ||
        typeof draftName !== "string"
    ) {
        throw new Error(
            "Cannot save a phase name without an active phase-name edit.",
        );
    }

    const name = draftName.trim();

    if (name === "") {
        const phaseElement = Array.from(
            protocolTree.querySelectorAll("[data-phase-id]"),
        ).find(
            (element) =>
            element.dataset.phaseId === phaseId,
        );

        const field = phaseElement?.querySelector(
            "[data-phase-name-field]",
        );

        if (field !== undefined && field !== null) {
            field.setCustomValidity(
                "Phase name is required.",
            );
            field.reportValidity();
            field.focus();
        }

        return;
    }

    protocolModel.updatePhase(
        phaseId,
        {
            name,
        },
    );

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
