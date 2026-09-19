/** Creates and restores versioned snapshots of persistence repository state. */

/** Creates a complete versioned snapshot from persistence repositories. */
export function createPersistenceSnapshot({
    protocolFamilyRepository,
    plannedProtocolVersionRepository,
    executedProtocolRepository,
    activityTypeVersionRepository,
    machineProfileVersionRepository,
    calibrationProfileVersionRepository,
}) {
    return {
        schemaVersion: 1,
        protocolFamilies: protocolFamilyRepository.list(),
        plannedProtocolVersions: plannedProtocolVersionRepository.listAll(),
        executedProtocols: executedProtocolRepository.listAll(),
        activityTypeVersions: activityTypeVersionRepository.listAll(),
        machineProfileVersions: machineProfileVersionRepository.listAll(),
        calibrationProfileVersions: calibrationProfileVersionRepository.listAll(),
    };
}

/** Hydrates repositories from a supported persistence snapshot. */
export function hydratePersistenceSnapshot(
    snapshot,
    {
        protocolFamilyRepository,
        plannedProtocolVersionRepository,
        executedProtocolRepository,
        activityTypeVersionRepository,
        machineProfileVersionRepository,
        calibrationProfileVersionRepository,
    },
) {
    if (snapshot.schemaVersion !== 1) {
        throw new Error(
            `Unsupported persistence snapshot schemaVersion "${snapshot.schemaVersion}".`,
        );
    }

    for (const record of snapshot.activityTypeVersions) {
        activityTypeVersionRepository.add(record);
    }

    for (const record of snapshot.machineProfileVersions) {
        machineProfileVersionRepository.add(record);
    }

    for (const record of snapshot.calibrationProfileVersions) {
        calibrationProfileVersionRepository.add(record);
    }

    for (const record of snapshot.protocolFamilies) {
        protocolFamilyRepository.add(record);
    }

    for (const record of snapshot.plannedProtocolVersions) {
        plannedProtocolVersionRepository.add(record);
    }

    for (const record of snapshot.executedProtocols) {
        executedProtocolRepository.add(record);
    }
}
