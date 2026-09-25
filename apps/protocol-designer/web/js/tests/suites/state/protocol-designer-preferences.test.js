/** Tests persisted Protocol Designer preferences. */

import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { ProtocolDesignerPreferences } from "../../../state/protocol-designer-preferences.js";

/** Creates an in-memory Storage-compatible test double. */
function createStorage() {
    const values = new Map();

    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },

        setItem(key, value) {
            values.set(key, String(value));
        },

        removeItem(key) {
            values.delete(key);
        },

        setRaw(key, value) {
            values.set(key, value);
        },
    };
}

test("protocol-designer-preferences", "returns undefined when no last setup is stored", () => {
    const storage = createStorage();
    const preferences = new ProtocolDesignerPreferences({ storage });

    assertEqual(preferences.getLastSetup(), undefined);
});

test("protocol-designer-preferences", "stores an activity-type-only setup", () => {
    const storage = createStorage();
    const preferences = new ProtocolDesignerPreferences({ storage });

    preferences.setLastSetup({
        activityTypeId: "elliptical",
    });

    assertDeepEqual(preferences.getLastSetup(), {
        activityTypeId: "elliptical",
    });
});

test("protocol-designer-preferences", "stores an optional machine profile", () => {
    const storage = createStorage();
    const preferences = new ProtocolDesignerPreferences({ storage });

    preferences.setLastSetup({
        activityTypeId: "elliptical",
        machineProfileId: "true-treadmill-aquatic-center",
    });

    assertDeepEqual(preferences.getLastSetup(), {
        activityTypeId: "elliptical",
        machineProfileId: "true-treadmill-aquatic-center",
    });
});

test("protocol-designer-preferences", "stores an optional calibration profile", () => {
    const storage = createStorage();
    const preferences = new ProtocolDesignerPreferences({ storage });

    preferences.setLastSetup({
        activityTypeId: "elliptical",
        machineProfileId: "true-treadmill-aquatic-center",
        calibrationProfileId: "calibration-1",
    });

    assertDeepEqual(preferences.getLastSetup(), {
        activityTypeId: "elliptical",
        machineProfileId: "true-treadmill-aquatic-center",
        calibrationProfileId: "calibration-1",
    });
});

test("protocol-designer-preferences", "replaces the previously stored setup", () => {
    const storage = createStorage();
    const preferences = new ProtocolDesignerPreferences({ storage });

    preferences.setLastSetup({
        activityTypeId: "elliptical",
        machineProfileId: "machine-1",
        calibrationProfileId: "calibration-1",
    });

    preferences.setLastSetup({
        activityTypeId: "cycling",
    });

    assertDeepEqual(preferences.getLastSetup(), {
        activityTypeId: "cycling",
    });
});

test("protocol-designer-preferences", "clears the stored setup", () => {
    const storage = createStorage();
    const preferences = new ProtocolDesignerPreferences({ storage });

    preferences.setLastSetup({
        activityTypeId: "elliptical",
    });

    preferences.clearLastSetup();

    assertEqual(preferences.getLastSetup(), undefined);
});

test("protocol-designer-preferences", "returns undefined for malformed stored JSON", () => {
    const storage = createStorage();
    const preferences = new ProtocolDesignerPreferences({ storage });

    storage.setRaw("cardio-cadence-system:protocol-designer:last-setup", "{not valid json");

    assertEqual(preferences.getLastSetup(), undefined);
});

test("protocol-designer-preferences", "returns a fresh setup value on each read", () => {
    const storage = createStorage();
    const preferences = new ProtocolDesignerPreferences({ storage });

    preferences.setLastSetup({
        activityTypeId: "elliptical",
        machineProfileId: "machine-1",
    });

    const first = preferences.getLastSetup();
    first.activityTypeId = "changed";

    assertDeepEqual(preferences.getLastSetup(), {
        activityTypeId: "elliptical",
        machineProfileId: "machine-1",
    });
});

test("protocol-designer-preferences", "stores setup context as last-used setup IDs", () => {
    const storage = createStorage();

    const preferences = new ProtocolDesignerPreferences({
        storage,
    });

    preferences.setLastSetupContext({
        activityType: {
            id: "elliptical",
        },
        machineProfile: {
            id: "machine-1",
        },
        calibrationProfile: {
            id: "calibration-1",
        },
    });

    assertDeepEqual(preferences.getLastSetup(), {
        activityTypeId: "elliptical",
        machineProfileId: "machine-1",
        calibrationProfileId: "calibration-1",
    });
});

test("protocol-designer-preferences", "omits absent optional setup context IDs", () => {
    const storage = createStorage();

    const preferences = new ProtocolDesignerPreferences({
        storage,
    });

    preferences.setLastSetupContext({
        activityType: {
            id: "running",
        },
        machineProfile: undefined,
        calibrationProfile: undefined,
    });

    assertDeepEqual(preferences.getLastSetup(), {
        activityTypeId: "running",
    });
});

test(
    "protocol-designer-preferences",
    "returns undefined when no last protocol family ID is stored",
    () => {
        const preferences = new ProtocolDesignerPreferences({
            storage: createStorage(),
        });

        assertEqual(preferences.getLastProtocolFamilyId(), undefined);
    },
);

test("protocol-designer-preferences", "stores the last protocol family ID", () => {
    const preferences = new ProtocolDesignerPreferences({
        storage: createStorage(),
    });

    preferences.setLastProtocolFamilyId("protocol-family-1");

    assertEqual(preferences.getLastProtocolFamilyId(), "protocol-family-1");
});

test("protocol-designer-preferences", "replaces the previously stored protocol family ID", () => {
    const preferences = new ProtocolDesignerPreferences({
        storage: createStorage(),
    });

    preferences.setLastProtocolFamilyId("protocol-family-1");
    preferences.setLastProtocolFamilyId("protocol-family-2");

    assertEqual(preferences.getLastProtocolFamilyId(), "protocol-family-2");
});

test("protocol-designer-preferences", "clears the stored protocol family ID", () => {
    const preferences = new ProtocolDesignerPreferences({
        storage: createStorage(),
    });

    preferences.setLastProtocolFamilyId("protocol-family-1");
    preferences.clearLastProtocolFamilyId();

    assertEqual(preferences.getLastProtocolFamilyId(), undefined);
});
