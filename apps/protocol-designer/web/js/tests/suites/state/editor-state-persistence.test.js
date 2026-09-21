import { test, assertEqual } from "/packages/js-testing/framework/test-framework.js";

import { EditorState } from "../../../state/editor-state.js";

test("editor-state-persistence", "starts with no protocol persistence identity", () => {
    const editorState = new EditorState();

    const snapshot = editorState.getSnapshot();

    assertEqual(snapshot.protocolFamilyId, undefined);
    assertEqual(snapshot.plannedProtocolVersionId, undefined);
});

test("editor-state-persistence", "sets protocol persistence identity", () => {
    const editorState = new EditorState();

    editorState.setProtocolPersistenceIdentity({
        protocolFamilyId: "family-1",
        plannedProtocolVersionId: "version-1",
    });

    const snapshot = editorState.getSnapshot();

    assertEqual(snapshot.protocolFamilyId, "family-1");
    assertEqual(snapshot.plannedProtocolVersionId, "version-1");
});

test(
    "editor-state-persistence",
    "updates the planned protocol version while preserving the protocol family",
    () => {
        const editorState = new EditorState();

        editorState.setProtocolPersistenceIdentity({
            protocolFamilyId: "family-1",
            plannedProtocolVersionId: "version-1",
        });

        editorState.setProtocolPersistenceIdentity({
            protocolFamilyId: "family-1",
            plannedProtocolVersionId: "version-2",
        });

        const snapshot = editorState.getSnapshot();

        assertEqual(snapshot.protocolFamilyId, "family-1");
        assertEqual(snapshot.plannedProtocolVersionId, "version-2");
    },
);

test("editor-state-persistence", "clears protocol persistence identity", () => {
    const editorState = new EditorState();

    editorState.setProtocolPersistenceIdentity({
        protocolFamilyId: "family-1",
        plannedProtocolVersionId: "version-1",
    });

    editorState.clearProtocolPersistenceIdentity();

    const snapshot = editorState.getSnapshot();

    assertEqual(snapshot.protocolFamilyId, undefined);
    assertEqual(snapshot.plannedProtocolVersionId, undefined);
});
