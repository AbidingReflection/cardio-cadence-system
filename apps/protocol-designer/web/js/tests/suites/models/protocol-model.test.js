import {
    test,
    assert,
    assertEqual,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import { ProtocolModel } from "../../../models/protocol-model.js";

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

test("protocol-model", "constructs from valid protocol data", () => {
    const protocol = createProtocol();

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    assertDeepEqual(model.getSnapshot(), protocol);
});

test("protocol-model", "stores normalized protocol data", () => {
    const protocol = createProtocol();

    protocol.phases[0].blocks[0].variables.incline = {
        type: "steady",
        start: 0,
        end: 5,
        step: 1,
    };

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    assertDeepEqual(model.getSnapshot().phases[0].blocks[0].variables.incline, {
        type: "steady",
        start: 0,
    });
});

test("protocol-model", "rejects invalid protocol data", () => {
    const protocol = createProtocol();

    delete protocol.phases[0].blocks[0].variables.incline;

    assertThrows(() => {
        new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);
    });
});

test("protocol-model", "isolates state from constructor input", () => {
    const protocol = createProtocol();

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    protocol.phases[0].name = "Changed";
    protocol.phases[0].blocks[0].durationSeconds = 999;
    protocol.phases[0].blocks[0].variables.speed.start = 9;

    assertDeepEqual(model.getSnapshot(), createProtocol());
});

test("protocol-model", "returns independent snapshots", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    const snapshot = model.getSnapshot();

    snapshot.phases[0].name = "Changed";
    snapshot.phases[0].blocks[0].durationSeconds = 999;
    snapshot.phases[0].blocks[0].variables.speed.start = 9;

    assertDeepEqual(model.getSnapshot(), createProtocol());
});

test("protocol-model", "returns independent snapshots on every call", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    const firstSnapshot = model.getSnapshot();
    const secondSnapshot = model.getSnapshot();

    firstSnapshot.phases[0].name = "Changed";

    assertDeepEqual(secondSnapshot, createProtocol());
});

test("protocol-model", "supports protocols without a MachineProfile", () => {
    const protocol = createProtocol();

    delete protocol.machineProfileId;

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE);

    assertDeepEqual(model.getSnapshot(), protocol);
});

test("protocol-model", "adds a new empty phase", () => {
    const protocol = createProtocol();
    protocol.phases = [];

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    const phaseId = model.addPhase();

    const snapshot = model.getSnapshot();

    assertEqual(snapshot.phases.length, 1);

    assertDeepEqual(snapshot.phases[0], {
        id: phaseId,
        name: "New Phase",
        blocks: [],
    });
});

test("protocol-model", "adds a phase with a supplied name", () => {
    const protocol = createProtocol();
    protocol.phases = [];

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    const phaseId = model.addPhase("Warmup");

    assertDeepEqual(model.getSnapshot().phases[0], {
        id: phaseId,
        name: "Warmup",
        blocks: [],
    });
});

test("protocol-model", "generates unique phase IDs", () => {
    const protocol = createProtocol();
    protocol.phases = [];

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    const firstId = model.addPhase();
    const secondId = model.addPhase();

    assert(firstId !== secondId);
});

test("protocol-model", "returns the generated phase ID", () => {
    const protocol = createProtocol();
    protocol.phases = [];

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    const phaseId = model.addPhase();

    assertEqual(model.getSnapshot().phases[0].id, phaseId);
});

test("protocol-model", "does not commit an invalid phase", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    const before = model.getSnapshot();

    assertThrows(() => {
        model.addPhase("");
    });

    assertDeepEqual(model.getSnapshot(), before);
});

test("protocol-model", "removes a phase by ID", () => {
    const protocol = createProtocol();

    protocol.phases.push({
        id: "phase-2",
        name: "Second Phase",
        blocks: [],
    });

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    model.removePhase("phase-1");

    assertDeepEqual(model.getSnapshot().phases, [
        {
            id: "phase-2",
            name: "Second Phase",
            blocks: [],
        },
    ]);
});

test("protocol-model", "allows removing the last phase", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    model.removePhase("phase-1");

    assertDeepEqual(model.getSnapshot().phases, []);
});

test("protocol-model", "rejects removing an unknown phase", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    assertThrows(() => {
        model.removePhase("missing-phase");
    });
});

test("protocol-model", "does not change state after failed phase removal", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    const before = model.getSnapshot();

    assertThrows(() => {
        model.removePhase("missing-phase");
    });

    assertDeepEqual(model.getSnapshot(), before);
});

test("protocol-model", "updates a phase name by ID", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    model.updatePhase("phase-1", {
        name: "Updated Warmup",
    });

    assertEqual(model.getSnapshot().phases[0].name, "Updated Warmup");
});

test("protocol-model", "updates only the targeted phase", () => {
    const protocol = createProtocol();

    protocol.phases.push({
        id: "phase-2",
        name: "Second Phase",
        blocks: [],
    });

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    model.updatePhase("phase-2", {
        name: "Updated Second Phase",
    });

    assertDeepEqual(model.getSnapshot().phases, [
        protocol.phases[0],
        {
            id: "phase-2",
            name: "Updated Second Phase",
            blocks: [],
        },
    ]);
});

test("protocol-model", "rejects updating an unknown phase", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    assertThrows(() => {
        model.updatePhase("missing-phase", {
            name: "Updated",
        });
    });
});

test("protocol-model", "rejects an invalid phase name", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    assertThrows(() => {
        model.updatePhase("phase-1", {
            name: "",
        });
    });
});

test("protocol-model", "does not change state after failed phase update", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    const before = model.getSnapshot();

    assertThrows(() => {
        model.updatePhase("phase-1", {
            name: "",
        });
    });

    assertDeepEqual(model.getSnapshot(), before);
});

test("protocol-model", "adds a block to a phase", () => {
    const protocol = createProtocol();
    protocol.phases[0].blocks = [];

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    const blockId = model.addBlock("phase-1", {
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
    });

    assertDeepEqual(model.getSnapshot().phases[0].blocks[0], {
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
    });
});

test("protocol-model", "adds a block only to the targeted phase", () => {
    const protocol = createProtocol();

    protocol.phases.push({
        id: "phase-2",
        name: "Second Phase",
        blocks: [],
    });

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    model.addBlock("phase-2", {
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
    });

    const snapshot = model.getSnapshot();

    assertEqual(snapshot.phases[0].blocks.length, 1);

    assertEqual(snapshot.phases[1].blocks.length, 1);

    assertEqual(snapshot.phases[1].blocks[0].name, "Second Phase Block");
});

test("protocol-model", "generates unique block IDs", () => {
    const protocol = createProtocol();
    protocol.phases[0].blocks = [];

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    const firstId = model.addBlock("phase-1", {
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
    });

    const secondId = model.addBlock("phase-1", {
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
    });

    assert(firstId !== secondId);
});

test("protocol-model", "ignores a supplied block ID", () => {
    const protocol = createProtocol();
    protocol.phases[0].blocks = [];

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    const blockId = model.addBlock("phase-1", {
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
    });

    assertEqual(model.getSnapshot().phases[0].blocks[0].id, blockId);

    assert(blockId !== "caller-supplied-id");
});

test("protocol-model", "rejects adding a block to an unknown phase", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    assertThrows(() => {
        model.addBlock("missing-phase", {
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
        });
    });
});

test("protocol-model", "rejects adding an invalid block", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    assertThrows(() => {
        model.addBlock("phase-1", {
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
        });
    });
});

test("protocol-model", "does not change state after failed block addition", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    const before = model.getSnapshot();

    assertThrows(() => {
        model.addBlock("phase-1", {
            name: "Invalid Block",
            durationSeconds: 60,
            variables: {
                speed: {
                    type: "steady",
                    start: 4,
                },
            },
        });
    });

    assertDeepEqual(model.getSnapshot(), before);
});

test("protocol-model", "removes a block by ID", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    model.removeBlock("block-1");

    assertDeepEqual(model.getSnapshot().phases[0].blocks, []);
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

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    model.removeBlock("block-2");

    const snapshot = model.getSnapshot();

    assertEqual(snapshot.phases[0].blocks.length, 1);

    assertDeepEqual(snapshot.phases[1].blocks, []);
});

test("protocol-model", "allows removing the last block from a phase", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    model.removeBlock("block-1");

    assertEqual(model.getSnapshot().phases[0].blocks.length, 0);
});

test("protocol-model", "rejects removing an unknown block", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    assertThrows(() => {
        model.removeBlock("missing-block");
    });
});

test("protocol-model", "does not change state after failed block removal", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    const before = model.getSnapshot();

    assertThrows(() => {
        model.removeBlock("missing-block");
    });

    assertDeepEqual(model.getSnapshot(), before);
});

test("protocol-model", "updates a block name by ID", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    model.updateBlock("block-1", {
        name: "Updated Block",
    });

    assertEqual(model.getSnapshot().phases[0].blocks[0].name, "Updated Block");
});

test("protocol-model", "updates a block duration by ID", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    model.updateBlock("block-1", {
        durationSeconds: 600,
    });

    assertEqual(model.getSnapshot().phases[0].blocks[0].durationSeconds, 600);
});

test("protocol-model", "replaces block variables", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

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

    model.updateBlock("block-1", {
        variables,
    });

    assertDeepEqual(model.getSnapshot().phases[0].blocks[0].variables, variables);
});

test("protocol-model", "normalizes updated block variables", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    model.updateBlock("block-1", {
        variables: {
            speed: {
                type: "steady",
                start: 4,
                end: 8,
                step: 2,
            },
            incline: {
                type: "linear",
                start: 0,
                end: 3,
                step: 1,
            },
        },
    });

    assertDeepEqual(model.getSnapshot().phases[0].blocks[0].variables, {
        speed: {
            type: "steady",
            start: 4,
        },
        incline: {
            type: "linear",
            start: 0,
            end: 3,
        },
    });
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

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    model.updateBlock("block-2", {
        name: "Updated Second Block",
    });

    const snapshot = model.getSnapshot();

    assertEqual(snapshot.phases[0].blocks[0].name, "Warmup Block");

    assertEqual(snapshot.phases[1].blocks[0].name, "Updated Second Block");
});

test("protocol-model", "rejects updating an unknown block", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    assertThrows(() => {
        model.updateBlock("missing-block", {
            name: "Updated",
        });
    });
});

test("protocol-model", "rejects invalid block updates", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    assertThrows(() => {
        model.updateBlock("block-1", {
            durationSeconds: 0,
        });
    });
});

test("protocol-model", "does not change state after failed block update", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    const before = model.getSnapshot();

    assertThrows(() => {
        model.updateBlock("block-1", {
            variables: {
                speed: {
                    type: "steady",
                    start: 4,
                },
            },
        });
    });

    assertDeepEqual(model.getSnapshot(), before);
});

test("protocol-model", "notifies subscribers after successful changes", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    let receivedSnapshot;

    model.subscribe((snapshot) => {
        receivedSnapshot = snapshot;
    });

    const phaseId = model.addPhase("Second Phase");

    assertDeepEqual(receivedSnapshot.phases.at(-1), {
        id: phaseId,
        name: "Second Phase",
        blocks: [],
    });
});

test("protocol-model", "notifies subscribers once per successful mutation", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    let notificationCount = 0;

    model.subscribe(() => {
        notificationCount += 1;
    });

    model.updatePhase("phase-1", {
        name: "Updated Warmup",
    });

    assertEqual(notificationCount, 1);
});

test("protocol-model", "does not notify subscribers after failed changes", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    let notificationCount = 0;

    model.subscribe(() => {
        notificationCount += 1;
    });

    assertThrows(() => {
        model.updatePhase("phase-1", {
            name: "",
        });
    });

    assertEqual(notificationCount, 0);
});

test("protocol-model", "supports multiple subscribers", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

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
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    let notificationCount = 0;

    const unsubscribe = model.subscribe(() => {
        notificationCount += 1;
    });

    model.updatePhase("phase-1", {
        name: "First Update",
    });

    unsubscribe();

    model.updatePhase("phase-1", {
        name: "Second Update",
    });

    assertEqual(notificationCount, 1);
});

test("protocol-model", "subscriber snapshots are defensive copies", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    model.subscribe((snapshot) => {
        snapshot.phases[0].name = "Subscriber Mutation";
    });

    model.updatePhase("phase-1", {
        name: "Committed Name",
    });

    assertEqual(model.getSnapshot().phases[0].name, "Committed Name");
});

test("protocol-model", "emits once for each successful mutation method", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    let notificationCount = 0;

    model.subscribe(() => {
        notificationCount += 1;
    });

    const phaseId = model.addPhase("Second Phase");
    assertEqual(notificationCount, 1);

    model.updatePhase(phaseId, {
        name: "Updated Second Phase",
    });
    assertEqual(notificationCount, 2);

    const blockId = model.addBlock(phaseId, {
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
    });
    assertEqual(notificationCount, 3);

    model.updateBlock(blockId, {
        name: "Updated Second Block",
    });
    assertEqual(notificationCount, 4);

    model.removeBlock(blockId);
    assertEqual(notificationCount, 5);

    model.removePhase(phaseId);
    assertEqual(notificationCount, 6);
});

test("protocol-model", "inserts a phase at the requested index", () => {
    const model = createProtocolModel();

    const phaseId = model.addPhase("Inserted", 1);

    const snapshot = model.getSnapshot();

    assertEqual(snapshot.phases[1].id, phaseId);

    assertEqual(snapshot.phases[1].name, "Inserted");
});

test("protocol-model", "inserts a phase at the beginning", () => {
    const model = createProtocolModel();

    const phaseId = model.addPhase("First", 0);

    assertEqual(model.getSnapshot().phases[0].id, phaseId);
});

test("protocol-model", "appends a phase when insertion index is omitted", () => {
    const model = createProtocolModel();

    const originalLength = model.getSnapshot().phases.length;

    const phaseId = model.addPhase("Last");

    const snapshot = model.getSnapshot();

    assertEqual(snapshot.phases.length, originalLength + 1);

    assertEqual(snapshot.phases.at(-1).id, phaseId);
});

test("protocol-model", "inserts a block at the requested index", () => {
    const model = createProtocolModel();

    const blockId = model.addBlock(
        "phase-1",
        {
            name: "Inserted Block",
            durationSeconds: 180,
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
        0,
    );

    const phase = model.getSnapshot().phases.find((candidate) => candidate.id === "phase-1");

    assertEqual(phase.blocks[0].id, blockId);
});

test("protocol-model", "appends a block when insertion index is omitted", () => {
    const model = createProtocolModel();

    const blockId = model.addBlock("phase-1", {
        name: "Last Block",
        durationSeconds: 180,
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
    });

    const phase = model.getSnapshot().phases.find((candidate) => candidate.id === "phase-1");

    assertEqual(phase.blocks.at(-1).id, blockId);
});

test("protocol-model", "rejects an invalid phase insertion index", () => {
    const model = createProtocolModel();

    assertThrows(() => model.addPhase("Invalid", -1), "phase insertion index");
});

test("protocol-model", "rejects an invalid block insertion index", () => {
    const model = createProtocolModel();

    assertThrows(
        () =>
            model.addBlock(
                "phase-1",
                {
                    name: "Invalid Block",
                    durationSeconds: 180,
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
                1.5,
            ),
        "block insertion index",
    );
});

test("protocol-model", "failed phase insertion leaves protocol state unchanged", () => {
    const model = createProtocolModel();

    const before = model.getSnapshot();

    assertThrows(() => model.addPhase("Invalid", 999), "phase insertion index");

    assertDeepEqual(model.getSnapshot(), before);
});

test("protocol-model", "failed block insertion leaves protocol state unchanged", () => {
    const model = createProtocolModel();

    const before = model.getSnapshot();

    assertThrows(
        () =>
            model.addBlock(
                "phase-1",
                {
                    name: "Invalid Block",
                    durationSeconds: 180,
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
                999,
            ),
        "block insertion index",
    );

    assertDeepEqual(model.getSnapshot(), before);
});

test("protocol-model", "moves a phase to a later final index", () => {
    const model = createProtocolModel();

    const before = model.getSnapshot();
    const phaseId = before.phases[0].id;

    model.movePhase(phaseId, before.phases.length - 1);

    const after = model.getSnapshot();

    assertEqual(after.phases.at(-1).id, phaseId);
});

test("protocol-model", "moves a phase to an earlier final index", () => {
    const model = createProtocolModel();

    const before = model.getSnapshot();
    const phaseId = before.phases.at(-1).id;

    model.movePhase(phaseId, 0);

    const after = model.getSnapshot();

    assertEqual(after.phases[0].id, phaseId);
});

test("protocol-model", "preserves phase data when moving a phase", () => {
    const model = createProtocolModel();

    const before = model.getSnapshot();
    const phase = before.phases[0];

    model.movePhase(phase.id, before.phases.length - 1);

    const after = model.getSnapshot();
    const movedPhase = after.phases.find((candidate) => candidate.id === phase.id);

    assertDeepEqual(movedPhase, phase);
});

test("protocol-model", "phase move to its current index is a no-op", () => {
    const model = createProtocolModel();

    const before = model.getSnapshot();
    const phaseId = before.phases[0].id;

    let notificationCount = 0;

    model.subscribe(() => {
        notificationCount += 1;
    });

    model.movePhase(phaseId, 0);

    assertDeepEqual(model.getSnapshot(), before);

    assertEqual(notificationCount, 0);
});

test("protocol-model", "rejects moving an unknown phase", () => {
    const model = createProtocolModel();

    assertThrows(() => {
        model.movePhase("missing-phase", 0);
    });
});

test("protocol-model", "rejects a non-integer phase move index", () => {
    const model = createProtocolModel();

    const phaseId = model.getSnapshot().phases[0].id;

    assertThrows(() => {
        model.movePhase(phaseId, 1.5);
    });
});

test("protocol-model", "rejects an out-of-range phase move index", () => {
    const model = createProtocolModel();

    const snapshot = model.getSnapshot();
    const phaseId = snapshot.phases[0].id;

    assertThrows(() => {
        model.movePhase(phaseId, snapshot.phases.length);
    });
});

test("protocol-model", "failed phase move leaves protocol state unchanged", () => {
    const model = createProtocolModel();

    const before = model.getSnapshot();

    assertThrows(() => {
        model.movePhase(before.phases[0].id, before.phases.length);
    });

    assertDeepEqual(model.getSnapshot(), before);
});

test("protocol-model", "moves a block to a later final index", () => {
    const model = createProtocolModel();

    const initial = model.getSnapshot();
    const phase = initial.phases.find((candidate) => candidate.blocks.length > 0);

    const originalBlockId = phase.blocks[0].id;

    model.addBlock(phase.id, phase.blocks[0]);

    const before = model.getSnapshot();
    const updatedPhase = before.phases.find((candidate) => candidate.id === phase.id);

    model.moveBlock(originalBlockId, updatedPhase.id, updatedPhase.blocks.length - 1);

    const after = model.getSnapshot();
    const movedPhase = after.phases.find((candidate) => candidate.id === phase.id);

    assertEqual(movedPhase.blocks.at(-1).id, originalBlockId);
});

test("protocol-model", "moves a block to an earlier final index", () => {
    const model = createProtocolModel();

    const initial = model.getSnapshot();
    const phase = initial.phases.find((candidate) => candidate.blocks.length > 0);

    const newBlockId = model.addBlock(phase.id, phase.blocks[0]);

    model.moveBlock(newBlockId, phase.id, 0);

    const after = model.getSnapshot();
    const movedPhase = after.phases.find((candidate) => candidate.id === phase.id);

    assertEqual(movedPhase.blocks[0].id, newBlockId);
});

test("protocol-model", "preserves block data when moving a block", () => {
    const model = createProtocolModel();

    const initial = model.getSnapshot();
    const phase = initial.phases.find((candidate) => candidate.blocks.length > 0);

    const blockId = phase.blocks[0].id;

    model.addBlock(phase.id, phase.blocks[0]);

    const before = model.getSnapshot();

    const block = before.phases
        .flatMap((candidate) => candidate.blocks)
        .find((candidate) => candidate.id === blockId);

    const containingPhase = before.phases.find((candidate) =>
        candidate.blocks.some((candidateBlock) => candidateBlock.id === blockId),
    );

    model.moveBlock(blockId, containingPhase.id, containingPhase.blocks.length - 1);

    const after = model.getSnapshot();

    const movedBlock = after.phases
        .flatMap((candidate) => candidate.blocks)
        .find((candidate) => candidate.id === blockId);

    assertDeepEqual(movedBlock, block);
});

test("protocol-model", "block move to its current index is a no-op", () => {
    const model = createProtocolModel();

    const before = model.getSnapshot();

    const phase = before.phases.find((candidate) => candidate.blocks.length > 0);

    const blockId = phase.blocks[0].id;

    let notificationCount = 0;

    model.subscribe(() => {
        notificationCount += 1;
    });

    model.moveBlock(blockId, phase.id, 0);

    assertDeepEqual(model.getSnapshot(), before);

    assertEqual(notificationCount, 0);
});

test("protocol-model", "rejects moving an unknown block", () => {
    const model = createProtocolModel();

    const phase = model.getSnapshot().phases[0];

    assertThrows(() => {
        model.moveBlock("missing-block", phase.id, 0);
    });
});

test("protocol-model", "rejects a non-integer block move index", () => {
    const model = createProtocolModel();

    const phase = model.getSnapshot().phases.find((candidate) => candidate.blocks.length > 0);

    assertThrows(() => {
        model.moveBlock(phase.blocks[0].id, phase.id, 0.5);
    });
});

test("protocol-model", "rejects an out-of-range block move index", () => {
    const model = createProtocolModel();

    const phase = model.getSnapshot().phases.find((candidate) => candidate.blocks.length > 0);

    assertThrows(() => {
        model.moveBlock(phase.blocks[0].id, phase.id, phase.blocks.length);
    });
});

test("protocol-model", "failed block move leaves protocol state unchanged", () => {
    const model = createProtocolModel();

    const before = model.getSnapshot();

    const phase = before.phases.find((candidate) => candidate.blocks.length > 0);

    assertThrows(() => {
        model.moveBlock(phase.blocks[0].id, phase.id, phase.blocks.length);
    });

    assertDeepEqual(model.getSnapshot(), before);
});

test("protocol-model", "successful moves notify subscribers once", () => {
    const model = createProtocolModel();

    model.addPhase("Second Phase");

    const phaseId = model.getSnapshot().phases[0].id;

    let notificationCount = 0;

    model.subscribe(() => {
        notificationCount += 1;
    });

    model.movePhase(phaseId, 1);

    assertEqual(notificationCount, 1);
});

test("protocol-model", "supports protocols without a CalibrationProfile", () => {
    const protocol = createProtocol();
    delete protocol.calibrationProfileId;

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    const snapshot = model.getSnapshot();

    assertEqual(snapshot.calibrationProfileId, undefined);
});

test("protocol-model", "constructs with a matching CalibrationProfile", () => {
    const protocol = createProtocol();
    protocol.calibrationProfileId = CALIBRATION_PROFILE.id;

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE, CALIBRATION_PROFILE);

    assertEqual(model.getSnapshot().calibrationProfileId, CALIBRATION_PROFILE.id);
});

test("protocol-model", "rejects a referenced CalibrationProfile when none is supplied", () => {
    const protocol = createProtocol();
    protocol.calibrationProfileId = CALIBRATION_PROFILE.id;

    assertThrows(() => new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE));
});

test("protocol-model", "rejects a mismatched CalibrationProfile", () => {
    const protocol = createProtocol();
    protocol.calibrationProfileId = CALIBRATION_PROFILE.id;

    const otherCalibrationProfile = {
        id: "other-calibration",
        machineProfileId: MACHINE_PROFILE.id,
    };

    assertThrows(
        () => new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE, otherCalibrationProfile),
    );
});

test("protocol-model", "preserves calibrationProfileId in snapshots", () => {
    const protocol = createProtocol();
    protocol.calibrationProfileId = CALIBRATION_PROFILE.id;

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE, CALIBRATION_PROFILE);

    const snapshot = model.getSnapshot();

    assertEqual(snapshot.calibrationProfileId, CALIBRATION_PROFILE.id);
});

test("protocol-model", "rejects a mismatched CalibrationProfile", () => {
    const protocol = createProtocol();
    protocol.calibrationProfileId = CALIBRATION_PROFILE.id;

    const otherCalibrationProfile = {
        id: "other-calibration",
        machineProfileId: MACHINE_PROFILE.id,
    };

    assertThrows(
        () => new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE, otherCalibrationProfile),
    );
});

test("protocol-model", "updates MachineProfile without changing protocol structure", () => {
    const model = createProtocolModel();
    const before = model.getSnapshot();

    model.updateSetup({
        activityType: ACTIVITY_TYPE,
        machineProfile: OTHER_MACHINE_PROFILE,
    });

    const after = model.getSnapshot();

    assertEqual(after.activityTypeId, ACTIVITY_TYPE.id);
    assertEqual(after.machineProfileId, OTHER_MACHINE_PROFILE.id);
    assertEqual(after.calibrationProfileId, undefined);
    assertDeepEqual(after.phases, before.phases);
});

test("protocol-model", "updates CalibrationProfile without changing protocol structure", () => {
    const protocol = createProtocol();
    protocol.calibrationProfileId = CALIBRATION_PROFILE.id;

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE, CALIBRATION_PROFILE);

    const before = model.getSnapshot();

    const otherCalibrationProfile = {
        id: "other-test-calibration",
        machineProfileId: MACHINE_PROFILE.id,
    };

    model.updateSetup({
        activityType: ACTIVITY_TYPE,
        machineProfile: MACHINE_PROFILE,
        calibrationProfile: otherCalibrationProfile,
    });

    const after = model.getSnapshot();

    assertEqual(after.calibrationProfileId, otherCalibrationProfile.id);
    assertDeepEqual(after.phases, before.phases);
});

test("protocol-model", "clears MachineProfile and CalibrationProfile references", () => {
    const protocol = createProtocol();
    protocol.calibrationProfileId = CALIBRATION_PROFILE.id;

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE, CALIBRATION_PROFILE);

    model.updateSetup({
        activityType: ACTIVITY_TYPE,
    });

    const snapshot = model.getSnapshot();

    assertEqual(snapshot.machineProfileId, undefined);
    assertEqual(snapshot.calibrationProfileId, undefined);
});

test(
    "protocol-model",
    "rejects changing ActivityType when protocol structure exists without reset",
    () => {
        const model = createProtocolModel();
        const before = model.getSnapshot();

        assertThrows(() =>
            model.updateSetup({
                activityType: OTHER_ACTIVITY_TYPE,
            }),
        );

        assertDeepEqual(model.getSnapshot(), before);
    },
);

test("protocol-model", "changes ActivityType and clears structure when reset", () => {
    const model = createProtocolModel();

    model.updateSetup({
        activityType: OTHER_ACTIVITY_TYPE,
        resetStructure: true,
    });

    const snapshot = model.getSnapshot();

    assertEqual(snapshot.activityTypeId, OTHER_ACTIVITY_TYPE.id);
    assertEqual(snapshot.machineProfileId, undefined);
    assertEqual(snapshot.calibrationProfileId, undefined);
    assertDeepEqual(snapshot.phases, []);
});

test("protocol-model", "failed setup update leaves protocol state unchanged", () => {
    const model = createProtocolModel();
    const before = model.getSnapshot();

    const invalidCalibrationProfile = {
        id: "invalid-calibration",
        machineProfileId: "wrong-machine",
    };

    assertThrows(() =>
        model.updateSetup({
            activityType: ACTIVITY_TYPE,
            machineProfile: MACHINE_PROFILE,
            calibrationProfile: invalidCalibrationProfile,
        }),
    );

    assertDeepEqual(model.getSnapshot(), before);
});

test("protocol-model", "successful setup update notifies subscribers once", () => {
    const model = createProtocolModel();

    let notificationCount = 0;

    model.subscribe(() => {
        notificationCount += 1;
    });

    model.updateSetup({
        activityType: ACTIVITY_TYPE,
        machineProfile: OTHER_MACHINE_PROFILE,
    });

    assertEqual(notificationCount, 1);
});

test("protocol-model", "failed setup update does not notify subscribers", () => {
    const model = createProtocolModel();

    let notificationCount = 0;

    model.subscribe(() => {
        notificationCount += 1;
    });

    assertThrows(() =>
        model.updateSetup({
            activityType: OTHER_ACTIVITY_TYPE,
        }),
    );

    assertEqual(notificationCount, 0);
});
