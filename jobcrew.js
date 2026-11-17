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

  window.ShopJobCrew = { sectionHtml, canManage };
  Object.assign(window, { openJobCrewAdd, addCrewToJob, openJobCrewPerson, removeCrewFromJob });
})();
