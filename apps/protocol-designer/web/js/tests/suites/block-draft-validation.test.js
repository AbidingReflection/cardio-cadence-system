import {
    test,
    assertEqual,
    assertDeepEqual,
} from "/packages/js-testing/framework/test-framework.js";

import {
    validateBlockDraft,
} from "../../editor/block-draft-validation.js";


const ACTIVITY_TYPE = {
    id: "treadmill",
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


const MACHINE_VARIABLES = {
    speed: {
        controlMode: "machine-set",
        min: 0.5,
        max: 10,
        increment: 0.1,
    },
    incline: {
        controlMode: "machine-set",
        min: 0,
        max: 10,
        increment: 0.5,
    },
};


const MACHINE_PROFILE = {
    id: "test-treadmill",
    activityTypeId: "treadmill",

    getVariable(variableId) {
        return MACHINE_VARIABLES[variableId];
    },
};


/** Creates a valid block draft for use as a test fixture. */
function createDraft() {
    return {
        mode: "edit",
        blockId: "block-1",
        phaseId: "phase-1",
        name: "Warmup",
        duration: "3:00",
        variables: {
            speed: {
                type: "linear",
                start: "3.5",
                end: "5",
            },
            incline: {
                type: "steady",
                start: "0",
            },
        },
    };
}


test("block-draft-validation", "converts a valid draft to committed block data", () => {
    const result = validateBlockDraft(
        createDraft(),
                                      ACTIVITY_TYPE,
                                      MACHINE_PROFILE
    );

    assertEqual(result.isValid, true);

    assertDeepEqual(
        result.blockData,
        {
            name: "Warmup",
            durationSeconds: 180,
            variables: {
                speed: {
                    type: "linear",
                    start: 3.5,
                    end: 5,
                },
                incline: {
                    type: "steady",
                    start: 0,
                },
            },
        }
    );

    assertDeepEqual(
        result.errors,
        []
    );
});


test("block-draft-validation", "trims the block name", () => {
    const draft = createDraft();
    draft.name = "  Warmup  ";

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(
        result.blockData.name,
        "Warmup"
    );
});


test("block-draft-validation", "converts hour duration text to seconds", () => {
    const draft = createDraft();
    draft.duration = "1:05:30";

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(
        result.blockData.durationSeconds,
        3930
    );
});


test("block-draft-validation", "rejects a blank block name", () => {
    const draft = createDraft();
    draft.name = "   ";

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(result.isValid, false);
    assertEqual(result.blockData, undefined);

    assertDeepEqual(
        result.errors,
        [
            {
                scope: "block",
                entityId: undefined,
                field: "name",
                message: "Block name is required.",
            },
        ]
    );
});


test("block-draft-validation", "rejects a blank duration", () => {
    const draft = createDraft();
    draft.duration = "";

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(result.isValid, false);

    assertEqual(
        result.errors[0].field,
        "duration"
    );
});


test("block-draft-validation", "rejects malformed duration text", () => {
    const draft = createDraft();
    draft.duration = "3 minutes";

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(result.isValid, false);

    assertEqual(
        result.errors[0].field,
        "duration"
    );
});


test("block-draft-validation", "rejects duration seconds greater than 59", () => {
    const draft = createDraft();
    draft.duration = "3:75";

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(result.isValid, false);
});


test("block-draft-validation", "rejects zero duration", () => {
    const draft = createDraft();
    draft.duration = "0:00";

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(result.isValid, false);

    assertEqual(
        result.errors[0].message,
        "Duration must be greater than zero."
    );
});


test("block-draft-validation", "ignores stale fields on steady progressions", () => {
    const draft = createDraft();

    draft.variables.incline = {
        type: "steady",
        start: "2",
        end: "8",
        stepInterval: "1:00",
    };

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertDeepEqual(
        result.blockData.variables.incline,
        {
            type: "steady",
            start: 2,
        }
    );
});


test("block-draft-validation", "requires an end value for linear progressions", () => {
    const draft = createDraft();
    draft.variables.speed.end = "";

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(result.isValid, false);

    assertEqual(
        result.errors[0].field,
        "variables.speed.end"
    );
});


test("block-draft-validation", "converts valid stepped progressions", () => {
    const draft = createDraft();

    draft.variables.incline = {
        type: "stepped",
        start: "0",
        end: "5",
        stepInterval: "1:00",
    };

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertDeepEqual(
        result.blockData.variables.incline,
        {
            type: "stepped",
            start: 0,
            end: 5,
            stepIntervalSeconds: 60,
        }
    );
});


test("block-draft-validation", "requires a step interval for stepped progressions", () => {
    const draft = createDraft();

    draft.variables.incline = {
        type: "stepped",
        start: "0",
        end: "5",
        stepInterval: "",
    };

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(result.isValid, false);

    assertEqual(
        result.errors[0].field,
        "variables.incline.stepInterval"
    );
});


test("block-draft-validation", "rejects unknown progression types", () => {
    const draft = createDraft();
    draft.variables.speed.type = "unknown";

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(result.isValid, false);

    assertEqual(
        result.errors[0].field,
        "variables.speed.type"
    );
});


test("block-draft-validation", "rejects missing ActivityType variables", () => {
    const draft = createDraft();

    delete draft.variables.incline;

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(result.isValid, false);

    assertEqual(
        result.errors[0].field,
        "variables.incline"
    );
});


test("block-draft-validation", "rejects blank numeric targets", () => {
    const draft = createDraft();
    draft.variables.speed.start = "";

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(result.isValid, false);

    assertEqual(
        result.errors[0].field,
        "variables.speed.start"
    );
});


test("block-draft-validation", "rejects non-numeric targets", () => {
    const draft = createDraft();
    draft.variables.speed.start = "fast";

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(result.isValid, false);

    assertEqual(
        result.errors[0].field,
        "variables.speed.start"
    );
});


test("block-draft-validation", "rejects targets below machine minimum", () => {
    const draft = createDraft();
    draft.variables.speed.start = "0.4";

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(result.isValid, false);

    assertEqual(
        result.errors[0].field,
        "variables.speed.start"
    );
});


test("block-draft-validation", "rejects targets above machine maximum", () => {
    const draft = createDraft();
    draft.variables.speed.end = "10.1";

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(result.isValid, false);

    assertEqual(
        result.errors[0].field,
        "variables.speed.end"
    );
});


test("block-draft-validation", "accepts decimal machine increments", () => {
    const draft = createDraft();

    draft.variables.speed = {
        type: "linear",
        start: "3.1",
        end: "6.3",
    };

    draft.variables.incline = {
        type: "linear",
        start: "0.5",
        end: "2.5",
    };

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(
        result.isValid,
        true
    );
});


test("block-draft-validation", "rejects targets not aligned to machine increments", () => {
    const draft = createDraft();
    draft.variables.incline.start = "0.25";

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(result.isValid, false);

    assertEqual(
        result.errors[0].field,
        "variables.incline.start"
    );
});


test("block-draft-validation", "supports drafts without a MachineProfile", () => {
    const draft = createDraft();

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE
    );

    assertEqual(
        result.isValid,
        true
    );
});


test("block-draft-validation", "returns all detected validation errors", () => {
    const draft = createDraft();

    draft.name = "";
    draft.duration = "";
    draft.variables.speed.start = "";
    draft.variables.incline.start = "";

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(result.isValid, false);

    assertEqual(
        result.errors.length,
        4
    );
});


test("block-draft-validation", "includes block ID in variable validation errors", () => {
    const draft = createDraft();
    draft.variables.speed.start = "";

    const result = validateBlockDraft(
        draft,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertEqual(
        result.errors[0].entityId,
        "block-1"
    );
});
