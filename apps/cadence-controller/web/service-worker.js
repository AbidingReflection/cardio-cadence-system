const CACHE_NAME = "cadence-controller-v1";

const PRECACHE_URLS = [
    "/cadence-controller/",
    "/cadence-controller/index.html",
    "/cadence-controller/manifest.webmanifest",
    "/data/true-elliptical-108-minute-session.json",
];

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) =>
                Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName !== CACHE_NAME)
                        .map((cacheName) => caches.delete(cacheName)),
                ),
            ),
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

    event.respondWith(
        fetch(request)
            .then((response) => {
                if (!response.ok) {
                    return response;
                }

                const responseClone = response.clone();

                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseClone);
                });

                return response;
            })
            .catch(() => caches.match(request)),
    );
});
