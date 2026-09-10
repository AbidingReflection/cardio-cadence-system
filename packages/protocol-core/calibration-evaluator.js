/**
 * Evaluates validated calibration models against supplied protocol-variable values.
 */

/** Evaluates a supported calibration profile for the supplied variable values. */
export function evaluateCalibration(calibrationProfile, values) {
    return evaluateCalibrationModel(calibrationProfile.model, values);
}

/** Evaluates a supported calibration model for the supplied variable values. */
export function evaluateCalibrationModel(model, values) {
    if (values === null || typeof values !== "object" || Array.isArray(values)) {
        throw new TypeError("Calibration values must be an object.");
    }

    if (model.type !== "polynomial") {
        throw new Error(`Unsupported calibration model type: "${model.type}".`);
    }

    const input = evaluateModelInput(model.input, values);

    return evaluatePolynomial(model.coefficients, input);
}

/** Evaluates a supported calibration-model input definition. */
function evaluateModelInput(input, values) {
    if (input.type !== "product") {
        throw new Error(`Unsupported calibration input type: "${input.type}".`);
    }

    let product = 1;

    for (const variableId of input.variables) {
        const value = values[variableId];

        if (!Number.isFinite(value)) {
            throw new TypeError(`Calibration input "${variableId}" must be a finite number.`);
        }

        product *= value;
    }

    return product;
}

/** Evaluates ascending-power polynomial coefficients using Horner's method. */
function evaluatePolynomial(coefficients, input) {
    let result = 0;

    for (let index = coefficients.length - 1; index >= 0; index -= 1) {
        result = result * input + coefficients[index];
    }

    return result;
}
