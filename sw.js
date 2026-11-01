const CACHE_NAME = "boda-diego-liz-v75";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/audio/photograph-ed-sheeran.mp3",
  "/audio/cardFan2.ogg",
  "/audio/carta-baraja-clean.wav",
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
  if (!size) return null;

  const match = /bytes=(\d+)-(\d+)?/.exec(range);
  if (!match) return cachedResponse;

  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start >= size || start > end) {
    return new Response(null, {
      status: 416,
      statusText: "Range Not Satisfiable",
      headers: { "Content-Range": `bytes */${size}` },
    });
  }

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
        if (fresh.ok || fresh.type === "opaque") {
          cache.put(request, fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch (error) {
        return cached || Response.error();
      }
    }

    if (request.headers.has("range")) {
      const cachedMedia = cached || (await cache.match(request, { ignoreSearch: true }));
      const partial = await respuestaParcial(request, cachedMedia);
      if (partial) return partial;
      return fetch(request);
    }

    const esDocumento =
      request.mode === "navigate" || url.pathname.endsWith(".html");
    const esCodigoCritico =
      esDocumento ||
      request.destination === "style" ||
      request.destination === "script";

    if (esCodigoCritico) {
      try {
        const fresh = await fetch(request);
        // Solo se guarda en caché si la respuesta es correcta (nunca 404/500)
        if (fresh.ok && fresh.status === 200) {
          cache.put(request.mode === "navigate" ? "/" : request, fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch (error) {
        // Sin red: se ignora el ?v= de la URL para encontrar la copia precacheada
        const respaldo = cached || (await cache.match(request, { ignoreSearch: true }));
        if (respaldo) return respaldo;
        if (esDocumento) {
          return (await cache.match("/index.html")) || (await cache.match("/")) || Response.error();
        }
        return Response.error();
      }
    }

    if (cached) return cached;

    try {
      const fresh = await fetch(request);
      if (fresh.ok && fresh.status === 200) cache.put(request, fresh.clone()).catch(() => {});
      return fresh;
    } catch (error) {
      return (await cache.match(request, { ignoreSearch: true })) || Response.error();
    }
  })());
});
