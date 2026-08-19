import {
    test,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import {
    validateProtocol,
} from "../protocol-validation.js";


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
    },
    incline: {
        controlMode: "machine-set",
        min: 0,
        max: 10,
        increment: 0.5,
    },
};


const MACHINE_PROFILE = {
    id: "test-treadmill",
    activityTypeId: "treadmill",

    getVariable(variableId) {
        return MACHINE_VARIABLES[variableId];
    },
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


test("protocol-validation", "accepts a valid protocol", () => {
    validateProtocol(
        createProtocol(),
                     ACTIVITY_TYPE,
                     MACHINE_PROFILE
    );
});


test("protocol-validation", "allows a protocol with no phases", () => {
    const protocol = createProtocol();
    protocol.phases = [];

    validateProtocol(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );
});


test("protocol-validation", "allows a phase with no blocks", () => {
    const protocol = createProtocol();
    protocol.phases[0].blocks = [];

    validateProtocol(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );
});


test("protocol-validation", "allows unknown protocol fields", () => {
    const protocol = createProtocol();
    protocol.futureField = "allowed";

    validateProtocol(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );
});


test("protocol-validation", "rejects mismatched ActivityType references", () => {
    const protocol = createProtocol();
    protocol.activityTypeId = "elliptical";

    assertThrows(() => {
        validateProtocol(
            protocol,
            ACTIVITY_TYPE,
            MACHINE_PROFILE
        );
    });
});


test("protocol-validation", "rejects missing phases array", () => {
    const protocol = createProtocol();
    delete protocol.phases;

    assertThrows(() => {
        validateProtocol(
            protocol,
            ACTIVITY_TYPE,
            MACHINE_PROFILE
        );
    });
});


test("protocol-validation", "rejects duplicate phase IDs", () => {
    const protocol = createProtocol();

    protocol.phases.push({
        id: "phase-1",
        name: "Duplicate Phase",
        blocks: [],
    });

    assertThrows(() => {
        validateProtocol(
            protocol,
            ACTIVITY_TYPE,
            MACHINE_PROFILE
        );
    });
});


test("protocol-validation", "rejects duplicate block IDs across phases", () => {
    const protocol = createProtocol();

    protocol.phases.push({
        id: "phase-2",
        name: "Second Phase",
        blocks: [
            {
                id: "block-1",
                name: "Duplicate Block",
                durationSeconds: 60,
                variables: {
                    speed: {
                        type: "steady",
                        start: 3,
                    },
                    incline: {
                        type: "steady",
                        start: 0,
                    },
                },
            },
        ],
    });

    assertThrows(() => {
        validateProtocol(
            protocol,
            ACTIVITY_TYPE,
            MACHINE_PROFILE
        );
    });
});


test("protocol-validation", "rejects non-positive block durations", () => {
    const protocol = createProtocol();
    protocol.phases[0].blocks[0].durationSeconds = 0;

    assertThrows(() => {
        validateProtocol(
            protocol,
            ACTIVITY_TYPE,
            MACHINE_PROFILE
        );
    });
});


test("protocol-validation", "rejects missing ActivityType variables", () => {
    const protocol = createProtocol();

    delete protocol.phases[0].blocks[0].variables.incline;

    assertThrows(() => {
        validateProtocol(
            protocol,
            ACTIVITY_TYPE,
            MACHINE_PROFILE
        );
    });
});


test("protocol-validation", "rejects unknown block variables", () => {
    const protocol = createProtocol();

    protocol.phases[0].blocks[0].variables.resistance = {
        type: "steady",
        start: 5,
    };

    assertThrows(() => {
        validateProtocol(
            protocol,
            ACTIVITY_TYPE,
            MACHINE_PROFILE
        );
    });
});


test("protocol-validation", "rejects unknown progression types", () => {
    const protocol = createProtocol();

    protocol.phases[0].blocks[0].variables.speed.type =
    "exponential";

assertThrows(() => {
    validateProtocol(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );
});
});


test("protocol-validation", "rejects missing progression fields", () => {
    const protocol = createProtocol();

    delete protocol.phases[0].blocks[0].variables.speed.end;

    assertThrows(() => {
        validateProtocol(
            protocol,
            ACTIVITY_TYPE,
            MACHINE_PROFILE
        );
    });
});


test("protocol-validation", "rejects non-numeric progression targets", () => {
    const protocol = createProtocol();

    protocol.phases[0].blocks[0].variables.speed.start =
    "3";

assertThrows(() => {
    validateProtocol(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );
});
});


test("protocol-validation", "accepts descending progressions", () => {
    const protocol = createProtocol();

    protocol.phases[0].blocks[0].variables.speed = {
        type: "linear",
        start: 5,
        end: 3,
    };

    validateProtocol(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );
});


test("protocol-validation", "accepts flat linear progressions", () => {
    const protocol = createProtocol();

    protocol.phases[0].blocks[0].variables.speed = {
        type: "linear",
        start: 4,
        end: 4,
    };

    validateProtocol(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );
});


test("protocol-validation", "accepts valid stepped progressions", () => {
    const protocol = createProtocol();

    protocol.phases[0].blocks[0].variables.incline = {
        type: "stepped",
        start: 0,
        end: 5,
        stepIntervalSeconds: 60,
    };

    validateProtocol(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );
});


test("protocol-validation", "rejects non-positive step intervals", () => {
    const protocol = createProtocol();

    protocol.phases[0].blocks[0].variables.incline = {
        type: "stepped",
        start: 0,
        end: 5,
        stepIntervalSeconds: 0,
    };

    assertThrows(() => {
        validateProtocol(
            protocol,
            ACTIVITY_TYPE,
            MACHINE_PROFILE
        );
    });
});


test("protocol-validation", "rejects targets below machine minimum", () => {
    const protocol = createProtocol();

    protocol.phases[0].blocks[0].variables.speed.start =
    0.4;

    assertThrows(() => {
        validateProtocol(
            protocol,
            ACTIVITY_TYPE,
            MACHINE_PROFILE
        );
    });
});


test("protocol-validation", "rejects targets above machine maximum", () => {
    const protocol = createProtocol();

    protocol.phases[0].blocks[0].variables.speed.end =
    10.1;

    assertThrows(() => {
        validateProtocol(
            protocol,
            ACTIVITY_TYPE,
            MACHINE_PROFILE
        );
    });
});


test("protocol-validation", "accepts decimal machine increments", () => {
    const protocol = createProtocol();

    protocol.phases[0].blocks[0].variables.speed = {
        type: "linear",
        start: 3.1,
        end: 6.3,
    };

    protocol.phases[0].blocks[0].variables.incline = {
        type: "linear",
        start: 0.5,
        end: 2.5,
    };

    validateProtocol(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );
});


test("protocol-validation", "rejects targets not aligned to machine increments", () => {
    const protocol = createProtocol();

    protocol.phases[0].blocks[0].variables.incline.start =
    0.25;

    assertThrows(() => {
        validateProtocol(
            protocol,
            ACTIVITY_TYPE,
            MACHINE_PROFILE
        );
    });
});


test("protocol-validation", "allows protocols without a MachineProfile", () => {
    const protocol = createProtocol();

    delete protocol.machineProfileId;

    validateProtocol(
        protocol,
        ACTIVITY_TYPE
    );
});


test("protocol-validation", "rejects a supplied MachineProfile when none is referenced", () => {
    const protocol = createProtocol();

    delete protocol.machineProfileId;

    assertThrows(() => {
        validateProtocol(
            protocol,
            ACTIVITY_TYPE,
            MACHINE_PROFILE
        );
    });
});


test("protocol-validation", "rejects missing referenced MachineProfiles", () => {
    const protocol = createProtocol();

    assertThrows(() => {
        validateProtocol(
            protocol,
            ACTIVITY_TYPE
        );
    });
});


test("protocol-validation", "rejects mismatched MachineProfile IDs", () => {
    const protocol = createProtocol();

    protocol.machineProfileId = "different-machine";

    assertThrows(() => {
        validateProtocol(
            protocol,
            ACTIVITY_TYPE,
            MACHINE_PROFILE
        );
    });
});
