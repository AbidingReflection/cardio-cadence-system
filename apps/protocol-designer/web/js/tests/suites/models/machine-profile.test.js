import {
    test,
    assertEqual,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import { ActivityType } from "../../../models/activity-type.js";
import { MachineProfile } from "../../../models/machine-profile.js";

const ELLIPTICAL_ACTIVITY_TYPE = new ActivityType({
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
});

const VALID_MACHINE_PROFILE = {
    id: "true-elliptical-aquatic-center",
    name: "True Elliptical - Aquatic Center",
    activityTypeId: "elliptical",
    variables: {
        cadence: {
            controlMode: "user-produced",
            progressionTypes: ["steady", "linear", "stepped"],
        },
        resistance: {
            controlMode: "machine-set",
            min: 1,
            max: 20,
            increment: 1,
            progressionTypes: ["steady", "stepped"],
        },
    },
};

test("machine-profile", "constructs a valid MachineProfile", () => {
    const machineProfile = new MachineProfile(VALID_MACHINE_PROFILE, ELLIPTICAL_ACTIVITY_TYPE);

    assertEqual(machineProfile.id, "true-elliptical-aquatic-center");

    assertEqual(machineProfile.name, "True Elliptical - Aquatic Center");

    assertEqual(machineProfile.activityTypeId, "elliptical");
});

test("machine-profile", "returns a machine variable by ID", () => {
    const machineProfile = new MachineProfile(VALID_MACHINE_PROFILE, ELLIPTICAL_ACTIVITY_TYPE);

    assertDeepEqual(machineProfile.getVariable("resistance"), {
        controlMode: "machine-set",
        min: 1,
        max: 20,
        increment: 1,
        progressionTypes: ["steady", "stepped"],
    });
});

test("machine-profile", "returns undefined for an unknown variable ID", () => {
    const machineProfile = new MachineProfile(VALID_MACHINE_PROFILE, ELLIPTICAL_ACTIVITY_TYPE);

    assertEqual(machineProfile.getVariable("does-not-exist"), undefined);
});

test("machine-profile", "protects internal variable data", () => {
    const machineProfile = new MachineProfile(VALID_MACHINE_PROFILE, ELLIPTICAL_ACTIVITY_TYPE);

    const resistance = machineProfile.getVariable("resistance");
    resistance.max = 999;

    assertEqual(machineProfile.getVariable("resistance").max, 20);
});

test("machine-profile", "protects internal data from constructor input mutation", () => {
    const data = structuredClone(VALID_MACHINE_PROFILE);

    const machineProfile = new MachineProfile(data, ELLIPTICAL_ACTIVITY_TYPE);

    data.name = "Changed";
    data.variables.resistance.max = 999;

    assertEqual(machineProfile.name, "True Elliptical - Aquatic Center");

    assertEqual(machineProfile.getVariable("resistance").max, 20);
});

test("machine-profile", "rejects a mismatched ActivityType", () => {
    const treadmillActivityType = new ActivityType({
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

    assertThrows(
        () => new MachineProfile(VALID_MACHINE_PROFILE, treadmillActivityType),
        /does not match ActivityType/,
    );
});

test("machine-profile", "rejects an unknown machine variable", () => {
    const data = structuredClone(VALID_MACHINE_PROFILE);

    data.variables.flywheel = {
        controlMode: "machine-set",
    };

    assertThrows(
        () => new MachineProfile(data, ELLIPTICAL_ACTIVITY_TYPE),
        /unknown ActivityType variable/,
    );
});

test("machine-profile", "rejects a missing ActivityType variable", () => {
    const data = structuredClone(VALID_MACHINE_PROFILE);

    delete data.variables.cadence;

    assertThrows(
        () => new MachineProfile(data, ELLIPTICAL_ACTIVITY_TYPE),
        /missing ActivityType variable/,
    );
});

test("machine-profile", "rejects an invalid controlMode", () => {
    const data = structuredClone(VALID_MACHINE_PROFILE);

    data.variables.resistance.controlMode = "banana";

    assertThrows(() => new MachineProfile(data, ELLIPTICAL_ACTIVITY_TYPE), /Unknown controlMode/);
});

test("machine-profile", "rejects min greater than max", () => {
    const data = structuredClone(VALID_MACHINE_PROFILE);

    data.variables.resistance.min = 25;
    data.variables.resistance.max = 20;

    assertThrows(() => new MachineProfile(data, ELLIPTICAL_ACTIVITY_TYPE), /min cannot exceed max/);
});

test("machine-profile", "rejects zero increment", () => {
    const data = structuredClone(VALID_MACHINE_PROFILE);

    data.variables.resistance.increment = 0;

    assertThrows(
        () => new MachineProfile(data, ELLIPTICAL_ACTIVITY_TYPE),
        /increment must be greater than zero/,
    );
});

test("machine-profile", "rejects negative increment", () => {
    const data = structuredClone(VALID_MACHINE_PROFILE);

    data.variables.resistance.increment = -1;

    assertThrows(
        () => new MachineProfile(data, ELLIPTICAL_ACTIVITY_TYPE),
        /increment must be greater than zero/,
    );
});

test("machine-profile", "allows machine-set variables without numeric constraints", () => {
    const rowingActivityType = new ActivityType({
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
                unit: "factor",
                role: "load",
            },
        ],
    });

    const data = {
        id: "concept2-rowerg-home",
        name: "Home Concept2 RowErg",
        activityTypeId: "rowing",
        variables: {
            strokeRate: {
                controlMode: "user-produced",
                progressionTypes: ["steady", "linear", "stepped"],
            },
            dragFactor: {
                controlMode: "machine-set",
                progressionTypes: ["steady", "stepped"],
            },
        },
    };

    const machineProfile = new MachineProfile(data, rowingActivityType);

    assertDeepEqual(machineProfile.getVariable("dragFactor"), {
        controlMode: "machine-set",
        progressionTypes: ["steady", "stepped"],
    });
});

test("machine-profile", "rejects missing progressionTypes", () => {
    const data = structuredClone(VALID_MACHINE_PROFILE);

    delete data.variables.resistance.progressionTypes;

    assertThrows(
        () => new MachineProfile(data, ELLIPTICAL_ACTIVITY_TYPE),
        /progressionTypes must be a non-empty array/,
    );
});

test("machine-profile", "rejects empty progressionTypes", () => {
    const data = structuredClone(VALID_MACHINE_PROFILE);

    data.variables.resistance.progressionTypes = [];

    assertThrows(
        () => new MachineProfile(data, ELLIPTICAL_ACTIVITY_TYPE),
        /progressionTypes must be a non-empty array/,
    );
});

test("machine-profile", "rejects unknown progression types", () => {
    const data = structuredClone(VALID_MACHINE_PROFILE);

    data.variables.resistance.progressionTypes = ["steady", "banana"];

    assertThrows(
        () => new MachineProfile(data, ELLIPTICAL_ACTIVITY_TYPE),
        /unknown progression type "banana"/,
    );
});

test("machine-profile", "rejects duplicate progression types", () => {
    const data = structuredClone(VALID_MACHINE_PROFILE);

    data.variables.resistance.progressionTypes = ["steady", "stepped", "steady"];

    assertThrows(
        () => new MachineProfile(data, ELLIPTICAL_ACTIVITY_TYPE),
        /duplicate progression type "steady"/,
    );
});

test("machine-profile", "returns a defensive copy of the full definition", () => {
    const machineProfile = new MachineProfile(VALID_MACHINE_PROFILE, ELLIPTICAL_ACTIVITY_TYPE);

    const returnedDefinition = machineProfile.getDefinition();

    assertDeepEqual(returnedDefinition, VALID_MACHINE_PROFILE);

    returnedDefinition.name = "Changed";
    returnedDefinition.variables.resistance.controlMode = "user-produced";

    assertEqual(machineProfile.name, VALID_MACHINE_PROFILE.name);
    assertEqual(
        machineProfile.variables.resistance.controlMode,
        VALID_MACHINE_PROFILE.variables.resistance.controlMode,
    );
});
