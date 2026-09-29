import {
    assertEqual,
    assertDeepEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { ActivityType } from "../../../models/activity-type.js";
import { resolveProtocolGraphConfigs } from "../../../renderers/protocol-graph-config.js";

const SUITE = "protocol-graph-config";

/** Creates a validated ActivityType fixture. */
function createActivityType(data) {
    return new ActivityType(data);
}

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

    const configs = resolveProtocolGraphConfigs(activityType);

    assertEqual(configs.primary.variableId, "cadence");
    assertEqual(configs.primary.label, "Cadence");
    assertEqual(configs.primary.unit, "RPM");

    assertEqual(configs.load.variableId, "resistance");
    assertEqual(configs.load.label, "Resistance");
    assertEqual(configs.load.unit, null);
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
        },
        load: {
            variableId: "incline",
            label: "Incline",
            unit: "%",
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

    assertDeepEqual(resolveProtocolGraphConfigs(activityType), {
        primary: {
            variableId: "speed",
            label: "Speed",
            unit: "MPH",
        },
        load: {
            variableId: "incline",
            label: "Incline",
            unit: "%",
        },
    });
});

test(SUITE, "builds graph configs from pace and load variables", () => {
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
        },
        load: {
            variableId: "incline",
            label: "Incline",
            unit: "%",
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
