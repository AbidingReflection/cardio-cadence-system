/** Defines the canonical progression types and their structural requirements. */

const PROGRESSION_DEFINITIONS = Object.freeze({
    steady: Object.freeze({
        requiredFields: Object.freeze([
            "start",
        ]),
        allowedFields: Object.freeze([
            "type",
            "start",
        ]),
    }),

    linear: Object.freeze({
        requiredFields: Object.freeze([
            "start",
            "end",
        ]),
        allowedFields: Object.freeze([
            "type",
            "start",
            "end",
        ]),
    }),

    stepped: Object.freeze({
        requiredFields: Object.freeze([
            "start",
            "end",
            "stepIntervalSeconds",
        ]),
        allowedFields: Object.freeze([
            "type",
            "start",
            "end",
            "stepIntervalSeconds",
        ]),
    }),
});


/** Returns whether a value identifies a recognized progression type. */
export function isProgressionType(type) {
    return Object.hasOwn(PROGRESSION_DEFINITIONS, type);
}


/** Returns the definition for a progression type, or undefined if unrecognized. */
export function getProgressionDefinition(type) {
    return PROGRESSION_DEFINITIONS[type];
}


/** Returns all recognized progression type IDs. */
export function getProgressionTypes() {
    return Object.keys(PROGRESSION_DEFINITIONS);
}
