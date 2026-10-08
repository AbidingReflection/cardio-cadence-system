/** Defines and validates executed protocol records and execution-history semantics. */

import { requireNonEmptyString, requireObject, requireUnixTimestamp } from "./record-validation.js";

import {
    validateExecutionEvents,
    validateExecutionEventSequence,
} from "/packages/protocol-execution/execution-events.js";
const EXECUTION_STATUSES = new Set(["in-progress", "completed", "ended-early", "interrupted"]);


/** Creates a validated executed-protocol record. */
export function createExecutedProtocol({
    id,
    plannedProtocolVersionId,
    status,
    startedAtUnixMs,
    endedAtUnixMs,
    lastKnownActiveAtUnixMs,
    lastKnownProtocolTimeMs,
    completionReason,
    events = [],
}) {
    const executedProtocol = {
        id,
        plannedProtocolVersionId,
        status,
        startedAtUnixMs,
        endedAtUnixMs,
        lastKnownActiveAtUnixMs,
        lastKnownProtocolTimeMs,
        completionReason,
        events,
    };

    validateExecutedProtocol(executedProtocol);

    return executedProtocol;
}

/** Validates an executed-protocol record. */
export function validateExecutedProtocol(executedProtocol) {
    requireObject(executedProtocol, "ExecutedProtocol");

    requireNonEmptyString(executedProtocol.id, "ExecutedProtocol id");

    requireNonEmptyString(
        executedProtocol.plannedProtocolVersionId,
        "ExecutedProtocol plannedProtocolVersionId",
    );

    validateStatus(executedProtocol.status);

    requireUnixTimestamp(executedProtocol.startedAtUnixMs, "ExecutedProtocol startedAtUnixMs");

    requireUnixTimestamp(
        executedProtocol.lastKnownActiveAtUnixMs,
        "ExecutedProtocol lastKnownActiveAtUnixMs",
    );

    requireProtocolTime(
        executedProtocol.lastKnownProtocolTimeMs,
        "ExecutedProtocol lastKnownProtocolTimeMs",
    );

    validateEndTimestamp(executedProtocol.status, executedProtocol.endedAtUnixMs);

    validateTimestampOrder({
        startedAtUnixMs: executedProtocol.startedAtUnixMs,
        lastKnownActiveAtUnixMs: executedProtocol.lastKnownActiveAtUnixMs,
        endedAtUnixMs: executedProtocol.endedAtUnixMs,
    });

    validateCompletionReason(executedProtocol.status, executedProtocol.completionReason);

    validateExecutionEvents(executedProtocol.events);
}

/** Validates execution-history semantics. */
export function validateExecutionHistory(executedProtocol) {
    validateExecutedProtocol(executedProtocol);

    validateEventTimeRanges(executedProtocol);
    validateExecutionEventSequence(executedProtocol.events);
}

/** Validates execution events against the execution time range. */
function validateEventTimeRanges(executedProtocol) {
    for (const event of executedProtocol.events) {
        if (event.occurredAtUnixMs < executedProtocol.startedAtUnixMs) {
            throw new TypeError(
                "ExecutedProtocol event occurredAtUnixMs must not precede startedAtUnixMs.",
            );
        }

        if (
            executedProtocol.endedAtUnixMs !== undefined &&
            event.occurredAtUnixMs > executedProtocol.endedAtUnixMs
        ) {
            throw new TypeError(
                "ExecutedProtocol event occurredAtUnixMs must not follow endedAtUnixMs.",
            );
        }
    }
}

/** Validates the execution status. */
function validateStatus(status) {
    if (!EXECUTION_STATUSES.has(status)) {
        throw new TypeError(
            `ExecutedProtocol status must be one of: ${[...EXECUTION_STATUSES].join(", ")}.`,
        );
    }
}

/** Validates end-timestamp requirements for the current execution status. */
function validateEndTimestamp(status, endedAtUnixMs) {
    if (status === "in-progress") {
        if (endedAtUnixMs !== undefined) {
            throw new TypeError(
                "ExecutedProtocol endedAtUnixMs must be omitted while status is in-progress.",
            );
        }

        return;
    }

    requireUnixTimestamp(endedAtUnixMs, "ExecutedProtocol endedAtUnixMs");
}

/** Validates completion-reason requirements for the current execution status. */
function validateCompletionReason(status, completionReason) {
    if (status === "ended-early" || status === "interrupted") {
        requireNonEmptyString(completionReason, "ExecutedProtocol completionReason");

        return;
    }

    if (completionReason !== undefined) {
        throw new TypeError(
            "ExecutedProtocol completionReason must be omitted unless status is ended-early or interrupted.",
        );
    }
}

/** Validates chronological ordering of execution timestamps. */
function validateTimestampOrder({ startedAtUnixMs, lastKnownActiveAtUnixMs, endedAtUnixMs }) {
    if (lastKnownActiveAtUnixMs < startedAtUnixMs) {
        throw new TypeError(
            "ExecutedProtocol lastKnownActiveAtUnixMs must not precede startedAtUnixMs.",
        );
    }

    if (endedAtUnixMs === undefined) {
        return;
    }

    if (endedAtUnixMs < startedAtUnixMs) {
        throw new TypeError("ExecutedProtocol endedAtUnixMs must not precede startedAtUnixMs.");
    }

    if (endedAtUnixMs < lastKnownActiveAtUnixMs) {
        throw new TypeError(
            "ExecutedProtocol endedAtUnixMs must not precede lastKnownActiveAtUnixMs.",
        );
    }
}

/** Validates an absolute position on the planned protocol timeline. */
function requireProtocolTime(value, label) {
    if (!Number.isFinite(value) || value < 0) {
        throw new TypeError(`${label} must be a non-negative finite number.`);
    }
}
