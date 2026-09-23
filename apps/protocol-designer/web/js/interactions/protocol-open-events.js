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
    protocolList,
    persistenceService,
    activityTypeVersions,
    protocolOpenController,
}) {
    let rows = [];
    let selectedProtocolFamilyId;
    let sortKey = "updatedAtUnixMs";
    let sortDirection = "desc";

    /** Renders the current rows using the active selection and sort state. */
    function renderTable() {
        const sortedRows = sortProtocolOpenRows(rows, {
            key: sortKey,
            direction: sortDirection,
        });

        renderProtocolOpenTable({
            container: protocolList,
            rows: sortedRows,
            selectedProtocolFamilyId,
            sortKey,
            sortDirection,
        });
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
    });

    protocolList.addEventListener("click", (event) => {
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

        selectedProtocolFamilyId = protocolRow.dataset.protocolFamilyId;
        confirmButton.disabled = false;

        renderTable();
    });

    closeButton.addEventListener("click", () => {
        openDialog.close();
    });

    cancelButton.addEventListener("click", () => {
        openDialog.close();
    });

    confirmButton.addEventListener("click", async () => {
        if (selectedProtocolFamilyId === undefined) {
            return;
        }

        try {
            await protocolOpenController.openProtocolFamily(selectedProtocolFamilyId);

            openDialog.close();
        } catch (error) {
            console.error("Failed to open protocol.", error);
        }
    });
}
