/* Shop Board PDF writer.
   Makes simple letter-size PDFs (text, lines, shaded boxes, one JPEG logo) with no outside library,
   so quotes and invoices can be created on the phone with no connection. */
(function () {
  "use strict";
  if (window.ShopBoardPdf) return;

  var PAGE_W = 612, PAGE_H = 792;
  /* Character widths (per 1000 units) for Helvetica and Helvetica-Bold, characters 32 to 126. */
  var REGULAR = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  var BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
  var SWAPS = { "‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-", "…": "...", "•": "*", " ": " " };

  /* Keeps only characters the built-in PDF fonts can draw. */
  function clean(value) {
    var text = String(value == null ? "" : value), out = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i), code = text.charCodeAt(i);
      if (SWAPS[ch] !== undefined) out += SWAPS[ch];
      else if (code < 32 || code === 127) out += " ";
      else if (code > 255 || (code > 127 && code < 160)) out += "?";
      else out += ch;
    }
    return out;
  }

  function textWidth(value, size, bold) {
    var text = clean(value), table = bold ? BOLD : REGULAR, total = 0;
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      total += code >= 32 && code <= 126 ? table[code - 32] : 556;
    }
    return total * size / 1000;
  }

  /* Splits text into lines no wider than maxWidth. */
  function wrap(value, size, bold, maxWidth) {
    var words = clean(value).split(" ").filter(function (w) { return w.length > 0; });
    var lines = [], line = "";
    words.forEach(function (word) {
      while (textWidth(word, size, bold) > maxWidth && word.length > 1) {
        var cut = word.length - 1;
        while (cut > 1 && textWidth(word.slice(0, cut), size, bold) > maxWidth) cut--;
        if (line) { lines.push(line); line = ""; }
        lines.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      var trial = line ? line + " " + word : word;
      if (line && textWidth(trial, size, bold) > maxWidth) { lines.push(line); line = word; }
      else line = trial;
    });
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function num(n) { return String(Math.round(n * 100) / 100); }

  function pdfString(value) {
    var text = clean(value), out = "(";
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i), code = text.charCodeAt(i);
      if (ch === "(" || ch === ")" || ch === "\\") out += "\\" + ch;
      else if (code > 126) out += "\\" + ("000" + code.toString(8)).slice(-3);
      else out += ch;
    }
    return out + ")";
  }

  function colorOps(color, stroke) {
    var c = Array.isArray(color) ? color : [color || 0, color || 0, color || 0];
    return num(c[0]) + " " + num(c[1]) + " " + num(c[2]) + (stroke ? " RG" : " rg");
  }

  function create() {
    var pages = [[]], logo = null;
    function ops() { return pages[pages.length - 1]; }

    return {
      width: PAGE_W,
      height: PAGE_H,
      textWidth: textWidth,
      wrap: wrap,
      addPage: function () { pages.push([]); },
      /* x and y are measured from the top-left corner; y is the text baseline. */
      text: function (value, x, y, options) {
        var o = options || {}, size = o.size || 10, bold = Boolean(o.bold);
        var w = textWidth(value, size, bold);
        if (o.align === "right") x -= w;
        else if (o.align === "center") x -= w / 2;
        ops().push("BT /" + (bold ? "F2" : "F1") + " " + num(size) + " Tf " + colorOps(o.color, false) + " " +
          num(x) + " " + num(PAGE_H - y) + " Td " + pdfString(value) + " Tj ET");
      },
      line: function (x1, y1, x2, y2, thickness, color) {
        ops().push(num(thickness || 1) + " w " + colorOps(color, true) + " " + num(x1) + " " + num(PAGE_H - y1) + " m " +
          num(x2) + " " + num(PAGE_H - y2) + " l S");
      },
      box: function (x, y, w, h, color) {
        ops().push(colorOps(color, false) + " " + num(x) + " " + num(PAGE_H - y - h) + " " + num(w) + " " + num(h) + " re f");
      },
      /* jpegBytes: Uint8Array of a JPEG file; pixelWidth/pixelHeight: its size in pixels. */
      setLogo: function (jpegBytes, pixelWidth, pixelHeight) {
        logo = { bytes: jpegBytes, w: pixelWidth, h: pixelHeight };
      },
      drawLogo: function (x, y, w, h) {
        if (!logo) return;
        ops().push("q " + num(w) + " 0 0 " + num(h) + " " + num(x) + " " + num(PAGE_H - y - h) + " cm /Im1 Do Q");
      },
      build: function () {
        var chunks = [], offsets = [], length = 0;
        function put(part) {
          if (typeof part === "string") {
            var bytes = new Uint8Array(part.length);
            for (var i = 0; i < part.length; i++) bytes[i] = part.charCodeAt(i) & 255;
            part = bytes;
          }
          chunks.push(part);
          length += part.length;
        }
        function object(id, body, stream) {
          offsets[id] = length;
          put(id + " 0 obj\n" + body + "\n");
          if (stream !== undefined) { put("stream\n"); put(stream); put("\nendstream\n"); }
          put("endobj\n");
        }
        var imageId = logo ? 5 : 0;
        var firstPageId = logo ? 6 : 5;
        var pageIds = pages.map(function (_, i) { return firstPageId + i * 2; });
        var total = firstPageId + pages.length * 2 - 1;

        put("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
        object(1, "<< /Type /Catalog /Pages 2 0 R >>");
        object(2, "<< /Type /Pages /Kids [" + pageIds.map(function (id) { return id + " 0 R"; }).join(" ") + "] /Count " + pages.length + " >>");
        object(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
        object(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
        if (logo) {
          object(5, "<< /Type /XObject /Subtype /Image /Width " + logo.w + " /Height " + logo.h +
            " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + logo.bytes.length + " >>", logo.bytes);
        }
        pages.forEach(function (pageOps, i) {
          var content = pageOps.join("\n");
          object(pageIds[i], "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + PAGE_W + " " + PAGE_H + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>" +
            (logo ? " /XObject << /Im1 " + imageId + " 0 R >>" : "") + " >> /Contents " + (pageIds[i] + 1) + " 0 R >>");
          object(pageIds[i] + 1, "<< /Length " + content.length + " >>", content);
        });

        var xrefAt = length, xref = "xref\n0 " + (total + 1) + "\n0000000000 65535 f \n";
        for (var id = 1; id <= total; id++) xref += ("0000000000" + offsets[id]).slice(-10) + " 00000 n \n";
        put(xref + "trailer\n<< /Size " + (total + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefAt + "\n%%EOF\n");

        var file = new Uint8Array(length), at = 0;
        chunks.forEach(function (chunk) { file.set(chunk, at); at += chunk.length; });
        return file;
      }
    };
  }

  window.ShopBoardPdf = { create: create, clean: clean };
})();
