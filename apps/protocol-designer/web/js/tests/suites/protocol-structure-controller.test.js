import {
    test,
    assertEqual,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import {
    requestDeleteBlock,
    requestDeletePhase,
} from "../../controllers/protocol-structure-controller.js";

import { createEditorStateFake } from "../helpers/editor-state-fake.js";
import { createProtocolModelFake } from "../helpers/protocol-model-fake.js";

/** Creates a valid edit-mode block draft. */
function createEditDraft() {
    return {
        mode: "edit",
        blockId: "block-1",
        phaseId: "phase-1",
        name: "Climb",
        duration: "3:00",
        variables: {
            speed: {
                type: "linear",
                start: "3.5",
                end: "5",
            },
            incline: {
                type: "steady",
                start: "2",
            },
        },
    };
}

test(
    "protocol-structure-controller",
    "deletes an unrelated block without closing the active editor",
    () => {
        const protocolModel = createProtocolModelFake();
        const editorState = createEditorStateFake();

        editorState.openBlockDraft("block-1", createEditDraft());

        const result = requestDeleteBlock(protocolModel, editorState, "block-3");

        assertDeepEqual(result, { outcome: "proceed" });

        assertDeepEqual(protocolModel.calls.removeBlock, ["block-3"]);

        assertEqual(editorState.calls.closeBlockDraft, 0);
    },
);

test(
    "protocol-structure-controller",
    "deletes the active clean block after closing its editor",
    () => {
        const protocolModel = createProtocolModelFake();
        const editorState = createEditorStateFake();

        editorState.openBlockDraft("block-1", createEditDraft());

        const result = requestDeleteBlock(protocolModel, editorState, "block-1");

        assertDeepEqual(result, { outcome: "proceed" });

        assertEqual(editorState.calls.closeBlockDraft, 1);

        assertDeepEqual(protocolModel.calls.removeBlock, ["block-1"]);
    },
);

test(
    "protocol-structure-controller",
    "blocks deletion of the active block when its draft is dirty",
    () => {
        const protocolModel = createProtocolModelFake();
        const editorState = createEditorStateFake();

        editorState.openBlockDraft("block-1", createEditDraft());

        editorState.updateBlockDraft({
            name: "Changed",
        });

        const result = requestDeleteBlock(protocolModel, editorState, "block-1");

        assertDeepEqual(result, {
            outcome: "blocked",
            reason: "dirty-draft",
        });

        assertEqual(editorState.calls.closeBlockDraft, 0);

        assertDeepEqual(protocolModel.calls.removeBlock, []);
    },
);

test(
    "protocol-structure-controller",
    "deletes an unrelated phase without closing the active block editor",
    () => {
        const protocolModel = createProtocolModelFake();
        const editorState = createEditorStateFake();

        editorState.openBlockDraft("block-1", createEditDraft());

        const result = requestDeletePhase(protocolModel, editorState, "phase-2");

        assertDeepEqual(result, { outcome: "proceed" });

        assertEqual(editorState.calls.closeBlockDraft, 0);

        assertDeepEqual(protocolModel.calls.removePhase, ["phase-2"]);
    },
);

test(
    "protocol-structure-controller",
    "deletes a phase containing a clean active block after closing its editor",
    () => {
        const protocolModel = createProtocolModelFake();
        const editorState = createEditorStateFake();

        editorState.openBlockDraft("block-1", createEditDraft());

        const result = requestDeletePhase(protocolModel, editorState, "phase-1");

        assertDeepEqual(result, { outcome: "proceed" });

        assertEqual(editorState.calls.closeBlockDraft, 1);

        assertDeepEqual(protocolModel.calls.removePhase, ["phase-1"]);
    },
);

test(
    "protocol-structure-controller",
    "blocks deletion of a phase containing a dirty active block",
    () => {
        const protocolModel = createProtocolModelFake();
        const editorState = createEditorStateFake();

        editorState.openBlockDraft("block-1", createEditDraft());

        editorState.updateBlockDraft({
            name: "Changed",
        });

        const result = requestDeletePhase(protocolModel, editorState, "phase-1");

        assertDeepEqual(result, {
            outcome: "blocked",
            reason: "dirty-draft",
        });

        assertEqual(editorState.calls.closeBlockDraft, 0);

        assertDeepEqual(protocolModel.calls.removePhase, []);
    },
);
