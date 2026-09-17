import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { PersistenceContext } from "../persistence-context.js";
import { LibraryPersistence } from "../services/library-persistence.js";

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

function createLibraryPersistence({ ids = [], times = [CREATED_AT] } = {}) {
    const context = new PersistenceContext();

    let idIndex = 0;
    let timeIndex = 0;

    return new LibraryPersistence({
        protocolFamilyRepository: context.protocolFamilies,
        plannedProtocolVersionRepository: context.plannedProtocolVersions,
        executedProtocolRepository: context.executedProtocols,
        activityTypeVersionRepository: context.activityTypeVersions,
        machineProfileVersionRepository: context.machineProfileVersions,
        calibrationProfileVersionRepository: context.calibrationProfileVersions,
        idGenerator: () => ids[idIndex++],
        clock: () => times[timeIndex++],
    });
}

/** Creates the machine profile version required by calibration profile tests. */
async function createMachineProfileVersion(persistence) {
    const activityTypeVersion = await persistence.createInitialActivityTypeVersion({
        definition: CYCLING_DEFINITION,
    });

    return persistence.createInitialMachineProfileVersion({
        activityTypeVersionId: activityTypeVersion.id,
        definition: BIKE_DEFINITION,
    });
}

test(
    "library-persistence-calibration-profile-version",
    "creates and retrieves an initial calibration profile version",
    async () => {
        const persistence = createLibraryPersistence({
            ids: [
                "activity-type-version-1",
                "machine-profile-version-1",
                "calibration-profile-version-1",
            ],
            times: [CREATED_AT, CREATED_AT + 1_000, CREATED_AT + 2_000],
        });

        const machineProfileVersion = await createMachineProfileVersion(persistence);

        const version = await persistence.createInitialCalibrationProfileVersion({
            machineProfileVersionId: machineProfileVersion.id,
            definition: BIKE_CALIBRATION_DEFINITION,
        });

        assertDeepEqual(version, {
            id: "calibration-profile-version-1",
            calibrationProfileId: "bike-calibration",
            versionNumber: 1,
            parentVersionId: undefined,
            createdAtUnixMs: CREATED_AT + 2_000,
            machineProfileVersionId: "machine-profile-version-1",
            machineProfileId: "concept2-bike",
            definition: BIKE_CALIBRATION_DEFINITION,
        });

        assertDeepEqual(
            await persistence.getCalibrationProfileVersion("calibration-profile-version-1"),
            version,
        );
    },
);

test(
    "library-persistence-calibration-profile-version",
    "creates the next calibration profile version from an explicit parent",
    async () => {
        const persistence = createLibraryPersistence({
            ids: [
                "activity-type-version-1",
                "machine-profile-version-1",
                "calibration-profile-version-1",
                "calibration-profile-version-2",
            ],
            times: [CREATED_AT, CREATED_AT + 1_000, CREATED_AT + 2_000, CREATED_AT + 3_000],
        });

        const machineProfileVersion = await createMachineProfileVersion(persistence);

        const parent = await persistence.createInitialCalibrationProfileVersion({
            machineProfileVersionId: machineProfileVersion.id,
            definition: BIKE_CALIBRATION_DEFINITION,
        });

        const definition = {
            ...BIKE_CALIBRATION_DEFINITION,
            name: "Updated Bike Calibration",
        };

        const version = await persistence.createNextCalibrationProfileVersion({
            parentVersionId: parent.id,
            machineProfileVersionId: machineProfileVersion.id,
            definition,
        });

        assertDeepEqual(version, {
            id: "calibration-profile-version-2",
            calibrationProfileId: "bike-calibration",
            versionNumber: 2,
            parentVersionId: "calibration-profile-version-1",
            createdAtUnixMs: CREATED_AT + 3_000,
            machineProfileVersionId: "machine-profile-version-1",
            machineProfileId: "concept2-bike",
            definition,
        });
    },
);

test(
    "library-persistence-calibration-profile-version",
    "lists calibration profile versions in version order",
    async () => {
        const persistence = createLibraryPersistence({
            ids: [
                "activity-type-version-1",
                "machine-profile-version-1",
                "calibration-profile-version-1",
                "calibration-profile-version-2",
            ],
            times: [CREATED_AT, CREATED_AT + 1_000, CREATED_AT + 2_000, CREATED_AT + 3_000],
        });

        const machineProfileVersion = await createMachineProfileVersion(persistence);

        const version1 = await persistence.createInitialCalibrationProfileVersion({
            machineProfileVersionId: machineProfileVersion.id,
            definition: BIKE_CALIBRATION_DEFINITION,
        });

        const version2 = await persistence.createNextCalibrationProfileVersion({
            parentVersionId: version1.id,
            machineProfileVersionId: machineProfileVersion.id,
            definition: {
                ...BIKE_CALIBRATION_DEFINITION,
                name: "Updated Bike Calibration",
            },
        });

        assertDeepEqual(await persistence.listCalibrationProfileVersions("bike-calibration"), [
            version1,
            version2,
        ]);
    },
);

test(
    "library-persistence-calibration-profile-version",
    "rejects creation from a missing parent version",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["activity-type-version-1", "machine-profile-version-1"],
            times: [CREATED_AT, CREATED_AT + 1_000],
        });

        const machineProfileVersion = await createMachineProfileVersion(persistence);

        let error;

        try {
            await persistence.createNextCalibrationProfileVersion({
                parentVersionId: "missing-version",
                machineProfileVersionId: machineProfileVersion.id,
                definition: BIKE_CALIBRATION_DEFINITION,
            });
        } catch (caughtError) {
            error = caughtError;
        }

        assertEqual(error instanceof Error, true);
        assertEqual(
            error.message,
            'Parent CalibrationProfileVersion "missing-version" does not exist.',
        );
    },
);

test(
    "library-persistence-calibration-profile-version",
    "rejects creation for a missing machine profile version",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["calibration-profile-version-1"],
            times: [CREATED_AT],
        });

        let error;

        try {
            await persistence.createInitialCalibrationProfileVersion({
                machineProfileVersionId: "missing-machine-profile-version",
                definition: BIKE_CALIBRATION_DEFINITION,
            });
        } catch (caughtError) {
            error = caughtError;
        }

        assertEqual(error instanceof Error, true);
        assertEqual(
            error.message,
            'MachineProfileVersion "missing-machine-profile-version" does not exist.',
        );
    },
);

test(
    "library-persistence-calibration-profile-version",
    "rejects a machine profile version from a different logical machine",
    async () => {
        const persistence = createLibraryPersistence({
            ids: [
                "activity-type-version-1",
                "machine-profile-version-1",
                "calibration-profile-version-1",
            ],
            times: [CREATED_AT, CREATED_AT + 1_000, CREATED_AT + 2_000],
        });

        const activityTypeVersion = await persistence.createInitialActivityTypeVersion({
            definition: CYCLING_DEFINITION,
        });

        const rowerMachineProfileVersion = await persistence.createInitialMachineProfileVersion({
            activityTypeVersionId: activityTypeVersion.id,
            definition: {
                id: "concept2-rower",
                name: "Concept2 RowErg",
                activityTypeId: "cycling",
                variables: {},
            },
        });

        let error;

        try {
            await persistence.createInitialCalibrationProfileVersion({
                machineProfileVersionId: rowerMachineProfileVersion.id,
                definition: BIKE_CALIBRATION_DEFINITION,
            });
        } catch (caughtError) {
            error = caughtError;
        }

        assertEqual(error instanceof Error, true);
        assertEqual(/machineProfileId/.test(error.message), true);
    },
);

test(
    "library-persistence-calibration-profile-version",
    "generates calibration profile version identity and creation time",
    async () => {
        const persistence = createLibraryPersistence({
            ids: [
                "activity-type-version-1",
                "machine-profile-version-1",
                "calibration-profile-version-generated",
            ],
            times: [CREATED_AT, CREATED_AT + 1_000, CREATED_AT + 5_000],
        });

        const machineProfileVersion = await createMachineProfileVersion(persistence);

        const version = await persistence.createInitialCalibrationProfileVersion({
            machineProfileVersionId: machineProfileVersion.id,
            definition: BIKE_CALIBRATION_DEFINITION,
        });

        assertEqual(version.id, "calibration-profile-version-generated");
        assertEqual(version.createdAtUnixMs, CREATED_AT + 5_000);
    },
);
