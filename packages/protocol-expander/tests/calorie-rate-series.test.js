import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "../../js-testing/framework/test-framework.js";

import { CalorieRateSeries } from "../calorie-rate-series.js";
import { ProtocolExpander } from "../protocol-expander.js";

/** Creates a small protocol with cadence and resistance progressions. */
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
                                start: 2,
                            },
                        },
                    },
                ],
            },
        ],
    };
}

/** Creates a calibration profile fixture for calorie-rate series tests. */
function createCalibrationProfile(overrides = {}) {
    return {
        model: {
            type: "polynomial",
            input: {
                type: "product",
                variables: ["cadence", "resistance"],
            },
            coefficients: [0, 1],
            outputUnit: "kcalPerSecond",
            ...overrides,
        },
    };
}

/** Creates the default calorie-rate series used by the tests. */
function createSeries() {
    return new CalorieRateSeries(
        new ProtocolExpander(createProtocol()),
        createCalibrationProfile(),
    );
}

test("calorie-rate-series", "exposes fixed series metadata", () => {
    const series = createSeries();

    assertEqual(series.id, "calorie-rate");
    assertEqual(series.label, "Calorie Rate");
    assertEqual(series.unit, "kcalPerSecond");
});

test("calorie-rate-series", "returns calibrated values at workout times", () => {
    const series = createSeries();

    // coefficients [0, 1] make output equal cadence * resistance.
    assertEqual(series.valueAt(0), 80);
    assertEqual(series.valueAt(3999), 80);
    assertEqual(series.valueAt(4000), 90);
    assertEqual(series.valueAt(8000), 100);
});

test("calorie-rate-series", "returns exact left-side calibrated values", () => {
    const series = createSeries();

    assertEqual(series.valueBefore(4000), 80);
    assertEqual(series.valueBefore(8000), 90);
    assertEqual(series.valueBefore(12000), 100);
});

test("calorie-rate-series", "returns undefined outside the workout range", () => {
    const series = createSeries();

    assertEqual(series.valueAt(-1), undefined);
    assertEqual(series.valueAt(12000), undefined);

    assertEqual(series.valueBefore(0), undefined);
    assertEqual(series.valueBefore(12001), undefined);
});

test("calorie-rate-series", "returns undefined when a required input is unavailable", () => {
    const protocol = createProtocol();

    delete protocol.phases[0].blocks[0].variables.resistance;

    const series = new CalorieRateSeries(
        new ProtocolExpander(protocol),
        createCalibrationProfile(),
    );

    assertEqual(series.valueAt(4000), undefined);
    assertEqual(series.valueBefore(4000), undefined);
});

test("calorie-rate-series", "unions and sorts boundaries from all calibration inputs", () => {
    const protocol = {
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
                                type: "stepped",
                                start: 2,
                                end: 8,
                                step: 2,
                            },
                        },
                    },
                ],
            },
        ],
    };

    const series = new CalorieRateSeries(
        new ProtocolExpander(protocol),
        createCalibrationProfile(),
    );

    assertDeepEqual(series.boundariesBetween(0, 12000), [3000, 4000, 6000, 8000, 9000]);
});

test("calorie-rate-series", "deduplicates shared calibration-input boundaries", () => {
    const protocol = {
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
                                type: "stepped",
                                start: 2,
                                end: 4,
                                step: 1,
                            },
                        },
                    },
                ],
            },
        ],
    };

    const series = new CalorieRateSeries(
        new ProtocolExpander(protocol),
        createCalibrationProfile(),
    );

    assertDeepEqual(series.boundariesBetween(0, 12000), [4000, 8000]);
});

test("calorie-rate-series", "rejects non-calorie calibration output units", () => {
    const calibrationProfile = createCalibrationProfile({
        outputUnit: "watts",
    });

    assertThrows(
        () => new CalorieRateSeries(new ProtocolExpander(createProtocol()), calibrationProfile),
        'CalorieRateSeries requires calibration output unit "kcalPerSecond".',
    );
});

test("calorie-rate-series", "preserves invalid time errors", () => {
    const series = createSeries();

    assertThrows(() => series.valueAt("1000"), /finite numbers/);
    assertThrows(() => series.valueBefore(NaN), /finite numbers/);
    assertThrows(() => series.boundariesBetween(0, Infinity), /finite numbers/);
});
