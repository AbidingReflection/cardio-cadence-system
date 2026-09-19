/** Tests persistence snapshot creation and hydration. */

import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "../../js-testing/framework/test-framework.js";

import {
    createPersistenceSnapshot,
    hydratePersistenceSnapshot,
} from "../storage/persistence-snapshot.js";

import { PersistenceContext } from "../persistence-context.js";

const CREATED_AT = 1_789_360_000_000;

const CYCLING_DEFINITION = {
    id: "cycling",
    name: "Cycling",
    variables: [],
};

const BIKE_DEFINITION = {
    id: "concept2-bike",
    name: "Concept2 BikeErg",
    activityTypeId: "cycling",
    variables: {},
};

const BIKE_CALIBRATION_DEFINITION = {
    id: "bike-calibration",
    name: "Bike Calibration",
    machineProfileId: "concept2-bike",
    context: {},
    domain: {},
    model: {},
};

/** Creates repository stubs containing representative persistence records. */
function createRepositoryStubs() {
    return {
        protocolFamilyRepository: {
            list() {
                return [{ id: "family-1" }];
            },
        },

        plannedProtocolVersionRepository: {
            listAll() {
                return [{ id: "planned-version-1" }];
            },
        },

        executedProtocolRepository: {
            listAll() {
                return [{ id: "execution-1" }];
            },
        },

        activityTypeVersionRepository: {
            listAll() {
                return [{ id: "activity-version-1" }];
            },
        },

        machineProfileVersionRepository: {
            listAll() {
                return [{ id: "machine-version-1" }];
            },
        },

        calibrationProfileVersionRepository: {
            listAll() {
                return [{ id: "calibration-version-1" }];
            },
        },
    };
}

/** Creates repository stubs with no persisted records. */
function createEmptyRepositoryStubs() {
    return {
        protocolFamilyRepository: {
            list() {
                return [];
            },
        },

        plannedProtocolVersionRepository: {
            listAll() {
                return [];
            },
        },

        executedProtocolRepository: {
            listAll() {
                return [];
            },
        },

        activityTypeVersionRepository: {
            listAll() {
                return [];
            },
        },

        machineProfileVersionRepository: {
            listAll() {
                return [];
            },
        },

        calibrationProfileVersionRepository: {
            listAll() {
                return [];
            },
        },
    };
}

test("persistence-snapshot", "creates a versioned snapshot of all repository state", () => {
    const snapshot = createPersistenceSnapshot(createRepositoryStubs());

    assertDeepEqual(snapshot, {
        schemaVersion: 1,
        protocolFamilies: [{ id: "family-1" }],
        plannedProtocolVersions: [{ id: "planned-version-1" }],
        executedProtocols: [{ id: "execution-1" }],
        activityTypeVersions: [{ id: "activity-version-1" }],
        machineProfileVersions: [{ id: "machine-version-1" }],
        calibrationProfileVersions: [{ id: "calibration-version-1" }],
    });
});

test("persistence-snapshot", "creates empty arrays for empty repositories", () => {
    const snapshot = createPersistenceSnapshot(createEmptyRepositoryStubs());

    assertEqual(snapshot.schemaVersion, 1);

    assertDeepEqual(snapshot.protocolFamilies, []);
    assertDeepEqual(snapshot.plannedProtocolVersions, []);
    assertDeepEqual(snapshot.executedProtocols, []);
    assertDeepEqual(snapshot.activityTypeVersions, []);
    assertDeepEqual(snapshot.machineProfileVersions, []);
    assertDeepEqual(snapshot.calibrationProfileVersions, []);
});

test("persistence-snapshot", "hydrates all repository state from a snapshot", () => {
    const calls = [];

    const repositories = {
        protocolFamilyRepository: {
            add(record) {
                calls.push(["protocolFamily", record.id]);
            },
        },

        plannedProtocolVersionRepository: {
            add(record) {
                calls.push(["plannedProtocolVersion", record.id]);
            },
        },

        executedProtocolRepository: {
            add(record) {
                calls.push(["executedProtocol", record.id]);
            },
        },

        activityTypeVersionRepository: {
            add(record) {
                calls.push(["activityTypeVersion", record.id]);
            },
        },

        machineProfileVersionRepository: {
            add(record) {
                calls.push(["machineProfileVersion", record.id]);
            },
        },

        calibrationProfileVersionRepository: {
            add(record) {
                calls.push(["calibrationProfileVersion", record.id]);
            },
        },
    };

    hydratePersistenceSnapshot(
        {
            schemaVersion: 1,
            protocolFamilies: [{ id: "family-1" }],
            plannedProtocolVersions: [{ id: "planned-version-1" }],
            executedProtocols: [{ id: "execution-1" }],
            activityTypeVersions: [{ id: "activity-version-1" }],
            machineProfileVersions: [{ id: "machine-version-1" }],
            calibrationProfileVersions: [{ id: "calibration-version-1" }],
        },
        repositories,
    );

    assertDeepEqual(calls, [
        ["activityTypeVersion", "activity-version-1"],
        ["machineProfileVersion", "machine-version-1"],
        ["calibrationProfileVersion", "calibration-version-1"],
        ["protocolFamily", "family-1"],
        ["plannedProtocolVersion", "planned-version-1"],
        ["executedProtocol", "execution-1"],
    ]);
});

test("persistence-snapshot", "rejects an unsupported schema version", () => {
    const repositories = {
        protocolFamilyRepository: { add() {} },
        plannedProtocolVersionRepository: { add() {} },
        executedProtocolRepository: { add() {} },
        activityTypeVersionRepository: { add() {} },
        machineProfileVersionRepository: { add() {} },
        calibrationProfileVersionRepository: { add() {} },
    };

    assertThrows(
        () =>
            hydratePersistenceSnapshot(
                {
                    schemaVersion: 999,
                    protocolFamilies: [],
                    plannedProtocolVersions: [],
                    executedProtocols: [],
                    activityTypeVersions: [],
                    machineProfileVersions: [],
                    calibrationProfileVersions: [],
                },
                repositories,
            ),
        /schemaVersion/,
    );
});

test("persistence-snapshot", "round trips real repository state", async () => {
    let nextId = 1;
    let now = CREATED_AT;

    const sourceContext = new PersistenceContext({
        idGenerator: () => `id-${nextId++}`,
        clock: () => now++,
    });

    const activityTypeVersion =
        await sourceContext.libraryPersistence.createInitialActivityTypeVersion({
            definition: CYCLING_DEFINITION,
        });

    const machineProfileVersion =
        await sourceContext.libraryPersistence.createInitialMachineProfileVersion({
            activityTypeVersionId: activityTypeVersion.id,
            definition: BIKE_DEFINITION,
        });

    const calibrationProfileVersion =
        await sourceContext.libraryPersistence.createInitialCalibrationProfileVersion({
            machineProfileVersionId: machineProfileVersion.id,
            definition: BIKE_CALIBRATION_DEFINITION,
        });

    const { plannedProtocolVersion } = sourceContext.service.createProtocolFamilyWithInitialVersion(
        {
            displayName: "Threshold Intervals",
            protocol: {
                id: "protocol-1",
                name: "Threshold Intervals",
            },
            dependencies: {
                activityTypeVersionId: activityTypeVersion.id,
                machineProfileVersionId: machineProfileVersion.id,
                calibrationProfileVersionId: calibrationProfileVersion.id,
            },
            changeSummary: "Initial version",
        },
    );

    const execution = sourceContext.service.startExecution({
        plannedProtocolVersionId: plannedProtocolVersion.id,
    });

    sourceContext.service.completeExecution(execution.id);

    const sourceSnapshot = createPersistenceSnapshot({
        protocolFamilyRepository: sourceContext.protocolFamilies,
        plannedProtocolVersionRepository: sourceContext.plannedProtocolVersions,
        executedProtocolRepository: sourceContext.executedProtocols,
        activityTypeVersionRepository: sourceContext.activityTypeVersions,
        machineProfileVersionRepository: sourceContext.machineProfileVersions,
        calibrationProfileVersionRepository: sourceContext.calibrationProfileVersions,
    });

    const restoredContext = new PersistenceContext();

    hydratePersistenceSnapshot(sourceSnapshot, {
        protocolFamilyRepository: restoredContext.protocolFamilies,
        plannedProtocolVersionRepository: restoredContext.plannedProtocolVersions,
        executedProtocolRepository: restoredContext.executedProtocols,
        activityTypeVersionRepository: restoredContext.activityTypeVersions,
        machineProfileVersionRepository: restoredContext.machineProfileVersions,
        calibrationProfileVersionRepository: restoredContext.calibrationProfileVersions,
    });

    const restoredSnapshot = createPersistenceSnapshot({
        protocolFamilyRepository: restoredContext.protocolFamilies,
        plannedProtocolVersionRepository: restoredContext.plannedProtocolVersions,
        executedProtocolRepository: restoredContext.executedProtocols,
        activityTypeVersionRepository: restoredContext.activityTypeVersions,
        machineProfileVersionRepository: restoredContext.machineProfileVersions,
        calibrationProfileVersionRepository: restoredContext.calibrationProfileVersions,
    });

    assertDeepEqual(restoredSnapshot, sourceSnapshot);
});
