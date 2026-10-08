import {
    validateExecutionEvents,
    validateExecutionEventSequence,
} from "/packages/protocol-execution/execution-events.js";

/** Records one in-memory protocol execution. */
export class ExecutionRecorder {
    #now;
    #execution = null;

    /** Creates an execution recorder using the supplied wall-clock source. */
    constructor({ now = Date.now } = {}) {
        this.#now = now;
    }

    /** Returns the current execution status, or null before recording starts. */
    get status() {
        return this.#execution?.status ?? null;
    }

    /** Starts recording an execution at the current wall-clock time. */
    start(protocolTimeMs) {
        if (this.#execution !== null) {
            throw new Error("Cannot start an execution that has already started.");
        }

        validateProtocolTime(protocolTimeMs);

        const normalizedProtocolTimeMs = normalizeProtocolTimeMs(protocolTimeMs);
        const now = this.#now();

        this.#execution = {
            status: "in-progress",
            startedAtUnixMs: now,
            endedAtUnixMs: undefined,
            lastKnownActiveAtUnixMs: now,
            lastKnownProtocolTimeMs: normalizedProtocolTimeMs,
            completionReason: undefined,
            events: [],
        };
    }

    /** Updates the latest known active protocol position. */
    update(protocolTimeMs) {
        this.#requireInProgress();

        validateProtocolTime(protocolTimeMs);

        this.#execution.lastKnownActiveAtUnixMs = this.#now();
        this.#execution.lastKnownProtocolTimeMs = normalizeProtocolTimeMs(protocolTimeMs);
    }

    /** Records a pause at the current protocol position. */
    pause(protocolTimeMs) {
        this.#appendLifecycleEvent("pause", protocolTimeMs);
    }

    /** Records a resume at the current protocol position. */
    resume(protocolTimeMs) {
        this.#appendLifecycleEvent("resume", protocolTimeMs);
    }

    /** Records a successful navigation to another protocol position. */
    navigate({ protocolTimeMs, destinationProtocolTimeMs, target, action }) {
        this.#requireInProgress();

        validateProtocolTime(protocolTimeMs);
        validateProtocolTime(destinationProtocolTimeMs);

        const normalizedProtocolTimeMs = normalizeProtocolTimeMs(protocolTimeMs);
        const normalizedDestinationProtocolTimeMs =
            normalizeProtocolTimeMs(destinationProtocolTimeMs);

        const now = this.#now();

        const events = [
            ...this.#execution.events,
            {
                type: "navigate",
                occurredAtUnixMs: now,
                protocolTimeMs: normalizedProtocolTimeMs,
                target,
                action,
            },
        ];

        validateExecutionEvents(events);
        validateExecutionEventSequence(events);

        this.#execution.events = events;
        this.#execution.lastKnownActiveAtUnixMs = now;
        this.#execution.lastKnownProtocolTimeMs = normalizedDestinationProtocolTimeMs;
    }

    /** Marks the execution as naturally completed. */
    complete(protocolTimeMs) {
        this.#finalize("completed", protocolTimeMs, undefined);
    }

    /** Marks the execution as ended before natural completion. */
    endEarly(protocolTimeMs, reason) {
        if (typeof reason !== "string" || reason.trim() === "") {
            throw new TypeError("Execution completion reason must be a non-empty string.");
        }

        this.#finalize("ended-early", protocolTimeMs, reason);
    }

    /** Returns a defensive snapshot of the current execution. */
    getSnapshot() {
        if (this.#execution === null) {
            return null;
        }

        return {
            ...this.#execution,
            events: this.#execution.events.map((event) =>
                event.target === undefined
                    ? { ...event }
                    : {
                          ...event,
                          target: { ...event.target },
                      },
            ),
        };
    }

    /** Records one pause or resume event. */
    #appendLifecycleEvent(type, protocolTimeMs) {
        this.#requireInProgress();

        validateProtocolTime(protocolTimeMs);

        const normalizedProtocolTimeMs = normalizeProtocolTimeMs(protocolTimeMs);
        const now = this.#now();

        const events = [
            ...this.#execution.events,
            {
                type,
                occurredAtUnixMs: now,
            },
        ];

        validateExecutionEvents(events);
        validateExecutionEventSequence(events);

        this.#execution.events = events;
        this.#execution.lastKnownActiveAtUnixMs = now;
        this.#execution.lastKnownProtocolTimeMs = normalizedProtocolTimeMs;
    }

    /** Finalizes the current execution. */
    #finalize(status, protocolTimeMs, completionReason) {
        this.#requireInProgress();

        validateProtocolTime(protocolTimeMs);

        const normalizedProtocolTimeMs = normalizeProtocolTimeMs(protocolTimeMs);
        const now = this.#now();

        this.#execution.status = status;
        this.#execution.endedAtUnixMs = now;
        this.#execution.lastKnownActiveAtUnixMs = now;
        this.#execution.lastKnownProtocolTimeMs = normalizedProtocolTimeMs;
        this.#execution.completionReason = completionReason;
    }

    /** Requires an active, unfinished execution. */
    #requireInProgress() {
        if (this.#execution === null) {
            throw new Error("Execution has not started.");
        }

        if (this.#execution.status !== "in-progress") {
            throw new Error(`Execution is already ${this.#execution.status}.`);
        }
    }
}

/** Validates an absolute protocol position. */
function validateProtocolTime(protocolTimeMs) {
    if (!Number.isFinite(protocolTimeMs) || protocolTimeMs < 0) {
        throw new TypeError("Protocol time must be a non-negative finite number.");
    }
}

/** Normalizes a runtime protocol position to persisted millisecond resolution. */
function normalizeProtocolTimeMs(protocolTimeMs) {
    return Math.round(protocolTimeMs);
}
