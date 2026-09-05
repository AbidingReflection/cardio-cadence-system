import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";
import { createBlockElement } from "../../../renderers/protocol/block-renderer.js";
import { createPhaseElement } from "../../../renderers/protocol/phase-renderer.js";

test(
    "protocol-structure-renderers",
    "phase manage mode keeps phase cards draggable but out of the tab order",
    () => {
        const phase = {
            id: "phase-1",
            name: "Warm-up",
            blocks: [],
        };

        const editorSnapshot = {
            editMode: "phase",
            expandedPhaseIds: [],
            selectedPhaseId: undefined,
            selectedBlockId: undefined,
            editingPhaseId: undefined,
            phaseNameDraft: undefined,
        };

        const element = createPhaseElement(phase, 0, editorSnapshot, { variables: [] }, {});

        assertEqual(element.hasAttribute("tabindex"), false);
        assertEqual(element.dataset.structuralItem, "phase");
        assertEqual(element.draggable, true);
    },
);

test(
    "protocol-structure-renderers",
    "block manage mode keeps block cards draggable but out of the tab order",
    () => {
        const block = {
            id: "block-1",
            name: "Steady",
            durationSeconds: 60,
            variables: {},
        };

        const editorSnapshot = {
            editMode: "block",
            expandedBlockId: undefined,
            selectedBlockId: undefined,
        };

        const element = createBlockElement(block, editorSnapshot, { variables: [] }, {});

        assertEqual(element.hasAttribute("tabindex"), false);
        assertEqual(element.dataset.structuralItem, "block");
        assertEqual(element.draggable, true);
    },
);
