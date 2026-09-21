/** Tests Protocol Designer open-dialog interactions. */

import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { wireProtocolOpenEvents } from "../../../interactions/protocol-open-events.js";

/** Flushes pending async event-handler work. */
async function flushAsyncEvents() {
    await Promise.resolve();
    await Promise.resolve();
}

const PROTOCOL_FAMILIES = [
    {
        id: "family-1",
        displayName: "Threshold Intervals",
        archived: false,
    },
    {
        id: "family-2",
        displayName: "Recovery Ride",
        archived: false,
    },
];

/** Creates a wired Protocol Open interaction test harness. */
function createHarness({ protocolFamilies = PROTOCOL_FAMILIES, openError = undefined } = {}) {
    const openButton = document.createElement("button");
    const closeButton = document.createElement("button");
    const cancelButton = document.createElement("button");
    const confirmButton = document.createElement("button");
    const protocolList = document.createElement("div");

    const openDialog = {
        open: false,

        showModal() {
            this.open = true;
        },

        close() {
            this.open = false;
        },
    };

    const persistenceService = {
        listProtocolFamilies() {
            return protocolFamilies;
        },
    };

    const openCalls = [];

    const protocolOpenController = {
        openProtocolFamily(protocolFamilyId) {
            openCalls.push(protocolFamilyId);

            if (openError !== undefined) {
                throw openError;
            }
        },
    };

    wireProtocolOpenEvents({
        openButton,
        openDialog,
        closeButton,
        cancelButton,
        confirmButton,
        protocolList,
        persistenceService,
        protocolOpenController,
    });

    return {
        openButton,
        openDialog,
        closeButton,
        cancelButton,
        confirmButton,
        protocolList,
        openCalls,
    };
}

test("protocol-open-events", "opens the dialog and renders protocol families", () => {
    const { openButton, openDialog, protocolList, confirmButton } = createHarness();

    openButton.click();

    assertEqual(openDialog.open, true);
    assertEqual(protocolList.children.length, 2);
    assertEqual(confirmButton.disabled, true);

    assertEqual(protocolList.children[0].textContent, "Threshold Intervals");
    assertEqual(protocolList.children[1].textContent, "Recovery Ride");
});

test("protocol-open-events", "selecting a protocol family enables confirm", () => {
    const { openButton, protocolList, confirmButton } = createHarness();

    openButton.click();

    protocolList.children[0].click();

    assertEqual(confirmButton.disabled, false);
});

test("protocol-open-events", "confirm opens the selected protocol family", async () => {
    const { openButton, protocolList, confirmButton, openCalls } = createHarness();

    openButton.click();
    protocolList.children[1].click();
    confirmButton.click();

    await flushAsyncEvents();

    assertDeepEqual(openCalls, ["family-2"]);
});

test("protocol-open-events", "successful open closes the dialog", async () => {
    const { openButton, openDialog, protocolList, confirmButton } = createHarness();

    openButton.click();
    protocolList.children[0].click();
    confirmButton.click();

    await flushAsyncEvents();

    assertEqual(openDialog.open, false);
});

test("protocol-open-events", "failed open leaves the dialog open", async () => {
    const { openButton, openDialog, protocolList, confirmButton } = createHarness({
        openError: new Error("Open failed."),
    });

    openButton.click();
    protocolList.children[0].click();
    confirmButton.click();

    await flushAsyncEvents();

    assertEqual(openDialog.open, true);
});

test("protocol-open-events", "close button closes the dialog", () => {
    const { openButton, openDialog, closeButton } = createHarness();

    openButton.click();
    closeButton.click();

    assertEqual(openDialog.open, false);
});

test("protocol-open-events", "cancel button closes the dialog", () => {
    const { openButton, openDialog, cancelButton } = createHarness();

    openButton.click();
    cancelButton.click();

    assertEqual(openDialog.open, false);
});

test("protocol-open-events", "empty protocol library leaves confirm disabled", () => {
    const { openButton, protocolList, confirmButton } = createHarness({
        protocolFamilies: [],
    });

    openButton.click();

    assertEqual(protocolList.children.length, 0);
    assertEqual(confirmButton.disabled, true);
});
