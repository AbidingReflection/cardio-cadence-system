/**
 * Renders phase cards, phase controls, phase insertion targets, and the block
 * layout contained within expanded phases.
 */

import { createBlockElement, createNewBlockElement } from "./block-renderer.js";

import { formatDuration } from "../../../../../packages/utils/format-duration.js";

import { createErrorIcon, createWarningIcon } from "/packages/ui/status-icons.js";

/** Creates a selectable insertion target between phases. */
export function createPhaseInsertionTarget(index) {
    const target = document.createElement("button");

    target.type = "button";
    target.className = "phase-insertion-target";
    target.dataset.action = "insert-phase";
    target.dataset.dropTarget = "phase";
    target.dataset.insertionIndex = String(index);
    target.setAttribute("aria-label", `Insert phase at position ${index + 1}`);
    target.textContent = "+ Add phase here";

    return target;
}

/** Creates a phase card. */
export function createPhaseElement(
    phase,
    phaseIndex,
    editorSnapshot,
    activityType,
    machineProfile,
    calibrationProfile,
    statusContext,
) {
    const isExpanded = editorSnapshot.expandedPhaseIds.includes(phase.id);
    const isSelected = editorSnapshot.selectedPhaseId === phase.id;

    const phaseElement = document.createElement("article");

    phaseElement.className = [
        "phase-card",
        isExpanded ? "phase-card--expanded" : undefined,
        isSelected ? "phase-card--selected" : undefined,
    ]
        .filter(Boolean)
        .join(" ");

    phaseElement.dataset.phaseId = phase.id;
    phaseElement.setAttribute("aria-selected", String(isSelected));

    if (editorSnapshot.editMode === "phase") {
        phaseElement.dataset.structuralItem = "phase";
        phaseElement.draggable = true;
    }

    if (editorSnapshot.editMode === "block" && !isExpanded) {
        phaseElement.dataset.blockDropPhaseId = phase.id;
    }

    phaseElement.append(
        createPhaseHeader(phase, phaseIndex, isExpanded, editorSnapshot, statusContext),
    );

    if (isExpanded) {
        phaseElement.append(
            createPhaseBody(
                phase,
                editorSnapshot,
                activityType,
                machineProfile,
                calibrationProfile,
                statusContext,
            ),
        );
    }

    return phaseElement;
}

/** Creates a phase header. */
function createPhaseHeader(phase, phaseIndex, isExpanded, editorSnapshot, statusContext) {
    const isEditingName = editorSnapshot.editingPhaseId === phase.id;
    const phaseStatus = statusContext.phaseStatusById.get(phase.id);

    const header = document.createElement("header");
    header.className = "phase-header";

    const heading = document.createElement("div");
    heading.className = "phase-heading";

    const indexRow = document.createElement("div");
    indexRow.className = "phase-index-row";

    const index = document.createElement("span");
    index.className = "phase-index";
    index.textContent = `Phase ${phaseIndex + 1}`;

    indexRow.append(index);

    if (phaseStatus?.errorCount > 0) {
        indexRow.append(createPhaseErrorStatus(phaseStatus.errorCount));
    }

    if (phaseStatus?.warningCount > 0) {
        indexRow.append(createPhaseWarningStatus(phaseStatus.warningCount));
    }

    heading.append(indexRow);

    if (isEditingName) {
        heading.append(createPhaseNameEditor(phase, editorSnapshot.phaseNameDraft));
    } else {
        const name = document.createElement("h2");
        name.className = "phase-name";
        name.textContent = phase.name;

        heading.append(name);
    }

    const summary = document.createElement("div");
    summary.className = "phase-summary";

    const duration = document.createElement("span");
    duration.textContent = `Duration: ${formatDuration(getPhaseDurationSeconds(phase))}`;

    const blockCount = document.createElement("span");
    blockCount.textContent = `${phase.blocks.length} ${
        phase.blocks.length === 1 ? "Block" : "Blocks"
    }`;

    summary.append(duration, blockCount);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "phase-toggle";
    toggle.dataset.action = "toggle-phase";
    toggle.setAttribute("aria-expanded", String(isExpanded));
    toggle.setAttribute(
        "aria-label",
        `${isExpanded ? "Collapse" : "Expand"} Phase ${phaseIndex + 1}`,
    );
    toggle.textContent = isExpanded ? "▲" : "▼";

    if (editorSnapshot.editMode === "phase") {
        heading.append(createPhaseNameActions(phase, isEditingName));
    }

    header.append(heading, summary, toggle);

    return header;
}

/** Creates the aggregated machine compatibility error indicator for a phase. */
function createPhaseErrorStatus(errorCount) {
    const status = document.createElement("span");
    status.className = "phase-status phase-status--error";
    status.setAttribute(
        "aria-label",
        `${errorCount} machine compatibility ${errorCount === 1 ? "issue" : "issues"}`,
    );

    const icon = createErrorIcon();

    const count = document.createElement("span");
    count.className = "phase-status__count";
    count.textContent = String(errorCount);

    status.append(icon, count);

    return status;
}

/** Creates the aggregated calibration applicability warning indicator for a phase. */
function createPhaseWarningStatus(warningCount) {
    const status = document.createElement("span");
    status.className = "phase-status phase-status--warning";
    status.setAttribute(
        "aria-label",
        `${warningCount} calibration applicability ${warningCount === 1 ? "warning" : "warnings"}`,
    );

    const icon = createWarningIcon();

    const count = document.createElement("span");
    count.className = "phase-status__count";
    count.textContent = String(warningCount);

    status.append(icon, count);

    return status;
}

/** Creates the expanded contents of a phase. */
function createPhaseBody(
    phase,
    editorSnapshot,
    activityType,
    machineProfile,
    calibrationProfile,
    statusContext,
) {
    const body = document.createElement("div");
    body.className = "phase-body";

    const table = document.createElement("div");
    table.className = "phase-block-table";
    table.append(createPhaseBlockHeader(activityType));

    const blocks = document.createElement("div");
    blocks.className = "phase-blocks";

    const insertionTarget = editorSnapshot.insertionTarget;
    const draft = editorSnapshot.activeBlockDraft;
    const blockManageActive = editorSnapshot.editMode === "block";
    const hasActiveCreateDraft = draft?.mode === "create";

    const hasCreateDraftInPhase =
        hasActiveCreateDraft &&
        insertionTarget?.type === "block" &&
        insertionTarget.phaseId === phase.id;

    for (let index = 0; index <= phase.blocks.length; index += 1) {
        if (hasCreateDraftInPhase && insertionTarget.index === index) {
            blocks.append(
                createNewBlockElement(
                    editorSnapshot,
                    activityType,
                    machineProfile,
                    calibrationProfile,
                ),
            );
        } else if (blockManageActive && !hasActiveCreateDraft) {
            blocks.append(createBlockInsertionTarget(phase.id, index));
        }

        if (index < phase.blocks.length) {
            blocks.append(
                createBlockElement(
                    phase.blocks[index],
                    editorSnapshot,
                    activityType,
                    machineProfile,
                    calibrationProfile,
                    statusContext,
                ),
            );
        }
    }

    table.append(blocks);
    body.append(table);

    return body;
}

/** Creates a selectable insertion target between blocks. */
function createBlockInsertionTarget(phaseId, index) {
    const target = document.createElement("button");

    target.type = "button";
    target.className = "block-insertion-target";
    target.dataset.action = "insert-block";
    target.dataset.dropTarget = "block";
    target.dataset.phaseId = phaseId;
    target.dataset.insertionIndex = String(index);
    target.setAttribute("aria-label", `Insert block at position ${index + 1}`);
    target.textContent = "+ Add block here";

    return target;
}

/** Creates the block-summary header for an expanded phase. */
function createPhaseBlockHeader(activityType) {
    const row = document.createElement("div");
    row.className = "phase-block-header-row";

    const header = document.createElement("div");
    header.className = "phase-block-header";

    const label = document.createElement("div");
    label.className = "phase-block-header__label";
    label.textContent = "Block Label";

    const duration = document.createElement("div");
    duration.className = "phase-block-header__duration";
    duration.textContent = "Duration";

    header.append(label, duration);

    for (const variable of activityType.variables) {
        const group = document.createElement("div");

        group.className =
            `phase-block-header__group ` + `phase-block-header__group--${variable.role}`;

        group.textContent =
            variable.unit === null ? variable.name : `${variable.name} (${variable.unit})`;

        header.append(group);
    }

    for (const variable of activityType.variables) {
        const ramp = document.createElement("div");
        ramp.className = "phase-block-header__sub";

        if (variable.role === "load") {
            ramp.classList.add("phase-block-header__sub--load-ramp");
        }

        ramp.textContent = "Ramp";

        const start = document.createElement("div");
        start.className = "phase-block-header__sub";
        start.textContent = "Start";

        const end = document.createElement("div");
        end.className = "phase-block-header__sub";
        end.textContent = "End";

        header.append(ramp, start, end);
    }

    const spacer = document.createElement("div");
    spacer.className = "block-toggle-spacer";
    spacer.setAttribute("aria-hidden", "true");

    row.append(header, spacer);

    return row;
}

/** Creates the inline phase-name editor. */
function createPhaseNameEditor(phase, draftName) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "phase-name-editor";
    input.id = `${phase.id}-name`;
    input.name = "phase-name";
    input.value = draftName ?? "";
    input.dataset.phaseNameField = "";
    input.setAttribute("aria-label", `Edit phase name for ${phase.name}`);

    return input;
}

/** Creates phase-name edit, save, cancel, and delete controls. */
function createPhaseNameActions(phase, isEditing) {
    const actions = document.createElement("div");
    actions.className = "phase-name-actions";

    if (!isEditing) {
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "phase-name-action";
        edit.dataset.action = "edit-phase-name";
        edit.setAttribute("aria-label", `Edit phase name: ${phase.name}`);
        edit.textContent = "✎";

        actions.append(edit, createPhaseDeleteButton(phase));

        return actions;
    }

    const save = document.createElement("button");
    save.type = "button";
    save.className = "phase-name-action";
    save.dataset.action = "save-phase-name";
    save.setAttribute("aria-label", "Save phase name");
    save.textContent = "✓";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "phase-name-action";
    cancel.dataset.action = "cancel-phase-name";
    cancel.setAttribute("aria-label", "Cancel phase-name edit");
    cancel.textContent = "×";

    actions.append(save, cancel);

    return actions;
}

/** Creates a phase delete control. */
function createPhaseDeleteButton(phase) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "phase-name-action phase-delete-action";
    button.dataset.action = "delete-phase";
    button.dataset.phaseId = phase.id;
    button.setAttribute("aria-label", `Delete ${phase.name} phase`);
    button.textContent = "x";

    return button;
}

/** Returns the total duration of a phase. */
function getPhaseDurationSeconds(phase) {
    return phase.blocks.reduce((total, block) => total + block.durationSeconds, 0);
}
