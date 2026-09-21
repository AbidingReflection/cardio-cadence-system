import { test, assertDeepEqual } from "/packages/js-testing/framework/test-framework.js";

import { ProtocolExpander } from "../protocol-expander.js";

import { createValueBeforeProtocol } from "./protocol-expander-fixtures.js";

test("protocol-expander-ordered-ranges", "returns all phase ranges in workout order", () => {
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

test("protocol-expander-ordered-ranges", "returns all block ranges in workout order", () => {
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

test(
    "protocol-expander-ordered-ranges",
    "returns empty ordered ranges for an empty protocol",
    () => {
        const expander = new ProtocolExpander({
            phases: [],
        });

        assertDeepEqual(expander.getPhaseRanges(), []);
        assertDeepEqual(expander.getBlockRanges(), []);
    },
);

test("protocol-expander-ordered-ranges", "protects returned ordered ranges from mutation", () => {
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
