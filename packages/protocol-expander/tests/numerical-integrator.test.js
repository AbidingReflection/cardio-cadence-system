import { assertEqual, assertThrows, test } from "../../js-testing/framework/test-framework.js";

import { integrateSeries } from "../numerical-integrator.js";

/** Creates a minimal numeric series fixture. */
function createSeries({ valueAt, valueBefore = valueAt, boundaries = [] }) {
    return {
        valueAt,
        valueBefore,
        boundariesBetween(startTimeMs, endTimeMs) {
            return boundaries.filter((boundary) => boundary >= startTimeMs && boundary < endTimeMs);
        },
    };
}

test("numerical-integrator", "integrates a constant series", () => {
    const series = createSeries({
        valueAt: () => 2,
    });

    const result = integrateSeries(series, 0, 10000);

    assertEqual(result, 20000);
});

test("numerical-integrator", "integrates an arbitrary subrange", () => {
    const series = createSeries({
        valueAt: () => 3,
    });

    const result = integrateSeries(series, 2000, 7000);

    assertEqual(result, 15000);
});

test("numerical-integrator", "returns zero for an empty range", () => {
    const series = createSeries({
        valueAt: () => 2,
    });

    assertEqual(integrateSeries(series, 5000, 5000), 0);
});

test("numerical-integrator", "integrates a linear function", () => {
    const series = createSeries({
        valueAt: (timeMs) => timeMs,
    });

    const result = integrateSeries(series, 0, 4000);

    assertEqual(Math.abs(result - 8000000) < 1e-6, true);
});

test("numerical-integrator", "integrates a cubic function", () => {
    const series = createSeries({
        valueAt: (timeMs) => timeMs ** 3,
    });

    const result = integrateSeries(series, 0, 4000);

    assertEqual(Math.abs(result - 64e12) < 1, true);
});

test("numerical-integrator", "splits integration at series boundaries", () => {
    const series = createSeries({
        boundaries: [5000],
        valueAt: (timeMs) => (timeMs < 5000 ? 1 : 3),
        valueBefore: (timeMs) => (timeMs <= 5000 ? 1 : 3),
    });

    const result = integrateSeries(series, 0, 10000);

    assertEqual(result, 20000);
});

test("numerical-integrator", "uses the left-side value at segment endpoints", () => {
    const series = createSeries({
        boundaries: [5000],
        valueAt: (timeMs) => (timeMs < 5000 ? 2 : 6),
        valueBefore: (timeMs) => (timeMs <= 5000 ? 2 : 6),
    });

    const result = integrateSeries(series, 0, 10000);

    assertEqual(result, 40000);
});

test("numerical-integrator", "ignores boundaries at the start of the requested range", () => {
    const series = createSeries({
        boundaries: [5000],
        valueAt: () => 2,
    });

    const result = integrateSeries(series, 5000, 10000);

    assertEqual(result, 10000);
});

test("numerical-integrator", "throws when a sampled value is undefined", () => {
    const series = createSeries({
        valueAt: (timeMs) => (timeMs === 2000 ? undefined : 2),
    });

    assertThrows(() => integrateSeries(series, 0, 4000), /undefined values/);
});

test("numerical-integrator", "throws when the left-side endpoint value is undefined", () => {
    const series = createSeries({
        valueAt: () => 2,
        valueBefore: () => undefined,
    });

    assertThrows(() => integrateSeries(series, 0, 4000), /undefined values/);
});

test("numerical-integrator", "preserves series range validation errors", () => {
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

    assertThrows(() => integrateSeries(series, 0, Infinity), /finite numbers/);

    assertThrows(() => integrateSeries(series, 5000, 4000), /must not precede/);
});
