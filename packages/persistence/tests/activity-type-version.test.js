import {
    assertDeepEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import {
    createActivityTypeVersion,
    validateActivityTypeVersion,
} from "../records/activity-type-version.js";

const CREATED_AT = 1_789_360_000_000;

const VALID_DEFINITION = {
    id: "cycling",
    name: "Cycling",
    variables: [
        {
            id: "cadence",
            name: "Cadence",
        },
    ],
};

test("activity-type-version", "creates a valid initial activity type version", () => {
    const version = createActivityTypeVersion({
        id: "activity-type-version-1",
        activityTypeId: "cycling",
        versionNumber: 1,
        createdAtUnixMs: CREATED_AT,
        definition: VALID_DEFINITION,
    });

    assertDeepEqual(version, {
        id: "activity-type-version-1",
        activityTypeId: "cycling",
        versionNumber: 1,
        parentVersionId: undefined,
        createdAtUnixMs: CREATED_AT,
        definition: VALID_DEFINITION,
    });
});

test("activity-type-version", "accepts a later version with a parent", () => {
    validateActivityTypeVersion({
        id: "activity-type-version-2",
        activityTypeId: "cycling",
        versionNumber: 2,
        parentVersionId: "activity-type-version-1",
        createdAtUnixMs: CREATED_AT + 1_000,
        definition: VALID_DEFINITION,
    });
});

test("activity-type-version", "rejects a missing version ID", () => {
    assertThrows(
        () =>
            validateActivityTypeVersion({
                id: "",
                activityTypeId: "cycling",
                versionNumber: 1,
                createdAtUnixMs: CREATED_AT,
                definition: VALID_DEFINITION,
            }),
        /id/,
    );
});

test("activity-type-version", "rejects a missing activity type ID", () => {
    assertThrows(
        () =>
            validateActivityTypeVersion({
                id: "activity-type-version-1",
                activityTypeId: "",
                versionNumber: 1,
                createdAtUnixMs: CREATED_AT,
                definition: VALID_DEFINITION,
            }),
        /activityTypeId/,
    );
});

test("activity-type-version", "rejects a non-positive version number", () => {
    assertThrows(
        () =>
            validateActivityTypeVersion({
                id: "activity-type-version-1",
                activityTypeId: "cycling",
                versionNumber: 0,
                createdAtUnixMs: CREATED_AT,
                definition: VALID_DEFINITION,
            }),
        /versionNumber/,
    );
});

test("activity-type-version", "rejects a non-integer version number", () => {
    assertThrows(
        () =>
            validateActivityTypeVersion({
                id: "activity-type-version-1",
                activityTypeId: "cycling",
                versionNumber: 1.5,
                createdAtUnixMs: CREATED_AT,
                definition: VALID_DEFINITION,
            }),
        /versionNumber/,
    );
});

test("activity-type-version", "rejects a parent on version one", () => {
    assertThrows(
        () =>
            validateActivityTypeVersion({
                id: "activity-type-version-1",
                activityTypeId: "cycling",
                versionNumber: 1,
                parentVersionId: "activity-type-version-0",
                createdAtUnixMs: CREATED_AT,
                definition: VALID_DEFINITION,
            }),
        /parentVersionId/,
    );
});

test("activity-type-version", "requires a parent after version one", () => {
    assertThrows(
        () =>
            validateActivityTypeVersion({
                id: "activity-type-version-2",
                activityTypeId: "cycling",
                versionNumber: 2,
                createdAtUnixMs: CREATED_AT + 1_000,
                definition: VALID_DEFINITION,
            }),
        /parentVersionId/,
    );
});

test("activity-type-version", "rejects an invalid creation timestamp", () => {
    assertThrows(
        () =>
            validateActivityTypeVersion({
                id: "activity-type-version-1",
                activityTypeId: "cycling",
                versionNumber: 1,
                createdAtUnixMs: NaN,
                definition: VALID_DEFINITION,
            }),
        /createdAtUnixMs/,
    );
});

test("activity-type-version", "rejects a non-object definition", () => {
    assertThrows(
        () =>
            validateActivityTypeVersion({
                id: "activity-type-version-1",
                activityTypeId: "cycling",
                versionNumber: 1,
                createdAtUnixMs: CREATED_AT,
                definition: null,
            }),
        /definition/,
    );
});

test("activity-type-version", "requires definition ID to match activity type ID", () => {
    assertThrows(
        () =>
            validateActivityTypeVersion({
                id: "activity-type-version-1",
                activityTypeId: "cycling",
                versionNumber: 1,
                createdAtUnixMs: CREATED_AT,
                definition: {
                    ...VALID_DEFINITION,
                    id: "running",
                },
            }),
        /definition id/,
    );
});

test("activity-type-version", "does not mutate the supplied definition", () => {
    const definition = structuredClone(VALID_DEFINITION);

    const version = createActivityTypeVersion({
        id: "activity-type-version-1",
        activityTypeId: "cycling",
        versionNumber: 1,
        createdAtUnixMs: CREATED_AT,
        definition,
    });

    version.definition.name = "Changed";

    assertDeepEqual(definition, VALID_DEFINITION);
});
