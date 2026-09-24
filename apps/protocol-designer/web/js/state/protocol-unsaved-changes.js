/**
 * Evaluates whether the current protocol editor session contains unsaved work.
 */

export class ProtocolUnsavedChanges {
    #protocolModel;
    #editorState;
    #protocolSessionState;

    /** Creates an unsaved-change evaluator for the current protocol session. */
    constructor({ protocolModel, editorState, protocolSessionState }) {
        this.#protocolModel = protocolModel;
        this.#editorState = editorState;
        this.#protocolSessionState = protocolSessionState;
    }

    /** Returns whether committed protocol state or active drafts contain unsaved work. */
    hasUnsavedChanges() {
        if (this.#protocolSessionState.isProtocolDirty(this.#protocolModel.getSnapshot())) {
            return true;
        }

        if (this.#editorState.isBlockDraftDirty()) {
            return true;
        }

        return this.#editorState.isPhaseNameDraftDirty();
    }
}
