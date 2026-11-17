/* Shop Board add-on: auth-gate.
   Requires a real signed-in Supabase owner before the app is shown, reusing the existing
   Owner Cloud sign-in/verification logic (cloud.js) rather than building a second auth system.
   Offline-first is preserved: if this device already completed a sign-in before and the
   network is unreachable right now, access is still allowed so a connectivity outage never
   locks an owner out of their own saved jobs. A genuinely rejected or missing credential
   still requires signing in again.
   Stage 3: opening an invite or reset link asks for a new password first; "Forgot password?"
   emails a reset link. Invites are the only way new logins are made. */
(window.ShopBoardAddOns = window.ShopBoardAddOns || []).push(async function () {
  "use strict";
  if (window.ShopBoardAuthGate) return;
  // This add-on registers before boot so it can never be skipped, but the sign-in code (cloud.js)
  // loads after boot starts. Wait for every script on the page before deciding anything.
  if (document.readyState !== "complete") await new Promise(resolve => window.addEventListener("load", resolve, {once: true}));
  const cloud = window.ShopBoardOwnerCloud;
  if (!cloud || typeof cloud.restoreSession !== "function") return; // cloud.js failed to load; never lock the app over that

  // Read the link first: an invite or reset link must never be skipped by a saved sign-in.
  const link = window.ShopBoardInvites ? window.ShopBoardInvites.takeLink() : null;
  const member = window.ShopBoardMember;
  const sync = () => window.ShopBoardCloudSync;
  async function tryRestore() {
    // A lead or crew login is not the owner account, so the owner check below would reject it.
    if (member && member.isMemberDevice()) return member.hasCredential();
    try {
      return await cloud.restoreSession();
    } catch (e) {
      // Network/timeout trouble, not a rejected credential — trust a previously
      // signed-in device rather than lock an owner out of their own saved jobs.
      return Boolean(e && e.network) && cloud.hasStoredCredential();
    }
  }

  if (!link && await tryRestore()) return;

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
      <div id="shopGateLead" style="font-size:14px; color:var(--text-muted); text-align:center; margin-bottom:20px;">Sign in to open Shop Board on this device.</div>
      <div id="shopGateSetPanel" hidden>
        <label class="input-label" for="shopGateNewPassword">Choose a password</label>
        <input id="shopGateNewPassword" class="text-input" type="password" autocomplete="new-password" style="margin-bottom:6px;">
        <p style="font-size:13px; color:var(--text-muted); margin:0 0 14px;">At least 8 characters. Only you will know it.</p>
        <button id="shopGateSetPassword" type="button" class="big-btn">Save Password</button>
      </div>
      <div id="shopGateSignPanel">
        <label class="input-label" for="shopGateEmail">Email</label>
        <input id="shopGateEmail" class="text-input" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" style="margin-bottom:14px;">
        <label class="input-label" for="shopGatePassword">Password</label>
        <input id="shopGatePassword" class="text-input" type="password" autocomplete="current-password" style="margin-bottom:14px;">
        <button id="shopGateSignIn" type="button" class="big-btn">Sign In</button>
        <button id="shopGateForgot" type="button" class="comm-btn" style="display:block; margin:14px auto 0;">Forgot password?</button>
      </div>
      <p id="shopGateStatus" role="status" aria-live="polite" style="font-size:14px; color:var(--text-muted); margin-top:12px; text-align:center;"></p>`;
    overlay.appendChild(gate);

    const $ = id => document.getElementById(id);
    const btn = $("shopGateSignIn"), forgot = $("shopGateForgot");
    const emailEl = $("shopGateEmail"), passEl = $("shopGatePassword"), statusEl = $("shopGateStatus");
    const setPanel = $("shopGateSetPanel"), signPanel = $("shopGateSignPanel"), lead = $("shopGateLead");
    const newPass = $("shopGateNewPassword"), setBtn = $("shopGateSetPassword");

    function showSignIn(message) {
      setPanel.hidden = true; signPanel.hidden = false;
      lead.textContent = "Sign in to open Shop Board on this device.";
      statusEl.textContent = message || "";
      emailEl.focus();
    }

    async function attempt() {
      btn.disabled = true; btn.textContent = "Signing in…";
      const email = emailEl.value, password = passEl.value;
      passEl.value = "";
      let ok = false;
      try { ok = await cloud.signIn(email, password); }
      catch (e) { ok = false; }
      let memberNote = "";
      if (ok && member) member.clear(); // the owner signed in: this is not (or no longer) a lead/crew phone
      // Not the owner account: try it as a lead or crew login (a wrong password is not retried).
      if (!ok && member && !/not accepted|Enter your owner email/i.test(cloud.getState().notice || "")) {
        const tried = await member.signIn(email, password);
        ok = tried.ok; memberNote = tried.message;
      }
      if (ok) { gate.remove(); if (loadingText) loadingText.style.display = ""; resolve(); return; }
      const state = cloud.getState();
      statusEl.textContent = memberNote || (/not accepted/i.test(state.notice || "") ? "Email or password was not accepted." : state.notice) || "Sign-in failed. Try again.";
      btn.disabled = false; btn.textContent = "Sign In";
    }
    btn.addEventListener("click", attempt);
    passEl.addEventListener("keydown", e => { if (e.key === "Enter") attempt(); });

    forgot.addEventListener("click", async () => {
      if (!emailEl.value.trim()) { statusEl.textContent = "Type your email above, then tap Forgot password again."; emailEl.focus(); return; }
      forgot.disabled = true; statusEl.textContent = "Sending…";
      try {
        await sync().requestReset(emailEl.value);
        statusEl.textContent = "If that email has a Shop Board login, a reset link is on its way. Check your inbox and spam folder.";
      } catch (e) { statusEl.textContent = e.message || "Could not send the email. Try again."; }
      forgot.disabled = false;
    });

    // An invite or reset link: set the password first, then sign in with it.
    if (link && link.type === "error") { showSignIn(link.message); }
    else if (link) {
      signPanel.hidden = true; setPanel.hidden = false;
      lead.textContent = link.type === "invite" ? "Welcome to Shop Board. Choose a password to join your company." : "Choose a new password for Shop Board.";
      newPass.focus();
      setBtn.addEventListener("click", async () => {
        setBtn.disabled = true; setBtn.textContent = "Saving…";
        const password = newPass.value; newPass.value = "";
        try {
          const out = await sync().finishLink(link.accessToken, password);
          if (out.email) emailEl.value = out.email;
          showSignIn("Password saved. Sign in with your email and new password.");
          passEl.focus();
        } catch (e) {
          statusEl.textContent = e.message || "Could not save the password. Try again.";
        }
        setBtn.disabled = false; setBtn.textContent = "Save Password";
      });
      statusEl.textContent = "";
    }
  });

  window.ShopBoardAuthGate = { version: 2 };
});
