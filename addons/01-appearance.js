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
  let draft = preference;

  function apply() {
    const resolved = draft === "system" ? (media && media.matches ? "dark" : "light") : draft;
    document.documentElement.setAttribute("data-shop-theme", resolved);
    document.documentElement.style.colorScheme = resolved;
    updatePanel();
  }

  function updatePanel() {
    const panel = document.getElementById("shopAppearancePanel");
    if (!panel) return;
    panel.querySelectorAll("[data-choice]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-choice") === draft));
    });
  }

  function preview(value) {
    if (!valid(value)) return;
    draft = value;
    apply();
    const panel = document.getElementById("shopAppearancePanel");
    const status = panel ? panel.querySelector("[role=status]") : null;
    if (status) status.textContent = "Previewing now. Saves when you tap Save Settings below.";
  }

  async function commitDraft() {
    if (draft === preference) return true;
    try {
      await Storage.set(KEY, draft);
      if (Storage.get(KEY) !== draft) throw new Error("Theme was not saved");
    } catch (e) {
      draft = preference;
      apply();
      return false;
    }
    preference = draft;
    return true;
  }

  function discardDraft() {
    draft = preference;
    apply();
  }

  function insertPanel() {
    if (!document.getElementById("companySettingsForm") || document.getElementById("shopAppearancePanel")) return;
    const sheet = document.getElementById("modalSheet");
    if (!sheet) return;
    draft = preference;
    const panel = document.createElement("section");
    panel.id = "shopAppearancePanel";
    panel.className = "shop-theme-panel";
    panel.setAttribute("aria-label", "Appearance settings");
    panel.innerHTML = `
      <h3 style="font-size:20px;margin-bottom:6px;">Appearance</h3>
      <p style="font-size:14px;color:var(--text-muted);">Previewed instantly; saved with the rest of Settings below.</p>
      <div class="shop-theme-choices">
        <button type="button" class="shop-theme-choice" data-choice="light" aria-pressed="false">${ShopIcon.sun} Light</button>
        <button type="button" class="shop-theme-choice" data-choice="dark" aria-pressed="false">${ShopIcon.moon} Dark</button>
        <button type="button" class="shop-theme-choice" data-choice="system" aria-pressed="false">${ShopIcon.device} Follow phone settings</button>
      </div>
      <p class="shop-theme-status" role="status" aria-live="polite">Previewing now. Saves when you tap Save Settings below.</p>`;
    panel.querySelectorAll("[data-choice]").forEach(button => {
      button.addEventListener("click", () => preview(button.getAttribute("data-choice")));
    });
    sheet.appendChild(panel);
    updatePanel();
    if (window.ShopBoardPendingSettings) {
      window.ShopBoardPendingSettings.commits.push(commitDraft);
      window.ShopBoardPendingSettings.discards.push(discardDraft);
    }
  }

  window.ShopBoardAppearance = {reload:()=>{const saved=Storage.get(KEY);if(valid(saved))preference=saved;draft=preference;apply();},choose:preview, apply:apply, insertPanel:insertPanel, getPreference:()=>preference};
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
