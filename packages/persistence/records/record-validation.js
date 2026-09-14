/** Requires a plain object value. */
export function requireObject(value, label) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError(`${label} must be an object.`);
    }
}

/** Requires a non-empty string value. */
export function requireNonEmptyString(value, label) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new TypeError(`${label} must be a non-empty string.`);
    }
}

/** Requires a finite integer Unix timestamp. */
export function requireUnixTimestamp(value, label) {
    if (!Number.isInteger(value) || !Number.isFinite(value)) {
        throw new TypeError(`${label} must be a finite integer Unix timestamp.`);
    }
}
