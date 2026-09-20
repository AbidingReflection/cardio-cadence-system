/** Tests Protocol Designer coordination when opening persisted protocols. */

import {
    assertDeepEqual,
    assertEqual,
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
    activityTypeId: "cycling",
    machineProfileId: "bike",
    calibrationProfileId: "bike-calibration",
    phases: [],
};

const ACTIVITY_TYPE_VERSION = {
    id: "activity-type-version-1",
    activityTypeId: "cycling",
    versionNumber: 1,
    definition: {
        id: "cycling",
        name: "Cycling",
        variables: [],
    },
};

const MACHINE_PROFILE_VERSION = {
    id: "machine-profile-version-1",
    machineProfileId: "bike",
    versionNumber: 1,
    activityTypeVersionId: ACTIVITY_TYPE_VERSION.id,
    definition: {
        id: "bike",
        name: "Bike",
        activityTypeId: "cycling",
        variables: {},
    },
};

const CALIBRATION_PROFILE_VERSION = {
    id: "calibration-profile-version-1",
    calibrationProfileId: "bike-calibration",
    versionNumber: 1,
    machineProfileVersionId: MACHINE_PROFILE_VERSION.id,
    definition: {
        id: "bike-calibration",
        name: "Bike Calibration",
        machineProfileId: "bike",
        context: {},
        domain: {},
        model: {},
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

    const controller = new ProtocolOpenController({
        protocolModel,
        editorState,
        persistenceService,
        activityTypeVersionRepository,
        machineProfileVersionRepository,
        calibrationProfileVersionRepository,
    });

    return {
        calls,
        controller,
    };
}

test("protocol-open-controller", "opens the latest planned protocol version", () => {
    const { calls, controller } = createFixture();

    controller.openProtocolFamily(PROTOCOL_FAMILY.id);

    const replaceCall = calls.find((call) => call.method === "replaceProtocol");

    assertDeepEqual(replaceCall.input, {
        protocol: PROTOCOL,
        activityType: ACTIVITY_TYPE_VERSION.definition,
        machineProfile: MACHINE_PROFILE_VERSION.definition,
        calibrationProfile: CALIBRATION_PROFILE_VERSION.definition,
    });
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
