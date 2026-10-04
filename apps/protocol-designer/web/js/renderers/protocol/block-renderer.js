/**
 * Renders committed and newly created block cards, collapsed block summaries,
 * and block-level structural controls.
 */
import {
  createCopyActionButton,
  createDeleteActionButton,
} from "./protocol-action-buttons.js";

import { createExpandedBlock } from "./block-editor-renderer.js";
import { formatDurationCompact } from "../../../../packages/utils/format-duration.js";

/** Creates a block card. */
export function createBlockElement(
  block,
  editorSnapshot,
  activityType,
  machineProfile,
  calibrationProfile,
  statusContext,
) {
  const isExpanded = editorSnapshot.expandedBlockId === block.id;
  const isSelected = editorSnapshot.selectedBlockId === block.id;
  const blockStatus = statusContext.blockStatusById.get(block.id);

  const blockElement = document.createElement("article");

  blockElement.className = [
    "block-card",
    isExpanded ? "block-card--expanded" : undefined,
    isSelected ? "block-card--selected" : undefined,
    blockStatus?.severity === "error" ? "block-card--error" : undefined,
    blockStatus?.severity === "warning" ? "block-card--warning" : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  blockElement.dataset.blockId = block.id;
  blockElement.dataset.structuralSelectable = "true";
  blockElement.setAttribute("aria-selected", String(isSelected));

  if (editorSnapshot.editMode === "block") {
    blockElement.dataset.structuralItem = "block";
    blockElement.draggable = true;
  }

  if (isExpanded) {
    blockElement.append(
      createExpandedBlock(
        block,
        editorSnapshot,
        activityType,
        machineProfile,
        calibrationProfile,
      ),
    );
  } else {
    blockElement.append(
      createCollapsedBlock(block, activityType, editorSnapshot),
    );
  }

  return blockElement;
}

/** Creates the expanded editor for an uncommitted new block. */
export function createNewBlockElement(
  editorSnapshot,
  activityType,
  machineProfile,
  calibrationProfile,
) {
  const draft = editorSnapshot.activeBlockDraft;
  const blockId = editorSnapshot.expandedBlockId;

  if (draft?.mode !== "create" || blockId === undefined) {
    throw new Error(
      "Cannot render a new block without an active create draft.",
    );
  }

  const block = {
    id: blockId,
    name: draft.name || "New Block",
  };

  const blockElement = document.createElement("article");
  blockElement.className = "block-card block-card--expanded";
  blockElement.dataset.blockId = block.id;
  blockElement.append(
    createExpandedBlock(
      block,
      editorSnapshot,
      activityType,
      machineProfile,
      calibrationProfile,
    ),
  );

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
    nameActions.append(
      createCopyActionButton({
        className: "block-copy-action",
        action: "copy-block",
        ariaLabel: `Copy ${block.name} block`,
        data: {
          blockId: block.id,
        },
      }),
      createDeleteActionButton({
        className: "block-delete-action",
        action: "delete-block",
        ariaLabel: `Delete ${block.name} block`,
        data: {
          blockId: block.id,
        },
      }),
    );
  }

  const duration = document.createElement("span");
  duration.textContent = formatDurationCompact(block.durationSeconds);

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

/** Creates a span containing display text. */
function createTextSpan(value) {
  const span = document.createElement("span");
  span.textContent = String(value);

  return span;
}
