import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { ProtocolImportController } from "../../../controllers/protocol-import-controller.js";

function createHarness({ replaceProtocolError = undefined, bundle = undefined } = {}) {
    const calls = {
        replaceProtocol: [],
        resetProtocolSession: 0,
        clearProtocolPersistenceIdentity: 0,
        setBaseline: [],
        setLastSetupContext: [],
        clearLastProtocolFamilyId: 0,
    };

    const importedProtocol = {
        id: "protocol-1",
        name: "Imported Protocol",
        activityTypeId: "activity-1",
        machineProfileId: "machine-1",
        calibrationProfileId: "calibration-1",
        phases: [],
    };

    const protocolBundle = bundle ?? {
        protocol: importedProtocol,
        activityType: {
            id: "activity-1",
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
        machineProfile: {
            id: "machine-1",
            name: "Test Machine",
            activityTypeId: "activity-1",
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
        calibrationProfile: {
            id: "calibration-1",
            name: "Test Calibration",
            machineProfileId: "machine-1",
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

    const importedSnapshot = structuredClone(importedProtocol);

    const protocolModel = {
        replaceProtocol(protocol, activityType, machineProfile, calibrationProfile) {
            if (replaceProtocolError !== undefined) {
                throw replaceProtocolError;
            }

            calls.replaceProtocol.push({
                protocol,
                activityType,
                machineProfile,
                calibrationProfile,
            });
        },

        getSnapshot() {
            return structuredClone(importedSnapshot);
        },
    };

    const editorState = {
        resetProtocolSession() {
            calls.resetProtocolSession += 1;
        },

        clearProtocolPersistenceIdentity() {
            calls.clearProtocolPersistenceIdentity += 1;
        },
    };

    const protocolSessionState = {
        setBaseline(protocolSnapshot) {
            calls.setBaseline.push(structuredClone(protocolSnapshot));
        },
    };

    const preferences = {
        setLastSetupContext(setupContext) {
            calls.setLastSetupContext.push(setupContext);
        },

        clearLastProtocolFamilyId() {
            calls.clearLastProtocolFamilyId += 1;
        },
    };

    const controller = new ProtocolImportController({
        protocolModel,
        editorState,
        protocolSessionState,
        preferences,
    });

    return {
        controller,
        protocolBundle,
        importedProtocol,
        importedSnapshot,
        calls,
    };
}

test("protocol-import-controller", "imports protocol bundle into protocol model", () => {
    const { controller, protocolBundle, calls } = createHarness();

    controller.importProtocolBundle(protocolBundle);

    assertEqual(calls.replaceProtocol.length, 1);

    const replacement = calls.replaceProtocol[0];

    assertDeepEqual(replacement.protocol, protocolBundle.protocol);

    assertDeepEqual(replacement.activityType.getDefinition(), protocolBundle.activityType);

    assertDeepEqual(replacement.machineProfile.getDefinition(), protocolBundle.machineProfile);

    assertDeepEqual(
        replacement.calibrationProfile.getDefinition(),
        protocolBundle.calibrationProfile,
    );
});

test("protocol-import-controller", "resets editor protocol session after import", () => {
    const { controller, protocolBundle, calls } = createHarness();

    controller.importProtocolBundle(protocolBundle);

    assertEqual(calls.resetProtocolSession, 1);
});

test("protocol-import-controller", "clears persisted protocol identity after import", () => {
    const { controller, protocolBundle, calls } = createHarness();

    controller.importProtocolBundle(protocolBundle);

    assertEqual(calls.clearProtocolPersistenceIdentity, 1);
});

test("protocol-import-controller", "establishes imported protocol as session baseline", () => {
    const { controller, protocolBundle, importedSnapshot, calls } = createHarness();

    controller.importProtocolBundle(protocolBundle);

    assertEqual(calls.setBaseline.length, 1);
    assertDeepEqual(calls.setBaseline[0], importedSnapshot);
});

test("protocol-import-controller", "stores imported setup as last-used setup", () => {
    const { controller, protocolBundle, calls } = createHarness();

    controller.importProtocolBundle(protocolBundle);

    assertEqual(calls.setLastSetupContext.length, 1);

    const setupContext = calls.setLastSetupContext[0];

    assertDeepEqual(setupContext.activityType.getDefinition(), protocolBundle.activityType);

    assertDeepEqual(setupContext.machineProfile.getDefinition(), protocolBundle.machineProfile);

    assertDeepEqual(
        setupContext.calibrationProfile.getDefinition(),
        protocolBundle.calibrationProfile,
    );
});

test("protocol-import-controller", "clears last protocol family after import", () => {
    const { controller, protocolBundle, calls } = createHarness();

    controller.importProtocolBundle(protocolBundle);

    assertEqual(calls.clearLastProtocolFamilyId, 1);
});

test("protocol-import-controller", "supports bundles without optional setup profiles", () => {
    const bundle = {
        protocol: {
            id: "protocol-1",
            name: "Imported Protocol",
            activityTypeId: "activity-1",
            phases: [],
        },
        activityType: {
            id: "activity-1",
            name: "Rowing",
            variables: [
                {
                    id: "cadence",
                    name: "Cadence",
                    unit: "SPM",
                    role: "cadence",
                },
            ],
        },
        machineProfile: null,
        calibrationProfile: null,
    };

    const { controller, calls } = createHarness({ bundle });

    controller.importProtocolBundle(bundle);

    assertEqual(calls.replaceProtocol.length, 1);

    const replacement = calls.replaceProtocol[0];

    assertDeepEqual(replacement.activityType.getDefinition(), bundle.activityType);

    assertEqual(replacement.machineProfile, undefined);
    assertEqual(replacement.calibrationProfile, undefined);

    assertEqual(calls.setLastSetupContext.length, 1);

    const setupContext = calls.setLastSetupContext[0];

    assertEqual(setupContext.machineProfile, undefined);
    assertEqual(setupContext.calibrationProfile, undefined);
});

test(
    "protocol-import-controller",
    "does not update editor or session state when protocol replacement fails",
    () => {
        const replacementError = new Error("Protocol replacement failed.");

        const { controller, protocolBundle, calls } = createHarness({
            replaceProtocolError: replacementError,
        });

        assertThrows(
            () => controller.importProtocolBundle(protocolBundle),
            "Protocol replacement failed.",
        );

        assertEqual(calls.resetProtocolSession, 0);
        assertEqual(calls.clearProtocolPersistenceIdentity, 0);
        assertEqual(calls.setBaseline.length, 0);
        assertEqual(calls.setLastSetupContext.length, 0);
        assertEqual(calls.clearLastProtocolFamilyId, 0);
    },
);
