import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { PlannedProtocolVersionRepository } from "../repositories/planned-protocol-version-repository.js";
import { ExecutedProtocolRepository } from "../repositories/executed-protocol-repository.js";

const PLANNED_VERSION = {
    id: "planned-version-1",
    protocolFamilyId: "family-1",
    versionNumber: 1,
    parentVersionId: undefined,
    createdAtUnixMs: 1_789_360_000_000,
    protocol: {
        id: "protocol-1",
        name: "Threshold Intervals",
    },
    dependencies: {
        activityTypeVersionId: "activity-type-version-1",
        machineProfileVersionId: undefined,
        calibrationProfileVersionId: undefined,
    },
    changeSummary: undefined,
};

const EXECUTION_1 = {
    id: "execution-1",
    plannedProtocolVersionId: PLANNED_VERSION.id,
    status: "completed",
    startedAtUnixMs: 1_789_360_100_000,
    endedAtUnixMs: 1_789_360_700_000,
    lastKnownActiveAtUnixMs: 1_789_360_700_000,
    lastKnownProtocolTimeMs: 600_000,
    completionReason: undefined,
    events: [],
};

const EXECUTION_2 = {
    ...EXECUTION_1,
    id: "execution-2",
    startedAtUnixMs: 1_789_361_100_000,
    endedAtUnixMs: 1_789_361_700_000,
    lastKnownActiveAtUnixMs: 1_789_361_700_000,
};

function createRepositories() {
    const plannedProtocolVersionRepository = new PlannedProtocolVersionRepository();

    const executedProtocolRepository = new ExecutedProtocolRepository({
        plannedProtocolVersionRepository,
    });

    return {
        plannedProtocolVersionRepository,
        executedProtocolRepository,
    };
}

test("executed-protocol-repository", "adds and retrieves an executed protocol", () => {
    const { plannedProtocolVersionRepository, executedProtocolRepository } = createRepositories();

    plannedProtocolVersionRepository.add(PLANNED_VERSION);
    executedProtocolRepository.add(EXECUTION_1);

    assertDeepEqual(executedProtocolRepository.getById(EXECUTION_1.id), EXECUTION_1);
});

test("executed-protocol-repository", "returns undefined for an unknown ID", () => {
    const { executedProtocolRepository } = createRepositories();

    assertEqual(executedProtocolRepository.getById("missing"), undefined);
});

test("executed-protocol-repository", "rejects an invalid executed protocol", () => {
    const { plannedProtocolVersionRepository, executedProtocolRepository } = createRepositories();

    plannedProtocolVersionRepository.add(PLANNED_VERSION);

    assertThrows(
        () =>
            executedProtocolRepository.add({
                ...EXECUTION_1,
                id: "",
            }),
        /id/,
    );
});

test("executed-protocol-repository", "rejects invalid execution history", () => {
    const { plannedProtocolVersionRepository, executedProtocolRepository } = createRepositories();

    plannedProtocolVersionRepository.add(PLANNED_VERSION);

    assertThrows(
        () =>
            executedProtocolRepository.add({
                ...EXECUTION_1,
                events: [
                    {
                        type: "resume",
                        occurredAtUnixMs: EXECUTION_1.startedAtUnixMs + 100_000,
                    },
                ],
            }),
        /resume/,
    );
});

test("executed-protocol-repository", "rejects a duplicate execution ID", () => {
    const { plannedProtocolVersionRepository, executedProtocolRepository } = createRepositories();

    plannedProtocolVersionRepository.add(PLANNED_VERSION);
    executedProtocolRepository.add(EXECUTION_1);

    assertThrows(
        () =>
            executedProtocolRepository.add({
                ...EXECUTION_1,
            }),
        /id/,
    );
});

test(
    "executed-protocol-repository",
    "requires the referenced planned protocol version to exist",
    () => {
        const { executedProtocolRepository } = createRepositories();

        assertThrows(() => executedProtocolRepository.add(EXECUTION_1), /plannedProtocolVersionId/);
    },
);

test(
    "executed-protocol-repository",
    "lists executions for a planned protocol version in start-time order",
    () => {
        const { plannedProtocolVersionRepository, executedProtocolRepository } =
            createRepositories();

        plannedProtocolVersionRepository.add(PLANNED_VERSION);

        executedProtocolRepository.add(EXECUTION_2);
        executedProtocolRepository.add(EXECUTION_1);

        assertDeepEqual(
            executedProtocolRepository.listByPlannedProtocolVersionId(PLANNED_VERSION.id),
            [EXECUTION_1, EXECUTION_2],
        );
    },
);

test(
    "executed-protocol-repository",
    "returns an empty list for an unknown planned protocol version",
    () => {
        const { executedProtocolRepository } = createRepositories();

        assertDeepEqual(
            executedProtocolRepository.listByPlannedProtocolVersionId("missing-version"),
            [],
        );
    },
);

test(
    "executed-protocol-repository",
    "reports when a planned protocol version is referenced",
    () => {
        const { plannedProtocolVersionRepository, executedProtocolRepository } =
            createRepositories();

        plannedProtocolVersionRepository.add(PLANNED_VERSION);
        executedProtocolRepository.add(EXECUTION_1);

        assertEqual(
            executedProtocolRepository.hasPlannedProtocolVersionReference(
                EXECUTION_1.plannedProtocolVersionId,
            ),
            true,
        );
    },
);

test(
    "executed-protocol-repository",
    "reports when a planned protocol version is not referenced",
    () => {
        const { executedProtocolRepository } = createRepositories();

        assertEqual(
            executedProtocolRepository.hasPlannedProtocolVersionReference("missing-version"),
            false,
        );
    },
);

test("executed-protocol-repository", "lists all executions in deterministic order", () => {
    const { plannedProtocolVersionRepository, executedProtocolRepository } = createRepositories();

    plannedProtocolVersionRepository.add(PLANNED_VERSION);

    const executionB = {
        ...EXECUTION_1,
        id: "execution-b",
    };

    const executionA = {
        ...EXECUTION_1,
        id: "execution-a",
    };

    executedProtocolRepository.add(executionB);
    executedProtocolRepository.add(executionA);

    assertDeepEqual(
        executedProtocolRepository.listAll().map((execution) => execution.id),
        ["execution-a", "execution-b"],
    );
});
