/** Tests durable persistence coordination between repositories and snapshot storage. */

import { assertDeepEqual, assertEqual, test } from "../../js-testing/framework/test-framework.js";

import { PersistenceContext } from "../persistence-context.js";
import { DurablePersistence } from "../storage/durable-persistence.js";

const EMPTY_SNAPSHOT = {
    schemaVersion: 1,
    protocolFamilies: [],
    plannedProtocolVersions: [],
    executedProtocols: [],
    activityTypeVersions: [],
    machineProfileVersions: [],
    calibrationProfileVersions: [],
};

/** Creates an in-memory persistence store stub. */
function createStore(initialSnapshot = undefined) {
    let snapshot = initialSnapshot;
    const saveCalls = [];

    return {
        saveCalls,

        async load() {
            return snapshot;
        },

        async save(nextSnapshot) {
            snapshot = structuredClone(nextSnapshot);
            saveCalls.push(structuredClone(nextSnapshot));
        },
    };
}

test("durable-persistence", "hydrates cleanly when no persisted snapshot exists", async () => {
    const context = new PersistenceContext();
    const store = createStore();

    const durablePersistence = new DurablePersistence({
        store,
        persistenceContext: context,
    });

    await durablePersistence.hydrate();

    assertDeepEqual(context.protocolFamilies.list(), []);
    assertDeepEqual(context.plannedProtocolVersions.listAll(), []);
    assertDeepEqual(context.executedProtocols.listAll(), []);
    assertDeepEqual(context.activityTypeVersions.listAll(), []);
    assertDeepEqual(context.machineProfileVersions.listAll(), []);
    assertDeepEqual(context.calibrationProfileVersions.listAll(), []);
});

test("durable-persistence", "commits the current persistence snapshot", async () => {
    const context = new PersistenceContext();
    const store = createStore();

    const durablePersistence = new DurablePersistence({
        store,
        persistenceContext: context,
    });

    await durablePersistence.commit();

    assertEqual(store.saveCalls.length, 1);
    assertDeepEqual(store.saveCalls[0], EMPTY_SNAPSHOT);
});

test(
    "durable-persistence",
    "restores committed repository state into a fresh context",
    async () => {
        let nextId = 1;
        let now = 1_789_360_000_000;

        const sourceContext = new PersistenceContext({
            idGenerator: () => `id-${nextId++}`,
            clock: () => now++,
        });

        const activityTypeVersion =
            await sourceContext.libraryPersistence.createInitialActivityTypeVersion({
                definition: {
                    id: "cycling",
                    name: "Cycling",
                    variables: [],
                },
            });

        const { plannedProtocolVersion } =
            sourceContext.service.createProtocolFamilyWithInitialVersion({
                displayName: "Threshold Intervals",
                protocol: {
                    id: "protocol-1",
                    name: "Threshold Intervals",
                },
                dependencies: {
                    activityTypeVersionId: activityTypeVersion.id,
                    machineProfileVersionId: undefined,
                    calibrationProfileVersionId: undefined,
                },
                changeSummary: "Initial version",
            });

        const execution = sourceContext.service.startExecution({
            plannedProtocolVersionId: plannedProtocolVersion.id,
        });

        sourceContext.service.completeExecution(execution.id);

        const store = createStore();

        const sourceDurablePersistence = new DurablePersistence({
            store,
            persistenceContext: sourceContext,
        });

        await sourceDurablePersistence.commit();

        const restoredContext = new PersistenceContext();

        const restoredDurablePersistence = new DurablePersistence({
            store,
            persistenceContext: restoredContext,
        });

        await restoredDurablePersistence.hydrate();

        assertDeepEqual(
            restoredContext.protocolFamilies.list(),
            sourceContext.protocolFamilies.list(),
        );

        assertDeepEqual(
            restoredContext.plannedProtocolVersions.listAll(),
            sourceContext.plannedProtocolVersions.listAll(),
        );

        assertDeepEqual(
            restoredContext.executedProtocols.listAll(),
            sourceContext.executedProtocols.listAll(),
        );

        assertDeepEqual(
            restoredContext.activityTypeVersions.listAll(),
            sourceContext.activityTypeVersions.listAll(),
        );
    },
);
