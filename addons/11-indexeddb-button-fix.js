/* Shop Board add-on: indexeddb-button-fix */
(window.ShopBoardAddOns = window.ShopBoardAddOns || []).push(async function () {
const Storage = window.ShopBoardDatabase;
await (async function () {
  "use strict";
  if (window.ShopBoardIndexedDBButtonFeedbackFix) return;
  let active = null;
  function status(text) {
    const node = document.getElementById("shopIDBStatus");
    if (node) node.textContent = text;
  }
  function controls() {
    const checking = active === "check";
    const preparing = active === "prepare";
    const check = document.getElementById("shopIDBCheck");
    const prepare = document.getElementById("shopIDBPrepare");
    [[check, checking ? "Checking Copy…" : "Check Copy Against Current Data"],
     [prepare, preparing ? "Preparing and verifying…" : "Prepare / Refresh IndexedDB Copy"]].forEach(pair => {
      const button = pair[0];
      if (!button) return;
      if (button.disabled !== Boolean(active)) button.disabled = Boolean(active);
      if (button.textContent !== pair[1]) button.textContent = pair[1];
      const busy = active ? "true" : "false";
      if (button.getAttribute("aria-busy") !== busy) button.setAttribute("aria-busy", busy);
    });
  }
  function toast(text) {
    if (typeof showToast === "function") showToast(text);
  }
  async function handleClick(event) {
    const button = event.target && event.target.closest ? event.target.closest("#shopIDBCheck, #shopIDBPrepare") : null;
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (active) return;
    const api = window.ShopBoardIndexedDBPrep;
    if (!api || typeof api.checkCopy !== "function" || typeof api.prepareCopy !== "function") {
      status("The IndexedDB preparation add-on is not available. Reload the updated app. Do not clear saved data.");
      toast("IndexedDB add-on not available");
      return;
    }
    active = button.id === "shopIDBCheck" ? "check" : "prepare";
    const operation = active;
    const initialText = operation === "check" ? "Checking IndexedDB copy against your saved records and preferences…" : "Preparing IndexedDB copy…";
    status(initialText);
    controls();
    const timer = setTimeout(() => {
      if (active !== operation) return;
      status("This " + (operation === "check" ? "check" : "preparation") + " is taking longer than expected. If it stays here, close other Shop Board tabs and reload this app normally. Do not clear site data. The operation has not been cancelled; wait or reload before trying again.");
      toast("Storage operation is still pending");
    }, 20000);
    try {
      const success = await (operation === "check" ? api.checkCopy() : api.prepareCopy());
      const node = document.getElementById("shopIDBStatus");
      const result = node ? node.textContent : "";
      if (success) {
        toast(operation === "check" ? "Check complete: copy matches saved data" : "IndexedDB copy prepared and verified");
      } else if (result.includes("Your current saved data has changed")) {
        toast("Check complete: refresh the older copy");
      } else if (result.startsWith("No preparation snapshot yet")) {
        toast("Check complete: prepare a copy first");
      } else {
        if (result === initialText) status("The operation could not start. Confirm that you are in Owner view and that no other preparation is running. Original storage remains active.");
        toast("Storage operation did not succeed—see the status below");
      }
    } catch (error) {
      status("Storage operation failed: " + (error && error.message ? error.message : String(error)) + ". This feedback fix does not clear or replace your saved data.");
      toast("Storage operation failed—see the status below");
    } finally {
      clearTimeout(timer);
      active = null;
      controls();
    }
  }
  const sheet = document.getElementById("modalSheet");
  if (!sheet) return;
  sheet.addEventListener("click", handleClick, true);
  if (window.MutationObserver) new MutationObserver(controls).observe(sheet, {childList:true, subtree:true});
  window.ShopBoardIndexedDBButtonFeedbackFix = {version:1};
})();
});
