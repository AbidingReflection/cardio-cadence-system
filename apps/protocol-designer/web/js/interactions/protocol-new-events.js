/** Wires Protocol Designer New Protocol interactions. */

/** Wires the New Protocol button to the New Protocol controller. */
export function wireProtocolNewEvents({ newButton, protocolNewController }) {
    newButton.addEventListener("click", () => {
        protocolNewController.newProtocol();
    });
}
