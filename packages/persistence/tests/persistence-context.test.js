import {
    assertEqual,
    assertDeepEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { PersistenceContext } from "../persistence-context.js";
import { ActivityTypeVersionRepository } from "../repositories/activity-type-version-repository.js";
import { MachineProfileVersionRepository } from "../repositories/machine-profile-version-repository.js";
import { CalibrationProfileVersionRepository } from "../repositories/calibration-profile-version-repository.js";
import { PersistenceService } from "../services/persistence-service.js";
import { DomainVersionSync } from "../services/domain-version-sync.js";
import { LibraryPersistence } from "../services/library-persistence.js";

const FAMILY = {
    id: "family-1",
    createdAtUnixMs: 1_789_360_000_000,
    displayName: "Threshold Intervals",
    archived: false,
};

const PLANNED_VERSION = {
    id: "planned-version-1",
    protocolFamilyId: FAMILY.id,
    versionNumber: 1,
    parentVersionId: undefined,
    createdAtUnixMs: 1_789_360_100_000,
    protocol: {
        id: "protocol-1",
        name: "Threshold Intervals",
        phases: [],
    },
    dependencies: {
        activityTypeVersionId: "activity-type-version-1",
    },
};

const EXECUTION = {
    id: "execution-1",
    plannedProtocolVersionId: PLANNED_VERSION.id,
    status: "completed",
    startedAtUnixMs: 1_789_360_200_000,
    endedAtUnixMs: 1_789_360_500_000,
    lastKnownActiveAtUnixMs: 1_789_360_500_000,
    events: [],
};

test("persistence-context", "exposes all repositories", () => {
    const persistence = new PersistenceContext();

    assertEqual(persistence.protocolFamilies !== undefined, true);
    assertEqual(persistence.plannedProtocolVersions !== undefined, true);
    assertEqual(persistence.executedProtocols !== undefined, true);
    assertEqual(persistence.activityTypeVersions !== undefined, true);
    assertEqual(persistence.machineProfileVersions !== undefined, true);
    assertEqual(persistence.calibrationProfileVersions !== undefined, true);
});

test(
    "persistence-context",
    "prevents deleting a protocol family referenced by a planned version",
    () => {
        const persistence = new PersistenceContext();

        persistence.protocolFamilies.add(FAMILY);
        persistence.plannedProtocolVersions.add(PLANNED_VERSION);

        assertThrows(() => persistence.protocolFamilies.delete(FAMILY.id), /referenced/);
    },
);

test(
    "persistence-context",
    "prevents deleting a planned version referenced by an execution",
    () => {
        const persistence = new PersistenceContext();

        persistence.protocolFamilies.add(FAMILY);
        persistence.plannedProtocolVersions.add(PLANNED_VERSION);
        persistence.executedProtocols.add(EXECUTION);

        assertThrows(
            () => persistence.plannedProtocolVersions.delete(PLANNED_VERSION.id),
            /referenced/,
        );
    },
);

test("persistence-context", "deletes an unreferenced protocol family", () => {
    const persistence = new PersistenceContext();

    persistence.protocolFamilies.add(FAMILY);

    assertEqual(persistence.protocolFamilies.delete(FAMILY.id), true);
});

test("persistence-context", "deletes an unreferenced planned version", () => {
    const persistence = new PersistenceContext();

    persistence.plannedProtocolVersions.add(PLANNED_VERSION);

    assertEqual(persistence.plannedProtocolVersions.delete(PLANNED_VERSION.id), true);
});

test("persistence-context", "exposes a machine profile version repository", () => {
    const context = new PersistenceContext();

    assertEqual(context.machineProfileVersions instanceof MachineProfileVersionRepository, true);
});

test("persistence-context", "exposes a calibration profile version repository", () => {
    const context = new PersistenceContext();

    assertEqual(
        context.calibrationProfileVersions instanceof CalibrationProfileVersionRepository,
        true,
    );
});

test("persistence-context", "exposes a configured persistence service", () => {
    const context = new PersistenceContext({
        idGenerator: () => "id-1",
        clock: () => 1000,
    });

    assertEqual(context.service instanceof PersistenceService, true);
});

test("persistence-context", "service operations persist through context repositories", () => {
    const ids = ["family-1", "version-1"];
    const timestamps = [1000, 2000];

    let idIndex = 0;
    let timestampIndex = 0;

    const context = new PersistenceContext({
        idGenerator: () => ids[idIndex++],
        clock: () => timestamps[timestampIndex++],
    });

    const result = context.service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: {
            name: "Base Protocol",
        },
        dependencies: {
            activityTypeVersionId: "activity-type-version-1",
        },
    });

    assertDeepEqual(context.protocolFamilies.getById("family-1"), result.protocolFamily);

    assertDeepEqual(
        context.plannedProtocolVersions.getById("version-1"),
        result.plannedProtocolVersion,
    );
});

test(
    "persistence-context",
    "exposes configured library persistence and domain version sync",
    () => {
        const context = new PersistenceContext({
            idGenerator: () => "generated-id",
            clock: () => 1000,
        });

        assertEqual(context.libraryPersistence instanceof LibraryPersistence, true);
        assertEqual(context.domainVersionSync instanceof DomainVersionSync, true);
    },
);

test(
    "persistence-context",
    "domain version sync persists through context repositories",
    async () => {
        const ids = [
            "activity-type-version-1",
            "machine-profile-version-1",
            "calibration-profile-version-1",
        ];

        const context = new PersistenceContext({
            idGenerator: () => ids.shift(),
            clock: () => 1000,
        });

        const activityType = {
            id: "cycling",
            getDefinition() {
                return {
                    id: "cycling",
                    name: "Cycling",
                    variables: [],
                };
            },
        };

        const dependencies = await context.domainVersionSync.resolveDependencies({
            activityType,
        });

        assertEqual(dependencies.activityTypeVersionId, "activity-type-version-1");

        assertEqual(
            context.activityTypeVersions.getById("activity-type-version-1").id,
            "activity-type-version-1",
        );
    },
);
