/* Tests for ../syncwire.js. Run: node supabase/syncwire_test.js
   Mocked: two or three pretend phones talking to the in-memory stand-in server from sync_test.js. */
"use strict";
const assert = require("assert");
const Sync = require("../sync.js");
const Wire = require("../syncwire.js");
const { fakeServer, sampleData, COMPANY, PNG, JPG, PDF } = require("./sync_test.js");

let clockMs = Date.parse("2026-11-15T08:00:00.000Z");
const now = () => new Date((clockMs += 60000)).toISOString();
const empty = () => ({ business: { name: "Field Trade Co.", owner: "Shop Owner", phone: "", crewSeeMoney: false }, currentUser: { name: "Shop Owner", role: "Owner" },
  crewMembers: [], clients: [], jobs: [] });

function phone(srv, role, data, on) {
  const kv = srv.signedIn(role); kv.removeItem = k => { delete kv.mem[k]; };
  Object.defineProperty(kv, "length", { get: () => Object.keys(kv.mem).length }); kv.key = i => Object.keys(kv.mem)[i];
  if (on !== false) kv.mem[Wire.ON_KEY] = "1";
  const p = { data, applied: 0, saved: null, kv };
  p.engine = Wire.createEngine({ sync: Sync.createSync({ fetch: (u, i) => srv.fetch(u, i), storage: kv }), kv, now,
    store: { load: async () => p.saved && JSON.parse(p.saved), save: async s => { p.saved = JSON.stringify(s); } },
    getData: () => p.data, applyData: async m => { p.data = m; p.applied++; } });
  p.save = async () => { await p.engine.noteSave(); };   // what the app's save does
  p.sync = async () => { const s = await p.engine.run(); assert.strictEqual(s.error, null, s.error); return s; };
  return p;
}
const writes = srv => srv.log.filter(c => c.method !== "GET" && !c.path.startsWith("/auth")).length;
// The app's backup check, in short: the shape saved records must keep.
function checkShape(data) {
  assert.ok(!/"editedAt"|"updatedAt"|"moneyEditedAt"/.test(JSON.stringify(data)), "no sync fields inside records");
  data.jobs.forEach(j => {
    ["photos", "files", "notes", "bills", "expenses", "quotes", "crewAssigned"].forEach(k => assert.ok(Array.isArray(j[k]), k));
    j.photos.forEach(p => { assert.ok(/^https?:|^data:image\//.test(p.url), "photo has a picture"); assert.strictEqual(typeof p.author, "string"); assert.strictEqual(typeof p.timestamp, "string"); });
    j.notes.forEach(n => ["text", "author", "timestamp", "tag"].forEach(k => assert.strictEqual(typeof n[k], "string")));
    j.files.forEach(f => ["name", "author", "date"].forEach(k => assert.strictEqual(typeof f[k], "string")));
  });
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test("switch off: nothing is tracked and nothing is sent", async () => {
  const srv = fakeServer(); srv.addMember("owner");
  const a = phone(srv, "owner", sampleData(), false);
  await a.save(); const s = await a.engine.run();
  assert.deepStrictEqual([srv.log.length, a.saved, s.on], [0, null, false]);
});

test("two phones: first sync sends everything, the second phone receives it, pictures included", async () => {
  const srv = fakeServer(); srv.addMember("owner");
  const a = phone(srv, "owner", sampleData()), b = phone(srv, "owner", empty());
  const before = JSON.stringify(a.data);
  await a.sync();
  assert.deepStrictEqual([srv.db.sb_jobs.length, srv.db.sb_photos.length, srv.db.sb_bills.length, Object.keys(srv.files).length], [1, 2, 1, 3]);
  await b.sync();
  const j = b.data.jobs[0], want = sampleData().jobs[0];
  assert.deepStrictEqual([j.name, j.crewAssigned, j.quotes, j.moneyBilled, j.bills[0].amount, j.notes[0].text], [want.name, want.crewAssigned, want.quotes, 900, 500, want.notes[0].text]);
  assert.deepStrictEqual([j.photos.find(p => p.id === "p_1").url, j.files[0].dataUrl, j.expenses[0].photoUrl], [JPG, PDF, PNG]);
  assert.ok(!j.photos.some(p => p.tag === "Receipt"), "receipt copy never reaches another phone");
  checkShape(b.data); checkShape(a.data);
  // the sending phone keeps its own records as they were (it only learns where its files live)
  const strip = d => JSON.stringify(d).replace(/,"storagePath":"[^"]*"/g, "");
  assert.strictEqual(strip(a.data), before);
  // and a quiet round changes nothing anywhere
  const w = writes(srv), [aa, ba] = [a.applied, b.applied];
  await a.sync(); await b.sync(); await a.sync();
  assert.deepStrictEqual([writes(srv), a.applied <= aa + 1, b.applied], [w, true, ba]);
  const settled = a.applied; await a.sync(); await b.sync();
  assert.deepStrictEqual([a.applied, b.applied, writes(srv)], [settled, ba, w]);
});

test("older records with missing fields come through a sync round untouched", async () => {
  const srv = fakeServer(); srv.addMember("owner");
  const data = empty();
  data.crewMembers.push({ id: "c1", name: "Shop Owner", role: "Owner" });
  data.clients.push({ id: "cl1", name: "Old Client" });
  data.jobs.push({ id: "j1", name: "Old job", clientId: "cl1", address: "", status: "Quoted", crewAssigned: ["c1"],
    notes: [{ id: "n1", author: "Shop Owner", text: "old note", timestamp: "Oct 3" }],
    photos: [{ id: "p1", url: "https://example.com/a.jpg", author: "Shop Owner", timestamp: "Oct 3" }],
    files: [{ id: "f1", name: "Plan.pdf", author: "Shop Owner", date: "Oct 3" }],
    quotes: [{ items: [{ desc: "Work", qty: 1, rate: 100 }], status: "Draft" }],
    bills: [{ id: "b1", desc: "Deposit", amount: 50, status: "Unpaid" }],
    expenses: [{ id: "e1", desc: "Nails", amount: 5, date: "Oct 3" }] });
  const before = JSON.stringify(data);
  const a = phone(srv, "owner", data);
  await a.sync(); await a.sync(); await a.sync();
  assert.strictEqual(JSON.stringify(a.data), before);
  assert.strictEqual(a.applied, 0);
});

async function pair() {
  const srv = fakeServer(); srv.addMember("owner");
  const a = phone(srv, "owner", sampleData()), b = phone(srv, "owner", empty());
  await a.sync(); await b.sync(); await a.sync(); await b.sync();
  return { srv, a, b };
}

test("an edit, a new note and a new photo travel to the other phone", async () => {
  const { srv, a, b } = await pair();
  const w = writes(srv);
  const j = a.data.jobs[0];
  j.status = "Done";
  j.notes.push({ id: "n_new", author: "Shop Owner", text: "Wrapped up", tag: "", timestamp: "Today", createdAt: now() });
  j.photos.unshift({ id: "p_new", url: PNG, tag: "After", caption: "Done", author: "Shop Owner", timestamp: "Today", createdAt: now() });
  await a.save(); await a.sync();
  assert.strictEqual(writes(srv) - w, 4, "one file + three small requests, not a re-send of everything");
  await b.sync();
  const bj = b.data.jobs[0];
  assert.deepStrictEqual([bj.status, bj.notes.map(n => n.id), bj.photos[0].id, bj.photos[0].url], ["Done", ["n_1", "n_new"], "p_new", PNG]);
  checkShape(b.data);
});

test("removing things on one phone removes them on the other (trash, not hard delete)", async () => {
  const { srv, a, b } = await pair();
  const j = a.data.jobs[0];
  j.photos = j.photos.filter(p => p.id !== "p_1"); j.bills = []; j.crewAssigned = ["c1"];
  a.data.clients = [];
  await a.save(); await a.sync(); await b.sync();
  const bj = b.data.jobs[0];
  assert.deepStrictEqual([bj.photos.map(p => p.id), bj.bills, bj.crewAssigned, b.data.clients], [["p_0"], [], ["c1"], []]);
  assert.ok(srv.db.sb_photos.find(p => p.id === "p_1").deleted_at && srv.db.sb_bills[0].deleted_at, "rows are kept in the trash");
  // deleting a whole job
  b.data.jobs = []; await b.save(); await b.sync(); await a.sync();
  assert.strictEqual(a.data.jobs.length, 0);
  // something added and removed before it was ever sent never goes up
  a.data.clients.push({ id: "cl_tmp", name: "Oops", phone: "", email: "", address: "", projectNotes: "" }); await a.save();
  a.data.clients = []; await a.save(); const w = writes(srv); await a.sync();
  assert.deepStrictEqual([writes(srv), srv.db.sb_clients.some(c => c.id === "cl_tmp")], [w, false]);
});

test("latest change wins, whichever phone syncs first", async () => {
  const { srv, a, b } = await pair();
  a.data.jobs[0].name = "A's earlier name"; await a.save();          // phone A offline, earlier
  b.data.jobs[0].name = "B's later name"; await b.save(); await b.sync();
  await a.sync();                                                      // A comes online afterwards
  assert.deepStrictEqual([a.data.jobs[0].name, srv.db.sb_jobs[0].name, a.engine.status().waiting], ["B's later name", "B's later name", 0]);
  // the other way round: the later edit is on the phone that syncs second
  b.data.clients[0].phone = "111"; await b.save();
  a.data.clients[0].phone = "222"; await a.save();
  await b.sync(); await a.sync(); await b.sync();
  assert.deepStrictEqual([a.data.clients[0].phone, b.data.clients[0].phone], ["222", "222"]);
});

test("turning off forgets; turning on again sends this phone's current data", async () => {
  const { srv, a } = await pair();
  await a.engine.turnOff();
  assert.deepStrictEqual([a.saved, Object.keys(a.kv.mem).filter(k => /Sync/.test(k))], ["{}", []]);
  a.data.jobs[0].name = "Renamed while off"; await a.save();
  const w = writes(srv), s = await a.engine.turnOn();
  assert.deepStrictEqual([s.error, writes(srv) > w, srv.db.sb_jobs[0].name, s.waiting], [null, true, "Renamed while off", 0]);
});

test("turning on for the first time: company is set up, records go up, and the cloud is checked", async () => {
  const srv = fakeServer();                                  // no company yet
  const a = phone(srv, "owner", sampleData(), false);
  const p = await a.engine.prepare("Field Trade Co.");
  assert.deepStrictEqual(p, { role: "owner", created: true, cloudJobs: 0 });
  const s = await a.engine.turnOn(); assert.strictEqual(s.error, null);
  const v = await a.engine.verify();
  assert.deepStrictEqual([v.ok, v.missing, v.counts.sb_jobs, v.counts.sb_photos, v.counts.sb_bills], [true, [], 1, 2, 1]);
  // a second phone finds the cloud already in use and takes the cloud's copy instead of sending its own
  const sample = empty(); sample.crewMembers.push({ id: "c1", name: "Sample", phone: "", email: "", role: "Owner" });
  sample.jobs.push({ id: "j_sample", name: "Sample job", clientId: "", address: "", status: "Lead", startDate: "", crewAssigned: [], notes: [], photos: [], files: [], quotes: [], bills: [], expenses: [] });
  const b = phone(srv, "owner", sample, false);
  assert.deepStrictEqual(await b.engine.prepare("x"), { role: "owner", created: false, cloudJobs: 1 });
  const w = writes(srv);
  const sb = await b.engine.turnOn({ replace: true }); assert.strictEqual(sb.error, null);
  assert.deepStrictEqual([b.data.jobs.map(j => j.id), b.data.crewMembers.map(c => c.name), writes(srv), b.data.business.owner], [["j_1"], ["Shop Owner", "Sam"], w, "Shop Owner"]);
  assert.strictEqual(b.data.jobs[0].photos.find(x => x.id === "p_1").url, JPG);
  assert.strictEqual((await b.engine.verify()).ok, true);
  checkShape(b.data);
  // someone who may not start a company is told so, and nothing is switched on
  const c = phone(srv, "lead", empty(), false);
  await assert.rejects(c.engine.prepare("x"), e => e.code === "rejected" && /not open yet/.test(e.detail));
  // verify notices a gap
  srv.db.sb_notes.length = 0;
  const gap = await a.engine.verify();
  assert.deepStrictEqual([gap.ok, gap.missing], [false, ["sb_notes|n_1"]]);
  assert.strictEqual(await a.engine.crewLogins(), 0);
});

test("a pull never overwrites a newer edit that is still waiting on this phone", () => {
  const who = { companyId: COMPANY, role: "owner" }, state = {};
  const data = sampleData();
  Wire.scan(state, data, who, "2026-11-15T09:00:00.000Z");
  Object.values(state).forEach(s => { delete s.d; delete s.n; });
  data.jobs[0].name = "Edited here"; Wire.scan(state, data, who, "2026-11-15T10:00:00.000Z");
  const row = t => ({ id: "j_1", edited_at: t, updated_at: t });
  assert.strictEqual(Wire.incoming(state, { rows: { sb_jobs: [row("2026-11-15T09:30:00.000Z")] } }, who).count, 0);
  assert.strictEqual(Wire.incoming(state, { rows: { sb_jobs: [row("2026-11-15T10:30:00.000Z")] } }, who).count, 1);
});

test("offline: changes wait with their own time, then go up", async () => {
  const { srv, a, b } = await pair();
  srv.setDown(true);
  a.data.jobs[0].address = "9 New Rd"; await a.save();
  const s = await a.engine.run();
  assert.deepStrictEqual([s.phase, s.waiting > 0], ["offline", true]);
  const stamped = JSON.parse(a.saved)["sb_jobs|j_1"].e;
  srv.setDown(false);
  await a.sync(); await b.sync();
  assert.deepStrictEqual([b.data.jobs[0].address, srv.db.sb_jobs[0].edited_at, a.engine.status().waiting], ["9 New Rd", stamped, 0]);
});

test("lead and crew phones: what they may see, add, and not change", async () => {
  const { srv, a } = await pair();
  srv.addMember("lead"); srv.addMember("crew");
  srv.db.sb_crew.find(c => c.id === "c_k2").user_id = require("./sync_test.js").USERS.crew;
  const lead = phone(srv, "lead", empty()), crew = phone(srv, "crew", empty());
  await lead.sync(); await crew.sync();
  const lj = lead.data.jobs[0], cj = crew.data.jobs[0];
  assert.deepStrictEqual([lj.bills, lj.expenses, "moneyBilled" in lj, cj.bills, cj.notes.length, cj.photos.length], [[], [], false, [], 1, 2]);
  checkShape(lead.data); checkShape(crew.data);
  cj.notes.push({ id: "n_c", author: "Sam", text: "On site", tag: "", timestamp: "Today", createdAt: now() });
  cj.expenses.unshift({ id: "e_c", desc: "Gas", amount: 30, category: "Fuel", day: "2026-11-15", date: "Nov 15", photoUrl: JPG, author: "Sam" });
  cj.name = "Crew rename attempt";
  await crew.save(); await crew.sync();
  assert.deepStrictEqual([srv.db.sb_jobs[0].name, crew.engine.status().waiting], ["Deck", 0]);
  await a.sync(); await lead.sync();
  const aj = a.data.jobs[0];
  assert.deepStrictEqual([aj.notes.map(n => n.id), aj.expenses[0].id, aj.expenses[0].photoUrl, aj.bills.length], [["n_1", "n_c"], "e_c", JPG, 1]);
  assert.deepStrictEqual([lead.data.jobs[0].notes.length, lead.data.jobs[0].expenses], [2, []]);
  lead.data.jobs[0].status = "Waiting"; await lead.save(); await lead.sync(); await a.sync();
  assert.deepStrictEqual([a.data.jobs[0].status, a.data.jobs[0].moneyBilled, a.data.jobs[0].quotes[0].items.length], ["Waiting", 900, 1]);
});

test("crew phone: a job arrives when they are put on it and goes when they are taken off", async () => {
  const { srv, a } = await pair();
  srv.addMember("crew");
  srv.db.sb_crew.find(c => c.id === "c_k2").user_id = require("./sync_test.js").USERS.crew;
  a.data.clients.push({ id: "cl_9", name: "Second client", phone: "", email: "", address: "9 Elm" });
  a.data.jobs.push({ id: "j_9", name: "Garage", trade: "", clientId: "cl_9", address: "9 Elm", status: "Lead", startDate: "", crewAssigned: ["c1"],
    notes: [{ id: "n_9", author: "Shop Owner", text: "Bring ladder", tag: "", timestamp: "Today", createdAt: now() }], photos: [], files: [],
    quotes: [{ items: [], status: "Draft" }], bills: [], expenses: [] });
  await a.save(); await a.sync();
  // something Sam can see changes afterwards, so his phone's "last seen" time is later than the Garage job
  a.data.jobs.find(j => j.id === "j_1").status = "Scheduled"; await a.save(); await a.sync();
  const crew = phone(srv, "crew", empty());
  await crew.sync(); await crew.sync(); // already signed in and up to date, as a real phone is
  assert.deepStrictEqual(crew.data.jobs.map(j => j.id), ["j_1"]);
  // the owner puts Sam on the second job: only the assignment changes, not the job
  a.data.jobs.find(j => j.id === "j_9").crewAssigned.push("c_k2");
  await a.save(); await a.sync();
  await crew.sync();
  const got = crew.data.jobs.find(j => j.id === "j_9");
  assert.ok(got, "the newly assigned job reaches the crew phone on an ordinary sync");
  assert.deepStrictEqual([got.name, got.notes.map(n => n.id), got.crewAssigned.slice().sort(), crew.data.clients.map(c => c.id).sort().includes("cl_9")], ["Garage", ["n_9"], ["c1", "c_k2"], true]);
  checkShape(crew.data);
  // crew adds a note there; it reaches the owner
  got.notes.push({ id: "n_9c", author: "Sam", text: "Done", tag: "", timestamp: "Today", createdAt: now() });
  await crew.save(); await crew.sync(); await a.sync();
  assert.deepStrictEqual(a.data.jobs.find(j => j.id === "j_9").notes.map(n => n.id), ["n_9", "n_9c"]);
  // taken off again: the job leaves the crew phone, and nothing is trashed in the cloud
  const aj = a.data.jobs.find(j => j.id === "j_9"); aj.crewAssigned = aj.crewAssigned.filter(id => id !== "c_k2");
  await a.save(); await a.sync();
  await crew.sync();
  assert.deepStrictEqual([crew.data.jobs.map(j => j.id), crew.data.clients.some(c => c.id === "cl_9"), crew.engine.status().waiting], [["j_1"], false, 0]);
  assert.strictEqual(srv.db.sb_jobs.find(j => j.id === "j_9").deleted_at || null, null);
  assert.strictEqual(srv.db.sb_notes.find(n => n.id === "n_9c").deleted_at || null, null);
  await a.sync();
  assert.deepStrictEqual(a.data.jobs.find(j => j.id === "j_9").notes.map(n => n.id), ["n_9", "n_9c"]);
  // and back on: it returns whole
  a.data.jobs.find(j => j.id === "j_9").crewAssigned.push("c_k2");
  await a.save(); await a.sync(); await crew.sync();
  assert.deepStrictEqual(crew.data.jobs.find(j => j.id === "j_9").notes.map(n => n.id), ["n_9", "n_9c"]);
});

(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log("ok   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e.stack || e.message).split("\n").slice(0, 5).join("\n     ")); }
  }
  console.log(failed ? failed + " of " + tests.length + " failed" : "all " + tests.length + " passed");
  process.exit(failed ? 1 : 0);
})();
