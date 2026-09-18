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
function createFixture({
    protocolFamilyId = undefined,
    plannedProtocolVersionId = undefined,
} = {}) {
    const calls = [];

    const protocolModel = {
        getSnapshot() {
            return structuredClone(PROTOCOL);
        },

        getSetupContext() {
            return SETUP_CONTEXT;
        },
    };

    const editorState = {
        getSnapshot() {
            return {
                protocolFamilyId,
                plannedProtocolVersionId,
            };
        },

        setProtocolPersistenceIdentity(identity) {
            calls.push({
                method: "setProtocolPersistenceIdentity",
                input: identity,
            });

            protocolFamilyId = identity.protocolFamilyId;
            plannedProtocolVersionId = identity.plannedProtocolVersionId;
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
        editorState,
        persistenceService,
        domainVersionSync,
    });

    return {
        calls,
        controller,
        editorState,
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

        assertEqual(calls.length, 3);

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
        const { calls, controller } = createFixture({
            protocolFamilyId: "family-1",
            plannedProtocolVersionId: "version-1",
        });

        await controller.saveNextProtocolVersion({
            changeSummary: "Raised cadence target",
        });

        assertEqual(calls.length, 3);

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

        assertDeepEqual(calls[2], {
            method: "setProtocolPersistenceIdentity",
            input: {
                protocolFamilyId: "family-1",
                plannedProtocolVersionId: "version-2",
            },
        });
    },
);

test("protocol-persistence-controller", "returns the created next planned version", async () => {
    const { controller } = createFixture({
        protocolFamilyId: "family-1",
        plannedProtocolVersionId: "version-1",
    });

    const result = await controller.saveNextProtocolVersion();

    assertDeepEqual(result, {
        id: "version-2",
    });
});

test(
    "protocol-persistence-controller",
    "stores persistence identity after creating a persisted protocol",
    async () => {
        const { calls, controller } = createFixture();

        await controller.createPersistedProtocol({
            displayName: "Threshold Intervals",
            changeSummary: "Initial version",
        });

        assertDeepEqual(calls[2], {
            method: "setProtocolPersistenceIdentity",
            input: {
                protocolFamilyId: "family-1",
                plannedProtocolVersionId: "version-1",
            },
        });
    },
);

test(
    "protocol-persistence-controller",
    "saves the next version for the current protocol family",
    async () => {
        const { calls, controller } = createFixture({
            protocolFamilyId: "family-1",
            plannedProtocolVersionId: "version-1",
        });

        await controller.saveNextProtocolVersion({
            changeSummary: "Raised cadence target",
        });

        assertEqual(calls.length, 3);

        assertDeepEqual(calls[0], {
            method: "resolveDependencies",
            input: SETUP_CONTEXT,
        });

        assertDeepEqual(calls[1], {
            method: "createNextPlannedProtocolVersion",
            input: {
                protocolFamilyId: "family-1",
                protocol: PROTOCOL,
                dependencies: DEPENDENCIES,
                changeSummary: "Raised cadence target",
            },
        });

        assertDeepEqual(calls[2], {
            method: "setProtocolPersistenceIdentity",
            input: {
                protocolFamilyId: "family-1",
                plannedProtocolVersionId: "version-2",
            },
        });
    },
);

test(
    "protocol-persistence-controller",
    "rejects saving a next version when no protocol family is active",
    async () => {
        const { controller } = createFixture();

        let error;

        try {
            await controller.saveNextProtocolVersion();
        } catch (caughtError) {
            error = caughtError;
        }

        assertEqual(
            error?.message,
            "Cannot save a next protocol version without an active protocol family.",
        );
    },
);

test(
    "protocol-persistence-controller",
    "saveProtocol creates a persisted protocol when no family is active",
    async () => {
        const { calls, controller } = createFixture();

        const result = await controller.saveProtocol({
            displayName: "Threshold Intervals",
            changeSummary: "Initial version",
        });

        assertEqual(
            calls.some((call) => call.method === "createProtocolFamilyWithInitialVersion"),
            true,
        );

        assertDeepEqual(result, {
            protocolFamily: {
                id: "family-1",
            },
            plannedProtocolVersion: {
                id: "version-1",
            },
        });
    },
);

test(
    "protocol-persistence-controller",
    "saveProtocol creates the next version when a family is active",
    async () => {
        const { calls, controller } = createFixture({
            protocolFamilyId: "family-1",
            plannedProtocolVersionId: "version-1",
        });

        const result = await controller.saveProtocol({
            displayName: "Ignored for existing family",
            changeSummary: "Raised cadence target",
        });

        assertEqual(
            calls.some((call) => call.method === "createNextPlannedProtocolVersion"),
            true,
        );

        assertDeepEqual(result, {
            id: "version-2",
        });
    },
);

test(
    "protocol-persistence-controller",
    "saveProtocol does not create a new family when one is already active",
    async () => {
        const { calls, controller } = createFixture({
            protocolFamilyId: "family-1",
            plannedProtocolVersionId: "version-1",
        });

        await controller.saveProtocol({
            displayName: "Threshold Intervals",
        });

        assertEqual(
            calls.some((call) => call.method === "createProtocolFamilyWithInitialVersion"),
            false,
        );
    },
);
