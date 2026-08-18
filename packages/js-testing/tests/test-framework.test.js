import {
    test,
    assert,
    assertEqual,
    assertDeepEqual,
    assertThrows,
} from "../test-framework.js";


test("test-framework", "assert accepts a truthy condition", () => {
    assert(true);
});


test("test-framework", "assert rejects a falsy condition", () => {
    assertThrows(
        () => assert(false),
                 /Assertion failed/
    );
});


test("test-framework", "assertEqual accepts strictly equal values", () => {
    assertEqual("cadence", "cadence");
    assertEqual(60, 60);
});


test("test-framework", "assertEqual rejects unequal values", () => {
    assertThrows(
        () => assertEqual(60, 70),
                 /Expected 70, received 60/
    );
});


test("test-framework", "assertDeepEqual accepts equivalent objects", () => {
    assertDeepEqual(
        {
            cadence: 60,
            resistance: 8,
        },
        {
            cadence: 60,
            resistance: 8,
        }
    );
});


test("test-framework", "assertDeepEqual rejects different objects", () => {
    assertThrows(
        () => assertDeepEqual(
            {
                cadence: 60,
            },
            {
                cadence: 70,
            }
        ),
        /Expected/
    );
});


test("test-framework", "assertThrows accepts a matching thrown error", () => {
    assertThrows(
        () => {
            throw new Error("Expected test error.");
        },
        /Expected test error/
    );
});


test("test-framework", "assertThrows rejects a function that does not throw", () => {
    assertThrows(
        () => {
            assertThrows(() => {});
        },
        /Expected function to throw/
    );
});


test("test-framework", "assertThrows rejects a non-matching error", () => {
    assertThrows(
        () => {
            assertThrows(
                () => {
                    throw new Error("Actual error.");
                },
                /Different error/
            );
        },
        /Expected error matching/
    );
});

test("test-framework", "intentional failure demo", () => {
    assert(false, "Intentional failure to verify FAILED rendering.");
});
