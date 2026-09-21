import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import {
    BASE_DEPENDENCIES,
    BASE_PROTOCOL,
    createStartedExecution,
    createTestService,
} from "./persistence-service-fixtures.js";

test("persistence-service-execution-queries", "returns an execution by ID", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000],
    });

    const execution = createStartedExecution(service);

    assertDeepEqual(service.getExecution(execution.id), execution);
});

test("persistence-service-execution-queries", "returns undefined for a missing execution", () => {
    const { service } = createTestService();

    assertEqual(service.getExecution("missing-execution"), undefined);
});

test(
    "persistence-service-execution-queries",
    "lists executions for a planned protocol version",
    () => {
        const { service } = createTestService({
            ids: ["family-1", "version-1", "execution-1", "execution-2"],
            timestamps: [1000, 2000, 3000, 4000],
        });

        const created = service.createProtocolFamilyWithInitialVersion({
            displayName: "Threshold Intervals",
            protocol: BASE_PROTOCOL,
            dependencies: BASE_DEPENDENCIES,
        });

        const firstExecution = service.startExecution({
            plannedProtocolVersionId: created.plannedProtocolVersion.id,
        });

        const secondExecution = service.startExecution({
            plannedProtocolVersionId: created.plannedProtocolVersion.id,
        });

        const executions = service.listExecutionsForPlannedVersion(
            created.plannedProtocolVersion.id,
        );

        assertEqual(executions.length, 2);
        assertDeepEqual(executions[0], firstExecution);
        assertDeepEqual(executions[1], secondExecution);
    },
);

test("persistence-service-execution-queries", "lists executions in start-time order", () => {
    const { context, service } = createTestService({
        ids: ["family-1", "version-1"],
        timestamps: [1000, 2000],
    });

    const created = service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    context.executedProtocols.add({
        id: "execution-late",
        plannedProtocolVersionId: created.plannedProtocolVersion.id,
        status: "in-progress",
        startedAtUnixMs: 5000,
        lastKnownActiveAtUnixMs: 5000,
        endedAtUnixMs: undefined,
        completionReason: undefined,
        events: [],
    });

    context.executedProtocols.add({
        id: "execution-early",
        plannedProtocolVersionId: created.plannedProtocolVersion.id,
        status: "in-progress",
        startedAtUnixMs: 3000,
        lastKnownActiveAtUnixMs: 3000,
        endedAtUnixMs: undefined,
        completionReason: undefined,
        events: [],
    });

    const executions = service.listExecutionsForPlannedVersion(created.plannedProtocolVersion.id);

    assertEqual(executions[0].id, "execution-early");
    assertEqual(executions[1].id, "execution-late");
});

test(
    "persistence-service-execution-queries",
    "returns an empty execution list when none exist",
    () => {
        const { service } = createTestService();

        assertDeepEqual(service.listExecutionsForPlannedVersion("missing-version"), []);
    },
);
