"use strict";

const VERSION = "v12"; // Change this for every future release of any app file.
const BASE = new URL(self.registration.scope);
const CACHE_PREFIX = "shop-board-shell:" + BASE.pathname + ":";
const CACHE_NAME = CACHE_PREFIX + VERSION;

// Every file the app needs to open offline. They are cached together under one
// version so the page, styles and scripts can never be a mixture of two releases.
const ASSETS = [
  "index.html", "styles.css", "manifest.webmanifest",
  "storage.js", "util.js", "thumbs.js", "zoom.js", "app.js",
  "addons/01-appearance.js", "addons/02-backup-export.js", "addons/03-backup-restore.js",
  "addons/04-save-guard.js", "addons/05-start-screen.js", "addons/06-maps-preference.js",
  "addons/07-receipt-category.js", "addons/08-receipt-job-memory.js", "addons/09-settings-layout.js",
  "addons/10-indexeddb-prep.js", "addons/11-indexeddb-button-fix.js",
  "boot.js", "offline.js", "appinfo.js", "cloud.js",
  "apple-touch-icon.png", "icon-192.png", "icon-512.png"
].map(path => new URL(path, BASE).href);
const APP_URL = new URL("index.html", BASE).href;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of ASSETS) {
      const response = await fetch(new Request(url, {cache:"reload"}));
      if (!response.ok) throw new Error("Shop Board could not cache " + url + " (" + response.status + ").");
      await cache.put(url, response);
    }
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
  // Opening the site root serves the cached app page.
  const key = url.pathname === BASE.pathname ? APP_URL : url.origin + url.pathname;
  if (!ASSETS.includes(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const saved = await cache.match(key);
    if (saved) return saved;
    try {
      return await fetch(request);
    } catch (error) {
      return new Response("Shop Board has no cached copy of this file. Reconnect and open it online first. Do not clear site data; your saved records are separate from this app-file cache.", {
        status:503, headers:{"Content-Type":"text/plain; charset=utf-8"}
      });
    }
  })());
});

self.addEventListener("message", event => {
  if (!event.data || event.data.type !== "SHOP_BOARD_OFFLINE_STATUS" || !event.ports[0]) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const keys = new Set((await cache.keys()).map(request => request.url));
    event.ports[0].postMessage({ready:ASSETS.every(url => keys.has(url)), version:VERSION});
  })());
});
