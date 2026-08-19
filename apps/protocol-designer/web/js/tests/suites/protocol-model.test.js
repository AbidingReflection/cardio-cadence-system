import {
    test,
    assert,
    assertEqual,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import {
    ProtocolModel,
} from "../../models/protocol-model.js";


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


test("protocol-model", "constructs from valid protocol data", () => {
    const protocol = createProtocol();

    const model = new ProtocolModel(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertDeepEqual(
        model.getSnapshot(),
                    protocol
    );
});


test("protocol-model", "stores normalized protocol data", () => {
    const protocol = createProtocol();

    protocol.phases[0].blocks[0].variables.incline = {
        type: "steady",
        start: 0,
        end: 5,
        stepIntervalSeconds: 60,
    };

    const model = new ProtocolModel(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertDeepEqual(
        model.getSnapshot()
        .phases[0]
        .blocks[0]
        .variables.incline,
        {
            type: "steady",
            start: 0,
        }
    );
});


test("protocol-model", "rejects invalid protocol data", () => {
    const protocol = createProtocol();

    delete protocol.phases[0]
    .blocks[0]
    .variables.incline;

    assertThrows(() => {
        new ProtocolModel(
            protocol,
            ACTIVITY_TYPE,
            MACHINE_PROFILE
        );
    });
});


test("protocol-model", "isolates state from constructor input", () => {
    const protocol = createProtocol();

    const model = new ProtocolModel(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    protocol.phases[0].name = "Changed";
    protocol.phases[0].blocks[0].durationSeconds = 999;
    protocol.phases[0].blocks[0].variables.speed.start = 9;

    assertDeepEqual(
        model.getSnapshot(),
                    createProtocol()
    );
});


test("protocol-model", "returns independent snapshots", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    const snapshot = model.getSnapshot();

    snapshot.phases[0].name = "Changed";
    snapshot.phases[0].blocks[0].durationSeconds = 999;
    snapshot.phases[0].blocks[0].variables.speed.start = 9;

    assertDeepEqual(
        model.getSnapshot(),
                    createProtocol()
    );
});


test("protocol-model", "returns independent snapshots on every call", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    const firstSnapshot = model.getSnapshot();
    const secondSnapshot = model.getSnapshot();

    firstSnapshot.phases[0].name = "Changed";

    assertDeepEqual(
        secondSnapshot,
        createProtocol()
    );
});


test("protocol-model", "supports protocols without a MachineProfile", () => {
    const protocol = createProtocol();

    delete protocol.machineProfileId;

    const model = new ProtocolModel(
        protocol,
        ACTIVITY_TYPE
    );

    assertDeepEqual(
        model.getSnapshot(),
                    protocol
    );
});

test("protocol-model", "adds a new empty phase", () => {
    const protocol = createProtocol();
    protocol.phases = [];

    const model = new ProtocolModel(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    const phaseId = model.addPhase();

    const snapshot = model.getSnapshot();

    assertEqual(
        snapshot.phases.length,
        1
    );

    assertDeepEqual(
        snapshot.phases[0],
        {
            id: phaseId,
            name: "New Phase",
            blocks: [],
        }
    );
});


test("protocol-model", "adds a phase with a supplied name", () => {
    const protocol = createProtocol();
    protocol.phases = [];

    const model = new ProtocolModel(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    const phaseId = model.addPhase("Warmup");

    assertDeepEqual(
        model.getSnapshot().phases[0],
                    {
                        id: phaseId,
                        name: "Warmup",
                        blocks: [],
                    }
    );
});


test("protocol-model", "generates unique phase IDs", () => {
    const protocol = createProtocol();
    protocol.phases = [];

    const model = new ProtocolModel(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    const firstId = model.addPhase();
    const secondId = model.addPhase();

    assert(
        firstId !== secondId
    );
});


test("protocol-model", "returns the generated phase ID", () => {
    const protocol = createProtocol();
    protocol.phases = [];

    const model = new ProtocolModel(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    const phaseId = model.addPhase();

    assertEqual(
        model.getSnapshot().phases[0].id,
                phaseId
    );
});


test("protocol-model", "does not commit an invalid phase", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    const before = model.getSnapshot();

    assertThrows(() => {
        model.addPhase("");
    });

    assertDeepEqual(
        model.getSnapshot(),
                    before
    );
});


test("protocol-model", "removes a phase by ID", () => {
    const protocol = createProtocol();

    protocol.phases.push({
        id: "phase-2",
        name: "Second Phase",
        blocks: [],
    });

    const model = new ProtocolModel(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    model.removePhase("phase-1");

    assertDeepEqual(
        model.getSnapshot().phases,
                    [
                        {
                            id: "phase-2",
                            name: "Second Phase",
                            blocks: [],
                        },
                    ]
    );
});


test("protocol-model", "allows removing the last phase", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    model.removePhase("phase-1");

    assertDeepEqual(
        model.getSnapshot().phases,
                    []
    );
});


test("protocol-model", "rejects removing an unknown phase", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertThrows(() => {
        model.removePhase("missing-phase");
    });
});


test("protocol-model", "does not change state after failed phase removal", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    const before = model.getSnapshot();

    assertThrows(() => {
        model.removePhase("missing-phase");
    });

    assertDeepEqual(
        model.getSnapshot(),
                    before
    );
});

test("protocol-model", "updates a phase name by ID", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    model.updatePhase(
        "phase-1",
        {
            name: "Updated Warmup",
        }
    );

    assertEqual(
        model.getSnapshot().phases[0].name,
                "Updated Warmup"
    );
});


test("protocol-model", "updates only the targeted phase", () => {
    const protocol = createProtocol();

    protocol.phases.push({
        id: "phase-2",
        name: "Second Phase",
        blocks: [],
    });

    const model = new ProtocolModel(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    model.updatePhase(
        "phase-2",
        {
            name: "Updated Second Phase",
        }
    );

    assertDeepEqual(
        model.getSnapshot().phases,
                    [
                        protocol.phases[0],
                    {
                        id: "phase-2",
                        name: "Updated Second Phase",
                        blocks: [],
                    },
                    ]
    );
});


test("protocol-model", "rejects updating an unknown phase", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertThrows(() => {
        model.updatePhase(
            "missing-phase",
            {
                name: "Updated",
            }
        );
    });
});


test("protocol-model", "rejects an invalid phase name", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertThrows(() => {
        model.updatePhase(
            "phase-1",
            {
                name: "",
            }
        );
    });
});


test("protocol-model", "does not change state after failed phase update", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    const before = model.getSnapshot();

    assertThrows(() => {
        model.updatePhase(
            "phase-1",
            {
                name: "",
            }
        );
    });

    assertDeepEqual(
        model.getSnapshot(),
                    before
    );
});


test("protocol-model", "adds a block to a phase", () => {
    const protocol = createProtocol();
    protocol.phases[0].blocks = [];

    const model = new ProtocolModel(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    const blockId = model.addBlock(
        "phase-1",
        {
            name: "New Block",
            durationSeconds: 120,
            variables: {
                speed: {
                    type: "steady",
                    start: 4,
                },
                incline: {
                    type: "steady",
                    start: 1,
                },
            },
        }
    );

    assertDeepEqual(
        model.getSnapshot().phases[0].blocks[0],
                    {
                        id: blockId,
                        name: "New Block",
                        durationSeconds: 120,
                        variables: {
                            speed: {
                                type: "steady",
                                start: 4,
                            },
                            incline: {
                                type: "steady",
                                start: 1,
                            },
                        },
                    }
    );
});


test("protocol-model", "adds a block only to the targeted phase", () => {
    const protocol = createProtocol();

    protocol.phases.push({
        id: "phase-2",
        name: "Second Phase",
        blocks: [],
    });

    const model = new ProtocolModel(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    model.addBlock(
        "phase-2",
        {
            name: "Second Phase Block",
            durationSeconds: 120,
            variables: {
                speed: {
                    type: "steady",
                    start: 4,
                },
                incline: {
                    type: "steady",
                    start: 1,
                },
            },
        }
    );

    const snapshot = model.getSnapshot();

    assertEqual(
        snapshot.phases[0].blocks.length,
        1
    );

    assertEqual(
        snapshot.phases[1].blocks.length,
        1
    );

    assertEqual(
        snapshot.phases[1].blocks[0].name,
        "Second Phase Block"
    );
});


test("protocol-model", "generates unique block IDs", () => {
    const protocol = createProtocol();
    protocol.phases[0].blocks = [];

    const model = new ProtocolModel(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    const firstId = model.addBlock(
        "phase-1",
        {
            name: "First Block",
            durationSeconds: 60,
            variables: {
                speed: {
                    type: "steady",
                    start: 4,
                },
                incline: {
                    type: "steady",
                    start: 1,
                },
            },
        }
    );

    const secondId = model.addBlock(
        "phase-1",
        {
            name: "Second Block",
            durationSeconds: 60,
            variables: {
                speed: {
                    type: "steady",
                    start: 4,
                },
                incline: {
                    type: "steady",
                    start: 1,
                },
            },
        }
    );

    assert(
        firstId !== secondId
    );
});


test("protocol-model", "ignores a supplied block ID", () => {
    const protocol = createProtocol();
    protocol.phases[0].blocks = [];

    const model = new ProtocolModel(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    const blockId = model.addBlock(
        "phase-1",
        {
            id: "caller-supplied-id",
            name: "New Block",
            durationSeconds: 60,
            variables: {
                speed: {
                    type: "steady",
                    start: 4,
                },
                incline: {
                    type: "steady",
                    start: 1,
                },
            },
        }
    );

    assertEqual(
        model.getSnapshot().phases[0].blocks[0].id,
                blockId
    );

    assert(
        blockId !== "caller-supplied-id"
    );
});


test("protocol-model", "rejects adding a block to an unknown phase", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertThrows(() => {
        model.addBlock(
            "missing-phase",
            {
                name: "New Block",
                durationSeconds: 60,
                variables: {
                    speed: {
                        type: "steady",
                        start: 4,
                    },
                    incline: {
                        type: "steady",
                        start: 1,
                    },
                },
            }
        );
    });
});


test("protocol-model", "rejects adding an invalid block", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertThrows(() => {
        model.addBlock(
            "phase-1",
            {
                name: "Invalid Block",
                durationSeconds: 0,
                variables: {
                    speed: {
                        type: "steady",
                        start: 4,
                    },
                    incline: {
                        type: "steady",
                        start: 1,
                    },
                },
            }
        );
    });
});


test("protocol-model", "does not change state after failed block addition", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    const before = model.getSnapshot();

    assertThrows(() => {
        model.addBlock(
            "phase-1",
            {
                name: "Invalid Block",
                durationSeconds: 60,
                variables: {
                    speed: {
                        type: "steady",
                        start: 4,
                    },
                },
            }
        );
    });

    assertDeepEqual(
        model.getSnapshot(),
        before
    );
});


test("protocol-model", "removes a block by ID", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    model.removeBlock("block-1");

    assertDeepEqual(
        model.getSnapshot().phases[0].blocks,
                    []
    );
});


test("protocol-model", "removes a block from the correct phase", () => {
    const protocol = createProtocol();

    protocol.phases.push({
        id: "phase-2",
        name: "Second Phase",
        blocks: [
            {
                id: "block-2",
                name: "Second Block",
                durationSeconds: 60,
                variables: {
                    speed: {
                        type: "steady",
                        start: 4,
                    },
                    incline: {
                        type: "steady",
                        start: 1,
                    },
                },
            },
        ],
    });

    const model = new ProtocolModel(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    model.removeBlock("block-2");

    const snapshot = model.getSnapshot();

    assertEqual(
        snapshot.phases[0].blocks.length,
        1
    );

    assertDeepEqual(
        snapshot.phases[1].blocks,
        []
    );
});


test("protocol-model", "allows removing the last block from a phase", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    model.removeBlock("block-1");

    assertEqual(
        model.getSnapshot().phases[0].blocks.length,
                0
    );
});


test("protocol-model", "rejects removing an unknown block", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertThrows(() => {
        model.removeBlock("missing-block");
    });
});


test("protocol-model", "does not change state after failed block removal", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    const before = model.getSnapshot();

    assertThrows(() => {
        model.removeBlock("missing-block");
    });

    assertDeepEqual(
        model.getSnapshot(),
                    before
    );
});


test("protocol-model", "updates a block name by ID", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    model.updateBlock(
        "block-1",
        {
            name: "Updated Block",
        }
    );

    assertEqual(
        model.getSnapshot().phases[0].blocks[0].name,
                "Updated Block"
    );
});


test("protocol-model", "updates a block duration by ID", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    model.updateBlock(
        "block-1",
        {
            durationSeconds: 600,
        }
    );

    assertEqual(
        model.getSnapshot().phases[0].blocks[0].durationSeconds,
                600
    );
});


test("protocol-model", "replaces block variables", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    const variables = {
        speed: {
            type: "steady",
            start: 5,
        },
        incline: {
            type: "linear",
            start: 0,
            end: 3,
        },
    };

    model.updateBlock(
        "block-1",
        {
            variables,
        }
    );

    assertDeepEqual(
        model.getSnapshot().phases[0].blocks[0].variables,
                    variables
    );
});


test("protocol-model", "normalizes updated block variables", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    model.updateBlock(
        "block-1",
        {
            variables: {
                speed: {
                    type: "steady",
                    start: 4,
                    end: 8,
                    stepIntervalSeconds: 60,
                },
                incline: {
                    type: "linear",
                    start: 0,
                    end: 3,
                    stepIntervalSeconds: 30,
                },
            },
        }
    );

    assertDeepEqual(
        model.getSnapshot().phases[0].blocks[0].variables,
                    {
                        speed: {
                            type: "steady",
                            start: 4,
                        },
                        incline: {
                            type: "linear",
                            start: 0,
                            end: 3,
                        },
                    }
    );
});


test("protocol-model", "updates only the targeted block", () => {
    const protocol = createProtocol();

    protocol.phases.push({
        id: "phase-2",
        name: "Second Phase",
        blocks: [
            {
                id: "block-2",
                name: "Second Block",
                durationSeconds: 60,
                variables: {
                    speed: {
                        type: "steady",
                        start: 4,
                    },
                    incline: {
                        type: "steady",
                        start: 1,
                    },
                },
            },
        ],
    });

    const model = new ProtocolModel(
        protocol,
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    model.updateBlock(
        "block-2",
        {
            name: "Updated Second Block",
        }
    );

    const snapshot = model.getSnapshot();

    assertEqual(
        snapshot.phases[0].blocks[0].name,
        "Warmup Block"
    );

    assertEqual(
        snapshot.phases[1].blocks[0].name,
        "Updated Second Block"
    );
});


test("protocol-model", "rejects updating an unknown block", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertThrows(() => {
        model.updateBlock(
            "missing-block",
            {
                name: "Updated",
            }
        );
    });
});


test("protocol-model", "rejects invalid block updates", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    assertThrows(() => {
        model.updateBlock(
            "block-1",
            {
                durationSeconds: 0,
            }
        );
    });
});


test("protocol-model", "does not change state after failed block update", () => {
    const model = new ProtocolModel(
        createProtocol(),
        ACTIVITY_TYPE,
        MACHINE_PROFILE
    );

    const before = model.getSnapshot();

    assertThrows(() => {
        model.updateBlock(
            "block-1",
            {
                variables: {
                    speed: {
                        type: "steady",
                        start: 4,
                    },
                },
            }
        );
    });

    assertDeepEqual(
        model.getSnapshot(),
                    before
    );
});

test("protocol-model", "notifies subscribers after successful changes", () => {
    const model = new ProtocolModel(
        createProtocol(),
                                    ACTIVITY_TYPE,
                                    MACHINE_PROFILE
    );

    let receivedSnapshot;

    model.subscribe(snapshot => {
        receivedSnapshot = snapshot;
    });

    const phaseId = model.addPhase("Second Phase");

    assertDeepEqual(
        receivedSnapshot.phases.at(-1),
                    {
                        id: phaseId,
                        name: "Second Phase",
                        blocks: [],
                    }
    );
});


test("protocol-model", "notifies subscribers once per successful mutation", () => {
    const model = new ProtocolModel(
        createProtocol(),
                                    ACTIVITY_TYPE,
                                    MACHINE_PROFILE
    );

    let notificationCount = 0;

    model.subscribe(() => {
        notificationCount += 1;
    });

    model.updatePhase(
        "phase-1",
        {
            name: "Updated Warmup",
        }
    );

    assertEqual(
        notificationCount,
        1
    );
});


test("protocol-model", "does not notify subscribers after failed changes", () => {
    const model = new ProtocolModel(
        createProtocol(),
                                    ACTIVITY_TYPE,
                                    MACHINE_PROFILE
    );

    let notificationCount = 0;

    model.subscribe(() => {
        notificationCount += 1;
    });

    assertThrows(() => {
        model.updatePhase(
            "phase-1",
            {
                name: "",
            }
        );
    });

    assertEqual(
        notificationCount,
        0
    );
});


test("protocol-model", "supports multiple subscribers", () => {
    const model = new ProtocolModel(
        createProtocol(),
                                    ACTIVITY_TYPE,
                                    MACHINE_PROFILE
    );

    let firstCount = 0;
    let secondCount = 0;

    model.subscribe(() => {
        firstCount += 1;
    });

    model.subscribe(() => {
        secondCount += 1;
    });

    model.removeBlock("block-1");

    assertEqual(firstCount, 1);
    assertEqual(secondCount, 1);
});


test("protocol-model", "unsubscribe stops future notifications", () => {
    const model = new ProtocolModel(
        createProtocol(),
                                    ACTIVITY_TYPE,
                                    MACHINE_PROFILE
    );

    let notificationCount = 0;

    const unsubscribe = model.subscribe(() => {
        notificationCount += 1;
    });

    model.updatePhase(
        "phase-1",
        {
            name: "First Update",
        }
    );

    unsubscribe();

    model.updatePhase(
        "phase-1",
        {
            name: "Second Update",
        }
    );

    assertEqual(
        notificationCount,
        1
    );
});


test("protocol-model", "subscriber snapshots are defensive copies", () => {
    const model = new ProtocolModel(
        createProtocol(),
                                    ACTIVITY_TYPE,
                                    MACHINE_PROFILE
    );

    model.subscribe(snapshot => {
        snapshot.phases[0].name = "Subscriber Mutation";
    });

    model.updatePhase(
        "phase-1",
        {
            name: "Committed Name",
        }
    );

    assertEqual(
        model.getSnapshot().phases[0].name,
                "Committed Name"
    );
});

test("protocol-model", "emits once for each successful mutation method", () => {
    const model = new ProtocolModel(
        createProtocol(),
                                    ACTIVITY_TYPE,
                                    MACHINE_PROFILE
    );

    let notificationCount = 0;

    model.subscribe(() => {
        notificationCount += 1;
    });

    const phaseId = model.addPhase("Second Phase");
    assertEqual(notificationCount, 1);

    model.updatePhase(
        phaseId,
        {
            name: "Updated Second Phase",
        }
    );
    assertEqual(notificationCount, 2);

    const blockId = model.addBlock(
        phaseId,
        {
            name: "Second Block",
            durationSeconds: 60,
            variables: {
                speed: {
                    type: "steady",
                    start: 4,
                },
                incline: {
                    type: "steady",
                    start: 1,
                },
            },
        }
    );
    assertEqual(notificationCount, 3);

    model.updateBlock(
        blockId,
        {
            name: "Updated Second Block",
        }
    );
    assertEqual(notificationCount, 4);

    model.removeBlock(blockId);
    assertEqual(notificationCount, 5);

    model.removePhase(phaseId);
    assertEqual(notificationCount, 6);
});
