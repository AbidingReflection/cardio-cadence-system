/** Wires Protocol Designer protocol import interactions. */
export function wireProtocolImportEvents({
    importButton,
    importInput,
    protocolImportController,
    protocolUnsavedChanges,
}) {
    importButton.addEventListener("click", () => {
        if (protocolUnsavedChanges.hasUnsavedChanges()) {
            const confirmed = window.confirm(
                "You have unsaved changes. Importing a protocol will discard them. Continue?",
            );

            if (!confirmed) {
                return;
            }
        }

        importInput.click();
    });

    importInput.addEventListener("change", async () => {
        const [file] = importInput.files;

        if (file === undefined) {
            return;
        }

        try {
            const text = await file.text();
            const protocolBundle = JSON.parse(text);

            protocolImportController.importProtocolBundle(protocolBundle);
        } catch (error) {
            console.error("Failed to import protocol.", error);
        } finally {
            importInput.value = "";
        }
    });
}
