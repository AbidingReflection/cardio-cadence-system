/**
 * Wires opening and explicit dismissal of the Protocol Setup dialog.
 */
export function wireProtocolSetupEvents({ setupButton, setupDialog, closeButton, cancelButton }) {
    setupButton.addEventListener("click", () => {
        setupDialog.showModal();
    });

    closeButton.addEventListener("click", () => {
        setupDialog.close();
    });

    cancelButton.addEventListener("click", () => {
        setupDialog.close();
    });
}
