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
        idGenerator: () => ids[idIndex++],
        clock: () => times[timeIndex++],
    });
}

/** Creates the activity type version required by machine profile tests. */
async function createActivityTypeVersion(persistence) {
    return persistence.createInitialActivityTypeVersion({
        definition: CYCLING_DEFINITION,
    });
}

test(
    "library-persistence-machine-profile-version",
    "creates and retrieves an initial machine profile version",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["activity-type-version-1", "machine-profile-version-1"],
            times: [CREATED_AT, CREATED_AT + 1_000],
        });

        const activityTypeVersion = await createActivityTypeVersion(persistence);

        const version = await persistence.createInitialMachineProfileVersion({
            activityTypeVersionId: activityTypeVersion.id,
            definition: BIKE_DEFINITION,
        });

        assertDeepEqual(version, {
            id: "machine-profile-version-1",
            machineProfileId: "concept2-bike",
            versionNumber: 1,
            parentVersionId: undefined,
            createdAtUnixMs: CREATED_AT + 1_000,
            activityTypeVersionId: "activity-type-version-1",
            activityTypeId: "cycling",
            definition: BIKE_DEFINITION,
        });

        assertDeepEqual(
            await persistence.getMachineProfileVersion("machine-profile-version-1"),
            version,
        );
    },
);

test(
    "library-persistence-machine-profile-version",
    "creates the next machine profile version from an explicit parent",
    async () => {
        const persistence = createLibraryPersistence({
            ids: [
                "activity-type-version-1",
                "machine-profile-version-1",
                "machine-profile-version-2",
            ],
            times: [CREATED_AT, CREATED_AT + 1_000, CREATED_AT + 2_000],
        });

        const activityTypeVersion = await createActivityTypeVersion(persistence);

        const parent = await persistence.createInitialMachineProfileVersion({
            activityTypeVersionId: activityTypeVersion.id,
            definition: BIKE_DEFINITION,
        });

        const definition = {
            ...BIKE_DEFINITION,
            name: "Updated BikeErg",
        };

        const version = await persistence.createNextMachineProfileVersion({
            parentVersionId: parent.id,
            activityTypeVersionId: activityTypeVersion.id,
            definition,
        });

        assertDeepEqual(version, {
            id: "machine-profile-version-2",
            machineProfileId: "concept2-bike",
            versionNumber: 2,
            parentVersionId: "machine-profile-version-1",
            createdAtUnixMs: CREATED_AT + 2_000,
            activityTypeVersionId: "activity-type-version-1",
            activityTypeId: "cycling",
            definition,
        });
    },
);

test(
    "library-persistence-machine-profile-version",
    "lists machine profile versions in version order",
    async () => {
        const persistence = createLibraryPersistence({
            ids: [
                "activity-type-version-1",
                "machine-profile-version-1",
                "machine-profile-version-2",
            ],
            times: [CREATED_AT, CREATED_AT + 1_000, CREATED_AT + 2_000],
        });

        const activityTypeVersion = await createActivityTypeVersion(persistence);

        const version1 = await persistence.createInitialMachineProfileVersion({
            activityTypeVersionId: activityTypeVersion.id,
            definition: BIKE_DEFINITION,
        });

        const version2 = await persistence.createNextMachineProfileVersion({
            parentVersionId: version1.id,
            activityTypeVersionId: activityTypeVersion.id,
            definition: {
                ...BIKE_DEFINITION,
                name: "Updated BikeErg",
            },
        });

        assertDeepEqual(await persistence.listMachineProfileVersions("concept2-bike"), [
            version1,
            version2,
        ]);
    },
);

test(
    "library-persistence-machine-profile-version",
    "rejects creation from a missing parent version",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["activity-type-version-1"],
            times: [CREATED_AT],
        });

        const activityTypeVersion = await createActivityTypeVersion(persistence);

        let error;

        try {
            await persistence.createNextMachineProfileVersion({
                parentVersionId: "missing-version",
                activityTypeVersionId: activityTypeVersion.id,
                definition: BIKE_DEFINITION,
            });
        } catch (caughtError) {
            error = caughtError;
        }

        assertEqual(error instanceof Error, true);
        assertEqual(
            error.message,
            'Parent MachineProfileVersion "missing-version" does not exist.',
        );
    },
);

test(
    "library-persistence-machine-profile-version",
    "rejects creation for a missing activity type version",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["machine-profile-version-1"],
            times: [CREATED_AT],
        });

        let error;

        try {
            await persistence.createInitialMachineProfileVersion({
                activityTypeVersionId: "missing-activity-type-version",
                definition: BIKE_DEFINITION,
            });
        } catch (caughtError) {
            error = caughtError;
        }

        assertEqual(error instanceof Error, true);
        assertEqual(
            error.message,
            'ActivityTypeVersion "missing-activity-type-version" does not exist.',
        );
    },
);

test(
    "library-persistence-machine-profile-version",
    "rejects an activity type version from a different logical activity type",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["activity-type-version-1", "machine-profile-version-1"],
            times: [CREATED_AT, CREATED_AT + 1_000],
        });

        const runningVersion = await persistence.createInitialActivityTypeVersion({
            definition: {
                id: "running",
                name: "Running",
                variables: [],
            },
        });

        let error;

        try {
            await persistence.createInitialMachineProfileVersion({
                activityTypeVersionId: runningVersion.id,
                definition: BIKE_DEFINITION,
            });
        } catch (caughtError) {
            error = caughtError;
        }

        assertEqual(error instanceof Error, true);
        assertEqual(/activityTypeId/.test(error.message), true);
    },
);

test(
    "library-persistence-machine-profile-version",
    "generates machine profile version identity and creation time",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["activity-type-version-1", "machine-profile-version-generated"],
            times: [CREATED_AT, CREATED_AT + 5_000],
        });

        const activityTypeVersion = await createActivityTypeVersion(persistence);

        const version = await persistence.createInitialMachineProfileVersion({
            activityTypeVersionId: activityTypeVersion.id,
            definition: BIKE_DEFINITION,
        });

        assertEqual(version.id, "machine-profile-version-generated");
        assertEqual(version.createdAtUnixMs, CREATED_AT + 5_000);
    },
);
