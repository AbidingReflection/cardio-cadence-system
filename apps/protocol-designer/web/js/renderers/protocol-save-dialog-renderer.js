/** Renders Protocol Save dialog presentation for the requested operation. */

/** Configures the Protocol Save dialog for the requested mode. */
export function renderProtocolSaveDialog(
    {
        title,
        description,
        displayNameInput,
        nameHint,
        changeSummaryField,
        changeSummaryInput,
        confirmButton,
    },
    { mode, displayName = "" },
) {
    changeSummaryInput.value = "";

    switch (mode) {
        case "initial-save":
            title.textContent = "Save Protocol";
            description.textContent = "Choose a name for this protocol.";
            displayNameInput.value = "";
            displayNameInput.disabled = false;
            nameHint.textContent = "This name identifies the protocol in your library.";
            changeSummaryField.hidden = false;
            confirmButton.textContent = "Save";
            break;

        case "save-as":
            title.textContent = "Save As New Protocol";
            description.textContent = "Create a new protocol from the current one.";
            displayNameInput.value = displayName;
            displayNameInput.disabled = false;
            nameHint.textContent = "This name identifies the new protocol in your library.";
            changeSummaryField.hidden = false;
            confirmButton.textContent = "Save As";
            break;

        case "rename":
            title.textContent = "Rename Protocol";
            description.textContent = "Change the name of this protocol.";
            displayNameInput.value = displayName;
            displayNameInput.disabled = false;
            nameHint.textContent = "This changes the protocol name without creating a new version.";
            changeSummaryField.hidden = true;
            confirmButton.textContent = "Rename";
            break;

        default:
            throw new Error(`Unsupported protocol save dialog mode "${mode}".`);
    }
}
