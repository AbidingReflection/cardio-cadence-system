import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { ExecutionExporter } from "../../execution/execution-exporter.js";

/** Creates a protocol-bundle fake for execution export tests. */
function createProtocolBundleFake({ protocolId = "protocol-1" } = {}) {
    return {
        getSnapshotCalls: 0,

        /** Returns representative self-contained protocol-bundle data. */
        getSnapshot() {
            this.getSnapshotCalls += 1;

            return {
                protocol: {
                    id: protocolId,
                    name: "Test Protocol",
                    activityTypeId: "elliptical",
                    machineProfileId: null,
                    calibrationProfileId: null,
                    phases: [],
                },
                activityType: {
                    id: "elliptical",
                    name: "Elliptical",
                    variables: [],
                },
                machineProfile: null,
                calibrationProfile: null,
            };
        },
    };
}

/** Creates an execution-recorder fake for execution export tests. */
function createExecutionRecorderFake({ status = "completed", startedAtUnixMs = 1_000 } = {}) {
    return {
        status,
        getSnapshotCalls: 0,

        /** Returns representative execution data. */
        getSnapshot() {
            this.getSnapshotCalls += 1;

            return {
                status,
                startedAtUnixMs,
                endedAtUnixMs: 5_000,
                lastKnownActiveAtUnixMs: 5_000,
                lastKnownProtocolTimeMs: 60_000,
                completionReason: undefined,
                events: [],
            };
        },
    };
}

/** Creates a JSON download fake for execution export tests. */
function createDownloadFake() {
    const calls = [];

    /** Records one JSON download request. */
    function download(data, filename) {
        calls.push({
            data: structuredClone(data),
            filename,
        });
    }

    return {
        calls,
        download,
    };
}

test("execution-exporter", "reports finalized execution as available", () => {
    const exporter = new ExecutionExporter({
        protocolBundle: createProtocolBundleFake(),
        executionRecorder: createExecutionRecorderFake({
            status: "completed",
        }),
        downloadJson: createDownloadFake().download,
    });

    assertEqual(exporter.isAvailable(), true);
});

test("execution-exporter", "reports in-progress execution as unavailable", () => {
    const exporter = new ExecutionExporter({
        protocolBundle: createProtocolBundleFake(),
        executionRecorder: createExecutionRecorderFake({
            status: "in-progress",
        }),
        downloadJson: createDownloadFake().download,
    });

    assertEqual(exporter.isAvailable(), false);
});

test("execution-exporter", "downloads a self-contained execution artifact", () => {
    const protocolBundle = createProtocolBundleFake();
    const executionRecorder = createExecutionRecorderFake();
    const downloadFake = createDownloadFake();

    const exporter = new ExecutionExporter({
        protocolBundle,
        executionRecorder,
        downloadJson: downloadFake.download,
    });

    exporter.download();

    assertEqual(protocolBundle.getSnapshotCalls, 1);
    assertEqual(executionRecorder.getSnapshotCalls, 1);
    assertEqual(downloadFake.calls.length, 1);

    assertDeepEqual(downloadFake.calls[0].data, {
        protocolBundle: {
            protocol: {
                id: "protocol-1",
                name: "Test Protocol",
                activityTypeId: "elliptical",
                machineProfileId: null,
                calibrationProfileId: null,
                phases: [],
            },
            activityType: {
                id: "elliptical",
                name: "Elliptical",
                variables: [],
            },
            machineProfile: null,
            calibrationProfile: null,
        },
        execution: {
            status: "completed",
            startedAtUnixMs: 1_000,
            endedAtUnixMs: 5_000,
            lastKnownActiveAtUnixMs: 5_000,
            lastKnownProtocolTimeMs: 60_000,
            completionReason: undefined,
            events: [],
        },
    });
});

test("execution-exporter", "uses protocol id and execution start in filename", () => {
    const downloadFake = createDownloadFake();

    const exporter = new ExecutionExporter({
        protocolBundle: createProtocolBundleFake({
            protocolId: "interval-session",
        }),
        executionRecorder: createExecutionRecorderFake({
            startedAtUnixMs: 12_345,
        }),
        downloadJson: downloadFake.download,
    });

    exporter.download();

    assertEqual(downloadFake.calls[0].filename, "interval-session-execution-12345.json");
});

test("execution-exporter", "falls back when protocol has no id", () => {
    const downloadFake = createDownloadFake();

    const exporter = new ExecutionExporter({
        protocolBundle: createProtocolBundleFake({
            protocolId: null,
        }),
        executionRecorder: createExecutionRecorderFake({
            startedAtUnixMs: 12_345,
        }),
        downloadJson: downloadFake.download,
    });

    exporter.download();

    assertEqual(downloadFake.calls[0].filename, "execution-12345.json");
});

test("execution-exporter", "rejects download when execution is not finalized", () => {
    const downloadFake = createDownloadFake();

    const exporter = new ExecutionExporter({
        protocolBundle: createProtocolBundleFake(),
        executionRecorder: createExecutionRecorderFake({
            status: "in-progress",
        }),
        downloadJson: downloadFake.download,
    });

    assertThrows(() => exporter.download(), /finalized/i);

    assertEqual(downloadFake.calls.length, 0);
});
