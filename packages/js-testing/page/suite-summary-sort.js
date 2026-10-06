/** Adds interactive sorting to the test suite summary table. */

/** Enables sorting when a suite-summary header button is selected. */
export function initializeSuiteSummarySorting() {
    const table = document.querySelector(".test-suite-summary");

    if (!table) {
        throw new Error("Test suite summary table was not found.");
    }

    const buttons = table.querySelectorAll("[data-suite-sort-column]");

    for (const button of buttons) {
        button.addEventListener("click", () => {
            sortSuiteSummary(table, button);
        });
    }
}

/** Sorts suite-summary rows using the selected column and direction. */
function sortSuiteSummary(table, button) {
    const columnIndex = Number(button.dataset.suiteSortColumn);
    const sortType = button.dataset.suiteSortType;

    const header = button.closest("th");
    const currentDirection = header.getAttribute("aria-sort");
    const nextDirection = currentDirection === "ascending" ? "descending" : "ascending";

    resetSortDirections(table);
    header.setAttribute("aria-sort", nextDirection);

    const body = table.querySelector("tbody");
    const rows = [...body.rows];

    rows.sort((rowA, rowB) => {
        const valueA = getCellValue(rowA, columnIndex, sortType);
        const valueB = getCellValue(rowB, columnIndex, sortType);

        const comparison = compareValues(valueA, valueB);

        return nextDirection === "ascending" ? comparison : -comparison;
    });

    body.append(...rows);
}

/** Returns a sortable value from a table cell. */
function getCellValue(row, columnIndex, sortType) {
    const cell = row.cells[columnIndex];

    if (sortType === "number") {
        return Number(cell.textContent.trim());
    }

    if (sortType === "date") {
        return Date.parse(cell.dataset.sortValue);
    }

    return cell.textContent.trim();
}

/** Compares two normalized sortable values. */
function compareValues(valueA, valueB) {
    if (typeof valueA === "number" && typeof valueB === "number") {
        return valueA - valueB;
    }

    return valueA.localeCompare(valueB, undefined, {
        numeric: true,
        sensitivity: "base",
    });
}

/** Clears the active sort direction from all suite-summary headers. */
function resetSortDirections(table) {
    for (const header of table.querySelectorAll("thead th")) {
        header.setAttribute("aria-sort", "none");
    }
}
