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

function createLibraryPersistence({ ids = [], times = [CREATED_AT] } = {}) {
    const context = new PersistenceContext();

    let idIndex = 0;
    let timeIndex = 0;

    return new LibraryPersistence({
        protocolFamilyRepository: context.protocolFamilies,
        plannedProtocolVersionRepository: context.plannedProtocolVersions,
        idGenerator: () => ids[idIndex++],
        clock: () => times[timeIndex++],
    });
}

test("library-persistence", "lists protocol families", async () => {
    const persistence = createLibraryPersistence({
        ids: ["family-1", "family-2"],
        times: [CREATED_AT, CREATED_AT + 1_000],
    });

    const family1 = await persistence.createProtocolFamily({
        displayName: "Threshold Intervals",
    });

    const family2 = await persistence.createProtocolFamily({
        displayName: "Tempo Intervals",
    });

    assertDeepEqual(await persistence.listProtocolFamilies(), [family1, family2]);
});

test("library-persistence", "updates protocol family metadata", async () => {
    const persistence = createLibraryPersistence({
        ids: ["family-1"],
    });

    await persistence.createProtocolFamily({
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
    const persistence = createLibraryPersistence({
        ids: ["family-1", "planned-version-1"],
        times: [CREATED_AT, CREATED_AT + 1_000],
    });

    await persistence.createProtocolFamily({
        displayName: "Threshold Intervals",
    });

    const version = await persistence.createInitialPlannedProtocolVersion({
        protocolFamilyId: "family-1",
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
        const persistence = createLibraryPersistence({
            ids: ["family-1", "planned-version-1", "planned-version-2"],
            times: [CREATED_AT, CREATED_AT + 1_000, CREATED_AT + 2_000],
        });

        await persistence.createProtocolFamily({
            displayName: "Threshold Intervals",
        });

        const parent = await persistence.createInitialPlannedProtocolVersion({
            protocolFamilyId: "family-1",
            protocol: PROTOCOL,
            dependencies: DEPENDENCIES,
        });

        const version = await persistence.createNextPlannedProtocolVersion({
            parentVersionId: parent.id,
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
    const persistence = createLibraryPersistence({
        ids: ["family-1", "planned-version-1", "planned-version-2"],
        times: [CREATED_AT, CREATED_AT + 1_000, CREATED_AT + 2_000],
    });

    await persistence.createProtocolFamily({
        displayName: "Threshold Intervals",
    });

    const version1 = await persistence.createInitialPlannedProtocolVersion({
        protocolFamilyId: "family-1",
        protocol: PROTOCOL,
        dependencies: DEPENDENCIES,
    });

    const version2 = await persistence.createNextPlannedProtocolVersion({
        parentVersionId: version1.id,
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

test(
    "library-persistence",
    "generates initial planned version identity and creation time",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["family-1", "planned-version-1"],
            times: [CREATED_AT, CREATED_AT],
        });

        const family = await persistence.createProtocolFamily({
            displayName: "Threshold Intervals",
        });

        const version = await persistence.createInitialPlannedProtocolVersion({
            protocolFamilyId: family.id,
            protocol: PROTOCOL,
            dependencies: DEPENDENCIES,
            changeSummary: "Initial version.",
        });

        assertDeepEqual(version, {
            id: "planned-version-1",
            protocolFamilyId: "family-1",
            versionNumber: 1,
            parentVersionId: undefined,
            createdAtUnixMs: CREATED_AT,
            protocol: PROTOCOL,
            dependencies: DEPENDENCIES,
            changeSummary: "Initial version.",
        });
    },
);

test(
    "library-persistence",
    "generates next planned version identity and creation time",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["family-1", "planned-version-1", "planned-version-2"],
            times: [CREATED_AT, CREATED_AT, CREATED_AT],
        });

        const family = await persistence.createProtocolFamily({
            displayName: "Threshold Intervals",
        });

        const parent = await persistence.createInitialPlannedProtocolVersion({
            protocolFamilyId: family.id,
            protocol: PROTOCOL,
            dependencies: DEPENDENCIES,
        });

        const version = await persistence.createNextPlannedProtocolVersion({
            parentVersionId: parent.id,
            protocol: PROTOCOL,
            dependencies: DEPENDENCIES,
            changeSummary: "Raised interval cadence.",
        });

        assertDeepEqual(version, {
            id: "planned-version-2",
            protocolFamilyId: "family-1",
            versionNumber: 2,
            parentVersionId: "planned-version-1",
            createdAtUnixMs: CREATED_AT,
            protocol: PROTOCOL,
            dependencies: DEPENDENCIES,
            changeSummary: "Raised interval cadence.",
        });
    },
);

test("library-persistence", "uses the clock for each created record", async () => {
    const context = new PersistenceContext();

    const times = [CREATED_AT, CREATED_AT + 1_000];

    let timeIndex = 0;
    let idIndex = 0;

    const ids = ["family-1", "planned-version-1"];

    const persistence = new LibraryPersistence({
        protocolFamilyRepository: context.protocolFamilies,
        plannedProtocolVersionRepository: context.plannedProtocolVersions,
        idGenerator: () => ids[idIndex++],
        clock: () => times[timeIndex++],
    });

    const family = await persistence.createProtocolFamily({
        displayName: "Threshold Intervals",
    });

    const version = await persistence.createInitialPlannedProtocolVersion({
        protocolFamilyId: family.id,
        protocol: PROTOCOL,
        dependencies: DEPENDENCIES,
    });

    assertEqual(family.createdAtUnixMs, CREATED_AT);
    assertEqual(version.createdAtUnixMs, CREATED_AT + 1_000);
});
