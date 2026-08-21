/**
 * Captures and restores protocol-tree focus across full DOM rerenders.
 */

/** Captures the identity and selection state of an editable block field. */
export function captureProtocolFieldFocus(field) {
    const blockElement = field.closest("[data-block-id]");

    if (blockElement === null) {
        throw new Error(
            "Editable block field is missing its block container.",
        );
    }

    return {
        blockId: blockElement.dataset.blockId,
        fieldPath: field.dataset.field,
        selectionStart:
        typeof field.selectionStart === "number"
        ? field.selectionStart
        : undefined,
        selectionEnd:
        typeof field.selectionEnd === "number"
        ? field.selectionEnd
        : undefined,
    };
}


/** Restores focus and selection to the equivalent editable block field. */
export function restoreProtocolFieldFocus(
    protocolTree,
    focusContext,
) {
    const blockElement = Array.from(
        protocolTree.querySelectorAll("[data-block-id]"),
    ).find(
        (element) =>
        element.dataset.blockId === focusContext.blockId,
    );

    if (blockElement === undefined) {
        return;
    }

    const field = Array.from(
        blockElement.querySelectorAll("[data-field]"),
    ).find(
        (element) =>
        element.dataset.field === focusContext.fieldPath,
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
        field.setSelectionRange(
            focusContext.selectionStart,
            focusContext.selectionEnd,
        );
    }
}


/** Restores focus to the equivalent phase or block toggle after rendering. */
export function restoreProtocolToggleFocus(
    protocolTree,
    focusContext,
) {
    if (focusContext.type === "block") {
        const blockElement = Array.from(
            protocolTree.querySelectorAll("[data-block-id]"),
        ).find(
            (element) =>
            element.dataset.blockId === focusContext.blockId,
        );

        if (blockElement === undefined) {
            return;
        }

        const toggle = blockElement.querySelector(
            '[data-action="expand-block"], ' +
            '[data-action="collapse-block"]',
        );

        toggle?.focus();

        return;
    }

    if (focusContext.type === "phase") {
        const phaseElement = Array.from(
            protocolTree.querySelectorAll("[data-phase-id]"),
        ).find(
            (element) =>
            element.dataset.phaseId === focusContext.phaseId,
        );

        if (phaseElement === undefined) {
            return;
        }

        phaseElement
        .querySelector('[data-action="toggle-phase"]')
        ?.focus();

        return;
    }

    throw new Error(
        `Unsupported protocol toggle focus type: "${focusContext.type}".`,
    );
}
