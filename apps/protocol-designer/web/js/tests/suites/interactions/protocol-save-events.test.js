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
    createError = undefined,
    saveNextError = undefined,
} = {}) {
    const saveButton = document.createElement("button");
    const saveAsButton = document.createElement("button");
    const renameButton = document.createElement("button");
    const closeButton = document.createElement("button");
    const cancelButton = document.createElement("button");
    const confirmButton = document.createElement("button");

    const title = document.createElement("h2");
    const description = document.createElement("p");
    const displayNameInput = document.createElement("input");
    const nameHint = document.createElement("p");
    const changeSummaryField = document.createElement("div");
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

    const protocolFamilies = new Map();

    if (protocolFamilyId !== undefined) {
        protocolFamilies.set(protocolFamilyId, {
            id: protocolFamilyId,
            displayName: "Threshold Intervals",
        });
    }

    const persistenceService = {
        getProtocolFamily(id) {
            return protocolFamilies.get(id);
        },
    };

    const createPersistedProtocolCalls = [];
    const saveNextProtocolVersionCalls = [];

    const protocolPersistenceController = {
        async createPersistedProtocol(input) {
            createPersistedProtocolCalls.push(input);

            if (createError !== undefined) {
                throw createError;
            }

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
        },

        async saveNextProtocolVersion(input) {
            saveNextProtocolVersionCalls.push(input);

            if (saveNextError !== undefined) {
                throw saveNextError;
            }

            plannedProtocolVersionId = "version-2";

            return {
                id: plannedProtocolVersionId,
            };
        },
    };

    wireProtocolSaveEvents({
        saveButton,
        saveAsButton,
        renameButton,
        saveDialog,
        title,
        description,
        closeButton,
        cancelButton,
        confirmButton,
        displayNameInput,
        nameHint,
        changeSummaryField,
        changeSummaryInput,
        editorState,
        persistenceService,
        protocolPersistenceController,
    });

    return {
        saveButton,
        saveAsButton,
        renameButton,
        saveDialog,
        title,
        description,
        closeButton,
        cancelButton,
        confirmButton,
        displayNameInput,
        nameHint,
        changeSummaryField,
        changeSummaryInput,
        createPersistedProtocolCalls,
        saveNextProtocolVersionCalls,
    };
}

test("protocol-save-events", "Save opens the initial-save dialog for a new protocol", () => {
    const harness = createHarness();

    harness.saveButton.click();

    assertEqual(harness.saveDialog.open, true);
    assertEqual(harness.title.textContent, "Save Protocol");
    assertEqual(harness.description.textContent, "Choose a name for this protocol.");
    assertEqual(harness.displayNameInput.disabled, false);
    assertEqual(harness.displayNameInput.value, "");
    assertEqual(harness.confirmButton.textContent, "Save");
});

test(
    "protocol-save-events",
    "Save saves the next version immediately for an existing protocol family",
    async () => {
        const harness = createHarness({
            protocolFamilyId: "family-1",
            plannedProtocolVersionId: "version-1",
        });

        harness.saveButton.click();

        await flushAsyncEvents();

        assertDeepEqual(harness.saveNextProtocolVersionCalls, [undefined]);
    },
);

test(
    "protocol-save-events",
    "Save does not open the dialog for an existing protocol family",
    async () => {
        const harness = createHarness({
            protocolFamilyId: "family-1",
            plannedProtocolVersionId: "version-1",
        });

        harness.saveButton.click();

        await flushAsyncEvents();

        assertEqual(harness.saveDialog.open, false);
    },
);

test("protocol-save-events", "Cancel closes without saving", () => {
    const harness = createHarness();

    harness.saveButton.click();
    harness.displayNameInput.value = "Threshold Intervals";
    harness.cancelButton.click();

    assertEqual(harness.createPersistedProtocolCalls.length, 0);
    assertEqual(harness.saveNextProtocolVersionCalls.length, 0);
    assertEqual(harness.saveDialog.open, false);
});

test("protocol-save-events", "close button closes without saving", () => {
    const harness = createHarness();

    harness.saveButton.click();
    harness.displayNameInput.value = "Threshold Intervals";
    harness.closeButton.click();

    assertEqual(harness.createPersistedProtocolCalls.length, 0);
    assertEqual(harness.saveNextProtocolVersionCalls.length, 0);
    assertEqual(harness.saveDialog.open, false);
});

test("protocol-save-events", "first save passes the protocol name and change summary", async () => {
    const harness = createHarness();

    harness.saveButton.click();

    harness.displayNameInput.value = "  Threshold Intervals  ";
    harness.changeSummaryInput.value = "  Initial version  ";

    harness.confirmButton.click();

    await flushAsyncEvents();

    assertDeepEqual(harness.createPersistedProtocolCalls, [
        {
            displayName: "Threshold Intervals",
            changeSummary: "Initial version",
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

    assertDeepEqual(harness.createPersistedProtocolCalls, [
        {
            displayName: "Threshold Intervals",
            changeSummary: undefined,
        },
    ]);
});

test("protocol-save-events", "successful first save closes the dialog", async () => {
    const harness = createHarness();

    harness.saveButton.click();
    harness.displayNameInput.value = "Threshold Intervals";

    harness.confirmButton.click();

    await flushAsyncEvents();

    assertEqual(harness.saveDialog.open, false);
});

test("protocol-save-events", "failed first save leaves the dialog open", async () => {
    const harness = createHarness({
        createError: new Error("Save failed."),
    });

    harness.saveButton.click();
    harness.displayNameInput.value = "Threshold Intervals";

    harness.confirmButton.click();

    await flushAsyncEvents();

    assertEqual(harness.saveDialog.open, true);
});

test("protocol-save-events", "failed existing protocol save does not open the dialog", async () => {
    const harness = createHarness({
        protocolFamilyId: "family-1",
        plannedProtocolVersionId: "version-1",
        saveNextError: new Error("Save failed."),
    });

    harness.saveButton.click();

    await flushAsyncEvents();

    assertEqual(harness.saveDialog.open, false);
    assertEqual(harness.saveNextProtocolVersionCalls.length, 1);
});

test("protocol-save-events", "Save As opens the save-as dialog for a new protocol", () => {
    const harness = createHarness();

    harness.saveAsButton.click();

    assertEqual(harness.saveDialog.open, true);
    assertEqual(harness.title.textContent, "Save As New Protocol");
    assertEqual(harness.description.textContent, "Create a new protocol from the current one.");
    assertEqual(harness.displayNameInput.value, "");
    assertEqual(harness.displayNameInput.disabled, false);
    assertEqual(harness.confirmButton.textContent, "Save As");
});

test(
    "protocol-save-events",
    "Save As prefills the current protocol name for an existing protocol family",
    () => {
        const harness = createHarness({
            protocolFamilyId: "family-1",
            plannedProtocolVersionId: "version-1",
        });

        harness.saveAsButton.click();

        assertEqual(harness.saveDialog.open, true);
        assertEqual(harness.title.textContent, "Save As New Protocol");
        assertEqual(harness.displayNameInput.value, "Threshold Intervals");
        assertEqual(harness.displayNameInput.disabled, false);
        assertEqual(harness.confirmButton.textContent, "Save As");
    },
);

test(
    "protocol-save-events",
    "Rename opens the rename dialog for an existing protocol family",
    () => {
        const harness = createHarness({
            protocolFamilyId: "family-1",
            plannedProtocolVersionId: "version-1",
        });

        harness.renameButton.click();

        assertEqual(harness.saveDialog.open, true);
        assertEqual(harness.title.textContent, "Rename Protocol");
        assertEqual(harness.description.textContent, "Change the name of this protocol.");
        assertEqual(harness.confirmButton.textContent, "Rename");
        assertEqual(harness.changeSummaryField.hidden, true);
    },
);

test("protocol-save-events", "Rename prefills the current protocol name", () => {
    const harness = createHarness({
        protocolFamilyId: "family-1",
        plannedProtocolVersionId: "version-1",
    });

    harness.renameButton.click();

    assertEqual(harness.displayNameInput.value, "Threshold Intervals");
    assertEqual(harness.displayNameInput.disabled, false);
});

test("protocol-save-events", "Rename does not open for an unsaved protocol", () => {
    const harness = createHarness();

    harness.renameButton.click();

    assertEqual(harness.saveDialog.open, false);
});
