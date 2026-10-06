import { assertEqual, assertThrows, test } from "/packages/js-testing/framework/test-framework.js";

import { ProtocolExpander } from "/packages/protocol-expander/protocol-expander.js";
import { CadencePhase } from "../../../playback/cadence-phase.js";
import { CadenceSession } from "../../../playback/cadence-session.js";

import { AudioCueEngineFake } from "../../helpers/audio-cue-engine-fake.js";
import { TimeSourceFake } from "../../helpers/time-source-fake.js";

/** Creates a minimal one-block cadence protocol. */
function createProtocol({
    durationSeconds = 60,
    progression = {
        type: "steady",
        start: 60,
    },
} = {}) {
    return {
        id: "test-protocol",
        name: "Test Protocol",
        activityTypeId: "elliptical",
        machineProfileId: null,
        calibrationProfileId: null,
        phases: [
            {
                id: "phase-1",
                name: "Phase 1",
                blocks: [
                    {
                        id: "block-1",
                        name: "Block 1",
                        durationSeconds,
                        variables: {
                            cadence: progression,
                        },
                    },
                ],
            },
        ],
    };
}

/** Creates a cadence session and its controllable test dependencies. */
function createSession({ protocol = createProtocol(), startDelaySeconds = 0 } = {}) {
    const protocolExpander = new ProtocolExpander(protocol);
    const cadencePhase = new CadencePhase(protocolExpander, "cadence");
    const audioCueEngine = new AudioCueEngineFake();
    const timer = new TimeSourceFake();

    const session = new CadenceSession({
        cadencePhase,
        audioCueEngine,
        startDelaySeconds,
        timer,
    });

    return {
        session,
        audioCueEngine,
        timer,
    };
}

/** Returns scheduled cues of one semantic type. */
function getScheduledCues(audioCueEngine, type) {
    return audioCueEngine.scheduledCues.filter((cue) => cue.type === type);
}

function assertApproximatelyEqual(actual, expected, tolerance = 1e-6) {
    assertEqual(Math.abs(actual - expected) <= tolerance, true);
}

test("cadence-session", "starts immediately when start delay is zero", async () => {
    const { session, audioCueEngine, timer } = createSession();

    audioCueEngine.currentTime = 10;

    await session.start();

    assertEqual(session.state, "running");
    assertEqual(audioCueEngine.resumeCalls, 1);
    assertEqual(timer.activeIntervalCount, 1);

    const snapshot = session.getSnapshot();

    assertEqual(snapshot.protocolElapsedMs, 0);
    assertEqual(snapshot.countdownRemainingMs, 0);
});

test("cadence-session", "keeps protocol time at zero during start countdown", async () => {
    const { session, audioCueEngine } = createSession({
        startDelaySeconds: 5,
    });

    audioCueEngine.currentTime = 10;

    await session.start();

    audioCueEngine.currentTime = 13;

    const snapshot = session.getSnapshot();

    assertEqual(snapshot.state, "countdown");
    assertEqual(snapshot.protocolElapsedMs, 0);
    assertEqual(snapshot.countdownRemainingMs, 2000);
});

test("cadence-session", "schedules one countdown cue per delay second", async () => {
    const { session, audioCueEngine } = createSession({
        startDelaySeconds: 5,
    });

    audioCueEngine.currentTime = 10;

    await session.start();

    const countdownCues = getScheduledCues(audioCueEngine, "countdown");

    assertEqual(countdownCues.length, 5);
    assertEqual(countdownCues[0].audioTime, 10);
    assertEqual(countdownCues[1].audioTime, 11);
    assertEqual(countdownCues[2].audioTime, 12);
    assertEqual(countdownCues[3].audioTime, 13);
    assertEqual(countdownCues[4].audioTime, 14);
});

test("cadence-session", "enters running state when countdown expires", async () => {
    const { session, audioCueEngine, timer } = createSession({
        startDelaySeconds: 5,
    });

    audioCueEngine.currentTime = 10;

    await session.start();

    audioCueEngine.currentTime = 15;
    timer.runIntervals();

    assertEqual(session.state, "running");
    assertEqual(session.getSnapshot().protocolElapsedMs, 0);
});

test("cadence-session", "derives protocol elapsed time from the audio clock", async () => {
    const { session, audioCueEngine } = createSession();

    audioCueEngine.currentTime = 10;

    await session.start();

    audioCueEngine.currentTime = 12.5;

    assertEqual(session.getSnapshot().protocolElapsedMs, 2500);
});

test("cadence-session", "schedules 50 RPM left and right cues at half-cycle spacing", async () => {
    const { session, audioCueEngine, timer } = createSession({
        protocol: createProtocol({
            progression: {
                type: "steady",
                start: 50,
            },
        }),
    });

    audioCueEngine.currentTime = 10;

    await session.start();

    audioCueEngine.currentTime = 11;
    timer.runIntervals();

    const leftCues = getScheduledCues(audioCueEngine, "left");
    const rightCues = getScheduledCues(audioCueEngine, "right");

    assertEqual(leftCues.length, 2);
    assertEqual(rightCues.length, 1);

    assertApproximatelyEqual(leftCues[0].audioTime, 10);
    assertApproximatelyEqual(rightCues[0].audioTime, 10.6, 0.02);
    assertApproximatelyEqual(leftCues[1].audioTime, 11.2, 0.02);
});

test("cadence-session", "pauses at the current protocol time", async () => {
    const { session, audioCueEngine, timer } = createSession();

    audioCueEngine.currentTime = 10;

    await session.start();

    audioCueEngine.currentTime = 12.5;

    session.pause();

    assertEqual(session.state, "paused");
    assertEqual(session.getSnapshot().protocolElapsedMs, 2500);
    assertEqual(audioCueEngine.cancelCalls, 1);
    assertEqual(timer.activeIntervalCount, 0);

    audioCueEngine.currentTime = 30;

    assertEqual(session.getSnapshot().protocolElapsedMs, 2500);
});

test("cadence-session", "reanchors protocol time when playback resumes", async () => {
    const { session, audioCueEngine } = createSession();

    audioCueEngine.currentTime = 10;

    await session.start();

    audioCueEngine.currentTime = 12.5;

    session.pause();

    audioCueEngine.currentTime = 30;

    await session.resume();

    audioCueEngine.currentTime = 31;

    assertEqual(session.state, "running");
    assertEqual(session.getSnapshot().protocolElapsedMs, 3500);
});

test(
    "cadence-session",
    "resumes cadence scheduling from the paused protocol position",
    async () => {
        const { session, audioCueEngine, timer } = createSession();

        audioCueEngine.currentTime = 10;

        await session.start();

        audioCueEngine.currentTime = 12.5;

        session.pause();

        audioCueEngine.currentTime = 30;

        await session.resume();

        audioCueEngine.currentTime = 30.4;
        timer.runIntervals();

        const leftCues = getScheduledCues(audioCueEngine, "left");

        const resumedCue = leftCues.at(-1);

        assertApproximatelyEqual(resumedCue.audioTime, 30.5, 0.02);
    },
);

test("cadence-session", "stops during countdown without advancing protocol time", async () => {
    const { session, audioCueEngine, timer } = createSession({
        startDelaySeconds: 5,
    });

    audioCueEngine.currentTime = 10;

    await session.start();

    audioCueEngine.currentTime = 12;

    session.stop();

    assertEqual(session.state, "idle");
    assertEqual(session.getSnapshot().protocolElapsedMs, 0);
    assertEqual(audioCueEngine.cancelCalls, 1);
    assertEqual(timer.activeIntervalCount, 0);
});

test("cadence-session", "stop resets paused playback to protocol start", async () => {
    const { session, audioCueEngine } = createSession();

    audioCueEngine.currentTime = 10;

    await session.start();

    audioCueEngine.currentTime = 15;

    session.pause();
    session.stop();

    const snapshot = session.getSnapshot();

    assertEqual(snapshot.state, "idle");
    assertEqual(snapshot.protocolElapsedMs, 0);
});

test("cadence-session", "completes when protocol duration is reached", async () => {
    const { session, audioCueEngine, timer } = createSession({
        protocol: createProtocol({
            durationSeconds: 2,
        }),
    });

    audioCueEngine.currentTime = 10;

    await session.start();

    audioCueEngine.currentTime = 12;
    timer.runIntervals();

    const snapshot = session.getSnapshot();

    assertEqual(snapshot.state, "completed");
    assertEqual(snapshot.protocolElapsedMs, 2000);
    assertEqual(snapshot.protocolRemainingMs, 0);
    assertEqual(timer.activeIntervalCount, 0);
});

test("cadence-session", "schedules half-cycle cues through increasing linear cadence", async () => {
    const { session, audioCueEngine, timer } = createSession({
        protocol: createProtocol({
            durationSeconds: 10,
            progression: {
                type: "linear",
                start: 60,
                end: 120,
            },
        }),
    });

    audioCueEngine.currentTime = 10;

    await session.start();

    audioCueEngine.currentTime = 10.8;
    timer.runIntervals();

    const rightCues = getScheduledCues(audioCueEngine, "right");

    assertEqual(rightCues.length >= 1, true);

    const firstRightCue = rightCues[0];

    assertEqual(firstRightCue.audioTime > 10, true);
    assertEqual(firstRightCue.audioTime < 10.5, true);
});

test("cadence-session", "does not schedule cadence cues past protocol end", async () => {
    const { session, audioCueEngine, timer } = createSession({
        protocol: createProtocol({
            durationSeconds: 2,
        }),
    });

    audioCueEngine.currentTime = 10;

    await session.start();

    audioCueEngine.currentTime = 11.8;
    timer.runIntervals();

    const cadenceCues = audioCueEngine.scheduledCues.filter(
        (cue) => cue.type === "left" || cue.type === "right",
    );

    assertEqual(
        cadenceCues.every((cue) => cue.audioTime < 12),
        true,
    );
});

test("cadence-session", "rejects start while already active", async () => {
    const { session } = createSession();

    await session.start();

    let threw = false;

    try {
        await session.start();
    } catch {
        threw = true;
    }

    assertEqual(threw, true);
});

test("cadence-session", "rejects pause outside running state", () => {
    const { session } = createSession();

    assertThrows(() => session.pause());
});

test("cadence-session", "rejects invalid start delay", () => {
    const protocol = createProtocol();
    const protocolExpander = new ProtocolExpander(protocol);
    const cadencePhase = new CadencePhase(protocolExpander, "cadence");

    const audioCueEngine = new AudioCueEngineFake();
    const timer = new TimeSourceFake();

    assertThrows(
        () =>
            new CadenceSession({
                cadencePhase,
                audioCueEngine,
                startDelaySeconds: -1,
                timer,
            }),
    );

    assertThrows(
        () =>
            new CadenceSession({
                cadencePhase,
                audioCueEngine,
                startDelaySeconds: 2.5,
                timer,
            }),
    );
});

test("cadence-session", "schedules a left cue at immediate protocol start", async () => {
    const { session, audioCueEngine } = createSession();

    audioCueEngine.currentTime = 10;

    await session.start();

    const leftCues = getScheduledCues(audioCueEngine, "left");

    assertEqual(leftCues.length, 1);
    assertEqual(leftCues[0].audioTime, 10);
});

test("cadence-session", "schedules the first left cue at the end of countdown", async () => {
    const { session, audioCueEngine } = createSession({
        startDelaySeconds: 5,
    });

    audioCueEngine.currentTime = 10;

    await session.start();

    const leftCues = getScheduledCues(audioCueEngine, "left");

    assertEqual(leftCues.length, 1);
    assertEqual(leftCues[0].audioTime, 15);
});

test("cadence-session", "alternates left and right cues at half-cycle boundaries", async () => {
    const { session, audioCueEngine, timer } = createSession();

    audioCueEngine.currentTime = 10;

    await session.start();

    audioCueEngine.currentTime = 10.8;
    timer.runIntervals();

    audioCueEngine.currentTime = 11.8;
    timer.runIntervals();

    const leftCues = getScheduledCues(audioCueEngine, "left");
    const rightCues = getScheduledCues(audioCueEngine, "right");

    assertEqual(leftCues.length, 3);
    assertEqual(rightCues.length, 2);

    assertApproximatelyEqual(leftCues[0].audioTime, 10);
    assertApproximatelyEqual(rightCues[0].audioTime, 10.5, 0.02);
    assertApproximatelyEqual(leftCues[1].audioTime, 11, 0.02);
    assertApproximatelyEqual(rightCues[1].audioTime, 11.5, 0.02);
    assertApproximatelyEqual(leftCues[2].audioTime, 12, 0.02);
});

test("cadence-session", "seeks running playback to an absolute protocol time", async () => {
    const { session, audioCueEngine } = createSession();

    audioCueEngine.currentTime = 10;

    await session.start();

    audioCueEngine.currentTime = 12;

    session.seek(10_000);

    assertEqual(session.state, "running");
    assertEqual(session.getSnapshot().protocolElapsedMs, 10_000);

    audioCueEngine.currentTime = 13;

    assertEqual(session.getSnapshot().protocolElapsedMs, 11_000);
});

test("cadence-session", "cancels and reschedules cadence cues after a running seek", async () => {
    const { session, audioCueEngine, timer } = createSession();

    audioCueEngine.currentTime = 10;

    await session.start();

    audioCueEngine.currentTime = 12;

    const scheduledCueCountBeforeSeek = audioCueEngine.scheduledCues.length;

    session.seek(10_000);

    assertEqual(audioCueEngine.cancelCalls, 1);

    audioCueEngine.currentTime = 12.4;
    timer.runIntervals();

    const cuesAfterSeek = audioCueEngine.scheduledCues.slice(scheduledCueCountBeforeSeek);
    const nextCue = cuesAfterSeek.at(-1);

    assertEqual(nextCue.type, "right");
    assertApproximatelyEqual(nextCue.audioTime, 12.5, 0.02);
});

test("cadence-session", "seeks paused playback without resuming", async () => {
    const { session, audioCueEngine, timer } = createSession();

    audioCueEngine.currentTime = 10;

    await session.start();

    audioCueEngine.currentTime = 12.5;

    session.pause();
    session.seek(10_000);

    assertEqual(session.state, "paused");
    assertEqual(session.getSnapshot().protocolElapsedMs, 10_000);
    assertEqual(timer.activeIntervalCount, 0);

    audioCueEngine.currentTime = 30;

    assertEqual(session.getSnapshot().protocolElapsedMs, 10_000);
});

test("cadence-session", "resumes from a paused seek position", async () => {
    const { session, audioCueEngine } = createSession();

    audioCueEngine.currentTime = 10;

    await session.start();

    audioCueEngine.currentTime = 12.5;

    session.pause();
    session.seek(10_000);

    audioCueEngine.currentTime = 30;

    await session.resume();

    audioCueEngine.currentTime = 31;

    assertEqual(session.state, "running");
    assertEqual(session.getSnapshot().protocolElapsedMs, 11_000);
});

test("cadence-session", "rejects seek while idle", () => {
    const { session } = createSession();

    assertThrows(() => session.seek(10_000), /idle/);
});

test("cadence-session", "rejects seek during countdown", async () => {
    const { session, audioCueEngine } = createSession({
        startDelaySeconds: 5,
    });

    audioCueEngine.currentTime = 10;

    await session.start();

    assertThrows(() => session.seek(10_000), /countdown/);
});

test("cadence-session", "rejects seek after completion", async () => {
    const { session, audioCueEngine } = createSession({
        protocol: createProtocol({
            durationSeconds: 1,
        }),
    });

    audioCueEngine.currentTime = 10;

    await session.start();

    audioCueEngine.currentTime = 11;

    assertEqual(session.state, "completed");

    assertThrows(() => session.seek(500), /completed/);
});

test("cadence-session", "rejects an invalid seek protocol time", async () => {
    const { session, audioCueEngine } = createSession();

    audioCueEngine.currentTime = 10;

    await session.start();

    for (const protocolTimeMs of [-1, 60_001, NaN, Infinity]) {
        assertThrows(() => session.seek(protocolTimeMs), /protocolTimeMs/);
    }
});
