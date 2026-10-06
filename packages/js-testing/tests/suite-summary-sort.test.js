import { assertDeepEqual, test } from "/packages/js-testing/framework/test-framework.js";

test("suite-summary-sort", "sorts suite rows by update time", () => {
    const table = document.querySelector(".test-suite-summary");
    const tableBody = table.querySelector("tbody");
    const updatedButton = table.querySelector('[data-suite-sort-column="5"]');

    const originalContent = tableBody.innerHTML;
    const originalSortDirections = [...table.querySelectorAll("thead th")].map((header) =>
        header.getAttribute("aria-sort"),
    );

    try {
        tableBody.innerHTML = `
        <tr>
        <td>older.test.js</td>
        <td>PASSED</td>
        <td>1</td>
        <td>1</td>
        <td>0</td>
        <td data-sort-value="2026-10-05T08:00:00+00:00">
        2026-10-05T08:00:00+00:00
        </td>
        </tr>
        <tr>
        <td>newer.test.js</td>
        <td>PASSED</td>
        <td>1</td>
        <td>1</td>
        <td>0</td>
        <td data-sort-value="2026-10-06T08:00:00+00:00">
        2026-10-06T08:00:00+00:00
        </td>
        </tr>
        `;

        updatedButton.click();

        const ascendingSuites = [...tableBody.rows].map((row) => row.cells[0].textContent);

        assertDeepEqual(ascendingSuites, ["older.test.js", "newer.test.js"]);

        updatedButton.click();

        const descendingSuites = [...tableBody.rows].map((row) => row.cells[0].textContent);

        assertDeepEqual(descendingSuites, ["newer.test.js", "older.test.js"]);
    } finally {
        tableBody.innerHTML = originalContent;

        [...table.querySelectorAll("thead th")].forEach((header, index) => {
            header.setAttribute("aria-sort", originalSortDirections[index]);
        });
    }
});
