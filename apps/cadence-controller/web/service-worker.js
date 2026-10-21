
const CACHE_NAME = "cadence-controller-v3";
const CACHE_PREFIX = "cadence-controller-v";
const NETWORK_TIMEOUT_MS = 2000;

const PRECACHE_URLS = [
    "/cadence-controller/",
"/cadence-controller/index.html",
"/cadence-controller/manifest.webmanifest",
"/data/true-elliptical-108-minute-session.json",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
        .open(CACHE_NAME)
        .then((cache) => cache.addAll(PRECACHE_URLS)),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();

            const oldCacheNames = cacheNames.filter(
                (name) =>
                name.startsWith(CACHE_PREFIX) &&
                name !== CACHE_NAME,
            );

            const currentCache = await caches.open(CACHE_NAME);

            // Preserve previously cached runtime resources.
            for (const name of oldCacheNames) {
                const oldCache = await caches.open(name);
                const requests = await oldCache.keys();

                for (const request of requests) {
                    if (await currentCache.match(request)) {
                        continue;
                    }

                    const response = await oldCache.match(request);

                    if (response) {
                        await currentCache.put(request, response);
                    }
                }
            }

            // Remove obsolete controller caches only after migration.
            await Promise.all(
                oldCacheNames.map((name) => caches.delete(name)),
            );

            await self.clients.claim();
        })(),
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    const cacheablePath =
    url.pathname.startsWith("/cadence-controller/") ||
    url.pathname.startsWith("/packages/") ||
    url.pathname.startsWith("/data/");

    if (!cacheablePath) {
        return;
    }

    event.respondWith(handleCacheableRequest(request, event));
});

async function handleCacheableRequest(request, event) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    // Cached resources never wait for the network.
    if (cachedResponse) {
        return cachedResponse;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
        () => controller.abort(),
                                 NETWORK_TIMEOUT_MS,
    );

    try {
        const response = await fetch(request, {
            signal: controller.signal,
        });

        if (response.ok && response.type === "basic") {
            // Do not delay the response while writing to the cache.
            event.waitUntil(
                cache.put(request, response.clone()).catch((error) => {
                    console.warn("Resource caching failed:", error);
                }),
            );
        }

        return response;
    } catch {
        return new Response("Resource unavailable offline", {
            status: 503,
            statusText: "Service Unavailable",
        });
    } finally {
        clearTimeout(timeoutId);
    }
}
