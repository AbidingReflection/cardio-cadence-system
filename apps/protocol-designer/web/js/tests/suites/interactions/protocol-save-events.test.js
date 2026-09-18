/** Tests Protocol Designer save-dialog interactions. */

import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { wireProtocolSaveEvents } from "../../../interactions/protocol-save-events.js";

/** Flushes pending async event-handler work. */
async function flushAsyncEvents() {
    await Promise.resolve();
    await Promise.resolve();
}

/** Creates a wired Protocol Save interaction test harness. */
function createHarness({
    protocolFamilyId = undefined,
    plannedProtocolVersionId = undefined,
    saveError = undefined,
} = {}) {
    const saveButton = document.createElement("button");
    const closeButton = document.createElement("button");
    const cancelButton = document.createElement("button");
    const confirmButton = document.createElement("button");
    const displayNameInput = document.createElement("input");
    const changeSummaryInput = document.createElement("input");

    const saveDialog = {
        open: false,

        showModal() {
            this.open = true;
        },

        close() {
            this.open = false;
        },
    };

    const editorState = {
        getSnapshot() {
            return {
                protocolFamilyId,
                plannedProtocolVersionId,
            };
        },
    };

    const saveCalls = [];

    const protocolPersistenceController = {
        async saveProtocol(input) {
            saveCalls.push(input);

            if (saveError !== undefined) {
                throw saveError;
            }

            if (protocolFamilyId === undefined) {
                protocolFamilyId = "family-1";
                plannedProtocolVersionId = "version-1";

                return {
                    protocolFamily: {
                        id: protocolFamilyId,
                    },
                    plannedProtocolVersion: {
                        id: plannedProtocolVersionId,
                    },
                };
            }

            plannedProtocolVersionId = "version-2";

            return {
                id: plannedProtocolVersionId,
            };
        },
    };

    wireProtocolSaveEvents({
        saveButton,
        saveDialog,
        closeButton,
        cancelButton,
        confirmButton,
        displayNameInput,
        changeSummaryInput,
        editorState,
        protocolPersistenceController,
    });

    return {
        saveButton,
        saveDialog,
        closeButton,
        cancelButton,
        confirmButton,
        displayNameInput,
        changeSummaryInput,
        saveCalls,
    };
}

test("protocol-save-events", "Save opens the dialog for a new protocol", () => {
    const harness = createHarness();

    harness.saveButton.click();

    assertEqual(harness.saveDialog.open, true);
    assertEqual(harness.displayNameInput.disabled, false);
});

test(
    "protocol-save-events",
    "Save disables protocol name editing for an existing protocol family",
    () => {
        const harness = createHarness({
            protocolFamilyId: "family-1",
            plannedProtocolVersionId: "version-1",
        });

        harness.saveButton.click();

        assertEqual(harness.saveDialog.open, true);
        assertEqual(harness.displayNameInput.disabled, true);
    },
);

test("protocol-save-events", "Cancel closes without saving", () => {
    const harness = createHarness();

    harness.saveButton.click();
    harness.displayNameInput.value = "Threshold Intervals";
    harness.cancelButton.click();

    assertEqual(harness.saveCalls.length, 0);
    assertEqual(harness.saveDialog.open, false);
});

test("protocol-save-events", "close button closes without saving", () => {
    const harness = createHarness();

    harness.saveButton.click();
    harness.displayNameInput.value = "Threshold Intervals";
    harness.closeButton.click();

    assertEqual(harness.saveCalls.length, 0);
    assertEqual(harness.saveDialog.open, false);
});

test("protocol-save-events", "first save passes the protocol name and change summary", async () => {
    const harness = createHarness();

    harness.saveButton.click();

    harness.displayNameInput.value = "  Threshold Intervals  ";
    harness.changeSummaryInput.value = "  Initial version  ";

    harness.confirmButton.click();

    await flushAsyncEvents();

    assertDeepEqual(harness.saveCalls, [
        {
            displayName: "Threshold Intervals",
            changeSummary: "Initial version",
        },
    ]);

    assertEqual(harness.saveDialog.open, false);
});

test("protocol-save-events", "existing protocol save does not pass a display name", async () => {
    const harness = createHarness({
        protocolFamilyId: "family-1",
        plannedProtocolVersionId: "version-1",
    });

    harness.saveButton.click();

    harness.changeSummaryInput.value = "  Raised cadence target  ";

    harness.confirmButton.click();

    await flushAsyncEvents();

    assertDeepEqual(harness.saveCalls, [
        {
            displayName: undefined,
            changeSummary: "Raised cadence target",
        },
    ]);

    assertEqual(harness.saveDialog.open, false);
});

test("protocol-save-events", "empty change summary is passed as undefined", async () => {
    const harness = createHarness();

    harness.saveButton.click();

    harness.displayNameInput.value = "Threshold Intervals";
    harness.changeSummaryInput.value = "   ";

    harness.confirmButton.click();

    await flushAsyncEvents();

    assertDeepEqual(harness.saveCalls, [
        {
            displayName: "Threshold Intervals",
            changeSummary: undefined,
        },
    ]);
});

test("protocol-save-events", "successful save closes the dialog", async () => {
    const harness = createHarness();

    harness.saveButton.click();
    harness.displayNameInput.value = "Threshold Intervals";

    harness.confirmButton.click();

    await flushAsyncEvents();

    assertEqual(harness.saveDialog.open, false);
});

test("protocol-save-events", "failed save leaves the dialog open", async () => {
    const harness = createHarness({
        saveError: new Error("Save failed."),
    });

    harness.saveButton.click();
    harness.displayNameInput.value = "Threshold Intervals";

    harness.confirmButton.click();

    await flushAsyncEvents();

    assertEqual(harness.saveDialog.open, true);
});
