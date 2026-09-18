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

const DEPENDENCIES = {
    activityTypeVersionId: "activity-type-version-1",
    machineProfileVersionId: "machine-profile-version-1",
    calibrationProfileVersionId: "calibration-profile-version-1",
};

/** Creates controller dependencies with observable persistence calls. */
function createFixture() {
    const calls = [];

    const protocolModel = {
        getSnapshot() {
            return structuredClone(PROTOCOL);
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
    });

    return {
        calls,
        controller,
    };
}

test(
    "protocol-persistence-controller",
     "creates a persisted protocol from the committed protocol snapshot",
     () => {
         const { calls, controller } = createFixture();

         controller.createPersistedProtocol({
             displayName: "Threshold Intervals",
             dependencies: DEPENDENCIES,
             changeSummary: "Initial version",
         });

         assertEqual(calls.length, 1);
         assertEqual(
             calls[0].method,
             "createProtocolFamilyWithInitialVersion",
         );

         assertDeepEqual(calls[0].input, {
             displayName: "Threshold Intervals",
             protocol: PROTOCOL,
             dependencies: DEPENDENCIES,
             changeSummary: "Initial version",
         });
     },
);

test(
    "protocol-persistence-controller",
     "returns the created persistence records",
     () => {
         const { controller } = createFixture();

         const result = controller.createPersistedProtocol({
             displayName: "Threshold Intervals",
             dependencies: DEPENDENCIES,
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
     },
);

test(
    "protocol-persistence-controller",
     "saves the committed protocol as the next planned version",
     () => {
         const { calls, controller } = createFixture();

         controller.saveNextProtocolVersion({
             protocolFamilyId: "family-1",
             dependencies: DEPENDENCIES,
             changeSummary: "Raised cadence target",
         });

         assertEqual(calls.length, 1);
         assertEqual(
             calls[0].method,
             "createNextPlannedProtocolVersion",
         );

         assertDeepEqual(calls[0].input, {
             protocolFamilyId: "family-1",
             protocol: PROTOCOL,
             dependencies: DEPENDENCIES,
             changeSummary: "Raised cadence target",
         });
     },
);

test(
    "protocol-persistence-controller",
     "returns the created next planned version",
     () => {
         const { controller } = createFixture();

         const result = controller.saveNextProtocolVersion({
             protocolFamilyId: "family-1",
             dependencies: DEPENDENCIES,
         });

         assertDeepEqual(result, {
             id: "version-2",
         });
     },
);
