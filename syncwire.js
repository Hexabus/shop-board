/* Shop Board cloud sync — wiring into the app's saves.

   OFF unless the switch "shopBoardCloudSyncOn" is set on this phone. Nothing in the app sets it
   yet (the Settings toggle is the next step), so with the switch off this file does nothing at
   all: saves behave exactly as before.

   With the switch on:
     - every save is followed by a quiet check of what changed, each change stamped with the time
       it was made (kept beside the data, never inside it, so records and backups keep their shape)
     - changes are sent up a moment later; anything removed on the phone goes to the cloud trash
     - changes from other phones are fetched when the app opens, comes back into view, comes back
       online, after each save, and every two minutes
     - a change made here after the server's copy was last edited is never overwritten by a pull
     - photos and documents from other phones are downloaded and kept on the phone, so they still
       open offline
   Offline, changes simply wait. */
(function (root) {
  "use strict";
  const inNode = typeof module === "object" && module.exports;
  const Sync = inNode ? require("./sync.js") : root.ShopBoardSync;
  const ON_KEY = "shopBoardCloudSyncOn", WHO_KEY = "shopBoardCloudSyncWho";
  const FILE_FIELD = { sb_photos: ["photos", "url"], sb_files: ["files", "dataUrl"], sb_expenses: ["expenses", "photoUrl"] };

  /* ---------------------------------------------------------------- change tracking (no I/O)
     state is { "<table>|<id>": { h, e, d, x, n, u, v } }
       h  fingerprint of the row as last seen on this phone
       e  when it was last edited here (or on the server, for rows that came from there)
       d  1 = waiting to be sent        x  1 = removed here / trashed on the server
       n  1 = never been on the server  u  1 = its file is in storage
       v  the server's own change time for the copy we last took                              */

  const keyOf = (table, id) => table + "|" + id;
  function fingerprint(row) {
    const copy = Object.assign({}, row); delete copy.edited_at; delete copy.updated_at; delete copy.created_by; delete copy.author_id;
    const s = JSON.stringify(copy);
    let a = 0xdeadbeef, b = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677); }
    a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
    b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
    return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36);
  }
  const companyKey = who => keyOf("sb_companies", who.companyId);

  /* Compares the app's data with what was last seen and marks what is new, changed or removed. */
  function scan(state, data, who, now) {
    const made = Sync.toRows(data, who.companyId, { editedAt: now });
    const seen = new Set();
    const look = (key, row) => {
      seen.add(key);
      const h = fingerprint(row), s = state[key];
      if (!s) state[key] = { h, e: now, d: 1, n: 1 };
      else if (s.x) state[key] = { h, e: now, d: 1 };
      else if (s.h !== h) { s.h = h; s.e = now; s.d = 1; }
    };
    for (const table of Sync.TABLES) {
      if (!Sync.canWrite(who.role, table)) continue;
      made.rows[table].forEach(row => look(keyOf(table, row.id), row));
    }
    if (who.role === "owner" && made.company) look(companyKey(who), made.company);
    for (const key of Object.keys(state)) {
      const table = key.slice(0, key.indexOf("|")), s = state[key];
      if (seen.has(key) || s.x || table === "sb_companies") continue;
      const mode = Sync.canWrite(who.role, table);
      if (!mode) continue;
      if (s.n || mode !== "upsert") delete state[key]; // never reached the server, or not ours to trash
      else { s.x = 1; s.d = 1; s.e = now; }
    }
    return Object.values(state).filter(s => s.d).length;
  }

  /* Everything waiting to go up, in the shape push() takes, plus a note of what was sent. */
  function outgoing(state, data, who) {
    const made = Sync.toRows(data, who.companyId);
    const changes = { rows: {}, uploads: [], trashed: [] }, sent = {};
    for (const table of Sync.TABLES) {
      const list = made.rows[table].filter(row => { const s = state[keyOf(table, row.id)]; return s && s.d && !s.x; });
      list.forEach(row => { const key = keyOf(table, row.id); row.edited_at = state[key].e; sent[key] = state[key].e; });
      if (list.length) changes.rows[table] = list;
    }
    changes.uploads = made.uploads.filter(u => { const key = keyOf(u.table, u.id); return key in sent && !state[key].u; });
    for (const key of Object.keys(state)) {
      const s = state[key];
      if (!s.x || !s.d) continue;
      const at = key.indexOf("|");
      changes.trashed.push({ table: key.slice(0, at), id: key.slice(at + 1), editedAt: s.e }); sent[key] = s.e;
    }
    const ck = companyKey(who);
    if (made.company && state[ck] && state[ck].d) { changes.company = Object.assign(made.company, { edited_at: state[ck].e }); sent[ck] = state[ck].e; }
    return { changes, sent, count: Object.keys(sent).length };
  }

  /* After a push: whatever the server answered for is no longer waiting — unless it was edited
     again while the push was under way. */
  function settle(state, sent, report) {
    (report.uploaded || []).forEach(x => { const s = state[keyOf(x.table, x.id)]; if (s) s.u = 1; });
    for (const list of [report.saved, report.alreadyThere, report.serverWins, report.notAllowed]) {
      (list || []).forEach(x => {
        const key = keyOf(x.table, x.id), s = state[key];
        if (s && sent[key] === s.e) { delete s.d; delete s.n; }
      });
    }
  }

  /* Pulled rows worth applying: not ones we already hold, and not ones a newer edit here beats. */
  function incoming(state, pulled, who) {
    const keep = (key, row) => {
      const s = state[key];
      if (!s) return true;
      if (s.v && s.v === row.updated_at) return false;
      return !(s.d && Date.parse(s.e) > Date.parse(row.edited_at));
    };
    const rows = {};
    let count = 0;
    for (const table of Sync.TABLES) { rows[table] = ((pulled.rows || {})[table] || []).filter(row => keep(keyOf(table, row.id), row)); count += rows[table].length; }
    const company = pulled.company && keep(companyKey(who), pulled.company) ? pulled.company : null;
    return { rows, company, count: count + (company ? 1 : 0) };
  }

  /* Records that the phone now holds the server's copy of each applied row. */
  function adopt(state, data, who, got) {
    const made = Sync.toRows(data, who.companyId);
    for (const table of Sync.TABLES) {
      const mine = new Map(made.rows[table].map(row => [row.id, row]));
      got.rows[table].forEach(row => {
        const key = keyOf(table, row.id), old = state[key];
        if (row.deleted_at) state[key] = { h: "", e: row.edited_at, x: 1, v: row.updated_at };
        else state[key] = { h: mine.has(row.id) ? fingerprint(mine.get(row.id)) : "", e: row.edited_at, v: row.updated_at, ...((old && old.u) || row.storage_path ? { u: 1 } : {}) };
      });
    }
    if (got.company && made.company) state[companyKey(who)] = { h: fingerprint(made.company), e: got.company.edited_at, v: got.company.updated_at };
  }

  /* ---------------------------------------------------------------- the sync loop
     o: { sync, store:{load,save}, kv, getData, applyData(merged), now? } */
  function createEngine(o) {
    const kv = o.kv, clock = o.now || (() => new Date().toISOString());
    let state = null, running = null, again = false;
    const status = { on: false, phase: "idle", lastSync: null, error: null, waiting: 0, skippedFiles: [] };

    const isOn = () => { try { return kv.getItem(ON_KEY) === "1"; } catch (e) { return false; } };
    const knownWho = () => { try { const w = JSON.parse(kv.getItem(WHO_KEY) || "null"); return w && w.companyId && w.role ? w : null; } catch (e) { return null; } };
    async function ready() { if (!state) state = (await o.store.load()) || {}; }
    const waiting = () => Object.values(state || {}).filter(s => s.d).length;

    /* Called right after every save: stamps what changed with the time it changed. */
    async function noteSave() {
      if (!isOn()) return 0;
      const who = knownWho();
      if (!who) return 0; // first sync has not happened yet; it will take stock itself
      await ready();
      status.waiting = scan(state, o.getData(), who, clock());
      await o.store.save(state);
      return status.waiting;
    }

    // Photos and documents that arrived as rows only: fetch the files so they open offline.
    async function fetchFiles(got, data) {
      const files = [];
      for (const table of Object.keys(FILE_FIELD)) {
        const [listName, field] = FILE_FIELD[table];
        const keepRows = [];
        for (const row of got.rows[table]) {
          keepRows.push(row);
          if (row.deleted_at || !row.storage_path) continue;
          const job = (data.jobs || []).find(j => j.id === row.job_id);
          const have = job && (job[listName] || []).find(x => x.id === row.id);
          if (have && typeof have[field] === "string" && have[field].startsWith("data:")) continue;
          try { files.push({ table, jobId: row.job_id, id: row.id, dataUrl: await o.sync.downloadFile(row.storage_path, row.mime || undefined) }); }
          catch (e) {
            if (e && (e.network || e.code === "signed_out")) throw e;
            status.skippedFiles.push(row.storage_path);
            if (table === "sb_photos" && !row.url) keepRows.pop(); // a photo with no picture cannot be shown or backed up
          }
        }
        got.rows[table] = keepRows;
      }
      return files;
    }
    function attachFiles(merged, files) {
      files.forEach(f => {
        const [listName, field] = FILE_FIELD[f.table];
        const job = merged.jobs.find(j => j.id === f.jobId), rec = job && (job[listName] || []).find(x => x.id === f.id);
        if (rec) rec[field] = f.dataUrl;
      });
    }

    // The app's data with every record removed: what "use the cloud's copy" starts from.
    function blank(data) {
      const out = {};
      Object.keys(data || {}).forEach(k => { if (!["jobs", "clients", "crewMembers"].includes(k)) out[k] = JSON.parse(JSON.stringify(data[k])); });
      return Object.assign(out, { crewMembers: [], clients: [], jobs: [] });
    }
    /* First sync on a phone that should take the cloud's records instead of sending its own:
       nothing is sent, and the phone's records are swapped for the cloud's in one save. */
    async function replaceFromCloud(who) {
      status.phase = "fetching";
      state = {};
      const pulled = await o.sync.pull({ since: null });
      const got = { rows: {}, company: pulled.company };
      Sync.TABLES.forEach(t => { got.rows[t] = (pulled.rows[t] || []).slice(); });
      const base = blank(o.getData());
      const files = await fetchFiles(got, base);
      const merged = Sync.mergeIntoLocal(base, got);
      attachFiles(merged, files);
      await o.applyData(merged);
      adopt(state, merged, who, got);
      await o.store.save(state);
      await o.sync.saveCursor(pulled.cursor);
    }

    /* A lead or crew phone only hears about rows that changed. Being put on a job changes the
       assignment, not the job, so the job itself never arrives that way; being taken off hides
       it without a word. So after each sync the phone compares the jobs it may see with the
       jobs it holds: missing ones are fetched whole, and (crew only) hidden ones are put away. */
    async function matchJobs(who) {
      const ids = new Set(await o.sync.jobIds());
      let data = o.getData();
      const have = new Set((data.jobs || []).map(j => j.id));
      const fresh = new Set([...ids].filter(id => !have.has(id)));
      if (fresh.size) {
        const full = await o.sync.pull({ since: null });
        const got = { rows: {}, company: null };
        Sync.TABLES.forEach(t => {
          const rows = full.rows[t] || [];
          got.rows[t] = t === "sb_crew" || t === "sb_clients" ? rows.slice()
            : rows.filter(r => fresh.has(t === "sb_jobs" || t === "sb_job_money" ? r.id : r.job_id));
        });
        const files = await fetchFiles(got, data);
        const current = o.getData(); // read again: a note may have been added while files came down
        const merged = Sync.mergeIntoLocal(current, got);
        attachFiles(merged, files);
        await o.applyData(merged);
        adopt(state, merged, who, got);
        await o.store.save(state);
      }
      data = o.getData();
      // Anything still waiting to be sent keeps its job on the phone until it has gone up.
      if (who.role !== "crew" || waiting()) return;
      if (!(data.jobs || []).some(j => !ids.has(j.id))) return;
      const next = JSON.parse(JSON.stringify(data));
      next.jobs = next.jobs.filter(j => ids.has(j.id));
      const used = new Set(next.jobs.map(j => j.clientId));
      next.clients = (next.clients || []).filter(c => used.has(c.id));
      await o.applyData(next);
      scan(state, o.getData(), who, clock());
      await o.store.save(state);
    }

    async function cycle(opts) {
      await ready();
      const who = await o.sync.session(true);
      if (!who.companyId) { status.phase = "no_company"; throw Object.assign(Error("This account has no company in the cloud yet."), { code: "no_company" }); }
      kv.setItem(WHO_KEY, JSON.stringify({ companyId: who.companyId, role: who.role, userId: who.userId }));
      if (opts && opts.replace) await replaceFromCloud(who);

      status.phase = "sending";
      scan(state, o.getData(), who, clock());
      const out = outgoing(state, o.getData(), who);
      if (out.count) {
        let report;
        try { report = await o.sync.push(out.changes); }
        catch (e) { if (e && e.report) settle(state, out.sent, e.report); await o.store.save(state); throw e; }
        settle(state, out.sent, report);
        await o.store.save(state);
      }

      status.phase = "fetching";
      const pulled = await o.sync.pull();
      const got = incoming(state, pulled, who);
      if (got.count) {
        const files = await fetchFiles(got, o.getData());
        const current = o.getData();
        const merged = Sync.mergeIntoLocal(current, got);
        attachFiles(merged, files);
        const changed = JSON.stringify(merged) !== JSON.stringify(current);
        if (changed) await o.applyData(merged);
        adopt(state, changed ? merged : current, who, got);
        await o.store.save(state);
      }
      await o.sync.saveCursor(pulled.cursor);
      // The sync itself is done by now; if this check cannot finish it simply runs again next time.
      if (who.role !== "owner" && typeof o.sync.jobIds === "function") { try { await matchJobs(who); } catch (e) {} }
      status.phase = "idle"; status.lastSync = clock(); status.error = null;
    }

    /* One full round: send what is waiting, fetch what is new. Never throws; see status(). */
    function run(opts) {
      if (!isOn()) return Promise.resolve(getStatus());
      if (running) { again = true; return running; }
      running = (async () => {
        try { await cycle(opts); }
        catch (e) { status.phase = (e && e.code) || "error"; status.error = (e && e.message) || String(e); }
        finally { status.waiting = waiting(); running = null; }
        if (again) { again = false; return run(); }
        return getStatus();
      })();
      return running;
    }
    function getStatus() { return Object.assign({}, status, { on: isOn(), waiting: waiting(), skippedFiles: status.skippedFiles.slice() }); }
    return { run, noteSave, status: getStatus, isOn,
      turnOn(opts) { kv.setItem(ON_KEY, "1"); return run(opts); },
      /* Before turning on: makes sure the account has a company (creating it if needed) and
         reports how many jobs the cloud already holds. */
      async prepare(companyName) {
        let who = await o.sync.session(true), created = false;
        if (!who.companyId) { await o.sync.createCompany(companyName); who = await o.sync.session(true); created = true; }
        if (!who.companyId) throw Object.assign(Error("The company could not be set up in the cloud."), { code: "no_company" });
        const pulled = await o.sync.pull({ since: null });
        return { role: who.role, created, cloudJobs: pulled.rows.sb_jobs.filter(r => !r.deleted_at).length };
      },
      /* After a sync: does the cloud hold exactly what this phone holds? */
      async verify() {
        const who = await o.sync.session();
        const pulled = await o.sync.pull({ since: null });
        const mine = Sync.toRows(o.getData(), who.companyId).rows;
        const counts = {}, missing = [];
        for (const table of Sync.TABLES) {
          if (!Sync.canWrite(who.role, table) && !pulled.rows[table].length) continue;
          const cloud = new Set(pulled.rows[table].filter(r => !r.deleted_at).map(r => r.id));
          counts[table] = cloud.size;
          mine[table].forEach(r => { if (!cloud.has(r.id)) missing.push(table + "|" + r.id); });
          if (cloud.size > mine[table].length) missing.push(table + "|(cloud has more)");
        }
        return { ok: missing.length === 0 && waiting() === 0, counts, missing, waiting: waiting(), skippedFiles: status.skippedFiles.slice() };
      },
      crewLogins: () => o.sync.crewLogins(),
      /* Off forgets what was synced, so turning on again sends this phone's current data afresh. */
      async turnOff() {
        kv.removeItem(ON_KEY); kv.removeItem(WHO_KEY);
        try { for (let i = (kv.length || 0) - 1; i >= 0; i--) { const k = kv.key(i); if (k && k.startsWith("shopBoardSyncCursor")) kv.removeItem(k); } } catch (e) {}
        if (running) { try { await running; } catch (e) {} }
        state = {}; status.phase = "idle"; status.error = null; status.lastSync = null;
        try { await o.store.save(state); } catch (e) {}
      } };
  }

  const api = { createEngine, scan, outgoing, settle, incoming, adopt, fingerprint, ON_KEY };
  if (inNode) { module.exports = api; return; }

  /* ---------------------------------------------------------------- in the app */
  if (!Sync || root.ShopBoardCloudSync) return;

  // The tracker's notes live in their own small database, outside the app's records and backups.
  let dbPromise = null;
  function db() {
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const req = root.indexedDB.open("SHOP_BOARD_SYNC_STATE", 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains("kv")) req.result.createObjectStore("kv"); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || Error("Sync notes could not be opened."));
    }).catch(e => { dbPromise = null; throw e; });
    return dbPromise;
  }
  const store = {
    async load() { const d = await db(); return new Promise((res, rej) => { const r = d.transaction("kv").objectStore("kv").get("state"); r.onsuccess = () => res(r.result || {}); r.onerror = () => rej(r.error); }); },
    async save(value) { const d = await db(); return new Promise((res, rej) => { const t = d.transaction("kv", "readwrite"); t.objectStore("kv").put(value, "state"); t.oncomplete = () => res(); t.onabort = t.onerror = () => rej(t.error); }); }
  };

  let plainSave = null, timer = null;
  const cloud = Sync.createSync();
  const engine = createEngine({
    sync: cloud, store, kv: root.localStorage,
    getData: () => root.DATA,
    async applyData(merged) {
      root.DATA = merged;
      await plainSave();
      if (typeof root.renderCurrentView === "function") root.renderCurrentView();
      if (typeof root.showToast === "function") root.showToast("Updated from the cloud");
    }
  });
  function soon(ms) { if (!engine.isOn()) return; clearTimeout(timer); timer = setTimeout(() => { if (navigator.onLine !== false) engine.run(); }, ms); }

  function setup() {
    if (document.body.getAttribute("data-shop-boot") === "loading" || typeof root.saveData !== "function" || !root.indexedDB) return;
    plainSave = root.saveData;
    root.saveData = async function () {
      const result = await plainSave.apply(this, arguments);
      if (engine.isOn()) engine.noteSave().then(() => soon(2000), () => soon(2000));
      return result;
    };
    root.addEventListener("online", () => soon(500));
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") soon(500); });
    setInterval(() => { if (document.visibilityState === "visible") soon(0); }, 120000);
    soon(1500);
  }
  root.ShopBoardCloudSync = { isOn: engine.isOn, status: engine.status, syncNow: () => engine.run(), turnOn: engine.turnOn, turnOff: engine.turnOff,
    prepare: engine.prepare, verify: engine.verify, crewLogins: engine.crewLogins,
    // Logins and people: who is signed in here, lead/crew sign-in, and the owner's people list.
    who() { try { return JSON.parse(root.localStorage.getItem(WHO_KEY) || "null"); } catch (e) { return null; } },
    session: force => cloud.session(force), signIn: cloud.signIn, signOutHere: cloud.signOutHere,
    people: cloud.people, addPerson: cloud.addPerson, setPerson: cloud.setPerson };
  if (root.ShopBoardBootPromise && typeof root.ShopBoardBootPromise.then === "function") root.ShopBoardBootPromise.then(setup); else setup();
})(typeof window !== "undefined" ? window : globalThis);
