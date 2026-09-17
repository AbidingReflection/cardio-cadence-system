import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import {
    createInitialCalibrationProfileVersion,
    createNextCalibrationProfileVersion,
} from "../services/calibration-profile-versioning.js";

const CREATED_AT = 1_789_360_000_000;

const BIKE_CALIBRATION_DEFINITION = {
    id: "bike-calibration",
    name: "Bike Calibration",
    machineProfileId: "concept2-bike",
    context: {},
    domain: {},
    model: {},
};

test("calibration-profile-versioning", "creates an initial calibration profile version", () => {
    const version = createInitialCalibrationProfileVersion({
        id: "calibration-profile-version-1",
        createdAtUnixMs: CREATED_AT,
        machineProfileVersionId: "machine-profile-version-1",
        machineProfileId: "concept2-bike",
        definition: BIKE_CALIBRATION_DEFINITION,
    });

    assertDeepEqual(version, {
        id: "calibration-profile-version-1",
        calibrationProfileId: "bike-calibration",
        versionNumber: 1,
        parentVersionId: undefined,
        createdAtUnixMs: CREATED_AT,
        machineProfileVersionId: "machine-profile-version-1",
        machineProfileId: "concept2-bike",
        definition: BIKE_CALIBRATION_DEFINITION,
    });
});

test("calibration-profile-versioning", "derives calibration profile ID from the definition", () => {
    const version = createInitialCalibrationProfileVersion({
        id: "calibration-profile-version-1",
        createdAtUnixMs: CREATED_AT,
        machineProfileVersionId: "machine-profile-version-1",
        machineProfileId: "concept2-bike",
        definition: BIKE_CALIBRATION_DEFINITION,
    });

    assertEqual(version.calibrationProfileId, BIKE_CALIBRATION_DEFINITION.id);
});

test("calibration-profile-versioning", "creates the next calibration profile version", () => {
    const parent = createInitialCalibrationProfileVersion({
        id: "calibration-profile-version-1",
        createdAtUnixMs: CREATED_AT,
        machineProfileVersionId: "machine-profile-version-1",
        machineProfileId: "concept2-bike",
        definition: BIKE_CALIBRATION_DEFINITION,
    });

    const definition = {
        ...BIKE_CALIBRATION_DEFINITION,
        name: "Updated Bike Calibration",
    };

    const version = createNextCalibrationProfileVersion({
        id: "calibration-profile-version-2",
        parentVersion: parent,
        createdAtUnixMs: CREATED_AT + 1_000,
        machineProfileVersionId: "machine-profile-version-2",
        machineProfileId: "concept2-bike",
        definition,
    });

    assertDeepEqual(version, {
        id: "calibration-profile-version-2",
        calibrationProfileId: "bike-calibration",
        versionNumber: 2,
        parentVersionId: "calibration-profile-version-1",
        createdAtUnixMs: CREATED_AT + 1_000,
        machineProfileVersionId: "machine-profile-version-2",
        machineProfileId: "concept2-bike",
        definition,
    });
});

test("calibration-profile-versioning", "inherits calibration profile ID from the parent", () => {
    const parent = createInitialCalibrationProfileVersion({
        id: "calibration-profile-version-1",
        createdAtUnixMs: CREATED_AT,
        machineProfileVersionId: "machine-profile-version-1",
        machineProfileId: "concept2-bike",
        definition: BIKE_CALIBRATION_DEFINITION,
    });

    const version = createNextCalibrationProfileVersion({
        id: "calibration-profile-version-2",
        parentVersion: parent,
        createdAtUnixMs: CREATED_AT + 1_000,
        machineProfileVersionId: "machine-profile-version-2",
        machineProfileId: "concept2-bike",
        definition: BIKE_CALIBRATION_DEFINITION,
    });

    assertEqual(version.calibrationProfileId, parent.calibrationProfileId);
});

test("calibration-profile-versioning", "increments the version number", () => {
    const parent = createInitialCalibrationProfileVersion({
        id: "calibration-profile-version-1",
        createdAtUnixMs: CREATED_AT,
        machineProfileVersionId: "machine-profile-version-1",
        machineProfileId: "concept2-bike",
        definition: BIKE_CALIBRATION_DEFINITION,
    });

    const version = createNextCalibrationProfileVersion({
        id: "calibration-profile-version-2",
        parentVersion: parent,
        createdAtUnixMs: CREATED_AT + 1_000,
        machineProfileVersionId: "machine-profile-version-2",
        machineProfileId: "concept2-bike",
        definition: BIKE_CALIBRATION_DEFINITION,
    });

    assertEqual(version.versionNumber, parent.versionNumber + 1);
});

test("calibration-profile-versioning", "sets the parent version ID", () => {
    const parent = createInitialCalibrationProfileVersion({
        id: "calibration-profile-version-1",
        createdAtUnixMs: CREATED_AT,
        machineProfileVersionId: "machine-profile-version-1",
        machineProfileId: "concept2-bike",
        definition: BIKE_CALIBRATION_DEFINITION,
    });

    const version = createNextCalibrationProfileVersion({
        id: "calibration-profile-version-2",
        parentVersion: parent,
        createdAtUnixMs: CREATED_AT + 1_000,
        machineProfileVersionId: "machine-profile-version-2",
        machineProfileId: "concept2-bike",
        definition: BIKE_CALIBRATION_DEFINITION,
    });

    assertEqual(version.parentVersionId, parent.id);
});

test(
    "calibration-profile-versioning",
    "rejects a next definition with a different calibration profile ID",
    () => {
        const parent = createInitialCalibrationProfileVersion({
            id: "calibration-profile-version-1",
            createdAtUnixMs: CREATED_AT,
            machineProfileVersionId: "machine-profile-version-1",
            machineProfileId: "concept2-bike",
            definition: BIKE_CALIBRATION_DEFINITION,
        });

        assertThrows(
            () =>
                createNextCalibrationProfileVersion({
                    id: "calibration-profile-version-2",
                    parentVersion: parent,
                    createdAtUnixMs: CREATED_AT + 1_000,
                    machineProfileVersionId: "machine-profile-version-2",
                    machineProfileId: "concept2-bike",
                    definition: {
                        ...BIKE_CALIBRATION_DEFINITION,
                        id: "other-calibration",
                    },
                }),
            /calibrationProfileId|definition id/,
        );
    },
);

test(
    "calibration-profile-versioning",
    "rejects a next version with a different machine profile identity",
    () => {
        const parent = createInitialCalibrationProfileVersion({
            id: "calibration-profile-version-1",
            createdAtUnixMs: CREATED_AT,
            machineProfileVersionId: "machine-profile-version-1",
            machineProfileId: "concept2-bike",
            definition: BIKE_CALIBRATION_DEFINITION,
        });

        assertThrows(
            () =>
                createNextCalibrationProfileVersion({
                    id: "calibration-profile-version-2",
                    parentVersion: parent,
                    createdAtUnixMs: CREATED_AT + 1_000,
                    machineProfileVersionId: "rower-machine-profile-version-1",
                    machineProfileId: "concept2-rower",
                    definition: {
                        ...BIKE_CALIBRATION_DEFINITION,
                        machineProfileId: "concept2-rower",
                    },
                }),
            /machineProfileId/,
        );
    },
);

test(
    "calibration-profile-versioning",
    "does not mutate the supplied definition or parent version",
    () => {
        const parent = createInitialCalibrationProfileVersion({
            id: "calibration-profile-version-1",
            createdAtUnixMs: CREATED_AT,
            machineProfileVersionId: "machine-profile-version-1",
            machineProfileId: "concept2-bike",
            definition: BIKE_CALIBRATION_DEFINITION,
        });

        const originalParent = structuredClone(parent);

        const definition = {
            ...BIKE_CALIBRATION_DEFINITION,
            name: "Updated Bike Calibration",
        };

        const originalDefinition = structuredClone(definition);

        createNextCalibrationProfileVersion({
            id: "calibration-profile-version-2",
            parentVersion: parent,
            createdAtUnixMs: CREATED_AT + 1_000,
            machineProfileVersionId: "machine-profile-version-2",
            machineProfileId: "concept2-bike",
            definition,
        });

        assertDeepEqual(parent, originalParent);
        assertDeepEqual(definition, originalDefinition);
    },
);
