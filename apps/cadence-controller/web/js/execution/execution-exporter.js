import { downloadJson } from "/packages/browser/download-json.js";

import { createExecutionArtifact } from "./execution-artifact.js";

const FINALIZED_EXECUTION_STATUSES = new Set(["completed", "ended-early", "interrupted"]);

/** Coordinates creation and download of finalized execution artifacts. */
export class ExecutionExporter {
    #protocolBundle;
    #executionRecorder;
    #downloadJson;

    /** Creates an execution exporter. */
    constructor({
        protocolBundle,
        executionRecorder,
        downloadJson: downloadJsonImpl = downloadJson,
    }) {
        this.#protocolBundle = protocolBundle;
        this.#executionRecorder = executionRecorder;
        this.#downloadJson = downloadJsonImpl;
    }

    /** Returns whether a finalized execution is available for download. */
    isAvailable() {
        return FINALIZED_EXECUTION_STATUSES.has(this.#executionRecorder.status);
    }

    /** Downloads the finalized execution as a self-contained JSON artifact. */
    download() {
        if (!this.isAvailable()) {
            throw new Error("Execution must be finalized before download.");
        }

        const protocolBundle = this.#protocolBundle.getSnapshot();
        const execution = this.#executionRecorder.getSnapshot();

        const artifact = createExecutionArtifact({
            protocolBundle,
            execution,
        });

        const filename = createExecutionFilename(
            protocolBundle.protocol.id,
            execution.startedAtUnixMs,
        );

        this.#downloadJson(artifact, filename);
    }
}

/** Creates a filename for one exported execution artifact. */
function createExecutionFilename(protocolId, startedAtUnixMs) {
    return protocolId
        ? `${protocolId}-execution-${startedAtUnixMs}.json`
        : `execution-${startedAtUnixMs}.json`;
}
