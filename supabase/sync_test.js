/* Tests for ../sync.js. Run: node supabase/sync_test.js
   Everything here is mocked: a small in-memory stand-in for the Supabase server that follows the
   same rules as 001_cloud_foundation.sql (roles, add-only inserts, older edits dropped, owner-only
   money). No network, no real account, no password. */
"use strict";
const assert = require("assert");
const Sync = require("../sync.js");

const COMPANY = "11111111-1111-4111-8111-111111111111";
const USERS = { owner: "aaaaaaaa-0000-4000-8000-000000000001", lead: "aaaaaaaa-0000-4000-8000-000000000002", crew: "aaaaaaaa-0000-4000-8000-000000000003" };
const PNG = "data:image/png;base64,AAAA", JPG = "data:image/jpeg;base64,BBBB", PDF = "data:application/pdf;base64,CCCC";

function sampleData() {
  return {
    business: { name: "Field Trade Co.", owner: "Shop Owner", phone: "555-0100", crewSeeMoney: false, nextInvoiceNumber: 1003 },
    currentUser: { name: "Shop Owner", role: "Owner" },
    crewMembers: [{ id: "c1", name: "Shop Owner", phone: "", email: "", role: "Owner" }, { id: "c_k2", name: "Sam", phone: "555", email: "", role: "Crew" }],
    clients: [{ id: "cl_1", name: "Pat Client", phone: "1", email: "p@example.com", address: "1 Main", projectNotes: "gate code" }],
    jobs: [{
      id: "j_1", name: "Deck", trade: "Carpentry", clientId: "cl_1", address: "1 Main", status: "On site", startDate: "2026-11-10",
      crewAssigned: ["c1", "c_k2"],
      notes: [{ id: "n_1", author: "Shop Owner", text: "Job opened on board.", tag: "", timestamp: "Just now", createdAt: "2026-11-01T10:00:00.000Z" }],
      photos: [
        { id: "p_2", url: PNG, tag: "Receipt", caption: "Lumber - $42.10 (e_1)", author: "Sam", timestamp: "Today", createdAt: "2026-11-02T10:00:00.000Z" },
        { id: "p_1", url: JPG, tag: "Before", caption: "Old deck", author: "Sam", timestamp: "Today", createdAt: "2026-11-02T09:00:00.000Z" },
        { id: "p_0", url: "https://example.com/sample.jpg", tag: "", caption: "", author: "Shop Owner", timestamp: "Today", createdAt: "2026-11-01T09:00:00.000Z" }
      ],
      files: [{ id: "f_1", name: "Permit.pdf", dataUrl: PDF, type: "application/pdf", size: "12 KB", author: "Shop Owner", date: "Nov 2" }],
      quotes: [{ items: [{ desc: "Framing", qty: 2, rate: 65 }], status: "Draft" }],
      bills: [{ id: "b_1", desc: "Deposit", amount: 500, status: "Paid", number: 1001, createdAt: "2026-11-03T10:00:00.000Z", dueDate: "2026-11-20", paidAt: "2026-11-05T10:00:00.000Z" }],
      expenses: [{ id: "e_1", desc: "Lumber", amount: 42.1, category: "Materials", day: "2026-11-02", date: "Nov 2", createdAt: "2026-11-02T10:00:00.000Z", photoUrl: PNG, author: "Sam" }],
      moneyBilled: 900
    }]
  };
}

/* ---- stand-in server ---- */
function fakeServer() {
  const db = { sb_members: [], sb_companies: [{ id: COMPANY, name: "Field Trade Co.", phone: "", logo: "", seat_limit: 2, next_invoice_number: 1001, edited_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }] };
  Sync.TABLES.forEach(t => (db[t] = []));
  const tokens = {}, log = [], files = {}, logins = {};
  let clock = Date.parse("2026-11-14T12:00:00.000Z"), down = false, refreshCount = 0, phones = 0;
  const tick = () => new Date((clock += 1000)).toISOString();
  const roleOf = uid => { const m = db.sb_members.find(x => x.user_id === uid && x.status === "active"); return m ? m.role : null; };
  const seesJob = (uid, jobId) => {
    const role = roleOf(uid);
    if (role === "owner" || role === "lead") return true;
    if (role !== "crew") return false;
    return db.sb_job_assignments.some(a => a.job_id === jobId && !a.deleted_at && db.sb_crew.some(c => c.id === a.crew_id && c.user_id === uid && !c.deleted_at));
  };
  const jobKey = (t, r) => (t === "sb_jobs" || t === "sb_job_money" ? r.id : r.job_id);
  const canSelect = (uid, t, r) => {
    const role = roleOf(uid);
    if (!role) return false;
    if (t === "sb_crew") return true;
    if (t === "sb_clients") return role !== "crew" || db.sb_jobs.some(j => j.client_id === r.id && seesJob(uid, j.id));
    if (t === "sb_bills" || t === "sb_job_money") return role === "owner";
    if (t === "sb_expenses") return role === "owner" || (r.author_id === uid && seesJob(uid, r.job_id));
    return seesJob(uid, jobKey(t, r));
  };
  const canInsert = (uid, t, r) => {
    const role = roleOf(uid);
    if (t === "sb_crew" || t === "sb_bills" || t === "sb_job_money") return role === "owner";
    if (t === "sb_notes" || t === "sb_photos" || t === "sb_expenses") return seesJob(uid, r.job_id);
    return role === "owner" || role === "lead";
  };
  const canUpdate = (uid, t) => {
    const role = roleOf(uid);
    if (t === "sb_crew" || t === "sb_bills" || t === "sb_job_money" || t === "sb_expenses") return role === "owner";
    return role === "owner" || role === "lead";
  };
  const reply = (status, data) => ({ ok: status >= 200 && status < 300, status, text: async () => (data === undefined ? "" : JSON.stringify(data)) });
  const denied = () => reply(403, { code: "42501", message: "new row violates row-level security policy" });

  async function fetch(url, init) {
    if (down) throw new TypeError("network down");
    const u = new URL(url), method = init.method || "GET", body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    const uid = tokens[(init.headers.Authorization || "").replace("Bearer ", "")] || null;
    log.push({ method, path: u.pathname, query: u.search, prefer: init.headers.Prefer || "", body, uid });
    if (u.pathname === "/auth/v1/token") {
      if (u.searchParams.get("grant_type") === "password") { // only made-up test logins exist here
        const who = logins[body.email];
        if (!who || body.password !== "made-up-test-password") return reply(400, { error_code: "invalid_credentials" });
        const n = ++refreshCount; tokens["access-" + n] = who; tokens["refresh:r-" + n] = who;
        return reply(200, { access_token: "access-" + n, refresh_token: "r-" + n, expires_in: 3600 });
      }
      const uidFor = tokens["refresh:" + body.refresh_token];
      if (!uidFor) return reply(400, { error_code: "refresh_token_not_found" });
      delete tokens["refresh:" + body.refresh_token];
      const n = ++refreshCount; tokens["access-" + n] = uidFor; tokens["refresh:r-" + n] = uidFor;
      return reply(200, { access_token: "access-" + n, refresh_token: "r-" + n, expires_in: 3600 });
    }
    if (!uid) return reply(401, { code: "42501" });
    if (u.pathname.startsWith("/storage/v1/object/")) {
      const read = u.pathname.includes("/authenticated/");
      const name = decodeURIComponent(u.pathname.replace("/storage/v1/object/", "").replace("authenticated/", "").replace("shop-board/", ""));
      const parts = name.split("/"), role = roleOf(uid);
      const allowed = parts.length === 4 && parts[0] === COMPANY && ["photos", "receipts", "files"].includes(parts[2]) && role && seesJob(uid, parts[1]);
      if (read) {
        const f = files[name];
        if (!f || !allowed || (parts[2] === "receipts" && role !== "owner" && f.owner !== uid)) return reply(400, { statusCode: "404", error: "not_found" });
        return { ok: true, status: 200, arrayBuffer: async () => f.bytes.buffer.slice(f.bytes.byteOffset, f.bytes.byteOffset + f.bytes.byteLength), headers: { get: () => f.mime } };
      }
      if (!allowed || !(parts[2] !== "files" || role !== "crew")) return reply(400, { statusCode: "403", error: "Unauthorized" });
      if (files[name]) return reply(400, { statusCode: "409", error: "Duplicate" });
      if (!(init.body instanceof Uint8Array)) return reply(400, { error: "body must be bytes" });
      files[name] = { bytes: init.body, mime: init.headers["Content-Type"], owner: uid };
      return reply(200, { Key: "shop-board/" + name });
    }
    if (u.pathname === "/auth/v1/logout") return reply(204);
    if (u.pathname === "/auth/v1/user") return reply(200, { id: uid, email: "person@example.com" });
    if (u.pathname === "/rest/v1/rpc/sb_create_company") {
      if (uid !== USERS.owner) return reply(400, { code: "P0001", message: "Creating a company is not open yet." });
      db.sb_companies[0].name = body.p_name; db.sb_members.push({ company_id: COMPANY, user_id: uid, role: "owner", status: "active" });
      return reply(200, COMPANY);
    }
    const table = u.pathname.replace("/rest/v1/", "");
    if (!db[table]) return reply(404, { code: "PGRST205" });
    const q = u.searchParams;
    if (method === "GET") {
      let rows = db[table];
      if (table === "sb_members") rows = roleOf(uid) ? rows.filter(r => (!q.get("user_id") || "eq." + r.user_id === q.get("user_id")) &&
        (!q.get("status") || "eq." + r.status === q.get("status")) && (!q.get("role") || "neq." + r.role !== q.get("role"))) : [];
      else if (table === "sb_companies") rows = roleOf(uid) ? rows : [];
      else rows = rows.filter(r => canSelect(uid, table, r));
      const since = q.get("updated_at");
      if (since) rows = rows.filter(r => Date.parse(r.updated_at) >= Date.parse(since.replace("gte.", "")));
      rows = rows.slice().sort((a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at));
      const from = Number(q.get("offset") || 0);
      return reply(200, rows.slice(from, from + Number(q.get("limit") || 1000)));
    }
    if (table === "sb_members" && method !== "GET") { // owner only, seat limit, a company keeps an owner
      if (roleOf(uid) !== "owner") return method === "POST" ? denied() : reply(200, []);
      const seatsFull = (id, row) => row.status === "active" && row.role !== "owner" &&
        db.sb_members.filter(m => m.status === "active" && m.role !== "owner" && m.user_id !== id).length >= db.sb_companies[0].seat_limit;
      const full = () => reply(400, { code: "P0001", message: "This company has used all 2 of its crew seats." });
      if (method === "POST") {
        const r = body[0], old = db.sb_members.find(m => m.user_id === r.user_id);
        if (!Object.values(USERS).concat(Object.values(logins)).includes(r.user_id)) return reply(409, { code: "23503", message: "violates foreign key constraint: Key is not present in table \"users\"" });
        if (seatsFull(r.user_id, r)) return full();
        if (old) Object.assign(old, r); else db.sb_members.push(Object.assign({ created_at: tick() }, r));
        return reply(201, [{ user_id: r.user_id }]);
      }
      const row = db.sb_members.find(m => "eq." + m.user_id === q.get("user_id"));
      if (!row) return reply(200, []);
      const next = Object.assign({}, row, body);
      if (seatsFull(row.user_id, next)) return full();
      if (row.role === "owner" && (next.role !== "owner" || next.status !== "active")) return reply(400, { code: "P0001", message: "A company must keep at least one owner." });
      Object.assign(row, body);
      return reply(200, [{ user_id: row.user_id, role: row.role, status: row.status }]);
    }
    if (method === "PATCH" && table === "sb_crew" && ("user_id" in body || "role" in body)) { // matching a crew name to a login
      if (roleOf(uid) !== "owner") return reply(200, []);
      const eq = k => (q.get(k) || "").startsWith("eq.") ? q.get(k).slice(3) : null, not = (q.get("id") || "").startsWith("neq.") ? q.get("id").slice(4) : null;
      const out = [];
      db.sb_crew.forEach(r => {
        if (eq("id") !== null && r.id !== eq("id")) return;
        if (eq("user_id") !== null && r.user_id !== eq("user_id")) return;
        if (not !== null && r.id === not) return;
        Object.assign(r, body, { updated_at: tick() }); out.push({ id: r.id });
      });
      return reply(200, out);
    }
    if (method === "PATCH" && table === "sb_companies") {
      if (roleOf(uid) !== "owner") return reply(200, []);
      const row = db.sb_companies[0];
      if (Date.parse(body.edited_at) < Date.parse(row.edited_at)) return reply(200, []);
      Object.assign(row, body, { updated_at: tick() });
      return reply(200, [{ id: row.id }]);
    }
    if (method === "PATCH") {
      const ids = (q.get("id") || "").replace(/^in\.\(|\)$/g, "").split(",").map(x => x.replace(/"/g, ""));
      if (!canUpdate(uid, table)) return reply(200, []);
      const out = [];
      db[table].filter(r => ids.includes(r.id)).forEach(r => { if (Date.parse(body.edited_at) < Date.parse(r.edited_at)) return; Object.assign(r, body, { updated_at: tick() }); out.push({ id: r.id }); });
      return reply(200, out);
    }
    if (method === "POST") {
      const merge = init.headers.Prefer.includes("resolution=merge-duplicates"), ignore = init.headers.Prefer.includes("resolution=ignore-duplicates");
      const keys = JSON.stringify(Object.keys(body[0]).sort());
      if (!body.every(r => JSON.stringify(Object.keys(r).sort()) === keys)) return reply(400, { code: "PGRST102", message: "All object keys must match" });
      const out = [];
      for (const r of body) {
        if (!/^[A-Za-z0-9_:.-]{1,200}$/.test(r.id) || r.company_id !== COMPANY) return reply(400, { code: "23514" });
        if (typeof r.url === "string" && r.url.startsWith("data:")) return reply(400, { code: "TEST", message: "embedded image sent as a row" });
        if (!canInsert(uid, table, r)) return denied();
        const old = db[table].find(x => x.id === r.id);
        if (!old) { const row = Object.assign({}, r, { created_by: uid, updated_at: tick() }); if ("author_name" in r) row.author_id = uid; db[table].push(row); out.push({ id: r.id }); continue; }
        if (ignore) continue;
        if (!merge) return reply(409, { code: "23505" });
        if (!canUpdate(uid, table)) return denied();
        if (Date.parse(r.edited_at) < Date.parse(old.edited_at)) continue; // older edit: dropped silently
        Object.assign(old, r, { updated_at: tick() }); out.push({ id: r.id });
      }
      return reply(201, out);
    }
    return reply(405, {});
  }
  function signedIn(role) {
    const mem = {};
    const storage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, mem };
    if (role) { const t = "start-" + role + "-" + (++phones); mem.shopBoardCloudRefreshToken = t; tokens["refresh:" + t] = USERS[role]; }
    return storage;
  }
  return { db, log, tokens, files, logins, fetch, signedIn, addMember: (role, status) => db.sb_members.push({ company_id: COMPANY, user_id: USERS[role], role, status: status || "active" }), setDown: v => { down = v; } };
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const rejects = async (p, code) => { try { await p; } catch (e) { assert.strictEqual(e.code, code, e.message); return e; } assert.fail("expected " + code); };

test("mapping: app data becomes table rows", () => {
  const { rows, company, uploads, skipped } = Sync.toRows(sampleData(), COMPANY, { editedAt: "2026-11-14T10:00:00.000Z" });
  assert.deepStrictEqual(Object.fromEntries(Object.entries(rows).map(([t, r]) => [t, r.length])),
    { sb_crew: 2, sb_clients: 1, sb_jobs: 1, sb_job_assignments: 2, sb_notes: 1, sb_photos: 2, sb_files: 1, sb_expenses: 1, sb_bills: 1, sb_job_money: 1 });
  assert.deepStrictEqual(rows.sb_jobs[0], { id: "j_1", name: "Deck", trade: "Carpentry", client_id: "cl_1", address: "1 Main", status: "On site", start_date: "2026-11-10",
    company_id: COMPANY, edited_at: "2026-11-14T10:00:00.000Z", deleted_at: null });
  assert.ok(!("money_billed" in rows.sb_jobs[0]) && !("quotes" in rows.sb_jobs[0]), "no money on the job row");
  assert.strictEqual(rows.sb_job_assignments[1].id, "j_1:c_k2");
  assert.deepStrictEqual([rows.sb_notes[0].body, rows.sb_notes[0].noted_at, rows.sb_notes[0].legacy_when], ["Job opened on board.", "2026-11-01T10:00:00.000Z", "Just now"]);
  assert.deepStrictEqual([rows.sb_job_money[0].money_billed, rows.sb_job_money[0].money_collected, rows.sb_job_money[0].quote_items[0].rate], [900, null, 65]);
  assert.deepStrictEqual([rows.sb_bills[0].number, rows.sb_bills[0].paid_at, rows.sb_bills[0].due_date], [1001, "2026-11-05T10:00:00.000Z", "2026-11-20"]);
  assert.deepStrictEqual([company.name, company.next_invoice_number], ["Field Trade Co.", 1003]);
  // Receipt photo copy stays out of job photos; the receipt keeps its own image.
  assert.deepStrictEqual(skipped, [{ table: "sb_photos", id: "p_2", why: "receipt photo copy" }]);
  assert.ok(!rows.sb_photos.some(p => /\$/.test(p.caption)));
  // Embedded images never travel in a row; they are queued for storage under the agreed paths.
  assert.ok(!JSON.stringify(rows).includes("base64"));
  assert.deepStrictEqual(uploads.map(u => u.path).sort(), [COMPANY + "/j_1/files/f_1.pdf", COMPANY + "/j_1/photos/p_1.jpg", COMPANY + "/j_1/receipts/e_1.png"]);
  assert.strictEqual(rows.sb_photos.find(p => p.id === "p_0").url, "https://example.com/sample.jpg");
  Object.values(rows).forEach(list => list.forEach(r => assert.deepStrictEqual(Object.keys(r).sort(), Object.keys(list[0]).sort())));
});

test("mapping: bad ids are left out, not sent", () => {
  const data = sampleData(); data.clients.push({ id: "has space", name: "x" });
  const { rows, skipped } = Sync.toRows(data, COMPANY);
  assert.strictEqual(rows.sb_clients.length, 1);
  assert.ok(skipped.some(s => s.why === "bad id"));
});

test("session: owner, lead, crew, no company, removed, signed out", async () => {
  for (const role of ["owner", "lead", "crew"]) {
    const srv = fakeServer(); srv.addMember(role);
    const storage = srv.signedIn(role);
    const s = await Sync.createSync({ fetch: srv.fetch, storage }).session();
    assert.deepStrictEqual([s.role, s.companyId, s.userId], [role, COMPANY, USERS[role]]);
    assert.strictEqual(storage.mem.shopBoardCloudRefreshToken, "r-1", "replacement sign-in saved for cloud.js");
    assert.ok(!JSON.stringify(srv.log).includes("password"));
  }
  const srv = fakeServer();
  const none = Sync.createSync({ fetch: srv.fetch, storage: srv.signedIn("owner") });
  assert.strictEqual((await none.session()).companyId, null);
  await rejects(none.pull(), "no_company");
  await rejects(Sync.createSync({ fetch: srv.fetch, storage: srv.signedIn(null) }).session(), "signed_out");
  const gone = fakeServer(); gone.addMember("crew", "removed");
  const storage = gone.signedIn("crew"); storage.mem["shopBoardSyncCursor:user"] = USERS.crew;
  await rejects(Sync.createSync({ fetch: gone.fetch, storage }).push({ rows: { sb_notes: [] } }), "removed");
});

async function seeded() {
  const srv = fakeServer(); ["owner", "lead", "crew"].forEach(r => srv.addMember(r));
  const owner = Sync.createSync({ fetch: srv.fetch, storage: srv.signedIn("owner") });
  const report = await owner.push(Sync.toRows(sampleData(), COMPANY, { editedAt: "2026-11-14T10:00:00.000Z" }));
  srv.db.sb_crew.find(c => c.id === "c_k2").user_id = USERS.crew; // Sam has a login
  return { srv, owner, report };
}

test("owner: push everything, pull it back in the app's shape", async () => {
  const { srv, owner, report } = await seeded();
  assert.strictEqual(report.saved.length, 14); // 13 rows + the company
  assert.deepStrictEqual([report.serverWins, report.notAllowed, report.waitingForUpload, report.needsPull], [[], [], [], false]);
  assert.ok(srv.log.filter(c => c.method === "POST" && c.path.startsWith("/rest")).every(c => c.prefer.includes("merge-duplicates") && c.query.includes("on_conflict=company_id%2Cid") || c.query.includes("on_conflict=company_id,id")));
  const pulled = await owner.pull({ since: null });
  const local = Sync.mergeIntoLocal({ business: {}, crewMembers: [], clients: [], jobs: [] }, pulled);
  const want = sampleData().jobs[0], got = local.jobs[0];
  ["id", "name", "trade", "clientId", "address", "status", "startDate", "moneyBilled"].forEach(k => assert.strictEqual(got[k], want[k], k));
  assert.ok(!("moneyCollected" in got));
  assert.deepStrictEqual(got.crewAssigned, ["c1", "c_k2"]);
  assert.deepStrictEqual(got.quotes, want.quotes);
  assert.deepStrictEqual([got.notes[0].text, got.notes[0].author, got.notes[0].createdAt], ["Job opened on board.", "Shop Owner", "2026-11-01T10:00:00.000Z"]);
  assert.deepStrictEqual([got.bills[0].desc, got.bills[0].amount, got.bills[0].number, got.bills[0].paidAt, got.bills[0].dueDate], ["Deposit", 500, 1001, "2026-11-05T10:00:00.000Z", "2026-11-20"]);
  assert.deepStrictEqual([got.expenses[0].desc, got.expenses[0].amount, got.expenses[0].day, got.expenses[0].storagePath], ["Lumber", 42.1, "2026-11-02", COMPANY + "/j_1/receipts/e_1.png"]);
  assert.deepStrictEqual(got.photos.map(p => p.id).sort(), ["p_0", "p_1"]);
  assert.deepStrictEqual([got.files[0].name, got.files[0].type, got.files[0].size], ["Permit.pdf", "application/pdf", "12 KB"]);
  assert.deepStrictEqual([local.clients[0].projectNotes, local.crewMembers.length, local.business.name, local.business.nextInvoiceNumber], ["gate code", 2, "Field Trade Co.", 1003]);
  // Merging into data that still holds the images keeps them.
  const kept = Sync.mergeIntoLocal(sampleData(), pulled).jobs[0];
  assert.deepStrictEqual([kept.photos.find(p => p.id === "p_1").url, kept.expenses[0].photoUrl, kept.files[0].dataUrl], [JPG, PNG, PDF]);
});

test("pull: only what changed since last sync, trashed rows included", async () => {
  const { srv, owner } = await seeded();
  const first = await owner.pull();
  let local = Sync.mergeIntoLocal({}, first);
  await owner.saveCursor(first.cursor);
  srv.db.sb_notes[0].deleted_at = "2026-11-14T13:00:00.000Z"; srv.db.sb_notes[0].updated_at = "2026-11-14T13:00:00.000Z";
  srv.db.sb_job_assignments[1].deleted_at = "2026-11-14T13:00:01.000Z"; srv.db.sb_job_assignments[1].updated_at = "2026-11-14T13:00:01.000Z";
  const second = await owner.pull();
  assert.strictEqual(second.since, first.cursor);
  assert.strictEqual(second.rows.sb_notes.length, 1);
  assert.strictEqual(second.rows.sb_clients.length, 0);
  assert.ok(second.rows.sb_notes[0].deleted_at);
  local = Sync.mergeIntoLocal(local, second);
  assert.deepStrictEqual([local.jobs[0].notes.length, local.jobs[0].crewAssigned], [0, ["c1"]]);
  // a trashed job disappears with everything under it
  const job = srv.db.sb_jobs[0]; job.deleted_at = job.updated_at = "2026-11-14T14:00:00.000Z";
  assert.strictEqual(Sync.mergeIntoLocal(local, await owner.pull()).jobs.length, 0);
});

test("latest change wins: an older edit is dropped and the server copy comes back", async () => {
  const { srv, owner } = await seeded();
  srv.db.sb_jobs[0].name = "Deck (renamed on another phone)"; srv.db.sb_jobs[0].edited_at = "2026-11-14T11:00:00.000Z";
  const stale = sampleData(); stale.jobs[0].name = "Deck stale"; stale.jobs[0].editedAt = "2026-11-14T10:30:00.000Z";
  const change = { rows: { sb_jobs: Sync.toRows(stale, COMPANY).rows.sb_jobs } };
  const { report, pulled } = await owner.pushThenPull(change, { since: null });
  assert.deepStrictEqual([report.serverWins, report.needsPull, report.saved], [[{ table: "sb_jobs", id: "j_1" }], true, []]);
  assert.strictEqual(Sync.mergeIntoLocal(stale, pulled).jobs[0].name, "Deck (renamed on another phone)");
  const fresh = sampleData(); fresh.jobs[0].name = "Deck newest"; fresh.jobs[0].editedAt = "2026-11-14T11:30:00.000Z";
  const again = await owner.push({ rows: { sb_jobs: Sync.toRows(fresh, COMPANY).rows.sb_jobs } });
  assert.deepStrictEqual([again.saved.length, again.needsPull, srv.db.sb_jobs[0].name], [1, false, "Deck newest"]);
});

test("lead: sees jobs, never money; receipts are add-only", async () => {
  const { srv } = await seeded();
  const lead = Sync.createSync({ fetch: srv.fetch, storage: srv.signedIn("lead") });
  const before = srv.log.length;
  const pulled = await lead.pull({ since: null });
  assert.deepStrictEqual([pulled.role, pulled.rows.sb_bills, pulled.rows.sb_job_money, pulled.rows.sb_expenses], ["lead", [], [], []]);
  assert.ok(!srv.log.slice(before).some(c => /sb_bills|sb_job_money/.test(c.path)), "lead never asks for money tables");
  const job = Sync.mergeIntoLocal({}, pulled).jobs[0];
  assert.deepStrictEqual([job.bills, job.quotes, job.expenses, "moneyBilled" in job], [[], [{ items: [], status: "Draft" }], [], false]);
  const data = sampleData(); data.jobs[0].name = "Deck v2"; data.jobs[0].editedAt = "2026-11-14T12:30:00.000Z";
  data.jobs[0].expenses = [{ id: "e_lead", desc: "Screws", amount: 9.5, category: "Materials", day: "2026-11-14", author: "Lee" }];
  const mark = srv.log.length;
  const report = await lead.push(Sync.toRows(data, COMPANY, { editedAt: "2026-11-14T12:30:00.000Z" }));
  assert.ok(report.saved.some(x => x.table === "sb_jobs") && report.saved.some(x => x.id === "e_lead"));
  assert.deepStrictEqual([...new Set(report.notAllowed.map(x => x.table))].sort(), ["sb_bills", "sb_companies", "sb_crew", "sb_job_money"]);
  const posts = srv.log.slice(mark).filter(c => c.method === "POST" && c.path.startsWith("/rest"));
  assert.ok(posts.find(c => c.path.endsWith("sb_expenses")).prefer.includes("ignore-duplicates"));
  assert.ok(posts.find(c => c.path.endsWith("sb_jobs")).prefer.includes("merge-duplicates"));
  assert.ok(!posts.some(c => /sb_bills|sb_job_money|sb_crew$/.test(c.path)));
  assert.deepStrictEqual((await lead.pull({ since: null })).rows.sb_expenses.map(e => e.id), ["e_lead"], "a lead sees only receipts they logged");
});

test("crew: assigned jobs only, adds notes/photos/receipts, nothing else", async () => {
  const { srv } = await seeded();
  srv.db.sb_jobs.push({ company_id: COMPANY, id: "j_other", name: "Not Sam's", trade: "", client_id: "", address: "", status: "Lead", start_date: "", edited_at: "2026-11-14T10:00:00.000Z", updated_at: "2026-11-14T12:00:00.000Z", deleted_at: null });
  const crew = Sync.createSync({ fetch: srv.fetch, storage: srv.signedIn("crew") });
  const pulled = await crew.pull({ since: null });
  assert.deepStrictEqual([pulled.rows.sb_jobs.map(j => j.id), pulled.rows.sb_bills, pulled.rows.sb_job_money], [["j_1"], [], []]);
  const data = Sync.mergeIntoLocal({}, pulled);
  data.jobs[0].name = "Crew tried to rename";
  data.jobs[0].notes.push({ id: "n_crew", author: "Sam", text: "Posts set", tag: "", timestamp: "Today", createdAt: "2026-11-14T12:40:00.000Z" });
  data.jobs[0].expenses.unshift({ id: "e_crew", desc: "Gas", amount: 30, category: "Fuel", day: "2026-11-14", author: "Sam" });
  const mark = srv.log.length;
  const report = await crew.push(Sync.toRows(data, COMPANY));
  assert.deepStrictEqual(report.saved.map(x => x.id).sort(), ["e_crew", "n_crew"]);
  assert.ok(report.alreadyThere.some(x => x.id === "n_1"), "rows already on the server are not an error");
  assert.ok(report.notAllowed.some(x => x.table === "sb_jobs"));
  assert.strictEqual(srv.db.sb_jobs[0].name, "Deck");
  const posts = srv.log.slice(mark).filter(c => c.method === "POST" && c.path.startsWith("/rest"));
  assert.ok(posts.length && posts.every(c => c.prefer.includes("ignore-duplicates")), "crew never upserts");
  assert.strictEqual(srv.db.sb_notes.find(n => n.id === "n_crew").author_id, USERS.crew);
  // and the stand-in server really does refuse an upsert from crew, as the live rules do
  const token = srv.log[srv.log.length - 1].uid === USERS.crew && Object.entries(srv.tokens).find(([k, v]) => k.startsWith("access-") && v === USERS.crew)[0];
  const r = await srv.fetch("https://x/rest/v1/sb_notes?on_conflict=company_id,id", { method: "POST", headers: { Authorization: "Bearer " + token, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify([{ id: "n_1", company_id: COMPANY, job_id: "j_1", edited_at: "2026-11-14T13:00:00.000Z" }]) });
  assert.strictEqual(r.status, 403);
});

test("files: held back until an uploader exists; uploaded before the row is sent", async () => {
  const srv = fakeServer(); srv.addMember("owner");
  const noUploader = Sync.createSync({ fetch: srv.fetch, storage: srv.signedIn("owner"), uploadFile: false });
  const changes = Sync.toRows(sampleData(), COMPANY);
  const report = await noUploader.push(changes);
  assert.deepStrictEqual(report.waitingForUpload.map(x => x.id).sort(), ["e_1", "f_1", "p_1"]);
  assert.deepStrictEqual([srv.db.sb_photos.map(p => p.id), srv.db.sb_files.length, srv.db.sb_expenses.length], [["p_0"], 0, 0]);
  const order = [];
  const withUploader = Sync.createSync({ fetch: async (u, i) => { if (i.method === "POST" && /sb_photos/.test(u)) order.push("row"); return srv.fetch(u, i); },
    storage: srv.signedIn("owner"), uploadFile: async f => { order.push("upload " + f.bucket + " " + f.path); } });
  await withUploader.push({ rows: { sb_photos: changes.rows.sb_photos }, uploads: changes.uploads });
  assert.deepStrictEqual(order, ["upload shop-board " + COMPANY + "/j_1/photos/p_1.jpg", "row"]);
});

test("storage: files go up before rows, come back intact, and follow the role rules", async () => {
  const { srv, owner, report } = await seeded();
  assert.deepStrictEqual(report.uploaded.map(x => x.path).sort(), [COMPANY + "/j_1/files/f_1.pdf", COMPANY + "/j_1/photos/p_1.jpg", COMPANY + "/j_1/receipts/e_1.png"]);
  assert.deepStrictEqual([srv.files[COMPANY + "/j_1/photos/p_1.jpg"].mime, srv.files[COMPANY + "/j_1/files/f_1.pdf"].mime], ["image/jpeg", "application/pdf"]);
  const firstRow = srv.log.findIndex(c => c.method === "POST" && c.path.endsWith("sb_photos")), firstFile = srv.log.findIndex(c => c.path.includes("/photos/p_1.jpg"));
  assert.ok(firstFile >= 0 && firstFile < firstRow, "file before row");
  assert.strictEqual(await owner.downloadFile(COMPANY + "/j_1/photos/p_1.jpg"), JPG);
  assert.strictEqual(await owner.downloadFile(COMPANY + "/j_1/files/f_1.pdf"), PDF);
  // pushing the same data again: files already there are not an error
  const again = await owner.push(Sync.toRows(sampleData(), COMPANY, { editedAt: "2026-11-14T10:00:00.000Z" }));
  assert.deepStrictEqual([again.uploaded.length, again.serverWins.length], [3, 0]);
  // crew: can add a photo and a receipt image, sees job photos, not the owner's receipt image
  const crew = Sync.createSync({ fetch: srv.fetch, storage: srv.signedIn("crew") });
  const data = Sync.mergeIntoLocal({}, await crew.pull({ since: null }));
  data.jobs[0].photos.unshift({ id: "p_crew", url: PNG, tag: "Progress", caption: "", author: "Sam", createdAt: "2026-11-14T12:50:00.000Z" });
  data.jobs[0].expenses.unshift({ id: "e_crew", desc: "Gas", amount: 30, category: "Fuel", day: "2026-11-14", photoUrl: JPG, author: "Sam" });
  const r = await crew.push(Sync.toRows(data, COMPANY));
  assert.deepStrictEqual(r.saved.map(x => x.id).sort(), ["e_crew", "p_crew"]);
  assert.strictEqual(await crew.downloadFile(COMPANY + "/j_1/photos/p_1.jpg"), JPG);
  assert.strictEqual(await crew.downloadFile(COMPANY + "/j_1/receipts/e_crew.jpg"), JPG);
  await rejects(crew.downloadFile(COMPANY + "/j_1/receipts/e_1.png"), "rejected");
  assert.strictEqual(await owner.downloadFile(COMPANY + "/j_1/receipts/e_crew.jpg"), JPG);
  // a failed upload stops the push before the row goes up
  const lead = Sync.createSync({ fetch: async (u, i) => (/\/storage\//.test(u) ? { ok: false, status: 500, text: async () => "{}" } : srv.fetch(u, i)), storage: srv.signedIn("lead") });
  const d2 = sampleData(); d2.jobs[0].photos = [{ id: "p_fail", url: PNG, tag: "", caption: "", author: "Lee" }];
  const e = await rejects(lead.push({ rows: { sb_photos: Sync.toRows(d2, COMPANY).rows.sb_photos }, uploads: Sync.toRows(d2, COMPANY).uploads }), "offline");
  assert.ok(e.report && !srv.db.sb_photos.some(p => p.id === "p_fail"));
});

test("offline or refused: clear errors, nothing half-reported", async () => {
  const { srv, owner } = await seeded();
  srv.setDown(true);
  const e = await rejects(owner.pull(), "offline");
  assert.strictEqual(e.network, true);
  srv.setDown(false);
  const bad = await rejects(owner.push({ rows: { sb_notes: [{ id: "n_x", job_id: "j_1", url: "data:oops" }] } }), "rejected");
  assert.ok(bad.report);
});

test("trash: owner trashes, crew cannot, an older trash request is ignored", async () => {
  const { srv, owner } = await seeded();
  const r = await owner.push({ trashed: [{ table: "sb_notes", id: "n_1", editedAt: "2026-11-14T11:00:00.000Z" }, { table: "sb_photos", id: "p_1", editedAt: "2026-11-01T00:00:00.000Z" }] });
  assert.deepStrictEqual([r.saved, r.serverWins], [[{ table: "sb_notes", id: "n_1" }], [{ table: "sb_photos", id: "p_1" }]]);
  assert.ok(srv.db.sb_notes[0].deleted_at && !srv.db.sb_photos.find(p => p.id === "p_1").deleted_at);
  const crew = Sync.createSync({ fetch: srv.fetch, storage: srv.signedIn("crew") });
  const c = await crew.push({ trashed: [{ table: "sb_photos", id: "p_1", editedAt: "2026-11-15T00:00:00.000Z" }] });
  assert.deepStrictEqual(c.notAllowed, [{ table: "sb_photos", id: "p_1" }]);
});

if (require.main !== module) { module.exports = { fakeServer, sampleData, COMPANY, USERS, PNG, JPG, PDF }; return; }
(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log("ok   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e.stack || e.message).split("\n").slice(0, 4).join("\n     ")); }
  }
  console.log(failed ? failed + " of " + tests.length + " failed" : "all " + tests.length + " passed");
  process.exit(failed ? 1 : 0);
})();
