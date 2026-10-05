import { assertEqual, assertThrows, test } from "/packages/js-testing/framework/test-framework.js";

import { AudioCueEngine } from "../../../audio/audio-cue-engine.js";
import { AudioContextFake } from "../../helpers/audio-cue-engine-fake.js";

/** Runs one test operation with the fake Web Audio implementation installed. */
async function withFakeAudioContext(operation) {
    const originalAudioContext = globalThis.AudioContext;
    const originalWebkitAudioContext = globalThis.webkitAudioContext;

    AudioContextFake.reset();
    globalThis.AudioContext = AudioContextFake;
    delete globalThis.webkitAudioContext;

    try {
        await operation();
    } finally {
        if (originalAudioContext === undefined) {
            delete globalThis.AudioContext;
        } else {
            globalThis.AudioContext = originalAudioContext;
        }

        if (originalWebkitAudioContext === undefined) {
            delete globalThis.webkitAudioContext;
        } else {
            globalThis.webkitAudioContext = originalWebkitAudioContext;
        }
    }
}

test("audio-cue-engine", "creates and resumes one AudioContext", async () => {
    await withFakeAudioContext(async () => {
        const engine = new AudioCueEngine();

        await engine.resume();
        await engine.resume();

        assertEqual(AudioContextFake.instances.length, 1);
        assertEqual(AudioContextFake.latest.resumeCalls, 1);
    });
});

test("audio-cue-engine", "exposes the Web Audio clock", async () => {
    await withFakeAudioContext(async () => {
        const engine = new AudioCueEngine();

        await engine.resume();

        AudioContextFake.latest.currentTime = 12.5;

        assertEqual(engine.currentTime, 12.5);
    });
});

test("audio-cue-engine", "creates a master gain connected to audio output", async () => {
    await withFakeAudioContext(async () => {
        const engine = new AudioCueEngine({
            masterGain: 0.25,
        });

        await engine.resume();

        const context = AudioContextFake.latest;
        const masterGain = context.gainNodes[0];

        assertEqual(masterGain.gain.value, 0.25);
        assertEqual(masterGain.connections[0], context.destination);
    });
});

test("audio-cue-engine", "schedules a left cue at the requested audio time", async () => {
    await withFakeAudioContext(async () => {
        const engine = new AudioCueEngine();

        await engine.resume();

        engine.scheduleCue({
            audioTime: 10,
            type: "left",
        });

        const oscillator = AudioContextFake.latest.oscillators[0];

        assertEqual(oscillator.startCalls.length, 1);
        assertEqual(oscillator.startCalls[0], 10);
        assertEqual(oscillator.stopCalls.length, 1);
        assertEqual(oscillator.stopCalls[0] > 10, true);
    });
});

test("audio-cue-engine", "uses the left cue synthesis graph", async () => {
    await withFakeAudioContext(async () => {
        const engine = new AudioCueEngine();

        await engine.resume();

        engine.scheduleCue({
            audioTime: 5,
            type: "left",
        });

        const context = AudioContextFake.latest;
        const oscillator = context.oscillators[0];
        const cueGain = context.gainNodes[1];
        const masterGain = context.gainNodes[0];

        assertEqual(oscillator.type, "square");
        assertEqual(oscillator.connections[0], cueGain);
        assertEqual(cueGain.connections[0], masterGain);

        assertEqual(oscillator.frequency.setValueCalls.length, 1);
        assertEqual(oscillator.frequency.setValueCalls[0].value, 880);
        assertEqual(oscillator.frequency.setValueCalls[0].time, 5);

        assertEqual(cueGain.gain.setValueCalls[0].time, 5);
        assertEqual(cueGain.gain.exponentialRampCalls.length, 2);
    });
});

test("audio-cue-engine", "uses distinct frequencies for left and right cues", async () => {
    await withFakeAudioContext(async () => {
        const engine = new AudioCueEngine();

        await engine.resume();

        engine.scheduleCue({
            audioTime: 5,
            type: "left",
        });

        engine.scheduleCue({
            audioTime: 6,
            type: "right",
        });

        const context = AudioContextFake.latest;
        const leftOscillator = context.oscillators[0];
        const rightOscillator = context.oscillators[1];

        assertEqual(leftOscillator.frequency.setValueCalls[0].value, 880);
        assertEqual(rightOscillator.frequency.setValueCalls[0].value, 720);
    });
});

test("audio-cue-engine", "schedules countdown cues with countdown synthesis", async () => {
    await withFakeAudioContext(async () => {
        const engine = new AudioCueEngine();

        await engine.resume();

        engine.scheduleCue({
            audioTime: 7,
            type: "countdown",
        });

        const oscillator = AudioContextFake.latest.oscillators[0];

        assertEqual(oscillator.type, "square");
        assertEqual(oscillator.frequency.setValueCalls[0].value, 660);
        assertEqual(oscillator.frequency.setValueCalls[0].time, 7);
    });
});

test("audio-cue-engine", "schedules load alerts with distinct synthesis", async () => {
    await withFakeAudioContext(async () => {
        const engine = new AudioCueEngine();

        await engine.resume();

        engine.scheduleCue({
            audioTime: 8,
            type: "load-alert",
        });

        const oscillator = AudioContextFake.latest.oscillators[0];

        assertEqual(oscillator.type, "triangle");
        assertEqual(oscillator.frequency.setValueCalls[0].value, 440);
        assertEqual(oscillator.frequency.setValueCalls[0].time, 8);
    });
});

test("audio-cue-engine", "cleans up completed cue nodes", async () => {
    await withFakeAudioContext(async () => {
        const engine = new AudioCueEngine();

        await engine.resume();

        engine.scheduleCue({
            audioTime: 5,
            type: "left",
        });

        const context = AudioContextFake.latest;
        const oscillator = context.oscillators[0];
        const cueGain = context.gainNodes[1];

        oscillator.emitEnded();

        assertEqual(oscillator.disconnectCalls, 1);
        assertEqual(cueGain.disconnectCalls, 1);

        engine.cancelScheduledCues();

        assertEqual(oscillator.stopCalls.length, 1);
    });
});

test("audio-cue-engine", "cancels all scheduled cues at the current audio time", async () => {
    await withFakeAudioContext(async () => {
        const engine = new AudioCueEngine();

        await engine.resume();

        const context = AudioContextFake.latest;
        context.currentTime = 4;

        engine.scheduleCue({
            audioTime: 10,
            type: "left",
        });

        engine.scheduleCue({
            audioTime: 11,
            type: "right",
        });

        engine.cancelScheduledCues();

        assertEqual(context.oscillators[0].stopCalls.at(-1), 4);
        assertEqual(context.oscillators[1].stopCalls.at(-1), 4);
    });
});

test("audio-cue-engine", "closes the owned AudioContext", async () => {
    await withFakeAudioContext(async () => {
        const engine = new AudioCueEngine();

        await engine.resume();

        const context = AudioContextFake.latest;

        await engine.close();

        assertEqual(context.closeCalls, 1);

        assertThrows(() => engine.currentTime);
    });
});

test("audio-cue-engine", "allows close before audio initialization", async () => {
    await withFakeAudioContext(async () => {
        const engine = new AudioCueEngine();

        await engine.close();

        assertEqual(AudioContextFake.instances.length, 0);
    });
});

test("audio-cue-engine", "requires resume before reading the audio clock", () => {
    const engine = new AudioCueEngine();

    assertThrows(() => engine.currentTime, /resumed/);
});

test("audio-cue-engine", "requires resume before scheduling a cue", () => {
    const engine = new AudioCueEngine();

    assertThrows(
        () =>
            engine.scheduleCue({
                audioTime: 1,
                type: "left",
            }),
        /resumed/,
    );
});

test("audio-cue-engine", "rejects unsupported cue types", async () => {
    await withFakeAudioContext(async () => {
        const engine = new AudioCueEngine();

        await engine.resume();

        assertThrows(
            () =>
                engine.scheduleCue({
                    audioTime: 1,
                    type: "secondary",
                }),
            /Unsupported audio cue type/,
        );
    });
});

test("audio-cue-engine", "rejects missing cue type", async () => {
    await withFakeAudioContext(async () => {
        const engine = new AudioCueEngine();

        await engine.resume();

        assertThrows(
            () =>
                engine.scheduleCue({
                    audioTime: 1,
                }),
            /Unsupported audio cue type/,
        );
    });
});

test("audio-cue-engine", "rejects invalid audio scheduling times", async () => {
    await withFakeAudioContext(async () => {
        const engine = new AudioCueEngine();

        await engine.resume();

        assertThrows(() =>
            engine.scheduleCue({
                audioTime: -1,
                type: "left",
            }),
        );

        assertThrows(() =>
            engine.scheduleCue({
                audioTime: Infinity,
                type: "right",
            }),
        );
    });
});

test("audio-cue-engine", "rejects invalid master gain", () => {
    assertThrows(() => new AudioCueEngine({ masterGain: -0.1 }));
    assertThrows(() => new AudioCueEngine({ masterGain: 1.1 }));
    assertThrows(() => new AudioCueEngine({ masterGain: NaN }));
});
