import { getProgressionTypes } from "/packages/protocol-core/progression-types.js";

import { buildBlockMachineFeedback } from "./block-machine-feedback.js";
import { buildBlockCalibrationFeedback } from "./block-calibration-feedback.js";

/**
 * Renders the expanded block editor, including editable fields, progression
 * controls, validation feedback, and apply/cancel actions.
 */

/** Creates the expanded block editor. */
export function createExpandedBlock(
    block,
    editorSnapshot,
    activityType,
    machineProfile,
    calibrationProfile,
) {
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

    const blockErrors = editorSnapshot.validationErrors.filter(
        (error) =>
            error.scope === "block" &&
            (error.entityId === undefined || error.entityId === block.id),
    );

    const form = document.createElement("form");
    form.className = "block-editor";
    form.id = `${block.id}-editor`;

    form.append(
        createBlockEditorHeader(block, draft),
        createBlockEditorBody(
            block,
            draft,
            activityType,
            blockErrors,
            machineProfile,
            calibrationProfile,
        ),
    );

    applyBlockValidationState(form, blockErrors);

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
function createBlockEditorBody(
    block,
    draft,
    activityType,
    blockErrors,
    machineProfile,
    calibrationProfile,
) {
    const body = document.createElement("div");
    body.className = "block-editor__body";

    const orderedErrors = sortBlockFeedbackItems(blockErrors, activityType);

    const machineFeedback = buildBlockMachineFeedback(draft, machineProfile, activityType);

    const orderedMachineFeedback = sortBlockFeedbackItems(machineFeedback, activityType);

    const calibrationFeedback = buildBlockCalibrationFeedback(
        draft,
        calibrationProfile,
        activityType,
    );

    const orderedCalibrationFeedback = sortBlockFeedbackItems(calibrationFeedback, activityType);

    body.append(
        createBlockProperties(block, draft),
        createVariableEditors(block, draft, activityType, machineProfile),
        createBlockFooter(orderedErrors, orderedMachineFeedback, orderedCalibrationFeedback),
    );

    return body;
}

/** Creates the block-editor footer containing feedback and actions. */
function createBlockFooter(validationErrors, machineFeedback, calibrationFeedback) {
    const footer = document.createElement("div");
    footer.className = "block-editor__footer";

    if (
        validationErrors.length > 0 ||
        machineFeedback.length > 0 ||
        calibrationFeedback.length > 0
    ) {
        footer.classList.add("block-editor__footer--has-feedback");
    }

    if (validationErrors.length > 0) {
        footer.classList.add("block-editor__footer--invalid");
    }

    const feedback = document.createElement("div");
    feedback.className = "block-editor__feedback";
    feedback.setAttribute("aria-live", "polite");

    if (validationErrors.length > 0) {
        feedback.append(
            createFeedbackSection(
                "Validation Errors",
                validationErrors,
                "block-editor__feedback-section--error",
            ),
        );
    }

    if (machineFeedback.length > 0) {
        feedback.append(
            createFeedbackSection(
                "Machine Compatibility",
                machineFeedback,
                "block-editor__feedback-section--machine",
            ),
        );
    }

    if (calibrationFeedback.length > 0) {
        feedback.append(
            createFeedbackSection(
                "Calibration Applicability",
                calibrationFeedback,
                "block-editor__feedback-section--calibration",
            ),
        );
    }

    const actionArea = document.createElement("div");
    actionArea.className = "block-editor__action-area";
    actionArea.append(createBlockActions());

    footer.append(feedback, actionArea);

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
        fields.append(createVariableValueField(block, variable, progression, "step", "Step Size"));
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

    const currentTypeSupported = progressionTypes.includes(progression.type);

    if (!currentTypeSupported) {
        const unsupportedOption = document.createElement("option");
        unsupportedOption.value = progression.type;
        unsupportedOption.textContent = `${formatProgressionType(progression.type)} — unsupported by machine`;
        unsupportedOption.selected = true;
        unsupportedOption.disabled = true;

        select.append(unsupportedOption);
    }

    for (const type of progressionTypes) {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = formatProgressionType(type);
        option.selected = progression.type === type;

        select.append(option);
    }

    field.append(label, select);

    return field;
}

/** Formats a progression type for display. */
function formatProgressionType(type) {
    return type[0].toUpperCase() + type.slice(1);
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
    input.step = "any";
    input.id = id;
    input.name = `${variable.id}-${key}`;
    input.value = progression[key] ?? "";
    input.dataset.field = `variables.${variable.id}.${key}`;

    field.append(label, input);

    return field;
}

/** Creates one categorized block feedback section. */
function createFeedbackSection(titleText, feedbackItems, modifierClass) {
    const section = document.createElement("section");
    section.className = `block-editor__feedback-section ${modifierClass}`;

    const title = document.createElement("div");
    title.className = "block-editor__feedback-title";
    title.textContent = titleText;

    const messages = document.createElement("div");
    messages.className = "block-editor__feedback-messages";

    for (const item of feedbackItems) {
        const message = document.createElement("button");

        message.type = "button";
        message.className = "block-editor__feedback-message";
        message.dataset.validationField = item.field;
        message.textContent = item.message;

        message.setAttribute("aria-label", `Go to field: ${item.message}`);

        messages.append(message);
    }

    section.append(title, messages);

    return section;
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

/** Sorts block feedback into stable editor field order. */
function sortBlockFeedbackItems(feedbackItems, activityType) {
    const fieldOrder = [
        "name",
        "durationSeconds",
        ...activityType.variables.flatMap((variable) => [
            `variables.${variable.id}.type`,
            `variables.${variable.id}.start`,
            `variables.${variable.id}.end`,
            `variables.${variable.id}.step`,
        ]),
    ];

    const orderByField = new Map(fieldOrder.map((field, index) => [field, index]));

    return [...feedbackItems].sort((left, right) => {
        const leftOrder = orderByField.get(left.field) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = orderByField.get(right.field) ?? Number.MAX_SAFE_INTEGER;

        return leftOrder - rightOrder;
    });
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
