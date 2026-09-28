import {
    test,
    assertEqual,
    assertDeepEqual,
} from "/packages/js-testing/framework/test-framework.js";

import { EditorState } from "../../../state/editor-state.js";

test("editor-state-core", "starts with no expanded phases or block", () => {
    const state = new EditorState();

    assertDeepEqual(state.getSnapshot(), {
        expandedPhaseIds: [],
        expandedBlockId: undefined,
        selectedPhaseId: undefined,
        selectedBlockId: undefined,
        editingPhaseId: undefined,
        phaseNameDraft: undefined,
        activeBlockDraft: undefined,
        validationErrors: [],
        insertionTarget: undefined,
        editMode: undefined,
        protocolFamilyId: undefined,
        plannedProtocolVersionId: undefined,
        copyMode: undefined,
    });
});

test("editor-state-core", "supports multiple subscribers", () => {
    const state = new EditorState();

    let firstCount = 0;
    let secondCount = 0;

    state.subscribe(() => {
        firstCount += 1;
    });

    state.subscribe(() => {
        secondCount += 1;
    });

    state.expandPhase("phase-1");

    assertEqual(firstCount, 1);
    assertEqual(secondCount, 1);
});

test("editor-state-core", "unsubscribe stops future notifications", () => {
    const state = new EditorState();

    let notificationCount = 0;

    const unsubscribe = state.subscribe(() => {
        notificationCount += 1;
    });

    state.expandPhase("phase-1");

    unsubscribe();

    state.expandPhase("phase-2");

    assertEqual(notificationCount, 1);
});

test("editor-state-core", "returns independent snapshots", () => {
    const state = new EditorState();

    state.expandPhase("phase-1");

    const snapshot = state.getSnapshot();

    snapshot.expandedPhaseIds.push("phase-2");

    assertDeepEqual(state.getSnapshot().expandedPhaseIds, ["phase-1"]);
});

test("editor-state-core", "notifies subscribers after state changes", () => {
    const state = new EditorState();

    let receivedSnapshot;

    state.subscribe((snapshot) => {
        receivedSnapshot = snapshot;
    });

    state.expandPhase("phase-1");

    assertDeepEqual(receivedSnapshot, {
        expandedPhaseIds: ["phase-1"],
        expandedBlockId: undefined,
        selectedPhaseId: undefined,
        selectedBlockId: undefined,
        editingPhaseId: undefined,
        phaseNameDraft: undefined,
        activeBlockDraft: undefined,
        validationErrors: [],
        insertionTarget: undefined,
        editMode: undefined,
        protocolFamilyId: undefined,
        plannedProtocolVersionId: undefined,
        copyMode: undefined,
    });
});

test("editor-state-core", "non-selection changes emit full change type", () => {
    const editorState = new EditorState();

    let receivedChangeType;

    editorState.subscribe((_snapshot, changeType) => {
        receivedChangeType = changeType;
    });

    editorState.expandPhase("phase-1");

    assertEqual(receivedChangeType, "full");
});
