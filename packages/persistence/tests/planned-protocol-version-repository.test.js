import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { PlannedProtocolVersionRepository } from "../repositories/planned-protocol-version-repository.js";

const FAMILY_ID = "family-1";

const VERSION_1 = {
    id: "planned-version-1",
    protocolFamilyId: FAMILY_ID,
    versionNumber: 1,
    parentVersionId: undefined,
    createdAtUnixMs: 1_789_360_000_000,
    protocol: {
        id: "protocol-1",
        name: "Threshold Intervals",
    },
    dependencies: {
        activityTypeVersionId: "activity-type-version-1",
        machineProfileVersionId: undefined,
        calibrationProfileVersionId: undefined,
    },
    changeSummary: undefined,
};

const VERSION_2 = {
    ...VERSION_1,
    id: "planned-version-2",
    versionNumber: 2,
    parentVersionId: "planned-version-1",
    createdAtUnixMs: 1_789_360_100_000,
};

test("planned-protocol-version-repository", "adds and retrieves a planned protocol version", () => {
    const repository = new PlannedProtocolVersionRepository();

    repository.add(VERSION_1);

    assertDeepEqual(repository.getById(VERSION_1.id), VERSION_1);
});

test("planned-protocol-version-repository", "returns undefined for an unknown ID", () => {
    const repository = new PlannedProtocolVersionRepository();

    assertEqual(repository.getById("missing"), undefined);
});

test("planned-protocol-version-repository", "rejects an invalid planned protocol version", () => {
    const repository = new PlannedProtocolVersionRepository();

    assertThrows(
        () =>
            repository.add({
                ...VERSION_1,
                id: "",
            }),
        /id/,
    );
});

test("planned-protocol-version-repository", "rejects a duplicate record ID", () => {
    const repository = new PlannedProtocolVersionRepository();

    repository.add(VERSION_1);

    assertThrows(
        () =>
            repository.add({
                ...VERSION_1,
                versionNumber: 2,
                parentVersionId: VERSION_1.id,
            }),
        /id/,
    );
});

test(
    "planned-protocol-version-repository",
    "rejects a duplicate version number within a protocol family",
    () => {
        const repository = new PlannedProtocolVersionRepository();

        repository.add(VERSION_1);

        assertThrows(
            () =>
                repository.add({
                    ...VERSION_1,
                    id: "planned-version-other",
                }),
            /versionNumber/,
        );
    },
);

test("planned-protocol-version-repository", "requires the parent version to exist", () => {
    const repository = new PlannedProtocolVersionRepository();

    assertThrows(() => repository.add(VERSION_2), /parentVersionId/);
});

test(
    "planned-protocol-version-repository",
    "accepts a later version when its parent exists",
    () => {
        const repository = new PlannedProtocolVersionRepository();

        repository.add(VERSION_1);
        repository.add(VERSION_2);

        assertDeepEqual(repository.getById(VERSION_2.id), VERSION_2);
    },
);

test(
    "planned-protocol-version-repository",
    "requires the parent to belong to the same family",
    () => {
        const repository = new PlannedProtocolVersionRepository();

        repository.add({
            ...VERSION_1,
            id: "other-family-version-1",
            protocolFamilyId: "family-2",
        });

        assertThrows(
            () =>
                repository.add({
                    ...VERSION_2,
                    parentVersionId: "other-family-version-1",
                }),
            /protocolFamilyId/,
        );
    },
);

test(
    "planned-protocol-version-repository",
    "lists family versions in ascending version order",
    () => {
        const repository = new PlannedProtocolVersionRepository();

        repository.add(VERSION_1);
        repository.add(VERSION_2);

        assertDeepEqual(repository.listByFamilyId(FAMILY_ID), [VERSION_1, VERSION_2]);
    },
);

test("planned-protocol-version-repository", "returns an empty list for an unknown family", () => {
    const repository = new PlannedProtocolVersionRepository();

    assertDeepEqual(repository.listByFamilyId("missing-family"), []);
});

test(
    "planned-protocol-version-repository",
    "requires the parent to be the immediately preceding version",
    () => {
        const repository = new PlannedProtocolVersionRepository();

        repository.add(VERSION_1);

        repository.add({
            ...VERSION_2,
            id: "planned-version-2",
        });

        assertThrows(
            () =>
                repository.add({
                    ...VERSION_2,
                    id: "planned-version-3",
                    versionNumber: 3,
                    parentVersionId: VERSION_1.id,
                }),
            /parentVersionId/,
        );
    },
);

test("planned-protocol-version-repository", "deletes an unreferenced planned version", () => {
    const repository = new PlannedProtocolVersionRepository({
        isReferenced: () => false,
    });

    repository.add(VERSION_1);

    repository.delete(VERSION_1.id);

    assertEqual(repository.getById(VERSION_1.id), undefined);
});

test(
    "planned-protocol-version-repository",
    "rejects deletion of a referenced planned version",
    () => {
        const repository = new PlannedProtocolVersionRepository({
            isReferenced: (id) => id === VERSION_1.id,
        });

        repository.add(VERSION_1);

        assertThrows(() => repository.delete(VERSION_1.id), /referenced/);
    },
);

test(
    "planned-protocol-version-repository",
    "returns false when deleting an unknown version",
    () => {
        const repository = new PlannedProtocolVersionRepository({
            isReferenced: () => false,
        });

        assertEqual(repository.delete("missing-version"), false);
    },
);

test("planned-protocol-version-repository", "reports when a protocol family is referenced", () => {
    const repository = new PlannedProtocolVersionRepository();

    repository.add(VERSION_1);

    assertEqual(repository.hasProtocolFamilyReference(VERSION_1.protocolFamilyId), true);
});

test(
    "planned-protocol-version-repository",
    "reports when a protocol family is not referenced",
    () => {
        const repository = new PlannedProtocolVersionRepository();

        repository.add(VERSION_1);

        assertEqual(repository.hasProtocolFamilyReference("missing-family"), false);
    },
);

test("planned-protocol-version-repository", "lists all versions in version order", () => {
    const repository = new PlannedProtocolVersionRepository();

    const version2 = {
        ...VERSION_1,
        id: "planned-version-2",
        versionNumber: 2,
        parentVersionId: VERSION_1.id,
        createdAtUnixMs: VERSION_1.createdAtUnixMs + 1,
    };

    repository.add(VERSION_1);
    repository.add(version2);

    assertDeepEqual(
        repository.listAll().map((version) => version.id),
        [VERSION_1.id, version2.id],
    );
});
