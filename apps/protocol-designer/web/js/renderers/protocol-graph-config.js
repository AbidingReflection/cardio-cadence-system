/** Resolves Protocol Designer graph configurations for the current activity type. */
export function resolveProtocolGraphConfigs(activityType) {
    const primaryVariable = findVariableByRoles(activityType, ["cadence", "pace"]);
    const loadVariable = findVariableByRoles(activityType, ["load"]);

    return {
        primary: createGraphConfig(primaryVariable),
        load: createGraphConfig(loadVariable),
    };
}

/** Returns the first ActivityType variable matching one of the requested roles. */
function findVariableByRoles(activityType, roles) {
    const variable = activityType.variables.find((candidate) => roles.includes(candidate.role));

    if (variable === undefined) {
        throw new Error(
            `ActivityType "${activityType.id}" does not define a variable with role ${roles.join(
                " or ",
            )}.`,
        );
    }

    return variable;
}

/** Builds one graph configuration from an activity variable. */
function createGraphConfig(variable) {
    return {
        variableId: variable.id,
        label: variable.name,
        unit: variable.unit,
    };
}
