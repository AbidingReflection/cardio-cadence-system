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
