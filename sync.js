/* Shop Board cloud sync — first slice.
   Standalone: nothing in the app loads this file yet, and it changes no saved data by itself.

   What it does
     session()            who is signed in, which company, which role (owner / lead / crew)
     pull()               rows changed on the server since the last sync, trashed rows included
     mergeIntoLocal()     folds pulled rows into the app's own data shape
     toRows()             turns the app's data into table rows, ready to push
     push()               sends rows up; the server decides "latest change wins"
     pushThenPull()       push, then fetch whatever the server kept instead

   Rules it follows (set by supabase/001_cloud_foundation.sql)
     - Owner and lead rows are saved with upsert. Add-only writes (crew notes, photos, everyone's
       receipts but the owner's) are inserted with "ignore duplicates", because an upsert would hit
       the update rule and fail.
     - An update carrying an older edited_at is dropped silently by the server. Push reports those
       rows as serverWins; the answer is to pull again.
     - Money (sb_job_money, sb_bills) is owner only. A lead or crew pull gets nothing back for it.
     - Receipt photos are no longer copied into job photos.

   Photos, receipts and documents
     On the phone these hold their image as embedded data. Push sends each file to the private
     storage bucket first and only then its row (add-only roles cannot fix a row afterwards). A
     file that fails to upload stops the push with its row unsent, so it is retried next time.
     downloadFile(path) brings one back as embedded data for the app to show.
     Paths: <company id>/<job id>/<photos|receipts|files>/<file name>.
     Pass uploadFile: false to hold such records back (listed as waitingForUpload) instead. */
(function (root) {
  "use strict";

  const PROJECT = "https://pgnhbcauvugxbbylxzye.supabase.co";
  const KEY = "sb_publishable_xvVqeoyGvl-aVyIr8wWnDw_a8LWBtlL";
  const BUCKET = "shop-board";
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const REFRESH_KEY = "shopBoardCloudRefreshToken"; // the sign-in cloud.js saves
  const CURSOR_KEY = "shopBoardSyncCursor";
  const PAGE = 1000;
  const CHUNK = 200;
  const ID_OK = /^[A-Za-z0-9_:.-]{1,200}$/;
  const DAY_OK = /^\d{4}-\d{2}-\d{2}$/;
  const JOB_STATUSES = ["Lead", "Quoted", "Scheduled", "On site", "Waiting", "Done", "Paid"];

  // Parents before children, so a new job exists before its notes arrive.
  const TABLES = ["sb_crew", "sb_clients", "sb_jobs", "sb_job_assignments", "sb_notes", "sb_photos",
    "sb_files", "sb_expenses", "sb_bills", "sb_job_money"];
  const MONEY_TABLES = ["sb_bills", "sb_job_money"];

  // How each role may write each table: "upsert", "insert" (add-only) or absent (not allowed).
  const WRITE = {
    owner: Object.fromEntries(TABLES.map(t => [t, "upsert"])),
    lead: { sb_clients: "upsert", sb_jobs: "upsert", sb_job_assignments: "upsert", sb_notes: "upsert",
      sb_photos: "upsert", sb_files: "upsert", sb_expenses: "insert" },
    crew: { sb_notes: "insert", sb_photos: "insert", sb_expenses: "insert" }
  };

  const ROSTER_ROLE = { lead: "Lead", crew: "Crew" };
  function problem(message, code, extra) { return Object.assign(Error(message), { code }, extra || {}); }
  function text(v) { return typeof v === "string" ? v : ""; }
  function iso(v) { return typeof v === "string" && v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null; }
  function day(v) { return DAY_OK.test(v || "") ? v : ""; }
  function money(v) { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0; }
  function typedMoney(v) { return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : null; }
  function isData(v) { return typeof v === "string" && v.startsWith("data:"); }
  function fileExt(dataUrl, fallback) {
    const m = /^data:([a-z]+)\/([a-z0-9.+-]+)/i.exec(dataUrl || "");
    if (!m) return fallback;
    const sub = m[2].toLowerCase();
    return sub === "jpeg" ? "jpg" : sub === "svg+xml" ? "svg" : /^[a-z0-9]{1,8}$/.test(sub) ? sub : fallback;
  }
  function storagePath(companyId, jobId, kind, name) { return [companyId, jobId, kind, name].join("/"); }

  /* ------------------------------------------------------------------ mapping: phone -> tables */

  // Every row for a table carries the same keys, so rows can be sent in one batch.
  function stamp(row, rec, ctx) {
    row.company_id = ctx.companyId;
    row.edited_at = iso(rec && rec.editedAt) || ctx.editedAt;
    row.deleted_at = iso(rec && rec.deletedAt);
    return row;
  }
  const toRow = {
    crew: (c, ctx) => stamp({ id: c.id, name: text(c.name), phone: text(c.phone), email: text(c.email), role: text(c.role) || "Crew" }, c, ctx),
    client: (c, ctx) => stamp({ id: c.id, name: text(c.name), phone: text(c.phone), email: text(c.email), address: text(c.address), project_notes: text(c.projectNotes) }, c, ctx),
    job: (j, ctx) => stamp({ id: j.id, name: text(j.name), trade: text(j.trade), client_id: text(j.clientId), address: text(j.address),
      status: JOB_STATUSES.includes(j.status) ? j.status : "Lead", start_date: day(j.startDate) }, j, ctx),
    assignment: (jobId, crewId, ctx, rec) => stamp({ id: jobId + ":" + crewId, job_id: jobId, crew_id: crewId }, rec, ctx),
    note: (n, jobId, ctx) => stamp({ id: n.id, job_id: jobId, body: text(n.text), tag: text(n.tag), author_name: text(n.author),
      noted_at: iso(n.createdAt), legacy_when: text(n.timestamp) }, n, ctx),
    photo: (p, jobId, ctx) => stamp({ id: p.id, job_id: jobId, storage_path: text(p.storagePath), url: isData(p.url) ? "" : text(p.url),
      tag: text(p.tag), caption: text(p.caption), author_name: text(p.author), taken_at: iso(p.createdAt), legacy_when: text(p.timestamp) }, p, ctx),
    file: (f, jobId, ctx) => stamp({ id: f.id, job_id: jobId, name: text(f.name), storage_path: text(f.storagePath), mime: text(f.type),
      size_label: text(f.size), author_name: text(f.author), legacy_when: text(f.date) }, f, ctx),
    expense: (e, jobId, ctx) => stamp({ id: e.id, job_id: jobId, description: text(e.desc), amount: money(e.amount), category: text(e.category) || "Materials",
      day: day(e.day), legacy_when: text(e.date), storage_path: text(e.storagePath), author_name: text(e.author) }, e, ctx),
    bill: (b, jobId, ctx) => stamp({ id: b.id, job_id: jobId, description: text(b.desc), amount: money(b.amount), status: b.status === "Paid" ? "Paid" : "Unpaid",
      number: Number.isInteger(b.number) ? b.number : null, billed_at: iso(b.createdAt), due_date: day(b.dueDate), paid_at: b.status === "Paid" ? iso(b.paidAt) : null }, b, ctx),
    jobMoney: (j, ctx) => {
      const quote = (Array.isArray(j.quotes) && j.quotes[0]) || {};
      const items = (Array.isArray(quote.items) ? quote.items : []).map(it => ({ desc: text(it.desc), qty: Number(it.qty) || 0, rate: Number(it.rate) || 0 }));
      return stamp({ id: j.id, quote_items: items, quote_status: text(quote.status) || "Draft",
        money_billed: typedMoney(j.moneyBilled), money_collected: typedMoney(j.moneyCollected) }, { editedAt: j.moneyEditedAt || j.editedAt }, ctx);
    },
    company: (b, ctx) => ({ id: ctx.companyId, name: text(b.name), phone: text(b.phone), logo: text(b.logoDataUrl),
      next_invoice_number: Number.isInteger(b.nextInvoiceNumber) ? b.nextInvoiceNumber : 1001, edited_at: iso(b.editedAt) || ctx.editedAt })
  };

  // The old receipt flow dropped a copy of each receipt image into job photos, with the amount in
  // the caption ("Lumber - $42.10 (e_abc)"). Those copies must not reach the shared photo list.
  function isReceiptCopy(photo, job) {
    if (!photo || photo.tag !== "Receipt") return false;
    const m = /\(([^()]+)\)\s*$/.exec(text(photo.caption));
    return Boolean(m && (job.expenses || []).some(e => e.id === m[1]));
  }

  /* Turns the app's whole data object into rows per table.
     Returns { rows, company, uploads, skipped }:
       uploads  files that must reach storage first: { table, id, jobId, path, dataUrl, mime }
       skipped  records left out and why (bad id, receipt photo copy) */
  function toRows(data, companyId, options) {
    const ctx = { companyId, editedAt: iso(options && options.editedAt) || new Date().toISOString() };
    const rows = Object.fromEntries(TABLES.map(t => [t, []]));
    const uploads = [], skipped = [];
    const good = (table, rec) => { if (rec && ID_OK.test(text(rec.id))) return true; skipped.push({ table, id: rec && rec.id, why: "bad id" }); return false; };
    const hold = (table, row, jobId, kind, dataUrl, fallbackExt, mime) => {
      if (!isData(dataUrl) || row.storage_path) return;
      const path = storagePath(companyId, jobId, kind, row.id + "." + fileExt(dataUrl, fallbackExt));
      row.storage_path = path;
      uploads.push({ table, id: row.id, jobId, path, dataUrl, mime: mime || (/^data:([^;,]+)/.exec(dataUrl) || [])[1] || "" });
    };

    (data.crewMembers || []).forEach(c => { if (good("sb_crew", c)) rows.sb_crew.push(toRow.crew(c, ctx)); });
    (data.clients || []).forEach(c => { if (good("sb_clients", c)) rows.sb_clients.push(toRow.client(c, ctx)); });
    const crewIds = new Set(rows.sb_crew.map(r => r.id));
    (data.jobs || []).forEach(job => {
      if (!good("sb_jobs", job)) return;
      rows.sb_jobs.push(toRow.job(job, ctx));
      (job.crewAssigned || []).forEach(crewId => { if (crewIds.has(crewId)) rows.sb_job_assignments.push(toRow.assignment(job.id, crewId, ctx)); });
      (job.notes || []).forEach(n => { if (good("sb_notes", n)) rows.sb_notes.push(toRow.note(n, job.id, ctx)); });
      (job.photos || []).forEach(p => {
        if (isReceiptCopy(p, job)) { skipped.push({ table: "sb_photos", id: p.id, why: "receipt photo copy" }); return; }
        if (!good("sb_photos", p)) return;
        const row = toRow.photo(p, job.id, ctx); hold("sb_photos", row, job.id, "photos", p.url, "jpg"); rows.sb_photos.push(row);
      });
      (job.files || []).forEach(f => {
        if (!good("sb_files", f)) return;
        const row = toRow.file(f, job.id, ctx); hold("sb_files", row, job.id, "files", f.dataUrl, "pdf", f.type); rows.sb_files.push(row);
      });
      (job.expenses || []).forEach(e => {
        if (!good("sb_expenses", e)) return;
        const row = toRow.expense(e, job.id, ctx); hold("sb_expenses", row, job.id, "receipts", e.photoUrl, "jpg"); rows.sb_expenses.push(row);
      });
      (job.bills || []).forEach(b => { if (good("sb_bills", b)) rows.sb_bills.push(toRow.bill(b, job.id, ctx)); });
      rows.sb_job_money.push(toRow.jobMoney(job, ctx));
    });
    return { rows, company: data.business ? toRow.company(data.business, ctx) : null, uploads, skipped };
  }

  /* ------------------------------------------------------------------ mapping: tables -> phone */

  // Edit times are tracked beside the data (syncwire.js), not inside it, so saved records keep
  // the exact shape the app and its backups already know.
  const meta = () => ({});
  const toLocal = {
    crew: r => ({ id: r.id, name: r.name, phone: r.phone, email: r.email, role: r.role, ...(r.user_id ? { userId: r.user_id } : {}), ...meta(r) }),
    client: r => ({ id: r.id, name: r.name, phone: r.phone, email: r.email, address: r.address, projectNotes: r.project_notes, ...meta(r) }),
    jobFields: r => ({ id: r.id, name: r.name, trade: r.trade, clientId: r.client_id, address: r.address, status: r.status, startDate: r.start_date, ...meta(r) }),
    note: r => ({ id: r.id, author: r.author_name, text: r.body, tag: r.tag, timestamp: r.legacy_when, createdAt: r.noted_at || "", ...meta(r) }),
    // url stays empty for a stored image; showing it from storagePath is the upload slice's job.
    photo: r => ({ id: r.id, url: r.url, storagePath: r.storage_path, tag: r.tag, caption: r.caption, author: r.author_name, timestamp: r.legacy_when, createdAt: r.taken_at || "", ...meta(r) }),
    file: r => ({ id: r.id, name: r.name, dataUrl: null, storagePath: r.storage_path, type: r.mime, size: r.size_label, author: r.author_name, date: r.legacy_when, ...meta(r) }),
    expense: r => ({ id: r.id, desc: r.description, amount: Number(r.amount) || 0, category: r.category, day: r.day, date: r.legacy_when, photoUrl: null, storagePath: r.storage_path, author: r.author_name, ...meta(r) }),
    bill: r => { const b = { id: r.id, desc: r.description, amount: Number(r.amount) || 0, status: r.status, createdAt: r.billed_at || "", dueDate: r.due_date, ...meta(r) };
      if (r.number !== null && r.number !== undefined) b.number = r.number; if (r.status === "Paid" && r.paid_at) b.paidAt = r.paid_at; return b; }
  };
  function blankJob(id) {
    return { id, name: "", trade: "", clientId: "", address: "", status: "Lead", startDate: "", crewAssigned: [], photos: [], files: [], notes: [],
      quotes: [{ items: [], status: "Draft" }], bills: [], expenses: [] };
  }
  // An empty or default value never adds a field an existing record did not have.
  function quiet(old, local) {
    Object.keys(local).forEach(k => { if (!(k in old) && (local[k] === "" || local[k] === null || (k === "category" && local[k] === "Materials"))) delete local[k]; });
    return local;
  }
  // Adds, replaces or (when trashed on the server) removes one record in a list, keeping any
  // image the phone still holds for it.
  function place(list, row, local, newestFirst, clear) {
    const at = list.findIndex(x => x.id === row.id);
    if (row.deleted_at) { if (at >= 0) list.splice(at, 1); return; }
    if (at >= 0) {
      const old = list[at];
      ["url", "dataUrl", "photoUrl"].forEach(k => { if (isData(old[k]) && !local[k]) local[k] = old[k]; });
      // Laid over the old record, so anything only the phone knows about it is kept, and an
      // empty value never adds a field the record did not have.
      quiet(old, local);
      list[at] = Object.assign(old, local);
      (clear || []).forEach(k => { if (!(k in local)) delete old[k]; });
    } else if (newestFirst) list.unshift(local); else list.push(local);
  }

  /* Folds pulled rows into a copy of the app's data and returns the copy. The original is not
     changed. Trashed rows disappear from the copy; money tables may simply be missing. */
  function mergeIntoLocal(data, pulled) {
    const out = JSON.parse(JSON.stringify(data || {}));
    const rows = (pulled && pulled.rows) || {};
    const of = t => rows[t] || [];
    out.business = out.business || {}; out.crewMembers = out.crewMembers || []; out.clients = out.clients || []; out.jobs = out.jobs || [];

    if (pulled && pulled.company) {
      const c = pulled.company;
      out.business.name = c.name;
      if (c.phone || "phone" in out.business) out.business.phone = c.phone;
      if (c.next_invoice_number !== 1001 || "nextInvoiceNumber" in out.business) out.business.nextInvoiceNumber = c.next_invoice_number;
      if (c.logo) out.business.logoDataUrl = c.logo; else delete out.business.logoDataUrl;
    }
    of("sb_crew").forEach(r => place(out.crewMembers, r, toLocal.crew(r)));
    of("sb_clients").forEach(r => place(out.clients, r, toLocal.client(r)));
    of("sb_jobs").forEach(r => {
      const at = out.jobs.findIndex(j => j.id === r.id);
      if (r.deleted_at) { if (at >= 0) out.jobs.splice(at, 1); return; }
      if (at >= 0) Object.assign(out.jobs[at], quiet(out.jobs[at], toLocal.jobFields(r))); else out.jobs.unshift(Object.assign(blankJob(r.id), toLocal.jobFields(r)));
    });
    // A child row whose job this person cannot see (or that was trashed) has nowhere to go.
    const jobOf = id => out.jobs.find(j => j.id === id);
    const child = (table, key, make, newestFirst, clear) => of(table).forEach(r => {
      const job = jobOf(r.job_id); if (!job) return;
      if (!Array.isArray(job[key])) job[key] = [];
      place(job[key], r, make(r), newestFirst, clear);
    });
    of("sb_job_assignments").forEach(r => {
      const job = jobOf(r.job_id); if (!job) return;
      const list = Array.isArray(job.crewAssigned) ? job.crewAssigned : (job.crewAssigned = []);
      const at = list.indexOf(r.crew_id);
      if (r.deleted_at) { if (at >= 0) list.splice(at, 1); } else if (at < 0) list.push(r.crew_id);
    });
    child("sb_notes", "notes", toLocal.note, false);
    child("sb_photos", "photos", toLocal.photo, true);
    child("sb_files", "files", toLocal.file, true);
    child("sb_expenses", "expenses", toLocal.expense, true);
    child("sb_bills", "bills", toLocal.bill, false, ["paidAt", "number"]);
    of("sb_job_money").forEach(r => {
      const job = jobOf(r.id); if (!job || r.deleted_at) return;
      job.quotes = [{ items: Array.isArray(r.quote_items) ? r.quote_items : [], status: r.quote_status || "Draft" }];
      if (r.money_billed === null || r.money_billed === undefined) delete job.moneyBilled; else job.moneyBilled = Number(r.money_billed);
      if (r.money_collected === null || r.money_collected === undefined) delete job.moneyCollected; else job.moneyCollected = Number(r.money_collected);
    });
    return out;
  }

  /* ------------------------------------------------------------------ talking to the server */

  function createSync(options) {
    options = options || {};
    const doFetch = options.fetch || (typeof fetch === "function" ? (url, init) => root.fetch(url, init) : null);
    const store = options.storage || (function () { try { return root.localStorage || null; } catch (e) { return null; } })();
    const uploadFile = options.uploadFile === false ? null : options.uploadFile || sendFile; // ({path, dataUrl, mime, bucket}) => Promise
    let access = null, who = null;

    async function request(path, o) {
      o = o || {};
      if (!doFetch) throw problem("This device cannot reach the cloud.", "offline", { network: true });
      const headers = { apikey: KEY, Accept: "application/json" };
      if (o.token) headers.Authorization = "Bearer " + o.token;
      if (o.raw) headers["Content-Type"] = o.contentType || "application/octet-stream";
      else if (o.body !== undefined) headers["Content-Type"] = "application/json";
      if (o.prefer) headers.Prefer = o.prefer;
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), o.timeout || 30000) : null;
      let response;
      try {
        response = await doFetch(PROJECT + path, { method: o.method || "GET", headers, body: o.raw || (o.body === undefined ? undefined : JSON.stringify(o.body)),
          cache: "no-store", credentials: "omit", signal: controller ? controller.signal : undefined });
      } catch (e) {
        throw problem("Could not reach the cloud. Changes stay on this phone and will be sent later.", "offline", { network: true });
      } finally { if (timer) clearTimeout(timer); }
      let data = null;
      if (o.binary && response.ok) return { ok: true, status: response.status, bytes: new Uint8Array(await response.arrayBuffer()),
        mime: (response.headers && response.headers.get && response.headers.get("content-type")) || "" };
      if (response.status !== 204) { const raw = await response.text(); if (raw) { try { data = JSON.parse(raw); } catch (e) { data = null; } } }
      return { ok: response.ok, status: response.status, data };
    }
    function failed(r, step) {
      const code = r.data && (r.data.code || r.data.error_code);
      const net = r.status === 429 || r.status >= 500;
      const denied = r.status === 401 || r.status === 403 || code === "42501";
      return problem(step + " did not go through (" + r.status + (code ? ", " + code : "") + ").", denied ? "denied" : net ? "offline" : "rejected",
        { network: net, status: r.status, detail: text(r.data && (r.data.message || r.data.msg)) });
    }

    /* Sign-in is cloud.js's job. This reuses the sign-in it saved on the phone to get a working
       pass, and saves the replacement the server hands back each time. A caller may supply its
       own getToken instead. Nothing here ever sees a password. */
    async function token() {
      if (options.getToken) return options.getToken();
      if (access && Date.now() < access.expiresAt - 30000) return access.token;
      let saved = null; try { saved = store && store.getItem(REFRESH_KEY); } catch (e) {}
      if (!saved) throw problem("Sign in to the cloud first.", "signed_out");
      const r = await request("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: { refresh_token: saved } });
      if (!r.ok) { if (r.status === 429 || r.status >= 500) throw failed(r, "Sign-in check"); throw problem("The saved sign-in is no longer good. Sign in again.", "signed_out"); }
      if (!r.data || typeof r.data.access_token !== "string") throw problem("The saved sign-in is no longer good. Sign in again.", "signed_out");
      if (typeof r.data.refresh_token === "string") { try { store.setItem(REFRESH_KEY, r.data.refresh_token); } catch (e) {} }
      access = { token: r.data.access_token, expiresAt: Date.now() + (Number(r.data.expires_in) || 3600) * 1000 };
      return access.token;
    }

    /* ---- files in storage ---- */
    function objectUrl(kind, path) { return "/storage/v1/object/" + kind + BUCKET + "/" + String(path).split("/").map(encodeURIComponent).join("/"); }
    function dataUrlBytes(dataUrl) {
      const m = /^data:([^;,]*)((?:;[^;,]*)*),(.*)$/s.exec(dataUrl || "");
      if (!m) throw problem("This file could not be read for upload.", "rejected");
      if (!/;base64$/i.test(m[2])) return { mime: m[1], bytes: new TextEncoder().encode(decodeURIComponent(m[3])) };
      const bin = atob(m[3]), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return { mime: m[1], bytes };
    }
    /* Puts one file in the bucket. A file already there is fine: the same id always means the same file. */
    async function sendFile(f) {
      const part = dataUrlBytes(f.dataUrl);
      const r = await request(objectUrl("", f.path), { method: "POST", token: await token(), raw: part.bytes, contentType: f.mime || part.mime, timeout: 120000 });
      const dup = r.status === 409 || (r.data && (String(r.data.statusCode) === "409" || r.data.error === "Duplicate"));
      if (!r.ok && !dup) throw failed(r, "Uploading a file");
      return { path: f.path, alreadyThere: Boolean(dup) };
    }
    /* Fetches one stored file as embedded data (a data: address) the app can show or save. */
    async function downloadFile(path, mime) {
      const r = await request(objectUrl("authenticated/", path), { token: await token(), binary: true, timeout: 120000 });
      if (!r.ok) throw failed(r, "Fetching a file");
      let bin = "";
      for (let i = 0; i < r.bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, r.bytes.subarray(i, i + 0x8000));
      return "data:" + (mime || r.mime.split(";")[0] || "application/octet-stream") + ";base64," + btoa(bin);
    }

    /* Who is signed in, their company and role. role is null when the account belongs to no
       company yet; a removed account gets code "removed" so the app can say so. */
    async function session(force) {
      if (who && !force) return who;
      const t = await token();
      const u = await request("/auth/v1/user", { token: t });
      if (!u.ok || !u.data || !u.data.id) throw u.ok ? problem("Sign in to the cloud first.", "signed_out") : failed(u, "Sign-in check");
      const m = await request("/rest/v1/sb_members?select=company_id,role,status&user_id=eq." + encodeURIComponent(u.data.id), { token: t });
      if (!m.ok) throw failed(m, "Company check");
      const list = Array.isArray(m.data) ? m.data : [];
      const pick = list.find(x => x.status === "active" && (!options.companyId || x.company_id === options.companyId));
      // A removed person can no longer read the members table at all, so "no rows" after having
      // been a member before also means removed.
      const before = cursorOwner();
      if (!pick && (list.some(x => x.status === "removed") || before === u.data.id))
        throw problem("This account was removed from the company. Its changes can no longer be sent.", "removed");
      who = { userId: u.data.id, email: text(u.data.email), companyId: pick ? pick.company_id : null, role: pick ? pick.role : null };
      return who;
    }
    async function member() {
      const s = await session();
      if (!s.companyId) throw problem("This account is not part of a company yet.", "no_company");
      return s;
    }

    function cursorKey(s) { return CURSOR_KEY + ":" + s.companyId + ":" + s.userId; }
    function cursorOwner() { try { return store && store.getItem(CURSOR_KEY + ":user"); } catch (e) { return null; } }
    function lastSync(s) { try { return (store && store.getItem(cursorKey(s))) || null; } catch (e) { return null; } }
    /* Call after pulled rows are safely saved on the phone, never before. */
    async function saveCursor(cursor) {
      const s = await member();
      if (!cursor) return;
      try { store.setItem(cursorKey(s), cursor); store.setItem(CURSOR_KEY + ":user", s.userId); } catch (e) {}
    }

    async function readAll(table, s, since, t) {
      const out = [];
      for (let from = 0; ; from += PAGE) {
        // gte, not gt: a row saved in the same instant as the last one seen must not be missed.
        const path = "/rest/v1/" + table + "?select=*&company_id=eq." + s.companyId + (since ? "&updated_at=gte." + encodeURIComponent(since) : "") +
          "&order=updated_at.asc,id.asc&limit=" + PAGE + "&offset=" + from;
        const r = await request(path, { token: t });
        if (!r.ok) {
          // Money tables answer "not yours" for anyone but the owner; that is expected, not a fault.
          if (MONEY_TABLES.includes(table) && (r.status === 401 || r.status === 403)) return [];
          throw failed(r, "Fetching " + table);
        }
        const page = Array.isArray(r.data) ? r.data : [];
        out.push(...page);
        if (page.length < PAGE) return out;
      }
    }

    /* Everything this person may see that changed since the last sync (or since `since`; pass
       since: null for everything). Returns { rows, company, cursor, role }. Hand the result to
       mergeIntoLocal, save, then saveCursor(result.cursor). */
    async function pull(o) {
      o = o || {};
      const s = await member(), t = await token();
      const since = o.since !== undefined ? o.since : lastSync(s);
      const rows = {};
      let cursor = since || null;
      for (const table of TABLES) {
        rows[table] = s.role !== "owner" && MONEY_TABLES.includes(table) ? [] : await readAll(table, s, since, t);
        rows[table].forEach(r => { if (r.updated_at && (!cursor || Date.parse(r.updated_at) > Date.parse(cursor))) cursor = r.updated_at; });
      }
      const c = await request("/rest/v1/sb_companies?select=*&id=eq." + s.companyId, { token: t });
      if (!c.ok) throw failed(c, "Fetching company");
      return { rows, company: (Array.isArray(c.data) && c.data[0]) || null, cursor, role: s.role, since };
    }

    /* Sends rows up. `changes` is { rows: { sb_jobs: [...], ... }, company?, uploads? } — the shape
       toRows returns, or any subset of it. Returns a plain report:
         saved            rows the server took
         serverWins       rows the server kept its own newer copy of -> pull again
         alreadyThere     add-only rows that were on the server already
         notAllowed       rows this role may not send (left on the phone)
         uploaded         files sent to storage ahead of their rows
         waitingForUpload rows held back because uploading is switched off
         needsPull        true when serverWins is not empty
       changes.trashed is a list of { table, id, editedAt } to move to the trash (owner, and lead
       for the tables a lead may edit). Nothing is ever hard-deleted. */
    async function push(changes) {
      const s = await member(), t = await token();
      const rules = WRITE[s.role] || {};
      const report = { role: s.role, saved: [], serverWins: [], alreadyThere: [], notAllowed: [], waitingForUpload: [], uploaded: [], needsPull: false };
      const note = (list, table, rows) => rows.forEach(r => list.push({ table, id: r.id }));
      const pending = new Map();
      ((changes && changes.uploads) || []).forEach(u => pending.set(u.table + "|" + u.id, u));

      for (const table of TABLES) {
        let rows = ((changes && changes.rows && changes.rows[table]) || []).map(r => Object.assign({}, r, { company_id: s.companyId }));
        if (!rows.length) continue;
        const mode = rules[table];
        if (!mode) { note(report.notAllowed, table, rows); continue; }
        const ready = [];
        for (const row of rows) {
          const up = pending.get(table + "|" + row.id);
          if (!up) { ready.push(row); continue; }
          if (!uploadFile) { report.waitingForUpload.push({ table, id: row.id, path: up.path }); continue; }
          try { await uploadFile({ bucket: BUCKET, path: up.path, dataUrl: up.dataUrl, mime: up.mime }); }
          catch (e) { throw Object.assign(e, { report }); }
          report.uploaded.push({ table, id: row.id, path: up.path });
          ready.push(row);
        }
        const query = "/rest/v1/" + table + "?on_conflict=company_id,id";
        const prefer = (mode === "upsert" ? "resolution=merge-duplicates" : "resolution=ignore-duplicates") + ",return=representation";
        for (let i = 0; i < ready.length; i += CHUNK) {
          const batch = ready.slice(i, i + CHUNK);
          const r = await request(query + "&select=id", { method: "POST", token: t, body: batch, prefer });
          if (!r.ok) throw Object.assign(failed(r, "Saving " + table), { report });
          const kept = new Set((Array.isArray(r.data) ? r.data : []).map(x => x.id));
          batch.forEach(row => (kept.has(row.id) ? report.saved : mode === "upsert" ? report.serverWins : report.alreadyThere).push({ table, id: row.id }));
        }
      }
      // Trash: mark rows deleted. Grouped by time so each group is one request.
      const groups = new Map();
      ((changes && changes.trashed) || []).forEach(x => {
        if (rules[x.table] !== "upsert") { report.notAllowed.push({ table: x.table, id: x.id }); return; }
        const when = iso(x.editedAt) || new Date().toISOString(), k = x.table + "|" + when;
        if (!groups.has(k)) groups.set(k, { table: x.table, when, ids: [] });
        groups.get(k).ids.push(x.id);
      });
      for (const g of groups.values()) {
        for (let i = 0; i < g.ids.length; i += CHUNK) {
          const ids = g.ids.slice(i, i + CHUNK);
          const r = await request("/rest/v1/" + g.table + "?company_id=eq." + s.companyId + "&id=in.(" + ids.map(x => '"' + x + '"').join(",") + ")&select=id",
            { method: "PATCH", token: t, body: { deleted_at: g.when, edited_at: g.when }, prefer: "return=representation" });
          if (!r.ok) throw Object.assign(failed(r, "Trashing in " + g.table), { report });
          const kept = new Set((Array.isArray(r.data) ? r.data : []).map(x => x.id));
          ids.forEach(id => (kept.has(id) ? report.saved : report.serverWins).push({ table: g.table, id }));
        }
      }
      if (changes && changes.company) {
        if (s.role !== "owner") report.notAllowed.push({ table: "sb_companies", id: s.companyId });
        else {
          const body = Object.assign({}, changes.company); delete body.id;
          const r = await request("/rest/v1/sb_companies?id=eq." + s.companyId + "&select=id", { method: "PATCH", token: t, body, prefer: "return=representation" });
          if (!r.ok) throw Object.assign(failed(r, "Saving company"), { report });
          (Array.isArray(r.data) && r.data.length ? report.saved : report.serverWins).push({ table: "sb_companies", id: s.companyId });
        }
      }
      report.needsPull = report.serverWins.length > 0;
      return report;
    }

    /* Starts this account's company (it becomes the owner). Until public sign-up opens the
       server only allows this for the original Shop Board owner account. */
    async function createCompany(name) {
      const clean = String(name || "").trim().slice(0, 80) || "My Company";
      const r = await request("/rest/v1/rpc/sb_create_company", { method: "POST", token: await token(), body: { p_name: clean } });
      if (!r.ok) throw failed(r, "Setting up the company in the cloud");
      who = null;
      return r.data;
    }
    /* How many lead/crew logins the company has besides owners. */
    async function crewLogins() {
      const s = await member();
      const r = await request("/rest/v1/sb_members?select=user_id&company_id=eq." + s.companyId + "&status=eq.active&role=neq.owner", { token: await token() });
      if (!r.ok) throw failed(r, "Checking crew logins");
      return Array.isArray(r.data) ? r.data.length : 0;
    }

    /* Sign-in for a lead or crew login (the owner still signs in through cloud.js). The password
       goes straight to the sign-in server and is not kept; only the saved sign-in is stored. */
    async function signIn(email, password) {
      if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) throw problem("Enter your email and password.", "rejected");
      const r = await request("/auth/v1/token?grant_type=password", { method: "POST", body: { email: email.trim(), password } });
      if (!r.ok) {
        if (r.status === 429 || r.status >= 500) throw failed(r, "Sign-in");
        throw problem("Email or password was not accepted.", "signed_out");
      }
      if (!r.data || typeof r.data.access_token !== "string" || typeof r.data.refresh_token !== "string") throw problem("Sign-in did not complete. Try again.", "signed_out");
      try { store.setItem(REFRESH_KEY, r.data.refresh_token); } catch (e) {}
      access = { token: r.data.access_token, expiresAt: Date.now() + (Number(r.data.expires_in) || 3600) * 1000 };
      who = null;
      return session(true);
    }
    /* Forget this phone's sign-in (and tell the server, if it can be reached). */
    async function signOutHere() {
      let t = access && access.token;
      if (!t) { try { t = await token(); } catch (e) { t = null; } }
      access = null; who = null;
      try { store.removeItem(REFRESH_KEY); } catch (e) {}
      if (t) { try { await request("/auth/v1/logout?scope=local", { method: "POST", token: t }); } catch (e) {} }
    }

    /* Everyone with a login in this company, matched to their name on the crew list. */
    async function people() {
      const s = await member(), t = await token();
      const [m, c, co] = await Promise.all([
        request("/rest/v1/sb_members?select=user_id,role,status,created_at&company_id=eq." + s.companyId + "&order=created_at", { token: t }),
        request("/rest/v1/sb_crew?select=id,name,role,user_id&company_id=eq." + s.companyId + "&deleted_at=is.null", { token: t }),
        request("/rest/v1/sb_companies?select=seat_limit&id=eq." + s.companyId, { token: t })]);
      if (!m.ok) throw failed(m, "Reading the people list");
      if (!c.ok) throw failed(c, "Reading the crew list");
      const roster = Array.isArray(c.data) ? c.data : [];
      const list = (Array.isArray(m.data) ? m.data : []).map(x => {
        const r = roster.find(k => k.user_id === x.user_id);
        return { userId: x.user_id, role: x.role, status: x.status, me: x.user_id === s.userId, crewId: r ? r.id : null, name: r ? text(r.name) : "", rosterRole: r ? text(r.role) : "" };
      });
      const limit = co.ok && Array.isArray(co.data) && co.data[0] ? Number(co.data[0].seat_limit) : null;
      return { seatLimit: limit, used: list.filter(p => p.status === "active" && p.role !== "owner").length, people: list,
        roster: roster.map(r => ({ id: r.id, name: text(r.name), userId: r.user_id || null })) };
    }
    /* Points a crew-list entry at a login, so "assigned to this person" means that login. */
    async function linkRoster(userId, crewId, role) {
      const s = await member(), t = await token(), stamp = new Date().toISOString();
      const base = "/rest/v1/sb_crew?company_id=eq." + s.companyId;
      // The new name is matched first, so a failure never leaves the login matched to nobody.
      if (crewId) {
        const on = await request(base + "&id=eq." + encodeURIComponent(crewId), { method: "PATCH", token: t, prefer: "return=representation", body: Object.assign({ user_id: userId, edited_at: stamp }, ROSTER_ROLE[role] ? { role: ROSTER_ROLE[role] } : {}) });
        if (!on.ok) throw failed(on, "Updating the crew list");
        if (!Array.isArray(on.data) || !on.data.length) throw problem("That person is not on the cloud's crew list yet. Sync first, then try again.", "rejected");
      }
      const off = await request(base + "&user_id=eq." + userId + (crewId ? "&id=neq." + encodeURIComponent(crewId) : ""), { method: "PATCH", token: t, body: { user_id: null, role: "Crew", edited_at: stamp } });
      if (!off.ok) throw failed(off, "Updating the crew list");
    }
    /* The crew list shows a lead as "Lead", so everyone on a job can see who is running it. */
    async function markRoster(userId, role) {
      if (!ROSTER_ROLE[role]) return;
      const s = await member();
      const r = await request("/rest/v1/sb_crew?company_id=eq." + s.companyId + "&user_id=eq." + userId, { method: "PATCH", token: await token(), body: { role: ROSTER_ROLE[role], edited_at: new Date().toISOString() } });
      if (!r.ok) throw failed(r, "Updating the crew list");
    }
    /* Owner only: gives a login a place in the company as lead or crew. */
    async function addPerson(userId, role, crewId) {
      if (!UUID.test(String(userId || ""))) throw problem("That login code does not look right. It is 36 letters and numbers with dashes.", "rejected");
      if (role !== "lead" && role !== "crew") throw problem("Choose Lead or Crew.", "rejected");
      const s = await member(), t = await token();
      if (userId.toLowerCase() === s.userId) throw problem("That is your own login code. Paste the code from the other person's phone.", "rejected");
      const r = await request("/rest/v1/sb_members?on_conflict=company_id,user_id", { method: "POST", token: t,
        prefer: "resolution=merge-duplicates,return=representation", body: [{ company_id: s.companyId, user_id: userId.toLowerCase(), role, status: "active" }] });
      if (!r.ok) {
        const e = failed(r, "Adding this login");
        if (/crew seats/i.test(e.detail)) throw problem(e.detail, "rejected");
        if (e.detail && /foreign key|not present/i.test(e.detail)) throw problem("No login exists with that code. Check it was copied in full.", "rejected");
        throw e;
      }
      await linkRoster(userId.toLowerCase(), crewId || null, role);
    }
    /* Owner only: change a login's role, remove it from the company, or let it back in. */
    async function setPerson(userId, change) {
      const s = await member(), body = {};
      let now = null; // the role this login ends up with; a removed login counts as plain crew on the list
      if (userId === s.userId) throw problem("You cannot change your own login here.", "rejected");
      if (change && (change.role === "lead" || change.role === "crew")) body.role = change.role;
      if (change && (change.status === "active" || change.status === "removed")) body.status = change.status;
      if (Object.keys(body).length) {
        const r = await request("/rest/v1/sb_members?company_id=eq." + s.companyId + "&user_id=eq." + userId, { method: "PATCH", token: await token(), prefer: "return=representation", body });
        if (!r.ok) { const e = failed(r, "Changing this login"); if (/crew seats|at least one owner/i.test(e.detail)) throw problem(e.detail, "rejected"); throw e; }
        if (!Array.isArray(r.data) || !r.data.length) throw problem("That login was not found in this company.", "rejected");
        const row = r.data[0];
        now = (row.status || body.status) === "removed" ? "crew" : row.role || body.role || null;
      }
      if (change && "crewId" in change && !now) { // only the match changed: keep the Lead mark with the person
        const m = await request("/rest/v1/sb_members?select=role,status&company_id=eq." + s.companyId + "&user_id=eq." + userId, { token: await token() });
        const row = m.ok && Array.isArray(m.data) ? m.data[0] : null;
        if (row) now = row.status === "removed" ? "crew" : row.role;
      }
      if (change && "crewId" in change) await linkRoster(userId, change.crewId || null, now);
      else if (now) await markRoster(userId, now);
    }

    /* Push, then pull, so anything the server kept instead of ours comes straight back. */
    async function pushThenPull(changes, o) {
      const report = await push(changes);
      const pulled = await pull(o);
      return { report, pulled };
    }

    return { session, pull, push, pushThenPull, saveCursor, downloadFile, createCompany, crewLogins,
      signIn, signOutHere, people, addPerson, setPerson, signOut() { access = null; who = null; } };
  }

  const canWrite = (role, table) => (WRITE[role] || {})[table] || null;
  const api = { createSync, toRows, canWrite, mergeIntoLocal, storagePath, isReceiptCopy, TABLES, BUCKET };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ShopBoardSync = api;
})(typeof window !== "undefined" ? window : globalThis);
