import {
    assert,
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { CalibrationProfile } from "../../../models/calibration-profile.js";

const MACHINE_PROFILE = {
    id: "true-elliptical-aquatic-center",

    getVariable(variableId) {
        const variables = {
            cadence: {
                controlMode: "user-produced",
                progressionTypes: ["steady", "linear", "stepped"],
            },
            resistance: {
                controlMode: "machine-set",
                min: 1,
                max: 20,
                increment: 1,
                progressionTypes: ["steady", "stepped"],
            },
        };

        return variables[variableId];
    },
};

function createCalibrationData() {
    return {
        id: "true-elliptical-aquatic-center-default",
        name: "True Elliptical - Aquatic Center Calibration",
        machineProfileId: "true-elliptical-aquatic-center",
        context: {},
        domain: {
            cadence: {
                min: 40,
                max: 70,
            },
            resistance: {
                min: 1,
                max: 16,
            },
        },
        model: {
            type: "polynomial",
            input: {
                type: "product",
                variables: ["cadence", "resistance"],
            },
            coefficients: [0.0572, 0.00014, 0.000000285, -0.000000000143],
            outputUnit: "kcalPerSecond",
        },
        validation: {
            sessionDurationSeconds: 4500,
            observedCalories: 980,
            absoluteErrorCalories: 1.4,
            relativeErrorPercent: 0.13,
        },
    };
}

test("calibration-profile", "constructs a valid calibration profile", () => {
    const data = createCalibrationData();

    const calibrationProfile = new CalibrationProfile(data, MACHINE_PROFILE);

    assertEqual(calibrationProfile.id, data.id);
    assertEqual(calibrationProfile.name, data.name);
    assertEqual(calibrationProfile.machineProfileId, data.machineProfileId);
    assertDeepEqual(calibrationProfile.context, data.context);
    assertDeepEqual(calibrationProfile.domain, data.domain);
    assertDeepEqual(calibrationProfile.model, data.model);
    assertDeepEqual(calibrationProfile.validation, data.validation);
});

test("calibration-profile", "defensively copies constructor data", () => {
    const data = createCalibrationData();

    const calibrationProfile = new CalibrationProfile(data, MACHINE_PROFILE);

    data.domain.cadence.min = 999;
    data.model.coefficients[0] = 999;
    data.validation.observedCalories = 999;

    assertEqual(calibrationProfile.domain.cadence.min, 40);
    assertEqual(calibrationProfile.model.coefficients[0], 0.0572);
    assertEqual(calibrationProfile.validation.observedCalories, 980);
});

test("calibration-profile", "returns defensive copies from object getters", () => {
    const calibrationProfile = new CalibrationProfile(createCalibrationData(), MACHINE_PROFILE);

    const context = calibrationProfile.context;
    const domain = calibrationProfile.domain;
    const model = calibrationProfile.model;
    const validation = calibrationProfile.validation;

    context.test = true;
    domain.cadence.min = 999;
    model.coefficients[0] = 999;
    validation.observedCalories = 999;

    assertDeepEqual(calibrationProfile.context, {});
    assertEqual(calibrationProfile.domain.cadence.min, 40);
    assertEqual(calibrationProfile.model.coefficients[0], 0.0572);
    assertEqual(calibrationProfile.validation.observedCalories, 980);
});

test("calibration-profile", "rejects non-object calibration data", () => {
    assertThrows(
        () => new CalibrationProfile(undefined, MACHINE_PROFILE),
        "CalibrationProfile data must be an object.",
    );

    assertThrows(
        () => new CalibrationProfile([], MACHINE_PROFILE),
        "CalibrationProfile data must be an object.",
    );
});

test("calibration-profile", "rejects a missing calibration id", () => {
    const data = createCalibrationData();
    data.id = "";

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        "CalibrationProfile id must be a non-empty string.",
    );
});

test("calibration-profile", "rejects a missing calibration name", () => {
    const data = createCalibrationData();
    data.name = "   ";

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        "CalibrationProfile name must be a non-empty string.",
    );
});

test("calibration-profile", "rejects a missing machineProfileId", () => {
    const data = createCalibrationData();
    data.machineProfileId = "";

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        "CalibrationProfile machineProfileId must be a non-empty string.",
    );
});

test("calibration-profile", "requires a valid MachineProfile", () => {
    const data = createCalibrationData();

    assertThrows(
        () => new CalibrationProfile(data),
        "CalibrationProfile requires a valid MachineProfile.",
    );

    assertThrows(
        () => new CalibrationProfile(data, {}),
        "CalibrationProfile requires a valid MachineProfile.",
    );
});

test("calibration-profile", "rejects a mismatched MachineProfile", () => {
    const data = createCalibrationData();

    const otherMachineProfile = {
        id: "other-machine",

        getVariable(variableId) {
            return MACHINE_PROFILE.getVariable(variableId);
        },
    };

    assertThrows(
        () => new CalibrationProfile(data, otherMachineProfile),
        'CalibrationProfile references MachineProfile "true-elliptical-aquatic-center", but received "other-machine".',
    );
});

test("calibration-profile", "requires context to be an object", () => {
    const data = createCalibrationData();
    data.context = null;

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        "CalibrationProfile context must be an object.",
    );
});

test("calibration-profile", "requires domain to be an object", () => {
    const data = createCalibrationData();
    data.domain = [];

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        "CalibrationProfile domain must be an object.",
    );
});

test("calibration-profile", "rejects an unknown domain variable", () => {
    const data = createCalibrationData();

    data.domain.unknownVariable = {
        min: 1,
        max: 10,
    };

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        'CalibrationProfile domain contains unknown MachineProfile variable "unknownVariable".',
    );
});

test("calibration-profile", "requires each domain range to be an object", () => {
    const data = createCalibrationData();
    data.domain.cadence = null;

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        'CalibrationProfile domain for variable "cadence" must be an object.',
    );
});

test("calibration-profile", "requires a finite domain minimum", () => {
    const data = createCalibrationData();
    data.domain.cadence.min = Number.NaN;

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        'CalibrationProfile domain minimum for variable "cadence" must be finite.',
    );
});

test("calibration-profile", "requires a finite domain maximum", () => {
    const data = createCalibrationData();
    data.domain.cadence.max = Infinity;

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        'CalibrationProfile domain maximum for variable "cadence" must be finite.',
    );
});

test("calibration-profile", "rejects a domain minimum above its maximum", () => {
    const data = createCalibrationData();

    data.domain.cadence.min = 80;
    data.domain.cadence.max = 70;

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        'CalibrationProfile domain minimum for variable "cadence" cannot exceed its maximum.',
    );
});

test("calibration-profile", "requires model to be an object", () => {
    const data = createCalibrationData();
    data.model = null;

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        "CalibrationProfile model must be an object.",
    );
});

test("calibration-profile", "requires a model type", () => {
    const data = createCalibrationData();
    data.model.type = "";

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        "CalibrationProfile model type must be a non-empty string.",
    );
});

test("calibration-profile", "requires model input to be an object", () => {
    const data = createCalibrationData();
    data.model.input = null;

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        "CalibrationProfile model input must be an object.",
    );
});

test("calibration-profile", "requires a model input type", () => {
    const data = createCalibrationData();
    data.model.input.type = "";

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        "CalibrationProfile model input type must be a non-empty string.",
    );
});

test("calibration-profile", "requires model input variables", () => {
    const data = createCalibrationData();
    data.model.input.variables = [];

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        "CalibrationProfile model input variables must be a non-empty array.",
    );
});

test("calibration-profile", "requires model input variable IDs to be strings", () => {
    const data = createCalibrationData();
    data.model.input.variables = ["cadence", ""];

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        "CalibrationProfile model input variable must be a non-empty string.",
    );
});

test("calibration-profile", "rejects duplicate model input variables", () => {
    const data = createCalibrationData();
    data.model.input.variables = ["cadence", "cadence"];

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        'CalibrationProfile model input contains duplicate variable "cadence".',
    );
});

test("calibration-profile", "rejects unknown model input variables", () => {
    const data = createCalibrationData();
    data.model.input.variables = ["cadence", "unknownVariable"];

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        'CalibrationProfile model input contains unknown MachineProfile variable "unknownVariable".',
    );
});

test("calibration-profile", "requires model coefficients", () => {
    const data = createCalibrationData();
    data.model.coefficients = [];

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        "CalibrationProfile model coefficients must be a non-empty array.",
    );
});

test("calibration-profile", "requires finite model coefficients", () => {
    const data = createCalibrationData();
    data.model.coefficients[2] = Number.NaN;

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        "CalibrationProfile model coefficients must contain only finite numbers.",
    );
});

test("calibration-profile", "requires a model output unit", () => {
    const data = createCalibrationData();
    data.model.outputUnit = "";

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        "CalibrationProfile model outputUnit must be a non-empty string.",
    );
});

test("calibration-profile", "allows structurally valid unsupported model types", () => {
    const data = createCalibrationData();

    data.model.type = "future-model";
    data.model.input.type = "future-input";
    data.model.outputUnit = "future-unit";

    const calibrationProfile = new CalibrationProfile(data, MACHINE_PROFILE);

    assertEqual(calibrationProfile.model.type, "future-model");
    assertEqual(calibrationProfile.model.input.type, "future-input");
    assertEqual(calibrationProfile.model.outputUnit, "future-unit");
});

test("calibration-profile", "allows validation metadata to be omitted", () => {
    const data = createCalibrationData();
    delete data.validation;

    const calibrationProfile = new CalibrationProfile(data, MACHINE_PROFILE);

    assertEqual(calibrationProfile.validation, undefined);
});

test("calibration-profile", "requires validation metadata to be an object when provided", () => {
    const data = createCalibrationData();
    data.validation = [];

    assertThrows(
        () => new CalibrationProfile(data, MACHINE_PROFILE),
        "CalibrationProfile validation must be an object when provided.",
    );
});

test("calibration-profile", "allows an empty calibration domain", () => {
    const data = createCalibrationData();
    data.domain = {};

    const calibrationProfile = new CalibrationProfile(data, MACHINE_PROFILE);

    assertDeepEqual(calibrationProfile.domain, {});
});

test("calibration-profile", "returns a defensive copy of the full definition", () => {
    const definition = createCalibrationData();

    const calibrationProfile = new CalibrationProfile(definition, MACHINE_PROFILE);

    const returnedDefinition = calibrationProfile.getDefinition();

    assertDeepEqual(returnedDefinition, definition);

    returnedDefinition.name = "Changed";

    assertEqual(calibrationProfile.name, definition.name);
});
