import {
    assertDeepEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import {
    createPlannedProtocolVersion,
    validatePlannedProtocolVersion,
} from "../planned-protocol-version.js";

const VALID_PROTOCOL = {
    id: "protocol-1",
    name: "Threshold Intervals",
};

const VALID_DEPENDENCIES = {
    activityTypeVersionId: "activity-type-version-1",
    machineProfileVersionId: undefined,
    calibrationProfileVersionId: undefined,
};

test("planned-protocol-version", "creates a valid first planned protocol version", () => {
    const version = createPlannedProtocolVersion({
        id: "planned-version-1",
        protocolFamilyId: "family-1",
        versionNumber: 1,
        createdAtUnixMs: 1_789_360_000_000,
        protocol: VALID_PROTOCOL,
        dependencies: VALID_DEPENDENCIES,
    });

    assertDeepEqual(version, {
        id: "planned-version-1",
        protocolFamilyId: "family-1",
        versionNumber: 1,
        parentVersionId: undefined,
        createdAtUnixMs: 1_789_360_000_000,
        protocol: VALID_PROTOCOL,
        dependencies: VALID_DEPENDENCIES,
        changeSummary: undefined,
    });
});

test("planned-protocol-version", "accepts a later version with a parent", () => {
    validatePlannedProtocolVersion({
        id: "planned-version-2",
        protocolFamilyId: "family-1",
        versionNumber: 2,
        parentVersionId: "planned-version-1",
        createdAtUnixMs: 1_789_360_100_000,
        protocol: VALID_PROTOCOL,
        dependencies: VALID_DEPENDENCIES,
        changeSummary: "Raised interval cadence.",
    });
});

test("planned-protocol-version", "rejects a missing record ID", () => {
    assertThrows(
        () =>
            validatePlannedProtocolVersion({
                id: "",
                protocolFamilyId: "family-1",
                versionNumber: 1,
                createdAtUnixMs: 1_789_360_000_000,
                protocol: VALID_PROTOCOL,
                dependencies: VALID_DEPENDENCIES,
            }),
        /id/,
    );
});

test("planned-protocol-version", "rejects a missing protocol family ID", () => {
    assertThrows(
        () =>
            validatePlannedProtocolVersion({
                id: "planned-version-1",
                protocolFamilyId: "",
                versionNumber: 1,
                createdAtUnixMs: 1_789_360_000_000,
                protocol: VALID_PROTOCOL,
                dependencies: VALID_DEPENDENCIES,
            }),
        /protocolFamilyId/,
    );
});

test("planned-protocol-version", "rejects a non-positive version number", () => {
    assertThrows(
        () =>
            validatePlannedProtocolVersion({
                id: "planned-version-1",
                protocolFamilyId: "family-1",
                versionNumber: 0,
                createdAtUnixMs: 1_789_360_000_000,
                protocol: VALID_PROTOCOL,
                dependencies: VALID_DEPENDENCIES,
            }),
        /versionNumber/,
    );
});

test("planned-protocol-version", "rejects a non-integer version number", () => {
    assertThrows(
        () =>
            validatePlannedProtocolVersion({
                id: "planned-version-1",
                protocolFamilyId: "family-1",
                versionNumber: 1.5,
                createdAtUnixMs: 1_789_360_000_000,
                protocol: VALID_PROTOCOL,
                dependencies: VALID_DEPENDENCIES,
            }),
        /versionNumber/,
    );
});

test("planned-protocol-version", "rejects a parent on version one", () => {
    assertThrows(
        () =>
            validatePlannedProtocolVersion({
                id: "planned-version-1",
                protocolFamilyId: "family-1",
                versionNumber: 1,
                parentVersionId: "planned-version-0",
                createdAtUnixMs: 1_789_360_000_000,
                protocol: VALID_PROTOCOL,
                dependencies: VALID_DEPENDENCIES,
            }),
        /parentVersionId/,
    );
});

test("planned-protocol-version", "requires a parent after version one", () => {
    assertThrows(
        () =>
            validatePlannedProtocolVersion({
                id: "planned-version-2",
                protocolFamilyId: "family-1",
                versionNumber: 2,
                createdAtUnixMs: 1_789_360_100_000,
                protocol: VALID_PROTOCOL,
                dependencies: VALID_DEPENDENCIES,
            }),
        /parentVersionId/,
    );
});

test("planned-protocol-version", "rejects an invalid creation timestamp", () => {
    assertThrows(
        () =>
            validatePlannedProtocolVersion({
                id: "planned-version-1",
                protocolFamilyId: "family-1",
                versionNumber: 1,
                createdAtUnixMs: NaN,
                protocol: VALID_PROTOCOL,
                dependencies: VALID_DEPENDENCIES,
            }),
        /createdAtUnixMs/,
    );
});

test("planned-protocol-version", "rejects a non-object protocol", () => {
    assertThrows(
        () =>
            validatePlannedProtocolVersion({
                id: "planned-version-1",
                protocolFamilyId: "family-1",
                versionNumber: 1,
                createdAtUnixMs: 1_789_360_000_000,
                protocol: null,
                dependencies: VALID_DEPENDENCIES,
            }),
        /protocol/,
    );
});

test("planned-protocol-version", "requires an activity type version", () => {
    assertThrows(
        () =>
            validatePlannedProtocolVersion({
                id: "planned-version-1",
                protocolFamilyId: "family-1",
                versionNumber: 1,
                createdAtUnixMs: 1_789_360_000_000,
                protocol: VALID_PROTOCOL,
                dependencies: {
                    activityTypeVersionId: "",
                },
            }),
        /activityTypeVersionId/,
    );
});

test("planned-protocol-version", "accepts a machine profile without calibration", () => {
    validatePlannedProtocolVersion({
        id: "planned-version-1",
        protocolFamilyId: "family-1",
        versionNumber: 1,
        createdAtUnixMs: 1_789_360_000_000,
        protocol: VALID_PROTOCOL,
        dependencies: {
            activityTypeVersionId: "activity-type-version-1",
            machineProfileVersionId: "machine-profile-version-1",
        },
    });
});

test("planned-protocol-version", "requires a machine profile when calibration is supplied", () => {
    assertThrows(
        () =>
            validatePlannedProtocolVersion({
                id: "planned-version-1",
                protocolFamilyId: "family-1",
                versionNumber: 1,
                createdAtUnixMs: 1_789_360_000_000,
                protocol: VALID_PROTOCOL,
                dependencies: {
                    activityTypeVersionId: "activity-type-version-1",
                    calibrationProfileVersionId: "calibration-profile-version-1",
                },
            }),
        /machineProfileVersionId/,
    );
});

test(
    "planned-protocol-version",
    "accepts machine and calibration profile versions together",
    () => {
        validatePlannedProtocolVersion({
            id: "planned-version-1",
            protocolFamilyId: "family-1",
            versionNumber: 1,
            createdAtUnixMs: 1_789_360_000_000,
            protocol: VALID_PROTOCOL,
            dependencies: {
                activityTypeVersionId: "activity-type-version-1",
                machineProfileVersionId: "machine-profile-version-1",
                calibrationProfileVersionId: "calibration-profile-version-1",
            },
        });
    },
);

test("planned-protocol-version", "rejects a non-string change summary", () => {
    assertThrows(
        () =>
            validatePlannedProtocolVersion({
                id: "planned-version-2",
                protocolFamilyId: "family-1",
                versionNumber: 2,
                parentVersionId: "planned-version-1",
                createdAtUnixMs: 1_789_360_100_000,
                protocol: VALID_PROTOCOL,
                dependencies: VALID_DEPENDENCIES,
                changeSummary: 42,
            }),
        /changeSummary/,
    );
});
