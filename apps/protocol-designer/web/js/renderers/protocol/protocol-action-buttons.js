const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Creates a compact edit action button. */
export function createEditActionButton({ className, action, ariaLabel }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.action = action;
    button.setAttribute("aria-label", ariaLabel);
    button.textContent = "✎";

    return button;
}

/** Creates a compact copy action button. */
export function createCopyActionButton({ className, action, ariaLabel, data = {} }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.action = action;
    button.setAttribute("aria-label", ariaLabel);

    for (const [key, value] of Object.entries(data)) {
        button.dataset[key] = value;
    }

    button.append(createCopyIcon());

    return button;
}

/** Creates a compact delete action button. */
export function createDeleteActionButton({ className, action, ariaLabel, data = {} }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.action = action;
    button.setAttribute("aria-label", ariaLabel);
    button.textContent = "×";

    for (const [key, value] of Object.entries(data)) {
        button.dataset[key] = value;
    }

    return button;
}

/** Creates the shared copy icon. */
function createCopyIcon() {
    const icon = document.createElementNS(SVG_NAMESPACE, "svg");
    icon.setAttribute("viewBox", "0 0 16 16");
    icon.setAttribute("width", "16");
    icon.setAttribute("height", "16");
    icon.setAttribute("aria-hidden", "true");

    const back = document.createElementNS(SVG_NAMESPACE, "rect");
    back.setAttribute("x", "6");
    back.setAttribute("y", "2");
    back.setAttribute("width", "7");
    back.setAttribute("height", "7");
    back.setAttribute("rx", "1");
    back.setAttribute("fill", "none");
    back.setAttribute("stroke", "currentColor");
    back.setAttribute("stroke-width", "1.5");

    const front = document.createElementNS(SVG_NAMESPACE, "rect");
    front.setAttribute("x", "3");
    front.setAttribute("y", "5");
    front.setAttribute("width", "7");
    front.setAttribute("height", "7");
    front.setAttribute("rx", "1");
    front.setAttribute("fill", "none");
    front.setAttribute("stroke", "currentColor");
    front.setAttribute("stroke-width", "1.5");

    icon.append(back, front);

    return icon;
}
