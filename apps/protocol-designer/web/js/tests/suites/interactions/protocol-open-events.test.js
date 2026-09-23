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
        createdAtUnixMs: 1000,
        displayName: "Threshold Intervals",
        archived: false,
    },
    {
        id: "family-2",
        createdAtUnixMs: 2000,
        displayName: "Recovery Ride",
        archived: false,
    },
];

const PLANNED_VERSIONS = new Map([
    [
        "family-1",
        [
            {
                id: "version-1",
                protocolFamilyId: "family-1",
                versionNumber: 1,
                parentVersionId: undefined,
                createdAtUnixMs: 1000,
                protocol: {
                    id: "protocol-1",
                    name: "Threshold Intervals",
                    activityTypeId: "elliptical",
                    phases: [
                        {
                            id: "phase-1",
                            name: "Main",
                            blocks: [
                                {
                                    id: "block-1",
                                    name: "Work",
                                    durationSeconds: 3600,
                                    variables: {},
                                },
                            ],
                        },
                    ],
                },
                dependencies: {
                    activityTypeVersionId: "activity-type-version-1",
                    machineProfileVersionId: undefined,
                    calibrationProfileVersionId: undefined,
                },
                changeSummary: undefined,
            },
        ],
    ],
    [
        "family-2",
        [
            {
                id: "version-2",
                protocolFamilyId: "family-2",
                versionNumber: 3,
                parentVersionId: "version-1",
                createdAtUnixMs: 3000,
                protocol: {
                    id: "protocol-2",
                    name: "Recovery Ride",
                    activityTypeId: "cycling",
                    phases: [
                        {
                            id: "phase-1",
                            name: "Main",
                            blocks: [
                                {
                                    id: "block-1",
                                    name: "Recovery",
                                    durationSeconds: 1800,
                                    variables: {},
                                },
                            ],
                        },
                    ],
                },
                dependencies: {
                    activityTypeVersionId: "activity-type-version-2",
                    machineProfileVersionId: undefined,
                    calibrationProfileVersionId: undefined,
                },
                changeSummary: undefined,
            },
        ],
    ],
]);

const ACTIVITY_TYPE_VERSIONS = new Map([
    [
        "activity-type-version-1",
        {
            id: "activity-type-version-1",
            definition: {
                id: "elliptical",
                name: "Elliptical",
                variables: [],
            },
        },
    ],
    [
        "activity-type-version-2",
        {
            id: "activity-type-version-2",
            definition: {
                id: "cycling",
                name: "Cycling",
                variables: [],
            },
        },
    ],
]);

/** Creates a wired Protocol Open interaction test harness. */
function createHarness({
    protocolFamilies = PROTOCOL_FAMILIES,
    plannedVersions = PLANNED_VERSIONS,
    openError = undefined,
} = {}) {
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

        listPlannedProtocolVersions(protocolFamilyId) {
            return plannedVersions.get(protocolFamilyId) ?? [];
        },
    };

    const activityTypeVersions = {
        getById(id) {
            return ACTIVITY_TYPE_VERSIONS.get(id);
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
        activityTypeVersions,
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

test("protocol-open-events", "opens the dialog and renders protocol rows", () => {
    const { openButton, openDialog, protocolList, confirmButton } = createHarness();

    openButton.click();

    const rows = protocolList.querySelectorAll("tbody tr");

    assertEqual(openDialog.open, true);
    assertEqual(rows.length, 2);
    assertEqual(confirmButton.disabled, true);
});

test("protocol-open-events", "sorts protocols by updated time descending by default", () => {
    const { openButton, protocolList } = createHarness();

    openButton.click();

    const rows = [...protocolList.querySelectorAll("tbody tr")];

    assertEqual(rows[0].dataset.protocolFamilyId, "family-2");
    assertEqual(rows[1].dataset.protocolFamilyId, "family-1");
});

test("protocol-open-events", "selecting a protocol row enables confirm", () => {
    const { openButton, protocolList, confirmButton } = createHarness();

    openButton.click();

    protocolList.querySelector('tr[data-protocol-family-id="family-1"]').click();

    assertEqual(confirmButton.disabled, false);
});

test("protocol-open-events", "selecting a protocol row marks it selected", () => {
    const { openButton, protocolList } = createHarness();

    openButton.click();

    protocolList.querySelector('tr[data-protocol-family-id="family-1"]').click();

    assertEqual(
        protocolList
            .querySelector('tr[data-protocol-family-id="family-1"]')
            .getAttribute("aria-selected"),
        "true",
    );
});

test("protocol-open-events", "selecting another protocol moves selection", () => {
    const { openButton, protocolList } = createHarness();

    openButton.click();

    protocolList.querySelector('tr[data-protocol-family-id="family-1"]').click();
    protocolList.querySelector('tr[data-protocol-family-id="family-2"]').click();

    assertEqual(
        protocolList
            .querySelector('tr[data-protocol-family-id="family-1"]')
            .getAttribute("aria-selected"),
        "false",
    );

    assertEqual(
        protocolList
            .querySelector('tr[data-protocol-family-id="family-2"]')
            .getAttribute("aria-selected"),
        "true",
    );
});

test("protocol-open-events", "clicking a sort header changes the sort column", () => {
    const { openButton, protocolList } = createHarness();

    openButton.click();

    protocolList.querySelector('button[data-sort-key="displayName"]').click();

    const rows = [...protocolList.querySelectorAll("tbody tr")];

    assertEqual(rows[0].dataset.protocolFamilyId, "family-2");
    assertEqual(rows[1].dataset.protocolFamilyId, "family-1");
});

test("protocol-open-events", "clicking the active sort header toggles direction", () => {
    const { openButton, protocolList } = createHarness();

    openButton.click();

    const updatedButton = protocolList.querySelector('button[data-sort-key="updatedAtUnixMs"]');

    updatedButton.click();

    const rows = [...protocolList.querySelectorAll("tbody tr")];

    assertEqual(rows[0].dataset.protocolFamilyId, "family-1");
    assertEqual(rows[1].dataset.protocolFamilyId, "family-2");
});

test("protocol-open-events", "selection survives sorting", () => {
    const { openButton, protocolList } = createHarness();

    openButton.click();

    protocolList.querySelector('tr[data-protocol-family-id="family-1"]').click();

    protocolList.querySelector('button[data-sort-key="displayName"]').click();

    assertEqual(
        protocolList
            .querySelector('tr[data-protocol-family-id="family-1"]')
            .getAttribute("aria-selected"),
        "true",
    );
});

test("protocol-open-events", "confirm opens the selected protocol family", async () => {
    const { openButton, protocolList, confirmButton, openCalls } = createHarness();

    openButton.click();

    protocolList.querySelector('tr[data-protocol-family-id="family-2"]').click();
    confirmButton.click();

    await flushAsyncEvents();

    assertDeepEqual(openCalls, ["family-2"]);
});

test("protocol-open-events", "successful open closes the dialog", async () => {
    const { openButton, openDialog, protocolList, confirmButton } = createHarness();

    openButton.click();

    protocolList.querySelector('tr[data-protocol-family-id="family-1"]').click();
    confirmButton.click();

    await flushAsyncEvents();

    assertEqual(openDialog.open, false);
});

test("protocol-open-events", "failed open leaves the dialog open", async () => {
    const { openButton, openDialog, protocolList, confirmButton } = createHarness({
        openError: new Error("Open failed."),
    });

    openButton.click();

    protocolList.querySelector('tr[data-protocol-family-id="family-1"]').click();
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

test("protocol-open-events", "empty protocol library renders an empty state", () => {
    const { openButton, protocolList, confirmButton } = createHarness({
        protocolFamilies: [],
        plannedVersions: new Map(),
    });

    openButton.click();

    assertEqual(
        protocolList.querySelector("[data-protocol-open-empty]").textContent.trim(),
        "No saved protocols yet.",
    );

    assertEqual(confirmButton.disabled, true);
});
