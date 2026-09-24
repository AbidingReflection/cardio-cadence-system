/** Wires Protocol Designer New Protocol interactions. */

/** Wires the New Protocol button to guarded New Protocol creation. */
export function wireProtocolNewEvents({
    newButton,
    protocolNewController,
    protocolUnsavedChanges,
}) {
    newButton.addEventListener("click", () => {
        if (protocolUnsavedChanges.hasUnsavedChanges()) {
            const confirmed = window.confirm(
                "You have unsaved changes. Starting a new protocol will discard them. Continue?",
            );

            if (!confirmed) {
                return;
            }
        }

        protocolNewController.newProtocol();
    });
}
