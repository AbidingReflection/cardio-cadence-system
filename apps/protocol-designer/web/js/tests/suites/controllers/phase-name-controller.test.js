import { assertEqual, assertThrows, test } from "/packages/js-testing/framework/test-framework.js";

import { startPhaseNameEdit } from "../../../controllers/phase-name-controller.js";

import { createEditorStateFake } from "../../helpers/editor-state-fake.js";

/** Creates the minimal ProtocolModel API required by phase-name controller tests. */
function createProtocolModelStub(phases) {
    return {
        getSnapshot() {
            return {
                phases: structuredClone(phases),
            };
        },
    };
}

test("phase-name-controller", "starts a phase-name edit from committed phase data", () => {
    const protocolModel = createProtocolModelStub([
        {
            id: "phase-1",
            name: "Warmup",
            blocks: [],
        },
    ]);

    const editorState = createEditorStateFake();

    startPhaseNameEdit(protocolModel, editorState, "phase-1");

    const snapshot = editorState.getSnapshot();

    assertEqual(snapshot.editingPhaseId, "phase-1");
    assertEqual(snapshot.phaseNameDraft, "Warmup");
    assertEqual(editorState.calls.startPhaseNameEdit, 1);
});

test("phase-name-controller", "throws when starting an edit for a missing phase", () => {
    const protocolModel = createProtocolModelStub([]);

    const editorState = createEditorStateFake();

    assertThrows(
        () => startPhaseNameEdit(protocolModel, editorState, "phase-missing"),
        'Cannot edit missing phase "phase-missing".',
    );

    assertEqual(editorState.calls.startPhaseNameEdit, 0);
});
