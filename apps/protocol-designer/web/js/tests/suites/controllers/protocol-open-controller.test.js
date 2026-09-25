/** Tests Protocol Designer coordination when opening persisted protocols. */

import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { ProtocolOpenController } from "../../../controllers/protocol-open-controller.js";

const PROTOCOL_FAMILY = {
    id: "family-1",
    displayName: "Threshold Intervals",
    archived: false,
};

const PROTOCOL = {
    name: "Threshold Intervals",
    activityTypeId: "elliptical",
    machineProfileId: "true-elliptical-aquatic-center",
    calibrationProfileId: "true-elliptical-aquatic-center-default",
    phases: [],
};

const ACTIVITY_TYPE_VERSION = {
    id: "activity-type-version-1",
    activityTypeId: "elliptical",
    versionNumber: 1,
    definition: {
        id: "elliptical",
        name: "Elliptical",
        variables: [
            {
                id: "cadence",
                name: "Cadence",
                unit: "RPM",
                role: "cadence",
            },
            {
                id: "resistance",
                name: "Resistance",
                unit: null,
                role: "load",
            },
        ],
    },
};

const MACHINE_PROFILE_VERSION = {
    id: "machine-profile-version-1",
    machineProfileId: "true-elliptical-aquatic-center",
    versionNumber: 1,
    activityTypeVersionId: ACTIVITY_TYPE_VERSION.id,
    activityTypeId: "elliptical",
    definition: {
        id: "true-elliptical-aquatic-center",
        name: "True Elliptical - Aquatic Center",
        activityTypeId: "elliptical",
        variables: {
            cadence: {
                controlMode: "user-produced",
                progressionTypes: ["steady", "linear", "stepped"],
            },
            resistance: {
                controlMode: "machine-set",
                min: 1,
                max: 20,
                increment: 1,
                progressionTypes: ["steady", "stepped"],
            },
        },
    },
};

const CALIBRATION_PROFILE_VERSION = {
    id: "calibration-profile-version-1",
    calibrationProfileId: "true-elliptical-aquatic-center-default",
    versionNumber: 1,
    machineProfileVersionId: MACHINE_PROFILE_VERSION.id,
    machineProfileId: "true-elliptical-aquatic-center",
    definition: {
        id: "true-elliptical-aquatic-center-default",
        name: "True Elliptical - Aquatic Center Calibration",
        machineProfileId: "true-elliptical-aquatic-center",
        context: {},
        domain: {
            cadence: {
                min: 40,
                max: 70,
            },
            resistance: {
                min: 1,
                max: 19,
            },
        },
        model: {
            type: "polynomial",
            input: {
                type: "product",
                variables: ["cadence", "resistance"],
            },
            coefficients: [
                0.05319496124203944, 0.00017650576544874094, 1.9274328075989227e-7,
                -7.974104688189543e-11,
            ],
            outputUnit: "kcalPerSecond",
        },
    },
};

const PLANNED_PROTOCOL_VERSION_1 = {
    id: "planned-version-1",
    protocolFamilyId: PROTOCOL_FAMILY.id,
    versionNumber: 1,
    protocol: {
        ...PROTOCOL,
        name: "Original Threshold Intervals",
    },
    dependencies: {
        activityTypeVersionId: ACTIVITY_TYPE_VERSION.id,
        machineProfileVersionId: MACHINE_PROFILE_VERSION.id,
        calibrationProfileVersionId: CALIBRATION_PROFILE_VERSION.id,
    },
};

const PLANNED_PROTOCOL_VERSION_2 = {
    id: "planned-version-2",
    protocolFamilyId: PROTOCOL_FAMILY.id,
    versionNumber: 2,
    protocol: PROTOCOL,
    dependencies: {
        activityTypeVersionId: ACTIVITY_TYPE_VERSION.id,
        machineProfileVersionId: MACHINE_PROFILE_VERSION.id,
        calibrationProfileVersionId: CALIBRATION_PROFILE_VERSION.id,
    },
};

/** Creates controller dependencies with observable coordination calls. */
function createFixture(options = {}) {
    const { plannedProtocolVersions = [PLANNED_PROTOCOL_VERSION_2, PLANNED_PROTOCOL_VERSION_1] } =
        options;

    const protocolFamily = Object.hasOwn(options, "protocolFamily")
        ? options.protocolFamily
        : PROTOCOL_FAMILY;

    const activityTypeVersion = Object.hasOwn(options, "activityTypeVersion")
        ? options.activityTypeVersion
        : ACTIVITY_TYPE_VERSION;

    const machineProfileVersion = Object.hasOwn(options, "machineProfileVersion")
        ? options.machineProfileVersion
        : MACHINE_PROFILE_VERSION;

    const calibrationProfileVersion = Object.hasOwn(options, "calibrationProfileVersion")
        ? options.calibrationProfileVersion
        : CALIBRATION_PROFILE_VERSION;

    const calls = [];
    const preferenceCalls = [];
    const protocolFamilyPreferenceCalls = [];

    const preferences = {
        setLastSetupContext(setupContext) {
            preferenceCalls.push(setupContext);
        },

        setLastProtocolFamilyId(protocolFamilyId) {
            protocolFamilyPreferenceCalls.push(protocolFamilyId);
        },
    };

    const protocolSnapshot = {
        activityTypeId: "activity-type-1",
        phases: [],
    };

    const protocolModel = {
        replaceProtocol(protocol, activityType, machineProfile, calibrationProfile) {
            calls.push({
                method: "replaceProtocol",
                input: {
                    protocol,
                    activityType,
                    machineProfile,
                    calibrationProfile,
                },
            });
        },

        getSnapshot() {
            return protocolSnapshot;
        },
    };

    const editorState = {
        setProtocolPersistenceIdentity(identity) {
            calls.push({
                method: "setProtocolPersistenceIdentity",
                input: identity,
            });
        },
    };

    const persistenceService = {
        getProtocolFamily(protocolFamilyId) {
            calls.push({
                method: "getProtocolFamily",
                input: protocolFamilyId,
            });

            return protocolFamily;
        },

        listPlannedProtocolVersions(protocolFamilyId) {
            calls.push({
                method: "listPlannedProtocolVersions",
                input: protocolFamilyId,
            });

            return plannedProtocolVersions;
        },
    };

    const activityTypeVersionRepository = {
        getById(id) {
            calls.push({
                method: "getActivityTypeVersion",
                input: id,
            });

            return activityTypeVersion;
        },
    };

    const machineProfileVersionRepository = {
        getById(id) {
            calls.push({
                method: "getMachineProfileVersion",
                input: id,
            });

            return machineProfileVersion;
        },
    };

    const calibrationProfileVersionRepository = {
        getById(id) {
            calls.push({
                method: "getCalibrationProfileVersion",
                input: id,
            });

            return calibrationProfileVersion;
        },
    };

    const baselineCalls = [];

    const protocolSessionState = {
        setBaseline(snapshot) {
            baselineCalls.push(snapshot);
        },
    };

    const controller = new ProtocolOpenController({
        protocolModel,
        editorState,
        protocolSessionState,
        preferences,
        persistenceService,
        activityTypeVersionRepository,
        machineProfileVersionRepository,
        calibrationProfileVersionRepository,
    });

    return {
        calls,
        controller,
        baselineCalls,
        protocolSnapshot,
        preferenceCalls,
        protocolFamilyPreferenceCalls,
    };
}

test("protocol-open-controller", "opens the latest planned protocol version", () => {
    const { calls, controller } = createFixture();

    controller.openProtocolFamily(PROTOCOL_FAMILY.id);

    const replaceCall = calls.find((call) => call.method === "replaceProtocol");

    assertDeepEqual(replaceCall.input.protocol, PROTOCOL);

    assertDeepEqual(
        replaceCall.input.activityType.getDefinition(),
        ACTIVITY_TYPE_VERSION.definition,
    );

    assertDeepEqual(
        replaceCall.input.machineProfile.getDefinition(),
        MACHINE_PROFILE_VERSION.definition,
    );

    assertDeepEqual(
        replaceCall.input.calibrationProfile.getDefinition(),
        CALIBRATION_PROFILE_VERSION.definition,
    );

    assertEqual(typeof replaceCall.input.machineProfile.getVariable, "function");
});

test("protocol-open-controller", "stores the opened protocol persistence identity", () => {
    const { calls, controller } = createFixture();

    controller.openProtocolFamily(PROTOCOL_FAMILY.id);

    const identityCall = calls.find((call) => call.method === "setProtocolPersistenceIdentity");

    assertDeepEqual(identityCall.input, {
        protocolFamilyId: PROTOCOL_FAMILY.id,
        plannedProtocolVersionId: PLANNED_PROTOCOL_VERSION_2.id,
    });
});

test("protocol-open-controller", "resolves the opened protocol domain versions", () => {
    const { calls, controller } = createFixture();

    controller.openProtocolFamily(PROTOCOL_FAMILY.id);

    assertDeepEqual(
        calls.map((call) => call.method),
        [
            "getProtocolFamily",
            "listPlannedProtocolVersions",
            "getActivityTypeVersion",
            "getMachineProfileVersion",
            "getCalibrationProfileVersion",
            "replaceProtocol",
            "setProtocolPersistenceIdentity",
        ],
    );
});

test("protocol-open-controller", "rejects an unknown protocol family", () => {
    const { calls, controller } = createFixture({
        protocolFamily: undefined,
    });

    let error;

    try {
        controller.openProtocolFamily("missing-family");
    } catch (caughtError) {
        error = caughtError;
    }

    assertEqual(error?.message, 'Protocol family "missing-family" was not found.');

    assertDeepEqual(
        calls.map((call) => call.method),
        ["getProtocolFamily"],
    );
});

test("protocol-open-controller", "rejects a protocol family without planned versions", () => {
    const { calls, controller } = createFixture({
        plannedProtocolVersions: [],
    });

    let error;

    try {
        controller.openProtocolFamily(PROTOCOL_FAMILY.id);
    } catch (caughtError) {
        error = caughtError;
    }

    assertEqual(
        error?.message,
        `Protocol family "${PROTOCOL_FAMILY.id}" has no planned protocol versions.`,
    );

    assertDeepEqual(
        calls.map((call) => call.method),
        ["getProtocolFamily", "listPlannedProtocolVersions"],
    );
});

test("protocol-open-controller", "rejects a missing activity type version", () => {
    const { calls, controller } = createFixture({
        activityTypeVersion: undefined,
    });

    let error;

    try {
        controller.openProtocolFamily(PROTOCOL_FAMILY.id);
    } catch (caughtError) {
        error = caughtError;
    }

    assertEqual(
        error?.message,
        `Activity type version "${ACTIVITY_TYPE_VERSION.id}" was not found.`,
    );

    assertDeepEqual(
        calls.map((call) => call.method),
        ["getProtocolFamily", "listPlannedProtocolVersions", "getActivityTypeVersion"],
    );
});

test("protocol-open-controller", "rejects a missing machine profile version", () => {
    const { calls, controller } = createFixture({
        machineProfileVersion: undefined,
    });

    let error;

    try {
        controller.openProtocolFamily(PROTOCOL_FAMILY.id);
    } catch (caughtError) {
        error = caughtError;
    }

    assertEqual(
        error?.message,
        `Machine profile version "${MACHINE_PROFILE_VERSION.id}" was not found.`,
    );

    assertDeepEqual(
        calls.map((call) => call.method),
        [
            "getProtocolFamily",
            "listPlannedProtocolVersions",
            "getActivityTypeVersion",
            "getMachineProfileVersion",
        ],
    );
});

test("protocol-open-controller", "rejects a missing calibration profile version", () => {
    const { calls, controller } = createFixture({
        calibrationProfileVersion: undefined,
    });

    let error;

    try {
        controller.openProtocolFamily(PROTOCOL_FAMILY.id);
    } catch (caughtError) {
        error = caughtError;
    }

    assertEqual(
        error?.message,
        `Calibration profile version "${CALIBRATION_PROFILE_VERSION.id}" was not found.`,
    );

    assertDeepEqual(
        calls.map((call) => call.method),
        [
            "getProtocolFamily",
            "listPlannedProtocolVersions",
            "getActivityTypeVersion",
            "getMachineProfileVersion",
            "getCalibrationProfileVersion",
        ],
    );
});

test("protocol-open-controller", "establishes the opened protocol as the session baseline", () => {
    const fixture = createFixture();

    fixture.controller.openProtocolFamily(fixture.protocolFamilyId);

    assertEqual(fixture.baselineCalls.length, 1);
    assertEqual(fixture.baselineCalls[0], fixture.protocolSnapshot);
});

test("protocol-open-controller", "does not establish a session baseline when opening fails", () => {
    const fixture = createFixture({
        protocolFamily: undefined,
    });

    assertThrows(
        () => fixture.controller.openProtocolFamily(PROTOCOL_FAMILY.id),
        `Protocol family "${PROTOCOL_FAMILY.id}" was not found.`,
    );

    assertEqual(fixture.baselineCalls.length, 0);
});

test("protocol-open-controller", "stores the opened setup as the last-used setup", () => {
    const fixture = createFixture();

    fixture.controller.openProtocolFamily(PROTOCOL_FAMILY.id);

    assertEqual(fixture.preferenceCalls.length, 1);

    const setupContext = fixture.preferenceCalls[0];

    assertEqual(setupContext.activityType.id, ACTIVITY_TYPE_VERSION.definition.id);
    assertEqual(setupContext.machineProfile.id, MACHINE_PROFILE_VERSION.definition.id);
    assertEqual(setupContext.calibrationProfile.id, CALIBRATION_PROFILE_VERSION.definition.id);
});

test("protocol-open-controller", "does not update last-used setup when opening fails", () => {
    const fixture = createFixture({
        protocolFamily: undefined,
    });

    assertThrows(
        () => fixture.controller.openProtocolFamily(fixture.protocolFamilyId),
        `Protocol family "${fixture.protocolFamilyId}" was not found.`,
    );

    assertEqual(fixture.preferenceCalls.length, 0);
});
