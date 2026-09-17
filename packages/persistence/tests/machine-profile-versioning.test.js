import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import {
    createInitialMachineProfileVersion,
    createNextMachineProfileVersion,
} from "../services/machine-profile-versioning.js";

const CREATED_AT = 1_789_360_000_000;

const BIKE_DEFINITION = {
    id: "concept2-bike",
    name: "Concept2 BikeErg",
    activityTypeId: "cycling",
    variables: {},
};

test("machine-profile-versioning", "creates an initial machine profile version", () => {
    const version = createInitialMachineProfileVersion({
        id: "machine-profile-version-1",
        createdAtUnixMs: CREATED_AT,
        activityTypeVersionId: "activity-type-version-1",
        activityTypeId: "cycling",
        definition: BIKE_DEFINITION,
    });

    assertDeepEqual(version, {
        id: "machine-profile-version-1",
        machineProfileId: "concept2-bike",
        versionNumber: 1,
        parentVersionId: undefined,
        createdAtUnixMs: CREATED_AT,
        activityTypeVersionId: "activity-type-version-1",
        activityTypeId: "cycling",
        definition: BIKE_DEFINITION,
    });
});

test("machine-profile-versioning", "derives machine profile ID from the definition", () => {
    const version = createInitialMachineProfileVersion({
        id: "machine-profile-version-1",
        createdAtUnixMs: CREATED_AT,
        activityTypeVersionId: "activity-type-version-1",
        activityTypeId: "cycling",
        definition: BIKE_DEFINITION,
    });

    assertEqual(version.machineProfileId, BIKE_DEFINITION.id);
});

test("machine-profile-versioning", "creates the next machine profile version", () => {
    const parent = createInitialMachineProfileVersion({
        id: "machine-profile-version-1",
        createdAtUnixMs: CREATED_AT,
        activityTypeVersionId: "activity-type-version-1",
        activityTypeId: "cycling",
        definition: BIKE_DEFINITION,
    });

    const definition = {
        ...BIKE_DEFINITION,
        name: "Updated BikeErg",
    };

    const version = createNextMachineProfileVersion({
        id: "machine-profile-version-2",
        parentVersion: parent,
        createdAtUnixMs: CREATED_AT + 1_000,
        activityTypeVersionId: "activity-type-version-2",
        activityTypeId: "cycling",
        definition,
    });

    assertDeepEqual(version, {
        id: "machine-profile-version-2",
        machineProfileId: "concept2-bike",
        versionNumber: 2,
        parentVersionId: "machine-profile-version-1",
        createdAtUnixMs: CREATED_AT + 1_000,
        activityTypeVersionId: "activity-type-version-2",
        activityTypeId: "cycling",
        definition,
    });
});

test("machine-profile-versioning", "inherits machine profile ID from the parent", () => {
    const parent = createInitialMachineProfileVersion({
        id: "machine-profile-version-1",
        createdAtUnixMs: CREATED_AT,
        activityTypeVersionId: "activity-type-version-1",
        activityTypeId: "cycling",
        definition: BIKE_DEFINITION,
    });

    const version = createNextMachineProfileVersion({
        id: "machine-profile-version-2",
        parentVersion: parent,
        createdAtUnixMs: CREATED_AT + 1_000,
        activityTypeVersionId: "activity-type-version-2",
        activityTypeId: "cycling",
        definition: BIKE_DEFINITION,
    });

    assertEqual(version.machineProfileId, parent.machineProfileId);
});

test("machine-profile-versioning", "increments the version number", () => {
    const parent = createInitialMachineProfileVersion({
        id: "machine-profile-version-1",
        createdAtUnixMs: CREATED_AT,
        activityTypeVersionId: "activity-type-version-1",
        activityTypeId: "cycling",
        definition: BIKE_DEFINITION,
    });

    const version = createNextMachineProfileVersion({
        id: "machine-profile-version-2",
        parentVersion: parent,
        createdAtUnixMs: CREATED_AT + 1_000,
        activityTypeVersionId: "activity-type-version-2",
        activityTypeId: "cycling",
        definition: BIKE_DEFINITION,
    });

    assertEqual(version.versionNumber, parent.versionNumber + 1);
});

test("machine-profile-versioning", "sets the parent version ID", () => {
    const parent = createInitialMachineProfileVersion({
        id: "machine-profile-version-1",
        createdAtUnixMs: CREATED_AT,
        activityTypeVersionId: "activity-type-version-1",
        activityTypeId: "cycling",
        definition: BIKE_DEFINITION,
    });

    const version = createNextMachineProfileVersion({
        id: "machine-profile-version-2",
        parentVersion: parent,
        createdAtUnixMs: CREATED_AT + 1_000,
        activityTypeVersionId: "activity-type-version-2",
        activityTypeId: "cycling",
        definition: BIKE_DEFINITION,
    });

    assertEqual(version.parentVersionId, parent.id);
});

test(
    "machine-profile-versioning",
    "rejects a next definition with a different machine profile ID",
    () => {
        const parent = createInitialMachineProfileVersion({
            id: "machine-profile-version-1",
            createdAtUnixMs: CREATED_AT,
            activityTypeVersionId: "activity-type-version-1",
            activityTypeId: "cycling",
            definition: BIKE_DEFINITION,
        });

        assertThrows(
            () =>
                createNextMachineProfileVersion({
                    id: "machine-profile-version-2",
                    parentVersion: parent,
                    createdAtUnixMs: CREATED_AT + 1_000,
                    activityTypeVersionId: "activity-type-version-2",
                    activityTypeId: "cycling",
                    definition: {
                        ...BIKE_DEFINITION,
                        id: "other-bike",
                    },
                }),
            /machineProfileId|definition id/,
        );
    },
);

test(
    "machine-profile-versioning",
    "rejects a next version with a different activity type identity",
    () => {
        const parent = createInitialMachineProfileVersion({
            id: "machine-profile-version-1",
            createdAtUnixMs: CREATED_AT,
            activityTypeVersionId: "activity-type-version-1",
            activityTypeId: "cycling",
            definition: BIKE_DEFINITION,
        });

        assertThrows(
            () =>
                createNextMachineProfileVersion({
                    id: "machine-profile-version-2",
                    parentVersion: parent,
                    createdAtUnixMs: CREATED_AT + 1_000,
                    activityTypeVersionId: "running-activity-type-version-1",
                    activityTypeId: "running",
                    definition: {
                        ...BIKE_DEFINITION,
                        activityTypeId: "running",
                    },
                }),
            /activityTypeId/,
        );
    },
);

test(
    "machine-profile-versioning",
    "does not mutate the supplied definition or parent version",
    () => {
        const parent = createInitialMachineProfileVersion({
            id: "machine-profile-version-1",
            createdAtUnixMs: CREATED_AT,
            activityTypeVersionId: "activity-type-version-1",
            activityTypeId: "cycling",
            definition: BIKE_DEFINITION,
        });

        const originalParent = structuredClone(parent);

        const definition = {
            ...BIKE_DEFINITION,
            name: "Updated BikeErg",
        };

        const originalDefinition = structuredClone(definition);

        createNextMachineProfileVersion({
            id: "machine-profile-version-2",
            parentVersion: parent,
            createdAtUnixMs: CREATED_AT + 1_000,
            activityTypeVersionId: "activity-type-version-2",
            activityTypeId: "cycling",
            definition,
        });

        assertDeepEqual(parent, originalParent);
        assertDeepEqual(definition, originalDefinition);
    },
);
