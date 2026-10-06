import { assertThrows, test } from "/packages/js-testing/framework/test-framework.js";

import { validateExecutionHistory } from "../records/executed-protocol.js";

import { ACTIVE_AT, ENDED_AT, STARTED_AT } from "./executed-protocol-fixtures.js";

function createValidExecution(overrides = {}) {
    return {
        id: "execution-1",
        plannedProtocolVersionId: "planned-version-1",
        status: "in-progress",
        startedAtUnixMs: STARTED_AT,
        lastKnownActiveAtUnixMs: ACTIVE_AT,
        lastKnownProtocolTimeMs: 100_000,
        events: [],
        ...overrides,
    };
}

test("executed-protocol-history", "accepts an empty execution history", () => {
    validateExecutionHistory(createValidExecution());
});

test("executed-protocol-history", "accepts a currently paused execution", () => {
    validateExecutionHistory(
        createValidExecution({
            events: [
                {
                    type: "pause",
                    occurredAtUnixMs: STARTED_AT + 100_000,
                },
            ],
        }),
    );
});

test("executed-protocol-history", "accepts alternating pause and resume events", () => {
    validateExecutionHistory(
        createValidExecution({
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
        }),
    );
});

test("executed-protocol-history", "rejects resume before pause", () => {
    assertThrows(
        () =>
            validateExecutionHistory(
                createValidExecution({
                    events: [
                        {
                            type: "resume",
                            occurredAtUnixMs: STARTED_AT + 100_000,
                        },
                    ],
                }),
            ),
        /resume/,
    );
});

test("executed-protocol-history", "rejects consecutive pause events", () => {
    assertThrows(
        () =>
            validateExecutionHistory(
                createValidExecution({
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
            ),
        /pause/,
    );
});

test("executed-protocol-history", "rejects consecutive resume events", () => {
    assertThrows(
        () =>
            validateExecutionHistory(
                createValidExecution({
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
            ),
        /resume/,
    );
});

test("executed-protocol-history", "rejects an event before execution start", () => {
    assertThrows(
        () =>
            validateExecutionHistory(
                createValidExecution({
                    events: [
                        {
                            type: "pause",
                            occurredAtUnixMs: STARTED_AT - 1,
                        },
                    ],
                }),
            ),
        /occurredAtUnixMs/,
    );
});

test("executed-protocol-history", "rejects an event after finalized execution end", () => {
    assertThrows(
        () =>
            validateExecutionHistory(
                createValidExecution({
                    status: "completed",
                    endedAtUnixMs: ENDED_AT,
                    events: [
                        {
                            type: "pause",
                            occurredAtUnixMs: ENDED_AT + 1,
                        },
                    ],
                }),
            ),
        /occurredAtUnixMs/,
    );
});

test("executed-protocol-history", "does not require event timestamps to be monotonic", () => {
    validateExecutionHistory(
        createValidExecution({
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
        }),
    );
});
