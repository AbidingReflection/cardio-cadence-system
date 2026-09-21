import { test, assertDeepEqual } from "/packages/js-testing/framework/test-framework.js";

import { ProtocolExpander } from "../protocol-expander.js";

import { createProtocol } from "./protocol-expander-fixtures.js";

test("protocol-expander-structure", "computes total protocol duration", () => {
    const expander = new ProtocolExpander(createProtocol());

    assertDeepEqual(expander.durationMs, 1_800_000);
});

test("protocol-expander-structure", "computes absolute phase ranges", () => {
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

test("protocol-expander-structure", "computes absolute block ranges", () => {
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

test("protocol-expander-structure", "handles an empty protocol", () => {
    const expander = new ProtocolExpander({
        phases: [],
    });

    assertDeepEqual(expander.durationMs, 0);
    assertDeepEqual(expander.getPhaseRange("missing-phase"), undefined);
    assertDeepEqual(expander.getBlockRange("missing-block"), undefined);
});

test("protocol-expander-structure", "handles an empty phase", () => {
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

test("protocol-expander-structure", "returns undefined for an unknown phase ID", () => {
    const expander = new ProtocolExpander(createProtocol());

    assertDeepEqual(expander.getPhaseRange("missing-phase"), undefined);
});

test("protocol-expander-structure", "returns undefined for an unknown block ID", () => {
    const expander = new ProtocolExpander(createProtocol());

    assertDeepEqual(expander.getBlockRange("missing-block"), undefined);
});

test("protocol-expander-structure", "protects returned phase ranges from mutation", () => {
    const expander = new ProtocolExpander(createProtocol());

    const range = expander.getPhaseRange("phase-a");
    range.startTimeMs = 123_456;

    assertDeepEqual(expander.getPhaseRange("phase-a"), {
        id: "phase-a",
        startTimeMs: 0,
        endTimeMs: 900_000,
    });
});

test("protocol-expander-structure", "protects returned block ranges from mutation", () => {
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

test("protocol-expander-structure", "does not change when the source protocol is mutated", () => {
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
