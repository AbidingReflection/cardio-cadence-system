/**
 * Renders committed and newly created block cards, collapsed block summaries,
 * and block-level structural controls.
 */

import { createExpandedBlock } from "./block-editor-renderer.js";
import { formatDuration } from "../../../../packages/utils/format-duration.js";

/** Creates a block card. */
export function createBlockElement(block, editorSnapshot, activityType) {
    const isExpanded = editorSnapshot.expandedBlockId === block.id;

    const blockElement = document.createElement("article");
    blockElement.className = isExpanded ? "block-card block-card--expanded" : "block-card";
    blockElement.dataset.blockId = block.id;

    if (isExpanded) {
        blockElement.append(createExpandedBlock(block, editorSnapshot, activityType));
    } else {
        blockElement.append(createCollapsedBlock(block, activityType, editorSnapshot));
    }

    return blockElement;
}

/** Creates the expanded editor for an uncommitted new block. */
export function createNewBlockElement(editorSnapshot, activityType) {
    const draft = editorSnapshot.activeBlockDraft;
    const blockId = editorSnapshot.expandedBlockId;

    if (draft?.mode !== "create" || blockId === undefined) {
        throw new Error("Cannot render a new block without an active create draft.");
    }

    const block = {
        id: blockId,
        name: draft.name || "New Block",
    };

    const blockElement = document.createElement("article");
    blockElement.className = "block-card block-card--expanded";
    blockElement.dataset.blockId = block.id;
    blockElement.append(createExpandedBlock(block, editorSnapshot, activityType));

    return blockElement;
}

/** Creates the collapsed block row. */
function createCollapsedBlock(block, activityType, editorSnapshot) {
    const row = document.createElement("div");

    row.className = "block-row";

    const summary = document.createElement("div");
    summary.className = "block-summary";

    const nameActions = document.createElement("div");
    nameActions.className = "block-name-actions";

    const name = document.createElement("span");
    name.className = "block-name";
    name.textContent = block.name;

    nameActions.append(name);

    if (editorSnapshot.editMode === "block") {
        nameActions.append(createBlockDeleteButton(block));
    }

    const duration = document.createElement("span");
    duration.textContent = formatDuration(block.durationSeconds);

    summary.append(nameActions, duration);

    for (const variable of activityType.variables) {
        const progression = block.variables[variable.id];

        summary.append(
            createTextSpan(progression.type),
            createTextSpan(progression.start),
            createTextSpan(progression.end ?? "—"),
        );
    }

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "block-toggle";
    toggle.dataset.action = "expand-block";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", `Expand ${block.name} block`);
    toggle.textContent = "▼";

    row.append(summary, toggle);

    return row;
}

/** Creates a block delete control. */
function createBlockDeleteButton(block) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "block-delete-action";
    button.dataset.action = "delete-block";
    button.dataset.blockId = block.id;
    button.setAttribute("aria-label", `Delete ${block.name} block`);
    button.textContent = "×";

    return button;
}

/** Creates a span containing display text. */
function createTextSpan(value) {
    const span = document.createElement("span");
    span.textContent = String(value);

    return span;
}
