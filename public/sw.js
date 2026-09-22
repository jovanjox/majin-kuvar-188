/*
 * Service worker za Majin kuvar — da kuvar radi i kad u kuhinji nema signala.
 *
 * - Navigacije (HTML): prvo mreža, pa keš; ako nema ničeg, keširana početna "/".
 * - Statički fajlovi sa istog origin-a (build JS/CSS, slike recepata, ikonice,
 *   manifest, favicon): heširani /assets/* iz keša, ostalo stale-while-revalidate.
 * - Ne keširamo ne-GET zahteve, druge origin-e ni /_vinext/image.
 *
 * Kad se promeni strategija ili sadržaj precache-a, podigni VERSION da bi se
 * stari keševi obrisali na "activate".
 */

const VERSION = "v1";
const PREFIX = "majin-kuvar-";
const PAGES_CACHE = `${PREFIX}strane-${VERSION}`;
const STATIC_CACHE = `${PREFIX}staticko-${VERSION}`;

const PRECACHE_STATIC = [
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const STATIC_PREFIXES = ["/assets/", "/recipes/", "/icons/"];
const STATIC_FILES = new Set(["/manifest.webmanifest", "/favicon.svg", "/og.jpg"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGES_CACHE);
      const response = await fetch("/", { cache: "reload" });
      if (response.ok) {
        await pages.put("/", response.clone());
        // JS/CSS koje početna učitava odmah stavljamo u keš, da bi "/" radila
        // bez mreže i posle prve posete (sve ostalo se kešira usput).
        const html = await response.text();
        const assets = [...new Set(html.match(/\/assets\/[\w.-]+\.(?:js|css)/g) ?? [])];
        const statics = await caches.open(STATIC_CACHE);
        await Promise.all(assets.map((asset) => statics.add(asset).catch(() => undefined)));
      }
      const statics = await caches.open(STATIC_CACHE);
      await statics.addAll(PRECACHE_STATIC);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const current = new Set([PAGES_CACHE, STATIC_CACHE]);
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith(PREFIX) && !current.has(key)).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/_vinext/image" || url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, url));
    return;
  }

  if (STATIC_FILES.has(url.pathname) || STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(url.pathname.startsWith("/assets/") ? cacheFirst(event, request) : staleWhileRevalidate(event, request));
  }
});

/** Ključ za HTML u kešu: putanja bez query-ja (hash ionako ne stiže do servera). */
function pageKey(url) {
  return url.pathname;
}

async function handleNavigation(request, url) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") await cache.put(pageKey(url), response.clone());
    return response;
  } catch (error) {
    const cached = (await cache.match(pageKey(url))) ?? (await cache.match("/"));
    if (cached) return cached;
    throw error;
  }
}

function isCacheable(response) {
  return response && response.ok && response.type === "basic";
}

async function cacheFirst(event, request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) event.waitUntil(cache.put(request, response.clone()));
  return response;
}

async function staleWhileRevalidate(event, request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (isCacheable(response)) event.waitUntil(cache.put(request, response.clone()));
    return response;
  });
  if (cached) {
    event.waitUntil(network.catch(() => undefined));
    return cached;
  }
  return network;
}
