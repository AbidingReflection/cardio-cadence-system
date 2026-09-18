/**
 * Represents a validated calibration profile for a specific MachineProfile.
 */

export class CalibrationProfile {
    #data;

    constructor(data, machineProfile) {
        validateCalibrationProfile(data, machineProfile);

        this.#data = structuredClone(data);
    }

    get id() {
        return this.#data.id;
    }

    get name() {
        return this.#data.name;
    }

    get machineProfileId() {
        return this.#data.machineProfileId;
    }

    get context() {
        return structuredClone(this.#data.context);
    }

    get domain() {
        return structuredClone(this.#data.domain);
    }

    get model() {
        return structuredClone(this.#data.model);
    }

    get validation() {
        return this.#data.validation === undefined
            ? undefined
            : structuredClone(this.#data.validation);
    }

    /** Returns a defensive copy of the complete validated definition. */
    getDefinition() {
        return structuredClone(this.#data);
    }
}

/** Validates calibration-profile data against its referenced MachineProfile. */
function validateCalibrationProfile(data, machineProfile) {
    if (!isPlainObject(data)) {
        throw new Error("CalibrationProfile data must be an object.");
    }

    validateRequiredString(data.id, "CalibrationProfile id");
    validateRequiredString(data.name, "CalibrationProfile name");
    validateRequiredString(data.machineProfileId, "CalibrationProfile machineProfileId");

    validateMachineProfileReference(data.machineProfileId, machineProfile);
    validateContext(data.context);
    validateDomain(data.domain, machineProfile);
    validateModel(data.model, machineProfile);
    validateValidation(data.validation);
}

/** Validates the referenced MachineProfile. */
function validateMachineProfileReference(machineProfileId, machineProfile) {
    if (
        machineProfile === undefined ||
        typeof machineProfile.id !== "string" ||
        typeof machineProfile.getVariable !== "function"
    ) {
        throw new Error("CalibrationProfile requires a valid MachineProfile.");
    }

    if (machineProfileId !== machineProfile.id) {
        throw new Error(
            `CalibrationProfile references MachineProfile "${machineProfileId}", ` +
                `but received "${machineProfile.id}".`,
        );
    }
}

/** Validates optional calibration context metadata. */
function validateContext(context) {
    if (!isPlainObject(context)) {
        throw new Error("CalibrationProfile context must be an object.");
    }
}

/** Validates the calibrated variable domain. */
function validateDomain(domain, machineProfile) {
    if (!isPlainObject(domain)) {
        throw new Error("CalibrationProfile domain must be an object.");
    }

    for (const [variableId, range] of Object.entries(domain)) {
        if (machineProfile.getVariable(variableId) === undefined) {
            throw new Error(
                `CalibrationProfile domain contains unknown MachineProfile variable "${variableId}".`,
            );
        }

        validateDomainRange(variableId, range);
    }
}

/** Validates one calibrated variable range. */
function validateDomainRange(variableId, range) {
    if (!isPlainObject(range)) {
        throw new Error(
            `CalibrationProfile domain for variable "${variableId}" must be an object.`,
        );
    }

    if (!Number.isFinite(range.min)) {
        throw new Error(
            `CalibrationProfile domain minimum for variable "${variableId}" must be finite.`,
        );
    }

    if (!Number.isFinite(range.max)) {
        throw new Error(
            `CalibrationProfile domain maximum for variable "${variableId}" must be finite.`,
        );
    }

    if (range.min > range.max) {
        throw new Error(
            `CalibrationProfile domain minimum for variable "${variableId}" cannot exceed its maximum.`,
        );
    }
}

/** Validates the calibration model payload. */
function validateModel(model, machineProfile) {
    if (!isPlainObject(model)) {
        throw new Error("CalibrationProfile model must be an object.");
    }

    validateRequiredString(model.type, "CalibrationProfile model type");
    validateModelInput(model.input, machineProfile);

    if (!Array.isArray(model.coefficients) || model.coefficients.length === 0) {
        throw new Error("CalibrationProfile model coefficients must be a non-empty array.");
    }

    for (const coefficient of model.coefficients) {
        if (!Number.isFinite(coefficient)) {
            throw new Error(
                "CalibrationProfile model coefficients must contain only finite numbers.",
            );
        }
    }

    validateRequiredString(model.outputUnit, "CalibrationProfile model outputUnit");
}

/** Validates the calibration model input definition. */
function validateModelInput(input, machineProfile) {
    if (!isPlainObject(input)) {
        throw new Error("CalibrationProfile model input must be an object.");
    }

    validateRequiredString(input.type, "CalibrationProfile model input type");

    if (!Array.isArray(input.variables) || input.variables.length === 0) {
        throw new Error("CalibrationProfile model input variables must be a non-empty array.");
    }

    const variableIds = new Set();

    for (const variableId of input.variables) {
        validateRequiredString(variableId, "CalibrationProfile model input variable");

        if (variableIds.has(variableId)) {
            throw new Error(
                `CalibrationProfile model input contains duplicate variable "${variableId}".`,
            );
        }

        if (machineProfile.getVariable(variableId) === undefined) {
            throw new Error(
                `CalibrationProfile model input contains unknown MachineProfile variable "${variableId}".`,
            );
        }

        variableIds.add(variableId);
    }
}

/** Validates optional calibration-validation metadata. */
function validateValidation(validation) {
    if (validation !== undefined && !isPlainObject(validation)) {
        throw new Error("CalibrationProfile validation must be an object when provided.");
    }
}

/** Validates a required non-empty string. */
function validateRequiredString(value, label) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`${label} must be a non-empty string.`);
    }
}

/** Returns whether a value is a non-array object. */
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
