import {
    test,
    assert,
    assertEqual,
    assertDeepEqual,
} from "/packages/js-testing/framework/test-framework.js";

import {
    evaluateBlockMachineCompatibility,
    evaluateProtocolMachineCompatibility,
} from "../machine-compatibility.js";

const MACHINE_PROFILE = {
    getVariable(variableId) {
        const variables = {
            cadence: {
                progressionTypes: ["steady", "linear", "stepped"],
            },

            resistance: {
                min: 1,
                max: 20,
                increment: 1,
                progressionTypes: ["steady", "stepped"],
            },
        };

        return variables[variableId];
    },
};

/** Creates a compatible protocol block for use as a test fixture. */
function createBlock() {
    return {
        id: "block-1",
        name: "Block 1",
        durationSeconds: 300,
        variables: {
            cadence: {
                type: "steady",
                start: 60,
            },

            resistance: {
                type: "stepped",
                start: 10,
                end: 14,
                step: 1,
            },
        },
    };
}

/** Creates a compatible protocol for use as a test fixture. */
function createProtocol() {
    return {
        activityTypeId: "elliptical",
        machineProfileId: "machine-1",
        phases: [
            {
                id: "phase-1",
                name: "Phase 1",
                blocks: [createBlock()],
            },
        ],
    };
}

test("machine-compatibility", "accepts a compatible block", () => {
    const result = evaluateBlockMachineCompatibility(createBlock(), MACHINE_PROFILE);

    assertEqual(result.isCompatible, true);
    assertDeepEqual(result.issues, []);
});

test("machine-compatibility", "accepts a compatible protocol", () => {
    const result = evaluateProtocolMachineCompatibility(createProtocol(), MACHINE_PROFILE);

    assertEqual(result.isCompatible, true);
    assertDeepEqual(result.issues, []);
});

test("machine-compatibility", "supports evaluation without a MachineProfile", () => {
    const result = evaluateProtocolMachineCompatibility(createProtocol());

    assertEqual(result.isCompatible, true);
    assertDeepEqual(result.issues, []);
});

test("machine-compatibility", "reports an unsupported progression type", () => {
    const block = createBlock();

    block.variables.resistance = {
        type: "linear",
        start: 10,
        end: 14,
    };

    const result = evaluateBlockMachineCompatibility(block, MACHINE_PROFILE);

    assertEqual(result.isCompatible, false);
    assertDeepEqual(result.issues, [
        {
            type: "unsupported-progression",
            blockId: "block-1",
            variableId: "resistance",
            progressionType: "linear",
        },
    ]);
});

test("machine-compatibility", "reports a target below machine minimum", () => {
    const block = createBlock();

    block.variables.resistance.start = 0;

    const result = evaluateBlockMachineCompatibility(block, MACHINE_PROFILE);

    assertDeepEqual(result.issues, [
        {
            type: "target-below-minimum",
            blockId: "block-1",
            variableId: "resistance",
            field: "start",
            value: 0,
            minimum: 1,
        },
    ]);
});

test("machine-compatibility", "reports a target above machine maximum", () => {
    const block = createBlock();

    block.variables.resistance.end = 22;

    const result = evaluateBlockMachineCompatibility(block, MACHINE_PROFILE);

    assertDeepEqual(result.issues, [
        {
            type: "target-above-maximum",
            blockId: "block-1",
            variableId: "resistance",
            field: "end",
            value: 22,
            maximum: 20,
        },
    ]);
});

test("machine-compatibility", "reports a target not aligned to machine increment", () => {
    const block = createBlock();

    block.variables.resistance.start = 10.5;

    const result = evaluateBlockMachineCompatibility(block, MACHINE_PROFILE);

    assertDeepEqual(result.issues, [
        {
            type: "increment-mismatch",
            blockId: "block-1",
            variableId: "resistance",
            field: "start",
            value: 10.5,
            increment: 1,
            minimum: 1,
        },
    ]);
});

test("machine-compatibility", "supports decimal machine increments", () => {
    const machineProfile = {
        getVariable(variableId) {
            if (variableId === "cadence") {
                return {
                    progressionTypes: ["steady", "linear", "stepped"],
                };
            }

            return {
                min: 0.5,
                max: 10,
                increment: 0.1,
                progressionTypes: ["steady", "stepped"],
            };
        },
    };

    const block = createBlock();

    block.variables.resistance.start = 1.2;
    block.variables.resistance.end = 3.7;

    const result = evaluateBlockMachineCompatibility(block, machineProfile);

    assertEqual(result.isCompatible, true);
    assertDeepEqual(result.issues, []);
});

test("machine-compatibility", "reports multiple issues for one target", () => {
    const block = createBlock();

    block.variables.resistance.end = 20.5;

    const result = evaluateBlockMachineCompatibility(block, MACHINE_PROFILE);

    assertEqual(result.isCompatible, false);
    assertDeepEqual(result.issues, [
        {
            type: "target-above-maximum",
            blockId: "block-1",
            variableId: "resistance",
            field: "end",
            value: 20.5,
            maximum: 20,
        },
        {
            type: "increment-mismatch",
            blockId: "block-1",
            variableId: "resistance",
            field: "end",
            value: 20.5,
            increment: 1,
            minimum: 1,
        },
    ]);
});

test("machine-compatibility", "adds phase ID to protocol compatibility issues", () => {
    const protocol = createProtocol();

    protocol.phases[0].blocks[0].variables.resistance.end = 22;

    const result = evaluateProtocolMachineCompatibility(protocol, MACHINE_PROFILE);

    assertDeepEqual(result.issues, [
        {
            type: "target-above-maximum",
            blockId: "block-1",
            variableId: "resistance",
            field: "end",
            value: 22,
            maximum: 20,
            phaseId: "phase-1",
        },
    ]);
});

test("machine-compatibility", "aggregates issues across phases and blocks", () => {
    const protocol = createProtocol();

    protocol.phases.push({
        id: "phase-2",
        name: "Phase 2",
        blocks: [
            {
                ...createBlock(),
                id: "block-2",
            },
        ],
    });

    protocol.phases[0].blocks[0].variables.resistance.start = 0;
    protocol.phases[1].blocks[0].variables.resistance.end = 22;

    const result = evaluateProtocolMachineCompatibility(protocol, MACHINE_PROFILE);

    assertEqual(result.isCompatible, false);
    assertEqual(result.issues.length, 2);

    assertDeepEqual(result.issues, [
        {
            type: "target-below-minimum",
            blockId: "block-1",
            variableId: "resistance",
            field: "start",
            value: 0,
            minimum: 1,
            phaseId: "phase-1",
        },
        {
            type: "target-above-maximum",
            blockId: "block-2",
            variableId: "resistance",
            field: "end",
            value: 22,
            maximum: 20,
            phaseId: "phase-2",
        },
    ]);
});
