(function () {
  "use strict";
  if (window.ShopBoardAppInfo) return;
const APP_VERSION = "0.3.0";
const BUILD = "2026-10-25 — split into separate files";
  const BACKUP_FORMAT = "1";
  const EXPORT_KEY = "shopBoardLastBackupPrepared";
  let generation = 0;
  let exportRunning = false;

  function lastExport() {
    try {
      const value = localStorage.getItem(EXPORT_KEY);
      if (value && !Number.isNaN(Date.parse(value))) return new Date(value).toLocaleString();
    } catch (e) { return "History unavailable on this installation"; }
    return "Not recorded yet — earlier exports are not tracked";
  }
  function workerInfo(worker) {
    if (!worker || typeof MessageChannel === "undefined") return Promise.resolve(null);
    return new Promise(resolve => {
      const channel = new MessageChannel();
      let done = false;
      const finish = value => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        channel.port1.close();
        resolve(value);
      };
      const timer = setTimeout(() => finish(null), 5000);
      channel.port1.onmessage = event => finish(event.data);
      try { worker.postMessage({type:"SHOP_BOARD_OFFLINE_STATUS"}, [channel.port2]); }
      catch (e) { finish(null); }
    });
  }
  function put(id, value, token) {
    if (token !== generation) return;
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }
  async function refresh() {
    if (!document.getElementById("shopAppInfoPanel")) return;
    const token = ++generation;
    put("shopInfoAppVersion", APP_VERSION, token);
    put("shopInfoBuild", BUILD, token);
    put("shopInfoBackupFormat", BACKUP_FORMAT + " (backup-file schema)", token);
    let backend = "Unavailable — app storage has not finished loading";
    try {
      const api = window.ShopBoardDatabase;
      if (api && typeof api.backendLabel === "function") backend = api.backendLabel();
    } catch (e) {}
    put("shopInfoStorage", backend, token);
    put("shopInfoExport", lastExport(), token);
    put("shopInfoCache", "Checking controlling worker…", token);
    put("shopInfoUpdate", "Checking…", token);
    if (!("serviceWorker" in navigator)) {
      put("shopInfoCache", "Service workers are not supported here", token);
      put("shopInfoUpdate", "Unavailable", token);
      return;
    }
    try {
      const expected = new URL("./sw.js", document.baseURI).href;
      const controller = navigator.serviceWorker.controller;
      if (controller && controller.scriptURL === expected) {
        const info = await workerInfo(controller);
        put("shopInfoCache", info && typeof info.version === "string"
          ? info.version + (info.ready ? " — app page cached" : " — app cache missing")
          : "Version could not be confirmed", token);
      } else {
        put("shopInfoCache", "Not controlled by Shop Board's worker yet; reopen online", token);
      }
      const registration = await navigator.serviceWorker.getRegistration(new URL("./", document.baseURI).href);
      if (!registration || (registration.active && registration.active.scriptURL !== expected)) {
        put("shopInfoUpdate", "No matching registration found", token);
      } else if (registration.waiting) {
        const info = await workerInfo(registration.waiting);
        put("shopInfoUpdate", (info && typeof info.version === "string" ? info.version : "New version") +
          " downloaded — finish saving, close all Shop Board windows/tabs, and reopen", token);
      } else if (registration.installing) {
        put("shopInfoUpdate", "A worker is installing — refresh this panel shortly", token);
      } else {
        put("shopInfoUpdate", "No waiting update detected; use Check for app updates to check the server", token);
      }
    } catch (e) {
      put("shopInfoUpdate", "Could not inspect update status: " + e.message, token);
    }
  }
  function insertPanel() {
    if (!document.getElementById("companySettingsForm") || document.getElementById("shopAppInfoPanel")) return;
    const sheet = document.getElementById("modalSheet");
    if (!sheet) return;
    const panel = document.createElement("section");
    panel.id = "shopAppInfoPanel";
    panel.className = "shop-app-info-panel";
    panel.setAttribute("aria-label", "App information");
    panel.innerHTML = `
      <h3 style="font-size:20px;margin:0 0 12px;">App Information</h3>
      <dl class="shop-app-info-list">
        <dt>App version</dt><dd id="shopInfoAppVersion"></dd>
        <dt>Build</dt><dd id="shopInfoBuild"></dd>
        <dt>Backup format</dt><dd id="shopInfoBackupFormat"></dd>
        <dt>Active storage</dt><dd id="shopInfoStorage"></dd>
        <dt>Controlling offline cache</dt><dd id="shopInfoCache"></dd>
        <dt>Update status</dt><dd id="shopInfoUpdate"></dd>
        <dt>Last backup prepared here</dt><dd id="shopInfoExport"></dd>
      </dl>
      <p style="font-size:13px;color:var(--text-muted);margin:12px 0;">This tracks successful backup preparation through the Export Backup button on this installation, starting with this update. It does not verify that a file was saved or restored, and is not shared between devices.</p>
      <button id="shopInfoRefresh" type="button" class="big-btn secondary">Refresh App Information</button>`;
    const footer = document.getElementById("shopSettingsFooter");
    if (footer && footer.parentNode === sheet) sheet.insertBefore(panel, footer);
    else sheet.appendChild(panel);
    document.getElementById("shopInfoRefresh").addEventListener("click", refresh);
    refresh();
  }
  document.addEventListener("click", async event => {
    const target = event.target && event.target.closest ? event.target.closest("#shopExportBackupButton") : null;
    if (!target) return;
    const api = window.ShopBoardBackupExport;
    const link = document.getElementById("shopBackupDownload");
    if (!api || typeof api.exportBackup !== "function" || !link) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (exportRunning) return;
    exportRunning = true;
    const previous = link.getAttribute("href");
    try {
      await api.exportBackup();
      const next = link.getAttribute("href");
      if (next && next !== previous && !link.hidden) {
        try { localStorage.setItem(EXPORT_KEY, new Date().toISOString()); }
        catch (e) { /* Tracking failure must not turn a successful export into an error. */ }
      }
      refresh();
    } catch (e) {
      const status = document.getElementById("shopBackupStatus");
      if (status) status.textContent = "Backup preparation failed: " + e.message + ". Your saved records were not changed by App Information.";
    } finally { exportRunning = false; }
  }, true);
  function setup() {
    if (document.body.getAttribute("data-shop-boot") === "loading") return;
    const original = window.openCompanySettings;
    if (typeof original === "function") {
      window.openCompanySettings = function () {
        const result = original.apply(this, arguments);
        insertPanel();
        return result;
      };
    }
    const sheet = document.getElementById("modalSheet");
    if (sheet && window.MutationObserver) new MutationObserver(insertPanel).observe(sheet, {childList:true});
    if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("controllerchange", refresh);
    insertPanel();
  }
  window.ShopBoardAppInfo = {version:APP_VERSION, refresh:refresh};
  if (window.ShopBoardBootPromise && typeof window.ShopBoardBootPromise.then === "function") window.ShopBoardBootPromise.then(setup);
  else setup();
})();

