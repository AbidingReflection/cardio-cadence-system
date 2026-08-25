import {
    test,
    assertEqual,
    assertDeepEqual,
    assertThrows,
} from "/packages/js-testing/framework/test-framework.js";

import {
    requestDeleteBlock,
    requestDeletePhase,
    requestMoveBlock,
    requestMovePhase,
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

test(
    "protocol-structure-controller",
    "moves an unrelated block without closing the active editor",
    () => {
        const protocolModel = createProtocolModelFake();
        const editorState = createEditorStateFake();

        editorState.openBlockDraft("block-1", createEditDraft());

        const result = requestMoveBlock(protocolModel, editorState, "block-2", "phase-1", 0);

        assertDeepEqual(result, {
            outcome: "proceed",
        });

        assertDeepEqual(protocolModel.calls.moveBlock, [
            {
                blockId: "block-2",
                targetPhaseId: "phase-1",
                targetIndex: 0,
            },
        ]);

        assertEqual(editorState.getSnapshot().expandedBlockId, "block-1");
    },
);

test(
    "protocol-structure-controller",
    "moves the active clean block without closing its editor",
    () => {
        const protocolModel = createProtocolModelFake();
        const editorState = createEditorStateFake();

        editorState.openBlockDraft("block-1", createEditDraft());

        const result = requestMoveBlock(protocolModel, editorState, "block-1", "phase-1", 1);

        assertDeepEqual(result, {
            outcome: "proceed",
        });

        assertDeepEqual(protocolModel.calls.moveBlock, [
            {
                blockId: "block-1",
                targetPhaseId: "phase-1",
                targetIndex: 1,
            },
        ]);

        assertEqual(editorState.getSnapshot().expandedBlockId, "block-1");

        assertEqual(editorState.calls.closeBlockDraft, 0);
    },
);

test(
    "protocol-structure-controller",
    "blocks moving the active block when its draft is dirty",
    () => {
        const protocolModel = createProtocolModelFake();
        const editorState = createEditorStateFake();

        editorState.openBlockDraft("block-1", createEditDraft());

        editorState.updateBlockDraft({
            name: "Dirty Block",
        });

        const result = requestMoveBlock(protocolModel, editorState, "block-1", "phase-1", 1);

        assertDeepEqual(result, {
            outcome: "blocked",
            reason: "dirty-draft",
        });

        assertEqual(protocolModel.calls.moveBlock.length, 0);

        assertEqual(editorState.getSnapshot().expandedBlockId, "block-1");
    },
);

test("protocol-structure-controller", "move block throws without a block ID", () => {
    const protocolModel = createProtocolModelFake();
    const editorState = createEditorStateFake();

    assertThrows(() => {
        requestMoveBlock(protocolModel, editorState, undefined, "phase-1", 0);
    });
});

test(
    "protocol-structure-controller",
    "moves an unrelated phase despite a dirty draft in another phase",
    () => {
        const protocolModel = createProtocolModelFake();
        const editorState = createEditorStateFake();

        editorState.openBlockDraft("block-1", createEditDraft());

        editorState.updateBlockDraft({
            name: "Dirty Block",
        });

        const result = requestMovePhase(protocolModel, editorState, "phase-2", 0);

        assertDeepEqual(result, {
            outcome: "proceed",
        });

        assertDeepEqual(protocolModel.calls.movePhase, [
            {
                phaseId: "phase-2",
                targetIndex: 0,
            },
        ]);

        assertEqual(editorState.getSnapshot().expandedBlockId, "block-1");
    },
);

test(
    "protocol-structure-controller",
    "moves a phase containing a clean active block without closing its editor",
    () => {
        const protocolModel = createProtocolModelFake();
        const editorState = createEditorStateFake();

        editorState.openBlockDraft("block-1", createEditDraft());

        const result = requestMovePhase(protocolModel, editorState, "phase-1", 1);

        assertDeepEqual(result, {
            outcome: "proceed",
        });

        assertDeepEqual(protocolModel.calls.movePhase, [
            {
                phaseId: "phase-1",
                targetIndex: 1,
            },
        ]);

        assertEqual(editorState.getSnapshot().expandedBlockId, "block-1");

        assertEqual(editorState.calls.closeBlockDraft, 0);
    },
);

test(
    "protocol-structure-controller",
    "blocks moving a phase containing a dirty active block",
    () => {
        const protocolModel = createProtocolModelFake();
        const editorState = createEditorStateFake();

        editorState.openBlockDraft("block-1", createEditDraft());

        editorState.updateBlockDraft({
            name: "Dirty Block",
        });

        const result = requestMovePhase(protocolModel, editorState, "phase-1", 1);

        assertDeepEqual(result, {
            outcome: "blocked",
            reason: "dirty-draft",
        });

        assertEqual(protocolModel.calls.movePhase.length, 0);

        assertEqual(editorState.getSnapshot().expandedBlockId, "block-1");
    },
);

test("protocol-structure-controller", "move phase throws without a phase ID", () => {
    const protocolModel = createProtocolModelFake();
    const editorState = createEditorStateFake();

    assertThrows(() => {
        requestMovePhase(protocolModel, editorState, undefined, 0);
    });
});
