/** Wires Protocol Designer open-dialog interactions. */

export function wireProtocolOpenEvents({
    openButton,
    openDialog,
    closeButton,
    cancelButton,
    confirmButton,
    protocolList,
    persistenceService,
    protocolOpenController,
}) {
    let selectedProtocolFamilyId;

    openButton.addEventListener("click", () => {
        selectedProtocolFamilyId = undefined;
        confirmButton.disabled = true;

        renderProtocolFamilies(
            protocolList,
            persistenceService.listProtocolFamilies(),
            (protocolFamilyId) => {
                selectedProtocolFamilyId = protocolFamilyId;
                confirmButton.disabled = false;
            },
        );

        openDialog.showModal();
    });

    closeButton.addEventListener("click", () => {
        openDialog.close();
    });

    cancelButton.addEventListener("click", () => {
        openDialog.close();
    });

    confirmButton.addEventListener("click", async () => {
        if (selectedProtocolFamilyId === undefined) {
            return;
        }

        try {
            await protocolOpenController.openProtocolFamily(selectedProtocolFamilyId);

            openDialog.close();
        } catch (error) {
            console.error("Failed to open protocol.", error);
        }
    });
}

/** Renders selectable protocol-family rows into the open dialog. */
function renderProtocolFamilies(protocolList, protocolFamilies, onSelect) {
    protocolList.replaceChildren();

    for (const protocolFamily of protocolFamilies) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "protocol-open-dialog__item";
        button.textContent = protocolFamily.displayName;
        button.dataset.protocolFamilyId = protocolFamily.id;
        button.setAttribute("aria-selected", "false");

        button.addEventListener("click", () => {
            for (const item of protocolList.children) {
                item.setAttribute("aria-selected", "false");
            }

            button.setAttribute("aria-selected", "true");
            onSelect(protocolFamily.id);
        });

        protocolList.append(button);
    }
}
