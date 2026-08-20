import { deepEqual } from "/packages/utils/deep-equal.js";

const tests = [];

/** Registers a test for execution by the test runner. */
export function test(suite, name, callback) {
    tests.push({ suite, name, callback });
}

/** Executes all registered tests and returns their results. */
export async function runTests() {
    const results = [];

    for (const { suite, name, callback } of tests) {
        try {
            await callback();

            console.log(`PASS: ${suite} - ${name}`);

            results.push({
                suite,
                name,
                status: "PASSED",
                message: "",
            });
        } catch (error) {
            console.error(`FAIL: ${suite} - ${name}`, error);

            results.push({
                suite,
                name,
                status: "FAILED",
                message: error.message,
            });
        }
    }

    return results;
}

/** Returns the registered tests. */
export function getTests() {
    return [...tests];
}

/** Asserts that a condition is truthy. */
export function assert(condition, message = "Assertion failed.") {
    if (!condition) {
        throw new Error(message);
    }
}

/** Asserts that two values are strictly equal. */
export function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(
            message ?? `Expected ${formatValue(expected)}, received ${formatValue(actual)}.`,
        );
    }
}

/** Asserts that two values are structurally equal. */
export function assertDeepEqual(actual, expected, message) {
    if (!deepEqual(actual, expected)) {
        throw new Error(
            message ?? `Expected ${formatValue(expected)}, received ${formatValue(actual)}.`,
        );
    }
}

/** Asserts that a function throws an error matching the expected message. */
export function assertThrows(callback, expectedMessage) {
    try {
        callback();
    } catch (error) {
        if (expectedMessage === undefined) {
            return;
        }

        if (typeof expectedMessage === "string" && error.message.includes(expectedMessage)) {
            return;
        }

        if (expectedMessage instanceof RegExp && expectedMessage.test(error.message)) {
            return;
        }

        throw new Error(
            `Expected error matching ${formatValue(expectedMessage)}, ` +
                `received ${formatValue(error.message)}.`,
        );
    }

    throw new Error("Expected function to throw.");
}

/** Formats a value for assertion failure messages. */
function formatValue(value) {
    if (value === undefined) {
        return "undefined";
    }

    if (Array.isArray(value)) {
        return `[${value.map(formatValue).join(",")}]`;
    }

    if (value !== null && typeof value === "object") {
        const entries = Object.entries(value).map(
            ([key, entryValue]) => `${JSON.stringify(key)}:${formatValue(entryValue)}`,
        );

        return `{${entries.join(",")}}`;
    }

    return JSON.stringify(value);
}
