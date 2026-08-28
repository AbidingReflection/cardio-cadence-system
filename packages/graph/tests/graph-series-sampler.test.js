/**
 * GraphSeriesSampler tests:
 * - Verify uniform sampling and exact endpoint semantics.
 * - Verify structural boundaries and discontinuities are preserved.
 * - Verify undefined values remain visible in sampled output.
 * - Verify invalid sampling requests fail clearly.
 */

import { assertDeepEqual, assertThrows, test } from "../../js-testing/framework/test-framework.js";

import { GraphSeriesSampler } from "../graph-series-sampler.js";

/** Creates a simple graph series source from supplied evaluators and boundaries. */
function createSeries({ valueAt, valueBefore = valueAt, boundaries = [] }) {
    return {
        valueAt,
        valueBefore,

        boundariesBetween(startTimeMs, endTimeMs) {
            return boundaries.filter((timeMs) => timeMs > startTimeMs && timeMs < endTimeMs);
        },
    };
}

test("graph-series-sampler", "uniformly samples a steady source", () => {
    const series = createSeries({
        valueAt: () => 60,
    });

    const sampler = new GraphSeriesSampler(series);

    assertDeepEqual(
        sampler.sample({
            startTimeMs: 0,
            endTimeMs: 10000,
            sampleIntervalMs: 2500,
        }),
        [
            { timeMs: 0, value: 60 },
            { timeMs: 2500, value: 60 },
            { timeMs: 5000, value: 60 },
            { timeMs: 7500, value: 60 },
            { timeMs: 10000, value: 60 },
        ],
    );
});

test("graph-series-sampler", "uniformly samples a linear source", () => {
    const series = createSeries({
        valueAt: (timeMs) => timeMs / 1000,
        valueBefore: (timeMs) => timeMs / 1000,
    });

    const sampler = new GraphSeriesSampler(series);

    assertDeepEqual(
        sampler.sample({
            startTimeMs: 0,
            endTimeMs: 10000,
            sampleIntervalMs: 2500,
        }),
        [
            { timeMs: 0, value: 0 },
            { timeMs: 2500, value: 2.5 },
            { timeMs: 5000, value: 5 },
            { timeMs: 7500, value: 7.5 },
            { timeMs: 10000, value: 10 },
        ],
    );
});

test("graph-series-sampler", "preserves discontinuities with duplicate boundary times", () => {
    const series = createSeries({
        boundaries: [4000],
        valueAt: (timeMs) => (timeMs < 4000 ? 40 : 45),
        valueBefore: (timeMs) => (timeMs <= 4000 ? 40 : 45),
    });

    const sampler = new GraphSeriesSampler(series);

    assertDeepEqual(
        sampler.sample({
            startTimeMs: 0,
            endTimeMs: 8000,
            sampleIntervalMs: 2000,
        }),
        [
            { timeMs: 0, value: 40 },
            { timeMs: 2000, value: 40 },
            { timeMs: 4000, value: 40 },
            { timeMs: 4000, value: 45 },
            { timeMs: 6000, value: 45 },
            { timeMs: 8000, value: 45 },
        ],
    );
});

test("graph-series-sampler", "emits one point at a continuous boundary", () => {
    const series = createSeries({
        boundaries: [4000],
        valueAt: (timeMs) => timeMs / 1000,
        valueBefore: (timeMs) => timeMs / 1000,
    });

    const sampler = new GraphSeriesSampler(series);

    assertDeepEqual(
        sampler.sample({
            startTimeMs: 0,
            endTimeMs: 8000,
            sampleIntervalMs: 2000,
        }),
        [
            { timeMs: 0, value: 0 },
            { timeMs: 2000, value: 2 },
            { timeMs: 4000, value: 4 },
            { timeMs: 6000, value: 6 },
            { timeMs: 8000, value: 8 },
        ],
    );
});

test("graph-series-sampler", "does not duplicate coincident uniform and boundary times", () => {
    const series = createSeries({
        boundaries: [4000],
        valueAt: () => 60,
        valueBefore: () => 60,
    });

    const sampler = new GraphSeriesSampler(series);

    assertDeepEqual(
        sampler.sample({
            startTimeMs: 0,
            endTimeMs: 8000,
            sampleIntervalMs: 2000,
        }),
        [
            { timeMs: 0, value: 60 },
            { timeMs: 2000, value: 60 },
            { timeMs: 4000, value: 60 },
            { timeMs: 6000, value: 60 },
            { timeMs: 8000, value: 60 },
        ],
    );
});

test("graph-series-sampler", "always preserves requested start and end times", () => {
    const series = createSeries({
        valueAt: () => 60,
    });

    const sampler = new GraphSeriesSampler(series);

    assertDeepEqual(
        sampler.sample({
            startTimeMs: 1000,
            endTimeMs: 3500,
            sampleIntervalMs: 10000,
        }),
        [
            { timeMs: 1000, value: 60 },
            { timeMs: 3500, value: 60 },
        ],
    );
});

test("graph-series-sampler", "uses valueAt at the start and valueBefore at the end", () => {
    const series = createSeries({
        valueAt: (timeMs) => {
            if (timeMs === 0) {
                return 10;
            }

            if (timeMs === 10000) {
                return undefined;
            }

            return 20;
        },

        valueBefore: (timeMs) => (timeMs === 10000 ? 30 : 20),
    });

    const sampler = new GraphSeriesSampler(series);

    assertDeepEqual(
        sampler.sample({
            startTimeMs: 0,
            endTimeMs: 10000,
            sampleIntervalMs: 20000,
        }),
        [
            { timeMs: 0, value: 10 },
            { timeMs: 10000, value: 30 },
        ],
    );
});

test("graph-series-sampler", "preserves transitions to undefined values", () => {
    const series = createSeries({
        boundaries: [4000, 6000],

        valueAt: (timeMs) => {
            if (timeMs < 4000) {
                return 50;
            }

            if (timeMs < 6000) {
                return undefined;
            }

            return 60;
        },

        valueBefore: (timeMs) => {
            if (timeMs <= 4000) {
                return 50;
            }

            if (timeMs <= 6000) {
                return undefined;
            }

            return 60;
        },
    });

    const sampler = new GraphSeriesSampler(series);

    assertDeepEqual(
        sampler.sample({
            startTimeMs: 0,
            endTimeMs: 10000,
            sampleIntervalMs: 2000,
        }),
        [
            { timeMs: 0, value: 50 },
            { timeMs: 2000, value: 50 },
            { timeMs: 4000, value: 50 },
            { timeMs: 4000, value: undefined },
            { timeMs: 6000, value: undefined },
            { timeMs: 6000, value: 60 },
            { timeMs: 8000, value: 60 },
            { timeMs: 10000, value: 60 },
        ],
    );
});

test("graph-series-sampler", "rejects non-finite sampling values", () => {
    const sampler = new GraphSeriesSampler(
        createSeries({
            valueAt: () => 60,
        }),
    );

    assertThrows(
        () =>
            sampler.sample({
                startTimeMs: NaN,
                endTimeMs: 10000,
                sampleIntervalMs: 1000,
            }),
        /finite numbers/,
    );

    assertThrows(
        () =>
            sampler.sample({
                startTimeMs: 0,
                endTimeMs: Infinity,
                sampleIntervalMs: 1000,
            }),
        /finite numbers/,
    );

    assertThrows(
        () =>
            sampler.sample({
                startTimeMs: 0,
                endTimeMs: 10000,
                sampleIntervalMs: "1000",
            }),
        /finite numbers/,
    );
});

test("graph-series-sampler", "rejects non-positive ranges and intervals", () => {
    const sampler = new GraphSeriesSampler(
        createSeries({
            valueAt: () => 60,
        }),
    );

    assertThrows(
        () =>
            sampler.sample({
                startTimeMs: 10000,
                endTimeMs: 10000,
                sampleIntervalMs: 1000,
            }),
        /greater than start time/,
    );

    assertThrows(
        () =>
            sampler.sample({
                startTimeMs: 10000,
                endTimeMs: 5000,
                sampleIntervalMs: 1000,
            }),
        /greater than start time/,
    );

    assertThrows(
        () =>
            sampler.sample({
                startTimeMs: 0,
                endTimeMs: 10000,
                sampleIntervalMs: 0,
            }),
        /greater than zero/,
    );

    assertThrows(
        () =>
            sampler.sample({
                startTimeMs: 0,
                endTimeMs: 10000,
                sampleIntervalMs: -1000,
            }),
        /greater than zero/,
    );
});

test("graph-series-sampler", "rejects non-finite series boundaries", () => {
    const series = {
        valueAt: () => 60,
        valueBefore: () => 60,

        boundariesBetween() {
            return [4000, NaN];
        },
    };

    const sampler = new GraphSeriesSampler(series);

    assertThrows(
        () =>
            sampler.sample({
                startTimeMs: 0,
                endTimeMs: 10000,
                sampleIntervalMs: 1000,
            }),
        /boundaries must be finite numbers/,
    );
});
