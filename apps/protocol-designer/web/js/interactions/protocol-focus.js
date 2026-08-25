/**
 * Captures and restores protocol-tree focus across full DOM rerenders.
 */

/** Captures the identity and selection state of an editable block field. */
export function captureProtocolFieldFocus(field) {
    const blockElement = field.closest("[data-block-id]");

    if (blockElement === null) {
        throw new Error("Editable block field is missing its block container.");
    }

    return {
        blockId: blockElement.dataset.blockId,
        fieldPath: field.dataset.field,
        selectionStart: typeof field.selectionStart === "number" ? field.selectionStart : undefined,
        selectionEnd: typeof field.selectionEnd === "number" ? field.selectionEnd : undefined,
    };
}

/** Restores focus and selection to the equivalent editable block field. */
export function restoreProtocolFieldFocus(protocolTree, focusContext) {
    const blockElement = Array.from(protocolTree.querySelectorAll("[data-block-id]")).find(
        (element) => element.dataset.blockId === focusContext.blockId,
    );

    if (blockElement === undefined) {
        return;
    }

    const field = Array.from(blockElement.querySelectorAll("[data-field]")).find(
        (element) => element.dataset.field === focusContext.fieldPath,
    );

    if (field === undefined) {
        return;
    }

    field.focus();

    if (
        typeof focusContext.selectionStart === "number" &&
        typeof focusContext.selectionEnd === "number" &&
        typeof field.selectionStart === "number"
    ) {
        field.setSelectionRange(focusContext.selectionStart, focusContext.selectionEnd);
    }
}

/** Restores focus to the equivalent phase or block toggle after rendering. */
export function restoreProtocolToggleFocus(protocolTree, focusContext) {
    if (focusContext.type === "block") {
        const blockElement = Array.from(protocolTree.querySelectorAll("[data-block-id]")).find(
            (element) => element.dataset.blockId === focusContext.blockId,
        );

        if (blockElement === undefined) {
            return;
        }

        const toggle = blockElement.querySelector(
            '[data-action="expand-block"], ' + '[data-action="collapse-block"]',
        );

        toggle?.focus();

        return;
    }

    if (focusContext.type === "phase") {
        const phaseElement = Array.from(protocolTree.querySelectorAll("[data-phase-id]")).find(
            (element) => element.dataset.phaseId === focusContext.phaseId,
        );

        if (phaseElement === undefined) {
            return;
        }

        phaseElement.querySelector('[data-action="toggle-phase"]')?.focus();

        return;
    }

    throw new Error(`Unsupported protocol toggle focus type: "${focusContext.type}".`);
}

/** Captures the identity and selection state of a phase-name editor. */
export function capturePhaseNameFocus(field) {
    const phaseElement = field.closest("[data-phase-id]");

    if (phaseElement === null) {
        throw new Error("Phase-name field is missing its phase container.");
    }

    return {
        phaseId: phaseElement.dataset.phaseId,
        target: "editor",
        selectionStart: typeof field.selectionStart === "number" ? field.selectionStart : undefined,
        selectionEnd: typeof field.selectionEnd === "number" ? field.selectionEnd : undefined,
    };
}

/** Restores focus to a phase-name editor or its edit action after rendering. */
export function restorePhaseNameFocus(protocolTree, focusContext) {
    const phaseElement = Array.from(protocolTree.querySelectorAll("[data-phase-id]")).find(
        (element) => element.dataset.phaseId === focusContext.phaseId,
    );

    if (phaseElement === undefined) {
        return;
    }

    if (focusContext.target === "edit-action") {
        phaseElement.querySelector('[data-action="edit-phase-name"]')?.focus();

        return;
    }

    if (focusContext.target !== "editor") {
        throw new Error(`Unsupported phase-name focus target: "${focusContext.target}".`);
    }

    const field = phaseElement.querySelector("[data-phase-name-field]");

    if (field === null) {
        return;
    }

    field.focus();

    if (
        typeof focusContext.selectionStart === "number" &&
        typeof focusContext.selectionEnd === "number" &&
        typeof field.selectionStart === "number"
    ) {
        field.setSelectionRange(focusContext.selectionStart, focusContext.selectionEnd);
    }
}

/** Restores focus to the equivalent structural phase or block after rendering. */
export function restoreProtocolStructuralFocus(protocolTree, focusContext) {
    if (focusContext.type === "phase") {
        const phaseElement = Array.from(
            protocolTree.querySelectorAll('[data-structural-item="phase"]'),
        ).find((element) => element.dataset.phaseId === focusContext.phaseId);

        phaseElement?.focus();
        return;
    }

    if (focusContext.type === "block") {
        const blockElement = Array.from(
            protocolTree.querySelectorAll('[data-structural-item="block"]'),
        ).find((element) => element.dataset.blockId === focusContext.blockId);

        blockElement?.focus();
        return;
    }

    throw new Error(`Unsupported structural focus type: "${focusContext.type}".`);
}
