/** Renders result tables for all registered test suites. */
export function renderTestSuites(tests) {
    const container = document.querySelector("#test-suites");

    if (container === null) {
        throw new Error('Test suite container "#test-suites" was not found.');
    }

    container.replaceChildren();

    const suites = new Set(tests.map((test) => test.suite));

    for (const suite of suites) {
        container.append(createTestSuite(suite));
    }
}

/** Renders all completed test results. */
export function renderTestResults(results) {
    for (const result of results) {
        renderTestResult(result);
    }
}

/** Updates the overall test summary from completed results. */
export function renderSummary(results) {
    const passed = results.filter((result) => result.status === "PASSED").length;

    const failed = results.filter((result) => result.status === "FAILED").length;

    const total = results.length;

    const statusElement = getRequiredElement("#test-summary-status");

    getRequiredElement("#test-summary-total").textContent = total;
    getRequiredElement("#test-summary-passed").textContent = passed;
    getRequiredElement("#test-summary-failed").textContent = failed;

    statusElement.classList.remove(
        "test-status--pending",
        "test-status--passed",
        "test-status--failed",
    );

    if (failed === 0) {
        statusElement.textContent = "PASSED";
        statusElement.classList.add("test-status--passed");
    } else {
        statusElement.textContent = "FAILED";
        statusElement.classList.add("test-status--failed");
    }
}

/** Renders a summary row for each completed test suite. */
export function renderSuiteSummary(results) {
    const tableBody = getRequiredElement("#test-suite-summary");

    tableBody.replaceChildren();

    const suites = groupResultsBySuite(results);

    for (const [suite, suiteResults] of suites) {
        tableBody.append(createSuiteSummaryItem(suite, suiteResults));
    }
}

/** Creates the result table for a single test suite. */
function createTestSuite(suite) {
    const section = document.createElement("section");
    section.className = "test-suite";
    section.id = getSuiteSectionId(suite);

    const heading = document.createElement("h2");
    heading.textContent = `${suite}.test.js`;

    const table = document.createElement("table");
    table.className = "test-results";

    const tableHead = document.createElement("thead");
    tableHead.innerHTML = `
    <tr>
    <th>Test</th>
    <th class="test-result__status">Status</th>
    <th class="test-result__message">Message</th>
    </tr>
    `;

    const tableBody = document.createElement("tbody");
    tableBody.dataset.testSuite = suite;

    table.append(tableHead, tableBody);
    section.append(heading, table);

    return section;
}

/** Creates a summary row linking to a test suite section. */
function createSuiteSummaryItem(suite, results) {
    const passed = results.filter((result) => result.status === "PASSED").length;

    const failed = results.filter((result) => result.status === "FAILED").length;

    const total = results.length;
    const status = failed === 0 ? "PASSED" : "FAILED";

    const row = document.createElement("tr");

    const suiteCell = document.createElement("td");

    const suiteLink = document.createElement("a");
    suiteLink.href = `#${getSuiteSectionId(suite)}`;
    suiteLink.textContent = `${suite}.test.js`;

    suiteCell.append(suiteLink);

    const statusCell = document.createElement("td");
    statusCell.className = ["test-status", getStatusClass(status)].join(" ");
    statusCell.textContent = status;

    const totalCell = document.createElement("td");
    totalCell.textContent = total;

    const passedCell = document.createElement("td");
    passedCell.textContent = passed;

    const failedCell = document.createElement("td");
    failedCell.textContent = failed;

    row.append(suiteCell, statusCell, totalCell, passedCell, failedCell);

    return row;
}

/** Groups completed test results by suite. */
function groupResultsBySuite(results) {
    const suites = new Map();

    for (const result of results) {
        if (!suites.has(result.suite)) {
            suites.set(result.suite, []);
        }

        suites.get(result.suite).push(result);
    }

    return suites;
}

/** Returns the DOM ID used for a test suite section. */
function getSuiteSectionId(suite) {
    return `test-suite-${suite}`;
}

/** Renders a completed test result into its suite table. */
function renderTestResult(result) {
    const tableBody = document.querySelector(`[data-test-suite="${result.suite}"]`);

    if (tableBody === null) {
        throw new Error(`No test result table found for suite "${result.suite}".`);
    }

    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = result.name;

    const statusCell = document.createElement("td");
    statusCell.className = ["test-status", getStatusClass(result.status)].join(" ");
    statusCell.textContent = result.status;

    const messageCell = document.createElement("td");
    messageCell.textContent = result.message ?? "";

    row.append(nameCell, statusCell, messageCell);

    tableBody.append(row);
}

/** Returns the CSS class corresponding to a test result status. */
function getStatusClass(status) {
    if (status === "PASSED") {
        return "test-status--passed";
    }

    if (status === "FAILED") {
        return "test-status--failed";
    }

    throw new Error(`Unknown test result status "${status}".`);
}

/** Returns a required DOM element or throws if it is absent. */
function getRequiredElement(selector) {
    const element = document.querySelector(selector);

    if (element === null) {
        throw new Error(`Required element "${selector}" was not found.`);
    }

    return element;
}
