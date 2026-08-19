/** Returns whether two JSON-like values are structurally equal. */
export function deepEqual(actual, expected) {
    if (Object.is(actual, expected)) {
        return true;
    }

    if (
        actual === null ||
        expected === null ||
        typeof actual !== "object" ||
        typeof expected !== "object"
    ) {
        return false;
    }

    if (Array.isArray(actual) || Array.isArray(expected)) {
        if (
            !Array.isArray(actual) ||
            !Array.isArray(expected) ||
            actual.length !== expected.length
        ) {
            return false;
        }

        return actual.every(
            (value, index) => deepEqual(value, expected[index])
        );
    }

    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);

    if (actualKeys.length !== expectedKeys.length) {
        return false;
    }

    return actualKeys.every(
        key =>
        Object.hasOwn(expected, key) &&
        deepEqual(actual[key], expected[key])
    );
}
