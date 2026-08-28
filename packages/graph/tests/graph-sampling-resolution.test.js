import { assertEqual, assertThrows, test } from "../../js-testing/framework/test-framework.js";

import { getGraphSampleIntervalMs } from "../graph-sampling-resolution.js";

test("graph-sampling-resolution", "returns a quantized interval for a representative graph", () => {
    assertEqual(
        getGraphSampleIntervalMs({
            startTimeMs: 0,
            endTimeMs: 4_800_000,
            widthPx: 900,
        }),
        20_000,
    );
});

test("graph-sampling-resolution", "uses the default three pixels per sample", () => {
    assertEqual(
        getGraphSampleIntervalMs({
            startTimeMs: 0,
            endTimeMs: 300_000,
            widthPx: 300,
        }),
        2_000,
    );
});

test("graph-sampling-resolution", "supports a custom pixels-per-sample target", () => {
    assertEqual(
        getGraphSampleIntervalMs({
            startTimeMs: 0,
            endTimeMs: 300_000,
            widthPx: 300,
            pixelsPerSample: 6,
        }),
        5_000,
    );
});

test("graph-sampling-resolution", "keeps nearby widths in the same quantized interval", () => {
    const narrowerInterval = getGraphSampleIntervalMs({
        startTimeMs: 0,
        endTimeMs: 4_800_000,
        widthPx: 880,
    });

    const widerInterval = getGraphSampleIntervalMs({
        startTimeMs: 0,
        endTimeMs: 4_800_000,
        widthPx: 920,
    });

    assertEqual(narrowerInterval, 20_000);
    assertEqual(widerInterval, 20_000);
});

test("graph-sampling-resolution", "crosses quantization buckets as width changes enough", () => {
    const lowerDensityInterval = getGraphSampleIntervalMs({
        startTimeMs: 0,
        endTimeMs: 4_800_000,
        widthPx: 500,
    });

    const higherDensityInterval = getGraphSampleIntervalMs({
        startTimeMs: 0,
        endTimeMs: 4_800_000,
        widthPx: 1_500,
    });

    assertEqual(lowerDensityInterval, 20_000);
    assertEqual(higherDensityInterval, 10_000);
});

test(
    "graph-sampling-resolution",
    "allows sampling intervals larger than the requested range",
    () => {
        assertEqual(
            getGraphSampleIntervalMs({
                startTimeMs: 0,
                endTimeMs: 1_000,
                widthPx: 1,
            }),
            500,
        );
    },
);

test("graph-sampling-resolution", "rejects non-finite resolution values", () => {
    assertThrows(
        () =>
            getGraphSampleIntervalMs({
                startTimeMs: NaN,
                endTimeMs: 10_000,
                widthPx: 500,
            }),
        /finite numbers/,
    );

    assertThrows(
        () =>
            getGraphSampleIntervalMs({
                startTimeMs: 0,
                endTimeMs: Infinity,
                widthPx: 500,
            }),
        /finite numbers/,
    );

    assertThrows(
        () =>
            getGraphSampleIntervalMs({
                startTimeMs: 0,
                endTimeMs: 10_000,
                widthPx: "500",
            }),
        /finite numbers/,
    );

    assertThrows(
        () =>
            getGraphSampleIntervalMs({
                startTimeMs: 0,
                endTimeMs: 10_000,
                widthPx: 500,
                pixelsPerSample: NaN,
            }),
        /finite numbers/,
    );
});

test("graph-sampling-resolution", "rejects non-positive time ranges", () => {
    assertThrows(
        () =>
            getGraphSampleIntervalMs({
                startTimeMs: 10_000,
                endTimeMs: 10_000,
                widthPx: 500,
            }),
        /greater than start time/,
    );

    assertThrows(
        () =>
            getGraphSampleIntervalMs({
                startTimeMs: 10_000,
                endTimeMs: 5_000,
                widthPx: 500,
            }),
        /greater than start time/,
    );
});

test("graph-sampling-resolution", "rejects non-positive widths", () => {
    assertThrows(
        () =>
            getGraphSampleIntervalMs({
                startTimeMs: 0,
                endTimeMs: 10_000,
                widthPx: 0,
            }),
        /width must be greater than zero/,
    );

    assertThrows(
        () =>
            getGraphSampleIntervalMs({
                startTimeMs: 0,
                endTimeMs: 10_000,
                widthPx: -1,
            }),
        /width must be greater than zero/,
    );
});

test("graph-sampling-resolution", "rejects non-positive pixels-per-sample targets", () => {
    assertThrows(
        () =>
            getGraphSampleIntervalMs({
                startTimeMs: 0,
                endTimeMs: 10_000,
                widthPx: 500,
                pixelsPerSample: 0,
            }),
        /pixels per sample must be greater than zero/,
    );

    assertThrows(
        () =>
            getGraphSampleIntervalMs({
                startTimeMs: 0,
                endTimeMs: 10_000,
                widthPx: 500,
                pixelsPerSample: -1,
            }),
        /pixels per sample must be greater than zero/,
    );
});
