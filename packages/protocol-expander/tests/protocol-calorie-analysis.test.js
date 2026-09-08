import { assertEqual, assertThrows, test } from "../../js-testing/framework/test-framework.js";

import { calculateProtocolCalories } from "../protocol-calorie-analysis.js";

/** Creates a small protocol for calorie-analysis tests. */
function createProtocol() {
    return {
        phases: [
            {
                id: "phase-1",
                blocks: [
                    {
                        id: "block-1",
                        durationSeconds: 10,
                        variables: {
                            cadence: {
                                type: "steady",
                                start: 50,
                            },
                            resistance: {
                                type: "steady",
                                start: 2,
                            },
                        },
                    },
                ],
            },
        ],
    };
}

/** Creates a calibration profile fixture for calorie-analysis tests. */
function createCalibrationProfile(overrides = {}) {
    return {
        model: {
            type: "polynomial",
            input: {
                type: "product",
                variables: ["cadence", "resistance"],
            },
            coefficients: [0, 0.01],
            outputUnit: "kcalPerSecond",
            ...overrides,
        },
    };
}

test("protocol-calorie-analysis", "calculates total calories for a complete protocol", () => {
    const protocol = createProtocol();
    const calibrationProfile = createCalibrationProfile();

    const calories = calculateProtocolCalories(protocol, calibrationProfile);

    // cadence * resistance = 100
    // rate = 0.01 * 100 = 1 kcal/s
    // 10 seconds = 10 kcal
    assertEqual(calories, 10);
});

test("protocol-calorie-analysis", "integrates across multiple protocol blocks", () => {
    const protocol = {
        phases: [
            {
                id: "phase-1",
                blocks: [
                    {
                        id: "block-1",
                        durationSeconds: 5,
                        variables: {
                            cadence: {
                                type: "steady",
                                start: 50,
                            },
                            resistance: {
                                type: "steady",
                                start: 2,
                            },
                        },
                    },
                    {
                        id: "block-2",
                        durationSeconds: 5,
                        variables: {
                            cadence: {
                                type: "steady",
                                start: 60,
                            },
                            resistance: {
                                type: "steady",
                                start: 2,
                            },
                        },
                    },
                ],
            },
        ],
    };

    const calibrationProfile = createCalibrationProfile();

    const calories = calculateProtocolCalories(protocol, calibrationProfile);

    // First block: 1 kcal/s * 5 s = 5 kcal
    // Second block: 1.2 kcal/s * 5 s = 6 kcal
    assertEqual(Math.abs(calories - 11) < 1e-9, true);
});

test("protocol-calorie-analysis", "calculates from linear protocol progressions", () => {
    const protocol = {
        phases: [
            {
                id: "phase-1",
                blocks: [
                    {
                        id: "block-1",
                        durationSeconds: 10,
                        variables: {
                            cadence: {
                                type: "linear",
                                start: 40,
                                end: 60,
                            },
                            resistance: {
                                type: "steady",
                                start: 2,
                            },
                        },
                    },
                ],
            },
        ],
    };

    const calibrationProfile = createCalibrationProfile();

    const calories = calculateProtocolCalories(protocol, calibrationProfile);

    // Rate rises linearly from 0.8 to 1.2 kcal/s.
    // Average rate is 1 kcal/s over 10 seconds.
    assertEqual(Math.abs(calories - 10) < 1e-9, true);
});

test("protocol-calorie-analysis", "returns full-precision calorie totals", () => {
    const protocol = createProtocol();
    const calibrationProfile = createCalibrationProfile({
        coefficients: [0, 0.0033333333333333335],
    });

    const calories = calculateProtocolCalories(protocol, calibrationProfile);

    assertEqual(Math.abs(calories - 3.3333333333333335) < 1e-9, true);
});

test("protocol-calorie-analysis", "rejects calibration profiles with non-calorie output", () => {
    const calibrationProfile = createCalibrationProfile({
        outputUnit: "watts",
    });

    assertThrows(
        () => calculateProtocolCalories(createProtocol(), calibrationProfile),
        /requires calibration output unit "kcalPerSecond"/,
    );
});

test("protocol-calorie-analysis", "preserves missing calibration profile errors", () => {
    assertThrows(() => calculateProtocolCalories(createProtocol(), undefined), /model/);
});
