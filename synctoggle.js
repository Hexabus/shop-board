/* Shop Board — the Cloud Sync section in Settings.
   Turning on: backup reminder -> set up / check the cloud -> send (or take the cloud's copy)
   -> check the cloud matches -> on. If any step fails, sync is left off and says why.
   Turning off: asks first; warns when crew logins depend on it. */
(function () {
  "use strict";
  if (window.ShopBoardCloudToggle) return;
  const node = id => document.getElementById(id);
  const api = () => window.ShopBoardCloudSync;
  // step: off | backup | checking | choose | working | on | confirmOff
  let step = "off", busy = false, message = "", cloudJobs = 0, crew = null, ticker = null;

  const PROBLEMS = {
    offline: "No connection right now. Changes are saved on this phone and will be sent when you're back online.",
    signed_out: "This phone's cloud sign-in has run out. Close and reopen Shop Board and sign in again to keep syncing.",
    removed: "This account was removed from the company, so its changes can no longer be sent.",
    no_company: "This account has no company in the cloud yet. Turn cloud sync off and on again to set it up.",
    denied: "The cloud refused this account. Close and reopen Shop Board and sign in again."
  };
  function explain(e, starting) {
    const code = e && (e.code || e.phase);
    if (starting && code === "offline") return "No connection right now. Try again when you're back online.";
    if (PROBLEMS[code]) return PROBLEMS[code];
    const detail = e && (e.detail || e.message || e.error);
    return "The cloud reported a problem" + (detail ? ": " + detail : ".") + " Your records are safe on this phone.";
  }
  function when(iso) { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
  function summary(counts) {
    const names = { sb_jobs: "job", sb_clients: "client", sb_notes: "note", sb_photos: "photo", sb_files: "document", sb_expenses: "receipt", sb_bills: "bill" };
    return Object.keys(names).filter(t => counts[t] !== undefined).map(t => counts[t] + " " + names[t] + (counts[t] === 1 ? "" : "s")).join(" • ");
  }

  function statusLine() {
    const s = api().status();
    if (s.phase === "sending" || s.phase === "fetching") return "Syncing now…";
    if (s.error && s.phase !== "idle") return explain(s);
    const parts = [s.lastSync ? "Last synced " + when(s.lastSync) + "." : "Not synced yet on this phone."];
    parts.push(s.waiting ? s.waiting + (s.waiting === 1 ? " change is" : " changes are") + " waiting to be sent." : "Everything on this phone is in the cloud.");
    if (s.skippedFiles.length) parts.push(s.skippedFiles.length + " picture(s) or document(s) could not be downloaded.");
    return parts.join(" ");
  }

  function render() {
    const body = node("shopCloudSyncBody");
    if (!body) return;
    if (!busy && (step === "off" || step === "on")) step = api().isOn() ? "on" : "off";
    const note = message ? `<p id="shopCloudSyncMessage" role="status" aria-live="polite" class="shop-sync-note" style="font-weight:700;"></p>` : "";
    const views = {
      off: `<p class="shop-sync-note">Off. Records are on this phone only.</p>${note}
        <button id="shopCloudSyncStart" type="button" class="big-btn secondary">Turn On Cloud Sync</button>`,
      backup: `<p class="shop-sync-note"><strong>Save a backup first.</strong> Use <em>Export Backup</em> below, and keep the file safe.</p>
        <label style="display:flex;gap:10px;margin:14px 0;align-items:flex-start;"><input id="shopCloudSyncBackedUp" type="checkbox" style="min-width:24px;min-height:24px;"><span>I have saved a backup.</span></label>${note}
        <button id="shopCloudSyncContinue" type="button" class="big-btn" disabled>Continue</button>
        <button id="shopCloudSyncCancel" type="button" class="big-btn secondary">Cancel</button>`,
      checking: `<p class="shop-sync-note" role="status">Checking the cloud… keep Shop Board open.</p>`,
      choose: `<p class="shop-sync-note"><strong>The cloud already holds ${cloudJobs} job${cloudJobs === 1 ? "" : "s"}</strong> from another phone. What should this phone do?</p>${note}
        <button id="shopCloudSyncUseCloud" type="button" class="big-btn">Use the Cloud's Records Here</button>
        <p class="shop-sync-note">Replaces the jobs, clients and crew on this phone with the cloud's. Right for a second phone or tablet.</p>
        <button id="shopCloudSyncSend" type="button" class="big-btn secondary">Send This Phone's Records Up</button>
        <p class="shop-sync-note">Adds this phone's records to the cloud. Where both have the same item, the latest change wins.</p>
        <button id="shopCloudSyncCancel" type="button" class="big-btn secondary">Cancel</button>`,
      working: `<p class="shop-sync-note" role="status">Syncing your records and checking them… keep Shop Board open. Photos can take a few minutes.</p>`,
      on: `<p class="shop-sync-note"><strong>On.</strong> <span id="shopCloudSyncStatus"></span></p>${note}
        <button id="shopCloudSyncNow" type="button" class="big-btn secondary">Sync Now</button>
        <button id="shopCloudSyncStop" type="button" class="big-btn secondary">Turn Off Cloud Sync</button>`,
      confirmOff: crew === null || crew > 0
        ? `<p class="shop-sync-note" style="font-weight:700; color:var(--alert);">${crew === null
            ? "Could not check who has a login. Turning off may remove their access."
            : `Turning off removes access for ${crew} ${crew === 1 ? "person" : "people"} with a login.`}</p>
        <p class="shop-sync-note">They stay on your crew list, but they lose their jobs and cannot sign in to see anything. Turning sync back on does not restore them. You let each one back in under Settings → People.</p>
        <p class="shop-sync-note">Your records stay on this phone and in the cloud.</p>
        <button id="shopCloudSyncStopYes" type="button" class="big-btn" style="background:var(--alert); border-color:var(--alert); color:#FFF;">Yes, Remove Their Access</button>
        <button id="shopCloudSyncCancel" type="button" class="big-btn secondary">Keep Sync On</button>`
        : `<p class="shop-sync-note"><strong>Turn off cloud sync?</strong> Your records stay on this phone and in the cloud. Turning it on again sends this phone's records up.</p>
        <button id="shopCloudSyncStopYes" type="button" class="big-btn">Turn Off</button>
        <button id="shopCloudSyncCancel" type="button" class="big-btn secondary">Keep Sync On</button>`
    };
    body.innerHTML = views[step];
    if (message && node("shopCloudSyncMessage")) node("shopCloudSyncMessage").textContent = message;
    if (step === "on") node("shopCloudSyncStatus").textContent = statusLine();
    const on = (id, fn) => { const n = node(id); if (n) n.addEventListener("click", fn); };
    on("shopCloudSyncStart", () => { message = ""; step = "backup"; render(); });
    on("shopCloudSyncCancel", () => { message = ""; step = api().isOn() ? "on" : "off"; render(); });
    on("shopCloudSyncContinue", check);
    on("shopCloudSyncUseCloud", () => start({ replace: true }));
    on("shopCloudSyncSend", () => start());
    on("shopCloudSyncNow", syncNow);
    on("shopCloudSyncStop", askOff);
    on("shopCloudSyncStopYes", stop);
    const box = node("shopCloudSyncBackedUp");
    if (box) box.addEventListener("change", () => { node("shopCloudSyncContinue").disabled = !box.checked; });
  }

  async function check() {
    if (busy) return;
    busy = true; step = "checking"; message = ""; render();
    try {
      const found = await api().prepare(window.DATA && window.DATA.business ? window.DATA.business.name : "");
      cloudJobs = found.cloudJobs;
      busy = false;
      if (cloudJobs > 0) { step = "choose"; render(); } else await start();
    } catch (e) { busy = false; step = "off"; message = "Cloud sync was not turned on. " + explain(e, true) + " Nothing on this phone was changed."; render(); }
  }

  async function start(opts) {
    if (busy) return;
    busy = true; step = "working"; message = ""; render();
    let changedPhone = false;
    try {
      const s = await api().turnOn(opts);
      if (s.error) throw s;
      changedPhone = Boolean(opts && opts.replace);
      const v = await api().verify();
      if (!v.ok) throw { message: "the cloud's copy did not match this phone after syncing (" + (v.missing.length || v.waiting) + " item(s) differ)" };
      message = "Cloud sync is on and checked: " + (summary(v.counts) || "no records yet") + ".";
      step = "on";
    } catch (e) {
      try { await api().turnOff(); } catch (_) {}
      step = "off";
      message = "Cloud sync was not turned on. " + explain(e, true) + (changedPhone ? " This phone now holds the cloud's records; your backup has the earlier ones." : " Nothing on this phone was changed.");
    }
    busy = false; render();
  }

  async function syncNow() {
    if (busy) return;
    busy = true; message = ""; node("shopCloudSyncNow").disabled = true; node("shopCloudSyncStatus").textContent = "Syncing now…";
    try { await api().syncNow(); } catch (e) {}
    busy = false; render();
  }
  async function askOff() {
    if (busy) return;
    busy = true; crew = null;
    try { crew = await api().crewLogins(); } catch (e) { crew = null; }
    busy = false; step = "confirmOff"; message = ""; render();
  }
  async function stop() {
    if (busy) return;
    busy = true; message = "";
    try {
      // Remove each crew and lead login first, so they lose access. If that fails, sync stays on.
      if (crew) {
        const p = await api().people();
        for (const x of p.people) if (x.role !== "owner" && x.status === "active") await api().setPerson(x.userId, { status: "removed" });
      }
      await api().turnOff();
      busy = false; step = "off"; message = "Cloud sync is off. Your records are still on this phone."; render();
    } catch (e) {
      busy = false; step = api().isOn() ? "on" : "off";
      message = "Crew were not removed, so sync is still on. " + explain(e, true); render();
    }
  }

  function insertPanel() {
    const form = node("companySettingsForm"), sheet = node("modalSheet");
    if (!form || !sheet || node("shopCloudSyncPanel") || !api()) return;
    const panel = document.createElement("section");
    panel.id = "shopCloudSyncPanel";
    panel.className = "shop-receipts-settings-card";
    panel.setAttribute("aria-label", "Cloud sync");
    panel.innerHTML = `<h3 class="shop-settings-card-heading">Cloud Sync</h3><div id="shopCloudSyncBody"></div>`;
    form.parentNode.insertBefore(panel, form.nextSibling);
    if (!busy) { step = api().isOn() ? "on" : "off"; message = ""; }
    render();
    clearInterval(ticker);
    ticker = setInterval(() => {
      if (!node("shopCloudSyncPanel")) { clearInterval(ticker); ticker = null; return; }
      if (step === "on" && !busy && node("shopCloudSyncStatus")) node("shopCloudSyncStatus").textContent = statusLine();
    }, 2000);
  }
  function setup() {
    if (document.body.getAttribute("data-shop-boot") === "loading" || !api()) return;
    const sheet = node("modalSheet");
    if (sheet && window.MutationObserver) new MutationObserver(insertPanel).observe(sheet, { childList: true });
    insertPanel();
  }
  window.ShopBoardCloudToggle = { insertPanel };
  if (window.ShopBoardBootPromise && typeof window.ShopBoardBootPromise.then === "function") window.ShopBoardBootPromise.then(setup); else setup();
})();
