/**
 * Orchestrates creation of a new unsaved protocol from the current setup context.
 */

export class ProtocolNewController {
    #protocolModel;
    #editorState;
    #protocolSessionState;
    #preferences;

    /** Creates a New Protocol controller for the supplied model and editor state. */
    constructor({ protocolModel, editorState, protocolSessionState, preferences }) {
        this.#protocolModel = protocolModel;
        this.#editorState = editorState;
        this.#protocolSessionState = protocolSessionState;
        this.#preferences = preferences;
    }

    /** Resets the current protocol to an empty unsaved protocol using the current setup. */
    newProtocol() {
        const setupContext = this.#protocolModel.getSetupContext();

        this.#protocolModel.resetProtocol(setupContext);
        this.#editorState.resetProtocolSession();

        this.#protocolSessionState.setBaseline(this.#protocolModel.getSnapshot());
        this.#preferences.clearLastProtocolFamilyId();
    }
}
