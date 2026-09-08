/**
 * Verifies calibration-model numerical evaluation.
 */

import { assertEqual, assertThrows, test } from "/packages/js-testing/framework/test-framework.js";

import { evaluateCalibration } from "../calibration-evaluator.js";

/** Creates a calibration profile fixture with an overridable model. */
function createCalibrationProfile(modelOverrides = {}) {
    return {
        model: {
            type: "polynomial",
            input: {
                type: "product",
                variables: ["cadence", "resistance"],
            },
            coefficients: [2, 3, 4],
            outputUnit: "kcalPerSecond",
            ...modelOverrides,
        },
    };
}

test("calibration-evaluator", "evaluates ascending-power polynomial coefficients", () => {
    const calibrationProfile = createCalibrationProfile({
        input: {
            type: "product",
            variables: ["value"],
        },
        coefficients: [2, 3, 4],
    });

    const result = evaluateCalibration(calibrationProfile, {
        value: 5,
    });

    assertEqual(result, 117);
});

test("calibration-evaluator", "evaluates product inputs before polynomial evaluation", () => {
    const calibrationProfile = createCalibrationProfile();

    const result = evaluateCalibration(calibrationProfile, {
        cadence: 2,
        resistance: 3,
    });

    // x = 2 * 3 = 6
    // 2 + 3x + 4x² = 164
    assertEqual(result, 164);
});

test("calibration-evaluator", "evaluates the real elliptical calibration", () => {
    const calibrationProfile = createCalibrationProfile({
        coefficients: [0.0572, 0.00014, 0.000000285, -0.000000000143],
    });

    const result = evaluateCalibration(calibrationProfile, {
        cadence: 60,
        resistance: 10,
    });

    assertEqual(Math.abs(result - 0.212912) < 1e-9, true);
});

test("calibration-evaluator", "accepts fractional input values", () => {
    const calibrationProfile = createCalibrationProfile({
        input: {
            type: "product",
            variables: ["value"],
        },
        coefficients: [1, 2],
    });

    const result = evaluateCalibration(calibrationProfile, {
        value: 1.5,
    });

    assertEqual(result, 4);
});

test("calibration-evaluator", "ignores extra unused input values", () => {
    const calibrationProfile = createCalibrationProfile({
        input: {
            type: "product",
            variables: ["value"],
        },
        coefficients: [0, 1],
    });

    const result = evaluateCalibration(calibrationProfile, {
        value: 5,
        unrelated: 999,
    });

    assertEqual(result, 5);
});

test("calibration-evaluator", "rejects non-object calibration values", () => {
    const calibrationProfile = createCalibrationProfile();

    assertThrows(
        () => evaluateCalibration(calibrationProfile, null),
        "Calibration values must be an object.",
    );

    assertThrows(
        () => evaluateCalibration(calibrationProfile, []),
        "Calibration values must be an object.",
    );
});

test("calibration-evaluator", "rejects a missing required input", () => {
    const calibrationProfile = createCalibrationProfile();

    assertThrows(
        () =>
            evaluateCalibration(calibrationProfile, {
                cadence: 60,
            }),
        'Calibration input "resistance" must be a finite number.',
    );
});

test("calibration-evaluator", "rejects NaN input values", () => {
    const calibrationProfile = createCalibrationProfile();

    assertThrows(
        () =>
            evaluateCalibration(calibrationProfile, {
                cadence: Number.NaN,
                resistance: 10,
            }),
        'Calibration input "cadence" must be a finite number.',
    );
});

test("calibration-evaluator", "rejects infinite input values", () => {
    const calibrationProfile = createCalibrationProfile();

    assertThrows(
        () =>
            evaluateCalibration(calibrationProfile, {
                cadence: Infinity,
                resistance: 10,
            }),
        'Calibration input "cadence" must be a finite number.',
    );
});

test("calibration-evaluator", "evaluates values outside the calibration domain", () => {
    const calibrationProfile = createCalibrationProfile({
        coefficients: [0, 1],
    });

    calibrationProfile.domain = {
        cadence: {
            min: 40,
            max: 70,
        },
        resistance: {
            min: 1,
            max: 16,
        },
    };

    const result = evaluateCalibration(calibrationProfile, {
        cadence: 100,
        resistance: 20,
    });

    assertEqual(result, 2000);
});

test("calibration-evaluator", "preserves negative polynomial results", () => {
    const calibrationProfile = createCalibrationProfile({
        input: {
            type: "product",
            variables: ["value"],
        },
        coefficients: [1, -2],
    });

    const result = evaluateCalibration(calibrationProfile, {
        value: 2,
    });

    assertEqual(result, -3);
});

test("calibration-evaluator", "rejects an unsupported model type", () => {
    const calibrationProfile = createCalibrationProfile({
        type: "future-model",
    });

    assertThrows(
        () =>
            evaluateCalibration(calibrationProfile, {
                cadence: 60,
                resistance: 10,
            }),
        'Unsupported calibration model type: "future-model".',
    );
});

test("calibration-evaluator", "rejects an unsupported input type", () => {
    const calibrationProfile = createCalibrationProfile({
        input: {
            type: "future-input",
            variables: ["cadence", "resistance"],
        },
    });

    assertThrows(
        () =>
            evaluateCalibration(calibrationProfile, {
                cadence: 60,
                resistance: 10,
            }),
        'Unsupported calibration input type: "future-input".',
    );
});
