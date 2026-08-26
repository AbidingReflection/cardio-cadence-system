import { getProgressionTypes } from "/packages/protocol-core/progression-types.js";

/**
 * Renders the expanded block editor, including editable fields, progression
 * controls, validation feedback, and apply/cancel actions.
 */

/** Creates the expanded block editor. */
export function createExpandedBlock(block, editorSnapshot, activityType, machineProfile) {
    const draft = editorSnapshot.activeBlockDraft;

    if (draft === undefined) {
        throw new Error(`Expanded block "${block.id}" has no active draft.`);
    }

    if (draft.mode === "edit" && draft.blockId !== block.id) {
        throw new Error(`Expanded block "${block.id}" has no matching edit draft.`);
    }

    if (draft.mode === "create" && editorSnapshot.expandedBlockId !== block.id) {
        throw new Error(`Expanded block "${block.id}" has no matching create draft.`);
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
            machineProfile,
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

    row.append(toggle, nameEditor);

    return row;
}

/** Creates the editable block body. */
function createBlockEditorBody(block, draft, activityType, validationErrors, machineProfile) {
    const body = document.createElement("div");
    body.className = "block-editor__body";

    const blockErrors = validationErrors.filter(
        (error) =>
            error.scope === "block" &&
            (error.entityId === undefined || error.entityId === block.id),
    );

    body.append(
        createBlockProperties(block, draft),
        createVariableEditors(block, draft, activityType, machineProfile),
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

    footer.append(createBlockFeedback(validationErrors), actionArea);

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
function createVariableEditors(block, draft, activityType, machineProfile) {
    const variables = document.createElement("div");

    variables.className = "block-editor__variables";

    for (const variable of activityType.variables) {
        const machineVariable = machineProfile?.getVariable(variable.id);

        variables.append(createVariableEditor(block, draft, variable, machineVariable));
    }

    return variables;
}

/** Creates one variable editor fieldset. */
function createVariableEditor(block, draft, variable, machineVariable) {
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

    const progressionTypes = machineVariable?.progressionTypes ?? getProgressionTypes();

    fields.append(
        createProgressionTypeField(block, variable, progression, progressionTypes),
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
function createProgressionTypeField(block, variable, progression, progressionTypes) {
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

    for (const type of progressionTypes) {
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
    input.name = `${variable.id}-step`;
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

        message.setAttribute("aria-label", `Go to invalid field: ${error.message}`);

        feedback.append(message);
    }

    return feedback;
}

/** Marks block-editor controls associated with validation errors. */
function applyBlockValidationState(container, validationErrors) {
    for (const error of validationErrors) {
        const control = Array.from(container.querySelectorAll("[data-field]")).find(
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
