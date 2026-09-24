/** Tests Protocol Designer New Protocol interactions. */

import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { wireProtocolNewEvents } from "../../../interactions/protocol-new-events.js";

/** Creates New Protocol interaction dependencies with observable calls. */
function createHarness({ hasUnsavedChanges = false } = {}) {
    const newButton = document.createElement("button");

    let newProtocolCalls = 0;

    const protocolNewController = {
        newProtocol() {
            newProtocolCalls += 1;
        },
    };

    const protocolUnsavedChanges = {
        hasUnsavedChanges() {
            return hasUnsavedChanges;
        },
    };

    wireProtocolNewEvents({
        newButton,
        protocolNewController,
        protocolUnsavedChanges,
    });

    return {
        newButton,
        getNewProtocolCalls() {
            return newProtocolCalls;
        },
    };
}

test(
    "protocol-new-events",
    "clicking New creates a new protocol when no unsaved changes exist",
    () => {
        const harness = createHarness();

        harness.newButton.click();

        assertEqual(harness.getNewProtocolCalls(), 1);
    },
);

test(
    "protocol-new-events",
    "cancelling unsaved-change confirmation preserves the current protocol",
    () => {
        const harness = createHarness({
            hasUnsavedChanges: true,
        });

        const originalConfirm = window.confirm;
        window.confirm = () => false;

        try {
            harness.newButton.click();

            assertEqual(harness.getNewProtocolCalls(), 0);
        } finally {
            window.confirm = originalConfirm;
        }
    },
);

test("protocol-new-events", "confirming unsaved-change discard creates a new protocol", () => {
    const harness = createHarness({
        hasUnsavedChanges: true,
    });

    const originalConfirm = window.confirm;
    window.confirm = () => true;

    try {
        harness.newButton.click();

        assertEqual(harness.getNewProtocolCalls(), 1);
    } finally {
        window.confirm = originalConfirm;
    }
});
