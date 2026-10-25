/* Shop Board add-on: backup-restore */
(window.ShopBoardAddOns = window.ShopBoardAddOns || []).push(async function () {
const Storage = window.ShopBoardDatabase;
await (async function () {
  "use strict";
  if (window.ShopBoardBackupRestore) return;
  let pending = null;
  let request = 0;
  const MAX_BYTES = 128 * 1024 * 1024;
  const object = v => v !== null && typeof v === "object" && !Array.isArray(v);
  const text = (v, label) => { if (typeof v !== "string") throw new Error(label + " must be text."); };
  const number = (v, label) => { if (typeof v !== "number" || !Number.isFinite(v) || v < 0) throw new Error(label + " must be a valid nonnegative number."); };
  function recordList(list, label, needsId) {
    if (!Array.isArray(list)) throw new Error(label + " must be a list.");
    const ids = new Set();
    list.forEach(item => {
      if (!object(item)) throw new Error(label + " contains an invalid record.");
      if (needsId) {
        if (typeof item.id !== "string" || !/^[A-Za-z0-9_-]+$/.test(item.id) || ids.has(item.id)) throw new Error(label + " contains a missing, unsafe, or duplicate ID.");
        ids.add(item.id);
      }
    });
  }
  function validateBackup(input) {
    if (!object(input) || input.app !== "Shop Board" || input.schemaVersion !== 1 || !object(input.data)) {
      throw new Error("Choose a version 1 JSON backup exported by Shop Board.");
    }
    const data = JSON.parse(JSON.stringify(input.data));
    if (!object(data.business) || !object(data.currentUser)) throw new Error("Company or current-user settings are missing.");
    text(data.business.name, "Company name");
    text(data.business.owner, "Company owner");
    text(data.business.phone, "Business phone");
    if (!data.business.name.trim() || data.business.name.length > 80 || /[<>"\r\n]/.test(data.business.name)) throw new Error("Company name is invalid.");
    if (typeof data.business.crewSeeMoney !== "boolean") throw new Error("Crew money setting is invalid.");
    text(data.currentUser.name, "Current user name");
    if (data.currentUser.role !== "Owner") throw new Error("This restore requires an Owner-view backup.");
    recordList(data.clients, "Clients", true);
    recordList(data.crewMembers, "Crew", true);
    recordList(data.jobs, "Jobs", true);
    data.clients.forEach(c => {
      ["name", "phone", "email", "address"].forEach(k => text(c[k], "Client " + k));
      if (c.projectNotes === undefined) c.projectNotes = "";
      text(c.projectNotes, "Client notes");
    });
    data.crewMembers.forEach(c => {
      ["name", "phone", "email"].forEach(k => text(c[k], "Crew " + k));
      if (!["Owner", "Crew"].includes(c.role)) throw new Error("Crew role is invalid.");
    });
    const stats = {jobs:data.jobs.length, clients:data.clients.length, crew:data.crewMembers.length, photos:0, documents:0, receipts:0, notes:0, bills:0};
    function imageUrl(url) {
      text(url, "Photo URL");
      if (!/^https?:\/\//i.test(url) && !/^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=\r\n]+$/i.test(url)) throw new Error("A photo contains an unsupported URL or image type.");
    }
    if (data.business.logoDataUrl) {
      if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/i.test(data.business.logoDataUrl)) throw new Error("Company logo format is invalid.");
    }
    data.jobs.forEach(job => {
      ["name", "address", "status", "clientId", "startDate"].forEach(k => text(job[k], "Job " + k));
      if (!["Lead", "Quoted", "Scheduled", "On site", "Waiting", "Done", "Paid"].includes(job.status)) throw new Error("Job status is unsupported.");
      if (job.trade !== undefined) text(job.trade, "Trade");
      if (!Array.isArray(job.crewAssigned) || job.crewAssigned.some(id => typeof id !== "string" || !/^[A-Za-z0-9_-]+$/.test(id))) throw new Error("Job crew assignments are invalid.");
      ["photos", "files", "notes", "bills", "expenses", "quotes"].forEach(key => {
        if (job[key] === undefined) job[key] = [];
        recordList(job[key], key, key !== "quotes");
      });
      job.photos.forEach(p => {
        imageUrl(p.url);
        ["author", "timestamp"].forEach(k => text(p[k], "Photo " + k));
        if (p.caption !== undefined) text(p.caption, "Photo caption");
      });
      job.files.forEach(f => {
        ["name", "author", "date"].forEach(k => text(f[k], "Document " + k));
        if (f.dataUrl && (!/^data:[A-Za-z0-9.+\/-]+;base64,[A-Za-z0-9+/=\r\n]+$/.test(f.dataUrl) || /^data:(text\/html|image\/svg\+xml)/i.test(f.dataUrl))) throw new Error("Document data is unsupported.");
        if (f.type !== undefined) text(f.type, "Document type");
      });
      job.notes.forEach(n => ["text", "author", "timestamp", "tag"].forEach(k => text(n[k], "Note " + k)));
      job.bills.forEach(b => {
        text(b.desc, "Bill description"); number(b.amount, "Bill amount");
        if (!["Paid", "Unpaid"].includes(b.status)) throw new Error("Bill status is invalid.");
      });
      job.expenses.forEach(e => {
        text(e.desc, "Expense description"); number(e.amount, "Expense amount");
        if (e.photoUrl) imageUrl(e.photoUrl);
      });
      job.quotes.forEach(q => {
        recordList(q.items, "Quote items", false);
        q.items.forEach(item => { text(item.desc, "Quote description"); number(item.qty, "Quote quantity"); number(item.rate, "Quote rate"); });
      });
      ["moneyBilled", "moneyCollected"].forEach(k => { if (job[k] !== undefined) number(job[k], k); });
      stats.photos += job.photos.length; stats.documents += job.files.length;
      stats.receipts += job.expenses.length; stats.notes += job.notes.length; stats.bills += job.bills.length;
    });
    data.business.companyNameCustomized = true;
    const exportedAt = typeof input.exportedAt === "string" && !Number.isNaN(Date.parse(input.exportedAt)) ? input.exportedAt : null;
    const theme = input.deviceSettings && ["light", "dark", "system"].includes(input.deviceSettings.appearance) ? input.deviceSettings.appearance : null;
    const preferences={};
    const supplied=input.deviceSettings&&input.deviceSettings.preferences;
    if(supplied!==undefined){
      if(!object(supplied))throw new Error("Invalid device preferences.");
      const choices={SHOP_BOARD_THEME:["light","dark","system"],SHOP_BOARD_START_SCREEN:["HOME","TODAY","JOBS"],SHOP_BOARD_MAPS_SERVICE:["AUTO","APPLE","GOOGLE"],SHOP_BOARD_RECEIPT_CATEGORY:["Materials","Hardware","Lumber","Tools","Fuel / Dump","Subcontract"]};
      for(const[key,value]of Object.entries(supplied)){
        if(typeof value!=="string"||value.length>10000)throw new Error("Invalid preference value.");
        if(key==="SHOP_BOARD_RECEIPT_JOB_PREFS"){const p=JSON.parse(value);if(!object(p)||!["ASK","REMEMBER"].includes(p.mode)||typeof p.lastJobId!=="string")throw new Error("Invalid receipt-job preference.");}
        else if(!Object.prototype.hasOwnProperty.call(choices,key)||!choices[key].includes(value))throw new Error("Unsupported device preference.");
        preferences[key]=value;
      }
    }
    if(theme&&preferences.SHOP_BOARD_THEME===undefined)preferences.SHOP_BOARD_THEME=theme;
    return {data:data,stats:stats,exportedAt:exportedAt,theme:theme,preferences:preferences};
  }

  function message(value) {
    const el = document.getElementById("shopRestoreStatus");
    if (el) el.textContent = value;
  }
  function resetPending() {
    pending = null; request++;
    const preview = document.getElementById("shopRestorePreview");
    const confirm = document.getElementById("shopRestoreConfirmed");
    const button = document.getElementById("shopRestoreApply");
    if (preview) preview.hidden = true;
    if (confirm) confirm.checked = false;
    if (button) button.disabled = true;
  }
  async function pickBackup(input) {
    resetPending();
    const token = request;
    const file = input.files && input.files[0];
    if (!file) return;
    if (!/\.json$/i.test(file.name) || file.size > MAX_BYTES) {
      message("Choose a .json Shop Board backup smaller than 128 MB. Current records are unchanged.");
      return;
    }
    message("Reading and validating backup…");
    try {
      const raw = await file.text();
      if (token !== request || document.getElementById("shopRestoreFile") !== input || document.getElementById("modalOverlay").style.display !== "flex") return;
      const candidate = validateBackup(JSON.parse(raw));
      pending = candidate;
      const summary = document.getElementById("shopRestoreSummary");
      const st = candidate.stats;
      summary.textContent = "Company: " + candidate.data.business.name + "\nExported: " +
        (candidate.exportedAt ? new Date(candidate.exportedAt).toLocaleString() : "Unknown") + "\n" +
        st.jobs + " jobs • " + st.clients + " clients • " + st.crew + " crew\n" +
        st.photos + " photos • " + st.documents + " document records • " + st.receipts + " expenses\n" +
        st.notes + " notes • " + st.bills + " bills\n" +
        "Current device: " + DATA.jobs.length + " jobs, " + DATA.clients.length + " clients. These will be replaced, not merged.";
      document.getElementById("shopRestorePreview").hidden = false;
      message("Backup validated. Review the preview and save an export of your current records before proceeding.");
    } catch (e) { message("Cannot restore: " + e.message + " Current records are unchanged."); }
  }
  async function applyRestore() {
    const checkbox = document.getElementById("shopRestoreConfirmed");
    const button = document.getElementById("shopRestoreApply");
    const overlay = document.getElementById("modalOverlay");
    if (!pending || !checkbox || !checkbox.checked || !overlay || overlay.style.display !== "flex" || DATA.currentUser.role !== "Owner") return false;
    button.disabled = true;
    const candidate = pending;
    try {await Storage.setMany({...candidate.preferences,SHOP_BOARD_DATA:JSON.stringify(candidate.data)});}
    catch(e){message("Restore was not completed: "+e.message+" Current records were not replaced. Do not clear site data.");button.disabled=false;return false;}
    DATA=candidate.data;
    let themeNote="";
    [window.ShopBoardAppearance,window.ShopBoardStartScreen,window.ShopBoardMapsPreference,window.ShopBoardReceiptCategory,window.ShopBoardReceiptJobMemory].forEach(addon=>{if(addon&&typeof addon.reload==="function"){try{addon.reload();}catch(e){themeNote=" Reload to display all restored preferences.";}}});
    resetPending();
    closeModal();
    goHome();
    showToast("Backup restored on this device" + themeNote);
    return true;
  }
  function insertPanel() {
    if (typeof DATA === "undefined" || !DATA.currentUser || DATA.currentUser.role !== "Owner") return;
    if (!document.getElementById("companySettingsForm") || document.getElementById("shopRestorePanel")) return;
    const sheet = document.getElementById("modalSheet");
    if (!sheet) return;
    resetPending();
    const panel = document.createElement("section");
    panel.id = "shopRestorePanel";
    panel.className = "shop-restore-panel";
    panel.setAttribute("aria-label", "Restore backup");
    panel.innerHTML = `
      <h3 style="font-size:20px;margin-bottom:8px;">Restore Backup</h3>
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:12px;">Restore a JSON file exported by Shop Board. This replaces this device's records, company name, and logo; it does not merge them or recover files absent from the backup. Use only your own trusted backups.</p>
      <label class="input-label" for="shopRestoreFile">Select Backup</label>
      <input id="shopRestoreFile" class="text-input" type="file" accept=".json,application/json">
      <p id="shopRestoreStatus" role="status" aria-live="polite" style="font-size:13px;margin:12px 0;">Export your current records first. Unsaved company-form edits are not retained if you restore.</p>
      <div id="shopRestorePreview" hidden>
        <p id="shopRestoreSummary" style="white-space:pre-wrap;font-size:14px;margin:12px 0;"></p>
        <label style="display:flex;gap:10px;padding:12px 0;align-items:flex-start;">
          <input id="shopRestoreConfirmed" type="checkbox" style="min-width:24px;min-height:24px;">
          <span>I saved a backup of my current records and understand that Restore will replace them.</span>
        </label>
        <button id="shopRestoreApply" type="button" class="big-btn" style="background:#A82332;color:#FFF;" disabled>Replace Records with This Backup</button>
      </div>
      <button id="shopRestoreCancel" type="button" class="big-btn secondary">Cancel Restore</button>`;
    sheet.appendChild(panel);
    document.getElementById("shopRestoreFile").addEventListener("change", function () { pickBackup(this); });
    document.getElementById("shopRestoreConfirmed").addEventListener("change", function () {
      document.getElementById("shopRestoreApply").disabled = !this.checked || !pending;
    });
    document.getElementById("shopRestoreApply").addEventListener("click", applyRestore);
    document.getElementById("shopRestoreCancel").addEventListener("click", () => { resetPending(); closeModal(); });
  }
  window.ShopBoardBackupRestore = {validateBackup:validateBackup, pickBackup:pickBackup, applyRestore:applyRestore, insertPanel:insertPanel};
  const originalOpen = window.openCompanySettings;
  if (typeof originalOpen === "function") {
    window.openCompanySettings = function () {
      const result = originalOpen.apply(this, arguments);
      const overlay = document.getElementById("modalOverlay");
      if (overlay && overlay.style.display === "flex") insertPanel();
      return result;
    };
  }
  const sheet = document.getElementById("modalSheet");
  if (sheet && window.MutationObserver) new MutationObserver(insertPanel).observe(sheet, {childList:true});
})();
});
