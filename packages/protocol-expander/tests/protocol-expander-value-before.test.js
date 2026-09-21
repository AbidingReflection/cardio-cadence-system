import {
    test,
    assertDeepEqual,
    assertThrows,
    assertEqual,
} from "/packages/js-testing/framework/test-framework.js";

import { ProtocolExpander } from "../protocol-expander.js";

import {
    createValueBeforeProtocol,
    createTranslatedSteppedProtocols,
} from "./protocol-expander-fixtures.js";

test(
    "protocol-expander-value-before",
    "returns values immediately before ordinary workout times",
    () => {
        const expander = new ProtocolExpander(createValueBeforeProtocol());

        assertDeepEqual(expander.valueBefore("cadence", 6000), 45);
        assertDeepEqual(expander.valueBefore("cadence", 16000), 65);
    },
);

test(
    "protocol-expander-value-before",
    "uses previous stepped target immediately before exact progression boundaries",
    () => {
        const expander = new ProtocolExpander(createValueBeforeProtocol());

        assertDeepEqual(expander.valueBefore("cadence", 4000), 40);
        assertDeepEqual(expander.valueAt("cadence", 4000), 45);

        assertDeepEqual(expander.valueBefore("cadence", 8000), 45);
        assertDeepEqual(expander.valueAt("cadence", 8000), 50);
    },
);

test(
    "protocol-expander-value-before",
    "uses previous block ownership immediately before exact block boundaries",
    () => {
        const expander = new ProtocolExpander(createValueBeforeProtocol());

        assertDeepEqual(expander.valueBefore("cadence", 12000), 50);
        assertDeepEqual(expander.valueAt("cadence", 12000), 60);
    },
);

test(
    "protocol-expander-value-before",
    "returns the final progression endpoint immediately before workout end",
    () => {
        const expander = new ProtocolExpander(createValueBeforeProtocol());

        assertDeepEqual(expander.valueBefore("cadence", expander.durationMs), 70);
        assertDeepEqual(expander.valueAt("cadence", expander.durationMs), undefined);
    },
);

test(
    "protocol-expander-value-before",
    "returns undefined for valueBefore() outside its valid workout side",
    () => {
        const expander = new ProtocolExpander(createValueBeforeProtocol());

        assertDeepEqual(expander.valueBefore("cadence", -1), undefined);
        assertDeepEqual(expander.valueBefore("cadence", 0), undefined);
        assertDeepEqual(expander.valueBefore("cadence", expander.durationMs + 1), undefined);
    },
);

test(
    "protocol-expander-value-before",
    "returns undefined for valueBefore() on an unknown variable",
    () => {
        const expander = new ProtocolExpander(createValueBeforeProtocol());

        assertDeepEqual(expander.valueBefore("unknown-variable", 4000), undefined);
    },
);

test(
    "protocol-expander-value-before",
    "returns undefined for valueBefore() on an empty protocol",
    () => {
        const expander = new ProtocolExpander({
            phases: [],
        });

        assertDeepEqual(expander.valueBefore("cadence", 1000), undefined);
    },
);

test("protocol-expander-value-before", "rejects invalid valueBefore() workout times", () => {
    const expander = new ProtocolExpander(createValueBeforeProtocol());

    assertThrows(() => expander.valueBefore("cadence", "1000"), /finite numbers/);
    assertThrows(() => expander.valueBefore("cadence", NaN), /finite numbers/);
    assertThrows(() => expander.valueBefore("cadence", Infinity), /finite numbers/);
});

test(
    "protocol-expander-value-before",
    "preserves stepped boundary semantics after absolute time translation",
    () => {
        const { baseProtocol, shiftedProtocol, baseStart, baseEnd, shiftedStart, shiftedEnd } =
            createTranslatedSteppedProtocols();

        const baseExpander = new ProtocolExpander(baseProtocol);
        const shiftedExpander = new ProtocolExpander(shiftedProtocol);

        const baseBoundaries = baseExpander
            .boundariesBetween("resistance", baseStart, baseEnd)
            .filter((timeMs) => timeMs > baseStart);

        const shiftedBoundaries = shiftedExpander
            .boundariesBetween("resistance", shiftedStart, shiftedEnd)
            .filter((timeMs) => timeMs > shiftedStart);

        assertEqual(baseBoundaries.length, shiftedBoundaries.length);

        for (let index = 0; index < baseBoundaries.length; index += 1) {
            const baseTime = baseBoundaries[index];
            const shiftedTime = shiftedBoundaries[index];

            const baseRelativeTime = baseTime - baseStart;
            const shiftedRelativeTime = shiftedTime - shiftedStart;

            assertEqual(Math.abs(baseRelativeTime - shiftedRelativeTime) < 1e-6, true);

            assertEqual(
                baseExpander.valueBefore("resistance", baseTime),
                shiftedExpander.valueBefore("resistance", shiftedTime),
            );

            assertEqual(
                baseExpander.valueAt("resistance", baseTime),
                shiftedExpander.valueAt("resistance", shiftedTime),
            );
        }
    },
);
