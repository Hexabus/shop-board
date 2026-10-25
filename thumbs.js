/* Shop Board thumbnails.
   List screens show small cached copies of photos and receipt images instead of decoding the full images.
   Thumbnails live in their own database (SHOP_BOARD_THUMBS), are rebuilt on demand, and are never part of
   your saved records, backups or cloud snapshots. If anything here fails, the full image is shown instead. */
(function () {
  "use strict";
  if (window.ShopBoardThumbs) return;
  var DB_NAME = "SHOP_BOARD_THUMBS", STORE = "thumbs", MAX_SIDE = 480, QUALITY = 0.72, SKIP_BELOW = 60 * 1024;
  var PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  var memory = new Map(), dbPromise = null, queue = [], running = false, scheduled = false;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      try {
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function () { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, {keyPath: "key"}); };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = req.onblocked = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
    return dbPromise;
  }
  function request(mode, work) {
    return openDb().then(function (db) {
      if (!db) return null;
      return new Promise(function (resolve) {
        try {
          var t = db.transaction(STORE, mode), out = null;
          work(t.objectStore(STORE), function (v) { out = v; });
          t.oncomplete = function () { resolve(out); };
          t.onerror = t.onabort = function () { resolve(null); };
        } catch (e) { resolve(null); }
      });
    });
  }
  function dbGet(key) { return request("readonly", function (s, set) { var r = s.get(key); r.onsuccess = function () { set(r.result || null); }; }); }
  function dbPut(rec) { return request("readwrite", function (s) { s.put(rec); }); }
  function dbKeys() { return request("readonly", function (s, set) { var r = s.getAllKeys(); r.onsuccess = function () { set(r.result || []); }; }); }
  function dbDelete(keys) { return request("readwrite", function (s) { keys.forEach(function (k) { s.delete(k); }); }); }

  function source(kind, jobId, itemId) {
    var data = window.DATA, job = data && data.jobs ? data.jobs.find(function (j) { return j.id === jobId; }) : null;
    if (!job) return null;
    if (kind === "receipt") { var e = (job.expenses || []).find(function (x) { return x.id === itemId; }); return e && e.photoUrl ? e.photoUrl : null; }
    var p = (job.photos || []).find(function (x) { return x.id === itemId; }); return p && p.url ? p.url : null;
  }
  function makeKey(kind, jobId, itemId, url) { return kind + ":" + jobId + ":" + itemId + ":" + url.length; }

  function generate(url) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        try {
          var scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height)), w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
          var c = document.createElement("canvas"); c.width = w; c.height = h;
          c.getContext("2d").drawImage(img, 0, 0, w, h);
          c.toBlob(function (blob) {
            if (!blob) { resolve(null); return; }
            var reader = new FileReader();
            reader.onload = function () { resolve({buffer: reader.result, type: blob.type || "image/jpeg"}); };
            reader.onerror = function () { resolve(null); };
            reader.readAsArrayBuffer(blob);
          }, "image/jpeg", QUALITY);
        } catch (e) { resolve(null); }
      };
      img.onerror = function () { resolve(null); };
      img.src = url;
    });
  }
  function objectUrl(rec) { return URL.createObjectURL(new Blob([rec.buffer], {type: rec.type})); }

  async function resolveThumb(kind, jobId, itemId) {
    var url = source(kind, jobId, itemId);
    if (!url) return null;
    if (url.length < SKIP_BELOW) return url;
    var key = makeKey(kind, jobId, itemId, url);
    if (memory.has(key)) return memory.get(key);
    var rec = await dbGet(key);
    if (!rec) {
      var made = await generate(url);
      if (!made || made.buffer.byteLength * 1.34 >= url.length) return url;
      rec = {key: key, buffer: made.buffer, type: made.type};
      await dbPut(rec);
    }
    var shown = objectUrl(rec);
    memory.set(key, shown);
    return shown;
  }

  async function process(img) {
    var state = {kind: img.dataset.thumb, job: img.dataset.job, item: img.dataset.item};
    try {
      var shown = await resolveThumb(state.kind, state.job, state.item);
      if (shown && img.isConnected) img.src = shown;
    } catch (e) {
      var full = source(state.kind, state.job, state.item);
      if (full && img.isConnected) img.src = full;
    }
    img.dataset.thumbState = "ready";
  }
  async function drain() {
    if (running) return;
    running = true;
    while (queue.length) { var img = queue.shift(); if (img.isConnected) await process(img); }
    running = false;
  }
  function hydrate(root) {
    var list = (root || document).querySelectorAll("img[data-thumb]:not([data-thumb-state])");
    list.forEach(function (img) { img.dataset.thumbState = "pending"; queue.push(img); });
    if (queue.length) drain();
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || setTimeout)(function () { scheduled = false; hydrate(document); });
  }
  /* Attributes for a list-screen <img>. Embedded images get a placeholder plus lookup IDs; links are used as is. */
  window.thumbAttrs = function (kind, jobId, itemId, url) {
    url = String(url || "");
    if (!/^data:image\//.test(url)) return 'src="' + window.esc(url) + '"';
    return 'src="' + PLACEHOLDER + '" data-thumb="' + window.esc(kind) + '" data-job="' + window.esc(jobId) + '" data-item="' + window.esc(itemId) + '"';
  };
  /* Remove thumbnails whose photo no longer exists. They are always rebuildable. */
  async function prune() {
    var data = window.DATA; if (!data || !Array.isArray(data.jobs)) return;
    var keep = new Set();
    data.jobs.forEach(function (j) {
      (j.photos || []).forEach(function (p) { if (p.url) keep.add(makeKey("photo", j.id, p.id, p.url)); });
      (j.expenses || []).forEach(function (e) { if (e.photoUrl) keep.add(makeKey("receipt", j.id, e.id, e.photoUrl)); });
    });
    var keys = await dbKeys(); if (!keys) return;
    var stale = keys.filter(function (k) { return !keep.has(k); });
    if (stale.length) await dbDelete(stale);
  }
  async function stats() {
    var recs = await request("readonly", function (s, set) { var r = s.getAll(); r.onsuccess = function () { set(r.result || []); }; });
    var list = recs || [];
    return {count: list.length, bytes: list.reduce(function (n, r) { return n + (r.buffer ? r.buffer.byteLength : 0); }, 0)};
  }
  function start() {
    var host = document.getElementById("appContainer");
    if (host && window.MutationObserver) new MutationObserver(schedule).observe(host, {childList: true, subtree: true});
    hydrate(document);
    setTimeout(function () { prune().catch(function () {}); }, 8000);
  }
  window.ShopBoardThumbs = {hydrate: hydrate, stats: stats, prune: prune};
  if (window.ShopBoardBootPromise && window.ShopBoardBootPromise.then) window.ShopBoardBootPromise.then(start, function () {});
  else window.addEventListener("load", function () { if (window.ShopBoardBootPromise) window.ShopBoardBootPromise.then(start, function () {}); else start(); });
})();
