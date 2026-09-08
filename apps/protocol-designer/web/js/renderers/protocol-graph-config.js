const FALLBACK_VALUE_DOMAINS = {
    cadence: {
        min: 0,
        max: 100,
    },
    pace: {
        min: 0,
        max: 10,
    },
    load: {
        min: 0,
        max: 20,
    },
};

/** Resolves Protocol Designer graph configurations for the current setup. */
export function resolveProtocolGraphConfigs(activityType, machineProfile = undefined) {
    const primaryVariable = findVariableByRoles(activityType, ["cadence", "pace"]);
    const loadVariable = findVariableByRoles(activityType, ["load"]);

    return {
        primary: createGraphConfig(primaryVariable, machineProfile),
        load: createGraphConfig(loadVariable, machineProfile),
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

/** Builds one graph configuration from an activity variable and optional machine bounds. */
function createGraphConfig(variable, machineProfile) {
    const fallbackDomain = FALLBACK_VALUE_DOMAINS[variable.role];

    if (fallbackDomain === undefined) {
        throw new Error(
            `No fallback graph value domain is defined for variable role "${variable.role}".`,
        );
    }

    const machineVariable = machineProfile?.getVariable(variable.id);

    const valueMin = Number.isFinite(machineVariable?.min)
        ? machineVariable.min
        : fallbackDomain.min;

    const valueMax = Number.isFinite(machineVariable?.max)
        ? machineVariable.max
        : fallbackDomain.max;

    if (!(valueMin < valueMax)) {
        throw new Error(`Graph value range for variable "${variable.id}" must have min < max.`);
    }

    return {
        variableId: variable.id,
        label: variable.name,
        unit: variable.unit,
        valueMin,
        valueMax,
    };
}
