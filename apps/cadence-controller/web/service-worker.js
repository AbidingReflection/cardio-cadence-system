const CACHE_NAME = "cadence-controller-v2";

const HEALTH_URL = "/health";
const HEALTH_TIMEOUT_MS = 1250;
const HEALTH_SUCCESS_TTL_MS = 10_000;
const HEALTH_FAILURE_TTL_MS = 10_000;

const PRECACHE_URLS = [
    "/cadence-controller/",
    "/cadence-controller/index.html",
    "/cadence-controller/manifest.webmanifest",
    "/data/true-elliptical-108-minute-session.json",
];

let healthState = null;
let healthCheckedAt = 0;
let healthCheckPromise = null;

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
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

    event.respondWith(handleCacheableRequest(request));
});

async function handleCacheableRequest(request) {
    const serverReachable = await isServerReachable();

    if (!serverReachable) {
        return caches.match(request);
    }

    try {
        const response = await fetch(request);

        if (!response.ok) {
            return response;
        }

        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());

        return response;
    } catch {
        healthState = false;
        healthCheckedAt = Date.now();

        return caches.match(request);
    }
}

async function isServerReachable() {
    const now = Date.now();

    if (healthState !== null) {
        const ttl = healthState ? HEALTH_SUCCESS_TTL_MS : HEALTH_FAILURE_TTL_MS;

        if (now - healthCheckedAt < ttl) {
            return healthState;
        }
    }

    if (healthCheckPromise !== null) {
        return healthCheckPromise;
    }

    healthCheckPromise = checkServerHealth();

    try {
        healthState = await healthCheckPromise;
        healthCheckedAt = Date.now();

        return healthState;
    } finally {
        healthCheckPromise = null;
    }
}

async function checkServerHealth() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

    try {
        const response = await fetch(HEALTH_URL, {
            cache: "no-store",
            signal: controller.signal,
        });

        return response.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timeoutId);
    }
}
