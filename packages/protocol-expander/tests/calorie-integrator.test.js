import { assertEqual, assertThrows, test } from "../../js-testing/framework/test-framework.js";

import { integrateCalorieRate } from "../calorie-integrator.js";

/** Creates a minimal calorie-rate series fixture. */
function createSeries({ valueAt, valueBefore = valueAt, boundaries = [] }) {
    return {
        valueAt,
        valueBefore,
        boundariesBetween(startTimeMs, endTimeMs) {
            return boundaries.filter((boundary) => boundary >= startTimeMs && boundary < endTimeMs);
        },
    };
}

test("calorie-integrator", "integrates a constant calorie rate", () => {
    const series = createSeries({
        valueAt: () => 2,
    });

    const calories = integrateCalorieRate(series, 0, 10000);

    assertEqual(calories, 20);
});

test("calorie-integrator", "integrates an arbitrary subrange", () => {
    const series = createSeries({
        valueAt: () => 3,
    });

    const calories = integrateCalorieRate(series, 2000, 7000);

    assertEqual(calories, 15);
});

test("calorie-integrator", "returns zero for an empty range", () => {
    const series = createSeries({
        valueAt: () => 2,
    });

    assertEqual(integrateCalorieRate(series, 5000, 5000), 0);
});

test("calorie-integrator", "integrates a linear calorie-rate function", () => {
    const series = createSeries({
        valueAt: (timeMs) => timeMs / 1000,
    });

    const calories = integrateCalorieRate(series, 0, 4000);

    // Integral from 0 to 4 seconds of rate = t is 8 kcal.
    assertEqual(Math.abs(calories - 8) < 1e-9, true);
});

test("calorie-integrator", "integrates a cubic calorie-rate function", () => {
    const series = createSeries({
        valueAt: (timeMs) => {
            const timeSeconds = timeMs / 1000;
            return timeSeconds ** 3;
        },
    });

    const calories = integrateCalorieRate(series, 0, 4000);

    // Integral from 0 to 4 seconds of t^3 is 64 kcal.
    assertEqual(Math.abs(calories - 64) < 1e-9, true);
});

test("calorie-integrator", "splits integration at series boundaries", () => {
    const series = createSeries({
        boundaries: [5000],
        valueAt: (timeMs) => (timeMs < 5000 ? 1 : 3),
        valueBefore: (timeMs) => (timeMs <= 5000 ? 1 : 3),
    });

    const calories = integrateCalorieRate(series, 0, 10000);

    assertEqual(calories, 20);
});

test("calorie-integrator", "uses the left-side value at segment endpoints", () => {
    const series = createSeries({
        boundaries: [5000],
        valueAt: (timeMs) => (timeMs < 5000 ? 2 : 6),
        valueBefore: (timeMs) => (timeMs <= 5000 ? 2 : 6),
    });

    const calories = integrateCalorieRate(series, 0, 10000);

    // 5 seconds at 2 kcal/s plus 5 seconds at 6 kcal/s.
    assertEqual(calories, 40);
});

test("calorie-integrator", "ignores boundaries at the start of the requested range", () => {
    const series = createSeries({
        boundaries: [5000],
        valueAt: () => 2,
    });

    const calories = integrateCalorieRate(series, 5000, 10000);

    assertEqual(calories, 10);
});

test("calorie-integrator", "throws when a sampled calorie rate is undefined", () => {
    const series = createSeries({
        valueAt: (timeMs) => (timeMs === 2000 ? undefined : 2),
    });

    assertThrows(() => integrateCalorieRate(series, 0, 4000), /undefined values/);
});

test("calorie-integrator", "throws when the left-side endpoint rate is undefined", () => {
    const series = createSeries({
        valueAt: () => 2,
        valueBefore: () => undefined,
    });

    assertThrows(() => integrateCalorieRate(series, 0, 4000), /undefined values/);
});

test("calorie-integrator", "preserves series range validation errors", () => {
    const series = {
        valueAt: () => 2,
        valueBefore: () => 2,
        boundariesBetween(startTimeMs, endTimeMs) {
            if (!Number.isFinite(startTimeMs) || !Number.isFinite(endTimeMs)) {
                throw new TypeError("Times must be finite numbers.");
            }

            if (endTimeMs < startTimeMs) {
                throw new RangeError("End time must not precede start time.");
            }

            return [];
        },
    };

    assertThrows(() => integrateCalorieRate(series, 0, Infinity), /finite numbers/);

    assertThrows(() => integrateCalorieRate(series, 5000, 4000), /must not precede/);
});
