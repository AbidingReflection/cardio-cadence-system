/**
 * Verifies calibration applicability feedback generated for block drafts.
 */

import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { ActivityType } from "/packages/protocol-core/models/activity-type.js";
import { buildBlockCalibrationFeedback } from "../../../renderers/protocol/block-calibration-feedback.js";

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

function createCalibrationProfile() {
    return {
        domain: {
            cadence: {
                min: 40,
                max: 70,
            },
            resistance: {
                min: 1,
                max: 16,
            },
        },
    };
}

function createDraft({
    cadence = {
        type: "steady",
        start: "50",
    },
    resistance = {
        type: "steady",
        start: "8",
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

test("block-calibration-feedback", "returns no feedback without a calibration profile", () => {
    const activityType = createActivityType();
    const draft = createDraft();

    const feedback = buildBlockCalibrationFeedback(draft, undefined, activityType);

    assertEqual(feedback.length, 0);
});

test(
    "block-calibration-feedback",
    "returns no feedback when targets are inside the calibrated domain",
    () => {
        const activityType = createActivityType();

        const feedback = buildBlockCalibrationFeedback(
            createDraft(),
            createCalibrationProfile(),
            activityType,
        );

        assertEqual(feedback.length, 0);
    },
);

test(
    "block-calibration-feedback",
    "maps a target below the calibrated domain to the matching field",
    () => {
        const activityType = createActivityType();

        const draft = createDraft({
            cadence: {
                type: "steady",
                start: "35",
            },
        });

        const feedback = buildBlockCalibrationFeedback(
            draft,
            createCalibrationProfile(),
            activityType,
        );

        assertDeepEqual(feedback, [
            {
                field: "variables.cadence.start",
                message: "Cadence Start is below the calibrated minimum of 40.",
            },
        ]);
    },
);

test(
    "block-calibration-feedback",
    "maps a target above the calibrated domain to the matching field",
    () => {
        const activityType = createActivityType();

        const draft = createDraft({
            resistance: {
                type: "steady",
                start: "18",
            },
        });

        const feedback = buildBlockCalibrationFeedback(
            draft,
            createCalibrationProfile(),
            activityType,
        );

        assertDeepEqual(feedback, [
            {
                field: "variables.resistance.start",
                message: "Resistance Start exceeds the calibrated maximum of 16.",
            },
        ]);
    },
);

test("block-calibration-feedback", "checks both start and end targets", () => {
    const activityType = createActivityType();

    const draft = createDraft({
        cadence: {
            type: "linear",
            start: "35",
            end: "75",
        },
    });

    const feedback = buildBlockCalibrationFeedback(draft, createCalibrationProfile(), activityType);

    assertDeepEqual(feedback, [
        {
            field: "variables.cadence.start",
            message: "Cadence Start is below the calibrated minimum of 40.",
        },
        {
            field: "variables.cadence.end",
            message: "Cadence End exceeds the calibrated maximum of 70.",
        },
    ]);
});

test("block-calibration-feedback", "ignores empty numeric draft values", () => {
    const activityType = createActivityType();

    const draft = createDraft({
        resistance: {
            type: "steady",
            start: "",
        },
    });

    const feedback = buildBlockCalibrationFeedback(draft, createCalibrationProfile(), activityType);

    assertEqual(feedback.length, 0);
});

test("block-calibration-feedback", "ignores non-numeric draft values", () => {
    const activityType = createActivityType();

    const draft = createDraft({
        resistance: {
            type: "steady",
            start: "not-a-number",
        },
    });

    const feedback = buildBlockCalibrationFeedback(draft, createCalibrationProfile(), activityType);

    assertEqual(feedback.length, 0);
});

test("block-calibration-feedback", "ignores draft variables outside the calibration domain", () => {
    const activityType = createActivityType();

    const calibrationProfile = {
        domain: {
            resistance: {
                min: 1,
                max: 16,
            },
        },
    };

    const draft = createDraft({
        cadence: {
            type: "steady",
            start: "500",
        },
    });

    const feedback = buildBlockCalibrationFeedback(draft, calibrationProfile, activityType);

    assertEqual(feedback.length, 0);
});
