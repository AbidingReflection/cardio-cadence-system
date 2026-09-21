import {
    test,
    assertEqual,
    assertDeepEqual,
} from "/packages/js-testing/framework/test-framework.js";

import { EditorState } from "../../../state/editor-state.js";

test("editor-state-validation", "sets validation errors", () => {
    const state = new EditorState();

    const errors = [
        {
            scope: "block",
            entityId: "block-1",
            field: "durationSeconds",
            message: "Duration must be greater than zero.",
        },
    ];

    state.setValidationErrors(errors);

    assertDeepEqual(state.getSnapshot().validationErrors, errors);
});

test("editor-state-validation", "isolates validation errors from source data", () => {
    const state = new EditorState();

    const errors = [
        {
            scope: "block",
            entityId: "block-1",
            field: "durationSeconds",
            message: "Duration must be greater than zero.",
        },
    ];

    state.setValidationErrors(errors);

    errors[0].message = "Changed";

    assertEqual(
        state.getSnapshot().validationErrors[0].message,
        "Duration must be greater than zero.",
    );
});

test("editor-state-validation", "returns independent validation error snapshots", () => {
    const state = new EditorState();

    state.setValidationErrors([
        {
            scope: "block",
            entityId: "block-1",
            field: "durationSeconds",
            message: "Duration must be greater than zero.",
        },
    ]);

    const snapshot = state.getSnapshot();

    snapshot.validationErrors[0].message = "Changed";

    assertEqual(
        state.getSnapshot().validationErrors[0].message,
        "Duration must be greater than zero.",
    );
});

test("editor-state-validation", "emits when validation errors change", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.setValidationErrors([
        {
            scope: "block",
            entityId: "block-1",
            field: "durationSeconds",
            message: "Duration must be greater than zero.",
        },
    ]);

    assertEqual(notificationCount, 1);
});

test("editor-state-validation", "does not emit when validation errors are unchanged", () => {
    const state = new EditorState();

    const errors = [
        {
            scope: "block",
            entityId: "block-1",
            field: "durationSeconds",
            message: "Duration must be greater than zero.",
        },
    ];

    state.setValidationErrors(errors);

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.setValidationErrors(structuredClone(errors));

    assertEqual(notificationCount, 0);
});

test("editor-state-validation", "validation error comparison ignores object key order", () => {
    const state = new EditorState();

    state.setValidationErrors([
        {
            scope: "block",
            entityId: "block-1",
            field: "durationSeconds",
            message: "Duration must be greater than zero.",
        },
    ]);

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.setValidationErrors([
        {
            message: "Duration must be greater than zero.",
            field: "durationSeconds",
            entityId: "block-1",
            scope: "block",
        },
    ]);

    assertEqual(notificationCount, 0);
});

test("editor-state-validation", "clears validation errors", () => {
    const state = new EditorState();

    state.setValidationErrors([
        {
            scope: "block",
            entityId: "block-1",
            field: "durationSeconds",
            message: "Duration must be greater than zero.",
        },
    ]);

    state.clearValidationErrors();

    assertDeepEqual(state.getSnapshot().validationErrors, []);
});

test("editor-state-validation", "clearing validation errors emits once", () => {
    const state = new EditorState();

    state.setValidationErrors([
        {
            scope: "block",
            entityId: "block-1",
            field: "durationSeconds",
            message: "Duration must be greater than zero.",
        },
    ]);

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.clearValidationErrors();

    assertEqual(notificationCount, 1);
});

test("editor-state-validation", "clearing empty validation errors does not emit", () => {
    const state = new EditorState();

    let notificationCount = 0;

    state.subscribe(() => {
        notificationCount += 1;
    });

    state.clearValidationErrors();

    assertEqual(notificationCount, 0);
});
