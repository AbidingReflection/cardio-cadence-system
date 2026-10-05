/** Renders a reusable bank of semantic guidance signals. */
export class SignalBank {
    #root;
    #signals;
    #labels;
    #activeSignalId;

    /** Creates a persistent signal bank inside the supplied container. */
    constructor(container, signals) {
        validateSignals(signals);

        this.#signals = new Map();
        this.#labels = new Map();
        this.#activeSignalId = null;

        this.#root = document.createElement("div");
        this.#root.className = "signal-bank";
        this.#root.style.setProperty("--signal-count", String(signals.length));

        for (const signal of signals) {
            const signalElement = document.createElement("div");
            signalElement.className = "signal-bank__signal";
            signalElement.dataset.signalId = signal.id;
            signalElement.dataset.active = "false";

            const labelElement = document.createElement("span");
            labelElement.className = "signal-bank__label";
            labelElement.textContent = signal.label;

            signalElement.append(labelElement);
            this.#root.append(signalElement);

            this.#signals.set(signal.id, signalElement);
            this.#labels.set(signal.id, labelElement);
        }

        container.append(this.#root);
    }

    /** Activates one signal, or clears the active signal with null. */
    setActiveSignal(signalId) {
        if (signalId !== null && !this.#signals.has(signalId)) {
            throw new Error(`SignalBank does not contain signal "${signalId}".`);
        }

        if (signalId === this.#activeSignalId) {
            return;
        }

        if (this.#activeSignalId !== null) {
            this.#signals.get(this.#activeSignalId).dataset.active = "false";
        }

        if (signalId !== null) {
            this.#signals.get(signalId).dataset.active = "true";
        }

        this.#activeSignalId = signalId;
    }

    /** Updates the displayed text for one signal. */
    setSignalText(signalId, text) {
        const label = this.#labels.get(signalId);

        if (label === undefined) {
            throw new Error(`SignalBank does not contain signal "${signalId}".`);
        }

        label.textContent = String(text);
    }

    /** Updates the visual state exposed to component CSS. */
    setState(state) {
        this.#root.dataset.state = String(state);
    }

    /** Removes this component's rendered content from its container. */
    destroy() {
        this.#root.remove();
    }
}

/** Validates the complete signal definition set. */
function validateSignals(signals) {
    if (!Array.isArray(signals)) {
        throw new TypeError("SignalBank signals must be an array.");
    }

    const ids = new Set();

    for (const signal of signals) {
        validateSignal(signal);

        if (ids.has(signal.id)) {
            throw new Error(`SignalBank defines duplicate signal id "${signal.id}".`);
        }

        ids.add(signal.id);
    }
}

/** Validates one signal definition. */
function validateSignal(signal) {
    if (signal === null || typeof signal !== "object" || Array.isArray(signal)) {
        throw new TypeError("SignalBank signal must be an object.");
    }

    if (typeof signal.id !== "string" || signal.id.length === 0) {
        throw new TypeError("SignalBank signal id must be a non-empty string.");
    }

    if (typeof signal.label !== "string") {
        throw new TypeError(`SignalBank signal "${signal.id}" label must be a string.`);
    }
}
