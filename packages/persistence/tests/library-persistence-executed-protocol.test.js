import {
    assertDeepEqual,
    assertEqual,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { PersistenceContext } from "../persistence-context.js";
import { LibraryPersistence } from "../services/library-persistence.js";

const CREATED_AT = 1_789_360_000_000;

const STARTED_AT = 1_789_360_100_000;
const LAST_ACTIVE_AT = 1_789_360_200_000;
const ENDED_AT = 1_789_360_300_000;

const PROTOCOL = {
    id: "protocol-1",
    name: "Threshold Intervals",
};

const DEPENDENCIES = {
    activityTypeVersionId: "activity-type-version-1",
    machineProfileVersionId: undefined,
    calibrationProfileVersionId: undefined,
};

const EVENTS = [];

function createLibraryPersistence({ ids = [], times = [CREATED_AT] } = {}) {
    const context = new PersistenceContext();

    let idIndex = 0;
    let timeIndex = 0;

    return new LibraryPersistence({
        protocolFamilyRepository: context.protocolFamilies,
        plannedProtocolVersionRepository: context.plannedProtocolVersions,
        executedProtocolRepository: context.executedProtocols,
        idGenerator: () => ids[idIndex++],
        clock: () => times[timeIndex++],
    });
}

/** Creates the planned protocol version required by execution tests. */
async function createPlannedProtocolVersion(persistence) {
    const family = await persistence.createProtocolFamily({
        displayName: "Threshold Intervals",
    });

    return persistence.createInitialPlannedProtocolVersion({
        protocolFamilyId: family.id,
        protocol: PROTOCOL,
        dependencies: DEPENDENCIES,
        changeSummary: "Initial version.",
    });
}

test(
    "library-persistence-executed-protocol",
    "creates and retrieves an executed protocol",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["family-1", "planned-version-1", "execution-1"],
            times: [CREATED_AT, CREATED_AT],
        });

        const plannedVersion = await createPlannedProtocolVersion(persistence);

        const execution = await persistence.createExecutedProtocol({
            plannedProtocolVersionId: plannedVersion.id,
            status: "completed",
            startedAtUnixMs: STARTED_AT,
            events: EVENTS,
            lastKnownActiveAtUnixMs: LAST_ACTIVE_AT,
            endedAtUnixMs: ENDED_AT,
        });

        assertDeepEqual(execution, {
            id: "execution-1",
            plannedProtocolVersionId: "planned-version-1",
            status: "completed",
            startedAtUnixMs: STARTED_AT,
            endedAtUnixMs: ENDED_AT,
            lastKnownActiveAtUnixMs: LAST_ACTIVE_AT,
            completionReason: undefined,
            events: EVENTS,
        });

        assertDeepEqual(await persistence.getExecutedProtocol("execution-1"), execution);
    },
);

test(
    "library-persistence-executed-protocol",
    "lists executed protocols for a planned version",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["family-1", "planned-version-1", "execution-1", "execution-2"],
            times: [CREATED_AT, CREATED_AT],
        });

        const plannedVersion = await createPlannedProtocolVersion(persistence);

        const execution1 = await persistence.createExecutedProtocol({
            plannedProtocolVersionId: plannedVersion.id,
            status: "completed",
            startedAtUnixMs: STARTED_AT,
            events: EVENTS,
            lastKnownActiveAtUnixMs: LAST_ACTIVE_AT,
            endedAtUnixMs: ENDED_AT,
        });

        const execution2 = await persistence.createExecutedProtocol({
            plannedProtocolVersionId: plannedVersion.id,
            status: "completed",
            startedAtUnixMs: STARTED_AT + 1_000_000,
            events: EVENTS,
            lastKnownActiveAtUnixMs: LAST_ACTIVE_AT + 1_000_000,
            endedAtUnixMs: ENDED_AT + 1_000_000,
        });

        assertDeepEqual(await persistence.listExecutedProtocols(plannedVersion.id), [
            execution1,
            execution2,
        ]);
    },
);

test(
    "library-persistence-executed-protocol",
    "rejects an executed protocol for a missing planned version",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["execution-1"],
        });

        let error;

        try {
            await persistence.createExecutedProtocol({
                plannedProtocolVersionId: "missing-version",
                status: "completed",
                startedAtUnixMs: STARTED_AT,
                events: EVENTS,
                lastKnownActiveAtUnixMs: LAST_ACTIVE_AT,
                endedAtUnixMs: ENDED_AT,
            });
        } catch (caughtError) {
            error = caughtError;
        }

        assertEqual(error instanceof Error, true);
        assertEqual(error.message, 'PlannedProtocolVersion "missing-version" does not exist.');
    },
);

test("library-persistence-executed-protocol", "generates executed protocol identity", async () => {
    const persistence = createLibraryPersistence({
        ids: ["family-1", "planned-version-1", "execution-1"],
        times: [CREATED_AT, CREATED_AT],
    });

    const plannedVersion = await createPlannedProtocolVersion(persistence);

    const execution = await persistence.createExecutedProtocol({
        plannedProtocolVersionId: plannedVersion.id,
        status: "completed",
        startedAtUnixMs: STARTED_AT,
        events: EVENTS,
        lastKnownActiveAtUnixMs: LAST_ACTIVE_AT,
        endedAtUnixMs: ENDED_AT,
    });

    assertEqual(execution.id, "execution-1");
});

test(
    "library-persistence-executed-protocol",
    "preserves caller-supplied execution timestamps",
    async () => {
        const persistence = createLibraryPersistence({
            ids: ["family-1", "planned-version-1", "execution-1"],
            times: [CREATED_AT, CREATED_AT],
        });

        const plannedVersion = await createPlannedProtocolVersion(persistence);

        const execution = await persistence.createExecutedProtocol({
            plannedProtocolVersionId: plannedVersion.id,
            status: "completed",
            startedAtUnixMs: STARTED_AT,
            events: EVENTS,
            lastKnownActiveAtUnixMs: LAST_ACTIVE_AT,
            endedAtUnixMs: ENDED_AT,
        });

        assertEqual(execution.startedAtUnixMs, STARTED_AT);
        assertEqual(execution.lastKnownActiveAtUnixMs, LAST_ACTIVE_AT);
        assertEqual(execution.endedAtUnixMs, ENDED_AT);
    },
);
