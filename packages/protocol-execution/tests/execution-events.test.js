import { assertThrows, test } from "/packages/js-testing/framework/test-framework.js";

import { validateExecutionEvents, validateExecutionEventSequence } from "../execution-events.js";

const OCCURRED_AT = 1_000;

/** Creates one pause or resume event. */
function createLifecycleEvent(type, occurredAtUnixMs = OCCURRED_AT) {
    return {
        type,
        occurredAtUnixMs,
    };
}

test("execution-events", "accepts pause and resume events", () => {
    validateExecutionEvents([
        createLifecycleEvent("pause"),
        createLifecycleEvent("resume", OCCURRED_AT + 1_000),
    ]);
});

test("execution-events", "accepts a phase navigation event", () => {
    validateExecutionEvents([
        {
            type: "navigate",
            occurredAtUnixMs: OCCURRED_AT,
            protocolTimeMs: 100_000,
            target: {
                phaseId: "phase-2",
            },
            action: "skip-phase",
        },
    ]);
});

test("execution-events", "rejects an unknown event type", () => {
    assertThrows(() =>
        validateExecutionEvents([
            {
                type: "bogus",
                occurredAtUnixMs: OCCURRED_AT,
            },
        ]),
    );
});

test("execution-events", "accepts alternating pause and resume sequence", () => {
    validateExecutionEventSequence([
        createLifecycleEvent("pause"),
        createLifecycleEvent("resume", OCCURRED_AT + 1_000),
    ]);
});

test("execution-events", "rejects resume before pause", () => {
    assertThrows(() => validateExecutionEventSequence([createLifecycleEvent("resume")]));
});

test("execution-events", "rejects consecutive pause events", () => {
    assertThrows(() =>
        validateExecutionEventSequence([
            createLifecycleEvent("pause"),
            createLifecycleEvent("pause", OCCURRED_AT + 1_000),
        ]),
    );
});

test("execution-events", "accepts a block navigation event", () => {
    validateExecutionEvents([
        {
            type: "navigate",
            occurredAtUnixMs: OCCURRED_AT,
            protocolTimeMs: 100_000,
            target: {
                phaseId: "phase-2",
                blockId: "block-3",
            },
            action: "skip-block",
        },
    ]);
});

test("execution-events", "accepts a recovery event", () => {
    validateExecutionEvents([
        {
            type: "recovery",
            occurredAtUnixMs: OCCURRED_AT,
            lastKnownActiveAtUnixMs: OCCURRED_AT - 500,
            lastKnownProtocolTimeMs: 90_000,
        },
    ]);
});

test("execution-events", "rejects an invalid event timestamp", () => {
    assertThrows(
        () =>
            validateExecutionEvents([
                {
                    type: "pause",
                    occurredAtUnixMs: NaN,
                },
            ]),
        /occurredAtUnixMs/,
    );
});

test("execution-events", "requires a protocol time for navigation", () => {
    assertThrows(
        () =>
            validateExecutionEvents([
                {
                    type: "navigate",
                    occurredAtUnixMs: OCCURRED_AT,
                    target: {
                        phaseId: "phase-2",
                    },
                    action: "jump",
                },
            ]),
        /protocolTimeMs/,
    );
});

test("execution-events", "rejects an invalid navigation protocol time", () => {
    assertThrows(
        () =>
            validateExecutionEvents([
                {
                    type: "navigate",
                    occurredAtUnixMs: OCCURRED_AT,
                    protocolTimeMs: -1,
                    target: {
                        phaseId: "phase-2",
                    },
                    action: "jump",
                },
            ]),
        /protocolTimeMs/,
    );
});

test("execution-events", "requires a phase ID for navigation", () => {
    assertThrows(
        () =>
            validateExecutionEvents([
                {
                    type: "navigate",
                    occurredAtUnixMs: OCCURRED_AT,
                    protocolTimeMs: 100_000,
                    target: {},
                    action: "jump",
                },
            ]),
        /phaseId/,
    );
});

test("execution-events", "rejects a blank navigation block ID", () => {
    assertThrows(
        () =>
            validateExecutionEvents([
                {
                    type: "navigate",
                    occurredAtUnixMs: OCCURRED_AT,
                    protocolTimeMs: 100_000,
                    target: {
                        phaseId: "phase-2",
                        blockId: "   ",
                    },
                    action: "jump",
                },
            ]),
        /blockId/,
    );
});

test("execution-events", "rejects an unsupported navigation action", () => {
    assertThrows(
        () =>
            validateExecutionEvents([
                {
                    type: "navigate",
                    occurredAtUnixMs: OCCURRED_AT,
                    protocolTimeMs: 100_000,
                    target: {
                        phaseId: "phase-2",
                    },
                    action: "teleport",
                },
            ]),
        /action/,
    );
});

test("execution-events", "requires a recovery last active timestamp", () => {
    assertThrows(
        () =>
            validateExecutionEvents([
                {
                    type: "recovery",
                    occurredAtUnixMs: OCCURRED_AT,
                    lastKnownProtocolTimeMs: 90_000,
                },
            ]),
        /lastKnownActiveAtUnixMs/,
    );
});

test("execution-events", "requires a recovery last known protocol time", () => {
    assertThrows(
        () =>
            validateExecutionEvents([
                {
                    type: "recovery",
                    occurredAtUnixMs: OCCURRED_AT,
                    lastKnownActiveAtUnixMs: OCCURRED_AT - 500,
                },
            ]),
        /lastKnownProtocolTimeMs/,
    );
});

test("execution-events", "rejects an invalid recovery protocol time", () => {
    assertThrows(
        () =>
            validateExecutionEvents([
                {
                    type: "recovery",
                    occurredAtUnixMs: OCCURRED_AT,
                    lastKnownActiveAtUnixMs: OCCURRED_AT - 500,
                    lastKnownProtocolTimeMs: NaN,
                },
            ]),
        /lastKnownProtocolTimeMs/,
    );
});

test("execution-events", "accepts an empty event sequence", () => {
    validateExecutionEventSequence([]);
});

test("execution-events", "accepts a currently paused sequence", () => {
    validateExecutionEventSequence([createLifecycleEvent("pause")]);
});

test("execution-events", "rejects consecutive resume events", () => {
    assertThrows(
        () =>
            validateExecutionEventSequence([
                createLifecycleEvent("pause"),
                createLifecycleEvent("resume", OCCURRED_AT + 1_000),
                createLifecycleEvent("resume", OCCURRED_AT + 2_000),
            ]),
        /resume/,
    );
});
