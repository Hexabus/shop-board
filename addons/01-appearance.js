/* Shop Board add-on: appearance */
(window.ShopBoardAddOns = window.ShopBoardAddOns || []).push(async function () {
const Storage = window.ShopBoardDatabase;
await (async function () {
  "use strict";
  if (window.ShopBoardAppearance) return;
  const KEY = "SHOP_BOARD_THEME";
  const valid = value => ["light", "dark", "system"].includes(value);
  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  let preference = "system";
  try { const saved = Storage.get(KEY); if (valid(saved)) preference = saved; } catch (e) {}

  function apply() {
    const resolved = preference === "system" ? (media && media.matches ? "dark" : "light") : preference;
    document.documentElement.setAttribute("data-shop-theme", resolved);
    document.documentElement.style.colorScheme = resolved;
    updatePanel();
  }

  function updatePanel() {
    const panel = document.getElementById("shopAppearancePanel");
    if (!panel) return;
    panel.querySelectorAll("[data-choice]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-choice") === preference));
    });
  }

  async function choose(value) {
    if (!valid(value)) return false;
    const panel = document.getElementById("shopAppearancePanel");
    const status = panel ? panel.querySelector("[role=status]") : null;
    try {
      await Storage.set(KEY, value);
      if (Storage.get(KEY) !== value) throw new Error("Theme was not saved");
    } catch (e) {
      if (status) status.textContent = "Appearance was not saved. Device storage is unavailable; your previous theme is unchanged.";
      return false;
    }
    preference = value;
    apply();
    if (status) status.textContent = "Appearance saved on this device.";
    return true;
  }

  function insertPanel() {
    if (!document.getElementById("companySettingsForm") || document.getElementById("shopAppearancePanel")) return;
    const sheet = document.getElementById("modalSheet");
    if (!sheet) return;
    const panel = document.createElement("section");
    panel.id = "shopAppearancePanel";
    panel.className = "shop-theme-panel";
    panel.setAttribute("aria-label", "Appearance settings");
    panel.innerHTML = `
      <h3 style="font-size:20px;margin-bottom:6px;">Appearance</h3>
      <p style="font-size:14px;color:var(--text-muted);">Theme changes save immediately on this device, separately from company name and logo. Company Settings Cancel does not undo a theme change.</p>
      <div class="shop-theme-choices">
        <button type="button" class="shop-theme-choice" data-choice="light" aria-pressed="false">☀️ Light</button>
        <button type="button" class="shop-theme-choice" data-choice="dark" aria-pressed="false">🌙 Dark</button>
        <button type="button" class="shop-theme-choice" data-choice="system" aria-pressed="false">📱 Follow phone settings</button>
      </div>
      <p class="shop-theme-status" role="status" aria-live="polite">Changes save immediately; no separate Save button needed.</p>`;
    panel.querySelectorAll("[data-choice]").forEach(button => {
      button.addEventListener("click", () => choose(button.getAttribute("data-choice")));
    });
    sheet.appendChild(panel);
    updatePanel();
  }

  window.ShopBoardAppearance = {reload:()=>{const saved=Storage.get(KEY);if(valid(saved))preference=saved;apply();},choose:choose, apply:apply, insertPanel:insertPanel, getPreference:()=>preference};
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
  if (sheet && window.MutationObserver) {
    new MutationObserver(insertPanel).observe(sheet, {childList:true});
  }
  const onSystemChange = () => { if (preference === "system") apply(); };
  if (media && media.addEventListener) media.addEventListener("change", onSystemChange);
  else if (media && media.addListener) media.addListener(onSystemChange);
  apply();
})();
});
