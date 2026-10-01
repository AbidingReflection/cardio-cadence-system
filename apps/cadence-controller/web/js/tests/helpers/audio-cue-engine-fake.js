/** Provides controllable Web Audio fakes for AudioCueEngine tests. */

export class AudioContextFake {
    static instances = [];

    currentTime = 0;
    state = "suspended";
    destination = {};

    gainNodes = [];
    oscillators = [];
    resumeCalls = 0;
    closeCalls = 0;

    /** Creates and records one fake AudioContext. */
    constructor() {
        AudioContextFake.instances.push(this);
    }

    /** Clears all recorded AudioContext instances. */
    static reset() {
        AudioContextFake.instances = [];
    }

    /** Returns the most recently created AudioContext. */
    static get latest() {
        return AudioContextFake.instances.at(-1);
    }

    /** Creates and records one fake gain node. */
    createGain() {
        const gainNode = new GainNodeFake();

        this.gainNodes.push(gainNode);

        return gainNode;
    }

    /** Creates and records one fake oscillator node. */
    createOscillator() {
        const oscillator = new OscillatorNodeFake();

        this.oscillators.push(oscillator);

        return oscillator;
    }

    /** Resumes the fake audio clock. */
    async resume() {
        this.resumeCalls += 1;
        this.state = "running";
    }

    /** Closes the fake audio context. */
    async close() {
        this.closeCalls += 1;
        this.state = "closed";
    }
}

/** Records the AudioCueEngine contract used by cadence playback tests. */
export class AudioCueEngineFake {
    currentTime = 0;
    resumeCalls = 0;
    cancelCalls = 0;
    scheduledCues = [];

    /** Records one audio-engine resume request. */
    async resume() {
        this.resumeCalls += 1;
    }

    /** Records one scheduled semantic cue. */
    scheduleCue(cue) {
        this.scheduledCues.push(structuredClone(cue));
    }

    /** Records cancellation of all scheduled cues. */
    cancelScheduledCues() {
        this.cancelCalls += 1;
    }

    /** Advances the fake Web Audio clock by seconds. */
    advanceTime(seconds) {
        this.currentTime += seconds;
    }
}

/** Records gain automation and graph connections. */
class GainNodeFake {
    gain = new AudioParamFake();

    connections = [];
    disconnectCalls = 0;

    /** Records one audio graph connection. */
    connect(destination) {
        this.connections.push(destination);
    }

    /** Records disconnection from the audio graph. */
    disconnect() {
        this.disconnectCalls += 1;
    }
}

/** Records oscillator scheduling and lifecycle behavior. */
class OscillatorNodeFake {
    type = "sine";
    frequency = new AudioParamFake();

    connections = [];
    startCalls = [];
    stopCalls = [];
    disconnectCalls = 0;

    #endedListeners = [];

    /** Records one audio graph connection. */
    connect(destination) {
        this.connections.push(destination);
    }

    /** Records an oscillator start time. */
    start(time) {
        this.startCalls.push(time);
    }

    /** Records an oscillator stop time. */
    stop(time) {
        this.stopCalls.push(time);
    }

    /** Records an oscillator lifecycle listener. */
    addEventListener(type, listener) {
        if (type === "ended") {
            this.#endedListeners.push(listener);
        }
    }

    /** Records disconnection from the audio graph. */
    disconnect() {
        this.disconnectCalls += 1;
    }

    /** Emits the oscillator ended event. */
    emitEnded() {
        for (const listener of this.#endedListeners) {
            listener();
        }

        this.#endedListeners = [];
    }
}

/** Records Web Audio parameter automation calls. */
class AudioParamFake {
    value = 0;

    setValueCalls = [];
    exponentialRampCalls = [];

    /** Records an immediate parameter value at an audio time. */
    setValueAtTime(value, time) {
        this.setValueCalls.push({ value, time });
    }

    /** Records an exponential parameter ramp target. */
    exponentialRampToValueAtTime(value, time) {
        this.exponentialRampCalls.push({ value, time });
    }
}
