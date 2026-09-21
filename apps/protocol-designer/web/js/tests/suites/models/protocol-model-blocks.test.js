import {
    test,
    assert,
    assertEqual,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import { ProtocolModel } from "../../../models/protocol-model.js";

import {
    ACTIVITY_TYPE,
    CALIBRATION_PROFILE,
    MACHINE_PROFILE,
    OTHER_ACTIVITY_TYPE,
    OTHER_CALIBRATION_PROFILE,
    OTHER_MACHINE_PROFILE,
    createProtocol,
    createProtocolModel,
} from "../../helpers/protocol-model-fixtures.js";

test("protocol-model-blocks", "adds a block to a phase", () => {
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

test("protocol-model-blocks", "adds a block only to the targeted phase", () => {
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

test("protocol-model-blocks", "generates unique block IDs", () => {
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

test("protocol-model-blocks", "ignores a supplied block ID", () => {
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

test("protocol-model-blocks", "rejects adding a block to an unknown phase", () => {
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

test("protocol-model-blocks", "rejects adding an invalid block", () => {
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

test("protocol-model-blocks", "does not change state after failed block addition", () => {
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

test("protocol-model-blocks", "removes a block by ID", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    model.removeBlock("block-1");

    assertDeepEqual(model.getSnapshot().phases[0].blocks, []);
});

test("protocol-model-blocks", "removes a block from the correct phase", () => {
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

test("protocol-model-blocks", "allows removing the last block from a phase", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    model.removeBlock("block-1");

    assertEqual(model.getSnapshot().phases[0].blocks.length, 0);
});

test("protocol-model-blocks", "rejects removing an unknown block", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    assertThrows(() => {
        model.removeBlock("missing-block");
    });
});

test("protocol-model-blocks", "does not change state after failed block removal", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    const before = model.getSnapshot();

    assertThrows(() => {
        model.removeBlock("missing-block");
    });

    assertDeepEqual(model.getSnapshot(), before);
});

test("protocol-model-blocks", "updates a block name by ID", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    model.updateBlock("block-1", {
        name: "Updated Block",
    });

    assertEqual(model.getSnapshot().phases[0].blocks[0].name, "Updated Block");
});

test("protocol-model-blocks", "updates a block duration by ID", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    model.updateBlock("block-1", {
        durationSeconds: 600,
    });

    assertEqual(model.getSnapshot().phases[0].blocks[0].durationSeconds, 600);
});

test("protocol-model-blocks", "replaces block variables", () => {
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

test("protocol-model-blocks", "normalizes updated block variables", () => {
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

test("protocol-model-blocks", "updates only the targeted block", () => {
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

test("protocol-model-blocks", "rejects updating an unknown block", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    assertThrows(() => {
        model.updateBlock("missing-block", {
            name: "Updated",
        });
    });
});

test("protocol-model-blocks", "rejects invalid block updates", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    assertThrows(() => {
        model.updateBlock("block-1", {
            durationSeconds: 0,
        });
    });
});

test("protocol-model-blocks", "does not change state after failed block update", () => {
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

test("protocol-model-blocks", "inserts a block at the requested index", () => {
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

test("protocol-model-blocks", "appends a block when insertion index is omitted", () => {
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

test("protocol-model-blocks", "rejects an invalid block insertion index", () => {
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

test("protocol-model-blocks", "failed block insertion leaves protocol state unchanged", () => {
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

test("protocol-model-blocks", "moves a block to a later final index", () => {
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

test("protocol-model-blocks", "moves a block to an earlier final index", () => {
    const model = createProtocolModel();

    const initial = model.getSnapshot();
    const phase = initial.phases.find((candidate) => candidate.blocks.length > 0);

    const newBlockId = model.addBlock(phase.id, phase.blocks[0]);

    model.moveBlock(newBlockId, phase.id, 0);

    const after = model.getSnapshot();
    const movedPhase = after.phases.find((candidate) => candidate.id === phase.id);

    assertEqual(movedPhase.blocks[0].id, newBlockId);
});

test("protocol-model-blocks", "preserves block data when moving a block", () => {
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

test("protocol-model-blocks", "block move to its current index is a no-op", () => {
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

test("protocol-model-blocks", "rejects moving an unknown block", () => {
    const model = createProtocolModel();

    const phase = model.getSnapshot().phases[0];

    assertThrows(() => {
        model.moveBlock("missing-block", phase.id, 0);
    });
});

test("protocol-model-blocks", "rejects a non-integer block move index", () => {
    const model = createProtocolModel();

    const phase = model.getSnapshot().phases.find((candidate) => candidate.blocks.length > 0);

    assertThrows(() => {
        model.moveBlock(phase.blocks[0].id, phase.id, 0.5);
    });
});

test("protocol-model-blocks", "rejects an out-of-range block move index", () => {
    const model = createProtocolModel();

    const phase = model.getSnapshot().phases.find((candidate) => candidate.blocks.length > 0);

    assertThrows(() => {
        model.moveBlock(phase.blocks[0].id, phase.id, phase.blocks.length);
    });
});

test("protocol-model-blocks", "failed block move leaves protocol state unchanged", () => {
    const model = createProtocolModel();

    const before = model.getSnapshot();

    const phase = before.phases.find((candidate) => candidate.blocks.length > 0);

    assertThrows(() => {
        model.moveBlock(phase.blocks[0].id, phase.id, phase.blocks.length);
    });

    assertDeepEqual(model.getSnapshot(), before);
});
