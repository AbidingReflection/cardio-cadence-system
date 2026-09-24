/** Tests protocol-session unsaved-change evaluation. */

import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { ProtocolUnsavedChanges } from "../../../state/protocol-unsaved-changes.js";

function createProtocolSnapshot() {
    return {
        activityTypeId: "elliptical",
        phases: [],
    };
}

function createHarness({
    protocolDirty = false,
    blockDraftDirty = false,
    phaseNameDraftDirty = false,
} = {}) {
    const protocolSnapshot = createProtocolSnapshot();

    const protocolModel = {
        getSnapshot() {
            return protocolSnapshot;
        },
    };

    const editorState = {
        isBlockDraftDirty() {
            return blockDraftDirty;
        },

        isPhaseNameDraftDirty() {
            return phaseNameDraftDirty;
        },
    };

    const protocolSessionState = {
        isProtocolDirty(snapshot) {
            assertEqual(snapshot, protocolSnapshot);

            return protocolDirty;
        },
    };

    return new ProtocolUnsavedChanges({
        protocolModel,
        editorState,
        protocolSessionState,
    });
}

test("protocol-unsaved-changes", "reports clean state when protocol and drafts are clean", () => {
    const unsavedChanges = createHarness();

    assertEqual(unsavedChanges.hasUnsavedChanges(), false);
});

test("protocol-unsaved-changes", "reports dirty state when protocol differs from baseline", () => {
    const unsavedChanges = createHarness({
        protocolDirty: true,
    });

    assertEqual(unsavedChanges.hasUnsavedChanges(), true);
});

test("protocol-unsaved-changes", "reports dirty state for a dirty block draft", () => {
    const unsavedChanges = createHarness({
        blockDraftDirty: true,
    });

    assertEqual(unsavedChanges.hasUnsavedChanges(), true);
});

test("protocol-unsaved-changes", "reports dirty state for a dirty phase-name draft", () => {
    const unsavedChanges = createHarness({
        phaseNameDraftDirty: true,
    });

    assertEqual(unsavedChanges.hasUnsavedChanges(), true);
});

test("protocol-unsaved-changes", "reports dirty state when multiple unsaved sources exist", () => {
    const unsavedChanges = createHarness({
        protocolDirty: true,
        blockDraftDirty: true,
        phaseNameDraftDirty: true,
    });

    assertEqual(unsavedChanges.hasUnsavedChanges(), true);
});
