import {
    assertDeepEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { createExecutedProtocol, validateExecutedProtocol } from "../records/executed-protocol.js";

import { ACTIVE_AT, ENDED_AT, STARTED_AT } from "./executed-protocol-fixtures.js";

function createValidExecution(overrides = {}) {
    return {
        id: "execution-1",
        plannedProtocolVersionId: "planned-version-1",
        status: "in-progress",
        startedAtUnixMs: STARTED_AT,
        lastKnownActiveAtUnixMs: ACTIVE_AT,
        lastKnownProtocolTimeMs: 0,
        events: [],
        ...overrides,
    };
}

test("executed-protocol-record", "creates a valid in-progress execution", () => {
    const execution = createExecutedProtocol(createValidExecution());

    assertDeepEqual(execution, {
        id: "execution-1",
        plannedProtocolVersionId: "planned-version-1",
        status: "in-progress",
        startedAtUnixMs: STARTED_AT,
        endedAtUnixMs: undefined,
        lastKnownActiveAtUnixMs: ACTIVE_AT,
        lastKnownProtocolTimeMs: 0,
        completionReason: undefined,
        events: [],
    });
});

test("executed-protocol-record", "accepts a completed execution", () => {
    validateExecutedProtocol(
        createValidExecution({
            status: "completed",
            endedAtUnixMs: ENDED_AT,
        }),
    );
});

test("executed-protocol-record", "accepts an execution ended early", () => {
    validateExecutedProtocol(
        createValidExecution({
            status: "ended-early",
            endedAtUnixMs: ENDED_AT,
            completionReason: "user-ended",
        }),
    );
});

test("executed-protocol-record", "accepts an interrupted execution", () => {
    validateExecutedProtocol(
        createValidExecution({
            status: "interrupted",
            endedAtUnixMs: ENDED_AT,
            completionReason: "recovery-finalized",
        }),
    );
});
test("executed-protocol-record", "rejects a missing execution ID", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    id: "",
                }),
            ),
        /id/,
    );
});

test("executed-protocol-record", "rejects a missing planned protocol version ID", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    plannedProtocolVersionId: "",
                }),
            ),
        /plannedProtocolVersionId/,
    );
});

test("executed-protocol-record", "rejects an unknown status", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    status: "aborted",
                }),
            ),
        /status/,
    );
});

test("executed-protocol-record", "rejects an invalid start timestamp", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    startedAtUnixMs: NaN,
                }),
            ),
        /startedAtUnixMs/,
    );
});

test("executed-protocol-record", "rejects an invalid last active timestamp", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    lastKnownActiveAtUnixMs: NaN,
                }),
            ),
        /lastKnownActiveAtUnixMs/,
    );
});

test("executed-protocol-record", "rejects an end timestamp while in progress", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    endedAtUnixMs: ENDED_AT,
                }),
            ),
        /endedAtUnixMs/,
    );
});

test("executed-protocol-record", "requires an end timestamp when completed", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    status: "completed",
                }),
            ),
        /endedAtUnixMs/,
    );
});

test("executed-protocol-record", "requires an end timestamp when ended early", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    status: "ended-early",
                    completionReason: "user-ended",
                }),
            ),
        /endedAtUnixMs/,
    );
});

test("executed-protocol-record", "requires an end timestamp when interrupted", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    status: "interrupted",
                    completionReason: "recovery-finalized",
                }),
            ),
        /endedAtUnixMs/,
    );
});

test("executed-protocol-record", "rejects a completion reason while in progress", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    completionReason: "something",
                }),
            ),
        /completionReason/,
    );
});

test("executed-protocol-record", "rejects a completion reason for normal completion", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    status: "completed",
                    endedAtUnixMs: ENDED_AT,
                    completionReason: "something",
                }),
            ),
        /completionReason/,
    );
});

test("executed-protocol-record", "requires a completion reason when ended early", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    status: "ended-early",
                    endedAtUnixMs: ENDED_AT,
                }),
            ),
        /completionReason/,
    );
});

test("executed-protocol-record", "requires a completion reason when interrupted", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    status: "interrupted",
                    endedAtUnixMs: ENDED_AT,
                }),
            ),
        /completionReason/,
    );
});

test("executed-protocol-record", "rejects a blank completion reason", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    status: "ended-early",
                    endedAtUnixMs: ENDED_AT,
                    completionReason: "   ",
                }),
            ),
        /completionReason/,
    );
});

test("executed-protocol-record", "rejects a non-array event collection", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    events: {},
                }),
            ),
        /events/,
    );
});

test("executed-protocol-record", "rejects a last active timestamp before the start", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    lastKnownActiveAtUnixMs: STARTED_AT - 1,
                }),
            ),
        /lastKnownActiveAtUnixMs/,
    );
});

test("executed-protocol-record", "rejects an end timestamp before the start", () => {
    assertThrows(
        () =>
            validateExecutedProtocol(
                createValidExecution({
                    status: "completed",
                    startedAtUnixMs: STARTED_AT,
                    endedAtUnixMs: STARTED_AT - 1,
                    lastKnownActiveAtUnixMs: STARTED_AT,
                }),
            ),
        /endedAtUnixMs/,
    );
});

test(
    "executed-protocol-record",
    "rejects an end timestamp before the last active timestamp",
    () => {
        assertThrows(
            () =>
                validateExecutedProtocol(
                    createValidExecution({
                        status: "completed",
                        endedAtUnixMs: ACTIVE_AT - 1,
                    }),
                ),
            /endedAtUnixMs/,
        );
    },
);

test("executed-protocol-record", "accepts a positive last known protocol time", () => {
    validateExecutedProtocol(
        createValidExecution({
            lastKnownProtocolTimeMs: 1234.5,
        }),
    );
});

test("executed-protocol-record", "rejects an invalid last known protocol time", () => {
    for (const value of [-1, NaN, Infinity]) {
        assertThrows(
            () =>
                validateExecutedProtocol(
                    createValidExecution({
                        lastKnownProtocolTimeMs: value,
                    }),
                ),
            /lastKnownProtocolTimeMs/,
        );
    }
});
