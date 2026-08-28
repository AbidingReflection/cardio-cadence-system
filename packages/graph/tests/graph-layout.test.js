/**
 * GraphLayout tests:
 * - Verify plot geometry is derived from dimensions and padding.
 * - Verify time and value domains map into pixel coordinates.
 * - Verify samples and ranges project without clamping.
 * - Verify invalid layout inputs fail clearly.
 */

import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "../../js-testing/framework/test-framework.js";

import { GraphLayout } from "../graph-layout.js";

/** Creates the default graph layout used by the tests. */
function createLayout() {
    return new GraphLayout({
        startTimeMs: 0,
        endTimeMs: 10000,
        valueMin: 0,
        valueMax: 100,
        widthPx: 800,
        heightPx: 240,
        padding: {
            top: 40,
            right: 60,
            bottom: 50,
            left: 60,
        },
    });
}

test("graph-layout", "derives plot geometry from dimensions and padding", () => {
    const layout = createLayout();

    assertDeepEqual(layout.plot, {
        left: 60,
        right: 740,
        top: 40,
        bottom: 190,
        width: 680,
        height: 150,
    });
});

test("graph-layout", "protects returned plot geometry from mutation", () => {
    const layout = createLayout();

    const plot = layout.plot;
    plot.left = 999;

    assertEqual(layout.plot.left, 60);
});

test("graph-layout", "maps time domain to horizontal coordinates", () => {
    const layout = createLayout();

    assertEqual(layout.xAtTime(0), 60);
    assertEqual(layout.xAtTime(5000), 400);
    assertEqual(layout.xAtTime(10000), 740);
});

test("graph-layout", "maps value domain to vertical coordinates", () => {
    const layout = createLayout();

    assertEqual(layout.yAtValue(0), 190);
    assertEqual(layout.yAtValue(50), 115);
    assertEqual(layout.yAtValue(100), 40);
});

test("graph-layout", "does not clamp time coordinates", () => {
    const layout = createLayout();

    assertEqual(layout.xAtTime(-1000), -8);

    const x = layout.xAtTime(11000);
    assertEqual(Math.abs(x - 808) < 1e-9, true);
});

test("graph-layout", "does not clamp value coordinates", () => {
    const layout = createLayout();

    assertEqual(layout.yAtValue(-20), 220);
    assertEqual(layout.yAtValue(120), 10);
});

test("graph-layout", "projects sampled points into pixel coordinates", () => {
    const layout = createLayout();

    assertDeepEqual(
        layout.layoutSamples([
            { timeMs: 0, value: 0 },
            { timeMs: 5000, value: 50 },
            { timeMs: 10000, value: 100 },
        ]),
        [
            {
                timeMs: 0,
                value: 0,
                x: 60,
                y: 190,
            },
            {
                timeMs: 5000,
                value: 50,
                x: 400,
                y: 115,
            },
            {
                timeMs: 10000,
                value: 100,
                x: 740,
                y: 40,
            },
        ],
    );
});

test("graph-layout", "preserves undefined sampled values", () => {
    const layout = createLayout();

    assertDeepEqual(layout.layoutSamples([{ timeMs: 5000, value: undefined }]), [
        {
            timeMs: 5000,
            value: undefined,
            x: 400,
            y: undefined,
        },
    ]);
});

test("graph-layout", "preserves duplicate discontinuity times", () => {
    const layout = createLayout();

    assertDeepEqual(
        layout.layoutSamples([
            { timeMs: 5000, value: 40 },
            { timeMs: 5000, value: 60 },
        ]),
        [
            {
                timeMs: 5000,
                value: 40,
                x: 400,
                y: 130,
            },
            {
                timeMs: 5000,
                value: 60,
                x: 400,
                y: 100,
            },
        ],
    );
});

test("graph-layout", "projects time ranges and preserves metadata", () => {
    const layout = createLayout();

    assertDeepEqual(
        layout.layoutRanges([
            {
                id: "block-1",
                phaseId: "phase-1",
                startTimeMs: 2500,
                endTimeMs: 7500,
            },
        ]),
        [
            {
                id: "block-1",
                phaseId: "phase-1",
                startTimeMs: 2500,
                endTimeMs: 7500,
                xStart: 230,
                xEnd: 570,
            },
        ],
    );
});

test("graph-layout", "defaults omitted padding values to zero", () => {
    const layout = new GraphLayout({
        startTimeMs: 0,
        endTimeMs: 10000,
        valueMin: 0,
        valueMax: 100,
        widthPx: 800,
        heightPx: 240,
        padding: {
            left: 50,
        },
    });

    assertDeepEqual(layout.plot, {
        left: 50,
        right: 800,
        top: 0,
        bottom: 240,
        width: 750,
        height: 240,
    });
});

test("graph-layout", "rejects non-finite construction values", () => {
    assertThrows(
        () =>
            new GraphLayout({
                startTimeMs: NaN,
                endTimeMs: 10000,
                valueMin: 0,
                valueMax: 100,
                widthPx: 800,
                heightPx: 240,
            }),
        /finite numbers/,
    );

    assertThrows(
        () =>
            new GraphLayout({
                startTimeMs: 0,
                endTimeMs: 10000,
                valueMin: 0,
                valueMax: Infinity,
                widthPx: 800,
                heightPx: 240,
            }),
        /finite numbers/,
    );

    assertThrows(
        () =>
            new GraphLayout({
                startTimeMs: 0,
                endTimeMs: 10000,
                valueMin: 0,
                valueMax: 100,
                widthPx: "800",
                heightPx: 240,
            }),
        /finite numbers/,
    );
});

test("graph-layout", "rejects invalid time and value domains", () => {
    assertThrows(
        () =>
            new GraphLayout({
                startTimeMs: 10000,
                endTimeMs: 10000,
                valueMin: 0,
                valueMax: 100,
                widthPx: 800,
                heightPx: 240,
            }),
        /end time must be greater than start time/,
    );

    assertThrows(
        () =>
            new GraphLayout({
                startTimeMs: 0,
                endTimeMs: 10000,
                valueMin: 100,
                valueMax: 100,
                widthPx: 800,
                heightPx: 240,
            }),
        /maximum must be greater than minimum/,
    );
});

test("graph-layout", "rejects non-positive dimensions", () => {
    assertThrows(
        () =>
            new GraphLayout({
                startTimeMs: 0,
                endTimeMs: 10000,
                valueMin: 0,
                valueMax: 100,
                widthPx: 0,
                heightPx: 240,
            }),
        /dimensions must be greater than zero/,
    );

    assertThrows(
        () =>
            new GraphLayout({
                startTimeMs: 0,
                endTimeMs: 10000,
                valueMin: 0,
                valueMax: 100,
                widthPx: 800,
                heightPx: -1,
            }),
        /dimensions must be greater than zero/,
    );
});

test("graph-layout", "rejects negative padding", () => {
    assertThrows(
        () =>
            new GraphLayout({
                startTimeMs: 0,
                endTimeMs: 10000,
                valueMin: 0,
                valueMax: 100,
                widthPx: 800,
                heightPx: 240,
                padding: {
                    left: -1,
                },
            }),
        /padding must not be negative/,
    );
});

test("graph-layout", "rejects padding that removes plot area", () => {
    assertThrows(
        () =>
            new GraphLayout({
                startTimeMs: 0,
                endTimeMs: 10000,
                valueMin: 0,
                valueMax: 100,
                widthPx: 800,
                heightPx: 240,
                padding: {
                    left: 400,
                    right: 400,
                },
            }),
        /positive plot width/,
    );

    assertThrows(
        () =>
            new GraphLayout({
                startTimeMs: 0,
                endTimeMs: 10000,
                valueMin: 0,
                valueMax: 100,
                widthPx: 800,
                heightPx: 240,
                padding: {
                    top: 120,
                    bottom: 120,
                },
            }),
        /positive plot height/,
    );
});

test("graph-layout", "rejects invalid coordinate inputs", () => {
    const layout = createLayout();

    assertThrows(() => layout.xAtTime(NaN), /finite number/);
    assertThrows(() => layout.yAtValue(Infinity), /finite number/);
});

test("graph-layout", "rejects non-array sample and range inputs", () => {
    const layout = createLayout();

    assertThrows(() => layout.layoutSamples(null), /samples must be an array/);
    assertThrows(() => layout.layoutRanges({}), /ranges must be an array/);
});
