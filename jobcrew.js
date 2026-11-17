/* Shop Board — who is on a job.
   The job screen shows everyone on the job as name tags (a lead or owner is marked as such).
   The owner and leads add people from a short list and take them off again; crew only look.
   The cloud checks the same rule again when the change is synced. */
(function () {
  "use strict";
  if (window.ShopJobCrew) return;
  const data = () => window.DATA || {};
  const findJob = id => (data().jobs || []).find(j => j.id === id);
  const findPerson = id => (data().crewMembers || []).find(c => c.id === id);
  const nameOf = c => (c && c.name) || "Unnamed";
  const TITLE = `font-family: var(--font-display); font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px;`;

  // On a lead or crew phone the login's role decides; otherwise it is the owner's own phone.
  function canManage() {
    const login = document.body.dataset.shopRole;
    if (login) return login === "lead";
    return Boolean(data().currentUser && data().currentUser.role === "Owner");
  }
  function mark(c) {
    if (c.role === "Owner") return { icon: ShopIcon.crown, label: "Owner", cls: " is-owner" };
    if (c.role === "Lead") return { icon: ShopIcon.lead, label: "Lead", cls: " is-lead" };
    return { icon: "", label: "", cls: "" };
  }
  const roleBits = c => { const m = mark(c); return { m, html: m.label ? `<span class="job-crew-role">${m.icon} ${m.label}</span>` : "" }; };
  const peopleOn = job => (job.crewAssigned || []).map(findPerson).filter(Boolean);

  /* The "Crew on this job" block of the job screen. */
  function sectionHtml(job) {
    const on = peopleOn(job), manage = canManage();
    const tags = on.map(c => {
      const r = roleBits(c);
      return `<button type="button" class="job-crew-tag${r.m.cls}" onclick="openJobCrewPerson('${escJs(job.id)}', '${escJs(c.id)}')"><span class="job-crew-name">${esc(nameOf(c))}</span>${r.html}</button>`;
    }).join("");
    return `
      <div class="job-crew-head">
        <div class="job-crew-title">Crew on this job (${on.length})</div>
        ${manage ? `<button type="button" class="job-crew-add" onclick="openJobCrewAdd('${escJs(job.id)}')">+ Add</button>` : ""}
      </div>
      ${on.length ? `<div class="job-crew-tags">${tags}</div>`
        : `<div class="job-crew-empty">No one is on this job yet.${manage ? " Tap Add to put someone on it." : ""}</div>`}`;
  }

  /* The list of people who are not on the job yet. Tapping a name adds them straight away. */
  function openJobCrewAdd(jobId) {
    const job = findJob(jobId);
    if (!job || !canManage()) return;
    const onIds = new Set(job.crewAssigned || []);
    const open = (data().crewMembers || []).filter(c => !onIds.has(c.id));
    const on = peopleOn(job);
    openModal(`
      <div style="${TITLE}">Add Crew to Job</div>
      <div class="job-crew-sub">${esc(job.name)}</div>
      ${open.length ? open.map(c => `
        <button type="button" class="job-crew-pick${mark(c).cls}" onclick="addCrewToJob('${escJs(job.id)}', '${escJs(c.id)}')">
          <span class="job-crew-plus" aria-hidden="true">+</span><span class="job-crew-name">${esc(nameOf(c))}</span>${roleBits(c).html}
        </button>`).join("")
        : `<div class="job-crew-empty">${(data().crewMembers || []).length ? "Everyone on your crew list is already on this job." : "Your crew list is empty."}</div>`}
      <div class="job-crew-empty" role="status" aria-live="polite">${on.length ? "On this job now: " + esc(on.map(nameOf).join(", ")) + "." : "No one is on this job yet."}</div>
      <div class="job-crew-empty">Not listed? Add them to the crew roster under Clients first.</div>
      <button type="button" class="big-btn" onclick="closeModal()">Done</button>`);
  }
  async function addCrewToJob(jobId, crewId) {
    const job = findJob(jobId), c = findPerson(crewId);
    if (!job || !c || !canManage()) return;
    if (!Array.isArray(job.crewAssigned)) job.crewAssigned = [];
    if (!job.crewAssigned.includes(crewId)) job.crewAssigned.push(crewId);
    await saveData();
    renderCurrentView();
    openJobCrewAdd(jobId); // the list shortens, ready for the next name
    showToast(nameOf(c) + " added to job");
  }

  /* One person on the job: reach them, or (owner and leads) take them off. */
  function openJobCrewPerson(jobId, crewId) {
    const job = findJob(jobId), c = findPerson(crewId);
    if (!job || !c) return;
    const m = mark(c);
    openModal(`
      <div style="${TITLE}">${esc(nameOf(c))}</div>
      <div class="job-crew-sub">${m.icon} ${m.label || "Crew"} • on ${esc(job.name)}</div>
      ${c.phone ? `<div class="comm-row" style="margin-bottom: 14px;">
          <a href="tel:${esc(c.phone)}" class="comm-btn">${ShopIcon.call} Call</a>
          <a href="sms:${esc(c.phone)}" class="comm-btn">${ShopIcon.text} Text</a>
        </div>` : `<div class="job-crew-empty">No phone number saved.</div>`}
      ${canManage() ? `<button type="button" class="big-btn secondary job-crew-off" onclick="removeCrewFromJob('${escJs(job.id)}', '${escJs(c.id)}')">Take Off Job</button>` : ""}
      <button type="button" class="big-btn secondary" onclick="closeModal()">Close</button>`);
  }
  async function removeCrewFromJob(jobId, crewId) {
    const job = findJob(jobId), c = findPerson(crewId);
    if (!job || !canManage()) return;
    job.crewAssigned = (job.crewAssigned || []).filter(id => id !== crewId);
    await saveData();
    closeModal();
    renderCurrentView();
    showToast(nameOf(c) + " taken off job");
  }

  /* Owner only: change a roster person's name, phone or role. For someone with their own login
     the role is changed on the login too, so what they can see and do follows the promotion. */
  const isOwnerHere = () => !document.body.dataset.shopRole && Boolean(data().currentUser && data().currentUser.role === "Owner");
  function openEditCrewModal(crewId) {
    const c = findPerson(crewId);
    if (!c || !isOwnerHere()) return;
    const pick = v => `<option value="${v}"${c.role === v ? " selected" : ""}>${v}</option>`;
    openModal(`
      <div style="${TITLE} margin-bottom: 12px;">Edit Crew Member</div>
      <div class="input-group">
        <label class="input-label" for="crEditName">Name</label>
        <input type="text" id="crEditName" class="text-input" value="${esc(c.name)}">
      </div>
      <div class="input-group">
        <label class="input-label" for="crEditPhone">Phone</label>
        <input type="tel" id="crEditPhone" class="text-input" value="${esc(c.phone || "")}">
      </div>
      <div class="input-group">
        <label class="input-label" for="crEditRole">Role</label>
        ${c.role === "Owner" ? `<input type="text" id="crEditRole" class="text-input" value="Owner" readonly style="background:#EFECE6;">`
          : `<select id="crEditRole" class="text-input">${pick("Crew")}${pick("Lead")}</select>`}
      </div>
      ${c.role !== "Owner" ? `<div class="job-crew-empty">${c.userId
        ? "This person has their own login. Changing the role changes what they can see and do, from their next sync. A Lead sees and manages every job but no money."
        : "This person has no login yet, so the role is a label. Add a login under Settings, then People."}</div>` : ""}
      <p id="crEditNote" class="job-crew-empty" role="status" aria-live="polite" style="color: var(--alert);"></p>
      <button type="button" id="crEditSave" class="big-btn" onclick="saveCrewEdits('${escJs(c.id)}')">Save Changes</button>
      <button type="button" class="big-btn secondary" onclick="closeModal()">Cancel</button>`);
  }
  async function saveCrewEdits(crewId) {
    const c = findPerson(crewId);
    if (!c || !isOwnerHere()) return;
    const el = id => document.getElementById(id);
    const say = msg => { const n = el("crEditNote"); if (n) n.textContent = msg; };
    const name = el("crEditName").value.trim(), phone = el("crEditPhone").value.trim();
    const role = c.role === "Owner" ? "Owner" : (el("crEditRole").value === "Lead" ? "Lead" : "Crew");
    if (!name) return say("Enter a name.");
    if (role !== c.role && c.userId) {
      // Their login is what gives them access, so it has to change first; if it cannot, nothing does.
      const cloud = window.ShopBoardCloudSync, btn = el("crEditSave");
      if (!cloud || !cloud.isOn() || !cloud.setPerson) return say("Turn on Cloud Sync in Settings to change the role of someone with a login.");
      if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
      try { await cloud.setPerson(c.userId, { role: role.toLowerCase() }); }
      catch (e) {
        if (btn) { btn.disabled = false; btn.textContent = "Save Changes"; }
        return say(e && e.code === "offline" ? "No connection right now, so the role was not changed. Try again when you're back online."
          : (e && e.code === "rejected" && e.message) || "The role could not be changed. Try again.");
      }
    }
    // Look the person up again: a sync may have swapped in fresh records while the login was changing.
    const now = findPerson(crewId);
    if (!now) { closeModal(); renderCurrentView(); return; }
    now.name = name; now.phone = phone; now.role = role;
    try { await saveData(); }
    catch (e) {
      const btn = el("crEditSave");
      if (btn) { btn.disabled = false; btn.textContent = "Save Changes"; }
      return say("Could not save on this phone. Tap Save Changes again.");
    }
    closeModal();
    renderCurrentView();
    showToast("Crew member updated");
  }

  window.ShopJobCrew = { sectionHtml, canManage };
  Object.assign(window, { openJobCrewAdd, addCrewToJob, openJobCrewPerson, removeCrewFromJob, openEditCrewModal, saveCrewEdits });
})();
