import {
    test,
    assert,
    assertEqual,
    assertDeepEqual,
} from "/packages/js-testing/framework/test-framework.js";

import {
    getProgressionDefinition,
    getProgressionTypes,
    isProgressionType,
} from "../progression-types.js";


test("progression-types", "recognizes all supported progression types", () => {
    assert(isProgressionType("steady"));
    assert(isProgressionType("linear"));
    assert(isProgressionType("stepped"));
});


test("progression-types", "rejects unknown progression types", () => {
    assertEqual(
        isProgressionType("banana"),
                false
    );
});


test("progression-types", "returns all supported progression type IDs", () => {
    assertDeepEqual(
        getProgressionTypes(),
                    [
                        "steady",
                    "linear",
                    "stepped",
                    ]
    );
});


test("progression-types", "returns the steady progression definition", () => {
    assertDeepEqual(
        getProgressionDefinition("steady"),
                    {
                        requiredFields: [
                            "start",
                        ],
                        allowedFields: [
                            "type",
                            "start",
                        ],
                    }
    );
});


test("progression-types", "returns the linear progression definition", () => {
    assertDeepEqual(
        getProgressionDefinition("linear"),
                    {
                        requiredFields: [
                            "start",
                            "end",
                        ],
                        allowedFields: [
                            "type",
                            "start",
                            "end",
                        ],
                    }
    );
});


test("progression-types", "returns the stepped progression definition", () => {
    assertDeepEqual(
        getProgressionDefinition("stepped"),
                    {
                        requiredFields: [
                            "start",
                            "end",
                            "stepIntervalSeconds",
                        ],
                        allowedFields: [
                            "type",
                            "start",
                            "end",
                            "stepIntervalSeconds",
                        ],
                    }
    );
});


test("progression-types", "returns undefined for an unknown progression type", () => {
    assertEqual(
        getProgressionDefinition("banana"),
                undefined
    );
});


test("progression-types", "protects progression definitions from mutation", () => {
    const definition = getProgressionDefinition("linear");

    assert(Object.isFrozen(definition));
    assert(Object.isFrozen(definition.requiredFields));
    assert(Object.isFrozen(definition.allowedFields));
});
