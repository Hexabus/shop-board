/* Shop Board add-on: backup-export */
(window.ShopBoardAddOns = window.ShopBoardAddOns || []).push(async function () {
const Storage = window.ShopBoardDatabase;
await (async function () {
  "use strict";
  if (window.ShopBoardBackupExport) return;
  let downloadUrl = null;

  function status(message) {
    const element = document.getElementById("shopBackupStatus");
    if (element) element.textContent = message;
  }

  function makeBackup() {
    if (typeof DATA === "undefined" || !DATA || !Array.isArray(DATA.jobs) || !Array.isArray(DATA.clients)) {
      throw new Error("App data is unavailable. Open the main Shop Board app and try again.");
    }
    if (!DATA.currentUser || DATA.currentUser.role !== "Owner") {
      throw new Error("Switch to Owner view to export the full backup.");
    }
    let theme = "system";
    try {
      const saved = Storage.get("SHOP_BOARD_THEME");
      if (["light", "dark", "system"].includes(saved)) theme = saved;
    } catch (e) {}
    const data=JSON.parse(Storage.get("SHOP_BOARD_DATA"));
    const preferences=Storage.values();delete preferences.SHOP_BOARD_DATA;
    const now = new Date();
    const backup = {
      app: "Shop Board",
      schemaVersion: 1,
      exportedAt: now.toISOString(),
      scope: "Current data on this device only",
      data: data,
      deviceSettings: {appearance: theme,preferences:preferences}
    };
    const timestamp = now.toISOString().replace(/[:.]/g, "-");
    const filename = "Shop-Board-Backup-" + timestamp + ".json";
    return {backup:backup, filename:filename};
  }

  function exportBackup() {
    const button = document.getElementById("shopExportBackupButton");
    const link = document.getElementById("shopBackupDownload");
    if (!button || !link) return;
    button.disabled = true;
    try {
      const result = makeBackup();
      const text = JSON.stringify(result.backup, null, 2);
      const blob = new Blob([text], {type:"application/json;charset=utf-8"});
      const nextUrl = URL.createObjectURL(blob);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      downloadUrl = nextUrl;
      link.href = downloadUrl;
      link.download = result.filename;
      link.hidden = false;
      link.textContent = "Save / Download Backup";
      const count = result.backup.data.jobs.length;
      const size = (blob.size / 1024).toFixed(1);
      status("Backup prepared: " + count + " jobs, " + result.backup.data.clients.length +
        " clients, " + size + " KB. Finish saving the file using your browser's download or share controls. The app cannot verify that it was saved.");
      link.click();
    } catch (e) {
      status("Backup could not be prepared: " + (e.message || "Unknown error") + ". Your app records were not changed.");
    } finally {
      button.disabled = false;
    }
  }

  function insertPanel() {
    if (typeof DATA === "undefined" || !DATA.currentUser || DATA.currentUser.role !== "Owner") return;
    if (!document.getElementById("companySettingsForm") || document.getElementById("shopBackupExportPanel")) return;
    const sheet = document.getElementById("modalSheet");
    if (!sheet) return;
    const panel = document.createElement("section");
    panel.id = "shopBackupExportPanel";
    panel.className = "shop-backup-panel";
    panel.setAttribute("aria-label", "Backup export");
    panel.innerHTML = `
      <h3 style="font-size:20px;margin-bottom:8px;">Backup</h3>
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:12px;">Export the current records from this device, including company name, logo, crew, clients, jobs, quotes, bills, expenses, notes, and any photos or documents stored inside the app.</p>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">External photo links and filename-only records remain links or records; their missing file contents cannot be included. This export is not cloud sync.</p>
      <button id="shopExportBackupButton" type="button" class="big-btn">Export Backup</button>
      <a id="shopBackupDownload" class="comm-btn" hidden>Save / Download Backup</a>
      <p id="shopBackupStatus" role="status" aria-live="polite" style="font-size:13px;overflow-wrap:anywhere;margin:12px 0;">Your backup contains private client and financial information. Store it somewhere safe. This backup includes saved device preferences.</p>`;
    sheet.appendChild(panel);
    document.getElementById("shopExportBackupButton").addEventListener("click", exportBackup);
  }

  window.ShopBoardBackupExport = {exportBackup:exportBackup, makeBackup:makeBackup, insertPanel:insertPanel};
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
  window.addEventListener("pagehide", () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      downloadUrl = null;
      const link = document.getElementById("shopBackupDownload");
      if (link) { link.hidden = true; link.removeAttribute("href"); }
    }
  });
})();
});
