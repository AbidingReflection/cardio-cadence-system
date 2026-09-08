import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { wireProtocolBlockEvents } from "../../../interactions/protocol-block-events.js";
import { EditorState } from "../../../state/editor-state.js";

const ACTIVITY_TYPE = {
    id: "treadmill",
    name: "Treadmill",
    variables: [
        {
            id: "speed",
            name: "Speed",
            unit: "MPH",
            role: "pace",
        },
        {
            id: "incline",
            name: "Incline",
            unit: "%",
            role: "load",
        },
    ],
};

/** Creates a block-edit interaction harness. */
function createBlockHarness() {
    const protocolTree = document.createElement("div");
    const blockElement = document.createElement("div");
    const editorState = new EditorState();

    blockElement.dataset.blockId = "block-1";
    protocolTree.append(blockElement);

    editorState.startBlockDraft({
        mode: "edit",
        phaseId: "phase-1",
        blockId: "block-1",
        name: "Block 1",
        duration: "10:00",
        variables: {
            speed: {
                type: "steady",
                start: "1",
            },
            incline: {
                type: "steady",
                start: "1",
            },
        },
    });

    wireProtocolBlockEvents({
        protocolTree,
        protocolModel: createProtocolModelStub(),
        editorState,
        setPendingFieldFocus: () => {},
        setPendingToggleFocus: () => {},
    });

    return {
        protocolTree,
        blockElement,
        editorState,
    };
}

/** Creates an input field used by delegated block-editor event tests. */
function createField({ type, field, value }) {
    const input = document.createElement("input");

    input.type = type;
    input.dataset.field = field;
    input.value = value;

    return input;
}

/** Creates the minimal protocol model API required by block interactions. */
function createProtocolModelStub() {
    return {
        getSetupContext() {
            return {
                activityType: ACTIVITY_TYPE,
            };
        },
    };
}

test("protocol-block-events", "ignores number fields on input events", () => {
    const { blockElement, editorState } = createBlockHarness();

    const field = createField({
        type: "number",
        field: "variables.speed.start",
        value: "2.5",
    });

    blockElement.append(field);

    field.dispatchEvent(
        new Event("input", {
            bubbles: true,
        }),
    );

    assertEqual(editorState.getSnapshot().activeBlockDraft.variables.speed.start, "1");
});

test("protocol-block-events", "updates number fields on change events", () => {
    const { blockElement, editorState } = createBlockHarness();

    const field = createField({
        type: "number",
        field: "variables.speed.start",
        value: "2.5",
    });

    blockElement.append(field);

    field.dispatchEvent(
        new Event("change", {
            bubbles: true,
        }),
    );

    assertEqual(editorState.getSnapshot().activeBlockDraft.variables.speed.start, "2.5");
});

test("protocol-block-events", "updates text fields on input events", () => {
    const { blockElement, editorState } = createBlockHarness();

    const field = createField({
        type: "text",
        field: "name",
        value: "Updated Block",
    });

    blockElement.append(field);

    field.dispatchEvent(
        new Event("input", {
            bubbles: true,
        }),
    );

    assertEqual(editorState.getSnapshot().activeBlockDraft.name, "Updated Block");
});

test("protocol-block-events", "updates select fields on change events", () => {
    const { blockElement, editorState } = createBlockHarness();

    const select = document.createElement("select");
    select.dataset.field = "variables.speed.type";

    const steady = document.createElement("option");
    steady.value = "steady";
    steady.textContent = "Steady";

    const stepped = document.createElement("option");
    stepped.value = "stepped";
    stepped.textContent = "Stepped";

    select.append(steady, stepped);
    select.value = "stepped";

    blockElement.append(select);

    select.dispatchEvent(
        new Event("change", {
            bubbles: true,
        }),
    );

    assertEqual(editorState.getSnapshot().activeBlockDraft.variables.speed.type, "stepped");
});
