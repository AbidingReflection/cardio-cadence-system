/**
 * Verifies delegated structural protocol-tree interactions.
 */

import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { wireProtocolStructureEvents } from "../../../interactions/structure/events.js";
import { EditorState } from "../../../state/editor-state.js";
import { createProtocolModelFake } from "../../helpers/protocol-model-fake.js";

const ELLIPTICAL_ACTIVITY_TYPE = {
    variables: [
        {
            id: "cadence",
        },
        {
            id: "resistance",
        },
    ],
};

const TREADMILL_ACTIVITY_TYPE = {
    variables: [
        {
            id: "speed",
        },
        {
            id: "incline",
        },
    ],
};

/** Creates a protocol tree with structural interactions wired. */
function createStructureHarness(activityType = ELLIPTICAL_ACTIVITY_TYPE) {
    const protocolTree = document.createElement("div");
    const protocolModel = createProtocolModelFake();
    const editorState = new EditorState();

    let currentActivityType = activityType;
    let pendingFieldFocus;
    let pendingPhaseNameFocus;
    let pendingStructuralFocus;

    protocolModel.getSetupContext = () => ({
        activityType: currentActivityType,
        machineProfile: undefined,
        calibrationProfile: undefined,
    });

    wireProtocolStructureEvents({
        protocolTree,
        protocolModel,
        editorState,

        setPendingFieldFocus: (focusContext) => {
            pendingFieldFocus = focusContext;
        },

        setPendingPhaseNameFocus: (focusContext) => {
            pendingPhaseNameFocus = focusContext;
        },

        setPendingStructuralFocus: (focusContext) => {
            pendingStructuralFocus = focusContext;
        },
    });

    return {
        protocolTree,
        protocolModel,
        editorState,

        setCurrentActivityType(activityType) {
            currentActivityType = activityType;
        },

        getPendingFieldFocus() {
            return pendingFieldFocus;
        },

        getPendingPhaseNameFocus() {
            return pendingPhaseNameFocus;
        },

        getPendingStructuralFocus() {
            return pendingStructuralFocus;
        },
    };
}

/** Creates and clicks a block insertion action. */
function clickInsertBlock(protocolTree, phaseId, index) {
    const button = document.createElement("button");

    button.dataset.action = "insert-block";
    button.dataset.phaseId = phaseId;
    button.dataset.insertionIndex = String(index);

    protocolTree.append(button);

    button.click();
}

test(
    "protocol-structure-events",
    "block insertion uses the current ActivityType from protocol setup context",
    () => {
        const harness = createStructureHarness(ELLIPTICAL_ACTIVITY_TYPE);

        harness.setCurrentActivityType(TREADMILL_ACTIVITY_TYPE);

        clickInsertBlock(harness.protocolTree, "phase-1", 1);

        const draft = harness.editorState.getSnapshot().activeBlockDraft;

        assertDeepEqual(draft, {
            mode: "create",
            phaseId: "phase-1",
            name: "",
            duration: "",

            variables: {
                speed: {
                    type: "steady",
                    start: "",
                },

                incline: {
                    type: "steady",
                    start: "",
                },
            },
        });
    },
);

test("protocol-structure-events", "block insertion records the selected structural target", () => {
    const harness = createStructureHarness(TREADMILL_ACTIVITY_TYPE);

    clickInsertBlock(harness.protocolTree, "phase-2", 1);

    const snapshot = harness.editorState.getSnapshot();

    assertDeepEqual(snapshot.insertionTarget, {
        type: "block",
        phaseId: "phase-2",
        index: 1,
    });
});

test(
    "protocol-structure-events",
    "block insertion clears pending field focus after draft creation",
    () => {
        const harness = createStructureHarness(TREADMILL_ACTIVITY_TYPE);

        clickInsertBlock(harness.protocolTree, "phase-1", 0);

        assertEqual(harness.getPendingFieldFocus(), undefined);
    },
);
