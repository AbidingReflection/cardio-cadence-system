import {
    assertDeepEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { createExecutedProtocol, validateExecutedProtocol } from "../executed-protocol.js";

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
