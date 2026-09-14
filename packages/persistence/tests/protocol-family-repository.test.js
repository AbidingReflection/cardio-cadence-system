import {
    assertDeepEqual,
    assertEqual,
    assertThrows,
    test,
} from "/packages/js-testing/framework/test-framework.js";

import { ProtocolFamilyRepository } from "../repositories/protocol-family-repository.js";

const FAMILY_1 = {
    id: "family-1",
    createdAtUnixMs: 1_789_360_000_000,
    displayName: "Threshold Intervals",
    archived: false,
};

const FAMILY_2 = {
    id: "family-2",
    createdAtUnixMs: 1_789_360_100_000,
    displayName: "Tempo Intervals",
    archived: false,
};

test("protocol-family-repository", "adds and retrieves a protocol family", () => {
    const repository = new ProtocolFamilyRepository();

    repository.add(FAMILY_1);

    assertDeepEqual(repository.getById(FAMILY_1.id), FAMILY_1);
});

test("protocol-family-repository", "returns undefined for an unknown ID", () => {
    const repository = new ProtocolFamilyRepository();

    assertEqual(repository.getById("missing"), undefined);
});

test("protocol-family-repository", "rejects an invalid protocol family", () => {
    const repository = new ProtocolFamilyRepository();

    assertThrows(
        () =>
            repository.add({
                ...FAMILY_1,
                id: "",
            }),
        /id/,
    );
});

test("protocol-family-repository", "rejects a duplicate family ID", () => {
    const repository = new ProtocolFamilyRepository();

    repository.add(FAMILY_1);

    assertThrows(
        () =>
            repository.add({
                ...FAMILY_1,
            }),
        /id/,
    );
});

test("protocol-family-repository", "lists protocol families deterministically", () => {
    const repository = new ProtocolFamilyRepository();

    repository.add(FAMILY_2);
    repository.add(FAMILY_1);

    assertDeepEqual(repository.list(), [FAMILY_1, FAMILY_2]);
});

test("protocol-family-repository", "updates the display name", () => {
    const repository = new ProtocolFamilyRepository();

    repository.add(FAMILY_1);

    const updated = repository.update(FAMILY_1.id, {
        displayName: "Updated Threshold Intervals",
    });

    assertDeepEqual(updated, {
        ...FAMILY_1,
        displayName: "Updated Threshold Intervals",
    });

    assertDeepEqual(repository.getById(FAMILY_1.id), updated);
});

test("protocol-family-repository", "updates archived state", () => {
    const repository = new ProtocolFamilyRepository();

    repository.add(FAMILY_1);

    const updated = repository.update(FAMILY_1.id, {
        archived: true,
    });

    assertEqual(updated.archived, true);
});

test("protocol-family-repository", "rejects an invalid display name update", () => {
    const repository = new ProtocolFamilyRepository();

    repository.add(FAMILY_1);

    assertThrows(
        () =>
            repository.update(FAMILY_1.id, {
                displayName: "   ",
            }),
        /displayName/,
    );
});

test("protocol-family-repository", "rejects an invalid archived update", () => {
    const repository = new ProtocolFamilyRepository();

    repository.add(FAMILY_1);

    assertThrows(
        () =>
            repository.update(FAMILY_1.id, {
                archived: "true",
            }),
        /archived/,
    );
});

test("protocol-family-repository", "rejects attempts to update immutable fields", () => {
    const repository = new ProtocolFamilyRepository();

    repository.add(FAMILY_1);

    assertThrows(
        () =>
            repository.update(FAMILY_1.id, {
                id: "other-family",
            }),
        /id/,
    );

    assertThrows(
        () =>
            repository.update(FAMILY_1.id, {
                createdAtUnixMs: FAMILY_1.createdAtUnixMs + 1,
            }),
        /createdAtUnixMs/,
    );
});

test("protocol-family-repository", "returns undefined when updating an unknown family", () => {
    const repository = new ProtocolFamilyRepository();

    assertEqual(
        repository.update("missing", {
            displayName: "Missing",
        }),
        undefined,
    );
});

test("protocol-family-repository", "deletes an unreferenced protocol family", () => {
    const repository = new ProtocolFamilyRepository({
        isReferenced: () => false,
    });

    repository.add(FAMILY_1);

    assertEqual(repository.delete(FAMILY_1.id), true);
    assertEqual(repository.getById(FAMILY_1.id), undefined);
});

test("protocol-family-repository", "rejects deletion of a referenced protocol family", () => {
    const repository = new ProtocolFamilyRepository({
        isReferenced: (id) => id === FAMILY_1.id,
    });

    repository.add(FAMILY_1);

    assertThrows(() => repository.delete(FAMILY_1.id), /referenced/);
});

test("protocol-family-repository", "returns false when deleting an unknown family", () => {
    const repository = new ProtocolFamilyRepository({
        isReferenced: () => false,
    });

    assertEqual(repository.delete("missing"), false);
});
