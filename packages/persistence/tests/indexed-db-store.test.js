/** Tests durable persistence snapshots stored in IndexedDB. */

import { assertDeepEqual, assertEqual, test } from "../../js-testing/framework/test-framework.js";

import { IndexedDbStore } from "../storage/indexed-db-store.js";

let nextDatabaseId = 1;

/** Returns a unique IndexedDB database name for one test. */
function createDatabaseName() {
    return `cardio-cadence-test-${nextDatabaseId++}`;
}

/** Deletes an IndexedDB database after a test. */
function deleteDatabase(databaseName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(databaseName);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () =>
            reject(new Error(`IndexedDB deletion blocked for "${databaseName}".`));
    });
}

test("indexed-db-store", "returns undefined when no snapshot has been saved", async () => {
    const databaseName = createDatabaseName();

    try {
        const store = new IndexedDbStore({ databaseName });

        assertEqual(await store.load(), undefined);
    } finally {
        await deleteDatabase(databaseName);
    }
});

test("indexed-db-store", "saves and loads a persistence snapshot", async () => {
    const databaseName = createDatabaseName();

    const snapshot = {
        schemaVersion: 1,
        protocolFamilies: [{ id: "family-1" }],
        plannedProtocolVersions: [],
        executedProtocols: [],
        activityTypeVersions: [],
        machineProfileVersions: [],
        calibrationProfileVersions: [],
    };

    try {
        const store = new IndexedDbStore({ databaseName });

        await store.save(snapshot);

        assertDeepEqual(await store.load(), snapshot);
    } finally {
        await deleteDatabase(databaseName);
    }
});

test("indexed-db-store", "persists snapshots across store instances", async () => {
    const databaseName = createDatabaseName();

    const snapshot = {
        schemaVersion: 1,
        protocolFamilies: [{ id: "family-1" }],
        plannedProtocolVersions: [{ id: "planned-version-1" }],
        executedProtocols: [],
        activityTypeVersions: [{ id: "activity-version-1" }],
        machineProfileVersions: [],
        calibrationProfileVersions: [],
    };

    try {
        const firstStore = new IndexedDbStore({ databaseName });

        await firstStore.save(snapshot);

        const secondStore = new IndexedDbStore({ databaseName });

        assertDeepEqual(await secondStore.load(), snapshot);
    } finally {
        await deleteDatabase(databaseName);
    }
});
