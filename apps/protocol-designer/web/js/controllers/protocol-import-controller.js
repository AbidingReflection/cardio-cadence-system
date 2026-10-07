import { ActivityType } from "/packages/protocol-core/models/activity-type.js";
import { CalibrationProfile } from "/packages/protocol-core/models/calibration-profile.js";
import { MachineProfile } from "/packages/protocol-core/models/machine-profile.js";

/**
 * Coordinates importing a self-contained protocol bundle into the Protocol Designer.
 */
export class ProtocolImportController {
    #protocolModel;
    #editorState;
    #protocolSessionState;
    #preferences;

    /** Creates a controller for importing protocol bundles. */
    constructor({ protocolModel, editorState, protocolSessionState, preferences }) {
        this.#protocolModel = protocolModel;
        this.#editorState = editorState;
        this.#protocolSessionState = protocolSessionState;
        this.#preferences = preferences;
    }

    /** Imports one self-contained protocol bundle into the current editor session. */
    importProtocolBundle(protocolBundle) {
        const activityType = new ActivityType(protocolBundle.activityType);

        const machineProfile =
            protocolBundle.machineProfile === null
                ? undefined
                : new MachineProfile(protocolBundle.machineProfile, activityType);

        const calibrationProfile =
            protocolBundle.calibrationProfile === null
                ? undefined
                : new CalibrationProfile(protocolBundle.calibrationProfile, machineProfile);

        this.#protocolModel.replaceProtocol(
            protocolBundle.protocol,
            activityType,
            machineProfile,
            calibrationProfile,
        );

        this.#editorState.resetProtocolSession();
        this.#editorState.clearProtocolPersistenceIdentity();

        this.#protocolSessionState.setBaseline(this.#protocolModel.getSnapshot());

        this.#preferences.setLastSetupContext({
            activityType,
            machineProfile,
            calibrationProfile,
        });

        this.#preferences.clearLastProtocolFamilyId();
    }
}
