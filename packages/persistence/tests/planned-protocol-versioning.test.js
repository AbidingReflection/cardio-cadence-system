import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import {
    createInitialPlannedProtocolVersion,
    createNextPlannedProtocolVersion,
} from "../services/planned-protocol-versioning.js";

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

const PARENT_VERSION = {
    id: "planned-version-3",
    protocolFamilyId: "family-1",
    versionNumber: 3,
    parentVersionId: "planned-version-2",
    createdAtUnixMs: CREATED_AT - 100_000,
    protocol: PROTOCOL,
    dependencies: DEPENDENCIES,
    changeSummary: "Previous version.",
};

test("planned-protocol-versioning", "creates an initial planned protocol version", () => {
    const version = createInitialPlannedProtocolVersion({
        id: "planned-version-1",
        protocolFamilyId: "family-1",
        createdAtUnixMs: CREATED_AT,
        protocol: PROTOCOL,
        dependencies: DEPENDENCIES,
    });

    assertDeepEqual(version, {
        id: "planned-version-1",
        protocolFamilyId: "family-1",
        versionNumber: 1,
        parentVersionId: undefined,
        createdAtUnixMs: CREATED_AT,
        protocol: PROTOCOL,
        dependencies: DEPENDENCIES,
        changeSummary: undefined,
    });
});

test("planned-protocol-versioning", "preserves an initial change summary", () => {
    const version = createInitialPlannedProtocolVersion({
        id: "planned-version-1",
        protocolFamilyId: "family-1",
        createdAtUnixMs: CREATED_AT,
        protocol: PROTOCOL,
        dependencies: DEPENDENCIES,
        changeSummary: "Initial version.",
    });

    assertEqual(version.changeSummary, "Initial version.");
});

test("planned-protocol-versioning", "creates the next planned protocol version", () => {
    const version = createNextPlannedProtocolVersion({
        id: "planned-version-4",
        parentVersion: PARENT_VERSION,
        createdAtUnixMs: CREATED_AT,
        protocol: PROTOCOL,
        dependencies: DEPENDENCIES,
        changeSummary: "Raised interval cadence.",
    });

    assertDeepEqual(version, {
        id: "planned-version-4",
        protocolFamilyId: "family-1",
        versionNumber: 4,
        parentVersionId: "planned-version-3",
        createdAtUnixMs: CREATED_AT,
        protocol: PROTOCOL,
        dependencies: DEPENDENCIES,
        changeSummary: "Raised interval cadence.",
    });
});

test("planned-protocol-versioning", "inherits the protocol family from the parent", () => {
    const version = createNextPlannedProtocolVersion({
        id: "planned-version-4",
        parentVersion: PARENT_VERSION,
        createdAtUnixMs: CREATED_AT,
        protocol: PROTOCOL,
        dependencies: DEPENDENCIES,
    });

    assertEqual(version.protocolFamilyId, PARENT_VERSION.protocolFamilyId);
});

test("planned-protocol-versioning", "increments the parent version number by one", () => {
    const version = createNextPlannedProtocolVersion({
        id: "planned-version-4",
        parentVersion: PARENT_VERSION,
        createdAtUnixMs: CREATED_AT,
        protocol: PROTOCOL,
        dependencies: DEPENDENCIES,
    });

    assertEqual(version.versionNumber, PARENT_VERSION.versionNumber + 1);
});

test("planned-protocol-versioning", "references the supplied parent version", () => {
    const version = createNextPlannedProtocolVersion({
        id: "planned-version-4",
        parentVersion: PARENT_VERSION,
        createdAtUnixMs: CREATED_AT,
        protocol: PROTOCOL,
        dependencies: DEPENDENCIES,
    });

    assertEqual(version.parentVersionId, PARENT_VERSION.id);
});

test("planned-protocol-versioning", "rejects an invalid parent version", () => {
    assertThrows(
        () =>
            createNextPlannedProtocolVersion({
                id: "planned-version-4",
                parentVersion: {
                    ...PARENT_VERSION,
                    id: "",
                },
                createdAtUnixMs: CREATED_AT,
                protocol: PROTOCOL,
                dependencies: DEPENDENCIES,
            }),
        /id/,
    );
});

test("planned-protocol-versioning", "does not mutate the parent version", () => {
    const parent = {
        ...PARENT_VERSION,
    };

    const original = {
        ...parent,
    };

    createNextPlannedProtocolVersion({
        id: "planned-version-4",
        parentVersion: parent,
        createdAtUnixMs: CREATED_AT,
        protocol: PROTOCOL,
        dependencies: DEPENDENCIES,
    });

    assertDeepEqual(parent, original);
});
