import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import {
    renderSummary,
    renderSuiteSummary,
    renderTestResults,
    renderTestSuites,
} from "/packages/js-testing/page/test-renderer.js";

test("test-renderer", "renders the distinct suite count", () => {
    const statusElement = document.querySelector("#test-summary-status");
    const suitesElement = document.querySelector("#test-summary-suites");
    const totalElement = document.querySelector("#test-summary-total");
    const passedElement = document.querySelector("#test-summary-passed");
    const failedElement = document.querySelector("#test-summary-failed");

    const original = {
        statusText: statusElement.textContent,
        statusClassName: statusElement.className,
        suites: suitesElement.textContent,
        total: totalElement.textContent,
        passed: passedElement.textContent,
        failed: failedElement.textContent,
    };

    try {
        renderSummary([
            {
                suite: "alpha",
                name: "passes",
                status: "PASSED",
                message: "",
            },
            {
                suite: "alpha",
                name: "also passes",
                status: "PASSED",
                message: "",
            },
            {
                suite: "beta",
                name: "fails",
                status: "FAILED",
                message: "Failure",
            },
        ]);

        assertEqual(suitesElement.textContent, "2");
        assertEqual(totalElement.textContent, "3");
        assertEqual(passedElement.textContent, "2");
        assertEqual(failedElement.textContent, "1");
        assertEqual(statusElement.textContent, "FAILED");
    } finally {
        statusElement.textContent = original.statusText;
        statusElement.className = original.statusClassName;
        suitesElement.textContent = original.suites;
        totalElement.textContent = original.total;
        passedElement.textContent = original.passed;
        failedElement.textContent = original.failed;
    }
});

test("test-renderer", "sorts failed suites before passed suites", () => {
    const tableBody = document.querySelector("#test-suite-summary");
    const originalContent = tableBody.innerHTML;

    try {
        renderSuiteSummary([
            {
                suite: "passed-suite",
                name: "passes",
                status: "PASSED",
                message: "",
            },
            {
                suite: "failed-suite",
                name: "fails",
                status: "FAILED",
                message: "Failure",
            },
        ]);

        const suiteNames = [...tableBody.querySelectorAll("tr")].map(
            (row) => row.cells[0].textContent,
        );

        assertDeepEqual(suiteNames, ["failed-suite.test.js", "passed-suite.test.js"]);
    } finally {
        tableBody.innerHTML = originalContent;
    }
});

test("test-renderer", "sorts suites alphabetically within status groups", () => {
    const tableBody = document.querySelector("#test-suite-summary");
    const originalContent = tableBody.innerHTML;

    try {
        renderSuiteSummary([
            {
                suite: "zeta-failed",
                name: "fails",
                status: "FAILED",
                message: "Failure",
            },
            {
                suite: "zeta-passed",
                name: "passes",
                status: "PASSED",
                message: "",
            },
            {
                suite: "alpha-failed",
                name: "fails",
                status: "FAILED",
                message: "Failure",
            },
            {
                suite: "alpha-passed",
                name: "passes",
                status: "PASSED",
                message: "",
            },
        ]);

        const suiteNames = [...tableBody.querySelectorAll("tr")].map(
            (row) => row.cells[0].textContent,
        );

        assertDeepEqual(suiteNames, [
            "alpha-failed.test.js",
            "zeta-failed.test.js",
            "alpha-passed.test.js",
            "zeta-passed.test.js",
        ]);
    } finally {
        tableBody.innerHTML = originalContent;
    }
});

test("test-renderer", "sorts failed tests first while preserving status-group order", () => {
    const container = document.querySelector("#test-suites");
    const originalContent = container.innerHTML;

    try {
        renderTestSuites([
            {
                suite: "example",
                name: "passed first",
            },
            {
                suite: "example",
                name: "failed first",
            },
            {
                suite: "example",
                name: "passed second",
            },
            {
                suite: "example",
                name: "failed second",
            },
        ]);

        renderTestResults([
            {
                suite: "example",
                name: "passed first",
                status: "PASSED",
                message: "",
            },
            {
                suite: "example",
                name: "failed first",
                status: "FAILED",
                message: "Failure 1",
            },
            {
                suite: "example",
                name: "passed second",
                status: "PASSED",
                message: "",
            },
            {
                suite: "example",
                name: "failed second",
                status: "FAILED",
                message: "Failure 2",
            },
        ]);

        const testNames = [...container.querySelectorAll('[data-test-suite="example"] tr')].map(
            (row) => row.cells[0].textContent,
        );

        assertDeepEqual(testNames, [
            "failed first",
            "failed second",
            "passed first",
            "passed second",
        ]);
    } finally {
        container.innerHTML = originalContent;
    }
});
