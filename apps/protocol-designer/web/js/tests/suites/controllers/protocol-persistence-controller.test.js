/** Tests Protocol Designer coordination with planned-protocol persistence. */

import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { ProtocolPersistenceController } from "../../../controllers/protocol-persistence-controller.js";

const PROTOCOL = {
    name: "Threshold Intervals",
    activityTypeId: "cycling",
    phases: [],
};

const SETUP_CONTEXT = {
    activityType: { id: "cycling" },
    machineProfile: { id: "bike" },
    calibrationProfile: { id: "calibration" },
};

const DEPENDENCIES = {
    activityTypeVersionId: "activity-type-version-1",
    machineProfileVersionId: "machine-profile-version-1",
    calibrationProfileVersionId: "calibration-profile-version-1",
};

/** Creates controller dependencies with observable coordination calls. */
function createFixture() {
    const calls = [];

    const protocolModel = {
        getSnapshot() {
            return structuredClone(PROTOCOL);
        },

        getSetupContext() {
            return SETUP_CONTEXT;
        },
    };

    const domainVersionSync = {
        async resolveDependencies(setupContext) {
            calls.push({
                method: "resolveDependencies",
                input: setupContext,
            });

            return DEPENDENCIES;
        },
    };

    const persistenceService = {
        createProtocolFamilyWithInitialVersion(input) {
            calls.push({
                method: "createProtocolFamilyWithInitialVersion",
                input,
            });

            return {
                protocolFamily: {
                    id: "family-1",
                },
                plannedProtocolVersion: {
                    id: "version-1",
                },
            };
        },

        createNextPlannedProtocolVersion(input) {
            calls.push({
                method: "createNextPlannedProtocolVersion",
                input,
            });

            return {
                id: "version-2",
            };
        },
    };

    const controller = new ProtocolPersistenceController({
        protocolModel,
        persistenceService,
        domainVersionSync,
    });

    return {
        calls,
        controller,
    };
}

test(
    "protocol-persistence-controller",
    "creates a persisted protocol from the committed protocol snapshot",
    async () => {
        const { calls, controller } = createFixture();

        await controller.createPersistedProtocol({
            displayName: "Threshold Intervals",
            changeSummary: "Initial version",
        });

        assertEqual(calls.length, 2);

        assertDeepEqual(calls[0], {
            method: "resolveDependencies",
            input: SETUP_CONTEXT,
        });

        assertEqual(calls[1].method, "createProtocolFamilyWithInitialVersion");

        assertDeepEqual(calls[1].input, {
            displayName: "Threshold Intervals",
            protocol: PROTOCOL,
            dependencies: DEPENDENCIES,
            changeSummary: "Initial version",
        });
    },
);

test("protocol-persistence-controller", "returns the created persistence records", async () => {
    const { controller } = createFixture();

    const result = await controller.createPersistedProtocol({
        displayName: "Threshold Intervals",
        changeSummary: "Initial version",
    });

    assertDeepEqual(result, {
        protocolFamily: {
            id: "family-1",
        },
        plannedProtocolVersion: {
            id: "version-1",
        },
    });
});

test(
    "protocol-persistence-controller",
    "saves the committed protocol as the next planned version",
    async () => {
        const { calls, controller } = createFixture();

        await controller.saveNextProtocolVersion({
            protocolFamilyId: "family-1",
            changeSummary: "Raised cadence target",
        });

        assertEqual(calls.length, 2);

        assertDeepEqual(calls[0], {
            method: "resolveDependencies",
            input: SETUP_CONTEXT,
        });

        assertEqual(calls[1].method, "createNextPlannedProtocolVersion");

        assertDeepEqual(calls[1].input, {
            protocolFamilyId: "family-1",
            protocol: PROTOCOL,
            dependencies: DEPENDENCIES,
            changeSummary: "Raised cadence target",
        });
    },
);

test("protocol-persistence-controller", "returns the created next planned version", async () => {
    const { controller } = createFixture();

    const result = await controller.saveNextProtocolVersion({
        protocolFamilyId: "family-1",
    });

    assertDeepEqual(result, {
        id: "version-2",
    });
});
