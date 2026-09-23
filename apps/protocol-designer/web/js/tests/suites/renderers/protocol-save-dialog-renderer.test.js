/** Tests Protocol Save dialog presentation modes. */

import { assertEqual, assertThrows, test } from "/packages/js-testing/framework/test-framework.js";

import { renderProtocolSaveDialog } from "../../../renderers/protocol-save-dialog-renderer.js";

/** Creates Protocol Save dialog elements for renderer tests. */
function createElements() {
    return {
        title: document.createElement("h2"),
        description: document.createElement("p"),
        displayNameInput: document.createElement("input"),
        nameHint: document.createElement("p"),
        changeSummaryField: document.createElement("div"),
        changeSummaryInput: document.createElement("input"),
        confirmButton: document.createElement("button"),
    };
}

test("protocol-save-dialog-renderer", "renders initial-save mode", () => {
    const elements = createElements();

    renderProtocolSaveDialog(elements, {
        mode: "initial-save",
    });

    assertEqual(elements.title.textContent, "Save Protocol");
    assertEqual(elements.description.textContent, "Choose a name for this protocol.");
    assertEqual(elements.displayNameInput.value, "");
    assertEqual(elements.displayNameInput.disabled, false);
    assertEqual(elements.confirmButton.textContent, "Save");
});

test("protocol-save-dialog-renderer", "renders save-as mode with the current name", () => {
    const elements = createElements();

    renderProtocolSaveDialog(elements, {
        mode: "save-as",
        displayName: "Threshold Intervals",
    });

    assertEqual(elements.title.textContent, "Save As New Protocol");
    assertEqual(elements.description.textContent, "Create a new protocol from the current one.");
    assertEqual(elements.displayNameInput.value, "Threshold Intervals");
    assertEqual(elements.displayNameInput.disabled, false);
    assertEqual(elements.confirmButton.textContent, "Save As");
});

test("protocol-save-dialog-renderer", "renders rename mode with the current name", () => {
    const elements = createElements();

    renderProtocolSaveDialog(elements, {
        mode: "rename",
        displayName: "Threshold Intervals",
    });

    assertEqual(elements.title.textContent, "Rename Protocol");
    assertEqual(elements.description.textContent, "Change the name of this protocol.");
    assertEqual(elements.displayNameInput.value, "Threshold Intervals");
    assertEqual(elements.displayNameInput.disabled, false);
    assertEqual(elements.confirmButton.textContent, "Rename");
});

test("protocol-save-dialog-renderer", "hides change summary in rename mode", () => {
    const elements = createElements();

    renderProtocolSaveDialog(elements, {
        mode: "rename",
        displayName: "Threshold Intervals",
    });

    assertEqual(elements.changeSummaryField.hidden, true);
});

test(
    "protocol-save-dialog-renderer",
    "clears stale dialog values when rendering initial-save",
    () => {
        const elements = createElements();

        elements.displayNameInput.value = "Old Name";
        elements.changeSummaryInput.value = "Old summary";
        elements.changeSummaryField.hidden = true;

        renderProtocolSaveDialog(elements, {
            mode: "initial-save",
        });

        assertEqual(elements.displayNameInput.value, "");
        assertEqual(elements.changeSummaryInput.value, "");
    },
);

test("protocol-save-dialog-renderer", "clears stale change summary when changing modes", () => {
    const elements = createElements();

    elements.changeSummaryInput.value = "Previous summary";

    renderProtocolSaveDialog(elements, {
        mode: "save-as",
        displayName: "Threshold Intervals",
    });

    assertEqual(elements.changeSummaryInput.value, "");
});

test("protocol-save-dialog-renderer", "rejects an unsupported mode", () => {
    const elements = createElements();

    assertThrows(() => {
        renderProtocolSaveDialog(elements, {
            mode: "something-else",
        });
    }, 'Unsupported protocol save dialog mode "something-else".');
});
