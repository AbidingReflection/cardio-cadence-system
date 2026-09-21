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

test("protocol-model-phases", "adds a new empty phase", () => {
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

test("protocol-model-phases", "adds a phase with a supplied name", () => {
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

test("protocol-model-phases", "generates unique phase IDs", () => {
    const protocol = createProtocol();
    protocol.phases = [];

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    const firstId = model.addPhase();
    const secondId = model.addPhase();

    assert(firstId !== secondId);
});

test("protocol-model-phases", "returns the generated phase ID", () => {
    const protocol = createProtocol();
    protocol.phases = [];

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    const phaseId = model.addPhase();

    assertEqual(model.getSnapshot().phases[0].id, phaseId);
});

test("protocol-model-phases", "does not commit an invalid phase", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    const before = model.getSnapshot();

    assertThrows(() => {
        model.addPhase("");
    });

    assertDeepEqual(model.getSnapshot(), before);
});

test("protocol-model-phases", "removes a phase by ID", () => {
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

test("protocol-model-phases", "allows removing the last phase", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    model.removePhase("phase-1");

    assertDeepEqual(model.getSnapshot().phases, []);
});

test("protocol-model-phases", "rejects removing an unknown phase", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    assertThrows(() => {
        model.removePhase("missing-phase");
    });
});

test("protocol-model-phases", "does not change state after failed phase removal", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    const before = model.getSnapshot();

    assertThrows(() => {
        model.removePhase("missing-phase");
    });

    assertDeepEqual(model.getSnapshot(), before);
});

test("protocol-model-phases", "updates a phase name by ID", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    model.updatePhase("phase-1", {
        name: "Updated Warmup",
    });

    assertEqual(model.getSnapshot().phases[0].name, "Updated Warmup");
});

test("protocol-model-phases", "updates only the targeted phase", () => {
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

test("protocol-model-phases", "rejects updating an unknown phase", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    assertThrows(() => {
        model.updatePhase("missing-phase", {
            name: "Updated",
        });
    });
});

test("protocol-model-phases", "rejects an invalid phase name", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    assertThrows(() => {
        model.updatePhase("phase-1", {
            name: "",
        });
    });
});

test("protocol-model-phases", "does not change state after failed phase update", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    const before = model.getSnapshot();

    assertThrows(() => {
        model.updatePhase("phase-1", {
            name: "",
        });
    });

    assertDeepEqual(model.getSnapshot(), before);
});

test("protocol-model-phases", "inserts a phase at the requested index", () => {
    const model = createProtocolModel();

    const phaseId = model.addPhase("Inserted", 1);

    const snapshot = model.getSnapshot();

    assertEqual(snapshot.phases[1].id, phaseId);

    assertEqual(snapshot.phases[1].name, "Inserted");
});

test("protocol-model-phases", "inserts a phase at the beginning", () => {
    const model = createProtocolModel();

    const phaseId = model.addPhase("First", 0);

    assertEqual(model.getSnapshot().phases[0].id, phaseId);
});

test("protocol-model-phases", "appends a phase when insertion index is omitted", () => {
    const model = createProtocolModel();

    const originalLength = model.getSnapshot().phases.length;

    const phaseId = model.addPhase("Last");

    const snapshot = model.getSnapshot();

    assertEqual(snapshot.phases.length, originalLength + 1);

    assertEqual(snapshot.phases.at(-1).id, phaseId);
});

test("protocol-model-phases", "rejects an invalid phase insertion index", () => {
    const model = createProtocolModel();

    assertThrows(() => model.addPhase("Invalid", -1), "phase insertion index");
});

test("protocol-model-phases", "failed phase insertion leaves protocol state unchanged", () => {
    const model = createProtocolModel();

    const before = model.getSnapshot();

    assertThrows(() => model.addPhase("Invalid", 999), "phase insertion index");

    assertDeepEqual(model.getSnapshot(), before);
});

test("protocol-model-phases", "moves a phase to a later final index", () => {
    const model = createProtocolModel();

    const originalPhaseId = model.getSnapshot().phases[0].id;

    model.addPhase("Second Phase");

    model.movePhase(originalPhaseId, 1);

    const after = model.getSnapshot();

    assertEqual(after.phases[1].id, originalPhaseId);
});

test("protocol-model-phases", "moves a phase to an earlier final index", () => {
    const model = createProtocolModel();

    const newPhaseId = model.addPhase("Second Phase");

    model.movePhase(newPhaseId, 0);

    const after = model.getSnapshot();

    assertEqual(after.phases[0].id, newPhaseId);
});

test("protocol-model-phases", "preserves phase data when moving a phase", () => {
    const model = createProtocolModel();

    const before = model.getSnapshot();
    const phase = before.phases[0];

    model.movePhase(phase.id, before.phases.length - 1);

    const after = model.getSnapshot();
    const movedPhase = after.phases.find((candidate) => candidate.id === phase.id);

    assertDeepEqual(movedPhase, phase);
});

test("protocol-model-phases", "phase move to its current index is a no-op", () => {
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

test("protocol-model-phases", "rejects moving an unknown phase", () => {
    const model = createProtocolModel();

    assertThrows(() => {
        model.movePhase("missing-phase", 0);
    });
});

test("protocol-model-phases", "rejects a non-integer phase move index", () => {
    const model = createProtocolModel();

    const phaseId = model.getSnapshot().phases[0].id;

    assertThrows(() => {
        model.movePhase(phaseId, 1.5);
    });
});

test("protocol-model-phases", "rejects an out-of-range phase move index", () => {
    const model = createProtocolModel();

    const snapshot = model.getSnapshot();
    const phaseId = snapshot.phases[0].id;

    assertThrows(() => {
        model.movePhase(phaseId, snapshot.phases.length);
    });
});

test("protocol-model-phases", "failed phase move leaves protocol state unchanged", () => {
    const model = createProtocolModel();

    const before = model.getSnapshot();

    assertThrows(() => {
        model.movePhase(before.phases[0].id, before.phases.length);
    });

    assertDeepEqual(model.getSnapshot(), before);
});
