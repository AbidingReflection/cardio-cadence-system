/** Shared fixtures for ProtocolModel tests. */

import { ProtocolModel } from "../../models/protocol-model.js";

const ACTIVITY_TYPE = {
    id: "treadmill",
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
};

const MACHINE_VARIABLES = {
    speed: {
        controlMode: "machine-set",
        min: 0.5,
        max: 10,
        increment: 0.1,
        progressionTypes: ["steady", "linear", "stepped"],
    },
    incline: {
        controlMode: "machine-set",
        min: 0,
        max: 10,
        increment: 0.5,
        progressionTypes: ["steady", "linear", "stepped"],
    },
};

const MACHINE_PROFILE = {
    id: "test-treadmill",
    activityTypeId: "treadmill",

    getVariable(variableId) {
        return MACHINE_VARIABLES[variableId];
    },
};

const CALIBRATION_PROFILE = {
    id: "test-treadmill-calibration",
    machineProfileId: MACHINE_PROFILE.id,
};

const OTHER_MACHINE_PROFILE = {
    id: "other-test-treadmill",
    activityTypeId: ACTIVITY_TYPE.id,

    getVariable(variableId) {
        return MACHINE_VARIABLES[variableId];
    },
};

const OTHER_CALIBRATION_PROFILE = {
    id: "other-test-treadmill-calibration",
    machineProfileId: OTHER_MACHINE_PROFILE.id,
};

const OTHER_ACTIVITY_TYPE = {
    id: "elliptical",
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
};

/** Creates a valid protocol for use as a test fixture. */
function createProtocol() {
    return {
        activityTypeId: "treadmill",
        machineProfileId: "test-treadmill",
        phases: [
            {
                id: "phase-1",
                name: "Warmup",
                blocks: [
                    {
                        id: "block-1",
                        name: "Warmup Block",
                        durationSeconds: 300,
                        variables: {
                            speed: {
                                type: "linear",
                                start: 3,
                                end: 4,
                            },
                            incline: {
                                type: "steady",
                                start: 0,
                            },
                        },
                    },
                ],
            },
        ],
    };
}

/** Creates a ProtocolModel using the standard test fixture. */
function createProtocolModel() {
    return new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);
}

export {
    ACTIVITY_TYPE,
    CALIBRATION_PROFILE,
    MACHINE_PROFILE,
    OTHER_ACTIVITY_TYPE,
    OTHER_CALIBRATION_PROFILE,
    OTHER_MACHINE_PROFILE,
    createProtocol,
    createProtocolModel,
};
