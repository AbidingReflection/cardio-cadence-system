/** Defines and validates protocol execution event semantics. */

const NAVIGATION_ACTIONS = new Set(["skip-block", "skip-phase", "early-cooldown", "jump"]);

/** Requires a plain object value. */
function requireObject(value, label) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError(`${label} must be an object.`);
    }
}

/** Requires a non-empty string value. */
function requireNonEmptyString(value, label) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new TypeError(`${label} must be a non-empty string.`);
    }
}

/** Requires a finite integer Unix timestamp. */
function requireUnixTimestamp(value, label) {
    if (!Number.isInteger(value) || !Number.isFinite(value)) {
        throw new TypeError(`${label} must be a finite integer Unix timestamp.`);
    }
}

export function validateExecutionEventSequence(events) {
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

export function validateExecutionEvents(events) {
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
    requireProtocolTime(event.protocolTimeMs, "ExecutedProtocol navigation event protocolTimeMs");

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

    requireProtocolTime(
        event.lastKnownProtocolTimeMs,
        "ExecutedProtocol recovery event lastKnownProtocolTimeMs",
    );
}

/** Validates an absolute position on the planned protocol timeline. */
function requireProtocolTime(value, label) {
    if (!Number.isFinite(value) || value < 0) {
        throw new TypeError(`${label} must be a non-negative finite number.`);
    }
}
