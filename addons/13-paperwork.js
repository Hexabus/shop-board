/* Shop Board add-on: paperwork.
   Quote and invoice PDFs (with the company logo) and the tax-time spreadsheet export.
   Everything is made on the device; nothing is uploaded. */
(window.ShopBoardAddOns = window.ShopBoardAddOns || []).push(async function () {
  "use strict";
  if (window.ShopBoardPaperwork) return;

  const LEFT = 54, RIGHT = 558, BOTTOM = 700;
  const money = amount => "$" + (Number(amount) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const longDate = day => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || "");
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";
  };
  const isoDay = iso => (iso && !Number.isNaN(Date.parse(iso)) ? window.localDay(new Date(iso)) : "");
  const fileSafe = text => String(text || "").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "job";

  /* Shares the file where the phone supports it (Mail, Messages, Files); otherwise downloads it. */
  async function deliver(bytes, filename, type, title) {
    const file = new File([bytes], filename, { type: type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: title }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    const url = URL.createObjectURL(file), link = document.createElement("a");
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    window.showToast("Saved " + filename);
  }

  /* The saved logo as JPEG bytes on a white background, or null when there is none. */
  function logoJpeg() {
    return new Promise(resolve => {
      const src = DATA.business.logoDataUrl || "";
      if (!/^data:image\/(png|jpeg);base64,/.test(src)) { resolve(null); return; }
      const img = new Image();
      img.onerror = () => resolve(null);
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          const raw = atob(canvas.toDataURL("image/jpeg", 0.92).split(",")[1]);
          const bytes = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
          resolve({ bytes: bytes, w: canvas.width, h: canvas.height });
        } catch (e) { resolve(null); }
      };
      img.src = src;
    });
  }

  /* Lays out one quote or invoice.
     paper: { title, meta: [lines], client, job, rows: [{desc, qty, rate, amount}], showQty, totalLabel, total, stamp } */
  async function buildPaper(paper) {
    const doc = window.ShopBoardPdf.create();
    const logo = await logoJpeg();
    let leftY = 60;
    if (logo) {
      const scale = Math.min(150 / logo.w, 64 / logo.h);
      doc.setLogo(logo.bytes, logo.w, logo.h);
      doc.drawLogo(LEFT, 44, logo.w * scale, logo.h * scale);
      leftY = 44 + logo.h * scale + 20;
    }
    doc.wrap(DATA.business.name, 15, true, 280).forEach(line => { doc.text(line, LEFT, leftY, { size: 15, bold: true }); leftY += 18; });
    if (DATA.business.phone) { doc.text(DATA.business.phone, LEFT, leftY - 3, { size: 10, color: 0.3 }); leftY += 12; }

    doc.text(paper.title, RIGHT, 68, { size: 26, bold: true, align: "right" });
    let rightY = 88;
    paper.meta.forEach(line => { doc.text(line, RIGHT, rightY, { size: 10, align: "right", color: 0.3 }); rightY += 14; });

    let y = Math.max(leftY, rightY) + 10;
    doc.line(LEFT, y, RIGHT, y, 1.5, 0.15);
    y += 22;

    const columnTop = y;
    doc.text("FOR", LEFT, y, { size: 8, bold: true, color: 0.45 });
    y += 14;
    doc.wrap(paper.client.name || "Client", 11, true, 240).forEach(line => { doc.text(line, LEFT, y, { size: 11, bold: true }); y += 14; });
    [paper.client.address, paper.client.phone, paper.client.email].filter(Boolean).forEach(value => {
      doc.wrap(value, 10, false, 240).forEach(line => { doc.text(line, LEFT, y, { size: 10, color: 0.25 }); y += 13; });
    });
    let jobY = columnTop;
    doc.text("JOB", 320, jobY, { size: 8, bold: true, color: 0.45 });
    jobY += 14;
    doc.wrap(paper.job.name, 11, true, 238).forEach(line => { doc.text(line, 320, jobY, { size: 11, bold: true }); jobY += 14; });
    if (paper.job.address && !/^on site$/i.test(paper.job.address)) {
      doc.wrap(paper.job.address, 10, false, 238).forEach(line => { doc.text(line, 320, jobY, { size: 10, color: 0.25 }); jobY += 13; });
    }
    y = Math.max(y, jobY) + 14;

    const descWidth = paper.showQty ? 290 : 400;
    function tableHead() {
      doc.box(LEFT, y, RIGHT - LEFT, 22, 0.92);
      doc.text("DESCRIPTION", LEFT + 8, y + 15, { size: 9, bold: true });
      if (paper.showQty) {
        doc.text("QTY", 400, y + 15, { size: 9, bold: true, align: "right" });
        doc.text("RATE", 475, y + 15, { size: 9, bold: true, align: "right" });
      }
      doc.text("AMOUNT", RIGHT - 8, y + 15, { size: 9, bold: true, align: "right" });
      y += 22;
    }
    tableHead();
    paper.rows.forEach(row => {
      const lines = doc.wrap(row.desc, 10, false, descWidth);
      // Short rows move to the next page whole; a very long description carries on line by line.
      if (lines.length <= 12 && y + lines.length * 14 + 12 > BOTTOM) { doc.addPage(); y = 60; tableHead(); }
      lines.forEach((line, i) => {
        if (y + 26 > BOTTOM) { doc.addPage(); y = 60; tableHead(); }
        doc.text(line, LEFT + 8, y + 17, { size: 10 });
        if (i === 0) {
          if (paper.showQty) {
            doc.text(String(row.qty), 400, y + 17, { size: 10, align: "right" });
            doc.text(money(row.rate), 475, y + 17, { size: 10, align: "right" });
          }
          doc.text(money(row.amount), RIGHT - 8, y + 17, { size: 10, align: "right" });
        }
        y += 14;
      });
      y += 10;
      doc.line(LEFT, y, RIGHT, y, 0.5, 0.8);
    });

    if (y + 70 > BOTTOM + 40) { doc.addPage(); y = 60; }
    y += 26;
    doc.text(paper.totalLabel, 440, y, { size: 12, bold: true, align: "right" });
    doc.text(money(paper.total), RIGHT - 8, y, { size: 14, bold: true, align: "right" });
    if (paper.stamp) {
      y += 22;
      doc.text(paper.stamp, RIGHT - 8, y, { size: 12, bold: true, align: "right", color: [0.1, 0.45, 0.2] });
    }

    doc.line(LEFT, 742, RIGHT, 742, 0.5, 0.8);
    doc.text("Thank you for your business.", doc.width / 2, 758, { size: 9, align: "center", color: 0.35 });
    return doc.build();
  }

  function jobAndClient(jobId) {
    const job = DATA.jobs.find(j => j.id === jobId);
    if (!job) return null;
    const client = DATA.clients.find(c => c.id === job.clientId) || { name: "", address: "", phone: "", email: "" };
    return { job: job, client: client };
  }

  /* Runs one file-making job at a time. The job returns a function that hands the finished file over,
     which runs after the lock is released so a slow share sheet never blocks the next tap. */
  let busy = false;
  async function guarded(work) {
    if (busy) return;
    busy = true;
    let handOver = null;
    try { handOver = await work(); }
    catch (e) { window.showToast("Could not make the file. Try again."); }
    finally { busy = false; }
    if (handOver) {
      try { await handOver(); }
      catch (e) { window.showToast("Could not save the file"); }
    }
  }

  function sendQuotePdf(jobId) {
    return guarded(async () => {
      const found = jobAndClient(jobId);
      if (!found) return;
      const items = (found.job.quotes && found.job.quotes[0] ? found.job.quotes[0].items : [])
        .map(it => ({ desc: it.desc, qty: Number(it.qty) || 0, rate: Number(it.rate) || 0 }))
        .map(it => ({ ...it, amount: it.qty * it.rate }));
      const total = items.reduce((sum, it) => sum + it.amount, 0);
      if (total <= 0) { window.showToast("Add quote line items first"); return; }
      const bytes = await buildPaper({
        title: "QUOTE",
        meta: ["Date: " + longDate(window.localDay())],
        client: found.client, job: found.job,
        rows: items, showQty: true,
        totalLabel: "QUOTE TOTAL", total: total, stamp: ""
      });
      return () => deliver(bytes, "Quote-" + fileSafe(found.job.name) + ".pdf", "application/pdf", found.job.name + " quote from " + DATA.business.name);
    });
  }

  function sendInvoicePdf(jobId, billId) {
    return guarded(async () => {
      const found = jobAndClient(jobId);
      const bill = found && (found.job.bills || []).find(b => b.id === billId);
      if (!bill) return;
      if (!bill.number) {
        // Bills made before invoice numbers existed get one the first time they are sent.
        bill.number = window.assignBillNumber();
        try { await window.saveData(); }
        catch (e) { delete bill.number; window.showToast("Could not save the invoice number. Nothing was sent."); return; }
        window.renderCurrentView();
      }
      const paid = bill.status === "Paid";
      const meta = ["Invoice #" + bill.number];
      const billedDay = isoDay(bill.createdAt) || window.localDay();
      meta.push("Date: " + longDate(billedDay));
      if (!paid && bill.dueDate) meta.push("Due: " + longDate(bill.dueDate));
      const bytes = await buildPaper({
        title: "INVOICE",
        meta: meta,
        client: found.client, job: found.job,
        rows: [{ desc: bill.desc, amount: Number(bill.amount) || 0 }], showQty: false,
        totalLabel: paid ? "TOTAL" : "AMOUNT DUE", total: Number(bill.amount) || 0,
        stamp: paid ? "PAID" + (isoDay(bill.paidAt) ? " " + longDate(isoDay(bill.paidAt)) : "") : ""
      });
      return () => deliver(bytes, "Invoice-" + bill.number + "-" + fileSafe(found.job.name) + ".pdf", "application/pdf",
        "Invoice #" + bill.number + " from " + DATA.business.name);
    });
  }

  /* ---- Tax-time export ---- */

  function csvCell(value) {
    let text = String(value == null ? "" : value);
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text; // keep spreadsheets from running a cell as a formula
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }
  const csvFile = rows => new TextEncoder().encode("﻿" + rows.map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n");
  const amountCell = amount => (Number(amount) || 0).toFixed(2);

  function receiptRows(year) {
    const rows = [];
    DATA.jobs.forEach(job => {
      const client = DATA.clients.find(c => c.id === job.clientId) || { name: "" };
      (job.expenses || []).forEach(exp => {
        const day = window.expenseDay(exp);
        if (year && day && day.slice(0, 4) !== year) return;
        rows.push([day, job.name, client.name, exp.category || "Materials", exp.desc, amountCell(exp.amount),
          exp.photoUrl ? "Yes" : "No", exp.author || "", day ? "" : "Date not recorded - check"]);
      });
    });
    rows.sort((a, b) => a[0].localeCompare(b[0]));
    return [["Date", "Job", "Client", "Category", "Description", "Amount", "Receipt photo", "Entered by", "Notes"]].concat(rows);
  }

  function billRows(year) {
    const rows = [];
    DATA.jobs.forEach(job => {
      const client = DATA.clients.find(c => c.id === job.clientId) || { name: "" };
      (job.bills || []).forEach(bill => {
        const billed = isoDay(bill.createdAt), paid = bill.status === "Paid" ? isoDay(bill.paidAt) : "";
        const day = paid || billed;
        if (year && day && day.slice(0, 4) !== year) return;
        rows.push([bill.number || "", billed, bill.dueDate || "", job.name, client.name, bill.desc, amountCell(bill.amount),
          bill.status, paid, day ? "" : "Date not recorded - check"]);
      });
    });
    rows.sort((a, b) => (a[8] || a[1]).localeCompare(b[8] || b[1]));
    return [["Invoice #", "Billed date", "Due date", "Job", "Client", "Description", "Amount", "Status", "Paid date", "Notes"]].concat(rows);
  }

  function exportYears() {
    const years = new Set([String(new Date().getFullYear())]);
    DATA.jobs.forEach(job => {
      (job.expenses || []).forEach(exp => { const d = window.expenseDay(exp); if (d) years.add(d.slice(0, 4)); });
      (job.bills || []).forEach(bill => { [isoDay(bill.createdAt), isoDay(bill.paidAt)].forEach(d => { if (d) years.add(d.slice(0, 4)); }); });
    });
    return Array.from(years).sort().reverse();
  }

  function openTaxExportModal() {
    if (DATA.currentUser.role !== "Owner") { window.showToast("Switch to Owner view to export records"); return; }
    window.openModal(`
      <div style="font-family: var(--font-display); font-size: 24px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px;">Export for Taxes</div>
      <div style="font-size: 13px; color: var(--text-muted); font-weight: 600; margin-bottom: 14px;">
        Makes spreadsheet files your accountant can open in Excel, Numbers or Google Sheets. Receipt photos stay in the app.
      </div>
      <div class="input-group">
        <label class="input-label" for="taxExportYear">Year</label>
        <select id="taxExportYear" class="text-input">
          ${exportYears().map(y => `<option value="${y}">${y}</option>`).join("")}
          <option value="">All years</option>
        </select>
      </div>
      <button class="big-btn" onclick="exportTaxCsv('receipts')">Receipts &amp; Expenses</button>
      <button class="big-btn" onclick="exportTaxCsv('bills')">Bills &amp; Payments</button>
      <button class="big-btn secondary" onclick="closeModal()">Close</button>
    `);
  }

  function exportTaxCsv(kind) {
    return guarded(async () => {
      const select = document.getElementById("taxExportYear");
      const year = select ? select.value : "";
      const rows = kind === "bills" ? billRows(year) : receiptRows(year);
      if (rows.length < 2) { window.showToast(kind === "bills" ? "No bills to export for that year" : "No receipts to export for that year"); return; }
      const name = (kind === "bills" ? "Bills-" : "Receipts-") + (year || "all-years") + ".csv";
      return () => deliver(csvFile(rows), name, "text/csv", name);
    });
  }

  window.sendQuotePdf = sendQuotePdf;
  window.sendInvoicePdf = sendInvoicePdf;
  window.openTaxExportModal = openTaxExportModal;
  window.exportTaxCsv = exportTaxCsv;
  window.ShopBoardPaperwork = { buildPaper: buildPaper, receiptRows: receiptRows, billRows: billRows };
});
