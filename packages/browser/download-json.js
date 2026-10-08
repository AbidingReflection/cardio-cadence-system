/** Downloads data as formatted JSON using the supplied filename. */
export function downloadJson(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    try {
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;
        link.click();
    } finally {
        URL.revokeObjectURL(url);
    }
}
