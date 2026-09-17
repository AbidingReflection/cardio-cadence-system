import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import {
    createInitialActivityTypeVersion,
    createNextActivityTypeVersion,
} from "../services/activity-type-versioning.js";

const CREATED_AT = 1_789_360_000_000;

const CYCLING_DEFINITION = {
    id: "cycling",
    name: "Cycling",
    variables: [],
};

test("activity-type-versioning", "creates an initial activity type version", () => {
    const version = createInitialActivityTypeVersion({
        id: "activity-type-version-1",
        createdAtUnixMs: CREATED_AT,
        definition: CYCLING_DEFINITION,
    });

    assertDeepEqual(version, {
        id: "activity-type-version-1",
        activityTypeId: "cycling",
        versionNumber: 1,
        parentVersionId: undefined,
        createdAtUnixMs: CREATED_AT,
        definition: CYCLING_DEFINITION,
    });
});

test("activity-type-versioning", "derives activity type ID from the definition", () => {
    const version = createInitialActivityTypeVersion({
        id: "activity-type-version-1",
        createdAtUnixMs: CREATED_AT,
        definition: CYCLING_DEFINITION,
    });

    assertEqual(version.activityTypeId, CYCLING_DEFINITION.id);
});

test("activity-type-versioning", "creates the next activity type version", () => {
    const parent = createInitialActivityTypeVersion({
        id: "activity-type-version-1",
        createdAtUnixMs: CREATED_AT,
        definition: CYCLING_DEFINITION,
    });

    const definition = {
        ...CYCLING_DEFINITION,
        name: "Updated Cycling",
    };

    const version = createNextActivityTypeVersion({
        id: "activity-type-version-2",
        parentVersion: parent,
        createdAtUnixMs: CREATED_AT + 1_000,
        definition,
    });

    assertDeepEqual(version, {
        id: "activity-type-version-2",
        activityTypeId: "cycling",
        versionNumber: 2,
        parentVersionId: "activity-type-version-1",
        createdAtUnixMs: CREATED_AT + 1_000,
        definition,
    });
});

test("activity-type-versioning", "inherits activity type ID from the parent", () => {
    const parent = createInitialActivityTypeVersion({
        id: "activity-type-version-1",
        createdAtUnixMs: CREATED_AT,
        definition: CYCLING_DEFINITION,
    });

    const version = createNextActivityTypeVersion({
        id: "activity-type-version-2",
        parentVersion: parent,
        createdAtUnixMs: CREATED_AT + 1_000,
        definition: CYCLING_DEFINITION,
    });

    assertEqual(version.activityTypeId, parent.activityTypeId);
});

test("activity-type-versioning", "increments the version number", () => {
    const parent = createInitialActivityTypeVersion({
        id: "activity-type-version-1",
        createdAtUnixMs: CREATED_AT,
        definition: CYCLING_DEFINITION,
    });

    const version = createNextActivityTypeVersion({
        id: "activity-type-version-2",
        parentVersion: parent,
        createdAtUnixMs: CREATED_AT + 1_000,
        definition: CYCLING_DEFINITION,
    });

    assertEqual(version.versionNumber, parent.versionNumber + 1);
});

test("activity-type-versioning", "sets the parent version ID", () => {
    const parent = createInitialActivityTypeVersion({
        id: "activity-type-version-1",
        createdAtUnixMs: CREATED_AT,
        definition: CYCLING_DEFINITION,
    });

    const version = createNextActivityTypeVersion({
        id: "activity-type-version-2",
        parentVersion: parent,
        createdAtUnixMs: CREATED_AT + 1_000,
        definition: CYCLING_DEFINITION,
    });

    assertEqual(version.parentVersionId, parent.id);
});

test(
    "activity-type-versioning",
    "rejects a next definition with a different activity type ID",
    () => {
        const parent = createInitialActivityTypeVersion({
            id: "activity-type-version-1",
            createdAtUnixMs: CREATED_AT,
            definition: CYCLING_DEFINITION,
        });

        assertThrows(
            () =>
                createNextActivityTypeVersion({
                    id: "activity-type-version-2",
                    parentVersion: parent,
                    createdAtUnixMs: CREATED_AT + 1_000,
                    definition: {
                        ...CYCLING_DEFINITION,
                        id: "running",
                    },
                }),
            /activityTypeId|definition id/,
        );
    },
);

test(
    "activity-type-versioning",
    "does not mutate the supplied definition or parent version",
    () => {
        const parent = createInitialActivityTypeVersion({
            id: "activity-type-version-1",
            createdAtUnixMs: CREATED_AT,
            definition: CYCLING_DEFINITION,
        });

        const originalParent = structuredClone(parent);

        const definition = {
            ...CYCLING_DEFINITION,
            name: "Updated Cycling",
        };

        const originalDefinition = structuredClone(definition);

        createNextActivityTypeVersion({
            id: "activity-type-version-2",
            parentVersion: parent,
            createdAtUnixMs: CREATED_AT + 1_000,
            definition,
        });

        assertDeepEqual(parent, originalParent);
        assertDeepEqual(definition, originalDefinition);
    },
);
