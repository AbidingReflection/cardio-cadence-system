import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import {
    BASE_DEPENDENCIES,
    BASE_PROTOCOL,
    createTestService,
} from "./persistence-service-fixtures.js";

test(
    "persistence-service-execution-start",
    "starts an execution for a planned protocol version",
    () => {
        const { service } = createTestService({
            ids: ["family-1", "version-1", "execution-1"],
            timestamps: [1000, 2000, 3000],
        });

        const created = service.createProtocolFamilyWithInitialVersion({
            displayName: "Threshold Intervals",
            protocol: BASE_PROTOCOL,
            dependencies: BASE_DEPENDENCIES,
        });

        const execution = service.startExecution({
            plannedProtocolVersionId: created.plannedProtocolVersion.id,
        });

        assertEqual(execution.id, "execution-1");
        assertEqual(execution.plannedProtocolVersionId, created.plannedProtocolVersion.id);
        assertEqual(execution.status, "in-progress");
        assertEqual(execution.startedAtUnixMs, 3000);
        assertEqual(execution.lastKnownActiveAtUnixMs, 3000);
        assertEqual(execution.lastKnownProtocolTimeMs, 0);
        assertEqual(execution.endedAtUnixMs, undefined);
        assertEqual(execution.completionReason, undefined);
        assertDeepEqual(execution.events, []);
    },
);

test("persistence-service-execution-start", "persists a started execution", () => {
    const { context, service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000],
    });

    const created = service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    const execution = service.startExecution({
        plannedProtocolVersionId: created.plannedProtocolVersion.id,
    });

    assertDeepEqual(context.executedProtocols.getById("execution-1"), execution);
});

test(
    "persistence-service-execution-start",
    "uses a single timestamp when starting an execution",
    () => {
        const { service } = createTestService({
            ids: ["family-1", "version-1", "execution-1"],
            timestamps: [1000, 2000, 3456],
        });

        const created = service.createProtocolFamilyWithInitialVersion({
            displayName: "Threshold Intervals",
            protocol: BASE_PROTOCOL,
            dependencies: BASE_DEPENDENCIES,
        });

        const execution = service.startExecution({
            plannedProtocolVersionId: created.plannedProtocolVersion.id,
        });

        assertEqual(execution.startedAtUnixMs, 3456);
        assertEqual(execution.lastKnownActiveAtUnixMs, 3456);
        assertEqual(execution.lastKnownProtocolTimeMs, 0);
    },
);

test(
    "persistence-service-execution-start",
    "rejects execution start for an unknown planned protocol version",
    () => {
        const { service } = createTestService({
            ids: ["execution-1"],
            timestamps: [1000],
        });

        assertThrows(
            () =>
                service.startExecution({
                    plannedProtocolVersionId: "missing-version",
                }),
            /does not exist/,
        );
    },
);
