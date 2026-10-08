import { assertThrows, test } from "/packages/js-testing/framework/test-framework.js";

import { validateExecutedProtocol } from "../records/executed-protocol.js";

import { ACTIVE_AT, STARTED_AT } from "./executed-protocol-fixtures.js";

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

test("executed-protocol-events", "accepts pause and resume events", () => {
    validateExecutedProtocol(
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
            ],
        }),
    );
});

test("executed-protocol-events", "rejects an unknown event type", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    events: [
                        {
                            type: "something-else",
                            occurredAtUnixMs: STARTED_AT + 100_000,
                        },
                    ],
                }),
            ),
        /event type/,
    );
});
