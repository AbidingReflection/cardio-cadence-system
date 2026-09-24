/**
 * Wires Protocol Designer open-dialog selection, sorting, and open interactions.
 */

import {
    buildProtocolOpenRows,
    sortProtocolOpenRows,
} from "../renderers/protocol-open-row-model.js";
import { renderProtocolOpenTable } from "../renderers/protocol-open-table-renderer.js";

/** Wires Protocol Designer open-dialog interactions. */
export function wireProtocolOpenEvents({
    openButton,
    openDialog,
    closeButton,
    cancelButton,
    confirmButton,
    protocolTableContainer,
    persistenceService,
    activityTypeVersions,
    protocolOpenController,
}) {
    let rows = [];
    let selectedProtocolFamilyId;
    let sortKey = "updatedAtUnixMs";
    let sortDirection = "desc";

    /** Returns the rows in their current visible sort order. */
    function getSortedRows() {
        return sortProtocolOpenRows(rows, {
            key: sortKey,
            direction: sortDirection,
        });
    }

    /** Renders the current rows using the active selection and sort state. */
    function renderTable() {
        renderProtocolOpenTable({
            container: protocolTableContainer,
            rows: getSortedRows(),
            selectedProtocolFamilyId,
            sortKey,
            sortDirection,
        });
    }

    /** Selects a protocol family and updates the dialog state. */
    function selectProtocolFamily(protocolFamilyId) {
        selectedProtocolFamilyId = protocolFamilyId;
        confirmButton.disabled = false;

        const protocolRows = [
            ...protocolTableContainer.querySelectorAll("tr[data-protocol-family-id]"),
        ];

        for (const row of protocolRows) {
            row.setAttribute(
                "aria-selected",
                row.dataset.protocolFamilyId === protocolFamilyId ? "true" : "false",
            );
        }

        const selectedRow = protocolRows.find(
            (row) => row.dataset.protocolFamilyId === protocolFamilyId,
        );

        selectedRow?.scrollIntoView({
            block: "nearest",
        });
    }

    /** Opens the currently selected protocol family. */
    async function openSelectedProtocol() {
        if (selectedProtocolFamilyId === undefined) {
            return;
        }

        try {
            await protocolOpenController.openProtocolFamily(selectedProtocolFamilyId);
            openDialog.close();
        } catch (error) {
            console.error("Failed to open protocol.", error);
        }
    }

    /** Moves selection one row in the supplied direction. */
    function moveSelection(direction) {
        const sortedRows = getSortedRows();

        if (sortedRows.length === 0) {
            return;
        }

        const selectedIndex = sortedRows.findIndex(
            (row) => row.protocolFamilyId === selectedProtocolFamilyId,
        );

        if (selectedIndex === -1) {
            selectProtocolFamily(sortedRows[0].protocolFamilyId);
            return;
        }

        const nextIndex = Math.max(0, Math.min(sortedRows.length - 1, selectedIndex + direction));

        selectProtocolFamily(sortedRows[nextIndex].protocolFamilyId);
    }

    openButton.addEventListener("click", () => {
        selectedProtocolFamilyId = undefined;
        sortKey = "updatedAtUnixMs";
        sortDirection = "desc";
        confirmButton.disabled = true;

        rows = buildProtocolOpenRows({
            protocolFamilies: persistenceService.listProtocolFamilies(),
            getPlannedVersions: (protocolFamilyId) =>
                persistenceService.listPlannedProtocolVersions(protocolFamilyId),
            getActivityTypeVersion: (activityTypeVersionId) =>
                activityTypeVersions.getById(activityTypeVersionId),
        });

        renderTable();
        openDialog.showModal();
        protocolTableContainer.focus();
    });

    protocolTableContainer.addEventListener("click", (event) => {
        const sortButton = event.target.closest("button[data-sort-key]");

        if (sortButton !== null) {
            const nextSortKey = sortButton.dataset.sortKey;

            if (nextSortKey === sortKey) {
                sortDirection = sortDirection === "asc" ? "desc" : "asc";
            } else {
                sortKey = nextSortKey;
                sortDirection = "asc";
            }

            renderTable();
            return;
        }

        const protocolRow = event.target.closest("tr[data-protocol-family-id]");

        if (protocolRow === null) {
            return;
        }

        selectProtocolFamily(protocolRow.dataset.protocolFamilyId);
    });

    protocolTableContainer.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            moveSelection(1);
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            moveSelection(-1);
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            void openSelectedProtocol();
        }
    });

    protocolTableContainer.addEventListener("dblclick", (event) => {
        const protocolRow = event.target.closest("tr[data-protocol-family-id]");

        if (protocolRow === null) {
            return;
        }

        selectProtocolFamily(protocolRow.dataset.protocolFamilyId);
        void openSelectedProtocol();
    });

    closeButton.addEventListener("click", () => {
        openDialog.close();
    });

    cancelButton.addEventListener("click", () => {
        openDialog.close();
    });

    confirmButton.addEventListener("click", () => {
        void openSelectedProtocol();
    });
}
