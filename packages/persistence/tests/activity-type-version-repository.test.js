import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { createActivityTypeVersion } from "../records/activity-type-version.js";
import { ActivityTypeVersionRepository } from "../repositories/activity-type-version-repository.js";

const CREATED_AT = 1_789_360_000_000;

const CYCLING_DEFINITION = {
    id: "cycling",
    name: "Cycling",
    variables: [],
};

const RUNNING_DEFINITION = {
    id: "running",
    name: "Running",
    variables: [],
};

/** Creates an activity type version for repository tests. */
function createVersion({
    id = "activity-type-version-1",
    activityTypeId = "cycling",
    versionNumber = 1,
    parentVersionId = undefined,
    createdAtUnixMs = CREATED_AT,
    definition = CYCLING_DEFINITION,
} = {}) {
    return createActivityTypeVersion({
        id,
        activityTypeId,
        versionNumber,
        parentVersionId,
        createdAtUnixMs,
        definition,
    });
}

test("activity-type-version-repository", "adds and retrieves a version", () => {
    const repository = new ActivityTypeVersionRepository();

    const version = createVersion();

    repository.add(version);

    assertDeepEqual(repository.getById(version.id), version);
});

test("activity-type-version-repository", "returns undefined for a missing version", () => {
    const repository = new ActivityTypeVersionRepository();

    assertEqual(repository.getById("missing"), undefined);
});

test("activity-type-version-repository", "rejects duplicate version IDs", () => {
    const repository = new ActivityTypeVersionRepository();

    repository.add(createVersion());

    assertThrows(
        () =>
            repository.add(
                createVersion({
                    definition: {
                        ...CYCLING_DEFINITION,
                        name: "Updated Cycling",
                    },
                }),
            ),
        /already exists/,
    );
});

test(
    "activity-type-version-repository",
    "rejects duplicate version numbers within an activity type",
    () => {
        const repository = new ActivityTypeVersionRepository();

        repository.add(createVersion());

        assertThrows(
            () =>
                repository.add(
                    createVersion({
                        id: "activity-type-version-other",
                    }),
                ),
            /versionNumber/,
        );
    },
);

test(
    "activity-type-version-repository",
    "allows the same version number for different activity types",
    () => {
        const repository = new ActivityTypeVersionRepository();

        const cycling = createVersion();

        const running = createVersion({
            id: "running-version-1",
            activityTypeId: "running",
            definition: RUNNING_DEFINITION,
        });

        repository.add(cycling);
        repository.add(running);

        assertDeepEqual(repository.getById(cycling.id), cycling);
        assertDeepEqual(repository.getById(running.id), running);
    },
);

test(
    "activity-type-version-repository",
    "lists versions for an activity type in version order",
    () => {
        const repository = new ActivityTypeVersionRepository();

        const version1 = createVersion();

        const version2 = createVersion({
            id: "activity-type-version-2",
            versionNumber: 2,
            parentVersionId: version1.id,
            createdAtUnixMs: CREATED_AT + 1_000,
        });

        repository.add(version1);
        repository.add(version2);

        assertDeepEqual(repository.listByActivityTypeId("cycling"), [version1, version2]);
    },
);

test(
    "activity-type-version-repository",
    "returns an empty list for an activity type with no versions",
    () => {
        const repository = new ActivityTypeVersionRepository();

        assertDeepEqual(repository.listByActivityTypeId("cycling"), []);
    },
);

test("activity-type-version-repository", "rejects a parent from a different activity type", () => {
    const repository = new ActivityTypeVersionRepository();

    const runningVersion = createVersion({
        id: "running-version-1",
        activityTypeId: "running",
        definition: RUNNING_DEFINITION,
    });

    repository.add(runningVersion);

    assertThrows(
        () =>
            repository.add(
                createVersion({
                    id: "cycling-version-2",
                    versionNumber: 2,
                    parentVersionId: runningVersion.id,
                }),
            ),
        /activityTypeId/,
    );
});

test(
    "activity-type-version-repository",
    "rejects a parent that is not the immediate predecessor",
    () => {
        const repository = new ActivityTypeVersionRepository();

        const version1 = createVersion();

        const version2 = createVersion({
            id: "activity-type-version-2",
            versionNumber: 2,
            parentVersionId: version1.id,
            createdAtUnixMs: CREATED_AT + 1_000,
        });

        repository.add(version1);
        repository.add(version2);

        assertThrows(
            () =>
                repository.add(
                    createVersion({
                        id: "activity-type-version-4",
                        versionNumber: 4,
                        parentVersionId: version2.id,
                        createdAtUnixMs: CREATED_AT + 2_000,
                    }),
                ),
            /immediate predecessor/,
        );
    },
);

test("activity-type-version-repository", "rejects a missing parent for later versions", () => {
    const repository = new ActivityTypeVersionRepository();

    assertThrows(
        () =>
            repository.add(
                createVersion({
                    id: "activity-type-version-2",
                    versionNumber: 2,
                    parentVersionId: "missing-version",
                }),
            ),
        /parent/,
    );
});

test("activity-type-version-repository", "deletes an unreferenced leaf version", () => {
    const repository = new ActivityTypeVersionRepository();

    const version = createVersion();

    repository.add(version);

    assertEqual(repository.delete(version.id), true);
    assertEqual(repository.getById(version.id), undefined);
});

test("activity-type-version-repository", "prevents deletion when a child version exists", () => {
    const repository = new ActivityTypeVersionRepository();

    const version1 = createVersion();

    const version2 = createVersion({
        id: "activity-type-version-2",
        versionNumber: 2,
        parentVersionId: version1.id,
        createdAtUnixMs: CREATED_AT + 1_000,
    });

    repository.add(version1);
    repository.add(version2);

    assertThrows(() => repository.delete(version1.id), /child/);
});

test("activity-type-version-repository", "returns false when deleting a missing version", () => {
    const repository = new ActivityTypeVersionRepository();

    assertEqual(repository.delete("missing"), false);
});

test("activity-type-version-repository", "reports references to an activity type identity", () => {
    const repository = new ActivityTypeVersionRepository();

    repository.add(createVersion());

    assertEqual(repository.hasActivityTypeReference("cycling"), true);
    assertEqual(repository.hasActivityTypeReference("running"), false);
});
