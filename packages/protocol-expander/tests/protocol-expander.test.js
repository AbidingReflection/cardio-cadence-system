import {
    test,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import { ProtocolExpander } from "../protocol-expander.js";

/** Creates a small protocol fixture for structural timeline tests. */
function createProtocol() {
    return {
        phases: [
            {
                id: "phase-a",
                blocks: [
                    {
                        id: "block-a",
                        durationSeconds: 300,
                    },
                    {
                        id: "block-b",
                        durationSeconds: 600,
                    },
                ],
            },
            {
                id: "phase-b",
                blocks: [
                    {
                        id: "block-c",
                        durationSeconds: 900,
                    },
                ],
            },
        ],
    };
}

/** Creates a protocol fixture for valueAt() tests. */
function createValueProtocol() {
    return {
        phases: [
            {
                id: "phase-a",
                blocks: [
                    {
                        id: "steady-block",
                        durationSeconds: 100,
                        variables: {
                            cadence: {
                                type: "steady",
                                start: 60,
                            },
                        },
                    },
                    {
                        id: "linear-block",
                        durationSeconds: 100,
                        variables: {
                            cadence: {
                                type: "linear",
                                start: 60,
                                end: 80,
                            },
                        },
                    },
                    {
                        id: "stepped-block",
                        durationSeconds: 100,
                        variables: {
                            cadence: {
                                type: "stepped",
                                start: 40,
                                end: 55,
                                step: 5,
                            },
                        },
                    },
                ],
            },
        ],
    };
}

/** Creates a protocol fixture for boundary query tests. */
function createBoundaryProtocol() {
    return {
        phases: [
            {
                id: "phase-a",
                blocks: [
                    {
                        id: "block-a",
                        durationSeconds: 100,
                        variables: {
                            cadence: {
                                type: "steady",
                                start: 60,
                            },
                        },
                    },
                    {
                        id: "block-b",
                        durationSeconds: 100,
                        variables: {
                            cadence: {
                                type: "stepped",
                                start: 40,
                                end: 55,
                                step: 5,
                            },
                        },
                    },
                    {
                        id: "block-c",
                        durationSeconds: 100,
                        variables: {
                            cadence: {
                                type: "linear",
                                start: 55,
                                end: 75,
                            },
                        },
                    },
                ],
            },
        ],
    };
}

/** Creates a protocol fixture for left-side value and ordered-range tests. */
function createValueBeforeProtocol() {
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
                        },
                    },
                ],
            },
            {
                id: "phase-empty",
                blocks: [],
            },
            {
                id: "phase-2",
                blocks: [
                    {
                        id: "block-2",
                        durationSeconds: 8,
                        variables: {
                            cadence: {
                                type: "linear",
                                start: 60,
                                end: 70,
                            },
                        },
                    },
                ],
            },
        ],
    };
}

test("protocol-expander", "computes total protocol duration", () => {
    const expander = new ProtocolExpander(createProtocol());

    assertDeepEqual(expander.durationMs, 1_800_000);
});

test("protocol-expander", "computes absolute phase ranges", () => {
    const expander = new ProtocolExpander(createProtocol());

    assertDeepEqual(expander.getPhaseRange("phase-a"), {
        id: "phase-a",
        startTimeMs: 0,
        endTimeMs: 900_000,
    });

    assertDeepEqual(expander.getPhaseRange("phase-b"), {
        id: "phase-b",
        startTimeMs: 900_000,
        endTimeMs: 1_800_000,
    });
});

test("protocol-expander", "computes absolute block ranges", () => {
    const expander = new ProtocolExpander(createProtocol());

    assertDeepEqual(expander.getBlockRange("block-a"), {
        id: "block-a",
        phaseId: "phase-a",
        startTimeMs: 0,
        endTimeMs: 300_000,
    });

    assertDeepEqual(expander.getBlockRange("block-b"), {
        id: "block-b",
        phaseId: "phase-a",
        startTimeMs: 300_000,
        endTimeMs: 900_000,
    });

    assertDeepEqual(expander.getBlockRange("block-c"), {
        id: "block-c",
        phaseId: "phase-b",
        startTimeMs: 900_000,
        endTimeMs: 1_800_000,
    });
});

test("protocol-expander", "handles an empty protocol", () => {
    const expander = new ProtocolExpander({
        phases: [],
    });

    assertDeepEqual(expander.durationMs, 0);
    assertDeepEqual(expander.getPhaseRange("missing-phase"), undefined);
    assertDeepEqual(expander.getBlockRange("missing-block"), undefined);
});

test("protocol-expander", "handles an empty phase", () => {
    const expander = new ProtocolExpander({
        phases: [
            {
                id: "empty-phase",
                blocks: [],
            },
            {
                id: "phase-a",
                blocks: [
                    {
                        id: "block-a",
                        durationSeconds: 300,
                    },
                ],
            },
        ],
    });

    assertDeepEqual(expander.getPhaseRange("empty-phase"), {
        id: "empty-phase",
        startTimeMs: 0,
        endTimeMs: 0,
    });

    assertDeepEqual(expander.getPhaseRange("phase-a"), {
        id: "phase-a",
        startTimeMs: 0,
        endTimeMs: 300_000,
    });

    assertDeepEqual(expander.getBlockRange("block-a"), {
        id: "block-a",
        phaseId: "phase-a",
        startTimeMs: 0,
        endTimeMs: 300_000,
    });

    assertDeepEqual(expander.durationMs, 300_000);
});

test("protocol-expander", "returns undefined for an unknown phase ID", () => {
    const expander = new ProtocolExpander(createProtocol());

    assertDeepEqual(expander.getPhaseRange("missing-phase"), undefined);
});

test("protocol-expander", "returns undefined for an unknown block ID", () => {
    const expander = new ProtocolExpander(createProtocol());

    assertDeepEqual(expander.getBlockRange("missing-block"), undefined);
});

test("protocol-expander", "protects returned phase ranges from mutation", () => {
    const expander = new ProtocolExpander(createProtocol());

    const range = expander.getPhaseRange("phase-a");
    range.startTimeMs = 123_456;

    assertDeepEqual(expander.getPhaseRange("phase-a"), {
        id: "phase-a",
        startTimeMs: 0,
        endTimeMs: 900_000,
    });
});

test("protocol-expander", "protects returned block ranges from mutation", () => {
    const expander = new ProtocolExpander(createProtocol());

    const range = expander.getBlockRange("block-a");
    range.endTimeMs = 123_456;

    assertDeepEqual(expander.getBlockRange("block-a"), {
        id: "block-a",
        phaseId: "phase-a",
        startTimeMs: 0,
        endTimeMs: 300_000,
    });
});

test("protocol-expander", "does not change when the source protocol is mutated", () => {
    const protocol = createProtocol();
    const expander = new ProtocolExpander(protocol);

    protocol.phases[0].blocks[0].durationSeconds = 999;
    protocol.phases[0].blocks.push({
        id: "new-block",
        durationSeconds: 999,
    });

    assertDeepEqual(expander.durationMs, 1_800_000);

    assertDeepEqual(expander.getBlockRange("block-a"), {
        id: "block-a",
        phaseId: "phase-a",
        startTimeMs: 0,
        endTimeMs: 300_000,
    });

    assertDeepEqual(expander.getBlockRange("new-block"), undefined);
});

test("protocol-expander", "returns steady progression values at workout times", () => {
    const expander = new ProtocolExpander(createValueProtocol());

    assertDeepEqual(expander.valueAt("cadence", 0), 60);
    assertDeepEqual(expander.valueAt("cadence", 50_000), 60);
    assertDeepEqual(expander.valueAt("cadence", 99_999), 60);
});

test("protocol-expander", "returns linear progression values at workout times", () => {
    const expander = new ProtocolExpander(createValueProtocol());

    assertDeepEqual(expander.valueAt("cadence", 100_000), 60);
    assertDeepEqual(expander.valueAt("cadence", 125_000), 65);
    assertDeepEqual(expander.valueAt("cadence", 150_000), 70);
    assertDeepEqual(expander.valueAt("cadence", 175_000), 75);
});

test("protocol-expander", "returns stepped progression values at workout times", () => {
    const expander = new ProtocolExpander(createValueProtocol());

    assertDeepEqual(expander.valueAt("cadence", 200_000), 40);
    assertDeepEqual(expander.valueAt("cadence", 224_999), 40);
    assertDeepEqual(expander.valueAt("cadence", 225_000), 45);
    assertDeepEqual(expander.valueAt("cadence", 249_999), 45);
    assertDeepEqual(expander.valueAt("cadence", 250_000), 50);
    assertDeepEqual(expander.valueAt("cadence", 274_999), 50);
    assertDeepEqual(expander.valueAt("cadence", 275_000), 55);
    assertDeepEqual(expander.valueAt("cadence", 299_999), 55);
});

test("protocol-expander", "uses following block ownership at exact block boundaries", () => {
    const expander = new ProtocolExpander(createValueProtocol());

    assertDeepEqual(expander.valueAt("cadence", 99_999), 60);

    assertDeepEqual(expander.valueAt("cadence", 100_000), 60);

    assertDeepEqual(expander.valueAt("cadence", 200_000), 40);
});

test("protocol-expander", "returns undefined outside the workout time range", () => {
    const expander = new ProtocolExpander(createValueProtocol());

    assertDeepEqual(expander.valueAt("cadence", -1), undefined);
    assertDeepEqual(expander.valueAt("cadence", 300_000), undefined);
    assertDeepEqual(expander.valueAt("cadence", 300_001), undefined);
});

test("protocol-expander", "returns undefined for an unknown variable ID", () => {
    const expander = new ProtocolExpander(createValueProtocol());

    assertDeepEqual(expander.valueAt("missing-variable", 50_000), undefined);
});

test("protocol-expander", "returns undefined for valueAt() on an empty protocol", () => {
    const expander = new ProtocolExpander({
        phases: [],
    });

    assertDeepEqual(expander.valueAt("cadence", 0), undefined);
});

test("protocol-expander", "rejects invalid workout time values", () => {
    const expander = new ProtocolExpander(createValueProtocol());

    assertThrows(() => expander.valueAt("cadence", "1000"), /finite number/);

    assertThrows(() => expander.valueAt("cadence", NaN), /finite number/);

    assertThrows(() => expander.valueAt("cadence", Infinity), /finite number/);
});

test("protocol-expander", "returns structural and progression boundaries", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(
        expander.boundariesBetween("cadence", 0, 300_000),
        [100_000, 125_000, 150_000, 175_000, 200_000],
    );
});

test("protocol-expander", "does not include arbitrary query endpoints as boundaries", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(
        expander.boundariesBetween("cadence", 110_000, 190_000),
        [125_000, 150_000, 175_000],
    );
});

test("protocol-expander", "uses half-open range semantics for boundary queries", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.boundariesBetween("cadence", 125_000, 175_000), [125_000, 150_000]);
});

test("protocol-expander", "includes block boundaries even when mappings are continuous", () => {
    const expander = new ProtocolExpander({
        phases: [
            {
                id: "phase-a",
                blocks: [
                    {
                        id: "block-a",
                        durationSeconds: 100,
                        variables: {
                            cadence: {
                                type: "steady",
                                start: 60,
                            },
                        },
                    },
                    {
                        id: "block-b",
                        durationSeconds: 100,
                        variables: {
                            cadence: {
                                type: "steady",
                                start: 60,
                            },
                        },
                    },
                ],
            },
        ],
    });

    assertDeepEqual(expander.boundariesBetween("cadence", 0, 200_000), [100_000]);
});

test("protocol-expander", "returns no internal boundaries for steady and linear mappings", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.boundariesBetween("cadence", 0, 100_000), []);

    assertDeepEqual(expander.boundariesBetween("cadence", 200_001, 300_000), []);
});

test("protocol-expander", "returns an empty boundary list for an unknown variable", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.boundariesBetween("missing-variable", 0, 300_000), []);
});

test("protocol-expander", "returns an empty boundary list for an empty interval", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.boundariesBetween("cadence", 150_000, 150_000), []);
});

test("protocol-expander", "returns an empty boundary list when no boundaries intersect", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.boundariesBetween("cadence", 10_000, 20_000), []);
});

test("protocol-expander", "rejects reversed boundary query ranges", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertThrows(
        () => expander.boundariesBetween("cadence", 200_000, 100_000),
        /must not be greater/,
    );
});

test("protocol-expander", "rejects invalid boundary query time values", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertThrows(() => expander.boundariesBetween("cadence", "0", 100_000), /finite number/);

    assertThrows(() => expander.boundariesBetween("cadence", 0, NaN), /finite number/);

    assertThrows(() => expander.boundariesBetween("cadence", 0, Infinity), /finite number/);
});

test("protocol-expander", "returns the next progression boundary after a time", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.nextBoundaryAfter("cadence", 110_000), 125_000);
});

test("protocol-expander", "returns the next block boundary after a time", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.nextBoundaryAfter("cadence", 90_000), 100_000);
});

test("protocol-expander", "skips a boundary at the exact requested time", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.nextBoundaryAfter("cadence", 125_000), 150_000);
});

test("protocol-expander", "returns the first boundary after a negative time", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.nextBoundaryAfter("cadence", -1), 100_000);
});

test("protocol-expander", "returns undefined when no later boundary exists", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.nextBoundaryAfter("cadence", 200_000), undefined);

    assertDeepEqual(expander.nextBoundaryAfter("cadence", expander.durationMs), undefined);
});

test("protocol-expander", "returns undefined for an unknown variable boundary", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.nextBoundaryAfter("missing-variable", 0), undefined);
});

test("protocol-expander", "rejects invalid next-boundary time values", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertThrows(() => expander.nextBoundaryAfter("cadence", "1000"), /finite number/);

    assertThrows(() => expander.nextBoundaryAfter("cadence", NaN), /finite number/);

    assertThrows(() => expander.nextBoundaryAfter("cadence", Infinity), /finite number/);
});

test("protocol-expander", "returns all phase ranges in workout order", () => {
    const expander = new ProtocolExpander(createValueBeforeProtocol());

    assertDeepEqual(expander.getPhaseRanges(), [
        {
            id: "phase-1",
            startTimeMs: 0,
            endTimeMs: 12000,
        },
        {
            id: "phase-empty",
            startTimeMs: 12000,
            endTimeMs: 12000,
        },
        {
            id: "phase-2",
            startTimeMs: 12000,
            endTimeMs: 20000,
        },
    ]);
});

test("protocol-expander", "returns all block ranges in workout order", () => {
    const expander = new ProtocolExpander(createValueBeforeProtocol());

    assertDeepEqual(expander.getBlockRanges(), [
        {
            id: "block-1",
            phaseId: "phase-1",
            startTimeMs: 0,
            endTimeMs: 12000,
        },
        {
            id: "block-2",
            phaseId: "phase-2",
            startTimeMs: 12000,
            endTimeMs: 20000,
        },
    ]);
});

test("protocol-expander", "returns empty ordered ranges for an empty protocol", () => {
    const expander = new ProtocolExpander({
        phases: [],
    });

    assertDeepEqual(expander.getPhaseRanges(), []);
    assertDeepEqual(expander.getBlockRanges(), []);
});

test("protocol-expander", "protects returned ordered ranges from mutation", () => {
    const expander = new ProtocolExpander(createValueBeforeProtocol());

    const phaseRanges = expander.getPhaseRanges();
    const blockRanges = expander.getBlockRanges();

    phaseRanges[0].startTimeMs = 999;
    phaseRanges.push({
        id: "fake-phase",
        startTimeMs: 0,
        endTimeMs: 0,
    });

    blockRanges[0].startTimeMs = 999;
    blockRanges.push({
        id: "fake-block",
        phaseId: "fake-phase",
        startTimeMs: 0,
        endTimeMs: 0,
    });

    assertDeepEqual(expander.getPhaseRanges(), [
        {
            id: "phase-1",
            startTimeMs: 0,
            endTimeMs: 12000,
        },
        {
            id: "phase-empty",
            startTimeMs: 12000,
            endTimeMs: 12000,
        },
        {
            id: "phase-2",
            startTimeMs: 12000,
            endTimeMs: 20000,
        },
    ]);

    assertDeepEqual(expander.getBlockRanges(), [
        {
            id: "block-1",
            phaseId: "phase-1",
            startTimeMs: 0,
            endTimeMs: 12000,
        },
        {
            id: "block-2",
            phaseId: "phase-2",
            startTimeMs: 12000,
            endTimeMs: 20000,
        },
    ]);
});

test("protocol-expander", "returns values immediately before ordinary workout times", () => {
    const expander = new ProtocolExpander(createValueBeforeProtocol());

    assertDeepEqual(expander.valueBefore("cadence", 6000), 45);
    assertDeepEqual(expander.valueBefore("cadence", 16000), 65);
});

test(
    "protocol-expander",
    "uses previous stepped target immediately before exact progression boundaries",
    () => {
        const expander = new ProtocolExpander(createValueBeforeProtocol());

        assertDeepEqual(expander.valueBefore("cadence", 4000), 40);
        assertDeepEqual(expander.valueAt("cadence", 4000), 45);

        assertDeepEqual(expander.valueBefore("cadence", 8000), 45);
        assertDeepEqual(expander.valueAt("cadence", 8000), 50);
    },
);

test(
    "protocol-expander",
    "uses previous block ownership immediately before exact block boundaries",
    () => {
        const expander = new ProtocolExpander(createValueBeforeProtocol());

        assertDeepEqual(expander.valueBefore("cadence", 12000), 50);
        assertDeepEqual(expander.valueAt("cadence", 12000), 60);
    },
);

test(
    "protocol-expander",
    "returns the final progression endpoint immediately before workout end",
    () => {
        const expander = new ProtocolExpander(createValueBeforeProtocol());

        assertDeepEqual(expander.valueBefore("cadence", expander.durationMs), 70);
        assertDeepEqual(expander.valueAt("cadence", expander.durationMs), undefined);
    },
);

test(
    "protocol-expander",
    "returns undefined for valueBefore() outside its valid workout side",
    () => {
        const expander = new ProtocolExpander(createValueBeforeProtocol());

        assertDeepEqual(expander.valueBefore("cadence", -1), undefined);
        assertDeepEqual(expander.valueBefore("cadence", 0), undefined);
        assertDeepEqual(expander.valueBefore("cadence", expander.durationMs + 1), undefined);
    },
);

test("protocol-expander", "returns undefined for valueBefore() on an unknown variable", () => {
    const expander = new ProtocolExpander(createValueBeforeProtocol());

    assertDeepEqual(expander.valueBefore("unknown-variable", 4000), undefined);
});

test("protocol-expander", "returns undefined for valueBefore() on an empty protocol", () => {
    const expander = new ProtocolExpander({
        phases: [],
    });

    assertDeepEqual(expander.valueBefore("cadence", 1000), undefined);
});

test("protocol-expander", "rejects invalid valueBefore() workout times", () => {
    const expander = new ProtocolExpander(createValueBeforeProtocol());

    assertThrows(() => expander.valueBefore("cadence", "1000"), /finite numbers/);
    assertThrows(() => expander.valueBefore("cadence", NaN), /finite numbers/);
    assertThrows(() => expander.valueBefore("cadence", Infinity), /finite numbers/);
});
