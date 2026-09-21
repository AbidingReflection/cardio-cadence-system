import {
    test,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import { ProtocolExpander } from "../protocol-expander.js";

import { createProtocol } from "./protocol-expander-fixtures.js";

test("protocol-expander-context", "returns structural context at workout times", () => {
    const expander = new ProtocolExpander(createProtocol());

    assertDeepEqual(expander.contextAt(0), {
        phaseId: "phase-a",
        blockId: "block-a",
        startTimeMs: 0,
        endTimeMs: 300_000,
        elapsedTimeMs: 0,
        durationMs: 300_000,
    });

    assertDeepEqual(expander.contextAt(150_000), {
        phaseId: "phase-a",
        blockId: "block-a",
        startTimeMs: 0,
        endTimeMs: 300_000,
        elapsedTimeMs: 150_000,
        durationMs: 300_000,
    });
});

test("protocol-expander-context", "uses following block context at exact block boundaries", () => {
    const expander = new ProtocolExpander(createProtocol());

    assertDeepEqual(expander.contextAt(300_000), {
        phaseId: "phase-a",
        blockId: "block-b",
        startTimeMs: 300_000,
        endTimeMs: 900_000,
        elapsedTimeMs: 0,
        durationMs: 600_000,
    });

    assertDeepEqual(expander.contextAt(900_000), {
        phaseId: "phase-b",
        blockId: "block-c",
        startTimeMs: 900_000,
        endTimeMs: 1_800_000,
        elapsedTimeMs: 0,
        durationMs: 900_000,
    });
});

test(
    "protocol-expander-context",
    "returns undefined for context outside the workout time range",
    () => {
        const expander = new ProtocolExpander(createProtocol());

        assertDeepEqual(expander.contextAt(-1), undefined);
        assertDeepEqual(expander.contextAt(1_800_000), undefined);
        assertDeepEqual(expander.contextAt(1_800_001), undefined);
    },
);

test("protocol-expander-context", "returns undefined for context on an empty protocol", () => {
    const expander = new ProtocolExpander({
        phases: [],
    });

    assertDeepEqual(expander.contextAt(0), undefined);
});

test("protocol-expander-context", "rejects invalid context workout time values", () => {
    const expander = new ProtocolExpander(createProtocol());

    assertThrows(() => expander.contextAt("1000"), /finite number/);
    assertThrows(() => expander.contextAt(NaN), /finite number/);
    assertThrows(() => expander.contextAt(Infinity), /finite number/);
});
