import {
    test,
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

test("protocol-model-subscriptions", "notifies subscribers after successful changes", () => {
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

test("protocol-model-subscriptions", "notifies subscribers once per successful mutation", () => {
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

test("protocol-model-subscriptions", "does not notify subscribers after failed changes", () => {
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

test("protocol-model-subscriptions", "supports multiple subscribers", () => {
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

test("protocol-model-subscriptions", "unsubscribe stops future notifications", () => {
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

test("protocol-model-subscriptions", "subscriber snapshots are defensive copies", () => {
    const model = new ProtocolModel(createProtocol(), ACTIVITY_TYPE, MACHINE_PROFILE);

    model.subscribe((snapshot) => {
        snapshot.phases[0].name = "Subscriber Mutation";
    });

    model.updatePhase("phase-1", {
        name: "Committed Name",
    });

    assertEqual(model.getSnapshot().phases[0].name, "Committed Name");
});

test("protocol-model-subscriptions", "emits once for each successful mutation method", () => {
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

test("protocol-model-subscriptions", "successful moves notify subscribers once", () => {
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
