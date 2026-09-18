/** Wires Protocol Designer save-dialog interactions. */

export function wireProtocolSaveEvents({
    saveButton,
    saveDialog,
    closeButton,
    cancelButton,
    confirmButton,
    displayNameInput,
    changeSummaryInput,
    editorState,
    protocolPersistenceController,
}) {
    saveButton.addEventListener("click", () => {
        const { protocolFamilyId } = editorState.getSnapshot();

        displayNameInput.disabled = protocolFamilyId !== undefined;
        displayNameInput.value = "";
        changeSummaryInput.value = "";

        saveDialog.showModal();

        if (protocolFamilyId === undefined) {
            displayNameInput.focus();
        } else {
            changeSummaryInput.focus();
        }
    });

    closeButton.addEventListener("click", () => {
        saveDialog.close();
    });

    cancelButton.addEventListener("click", () => {
        saveDialog.close();
    });

    confirmButton.addEventListener("click", async () => {
        const { protocolFamilyId } = editorState.getSnapshot();

        const displayName =
            protocolFamilyId === undefined
                ? normalizeOptionalText(displayNameInput.value)
                : undefined;

        const changeSummary = normalizeOptionalText(changeSummaryInput.value);

        try {
            await protocolPersistenceController.saveProtocol({
                displayName,
                changeSummary,
            });

            saveDialog.close();
        } catch {
            // Keep the dialog open so the user can retry.
        }
    });
}

/** Trims optional text and converts blank values to undefined. */
function normalizeOptionalText(value) {
    const normalizedValue = value.trim();

    return normalizedValue === "" ? undefined : normalizedValue;
}
