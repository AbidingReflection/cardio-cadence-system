import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { createStartedExecution, createTestService } from "./persistence-service-fixtures.js";

test("persistence-service-execution-recovery", "recovers an in-progress execution", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000],
    });

    const execution = createStartedExecution(service);

    const recovered = service.recoverExecution(execution.id);

    assertEqual(recovered.status, "in-progress");
    assertEqual(recovered.lastKnownActiveAtUnixMs, 4000);
    assertEqual(recovered.lastKnownProtocolTimeMs, 0);
});

test(
    "persistence-service-execution-recovery",
    "appends a recovery event with prior activity time",
    () => {
        const { service } = createTestService({
            ids: ["family-1", "version-1", "execution-1"],
            timestamps: [1000, 2000, 3000, 4000],
        });

        const execution = createStartedExecution(service);

        const recovered = service.recoverExecution(execution.id);

        assertEqual(recovered.events.length, 1);
        assertEqual(recovered.events[0].type, "recovery");
        assertEqual(recovered.events[0].occurredAtUnixMs, 4000);
        assertEqual(recovered.events[0].lastKnownActiveAtUnixMs, 3000);
        assertEqual(recovered.events[0].lastKnownProtocolTimeMs, 0);
    },
);

test("persistence-service-execution-recovery", "persists recovered execution state", () => {
    const { context, service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000],
    });

    const execution = createStartedExecution(service);

    const recovered = service.recoverExecution(execution.id);

    assertDeepEqual(context.executedProtocols.getById(execution.id), recovered);
});

test("persistence-service-execution-recovery", "preserves existing events during recovery", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000, 5000],
    });

    const execution = createStartedExecution(service);

    service.appendExecutionEvent(execution.id, {
        type: "pause",
    });

    const recovered = service.recoverExecution(execution.id);

    assertEqual(recovered.events.length, 2);

    assertEqual(recovered.events[0].type, "pause");
    assertEqual(recovered.events[0].occurredAtUnixMs, 4000);

    assertEqual(recovered.events[1].type, "recovery");
    assertEqual(recovered.events[1].occurredAtUnixMs, 5000);
    assertEqual(recovered.events[1].lastKnownActiveAtUnixMs, 3000);
    assertEqual(recovered.events[1].lastKnownProtocolTimeMs, 0);
});

test("persistence-service-execution-recovery", "rejects recovery of an unknown execution", () => {
    const { service } = createTestService();

    assertThrows(() => service.recoverExecution("missing-execution"), /does not exist/);
});

test("persistence-service-execution-recovery", "rejects recovery of a completed execution", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000, 5000],
    });

    const execution = createStartedExecution(service);

    service.completeExecution(execution.id);

    assertThrows(() => service.recoverExecution(execution.id), /in-progress/);
});

test(
    "persistence-service-execution-recovery",
    "rejects recovery of an early-ended execution",
    () => {
        const { service } = createTestService({
            ids: ["family-1", "version-1", "execution-1"],
            timestamps: [1000, 2000, 3000, 4000, 5000],
        });

        const execution = createStartedExecution(service);

        service.endExecutionEarly(execution.id, "Workout shortened");

        assertThrows(() => service.recoverExecution(execution.id), /in-progress/);
    },
);

test(
    "persistence-service-execution-recovery",
    "rejects recovery of an interrupted execution",
    () => {
        const { service } = createTestService({
            ids: ["family-1", "version-1", "execution-1"],
            timestamps: [1000, 2000, 3000, 4000, 5000],
        });

        const execution = createStartedExecution(service);

        service.interruptExecution(execution.id, "Controller disconnected");

        assertThrows(() => service.recoverExecution(execution.id), /in-progress/);
    },
);
