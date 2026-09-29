/** Wires the Export Protocol button to protocol JSON download. */
export function wireProtocolExportEvents({ exportButton, protocolModel }) {
    exportButton.addEventListener("click", () => {
        const protocol = protocolModel.getSnapshot();
        const { activityType, machineProfile, calibrationProfile } =
            protocolModel.getSetupContext();

        const protocolBundle = {
            protocol,
            activityType: activityType.getDefinition(),
            machineProfile: machineProfile?.getDefinition() ?? null,
            calibrationProfile: calibrationProfile?.getDefinition() ?? null,
        };

        downloadProtocolBundle(protocolBundle);
    });
}

/** Downloads a self-contained protocol bundle as formatted JSON. */
function downloadProtocolBundle(protocolBundle) {
    const json = JSON.stringify(protocolBundle, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;

    const filename = protocolBundle.protocol.id
        ? `${protocolBundle.protocol.id}.json`
        : "protocol.json";

    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}
