import { assertThrows, test } from "/packages/js-testing/framework/test-framework.js";

import { validateExecutedProtocol } from "../records/executed-protocol.js";

import { ACTIVE_AT, STARTED_AT } from "./executed-protocol-fixtures.js";

test("executed-protocol-events", "accepts pause and resume events", () => {
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

test("executed-protocol-events", "accepts a phase navigation event", () => {
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

test("executed-protocol-events", "accepts a block navigation event", () => {
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

test("executed-protocol-events", "accepts a recovery event", () => {
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

test("executed-protocol-events", "rejects an unknown event type", () => {
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

test("executed-protocol-events", "rejects an invalid event timestamp", () => {
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

test("executed-protocol-events", "requires a phase ID for navigation", () => {
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

test("executed-protocol-events", "rejects a blank navigation block ID", () => {
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

test("executed-protocol-events", "requires a recovery last active timestamp", () => {
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
