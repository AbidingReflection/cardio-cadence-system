import {
    test,
    assertEqual,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import { ActivityType } from "../../../models/activity-type.js";
import { MachineProfile } from "../../../models/machine-profile.js";

const VALID_ACTIVITY_TYPE = {
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
            unit: "level",
            role: "load",
        },
    ],
};

test("activity-type", "constructs a valid ActivityType", () => {
    const activityType = new ActivityType(VALID_ACTIVITY_TYPE);

    assertEqual(activityType.id, "elliptical");
    assertEqual(activityType.name, "Elliptical");
});

test("activity-type", "returns all activity variables", () => {
    const activityType = new ActivityType(VALID_ACTIVITY_TYPE);

    assertDeepEqual(activityType.variables, VALID_ACTIVITY_TYPE.variables);
});

test("activity-type", "returns a variable by ID", () => {
    const activityType = new ActivityType(VALID_ACTIVITY_TYPE);

    assertDeepEqual(activityType.getVariable("cadence"), {
        id: "cadence",
        name: "Cadence",
        unit: "RPM",
        role: "cadence",
    });
});

test("activity-type", "returns undefined for an unknown variable ID", () => {
    const activityType = new ActivityType(VALID_ACTIVITY_TYPE);

    assertEqual(activityType.getVariable("does-not-exist"), undefined);
});

test("activity-type", "protects internal data from constructor input mutation", () => {
    const data = structuredClone(VALID_ACTIVITY_TYPE);
    const activityType = new ActivityType(data);

    data.name = "Changed";
    data.variables[0].name = "Changed";

    assertEqual(activityType.name, "Elliptical");
    assertEqual(activityType.getVariable("cadence").name, "Cadence");
});

test("activity-type", "protects internal data returned by variables getter", () => {
    const activityType = new ActivityType(VALID_ACTIVITY_TYPE);

    const variables = activityType.variables;
    variables[0].name = "Changed";

    assertEqual(activityType.getVariable("cadence").name, "Cadence");
});

test("activity-type", "protects internal data returned by getVariable", () => {
    const activityType = new ActivityType(VALID_ACTIVITY_TYPE);

    const variable = activityType.getVariable("cadence");
    variable.name = "Changed";

    assertEqual(activityType.getVariable("cadence").name, "Cadence");
});

test("activity-type", "rejects non-object input", () => {
    assertThrows(() => new ActivityType(null), /ActivityType data must be an object/);
});

test("activity-type", "rejects an empty activity type ID", () => {
    const data = structuredClone(VALID_ACTIVITY_TYPE);
    data.id = "";

    assertThrows(() => new ActivityType(data), /ActivityType id must be a non-empty string/);
});

test("activity-type", "rejects an empty activity type name", () => {
    const data = structuredClone(VALID_ACTIVITY_TYPE);
    data.name = "";

    assertThrows(() => new ActivityType(data), /ActivityType name must be a non-empty string/);
});

test("activity-type", "rejects a non-array variables value", () => {
    const data = structuredClone(VALID_ACTIVITY_TYPE);
    data.variables = {};

    assertThrows(() => new ActivityType(data), /ActivityType variables must be an array/);
});

test("activity-type", "rejects an empty variables array", () => {
    const data = structuredClone(VALID_ACTIVITY_TYPE);
    data.variables = [];

    assertThrows(() => new ActivityType(data), /ActivityType must define at least one variable/);
});

test("activity-type", "rejects duplicate variable IDs", () => {
    const data = structuredClone(VALID_ACTIVITY_TYPE);

    data.variables.push({
        id: "cadence",
        name: "Duplicate Cadence",
        unit: "RPM",
        role: "cadence",
    });

    assertThrows(() => new ActivityType(data), /variable IDs must be unique/);
});

test("activity-type", "rejects an invalid variable role", () => {
    const data = structuredClone(VALID_ACTIVITY_TYPE);
    data.variables[0].role = "banana";

    assertThrows(() => new ActivityType(data), /Unknown ActivityType variable role/);
});

test("activity-type", "accepts all supported variable roles", () => {
    for (const role of ["cadence", "pace", "load"]) {
        const data = {
            id: `test-${role}`,
            name: `Test ${role}`,
            variables: [
                {
                    id: "variable",
                    name: "Variable",
                    unit: "unit",
                    role,
                },
            ],
        };

        const activityType = new ActivityType(data);

        assertEqual(activityType.getVariable("variable").role, role);
    }
});

test("activity-type", "allows a null variable unit", () => {
    const data = structuredClone(VALID_ACTIVITY_TYPE);

    data.variables[0].unit = null;

    const activityType = new ActivityType(data);

    assertEqual(activityType.getVariable("cadence").unit, null);
});

test("activity-type", "returns a defensive copy of the full definition", () => {
    const definition = {
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
                unit: "level",
                role: "load",
            },
        ],
    };

    const activityType = new ActivityType(definition);

    const returnedDefinition = activityType.getDefinition();

    assertDeepEqual(returnedDefinition, definition);

    returnedDefinition.name = "Changed";
    returnedDefinition.variables[0].name = "Changed";

    assertEqual(activityType.name, "Elliptical");
    assertEqual(activityType.variables[0].name, "Cadence");
});
