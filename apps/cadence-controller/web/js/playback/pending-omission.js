/** Returns the protocol interval omitted by one pending workout action. */
export function getPendingOmissionRange(pendingAction, protocolDurationMs) {
    if (pendingAction === null) {
        return null;
    }

    if (pendingAction.action === "skip-phase") {
        return {
            startTimeMs: pendingAction.triggerTimeMs,
            endTimeMs: pendingAction.destinationTimeMs,
        };
    }

    if (pendingAction.action === "end-workout") {
        return {
            startTimeMs: pendingAction.triggerTimeMs,
            endTimeMs: protocolDurationMs,
        };
    }

    throw new RangeError(`Unsupported pending workout action "${pendingAction.action}".`);
}
