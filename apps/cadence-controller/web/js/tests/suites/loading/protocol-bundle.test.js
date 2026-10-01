import {
    test,
    assertEqual,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import { ProtocolBundle } from "../../../loading/protocol-bundle.js";

const VALID_PROTOCOL = {
    id: "test-protocol",
    name: "Test Protocol",
    activityTypeId: "elliptical",
    machineProfileId: null,
    calibrationProfileId: null,
    phases: [
        {
            id: "phase-1",
            name: "Phase 1",
            blocks: [
                {
                    id: "block-1",
                    name: "Block 1",
                    durationSeconds: 60,
                    variables: {
                        cadence: {
                            type: "steady",
                            start: 60,
                        },
                    },
                },
            ],
        },
    ],
};

const VALID_ACTIVITY_TYPE = {
    id: "elliptical",
    name: "Elliptical",
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

function createValidBundleData() {
    return {
        protocol: structuredClone(VALID_PROTOCOL),
        activityType: structuredClone(VALID_ACTIVITY_TYPE),
        machineProfile: null,
        calibrationProfile: null,
    };
}

test("protocol-bundle", "constructs a valid ProtocolBundle", () => {
    const bundle = new ProtocolBundle(createValidBundleData());

    assertEqual(bundle.protocol.id, "test-protocol");
    assertEqual(bundle.activityType.id, "elliptical");
    assertEqual(bundle.cadenceVariableId, "cadence");
});

test("protocol-bundle", "returns the bundled protocol", () => {
    const data = createValidBundleData();
    const bundle = new ProtocolBundle(data);

    assertDeepEqual(bundle.protocol, data.protocol);
});

test("protocol-bundle", "returns the bundled ActivityType", () => {
    const bundle = new ProtocolBundle(createValidBundleData());

    assertEqual(bundle.activityType.id, "elliptical");
    assertEqual(bundle.activityType.name, "Elliptical");
});

test("protocol-bundle", "resolves the cadence variable by activity role", () => {
    const data = createValidBundleData();

    data.activityType.variables = [
        {
            id: "rpm",
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
    ];

    const bundle = new ProtocolBundle(data);

    assertEqual(bundle.cadenceVariableId, "rpm");
});

test("protocol-bundle", "protects internal protocol data from constructor input mutation", () => {
    const data = createValidBundleData();
    const bundle = new ProtocolBundle(data);

    data.protocol.name = "Changed";
    data.protocol.phases[0].name = "Changed Phase";

    assertEqual(bundle.protocol.name, "Test Protocol");
    assertEqual(bundle.protocol.phases[0].name, "Phase 1");
});

test("protocol-bundle", "protects internal protocol data returned by protocol getter", () => {
    const bundle = new ProtocolBundle(createValidBundleData());

    const protocol = bundle.protocol;

    protocol.name = "Changed";
    protocol.phases[0].name = "Changed Phase";

    assertEqual(bundle.protocol.name, "Test Protocol");
    assertEqual(bundle.protocol.phases[0].name, "Phase 1");
});

test("protocol-bundle", "rejects non-object input", () => {
    assertThrows(() => new ProtocolBundle(null));
    assertThrows(() => new ProtocolBundle([]));
    assertThrows(() => new ProtocolBundle("protocol"));
});

test("protocol-bundle", "rejects a missing protocol object", () => {
    const data = createValidBundleData();

    delete data.protocol;

    assertThrows(() => new ProtocolBundle(data));
});

test("protocol-bundle", "rejects a non-object protocol value", () => {
    const data = createValidBundleData();

    data.protocol = [];

    assertThrows(() => new ProtocolBundle(data));
});

test("protocol-bundle", "rejects a missing activityType object", () => {
    const data = createValidBundleData();

    delete data.activityType;

    assertThrows(() => new ProtocolBundle(data));
});

test("protocol-bundle", "rejects a non-object activityType value", () => {
    const data = createValidBundleData();

    data.activityType = [];

    assertThrows(() => new ProtocolBundle(data));
});

test("protocol-bundle", "rejects a mismatched ActivityType", () => {
    const data = createValidBundleData();

    data.protocol.activityTypeId = "stationary-bike";

    assertThrows(() => new ProtocolBundle(data));
});

test("protocol-bundle", "rejects an ActivityType without a cadence variable", () => {
    const data = createValidBundleData();

    data.activityType.variables = [
        {
            id: "resistance",
            name: "Resistance",
            unit: null,
            role: "load",
        },
    ];

    assertThrows(() => new ProtocolBundle(data));
});

test("protocol-bundle", "rejects multiple cadence variables", () => {
    const data = createValidBundleData();

    data.activityType.variables = [
        {
            id: "cadence",
            name: "Cadence",
            unit: "RPM",
            role: "cadence",
        },
        {
            id: "secondaryCadence",
            name: "Secondary Cadence",
            unit: "RPM",
            role: "cadence",
        },
    ];

    assertThrows(() => new ProtocolBundle(data));
});
