/* Shop Board add-on: start-screen */
(window.ShopBoardAddOns = window.ShopBoardAddOns || []).push(async function () {
const Storage = window.ShopBoardDatabase;
await (async function () {
  "use strict";
  if (window.ShopBoardStartScreen) return;
  const KEY = "SHOP_BOARD_START_SCREEN";
  const valid = value => ["HOME", "TODAY", "JOBS"].includes(value);
  const names = {HOME:"Home", TODAY:"Today", JOBS:"Jobs"};
  let preference = "HOME";
  try {
    const stored = Storage.get(KEY);
    if (valid(stored)) preference = stored;
  } catch (e) {}

  async function save(value) {
    const status = document.getElementById("shopStartScreenStatus");
    if (!valid(value)) return false;
    try {
      await Storage.set(KEY, value);
      if (Storage.get(KEY) !== value) throw new Error("Save could not be verified");
    } catch (e) {
      if (status) status.textContent = "Start screen was not saved. Device storage may be full or blocked. Your previous choice is unchanged.";
      return false;
    }
    preference = value;
    applyOnLoad();
    return true;
  }

  function insertPanel() {
    if (typeof DATA === "undefined" || !DATA.currentUser || DATA.currentUser.role !== "Owner") return;
    if (!document.getElementById("companySettingsForm") || document.getElementById("shopStartScreenPanel")) return;
    const sheet = document.getElementById("modalSheet");
    if (!sheet) return;
    let draft = preference;
    const panel = document.createElement("section");
    panel.id = "shopStartScreenPanel";
    panel.className = "shop-start-screen-panel";
    panel.setAttribute("aria-label", "Start screen settings");
    panel.innerHTML = `
      <h3 style="font-size:20px;margin-bottom:8px;">Start Screen</h3>
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:12px;">Choose your default start screen. Saved with the rest of Settings below.</p>
      <label class="input-label" for="shopStartScreenSelect">Open Shop Board to</label>
      <select id="shopStartScreenSelect" class="text-input">
        <option value="HOME">Home — six main tiles</option>
        <option value="TODAY">Today — today's work</option>
        <option value="JOBS">Jobs — all projects</option>
      </select>
      <p id="shopStartScreenStatus" role="status" aria-live="polite" style="font-size:13px;color:var(--text-muted);"></p>`;
    sheet.appendChild(panel);
    const select = document.getElementById("shopStartScreenSelect");
    select.value = preference;
    select.addEventListener("change", () => { draft = select.value; });
    if (window.ShopBoardPendingSettings) {
      window.ShopBoardPendingSettings.commits.push(() => draft === preference ? true : save(draft));
      window.ShopBoardPendingSettings.discards.push(() => { draft = preference; });
    }
  }

  function applyOnLoad() {
    if (typeof DATA === "undefined" || typeof window.openView !== "function") return false;
    try {
      window.openView(preference);
      return true;
    } catch (e) {
      try { window.goHome(); } catch (fallbackError) {}
      if (typeof window.showToast === "function") window.showToast("Could not open the selected start screen. Returning to Home.");
      return false;
    }
  }

  window.ShopBoardStartScreen = {reload:()=>{const saved=Storage.get(KEY);if(valid(saved))preference=saved;},save:save, getPreference:()=>preference, insertPanel:insertPanel};
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
  applyOnLoad();
})();
});
