(function () {
  "use strict";
  if (window.ShopBoardAppInfo) return;
const APP_VERSION = "0.4.3";
const BUILD = "2026-10-25 — working PDF open/save, Files section";
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
  const CLOUD_LIMIT = 10 * 1024 * 1024;
  function fmt(bytes) {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + " GB";
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
    return Math.max(1, Math.round(bytes / 1024)) + " KB";
  }
  const bytesOf = text => new Blob([String(text)]).size;
  const isEmbedded = value => typeof value === "string" && /^data:/.test(value);
  /* Read-only: measures the saved records and never changes them. */
  async function storageUse(token) {
    try {
      const raw = window.ShopBoardDatabase.get("SHOP_BOARD_DATA");
      const data = JSON.parse(raw);
      const total = bytesOf(raw);
      const items = [];
      let photos = 0, photoLinks = 0, docs = 0, docFiles = 0, receipts = 0, bytesPhotos = 0, bytesDocs = 0, bytesReceipts = 0;
      (data.jobs || []).forEach(job => {
        (job.photos || []).forEach(p => {
          if (isEmbedded(p.url)) { const n = bytesOf(p.url); photos++; bytesPhotos += n; items.push([n, "Photo" + (p.caption ? " “" + p.caption + "”" : "") + " — " + job.name]); }
          else if (p.url) photoLinks++;
        });
        (job.files || []).forEach(f => {
          docs++;
          if (isEmbedded(f.dataUrl)) { const n = bytesOf(f.dataUrl); docFiles++; bytesDocs += n; items.push([n, "Document “" + f.name + "” — " + job.name]); }
        });
        (job.expenses || []).forEach(e => {
          if (isEmbedded(e.photoUrl)) { const n = bytesOf(e.photoUrl); receipts++; bytesReceipts += n; items.push([n, "Receipt image — " + job.name]); }
        });
      });
      const logo = data.business && isEmbedded(data.business.logoDataUrl) ? bytesOf(data.business.logoDataUrl) : 0;
      items.sort((a, b) => b[0] - a[0]);
      put("shopInfoDataSize", fmt(total) + " (" + (data.jobs || []).length + " jobs, " + (data.clients || []).length + " clients)", token);
      put("shopInfoPhotos", photos + " saved in app (" + fmt(bytesPhotos) + ")" + (photoLinks ? ", " + photoLinks + " web links" : ""), token);
      put("shopInfoDocs", docs + (docs === 1 ? " record, " : " records, ") + docFiles + " with files (" + fmt(bytesDocs) + ")", token);
      put("shopInfoReceipts", receipts + " receipt images (" + fmt(bytesReceipts) + ")" + (logo ? ", logo " + fmt(logo) : ""), token);
      put("shopInfoLargest", items.length ? items.slice(0, 3).map(i => fmt(i[0]) + " — " + i[1]).join("\n") : "No embedded files yet", token);
      const percent = Math.round(total / CLOUD_LIMIT * 100);
      put("shopInfoCloudLimit", percent + "% of the 10 MiB cloud snapshot limit used by records alone", token);
      let note = "Healthy: storage use is small.";
      if (percent >= 80) note = "Near the cloud limit: cloud snapshots may soon be refused. Do not delete attachments to fit; tell the developer.";
      else if (percent >= 50) note = "Growing: past half of the cloud snapshot limit. Plan the photo and document storage upgrade.";
      else if (total >= 5 * 1048576) note = "Growing: records are over 5 MB. Keep an eye on this.";
      put("shopInfoAssessment", note, token);
    } catch (e) {
      put("shopInfoDataSize", "Could not measure: " + e.message, token);
    }
    try {
      const t = window.ShopBoardThumbs ? await window.ShopBoardThumbs.stats() : null;
      put("shopInfoThumbs", t ? t.count + " small copies (" + fmt(t.bytes) + "); rebuilt automatically" : "Not available", token);
    } catch (e) { put("shopInfoThumbs", "Not available", token); }
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        put("shopInfoBrowser", fmt(est.usage || 0) + " used of about " + fmt(est.quota || 0) + " allowed (estimate)", token);
      } else put("shopInfoBrowser", "Estimate not supported in this browser", token);
    } catch (e) { put("shopInfoBrowser", "Estimate unavailable", token); }
  }
  async function refresh() {
    if (!document.getElementById("shopAppInfoPanel")) return;
    const token = ++generation;
    storageUse(token);
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
      <h4 style="font-size:16px;margin:16px 0 8px;">Storage use</h4>
      <dl class="shop-app-info-list">
        <dt>Saved records</dt><dd id="shopInfoDataSize"></dd>
        <dt>Photos</dt><dd id="shopInfoPhotos"></dd>
        <dt>Documents</dt><dd id="shopInfoDocs"></dd>
        <dt>Receipt images and logo</dt><dd id="shopInfoReceipts"></dd>
        <dt>Largest items</dt><dd id="shopInfoLargest"></dd>
        <dt>Cloud backup limit</dt><dd id="shopInfoCloudLimit"></dd>
        <dt>Thumbnail cache</dt><dd id="shopInfoThumbs"></dd>
        <dt>Browser storage</dt><dd id="shopInfoBrowser"></dd>
        <dt>Assessment</dt><dd id="shopInfoAssessment"></dd>
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

