import { isProgressionType } from "/packages/protocol-core/progression-types.js";

const VALID_CONTROL_MODES = new Set(["user-produced", "machine-set"]);

/** Represents an immutable, validated machine profile definition. */
export class MachineProfile {
    #data;

    /** Creates a MachineProfile from raw profile data and its resolved ActivityType. */
    constructor(data, activityType) {
        validateMachineProfile(data, activityType);
        this.#data = structuredClone(data);
    }

    /** Returns the machine profile ID. */
    get id() {
        return this.#data.id;
    }

    /** Returns the machine profile display name. */
    get name() {
        return this.#data.name;
    }

    /** Returns the referenced activity type ID. */
    get activityTypeId() {
        return this.#data.activityTypeId;
    }

    /** Returns a defensive copy of the machine variable configurations. */
    get variables() {
        return structuredClone(this.#data.variables);
    }

    /** Returns a defensive copy of a machine variable configuration by ID, or undefined if absent. */
    getVariable(variableId) {
        const variable = this.#data.variables[variableId];

        return variable === undefined ? undefined : structuredClone(variable);
    }
}

/** Validates the structure and invariants of raw MachineProfile data. */
function validateMachineProfile(data, activityType) {
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
        throw new TypeError("MachineProfile data must be an object.");
    }

    validateActivityTypeReference(activityType);

    requireNonEmptyString(data.id, "MachineProfile id");
    requireNonEmptyString(data.name, "MachineProfile name");
    requireNonEmptyString(data.activityTypeId, "MachineProfile activityTypeId");

    if (data.activityTypeId !== activityType.id) {
        throw new Error(
            `MachineProfile activityTypeId "${data.activityTypeId}" does not match ActivityType "${activityType.id}".`,
        );
    }

    if (
        data.variables === null ||
        typeof data.variables !== "object" ||
        Array.isArray(data.variables)
    ) {
        throw new TypeError("MachineProfile variables must be an object.");
    }

    validateMachineVariables(data.variables, activityType);
}

/** Validates that the supplied ActivityType provides the API required by MachineProfile. */
function validateActivityTypeReference(activityType) {
    if (
        activityType === null ||
        typeof activityType !== "object" ||
        typeof activityType.id !== "string" ||
        !Array.isArray(activityType.variables) ||
        typeof activityType.getVariable !== "function"
    ) {
        throw new TypeError("MachineProfile requires a valid ActivityType.");
    }
}

/** Validates machine variable configurations against the referenced ActivityType. */
function validateMachineVariables(variables, activityType) {
    const activityVariableIds = new Set(activityType.variables.map((variable) => variable.id));

    for (const variableId of Object.keys(variables)) {
        if (!activityVariableIds.has(variableId)) {
            throw new Error(
                `MachineProfile defines unknown ActivityType variable "${variableId}".`,
            );
        }

        validateMachineVariable(variables[variableId], variableId);
    }

    for (const variableId of activityVariableIds) {
        if (!Object.hasOwn(variables, variableId)) {
            throw new Error(`MachineProfile is missing ActivityType variable "${variableId}".`);
        }
    }
}

/** Validates a machine-specific variable configuration. */
function validateMachineVariable(variable, variableId) {
    if (variable === null || typeof variable !== "object" || Array.isArray(variable)) {
        throw new TypeError(`MachineProfile variable "${variableId}" must be an object.`);
    }

    requireNonEmptyString(
        variable.controlMode,
        `MachineProfile variable "${variableId}" controlMode`,
    );

    if (!VALID_CONTROL_MODES.has(variable.controlMode)) {
        throw new Error(
            `Unknown controlMode "${variable.controlMode}" for MachineProfile variable "${variableId}".`,
        );
    }

    validateProgressionTypes(variable.progressionTypes, variableId);

    validateOptionalNumber(variable.min, `MachineProfile variable "${variableId}" min`);
    validateOptionalNumber(variable.max, `MachineProfile variable "${variableId}" max`);
    validateOptionalNumber(variable.increment, `MachineProfile variable "${variableId}" increment`);

    if (variable.min !== undefined && variable.max !== undefined && variable.min > variable.max) {
        throw new Error(`MachineProfile variable "${variableId}" min cannot exceed max.`);
    }

    if (variable.increment !== undefined && variable.increment <= 0) {
        throw new Error(
            `MachineProfile variable "${variableId}" increment must be greater than zero.`,
        );
    }
}

/** Validates the supported progression types for a machine variable. */
function validateProgressionTypes(progressionTypes, variableId) {
    if (!Array.isArray(progressionTypes) || progressionTypes.length === 0) {
        throw new TypeError(
            `MachineProfile variable "${variableId}" progressionTypes must be a non-empty array.`,
        );
    }

    const seenTypes = new Set();

    for (const type of progressionTypes) {
        if (!isProgressionType(type)) {
            throw new Error(
                `MachineProfile variable "${variableId}" has unknown progression type "${type}".`,
            );
        }

        if (seenTypes.has(type)) {
            throw new Error(
                `MachineProfile variable "${variableId}" has duplicate progression type "${type}".`,
            );
        }

        seenTypes.add(type);
    }
}

/** Validates an optional numeric value when present. */
function validateOptionalNumber(value, description) {
    if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) {
        throw new TypeError(`${description} must be a finite number.`);
    }
}

/** Requires a value to be a non-empty string. */
function requireNonEmptyString(value, description) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new TypeError(`${description} must be a non-empty string.`);
    }
}
