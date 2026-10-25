/* Shop Board add-on: maps-preference */
(window.ShopBoardAddOns = window.ShopBoardAddOns || []).push(async function () {
const Storage = window.ShopBoardDatabase;
await (async function () {
  "use strict";
  if (window.ShopBoardMapsPreference) return;
  const KEY = "SHOP_BOARD_MAPS_SERVICE";
  const valid = value => ["AUTO", "APPLE", "GOOGLE"].includes(value);
  const labels = {AUTO:"Automatic", APPLE:"Apple Maps", GOOGLE:"Google Maps"};
  let preference = "AUTO";
  try {
    const saved = Storage.get(KEY);
    if (valid(saved)) preference = saved;
  } catch (e) {}

  function mapLink(address) {
    const clean = typeof address === "string" ? address.trim() : "";
    if (!clean || /^(on site|no address saved)$/i.test(clean)) return "#";
    const query = encodeURIComponent(clean);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const apple = preference === "APPLE" || (preference === "AUTO" && isIOS);
    return apple
      ? "https://maps.apple.com/?q=" + query
      : "https://www.google.com/maps/search/?api=1&query=" + query;
  }

  function refreshLinks() {
    if (typeof window.renderCurrentView !== "function") return false;
    try { window.renderCurrentView(); return true; }
    catch (e) { return false; }
  }

  async function save(value) {
    const status = document.getElementById("shopMapsPreferenceStatus");
    if (!valid(value)) {
      if (status) status.textContent = "Choose Automatic, Apple Maps, or Google Maps.";
      return false;
    }
    try {
      await Storage.set(KEY, value);
      if (Storage.get(KEY) !== value) throw new Error("Save could not be verified");
    } catch (e) {
      if (status) status.textContent = "Maps preference was not saved. Device storage may be full or blocked. Your previous choice is unchanged.";
      return false;
    }
    preference = value;
    const refreshed = refreshLinks();
    if (status) status.textContent = labels[value] + " is saved on this device. " +
      (refreshed ? "Address links are updated now; close Settings to use them." : "The view could not be refreshed. Reopen the current screen to update its links.");
    return true;
  }

  function insertPanel() {
    if (typeof DATA === "undefined" || !DATA.currentUser || DATA.currentUser.role !== "Owner") return;
    if (!document.getElementById("companySettingsForm") || document.getElementById("shopMapsPreferencePanel")) return;
    const sheet = document.getElementById("modalSheet");
    if (!sheet) return;
    const panel = document.createElement("section");
    panel.id = "shopMapsPreferencePanel";
    panel.className = "shop-maps-preference-panel";
    panel.setAttribute("aria-label", "Preferred Maps service");
    panel.innerHTML = `
      <h3 style="font-size:20px;margin-bottom:8px;">Preferred Maps Service</h3>
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:12px;">Choose where jobsite and client addresses open. Automatic uses Apple Maps on detected iPhone/iPad devices and Google Maps elsewhere.</p>
      <label class="input-label" for="shopMapsPreferenceSelect">Open addresses with</label>
      <select id="shopMapsPreferenceSelect" class="text-input">
        <option value="AUTO">Automatic — based on device</option>
        <option value="APPLE">Apple Maps</option>
        <option value="GOOGLE">Google Maps</option>
      </select>
      <button id="shopMapsPreferenceSave" type="button" class="big-btn" style="margin-top:12px;">Save Maps Preference</button>
      <p id="shopMapsPreferenceStatus" role="status" aria-live="polite" style="font-size:13px;color:var(--text-muted);">Saved separately on this device. Your phone may open the selected service in its app or browser. This does not change the device's system default Maps app.</p>`;
    sheet.appendChild(panel);
    const select = document.getElementById("shopMapsPreferenceSelect");
    select.value = preference;
    document.getElementById("shopMapsPreferenceSave").addEventListener("click", () => save(select.value));
  }

  window.getMapLink = mapLink;
  window.ShopBoardMapsPreference = {reload:()=>{const saved=Storage.get(KEY);if(valid(saved))preference=saved;},save:save, getPreference:()=>preference, insertPanel:insertPanel, getMapLink:mapLink};
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
  refreshLinks();
})();
});
