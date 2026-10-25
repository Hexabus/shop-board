/* Full-screen image zoom: pinch, drag, double-tap, mouse wheel. */
(function () {
  "use strict";
  function openImageZoom(src) {
    if (!src || document.getElementById("zoomOverlay")) return;
    var ov = document.createElement("div");
    ov.id = "zoomOverlay";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-label", "Full-screen image");
    var img = document.createElement("img");
    img.alt = "";
    img.draggable = false;
    img.src = src;
    var close = document.createElement("button");
    close.type = "button";
    close.id = "zoomClose";
    close.textContent = "Close";
    var hint = document.createElement("div");
    hint.id = "zoomHint";
    hint.textContent = "Pinch or double-tap to zoom";
    ov.appendChild(img); ov.appendChild(close); ov.appendChild(hint);
    document.body.appendChild(ov);
    setTimeout(function () { hint.style.opacity = "0"; }, 2500);

    var s = 1, x = 0, y = 0, pts = new Map(), startDist = 0, startS = 1, lastTap = 0, moved = false;
    function apply() { img.style.transform = "translate(" + x + "px," + y + "px) scale(" + s + ")"; }
    function clamp() {
      if (s <= 1) { s = 1; x = 0; y = 0; return; }
      var mx = ov.clientWidth * (s - 1) / 2, my = ov.clientHeight * (s - 1) / 2;
      x = Math.max(-mx, Math.min(mx, x)); y = Math.max(-my, Math.min(my, y));
    }
    function zoomAt(ns, cx, cy) {
      ns = Math.max(1, Math.min(8, ns));
      var ox = cx - ov.clientWidth / 2, oy = cy - ov.clientHeight / 2;
      x = ox - (ox - x) * (ns / s); y = oy - (oy - y) * (ns / s); s = ns; clamp(); apply();
    }
    function dist() { var a = Array.from(pts.values()); return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
    function mid() { var a = Array.from(pts.values()); return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }; }
    ov.addEventListener("pointerdown", function (e) {
      if (e.target === close) return;
      ov.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = false;
      if (pts.size === 2) { startDist = dist(); startS = s; }
    });
    ov.addEventListener("pointermove", function (e) {
      var p = pts.get(e.pointerId); if (!p) return;
      var dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      if (pts.size === 2) {
        p.x = e.clientX; p.y = e.clientY;
        var m = mid(); zoomAt(startS * dist() / startDist, m.x, m.y);
      } else if (s > 1) {
        x += dx; y += dy; p.x = e.clientX; p.y = e.clientY; clamp(); apply();
      }
    });
    function up(e) {
      if (!pts.has(e.pointerId)) return;
      var wasSingle = pts.size === 1;
      pts.delete(e.pointerId);
      if (pts.size === 1) { startDist = 0; }
      if (wasSingle && !moved && e.type === "pointerup") {
        var now = Date.now();
        if (now - lastTap < 300) { zoomAt(s > 1 ? 1 : 3, e.clientX, e.clientY); lastTap = 0; }
        else lastTap = now;
      }
    }
    ov.addEventListener("pointerup", up);
    ov.addEventListener("pointercancel", up);
    ov.addEventListener("wheel", function (e) {
      e.preventDefault(); zoomAt(s * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY);
    }, { passive: false });
    function end() { document.removeEventListener("keydown", key); ov.remove(); }
    function key(e) { if (e.key === "Escape") end(); }
    document.addEventListener("keydown", key);
    close.addEventListener("click", end);
  }

  function toBlob(src) { return fetch(src).then(function (r) { return r.blob(); }); }
  function extFor(type) { return type === "image/png" ? "png" : type === "image/webp" ? "webp" : type === "image/gif" ? "gif" : "jpg"; }
  function openImageFull(src) {
    if (!src) return;
    toBlob(src).then(function (b) {
      var u = URL.createObjectURL(b);
      var w = window.open(u, "_blank");
      if (!w) { location.href = u; }
      setTimeout(function () { URL.revokeObjectURL(u); }, 120000);
    }).catch(function () { if (window.showToast) showToast("Could not open the image"); });
  }
  function saveImage(src, name) {
    if (!src) return;
    toBlob(src).then(function (b) {
      var fname = String(name || "photo").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "photo";
      fname += "." + extFor(b.type);
      var file = new File([b], fname, { type: b.type || "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file] }).catch(function (e) { if (e && e.name !== "AbortError") throw e; });
      }
      var u = URL.createObjectURL(b), a = document.createElement("a");
      a.href = u; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 10000);
      if (window.showToast) showToast("Saved " + fname);
    }).catch(function () { if (window.showToast) showToast("Could not save the image"); });
  }
  window.openImageFull = openImageFull;
  window.saveImageToDevice = saveImage;
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-ia]");
    if (!b) return;
    var img = b.closest("#modalSheet") && b.closest("#modalSheet").querySelector("img");
    if (!img) return;
    var kind = b.getAttribute("data-ia");
    if (kind === "zoom") openImageZoom(img.src);
    else if (kind === "full") openImageFull(img.src);
    else if (kind === "save") saveImage(img.src, b.getAttribute("data-name"));
  });
  window.openImageZoom = openImageZoom;
})();
