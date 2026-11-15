/* Shop Board — tests for lead/crew sign-in and the owner's People controls.
   Everything runs against the stand-in server from sync_test.js; logins here are made up. */
"use strict";
const assert = require("assert");
const Sync = require("../sync.js");
const { fakeServer, sampleData, COMPANY, USERS } = require("./sync_test.js");
const NEW = "bbbbbbbb-0000-4000-8000-000000000009", PASS = "made-up-test-password";
const tests = [], test = (n, f) => tests.push([n, f]);

async function ownerWithData() {
  const srv = fakeServer();
  srv.addMember("owner");
  const owner = Sync.createSync({ fetch: srv.fetch, storage: srv.signedIn("owner") });
  await owner.session();
  const sent = Sync.toRows(sampleData(), COMPANY);
  await owner.push({ rows: sent.rows, uploads: sent.uploads, company: sent.company });
  return { srv, owner };
}
const phone = srv => Sync.createSync({ fetch: srv.fetch, storage: srv.signedIn() });

test("a new login signs in, belongs to no company, then is added as crew and sees its job", async () => {
  const { srv, owner } = await ownerWithData();
  srv.logins["sam@example.test"] = NEW;
  const sam = phone(srv);
  const first = await sam.signIn("sam@example.test", PASS);
  assert.strictEqual(first.userId, NEW); assert.strictEqual(first.companyId, null);
  await owner.addPerson(NEW, "crew", "c_k2");
  const who = await sam.session(true);
  assert.strictEqual(who.role, "crew");
  const pulled = await sam.pull({ since: null });
  assert.strictEqual(pulled.rows.sb_jobs.length, 1);
  assert.strictEqual(pulled.rows.sb_bills.length, 0, "crew never get money");
});

test("a wrong password is refused and nothing is saved on the phone", async () => {
  const { srv } = await ownerWithData();
  srv.logins["sam@example.test"] = NEW;
  const store = srv.signedIn(), sam = Sync.createSync({ fetch: srv.fetch, storage: store });
  await assert.rejects(sam.signIn("sam@example.test", "wrong"), e => e.code === "signed_out");
  assert.strictEqual(store.getItem("shopBoardCloudRefreshToken"), null);
});

test("people list: names, seats, and who is unmatched", async () => {
  const { srv, owner } = await ownerWithData();
  await owner.addPerson(USERS.lead, "lead", null);
  await owner.addPerson(USERS.crew, "crew", "c_k2");
  const p = await owner.people();
  assert.strictEqual(p.seatLimit, 2); assert.strictEqual(p.used, 2);
  assert.strictEqual(p.people.find(x => x.userId === USERS.crew).name, "Sam");
  assert.strictEqual(p.people.find(x => x.userId === USERS.lead).crewId, null);
  assert.ok(p.people.find(x => x.role === "owner").me);
});

test("seat limit, bad code and unknown login give plain reasons", async () => {
  const { srv, owner } = await ownerWithData();
  srv.logins["x@example.test"] = NEW;
  await owner.addPerson(USERS.lead, "lead", null);
  await owner.addPerson(USERS.crew, "crew", "c_k2");
  await assert.rejects(owner.addPerson(NEW, "crew", null), e => /crew seats/.test(e.message));
  await assert.rejects(owner.addPerson("not-a-code", "crew", null), e => /does not look right/.test(e.message));
  await owner.setPerson(USERS.lead, { status: "removed" });
  await assert.rejects(owner.addPerson("cccccccc-0000-4000-8000-000000000000", "crew", null), e => /No login exists/.test(e.message));
});

test("role change, removal and letting back in", async () => {
  const { srv, owner } = await ownerWithData();
  await owner.addPerson(USERS.crew, "crew", "c_k2");
  const sam = Sync.createSync({ fetch: srv.fetch, storage: srv.signedIn("crew") });
  assert.strictEqual((await sam.session()).role, "crew");
  await sam.saveCursor((await sam.pull({ since: null })).cursor); // it has synced before, as any real phone has
  await owner.setPerson(USERS.crew, { role: "lead" });
  assert.strictEqual((await sam.session(true)).role, "lead");
  await owner.setPerson(USERS.crew, { status: "removed" });
  await assert.rejects(sam.session(true), e => e.code === "removed");
  await owner.setPerson(USERS.crew, { status: "active" });
  assert.strictEqual((await sam.session(true)).role, "lead");
});

test("only the owner can add or change people", async () => {
  const { srv, owner } = await ownerWithData();
  await owner.addPerson(USERS.lead, "lead", null);
  const lead = Sync.createSync({ fetch: srv.fetch, storage: srv.signedIn("lead") });
  await assert.rejects(lead.addPerson(USERS.crew, "crew", null), e => e.code === "denied");
  await assert.rejects(lead.setPerson(USERS.owner, { role: "crew" }), e => /not found/.test(e.message));
  assert.strictEqual(srv.db.sb_members.find(m => m.user_id === USERS.owner).role, "owner");
  // and nobody changes their own login, the owner included
  await assert.rejects(lead.setPerson(USERS.lead, { role: "crew" }), e => /your own login/.test(e.message));
  await assert.rejects(owner.addPerson(USERS.owner, "crew", null), e => /your own login code/.test(e.message));
  await assert.rejects(owner.setPerson(USERS.owner, { status: "removed" }), e => /your own login/.test(e.message));
});

test("matching a login to a different crew name moves the match", async () => {
  const { srv, owner } = await ownerWithData();
  await owner.addPerson(USERS.crew, "crew", "c_k2");
  await owner.setPerson(USERS.crew, { crewId: "c1" });
  assert.strictEqual(srv.db.sb_crew.find(c => c.id === "c_k2").user_id, null);
  assert.strictEqual(srv.db.sb_crew.find(c => c.id === "c1").user_id, USERS.crew);
  await assert.rejects(owner.setPerson(USERS.crew, { crewId: "nobody" }), e => /crew list/.test(e.message));
});

test("signing out forgets the phone's sign-in", async () => {
  const { srv } = await ownerWithData();
  srv.logins["sam@example.test"] = NEW;
  const store = srv.signedIn(), sam = Sync.createSync({ fetch: srv.fetch, storage: store });
  await sam.signIn("sam@example.test", PASS);
  assert.ok(store.getItem("shopBoardCloudRefreshToken"));
  await sam.signOutHere();
  assert.strictEqual(store.getItem("shopBoardCloudRefreshToken"), null);
  await assert.rejects(sam.session(true), e => e.code === "signed_out");
});

(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log("ok   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack || e)); }
  }
  console.log(failed ? failed + " FAILED" : "all " + tests.length + " passed");
  process.exit(failed ? 1 : 0);
})();
