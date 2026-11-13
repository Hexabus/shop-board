/* Shop Board add-on: receipt-category */
(window.ShopBoardAddOns = window.ShopBoardAddOns || []).push(async function () {
const Storage = window.ShopBoardDatabase;
await (async function () {
  "use strict";
  if (window.ShopBoardReceiptCategory) return;
  const KEY = "SHOP_BOARD_RECEIPT_CATEGORY";
  const categories = [
    ["Materials", "Materials"],
    ["Hardware", "Hardware"],
    ["Lumber", "Lumber"],
    ["Tools", "Tools / Blades"],
    ["Fuel / Dump", "Fuel / Dump"],
    ["Subcontract", "Subcontract"]
  ];
  const valid = value => categories.some(item => item[0] === value);
  const labels = Object.fromEntries(categories);
  let preference = "Materials";
  try {
    const saved = Storage.get(KEY);
    if (valid(saved)) preference = saved;
  } catch (e) {}
  const initializedForms = new WeakSet();

  function applyReceiptDefault() {
    const select = document.getElementById("receiptCategorySelect");
    const overlay = document.getElementById("modalOverlay");
    if (!select || !overlay || overlay.style.display !== "flex" || initializedForms.has(select)) return;
    if (Array.from(select.options).some(option => option.value === preference)) select.value = preference;
    initializedForms.add(select);
  }

  async function save(value) {
    const status = document.getElementById("shopReceiptCategoryStatus");
    if (!valid(value)) return false;
    try {
      await Storage.set(KEY, value);
      if (Storage.get(KEY) !== value) throw new Error("Save could not be verified");
    } catch (e) {
      if (status) status.textContent = "Default category was not saved. Device storage may be full or blocked. Your previous choice is unchanged.";
      return false;
    }
    preference = value;
    return true;
  }

  function insertPanel() {
    if (typeof DATA === "undefined" || !DATA.currentUser || DATA.currentUser.role !== "Owner") return;
    if (!document.getElementById("companySettingsForm") || document.getElementById("shopReceiptCategoryPanel")) return;
    const sheet = document.getElementById("modalSheet");
    if (!sheet) return;
    let draft = preference;
    const panel = document.createElement("section");
    panel.id = "shopReceiptCategoryPanel";
    panel.className = "shop-receipt-category-panel";
    panel.setAttribute("aria-label", "Default receipt category");
    panel.innerHTML = `
      <h3 style="font-size:20px;margin-bottom:8px;">Default Receipt Category</h3>
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:12px;">Preselect a category whenever you open Snap Receipt. Existing expenses are not changed, and you can select a different category for any receipt. Saved with the rest of Settings below.</p>
      <label class="input-label" for="shopReceiptCategorySelect">Start new receipts as</label>
      <select id="shopReceiptCategorySelect" class="text-input">
        ${categories.map(item => `<option value="${item[0]}">${item[1]}</option>`).join("")}
      </select>
      <p id="shopReceiptCategoryStatus" role="status" aria-live="polite" style="font-size:13px;color:var(--text-muted);"></p>`;
    sheet.appendChild(panel);
    const select = document.getElementById("shopReceiptCategorySelect");
    select.value = preference;
    select.addEventListener("change", () => { draft = select.value; });
    if (window.ShopBoardPendingSettings) {
      window.ShopBoardPendingSettings.commits.push(() => draft === preference ? true : save(draft));
      window.ShopBoardPendingSettings.discards.push(() => { draft = preference; });
    }
  }

  window.ShopBoardReceiptCategory = {reload:()=>{const saved=Storage.get(KEY);if(valid(saved))preference=saved;},save:save, getPreference:()=>preference, insertPanel:insertPanel, applyReceiptDefault:applyReceiptDefault};
  const originalReceipt = window.openQuickReceiptModal;
  if (typeof originalReceipt === "function") {
    window.openQuickReceiptModal = function () {
      const result = originalReceipt.apply(this, arguments);
      applyReceiptDefault();
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
  if (sheet && window.MutationObserver) {
    new MutationObserver(() => { insertPanel(); applyReceiptDefault(); }).observe(sheet, {childList:true});
  }
})();
});
