/** Shared helpers and fixtures for PersistenceService tests. */

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

export { BASE_DEPENDENCIES, BASE_PROTOCOL, createStartedExecution, createTestService };
