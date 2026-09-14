import {
    assertDeepEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import {
    createExecutedProtocol,
    validateExecutedProtocol,
    validateExecutionHistory,
} from "../records/executed-protocol.js";

const STARTED_AT = 1_789_360_000_000;
const ACTIVE_AT = 1_789_360_300_000;
const ENDED_AT = 1_789_360_600_000;

test("executed-protocol", "creates a valid in-progress execution", () => {
    const execution = createExecutedProtocol({
        id: "execution-1",
        plannedProtocolVersionId: "planned-version-1",
        status: "in-progress",
        startedAtUnixMs: STARTED_AT,
        lastKnownActiveAtUnixMs: ACTIVE_AT,
    });

    assertDeepEqual(execution, {
        id: "execution-1",
        plannedProtocolVersionId: "planned-version-1",
        status: "in-progress",
        startedAtUnixMs: STARTED_AT,
        endedAtUnixMs: undefined,
        lastKnownActiveAtUnixMs: ACTIVE_AT,
        completionReason: undefined,
        events: [],
    });
});

test("executed-protocol", "accepts a completed execution", () => {
    validateExecutedProtocol({
        id: "execution-1",
        plannedProtocolVersionId: "planned-version-1",
        status: "completed",
        startedAtUnixMs: STARTED_AT,
        endedAtUnixMs: ENDED_AT,
        lastKnownActiveAtUnixMs: ACTIVE_AT,
        events: [],
    });
});

test("executed-protocol", "accepts an execution ended early", () => {
    validateExecutedProtocol({
        id: "execution-1",
        plannedProtocolVersionId: "planned-version-1",
        status: "ended-early",
        startedAtUnixMs: STARTED_AT,
        endedAtUnixMs: ENDED_AT,
        lastKnownActiveAtUnixMs: ACTIVE_AT,
        completionReason: "user-ended",
        events: [],
    });
});

test("executed-protocol", "accepts an interrupted execution", () => {
    validateExecutedProtocol({
        id: "execution-1",
        plannedProtocolVersionId: "planned-version-1",
        status: "interrupted",
        startedAtUnixMs: STARTED_AT,
        endedAtUnixMs: ENDED_AT,
        lastKnownActiveAtUnixMs: ACTIVE_AT,
        completionReason: "recovery-finalized",
        events: [],
    });
});

test("executed-protocol", "rejects a missing execution ID", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "",
                plannedProtocolVersionId: "planned-version-1",
                status: "in-progress",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [],
            }),
        /id/,
    );
});

test("executed-protocol", "rejects a missing planned protocol version ID", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "",
                status: "in-progress",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [],
            }),
        /plannedProtocolVersionId/,
    );
});

test("executed-protocol", "rejects an unknown status", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "aborted",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [],
            }),
        /status/,
    );
});

test("executed-protocol", "rejects an invalid start timestamp", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "in-progress",
                startedAtUnixMs: NaN,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [],
            }),
        /startedAtUnixMs/,
    );
});

test("executed-protocol", "rejects an invalid last active timestamp", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "in-progress",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: NaN,
                events: [],
            }),
        /lastKnownActiveAtUnixMs/,
    );
});

test("executed-protocol", "rejects an end timestamp while in progress", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "in-progress",
                startedAtUnixMs: STARTED_AT,
                endedAtUnixMs: ENDED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [],
            }),
        /endedAtUnixMs/,
    );
});

test("executed-protocol", "requires an end timestamp when completed", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "completed",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [],
            }),
        /endedAtUnixMs/,
    );
});

test("executed-protocol", "requires an end timestamp when ended early", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "ended-early",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                completionReason: "user-ended",
                events: [],
            }),
        /endedAtUnixMs/,
    );
});

test("executed-protocol", "requires an end timestamp when interrupted", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "interrupted",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                completionReason: "recovery-finalized",
                events: [],
            }),
        /endedAtUnixMs/,
    );
});

test("executed-protocol", "rejects a completion reason while in progress", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "in-progress",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                completionReason: "something",
                events: [],
            }),
        /completionReason/,
    );
});

test("executed-protocol", "rejects a completion reason for normal completion", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "completed",
                startedAtUnixMs: STARTED_AT,
                endedAtUnixMs: ENDED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                completionReason: "something",
                events: [],
            }),
        /completionReason/,
    );
});

test("executed-protocol", "requires a completion reason when ended early", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "ended-early",
                startedAtUnixMs: STARTED_AT,
                endedAtUnixMs: ENDED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [],
            }),
        /completionReason/,
    );
});

test("executed-protocol", "requires a completion reason when interrupted", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "interrupted",
                startedAtUnixMs: STARTED_AT,
                endedAtUnixMs: ENDED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [],
            }),
        /completionReason/,
    );
});

test("executed-protocol", "rejects a blank completion reason", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "ended-early",
                startedAtUnixMs: STARTED_AT,
                endedAtUnixMs: ENDED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                completionReason: "   ",
                events: [],
            }),
        /completionReason/,
    );
});

test("executed-protocol", "rejects a non-array event collection", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "in-progress",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: {},
            }),
        /events/,
    );
});

test("executed-protocol", "rejects a last active timestamp before the start", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "in-progress",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: STARTED_AT - 1,
                events: [],
            }),
        /lastKnownActiveAtUnixMs/,
    );
});

test("executed-protocol", "rejects an end timestamp before the start", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "completed",
                startedAtUnixMs: STARTED_AT,
                endedAtUnixMs: STARTED_AT - 1,
                lastKnownActiveAtUnixMs: STARTED_AT,
                events: [],
            }),
        /endedAtUnixMs/,
    );
});

test("executed-protocol", "rejects an end timestamp before the last active timestamp", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "completed",
                startedAtUnixMs: STARTED_AT,
                endedAtUnixMs: ACTIVE_AT - 1,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [],
            }),
        /endedAtUnixMs/,
    );
});

test("executed-protocol", "accepts pause and resume events", () => {
    validateExecutedProtocol({
        id: "execution-1",
        plannedProtocolVersionId: "planned-version-1",
        status: "in-progress",
        startedAtUnixMs: STARTED_AT,
        lastKnownActiveAtUnixMs: ACTIVE_AT,
        events: [
            {
                type: "pause",
                occurredAtUnixMs: STARTED_AT + 100_000,
            },
            {
                type: "resume",
                occurredAtUnixMs: STARTED_AT + 200_000,
            },
        ],
    });
});

test("executed-protocol", "accepts a phase navigation event", () => {
    validateExecutedProtocol({
        id: "execution-1",
        plannedProtocolVersionId: "planned-version-1",
        status: "in-progress",
        startedAtUnixMs: STARTED_AT,
        lastKnownActiveAtUnixMs: ACTIVE_AT,
        events: [
            {
                type: "navigate",
                occurredAtUnixMs: STARTED_AT + 100_000,
                target: {
                    phaseId: "phase-2",
                },
                action: "skip-phase",
            },
        ],
    });
});

test("executed-protocol", "accepts a block navigation event", () => {
    validateExecutedProtocol({
        id: "execution-1",
        plannedProtocolVersionId: "planned-version-1",
        status: "in-progress",
        startedAtUnixMs: STARTED_AT,
        lastKnownActiveAtUnixMs: ACTIVE_AT,
        events: [
            {
                type: "navigate",
                occurredAtUnixMs: STARTED_AT + 100_000,
                target: {
                    phaseId: "phase-2",
                    blockId: "block-3",
                },
                action: "skip-block",
            },
        ],
    });
});

test("executed-protocol", "accepts a recovery event", () => {
    validateExecutedProtocol({
        id: "execution-1",
        plannedProtocolVersionId: "planned-version-1",
        status: "in-progress",
        startedAtUnixMs: STARTED_AT,
        lastKnownActiveAtUnixMs: ACTIVE_AT,
        events: [
            {
                type: "recovery",
                occurredAtUnixMs: ACTIVE_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT - 10_000,
            },
        ],
    });
});

test("executed-protocol", "rejects an unknown event type", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "in-progress",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [
                    {
                        type: "something-else",
                        occurredAtUnixMs: STARTED_AT + 100_000,
                    },
                ],
            }),
        /event type/,
    );
});

test("executed-protocol", "rejects an invalid event timestamp", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "in-progress",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [
                    {
                        type: "pause",
                        occurredAtUnixMs: NaN,
                    },
                ],
            }),
        /occurredAtUnixMs/,
    );
});

test("executed-protocol", "requires a phase ID for navigation", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "in-progress",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [
                    {
                        type: "navigate",
                        occurredAtUnixMs: STARTED_AT + 100_000,
                        target: {},
                        action: "jump",
                    },
                ],
            }),
        /phaseId/,
    );
});

test("executed-protocol", "rejects a blank navigation block ID", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "in-progress",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [
                    {
                        type: "navigate",
                        occurredAtUnixMs: STARTED_AT + 100_000,
                        target: {
                            phaseId: "phase-2",
                            blockId: "   ",
                        },
                        action: "jump",
                    },
                ],
            }),
        /blockId/,
    );
});

test("executed-protocol", "requires a recovery last active timestamp", () => {
    assertThrows(
        () =>
            validateExecutedProtocol({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "in-progress",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [
                    {
                        type: "recovery",
                        occurredAtUnixMs: ACTIVE_AT,
                    },
                ],
            }),
        /lastKnownActiveAtUnixMs/,
    );
});

test("executed-protocol", "accepts an empty execution history", () => {
    validateExecutionHistory({
        id: "execution-1",
        plannedProtocolVersionId: "planned-version-1",
        status: "in-progress",
        startedAtUnixMs: STARTED_AT,
        lastKnownActiveAtUnixMs: ACTIVE_AT,
        events: [],
    });
});

test("executed-protocol", "accepts a currently paused execution", () => {
    validateExecutionHistory({
        id: "execution-1",
        plannedProtocolVersionId: "planned-version-1",
        status: "in-progress",
        startedAtUnixMs: STARTED_AT,
        lastKnownActiveAtUnixMs: ACTIVE_AT,
        events: [
            {
                type: "pause",
                occurredAtUnixMs: STARTED_AT + 100_000,
            },
        ],
    });
});

test("executed-protocol", "accepts alternating pause and resume events", () => {
    validateExecutionHistory({
        id: "execution-1",
        plannedProtocolVersionId: "planned-version-1",
        status: "in-progress",
        startedAtUnixMs: STARTED_AT,
        lastKnownActiveAtUnixMs: ACTIVE_AT,
        events: [
            {
                type: "pause",
                occurredAtUnixMs: STARTED_AT + 100_000,
            },
            {
                type: "resume",
                occurredAtUnixMs: STARTED_AT + 200_000,
            },
            {
                type: "pause",
                occurredAtUnixMs: STARTED_AT + 250_000,
            },
        ],
    });
});

test("executed-protocol", "rejects resume before pause", () => {
    assertThrows(
        () =>
            validateExecutionHistory({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "in-progress",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [
                    {
                        type: "resume",
                        occurredAtUnixMs: STARTED_AT + 100_000,
                    },
                ],
            }),
        /resume/,
    );
});

test("executed-protocol", "rejects consecutive pause events", () => {
    assertThrows(
        () =>
            validateExecutionHistory({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "in-progress",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [
                    {
                        type: "pause",
                        occurredAtUnixMs: STARTED_AT + 100_000,
                    },
                    {
                        type: "pause",
                        occurredAtUnixMs: STARTED_AT + 200_000,
                    },
                ],
            }),
        /pause/,
    );
});

test("executed-protocol", "rejects consecutive resume events", () => {
    assertThrows(
        () =>
            validateExecutionHistory({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "in-progress",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [
                    {
                        type: "pause",
                        occurredAtUnixMs: STARTED_AT + 100_000,
                    },
                    {
                        type: "resume",
                        occurredAtUnixMs: STARTED_AT + 200_000,
                    },
                    {
                        type: "resume",
                        occurredAtUnixMs: STARTED_AT + 250_000,
                    },
                ],
            }),
        /resume/,
    );
});

test("executed-protocol", "rejects an event before execution start", () => {
    assertThrows(
        () =>
            validateExecutionHistory({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "in-progress",
                startedAtUnixMs: STARTED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [
                    {
                        type: "pause",
                        occurredAtUnixMs: STARTED_AT - 1,
                    },
                ],
            }),
        /occurredAtUnixMs/,
    );
});

test("executed-protocol", "rejects an event after finalized execution end", () => {
    assertThrows(
        () =>
            validateExecutionHistory({
                id: "execution-1",
                plannedProtocolVersionId: "planned-version-1",
                status: "completed",
                startedAtUnixMs: STARTED_AT,
                endedAtUnixMs: ENDED_AT,
                lastKnownActiveAtUnixMs: ACTIVE_AT,
                events: [
                    {
                        type: "pause",
                        occurredAtUnixMs: ENDED_AT + 1,
                    },
                ],
            }),
        /occurredAtUnixMs/,
    );
});

test("executed-protocol", "does not require event timestamps to be monotonic", () => {
    validateExecutionHistory({
        id: "execution-1",
        plannedProtocolVersionId: "planned-version-1",
        status: "in-progress",
        startedAtUnixMs: STARTED_AT,
        lastKnownActiveAtUnixMs: ACTIVE_AT,
        events: [
            {
                type: "pause",
                occurredAtUnixMs: STARTED_AT + 200_000,
            },
            {
                type: "resume",
                occurredAtUnixMs: STARTED_AT + 150_000,
            },
        ],
    });
});
