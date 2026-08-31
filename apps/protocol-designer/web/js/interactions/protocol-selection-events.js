/**
 * Wires structural phase and block selection within the protocol tree.
 */

/** Registers delegated protocol-tree selection interactions. */
export function wireProtocolSelectionEvents({ protocolTree, editorState }) {
    protocolTree.tabIndex = -1;

    protocolTree.addEventListener("click", (event) => {
        if (isInteractiveTarget(event.target)) {
            return;
        }

        const blockElement = event.target.closest(".block-card[data-block-id]");

        if (blockElement !== null) {
            if (blockElement.dataset.structuralSelectable !== "true") {
                return;
            }

            editorState.selectBlock(blockElement.dataset.blockId);
            protocolTree.focus();
            return;
        }

        const phaseElement = event.target.closest("[data-phase-id]");

        if (phaseElement !== null) {
            editorState.selectPhase(phaseElement.dataset.phaseId);
            protocolTree.focus();
        }
    });

    protocolTree.addEventListener("focusin", (event) => {
        const actionElement = event.target.closest("[data-action]");

        if (actionElement === null || !isStructuralToggle(actionElement)) {
            return;
        }

        const snapshot = editorState.getSnapshot();

        if (snapshot.selectedPhaseId !== undefined || snapshot.selectedBlockId !== undefined) {
            return;
        }

        const blockElement = actionElement.closest(".block-card[data-block-id]");

        if (blockElement !== null) {
            if (blockElement.dataset.structuralSelectable !== "true") {
                return;
            }

            editorState.selectBlock(blockElement.dataset.blockId);
            return;
        }

        const phaseElement = actionElement.closest("[data-phase-id]");

        if (phaseElement !== null) {
            editorState.selectPhase(phaseElement.dataset.phaseId);
        }
    });

    protocolTree.addEventListener("keydown", (event) => {
        if (event.ctrlKey || event.altKey || event.metaKey) {
            return;
        }

        if (event.key === " ") {
            if (isInteractiveTarget(event.target)) {
                return;
            }

            toggleSelectedItem(event, protocolTree, editorState);
            return;
        }

        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
            return;
        }

        if (isEditableTarget(event.target)) {
            return;
        }

        moveStructuralSelection(event, protocolTree, editorState);
    });
}

/** Returns whether a click belongs to an interactive child control. */
function isInteractiveTarget(target) {
    return (
        target.closest(
            'button, input, select, textarea, a, [contenteditable="true"], [data-action]',
        ) !== null
    );
}

/** Finds one rendered structural card by type and ID. */
function findStructuralItem(protocolTree, type, id) {
    const selector =
        type === "block"
            ? '.block-card[data-block-id][data-structural-selectable="true"]'
            : ".phase-card[data-phase-id]";

    return [...protocolTree.querySelectorAll(selector)].find((element) => {
        return type === "block" ? element.dataset.blockId === id : element.dataset.phaseId === id;
    });
}

/** Returns whether an action element is a structural expand/collapse toggle. */
function isStructuralToggle(actionElement) {
    return (
        actionElement.dataset.action === "toggle-phase" ||
        actionElement.dataset.action === "expand-block" ||
        actionElement.dataset.action === "collapse-block"
    );
}

/** Toggles expansion of the selected structural item. */
function toggleSelectedItem(event, protocolTree, editorState) {
    const snapshot = editorState.getSnapshot();

    let selectedElement;
    let toggle;

    if (snapshot.selectedBlockId !== undefined) {
        selectedElement = findStructuralItem(protocolTree, "block", snapshot.selectedBlockId);

        toggle = selectedElement?.querySelector(
            '[data-action="expand-block"], [data-action="collapse-block"]',
        );
    } else if (snapshot.selectedPhaseId !== undefined) {
        selectedElement = findStructuralItem(protocolTree, "phase", snapshot.selectedPhaseId);

        toggle = selectedElement?.querySelector(
            ':scope > .phase-header [data-action="toggle-phase"]',
        );
    } else {
        return;
    }

    if (toggle === undefined || toggle === null) {
        return;
    }

    event.preventDefault();

    toggle.click();
}

/** Moves structural selection by one visible tree item. */
function moveStructuralSelection(event, protocolTree, editorState) {
    const items = getVisibleStructuralItems(protocolTree);

    if (items.length === 0) {
        return;
    }

    const snapshot = editorState.getSnapshot();

    const currentIndex = items.findIndex((item) => {
        if (item.type === "phase") {
            return item.id === snapshot.selectedPhaseId;
        }

        return item.id === snapshot.selectedBlockId;
    });

    if (currentIndex === -1) {
        return;
    }

    const offset = event.key === "ArrowUp" ? -1 : 1;
    const nextIndex = currentIndex + offset;

    if (nextIndex < 0 || nextIndex >= items.length) {
        return;
    }

    event.preventDefault();

    const nextItem = items[nextIndex];

    if (nextItem.type === "phase") {
        editorState.selectPhase(nextItem.id);
    } else {
        editorState.selectBlock(nextItem.id);
    }

    protocolTree.focus();
}

/** Returns visible phase and block cards in rendered tree order. */
function getVisibleStructuralItems(protocolTree) {
    return [
        ...protocolTree.querySelectorAll(
            '.phase-card[data-phase-id], .block-card[data-block-id][data-structural-selectable="true"]',
        ),
    ].map((element) => {
        if (element.matches(".block-card[data-block-id]")) {
            return {
                type: "block",
                id: element.dataset.blockId,
            };
        }

        return {
            type: "phase",
            id: element.dataset.phaseId,
        };
    });
}

/** Returns whether keyboard navigation should remain with an editable control. */
function isEditableTarget(target) {
    return (
        target.matches("input, select, textarea") ||
        target.closest('[contenteditable="true"]') !== null
    );
}
