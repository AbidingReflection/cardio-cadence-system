import {
    assertDeepEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { ActivityType } from "../../../models/activity-type.js";
import { MachineProfile } from "../../../models/machine-profile.js";
import { resolveProtocolGraphConfigs } from "../../../renderers/protocol-graph-config.js";

const SUITE = "Protocol graph config";

test(SUITE, "resolves cadence and load variables for elliptical activity", () => {
    const activityType = createActivityType({
        id: "elliptical",
        name: "Elliptical",
        variables: [
            {
                id: "cadence",
                name: "Cadence",
                unit: "RPM",
                role: "cadence",
            },
            {
                id: "resistance",
                name: "Resistance",
                unit: null,
                role: "load",
            },
        ],
    });

    assertDeepEqual(resolveProtocolGraphConfigs(activityType), {
        primary: {
            variableId: "cadence",
            label: "Cadence",
            unit: "RPM",
            valueMin: 0,
            valueMax: 100,
        },
        load: {
            variableId: "resistance",
            label: "Resistance",
            unit: null,
            valueMin: 0,
            valueMax: 20,
        },
    });
});

test(SUITE, "resolves pace and load variables for treadmill activity", () => {
    const activityType = createActivityType({
        id: "treadmill",
        name: "Treadmill",
        variables: [
            {
                id: "speed",
                name: "Speed",
                unit: "MPH",
                role: "pace",
            },
            {
                id: "incline",
                name: "Incline",
                unit: "%",
                role: "load",
            },
        ],
    });

    assertDeepEqual(resolveProtocolGraphConfigs(activityType), {
        primary: {
            variableId: "speed",
            label: "Speed",
            unit: "MPH",
            valueMin: 0,
            valueMax: 10,
        },
        load: {
            variableId: "incline",
            label: "Incline",
            unit: "%",
            valueMin: 0,
            valueMax: 20,
        },
    });
});

test(SUITE, "uses machine bounds when available", () => {
    const activityType = createActivityType({
        id: "treadmill",
        name: "Treadmill",
        variables: [
            {
                id: "speed",
                name: "Speed",
                unit: "MPH",
                role: "pace",
            },
            {
                id: "incline",
                name: "Incline",
                unit: "%",
                role: "load",
            },
        ],
    });

    const machineProfile = new MachineProfile(
        {
            id: "machine",
            name: "Machine",
            activityTypeId: "treadmill",
            variables: {
                speed: {
                    controlMode: "machine-set",
                    min: 0.5,
                    max: 10,
                    increment: 0.1,
                    progressionTypes: ["steady"],
                },
                incline: {
                    controlMode: "machine-set",
                    min: 0,
                    max: 10,
                    increment: 0.5,
                    progressionTypes: ["steady"],
                },
            },
        },
        activityType,
    );

    assertDeepEqual(resolveProtocolGraphConfigs(activityType, machineProfile), {
        primary: {
            variableId: "speed",
            label: "Speed",
            unit: "MPH",
            valueMin: 0.5,
            valueMax: 10,
        },
        load: {
            variableId: "incline",
            label: "Incline",
            unit: "%",
            valueMin: 0,
            valueMax: 10,
        },
    });
});

test(SUITE, "uses fallback bounds when machine bounds are absent", () => {
    const activityType = createActivityType({
        id: "rowing",
        name: "Rowing Ergometer",
        variables: [
            {
                id: "strokeRate",
                name: "Stroke Rate",
                unit: "SPM",
                role: "cadence",
            },
            {
                id: "dragFactor",
                name: "Drag Factor",
                unit: null,
                role: "load",
            },
        ],
    });

    const machineProfile = new MachineProfile(
        {
            id: "rower",
            name: "Rower",
            activityTypeId: "rowing",
            variables: {
                strokeRate: {
                    controlMode: "user-produced",
                    progressionTypes: ["steady"],
                },
                dragFactor: {
                    controlMode: "machine-set",
                    progressionTypes: ["steady"],
                },
            },
        },
        activityType,
    );

    assertDeepEqual(resolveProtocolGraphConfigs(activityType, machineProfile), {
        primary: {
            variableId: "strokeRate",
            label: "Stroke Rate",
            unit: "SPM",
            valueMin: 0,
            valueMax: 100,
        },
        load: {
            variableId: "dragFactor",
            label: "Drag Factor",
            unit: null,
            valueMin: 0,
            valueMax: 20,
        },
    });
});

test(SUITE, "throws when no primary graph role is defined", () => {
    const activityType = createActivityType({
        id: "load-only",
        name: "Load Only",
        variables: [
            {
                id: "resistance",
                name: "Resistance",
                unit: null,
                role: "load",
            },
        ],
    });

    assertThrows(
        () => resolveProtocolGraphConfigs(activityType),
        'ActivityType "load-only" does not define a variable with role cadence or pace.',
    );
});

test(SUITE, "throws when no load graph role is defined", () => {
    const activityType = createActivityType({
        id: "cadence-only",
        name: "Cadence Only",
        variables: [
            {
                id: "cadence",
                name: "Cadence",
                unit: "RPM",
                role: "cadence",
            },
        ],
    });

    assertThrows(
        () => resolveProtocolGraphConfigs(activityType),
        'ActivityType "cadence-only" does not define a variable with role load.',
    );
});

/** Creates a validated ActivityType fixture. */
function createActivityType(data) {
    return new ActivityType(data);
}
