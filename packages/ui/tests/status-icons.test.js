/**
 * Verifies shared reusable status icon SVGs.
 */

import { assertEqual, test } from "/packages/js-testing/framework/test-framework.js";

import { createErrorIcon, createWarningIcon } from "../status-icons.js";

test("status-icons", "creates a warning SVG with expected shared attributes", () => {
    const icon = createWarningIcon();

    assertEqual(icon.tagName.toLowerCase(), "svg");
    assertEqual(icon.getAttribute("viewBox"), "0 0 24 24");
    assertEqual(icon.getAttribute("aria-hidden"), "true");

    assertEqual(icon.classList.contains("status-icon"), true);
    assertEqual(icon.classList.contains("status-icon--warning"), true);

    assertEqual(icon.children.length, 3);
});

test("status-icons", "creates an error SVG with expected shared attributes", () => {
    const icon = createErrorIcon();

    assertEqual(icon.tagName.toLowerCase(), "svg");
    assertEqual(icon.getAttribute("viewBox"), "0 0 24 24");
    assertEqual(icon.getAttribute("aria-hidden"), "true");

    assertEqual(icon.classList.contains("status-icon"), true);
    assertEqual(icon.classList.contains("status-icon--error"), true);

    assertEqual(icon.children.length, 2);
});

test("status-icons", "warning and error icons use SVG namespace elements", () => {
    const warningIcon = createWarningIcon();
    const errorIcon = createErrorIcon();

    assertEqual(warningIcon.namespaceURI, "http://www.w3.org/2000/svg");
    assertEqual(errorIcon.namespaceURI, "http://www.w3.org/2000/svg");

    for (const element of warningIcon.children) {
        assertEqual(element.namespaceURI, "http://www.w3.org/2000/svg");
    }

    for (const element of errorIcon.children) {
        assertEqual(element.namespaceURI, "http://www.w3.org/2000/svg");
    }
});

test("status-icons", "creates independent icon instances", () => {
    const firstWarningIcon = createWarningIcon();
    const secondWarningIcon = createWarningIcon();

    assertEqual(firstWarningIcon === secondWarningIcon, false);
    assertEqual(firstWarningIcon.children[0] === secondWarningIcon.children[0], false);
});
