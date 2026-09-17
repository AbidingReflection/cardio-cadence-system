import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { createCalibrationProfileVersion } from "../records/calibration-profile-version.js";
import { CalibrationProfileVersionRepository } from "../repositories/calibration-profile-version-repository.js";

const CREATED_AT = 1_789_360_000_000;

const BIKE_CALIBRATION_DEFINITION = {
    id: "bike-calibration",
    name: "Bike Calibration",
    machineProfileId: "concept2-bike",
    context: {},
    domain: {},
    model: {},
};

const ROWER_CALIBRATION_DEFINITION = {
    id: "rower-calibration",
    name: "Rower Calibration",
    machineProfileId: "concept2-rower",
    context: {},
    domain: {},
    model: {},
};

/** Creates a calibration profile version for repository tests. */
function createVersion({
    id = "calibration-profile-version-1",
    calibrationProfileId = "bike-calibration",
    versionNumber = 1,
    parentVersionId = undefined,
    createdAtUnixMs = CREATED_AT,
    machineProfileVersionId = "machine-profile-version-1",
    machineProfileId = "concept2-bike",
    definition = BIKE_CALIBRATION_DEFINITION,
} = {}) {
    return createCalibrationProfileVersion({
        id,
        calibrationProfileId,
        versionNumber,
        parentVersionId,
        createdAtUnixMs,
        machineProfileVersionId,
        machineProfileId,
        definition,
    });
}

test("calibration-profile-version-repository", "adds and retrieves a version", () => {
    const repository = new CalibrationProfileVersionRepository();

    const version = createVersion();

    repository.add(version);

    assertDeepEqual(repository.getById(version.id), version);
});

test("calibration-profile-version-repository", "returns undefined for a missing version", () => {
    const repository = new CalibrationProfileVersionRepository();

    assertEqual(repository.getById("missing"), undefined);
});

test("calibration-profile-version-repository", "rejects duplicate version IDs", () => {
    const repository = new CalibrationProfileVersionRepository();

    repository.add(createVersion());

    assertThrows(
        () =>
            repository.add(
                createVersion({
                    definition: {
                        ...BIKE_CALIBRATION_DEFINITION,
                        name: "Updated Bike Calibration",
                    },
                }),
            ),
        /already exists/,
    );
});

test(
    "calibration-profile-version-repository",
    "rejects duplicate version numbers within a calibration profile",
    () => {
        const repository = new CalibrationProfileVersionRepository();

        repository.add(createVersion());

        assertThrows(
            () =>
                repository.add(
                    createVersion({
                        id: "calibration-profile-version-other",
                    }),
                ),
            /versionNumber/,
        );
    },
);

test(
    "calibration-profile-version-repository",
    "allows the same version number for different calibration profiles",
    () => {
        const repository = new CalibrationProfileVersionRepository();

        const bike = createVersion();

        const rower = createVersion({
            id: "rower-calibration-version-1",
            calibrationProfileId: "rower-calibration",
            machineProfileVersionId: "rower-machine-profile-version-1",
            machineProfileId: "concept2-rower",
            definition: ROWER_CALIBRATION_DEFINITION,
        });

        repository.add(bike);
        repository.add(rower);

        assertDeepEqual(repository.getById(bike.id), bike);
        assertDeepEqual(repository.getById(rower.id), rower);
    },
);

test(
    "calibration-profile-version-repository",
    "lists versions for a calibration profile in version order",
    () => {
        const repository = new CalibrationProfileVersionRepository();

        const version1 = createVersion();

        const version2 = createVersion({
            id: "calibration-profile-version-2",
            versionNumber: 2,
            parentVersionId: version1.id,
            createdAtUnixMs: CREATED_AT + 1_000,
            machineProfileVersionId: "machine-profile-version-2",
        });

        repository.add(version1);
        repository.add(version2);

        assertDeepEqual(repository.listByCalibrationProfileId("bike-calibration"), [
            version1,
            version2,
        ]);
    },
);

test(
    "calibration-profile-version-repository",
    "returns an empty list for a calibration profile with no versions",
    () => {
        const repository = new CalibrationProfileVersionRepository();

        assertDeepEqual(repository.listByCalibrationProfileId("bike-calibration"), []);
    },
);

test(
    "calibration-profile-version-repository",
    "rejects a parent from a different calibration profile",
    () => {
        const repository = new CalibrationProfileVersionRepository();

        const rowerVersion = createVersion({
            id: "rower-calibration-version-1",
            calibrationProfileId: "rower-calibration",
            machineProfileVersionId: "rower-machine-profile-version-1",
            machineProfileId: "concept2-rower",
            definition: ROWER_CALIBRATION_DEFINITION,
        });

        repository.add(rowerVersion);

        assertThrows(
            () =>
                repository.add(
                    createVersion({
                        id: "bike-calibration-version-2",
                        versionNumber: 2,
                        parentVersionId: rowerVersion.id,
                    }),
                ),
            /calibrationProfileId/,
        );
    },
);

test(
    "calibration-profile-version-repository",
    "rejects a parent that is not the immediate predecessor",
    () => {
        const repository = new CalibrationProfileVersionRepository();

        const version1 = createVersion();

        const version2 = createVersion({
            id: "calibration-profile-version-2",
            versionNumber: 2,
            parentVersionId: version1.id,
            createdAtUnixMs: CREATED_AT + 1_000,
            machineProfileVersionId: "machine-profile-version-2",
        });

        repository.add(version1);
        repository.add(version2);

        assertThrows(
            () =>
                repository.add(
                    createVersion({
                        id: "calibration-profile-version-4",
                        versionNumber: 4,
                        parentVersionId: version2.id,
                        createdAtUnixMs: CREATED_AT + 2_000,
                        machineProfileVersionId: "machine-profile-version-3",
                    }),
                ),
            /immediate predecessor/,
        );
    },
);

test(
    "calibration-profile-version-repository",
    "rejects a missing parent for later versions",
    () => {
        const repository = new CalibrationProfileVersionRepository();

        assertThrows(
            () =>
                repository.add(
                    createVersion({
                        id: "calibration-profile-version-2",
                        versionNumber: 2,
                        parentVersionId: "missing-version",
                        machineProfileVersionId: "machine-profile-version-2",
                    }),
                ),
            /parent/,
        );
    },
);

test("calibration-profile-version-repository", "deletes an unreferenced leaf version", () => {
    const repository = new CalibrationProfileVersionRepository();

    const version = createVersion();

    repository.add(version);

    assertEqual(repository.delete(version.id), true);
    assertEqual(repository.getById(version.id), undefined);
});

test(
    "calibration-profile-version-repository",
    "prevents deletion when a child version exists",
    () => {
        const repository = new CalibrationProfileVersionRepository();

        const version1 = createVersion();

        const version2 = createVersion({
            id: "calibration-profile-version-2",
            versionNumber: 2,
            parentVersionId: version1.id,
            createdAtUnixMs: CREATED_AT + 1_000,
            machineProfileVersionId: "machine-profile-version-2",
        });

        repository.add(version1);
        repository.add(version2);

        assertThrows(() => repository.delete(version1.id), /child/);
    },
);

test(
    "calibration-profile-version-repository",
    "returns false when deleting a missing version",
    () => {
        const repository = new CalibrationProfileVersionRepository();

        assertEqual(repository.delete("missing"), false);
    },
);

test(
    "calibration-profile-version-repository",
    "reports references to a calibration profile identity",
    () => {
        const repository = new CalibrationProfileVersionRepository();

        repository.add(createVersion());

        assertEqual(repository.hasCalibrationProfileReference("bike-calibration"), true);
        assertEqual(repository.hasCalibrationProfileReference("rower-calibration"), false);
    },
);
