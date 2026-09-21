import {
    test,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import { ProtocolExpander } from "../protocol-expander.js";

import { createValueProtocol } from "./protocol-expander-fixtures.js";

test("protocol-expander-values", "returns steady progression values at workout times", () => {
    const expander = new ProtocolExpander(createValueProtocol());

    assertDeepEqual(expander.valueAt("cadence", 0), 60);
    assertDeepEqual(expander.valueAt("cadence", 50_000), 60);
    assertDeepEqual(expander.valueAt("cadence", 99_999), 60);
});

test("protocol-expander-values", "returns linear progression values at workout times", () => {
    const expander = new ProtocolExpander(createValueProtocol());

    assertDeepEqual(expander.valueAt("cadence", 100_000), 60);
    assertDeepEqual(expander.valueAt("cadence", 125_000), 65);
    assertDeepEqual(expander.valueAt("cadence", 150_000), 70);
    assertDeepEqual(expander.valueAt("cadence", 175_000), 75);
});

test("protocol-expander-values", "returns stepped progression values at workout times", () => {
    const expander = new ProtocolExpander(createValueProtocol());

    assertDeepEqual(expander.valueAt("cadence", 200_000), 40);
    assertDeepEqual(expander.valueAt("cadence", 224_999), 40);
    assertDeepEqual(expander.valueAt("cadence", 225_000), 45);
    assertDeepEqual(expander.valueAt("cadence", 249_999), 45);
    assertDeepEqual(expander.valueAt("cadence", 250_000), 50);
    assertDeepEqual(expander.valueAt("cadence", 274_999), 50);
    assertDeepEqual(expander.valueAt("cadence", 275_000), 55);
    assertDeepEqual(expander.valueAt("cadence", 299_999), 55);
});

test("protocol-expander-values", "uses following block ownership at exact block boundaries", () => {
    const expander = new ProtocolExpander(createValueProtocol());

    assertDeepEqual(expander.valueAt("cadence", 99_999), 60);

    assertDeepEqual(expander.valueAt("cadence", 100_000), 60);

    assertDeepEqual(expander.valueAt("cadence", 200_000), 40);
});

test("protocol-expander-values", "returns undefined outside the workout time range", () => {
    const expander = new ProtocolExpander(createValueProtocol());

    assertDeepEqual(expander.valueAt("cadence", -1), undefined);
    assertDeepEqual(expander.valueAt("cadence", 300_000), undefined);
    assertDeepEqual(expander.valueAt("cadence", 300_001), undefined);
});

test("protocol-expander-values", "returns undefined for an unknown variable ID", () => {
    const expander = new ProtocolExpander(createValueProtocol());

    assertDeepEqual(expander.valueAt("missing-variable", 50_000), undefined);
});

test("protocol-expander-values", "returns undefined for valueAt() on an empty protocol", () => {
    const expander = new ProtocolExpander({
        phases: [],
    });

    assertDeepEqual(expander.valueAt("cadence", 0), undefined);
});

test("protocol-expander-values", "rejects invalid workout time values", () => {
    const expander = new ProtocolExpander(createValueProtocol());

    assertThrows(() => expander.valueAt("cadence", "1000"), /finite number/);

    assertThrows(() => expander.valueAt("cadence", NaN), /finite number/);

    assertThrows(() => expander.valueAt("cadence", Infinity), /finite number/);
});
