/**
 * Owns transient Protocol Designer UI state and notifies subscribers when it changes.
 */

import { deepEqual } from "/packages/utils/deep-equal.js";

export class EditorState {
    #expandedPhaseIds = new Set();
    #expandedBlockId;
    #listeners = new Set();

    #editingPhaseId;
    #phaseNameDraft;

    #activeBlockDraft;
    #blockDraftBaseline;
    #validationErrors = [];
    #pendingInsertion;

    /** Returns a defensive snapshot of the current editor state. */
    getSnapshot() {
        return {
            expandedPhaseIds: [...this.#expandedPhaseIds],
            expandedBlockId: this.#expandedBlockId,

            editingPhaseId: this.#editingPhaseId,
            phaseNameDraft: this.#phaseNameDraft,

            activeBlockDraft:
            this.#activeBlockDraft === undefined
            ? undefined
            : structuredClone(this.#activeBlockDraft),

            validationErrors: structuredClone(this.#validationErrors),

            pendingInsertion:
            this.#pendingInsertion === undefined
            ? undefined
            : structuredClone(this.#pendingInsertion),
        };
    }

    /** Subscribes to editor-state changes and returns an unsubscribe function. */
    subscribe(listener) {
        this.#listeners.add(listener);

        return () => {
            this.#listeners.delete(listener);
        };
    }

    /** Expands a phase by ID. */
    expandPhase(phaseId) {
        if (this.#expandedPhaseIds.has(phaseId)) {
            return;
        }

        this.#expandedPhaseIds.add(phaseId);
        this.#emit();
    }

    /** Collapses a phase by ID. */
    collapsePhase(phaseId) {
        if (!this.#expandedPhaseIds.delete(phaseId)) {
            return;
        }

        this.#emit();
    }

    /** Toggles a phase's expanded state. */
    togglePhase(phaseId) {
        if (this.#expandedPhaseIds.has(phaseId)) {
            this.#expandedPhaseIds.delete(phaseId);
        } else {
            this.#expandedPhaseIds.add(phaseId);
        }

        this.#emit();
    }

    /** Expands a block by ID. */
    expandBlock(blockId) {
        if (this.#expandedBlockId === blockId) {
            return;
        }

        this.#expandedBlockId = blockId;
        this.#emit();
    }

    /** Collapses the currently expanded block. */
    collapseBlock() {
        if (this.#expandedBlockId === undefined) {
            return;
        }

        this.#expandedBlockId = undefined;
        this.#emit();
    }

    /** Starts editing a phase name from its committed value. */
    startPhaseNameEdit(phaseId, name) {
        this.#editingPhaseId = phaseId;
        this.#phaseNameDraft = name;

        this.#emit();
    }

    /** Updates the active phase-name draft. */
    updatePhaseNameDraft(name) {
        if (this.#editingPhaseId === undefined) {
            throw new Error(
                "Cannot update phase name because no phase-name edit is active.",
            );
        }

        if (this.#phaseNameDraft === name) {
            return;
        }

        this.#phaseNameDraft = name;

        this.#emit();
    }

    /** Closes the active phase-name edit and discards its draft state. */
    closePhaseNameEdit() {
        if (this.#editingPhaseId === undefined) {
            return;
        }

        this.#editingPhaseId = undefined;
        this.#phaseNameDraft = undefined;

        this.#emit();
    }

    /** Starts a block draft and records its initial baseline. */
    startBlockDraft(draft) {
        this.#activeBlockDraft = structuredClone(draft);
        this.#blockDraftBaseline = structuredClone(draft);

        this.#emit();
    }

    /** Updates the active block draft. */
    updateBlockDraft(updates) {
        if (this.#activeBlockDraft === undefined) {
            throw new Error("Cannot update block draft because no block draft is active.");
        }

        this.#activeBlockDraft = {
            ...this.#activeBlockDraft,
            ...structuredClone(updates),
        };

        this.#emit();
    }

    /** Returns whether the active block draft differs from its baseline. */
    isBlockDraftDirty() {
        if (this.#activeBlockDraft === undefined || this.#blockDraftBaseline === undefined) {
            return false;
        }

        return !deepEqual(this.#activeBlockDraft, this.#blockDraftBaseline);
    }

    /** Discards the active block draft and its baseline. */
    cancelBlockDraft() {
        if (this.#activeBlockDraft === undefined) {
            return;
        }

        this.#activeBlockDraft = undefined;
        this.#blockDraftBaseline = undefined;

        this.#emit();
    }

    /** Replaces the current validation errors. */
    setValidationErrors(errors) {
        if (deepEqual(this.#validationErrors, errors)) {
            return;
        }

        this.#validationErrors = structuredClone(errors);
        this.#emit();
    }

    /** Clears all validation errors. */
    clearValidationErrors() {
        if (this.#validationErrors.length === 0) {
            return;
        }

        this.#validationErrors = [];
        this.#emit();
    }

    /** Sets the pending insertion target. */
    setPendingInsertion(insertion) {
        if (deepEqual(this.#pendingInsertion, insertion)) {
            return;
        }

        this.#pendingInsertion = structuredClone(insertion);
        this.#emit();
    }

    /** Clears the pending insertion target. */
    clearPendingInsertion() {
        if (this.#pendingInsertion === undefined) {
            return;
        }

        this.#pendingInsertion = undefined;
        this.#emit();
    }

    /** Opens a block editor with a new active draft. */
    openBlockDraft(blockId, draft) {
        this.#expandedBlockId = blockId;

        this.#activeBlockDraft = structuredClone(draft);

        this.#blockDraftBaseline = structuredClone(draft);

        this.#validationErrors = [];

        this.#emit();
    }

    /** Closes the active block editor and clears its draft state. */
    closeBlockDraft() {
        this.#expandedBlockId = undefined;
        this.#activeBlockDraft = undefined;
        this.#blockDraftBaseline = undefined;
        this.#validationErrors = [];

        this.#emit();
    }

    /** Notifies all subscribers with the current editor-state snapshot. */
    #emit() {
        const snapshot = this.getSnapshot();

        for (const listener of this.#listeners) {
            listener(snapshot);
        }
    }
}
