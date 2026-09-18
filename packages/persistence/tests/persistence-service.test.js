/** Tests application-facing persistence service behavior for protocol families and versions. */

import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { PersistenceContext } from "../persistence-context.js";
import { PersistenceService } from "../services/persistence-service.js";

const BASE_PROTOCOL = {
    name: "Base Protocol",
};

const BASE_DEPENDENCIES = {
    activityTypeVersionId: "activity-type-version-1",
};

/** Creates a deterministic persistence service for tests. */
function createTestService({
    ids = ["family-1", "version-1", "version-2", "version-3"],
    timestamps = [1000, 2000, 3000, 4000],
} = {}) {
    const context = new PersistenceContext();

    let idIndex = 0;
    let timestampIndex = 0;

    const idGenerator = () => ids[idIndex++];
    const clock = () => timestamps[timestampIndex++];

    const service = new PersistenceService({
        protocolFamilyRepository: context.protocolFamilies,
        plannedProtocolVersionRepository: context.plannedProtocolVersions,
        executedProtocolRepository: context.executedProtocols,
        idGenerator,
        clock,
    });

    return {
        context,
        service,
    };
}

/** Creates and starts a protocol execution for service tests. */
function createStartedExecution(service) {
    const created = service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    return service.startExecution({
        plannedProtocolVersionId: created.plannedProtocolVersion.id,
    });
}

test("persistence-service", "creates a protocol family with an initial planned version", () => {
    const { service } = createTestService();

    const result = service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
        changeSummary: "Initial version",
    });

    assertEqual(result.protocolFamily.id, "family-1");
    assertEqual(result.protocolFamily.displayName, "Threshold Intervals");
    assertEqual(result.protocolFamily.createdAtUnixMs, 1000);
    assertEqual(result.protocolFamily.archived, false);

    assertEqual(result.plannedProtocolVersion.id, "version-1");
    assertEqual(result.plannedProtocolVersion.protocolFamilyId, "family-1");
    assertEqual(result.plannedProtocolVersion.versionNumber, 1);
    assertEqual(result.plannedProtocolVersion.parentVersionId, undefined);
    assertEqual(result.plannedProtocolVersion.createdAtUnixMs, 2000);
});

test("persistence-service", "returns the created protocol family and planned version", () => {
    const { service } = createTestService();

    const result = service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    assertDeepEqual(service.getProtocolFamily("family-1"), result.protocolFamily);

    assertDeepEqual(service.getPlannedProtocolVersion("version-1"), result.plannedProtocolVersion);
});

test("persistence-service", "uses service-generated ids and timestamps", () => {
    const { service } = createTestService({
        ids: ["generated-family", "generated-version"],
        timestamps: [1111, 2222],
    });

    const result = service.createProtocolFamilyWithInitialVersion({
        displayName: "Generated",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    assertEqual(result.protocolFamily.id, "generated-family");
    assertEqual(result.protocolFamily.createdAtUnixMs, 1111);

    assertEqual(result.plannedProtocolVersion.id, "generated-version");
    assertEqual(result.plannedProtocolVersion.createdAtUnixMs, 2222);
});

test(
    "persistence-service",
    "creates the next planned version from the latest family version",
    () => {
        const { service } = createTestService();

        const initial = service.createProtocolFamilyWithInitialVersion({
            displayName: "Threshold Intervals",
            protocol: BASE_PROTOCOL,
            dependencies: BASE_DEPENDENCIES,
        });

        const nextVersion = service.createNextPlannedProtocolVersion({
            protocolFamilyId: initial.protocolFamily.id,
            protocol: {
                name: "Updated Protocol",
            },
            dependencies: BASE_DEPENDENCIES,
            changeSummary: "Raised cadence target",
        });

        assertEqual(nextVersion.id, "version-2");
        assertEqual(nextVersion.protocolFamilyId, "family-1");
        assertEqual(nextVersion.versionNumber, 2);
        assertEqual(nextVersion.parentVersionId, "version-1");
        assertEqual(nextVersion.createdAtUnixMs, 3000);
    },
);

test("persistence-service", "increments versions from the latest planned version", () => {
    const { service } = createTestService();

    const initial = service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    const second = service.createNextPlannedProtocolVersion({
        protocolFamilyId: initial.protocolFamily.id,
        protocol: {
            name: "Version 2",
        },
        dependencies: BASE_DEPENDENCIES,
    });

    const third = service.createNextPlannedProtocolVersion({
        protocolFamilyId: initial.protocolFamily.id,
        protocol: {
            name: "Version 3",
        },
        dependencies: BASE_DEPENDENCIES,
    });

    assertEqual(second.versionNumber, 2);
    assertEqual(second.parentVersionId, "version-1");

    assertEqual(third.versionNumber, 3);
    assertEqual(third.parentVersionId, "version-2");
});

test("persistence-service", "rejects next-version creation for an unknown protocol family", () => {
    const { service } = createTestService();

    assertThrows(
        () =>
            service.createNextPlannedProtocolVersion({
                protocolFamilyId: "missing-family",
                protocol: BASE_PROTOCOL,
                dependencies: BASE_DEPENDENCIES,
            }),
        /ProtocolFamily "missing-family" does not exist/,
    );
});

test("persistence-service", "lists active protocol families by default", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "family-2", "version-2"],
        timestamps: [1000, 1100, 2000, 2100],
    });

    service.createProtocolFamilyWithInitialVersion({
        displayName: "Active",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    const archived = service.createProtocolFamilyWithInitialVersion({
        displayName: "Archived",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    service.archiveProtocolFamily(archived.protocolFamily.id);

    const families = service.listProtocolFamilies();

    assertEqual(families.length, 1);
    assertEqual(families[0].displayName, "Active");
});

test("persistence-service", "includes archived protocol families when requested", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "family-2", "version-2"],
        timestamps: [1000, 1100, 2000, 2100],
    });

    service.createProtocolFamilyWithInitialVersion({
        displayName: "Active",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    const archived = service.createProtocolFamilyWithInitialVersion({
        displayName: "Archived",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    service.archiveProtocolFamily(archived.protocolFamily.id);

    const families = service.listProtocolFamilies({
        includeArchived: true,
    });

    assertEqual(families.length, 2);
});

test("persistence-service", "renames a protocol family", () => {
    const { service } = createTestService();

    const created = service.createProtocolFamilyWithInitialVersion({
        displayName: "Original Name",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    const updated = service.renameProtocolFamily(created.protocolFamily.id, "Updated Name");

    assertEqual(updated.displayName, "Updated Name");

    assertEqual(service.getProtocolFamily(created.protocolFamily.id).displayName, "Updated Name");
});

test("persistence-service", "archives a protocol family", () => {
    const { service } = createTestService();

    const created = service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    const archived = service.archiveProtocolFamily(created.protocolFamily.id);

    assertEqual(archived.archived, true);
});

test("persistence-service", "restores an archived protocol family", () => {
    const { service } = createTestService();

    const created = service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    service.archiveProtocolFamily(created.protocolFamily.id);

    const restored = service.restoreProtocolFamily(created.protocolFamily.id);

    assertEqual(restored.archived, false);
});

test("persistence-service", "lists planned protocol versions for a family in version order", () => {
    const { service } = createTestService();

    const initial = service.createProtocolFamilyWithInitialVersion({
        displayName: "Threshold Intervals",
        protocol: BASE_PROTOCOL,
        dependencies: BASE_DEPENDENCIES,
    });

    service.createNextPlannedProtocolVersion({
        protocolFamilyId: initial.protocolFamily.id,
        protocol: {
            name: "Version 2",
        },
        dependencies: BASE_DEPENDENCIES,
    });

    service.createNextPlannedProtocolVersion({
        protocolFamilyId: initial.protocolFamily.id,
        protocol: {
            name: "Version 3",
        },
        dependencies: BASE_DEPENDENCIES,
    });

    const versions = service.listPlannedProtocolVersions(initial.protocolFamily.id);

    assertEqual(versions.length, 3);
    assertEqual(versions[0].versionNumber, 1);
    assertEqual(versions[1].versionNumber, 2);
    assertEqual(versions[2].versionNumber, 3);
});

test(
    "persistence-service",
    "does not leave a protocol family behind when initial version persistence fails",
    () => {
        const context = new PersistenceContext();

        const plannedProtocolVersionRepository = {
            add() {
                throw new Error("Simulated planned version persistence failure.");
            },
        };

        const service = new PersistenceService({
            protocolFamilyRepository: context.protocolFamilies,
            plannedProtocolVersionRepository,
            idGenerator: () => "family-1",
            clock: () => 1000,
        });

        assertThrows(
            () =>
                service.createProtocolFamilyWithInitialVersion({
                    displayName: "Threshold Intervals",
                    protocol: BASE_PROTOCOL,
                    dependencies: BASE_DEPENDENCIES,
                }),
            /Simulated planned version persistence failure/,
        );

        assertEqual(context.protocolFamilies.getById("family-1"), undefined);
    },
);

test("persistence-service", "starts an execution for a planned protocol version", () => {
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
    assertEqual(execution.endedAtUnixMs, undefined);
    assertEqual(execution.completionReason, undefined);
    assertDeepEqual(execution.events, []);
});

test("persistence-service", "persists a started execution", () => {
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

test("persistence-service", "uses a single timestamp when starting an execution", () => {
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
});

test(
    "persistence-service",
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

test("persistence-service", "appends a timestamped execution event", () => {
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

test("persistence-service", "preserves existing execution events when appending", () => {
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
});

test("persistence-service", "persists appended execution events", () => {
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

test("persistence-service", "rejects appending an event to an unknown execution", () => {
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
});

test("persistence-service", "rejects invalid pause and resume sequencing", () => {
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

test("persistence-service", "updates execution activity timestamp", () => {
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

test("persistence-service", "persists updated execution activity", () => {
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

test("persistence-service", "preserves execution history when updating activity", () => {
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
});

test("persistence-service", "rejects activity updates for an unknown execution", () => {
    const { service } = createTestService({
        timestamps: [1000],
    });

    assertThrows(() => service.updateExecutionActivity("missing-execution"), /does not exist/);
});

test("persistence-service", "completes an in-progress execution", () => {
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

test("persistence-service", "ends an execution early with a reason", () => {
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

test("persistence-service", "interrupts an execution with a reason", () => {
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

test("persistence-service", "persists a finalized execution", () => {
    const { context, service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000],
    });

    const execution = createStartedExecution(service);

    const completed = service.completeExecution(execution.id);

    assertDeepEqual(context.executedProtocols.getById(execution.id), completed);
});

test("persistence-service", "rejects early ending without a completion reason", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000],
    });

    const execution = createStartedExecution(service);

    assertThrows(() => service.endExecutionEarly(execution.id, ""), /completionReason/);
});

test("persistence-service", "rejects interruption without a completion reason", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000],
    });

    const execution = createStartedExecution(service);

    assertThrows(() => service.interruptExecution(execution.id, ""), /completionReason/);
});

test("persistence-service", "rejects finalization of an unknown execution", () => {
    const { service } = createTestService();

    assertThrows(() => service.completeExecution("missing-execution"), /does not exist/);
});

test("persistence-service", "rejects finalizing an execution twice", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000, 5000],
    });

    const execution = createStartedExecution(service);

    service.completeExecution(execution.id);

    assertThrows(() => service.endExecutionEarly(execution.id, "Too late"), /in-progress/);
});

test("persistence-service", "rejects appending events after execution finalization", () => {
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
});

test("persistence-service", "rejects activity updates after execution finalization", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000, 5000],
    });

    const execution = createStartedExecution(service);

    service.completeExecution(execution.id);

    assertThrows(() => service.updateExecutionActivity(execution.id), /in-progress/);
});

test("persistence-service", "recovers an in-progress execution", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000],
    });

    const execution = createStartedExecution(service);

    const recovered = service.recoverExecution(execution.id);

    assertEqual(recovered.status, "in-progress");
    assertEqual(recovered.lastKnownActiveAtUnixMs, 4000);
});

test("persistence-service", "appends a recovery event with prior activity time", () => {
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
});

test("persistence-service", "persists recovered execution state", () => {
    const { context, service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000],
    });

    const execution = createStartedExecution(service);

    const recovered = service.recoverExecution(execution.id);

    assertDeepEqual(context.executedProtocols.getById(execution.id), recovered);
});

test("persistence-service", "preserves existing events during recovery", () => {
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
});

test("persistence-service", "rejects recovery of an unknown execution", () => {
    const { service } = createTestService();

    assertThrows(() => service.recoverExecution("missing-execution"), /does not exist/);
});

test("persistence-service", "rejects recovery of a completed execution", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000, 5000],
    });

    const execution = createStartedExecution(service);

    service.completeExecution(execution.id);

    assertThrows(() => service.recoverExecution(execution.id), /in-progress/);
});

test("persistence-service", "rejects recovery of an early-ended execution", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000, 5000],
    });

    const execution = createStartedExecution(service);

    service.endExecutionEarly(execution.id, "Workout shortened");

    assertThrows(() => service.recoverExecution(execution.id), /in-progress/);
});

test("persistence-service", "rejects recovery of an interrupted execution", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000, 4000, 5000],
    });

    const execution = createStartedExecution(service);

    service.interruptExecution(execution.id, "Controller disconnected");

    assertThrows(() => service.recoverExecution(execution.id), /in-progress/);
});

test("persistence-service", "returns an execution by ID", () => {
    const { service } = createTestService({
        ids: ["family-1", "version-1", "execution-1"],
        timestamps: [1000, 2000, 3000],
    });

    const execution = createStartedExecution(service);

    assertDeepEqual(service.getExecution(execution.id), execution);
});

test("persistence-service", "returns undefined for a missing execution", () => {
    const { service } = createTestService();

    assertEqual(service.getExecution("missing-execution"), undefined);
});

test("persistence-service", "lists executions for a planned protocol version", () => {
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

    const executions = service.listExecutionsForPlannedVersion(created.plannedProtocolVersion.id);

    assertEqual(executions.length, 2);
    assertDeepEqual(executions[0], firstExecution);
    assertDeepEqual(executions[1], secondExecution);
});

test("persistence-service", "lists executions in start-time order", () => {
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

test("persistence-service", "returns an empty execution list when none exist", () => {
    const { service } = createTestService();

    assertDeepEqual(service.listExecutionsForPlannedVersion("missing-version"), []);
});
