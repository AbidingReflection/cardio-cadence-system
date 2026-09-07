/**
 * Verifies calibration-domain applicability evaluation.
 */

import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import {
    evaluateBlockCalibrationApplicability,
    evaluateProtocolCalibrationApplicability,
} from "../calibration-applicability.js";

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

function createBlock({
    id = "block-1",
    cadence = {
        type: "steady",
        start: 50,
    },
    resistance = {
        type: "steady",
        start: 8,
    },
} = {}) {
    return {
        id,
        durationSeconds: 60,
        variables: {
            cadence,
            resistance,
        },
    };
}

test("calibration-applicability", "returns applicable without a calibration profile", () => {
    const result = evaluateBlockCalibrationApplicability(createBlock());

    assertEqual(result.isApplicable, true);
    assertEqual(result.issues.length, 0);
});

test(
    "calibration-applicability",
    "returns applicable when all targets are inside the calibration domain",
    () => {
        const result = evaluateBlockCalibrationApplicability(
            createBlock(),
            createCalibrationProfile(),
        );

        assertEqual(result.isApplicable, true);
        assertEqual(result.issues.length, 0);
    },
);

test("calibration-applicability", "reports a target below the calibration domain", () => {
    const result = evaluateBlockCalibrationApplicability(
        createBlock({
            cadence: {
                type: "steady",
                start: 35,
            },
        }),
        createCalibrationProfile(),
    );

    assertEqual(result.isApplicable, false);

    assertDeepEqual(result.issues, [
        {
            type: "target-below-calibration-domain",
            blockId: "block-1",
            variableId: "cadence",
            field: "start",
            value: 35,
            minimum: 40,
        },
    ]);
});

test("calibration-applicability", "reports a target above the calibration domain", () => {
    const result = evaluateBlockCalibrationApplicability(
        createBlock({
            resistance: {
                type: "steady",
                start: 18,
            },
        }),
        createCalibrationProfile(),
    );

    assertDeepEqual(result.issues, [
        {
            type: "target-above-calibration-domain",
            blockId: "block-1",
            variableId: "resistance",
            field: "start",
            value: 18,
            maximum: 16,
        },
    ]);
});

test("calibration-applicability", "checks both start and end targets", () => {
    const result = evaluateBlockCalibrationApplicability(
        createBlock({
            cadence: {
                type: "linear",
                start: 35,
                end: 75,
            },
        }),
        createCalibrationProfile(),
    );

    assertDeepEqual(result.issues, [
        {
            type: "target-below-calibration-domain",
            blockId: "block-1",
            variableId: "cadence",
            field: "start",
            value: 35,
            minimum: 40,
        },
        {
            type: "target-above-calibration-domain",
            blockId: "block-1",
            variableId: "cadence",
            field: "end",
            value: 75,
            maximum: 70,
        },
    ]);
});

test("calibration-applicability", "ignores variables without a declared calibration domain", () => {
    const calibrationProfile = {
        domain: {
            resistance: {
                min: 1,
                max: 16,
            },
        },
    };

    const result = evaluateBlockCalibrationApplicability(
        createBlock({
            cadence: {
                type: "steady",
                start: 500,
            },
        }),
        calibrationProfile,
    );

    assertEqual(result.isApplicable, true);
    assertEqual(result.issues.length, 0);
});

test("calibration-applicability", "adds phase ids when evaluating a protocol", () => {
    const protocol = {
        phases: [
            {
                id: "phase-1",
                blocks: [
                    createBlock({
                        cadence: {
                            type: "steady",
                            start: 75,
                        },
                    }),
                ],
            },
        ],
    };

    const result = evaluateProtocolCalibrationApplicability(protocol, createCalibrationProfile());

    assertDeepEqual(result.issues, [
        {
            type: "target-above-calibration-domain",
            blockId: "block-1",
            variableId: "cadence",
            field: "start",
            value: 75,
            maximum: 70,
            phaseId: "phase-1",
        },
    ]);
});
