/** Defines and validates executed protocol records and execution-history semantics. */

import { requireNonEmptyString, requireObject, requireUnixTimestamp } from "./record-validation.js";

const EXECUTION_STATUSES = new Set(["in-progress", "completed", "ended-early", "interrupted"]);

const NAVIGATION_ACTIONS = new Set(["skip-block", "skip-phase", "early-cooldown", "jump"]);

/** Creates a validated executed-protocol record. */
export function createExecutedProtocol({
    id,
    plannedProtocolVersionId,
    status,
    startedAtUnixMs,
    endedAtUnixMs,
    lastKnownActiveAtUnixMs,
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

    validateEndTimestamp(executedProtocol.status, executedProtocol.endedAtUnixMs);

    validateTimestampOrder({
        startedAtUnixMs: executedProtocol.startedAtUnixMs,
        lastKnownActiveAtUnixMs: executedProtocol.lastKnownActiveAtUnixMs,
        endedAtUnixMs: executedProtocol.endedAtUnixMs,
    });

    validateCompletionReason(executedProtocol.status, executedProtocol.completionReason);

    validateEvents(executedProtocol.events);
}

/** Validates execution-history semantics. */
export function validateExecutionHistory(executedProtocol) {
    validateExecutedProtocol(executedProtocol);

    validateEventTimeRanges(executedProtocol);
    validatePauseResumeSequence(executedProtocol.events);
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

/** Validates pause and resume sequencing in array order. */
function validatePauseResumeSequence(events) {
    let paused = false;

    for (const event of events) {
        if (event.type === "pause") {
            if (paused) {
                throw new TypeError(
                    "ExecutedProtocol history cannot contain consecutive pause events.",
                );
            }

            paused = true;
            continue;
        }

        if (event.type === "resume") {
            if (!paused) {
                throw new TypeError(
                    "ExecutedProtocol history cannot contain a resume event while running.",
                );
            }

            paused = false;
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

/** Validates all execution events. */
function validateEvents(events) {
    if (!Array.isArray(events)) {
        throw new TypeError("ExecutedProtocol events must be an array.");
    }

    for (const event of events) {
        validateEvent(event);
    }
}

/** Validates one execution event. */
function validateEvent(event) {
    requireObject(event, "ExecutedProtocol event");

    requireNonEmptyString(event.type, "ExecutedProtocol event type");

    requireUnixTimestamp(event.occurredAtUnixMs, "ExecutedProtocol event occurredAtUnixMs");

    switch (event.type) {
        case "pause":
        case "resume":
            return;

        case "navigate":
            validateNavigationEvent(event);
            return;

        case "recovery":
            validateRecoveryEvent(event);
            return;

        default:
            throw new TypeError(`ExecutedProtocol event type "${event.type}" is not supported.`);
    }
}

/** Validates a navigation event. */
function validateNavigationEvent(event) {
    requireObject(event.target, "ExecutedProtocol navigation event target");

    requireNonEmptyString(event.target.phaseId, "ExecutedProtocol navigation event target phaseId");

    if (event.target.blockId !== undefined) {
        requireNonEmptyString(
            event.target.blockId,
            "ExecutedProtocol navigation event target blockId",
        );
    }

    requireNonEmptyString(event.action, "ExecutedProtocol navigation event action");

    if (!NAVIGATION_ACTIONS.has(event.action)) {
        throw new TypeError(
            `ExecutedProtocol navigation event action must be one of: ${[
                ...NAVIGATION_ACTIONS,
            ].join(", ")}.`,
        );
    }
}

/** Validates a recovery event. */
function validateRecoveryEvent(event) {
    requireUnixTimestamp(
        event.lastKnownActiveAtUnixMs,
        "ExecutedProtocol recovery event lastKnownActiveAtUnixMs",
    );
}
