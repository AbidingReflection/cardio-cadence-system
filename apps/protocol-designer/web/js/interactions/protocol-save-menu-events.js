/** Wires interactions for the protocol save dropdown menu. */

/** Wires save-menu open and close behavior. */
export function wireProtocolSaveMenuEvents({ saveMenuButton, saveMenu }) {
    saveMenuButton.addEventListener("click", () => {
        const isOpen = !saveMenu.hidden;

        if (isOpen) {
            closeSaveMenu(saveMenuButton, saveMenu);
            return;
        }

        openSaveMenu(saveMenuButton, saveMenu);
    });

    document.addEventListener("click", (event) => {
        if (saveMenu.hidden) {
            return;
        }

        const splitButton = saveMenuButton.closest(".menu-split-button");

        if (!splitButton.contains(event.target)) {
            closeSaveMenu(saveMenuButton, saveMenu);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || saveMenu.hidden) {
            return;
        }

        closeSaveMenu(saveMenuButton, saveMenu);
        saveMenuButton.focus();
    });
}

/** Opens the save dropdown menu. */
function openSaveMenu(saveMenuButton, saveMenu) {
    saveMenu.hidden = false;
    saveMenuButton.setAttribute("aria-expanded", "true");
}

/** Closes the save dropdown menu. */
function closeSaveMenu(saveMenuButton, saveMenu) {
    saveMenu.hidden = true;
    saveMenuButton.setAttribute("aria-expanded", "false");
}
