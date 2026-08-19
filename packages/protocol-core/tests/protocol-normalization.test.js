import {
    test,
    assertDeepEqual,
} from "/packages/js-testing/test-framework.js";

import {
    normalizeProtocol,
} from "../protocol-normalization.js";


/** Creates a protocol containing all supported progression types. */
function createProtocol() {
    return {
        activityTypeId: "treadmill",
        machineProfileId: "test-treadmill",
        metadata: {
            source: "test",
        },
        phases: [
            {
                id: "phase-1",
                name: "Main Phase",
                blocks: [
                    {
                        id: "block-1",
                        name: "Main Block",
                        durationSeconds: 300,
                        variables: {
                            speed: {
                                type: "steady",
                                start: 4,
                                end: 8,
                                stepIntervalSeconds: 60,
                            },
                            incline: {
                                type: "linear",
                                start: 0,
                                end: 5,
                                stepIntervalSeconds: 30,
                            },
                            resistance: {
                                type: "stepped",
                                start: 2,
                                end: 8,
                                stepIntervalSeconds: 60,
                            },
                        },
                    },
                ],
            },
        ],
    };
}


test("protocol-normalization", "normalizes steady progressions", () => {
    const protocol = normalizeProtocol(createProtocol());

    assertDeepEqual(
        protocol.phases[0].blocks[0].variables.speed,
        {
            type: "steady",
            start: 4,
        }
    );
});


test("protocol-normalization", "normalizes linear progressions", () => {
    const protocol = normalizeProtocol(createProtocol());

    assertDeepEqual(
        protocol.phases[0].blocks[0].variables.incline,
        {
            type: "linear",
            start: 0,
            end: 5,
        }
    );
});


test("protocol-normalization", "preserves stepped progression fields", () => {
    const protocol = normalizeProtocol(createProtocol());

    assertDeepEqual(
        protocol.phases[0].blocks[0].variables.resistance,
        {
            type: "stepped",
            start: 2,
            end: 8,
            stepIntervalSeconds: 60,
        }
    );
});


test("protocol-normalization", "preserves unknown progression types", () => {
    const protocol = createProtocol();

    protocol.phases[0].blocks[0].variables.speed = {
        type: "future-type",
     start: 4,
     customField: 123,
    };

    const normalized = normalizeProtocol(protocol);

    assertDeepEqual(
        normalized.phases[0].blocks[0].variables.speed,
        {
            type: "future-type",
            start: 4,
            customField: 123,
        }
    );
});


test("protocol-normalization", "does not mutate the source protocol", () => {
    const protocol = createProtocol();
    const original = structuredClone(protocol);

    normalizeProtocol(protocol);

    assertDeepEqual(
        protocol,
        original
    );
});


test("protocol-normalization", "returns independent nested objects", () => {
    const source = createProtocol();
    const normalized = normalizeProtocol(source);

    normalized.phases[0].name = "Changed";
    normalized.phases[0].blocks[0].name = "Changed";
    normalized.phases[0].blocks[0].variables.speed.start = 99;

    assertDeepEqual(
        source,
        createProtocol()
    );
});


test("protocol-normalization", "preserves unrelated protocol fields", () => {
    const normalized = normalizeProtocol(createProtocol());

    assertDeepEqual(
        normalized.metadata,
        {
            source: "test",
        }
    );
});
