"use strict";

const VERSION = "v6"; // Change this for every future index.html release.
const BASE = new URL(self.registration.scope);
const APP_URL = new URL("index.html", BASE).href;
const CACHE_PREFIX = "shop-board-shell:" + BASE.pathname + ":";
const CACHE_NAME = CACHE_PREFIX + VERSION;

function isAppResponse(response) {
  return response.ok && (response.headers.get("content-type") || "").includes("text/html");
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const response = await fetch(new Request(APP_URL, {cache:"reload"}));
    if (!isAppResponse(response)) throw new Error("Shop Board app page could not be cached.");
    const cache = await caches.open(CACHE_NAME);
    await cache.put(APP_URL, response);
  })());
  // Do not skipWaiting: updates wait until all old app windows are closed.
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== BASE.origin) return;
  if (url.pathname !== BASE.pathname && url.pathname !== new URL(APP_URL).pathname) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const saved = await cache.match(APP_URL);
    if (saved) return saved;
    try {
      const response = await fetch(request);
      if (isAppResponse(response)) await cache.put(APP_URL, response.clone());
      return response;
    } catch (error) {
      return new Response("Shop Board has no cached app page available. Reconnect and open it online first. Do not clear site data; your saved records are separate from this app-page cache.", {
        status:503, headers:{"Content-Type":"text/plain; charset=utf-8"}
      });
    }
  })());
});

self.addEventListener("message", event => {
  if (!event.data || event.data.type !== "SHOP_BOARD_OFFLINE_STATUS" || !event.ports[0]) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const saved = await cache.match(APP_URL);
    event.ports[0].postMessage({ready:Boolean(saved), version:VERSION});
  })());
});
