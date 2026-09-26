import { assertDeepEqual, assertThrows, test } from "../../js-testing/framework/test-framework.js";

import { getLinearValueDomain } from "../graph-domain.js";

test("graph-domain", "derives a padded domain from observed values", () => {
    assertDeepEqual(getLinearValueDomain([40, 45, 75]), {
        min: 38.25,
        max: 76.75,
    });
});

test("graph-domain", "ignores undefined values", () => {
    assertDeepEqual(getLinearValueDomain([10, undefined, 20]), {
        min: 9.5,
        max: 20.5,
    });
});

test("graph-domain", "handles negative values", () => {
    assertDeepEqual(getLinearValueDomain([-20, -10]), {
        min: -20.5,
        max: -9.5,
    });
});

test("graph-domain", "handles values crossing zero", () => {
    assertDeepEqual(getLinearValueDomain([-10, 10]), {
        min: -11,
        max: 11,
    });
});

test("graph-domain", "expands a constant-valued series", () => {
    assertDeepEqual(getLinearValueDomain([50, 50, 50]), {
        min: 49.5,
        max: 50.5,
    });
});

test("graph-domain", "rejects a series with no defined values", () => {
    assertThrows(() => {
        getLinearValueDomain([]);
    }, "Graph value domain requires at least one defined value.");

    assertThrows(() => {
        getLinearValueDomain([undefined, undefined]);
    }, "Graph value domain requires at least one defined value.");
});

test("graph-domain", "rejects non-finite defined values", () => {
    assertThrows(() => {
        getLinearValueDomain([10, Number.NaN, 20]);
    }, "Graph value domain values must be finite numbers or undefined.");

    assertThrows(() => {
        getLinearValueDomain([10, Number.POSITIVE_INFINITY, 20]);
    }, "Graph value domain values must be finite numbers or undefined.");
});
