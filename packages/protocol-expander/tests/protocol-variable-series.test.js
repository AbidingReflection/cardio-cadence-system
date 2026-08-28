import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "../../js-testing/framework/test-framework.js";

import { ProtocolExpander } from "../protocol-expander.js";
import { ProtocolVariableSeries } from "../protocol-variable-series.js";

/** Creates a small stepped-cadence protocol for series tests. */
function createProtocol() {
    return {
        phases: [
            {
                id: "phase-1",
                blocks: [
                    {
                        id: "block-1",
                        durationSeconds: 12,
                        variables: {
                            cadence: {
                                type: "stepped",
                                start: 40,
                                end: 50,
                                step: 5,
                            },
                        },
                    },
                ],
            },
        ],
    };
}

/** Creates the default cadence series used by the tests. */
function createCadenceSeries() {
    const expander = new ProtocolExpander(createProtocol());

    return new ProtocolVariableSeries(expander, "cadence", {
        id: "cadence",
        label: "Cadence",
        unit: "RPM",
    });
}

test("protocol-variable-series", "exposes series metadata", () => {
    const series = createCadenceSeries();

    assertEqual(series.id, "cadence");
    assertEqual(series.label, "Cadence");
    assertEqual(series.unit, "RPM");
});

test("protocol-variable-series", "defaults missing unit to null", () => {
    const expander = new ProtocolExpander(createProtocol());

    const series = new ProtocolVariableSeries(expander, "cadence", {
        id: "cadence",
        label: "Cadence",
    });

    assertEqual(series.unit, null);
});

test("protocol-variable-series", "returns bound variable values", () => {
    const series = createCadenceSeries();

    assertEqual(series.valueAt(0), 40);
    assertEqual(series.valueAt(3999), 40);
    assertEqual(series.valueAt(4000), 45);
    assertEqual(series.valueAt(8000), 50);
});

test("protocol-variable-series", "returns exact left-side values", () => {
    const series = createCadenceSeries();

    assertEqual(series.valueBefore(4000), 40);
    assertEqual(series.valueBefore(8000), 45);
    assertEqual(series.valueBefore(12000), 50);
});

test("protocol-variable-series", "returns bound variable boundaries", () => {
    const series = createCadenceSeries();

    assertDeepEqual(series.boundariesBetween(0, 12000), [4000, 8000]);
});

test("protocol-variable-series", "preserves unknown variable behavior", () => {
    const expander = new ProtocolExpander(createProtocol());

    const series = new ProtocolVariableSeries(expander, "resistance", {
        id: "resistance",
        label: "Resistance",
        unit: "level",
    });

    assertEqual(series.valueAt(4000), undefined);
    assertEqual(series.valueBefore(4000), undefined);
    assertDeepEqual(series.boundariesBetween(0, 12000), []);
});

test("protocol-variable-series", "preserves invalid time errors", () => {
    const series = createCadenceSeries();

    assertThrows(() => series.valueAt("1000"), /finite numbers/);
    assertThrows(() => series.valueBefore(NaN), /finite numbers/);
    assertThrows(() => series.boundariesBetween(0, Infinity), /finite numbers/);
});
