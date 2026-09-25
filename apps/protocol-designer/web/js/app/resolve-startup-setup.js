/**
 * Resolves startup setup context from stored Protocol Designer preferences.
 */

/** Resolves the preferred startup setup, falling back safely when stored references are stale. */
export function resolveStartupSetup({
    domainData,
    preferences,
    defaultActivityTypeId,
    defaultMachineProfileId,
}) {
    const lastSetup = preferences.getLastSetup();

    const activityType =
        resolveStoredActivityType(domainData, lastSetup) ??
        domainData.activityTypes.get(defaultActivityTypeId);

    if (activityType === undefined) {
        throw new Error(`Default ActivityType "${defaultActivityTypeId}" was not found.`);
    }

    const machineProfile =
        resolveStoredMachineProfile(domainData, lastSetup, activityType) ??
        resolveDefaultMachineProfile(domainData, defaultMachineProfileId, activityType);

    const calibrationProfile = resolveStoredCalibrationProfile(
        domainData,
        lastSetup,
        machineProfile,
    );

    return {
        activityType,
        machineProfile,
        calibrationProfile,
    };
}

/** Resolves a stored ActivityType when the referenced domain object still exists. */
function resolveStoredActivityType(domainData, lastSetup) {
    if (lastSetup?.activityTypeId === undefined) {
        return undefined;
    }

    return domainData.activityTypes.get(lastSetup.activityTypeId);
}

/** Resolves a stored MachineProfile when it still matches the resolved ActivityType. */
function resolveStoredMachineProfile(domainData, lastSetup, activityType) {
    if (lastSetup?.machineProfileId === undefined) {
        return undefined;
    }

    const machineProfile = domainData.machineProfiles.get(lastSetup.machineProfileId);

    if (machineProfile === undefined || machineProfile.activityTypeId !== activityType.id) {
        return undefined;
    }

    return machineProfile;
}

/** Resolves the default MachineProfile when it matches the resolved ActivityType. */
function resolveDefaultMachineProfile(domainData, defaultMachineProfileId, activityType) {
    if (defaultMachineProfileId === undefined) {
        return undefined;
    }

    const machineProfile = domainData.machineProfiles.get(defaultMachineProfileId);

    if (machineProfile === undefined || machineProfile.activityTypeId !== activityType.id) {
        return undefined;
    }

    return machineProfile;
}

/** Resolves a stored CalibrationProfile when it still matches the resolved MachineProfile. */
function resolveStoredCalibrationProfile(domainData, lastSetup, machineProfile) {
    if (lastSetup?.calibrationProfileId === undefined || machineProfile === undefined) {
        return undefined;
    }

    const calibrationProfile = domainData.calibrationProfiles.get(lastSetup.calibrationProfileId);

    if (
        calibrationProfile === undefined ||
        calibrationProfile.machineProfileId !== machineProfile.id
    ) {
        return undefined;
    }

    return calibrationProfile;
}
