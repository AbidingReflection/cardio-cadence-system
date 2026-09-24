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

test("protocol-model-setup", "supports protocols without a CalibrationProfile", () => {
    const protocol = createProtocol();
    delete protocol.calibrationProfileId;

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    const snapshot = model.getSnapshot();

    assertEqual(snapshot.calibrationProfileId, undefined);
});

test("protocol-model-setup", "constructs with a matching CalibrationProfile", () => {
    const protocol = createProtocol();
    protocol.calibrationProfileId = CALIBRATION_PROFILE.id;

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE, CALIBRATION_PROFILE);

    assertEqual(model.getSnapshot().calibrationProfileId, CALIBRATION_PROFILE.id);
});

test(
    "protocol-model-setup",
    "rejects a referenced CalibrationProfile when none is supplied",
    () => {
        const protocol = createProtocol();
        protocol.calibrationProfileId = CALIBRATION_PROFILE.id;

        assertThrows(() => new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE));
    },
);

test("protocol-model-setup", "rejects a mismatched CalibrationProfile", () => {
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

test("protocol-model-setup", "preserves calibrationProfileId in snapshots", () => {
    const protocol = createProtocol();
    protocol.calibrationProfileId = CALIBRATION_PROFILE.id;

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE, CALIBRATION_PROFILE);

    const snapshot = model.getSnapshot();

    assertEqual(snapshot.calibrationProfileId, CALIBRATION_PROFILE.id);
});

test("protocol-model-setup", "rejects a mismatched CalibrationProfile", () => {
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

test("protocol-model-setup", "updates MachineProfile without changing protocol structure", () => {
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

test(
    "protocol-model-setup",
    "updates CalibrationProfile without changing protocol structure",
    () => {
        const protocol = createProtocol();
        protocol.calibrationProfileId = CALIBRATION_PROFILE.id;

        const model = new ProtocolModel(
            protocol,
            ACTIVITY_TYPE,
            MACHINE_PROFILE,
            CALIBRATION_PROFILE,
        );

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
    },
);

test("protocol-model-setup", "clears MachineProfile and CalibrationProfile references", () => {
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
    "protocol-model-setup",
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

test("protocol-model-setup", "changes ActivityType and clears structure when reset", () => {
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

test("protocol-model-setup", "failed setup update leaves protocol state unchanged", () => {
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

test("protocol-model-setup", "successful setup update notifies subscribers once", () => {
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

test("protocol-model-setup", "failed setup update does not notify subscribers", () => {
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

test("protocol-model-setup", "returns the current setup context", () => {
    const protocol = createProtocol();

    protocol.machineProfileId = MACHINE_PROFILE.id;
    protocol.calibrationProfileId = CALIBRATION_PROFILE.id;

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE, CALIBRATION_PROFILE);

    const setupContext = model.getSetupContext();

    assertEqual(setupContext.activityType, ACTIVITY_TYPE);
    assertEqual(setupContext.machineProfile, MACHINE_PROFILE);
    assertEqual(setupContext.calibrationProfile, CALIBRATION_PROFILE);
});

test("protocol-model-setup", "returns updated setup context after updateSetup", () => {
    const protocol = createProtocol();

    protocol.machineProfileId = MACHINE_PROFILE.id;
    protocol.calibrationProfileId = CALIBRATION_PROFILE.id;

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE, CALIBRATION_PROFILE);

    model.updateSetup({
        activityType: ACTIVITY_TYPE,
        machineProfile: OTHER_MACHINE_PROFILE,
        calibrationProfile: OTHER_CALIBRATION_PROFILE,
    });

    const setupContext = model.getSetupContext();

    assertEqual(setupContext.activityType, ACTIVITY_TYPE);
    assertEqual(setupContext.machineProfile, OTHER_MACHINE_PROFILE);
    assertEqual(setupContext.calibrationProfile, OTHER_CALIBRATION_PROFILE);
});

test("protocol-model-setup", "returns undefined optional setup context", () => {
    const protocol = createProtocol();

    delete protocol.machineProfileId;
    delete protocol.calibrationProfileId;

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE);

    const setupContext = model.getSetupContext();

    assertEqual(setupContext.activityType, ACTIVITY_TYPE);
    assertEqual(setupContext.machineProfile, undefined);
    assertEqual(setupContext.calibrationProfile, undefined);
});

test("protocol-model-setup", "moves a phase when calibration context is present", () => {
    const protocol = createProtocol();
    protocol.calibrationProfileId = CALIBRATION_PROFILE.id;

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE, CALIBRATION_PROFILE);

    const originalPhaseId = model.getSnapshot().phases[0].id;

    model.addPhase("Second Phase");

    model.movePhase(originalPhaseId, 1);

    const after = model.getSnapshot();

    assertEqual(after.phases[1].id, originalPhaseId);
    assertEqual(after.calibrationProfileId, CALIBRATION_PROFILE.id);
});

test("protocol-model-setup", "moves a block when calibration context is present", () => {
    const protocol = createProtocol();
    protocol.calibrationProfileId = CALIBRATION_PROFILE.id;

    const model = new ProtocolModel(protocol, ACTIVITY_TYPE, MACHINE_PROFILE, CALIBRATION_PROFILE);

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
    assertEqual(after.calibrationProfileId, CALIBRATION_PROFILE.id);
});

test("protocol-model-setup", "replaces the committed protocol and setup context", () => {
    const model = createProtocolModel();
    const replacementProtocol = createProtocol();

    replacementProtocol.machineProfileId = OTHER_MACHINE_PROFILE.id;
    replacementProtocol.calibrationProfileId = OTHER_CALIBRATION_PROFILE.id;
    replacementProtocol.phases[0].name = "Opened Protocol";

    model.replaceProtocol(
        replacementProtocol,
        ACTIVITY_TYPE,
        OTHER_MACHINE_PROFILE,
        OTHER_CALIBRATION_PROFILE,
    );

    assertDeepEqual(model.getSnapshot(), replacementProtocol);
    assertDeepEqual(model.getSetupContext(), {
        activityType: ACTIVITY_TYPE,
        machineProfile: OTHER_MACHINE_PROFILE,
        calibrationProfile: OTHER_CALIBRATION_PROFILE,
    });
});

test("protocol-model-setup", "protocol replacement notifies subscribers once", () => {
    const model = createProtocolModel();
    const notifications = [];

    model.subscribe((snapshot) => {
        notifications.push(snapshot);
    });

    const replacementProtocol = {
        activityTypeId: ACTIVITY_TYPE.id,
        machineProfileId: OTHER_MACHINE_PROFILE.id,
        calibrationProfileId: OTHER_CALIBRATION_PROFILE.id,
        phases: [],
    };

    model.replaceProtocol(
        replacementProtocol,
        ACTIVITY_TYPE,
        OTHER_MACHINE_PROFILE,
        OTHER_CALIBRATION_PROFILE,
    );

    assertEqual(notifications.length, 1);
    assertDeepEqual(notifications[0], replacementProtocol);
});

test("protocol-model-setup", "failed protocol replacement leaves model state unchanged", () => {
    const model = createProtocolModel();

    const originalProtocol = model.getSnapshot();
    const originalSetupContext = model.getSetupContext();

    const invalidReplacement = {
        activityTypeId: OTHER_ACTIVITY_TYPE.id,
        machineProfileId: MACHINE_PROFILE.id,
        phases: [],
    };

    assertThrows(() => {
        model.replaceProtocol(invalidReplacement, OTHER_ACTIVITY_TYPE, MACHINE_PROFILE);
    }, /MachineProfile/);

    assertDeepEqual(model.getSnapshot(), originalProtocol);
    assertDeepEqual(model.getSetupContext(), originalSetupContext);
});

test("protocol-model-setup", "normalizes replacement protocol data", () => {
    const model = createProtocolModel();
    const replacementProtocol = createProtocol();

    replacementProtocol.phases[0].blocks[0].variables.incline = {
        type: "steady",
        start: 2,
        end: 5,
        step: 1,
    };

    model.replaceProtocol(replacementProtocol, ACTIVITY_TYPE, MACHINE_PROFILE);

    assertDeepEqual(model.getSnapshot().phases[0].blocks[0].variables.incline, {
        type: "steady",
        start: 2,
    });
});

test("protocol-model-setup", "resets protocol structure while preserving supplied setup", () => {
    const model = createProtocolModel();

    model.resetProtocol({
        activityType: ACTIVITY_TYPE,
        machineProfile: MACHINE_PROFILE,
        calibrationProfile: CALIBRATION_PROFILE,
    });

    assertDeepEqual(model.getSnapshot(), {
        activityTypeId: ACTIVITY_TYPE.id,
        machineProfileId: MACHINE_PROFILE.id,
        calibrationProfileId: CALIBRATION_PROFILE.id,
        phases: [],
    });
});

test("protocol-model-setup", "resets protocol without optional setup references", () => {
    const model = createProtocolModel();

    model.resetProtocol({
        activityType: ACTIVITY_TYPE,
    });

    assertDeepEqual(model.getSnapshot(), {
        activityTypeId: ACTIVITY_TYPE.id,
        phases: [],
    });
});

test("protocol-model-setup", "reset protocol updates setup context", () => {
    const model = createProtocolModel();

    model.resetProtocol({
        activityType: OTHER_ACTIVITY_TYPE,
    });

    assertDeepEqual(model.getSetupContext(), {
        activityType: OTHER_ACTIVITY_TYPE,
        machineProfile: undefined,
        calibrationProfile: undefined,
    });
});

test("protocol-model-setup", "reset protocol notifies subscribers once", () => {
    const model = createProtocolModel();

    let notificationCount = 0;

    model.subscribe(() => {
        notificationCount += 1;
    });

    model.resetProtocol({
        activityType: ACTIVITY_TYPE,
        machineProfile: MACHINE_PROFILE,
        calibrationProfile: CALIBRATION_PROFILE,
    });

    assertEqual(notificationCount, 1);
});
