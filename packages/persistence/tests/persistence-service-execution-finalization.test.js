import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { createStartedExecution, createTestService } from "./persistence-service-fixtures.js";

test("persistence-service-execution-finalization", "completes an in-progress execution", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000],
    });

    const execution = createStartedExecution(service);

    const completed = service.completeExecution(execution.id);

    assertEqual(completed.status, "completed");
    assertEqual(completed.endedAtUnixMs, 4000);
    assertEqual(completed.lastKnownActiveAtUnixMs, 4000);
    assertEqual(completed.completionReason, undefined);
});

test("persistence-service-execution-finalization", "ends an execution early with a reason", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000],
    });

    const execution = createStartedExecution(service);

    const ended = service.endExecutionEarly(execution.id, "Workout shortened");

    assertEqual(ended.status, "ended-early");
    assertEqual(ended.endedAtUnixMs, 4000);
    assertEqual(ended.lastKnownActiveAtUnixMs, 4000);
    assertEqual(ended.completionReason, "Workout shortened");
});

test("persistence-service-execution-finalization", "interrupts an execution with a reason", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000],
    });

    const execution = createStartedExecution(service);

    const interrupted = service.interruptExecution(execution.id, "Controller disconnected");

    assertEqual(interrupted.status, "interrupted");
    assertEqual(interrupted.endedAtUnixMs, 4000);
    assertEqual(interrupted.lastKnownActiveAtUnixMs, 3000);
    assertEqual(interrupted.completionReason, "Controller disconnected");
});

test("persistence-service-execution-finalization", "persists a finalized execution", () => {
    const { context, service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000],
    });

    const execution = createStartedExecution(service);

    const completed = service.completeExecution(execution.id);

    assertDeepEqual(context.executedProtocols.getById(execution.id), completed);
});

test(
    "persistence-service-execution-finalization",
    "rejects early ending without a completion reason",
    () => {
        const { service } = createTestService({
            ids: ["family-1", "version-1", "execution-1"],
            timestamps: [1000, 2000, 3000, 4000],
        });

        const execution = createStartedExecution(service);

        assertThrows(() => service.endExecutionEarly(execution.id, ""), /completionReason/);
    },
);

test(
    "persistence-service-execution-finalization",
    "rejects interruption without a completion reason",
    () => {
        const { service } = createTestService({
            ids: ["family-1", "version-1", "execution-1"],
            timestamps: [1000, 2000, 3000, 4000],
        });

        const execution = createStartedExecution(service);

        assertThrows(() => service.interruptExecution(execution.id, ""), /completionReason/);
    },
);

test(
    "persistence-service-execution-finalization",
    "rejects finalization of an unknown execution",
    () => {
        const { service } = createTestService();

        assertThrows(() => service.completeExecution("missing-execution"), /does not exist/);
    },
);

test("persistence-service-execution-finalization", "rejects finalizing an execution twice", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000, 5000],
    });

    const execution = createStartedExecution(service);

    service.completeExecution(execution.id);

    assertThrows(() => service.endExecutionEarly(execution.id, "Too late"), /in-progress/);
});

test(
    "persistence-service-execution-finalization",
    "rejects appending events after execution finalization",
    () => {
        const { service } = createTestService({
            ids: ["family-1", "version-1", "execution-1"],
            timestamps: [1000, 2000, 3000, 4000, 5000],
        });

        const execution = createStartedExecution(service);

        service.completeExecution(execution.id);

        assertThrows(
            () =>
                service.appendExecutionEvent(execution.id, {
                    type: "pause",
                }),
            /in-progress/,
        );
    },
);

test(
    "persistence-service-execution-finalization",
    "rejects activity updates after execution finalization",
    () => {
        const { service } = createTestService({
            ids: ["family-1", "version-1", "execution-1"],
            timestamps: [1000, 2000, 3000, 4000, 5000],
        });

        const execution = createStartedExecution(service);

        service.completeExecution(execution.id);

        assertThrows(() => service.updateExecutionActivity(execution.id), /in-progress/);
    },
);
