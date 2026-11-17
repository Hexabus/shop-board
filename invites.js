/* Shop Board — invite and reset links.
   An invite email or a "Forgot password?" email opens the app with a short-lived sign-in token in
   the address. This file reads that token once and removes it from the address bar, so the
   sign-in screen can ask the person for a password. Nothing here keeps the token. */
(function () {
  "use strict";
  if (window.ShopBoardInvites) return;

  // Pure: turns an address-bar hash into { type, accessToken } or { type: "error", message }.
  function parseLink(hash) {
    const raw = String(hash || "").replace(/^#/, "");
    if (!raw) return null;
    const p = new URLSearchParams(raw);
    const type = p.get("type"), token = p.get("access_token");
    if (token && (type === "invite" || type === "recovery")) return { type, accessToken: token };
    if (p.get("error_code") || p.get("error")) {
      return { type: "error", message: "That link has expired or was already used. Tap Forgot password to get a new one." };
    }
    return null;
  }

  // Reads the link once and tidies the address bar so a refresh does not repeat it.
  function takeLink() {
    let link = null;
    try { link = parseLink(location.hash); } catch (e) { link = null; }
    if (link) { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
    return link;
  }

  window.ShopBoardInvites = { parseLink, takeLink };
})();
