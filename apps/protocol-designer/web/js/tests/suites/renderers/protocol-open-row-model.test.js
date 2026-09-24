/** Tests Protocol Open row-model construction. */

import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { buildProtocolOpenRowModel } from "../../../renderers/protocol-open-row-model.js";

/** Returns a protocol family fixture. */
function createProtocolFamily(overrides = {}) {
    return {
        id: "family-1",
        createdAtUnixMs: 1000,
        displayName: "Threshold Intervals",
        archived: false,
        ...overrides,
    };
}

/** Returns a planned protocol version fixture. */
function createPlannedVersion({
    id,
    versionNumber,
    createdAtUnixMs,
    activityTypeVersionId = "activity-type-version-1",
    phases = [],
}) {
    return {
        id,
        protocolFamilyId: "family-1",
        versionNumber,
        parentVersionId: versionNumber === 1 ? undefined : `version-${versionNumber - 1}`,
        createdAtUnixMs,
        protocol: {
            id: "protocol-1",
            name: "Threshold Intervals",
            activityTypeId: "elliptical",
            phases,
        },
        dependencies: {
            activityTypeVersionId,
            machineProfileVersionId: undefined,
            calibrationProfileVersionId: undefined,
        },
        changeSummary: undefined,
    };
}

/** Returns an activity-type-version fixture. */
function createActivityTypeVersion(overrides = {}) {
    return {
        id: "activity-type-version-1",
        activityTypeId: "elliptical",
        versionNumber: 1,
        parentVersionId: undefined,
        createdAtUnixMs: 500,
        definition: {
            id: "elliptical",
            name: "Elliptical",
            variables: [],
        },
        ...overrides,
    };
}

test("protocol-open-row-model", "builds a row model from the latest planned version", () => {
    const protocolFamily = createProtocolFamily();

    const plannedVersions = [
        createPlannedVersion({
            id: "version-1",
            versionNumber: 1,
            createdAtUnixMs: 1000,
        }),
        createPlannedVersion({
            id: "version-2",
            versionNumber: 2,
            createdAtUnixMs: 2000,
        }),
    ];

    const activityTypeVersions = new Map([
        ["activity-type-version-1", createActivityTypeVersion()],
    ]);

    const row = buildProtocolOpenRowModel({
        protocolFamily,
        plannedVersions,
        getActivityTypeVersion: (id) => activityTypeVersions.get(id),
    });

    assertDeepEqual(row, {
        protocolFamilyId: "family-1",
        displayName: "Threshold Intervals",
        activityName: "Elliptical",
        phaseCount: 0,
        blockCount: 0,
        durationSeconds: 0,
        versionNumber: 2,
        updatedAtUnixMs: 2000,
    });
});

test("protocol-open-row-model", "resolves the activity display name", () => {
    const protocolFamily = createProtocolFamily();

    const plannedVersions = [
        createPlannedVersion({
            id: "version-1",
            versionNumber: 1,
            createdAtUnixMs: 1000,
            activityTypeVersionId: "activity-type-version-2",
        }),
    ];

    const activityTypeVersions = new Map([
        [
            "activity-type-version-2",
            createActivityTypeVersion({
                id: "activity-type-version-2",
                definition: {
                    id: "elliptical",
                    name: "True Elliptical",
                    variables: [],
                },
            }),
        ],
    ]);

    const row = buildProtocolOpenRowModel({
        protocolFamily,
        plannedVersions,
        getActivityTypeVersion: (id) => activityTypeVersions.get(id),
    });

    assertEqual(row.activityName, "True Elliptical");
});

test("protocol-open-row-model", "sums block durations across all phases", () => {
    const protocolFamily = createProtocolFamily();

    const plannedVersions = [
        createPlannedVersion({
            id: "version-1",
            versionNumber: 1,
            createdAtUnixMs: 1000,
            phases: [
                {
                    id: "phase-1",
                    name: "Warm-up",
                    blocks: [
                        {
                            id: "block-1",
                            name: "Warm-up",
                            durationSeconds: 300,
                            variables: {},
                        },
                        {
                            id: "block-2",
                            name: "Build",
                            durationSeconds: 600,
                            variables: {},
                        },
                    ],
                },
                {
                    id: "phase-2",
                    name: "Main",
                    blocks: [
                        {
                            id: "block-3",
                            name: "Threshold",
                            durationSeconds: 900,
                            variables: {},
                        },
                    ],
                },
            ],
        }),
    ];

    const activityTypeVersions = new Map([
        ["activity-type-version-1", createActivityTypeVersion()],
    ]);

    const row = buildProtocolOpenRowModel({
        protocolFamily,
        plannedVersions,
        getActivityTypeVersion: (id) => activityTypeVersions.get(id),
    });

    assertEqual(row.durationSeconds, 1800);
});

test("protocol-open-row-model", "uses the latest version number and timestamp", () => {
    const protocolFamily = createProtocolFamily();

    const plannedVersions = [
        createPlannedVersion({
            id: "version-3",
            versionNumber: 3,
            createdAtUnixMs: 3000,
        }),
        createPlannedVersion({
            id: "version-1",
            versionNumber: 1,
            createdAtUnixMs: 1000,
        }),
        createPlannedVersion({
            id: "version-2",
            versionNumber: 2,
            createdAtUnixMs: 2000,
        }),
    ];

    const activityTypeVersions = new Map([
        ["activity-type-version-1", createActivityTypeVersion()],
    ]);

    const row = buildProtocolOpenRowModel({
        protocolFamily,
        plannedVersions,
        getActivityTypeVersion: (id) => activityTypeVersions.get(id),
    });

    assertEqual(row.versionNumber, 3);
    assertEqual(row.updatedAtUnixMs, 3000);
});

test("protocol-open-row-model", "rejects a protocol family with no planned versions", () => {
    const protocolFamily = createProtocolFamily();

    assertThrows(() => {
        buildProtocolOpenRowModel({
            protocolFamily,
            plannedVersions: [],
            activityTypeVersions: new Map(),
        });
    }, 'Protocol family "family-1" has no planned protocol versions.');
});

test("protocol-open-row-model", "rejects a missing activity type version", () => {
    const protocolFamily = createProtocolFamily();

    const plannedVersions = [
        createPlannedVersion({
            id: "version-1",
            versionNumber: 1,
            createdAtUnixMs: 1000,
        }),
    ];

    assertThrows(() => {
        buildProtocolOpenRowModel({
            protocolFamily,
            plannedVersions,
            getActivityTypeVersion: () => undefined,
        });
    }, 'Activity type version "activity-type-version-1" was not found.');
});
