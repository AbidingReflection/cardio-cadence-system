const FINALIZED_EXECUTION_STATUSES = new Set(["completed", "ended-early", "interrupted"]);

/** Creates a defensive self-contained artifact for one finalized protocol execution. */
export function createExecutionArtifact({ protocolBundle, execution }) {
    if (!isPlainObject(protocolBundle)) {
        throw new TypeError("Execution artifact protocolBundle must be an object.");
    }

    if (!isPlainObject(execution)) {
        throw new TypeError("Execution artifact execution must be an object.");
    }

    if (!FINALIZED_EXECUTION_STATUSES.has(execution.status)) {
        throw new Error("Execution must be finalized before creating an execution artifact.");
    }

    return structuredClone({
        protocolBundle,
        execution,
    });
}

/** Returns whether a value is a non-array object. */
function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
