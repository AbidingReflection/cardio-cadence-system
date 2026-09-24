/** Tests whole-session EditorState reset behavior. */

import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { EditorState } from "../../../state/editor-state.js";

/** Populates EditorState with transient state that should not survive a protocol reset. */
function populateProtocolSession(state) {
    state.expandPhase("phase-1");
    state.expandPhase("phase-2");
    state.selectBlock("block-1");

    state.startPhaseNameEdit("phase-1", "Warmup");

    state.openBlockCreateDraft(
        "block-new",
        {
            name: "New Block",
            durationSeconds: 300,
            variables: {},
        },
        {
            phaseId: "phase-1",
            index: 1,
        },
    );

    state.setValidationErrors([
        {
            field: "durationSeconds",
            message: "Duration is required.",
        },
    ]);

    state.setEditMode("block");

    state.setProtocolPersistenceIdentity({
        protocolFamilyId: "family-1",
        plannedProtocolVersionId: "version-3",
    });
}

test("editor-state-session", "reset clears structural selection and expansion", () => {
    const state = new EditorState();

    populateProtocolSession(state);

    state.resetProtocolSession();

    const snapshot = state.getSnapshot();

    assertDeepEqual(snapshot.expandedPhaseIds, []);
    assertEqual(snapshot.expandedBlockId, undefined);
    assertEqual(snapshot.selectedPhaseId, undefined);
    assertEqual(snapshot.selectedBlockId, undefined);
});

test("editor-state-session", "reset clears active editing state", () => {
    const state = new EditorState();

    populateProtocolSession(state);

    state.resetProtocolSession();

    const snapshot = state.getSnapshot();

    assertEqual(snapshot.editingPhaseId, undefined);
    assertEqual(snapshot.phaseNameDraft, undefined);
    assertEqual(snapshot.activeBlockDraft, undefined);
    assertEqual(state.isBlockDraftDirty(), false);
});

test("editor-state-session", "reset clears validation insertion and edit mode", () => {
    const state = new EditorState();

    populateProtocolSession(state);

    state.resetProtocolSession();

    const snapshot = state.getSnapshot();

    assertDeepEqual(snapshot.validationErrors, []);
    assertEqual(snapshot.insertionTarget, undefined);
    assertEqual(snapshot.editMode, undefined);
});

test("editor-state-session", "reset clears protocol persistence identity", () => {
    const state = new EditorState();

    populateProtocolSession(state);

    state.resetProtocolSession();

    const snapshot = state.getSnapshot();

    assertEqual(snapshot.protocolFamilyId, undefined);
    assertEqual(snapshot.plannedProtocolVersionId, undefined);
});

test("editor-state-session", "reset notifies subscribers once", () => {
    const state = new EditorState();

    populateProtocolSession(state);

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.resetProtocolSession();

    assertEqual(notificationCount, 1);
});
