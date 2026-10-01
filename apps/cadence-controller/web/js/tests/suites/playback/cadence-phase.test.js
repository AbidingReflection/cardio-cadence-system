import { test, assertEqual, assertThrows } from "/packages/js-testing/framework/test-framework.js";

import { ProtocolExpander } from "/packages/protocol-expander/protocol-expander.js";
import { CadencePhase } from "../../../playback/cadence-phase.js";

function createProtocol({
    durationSeconds = 60,
    progression = {
        type: "steady",
        start: 60,
    },
} = {}) {
    return {
        id: "test-protocol",
        name: "Test Protocol",
        activityTypeId: "elliptical",
        machineProfileId: null,
        calibrationProfileId: null,
        phases: [
            {
                id: "phase-1",
                name: "Phase 1",
                blocks: [
                    {
                        id: "block-1",
                        name: "Block 1",
                        durationSeconds,
                        variables: {
                            cadence: progression,
                        },
                    },
                ],
            },
        ],
    };
}

function createCadencePhase(protocol = createProtocol()) {
    const protocolExpander = new ProtocolExpander(protocol);

    return new CadencePhase(protocolExpander, "cadence");
}

function assertApproximatelyEqual(actual, expected, tolerance = 1e-6) {
    assertEqual(Math.abs(actual - expected) <= tolerance, true);
}

test("cadence-phase", "integrates steady cadence into accumulated cycles", () => {
    const cadencePhase = createCadencePhase();

    assertApproximatelyEqual(cadencePhase.cyclesBetween(0, 1000), 1);
    assertApproximatelyEqual(cadencePhase.cyclesBetween(0, 5000), 5);
});

test("cadence-phase", "integrates arbitrary steady cadence rates", () => {
    const cadencePhase = createCadencePhase(
        createProtocol({
            progression: {
                type: "steady",
                start: 50,
            },
        }),
    );

    assertApproximatelyEqual(cadencePhase.cyclesBetween(0, 1200), 1);
    assertApproximatelyEqual(cadencePhase.cyclesBetween(0, 6000), 5);
});

test("cadence-phase", "returns total accumulated cycles from workout start", () => {
    const cadencePhase = createCadencePhase();

    assertApproximatelyEqual(cadencePhase.cyclesAt(2500), 2.5);
});

test("cadence-phase", "returns normalized cadence phase", () => {
    const cadencePhase = createCadencePhase();

    assertApproximatelyEqual(cadencePhase.phaseAt(250), 0.25);
    assertApproximatelyEqual(cadencePhase.phaseAt(500), 0.5);
    assertApproximatelyEqual(cadencePhase.phaseAt(750), 0.75);
});

test("cadence-phase", "normalizes exact cycle boundaries to zero phase", () => {
    const cadencePhase = createCadencePhase();

    assertEqual(cadencePhase.phaseAt(0), 0);
    assertEqual(cadencePhase.phaseAt(1000), 0);
    assertEqual(cadencePhase.phaseAt(2000), 0);
});

test("cadence-phase", "finds the next steady cadence cycle boundary", () => {
    const cadencePhase = createCadencePhase();

    assertApproximatelyEqual(cadencePhase.nextCycleBoundaryAfter(250), 1000, 0.02);
});

test("cadence-phase", "finds the next boundary when starting on a cycle boundary", () => {
    const cadencePhase = createCadencePhase();

    assertApproximatelyEqual(cadencePhase.nextCycleBoundaryAfter(1000), 2000, 0.02);
});

test("cadence-phase", "integrates cadence across stepped progression boundaries", () => {
    const protocol = {
        id: "stepped-protocol",
        name: "Stepped Protocol",
        activityTypeId: "elliptical",
        machineProfileId: null,
        calibrationProfileId: null,
        phases: [
            {
                id: "phase-1",
                name: "Phase 1",
                blocks: [
                    {
                        id: "block-1",
                        name: "Block 1",
                        durationSeconds: 60,
                        variables: {
                            cadence: {
                                type: "stepped",
                                start: 60,
                                end: 120,
                                step: 60,
                            },
                        },
                    },
                ],
            },
        ],
    };

    const cadencePhase = createCadencePhase(protocol);

    const totalCycles = cadencePhase.cyclesBetween(0, 60000);

    assertApproximatelyEqual(totalCycles, 90);
});

test("cadence-phase", "integrates increasing linear cadence continuously", () => {
    const cadencePhase = createCadencePhase(
        createProtocol({
            durationSeconds: 60,
            progression: {
                type: "linear",
                start: 60,
                end: 120,
            },
        }),
    );

    const totalCycles = cadencePhase.cyclesBetween(0, 60000);

    assertApproximatelyEqual(totalCycles, 90);
});

test("cadence-phase", "integrates decreasing linear cadence continuously", () => {
    const cadencePhase = createCadencePhase(
        createProtocol({
            durationSeconds: 60,
            progression: {
                type: "linear",
                start: 120,
                end: 60,
            },
        }),
    );

    const totalCycles = cadencePhase.cyclesBetween(0, 60000);

    assertApproximatelyEqual(totalCycles, 90);
});

test("cadence-phase", "finds cycle boundaries during increasing linear cadence", () => {
    const cadencePhase = createCadencePhase(
        createProtocol({
            durationSeconds: 60,
            progression: {
                type: "linear",
                start: 60,
                end: 120,
            },
        }),
    );

    const boundaryTimeMs = cadencePhase.nextCycleBoundaryAfter(0);

    assertEqual(boundaryTimeMs > 0, true);
    assertEqual(boundaryTimeMs < 1000, true);

    assertApproximatelyEqual(cadencePhase.cyclesBetween(0, boundaryTimeMs), 1, 1e-4);
});

test("cadence-phase", "finds cycle boundaries during decreasing linear cadence", () => {
    const cadencePhase = createCadencePhase(
        createProtocol({
            durationSeconds: 60,
            progression: {
                type: "linear",
                start: 120,
                end: 60,
            },
        }),
    );

    const boundaryTimeMs = cadencePhase.nextCycleBoundaryAfter(0);

    assertEqual(boundaryTimeMs > 500, true);
    assertEqual(boundaryTimeMs < 1000, true);

    assertApproximatelyEqual(cadencePhase.cyclesBetween(0, boundaryTimeMs), 1, 1e-4);
});

test("cadence-phase", "returns undefined when no complete cycle remains", () => {
    const cadencePhase = createCadencePhase(
        createProtocol({
            durationSeconds: 1,
            progression: {
                type: "steady",
                start: 30,
            },
        }),
    );

    assertEqual(cadencePhase.nextCycleBoundaryAfter(0), undefined);
});

test("cadence-phase", "returns undefined at protocol end", () => {
    const cadencePhase = createCadencePhase();

    assertEqual(cadencePhase.nextCycleBoundaryAfter(60000), undefined);
});

test("cadence-phase", "rejects negative workout time", () => {
    const cadencePhase = createCadencePhase();

    assertThrows(() => cadencePhase.cyclesAt(-1));
    assertThrows(() => cadencePhase.phaseAt(-1));
    assertThrows(() => cadencePhase.nextCycleBoundaryAfter(-1));
});

test("cadence-phase", "rejects workout time beyond protocol duration", () => {
    const cadencePhase = createCadencePhase();

    assertThrows(() => cadencePhase.cyclesAt(60001));
    assertThrows(() => cadencePhase.phaseAt(60001));
    assertThrows(() => cadencePhase.nextCycleBoundaryAfter(60001));
});

test("cadence-phase", "rejects non-finite workout time", () => {
    const cadencePhase = createCadencePhase();

    assertThrows(() => cadencePhase.cyclesAt(NaN));
    assertThrows(() => cadencePhase.phaseAt(Infinity));
    assertThrows(() => cadencePhase.nextCycleBoundaryAfter(NaN));
});
