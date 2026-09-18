/** Tests synchronization of current domain definitions with persisted version records. */

import { assertDeepEqual, assertEqual, test } from "../../js-testing/framework/test-framework.js";

import { DomainVersionSync } from "../services/domain-version-sync.js";

/** Creates a fake library persistence API with observable calls. */
function createLibraryPersistence({
    activityTypeVersions = [],
    machineProfileVersions = [],
    calibrationProfileVersions = [],
} = {}) {
    const calls = [];

    return {
        calls,

        async listActivityTypeVersions(activityTypeId) {
            calls.push({
                method: "listActivityTypeVersions",
                activityTypeId,
            });

            return activityTypeVersions;
        },

        async createInitialActivityTypeVersion({ definition }) {
            calls.push({
                method: "createInitialActivityTypeVersion",
                definition,
            });

            return {
                id: "activity-version-created",
                activityTypeId: definition.id,
                versionNumber: 1,
                definition,
            };
        },

        async createNextActivityTypeVersion({ parentVersionId, definition }) {
            calls.push({
                method: "createNextActivityTypeVersion",
                parentVersionId,
                definition,
            });

            return {
                id: "activity-version-created",
                activityTypeId: definition.id,
                versionNumber: 2,
                parentVersionId,
                definition,
            };
        },

        async listMachineProfileVersions(machineProfileId) {
            calls.push({
                method: "listMachineProfileVersions",
                machineProfileId,
            });

            return machineProfileVersions;
        },

        async createInitialMachineProfileVersion({ activityTypeVersionId, definition }) {
            calls.push({
                method: "createInitialMachineProfileVersion",
                activityTypeVersionId,
                definition,
            });

            return {
                id: "machine-version-created",
                machineProfileId: definition.id,
                versionNumber: 1,
                activityTypeVersionId,
                definition,
            };
        },

        async createNextMachineProfileVersion({
            parentVersionId,
            activityTypeVersionId,
            definition,
        }) {
            calls.push({
                method: "createNextMachineProfileVersion",
                parentVersionId,
                activityTypeVersionId,
                definition,
            });

            return {
                id: "machine-version-created",
                machineProfileId: definition.id,
                versionNumber: 2,
                parentVersionId,
                activityTypeVersionId,
                definition,
            };
        },

        async listCalibrationProfileVersions(calibrationProfileId) {
            calls.push({
                method: "listCalibrationProfileVersions",
                calibrationProfileId,
            });

            return calibrationProfileVersions;
        },

        async createInitialCalibrationProfileVersion({ machineProfileVersionId, definition }) {
            calls.push({
                method: "createInitialCalibrationProfileVersion",
                machineProfileVersionId,
                definition,
            });

            return {
                id: "calibration-version-created",
                calibrationProfileId: definition.id,
                versionNumber: 1,
                machineProfileVersionId,
                definition,
            };
        },

        async createNextCalibrationProfileVersion({
            parentVersionId,
            machineProfileVersionId,
            definition,
        }) {
            calls.push({
                method: "createNextCalibrationProfileVersion",
                parentVersionId,
                machineProfileVersionId,
                definition,
            });

            return {
                id: "calibration-version-created",
                calibrationProfileId: definition.id,
                versionNumber: 2,
                parentVersionId,
                machineProfileVersionId,
                definition,
            };
        },
    };
}

/** Creates a lightweight domain object exposing a persisted definition. */
function createDomainObject(definition) {
    return {
        id: definition.id,

        getDefinition() {
            return structuredClone(definition);
        },
    };
}

const ACTIVITY_TYPE_DEFINITION = {
    id: "cycling",
    name: "Cycling",
    variables: [],
};

const MACHINE_PROFILE_DEFINITION = {
    id: "bike",
    name: "Bike",
    activityTypeId: "cycling",
    variables: {},
};

const CALIBRATION_PROFILE_DEFINITION = {
    id: "bike-calibration",
    name: "Bike Calibration",
    machineProfileId: "bike",
    context: {},
    domain: {},
    model: {},
};

test("domain-version-sync", "reuses a matching activity type version", async () => {
    const libraryPersistence = createLibraryPersistence({
        activityTypeVersions: [
            {
                id: "activity-version-1",
                activityTypeId: "cycling",
                versionNumber: 1,
                definition: structuredClone(ACTIVITY_TYPE_DEFINITION),
            },
        ],
    });

    const sync = new DomainVersionSync({
        libraryPersistence,
    });

    const dependencies = await sync.resolveDependencies({
        activityType: createDomainObject(ACTIVITY_TYPE_DEFINITION),
    });

    assertEqual(dependencies.activityTypeVersionId, "activity-version-1");
    assertEqual(dependencies.machineProfileVersionId, undefined);
    assertEqual(dependencies.calibrationProfileVersionId, undefined);
});

test(
    "domain-version-sync",
    "creates an initial activity type version when none exist",
    async () => {
        const libraryPersistence = createLibraryPersistence();

        const sync = new DomainVersionSync({
            libraryPersistence,
        });

        const dependencies = await sync.resolveDependencies({
            activityType: createDomainObject(ACTIVITY_TYPE_DEFINITION),
        });

        assertEqual(dependencies.activityTypeVersionId, "activity-version-created");

        assertDeepEqual(
            libraryPersistence.calls.find(
                (call) => call.method === "createInitialActivityTypeVersion",
            ),
            {
                method: "createInitialActivityTypeVersion",
                definition: ACTIVITY_TYPE_DEFINITION,
            },
        );
    },
);

test(
    "domain-version-sync",
    "creates the next activity type version when definitions differ",
    async () => {
        const libraryPersistence = createLibraryPersistence({
            activityTypeVersions: [
                {
                    id: "activity-version-1",
                    activityTypeId: "cycling",
                    versionNumber: 1,
                    definition: {
                        ...ACTIVITY_TYPE_DEFINITION,
                        name: "Old Cycling",
                    },
                },
            ],
        });

        const sync = new DomainVersionSync({
            libraryPersistence,
        });

        const dependencies = await sync.resolveDependencies({
            activityType: createDomainObject(ACTIVITY_TYPE_DEFINITION),
        });

        assertEqual(dependencies.activityTypeVersionId, "activity-version-created");

        assertDeepEqual(
            libraryPersistence.calls.find(
                (call) => call.method === "createNextActivityTypeVersion",
            ),
            {
                method: "createNextActivityTypeVersion",
                parentVersionId: "activity-version-1",
                definition: ACTIVITY_TYPE_DEFINITION,
            },
        );
    },
);

test(
    "domain-version-sync",
    "reuses a machine profile version only when its upstream activity version also matches",
    async () => {
        const libraryPersistence = createLibraryPersistence({
            activityTypeVersions: [
                {
                    id: "activity-version-1",
                    activityTypeId: "cycling",
                    versionNumber: 1,
                    definition: structuredClone(ACTIVITY_TYPE_DEFINITION),
                },
            ],
            machineProfileVersions: [
                {
                    id: "machine-version-1",
                    machineProfileId: "bike",
                    versionNumber: 1,
                    activityTypeVersionId: "activity-version-1",
                    definition: structuredClone(MACHINE_PROFILE_DEFINITION),
                },
            ],
        });

        const sync = new DomainVersionSync({
            libraryPersistence,
        });

        const dependencies = await sync.resolveDependencies({
            activityType: createDomainObject(ACTIVITY_TYPE_DEFINITION),
            machineProfile: createDomainObject(MACHINE_PROFILE_DEFINITION),
        });

        assertEqual(dependencies.activityTypeVersionId, "activity-version-1");
        assertEqual(dependencies.machineProfileVersionId, "machine-version-1");
    },
);

test(
    "domain-version-sync",
    "creates a new machine profile version when the upstream activity version differs",
    async () => {
        const libraryPersistence = createLibraryPersistence({
            activityTypeVersions: [
                {
                    id: "activity-version-2",
                    activityTypeId: "cycling",
                    versionNumber: 2,
                    definition: structuredClone(ACTIVITY_TYPE_DEFINITION),
                },
            ],
            machineProfileVersions: [
                {
                    id: "machine-version-1",
                    machineProfileId: "bike",
                    versionNumber: 1,
                    activityTypeVersionId: "activity-version-1",
                    definition: structuredClone(MACHINE_PROFILE_DEFINITION),
                },
            ],
        });

        const sync = new DomainVersionSync({
            libraryPersistence,
        });

        const dependencies = await sync.resolveDependencies({
            activityType: createDomainObject(ACTIVITY_TYPE_DEFINITION),
            machineProfile: createDomainObject(MACHINE_PROFILE_DEFINITION),
        });

        assertEqual(dependencies.machineProfileVersionId, "machine-version-created");

        assertDeepEqual(
            libraryPersistence.calls.find(
                (call) => call.method === "createNextMachineProfileVersion",
            ),
            {
                method: "createNextMachineProfileVersion",
                parentVersionId: "machine-version-1",
                activityTypeVersionId: "activity-version-2",
                definition: MACHINE_PROFILE_DEFINITION,
            },
        );
    },
);

test(
    "domain-version-sync",
    "reuses a calibration profile version only when its upstream machine version also matches",
    async () => {
        const libraryPersistence = createLibraryPersistence({
            activityTypeVersions: [
                {
                    id: "activity-version-1",
                    activityTypeId: "cycling",
                    versionNumber: 1,
                    definition: structuredClone(ACTIVITY_TYPE_DEFINITION),
                },
            ],
            machineProfileVersions: [
                {
                    id: "machine-version-1",
                    machineProfileId: "bike",
                    versionNumber: 1,
                    activityTypeVersionId: "activity-version-1",
                    definition: structuredClone(MACHINE_PROFILE_DEFINITION),
                },
            ],
            calibrationProfileVersions: [
                {
                    id: "calibration-version-1",
                    calibrationProfileId: "bike-calibration",
                    versionNumber: 1,
                    machineProfileVersionId: "machine-version-1",
                    definition: structuredClone(CALIBRATION_PROFILE_DEFINITION),
                },
            ],
        });

        const sync = new DomainVersionSync({
            libraryPersistence,
        });

        const dependencies = await sync.resolveDependencies({
            activityType: createDomainObject(ACTIVITY_TYPE_DEFINITION),
            machineProfile: createDomainObject(MACHINE_PROFILE_DEFINITION),
            calibrationProfile: createDomainObject(CALIBRATION_PROFILE_DEFINITION),
        });

        assertDeepEqual(dependencies, {
            activityTypeVersionId: "activity-version-1",
            machineProfileVersionId: "machine-version-1",
            calibrationProfileVersionId: "calibration-version-1",
        });
    },
);

test(
    "domain-version-sync",
    "creates an initial calibration profile version when none exist",
    async () => {
        const libraryPersistence = createLibraryPersistence({
            activityTypeVersions: [
                {
                    id: "activity-version-1",
                    activityTypeId: "cycling",
                    versionNumber: 1,
                    definition: structuredClone(ACTIVITY_TYPE_DEFINITION),
                },
            ],
            machineProfileVersions: [
                {
                    id: "machine-version-1",
                    machineProfileId: "bike",
                    versionNumber: 1,
                    activityTypeVersionId: "activity-version-1",
                    definition: structuredClone(MACHINE_PROFILE_DEFINITION),
                },
            ],
        });

        const sync = new DomainVersionSync({
            libraryPersistence,
        });

        const dependencies = await sync.resolveDependencies({
            activityType: createDomainObject(ACTIVITY_TYPE_DEFINITION),
            machineProfile: createDomainObject(MACHINE_PROFILE_DEFINITION),
            calibrationProfile: createDomainObject(CALIBRATION_PROFILE_DEFINITION),
        });

        assertEqual(dependencies.calibrationProfileVersionId, "calibration-version-created");

        assertDeepEqual(
            libraryPersistence.calls.find(
                (call) => call.method === "createInitialCalibrationProfileVersion",
            ),
            {
                method: "createInitialCalibrationProfileVersion",
                machineProfileVersionId: "machine-version-1",
                definition: CALIBRATION_PROFILE_DEFINITION,
            },
        );
    },
);

test(
    "domain-version-sync",
    "creates the next calibration profile version when the upstream machine version differs",
    async () => {
        const libraryPersistence = createLibraryPersistence({
            activityTypeVersions: [
                {
                    id: "activity-version-1",
                    activityTypeId: "cycling",
                    versionNumber: 1,
                    definition: structuredClone(ACTIVITY_TYPE_DEFINITION),
                },
            ],
            machineProfileVersions: [
                {
                    id: "machine-version-2",
                    machineProfileId: "bike",
                    versionNumber: 2,
                    activityTypeVersionId: "activity-version-1",
                    definition: structuredClone(MACHINE_PROFILE_DEFINITION),
                },
            ],
            calibrationProfileVersions: [
                {
                    id: "calibration-version-1",
                    calibrationProfileId: "bike-calibration",
                    versionNumber: 1,
                    machineProfileVersionId: "machine-version-1",
                    definition: structuredClone(CALIBRATION_PROFILE_DEFINITION),
                },
            ],
        });

        const sync = new DomainVersionSync({
            libraryPersistence,
        });

        const dependencies = await sync.resolveDependencies({
            activityType: createDomainObject(ACTIVITY_TYPE_DEFINITION),
            machineProfile: createDomainObject(MACHINE_PROFILE_DEFINITION),
            calibrationProfile: createDomainObject(CALIBRATION_PROFILE_DEFINITION),
        });

        assertEqual(dependencies.calibrationProfileVersionId, "calibration-version-created");

        assertDeepEqual(
            libraryPersistence.calls.find(
                (call) => call.method === "createNextCalibrationProfileVersion",
            ),
            {
                method: "createNextCalibrationProfileVersion",
                parentVersionId: "calibration-version-1",
                machineProfileVersionId: "machine-version-2",
                definition: CALIBRATION_PROFILE_DEFINITION,
            },
        );
    },
);

test(
    "domain-version-sync",
    "creates an initial machine profile version when none exist",
    async () => {
        const libraryPersistence = createLibraryPersistence({
            activityTypeVersions: [
                {
                    id: "activity-version-1",
                    activityTypeId: "cycling",
                    versionNumber: 1,
                    definition: structuredClone(ACTIVITY_TYPE_DEFINITION),
                },
            ],
        });

        const sync = new DomainVersionSync({
            libraryPersistence,
        });

        const dependencies = await sync.resolveDependencies({
            activityType: createDomainObject(ACTIVITY_TYPE_DEFINITION),
            machineProfile: createDomainObject(MACHINE_PROFILE_DEFINITION),
        });

        assertEqual(dependencies.machineProfileVersionId, "machine-version-created");

        assertDeepEqual(
            libraryPersistence.calls.find(
                (call) => call.method === "createInitialMachineProfileVersion",
            ),
            {
                method: "createInitialMachineProfileVersion",
                activityTypeVersionId: "activity-version-1",
                definition: MACHINE_PROFILE_DEFINITION,
            },
        );
    },
);
