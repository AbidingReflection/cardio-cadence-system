/** Loads shared domain data, constructs validated domain objects, and resolves their references for application use. */

import { ActivityType } from "./models/activity-type.js";
import { MachineProfile } from "./models/machine-profile.js";


/** Loads and constructs the shared domain data used by the Protocol Designer. */
export async function loadDomainData() {
    const activityTypes = await loadActivityTypes();
    const machineProfiles = await loadMachineProfiles(activityTypes);

    return {
        activityTypes,
        machineProfiles,
    };
}


/** Loads ActivityType definitions and indexes them by ID. */
async function loadActivityTypes() {
    const data = await fetchJson("/data/activity-types.json");

    if (!Array.isArray(data.activityTypes)) {
        throw new TypeError(
            "ActivityType data must contain an activityTypes array."
        );
    }

    const activityTypes = new Map();

    for (const activityTypeData of data.activityTypes) {
        const activityType = new ActivityType(activityTypeData);

        addUnique(
            activityTypes,
            activityType.id,
            activityType,
            "ActivityType"
        );
    }

    return activityTypes;
}


/** Loads MachineProfile definitions and resolves their ActivityType references. */
async function loadMachineProfiles(activityTypes) {
    const data = await fetchJson("/data/machine-profiles.json");

    if (!Array.isArray(data.machineProfiles)) {
        throw new TypeError(
            "MachineProfile data must contain a machineProfiles array."
        );
    }

    const machineProfiles = new Map();

    for (const machineProfileData of data.machineProfiles) {
        const activityType = activityTypes.get(
            machineProfileData.activityTypeId
        );

        if (activityType === undefined) {
            throw new Error(
                `MachineProfile "${machineProfileData.id}" references unknown ActivityType "${machineProfileData.activityTypeId}".`
            );
        }

        const machineProfile = new MachineProfile(
            machineProfileData,
            activityType
        );

        addUnique(
            machineProfiles,
            machineProfile.id,
            machineProfile,
            "MachineProfile"
        );
    }

    return machineProfiles;
}


/** Fetches and parses a JSON resource. */
async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Failed to load "${url}": HTTP ${response.status}.`
        );
    }

    return response.json();
}


/** Adds a value to an ID-indexed Map and rejects duplicate IDs. */
function addUnique(collection, id, value, typeName) {
    if (collection.has(id)) {
        throw new Error(
            `${typeName} IDs must be unique. Duplicate ID: "${id}".`
        );
    }

    collection.set(id, value);
}
