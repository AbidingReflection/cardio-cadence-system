/**
 * Renders the protocol tree from committed protocol and editor snapshots.
 */

/** Renders the complete protocol tree. */
export function renderProtocolTree(container, protocolSnapshot, editorSnapshot, activityType) {
    container.replaceChildren();

    for (let phaseIndex = 0; phaseIndex < protocolSnapshot.phases.length; phaseIndex++) {
        const phase = protocolSnapshot.phases[phaseIndex];

        container.append(createPhaseElement(phase, phaseIndex, editorSnapshot, activityType));
    }
}

/** Creates a phase card. */
function createPhaseElement(phase, phaseIndex, editorSnapshot, activityType) {
    const isExpanded = editorSnapshot.expandedPhaseIds.includes(phase.id);

    const phaseElement = document.createElement("article");

    phaseElement.className = isExpanded ? "phase-card phase-card--expanded" : "phase-card";

    phaseElement.dataset.phaseId = phase.id;

    phaseElement.append(createPhaseHeader(phase, phaseIndex, isExpanded));

    if (isExpanded) {
        phaseElement.append(createPhaseBody(phase, editorSnapshot, activityType));
    }

    return phaseElement;
}

/** Creates a phase header. */
function createPhaseHeader(phase, phaseIndex, isExpanded) {
    const header = document.createElement("header");

    header.className = "phase-header";

    const heading = document.createElement("div");

    heading.className = "phase-heading";

    const index = document.createElement("span");

    index.className = "phase-index";
    index.textContent = `Phase ${phaseIndex + 1}`;

    const name = document.createElement("h2");

    name.className = "phase-name";
    name.textContent = phase.name;

    heading.append(index, name);

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

    header.append(heading, summary, toggle);

    return header;
}

/** Creates the expanded contents of a phase. */
function createPhaseBody(phase, editorSnapshot, activityType) {
    const body = document.createElement("div");

    body.className = "phase-body";

    const table = document.createElement("div");

    table.className = "phase-block-table";

    table.append(createPhaseBlockHeader(activityType));

    const blocks = document.createElement("div");

    blocks.className = "phase-blocks";

    for (const block of phase.blocks) {
        blocks.append(createBlockElement(block, editorSnapshot, activityType));
    }

    table.append(blocks);
    body.append(table);

    return body;
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

/** Creates a block card. */
function createBlockElement(block, editorSnapshot, activityType) {
    const isExpanded = editorSnapshot.expandedBlockId === block.id;

    const blockElement = document.createElement("article");

    blockElement.className = isExpanded ? "block-card block-card--expanded" : "block-card";

    blockElement.dataset.blockId = block.id;

    if (isExpanded) {
        blockElement.append(createExpandedBlock(block, editorSnapshot, activityType));
    } else {
        blockElement.append(createCollapsedBlock(block, activityType));
    }

    return blockElement;
}

/** Creates the collapsed block row. */
function createCollapsedBlock(block, activityType) {
    const row = document.createElement("div");

    row.className = "block-row";

    const summary = document.createElement("div");

    summary.className = "block-summary";

    const name = document.createElement("span");

    name.className = "block-name";
    name.textContent = block.name;

    const duration = document.createElement("span");

    duration.textContent = formatDuration(block.durationSeconds);

    summary.append(name, duration);

    for (const variable of activityType.variables) {
        const progression = block.variables[variable.id];

        summary.append(
            createTextSpan(progression.type),
            createTextSpan(progression.start),
            createTextSpan(progression.end ?? "—"),
        );
    }

    const toggle = document.createElement("button");

    toggle.type = "button";
    toggle.className = "block-toggle";
    toggle.dataset.action = "expand-block";

    toggle.setAttribute("aria-expanded", "false");

    toggle.setAttribute("aria-label", `Expand ${block.name} block`);

    toggle.textContent = "▼";

    row.append(summary, toggle);

    return row;
}

/** Creates the expanded block editor. */
function createExpandedBlock(block, editorSnapshot, activityType) {
    const draft = editorSnapshot.activeBlockDraft;

    if (draft === undefined || draft.blockId !== block.id) {
        throw new Error(`Expanded block "${block.id}" has no matching active draft.`);
    }

    const form = document.createElement("form");

    form.className = "block-editor";
    form.id = `${block.id}-editor`;

    form.append(
        createBlockEditorHeader(block, draft),
        createBlockEditorBody(
            block,
            draft,
            activityType,
            editorSnapshot.validationErrors,
        ),
    );

    return form;
}

/** Creates the editable block header row. */
function createBlockEditorHeader(block, draft) {
    const row = document.createElement("div");

    row.className = "block-row block-row--editing";

    const nameEditor = document.createElement("div");

    nameEditor.className = "block-name-editor";

    const label = document.createElement("label");

    label.className = "block-name-editor__label";

    label.htmlFor = `${block.id}-name`;

    label.textContent = "Block Name";

    const input = document.createElement("input");

    input.type = "text";
    input.id = `${block.id}-name`;
    input.name = "block-name";
    input.className = "block-name-editor__input";

    input.value = draft.name;

    input.dataset.field = "name";

    nameEditor.append(label, input);

    const toggle = document.createElement("button");

    toggle.type = "button";
    toggle.className = "block-toggle";

    toggle.dataset.action = "collapse-block";

    toggle.setAttribute("aria-expanded", "true");

    toggle.setAttribute("aria-label", `Collapse ${block.name} block`);

    toggle.textContent = "▲";

    row.append(nameEditor, toggle);

    return row;
}

/** Creates the editable block body. */
function createBlockEditorBody(
    block,
    draft,
    activityType,
    validationErrors,
) {
    const body = document.createElement("div");

    body.className = "block-editor__body";

    const blockErrors = validationErrors.filter(
        (error) =>
        error.scope === "block" &&
        (
            error.entityId === undefined ||
            error.entityId === block.id
        ),
    );

    body.append(
        createBlockProperties(block, draft),
        createVariableEditors(block, draft, activityType),
        createBlockFooter(blockErrors),
    );

    applyBlockValidationState(body, blockErrors);

    return body;
}

/** Creates the block-editor footer containing feedback and actions. */
function createBlockFooter(validationErrors) {
    const footer = document.createElement("div");

    footer.className = "block-editor__footer";

    if (validationErrors.length > 0) {
        footer.classList.add("block-editor__footer--invalid");
    }

    const actionArea = document.createElement("div");

    actionArea.className = "block-editor__action-area";

    actionArea.append(createBlockActions());

    footer.append(
        createBlockFeedback(validationErrors),
                  actionArea,
    );

    return footer;
}

/** Creates general block fields. */
function createBlockProperties(block, draft) {
    const properties = document.createElement("div");

    properties.className = "block-editor__properties";

    const field = document.createElement("div");

    field.className = "block-editor__field";

    const label = document.createElement("label");

    label.htmlFor = `${block.id}-duration`;

    label.textContent = "Duration";

    const input = document.createElement("input");

    input.type = "text";
    input.id = `${block.id}-duration`;

    input.name = "block-duration";

    input.inputMode = "numeric";

    input.value = draft.duration;

    input.dataset.field = "duration";

    field.append(label, input);

    properties.append(field);

    return properties;
}

/** Creates editors for all ActivityType variables. */
function createVariableEditors(block, draft, activityType) {
    const variables = document.createElement("div");

    variables.className = "block-editor__variables";

    for (const variable of activityType.variables) {
        variables.append(createVariableEditor(block, draft, variable));
    }

    return variables;
}

/** Creates one variable editor fieldset. */
function createVariableEditor(block, draft, variable) {
    const progression = draft.variables[variable.id];

    const fieldset = document.createElement("fieldset");

    fieldset.className = "variable-editor";

    const legend = document.createElement("legend");

    legend.className = "variable-editor__legend";

    const legendText = document.createElement("span");

    legendText.className = "variable-editor__legend-text";

    legendText.textContent =
        variable.unit === null ? variable.name : `${variable.name} (${variable.unit})`;

    legend.append(legendText);

    const fields = document.createElement("div");

    fields.className = "variable-editor__fields";

    fields.append(
        createProgressionTypeField(block, variable, progression),
        createVariableValueField(block, variable, progression, "start", "Start"),
    );

    if (progression.type === "linear" || progression.type === "stepped") {
        fields.append(createVariableValueField(block, variable, progression, "end", "End"));
    }

    if (progression.type === "stepped") {
        fields.append(createStepField(block, variable, progression));
    }

    fieldset.append(legend, fields);

    return fieldset;
}

/** Creates a progression-type selector. */
function createProgressionTypeField(block, variable, progression) {
    const field = document.createElement("div");

    field.className = "block-editor__field";

    const id = `${block.id}-${variable.id}-type`;

    const label = document.createElement("label");

    label.htmlFor = id;
    label.textContent = "Ramp Type";

    const select = document.createElement("select");

    select.id = id;
    select.name = `${variable.id}-type`;

    select.dataset.field = `variables.${variable.id}.type`;

    for (const type of ["steady", "linear", "stepped"]) {
        const option = document.createElement("option");

        option.value = type;
        option.textContent = type[0].toUpperCase() + type.slice(1);

        option.selected = progression.type === type;

        select.append(option);
    }

    field.append(label, select);

    return field;
}

/** Creates a variable start/end input. */
function createVariableValueField(block, variable, progression, key, labelText) {
    const field = document.createElement("div");

    field.className = "block-editor__field";

    const id = `${block.id}-${variable.id}-${key}`;

    const label = document.createElement("label");

    label.htmlFor = id;
    label.textContent = labelText;

    const input = document.createElement("input");

    input.type = "number";
    input.id = id;
    input.name = `${variable.id}-${key}`;

    input.value = progression[key] ?? "";

    input.dataset.field = `variables.${variable.id}.${key}`;

    field.append(label, input);

    return field;
}

/** Creates the stepped progression step-size input. */
function createStepField(block, variable, progression) {
    const field = document.createElement("div");

    field.className = "block-editor__field";

    const id = `${block.id}-${variable.id}-step`;

    const label = document.createElement("label");

    label.htmlFor = id;
    label.textContent = "Step Size";

    const input = document.createElement("input");

    input.type = "number";
    input.id = id;
    input.value = progression.step ?? "";

    input.dataset.field = `variables.${variable.id}.step`;

    field.append(label, input);

    return field;
}

/** Creates the block validation feedback region. */
function createBlockFeedback(validationErrors) {
    const feedback = document.createElement("div");

    feedback.className = "block-editor__feedback";
    feedback.setAttribute("aria-live", "polite");

    for (const error of validationErrors) {
        const message = document.createElement("button");

        message.type = "button";
        message.className = "block-editor__feedback-message";
        message.dataset.validationField = error.field;
        message.textContent = error.message;

        message.setAttribute(
            "aria-label",
            `Go to invalid field: ${error.message}`,
        );

        feedback.append(message);
    }

    return feedback;
}

/** Marks block-editor controls associated with validation errors. */
function applyBlockValidationState(container, validationErrors) {
    for (const error of validationErrors) {
        const control = Array.from(
            container.querySelectorAll("[data-field]"),
        ).find(
            (element) => element.dataset.field === error.field,
        );

        if (control === undefined) {
            continue;
        }

        control.classList.add("block-editor__control--invalid");
        control.setAttribute("aria-invalid", "true");
    }
}

/** Creates Apply and Cancel block-editor actions. */
function createBlockActions() {
    const actions = document.createElement("div");

    actions.className = "block-editor__actions";

    const cancel = document.createElement("button");

    cancel.type = "button";
    cancel.className = "block-editor__cancel";

    cancel.dataset.action = "cancel-block-edit";

    cancel.textContent = "Cancel";

    const apply = document.createElement("button");

    apply.type = "submit";
    apply.className = "block-editor__apply";

    apply.textContent = "Apply";

    actions.append(cancel, apply);

    return actions;
}

/** Returns the total duration of a phase. */
function getPhaseDurationSeconds(phase) {
    return phase.blocks.reduce((total, block) => total + block.durationSeconds, 0);
}

/** Formats seconds as H:MM:SS or M:SS. */
function formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);

    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return [hours, String(minutes).padStart(2, "0"), String(seconds).padStart(2, "0")].join(
            ":",
        );
    }

    return [minutes, String(seconds).padStart(2, "0")].join(":");
}

/** Creates a span containing display text. */
function createTextSpan(value) {
    const span = document.createElement("span");

    span.textContent = String(value);

    return span;
}
