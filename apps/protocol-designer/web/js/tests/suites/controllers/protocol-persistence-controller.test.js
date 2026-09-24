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
    commitError = undefined,
    protocolDirty = true,
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

        renameProtocolFamily(id, displayName) {
            calls.push({
                method: "renameProtocolFamily",
                input: {
                    id,
                    displayName,
                },
            });

            return {
                id,
                displayName,
            };
        },
    };

    const durablePersistence = {
        async commit() {
            calls.push({
                method: "commit",
            });

            if (commitError !== undefined) {
                throw commitError;
            }
        },
    };

    const baselineCalls = [];

    const protocolSessionState = {
        isProtocolDirty() {
            return protocolDirty;
        },

        setBaseline(snapshot) {
            baselineCalls.push(snapshot);
        },
    };

    const controller = new ProtocolPersistenceController({
        protocolModel,
        editorState,
        protocolSessionState,
        persistenceService,
        domainVersionSync,
        durablePersistence,
    });

    return {
        calls,
        controller,
        editorState,
        baselineCalls,
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

        assertEqual(calls.length, 4);

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

        assertEqual(calls.length, 4);

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

        assertDeepEqual(calls[3], {
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

        assertDeepEqual(calls[3], {
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

        assertEqual(calls.length, 4);

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

        assertDeepEqual(calls[3], {
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

test(
    "protocol-persistence-controller",
    "commits durable state after creating a protocol",
    async () => {
        const { calls, controller } = createFixture();

        await controller.createPersistedProtocol({
            displayName: "Threshold Intervals",
            changeSummary: "Initial version",
        });

        assertDeepEqual(
            calls.map((call) => call.method),
            [
                "resolveDependencies",
                "createProtocolFamilyWithInitialVersion",
                "commit",
                "setProtocolPersistenceIdentity",
            ],
        );
    },
);

test(
    "protocol-persistence-controller",
    "commits durable state after saving a next version",
    async () => {
        const { calls, controller } = createFixture({
            protocolFamilyId: "family-1",
            plannedProtocolVersionId: "version-1",
        });

        await controller.saveNextProtocolVersion({
            changeSummary: "Raised cadence target",
        });

        assertDeepEqual(
            calls.map((call) => call.method),
            [
                "resolveDependencies",
                "createNextPlannedProtocolVersion",
                "commit",
                "setProtocolPersistenceIdentity",
            ],
        );
    },
);

test(
    "protocol-persistence-controller",
    "does not update persistence identity when durable commit fails",
    async () => {
        const { calls, controller } = createFixture({
            commitError: new Error("Commit failed."),
        });

        let error;

        try {
            await controller.createPersistedProtocol({
                displayName: "Threshold Intervals",
                changeSummary: "Initial version",
            });
        } catch (caughtError) {
            error = caughtError;
        }

        assertEqual(error?.message, "Commit failed.");

        assertDeepEqual(
            calls.map((call) => call.method),
            ["resolveDependencies", "createProtocolFamilyWithInitialVersion", "commit"],
        );
    },
);

test("protocol-persistence-controller", "renames the current protocol family", async () => {
    const { calls, controller } = createFixture({
        protocolFamilyId: "family-1",
        plannedProtocolVersionId: "version-1",
    });

    await controller.renameProtocol({
        displayName: "Updated Protocol Name",
    });

    assertDeepEqual(
        calls.filter((call) => call.method === "renameProtocolFamily"),
        [
            {
                method: "renameProtocolFamily",
                input: {
                    id: "family-1",
                    displayName: "Updated Protocol Name",
                },
            },
        ],
    );
});

test("protocol-persistence-controller", "returns the renamed protocol family", async () => {
    const { controller } = createFixture({
        protocolFamilyId: "family-1",
        plannedProtocolVersionId: "version-1",
    });

    const result = await controller.renameProtocol({
        displayName: "Updated Protocol Name",
    });

    assertDeepEqual(result, {
        id: "family-1",
        displayName: "Updated Protocol Name",
    });
});

test("protocol-persistence-controller", "commits durable state after renaming", async () => {
    const { calls, controller } = createFixture({
        protocolFamilyId: "family-1",
        plannedProtocolVersionId: "version-1",
    });

    await controller.renameProtocol({
        displayName: "Updated Protocol Name",
    });

    const renameIndex = calls.findIndex((call) => call.method === "renameProtocolFamily");
    const commitIndex = calls.findIndex((call) => call.method === "commit");

    assertEqual(renameIndex >= 0, true);
    assertEqual(commitIndex > renameIndex, true);
});

test(
    "protocol-persistence-controller",
    "rejects renaming when no protocol family is active",
    async () => {
        const { controller } = createFixture();

        let thrownError;

        try {
            await controller.renameProtocol({
                displayName: "Updated Protocol Name",
            });
        } catch (error) {
            thrownError = error;
        }

        assertEqual(
            thrownError?.message,
            "Cannot rename a protocol without an active protocol family.",
        );
    },
);

test(
    "protocol-persistence-controller",
    "rename does not update protocol persistence identity",
    async () => {
        const { calls, controller } = createFixture({
            protocolFamilyId: "family-1",
            plannedProtocolVersionId: "version-1",
        });

        await controller.renameProtocol({
            displayName: "Updated Protocol Name",
        });

        assertEqual(
            calls.some((call) => call.method === "setProtocolPersistenceIdentity"),
            false,
        );
    },
);

test(
    "protocol-persistence-controller",
    "establishes the persisted protocol as the session baseline after initial save",
    async () => {
        const { baselineCalls, controller } = createFixture();

        await controller.createPersistedProtocol({
            displayName: "Threshold Intervals",
            changeSummary: "Initial version",
        });

        assertEqual(baselineCalls.length, 1);
        assertDeepEqual(baselineCalls[0], PROTOCOL);
    },
);

test(
    "protocol-persistence-controller",
    "establishes the persisted protocol as the session baseline after saving the next version",
    async () => {
        const { baselineCalls, controller } = createFixture({
            protocolFamilyId: "family-1",
            plannedProtocolVersionId: "version-1",
        });

        await controller.saveNextProtocolVersion({
            changeSummary: "Updated version",
        });

        assertEqual(baselineCalls.length, 1);
        assertDeepEqual(baselineCalls[0], PROTOCOL);
    },
);

test(
    "protocol-persistence-controller",
    "does not establish a session baseline when durable persistence fails",
    async () => {
        const commitError = new Error("Commit failed.");
        const { baselineCalls, controller } = createFixture({
            commitError,
        });

        let error;

        try {
            await controller.createPersistedProtocol({
                displayName: "Threshold Intervals",
                changeSummary: "Initial version",
            });
        } catch (caughtError) {
            error = caughtError;
        }

        assertEqual(error, commitError);
        assertEqual(baselineCalls.length, 0);
    },
);
