import {
    assertDeepEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import {
    createCalibrationProfileVersion,
    validateCalibrationProfileVersion,
} from "../records/calibration-profile-version.js";

const CREATED_AT = 1_789_360_000_000;

const VALID_DEFINITION = {
    id: "bike-calibration",
    name: "Bike Calibration",
    machineProfileId: "concept2-bike",
    context: {},
    domain: {},
    model: {},
};

test("calibration-profile-version", "creates a valid initial calibration profile version", () => {
    const version = createCalibrationProfileVersion({
        id: "calibration-profile-version-1",
        calibrationProfileId: "bike-calibration",
        versionNumber: 1,
        createdAtUnixMs: CREATED_AT,
        machineProfileVersionId: "machine-profile-version-1",
        machineProfileId: "concept2-bike",
        definition: VALID_DEFINITION,
    });

    assertDeepEqual(version, {
        id: "calibration-profile-version-1",
        calibrationProfileId: "bike-calibration",
        versionNumber: 1,
        parentVersionId: undefined,
        createdAtUnixMs: CREATED_AT,
        machineProfileVersionId: "machine-profile-version-1",
        machineProfileId: "concept2-bike",
        definition: VALID_DEFINITION,
    });
});

test("calibration-profile-version", "accepts a later version with a parent", () => {
    validateCalibrationProfileVersion({
        id: "calibration-profile-version-2",
        calibrationProfileId: "bike-calibration",
        versionNumber: 2,
        parentVersionId: "calibration-profile-version-1",
        createdAtUnixMs: CREATED_AT + 1_000,
        machineProfileVersionId: "machine-profile-version-2",
        machineProfileId: "concept2-bike",
        definition: VALID_DEFINITION,
    });
});

test("calibration-profile-version", "rejects a missing version ID", () => {
    assertThrows(
        () =>
            validateCalibrationProfileVersion({
                id: "",
                calibrationProfileId: "bike-calibration",
                versionNumber: 1,
                createdAtUnixMs: CREATED_AT,
                machineProfileVersionId: "machine-profile-version-1",
                machineProfileId: "concept2-bike",
                definition: VALID_DEFINITION,
            }),
        /id/,
    );
});

test("calibration-profile-version", "rejects a missing calibration profile ID", () => {
    assertThrows(
        () =>
            validateCalibrationProfileVersion({
                id: "calibration-profile-version-1",
                calibrationProfileId: "",
                versionNumber: 1,
                createdAtUnixMs: CREATED_AT,
                machineProfileVersionId: "machine-profile-version-1",
                machineProfileId: "concept2-bike",
                definition: VALID_DEFINITION,
            }),
        /calibrationProfileId/,
    );
});

test("calibration-profile-version", "rejects a non-positive version number", () => {
    assertThrows(
        () =>
            validateCalibrationProfileVersion({
                id: "calibration-profile-version-1",
                calibrationProfileId: "bike-calibration",
                versionNumber: 0,
                createdAtUnixMs: CREATED_AT,
                machineProfileVersionId: "machine-profile-version-1",
                machineProfileId: "concept2-bike",
                definition: VALID_DEFINITION,
            }),
        /versionNumber/,
    );
});

test("calibration-profile-version", "rejects a non-integer version number", () => {
    assertThrows(
        () =>
            validateCalibrationProfileVersion({
                id: "calibration-profile-version-1",
                calibrationProfileId: "bike-calibration",
                versionNumber: 1.5,
                createdAtUnixMs: CREATED_AT,
                machineProfileVersionId: "machine-profile-version-1",
                machineProfileId: "concept2-bike",
                definition: VALID_DEFINITION,
            }),
        /versionNumber/,
    );
});

test("calibration-profile-version", "rejects a parent on version one", () => {
    assertThrows(
        () =>
            validateCalibrationProfileVersion({
                id: "calibration-profile-version-1",
                calibrationProfileId: "bike-calibration",
                versionNumber: 1,
                parentVersionId: "calibration-profile-version-0",
                createdAtUnixMs: CREATED_AT,
                machineProfileVersionId: "machine-profile-version-1",
                machineProfileId: "concept2-bike",
                definition: VALID_DEFINITION,
            }),
        /parentVersionId/,
    );
});

test("calibration-profile-version", "requires a parent after version one", () => {
    assertThrows(
        () =>
            validateCalibrationProfileVersion({
                id: "calibration-profile-version-2",
                calibrationProfileId: "bike-calibration",
                versionNumber: 2,
                createdAtUnixMs: CREATED_AT + 1_000,
                machineProfileVersionId: "machine-profile-version-2",
                machineProfileId: "concept2-bike",
                definition: VALID_DEFINITION,
            }),
        /parentVersionId/,
    );
});

test("calibration-profile-version", "rejects an invalid creation timestamp", () => {
    assertThrows(
        () =>
            validateCalibrationProfileVersion({
                id: "calibration-profile-version-1",
                calibrationProfileId: "bike-calibration",
                versionNumber: 1,
                createdAtUnixMs: NaN,
                machineProfileVersionId: "machine-profile-version-1",
                machineProfileId: "concept2-bike",
                definition: VALID_DEFINITION,
            }),
        /createdAtUnixMs/,
    );
});

test("calibration-profile-version", "requires a machine profile version ID", () => {
    assertThrows(
        () =>
            validateCalibrationProfileVersion({
                id: "calibration-profile-version-1",
                calibrationProfileId: "bike-calibration",
                versionNumber: 1,
                createdAtUnixMs: CREATED_AT,
                machineProfileVersionId: "",
                machineProfileId: "concept2-bike",
                definition: VALID_DEFINITION,
            }),
        /machineProfileVersionId/,
    );
});

test("calibration-profile-version", "requires a machine profile ID", () => {
    assertThrows(
        () =>
            validateCalibrationProfileVersion({
                id: "calibration-profile-version-1",
                calibrationProfileId: "bike-calibration",
                versionNumber: 1,
                createdAtUnixMs: CREATED_AT,
                machineProfileVersionId: "machine-profile-version-1",
                machineProfileId: "",
                definition: VALID_DEFINITION,
            }),
        /machineProfileId/,
    );
});

test("calibration-profile-version", "rejects a non-object definition", () => {
    assertThrows(
        () =>
            validateCalibrationProfileVersion({
                id: "calibration-profile-version-1",
                calibrationProfileId: "bike-calibration",
                versionNumber: 1,
                createdAtUnixMs: CREATED_AT,
                machineProfileVersionId: "machine-profile-version-1",
                machineProfileId: "concept2-bike",
                definition: null,
            }),
        /definition/,
    );
});

test(
    "calibration-profile-version",
    "requires definition ID to match calibration profile ID",
    () => {
        assertThrows(
            () =>
                validateCalibrationProfileVersion({
                    id: "calibration-profile-version-1",
                    calibrationProfileId: "bike-calibration",
                    versionNumber: 1,
                    createdAtUnixMs: CREATED_AT,
                    machineProfileVersionId: "machine-profile-version-1",
                    machineProfileId: "concept2-bike",
                    definition: {
                        ...VALID_DEFINITION,
                        id: "other-calibration",
                    },
                }),
            /definition id/,
        );
    },
);

test(
    "calibration-profile-version",
    "requires definition machine profile ID to match machine profile ID",
    () => {
        assertThrows(
            () =>
                validateCalibrationProfileVersion({
                    id: "calibration-profile-version-1",
                    calibrationProfileId: "bike-calibration",
                    versionNumber: 1,
                    createdAtUnixMs: CREATED_AT,
                    machineProfileVersionId: "machine-profile-version-1",
                    machineProfileId: "concept2-bike",
                    definition: {
                        ...VALID_DEFINITION,
                        machineProfileId: "concept2-rower",
                    },
                }),
            /definition machineProfileId/,
        );
    },
);

test("calibration-profile-version", "does not mutate the supplied definition", () => {
    const definition = structuredClone(VALID_DEFINITION);

    const version = createCalibrationProfileVersion({
        id: "calibration-profile-version-1",
        calibrationProfileId: "bike-calibration",
        versionNumber: 1,
        createdAtUnixMs: CREATED_AT,
        machineProfileVersionId: "machine-profile-version-1",
        machineProfileId: "concept2-bike",
        definition,
    });

    version.definition.name = "Changed";

    assertDeepEqual(definition, VALID_DEFINITION);
});
