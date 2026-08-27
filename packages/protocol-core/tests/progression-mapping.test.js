import {
    test,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import { createProgressionMapping } from "../progression-mapping.js";

test("progression-mapping", "maps steady progression across the full fraction range", () => {
    const mapping = createProgressionMapping({
        type: "steady",
        start: 60,
    });

    assertDeepEqual(mapping.valueAtFraction(0), 60);
    assertDeepEqual(mapping.valueAtFraction(0.25), 60);
    assertDeepEqual(mapping.valueAtFraction(0.5), 60);
    assertDeepEqual(mapping.valueAtFraction(1), 60);
});

test("progression-mapping", "maps linear progression across the full fraction range", () => {
    const mapping = createProgressionMapping({
        type: "linear",
        start: 40,
        end: 70,
    });

    assertDeepEqual(mapping.valueAtFraction(0), 40);
    assertDeepEqual(mapping.valueAtFraction(0.25), 47.5);
    assertDeepEqual(mapping.valueAtFraction(0.5), 55);
    assertDeepEqual(mapping.valueAtFraction(0.75), 62.5);
    assertDeepEqual(mapping.valueAtFraction(1), 70);
});

test("progression-mapping", "maps stepped progression using proportional dwell", () => {
    const mapping = createProgressionMapping({
        type: "stepped",
        start: 40,
        end: 67,
        step: 5,
    });

    assertDeepEqual(mapping.valueAtFraction(0), 40);
    assertDeepEqual(mapping.valueAtFraction(0.1), 40);
    assertDeepEqual(mapping.valueAtFraction(0.2), 45);
    assertDeepEqual(mapping.valueAtFraction(0.4), 50);
    assertDeepEqual(mapping.valueAtFraction(0.8), 65);
    assertDeepEqual(mapping.valueAtFraction(0.99), 67);
    assertDeepEqual(mapping.valueAtFraction(1), 67);
});

test("progression-mapping", "returns interior stepped boundary fractions", () => {
    const mapping = createProgressionMapping({
        type: "stepped",
        start: 40,
        end: 67,
        step: 5,
    });

    assertDeepEqual(mapping.getBoundaryFractions(), [
        1 / 6.4,
        2 / 6.4,
        3 / 6.4,
        4 / 6.4,
        5 / 6.4,
        6 / 6.4,
    ]);
});

test("progression-mapping", "uses exact boundary ownership for stepped progression", () => {
    const mapping = createProgressionMapping({
        type: "stepped",
        start: 40,
        end: 55,
        step: 5,
    });

    assertDeepEqual(mapping.valueAtFraction(0), 40);

    assertDeepEqual(mapping.valueAtFraction(0.249999), 40);
    assertDeepEqual(mapping.valueAtFraction(0.25), 45);

    assertDeepEqual(mapping.valueAtFraction(0.499999), 45);
    assertDeepEqual(mapping.valueAtFraction(0.5), 50);

    assertDeepEqual(mapping.valueAtFraction(0.749999), 50);
    assertDeepEqual(mapping.valueAtFraction(0.75), 55);

    assertDeepEqual(mapping.valueAtFraction(1), 55);
});

test("progression-mapping", "maps descending stepped progression", () => {
    const mapping = createProgressionMapping({
        type: "stepped",
        start: 67,
        end: 40,
        step: 5,
    });

    assertDeepEqual(mapping.valueAtFraction(0), 67);
    assertDeepEqual(mapping.valueAtFraction(0.2), 62);
    assertDeepEqual(mapping.valueAtFraction(0.4), 57);
    assertDeepEqual(mapping.valueAtFraction(0.8), 42);
    assertDeepEqual(mapping.valueAtFraction(0.99), 40);
    assertDeepEqual(mapping.valueAtFraction(1), 40);
});

test("progression-mapping", "maps a flat stepped progression as a constant value", () => {
    const mapping = createProgressionMapping({
        type: "stepped",
        start: 40,
        end: 40,
        step: 5,
    });

    assertDeepEqual(mapping.valueAtFraction(0), 40);
    assertDeepEqual(mapping.valueAtFraction(0.5), 40);
    assertDeepEqual(mapping.valueAtFraction(1), 40);
    assertDeepEqual(mapping.getBoundaryFractions(), []);
});

test(
    "progression-mapping",
    "maps a stepped progression whose step exceeds the total distance",
    () => {
        const mapping = createProgressionMapping({
            type: "stepped",
            start: 40,
            end: 42,
            step: 5,
        });

        assertDeepEqual(mapping.getBoundaryFractions(), [1 / 1.4]);

        assertDeepEqual(mapping.valueAtFraction(0), 40);
        assertDeepEqual(mapping.valueAtFraction(0.7), 40);
        assertDeepEqual(mapping.valueAtFraction(1 / 1.4), 42);
        assertDeepEqual(mapping.valueAtFraction(1), 42);
    },
);

test("progression-mapping", "returns no interior boundaries for steady progression", () => {
    const mapping = createProgressionMapping({
        type: "steady",
        start: 60,
    });

    assertDeepEqual(mapping.getBoundaryFractions(), []);
});

test("progression-mapping", "returns no interior boundaries for linear progression", () => {
    const mapping = createProgressionMapping({
        type: "linear",
        start: 40,
        end: 70,
    });

    assertDeepEqual(mapping.getBoundaryFractions(), []);
});

test("progression-mapping", "returns undefined for fractions outside the normalized range", () => {
    const mapping = createProgressionMapping({
        type: "linear",
        start: 40,
        end: 70,
    });

    assertDeepEqual(mapping.valueAtFraction(-0.001), undefined);
    assertDeepEqual(mapping.valueAtFraction(1.001), undefined);
});

test("progression-mapping", "rejects invalid fraction values", () => {
    const mapping = createProgressionMapping({
        type: "steady",
        start: 60,
    });

    assertThrows(() => mapping.valueAtFraction("0.5"), /finite number/);

    assertThrows(() => mapping.valueAtFraction(NaN), /finite number/);

    assertThrows(() => mapping.valueAtFraction(Infinity), /finite number/);
});

test("progression-mapping", "protects returned boundary fractions from mutation", () => {
    const mapping = createProgressionMapping({
        type: "stepped",
        start: 40,
        end: 55,
        step: 5,
    });

    const boundaries = mapping.getBoundaryFractions();
    boundaries[0] = 999;
    boundaries.push(999);

    assertDeepEqual(mapping.getBoundaryFractions(), [0.25, 0.5, 0.75]);
});

test("progression-mapping", "rejects an unknown progression type", () => {
    assertThrows(
        () =>
            createProgressionMapping({
                type: "mystery",
                start: 40,
            }),
        /Unknown progression type/,
    );
});
