/**
 * Protocol bundle responsibilities:
 * - Represent one validated self-contained protocol bundle.
 * - Resolve bundled activity semantics needed by Cadence Controller playback.
 * - Preserve protocol data independently from transport/loading concerns.
 */

import { ActivityType } from "/packages/protocol-core/models/activity-type.js";

/** Represents a validated protocol bundle for Cadence Controller playback. */
export class ProtocolBundle {
    #protocol;
    #activityType;
    #cadenceVariableId;

    /** Creates a ProtocolBundle from raw self-contained bundle data. */
    constructor(data) {
        validateProtocolBundle(data);

        const activityType = new ActivityType(data.activityType);

        validateActivityTypeReference(data.protocol, activityType);

        const cadenceVariable = resolveCadenceVariable(activityType);

        this.#protocol = structuredClone(data.protocol);
        this.#activityType = activityType;
        this.#cadenceVariableId = cadenceVariable.id;
    }

    /** Loads and constructs a ProtocolBundle from a JSON resource. */
    static async load(url) {
        const data = await fetchJson(url);

        return new ProtocolBundle(data);
    }

    /** Returns a defensive copy of the bundled protocol. */
    get protocol() {
        return structuredClone(this.#protocol);
    }

    /** Returns the validated bundled ActivityType. */
    get activityType() {
        return this.#activityType;
    }

    /** Returns the activity variable ID that provides cadence. */
    get cadenceVariableId() {
        return this.#cadenceVariableId;
    }
}

/** Validates the top-level bundle data required by Cadence Controller. */
function validateProtocolBundle(data) {
    if (!isPlainObject(data)) {
        throw new TypeError("Protocol bundle must be an object.");
    }

    if (!isPlainObject(data.protocol)) {
        throw new TypeError("Protocol bundle must contain a protocol object.");
    }

    if (!isPlainObject(data.activityType)) {
        throw new TypeError("Protocol bundle must contain an activityType object.");
    }
}

/** Validates that the bundled ActivityType matches the protocol reference. */
function validateActivityTypeReference(protocol, activityType) {
    if (protocol.activityTypeId !== activityType.id) {
        throw new Error(
            `Protocol references ActivityType "${protocol.activityTypeId}", but bundle contains "${activityType.id}".`,
        );
    }
}

/** Returns the unique activity variable that provides cadence. */
function resolveCadenceVariable(activityType) {
    const cadenceVariables = activityType.variables.filter(
        (variable) => variable.role === "cadence",
    );

    if (cadenceVariables.length === 0) {
        throw new Error(`ActivityType "${activityType.id}" does not define a cadence variable.`);
    }

    if (cadenceVariables.length > 1) {
        throw new Error(`ActivityType "${activityType.id}" defines multiple cadence variables.`);
    }

    return cadenceVariables[0];
}

/** Fetches and parses a JSON resource. */
async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to load protocol bundle "${url}": HTTP ${response.status}.`);
    }

    return response.json();
}

/** Returns whether a value is a non-array object. */
function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
