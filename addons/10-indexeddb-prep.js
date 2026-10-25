/* Shop Board add-on: indexeddb-prep */
(window.ShopBoardAddOns = window.ShopBoardAddOns || []).push(async function () {
const Storage = window.ShopBoardDatabase;
await (async function () {
  "use strict";
  if (window.ShopBoardIndexedDBPrep) return;
  const DB_NAME = "SHOP_BOARD_LOCAL_DB";
  let databasePromise = null;
  let busy = false;
  function message(text) {
    const status = document.getElementById("shopIDBStatus");
    if (status) status.textContent = text;
  }
  function openDatabase() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error("IndexedDB is not available in this browser.")); return; }
      let finished = false;
      const timer = setTimeout(() => {
        if (finished) return;
        finished = true;
        reject(new Error("Database opening timed out. Close other Shop Board tabs and try again."));
      }, 15000);
      const request = window.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("snapshots")) db.createObjectStore("snapshots", {keyPath:"id"});
        if (!db.objectStoreNames.contains("metadata")) db.createObjectStore("metadata", {keyPath:"id"});
      };
      request.onblocked = () => message("Database opening is blocked. Close other Shop Board tabs and try again.");
      request.onerror = () => {
        if (finished) return;
        finished = true; clearTimeout(timer);
        reject(request.error || new Error("Could not open the device database."));
      };
      request.onsuccess = () => {
        if (finished) { request.result.close(); return; }
        finished = true; clearTimeout(timer);
        const db = request.result;
        db.onversionchange = () => { db.close(); databasePromise = null; };
        resolve(db);
      };
    }).catch(error => { databasePromise = null; throw error; });
    return databasePromise;
  }
  function transaction(db, stores, mode, work) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let result;
      let operationError = null;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(operationError || tx.error || new Error("Database transaction was aborted."));
      tx.onerror = () => { operationError = tx.error || new Error("Database write/read failed."); };
      try { work(tx, value => { result = value; }); }
      catch (e) { operationError = e; try { tx.abort(); } catch (abortError) { reject(e); } }
    });
  }
  function read(db, store, id) {
    return transaction(db, [store], "readonly", (tx, setResult) => {
      const request = tx.objectStore(store).get(id);
      request.onsuccess = () => setResult(request.result || null);
    });
  }
  function captureSavedData(){const values=Storage.values();Storage.validate(values);return values;}
  function signature(values) {
    return JSON.stringify(Object.keys(values).sort().map(key => [key, values[key]]));
  }
  function counts(values) {
    const data = JSON.parse(values.SHOP_BOARD_DATA);
    let photos = 0, documents = 0, expenses = 0;
    data.jobs.forEach(job => {
      photos += Array.isArray(job.photos) ? job.photos.length : 0;
      documents += Array.isArray(job.files) ? job.files.length : 0;
      expenses += Array.isArray(job.expenses) ? job.expenses.length : 0;
    });
    return data.jobs.length + " jobs, " + data.clients.length + " clients, " + data.crewMembers.length +
      " crew, " + photos + " photo records, " + documents + " document records, " + expenses + " expenses, and " +
      (Object.keys(values).length - 1) + " preference entries";
  }
  async function checkCopy() {
    try {
      const db = await openDatabase();
      const meta = await read(db, "metadata", "verified-copy");
      if (!meta) { message("No preparation snapshot yet. Active storage: " + Storage.backendLabel() + "."); return false; }
      const record = await read(db, "snapshots", meta.snapshotId);
      if (!record || !record.values || signature(record.values) !== record.signature) throw new Error("The IndexedDB copy could not be verified.");
      const current = captureSavedData();
      const matches = signature(current) === record.signature;
      message("Verified IndexedDB copy from " + new Date(record.copiedAt).toLocaleString() + ". " + counts(record.values) + ". " +
        (matches ? "It matches your current saved data." : "Your current saved data has changed. Prepare a fresh copy before switching storage.") +
        " Active storage: " + Storage.backendLabel() + ".");
      return matches;
    } catch (e) { message("Could not check the IndexedDB copy: " + e.message + " Original saved records were not changed."); return false; }
  }
  async function prepareCopy() {
    if (busy || typeof DATA === "undefined" || !DATA.currentUser || DATA.currentUser.role !== "Owner") return false;
    busy = true;
    const button = document.getElementById("shopIDBPrepare");
    if (button) { button.disabled = true; button.textContent = "Preparing and verifying…"; }
    let db = null, candidateId = null, published = false;
    try {
      const values = captureSavedData();
      const expected = signature(values);
      db = await openDatabase();
      const previous = await read(db, "metadata", "verified-copy");
      candidateId = uid("copy") + "_" + Math.random().toString(36).slice(2);
      const record = {id:candidateId, copiedAt:new Date().toISOString(), values:values, signature:expected};
      message("Copying saved records, attachments, logo, and preferences into IndexedDB…");
      await transaction(db, ["snapshots"], "readwrite", tx => { tx.objectStore("snapshots").put(record); });
      const readback = await read(db, "snapshots", candidateId);
      if (!readback || signature(readback.values) !== expected) throw new Error("Read-back verification did not match the original records.");
      if (signature(captureSavedData()) !== expected) throw new Error("Saved records changed while copying. No new copy was activated. Try again.");
      await transaction(db, ["metadata", "snapshots"], "readwrite", tx => {
        tx.objectStore("metadata").put({id:"verified-copy", snapshotId:candidateId, copiedAt:record.copiedAt});
        if (previous && previous.snapshotId !== candidateId) tx.objectStore("snapshots").delete(previous.snapshotId);
      });
      published = true;
      message("IndexedDB copy prepared and read-back verified: " + counts(values) + ". Original records and preferences remain unchanged. This is a snapshot, not live sync. Active storage: " + Storage.backendLabel() + ".");
      return true;
    } catch (e) {
      if (db && candidateId && !published) {
        try { await transaction(db, ["snapshots"], "readwrite", tx => { tx.objectStore("snapshots").delete(candidateId); }); } catch (cleanupError) {}
      }
      message("Preparation failed: " + e.message + " Your original saved records were not changed. The previous verified copy, if any, remains available.");
      return false;
    } finally {
      busy = false;
      if (button) { button.disabled = false; button.textContent = "Prepare / Refresh IndexedDB Copy"; }
    }
  }
  function insertPanel() {
    if (typeof DATA === "undefined" || !DATA.currentUser || DATA.currentUser.role !== "Owner") return;
    if (!document.getElementById("companySettingsForm") || document.getElementById("shopIDBPanel")) return;
    const sheet = document.getElementById("modalSheet");
    if (!sheet) return;
    const panel = document.createElement("section");
    panel.id = "shopIDBPanel";
    panel.className = "shop-idb-panel";
    panel.setAttribute("aria-label", "IndexedDB storage preparation");
    panel.innerHTML = `
      <h3 style="font-size:20px;margin-bottom:8px;">Storage — IndexedDB</h3>
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:12px;">Installing this update does not switch storage. Prepare and check a snapshot, save an exported backup, then activate IndexedDB explicitly. After activation the old localStorage copy is historical, not a live backup.</p>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Export and save a backup first. Unsaved form edits are not copied. Embedded files are included; missing or externally linked files are not downloaded. This is local device storage, not cloud backup.</p>
      <p id="shopStorageMode" role="status" style="margin:12px 0;"></p>
      <label style="display:flex;gap:10px;margin:12px 0;"><input id="shopIDBActivationConfirmed" type="checkbox" style="min-width:24px;min-height:24px;"><span>I saved an exported backup and closed other Shop Board tabs before activating.</span></label>
      <button id="shopIDBActivate" type="button" class="big-btn">Activate IndexedDB Storage</button>
      <button id="shopIDBVerifyActive" type="button" class="big-btn secondary">Check Active IndexedDB Storage</button>
      <button id="shopIDBPrepare" type="button" class="big-btn">Prepare / Refresh IndexedDB Copy</button>
      <button id="shopIDBCheck" type="button" class="big-btn secondary">Check Copy Against Current Data</button>
      <p id="shopIDBStatus" role="status" aria-live="polite" style="font-size:13px;overflow-wrap:anywhere;color:var(--text-muted);">Checking preparation status…</p>`;
    const footer = document.getElementById("shopSettingsFooter");
    if (footer && footer.parentNode === sheet) sheet.insertBefore(panel, footer); else sheet.appendChild(panel);
    document.getElementById("shopIDBPrepare").addEventListener("click", prepareCopy);
    document.getElementById("shopIDBCheck").addEventListener("click", () => { if (!busy) checkCopy(); });
    updateMode();
    document.getElementById("shopIDBActivate").addEventListener("click",activateStorage);
    document.getElementById("shopIDBVerifyActive").addEventListener("click",verifyStorage);
    checkCopy();
  }

  function updateMode(){const n=document.getElementById("shopStorageMode");if(n)n.textContent="Active storage: "+Storage.backendLabel()+(Storage.isActive()?". Old localStorage records are historical.":". IndexedDB has not been activated.");const a=document.getElementById("shopIDBActivate"),v=document.getElementById("shopIDBVerifyActive");if(a)a.disabled=Storage.isActive();if(v)v.disabled=!Storage.isActive();}
  async function activateStorage(){if(busy||Storage.isBusy()||Storage.isActive())return;const c=document.getElementById("shopIDBActivationConfirmed");if(!c||!c.checked){message("Save an exported backup, close other tabs and check the confirmation box first.");return;}busy=true;const b=document.getElementById("shopIDBActivate");b.disabled=true;b.textContent="Verifying and activating…";try{if(!await checkCopy())throw Error("Prepare and check a fresh snapshot before activating.");await Storage.activate(captureSavedData());message("IndexedDB is now active. Reload normally and test a temporary note. The old localStorage copy was not removed or updated.");showToast("IndexedDB storage activated");}catch(e){message("Activation was not completed: "+e.message+" Current storage remains unchanged.");}finally{busy=false;b.textContent="Activate IndexedDB Storage";updateMode();}}
  async function verifyStorage(){if(busy||Storage.isBusy())return;busy=true;const b=document.getElementById("shopIDBVerifyActive");b.disabled=true;b.textContent="Checking active storage…";message("Reading active saved records and preferences…");try{await Storage.checkActive();message("Active IndexedDB storage verified against this app's committed storage cache.");showToast("Active IndexedDB verified");}catch(e){message("Storage check failed: "+e.message);showToast("Storage check failed—see status");}finally{busy=false;b.textContent="Check Active IndexedDB Storage";updateMode();}}

  const originalSettings = window.openCompanySettings;
  if (typeof originalSettings === "function") {
    window.openCompanySettings = function () {
      const result = originalSettings.apply(this, arguments);
      insertPanel();
      return result;
    };
  }
  const sheet = document.getElementById("modalSheet");
  if (sheet && window.MutationObserver) new MutationObserver(insertPanel).observe(sheet, {childList:true});
  window.ShopBoardIndexedDBPrep = {prepareCopy:prepareCopy, checkCopy:checkCopy, captureSavedData:captureSavedData};
})();
});
