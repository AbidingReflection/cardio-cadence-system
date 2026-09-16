import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { PersistenceContext } from "../persistence-context.js";
import { LibraryPersistence } from "../services/library-persistence.js";

const CREATED_AT = 1_789_360_000_000;

const PROTOCOL = {
    id: "protocol-1",
    name: "Threshold Intervals",
};

const DEPENDENCIES = {
    activityTypeVersionId: "activity-type-version-1",
    machineProfileVersionId: undefined,
    calibrationProfileVersionId: undefined,
};

function createLibraryPersistence() {
    const context = new PersistenceContext();

    return new LibraryPersistence({
        protocolFamilyRepository: context.protocolFamilies,
        plannedProtocolVersionRepository: context.plannedProtocolVersions,
    });
}

test("library-persistence", "creates and retrieves a protocol family", async () => {
    const persistence = createLibraryPersistence();

    const family = await persistence.createProtocolFamily({
        id: "family-1",
        createdAtUnixMs: CREATED_AT,
        displayName: "Threshold Intervals",
    });

    assertDeepEqual(family, {
        id: "family-1",
        createdAtUnixMs: CREATED_AT,
        displayName: "Threshold Intervals",
        archived: false,
    });

    assertDeepEqual(await persistence.getProtocolFamily("family-1"), family);
});

test("library-persistence", "lists protocol families", async () => {
    const persistence = createLibraryPersistence();

    const family1 = await persistence.createProtocolFamily({
        id: "family-1",
        createdAtUnixMs: CREATED_AT,
        displayName: "Threshold Intervals",
    });

    const family2 = await persistence.createProtocolFamily({
        id: "family-2",
        createdAtUnixMs: CREATED_AT + 1_000,
        displayName: "Tempo Intervals",
    });

    assertDeepEqual(await persistence.listProtocolFamilies(), [family1, family2]);
});

test("library-persistence", "updates protocol family metadata", async () => {
    const persistence = createLibraryPersistence();

    await persistence.createProtocolFamily({
        id: "family-1",
        createdAtUnixMs: CREATED_AT,
        displayName: "Threshold Intervals",
    });

    const updated = await persistence.updateProtocolFamily("family-1", {
        displayName: "Updated Threshold Intervals",
        archived: true,
    });

    assertEqual(updated.displayName, "Updated Threshold Intervals");
    assertEqual(updated.archived, true);
});

test("library-persistence", "creates an initial planned protocol version", async () => {
    const persistence = createLibraryPersistence();

    await persistence.createProtocolFamily({
        id: "family-1",
        createdAtUnixMs: CREATED_AT,
        displayName: "Threshold Intervals",
    });

    const version = await persistence.createInitialPlannedProtocolVersion({
        id: "planned-version-1",
        protocolFamilyId: "family-1",
        createdAtUnixMs: CREATED_AT + 1_000,
        protocol: PROTOCOL,
        dependencies: DEPENDENCIES,
        changeSummary: "Initial version.",
    });

    assertDeepEqual(version, {
        id: "planned-version-1",
        protocolFamilyId: "family-1",
        versionNumber: 1,
        parentVersionId: undefined,
        createdAtUnixMs: CREATED_AT + 1_000,
        protocol: PROTOCOL,
        dependencies: DEPENDENCIES,
        changeSummary: "Initial version.",
    });

    assertDeepEqual(await persistence.getPlannedProtocolVersion("planned-version-1"), version);
});

test(
    "library-persistence",
    "creates the next planned protocol version from an explicit parent",
    async () => {
        const persistence = createLibraryPersistence();

        await persistence.createProtocolFamily({
            id: "family-1",
            createdAtUnixMs: CREATED_AT,
            displayName: "Threshold Intervals",
        });

        const parent = await persistence.createInitialPlannedProtocolVersion({
            id: "planned-version-1",
            protocolFamilyId: "family-1",
            createdAtUnixMs: CREATED_AT + 1_000,
            protocol: PROTOCOL,
            dependencies: DEPENDENCIES,
        });

        const version = await persistence.createNextPlannedProtocolVersion({
            id: "planned-version-2",
            parentVersionId: parent.id,
            createdAtUnixMs: CREATED_AT + 2_000,
            protocol: {
                ...PROTOCOL,
                name: "Threshold Intervals v2",
            },
            dependencies: DEPENDENCIES,
            changeSummary: "Raised interval cadence.",
        });

        assertDeepEqual(version, {
            id: "planned-version-2",
            protocolFamilyId: "family-1",
            versionNumber: 2,
            parentVersionId: "planned-version-1",
            createdAtUnixMs: CREATED_AT + 2_000,
            protocol: {
                ...PROTOCOL,
                name: "Threshold Intervals v2",
            },
            dependencies: DEPENDENCIES,
            changeSummary: "Raised interval cadence.",
        });
    },
);

test("library-persistence", "lists planned protocol versions in version order", async () => {
    const persistence = createLibraryPersistence();

    await persistence.createProtocolFamily({
        id: "family-1",
        createdAtUnixMs: CREATED_AT,
        displayName: "Threshold Intervals",
    });

    const version1 = await persistence.createInitialPlannedProtocolVersion({
        id: "planned-version-1",
        protocolFamilyId: "family-1",
        createdAtUnixMs: CREATED_AT + 1_000,
        protocol: PROTOCOL,
        dependencies: DEPENDENCIES,
    });

    const version2 = await persistence.createNextPlannedProtocolVersion({
        id: "planned-version-2",
        parentVersionId: version1.id,
        createdAtUnixMs: CREATED_AT + 2_000,
        protocol: PROTOCOL,
        dependencies: DEPENDENCIES,
    });

    assertDeepEqual(await persistence.listPlannedProtocolVersions("family-1"), [
        version1,
        version2,
    ]);
});

test("library-persistence", "rejects creation from a missing parent version", async () => {
    const persistence = createLibraryPersistence();

    let error;

    try {
        await persistence.createNextPlannedProtocolVersion({
            id: "planned-version-2",
            parentVersionId: "missing",
            createdAtUnixMs: CREATED_AT,
            protocol: PROTOCOL,
            dependencies: DEPENDENCIES,
        });
    } catch (caughtError) {
        error = caughtError;
    }

    assertEqual(error instanceof Error, true);
    assertEqual(/parent/i.test(error.message), true);
});

test(
    "library-persistence",
    "rejects an initial version for a missing protocol family",
    async () => {
        const persistence = createLibraryPersistence();

        let error;

        try {
            await persistence.createInitialPlannedProtocolVersion({
                id: "planned-version-1",
                protocolFamilyId: "missing",
                createdAtUnixMs: CREATED_AT,
                protocol: PROTOCOL,
                dependencies: DEPENDENCIES,
            });
        } catch (caughtError) {
            error = caughtError;
        }

        assertEqual(error instanceof Error, true);
        assertEqual(/ProtocolFamily/.test(error.message), true);
    },
);
