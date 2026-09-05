import {
    test,
    assert,
    assertEqual,
    assertDeepEqual,
} from "/packages/js-testing/framework/test-framework.js";

import { wireProtocolSetupEvents } from "../../../interactions/protocol-setup-events.js";

const ACTIVITY_TYPE = {
    id: "treadmill",
    name: "Treadmill",
};

const OTHER_ACTIVITY_TYPE = {
    id: "elliptical",
    name: "Elliptical",
};

const MACHINE_PROFILE = {
    id: "machine-1",
    name: "Machine 1",
    activityTypeId: ACTIVITY_TYPE.id,
};

const OTHER_MACHINE_PROFILE = {
    id: "machine-2",
    name: "Machine 2",
    activityTypeId: ACTIVITY_TYPE.id,
};

const ELLIPTICAL_MACHINE_PROFILE = {
    id: "elliptical-machine",
    name: "Elliptical Machine",
    activityTypeId: OTHER_ACTIVITY_TYPE.id,
};

const CALIBRATION_PROFILE = {
    id: "calibration-1",
    name: "Calibration 1",
    machineProfileId: MACHINE_PROFILE.id,
};

const OTHER_CALIBRATION_PROFILE = {
    id: "calibration-2",
    name: "Calibration 2",
    machineProfileId: MACHINE_PROFILE.id,
};

const MACHINE_2_CALIBRATION_PROFILE = {
    id: "machine-2-calibration",
    name: "Machine 2 Calibration",
    machineProfileId: OTHER_MACHINE_PROFILE.id,
};

/** Creates a standard committed protocol snapshot. */
function createProtocol() {
    return {
        activityTypeId: ACTIVITY_TYPE.id,
        machineProfileId: MACHINE_PROFILE.id,
        calibrationProfileId: CALIBRATION_PROFILE.id,
        phases: [
            {
                id: "phase-1",
                name: "Phase 1",
                blocks: [],
            },
        ],
    };
}

/** Creates a wired Protocol Setup interaction test harness. */
function createHarness(protocol = createProtocol()) {
    const setupButton = document.createElement("button");
    const closeButton = document.createElement("button");
    const cancelButton = document.createElement("button");
    const applyButton = document.createElement("button");

    applyButton.disabled = true;

    const activityTypeSelect = document.createElement("select");
    const machineProfileSelect = document.createElement("select");
    const calibrationProfileSelect = document.createElement("select");

    const setupDialog = {
        open: false,

        showModal() {
            this.open = true;
        },

        close() {
            this.open = false;
        },
    };

    const domainData = {
        activityTypes: new Map([
            [ACTIVITY_TYPE.id, ACTIVITY_TYPE],
            [OTHER_ACTIVITY_TYPE.id, OTHER_ACTIVITY_TYPE],
        ]),

        machineProfiles: new Map([
            [MACHINE_PROFILE.id, MACHINE_PROFILE],
            [OTHER_MACHINE_PROFILE.id, OTHER_MACHINE_PROFILE],
            [ELLIPTICAL_MACHINE_PROFILE.id, ELLIPTICAL_MACHINE_PROFILE],
        ]),

        calibrationProfiles: new Map([
            [CALIBRATION_PROFILE.id, CALIBRATION_PROFILE],
            [OTHER_CALIBRATION_PROFILE.id, OTHER_CALIBRATION_PROFILE],
            [MACHINE_2_CALIBRATION_PROFILE.id, MACHINE_2_CALIBRATION_PROFILE],
        ]),
    };

    const updateSetupCalls = [];

    const protocolModel = {
        getSnapshot() {
            return structuredClone(protocol);
        },

        updateSetup(setup) {
            updateSetupCalls.push(setup);
        },
    };

    wireProtocolSetupEvents({
        setupButton,
        setupDialog,
        closeButton,
        cancelButton,
        applyButton,
        activityTypeSelect,
        machineProfileSelect,
        calibrationProfileSelect,
        domainData,
        protocolModel,
    });

    setupButton.click();

    return {
        setupButton,
        setupDialog,
        closeButton,
        cancelButton,
        applyButton,
        activityTypeSelect,
        machineProfileSelect,
        calibrationProfileSelect,
        updateSetupCalls,
    };
}

test("protocol-setup-events", "initializes controls from committed protocol state", () => {
    const harness = createHarness();

    assertEqual(harness.activityTypeSelect.value, ACTIVITY_TYPE.id);
    assertEqual(harness.machineProfileSelect.value, MACHINE_PROFILE.id);
    assertEqual(harness.calibrationProfileSelect.value, CALIBRATION_PROFILE.id);
    assertEqual(harness.calibrationProfileSelect.disabled, false);
    assertEqual(harness.applyButton.disabled, true);
});

test(
    "protocol-setup-events",
    "changing ActivityType clears MachineProfile and CalibrationProfile",
    () => {
        const harness = createHarness();

        harness.activityTypeSelect.value = OTHER_ACTIVITY_TYPE.id;
        harness.activityTypeSelect.dispatchEvent(new Event("change"));

        assertEqual(harness.machineProfileSelect.value, "");
        assertEqual(harness.calibrationProfileSelect.value, "");
        assertEqual(harness.calibrationProfileSelect.disabled, true);
        assertEqual(harness.applyButton.disabled, false);
    },
);

test("protocol-setup-events", "changing MachineProfile clears CalibrationProfile", () => {
    const harness = createHarness();

    harness.machineProfileSelect.value = OTHER_MACHINE_PROFILE.id;
    harness.machineProfileSelect.dispatchEvent(new Event("change"));

    assertEqual(harness.machineProfileSelect.value, OTHER_MACHINE_PROFILE.id);
    assertEqual(harness.calibrationProfileSelect.value, "");
    assertEqual(harness.calibrationProfileSelect.disabled, false);
    assertEqual(harness.applyButton.disabled, false);
});

test("protocol-setup-events", "applies a MachineProfile-only change", () => {
    const harness = createHarness();

    harness.machineProfileSelect.value = OTHER_MACHINE_PROFILE.id;
    harness.machineProfileSelect.dispatchEvent(new Event("change"));

    harness.applyButton.click();

    assertDeepEqual(harness.updateSetupCalls, [
        {
            activityType: ACTIVITY_TYPE,
            machineProfile: OTHER_MACHINE_PROFILE,
            calibrationProfile: undefined,
            resetStructure: false,
        },
    ]);

    assertEqual(harness.setupDialog.open, false);
});

test("protocol-setup-events", "applies a CalibrationProfile-only change", () => {
    const harness = createHarness();

    harness.calibrationProfileSelect.value = OTHER_CALIBRATION_PROFILE.id;
    harness.calibrationProfileSelect.dispatchEvent(new Event("change"));

    harness.applyButton.click();

    assertDeepEqual(harness.updateSetupCalls, [
        {
            activityType: ACTIVITY_TYPE,
            machineProfile: MACHINE_PROFILE,
            calibrationProfile: OTHER_CALIBRATION_PROFILE,
            resetStructure: false,
        },
    ]);

    assertEqual(harness.setupDialog.open, false);
});

test(
    "protocol-setup-events",
    "clearing MachineProfile applies without MachineProfile or CalibrationProfile",
    () => {
        const harness = createHarness();

        harness.machineProfileSelect.value = "";
        harness.machineProfileSelect.dispatchEvent(new Event("change"));

        harness.applyButton.click();

        assertDeepEqual(harness.updateSetupCalls, [
            {
                activityType: ACTIVITY_TYPE,
                machineProfile: undefined,
                calibrationProfile: undefined,
                resetStructure: false,
            },
        ]);

        assertEqual(harness.setupDialog.open, false);
    },
);

test(
    "protocol-setup-events",
    "declining ActivityType reset leaves protocol unchanged and dialog open",
    () => {
        const harness = createHarness();
        const originalConfirm = window.confirm;

        try {
            window.confirm = () => false;

            harness.activityTypeSelect.value = OTHER_ACTIVITY_TYPE.id;
            harness.activityTypeSelect.dispatchEvent(new Event("change"));

            harness.applyButton.click();

            assertEqual(harness.updateSetupCalls.length, 0);
            assertEqual(harness.setupDialog.open, true);
        } finally {
            window.confirm = originalConfirm;
        }
    },
);

test("protocol-setup-events", "confirming ActivityType reset applies with resetStructure", () => {
    const harness = createHarness();
    const originalConfirm = window.confirm;

    try {
        window.confirm = () => true;

        harness.activityTypeSelect.value = OTHER_ACTIVITY_TYPE.id;
        harness.activityTypeSelect.dispatchEvent(new Event("change"));

        harness.applyButton.click();

        assertDeepEqual(harness.updateSetupCalls, [
            {
                activityType: OTHER_ACTIVITY_TYPE,
                machineProfile: undefined,
                calibrationProfile: undefined,
                resetStructure: true,
            },
        ]);

        assertEqual(harness.setupDialog.open, false);
    } finally {
        window.confirm = originalConfirm;
    }
});

test(
    "protocol-setup-events",
    "changes ActivityType without confirmation when protocol has no phases",
    () => {
        const protocol = createProtocol();

        protocol.phases = [];

        const harness = createHarness(protocol);

        let confirmCalled = false;
        const originalConfirm = window.confirm;

        try {
            window.confirm = () => {
                confirmCalled = true;

                return true;
            };

            harness.activityTypeSelect.value = OTHER_ACTIVITY_TYPE.id;
            harness.activityTypeSelect.dispatchEvent(new Event("change"));

            harness.applyButton.click();

            assertEqual(confirmCalled, false);

            assertDeepEqual(harness.updateSetupCalls, [
                {
                    activityType: OTHER_ACTIVITY_TYPE,
                    machineProfile: undefined,
                    calibrationProfile: undefined,
                    resetStructure: false,
                },
            ]);

            assertEqual(harness.setupDialog.open, false);
        } finally {
            window.confirm = originalConfirm;
        }
    },
);

test("protocol-setup-events", "Cancel closes without applying changes", () => {
    const harness = createHarness();

    harness.machineProfileSelect.value = OTHER_MACHINE_PROFILE.id;
    harness.machineProfileSelect.dispatchEvent(new Event("change"));

    harness.cancelButton.click();

    assertEqual(harness.updateSetupCalls.length, 0);
    assertEqual(harness.setupDialog.open, false);
});

test("protocol-setup-events", "reopening discards unapplied setup changes", () => {
    const harness = createHarness();

    harness.machineProfileSelect.value = OTHER_MACHINE_PROFILE.id;
    harness.machineProfileSelect.dispatchEvent(new Event("change"));

    harness.cancelButton.click();
    harness.setupButton.click();

    assertEqual(harness.activityTypeSelect.value, ACTIVITY_TYPE.id);
    assertEqual(harness.machineProfileSelect.value, MACHINE_PROFILE.id);
    assertEqual(harness.calibrationProfileSelect.value, CALIBRATION_PROFILE.id);
    assertEqual(harness.applyButton.disabled, true);
});
