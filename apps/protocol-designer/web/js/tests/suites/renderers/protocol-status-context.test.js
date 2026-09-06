/**
 * Verifies renderer-friendly protocol status aggregation.
 */

import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { buildProtocolStatusContext } from "../../../renderers/protocol/protocol-status-context.js";

function createMachineProfile({
    cadenceMin = 40,
    cadenceMax = 80,
    cadenceIncrement = 1,
    cadenceProgressionTypes = ["steady", "linear", "stepped"],
    resistanceMin = 1,
    resistanceMax = 20,
    resistanceIncrement = 1,
    resistanceProgressionTypes = ["steady", "stepped"],
} = {}) {
    const variables = new Map([
        [
            "cadence",
            {
                min: cadenceMin,
                max: cadenceMax,
                increment: cadenceIncrement,
                progressionTypes: cadenceProgressionTypes,
            },
        ],
        [
            "resistance",
            {
                min: resistanceMin,
                max: resistanceMax,
                increment: resistanceIncrement,
                progressionTypes: resistanceProgressionTypes,
            },
        ],
    ]);

    return {
        getVariable(variableId) {
            return variables.get(variableId);
        },
    };
}

function createProtocol(blocks) {
    return {
        phases: [
            {
                id: "phase-1",
                blocks,
            },
        ],
    };
}

function createBlock(id, variables) {
    return {
        id,
        variables,
    };
}

test("protocol-status-context", "returns empty status maps without a machine profile", () => {
    const protocol = createProtocol([
        createBlock("block-1", {
            cadence: {
                type: "steady",
                start: 50,
            },
            resistance: {
                type: "steady",
                start: 5,
            },
        }),
    ]);

    const statusContext = buildProtocolStatusContext(protocol);

    assertEqual(statusContext.phaseStatusById.size, 0);
    assertEqual(statusContext.blockStatusById.size, 0);
});

test(
    "protocol-status-context",
    "aggregates one machine issue into phase and block error status",
    () => {
        const protocol = createProtocol([
            createBlock("block-1", {
                cadence: {
                    type: "steady",
                    start: 90,
                },
                resistance: {
                    type: "steady",
                    start: 5,
                },
            }),
        ]);

        const machineProfile = createMachineProfile();

        const statusContext = buildProtocolStatusContext(protocol, machineProfile);

        assertDeepEqual(statusContext.phaseStatusById.get("phase-1"), {
            errorCount: 1,
            warningCount: 0,
        });

        assertDeepEqual(statusContext.blockStatusById.get("block-1"), {
            severity: "error",
            errorCount: 1,
            warningCount: 0,
        });
    },
);

test("protocol-status-context", "accumulates multiple machine issues within one block", () => {
    const protocol = createProtocol([
        createBlock("block-1", {
            cadence: {
                type: "steady",
                start: 90.5,
            },
            resistance: {
                type: "linear",
                start: 5,
                end: 25,
            },
        }),
    ]);

    const machineProfile = createMachineProfile({
        cadenceIncrement: 1,
        resistanceProgressionTypes: ["steady", "stepped"],
    });

    const statusContext = buildProtocolStatusContext(protocol, machineProfile);

    assertDeepEqual(statusContext.phaseStatusById.get("phase-1"), {
        errorCount: 4,
        warningCount: 0,
    });

    assertDeepEqual(statusContext.blockStatusById.get("block-1"), {
        severity: "error",
        errorCount: 4,
        warningCount: 0,
    });
});

test(
    "protocol-status-context",
    "rolls up machine issues from multiple blocks into one phase",
    () => {
        const protocol = createProtocol([
            createBlock("block-1", {
                cadence: {
                    type: "steady",
                    start: 90,
                },
                resistance: {
                    type: "steady",
                    start: 5,
                },
            }),
            createBlock("block-2", {
                cadence: {
                    type: "steady",
                    start: 60,
                },
                resistance: {
                    type: "steady",
                    start: 25,
                },
            }),
        ]);

        const machineProfile = createMachineProfile();

        const statusContext = buildProtocolStatusContext(protocol, machineProfile);

        assertDeepEqual(statusContext.phaseStatusById.get("phase-1"), {
            errorCount: 2,
            warningCount: 0,
        });

        assertDeepEqual(statusContext.blockStatusById.get("block-1"), {
            severity: "error",
            errorCount: 1,
            warningCount: 0,
        });

        assertDeepEqual(statusContext.blockStatusById.get("block-2"), {
            severity: "error",
            errorCount: 1,
            warningCount: 0,
        });
    },
);
