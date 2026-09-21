import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { PersistenceContext } from "../persistence-context.js";
import { PersistenceService } from "../services/persistence-service.js";

import {
    BASE_DEPENDENCIES,
    BASE_PROTOCOL,
    createTestService,
} from "./persistence-service-fixtures.js";

test(
    "persistence-service-protocols",
    "creates a protocol family with an initial planned version",
    () => {
        const { service } = createTestService();

        const result = service.createProtocolFamilyWithInitialVersion({
            displayName: "Threshold Intervals",
            protocol: BASE_PROTOCOL,
            dependencies: BASE_DEPENDENCIES,
            changeSummary: "Initial version",
        });

        assertEqual(result.protocolFamily.id, "family-1");
        assertEqual(result.protocolFamily.displayName, "Threshold Intervals");
        assertEqual(result.protocolFamily.createdAtUnixMs, 1000);
        assertEqual(result.protocolFamily.archived, false);

        assertEqual(result.plannedProtocolVersion.id, "version-1");
        assertEqual(result.plannedProtocolVersion.protocolFamilyId, "family-1");
        assertEqual(result.plannedProtocolVersion.versionNumber, 1);
        assertEqual(result.plannedProtocolVersion.parentVersionId, undefined);
        assertEqual(result.plannedProtocolVersion.createdAtUnixMs, 2000);
    },
);

test(
    "persistence-service-protocols",
    "returns the created protocol family and planned version",
    () => {
        const { service } = createTestService();

        const result = service.createProtocolFamilyWithInitialVersion({
            displayName: "Threshold Intervals",
            protocol: BASE_PROTOCOL,
            dependencies: BASE_DEPENDENCIES,
        });

        assertDeepEqual(service.getProtocolFamily("family-1"), result.protocolFamily);

        assertDeepEqual(
            service.getPlannedProtocolVersion("version-1"),
            result.plannedProtocolVersion,
        );
    },
);

test("persistence-service-protocols", "uses service-generated ids and timestamps", () => {
    const { service } = createTestService({
        ids: ["generated-family", "generated-version"],
        timestamps: [1111, 2222],
    });

    const result = service.createProtocolFamilyWithInitialVersion({
        displayName: "Generated",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    assertEqual(result.protocolFamily.id, "generated-family");
    assertEqual(result.protocolFamily.createdAtUnixMs, 1111);

    assertEqual(result.plannedProtocolVersion.id, "generated-version");
    assertEqual(result.plannedProtocolVersion.createdAtUnixMs, 2222);
});

test(
    "persistence-service-protocols",
    "creates the next planned version from the latest family version",
    () => {
        const { service } = createTestService();

        const initial = service.createProtocolFamilyWithInitialVersion({
            displayName: "Threshold Intervals",
            protocol: BASE_PROTOCOL,
            dependencies: BASE_DEPENDENCIES,
        });

        const nextVersion = service.createNextPlannedProtocolVersion({
            protocolFamilyId: initial.protocolFamily.id,
            protocol: {
                name: "Updated Protocol",
            },
            dependencies: BASE_DEPENDENCIES,
            changeSummary: "Raised cadence target",
        });

        assertEqual(nextVersion.id, "version-2");
        assertEqual(nextVersion.protocolFamilyId, "family-1");
        assertEqual(nextVersion.versionNumber, 2);
        assertEqual(nextVersion.parentVersionId, "version-1");
        assertEqual(nextVersion.createdAtUnixMs, 3000);
    },
);

test("persistence-service-protocols", "increments versions from the latest planned version", () => {
    const { service } = createTestService();

    const initial = service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    const second = service.createNextPlannedProtocolVersion({
        protocolFamilyId: initial.protocolFamily.id,
        protocol: {
            name: "Version 2",
        },
        dependencies: BASE_DEPENDENCIES,
    });

    const third = service.createNextPlannedProtocolVersion({
        protocolFamilyId: initial.protocolFamily.id,
        protocol: {
            name: "Version 3",
        },
        dependencies: BASE_DEPENDENCIES,
    });

    assertEqual(second.versionNumber, 2);
    assertEqual(second.parentVersionId, "version-1");

    assertEqual(third.versionNumber, 3);
    assertEqual(third.parentVersionId, "version-2");
});

test(
    "persistence-service-protocols",
    "rejects next-version creation for an unknown protocol family",
    () => {
        const { service } = createTestService();

        assertThrows(
            () =>
                service.createNextPlannedProtocolVersion({
                    protocolFamilyId: "missing-family",
                    protocol: BASE_PROTOCOL,
                    dependencies: BASE_DEPENDENCIES,
                }),
            /ProtocolFamily "missing-family" does not exist/,
        );
    },
);

test("persistence-service-protocols", "lists active protocol families by default", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "family-2", "version-2"],
        timestamps: [1000, 1100, 2000, 2100],
    });

    service.createProtocolFamilyWithInitialVersion({
        displayName: "Active",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    const archived = service.createProtocolFamilyWithInitialVersion({
        displayName: "Archived",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    service.archiveProtocolFamily(archived.protocolFamily.id);

    const families = service.listProtocolFamilies();

    assertEqual(families.length, 1);
    assertEqual(families[0].displayName, "Active");
});

test("persistence-service-protocols", "includes archived protocol families when requested", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "family-2", "version-2"],
        timestamps: [1000, 1100, 2000, 2100],
    });

    service.createProtocolFamilyWithInitialVersion({
        displayName: "Active",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    const archived = service.createProtocolFamilyWithInitialVersion({
        displayName: "Archived",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    service.archiveProtocolFamily(archived.protocolFamily.id);

    const families = service.listProtocolFamilies({
        includeArchived: true,
    });

    assertEqual(families.length, 2);
});

test("persistence-service-protocols", "renames a protocol family", () => {
    const { service } = createTestService();

    const created = service.createProtocolFamilyWithInitialVersion({
        displayName: "Original Name",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    const updated = service.renameProtocolFamily(created.protocolFamily.id, "Updated Name");

    assertEqual(updated.displayName, "Updated Name");

    assertEqual(service.getProtocolFamily(created.protocolFamily.id).displayName, "Updated Name");
});

test("persistence-service-protocols", "archives a protocol family", () => {
    const { service } = createTestService();

    const created = service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    const archived = service.archiveProtocolFamily(created.protocolFamily.id);

    assertEqual(archived.archived, true);
});

test("persistence-service-protocols", "restores an archived protocol family", () => {
    const { service } = createTestService();

    const created = service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    service.archiveProtocolFamily(created.protocolFamily.id);

    const restored = service.restoreProtocolFamily(created.protocolFamily.id);

    assertEqual(restored.archived, false);
});

test(
    "persistence-service-protocols",
    "lists planned protocol versions for a family in version order",
    () => {
        const { service } = createTestService();

        const initial = service.createProtocolFamilyWithInitialVersion({
            displayName: "Threshold Intervals",
            protocol: BASE_PROTOCOL,
            dependencies: BASE_DEPENDENCIES,
        });

        service.createNextPlannedProtocolVersion({
            protocolFamilyId: initial.protocolFamily.id,
            protocol: {
                name: "Version 2",
            },
            dependencies: BASE_DEPENDENCIES,
        });

        service.createNextPlannedProtocolVersion({
            protocolFamilyId: initial.protocolFamily.id,
            protocol: {
                name: "Version 3",
            },
            dependencies: BASE_DEPENDENCIES,
        });

        const versions = service.listPlannedProtocolVersions(initial.protocolFamily.id);

        assertEqual(versions.length, 3);
        assertEqual(versions[0].versionNumber, 1);
        assertEqual(versions[1].versionNumber, 2);
        assertEqual(versions[2].versionNumber, 3);
    },
);

test(
    "persistence-service-protocols",
    "does not leave a protocol family behind when initial version persistence fails",
    () => {
        const context = new PersistenceContext();

        const plannedProtocolVersionRepository = {
            add() {
                throw new Error("Simulated planned version persistence failure.");
            },
        };

        const service = new PersistenceService({
            protocolFamilyRepository: context.protocolFamilies,
            plannedProtocolVersionRepository,
            idGenerator: () => "family-1",
            clock: () => 1000,
        });

        assertThrows(
            () =>
                service.createProtocolFamilyWithInitialVersion({
                    displayName: "Threshold Intervals",
                    protocol: BASE_PROTOCOL,
                    dependencies: BASE_DEPENDENCIES,
                }),
            /Simulated planned version persistence failure/,
        );

        assertEqual(context.protocolFamilies.getById("family-1"), undefined);
    },
);
