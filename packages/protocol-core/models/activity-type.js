const VALID_VARIABLE_ROLES = new Set(["cadence", "pace", "load"]);

/** Represents an immutable, validated activity type definition. */
export class ActivityType {
    #data;

    /** Creates an ActivityType from raw activity type data. */
    constructor(data) {
        validateActivityType(data);
        this.#data = structuredClone(data);
    }

    /** Returns the activity type ID. */
    get id() {
        return this.#data.id;
    }

    /** Returns the activity type display name. */
    get name() {
        return this.#data.name;
    }

    /** Returns a defensive copy of the activity variable definitions. */
    get variables() {
        return structuredClone(this.#data.variables);
    }

    /** Returns a defensive copy of the complete validated definition. */
    getDefinition() {
        return structuredClone(this.#data);
    }

    /** Returns a defensive copy of a variable definition by ID, or undefined if absent. */
    getVariable(variableId) {
        const variable = this.#data.variables.find((variable) => variable.id === variableId);

        return variable === undefined ? undefined : structuredClone(variable);
    }
}

/** Validates the structure and invariants of raw ActivityType data. */
function validateActivityType(data) {
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
        throw new TypeError("ActivityType data must be an object.");
    }

    requireNonEmptyString(data.id, "ActivityType id");
    requireNonEmptyString(data.name, "ActivityType name");

    if (!Array.isArray(data.variables)) {
        throw new TypeError("ActivityType variables must be an array.");
    }

    if (data.variables.length === 0) {
        throw new Error("ActivityType must define at least one variable.");
    }

    const variableIds = new Set();

    for (const variable of data.variables) {
        validateVariable(variable);

        if (variableIds.has(variable.id)) {
            throw new Error(
                `ActivityType variable IDs must be unique. Duplicate ID: "${variable.id}".`,
            );
        }

        variableIds.add(variable.id);
    }
}

/** Validates an activity variable definition. */
function validateVariable(variable) {
    if (variable === null || typeof variable !== "object" || Array.isArray(variable)) {
        throw new TypeError("ActivityType variable must be an object.");
    }

    requireNonEmptyString(variable.id, "ActivityType variable id");
    requireNonEmptyString(variable.name, "ActivityType variable name");
    validateOptionalUnit(variable.unit);
    requireNonEmptyString(variable.role, "ActivityType variable role");

    if (!VALID_VARIABLE_ROLES.has(variable.role)) {
        throw new Error(`Unknown ActivityType variable role: "${variable.role}".`);
    }
}

/** Validates an optional activity variable unit. */
function validateOptionalUnit(unit) {
    if (unit === null) {
        return;
    }

    requireNonEmptyString(unit, "ActivityType variable unit");
}

/** Requires a value to be a non-empty string. */
function requireNonEmptyString(value, description) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new TypeError(`${description} must be a non-empty string.`);
    }
}
