/* Shop Board add-on: receipt-job-memory */
(window.ShopBoardAddOns = window.ShopBoardAddOns || []).push(async function () {
const Storage = window.ShopBoardDatabase;
await (async function () {
  "use strict";
  if (window.ShopBoardReceiptJobMemory) return;
  const KEY = "SHOP_BOARD_RECEIPT_JOB_PREFS";
  const validMode = value => ["ASK", "REMEMBER"].includes(value);
  let mode = "ASK";
  let lastJobId = "";
  try {
    const stored = JSON.parse(Storage.get(KEY) || "null");
    if (stored && validMode(stored.mode)) {
      mode = stored.mode;
      if (typeof stored.lastJobId === "string") lastJobId = stored.lastJobId;
    }
  } catch (e) {}

  async function writePreferences(nextMode, nextJob) {
    const payload = JSON.stringify({mode:nextMode, lastJobId:nextJob});
    await Storage.set(KEY, payload);
    if (Storage.get(KEY) !== payload) throw new Error("Preference save could not be verified");
    mode = nextMode; lastJobId = nextJob;
  }
  async function saveMode(value) {
    const status = document.getElementById("shopReceiptJobMemoryStatus");
    if (!validMode(value)) return false;
    try { await writePreferences(value, lastJobId); }
    catch (e) {
      if (status) status.textContent = "Receipt-job preference was not saved. Device storage may be full or blocked. Your previous choice is unchanged.";
      return false;
    }
    if (status) status.textContent = (value === "REMEMBER" ? "Remember last used job" : "Choose each time") +
      " is saved on this device. It applies to the next receipt. Opening a receipt inside a job still takes priority.";
    return true;
  }

  function configureReceipt(preselectedJobId) {
    const select = document.getElementById("receiptJobSelect");
    if (!select || typeof DATA === "undefined") return;
    const jobs = DATA.jobs || [];
    const exists = id => typeof id === "string" && jobs.some(job => job.id === id);
    let target = "";
    let explicit = typeof preselectedJobId === "string" && preselectedJobId.length > 0;
    if (explicit) {
      if (exists(preselectedJobId)) target = preselectedJobId;
    } else if (typeof ACTIVE_JOB_ID !== "undefined" && ACTIVE_JOB_ID) {
      if (exists(ACTIVE_JOB_ID)) target = ACTIVE_JOB_ID;
    } else if (mode === "REMEMBER" && exists(lastJobId)) target = lastJobId;
    let placeholder = Array.from(select.options).find(option => option.value === "");
    if (!placeholder) {
      placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = jobs.length ? "Choose a job…" : "No jobs yet — create a job first";
      select.insertBefore(placeholder, select.firstChild);
    }
    select.value = target;
    select.required = true;
    const warning = document.createElement("p");
    warning.id = "shopReceiptJobWarning";
    warning.setAttribute("role", "status");
    warning.style.cssText = "font-size:13px;color:var(--text-muted);margin-top:8px;";
    warning.textContent = target
      ? "Check the selected job before saving this receipt."
      : (mode === "REMEMBER" && lastJobId && !exists(lastJobId)
        ? "The remembered job is no longer on the board. Choose another job."
        : "Choose the job this receipt belongs to before saving.");
    select.parentNode.appendChild(warning);
  }

  function insertPanel() {
    if (typeof DATA === "undefined" || !DATA.currentUser || DATA.currentUser.role !== "Owner") return;
    if (!document.getElementById("companySettingsForm") || document.getElementById("shopReceiptJobMemoryPanel")) return;
    const sheet = document.getElementById("modalSheet");
    if (!sheet) return;
    const panel = document.createElement("section");
    panel.id = "shopReceiptJobMemoryPanel";
    panel.className = "shop-receipt-job-memory-panel";
    panel.setAttribute("aria-label", "Receipt job selection");
    panel.innerHTML = `
      <h3 style="font-size:20px;margin-bottom:8px;">Receipt Job Selection</h3>
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:12px;">For receipts started from Home, choose a job each time or reuse the job from the last successfully saved receipt. Receipts opened inside a job use that job first.</p>
      <label class="input-label" for="shopReceiptJobMemorySelect">New receipt job</label>
      <select id="shopReceiptJobMemorySelect" class="text-input">
        <option value="ASK">Choose each time</option>
        <option value="REMEMBER">Remember last used job</option>
      </select>
      <button id="shopReceiptJobMemorySave" type="button" class="big-btn" style="margin-top:12px;">Save Receipt Job Preference</button>
      <p id="shopReceiptJobMemoryStatus" role="status" aria-live="polite" style="font-size:13px;color:var(--text-muted);">Cancelling a receipt does not change the remembered job. This setting is local to this device.</p>`;
    sheet.appendChild(panel);
    const select = document.getElementById("shopReceiptJobMemorySelect");
    select.value = mode;
    document.getElementById("shopReceiptJobMemorySave").addEventListener("click", () => saveMode(select.value));
  }

  const originalReceipt = window.openQuickReceiptModal;
  if (typeof originalReceipt === "function") {
    window.openQuickReceiptModal = function (preselectedJobId) {
      const result = originalReceipt.apply(this, arguments);
      configureReceipt(preselectedJobId);
      return result;
    };
  }
  const originalSave = window.saveQuickReceipt;
  if (typeof originalSave === "function") {
    window.saveQuickReceipt = async function () {
      const select = document.getElementById("receiptJobSelect");
      const jobId = select ? select.value : "";
      const job = typeof DATA !== "undefined" ? DATA.jobs.find(item => item.id === jobId) : null;
      if (!job) {
        const warning = document.getElementById("shopReceiptJobWarning");
        if (warning) warning.textContent = "Receipt not saved: choose a valid job first.";
        if (select) select.focus();
        if (typeof window.showToast === "function") window.showToast("Choose a job before saving the receipt");
        return false;
      }
      const previousIds = new Set((job.expenses || []).map(item => item.id));
      const result = await originalSave.apply(this, arguments);
      if (result === false) return result;
      try {
        const updatedJob = DATA.jobs.find(item => item.id === jobId);
        const created = updatedJob && (updatedJob.expenses || []).find(item => !previousIds.has(item.id));
        if (!created) return result;
        const savedData = JSON.parse(Storage.get("SHOP_BOARD_DATA") || "null");
        const savedJob = savedData && Array.isArray(savedData.jobs) && savedData.jobs.find(item => item.id === jobId);
        if (!savedJob || !Array.isArray(savedJob.expenses) || !savedJob.expenses.some(item => item.id === created.id)) return result;
        await writePreferences(mode, jobId);
      } catch (e) {
        if (typeof window.showToast === "function") window.showToast("Receipt saved, but its job could not be remembered on this device");
      }
      return result;
    };
  }
  const originalSettings = window.openCompanySettings;
  if (typeof originalSettings === "function") {
    window.openCompanySettings = function () {
      const result = originalSettings.apply(this, arguments);
      const overlay = document.getElementById("modalOverlay");
      if (overlay && overlay.style.display === "flex") insertPanel();
      return result;
    };
  }
  const sheet = document.getElementById("modalSheet");
  if (sheet && window.MutationObserver) new MutationObserver(insertPanel).observe(sheet, {childList:true});
  window.ShopBoardReceiptJobMemory = {reload:()=>{const p=JSON.parse(Storage.get(KEY)||"null");if(p&&validMode(p.mode)){mode=p.mode;lastJobId=typeof p.lastJobId==="string"?p.lastJobId:"";}},saveMode:saveMode, getMode:()=>mode, getLastJobId:()=>lastJobId, insertPanel:insertPanel};
})();
});
