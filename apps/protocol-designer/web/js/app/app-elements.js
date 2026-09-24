/** Collects and validates DOM elements required by the Protocol Designer. */

/** Returns the required Protocol Designer DOM elements grouped by responsibility. */
export function getAppElements() {
    return {
        protocol: {
            pane: requireElement(".protocol-pane"),
            tree: requireElement("#protocol-tree"),
            editPhaseButton: requireElement("#manage-phases-button"),
            editBlockButton: requireElement("#manage-blocks-button"),
            activityTypeName: requireElement("#protocol-activity-type-name"),
            machineProfileName: requireElement("#protocol-machine-profile-name"),
        },

        graphs: {
            cadence: {
                container: requireElement("#cadence-graph"),
                pane: requireElement(".graph-pane--cadence"),
                toggleButton: requireElement('[data-graph-toggle="cadence"]'),
            },
            load: {
                container: requireElement("#load-graph"),
                pane: requireElement(".graph-pane--load"),
                toggleButton: requireElement('[data-graph-toggle="load"]'),
            },
            calorieRate: {
                container: requireElement("#calorie-rate-graph"),
                pane: requireElement(".graph-pane--calorie-rate"),
                toggleButton: requireElement('[data-graph-toggle="calorie-rate"]'),
            },
            cumulativeCalories: {
                container: requireElement("#cumulative-calories-graph"),
                pane: requireElement(".graph-pane--cumulative-calories"),
                toggleButton: requireElement('[data-graph-toggle="cumulative-calories"]'),
            },
        },

        new: {
            button: requireElement("#protocol-new-button"),
        },

        save: {
            button: requireElement("#protocol-save-button"),
            menuButton: requireElement("#protocol-save-menu-button"),
            menu: requireElement("#protocol-save-menu"),
            saveAsButton: requireElement("#protocol-save-as-button"),
            renameButton: requireElement("#protocol-rename-button"),

            dialog: requireElement("#protocol-save-dialog"),
            title: requireElement("#protocol-save-dialog-title"),
            description: requireElement("#protocol-save-dialog-description"),
            closeButton: requireElement("#protocol-save-close-button"),
            cancelButton: requireElement("#protocol-save-cancel-button"),
            confirmButton: requireElement("#protocol-save-confirm-button"),
            displayNameInput: requireElement("#protocol-save-display-name"),
            nameHint: requireElement("#protocol-save-name-hint"),
            changeSummaryField: requireElement("#protocol-save-change-summary-field"),
            changeSummaryInput: requireElement("#protocol-save-change-summary"),
        },

        open: {
            button: requireElement("#protocol-open-button"),
            dialog: requireElement("#protocol-open-dialog"),
            closeButton: requireElement("#protocol-open-close-button"),
            cancelButton: requireElement("#protocol-open-cancel-button"),
            confirmButton: requireElement("#protocol-open-confirm-button"),
            protocolTableContainer: requireElement("#protocol-open-table"),
        },

        setup: {
            button: requireElement("#protocol-setup-button"),
            dialog: requireElement("#protocol-setup-dialog"),
            closeButton: requireElement("#protocol-setup-close-button"),
            cancelButton: requireElement("#protocol-setup-cancel-button"),
            applyButton: requireElement("#protocol-setup-apply-button"),
            activityTypeSelect: requireElement("#protocol-setup-activity-type"),
            machineProfileSelect: requireElement("#protocol-setup-machine-profile"),
            calibrationProfileSelect: requireElement("#protocol-setup-calibration-profile"),
        },
    };
}

/** Returns a required element or throws when it cannot be found. */
function requireElement(selector, root = document) {
    const element = root.querySelector(selector);

    if (element === null) {
        throw new Error(`Required element "${selector}" was not found.`);
    }

    return element;
}
