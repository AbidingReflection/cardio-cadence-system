import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";
import { createExpandedBlock } from "../../../renderers/protocol/block-editor-renderer.js";
import { ActivityType } from "../../../models/activity-type.js";

test("block-editor-renderer", "allows decimal target and step inputs", () => {
    const block = {
        id: "block-1",
        name: "Block 1",
        durationSeconds: 600,
        variables: {
            speed: {
                type: "stepped",
                start: 1,
                end: 5,
                step: 0.1,
            },
            incline: {
                type: "steady",
                start: 1.5,
            },
        },
    };

    const editorSnapshot = {
        activeBlockDraft: {
            mode: "edit",
            blockId: "block-1",
            phaseId: "phase-1",
            name: "Block 1",
            duration: "10:00",
            variables: {
                speed: {
                    type: "stepped",
                    start: "1",
                    end: "5",
                    step: "0.1",
                },
                incline: {
                    type: "steady",
                    start: "1.5",
                },
            },
        },
        validationErrors: [],
    };

    const activityType = {
        variables: [
            {
                id: "speed",
                name: "Speed",
                unit: "MPH",
                role: "pace",
            },
            {
                id: "incline",
                name: "Incline",
                unit: "%",
                role: "load",
            },
        ],
    };

    const element = createExpandedBlock(block, editorSnapshot, activityType, undefined, undefined);

    const speedStart = element.querySelector('[data-field="variables.speed.start"]');
    const speedStep = element.querySelector('[data-field="variables.speed.step"]');
    const inclineStart = element.querySelector('[data-field="variables.incline.start"]');

    assertEqual(speedStart.type, "number");
    assertEqual(speedStart.step, "any");

    assertEqual(speedStep.type, "number");
    assertEqual(speedStep.step, "any");

    assertEqual(inclineStart.type, "number");
    assertEqual(inclineStart.step, "any");
});

test("block-editor-renderer", "renders fields required by the progression type", () => {
    const steadyElement = createTestEditor({
        type: "steady",
        start: "50",
    });

    assertEqual(
        steadyElement.querySelector('[data-field="variables.cadence.start"]') !== null,
        true,
    );
    assertEqual(steadyElement.querySelector('[data-field="variables.cadence.end"]'), null);
    assertEqual(steadyElement.querySelector('[data-field="variables.cadence.step"]'), null);

    const linearElement = createTestEditor({
        type: "linear",
        start: "50",
        end: "60",
    });

    assertEqual(
        linearElement.querySelector('[data-field="variables.cadence.start"]') !== null,
        true,
    );
    assertEqual(linearElement.querySelector('[data-field="variables.cadence.end"]') !== null, true);
    assertEqual(linearElement.querySelector('[data-field="variables.cadence.step"]'), null);

    const steppedElement = createTestEditor({
        type: "stepped",
        start: "50",
        end: "60",
        step: "5",
    });

    assertEqual(
        steppedElement.querySelector('[data-field="variables.cadence.start"]') !== null,
        true,
    );
    assertEqual(
        steppedElement.querySelector('[data-field="variables.cadence.end"]') !== null,
        true,
    );
    assertEqual(
        steppedElement.querySelector('[data-field="variables.cadence.step"]') !== null,
        true,
    );
});

test("block-editor-renderer", "preserves an unsupported selected progression", () => {
    const machineProfile = {
        getVariable(variableId) {
            if (variableId !== "cadence") {
                return undefined;
            }

            return {
                progressionTypes: ["steady"],
            };
        },
    };

    const element = createTestEditor(
        {
            type: "stepped",
            start: "50",
            end: "60",
            step: "5",
        },
        {
            machineProfile,
        },
    );

    const select = element.querySelector('[data-field="variables.cadence.type"]');
    const selectedOption = select.selectedOptions[0];

    assertEqual(selectedOption.value, "stepped");
    assertEqual(selectedOption.disabled, true);
    assertEqual(selectedOption.textContent, "Stepped — unsupported by machine");
});

test("block-editor-renderer", "marks fields with validation errors as invalid", () => {
    const element = createTestEditor(
        {
            type: "steady",
            start: "",
        },
        {
            validationErrors: [
                {
                    scope: "block",
                    field: "variables.cadence.start",
                    message: "Cadence start is required and must be numeric.",
                    entityId: "block-1",
                },
            ],
        },
    );

    const input = element.querySelector('[data-field="variables.cadence.start"]');

    assertEqual(input.classList.contains("block-editor__control--invalid"), true);
    assertEqual(input.getAttribute("aria-invalid"), "true");
});

/** Creates a small block editor fixture for renderer tests. */
function createTestEditor(progression, { machineProfile = undefined, validationErrors = [] } = {}) {
    const block = {
        id: "block-1",
        name: "Block 1",
        durationSeconds: 600,
        variables: {
            cadence: {
                type: "steady",
                start: 50,
            },
        },
    };

    const editorSnapshot = {
        activeBlockDraft: {
            mode: "edit",
            blockId: "block-1",
            phaseId: "phase-1",
            name: "Block 1",
            duration: "10:00",
            variables: {
                cadence: progression,
            },
        },
        validationErrors,
    };

    const activityType = new ActivityType({
        id: "elliptical",
        name: "Elliptical",
        variables: [
            {
                id: "cadence",
                name: "Cadence",
                unit: "RPM",
                role: "cadence",
            },
        ],
    });

    return createExpandedBlock(block, editorSnapshot, activityType, machineProfile, undefined);
}
