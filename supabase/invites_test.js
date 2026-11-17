/* Shop Board — tests for Stage 3 email invites, set-password links and "Forgot password?".
   Runs against the stand-in server from sync_test.js, with the invite endpoints added on top
   (the invite sender, the accept function, the invites table and the auth calls). Logins are made up. */
"use strict";
const assert = require("assert");
const fs = require("fs"), path = require("path"), vm = require("vm");
const Sync = require("../sync.js");
const { fakeServer, sampleData, COMPANY, USERS } = require("./sync_test.js");
const INVITEE = "bbbbbbbb-0000-4000-8000-0000000000a", EMAIL = "new.person@example.test", PASS = "made-up-test-password";
const tests = [], test = (n, f) => tests.push([n, f]);

// Adds the invite endpoints to the stand-in server. Everything else goes to the stand-in unchanged.
function withInvites(srv, opts) {
  const o = opts || {}, calls = [], invites = [];
  const reply = (status, data) => ({ ok: status < 300, status, text: async () => (data === undefined ? "" : JSON.stringify(data)), headers: { get: () => "application/json" } });
  async function fetch(url, init) {
    const u = new URL(url), method = init.method || "GET", p = u.pathname;
    const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    const uid = srv.tokens[(init.headers.Authorization || "").replace("Bearer ", "")] || null;
    if (p === "/functions/v1/send-invite") {
      calls.push({ kind: "invite", body, auth: init.headers.Authorization });
      if (o.inviteStatus) return reply(o.inviteStatus, { error: o.inviteError });
      invites.push({ id: "inv" + invites.length, email: body.email, role: body.role, crew_id: body.crewId, company_id: body.companyId, expires_at: o.expired ? "2000-01-01T00:00:00Z" : "2099-01-01T00:00:00Z", accepted: false, cancelled: false });
      return reply(200, { ok: true, sent: "invite" });
    }
    if (p === "/rest/v1/sb_invites" && method === "GET") {
      return reply(200, invites.filter(i => !i.accepted && !i.cancelled).map(i => ({ id: i.id, email: i.email, role: i.role, crew_id: i.crew_id, expires_at: i.expires_at })));
    }
    if (p === "/rest/v1/sb_invites" && method === "PATCH") {
      const id = u.searchParams.get("id").replace("eq.", "");
      const hit = invites.find(i => i.id === id && !i.accepted);
      if (!hit) return reply(200, []);
      hit.cancelled = true; calls.push({ kind: "cancel", id });
      return reply(200, [{ id }]);
    }
    if (p === "/rest/v1/rpc/sb_accept_invite") {
      calls.push({ kind: "accept", uid });
      const inv = invites.find(i => i.email === EMAIL && !i.accepted && !i.cancelled);
      if (!inv || uid !== INVITEE) return reply(200, null);
      inv.accepted = true;
      srv.db.sb_members.push({ company_id: COMPANY, user_id: INVITEE, role: inv.role, status: "active" });
      const row = (srv.db.sb_crew || []).find(c => c.id === inv.crew_id); if (row) row.user_id = INVITEE;
      return reply(200, { company_id: COMPANY, role: inv.role });
    }
    if (p === "/auth/v1/user" && method === "PUT") {
      calls.push({ kind: "password", uid, hasPassword: Boolean(body && body.password) });
      if (o.weakPassword) return reply(422, { msg: "Password too weak" });
      return reply(200, { id: INVITEE, email: EMAIL });
    }
    if (p === "/auth/v1/recover") {
      calls.push({ kind: "reset", query: u.search, body });
      if (o.resetDown) return reply(500, {});
      return reply(200, {});
    }
    return srv.fetch(url, init);
  }
  return { fetch, calls, invites };
}

async function ownerWithData() {
  const srv = fakeServer();
  srv.addMember("owner");
  const owner = Sync.createSync({ fetch: srv.fetch, storage: srv.signedIn("owner") });
  await owner.session();
  const sent = Sync.toRows(sampleData(), COMPANY);
  await owner.push({ rows: sent.rows, uploads: sent.uploads, company: sent.company });
  return { srv, owner };
}
const ownerSync = (srv, ext, opts) => Sync.createSync({ fetch: ext.fetch, storage: srv.signedIn("owner"), ...(opts || {}) });

test("the owner's invite goes to the server sender with the email in lower case, role and crew name", async () => {
  const { srv } = await ownerWithData();
  const ext = withInvites(srv);
  const owner = ownerSync(srv, ext);
  const out = await owner.invitePerson("  New.Person@Example.TEST ", "crew", "c_k2");
  assert.strictEqual(out.sent, "invite");
  const c = ext.calls.find(x => x.kind === "invite");
  assert.deepStrictEqual(c.body, { companyId: COMPANY, email: EMAIL, role: "crew", crewId: "c_k2" });
  assert.ok(/^Bearer /.test(c.auth), "the owner's own sign-in is sent, not a service key");
});

test("a refused invite gives the server's plain reason; a missing sender says so", async () => {
  const { srv } = await ownerWithData();
  const refused = withInvites(srv, { inviteStatus: 403, inviteError: "Only the owner can invite people to this company." });
  await assert.rejects(ownerSync(srv, refused).invitePerson(EMAIL, "lead", null), e => /Only the owner/.test(e.message));
  const missing = withInvites(srv, { inviteStatus: 404 });
  await assert.rejects(ownerSync(srv, missing).invitePerson(EMAIL, "lead", null), e => /not switched on/.test(e.message));
});

test("the pending list shows open invites and marks expired ones; cancelling makes the invite stop", async () => {
  const { srv } = await ownerWithData();
  const ext = withInvites(srv);
  const owner = ownerSync(srv, ext);
  await owner.invitePerson(EMAIL, "crew", "c_k2");
  let list = await owner.invites();
  assert.strictEqual(list.length, 1); assert.strictEqual(list[0].email, EMAIL); assert.strictEqual(list[0].expired, false);
  await owner.cancelInvite(list[0].id);
  assert.strictEqual((await owner.invites()).length, 0);
  const old = withInvites(srv, { expired: true });
  await ownerSync(srv, old).invitePerson(EMAIL, "crew", "c_k2");
  list = await ownerSync(srv, old).invites();
  assert.strictEqual(list[0].expired, true);
});

test("forgot password asks Supabase for a reset link that returns to the app, and never says whether the login exists", async () => {
  const srv = fakeServer();
  const ext = withInvites(srv);
  const phone = Sync.createSync({ fetch: ext.fetch, storage: srv.signedIn() });
  await phone.requestReset(EMAIL);
  const c = ext.calls.find(x => x.kind === "reset");
  assert.strictEqual(c.body.email, EMAIL);
  assert.ok(/redirect_to=https%3A%2F%2Fhexabus\.github\.io%2Fshop-board%2F/.test(c.query), c.query);
  const down = withInvites(srv, { resetDown: true });
  await assert.rejects(Sync.createSync({ fetch: down.fetch, storage: srv.signedIn() }).requestReset(EMAIL), e => e.code === "offline");
  await assert.rejects(phone.requestReset("   "), e => /Type your email/.test(e.message));
});

test("an invited person sets a password, then signs in and lands as crew on the company", async () => {
  const { srv } = await ownerWithData();
  const ext = withInvites(srv);
  await ownerSync(srv, ext).invitePerson(EMAIL, "crew", "c_k2");
  srv.logins[EMAIL] = INVITEE;
  const invitee = Sync.createSync({ fetch: ext.fetch, storage: srv.signedIn() });
  // The link's token stands in for the one in the address bar.
  srv.tokens["link-token"] = INVITEE;
  const done = await invitee.finishLink("link-token", PASS);
  assert.strictEqual(done.email, EMAIL);
  assert.ok(ext.calls.some(x => x.kind === "password" && x.hasPassword), "the password was set through the sign-in server");
  const who = await invitee.signIn(EMAIL, PASS);
  assert.strictEqual(who.role, "crew"); assert.strictEqual(who.companyId, COMPANY);
  const pulled = await invitee.pull({ since: null });
  assert.strictEqual(pulled.rows.sb_jobs.length, 1);
  assert.strictEqual(pulled.rows.sb_bills.length, 0, "crew never get money");
});

test("a short or refused password is stopped with a plain message, and nothing is accepted", async () => {
  const { srv } = await ownerWithData();
  const ext = withInvites(srv, { weakPassword: true });
  const phone = Sync.createSync({ fetch: ext.fetch, storage: srv.signedIn() });
  await assert.rejects(phone.finishLink("link-token", "short"), e => /at least 8/.test(e.message));
  assert.strictEqual(ext.calls.filter(x => x.kind === "password").length, 0, "too short: nothing sent");
  await assert.rejects(phone.finishLink("link-token", "long enough password"), e => /not allowed/.test(e.message));
  assert.strictEqual(ext.calls.filter(x => x.kind === "accept").length, 0);
});

test("a link's token is read from the address bar; expired and other links say so", () => {
  const ctx = { window: {}, location: { hash: "" }, history: { replaceState() {} }, URLSearchParams };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "invites.js"), "utf8"), ctx);
  const P = ctx.window.ShopBoardInvites.parseLink;
  assert.strictEqual(JSON.stringify(P("#access_token=abc&type=invite&refresh_token=x")), JSON.stringify({ type: "invite", accessToken: "abc" }));
  assert.strictEqual(JSON.stringify(P("#access_token=abc&type=recovery")), JSON.stringify({ type: "recovery", accessToken: "abc" }));
  assert.strictEqual(P("#error=access_denied&error_code=otp_expired").type, "error");
  assert.strictEqual(P("#access_token=abc&type=magiclink"), null);
  assert.strictEqual(P(""), null);
});

(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log("ok   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack || e)); }
  }
  console.log(failed ? failed + " FAILED" : "all " + tests.length + " passed");
  process.exit(failed ? 1 : 0);
})();
