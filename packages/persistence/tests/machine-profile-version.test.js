import {
    assertDeepEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import {
    createMachineProfileVersion,
    validateMachineProfileVersion,
} from "../records/machine-profile-version.js";

const CREATED_AT = 1_789_360_000_000;

const VALID_DEFINITION = {
    id: "concept2-bike",
    name: "Concept2 BikeErg",
    activityTypeId: "cycling",
    variables: {},
};

test("machine-profile-version", "creates a valid initial machine profile version", () => {
    const version = createMachineProfileVersion({
        id: "machine-profile-version-1",
        machineProfileId: "concept2-bike",
        versionNumber: 1,
        createdAtUnixMs: CREATED_AT,
        activityTypeVersionId: "activity-type-version-1",
        activityTypeId: "cycling",
        definition: VALID_DEFINITION,
    });

    assertDeepEqual(version, {
        id: "machine-profile-version-1",
        machineProfileId: "concept2-bike",
        versionNumber: 1,
        parentVersionId: undefined,
        createdAtUnixMs: CREATED_AT,
        activityTypeVersionId: "activity-type-version-1",
        activityTypeId: "cycling",
        definition: VALID_DEFINITION,
    });
});

test("machine-profile-version", "accepts a later version with a parent", () => {
    validateMachineProfileVersion({
        id: "machine-profile-version-2",
        machineProfileId: "concept2-bike",
        versionNumber: 2,
        parentVersionId: "machine-profile-version-1",
        createdAtUnixMs: CREATED_AT + 1_000,
        activityTypeVersionId: "activity-type-version-2",
        activityTypeId: "cycling",
        definition: VALID_DEFINITION,
    });
});

test("machine-profile-version", "rejects a missing version ID", () => {
    assertThrows(
        () =>
            validateMachineProfileVersion({
                id: "",
                machineProfileId: "concept2-bike",
                versionNumber: 1,
                createdAtUnixMs: CREATED_AT,
                activityTypeVersionId: "activity-type-version-1",
                activityTypeId: "cycling",
                definition: VALID_DEFINITION,
            }),
        /id/,
    );
});

test("machine-profile-version", "rejects a missing machine profile ID", () => {
    assertThrows(
        () =>
            validateMachineProfileVersion({
                id: "machine-profile-version-1",
                machineProfileId: "",
                versionNumber: 1,
                createdAtUnixMs: CREATED_AT,
                activityTypeVersionId: "activity-type-version-1",
                activityTypeId: "cycling",
                definition: VALID_DEFINITION,
            }),
        /machineProfileId/,
    );
});

test("machine-profile-version", "rejects a non-positive version number", () => {
    assertThrows(
        () =>
            validateMachineProfileVersion({
                id: "machine-profile-version-1",
                machineProfileId: "concept2-bike",
                versionNumber: 0,
                createdAtUnixMs: CREATED_AT,
                activityTypeVersionId: "activity-type-version-1",
                activityTypeId: "cycling",
                definition: VALID_DEFINITION,
            }),
        /versionNumber/,
    );
});

test("machine-profile-version", "rejects a non-integer version number", () => {
    assertThrows(
        () =>
            validateMachineProfileVersion({
                id: "machine-profile-version-1",
                machineProfileId: "concept2-bike",
                versionNumber: 1.5,
                createdAtUnixMs: CREATED_AT,
                activityTypeVersionId: "activity-type-version-1",
                activityTypeId: "cycling",
                definition: VALID_DEFINITION,
            }),
        /versionNumber/,
    );
});

test("machine-profile-version", "rejects a parent on version one", () => {
    assertThrows(
        () =>
            validateMachineProfileVersion({
                id: "machine-profile-version-1",
                machineProfileId: "concept2-bike",
                versionNumber: 1,
                parentVersionId: "machine-profile-version-0",
                createdAtUnixMs: CREATED_AT,
                activityTypeVersionId: "activity-type-version-1",
                activityTypeId: "cycling",
                definition: VALID_DEFINITION,
            }),
        /parentVersionId/,
    );
});

test("machine-profile-version", "requires a parent after version one", () => {
    assertThrows(
        () =>
            validateMachineProfileVersion({
                id: "machine-profile-version-2",
                machineProfileId: "concept2-bike",
                versionNumber: 2,
                createdAtUnixMs: CREATED_AT + 1_000,
                activityTypeVersionId: "activity-type-version-2",
                activityTypeId: "cycling",
                definition: VALID_DEFINITION,
            }),
        /parentVersionId/,
    );
});

test("machine-profile-version", "rejects an invalid creation timestamp", () => {
    assertThrows(
        () =>
            validateMachineProfileVersion({
                id: "machine-profile-version-1",
                machineProfileId: "concept2-bike",
                versionNumber: 1,
                createdAtUnixMs: NaN,
                activityTypeVersionId: "activity-type-version-1",
                activityTypeId: "cycling",
                definition: VALID_DEFINITION,
            }),
        /createdAtUnixMs/,
    );
});

test("machine-profile-version", "requires an activity type version ID", () => {
    assertThrows(
        () =>
            validateMachineProfileVersion({
                id: "machine-profile-version-1",
                machineProfileId: "concept2-bike",
                versionNumber: 1,
                createdAtUnixMs: CREATED_AT,
                activityTypeVersionId: "",
                activityTypeId: "cycling",
                definition: VALID_DEFINITION,
            }),
        /activityTypeVersionId/,
    );
});

test("machine-profile-version", "requires an activity type ID", () => {
    assertThrows(
        () =>
            validateMachineProfileVersion({
                id: "machine-profile-version-1",
                machineProfileId: "concept2-bike",
                versionNumber: 1,
                createdAtUnixMs: CREATED_AT,
                activityTypeVersionId: "activity-type-version-1",
                activityTypeId: "",
                definition: VALID_DEFINITION,
            }),
        /activityTypeId/,
    );
});

test("machine-profile-version", "rejects a non-object definition", () => {
    assertThrows(
        () =>
            validateMachineProfileVersion({
                id: "machine-profile-version-1",
                machineProfileId: "concept2-bike",
                versionNumber: 1,
                createdAtUnixMs: CREATED_AT,
                activityTypeVersionId: "activity-type-version-1",
                activityTypeId: "cycling",
                definition: null,
            }),
        /definition/,
    );
});

test("machine-profile-version", "requires definition ID to match machine profile ID", () => {
    assertThrows(
        () =>
            validateMachineProfileVersion({
                id: "machine-profile-version-1",
                machineProfileId: "concept2-bike",
                versionNumber: 1,
                createdAtUnixMs: CREATED_AT,
                activityTypeVersionId: "activity-type-version-1",
                activityTypeId: "cycling",
                definition: {
                    ...VALID_DEFINITION,
                    id: "other-machine",
                },
            }),
        /definition id/,
    );
});

test(
    "machine-profile-version",
    "requires definition activity type ID to match activity type ID",
    () => {
        assertThrows(
            () =>
                validateMachineProfileVersion({
                    id: "machine-profile-version-1",
                    machineProfileId: "concept2-bike",
                    versionNumber: 1,
                    createdAtUnixMs: CREATED_AT,
                    activityTypeVersionId: "activity-type-version-1",
                    activityTypeId: "cycling",
                    definition: {
                        ...VALID_DEFINITION,
                        activityTypeId: "running",
                    },
                }),
            /definition activityTypeId/,
        );
    },
);

test("machine-profile-version", "does not mutate the supplied definition", () => {
    const definition = structuredClone(VALID_DEFINITION);

    const version = createMachineProfileVersion({
        id: "machine-profile-version-1",
        machineProfileId: "concept2-bike",
        versionNumber: 1,
        createdAtUnixMs: CREATED_AT,
        activityTypeVersionId: "activity-type-version-1",
        activityTypeId: "cycling",
        definition,
    });

    version.definition.name = "Changed";

    assertDeepEqual(definition, VALID_DEFINITION);
});
