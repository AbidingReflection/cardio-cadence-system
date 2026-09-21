import {
    test,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import { ProtocolExpander } from "../protocol-expander.js";

import { createBoundaryProtocol } from "./protocol-expander-fixtures.js";

test("protocol-expander-boundaries", "returns structural and progression boundaries", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(
        expander.boundariesBetween("cadence", 0, 300_000),
        [100_000, 125_000, 150_000, 175_000, 200_000],
    );
});

test(
    "protocol-expander-boundaries",
    "does not include arbitrary query endpoints as boundaries",
    () => {
        const expander = new ProtocolExpander(createBoundaryProtocol());

        assertDeepEqual(
            expander.boundariesBetween("cadence", 110_000, 190_000),
            [125_000, 150_000, 175_000],
        );
    },
);

test("protocol-expander-boundaries", "uses half-open range semantics for boundary queries", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.boundariesBetween("cadence", 125_000, 175_000), [125_000, 150_000]);
});

test(
    "protocol-expander-boundaries",
    "includes block boundaries even when mappings are continuous",
    () => {
        const expander = new ProtocolExpander({
            phases: [
                {
                    id: "phase-a",
                    blocks: [
                        {
                            id: "block-a",
                            durationSeconds: 100,
                            variables: {
                                cadence: {
                                    type: "steady",
                                    start: 60,
                                },
                            },
                        },
                        {
                            id: "block-b",
                            durationSeconds: 100,
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
        });

        assertDeepEqual(expander.boundariesBetween("cadence", 0, 200_000), [100_000]);
    },
);

test(
    "protocol-expander-boundaries",
    "returns no internal boundaries for steady and linear mappings",
    () => {
        const expander = new ProtocolExpander(createBoundaryProtocol());

        assertDeepEqual(expander.boundariesBetween("cadence", 0, 100_000), []);

        assertDeepEqual(expander.boundariesBetween("cadence", 200_001, 300_000), []);
    },
);

test(
    "protocol-expander-boundaries",
    "returns an empty boundary list for an unknown variable",
    () => {
        const expander = new ProtocolExpander(createBoundaryProtocol());

        assertDeepEqual(expander.boundariesBetween("missing-variable", 0, 300_000), []);
    },
);

test("protocol-expander-boundaries", "returns an empty boundary list for an empty interval", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.boundariesBetween("cadence", 150_000, 150_000), []);
});

test(
    "protocol-expander-boundaries",
    "returns an empty boundary list when no boundaries intersect",
    () => {
        const expander = new ProtocolExpander(createBoundaryProtocol());

        assertDeepEqual(expander.boundariesBetween("cadence", 10_000, 20_000), []);
    },
);

test("protocol-expander-boundaries", "rejects reversed boundary query ranges", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertThrows(
        () => expander.boundariesBetween("cadence", 200_000, 100_000),
        /must not be greater/,
    );
});

test("protocol-expander-boundaries", "rejects invalid boundary query time values", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertThrows(() => expander.boundariesBetween("cadence", "0", 100_000), /finite number/);

    assertThrows(() => expander.boundariesBetween("cadence", 0, NaN), /finite number/);

    assertThrows(() => expander.boundariesBetween("cadence", 0, Infinity), /finite number/);
});

test("protocol-expander-boundaries", "returns the next progression boundary after a time", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.nextBoundaryAfter("cadence", 110_000), 125_000);
});

test("protocol-expander-boundaries", "returns the next block boundary after a time", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.nextBoundaryAfter("cadence", 90_000), 100_000);
});

test("protocol-expander-boundaries", "skips a boundary at the exact requested time", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.nextBoundaryAfter("cadence", 125_000), 150_000);
});

test("protocol-expander-boundaries", "returns the first boundary after a negative time", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.nextBoundaryAfter("cadence", -1), 100_000);
});

test("protocol-expander-boundaries", "returns undefined when no later boundary exists", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.nextBoundaryAfter("cadence", 200_000), undefined);

    assertDeepEqual(expander.nextBoundaryAfter("cadence", expander.durationMs), undefined);
});

test("protocol-expander-boundaries", "returns undefined for an unknown variable boundary", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertDeepEqual(expander.nextBoundaryAfter("missing-variable", 0), undefined);
});

test("protocol-expander-boundaries", "rejects invalid next-boundary time values", () => {
    const expander = new ProtocolExpander(createBoundaryProtocol());

    assertThrows(() => expander.nextBoundaryAfter("cadence", "1000"), /finite number/);

    assertThrows(() => expander.nextBoundaryAfter("cadence", NaN), /finite number/);

    assertThrows(() => expander.nextBoundaryAfter("cadence", Infinity), /finite number/);
});
