/** Shared protocol fixtures for ProtocolExpander tests. */

/** Creates a small protocol fixture for structural timeline tests. */
function createProtocol() {
    return {
        phases: [
            {
                id: "phase-a",
                blocks: [
                    {
                        id: "block-a",
                        durationSeconds: 300,
                    },
                    {
                        id: "block-b",
                        durationSeconds: 600,
                    },
                ],
            },
            {
                id: "phase-b",
                blocks: [
                    {
                        id: "block-c",
                        durationSeconds: 900,
                    },
                ],
            },
        ],
    };
}

/** Creates a protocol fixture for valueAt() tests. */
function createValueProtocol() {
    return {
        phases: [
            {
                id: "phase-a",
                blocks: [
                    {
                        id: "steady-block",
                        durationSeconds: 100,
                        variables: {
                            cadence: {
                                type: "steady",
                                start: 60,
                            },
                        },
                    },
                    {
                        id: "linear-block",
                        durationSeconds: 100,
                        variables: {
                            cadence: {
                                type: "linear",
                                start: 60,
                                end: 80,
                            },
                        },
                    },
                    {
                        id: "stepped-block",
                        durationSeconds: 100,
                        variables: {
                            cadence: {
                                type: "stepped",
                                start: 40,
                                end: 55,
                                step: 5,
                            },
                        },
                    },
                ],
            },
        ],
    };
}

/** Creates a protocol fixture for boundary query tests. */
function createBoundaryProtocol() {
    return {
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
                                type: "stepped",
                                start: 40,
                                end: 55,
                                step: 5,
                            },
                        },
                    },
                    {
                        id: "block-c",
                        durationSeconds: 100,
                        variables: {
                            cadence: {
                                type: "linear",
                                start: 55,
                                end: 75,
                            },
                        },
                    },
                ],
            },
        ],
    };
}

/** Creates a protocol fixture for left-side value and ordered-range tests. */
function createValueBeforeProtocol() {
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
            {
                id: "phase-empty",
                blocks: [],
            },
            {
                id: "phase-2",
                blocks: [
                    {
                        id: "block-2",
                        durationSeconds: 8,
                        variables: {
                            cadence: {
                                type: "linear",
                                start: 60,
                                end: 70,
                            },
                        },
                    },
                ],
            },
        ],
    };
}

/** Creates equivalent stepped protocols at zero and shifted absolute time. */
function createTranslatedSteppedProtocols() {
    const steppedBlock = {
        id: "stepped-block",
        durationSeconds: 900,
        variables: {
            resistance: {
                type: "stepped",
                start: 17,
                end: 1,
                step: 1,
            },
        },
    };

    const baseProtocol = {
        phases: [
            {
                id: "base-phase",
                blocks: [steppedBlock],
            },
        ],
    };

    const shiftedProtocol = {
        phases: [
            {
                id: "prefix-phase",
                blocks: [
                    {
                        id: "prefix-block",
                        durationSeconds: 3900,
                        variables: {
                            resistance: {
                                type: "steady",
                                target: 10,
                            },
                        },
                    },
                ],
            },
            {
                id: "shifted-phase",
                blocks: [
                    {
                        ...steppedBlock,
                        id: "shifted-stepped-block",
                    },
                ],
            },
        ],
    };

    return {
        baseProtocol,
        shiftedProtocol,
        baseStart: 0,
        baseEnd: 900_000,
        shiftedStart: 3_900_000,
        shiftedEnd: 4_800_000,
    };
}

export {
    createProtocol,
    createValueProtocol,
    createBoundaryProtocol,
    createValueBeforeProtocol,
    createTranslatedSteppedProtocols,
};
