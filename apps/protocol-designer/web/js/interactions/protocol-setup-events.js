/**
 * Wires Protocol Setup dialog interactions and local draft selection state.
 */
export function wireProtocolSetupEvents({
    setupButton,
    setupDialog,
    closeButton,
    cancelButton,
    applyButton,
    activityTypeSelect,
    machineProfileSelect,
    calibrationProfileSelect,
    domainData,
    protocolModel,
}) {
    setupButton.addEventListener("click", () => {
        initializeDialog();
        setupDialog.showModal();
    });

    closeButton.addEventListener("click", () => {
        setupDialog.close();
    });

    cancelButton.addEventListener("click", () => {
        setupDialog.close();
    });

    activityTypeSelect.addEventListener("change", () => {
        populateMachineProfiles(activityTypeSelect.value);

        machineProfileSelect.value = "";
        calibrationProfileSelect.value = "";

        populateCalibrationProfiles(undefined);
        updateApplyState();
    });

    machineProfileSelect.addEventListener("change", () => {
        const machineProfileId = machineProfileSelect.value || undefined;

        populateCalibrationProfiles(machineProfileId);
        calibrationProfileSelect.value = "";

        updateApplyState();
    });

    calibrationProfileSelect.addEventListener("change", updateApplyState);

    function initializeDialog() {
        const protocol = protocolModel.getSnapshot();

        populateActivityTypes();

        activityTypeSelect.value = protocol.activityTypeId;

        populateMachineProfiles(protocol.activityTypeId);
        machineProfileSelect.value = protocol.machineProfileId ?? "";

        populateCalibrationProfiles(protocol.machineProfileId);
        calibrationProfileSelect.value = protocol.calibrationProfileId ?? "";

        updateApplyState();
    }

    function populateActivityTypes() {
        activityTypeSelect.replaceChildren();

        for (const activityType of domainData.activityTypes.values()) {
            activityTypeSelect.append(new Option(activityType.name, activityType.id));
        }
    }

    function populateMachineProfiles(activityTypeId) {
        machineProfileSelect.replaceChildren(new Option("No machine profile", ""));

        for (const machineProfile of domainData.machineProfiles.values()) {
            if (machineProfile.activityTypeId !== activityTypeId) {
                continue;
            }

            machineProfileSelect.append(new Option(machineProfile.name, machineProfile.id));
        }
    }

    function populateCalibrationProfiles(machineProfileId) {
        calibrationProfileSelect.replaceChildren(new Option("No calibration profile", ""));

        if (machineProfileId === undefined) {
            calibrationProfileSelect.disabled = true;

            return;
        }

        calibrationProfileSelect.disabled = false;

        for (const calibrationProfile of domainData.calibrationProfiles.values()) {
            if (calibrationProfile.machineProfileId !== machineProfileId) {
                continue;
            }

            calibrationProfileSelect.append(
                new Option(calibrationProfile.name, calibrationProfile.id),
            );
        }
    }

    function updateApplyState() {
        const protocol = protocolModel.getSnapshot();

        const activityTypeChanged = activityTypeSelect.value !== protocol.activityTypeId;

        const machineProfileChanged =
            (machineProfileSelect.value || undefined) !== protocol.machineProfileId;

        const calibrationProfileChanged =
            (calibrationProfileSelect.value || undefined) !== protocol.calibrationProfileId;

        applyButton.disabled =
            !activityTypeChanged && !machineProfileChanged && !calibrationProfileChanged;
    }
}
