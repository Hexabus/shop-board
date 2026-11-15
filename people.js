/* Shop Board — the owner's People section in Settings (shown while cloud sync is on).
   Lists every login in the company, adds a lead or crew login by its login code, changes a
   role, and removes or restores a login. The server checks all of it again (owner only, seat limit). */
(function () {
  "use strict";
  if (window.ShopBoardPeople) return;
  const node = id => document.getElementById(id);
  const api = () => window.ShopBoardCloudSync;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ROLE = { owner: "Owner", lead: "Lead", crew: "Crew" };
  let info = null, message = "", busy = false, loading = false;

  function isOwnerSyncing() { const a = api(), w = a && a.who && a.who(); return Boolean(a && a.isOn() && w && w.role === "owner"); }
  function say(e) {
    if (e && e.code === "offline") return "No connection right now. Try again when you're back online.";
    return (e && (e.code === "rejected" ? e.message : e.detail || e.message)) || "That did not go through. Try again.";
  }

  function render() {
    const body = node("shopPeopleBody");
    if (!body) return;
    // The message line sits outside the redrawn part so screen readers hear each change.
    const note = node("shopPeopleMessage");
    if (note) note.textContent = info && isOwnerSyncing() ? message : "";
    if (!isOwnerSyncing()) { body.innerHTML = `<p class="shop-sync-note">Turn on Cloud Sync above to give your crew their own logins.</p>`; return; }
    if (!info) { body.innerHTML = `<p class="shop-sync-note" role="status">${loading ? "Checking who has a login…" : esc(message || "Could not load the list.")}</p>${loading ? "" : `<button id="shopPeopleReload" type="button" class="big-btn secondary">Try Again</button>`}`; const r = node("shopPeopleReload"); if (r) r.addEventListener("click", load); return; }
    const free = info.seatLimit === null ? null : Math.max(0, info.seatLimit - info.used);
    const rows = info.people.map(p => {
      const name = p.name || (p.me ? "You" : "Login ending " + p.userId.slice(-6));
      const off = p.status !== "active";
      const actions = p.role === "owner" ? "" : off
        ? `<button type="button" class="comm-btn" data-people="restore" data-id="${p.userId}">Let Back In</button>`
        : `<button type="button" class="comm-btn" data-people="role" data-id="${p.userId}" data-role="${p.role === "lead" ? "crew" : "lead"}">Make ${p.role === "lead" ? "Crew" : "Lead"}</button>
           <button type="button" class="comm-btn${p.confirm ? " danger" : ""}" data-people="remove" data-id="${p.userId}">${p.confirm ? "Tap Again to Remove" : "Remove"}</button>`;
      return `<li class="shop-people-row"><div><strong>${esc(name)}</strong><br><span class="shop-sync-note">${ROLE[p.role] || esc(p.role)}${off ? " • removed" : ""}${p.role !== "owner" && !p.crewId && !off ? " • not matched to a crew name, so sees no assigned jobs" : ""}</span></div><div class="shop-people-actions">${actions}</div></li>`;
    }).join("");
    const openNames = info.roster.filter(r => !r.userId);
    body.innerHTML = `
      <p class="shop-sync-note">${info.seatLimit === null ? "" : `<strong>${info.used} of ${info.seatLimit} seats used.</strong> `}A Lead sees and manages every job but no money. Crew see only jobs they are assigned to and can add notes, photos and receipts.</p>
      <ul class="shop-people-list">${rows}</ul>
      <h4 class="shop-people-sub">Add a login</h4>
      ${free === 0 ? `<p class="shop-sync-note">Both seats are in use. Remove someone to add another login.</p>` : `
      <p class="shop-sync-note">Until sign-up opens, you create each login yourself: in Supabase, under Authentication → Users → Add user, enter their email and a password. Then the person signs in to Shop Board on their own phone, and it shows them a login code to send you (it is also the "User UID" Supabase shows). Paste it here.</p>
      <label class="input-label" for="shopPeopleCode">Login code</label>
      <input id="shopPeopleCode" class="text-input" type="text" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
      <label class="input-label" for="shopPeopleRole">Role</label>
      <select id="shopPeopleRole" class="text-input"><option value="crew">Crew</option><option value="lead">Lead</option></select>
      <label class="input-label" for="shopPeopleCrew">Who is this on your crew list?</label>
      <select id="shopPeopleCrew" class="text-input"><option value="">Choose a name…</option>${openNames.map(r => `<option value="${esc(r.id)}">${esc(r.name || "Unnamed")}</option>`).join("")}</select>
      <p class="shop-sync-note">Not listed? Add them under Clients &amp; Crew first, tap Sync Now above, then come back.</p>
      <button id="shopPeopleAdd" type="button" class="big-btn secondary">Add Login</button>`}`;
    body.querySelectorAll("[data-people]").forEach(b => b.addEventListener("click", () => act(b.dataset.people, b.dataset.id, b.dataset.role)));
    const add = node("shopPeopleAdd");
    if (add) add.addEventListener("click", addLogin);
  }

  async function load() {
    if (!isOwnerSyncing() || loading) { render(); return; }
    loading = true; render();
    try { info = await api().people(); message = ""; } catch (e) { info = null; message = say(e); }
    loading = false; render();
  }
  async function change(work, done) {
    if (busy) return;
    busy = true; message = "Working…"; render();
    try { await work(); message = done; try { info = await api().people(); } catch (e) {} api().syncNow(); }
    catch (e) { message = say(e); }
    busy = false; render();
  }
  function addLogin() {
    const code = node("shopPeopleCode").value.trim(), role = node("shopPeopleRole").value, crewId = node("shopPeopleCrew").value;
    if (!code) { message = "Paste the login code first."; return render(); }
    if (role === "crew" && !crewId) { message = "Choose who this is on your crew list, so their assigned jobs reach them."; return render(); }
    change(() => api().addPerson(code, role, crewId), "Login added. They can tap Check Again on their phone.");
  }
  function act(kind, userId, role) {
    if (kind === "role") return change(() => api().setPerson(userId, { role }), "Role changed. Their phone updates at its next sync.");
    if (kind === "restore") return change(() => api().setPerson(userId, { status: "active" }), "Login let back in.");
    if (kind === "remove") {
      const row = info && info.people.find(p => p.userId === userId);
      if (!row || row.confirm) return change(() => api().setPerson(userId, { status: "removed" }), "Login removed. Their phone stops getting your jobs, and nothing more from it is accepted.");
      row.confirm = true; message = "Removing stops their phone getting your jobs. Tap again to confirm."; render();
    }
  }

  function insertPanel() {
    const form = node("companySettingsForm"), sheet = node("modalSheet");
    if (!form || !sheet || node("shopPeoplePanel") || !api() || !api().people) return;
    const panel = document.createElement("section");
    panel.id = "shopPeoplePanel";
    panel.className = "shop-receipts-settings-card";
    panel.setAttribute("aria-label", "People and logins");
    panel.innerHTML = `<h3 class="shop-settings-card-heading">People</h3><div id="shopPeopleBody"></div>
      <p id="shopPeopleMessage" role="status" aria-live="polite" class="shop-sync-note" style="font-weight:700;"></p>`;
    const after = node("shopCloudSyncPanel") || form;
    after.parentNode.insertBefore(panel, after.nextSibling);
    info = null; message = "";
    load();
  }
  function setup() {
    if (document.body.getAttribute("data-shop-boot") === "loading" || !api()) return;
    const sheet = node("modalSheet");
    if (sheet && window.MutationObserver) new MutationObserver(insertPanel).observe(sheet, { childList: true });
    insertPanel();
  }
  window.ShopBoardPeople = { insertPanel, refresh: load };
  if (window.ShopBoardBootPromise && typeof window.ShopBoardBootPromise.then === "function") window.ShopBoardBootPromise.then(setup); else setup();
})();
