import {
    test,
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

test("protocol-model-core", "constructs from valid protocol data", () => {
    const protocol = createProtocol();

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    assertDeepEqual(model.getSnapshot(), protocol);
});

test("protocol-model-core", "stores normalized protocol data", () => {
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

test("protocol-model-core", "rejects invalid protocol data", () => {
    const protocol = createProtocol();

    delete protocol.phases[0].blocks[0].variables.incline;

    assertThrows(() => {
        new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);
    });
});

test("protocol-model-core", "isolates state from constructor input", () => {
    const protocol = createProtocol();

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    protocol.phases[0].name = "Changed";
    protocol.phases[0].blocks[0].durationSeconds = 999;
    protocol.phases[0].blocks[0].variables.speed.start = 9;

    assertDeepEqual(model.getSnapshot(), createProtocol());
});

test("protocol-model-core", "returns independent snapshots", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    const snapshot = model.getSnapshot();

    snapshot.phases[0].name = "Changed";
    snapshot.phases[0].blocks[0].durationSeconds = 999;
    snapshot.phases[0].blocks[0].variables.speed.start = 9;

    assertDeepEqual(model.getSnapshot(), createProtocol());
});

test("protocol-model-core", "returns independent snapshots on every call", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    const firstSnapshot = model.getSnapshot();
    const secondSnapshot = model.getSnapshot();

    firstSnapshot.phases[0].name = "Changed";

    assertDeepEqual(secondSnapshot, createProtocol());
});

test("protocol-model-core", "supports protocols without a MachineProfile", () => {
    const protocol = createProtocol();

    delete protocol.machineProfileId;

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE);

    assertDeepEqual(model.getSnapshot(), protocol);
});
