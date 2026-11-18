/* Shop Board — lead and crew logins.
   A phone signed in as a lead or crew member always runs on the cloud's records: it takes the
   jobs that login is allowed to see, shows only what the role may do, and keeps syncing.
   The server enforces the same rules; this file only keeps the screen honest about them. */
(function () {
  "use strict";
  if (window.ShopBoardMember) return;
  const FLAG = "shopBoardMemberDevice", ID_KEY = "shopBoardMemberId", TOKEN_KEY = "shopBoardCloudRefreshToken";
  const api = () => window.ShopBoardCloudSync;
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const isMemberDevice = () => get(FLAG) === "1";
  const clear = () => { set(FLAG, null); set(ID_KEY, null); };
  const hasCredential = () => Boolean(get(TOKEN_KEY));

  // What each role may not do on screen. Buttons that call these are hidden, and the calls refuse.
  const MONEY = ["toggleMoneyForCrew", "openAddBillModal", "saveBill", "deleteBill", "toggleBillPaid", "openEditJobMoneyModal", "saveJobMoney",
    "useBillsForJobMoney", "openEditQuoteModal", "addQuoteLine", "deleteQuoteLine", "openQuoteEmailModal", "openBillEmailModal", "openTaxExportModal",
    "deleteExpense", "openNewCrewModal", "saveNewCrew", "deleteCrewMember", "openEditCrewModal", "saveCrewEdits", "sendQuotePdf", "sendInvoicePdf", "exportTaxCsv"];
  const BLOCKED = {
    lead: MONEY,
    crew: MONEY.concat(["openNewJobModal", "saveNewJob", "openEditJobModal", "saveJobEdits", "deleteJob", "setJobStatus", "openNewClientModal",
      "saveNewClient", "openEditClientModal", "saveClientEdits", "deleteClient", "deleteNote", "deletePhoto", "deleteFile", "openAddFileModal", "saveRealFile",
      "openJobCrewAdd", "addCrewToJob", "removeCrewFromJob"])
  };
  const LABEL = { lead: "Lead", crew: "Crew" };
  let role = null, wrapped = false, watcher = null;

  /* Called by the sign-in screen when the account is not the owner's. */
  async function signIn(email, password) {
    if (!api() || !api().signIn) return { ok: false, message: "Sign-in is not available right now. Close and reopen Shop Board." };
    try {
      const who = await api().signIn(email, password);
      if (who.role !== "owner") { set(FLAG, "1"); set(ID_KEY, who.userId); } else clear();
      return { ok: true, message: "" };
    } catch (e) {
      const code = e && e.code;
      if (code === "removed" || code === "accept_failed") { try { await api().signOutHere(); } catch (_) {} } // keep no sign-in for a login that cannot be used
      if (code === "accept_failed") return { ok: false, message: e.message }; // e.g. no free seat: say why
      return { ok: false, message: code === "removed" ? "This login was removed from the company. Ask the owner to add you back."
        : code === "offline" ? "Could not reach the cloud. Check your connection and try again."
        : code === "signed_out" ? "Email or password was not accepted." : "Sign-in failed. Try again." };
    }
  }

  function addStyle() {
    if (document.getElementById("shopMemberStyle")) return;
    const hide = r => BLOCKED[r].map(f => `body[data-shop-role="${r}"] [onclick^="${f}("]`).join(",");
    const style = document.createElement("style");
    style.id = "shopMemberStyle";
    style.textContent = `${hide("lead")},${hide("crew")},body[data-shop-role] [onclick="openView('MONEY')"]{display:none!important;}`;
    document.head.appendChild(style);
  }
  function wrap() {
    if (wrapped) return;
    wrapped = true;
    const all = new Set(BLOCKED.crew.concat(BLOCKED.lead));
    all.forEach(name => {
      const original = window[name];
      if (typeof original !== "function") return;
      window[name] = function () {
        if (role && BLOCKED[role] && BLOCKED[role].includes(name)) { if (window.showToast) window.showToast("Only the owner can do that"); return undefined; }
        return original.apply(this, arguments);
      };
    });
    // The header's owner/crew switch and the settings button become "My Account" on these phones.
    ["switchUserRole", "openCompanySettings"].forEach(name => {
      const original = window[name];
      if (typeof original !== "function") return;
      window[name] = function () { if (role) return openAccount(); return original.apply(this, arguments); };
    });
    const badges = window.updateHeaderBadges;
    if (typeof badges === "function") window.updateHeaderBadges = function () {
      const out = badges.apply(this, arguments);
      const badge = document.getElementById("roleBadge");
      if (role === "lead" && badge) badge.innerHTML = badge.innerHTML.replace("CREW", "LEAD");
      return out;
    };
  }

  function applyRole(who) {
    if (!who || !BLOCKED[who.role]) return;
    role = who.role;
    document.body.dataset.shopRole = role;
    addStyle(); wrap();
    const data = window.DATA;
    if (data) {
      const mine = (data.crewMembers || []).find(c => c.userId === who.userId);
      data.currentUser = { name: (mine && mine.name) || LABEL[role], role: LABEL[role] };
    }
    if (typeof window.updateHeaderBadges === "function") window.updateHeaderBadges();
    if (typeof window.renderCurrentView === "function") window.renderCurrentView();
  }

  /* ------------------------------------------------------------ full-screen messages */
  function cover(html) {
    let el = document.getElementById("shopMemberCover");
    if (!el) { el = document.createElement("div"); el.id = "shopMemberCover"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); document.body.appendChild(el); }
    el.innerHTML = `<div class="shop-member-card">${html}</div>`;
    const title = el.querySelector("h2"), first = el.querySelector("button");
    if (title) { title.id = "shopMemberTitle"; el.setAttribute("aria-labelledby", "shopMemberTitle"); }
    if (first) first.focus();
    return el;
  }
  function uncover() { const el = document.getElementById("shopMemberCover"); if (el) el.remove(); }
  const on = (id, fn) => { const n = document.getElementById(id); if (n) n.addEventListener("click", fn); };
  const SIGN_OUT = `<button id="shopMemberSignOut" type="button" class="big-btn secondary">Sign Out</button>`;

  async function signOut() {
    try { if (api().isOn()) await api().turnOff(); } catch (e) {}
    try { await api().signOutHere(); } catch (e) {}
    // Leave nothing of this login behind: its jobs live in the cloud, and the next person to
    // sign in here (the owner, say) should not find a half-set of someone else's records.
    try {
      const data = window.DATA;
      if (data && role) {
        data.jobs = []; data.clients = []; data.crewMembers = [];
        data.currentUser = { name: (data.business && data.business.owner) || "Shop Owner", role: "Owner" };
        role = null;
        await window.saveData();
      }
    } catch (e) {}
    set(FLAG, null); set(ID_KEY, null);
    location.reload();
  }

  function showWaiting(userId) {
    cover(`<h2>Almost there</h2>
      <p>You are signed in, but the owner has not added this login to their company yet.</p>
      <p>Send the owner this login code. They add it under <strong>Settings → People</strong>.</p>
      <p id="shopMemberCode" class="shop-member-code"></p>
      <button id="shopMemberCopy" type="button" class="big-btn">Copy Code</button>
      <button id="shopMemberRetry" type="button" class="big-btn secondary">Check Again</button>${SIGN_OUT}
      <p id="shopMemberNote" role="status" aria-live="polite"></p>`);
    document.getElementById("shopMemberCode").textContent = userId || "";
    on("shopMemberCopy", async () => {
      let done = false;
      try { await navigator.clipboard.writeText(userId); done = true; } catch (e) {}
      document.getElementById("shopMemberNote").textContent = done ? "Copied." : "Could not copy. Press and hold the code to copy it.";
    });
    on("shopMemberRetry", join);
    on("shopMemberSignOut", signOut);
  }
  /* Try Again on a phone that is already set up: an ordinary sync, so nothing waiting is lost. */
  async function retry() {
    const cached = api().who();
    if (!(api().isOn() && cached && cached.userId === get(ID_KEY))) return join();
    cover(`<h2>Checking…</h2><p>Keep Shop Board open.</p>`);
    let s; try { s = await api().syncNow(); } catch (e) { s = api().status(); }
    const who = api().who();
    if (s.phase === "idle" && who && BLOCKED[who.role]) { uncover(); applyRole(who); return watch(); }
    if (s.phase === "idle" && who && who.role === "owner") { clear(); location.reload(); return; }
    if (s.phase === "removed") return showProblem("Login removed", "This login is still removed from the company. Changes made on this phone are kept here but cannot be sent. Ask the owner if that is a mistake.", true);
    if (s.phase === "signed_out") return showProblem("Sign in again", "This phone's sign-in has run out. Sign out, then sign in again.", false);
    showProblem("Could not reach the cloud", "Check your connection and try again. Changes made on this phone are kept.", true);
  }
  function showProblem(title, text, retryable) {
    cover(`<h2>${title}</h2><p>${text}</p>${retryable ? `<button id="shopMemberRetry" type="button" class="big-btn">Try Again</button>` : ""}${SIGN_OUT}`);
    on("shopMemberRetry", retry);
    on("shopMemberSignOut", signOut);
  }

  /* First run on this phone for this login: take the cloud's records it is allowed to see. */
  async function join() {
    cover(`<h2>Getting your jobs…</h2><p>Keep Shop Board open. Photos can take a few minutes.</p>`);
    let code = null, userId = get(ID_KEY);
    try {
      // Know who is signed in before anything on the phone is swapped out.
      const me = await api().session(true);
      if (me.role === "owner") { clear(); location.reload(); return; } // the owner's phone: leave its records alone
      userId = me.userId; set(ID_KEY, userId);
      if (api().isOn()) await api().turnOff();
      const s = await api().turnOn({ replace: true });
      if (s.error) code = s.phase || "error";
    } catch (e) { code = (e && e.code) || "error"; }
    const who = api().who();
    if (!code && who && who.role === "owner") { set(FLAG, null); set(ID_KEY, null); location.reload(); return; } // promoted to owner: a normal phone again
    if (!code && who && BLOCKED[who.role]) { set(ID_KEY, who.userId); uncover(); applyRole(who); watch(); return; }
    try { await api().turnOff(); } catch (e) {}
    if (code === "no_company") {
      if (!userId) { try { userId = (await api().session(true)).userId; set(ID_KEY, userId); } catch (e) {} }
      return showWaiting(userId);
    }
    if (code === "removed") return showProblem("Login removed", "This login was removed from the company, so its jobs are no longer shared with this phone. Ask the owner if that is a mistake.", true);
    if (code === "signed_out") return showProblem("Sign in again", "This phone's sign-in has run out. Sign out, then sign in again.", false);
    showProblem("Could not reach the cloud", "Your jobs could not be fetched. Check your connection and try again.", true);
  }

  /* Keeps an eye on the sync: a changed role is applied, a removed login is told so. */
  function watch() {
    clearInterval(watcher);
    watcher = setInterval(() => {
      const s = api().status(), who = api().who();
      if (document.getElementById("shopMemberCover")) return;
      if (s.phase === "removed") { clearInterval(watcher); return showProblem("Login removed", "This login was removed from the company. Changes made on this phone can no longer be sent. Ask the owner if that is a mistake.", true); }
      if (s.phase === "signed_out") { clearInterval(watcher); return showProblem("Sign in again", "This phone's sign-in has run out. Sign out, then sign in again.", false); }
      if (who && who.role === "owner") { clearInterval(watcher); set(FLAG, null); set(ID_KEY, null); location.reload(); return; }
      if (who && BLOCKED[who.role] && who.role !== role) applyRole(who);
      const data = window.DATA;
      if (data && role && (!data.currentUser || data.currentUser.role !== LABEL[role])) applyRole(who || { role, userId: get(ID_KEY) });
    }, 3000);
  }

  /* "My Account": what this login is, how the sync is doing, and sign out. */
  function openAccount() {
    const s = api().status(), data = window.DATA || {};
    const state = s.phase === "offline" ? "No connection right now. Changes are saved on this phone and will be sent when you're back online."
      : s.waiting ? s.waiting + (s.waiting === 1 ? " change is" : " changes are") + " waiting to be sent." : "Everything on this phone is in the cloud.";
    cover(`<h2>My Account</h2>
      <p><strong id="shopMemberName"></strong><br>${LABEL[role] || ""} login</p>
      <p>${role === "lead" ? "You can see and manage every job. Money and company settings stay with the owner."
        : "You see the jobs you are assigned to and can add notes, photos and receipts."}</p>
      <p id="shopMemberNote" role="status" aria-live="polite">${state}</p>
      <button id="shopMemberSync" type="button" class="big-btn">Sync Now</button>
      <button id="shopMemberClose" type="button" class="big-btn secondary">Close</button>
      <button id="shopMemberSignOut" type="button" class="big-btn secondary" style="margin-top:24px;">Sign Out</button>`);
    document.getElementById("shopMemberName").textContent = (data.currentUser && data.currentUser.name) || "";
    on("shopMemberClose", uncover);
    on("shopMemberSync", async () => { document.getElementById("shopMemberNote").textContent = "Syncing now…"; try { await api().syncNow(); } catch (e) {} if (document.getElementById("shopMemberClose")) openAccount(); });
    let armed = false;
    on("shopMemberSignOut", () => {
      const waiting = api().status().waiting;
      if (waiting && !armed) { armed = true; document.getElementById("shopMemberNote").textContent = waiting + " change(s) on this phone have not been sent yet and will be lost. Tap Sign Out again to sign out anyway."; return; }
      signOut();
    });
  }

  async function start() {
    if (!isMemberDevice() || !api()) return;
    const cached = api().who(), id = get(ID_KEY), data = window.DATA || {};
    document.body.dataset.shopRole = (cached && BLOCKED[cached.role] && cached.role) || "crew"; // most limited until known
    addStyle();
    if (api().isOn() && cached && cached.userId === id && BLOCKED[cached.role]) { applyRole(cached); watch(); return; }
    // This phone already holds someone else's records: never swap them out without asking.
    if ((data.jobs || []).length || (data.clients || []).length) {
      cover(`<h2>This phone already holds records</h2>
        <p>Signing in with this login replaces the jobs and clients on this phone with the ones shared with you. If the records here are the owner's only copy, sign out and let the owner back them up first.</p>
        <button id="shopMemberReplace" type="button" class="big-btn">Replace and Continue</button>${SIGN_OUT}`);
      on("shopMemberReplace", join);
      on("shopMemberSignOut", signOut);
      return;
    }
    await join();
  }

  window.ShopBoardMember = { isMemberDevice, hasCredential, signIn, clear, BLOCKED };
  if (window.ShopBoardBootPromise && typeof window.ShopBoardBootPromise.then === "function") window.ShopBoardBootPromise.then(start); else start();
})();
