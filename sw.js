const CACHE_NAME = "boda-diego-liz-v25";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/audio/photograph-ed-sheeran.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(
        CORE_ASSETS.map((url) => cache.add(url).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function respuestaParcial(request, cachedResponse) {
  const range = request.headers.get("range");
  if (!range || !cachedResponse) return null;

  const blob = await cachedResponse.blob();
  const size = blob.size;
  const match = /bytes=(\d+)-(\d+)?/.exec(range);
  if (!match) return cachedResponse;

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  const sliced = blob.slice(start, end + 1);

  return new Response(sliced, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": cachedResponse.headers.get("Content-Type") || "application/octet-stream",
      "Content-Length": String(sliced.size),
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
    },
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const esMismoOrigen = url.origin === self.location.origin;
  const esFuenteGoogle =
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com";

  if (request.method !== "GET" || (!esMismoOrigen && !esFuenteGoogle)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (esFuenteGoogle) {
      try {
        const fresh = await fetch(request);
        if (fresh.ok || fresh.type === "opaque") cache.put(request, fresh.clone());
        return fresh;
      } catch (error) {
        return cached || Response.error();
      }
    }

    const partial = await respuestaParcial(request, cached);
    if (partial) return partial;
    if (request.headers.has("range") && !cached) {
      return fetch(request);
    }

    const esCodigoCritico =
      request.mode === "navigate" ||
      request.destination === "style" ||
      request.destination === "script" ||
      url.pathname.endsWith(".html");

    if (esCodigoCritico) {
      try {
        const fresh = await fetch(request);
        cache.put(request.mode === "navigate" ? "/" : request, fresh.clone());
        return fresh;
      } catch (error) {
        return cached || cache.match("/index.html");
      }
    }

    if (cached) return cached;

    try {
      const fresh = await fetch(request);
      if (fresh.ok) cache.put(request, fresh.clone());
      return fresh;
    } catch (error) {
      return cache.match("/index.html");
    }
  })());
});
