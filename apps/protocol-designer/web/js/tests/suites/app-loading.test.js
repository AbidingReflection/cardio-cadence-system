import { test, assert, assertEqual } from "/packages/js-testing/framework/test-framework.js";

import { loadDomainData } from "../../domain-data.js";

test("app-loading", "loads domain data into indexed Maps", async () => {
    const domainData = await loadDomainData();

    assert(domainData.activityTypes instanceof Map, "Expected activityTypes to be a Map.");
    assert(domainData.machineProfiles instanceof Map, "Expected machineProfiles to be a Map.");
    assert(
        domainData.calibrationProfiles instanceof Map,
        "Expected calibrationProfiles to be a Map.",
    );
});

test("app-loading", "loads at least one ActivityType", async () => {
    const { activityTypes } = await loadDomainData();

    assert(activityTypes.size > 0);
});

test("app-loading", "loads at least one MachineProfile", async () => {
    const { machineProfiles } = await loadDomainData();

    assert(machineProfiles.size > 0);
});

test("app-loading", "resolves known ActivityType IDs", async () => {
    const { activityTypes } = await loadDomainData();

    assert(activityTypes.has("stationary-bike"));
    assert(activityTypes.has("elliptical"));
    assert(activityTypes.has("treadmill"));
    assert(activityTypes.has("rowing"));
});

test("app-loading", "resolves known MachineProfile IDs", async () => {
    const { machineProfiles } = await loadDomainData();

    assert(machineProfiles.has("true-treadmill-aquatic-center"));
    assert(machineProfiles.has("true-elliptical-aquatic-center"));
    assert(machineProfiles.has("true-recumbent-bike-aquatic-center"));
    assert(machineProfiles.has("freemotion-recumbent-bike-aquatic-center"));
});

test("app-loading", "resolves every MachineProfile ActivityType reference", async () => {
    const { activityTypes, machineProfiles } = await loadDomainData();

    for (const machineProfile of machineProfiles.values()) {
        assert(
            activityTypes.has(machineProfile.activityTypeId),
            `MachineProfile "${machineProfile.id}" references unknown ActivityType "${machineProfile.activityTypeId}".`,
        );
    }
});

test("app-loading", "preserves known ActivityType data", async () => {
    const { activityTypes } = await loadDomainData();

    const elliptical = activityTypes.get("elliptical");
    const resistance = elliptical.getVariable("resistance");

    assertEqual(elliptical.name, "Elliptical");
    assertEqual(resistance.role, "load");
    assertEqual(resistance.unit, null);
});

test("app-loading", "preserves known MachineProfile constraints", async () => {
    const { machineProfiles } = await loadDomainData();

    const elliptical = machineProfiles.get("true-elliptical-aquatic-center");

    const resistance = elliptical.getVariable("resistance");

    assertEqual(resistance.controlMode, "machine-set");
    assertEqual(resistance.min, 1);
    assertEqual(resistance.max, 20);
    assertEqual(resistance.increment, 1);
});

test("app-loading", "loads domain data into indexed Maps", async () => {
    const {
        activityTypes,
        machineProfiles,
        calibrationProfiles,
    } = await loadDomainData();

    assert(activityTypes instanceof Map);
    assert(machineProfiles instanceof Map);
    assert(calibrationProfiles instanceof Map);
});

test("app-loading", "loads calibration profiles indexed by ID", async () => {
    const { calibrationProfiles } = await loadDomainData();

    const calibrationProfile = calibrationProfiles.get(
        "true-elliptical-aquatic-center-default",
    );

    assert(calibrationProfile !== undefined);
    assertEqual(
        calibrationProfile.machineProfileId,
        "true-elliptical-aquatic-center",
    );
});

test("app-loading", "loads at least one CalibrationProfile", async () => {
    const { calibrationProfiles } = await loadDomainData();

    assert(calibrationProfiles.size > 0);
});

test("app-loading", "resolves known CalibrationProfile IDs", async () => {
    const { calibrationProfiles } = await loadDomainData();

    assert(calibrationProfiles.has("true-elliptical-aquatic-center-default"));
});

test("app-loading", "resolves every CalibrationProfile MachineProfile reference", async () => {
    const { machineProfiles, calibrationProfiles } = await loadDomainData();

    for (const calibrationProfile of calibrationProfiles.values()) {
        assert(
            machineProfiles.has(calibrationProfile.machineProfileId),
               `CalibrationProfile "${calibrationProfile.id}" references unknown MachineProfile "${calibrationProfile.machineProfileId}".`,
        );
    }
});

test("app-loading", "preserves known CalibrationProfile data", async () => {
    const { calibrationProfiles } = await loadDomainData();

    const calibration = calibrationProfiles.get(
        "true-elliptical-aquatic-center-default",
    );

    assertEqual(
        calibration.machineProfileId,
        "true-elliptical-aquatic-center",
    );
    assertEqual(calibration.domain.cadence.min, 40);
    assertEqual(calibration.domain.cadence.max, 70);
    assertEqual(calibration.model.type, "polynomial");
});
