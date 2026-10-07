import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { wireProtocolImportEvents } from "../../../interactions/protocol-import-events.js";

/** Creates an import interaction harness with observable dependencies. */
function createHarness({ hasUnsavedChanges = false, confirmResult = true } = {}) {
    const importButton = document.createElement("button");
    const importInput = document.createElement("input");

    importInput.type = "file";

    let importInputClickCalls = 0;
    const importedBundles = [];
    const consoleErrors = [];

    importInput.click = () => {
        importInputClickCalls += 1;
    };

    const protocolImportController = {
        importProtocolBundle(protocolBundle) {
            importedBundles.push(protocolBundle);
        },
    };

    const protocolUnsavedChanges = {
        hasUnsavedChanges() {
            return hasUnsavedChanges;
        },
    };

    const originalConfirm = window.confirm;
    const originalConsoleError = console.error;

    window.confirm = () => confirmResult;

    console.error = (...args) => {
        consoleErrors.push(args);
    };

    wireProtocolImportEvents({
        importButton,
        importInput,
        protocolImportController,
        protocolUnsavedChanges,
    });

    return {
        importButton,
        importInput,
        importedBundles,
        consoleErrors,

        getImportInputClickCalls() {
            return importInputClickCalls;
        },

        restore() {
            window.confirm = originalConfirm;
            console.error = originalConsoleError;
        },
    };
}

/** Assigns a synthetic FileList-compatible selection to one file input. */
function setSelectedFiles(input, files) {
    Object.defineProperty(input, "files", {
        configurable: true,
        value: files,
    });
}

/** Flushes pending async event-handler work. */
async function flushAsyncWork() {
    await Promise.resolve();
    await Promise.resolve();
}

test("protocol-import-events", "opens file picker when there are no unsaved changes", () => {
    const harness = createHarness();

    try {
        harness.importButton.click();

        assertEqual(harness.getImportInputClickCalls(), 1);
    } finally {
        harness.restore();
    }
});

test(
    "protocol-import-events",
    "does not open file picker when unsaved changes are rejected",
    () => {
        const harness = createHarness({
            hasUnsavedChanges: true,
            confirmResult: false,
        });

        try {
            harness.importButton.click();

            assertEqual(harness.getImportInputClickCalls(), 0);
        } finally {
            harness.restore();
        }
    },
);

test("protocol-import-events", "opens file picker when unsaved changes are confirmed", () => {
    const harness = createHarness({
        hasUnsavedChanges: true,
        confirmResult: true,
    });

    try {
        harness.importButton.click();

        assertEqual(harness.getImportInputClickCalls(), 1);
    } finally {
        harness.restore();
    }
});

test("protocol-import-events", "imports parsed protocol bundle from selected file", async () => {
    const harness = createHarness();

    const protocolBundle = {
        protocol: {
            id: "protocol-1",
        },
        activityType: {
            id: "activity-1",
        },
        machineProfile: null,
        calibrationProfile: null,
    };

    const file = {
        async text() {
            return JSON.stringify(protocolBundle);
        },
    };

    try {
        setSelectedFiles(harness.importInput, [file]);

        harness.importInput.dispatchEvent(new Event("change"));

        await flushAsyncWork();

        assertEqual(harness.importedBundles.length, 1);
        assertEqual(harness.importedBundles[0].protocol.id, "protocol-1");
        assertEqual(harness.importedBundles[0].activityType.id, "activity-1");
    } finally {
        harness.restore();
    }
});

test("protocol-import-events", "does nothing when no file is selected", async () => {
    const harness = createHarness();

    try {
        setSelectedFiles(harness.importInput, []);

        harness.importInput.dispatchEvent(new Event("change"));

        await flushAsyncWork();

        assertEqual(harness.importedBundles.length, 0);
    } finally {
        harness.restore();
    }
});

test("protocol-import-events", "does not import invalid JSON", async () => {
    const harness = createHarness();

    const file = {
        async text() {
            return "{ invalid json";
        },
    };

    try {
        setSelectedFiles(harness.importInput, [file]);

        harness.importInput.dispatchEvent(new Event("change"));

        await flushAsyncWork();

        assertEqual(harness.importedBundles.length, 0);
        assertEqual(harness.consoleErrors.length, 1);
    } finally {
        harness.restore();
    }
});

test("protocol-import-events", "clears file input after successful import", async () => {
    const harness = createHarness();

    const file = {
        async text() {
            return JSON.stringify({
                protocol: {
                    id: "protocol-1",
                },
                activityType: {
                    id: "activity-1",
                },
                machineProfile: null,
                calibrationProfile: null,
            });
        },
    };

    try {
        setSelectedFiles(harness.importInput, [file]);

        Object.defineProperty(harness.importInput, "value", {
            configurable: true,
            writable: true,
            value: "selected.json",
        });

        harness.importInput.dispatchEvent(new Event("change"));

        await flushAsyncWork();

        assertEqual(harness.importInput.value, "");
    } finally {
        harness.restore();
    }
});

test("protocol-import-events", "clears file input after failed import", async () => {
    const harness = createHarness();

    const file = {
        async text() {
            return "{ invalid json";
        },
    };

    try {
        setSelectedFiles(harness.importInput, [file]);

        Object.defineProperty(harness.importInput, "value", {
            configurable: true,
            writable: true,
            value: "selected.json",
        });

        harness.importInput.dispatchEvent(new Event("change"));

        await flushAsyncWork();

        assertEqual(harness.importInput.value, "");
    } finally {
        harness.restore();
    }
});
