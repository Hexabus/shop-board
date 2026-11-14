/* Shop Board add-on: auth-gate.
   Requires a real signed-in Supabase owner before the app is shown, reusing the existing
   Owner Cloud sign-in/verification logic (cloud.js) rather than building a second auth system.
   Offline-first is preserved: if this device already completed a sign-in before and the
   network is unreachable right now, access is still allowed so a connectivity outage never
   locks an owner out of their own saved jobs. A genuinely rejected or missing credential
   still requires signing in again. */
(window.ShopBoardAddOns = window.ShopBoardAddOns || []).push(async function () {
  "use strict";
  if (window.ShopBoardAuthGate) return;
  // This add-on registers before boot so it can never be skipped, but the sign-in code (cloud.js)
  // loads after boot starts. Wait for every script on the page before deciding anything.
  if (document.readyState !== "complete") await new Promise(resolve => window.addEventListener("load", resolve, {once: true}));
  const cloud = window.ShopBoardOwnerCloud;
  if (!cloud || typeof cloud.restoreSession !== "function") return; // cloud.js failed to load; never lock the app over that

  async function tryRestore() {
    try {
      return await cloud.restoreSession();
    } catch (e) {
      // Network/timeout trouble, not a rejected credential — trust a previously
      // signed-in device rather than lock an owner out of their own saved jobs.
      return Boolean(e && e.network) && cloud.hasStoredCredential();
    }
  }

  if (await tryRestore()) return;

  const overlay = document.getElementById("shopBootOverlay");
  if (!overlay) return;

  const loadingText = document.getElementById("shopBootStatus");
  if (loadingText) loadingText.style.display = "none";

  await new Promise(resolve => {
    const gate = document.createElement("div");
    gate.id = "shopAuthGate";
    gate.style.cssText = "max-width:380px; width:100%; text-align:left;";
    gate.innerHTML = `
      <div style="font-family:var(--font-display); font-size:26px; font-weight:900; text-transform:uppercase; margin-bottom:6px; text-align:center;">Shop Board</div>
      <div style="font-size:14px; color:var(--text-muted); text-align:center; margin-bottom:20px;">Sign in as the owner to open this device.</div>
      <label class="input-label" for="shopGateEmail">Email</label>
      <input id="shopGateEmail" class="text-input" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" style="margin-bottom:14px;">
      <label class="input-label" for="shopGatePassword">Password</label>
      <input id="shopGatePassword" class="text-input" type="password" autocomplete="current-password" style="margin-bottom:14px;">
      <button id="shopGateSignIn" type="button" class="big-btn">Sign In</button>
      <p id="shopGateStatus" role="status" aria-live="polite" style="font-size:13px; color:var(--text-muted); margin-top:12px; text-align:center;"></p>`;
    overlay.appendChild(gate);

    const btn = document.getElementById("shopGateSignIn");
    const emailEl = document.getElementById("shopGateEmail");
    const passEl = document.getElementById("shopGatePassword");
    const statusEl = document.getElementById("shopGateStatus");

    async function attempt() {
      btn.disabled = true; btn.textContent = "Signing in…";
      const email = emailEl.value, password = passEl.value;
      passEl.value = "";
      let ok = false;
      try { ok = await cloud.signIn(email, password); }
      catch (e) { ok = false; }
      if (ok) { gate.remove(); if (loadingText) loadingText.style.display = ""; resolve(); return; }
      const state = cloud.getState();
      statusEl.textContent = state.notice || "Sign-in failed. Try again.";
      btn.disabled = false; btn.textContent = "Sign In";
    }
    btn.addEventListener("click", attempt);
    passEl.addEventListener("keydown", e => { if (e.key === "Enter") attempt(); });
  });

  window.ShopBoardAuthGate = { version: 1 };
});
