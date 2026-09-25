/**
 * Graph tick tests:
 * - Verify readable linear tick generation across common numeric domains.
 * - Verify aligned ticks stay within the requested closed domain.
 * - Verify decimal and negative domains are handled without floating-point noise.
 * - Verify invalid tick requests are rejected.
 */

import { assertDeepEqual, assertThrows, test } from "../../js-testing/framework/test-framework.js";

import { getLinearTicks, getTimeTicks, getYAxisTickTargetCount } from "../graph-ticks.js";

test("graph-ticks", "generates cadence-style ticks", () => {
    const ticks = getLinearTicks({
        min: 30,
        max: 80,
        targetCount: 6,
    });

    assertDeepEqual(ticks, [30, 40, 50, 60, 70, 80]);
});

test("graph-ticks", "generates resistance-style ticks", () => {
    const ticks = getLinearTicks({
        min: 0,
        max: 20,
        targetCount: 5,
    });

    assertDeepEqual(ticks, [0, 5, 10, 15, 20]);
});

test("graph-ticks", "returns aligned ticks within a non-aligned domain", () => {
    const ticks = getLinearTicks({
        min: 3,
        max: 17,
        targetCount: 4,
    });

    assertDeepEqual(ticks, [5, 10, 15]);
});

test("graph-ticks", "handles negative domains", () => {
    const ticks = getLinearTicks({
        min: -12,
        max: 12,
        targetCount: 5,
    });

    assertDeepEqual(ticks, [-10, -5, 0, 5, 10]);
});

test("graph-ticks", "handles domains crossing zero", () => {
    const ticks = getLinearTicks({
        min: -3,
        max: 7,
        targetCount: 6,
    });

    assertDeepEqual(ticks, [-2, 0, 2, 4, 6]);
});

test("graph-ticks", "handles decimal domains without floating-point noise", () => {
    const ticks = getLinearTicks({
        min: 0,
        max: 1,
        targetCount: 6,
    });

    assertDeepEqual(ticks, [0, 0.2, 0.4, 0.6, 0.8, 1]);
});

test("graph-ticks", "allows target count to differ from returned tick count", () => {
    const ticks = getLinearTicks({
        min: 0,
        max: 9,
        targetCount: 6,
    });

    assertDeepEqual(ticks, [0, 2, 4, 6, 8]);
});

test("graph-ticks", "rejects non-finite minimum", () => {
    assertThrows(
        () =>
            getLinearTicks({
                min: Number.NaN,
                max: 10,
                targetCount: 5,
            }),
        /finite numbers/,
    );
});

test("graph-ticks", "rejects non-finite maximum", () => {
    assertThrows(
        () =>
            getLinearTicks({
                min: 0,
                max: Number.POSITIVE_INFINITY,
                targetCount: 5,
            }),
        /finite numbers/,
    );
});

test("graph-ticks", "rejects equal domain bounds", () => {
    assertThrows(
        () =>
            getLinearTicks({
                min: 5,
                max: 5,
                targetCount: 5,
            }),
        /greater than minimum/,
    );
});

test("graph-ticks", "rejects reversed domain bounds", () => {
    assertThrows(
        () =>
            getLinearTicks({
                min: 10,
                max: 0,
                targetCount: 5,
            }),
        /greater than minimum/,
    );
});

test("graph-ticks", "rejects target counts below two", () => {
    assertThrows(
        () =>
            getLinearTicks({
                min: 0,
                max: 10,
                targetCount: 1,
            }),
        /at least 2/,
    );
});

test("graph-ticks", "rejects fractional target counts", () => {
    assertThrows(
        () =>
            getLinearTicks({
                min: 0,
                max: 10,
                targetCount: 4.5,
            }),
        /integer/,
    );
});

test("graph-ticks", "generates ten-minute ticks for an eighty-minute domain", () => {
    const ticks = getTimeTicks({
        startTimeMs: 0,
        endTimeMs: 80 * 60 * 1000,
        targetCount: 9,
    });

    assertDeepEqual(
        ticks,
        [0, 600_000, 1_200_000, 1_800_000, 2_400_000, 3_000_000, 3_600_000, 4_200_000, 4_800_000],
    );
});

test("graph-ticks", "aligns elapsed-time ticks within a shifted domain", () => {
    const ticks = getTimeTicks({
        startTimeMs: 5 * 60 * 1000,
        endTimeMs: 35 * 60 * 1000,
        targetCount: 4,
    });

    assertDeepEqual(ticks, [10 * 60 * 1000, 20 * 60 * 1000, 30 * 60 * 1000]);
});

test("graph-ticks", "chooses readable sub-minute time intervals", () => {
    const ticks = getTimeTicks({
        startTimeMs: 0,
        endTimeMs: 60_000,
        targetCount: 5,
    });

    assertDeepEqual(ticks, [0, 15_000, 30_000, 45_000, 60_000]);
});

test("graph-ticks", "chooses readable multi-hour time intervals", () => {
    const ticks = getTimeTicks({
        startTimeMs: 0,
        endTimeMs: 6 * 60 * 60 * 1000,
        targetCount: 4,
    });

    assertDeepEqual(ticks, [0, 2 * 60 * 60 * 1000, 4 * 60 * 60 * 1000, 6 * 60 * 60 * 1000]);
});

test("graph-ticks", "allows time target count to differ from returned tick count", () => {
    const ticks = getTimeTicks({
        startTimeMs: 0,
        endTimeMs: 50 * 60 * 1000,
        targetCount: 6,
    });

    assertDeepEqual(ticks, [
        0,
        10 * 60 * 1000,
        20 * 60 * 1000,
        30 * 60 * 1000,
        40 * 60 * 1000,
        50 * 60 * 1000,
    ]);
});

test("graph-ticks", "rejects invalid elapsed-time domains", () => {
    assertThrows(
        () =>
            getTimeTicks({
                startTimeMs: 60_000,
                endTimeMs: 60_000,
                targetCount: 5,
            }),
        /greater than minimum/,
    );
});

test("graph-ticks", "rejects invalid elapsed-time target counts", () => {
    assertThrows(
        () =>
            getTimeTicks({
                startTimeMs: 0,
                endTimeMs: 60_000,
                targetCount: 1,
            }),
        /at least 2/,
    );
});

test("graph-ticks", "reduces y-axis tick density for shorter plots", () => {
    assertDeepEqual(
        [getYAxisTickTargetCount(200), getYAxisTickTargetCount(120), getYAxisTickTargetCount(60)],
        [8, 5, 3],
    );
});

test("graph-ticks", "clamps y-axis tick target count to readable bounds", () => {
    assertDeepEqual(
        [getYAxisTickTargetCount(0), getYAxisTickTargetCount(20), getYAxisTickTargetCount(1000)],
        [2, 2, 8],
    );
});

test("graph-ticks", "rejects invalid y-axis plot heights", () => {
    assertThrows(() => {
        getYAxisTickTargetCount(-1);
    });

    assertThrows(() => {
        getYAxisTickTargetCount(Number.NaN);
    });

    assertThrows(() => {
        getYAxisTickTargetCount(Number.POSITIVE_INFINITY);
    });
});
