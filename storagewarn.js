/* Low-storage warning: one popup when 15% or less of the cloud snapshot limit is left. Read-only. */
(function () {
  "use strict";
  var LIMIT = 25 * 1024 * 1024;           /* matches the cloud snapshot guard */
  var WARN_AT = 0.85;                      /* 15% left */
  var CRIT_AT = 0.95;                      /* 5% left */
  var KEY = "SHOP_BOARD_STORAGE_WARNED";
  var DAY = 24 * 60 * 60 * 1000;
  window.ShopBoardLimits = { CLOUD_BYTES: LIMIT };

  function fmt(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }
  function measure() {
    var api = window.ShopBoardDatabase;
    if (!api || typeof api.get !== "function") return null;
    var raw = api.get("SHOP_BOARD_DATA");
    return raw ? new Blob([String(raw)]).size : 0;
  }
  function lastWarn() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function remember(level) { try { localStorage.setItem(KEY, JSON.stringify({ level: level, at: Date.now() })); } catch (e) {} }

  function show(title, lines) {
    if (document.getElementById("storageWarnOverlay")) return;
    var ov = document.createElement("div");
    ov.id = "storageWarnOverlay";
    ov.setAttribute("role", "alertdialog");
    var box = document.createElement("div");
    box.className = "storage-warn-box";
    var h = document.createElement("div"); h.className = "storage-warn-title"; h.textContent = title;
    box.appendChild(h);
    lines.forEach(function (t) { var p = document.createElement("p"); p.textContent = t; box.appendChild(p); });
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "big-btn"; btn.textContent = "Got it";
    btn.addEventListener("click", function () { ov.remove(); });
    box.appendChild(btn);
    ov.appendChild(box); document.body.appendChild(ov);
  }

  async function check(force) {
    try {
      var bytes = measure();
      if (bytes === null) return null;
      var ratio = bytes / LIMIT;
      var level = ratio >= CRIT_AT ? 2 : ratio >= WARN_AT ? 1 : 0;
      var browser = null;
      if (navigator.storage && navigator.storage.estimate) {
        var est = await navigator.storage.estimate();
        if (est && est.quota && est.usage / est.quota >= WARN_AT) browser = est;
      }
      var result = { bytes: bytes, ratio: ratio, level: level, browser: !!browser };
      if (!level && !browser) return result;
      var last = lastWarn(), eff = Math.max(level, browser ? 1 : 0);
      if (!force && last && last.level >= eff && Date.now() - last.at < DAY) return result;
      var lines = [];
      if (level) {
        lines.push("Your records use " + fmt(bytes) + ", about " + Math.round(ratio * 100) + "% of the " + fmt(LIMIT) + " cloud backup limit. About " + fmt(Math.max(0, LIMIT - bytes)) + " is left.");
        lines.push("Cloud backups may be refused once the limit is reached. Your data on this device is not affected.");
        lines.push("Open Settings, then App Information, to see the largest items. Please do not delete photos or documents to make room; tell the developer first.");
      }
      if (browser) lines.push("This device also reports about " + fmt(browser.usage) + " used of roughly " + fmt(browser.quota) + " allowed for the app.");
      show("Storage is getting full", lines);
      remember(eff);
      return result;
    } catch (e) { return null; }
  }
  window.ShopBoardStorageWarn = { check: check, LIMIT: LIMIT };
  setTimeout(check, 9000);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") setTimeout(check, 1500); });
})();
