/** Wires the Export Protocol button to protocol JSON download. */
export function wireProtocolExportEvents({ exportButton, protocolModel }) {
    exportButton.addEventListener("click", () => {
        const protocol = protocolModel.getSnapshot();
        downloadProtocol(protocol);
    });
}

/** Downloads protocol data as formatted JSON. */
function downloadProtocol(protocol) {
    const json = JSON.stringify(protocol, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    const filename = protocol.id ? `${protocol.id}.json` : "protocol.json";
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}
