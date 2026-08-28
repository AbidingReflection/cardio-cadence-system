/**
 * ProtocolGraphContext tests:
 * - Verify ordered phase ranges are exposed.
 * - Verify ordered block ranges are exposed.
 * - Verify returned range data remains protected from mutation.
 */

import { assertDeepEqual, test } from "../../js-testing/framework/test-framework.js";

import { ProtocolExpander } from "../protocol-expander.js";
import { ProtocolGraphContext } from "../protocol-graph-context.js";

/** Creates a protocol fixture with multiple phases and blocks. */
function createProtocol() {
    return {
        phases: [
            {
                id: "phase-1",
                blocks: [
                    {
                        id: "block-1",
                        durationSeconds: 10,
                        variables: {},
                    },
                    {
                        id: "block-2",
                        durationSeconds: 20,
                        variables: {},
                    },
                ],
            },
            {
                id: "phase-2",
                blocks: [
                    {
                        id: "block-3",
                        durationSeconds: 15,
                        variables: {},
                    },
                ],
            },
        ],
    };
}

/** Creates graph context for the shared protocol fixture. */
function createContext() {
    return new ProtocolGraphContext(new ProtocolExpander(createProtocol()));
}

test("protocol-graph-context", "returns ordered phase ranges", () => {
    const context = createContext();

    assertDeepEqual(context.getPhaseRanges(), [
        {
            id: "phase-1",
            startTimeMs: 0,
            endTimeMs: 30000,
        },
        {
            id: "phase-2",
            startTimeMs: 30000,
            endTimeMs: 45000,
        },
    ]);
});

test("protocol-graph-context", "returns ordered block ranges", () => {
    const context = createContext();

    assertDeepEqual(context.getBlockRanges(), [
        {
            id: "block-1",
            phaseId: "phase-1",
            startTimeMs: 0,
            endTimeMs: 10000,
        },
        {
            id: "block-2",
            phaseId: "phase-1",
            startTimeMs: 10000,
            endTimeMs: 30000,
        },
        {
            id: "block-3",
            phaseId: "phase-2",
            startTimeMs: 30000,
            endTimeMs: 45000,
        },
    ]);
});

test("protocol-graph-context", "preserves defensive phase range copies", () => {
    const context = createContext();

    const ranges = context.getPhaseRanges();

    ranges[0].startTimeMs = 99999;
    ranges.push({
        id: "phase-bad",
        startTimeMs: 0,
        endTimeMs: 0,
    });

    assertDeepEqual(context.getPhaseRanges(), [
        {
            id: "phase-1",
            startTimeMs: 0,
            endTimeMs: 30000,
        },
        {
            id: "phase-2",
            startTimeMs: 30000,
            endTimeMs: 45000,
        },
    ]);
});

test("protocol-graph-context", "preserves defensive block range copies", () => {
    const context = createContext();

    const ranges = context.getBlockRanges();

    ranges[0].endTimeMs = 99999;
    ranges.pop();

    assertDeepEqual(context.getBlockRanges(), [
        {
            id: "block-1",
            phaseId: "phase-1",
            startTimeMs: 0,
            endTimeMs: 10000,
        },
        {
            id: "block-2",
            phaseId: "phase-1",
            startTimeMs: 10000,
            endTimeMs: 30000,
        },
        {
            id: "block-3",
            phaseId: "phase-2",
            startTimeMs: 30000,
            endTimeMs: 45000,
        },
    ]);
});
