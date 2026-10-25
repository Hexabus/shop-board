/* Shop Board add-on: save-guard */
(window.ShopBoardAddOns = window.ShopBoardAddOns || []).push(async function () {
const Storage = window.ShopBoardDatabase;
await (async function () {
  "use strict";
  if (window.ShopBoardSaveGuard) return;
  let epoch = 0;
  let lastWrite = null;
  let lastReadError = null;
  let startupBlocked = false;
  let actionInFlight=false;

  class ShopSaveError extends Error {
    constructor(message, cause) {
      super(message); this.name = "ShopSaveError"; this.cause = cause;
    }
  }
  function showFailure(message, alreadySaved) {
    let banner = document.getElementById("shopSaveFailureBanner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "shopSaveFailureBanner";
      banner.className = "shop-save-failure";
      banner.setAttribute("role", "alert");
      const label = document.createElement("p");
      label.id = "shopSaveFailureText";
      const dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.textContent = "Dismiss warning";
      dismiss.addEventListener("click", () => { banner.hidden = true; });
      banner.appendChild(label); banner.appendChild(dismiss);
      document.body.insertBefore(banner, document.body.firstChild);
    }
    document.getElementById("shopSaveFailureText").textContent = message + (alreadySaved ? "" : " Dismissing this warning does not save the entry.");
    banner.hidden = false;
    const indicator = document.getElementById("savedIndicator");
    if (indicator) indicator.textContent = alreadySaved ? "SAVED • SCREEN UPDATE FAILED" : "NOT SAVED • CHECK STORAGE";
    showToast(alreadySaved ? "Saved, but screen update failed" : "Not saved — check the warning");
  }
  function clearFailure() {
    const banner = document.getElementById("shopSaveFailureBanner");
    if (banner) banner.hidden = true;
    const indicator = document.getElementById("savedIndicator");
    if (indicator) indicator.textContent = "SAVED ON PHONE • "+Storage.backendLabel();
  }
  async function verifiedWrite(key,value){
    if(startupBlocked)throw new ShopSaveError("Storage could not be read at startup. Reload after resolving storage access.");
    try{await Storage.set(key,value);}catch(cause){throw new ShopSaveError("This change was not saved: "+cause.message+" Keep the form open and keep the original attachment. Do not clear site data.",cause);}
  }
  window.saveData = async function () {
    let payload;
    try { payload = JSON.stringify(DATA); }
    catch (e) { throw new ShopSaveError("This record could not be prepared for saving. Keep the form open and try again.", e); }
    await verifiedWrite("SHOP_BOARD_DATA", payload);
    lastWrite = payload;
    epoch++;
    clearFailure();
    updateHeaderBadges();
    showToast("Saved on phone");
    return true;
  };

  function captureTransient() {
    return {
      photo: typeof TEMP_PHOTO_DATA === "undefined" ? null : TEMP_PHOTO_DATA,
      receipt: typeof TEMP_RECEIPT_PHOTO === "undefined" ? null : TEMP_RECEIPT_PHOTO,
      doc: typeof TEMP_DOC_DATA === "undefined" ? null : TEMP_DOC_DATA,
      docName: typeof TEMP_DOC_NAME === "undefined" ? "" : TEMP_DOC_NAME,
      docType: typeof TEMP_DOC_TYPE === "undefined" ? "" : TEMP_DOC_TYPE,
      docSize: typeof TEMP_DOC_SIZE === "undefined" ? "" : TEMP_DOC_SIZE,
      confirmation: typeof PENDING_CONFIRM_ACTION === "undefined" ? null : PENDING_CONFIRM_ACTION,
      view: CURRENT_VIEW, job: ACTIVE_JOB_ID,
      modalDisplay: document.getElementById("modalOverlay").style.display
    };
  }
  function restoreTransient(state) {
    if (typeof TEMP_PHOTO_DATA !== "undefined") TEMP_PHOTO_DATA = state.photo;
    if (typeof TEMP_RECEIPT_PHOTO !== "undefined") TEMP_RECEIPT_PHOTO = state.receipt;
    if (typeof TEMP_DOC_DATA !== "undefined") TEMP_DOC_DATA = state.doc;
    if (typeof TEMP_DOC_NAME !== "undefined") TEMP_DOC_NAME = state.docName;
    if (typeof TEMP_DOC_TYPE !== "undefined") TEMP_DOC_TYPE = state.docType;
    if (typeof TEMP_DOC_SIZE !== "undefined") TEMP_DOC_SIZE = state.docSize;
    if (typeof PENDING_CONFIRM_ACTION !== "undefined") PENDING_CONFIRM_ACTION = state.confirmation;
    CURRENT_VIEW = state.view; ACTIVE_JOB_ID = state.job;
    document.getElementById("modalOverlay").style.display = state.modalDisplay;
  }
  const actions = ["saveNewJob", "saveNewClient", "saveClientEdits", "saveNewCrew", "saveNote", "savePhoto", "saveBill", "saveJobMoney", "saveRealFile", "saveFile", "saveQuickReceipt", "setJobStatus", "toggleBillPaid", "deleteNote", "toggleMoneyForCrew", "switchUserRole", "executeConfirmedAction", "deleteClient", "deleteCrewMember", "deleteJob", "deletePhoto", "deleteBill", "deleteExpense", "deleteFile"];
  actions.forEach(name => {
    const original = window[name];
    if (typeof original !== "function") return;
    window[name] = async function () {
      if(actionInFlight){showToast("A save is still in progress. Please wait.");return false;}
      actionInFlight=true;
      let before, transient;
      const initialEpoch = epoch;
      try {
        before = JSON.stringify(DATA);
        transient = captureTransient();
      } catch (e) {
        showFailure("The change could not be started safely. Export a backup and reload only after it is saved.");
        actionInFlight=false;
        return false;
      }
      try { return await original.apply(this, arguments); }
      catch (e) {
        if (epoch !== initialEpoch) {
          if (lastWrite) DATA = JSON.parse(lastWrite);
          showFailure("The record was saved, but updating the screen failed. Export a backup and reload to view the saved record.", true);
          return false;
        }
        DATA = JSON.parse(before);
        restoreTransient(transient);
        showFailure(e instanceof ShopSaveError ? e.message : "This action could not be completed. Your unsaved changes were rolled back; keep the form open and retry.");
        return false;
      } finally {actionInFlight=false;}
    };
  });

  /* At startup, read existing records without a test write that can fail at full quota. */
  try {
    const raw = Storage.get("SHOP_BOARD_DATA");
    if (lastReadError) throw lastReadError;
    if (raw !== null) {
      const stored = JSON.parse(raw);
      if (!stored || !stored.business || !stored.currentUser || !Array.isArray(stored.clients) || !Array.isArray(stored.jobs) || !Array.isArray(stored.crewMembers)) throw new Error("Saved data is malformed");
      DATA = await loadData();
      DATA.clients.forEach(client => { if (typeof client.projectNotes !== "string") client.projectNotes = ""; });
      DATA.jobs.forEach(job => {
        if (!Array.isArray(job.photos)) job.photos = [];
        if (!Array.isArray(job.expenses)) job.expenses = [];
      });
      updateHeaderBadges();
      renderCurrentView();
    }
  } catch (e) {
    startupBlocked = true;
    throw new Error("Existing saved records could not be read safely. Do not clear this site's data or overwrite it with sample records. Keep any backups and resolve the storage problem first.");
  }
  window.ShopBoardSaveGuard = {version:1};
})();
});
