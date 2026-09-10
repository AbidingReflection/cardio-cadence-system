/** Controls graph pane expanded/collapsed state and toggle interactions. */
export class GraphPaneController {
    #panes = new Map();
    #listeners = new Set();

    /**
     * Constructs a controller from graph pane definitions.
     *
     * Each definition must provide:
     * - id: stable graph pane ID
     * - pane: graph pane element
     * - toggleButton: button that toggles the pane
     */
    constructor(panes) {
        if (!Array.isArray(panes)) {
            throw new TypeError("Graph panes must be supplied as an array.");
        }

        for (const definition of panes) {
            this.#registerPane(definition);
        }
    }

    /** Returns whether the specified graph pane is currently expanded. */
    isExpanded(id) {
        const { pane } = this.#getPane(id);

        return pane.dataset.collapsed !== "true";
    }

    /** Toggles the specified graph pane between expanded and collapsed states. */
    toggle(id) {
        this.setExpanded(id, !this.isExpanded(id));
    }

    /** Sets whether the specified graph pane is expanded. */
    setExpanded(id, expanded) {
        if (typeof expanded !== "boolean") {
            throw new TypeError("Graph pane expanded state must be a boolean.");
        }

        if (this.isExpanded(id) === expanded) {
            return;
        }

        this.#setExpandedState(id, expanded);
        this.#emit({
            id,
            expanded,
        });
    }

    /** Subscribes to graph pane state changes and returns an unsubscribe function. */
    subscribe(listener) {
        if (typeof listener !== "function") {
            throw new TypeError("Graph pane listener must be a function.");
        }

        this.#listeners.add(listener);

        return () => {
            this.#listeners.delete(listener);
        };
    }

    /** Registers a graph pane and wires its toggle button. */
    #registerPane({ id, pane, toggleButton }) {
        if (typeof id !== "string" || id.length === 0) {
            throw new Error("Graph pane ID must be a non-empty string.");
        }

        if (this.#panes.has(id)) {
            throw new Error(`Duplicate graph pane ID: "${id}".`);
        }

        if (!(pane instanceof HTMLElement)) {
            throw new TypeError(`Graph pane "${id}" must provide a valid pane element.`);
        }

        if (!(toggleButton instanceof HTMLButtonElement)) {
            throw new TypeError(`Graph pane "${id}" must provide a valid toggle button.`);
        }

        this.#panes.set(id, {
            pane,
            toggleButton,
        });

        const expanded = pane.dataset.collapsed !== "true";

        this.#setExpandedState(id, expanded);

        toggleButton.addEventListener("click", () => {
            this.toggle(id);
        });
    }

    /** Applies expanded/collapsed state to a graph pane and its toggle button. */
    #setExpandedState(id, expanded) {
        const { pane, toggleButton } = this.#getPane(id);

        pane.dataset.collapsed = String(!expanded);

        toggleButton.setAttribute("aria-expanded", String(expanded));
        toggleButton.setAttribute("aria-label", `${expanded ? "Collapse" : "Expand"} ${id} graph`);

        toggleButton.textContent = expanded ? "▲" : "▼";
    }

    /** Returns a registered graph pane definition. */
    #getPane(id) {
        const pane = this.#panes.get(id);

        if (pane === undefined) {
            throw new Error(`Unknown graph pane ID: "${id}".`);
        }

        return pane;
    }

    /** Notifies subscribers of a graph pane state change. */
    #emit(change) {
        for (const listener of this.#listeners) {
            listener({ ...change });
        }
    }
}
