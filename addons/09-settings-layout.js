/* Shop Board add-on: settings-layout */
(window.ShopBoardAddOns = window.ShopBoardAddOns || []).push(async function () {
const Storage = window.ShopBoardDatabase;
await (async function () {
  "use strict";
  if (window.ShopBoardSettingsLayout) return;
  let running = false;

  function organizeSettings() {
    if (running) return;
    const sheet = document.getElementById("modalSheet");
    const form = document.getElementById("companySettingsForm");
    if (!sheet || !form) return;
    running = true;
    try {
      const first = sheet.firstElementChild;
      if (first && first.textContent.trim() === "Company Settings") first.textContent = "Settings";
      form.classList.add("shop-company-profile-card");
      if (!document.getElementById("shopCompanyProfileHeading")) {
        const title = document.createElement("h3");
        title.id = "shopCompanyProfileHeading";
        title.textContent = "Company Profile";
        title.className = "shop-settings-card-heading";
        form.insertBefore(title, form.firstChild);
      }

      const category = document.getElementById("shopReceiptCategoryPanel");
      const job = document.getElementById("shopReceiptJobMemoryPanel");
      let receipts = document.getElementById("shopReceiptsSettingsCard");
      if ((category || job) && !receipts) {
        receipts = document.createElement("section");
        receipts.id = "shopReceiptsSettingsCard";
        receipts.className = "shop-receipts-settings-card";
        receipts.setAttribute("aria-label", "Receipt preferences");
        const title = document.createElement("h3");
        title.textContent = "Receipts";
        title.className = "shop-settings-card-heading";
        receipts.appendChild(title);
        sheet.appendChild(receipts);
      }
      [category, job].forEach(section => {
        if (!section || !receipts) return;
        if (section.parentNode !== receipts) receipts.appendChild(section);
        const heading = section.querySelector("h3");
        if (heading) {
          const subheading = document.createElement("h4");
          subheading.textContent = heading.textContent;
          subheading.className = "shop-receipt-settings-subheading";
          heading.replaceWith(subheading);
        }
      });

      let footer = document.getElementById("shopSettingsFooter");
      if (!footer) {
        footer = document.createElement("div");
        footer.id = "shopSettingsFooter";
        footer.className = "shop-settings-footer";
        const note = document.createElement("p");
        note.className = "shop-settings-footer-note";
        note.textContent = "Save Company Profile saves the name and logo. Other cards use their own save controls. Cancel discards unsaved company edits; already-saved preferences stay saved.";
        footer.appendChild(note);
        sheet.appendChild(footer);
      }
      const save = document.getElementById("saveCompanySettingsBtn");
      if (save) {
        if (save.getAttribute("form") !== "companySettingsForm") save.setAttribute("form", "companySettingsForm");
        if (save.parentNode !== footer) footer.appendChild(save);
        if (!save.disabled && save.textContent.trim() === "Save Settings") save.textContent = "Save Company Settings";
      }
      const cancel = form.querySelector('button[onclick="cancelCompanySettings()"]');
      if (cancel && cancel.parentNode !== footer) footer.appendChild(cancel);

      const ids = [
        "companySettingsForm", "shopAppearancePanel", "shopStartScreenPanel",
        "shopMapsPreferencePanel", "shopReceiptsSettingsCard",
        "shopBackupExportPanel", "shopRestorePanel", "shopSettingsFooter"
      ];
      const desired = ids.map(id => document.getElementById(id)).filter(node => node && node.parentNode === sheet);
      const existing = Array.from(sheet.children).filter(node => desired.includes(node));
      if (desired.some((node, index) => node !== existing[index])) desired.forEach(node => sheet.appendChild(node));
    } finally { running = false; }
  }

  const originalSettings = window.openCompanySettings;
  if (typeof originalSettings === "function") {
    window.openCompanySettings = function () {
      const result = originalSettings.apply(this, arguments);
      organizeSettings();
      return result;
    };
  }
  const sheet = document.getElementById("modalSheet");
  if (sheet && window.MutationObserver) {
    new MutationObserver(organizeSettings).observe(sheet, {
      childList:true, subtree:true, characterData:true,
      attributes:true, attributeFilter:["disabled"]
    });
  }
  window.ShopBoardSettingsLayout = {organize:organizeSettings};
  organizeSettings();
})();
});
