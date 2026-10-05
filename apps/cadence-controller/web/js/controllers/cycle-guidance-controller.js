/** Coordinates generic cycle guidance visuals from normalized cycle state. */
export class CycleGuidanceController {
    #progressionCircle;
    #signalBank;
    #cues;

    /** Creates cycle guidance for the supplied semantic cue pattern. */
    constructor(progressionCircle, signalBank, cues) {
        this.#progressionCircle = progressionCircle;
        this.#signalBank = signalBank;
        this.#cues = normalizeCues(cues);

        this.#progressionCircle.setNotches(
            this.#cues.map((cue) => ({
                id: cue.id,
                position: cue.position,
            })),
        );
    }

    /** Renders the current normalized cycle state. */
    render({ phase, valueText }) {
        validatePhase(phase);

        const activeCue = getActiveCue(this.#cues, phase);

        this.#progressionCircle.setMarkerPosition(phase);
        this.#progressionCircle.setValueText(valueText);

        this.#signalBank.setActiveSignal(activeCue.id);
    }
}

/** Validates and returns cues sorted by normalized cycle position. */
function normalizeCues(cues) {
    if (!Array.isArray(cues)) {
        throw new TypeError("Cycle guidance cues must be an array.");
    }

    if (cues.length === 0) {
        throw new Error("Cycle guidance requires at least one cue.");
    }

    const normalized = cues.map((cue) => {
        validateCue(cue);

        return {
            id: cue.id,
            label: cue.label,
            position: cue.position,
        };
    });

    normalized.sort((left, right) => left.position - right.position);

    if (normalized[0].position !== 0) {
        throw new Error("Cycle guidance requires a cue at cycle position 0.");
    }

    return normalized;
}

/** Validates one semantic cue definition. */
function validateCue(cue) {
    if (cue === null || typeof cue !== "object" || Array.isArray(cue)) {
        throw new TypeError("Cycle guidance cue must be an object.");
    }

    if (typeof cue.id !== "string" || cue.id.length === 0) {
        throw new TypeError("Cycle guidance cue id must be a non-empty string.");
    }

    if (typeof cue.label !== "string") {
        throw new TypeError(`Cycle guidance cue "${cue.id}" label must be a string.`);
    }

    validatePhase(cue.position, `Cycle guidance cue "${cue.id}" position`);
}

/** Validates a normalized cycle phase in the half-open interval [0, 1). */
function validatePhase(phase, label = "Cycle guidance phase") {
    if (typeof phase !== "number" || !Number.isFinite(phase) || phase < 0 || phase >= 1) {
        throw new RangeError(`${label} must be a finite number in [0, 1).`);
    }
}

/** Returns the cue whose boundary most recently occurred. */
function getActiveCue(cues, phase) {
    for (let index = cues.length - 1; index >= 0; index -= 1) {
        if (phase >= cues[index].position) {
            return cues[index];
        }
    }

    throw new Error("Cycle guidance could not resolve an active cue.");
}
