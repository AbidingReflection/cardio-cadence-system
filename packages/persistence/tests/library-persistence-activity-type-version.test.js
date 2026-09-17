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

function createLibraryPersistence({ ids = [], times = [CREATED_AT] } = {}) {
    const context = new PersistenceContext();

    let idIndex = 0;
    let timeIndex = 0;

    return new LibraryPersistence({
        protocolFamilyRepository: context.protocolFamilies,
        plannedProtocolVersionRepository: context.plannedProtocolVersions,
        executedProtocolRepository: context.executedProtocols,
        activityTypeVersionRepository: context.activityTypeVersions,
        idGenerator: () => ids[idIndex++],
        clock: () => times[timeIndex++],
    });
}

test(
    "library-persistence-activity-type-version",
    "creates and retrieves an initial activity type version",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["activity-type-version-1"],
            times: [CREATED_AT],
        });

        const version = await persistence.createInitialActivityTypeVersion({
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

        assertDeepEqual(
            await persistence.getActivityTypeVersion("activity-type-version-1"),
            version,
        );
    },
);

test(
    "library-persistence-activity-type-version",
    "creates the next activity type version from an explicit parent",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["activity-type-version-1", "activity-type-version-2"],
            times: [CREATED_AT, CREATED_AT + 1_000],
        });

        const parent = await persistence.createInitialActivityTypeVersion({
            definition: CYCLING_DEFINITION,
        });

        const definition = {
            ...CYCLING_DEFINITION,
            name: "Updated Cycling",
        };

        const version = await persistence.createNextActivityTypeVersion({
            parentVersionId: parent.id,
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
    },
);

test(
    "library-persistence-activity-type-version",
    "lists activity type versions in version order",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["activity-type-version-1", "activity-type-version-2"],
            times: [CREATED_AT, CREATED_AT + 1_000],
        });

        const version1 = await persistence.createInitialActivityTypeVersion({
            definition: CYCLING_DEFINITION,
        });

        const version2 = await persistence.createNextActivityTypeVersion({
            parentVersionId: version1.id,
            definition: {
                ...CYCLING_DEFINITION,
                name: "Updated Cycling",
            },
        });

        assertDeepEqual(await persistence.listActivityTypeVersions("cycling"), [
            version1,
            version2,
        ]);
    },
);

test(
    "library-persistence-activity-type-version",
    "rejects creation from a missing parent version",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["activity-type-version-2"],
            times: [CREATED_AT],
        });

        let error;

        try {
            await persistence.createNextActivityTypeVersion({
                parentVersionId: "missing-version",
                definition: CYCLING_DEFINITION,
            });
        } catch (caughtError) {
            error = caughtError;
        }

        assertEqual(error instanceof Error, true);
        assertEqual(error.message, 'Parent ActivityTypeVersion "missing-version" does not exist.');
    },
);

test(
    "library-persistence-activity-type-version",
    "generates activity type version identity and creation time",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["activity-type-version-generated"],
            times: [CREATED_AT + 5_000],
        });

        const version = await persistence.createInitialActivityTypeVersion({
            definition: CYCLING_DEFINITION,
        });

        assertEqual(version.id, "activity-type-version-generated");
        assertEqual(version.createdAtUnixMs, CREATED_AT + 5_000);
    },
);
