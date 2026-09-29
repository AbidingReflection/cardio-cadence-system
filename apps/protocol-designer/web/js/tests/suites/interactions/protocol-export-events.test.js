import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { wireProtocolExportEvents } from "../../../interactions/protocol-export-events.js";

/** Creates a wired Protocol Export interaction test harness. */
function createHarness(
    protocol,
    {
        activityType = {
            id: "activity-1",
            name: "Activity",
        },
        machineProfile = {
            id: "machine-1",
            name: "Machine",
        },
        calibrationProfile = {
            id: "calibration-1",
            name: "Calibration",
        },
    } = {},
) {
    const exportButton = document.createElement("button");

    let snapshotCallCount = 0;

    const protocolModel = {
        getSnapshot() {
            snapshotCallCount += 1;
            return structuredClone(protocol);
        },

        getSetupContext() {
            return {
                activityType: {
                    getDefinition() {
                        return structuredClone(activityType);
                    },
                },

                machineProfile:
                    machineProfile === null
                        ? undefined
                        : {
                              getDefinition() {
                                  return structuredClone(machineProfile);
                              },
                          },

                calibrationProfile:
                    calibrationProfile === null
                        ? undefined
                        : {
                              getDefinition() {
                                  return structuredClone(calibrationProfile);
                              },
                          },
            };
        },
    };

    const createdUrls = [];
    const revokedUrls = [];
    const clickedDownloads = [];

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const originalCreateElement = document.createElement.bind(document);

    URL.createObjectURL = (blob) => {
        createdUrls.push(blob);
        return "blob:test-url";
    };

    URL.revokeObjectURL = (url) => {
        revokedUrls.push(url);
    };

    document.createElement = (tagName) => {
        const element = originalCreateElement(tagName);

        if (tagName === "a") {
            element.click = () => {
                clickedDownloads.push({
                    href: element.href,
                    download: element.download,
                });
            };
        }

        return element;
    };

    wireProtocolExportEvents({
        exportButton,
        protocolModel,
    });

    return {
        exportButton,
        getSnapshotCallCount: () => snapshotCallCount,
        createdUrls,
        revokedUrls,
        clickedDownloads,

        restore() {
            URL.createObjectURL = originalCreateObjectURL;
            URL.revokeObjectURL = originalRevokeObjectURL;
            document.createElement = originalCreateElement;
        },
    };
}

test("protocol-export-events", "exports a self-contained protocol bundle", async () => {
    const protocol = {
        id: "test-protocol",
        name: "Test Protocol",
        phases: [],
    };

    const activityType = {
        id: "activity-1",
        name: "Activity",
    };

    const machineProfile = {
        id: "machine-1",
        name: "Machine",
    };

    const calibrationProfile = {
        id: "calibration-1",
        name: "Calibration",
    };

    const harness = createHarness(protocol, {
        activityType,
        machineProfile,
        calibrationProfile,
    });

    try {
        harness.exportButton.click();

        assertEqual(harness.getSnapshotCallCount(), 1);
        assertEqual(harness.createdUrls.length, 1);

        const blob = harness.createdUrls[0];
        const exported = JSON.parse(await blob.text());

        assertDeepEqual(exported, {
            protocol,
            activityType,
            machineProfile,
            calibrationProfile,
        });
    } finally {
        harness.restore();
    }
});

test(
    "protocol-export-events",
    "exports null for unavailable machine and calibration profiles",
    async () => {
        const protocol = {
            id: "test-protocol",
            name: "Test Protocol",
            phases: [],
        };

        const harness = createHarness(protocol, {
            machineProfile: null,
            calibrationProfile: null,
        });

        try {
            harness.exportButton.click();

            const blob = harness.createdUrls[0];
            const exported = JSON.parse(await blob.text());

            assertEqual(exported.machineProfile, null);
            assertEqual(exported.calibrationProfile, null);
        } finally {
            harness.restore();
        }
    },
);

test("protocol-export-events", "uses the protocol id as the download filename", () => {
    const harness = createHarness({
        id: "test-protocol",
        name: "Test Protocol",
        phases: [],
    });

    try {
        harness.exportButton.click();

        assertEqual(harness.clickedDownloads.length, 1);
        assertEqual(harness.clickedDownloads[0].download, "test-protocol.json");
    } finally {
        harness.restore();
    }
});

test("protocol-export-events", "falls back to protocol.json when the protocol has no id", () => {
    const harness = createHarness({
        name: "Test Protocol",
        phases: [],
    });

    try {
        harness.exportButton.click();

        assertEqual(harness.clickedDownloads.length, 1);
        assertEqual(harness.clickedDownloads[0].download, "protocol.json");
    } finally {
        harness.restore();
    }
});

test("protocol-export-events", "revokes the temporary object URL", () => {
    const harness = createHarness({
        id: "test-protocol",
        phases: [],
    });

    try {
        harness.exportButton.click();

        assertDeepEqual(harness.revokedUrls, ["blob:test-url"]);
    } finally {
        harness.restore();
    }
});
