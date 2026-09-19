import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { createMachineProfileVersion } from "../records/machine-profile-version.js";
import { MachineProfileVersionRepository } from "../repositories/machine-profile-version-repository.js";

const CREATED_AT = 1_789_360_000_000;

const BIKE_DEFINITION = {
    id: "concept2-bike",
    name: "Concept2 BikeErg",
    activityTypeId: "cycling",
    variables: {},
};

const ROWER_DEFINITION = {
    id: "concept2-rower",
    name: "Concept2 RowErg",
    activityTypeId: "rowing",
    variables: {},
};

/** Creates a machine profile version for repository tests. */
function createVersion({
    id = "machine-profile-version-1",
    machineProfileId = "concept2-bike",
    versionNumber = 1,
    parentVersionId = undefined,
    createdAtUnixMs = CREATED_AT,
    activityTypeVersionId = "activity-type-version-1",
    activityTypeId = "cycling",
    definition = BIKE_DEFINITION,
} = {}) {
    return createMachineProfileVersion({
        id,
        machineProfileId,
        versionNumber,
        parentVersionId,
        createdAtUnixMs,
        activityTypeVersionId,
        activityTypeId,
        definition,
    });
}

test("machine-profile-version-repository", "adds and retrieves a version", () => {
    const repository = new MachineProfileVersionRepository();

    const version = createVersion();

    repository.add(version);

    assertDeepEqual(repository.getById(version.id), version);
});

test("machine-profile-version-repository", "returns undefined for a missing version", () => {
    const repository = new MachineProfileVersionRepository();

    assertEqual(repository.getById("missing"), undefined);
});

test("machine-profile-version-repository", "rejects duplicate version IDs", () => {
    const repository = new MachineProfileVersionRepository();

    repository.add(createVersion());

    assertThrows(
        () =>
            repository.add(
                createVersion({
                    definition: {
                        ...BIKE_DEFINITION,
                        name: "Updated BikeErg",
                    },
                }),
            ),
        /already exists/,
    );
});

test(
    "machine-profile-version-repository",
    "rejects duplicate version numbers within a machine profile",
    () => {
        const repository = new MachineProfileVersionRepository();

        repository.add(createVersion());

        assertThrows(
            () =>
                repository.add(
                    createVersion({
                        id: "machine-profile-version-other",
                    }),
                ),
            /versionNumber/,
        );
    },
);

test(
    "machine-profile-version-repository",
    "allows the same version number for different machine profiles",
    () => {
        const repository = new MachineProfileVersionRepository();

        const bike = createVersion();

        const rower = createVersion({
            id: "rower-version-1",
            machineProfileId: "concept2-rower",
            activityTypeVersionId: "rowing-activity-type-version-1",
            activityTypeId: "rowing",
            definition: ROWER_DEFINITION,
        });

        repository.add(bike);
        repository.add(rower);

        assertDeepEqual(repository.getById(bike.id), bike);
        assertDeepEqual(repository.getById(rower.id), rower);
    },
);

test(
    "machine-profile-version-repository",
    "lists versions for a machine profile in version order",
    () => {
        const repository = new MachineProfileVersionRepository();

        const version1 = createVersion();

        const version2 = createVersion({
            id: "machine-profile-version-2",
            versionNumber: 2,
            parentVersionId: version1.id,
            createdAtUnixMs: CREATED_AT + 1_000,
            activityTypeVersionId: "activity-type-version-2",
        });

        repository.add(version1);
        repository.add(version2);

        assertDeepEqual(repository.listByMachineProfileId("concept2-bike"), [version1, version2]);
    },
);

test(
    "machine-profile-version-repository",
    "returns an empty list for a machine profile with no versions",
    () => {
        const repository = new MachineProfileVersionRepository();

        assertDeepEqual(repository.listByMachineProfileId("concept2-bike"), []);
    },
);

test(
    "machine-profile-version-repository",
    "rejects a parent from a different machine profile",
    () => {
        const repository = new MachineProfileVersionRepository();

        const rowerVersion = createVersion({
            id: "rower-version-1",
            machineProfileId: "concept2-rower",
            activityTypeVersionId: "rowing-activity-type-version-1",
            activityTypeId: "rowing",
            definition: ROWER_DEFINITION,
        });

        repository.add(rowerVersion);

        assertThrows(
            () =>
                repository.add(
                    createVersion({
                        id: "bike-version-2",
                        versionNumber: 2,
                        parentVersionId: rowerVersion.id,
                    }),
                ),
            /machineProfileId/,
        );
    },
);

test(
    "machine-profile-version-repository",
    "rejects a parent that is not the immediate predecessor",
    () => {
        const repository = new MachineProfileVersionRepository();

        const version1 = createVersion();

        const version2 = createVersion({
            id: "machine-profile-version-2",
            versionNumber: 2,
            parentVersionId: version1.id,
            createdAtUnixMs: CREATED_AT + 1_000,
            activityTypeVersionId: "activity-type-version-2",
        });

        repository.add(version1);
        repository.add(version2);

        assertThrows(
            () =>
                repository.add(
                    createVersion({
                        id: "machine-profile-version-4",
                        versionNumber: 4,
                        parentVersionId: version2.id,
                        createdAtUnixMs: CREATED_AT + 2_000,
                        activityTypeVersionId: "activity-type-version-3",
                    }),
                ),
            /immediate predecessor/,
        );
    },
);

test("machine-profile-version-repository", "rejects a missing parent for later versions", () => {
    const repository = new MachineProfileVersionRepository();

    assertThrows(
        () =>
            repository.add(
                createVersion({
                    id: "machine-profile-version-2",
                    versionNumber: 2,
                    parentVersionId: "missing-version",
                    activityTypeVersionId: "activity-type-version-2",
                }),
            ),
        /parent/,
    );
});

test("machine-profile-version-repository", "deletes an unreferenced leaf version", () => {
    const repository = new MachineProfileVersionRepository();

    const version = createVersion();

    repository.add(version);

    assertEqual(repository.delete(version.id), true);
    assertEqual(repository.getById(version.id), undefined);
});

test("machine-profile-version-repository", "prevents deletion when a child version exists", () => {
    const repository = new MachineProfileVersionRepository();

    const version1 = createVersion();

    const version2 = createVersion({
        id: "machine-profile-version-2",
        versionNumber: 2,
        parentVersionId: version1.id,
        createdAtUnixMs: CREATED_AT + 1_000,
        activityTypeVersionId: "activity-type-version-2",
    });

    repository.add(version1);
    repository.add(version2);

    assertThrows(() => repository.delete(version1.id), /child/);
});

test("machine-profile-version-repository", "returns false when deleting a missing version", () => {
    const repository = new MachineProfileVersionRepository();

    assertEqual(repository.delete("missing"), false);
});

test(
    "machine-profile-version-repository",
    "reports references to a machine profile identity",
    () => {
        const repository = new MachineProfileVersionRepository();

        repository.add(createVersion());

        assertEqual(repository.hasMachineProfileReference("concept2-bike"), true);
        assertEqual(repository.hasMachineProfileReference("concept2-rower"), false);
    },
);

test("machine-profile-version-repository", "lists all versions in version order", () => {
    const repository = new MachineProfileVersionRepository();

    const version1 = createVersion();
    const version2 = createVersion({
        id: "machine-profile-version-2",
        versionNumber: 2,
        parentVersionId: version1.id,
        createdAtUnixMs: 2000,
    });

    repository.add(version1);
    repository.add(version2);

    assertDeepEqual(
        repository.listAll().map((version) => version.id),
        [version1.id, version2.id],
    );
});
