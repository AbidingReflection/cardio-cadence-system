import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "../../js-testing/framework/test-framework.js";

import { CumulativeCalorieSeries } from "../cumulative-calorie-series.js";
import { calculateProtocolCalories } from "../protocol-calorie-analysis.js";
import { ProtocolExpander } from "../protocol-expander.js";

/** Creates a small protocol with stepped cadence and steady resistance. */
function createProtocol() {
    return {
        phases: [
            {
                id: "phase-1",
                blocks: [
                    {
                        id: "block-1",
                        durationSeconds: 12,
                        variables: {
                            cadence: {
                                type: "stepped",
                                start: 40,
                                end: 50,
                                step: 5,
                            },
                            resistance: {
                                type: "steady",
                                start: 0.01,
                            },
                        },
                    },
                ],
            },
        ],
    };
}

/** Creates a simple product calibration whose output equals cadence × resistance. */
function createCalibrationProfile() {
    return {
        model: {
            type: "polynomial",
            input: {
                type: "product",
                variables: ["cadence", "resistance"],
            },
            coefficients: [0, 1],
            outputUnit: "kcalPerSecond",
        },
    };
}

/** Creates the default cumulative-calorie series used by the tests. */
function createSeries() {
    return new CumulativeCalorieSeries(
        new ProtocolExpander(createProtocol()),
        createCalibrationProfile(),
    );
}

test("cumulative-calorie-series", "exposes fixed series metadata", () => {
    const series = createSeries();

    assertEqual(series.id, "cumulative-calories");
    assertEqual(series.label, "Cumulative Calories");
    assertEqual(series.unit, "kcal");
});

test("cumulative-calorie-series", "starts at zero calories", () => {
    const series = createSeries();

    assertEqual(series.valueAt(0), 0);
});

test("cumulative-calorie-series", "accumulates calibrated calories over time", () => {
    const series = createSeries();

    // First four seconds run at 40 × 0.01 = 0.4 kcal/s.
    assertEqual(Math.abs(series.valueAt(4000) - 1.6) < 1e-9, true);

    // Next four seconds run at 45 × 0.01 = 0.45 kcal/s.
    assertEqual(Math.abs(series.valueAt(8000) - 3.4) < 1e-9, true);
});

test("cumulative-calorie-series", "remains continuous at calorie-rate boundaries", () => {
    const series = createSeries();

    assertEqual(Math.abs(series.valueBefore(4000) - series.valueAt(4000)) < 1e-9, true);

    assertEqual(Math.abs(series.valueBefore(8000) - series.valueAt(8000)) < 1e-9, true);
});

test("cumulative-calorie-series", "preserves calorie-rate boundaries", () => {
    const series = createSeries();

    assertDeepEqual(series.boundariesBetween(0, 12000), [4000, 8000]);
});

test("cumulative-calorie-series", "returns undefined outside the workout range", () => {
    const series = createSeries();

    assertEqual(series.valueAt(-1), undefined);
    assertEqual(series.valueAt(12000), undefined);

    assertEqual(series.valueBefore(0), undefined);
    assertEqual(series.valueBefore(12001), undefined);
});

test(
    "cumulative-calorie-series",
    "matches complete protocol calorie analysis at workout end",
    () => {
        const protocol = createProtocol();
        const calibrationProfile = createCalibrationProfile();
        const expander = new ProtocolExpander(protocol);

        const series = new CumulativeCalorieSeries(expander, calibrationProfile);

        const expectedCalories = calculateProtocolCalories(protocol, calibrationProfile);

        assertEqual(
            Math.abs(series.valueBefore(expander.durationMs) - expectedCalories) < 1e-9,
            true,
        );
    },
);

test("cumulative-calorie-series", "rejects invalid times", () => {
    const series = createSeries();

    assertThrows(() => series.valueAt("1000"), /finite number/);
    assertThrows(() => series.valueBefore(NaN), /finite number/);
    assertThrows(() => series.boundariesBetween(0, Infinity), /finite numbers/);
});
