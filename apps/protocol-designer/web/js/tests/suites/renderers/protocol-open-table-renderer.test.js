/** Tests Protocol Open table rendering. */

import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { renderProtocolOpenTable } from "../../../renderers/protocol-open-table-renderer.js";

/** Returns representative Protocol Open row models. */
function createRows() {
    return [
        {
            protocolFamilyId: "family-1",
            displayName: "Threshold Intervals",
            activityName: "Elliptical",
            phaseCount: 4,
            blockCount: 12,
            durationSeconds: 4800,
            versionNumber: 7,
            updatedAtUnixMs: Date.UTC(2026, 8, 22),
        },
        {
            protocolFamilyId: "family-2",
            displayName: "Endurance Base",
            activityName: "Cycling",
            phaseCount: 3,
            blockCount: 8,
            durationSeconds: 3600,
            versionNumber: 3,
            updatedAtUnixMs: Date.UTC(2026, 8, 18),
        },
    ];
}

/** Returns a fresh renderer container. */
function createContainer() {
    return document.createElement("div");
}

test("protocol-open-table-renderer", "renders the protocol table headers", () => {
    const container = createContainer();

    renderProtocolOpenTable({
        container,
        rows: createRows(),
        selectedProtocolFamilyId: undefined,
        sortKey: "updatedAtUnixMs",
        sortDirection: "desc",
    });

    const headers = [...container.querySelectorAll("th")].map((header) =>
        header.textContent.trim(),
    );

    assertEqual(headers.length, 7);
    assertEqual(headers[0], "Protocol");
    assertEqual(headers[1], "Activity");
    assertEqual(headers[2], "Phases");
    assertEqual(headers[3], "Blocks");
    assertEqual(headers[4], "Duration");
    assertEqual(headers[5], "Version");
    assertEqual(headers[6], "Updated");
});

test("protocol-open-table-renderer", "renders one row per protocol", () => {
    const container = createContainer();

    renderProtocolOpenTable({
        container,
        rows: createRows(),
        selectedProtocolFamilyId: undefined,
        sortKey: "updatedAtUnixMs",
        sortDirection: "desc",
    });

    const rows = container.querySelectorAll("tbody tr");

    assertEqual(rows.length, 2);
});

test("protocol-open-table-renderer", "renders protocol row values", () => {
    const container = createContainer();

    renderProtocolOpenTable({
        container,
        rows: createRows(),
        selectedProtocolFamilyId: undefined,
        sortKey: "updatedAtUnixMs",
        sortDirection: "desc",
    });

    const firstRow = container.querySelector('tr[data-protocol-family-id="family-1"]');
    const cells = [...firstRow.querySelectorAll("td")].map((cell) => cell.textContent.trim());

    const expectedUpdated = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(Date.UTC(2026, 8, 22));

    assertEqual(cells[0], "Threshold Intervals");
    assertEqual(cells[1], "Elliptical");
    assertEqual(cells[2], "4");
    assertEqual(cells[3], "12");
    assertEqual(cells[4], "1 h 20 min");
    assertEqual(cells[5], "7");
    assertEqual(cells[6], expectedUpdated);
});

test("protocol-open-table-renderer", "stores protocol family identity on each row", () => {
    const container = createContainer();

    renderProtocolOpenTable({
        container,
        rows: createRows(),
        selectedProtocolFamilyId: undefined,
        sortKey: "updatedAtUnixMs",
        sortDirection: "desc",
    });

    const renderedRows = [...container.querySelectorAll("tbody tr")];

    assertEqual(renderedRows[0].dataset.protocolFamilyId, "family-1");
    assertEqual(renderedRows[1].dataset.protocolFamilyId, "family-2");
});

test("protocol-open-table-renderer", "marks the selected protocol row", () => {
    const container = createContainer();

    renderProtocolOpenTable({
        container,
        rows: createRows(),
        selectedProtocolFamilyId: "family-2",
        sortKey: "updatedAtUnixMs",
        sortDirection: "desc",
    });

    const selectedRow = container.querySelector('tr[data-protocol-family-id="family-2"]');
    const unselectedRow = container.querySelector('tr[data-protocol-family-id="family-1"]');

    assertEqual(selectedRow.getAttribute("aria-selected"), "true");
    assertEqual(unselectedRow.getAttribute("aria-selected"), "false");
});

test("protocol-open-table-renderer", "marks the active sort column and direction", () => {
    const container = createContainer();

    renderProtocolOpenTable({
        container,
        rows: createRows(),
        selectedProtocolFamilyId: undefined,
        sortKey: "updatedAtUnixMs",
        sortDirection: "desc",
    });

    const updatedHeader = container.querySelector('[data-sort-key="updatedAtUnixMs"]');

    assertEqual(updatedHeader.getAttribute("aria-sort"), "descending");
});

test("protocol-open-table-renderer", "renders sortable header controls", () => {
    const container = createContainer();

    renderProtocolOpenTable({
        container,
        rows: createRows(),
        selectedProtocolFamilyId: undefined,
        sortKey: "updatedAtUnixMs",
        sortDirection: "desc",
    });

    const sortButtons = container.querySelectorAll("button[data-sort-key]");

    assertEqual(sortButtons.length, 7);
});

test("protocol-open-table-renderer", "renders an empty state when no protocols exist", () => {
    const container = createContainer();

    renderProtocolOpenTable({
        container,
        rows: [],
        selectedProtocolFamilyId: undefined,
        sortKey: "updatedAtUnixMs",
        sortDirection: "desc",
    });

    const emptyState = container.querySelector("[data-protocol-open-empty]");

    assertEqual(emptyState.textContent.trim(), "No saved protocols yet.");
});

test("protocol-open-table-renderer", "replaces previous table contents on rerender", () => {
    const container = createContainer();

    renderProtocolOpenTable({
        container,
        rows: createRows(),
        selectedProtocolFamilyId: undefined,
        sortKey: "updatedAtUnixMs",
        sortDirection: "desc",
    });

    renderProtocolOpenTable({
        container,
        rows: [createRows()[0]],
        selectedProtocolFamilyId: "family-1",
        sortKey: "displayName",
        sortDirection: "asc",
    });

    assertEqual(container.querySelectorAll("tbody tr").length, 1);
});
