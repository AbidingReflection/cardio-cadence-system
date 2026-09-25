/** Tests startup setup resolution from stored Protocol Designer preferences. */

import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { resolveStartupSetup } from "../../../app/resolve-startup-setup.js";

function createDomainData() {
    const activityTypes = new Map([
        [
            "elliptical",
            {
                id: "elliptical",
            },
        ],
        [
            "cycling",
            {
                id: "cycling",
            },
        ],
    ]);

    const machineProfiles = new Map([
        [
            "elliptical-machine",
            {
                id: "elliptical-machine",
                activityTypeId: "elliptical",
            },
        ],
        [
            "cycling-machine",
            {
                id: "cycling-machine",
                activityTypeId: "cycling",
            },
        ],
    ]);

    const calibrationProfiles = new Map([
        [
            "elliptical-calibration",
            {
                id: "elliptical-calibration",
                machineProfileId: "elliptical-machine",
            },
        ],
    ]);

    return {
        activityTypes,
        machineProfiles,
        calibrationProfiles,
    };
}

function createPreferences(lastSetup = undefined) {
    return {
        getLastSetup() {
            return lastSetup;
        },
    };
}

test("resolve-startup-setup", "uses the stored activity type when available", () => {
    const domainData = createDomainData();
    const preferences = createPreferences({
        activityTypeId: "cycling",
    });

    const setup = resolveStartupSetup({
        domainData,
        preferences,
        defaultActivityTypeId: "elliptical",
        defaultMachineProfileId: "elliptical-machine",
    });

    assertEqual(setup.activityType, domainData.activityTypes.get("cycling"));
});

test("resolve-startup-setup", "falls back to the default activity type when none is stored", () => {
    const domainData = createDomainData();
    const preferences = createPreferences();

    const setup = resolveStartupSetup({
        domainData,
        preferences,
        defaultActivityTypeId: "elliptical",
        defaultMachineProfileId: "elliptical-machine",
    });

    assertEqual(setup.activityType, domainData.activityTypes.get("elliptical"));
});

test(
    "resolve-startup-setup",
    "falls back to the default activity type when the stored activity type is missing",
    () => {
        const domainData = createDomainData();
        const preferences = createPreferences({
            activityTypeId: "missing-activity",
        });

        const setup = resolveStartupSetup({
            domainData,
            preferences,
            defaultActivityTypeId: "elliptical",
            defaultMachineProfileId: "elliptical-machine",
        });

        assertEqual(setup.activityType, domainData.activityTypes.get("elliptical"));
    },
);

test("resolve-startup-setup", "uses the stored machine profile when available", () => {
    const domainData = createDomainData();
    const preferences = createPreferences({
        activityTypeId: "cycling",
        machineProfileId: "cycling-machine",
    });

    const setup = resolveStartupSetup({
        domainData,
        preferences,
        defaultActivityTypeId: "elliptical",
        defaultMachineProfileId: "elliptical-machine",
    });

    assertEqual(setup.machineProfile, domainData.machineProfiles.get("cycling-machine"));
});

test(
    "resolve-startup-setup",
    "omits a stored machine profile that does not match the resolved activity type",
    () => {
        const domainData = createDomainData();
        const preferences = createPreferences({
            activityTypeId: "cycling",
            machineProfileId: "elliptical-machine",
        });

        const setup = resolveStartupSetup({
            domainData,
            preferences,
            defaultActivityTypeId: "elliptical",
            defaultMachineProfileId: "elliptical-machine",
        });

        assertEqual(setup.machineProfile, undefined);
    },
);

test(
    "resolve-startup-setup",
    "uses the default machine profile when no machine is stored and it matches the resolved activity type",
    () => {
        const domainData = createDomainData();
        const preferences = createPreferences({
            activityTypeId: "elliptical",
        });

        const setup = resolveStartupSetup({
            domainData,
            preferences,
            defaultActivityTypeId: "elliptical",
            defaultMachineProfileId: "elliptical-machine",
        });

        assertEqual(setup.machineProfile, domainData.machineProfiles.get("elliptical-machine"));
    },
);

test(
    "resolve-startup-setup",
    "omits the default machine profile when it does not match the resolved activity type",
    () => {
        const domainData = createDomainData();
        const preferences = createPreferences({
            activityTypeId: "cycling",
        });

        const setup = resolveStartupSetup({
            domainData,
            preferences,
            defaultActivityTypeId: "elliptical",
            defaultMachineProfileId: "elliptical-machine",
        });

        assertEqual(setup.machineProfile, undefined);
    },
);

test(
    "resolve-startup-setup",
    "uses the stored calibration profile when it matches the resolved machine profile",
    () => {
        const domainData = createDomainData();
        const preferences = createPreferences({
            activityTypeId: "elliptical",
            machineProfileId: "elliptical-machine",
            calibrationProfileId: "elliptical-calibration",
        });

        const setup = resolveStartupSetup({
            domainData,
            preferences,
            defaultActivityTypeId: "elliptical",
            defaultMachineProfileId: "elliptical-machine",
        });

        assertEqual(
            setup.calibrationProfile,
            domainData.calibrationProfiles.get("elliptical-calibration"),
        );
    },
);

test(
    "resolve-startup-setup",
    "omits a stored calibration profile when its machine profile does not match",
    () => {
        const domainData = createDomainData();
        const preferences = createPreferences({
            activityTypeId: "cycling",
            machineProfileId: "cycling-machine",
            calibrationProfileId: "elliptical-calibration",
        });

        const setup = resolveStartupSetup({
            domainData,
            preferences,
            defaultActivityTypeId: "elliptical",
            defaultMachineProfileId: "elliptical-machine",
        });

        assertEqual(setup.calibrationProfile, undefined);
    },
);

test("resolve-startup-setup", "omits a missing stored calibration profile", () => {
    const domainData = createDomainData();
    const preferences = createPreferences({
        activityTypeId: "elliptical",
        machineProfileId: "elliptical-machine",
        calibrationProfileId: "missing-calibration",
    });

    const setup = resolveStartupSetup({
        domainData,
        preferences,
        defaultActivityTypeId: "elliptical",
        defaultMachineProfileId: "elliptical-machine",
    });

    assertEqual(setup.calibrationProfile, undefined);
});
