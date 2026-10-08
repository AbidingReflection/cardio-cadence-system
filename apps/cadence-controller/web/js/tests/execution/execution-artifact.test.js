import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { createExecutionArtifact } from "../../execution/execution-artifact.js";

/** Creates representative self-contained protocol-bundle data. */
function createProtocolBundleSnapshot() {
    return {
        protocol: {
            id: "protocol-1",
            name: "Test Protocol",
            activityTypeId: "elliptical",
            machineProfileId: "machine-1",
            calibrationProfileId: "calibration-1",
            phases: [],
        },
        activityType: {
            id: "elliptical",
            name: "Elliptical",
            variables: [],
        },
        machineProfile: {
            id: "machine-1",
            name: "Test Machine",
        },
        calibrationProfile: {
            id: "calibration-1",
            name: "Test Calibration",
        },
    };
}

/** Creates representative completed execution data. */
function createCompletedExecutionSnapshot() {
    return {
        status: "completed",
        startedAtUnixMs: 1_000,
        endedAtUnixMs: 5_000,
        lastKnownActiveAtUnixMs: 5_000,
        lastKnownProtocolTimeMs: 60_000,
        completionReason: undefined,
        events: [
            {
                type: "pause",
                occurredAtUnixMs: 2_000,
            },
            {
                type: "resume",
                occurredAtUnixMs: 3_000,
            },
        ],
    };
}

test("execution-artifact", "creates a self-contained execution artifact", () => {
    const protocolBundle = createProtocolBundleSnapshot();
    const execution = createCompletedExecutionSnapshot();

    const artifact = createExecutionArtifact({
        protocolBundle,
        execution,
    });

    assertDeepEqual(artifact, {
        protocolBundle,
        execution,
    });
});

test("execution-artifact", "accepts an execution that ended early", () => {
    const execution = createCompletedExecutionSnapshot();

    execution.status = "ended-early";
    execution.completionReason = "manual-stop";

    const artifact = createExecutionArtifact({
        protocolBundle: createProtocolBundleSnapshot(),
        execution,
    });

    assertEqual(artifact.execution.status, "ended-early");
    assertEqual(artifact.execution.completionReason, "manual-stop");
});

test("execution-artifact", "rejects an in-progress execution", () => {
    const execution = createCompletedExecutionSnapshot();

    execution.status = "in-progress";
    execution.endedAtUnixMs = undefined;

    assertThrows(
        () =>
            createExecutionArtifact({
                protocolBundle: createProtocolBundleSnapshot(),
                execution,
            }),
        /finalized/i,
    );
});

test("execution-artifact", "protects artifact data from source mutation", () => {
    const protocolBundle = createProtocolBundleSnapshot();
    const execution = createCompletedExecutionSnapshot();

    const artifact = createExecutionArtifact({
        protocolBundle,
        execution,
    });

    protocolBundle.protocol.name = "Changed Protocol";
    protocolBundle.machineProfile.name = "Changed Machine";
    execution.status = "ended-early";
    execution.events[0].type = "resume";

    assertEqual(artifact.protocolBundle.protocol.name, "Test Protocol");
    assertEqual(artifact.protocolBundle.machineProfile.name, "Test Machine");
    assertEqual(artifact.execution.status, "completed");
    assertEqual(artifact.execution.events[0].type, "pause");
});

test("execution-artifact", "protects source data from artifact mutation", () => {
    const protocolBundle = createProtocolBundleSnapshot();
    const execution = createCompletedExecutionSnapshot();

    const artifact = createExecutionArtifact({
        protocolBundle,
        execution,
    });

    artifact.protocolBundle.protocol.name = "Changed Protocol";
    artifact.execution.events[0].type = "resume";

    assertEqual(protocolBundle.protocol.name, "Test Protocol");
    assertEqual(execution.events[0].type, "pause");
});
