/** Tests Protocol Designer New Protocol orchestration. */

import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { ProtocolNewController } from "../../../controllers/protocol-new-controller.js";

function createHarness() {
    const setupContext = {
        activityType: { id: "elliptical" },
        machineProfile: { id: "machine-1" },
        calibrationProfile: { id: "calibration-1" },
    };

    const protocolSnapshot = {
        activityTypeId: "elliptical",
        machineProfileId: "machine-1",
        calibrationProfileId: "calibration-1",
        phases: [],
    };

    const resetProtocolCalls = [];
    const resetSessionCalls = [];
    const baselineCalls = [];
    const clearLastProtocolFamilyIdCalls = [];

    const protocolModel = {
        getSetupContext() {
            return setupContext;
        },

        resetProtocol(context) {
            resetProtocolCalls.push(context);
        },

        getSnapshot() {
            return protocolSnapshot;
        },
    };

    const editorState = {
        resetProtocolSession() {
            resetSessionCalls.push(true);
        },
    };

    const protocolSessionState = {
        setBaseline(snapshot) {
            baselineCalls.push(snapshot);
        },
    };

    const preferences = {
        clearLastProtocolFamilyId() {
            clearLastProtocolFamilyIdCalls.push(true);
        },
    };

    const controller = new ProtocolNewController({
        protocolModel,
        editorState,
        protocolSessionState,
        preferences,
    });

    return {
        controller,
        protocolModel,
        editorState,
        protocolSessionState,
        preferences,
        setupContext,
        protocolSnapshot,
        resetProtocolCalls,
        resetSessionCalls,
        baselineCalls,
        clearLastProtocolFamilyIdCalls,
    };
}

test("protocol-new-controller", "resets protocol using the current setup context", () => {
    const { controller, setupContext, resetProtocolCalls } = createHarness();

    controller.newProtocol();

    assertDeepEqual(resetProtocolCalls, [setupContext]);
});

test("protocol-new-controller", "resets the editor protocol session", () => {
    const { controller, resetSessionCalls } = createHarness();

    controller.newProtocol();

    assertEqual(resetSessionCalls.length, 1);
});

test("protocol-new-controller", "preserves optional setup values when resetting", () => {
    const { controller, resetProtocolCalls } = createHarness();

    controller.newProtocol();

    assertEqual(resetProtocolCalls[0].activityType.id, "elliptical");
    assertEqual(resetProtocolCalls[0].machineProfile.id, "machine-1");
    assertEqual(resetProtocolCalls[0].calibrationProfile.id, "calibration-1");
});

test("protocol-new-controller", "supports new protocols without optional setup context", () => {
    const resetProtocolCalls = [];

    const protocolSnapshot = {
        activityTypeId: "cycling",
        phases: [],
    };

    const protocolModel = {
        getSetupContext() {
            return {
                activityType: { id: "cycling" },
                machineProfile: undefined,
                calibrationProfile: undefined,
            };
        },

        resetProtocol(context) {
            resetProtocolCalls.push(context);
        },

        getSnapshot() {
            return protocolSnapshot;
        },
    };

    const editorState = {
        resetProtocolSession() {},
    };

    const preferences = {
        clearLastProtocolFamilyId() {},
    };

    const controller = new ProtocolNewController({
        protocolModel,
        editorState,
        protocolSessionState: {
            setBaseline() {},
        },
        preferences,
    });

    controller.newProtocol();

    assertDeepEqual(resetProtocolCalls, [
        {
            activityType: { id: "cycling" },
            machineProfile: undefined,
            calibrationProfile: undefined,
        },
    ]);
});

test(
    "protocol-new-controller",
    "establishes the new empty protocol as the session baseline",
    () => {
        let baseline;

        const protocolSnapshot = {
            activityTypeId: "activity-1",
            phases: [],
        };

        const protocolModel = {
            getSetupContext() {
                return {
                    activityType: { id: "activity-1" },
                };
            },

            resetProtocol() {},

            getSnapshot() {
                return protocolSnapshot;
            },
        };

        const editorState = {
            resetProtocolSession() {},
        };

        const protocolSessionState = {
            setBaseline(snapshot) {
                baseline = snapshot;
            },
        };

        const preferences = {
            clearLastProtocolFamilyId() {},
        };

        const controller = new ProtocolNewController({
            protocolModel,
            editorState,
            protocolSessionState,
            preferences,
        });

        controller.newProtocol();

        assertEqual(baseline, protocolSnapshot);
    },
);
