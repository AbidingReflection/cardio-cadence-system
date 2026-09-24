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

    const resetProtocolCalls = [];
    const resetSessionCalls = [];

    const protocolModel = {
        getSetupContext() {
            return setupContext;
        },

        resetProtocol(context) {
            resetProtocolCalls.push(context);
        },
    };

    const editorState = {
        resetProtocolSession() {
            resetSessionCalls.push(true);
        },
    };

    const controller = new ProtocolNewController({
        protocolModel,
        editorState,
    });

    return {
        controller,
        setupContext,
        resetProtocolCalls,
        resetSessionCalls,
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
    };

    const editorState = {
        resetProtocolSession() {},
    };

    const controller = new ProtocolNewController({
        protocolModel,
        editorState,
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
