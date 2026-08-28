/** Loads an SVG file into a graph container. */
async function loadSvgIntoContainer(container) {
    const svgSrc = container.dataset.svgSrc;

    if (!svgSrc) {
        return;
    }

    const response = await fetch(svgSrc);

    if (!response.ok) {
        throw new Error(
            `Failed to load SVG "${svgSrc}": ${response.status} ${response.statusText}`,
        );
    }

    container.innerHTML = await response.text();
}

/** Loads all graph SVG files declared in the page. */
export async function loadGraphSvgs() {
    const containers = document.querySelectorAll("[data-svg-src]");

    await Promise.all(
        [...containers].map((container) => loadSvgIntoContainer(container)),
    );
}
