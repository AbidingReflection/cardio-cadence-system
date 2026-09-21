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

test("persistence-service-execution-updates", "appends a timestamped execution event", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000],
    });

    const created = service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    const execution = service.startExecution({
        plannedProtocolVersionId: created.plannedProtocolVersion.id,
    });

    const updated = service.appendExecutionEvent(execution.id, {
        type: "pause",
    });

    assertEqual(updated.events.length, 1);
    assertEqual(updated.events[0].type, "pause");
    assertEqual(updated.events[0].occurredAtUnixMs, 4000);
});

test(
    "persistence-service-execution-updates",
    "preserves existing execution events when appending",
    () => {
        const { service } = createTestService({
            ids: ["family-1", "version-1", "execution-1"],
            timestamps: [1000, 2000, 3000, 4000, 5000],
        });

        const created = service.createProtocolFamilyWithInitialVersion({
            displayName: "Threshold Intervals",
            protocol: BASE_PROTOCOL,
            dependencies: BASE_DEPENDENCIES,
        });

        const execution = service.startExecution({
            plannedProtocolVersionId: created.plannedProtocolVersion.id,
        });

        service.appendExecutionEvent(execution.id, {
            type: "pause",
        });

        const updated = service.appendExecutionEvent(execution.id, {
            type: "resume",
        });

        assertEqual(updated.events.length, 2);
        assertEqual(updated.events[0].type, "pause");
        assertEqual(updated.events[0].occurredAtUnixMs, 4000);
        assertEqual(updated.events[1].type, "resume");
        assertEqual(updated.events[1].occurredAtUnixMs, 5000);
    },
);

test("persistence-service-execution-updates", "persists appended execution events", () => {
    const { context, service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000],
    });

    const created = service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    const execution = service.startExecution({
        plannedProtocolVersionId: created.plannedProtocolVersion.id,
    });

    const updated = service.appendExecutionEvent(execution.id, {
        type: "pause",
    });

    assertDeepEqual(context.executedProtocols.getById(execution.id), updated);
});

test(
    "persistence-service-execution-updates",
    "rejects appending an event to an unknown execution",
    () => {
        const { service } = createTestService({
            timestamps: [1000],
        });

        assertThrows(
            () =>
                service.appendExecutionEvent("missing-execution", {
                    type: "pause",
                }),
            /does not exist/,
        );
    },
);

test("persistence-service-execution-updates", "rejects invalid pause and resume sequencing", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000],
    });

    const created = service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    const execution = service.startExecution({
        plannedProtocolVersionId: created.plannedProtocolVersion.id,
    });

    assertThrows(
        () =>
            service.appendExecutionEvent(execution.id, {
                type: "resume",
            }),
        /resume event while running/,
    );
});

test("persistence-service-execution-updates", "updates execution activity timestamp", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000],
    });

    const created = service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    const execution = service.startExecution({
        plannedProtocolVersionId: created.plannedProtocolVersion.id,
    });

    const updated = service.updateExecutionActivity(execution.id);

    assertEqual(updated.lastKnownActiveAtUnixMs, 4000);
});

test("persistence-service-execution-updates", "persists updated execution activity", () => {
    const { context, service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000],
    });

    const created = service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    const execution = service.startExecution({
        plannedProtocolVersionId: created.plannedProtocolVersion.id,
    });

    const updated = service.updateExecutionActivity(execution.id);

    assertDeepEqual(context.executedProtocols.getById(execution.id), updated);
});

test(
    "persistence-service-execution-updates",
    "preserves execution history when updating activity",
    () => {
        const { service } = createTestService({
            ids: ["family-1", "version-1", "execution-1"],
            timestamps: [1000, 2000, 3000, 4000, 5000],
        });

        const created = service.createProtocolFamilyWithInitialVersion({
            displayName: "Threshold Intervals",
            protocol: BASE_PROTOCOL,
            dependencies: BASE_DEPENDENCIES,
        });

        const execution = service.startExecution({
            plannedProtocolVersionId: created.plannedProtocolVersion.id,
        });

        service.appendExecutionEvent(execution.id, {
            type: "pause",
        });

        const updated = service.updateExecutionActivity(execution.id);

        assertEqual(updated.lastKnownActiveAtUnixMs, 5000);
        assertEqual(updated.events.length, 1);
        assertEqual(updated.events[0].type, "pause");
        assertEqual(updated.events[0].occurredAtUnixMs, 4000);
    },
);

test(
    "persistence-service-execution-updates",
    "rejects activity updates for an unknown execution",
    () => {
        const { service } = createTestService({
            timestamps: [1000],
        });

        assertThrows(() => service.updateExecutionActivity("missing-execution"), /does not exist/);
    },
);
