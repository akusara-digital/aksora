const CACHE_NAME = "aksora-static-v2";
const STATIC_EXTENSIONS = [".js", ".css", ".woff2", ".woff", ".ttf", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico"];

function isStaticAsset(url) {
  return STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle http and https requests (ignore chrome-extension:, data:, moz-extension:, etc.)
  if (!event.request.url.startsWith("http://") && !event.request.url.startsWith("https://")) {
    return;
  }

  const url = new URL(event.request.url);

  // Only cache GET requests for static assets originating from our own host
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (!isStaticAsset(url)) return;

  // Skip _next/data (dynamic JSON)
  if (url.pathname.includes("/_next/data/")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone).catch(() => {});
        }).catch(() => {});
        return response;
      });
    })
  );
});
