/** Wires Protocol Designer user interactions to application state and controllers. */

import {
    toggleProtocolManageMode,
    wireProtocolManageKeyboardEvents,
} from "../interactions/protocol-manage-keyboard-events.js";
import { wireProtocolOpenEvents } from "../interactions/protocol-open-events.js";
import { wireProtocolSaveEvents } from "../interactions/protocol-save-events.js";
import { wireProtocolSaveMenuEvents } from "../interactions/protocol-save-menu-events.js";
import { wireProtocolSetupEvents } from "../interactions/protocol-setup-events.js";
import { wireProtocolTreeEvents } from "../interactions/protocol-tree-events.js";
import { wireProtocolNewEvents } from "../interactions/protocol-new-events.js";

/** Wires Protocol Designer interaction handlers. */
export function wireInteractions({
    elements,
    protocolModel,
    editorState,
    domainData,
    persistenceContext,
    protocolPersistenceController,
    protocolOpenController,
    protocolNewController,
    protocolUnsavedChanges,
    setPendingFieldFocus,
    setPendingToggleFocus,
    setPendingPhaseNameFocus,
    setPendingStructuralFocus,
}) {
    wireProtocolNewEvents({
        newButton: elements.new.button,
        protocolNewController,
        protocolUnsavedChanges,
    });

    wireProtocolSaveMenuEvents({
        saveMenuButton: elements.save.menuButton,
        saveMenu: elements.save.menu,
    });

    wireProtocolSaveEvents({
        saveButton: elements.save.button,
        saveAsButton: elements.save.saveAsButton,
        renameButton: elements.save.renameButton,

        saveDialog: elements.save.dialog,
        title: elements.save.title,
        description: elements.save.description,
        closeButton: elements.save.closeButton,
        cancelButton: elements.save.cancelButton,
        confirmButton: elements.save.confirmButton,
        displayNameInput: elements.save.displayNameInput,
        nameHint: elements.save.nameHint,
        changeSummaryField: elements.save.changeSummaryField,
        changeSummaryInput: elements.save.changeSummaryInput,

        editorState,
        persistenceService: persistenceContext.service,
        protocolPersistenceController,
    });

    wireProtocolOpenEvents({
        openButton: elements.open.button,
        openDialog: elements.open.dialog,
        closeButton: elements.open.closeButton,
        cancelButton: elements.open.cancelButton,
        confirmButton: elements.open.confirmButton,
        protocolTableContainer: elements.open.protocolTableContainer,
        persistenceService: persistenceContext.service,
        activityTypeVersions: persistenceContext.activityTypeVersions,
        protocolOpenController,
        protocolUnsavedChanges,
    });

    wireProtocolTreeEvents({
        protocolTree: elements.protocol.tree,
        protocolModel,
        editorState,

        setPendingFieldFocus,
        setPendingToggleFocus,
        setPendingPhaseNameFocus,
        setPendingStructuralFocus,
    });

    wireProtocolManageKeyboardEvents({
        protocolPane: elements.protocol.pane,
        protocolTree: elements.protocol.tree,
        protocolModel,
        editorState,
    });

    wireProtocolSetupEvents({
        setupButton: elements.setup.button,
        setupDialog: elements.setup.dialog,
        closeButton: elements.setup.closeButton,
        cancelButton: elements.setup.cancelButton,
        applyButton: elements.setup.applyButton,
        activityTypeSelect: elements.setup.activityTypeSelect,
        machineProfileSelect: elements.setup.machineProfileSelect,
        calibrationProfileSelect: elements.setup.calibrationProfileSelect,
        domainData,
        protocolModel,
    });

    elements.protocol.editPhaseButton.addEventListener("click", () => {
        toggleProtocolManageMode(editorState, "phase");
        elements.protocol.tree.focus();
    });

    elements.protocol.editBlockButton.addEventListener("click", () => {
        toggleProtocolManageMode(editorState, "block");
        elements.protocol.tree.focus();
    });
}
