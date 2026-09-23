/** Tests sorting of Protocol Open row models. */

import {
    assertDeepEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { sortProtocolOpenRows } from "../../../renderers/protocol-open-row-model.js";

/** Returns representative Protocol Open rows in deliberately unsorted order. */
function createRows() {
    return [
        {
            protocolFamilyId: "family-2",
            displayName: "Threshold Intervals",
            activityName: "Elliptical",
            durationSeconds: 4800,
            versionNumber: 7,
            updatedAtUnixMs: 3000,
        },
        {
            protocolFamilyId: "family-1",
            displayName: "Endurance Base",
            activityName: "Cycling",
            durationSeconds: 3600,
            versionNumber: 3,
            updatedAtUnixMs: 1000,
        },
        {
            protocolFamilyId: "family-3",
            displayName: "Rowing Tempo",
            activityName: "Rowing",
            durationSeconds: 2700,
            versionNumber: 5,
            updatedAtUnixMs: 2000,
        },
    ];
}

test("protocol-open-row-sorting", "sorts by protocol name ascending", () => {
    const rows = createRows();

    const result = sortProtocolOpenRows(rows, {
        key: "displayName",
        direction: "asc",
    });

    assertDeepEqual(
        result.map((row) => row.protocolFamilyId),
        ["family-1", "family-3", "family-2"],
    );
});

test("protocol-open-row-sorting", "sorts by protocol name descending", () => {
    const rows = createRows();

    const result = sortProtocolOpenRows(rows, {
        key: "displayName",
        direction: "desc",
    });

    assertDeepEqual(
        result.map((row) => row.protocolFamilyId),
        ["family-2", "family-3", "family-1"],
    );
});

test("protocol-open-row-sorting", "sorts by activity name", () => {
    const rows = createRows();

    const result = sortProtocolOpenRows(rows, {
        key: "activityName",
        direction: "asc",
    });

    assertDeepEqual(
        result.map((row) => row.protocolFamilyId),
        ["family-1", "family-2", "family-3"],
    );
});

test("protocol-open-row-sorting", "sorts by duration", () => {
    const rows = createRows();

    const result = sortProtocolOpenRows(rows, {
        key: "durationSeconds",
        direction: "asc",
    });

    assertDeepEqual(
        result.map((row) => row.protocolFamilyId),
        ["family-3", "family-1", "family-2"],
    );
});

test("protocol-open-row-sorting", "sorts by version number", () => {
    const rows = createRows();

    const result = sortProtocolOpenRows(rows, {
        key: "versionNumber",
        direction: "desc",
    });

    assertDeepEqual(
        result.map((row) => row.protocolFamilyId),
        ["family-2", "family-3", "family-1"],
    );
});

test("protocol-open-row-sorting", "sorts by updated timestamp", () => {
    const rows = createRows();

    const result = sortProtocolOpenRows(rows, {
        key: "updatedAtUnixMs",
        direction: "desc",
    });

    assertDeepEqual(
        result.map((row) => row.protocolFamilyId),
        ["family-2", "family-3", "family-1"],
    );
});

test("protocol-open-row-sorting", "does not mutate the input rows", () => {
    const rows = createRows();
    const originalOrder = rows.map((row) => row.protocolFamilyId);

    sortProtocolOpenRows(rows, {
        key: "updatedAtUnixMs",
        direction: "desc",
    });

    assertDeepEqual(
        rows.map((row) => row.protocolFamilyId),
        originalOrder,
    );
});

test("protocol-open-row-sorting", "rejects an unsupported sort key", () => {
    const rows = createRows();

    assertThrows(() => {
        sortProtocolOpenRows(rows, {
            key: "somethingElse",
            direction: "asc",
        });
    }, 'Unsupported Protocol Open sort key "somethingElse".');
});

test("protocol-open-row-sorting", "rejects an unsupported sort direction", () => {
    const rows = createRows();

    assertThrows(() => {
        sortProtocolOpenRows(rows, {
            key: "displayName",
            direction: "sideways",
        });
    }, 'Unsupported Protocol Open sort direction "sideways".');
});
