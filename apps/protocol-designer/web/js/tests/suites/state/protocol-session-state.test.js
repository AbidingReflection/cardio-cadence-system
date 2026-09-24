/** Tests protocol-session saved-baseline tracking. */

import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { ProtocolSessionState } from "../../../state/protocol-session-state.js";

function createProtocol() {
    return {
        activityTypeId: "elliptical",
        phases: [
            {
                id: "phase-1",
                name: "Warmup",
                blocks: [],
            },
        ],
    };
}

test("protocol-session-state", "reports an identical protocol as clean", () => {
    const state = new ProtocolSessionState();
    const protocol = createProtocol();

    state.setBaseline(protocol);

    assertEqual(state.isProtocolDirty(protocol), false);
});

test("protocol-session-state", "reports a changed protocol as dirty", () => {
    const state = new ProtocolSessionState();
    const protocol = createProtocol();

    state.setBaseline(protocol);

    const changedProtocol = structuredClone(protocol);
    changedProtocol.phases[0].name = "Updated Warmup";

    assertEqual(state.isProtocolDirty(changedProtocol), true);
});

test("protocol-session-state", "reports a reverted protocol as clean", () => {
    const state = new ProtocolSessionState();
    const protocol = createProtocol();

    state.setBaseline(protocol);

    const changedProtocol = structuredClone(protocol);
    changedProtocol.phases[0].name = "Updated Warmup";

    assertEqual(state.isProtocolDirty(changedProtocol), true);
    assertEqual(state.isProtocolDirty(protocol), false);
});

test("protocol-session-state", "stores a defensive copy of the baseline", () => {
    const state = new ProtocolSessionState();
    const protocol = createProtocol();

    state.setBaseline(protocol);

    protocol.phases[0].name = "Mutated Outside State";

    assertEqual(state.isProtocolDirty(createProtocol()), false);
});

test("protocol-session-state", "reports whether a baseline exists", () => {
    const state = new ProtocolSessionState();

    assertEqual(state.hasBaseline(), false);

    state.setBaseline(createProtocol());

    assertEqual(state.hasBaseline(), true);
});

test("protocol-session-state", "clears the saved baseline", () => {
    const state = new ProtocolSessionState();

    state.setBaseline(createProtocol());
    state.clearBaseline();

    assertEqual(state.hasBaseline(), false);
});

test("protocol-session-state", "treats a protocol without a baseline as dirty", () => {
    const state = new ProtocolSessionState();

    assertEqual(state.isProtocolDirty(createProtocol()), true);
});
