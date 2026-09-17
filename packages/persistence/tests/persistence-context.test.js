import { assertEqual, assertThrows, test } from "/packages/js-testing/framework/test-framework.js";

import { PersistenceContext } from "../persistence-context.js";
import { ActivityTypeVersionRepository } from "../repositories/activity-type-version-repository.js";
import { MachineProfileVersionRepository } from "../repositories/machine-profile-version-repository.js";

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
