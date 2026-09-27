import { renderProtocolSaveDialog } from "../renderers/protocol-save-dialog-renderer.js";

/** Wires Protocol Designer save interactions. */
export function wireProtocolSaveEvents({
    saveButton,
    saveAsButton,
    renameButton,
    saveDialog,
    title,
    description,
    closeButton,
    cancelButton,
    confirmButton,
    displayNameInput,
    nameHint,
    changeSummaryField,
    changeSummaryInput,
    editorState,
    persistenceService,
    protocolPersistenceController,
}) {
    let dialogMode;

    const dialogElements = {
        title,
        description,
        displayNameInput,
        nameHint,
        changeSummaryField,
        changeSummaryInput,
        confirmButton,
    };

    saveButton.addEventListener("click", async () => {
        const { protocolFamilyId } = editorState.getSnapshot();

        if (protocolFamilyId !== undefined) {
            try {
                await protocolPersistenceController.saveNextProtocolVersion();
            } catch {
                // Leave the current editor state intact so the user can retry.
            }

            return;
        }

        dialogMode = "initial-save";

        renderProtocolSaveDialog(dialogElements, {
            mode: dialogMode,
        });

        saveDialog.showModal();
        displayNameInput.focus();
    });

    saveAsButton.addEventListener("click", () => {
        const { protocolFamilyId } = editorState.getSnapshot();

        const displayName =
            protocolFamilyId === undefined
                ? ""
                : (persistenceService.getProtocolFamily(protocolFamilyId)?.displayName ?? "");

        dialogMode = "save-as";

        renderProtocolSaveDialog(dialogElements, {
            mode: dialogMode,
            displayName,
        });

        saveDialog.showModal();
        displayNameInput.focus();
    });

    renameButton.addEventListener("click", () => {
        const { protocolFamilyId } = editorState.getSnapshot();

        if (protocolFamilyId === undefined) {
            return;
        }

        const protocolFamily = persistenceService.getProtocolFamily(protocolFamilyId);

        if (protocolFamily === undefined) {
            return;
        }

        dialogMode = "rename";

        renderProtocolSaveDialog(dialogElements, {
            mode: dialogMode,
            displayName: protocolFamily.displayName,
        });

        saveDialog.showModal();
        displayNameInput.focus();
    });

    closeButton.addEventListener("click", () => {
        dialogMode = undefined;
        saveDialog.close();
    });

    cancelButton.addEventListener("click", () => {
        dialogMode = undefined;
        saveDialog.close();
    });

    const confirmSaveDialog = async () => {
        const displayName = normalizeOptionalText(displayNameInput.value);
        const changeSummary = normalizeOptionalText(changeSummaryInput.value);

        try {
            switch (dialogMode) {
                case "initial-save":
                case "save-as":
                    await protocolPersistenceController.createPersistedProtocol({
                        displayName,
                        changeSummary,
                    });
                    break;

                case "rename":
                    await protocolPersistenceController.renameProtocol({
                        displayName,
                    });
                    break;

                default:
                    throw new Error("Cannot confirm protocol save dialog without an active mode.");
            }

            dialogMode = undefined;
            saveDialog.close();
        } catch {
            // Keep the dialog open so the user can retry.
        }
    };

    saveDialog.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") {
            return;
        }

        if (event.target.closest("button") !== null) {
            return;
        }

        event.preventDefault();
        void confirmSaveDialog();
    });

    confirmButton.addEventListener("click", () => {
        void confirmSaveDialog();
    });
}

/** Trims optional text and converts blank values to undefined. */
function normalizeOptionalText(value) {
    const normalizedValue = value.trim();

    return normalizedValue === "" ? undefined : normalizedValue;
}
