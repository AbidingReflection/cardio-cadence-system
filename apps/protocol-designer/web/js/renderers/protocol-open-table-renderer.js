/**
 * Renders the sortable, selectable Protocol Open table.
 */

const COLUMNS = [
    {
        key: "displayName",
        label: "Protocol",
    },
    {
        key: "activityName",
        label: "Activity",
    },
    {
        key: "durationSeconds",
        label: "Duration",
    },
    {
        key: "versionNumber",
        label: "Version",
    },
    {
        key: "updatedAtUnixMs",
        label: "Updated",
    },
];

const UPDATED_FORMATTER = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
});

/** Renders the Protocol Open table for the supplied rows and UI state. */
export function renderProtocolOpenTable({
    container,
    rows,
    selectedProtocolFamilyId,
    sortKey,
    sortDirection,
}) {
    container.replaceChildren();

    const table = document.createElement("table");
    table.className = "protocol-open-table";

    table.append(
        createTableHeader(sortKey, sortDirection),
        createTableBody(rows, selectedProtocolFamilyId),
    );

    container.append(table);
}

/** Creates the sortable table header. */
function createTableHeader(sortKey, sortDirection) {
    const tableHead = document.createElement("thead");
    const row = document.createElement("tr");

    for (const column of COLUMNS) {
        const header = document.createElement("th");
        header.scope = "col";
        header.dataset.sortKey = column.key;

        if (column.key === sortKey) {
            header.setAttribute("aria-sort", sortDirection === "asc" ? "ascending" : "descending");
        }

        const button = document.createElement("button");
        button.type = "button";
        button.dataset.sortKey = column.key;
        button.className = "protocol-open-table__sort-button";
        button.textContent = column.label;

        header.append(button);
        row.append(header);
    }

    tableHead.append(row);

    return tableHead;
}

/** Creates the table body for the supplied protocol rows. */
function createTableBody(rows, selectedProtocolFamilyId) {
    const tableBody = document.createElement("tbody");

    if (rows.length === 0) {
        tableBody.append(createEmptyRow());
        return tableBody;
    }

    for (const row of rows) {
        tableBody.append(createProtocolRow(row, selectedProtocolFamilyId));
    }

    return tableBody;
}

/** Creates one selectable protocol table row. */
function createProtocolRow(rowModel, selectedProtocolFamilyId) {
    const row = document.createElement("tr");

    row.dataset.protocolFamilyId = rowModel.protocolFamilyId;
    row.setAttribute(
        "aria-selected",
        rowModel.protocolFamilyId === selectedProtocolFamilyId ? "true" : "false",
    );

    row.append(
        createCell(rowModel.displayName),
        createCell(rowModel.activityName),
        createCell(formatDuration(rowModel.durationSeconds)),
        createCell(String(rowModel.versionNumber)),
        createCell(UPDATED_FORMATTER.format(rowModel.updatedAtUnixMs)),
    );

    return row;
}

/** Creates the empty-state table row. */
function createEmptyRow() {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = COLUMNS.length;
    cell.dataset.protocolOpenEmpty = "";
    cell.textContent = "No saved protocols yet.";

    row.append(cell);

    return row;
}

function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value;

    return cell;
}

function formatDuration(durationSeconds) {
    const totalMinutes = Math.floor(durationSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
        return `${minutes} min`;
    }

    if (minutes === 0) {
        return `${hours} h`;
    }

    return `${hours} h ${minutes} min`;
}
