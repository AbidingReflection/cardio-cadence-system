/**
 * Verifies machine compatibility feedback generated for block drafts.
 */

import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { ActivityType } from "/packages/protocol-core/models/activity-type.js";
import { MachineProfile } from "/packages/protocol-core/models/machine-profile.js";
import { buildBlockMachineFeedback } from "../../../renderers/protocol/block-machine-feedback.js";

function createActivityType() {
    return new ActivityType({
        id: "elliptical",
        name: "Elliptical",
        variables: [
            {
                id: "cadence",
                name: "Cadence",
                unit: "RPM",
                role: "cadence",
            },
            {
                id: "resistance",
                name: "Resistance",
                unit: null,
                role: "load",
            },
        ],
    });
}

function createMachineProfile(activityType) {
    return new MachineProfile(
        {
            id: "test-elliptical",
            name: "Test Elliptical",
            activityTypeId: "elliptical",
            variables: {
                cadence: {
                    controlMode: "user-produced",
                    progressionTypes: ["steady"],
                },
                resistance: {
                    controlMode: "machine-set",
                    min: 1,
                    max: 5,
                    increment: 2,
                    progressionTypes: ["steady"],
                },
            },
        },
        activityType,
    );
}

function createDraft({
    cadence = {
        type: "steady",
        start: "50",
    },
    resistance = {
        type: "steady",
        start: "3",
    },
} = {}) {
    return {
        mode: "edit",
        blockId: "block-1",
        name: "Test Block",
        duration: "5:00",
        variables: {
            cadence,
            resistance,
        },
    };
}

test("block-machine-feedback", "returns no feedback without a machine profile", () => {
    const activityType = createActivityType();
    const draft = createDraft();

    const feedback = buildBlockMachineFeedback(draft, undefined, activityType);

    assertEqual(feedback.length, 0);
});

test("block-machine-feedback", "maps unsupported progression to the progression type field", () => {
    const activityType = createActivityType();
    const machineProfile = createMachineProfile(activityType);

    const draft = createDraft({
        resistance: {
            type: "stepped",
            start: "1",
            end: "5",
            step: "1",
        },
    });

    const feedback = buildBlockMachineFeedback(draft, machineProfile, activityType);

    assertDeepEqual(feedback[0], {
        field: "variables.resistance.type",
        message: "Resistance Stepped progression is not supported by this machine.",
    });
});
test("block-machine-feedback", "maps target above maximum to the matching target field", () => {
    const activityType = createActivityType();
    const machineProfile = createMachineProfile(activityType);

    const draft = createDraft({
        resistance: {
            type: "steady",
            start: "7",
        },
    });

    const feedback = buildBlockMachineFeedback(draft, machineProfile, activityType);

    assertDeepEqual(feedback[0], {
        field: "variables.resistance.start",
        message: "Resistance Start must not exceed 5.",
    });
});

test("block-machine-feedback", "maps increment mismatch to the matching target field", () => {
    const activityType = createActivityType();
    const machineProfile = createMachineProfile(activityType);

    const draft = createDraft({
        resistance: {
            type: "steady",
            start: "4",
        },
    });

    const feedback = buildBlockMachineFeedback(draft, machineProfile, activityType);

    assertDeepEqual(feedback[0], {
        field: "variables.resistance.start",
        message: "Resistance Start must align to increments of 2 from 1.",
    });
});

test(
    "block-machine-feedback",
    "ignores empty numeric draft values for machine target checks",
    () => {
        const activityType = createActivityType();
        const machineProfile = createMachineProfile(activityType);

        const draft = createDraft({
            resistance: {
                type: "steady",
                start: "",
            },
        });

        const feedback = buildBlockMachineFeedback(draft, machineProfile, activityType);

        assertEqual(feedback.length, 0);
    },
);

test("block-machine-feedback", "ignores non-numeric draft values for machine target checks", () => {
    const activityType = createActivityType();
    const machineProfile = createMachineProfile(activityType);

    const draft = createDraft({
        resistance: {
            type: "steady",
            start: "not-a-number",
        },
    });

    const feedback = buildBlockMachineFeedback(draft, machineProfile, activityType);

    assertEqual(feedback.length, 0);
});

test(
    "block-machine-feedback",
    "keeps unsupported progression feedback when a numeric target is invalid",
    () => {
        const activityType = createActivityType();
        const machineProfile = createMachineProfile(activityType);

        const draft = createDraft({
            resistance: {
                type: "stepped",
                start: "",
                end: "not-a-number",
                step: "1",
            },
        });

        const feedback = buildBlockMachineFeedback(draft, machineProfile, activityType);

        assertDeepEqual(feedback, [
            {
                field: "variables.resistance.type",
                message: "Resistance Stepped progression is not supported by this machine.",
            },
        ]);
    },
);

test("block-machine-feedback", "preserves multiple machine issues for the same field", () => {
    const activityType = createActivityType();
    const machineProfile = createMachineProfile(activityType);

    const draft = createDraft({
        resistance: {
            type: "steady",
            start: "8",
        },
    });

    const feedback = buildBlockMachineFeedback(draft, machineProfile, activityType);

    assertEqual(feedback.length, 2);

    assertDeepEqual(feedback[0], {
        field: "variables.resistance.start",
        message: "Resistance Start must not exceed 5.",
    });

    assertDeepEqual(feedback[1], {
        field: "variables.resistance.start",
        message: "Resistance Start must align to increments of 2 from 1.",
    });
});
