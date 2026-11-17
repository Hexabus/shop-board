// Shop Board: sends a lead or crew invite email. Deploy as the Supabase Edge Function named "send-invite".
// Supabase gives the function its own service key; it is never put in the app.
// The owner's sign-in is checked first: the invite row is written as the owner, so row security
// decides whether this person may invite to that company.
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = "https://hexabus.github.io/shop-board/";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Use POST." });
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return reply(401, { error: "Sign in first." });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { error: "Bad request." }); }
  const email = String(body.email || "").trim().toLowerCase();
  const role = body.role;
  const companyId = String(body.companyId || "");
  const crewId = body.crewId ? String(body.crewId) : null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return reply(400, { error: "That email does not look right." });
  if (role !== "lead" && role !== "crew") return reply(400, { error: "Choose Lead or Crew." });
  if (!/^[0-9a-f-]{36}$/i.test(companyId)) return reply(400, { error: "Company not recognised." });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const opts = { auth: { persistSession: false, autoRefreshToken: false } };

  const who = createClient(url, anonKey, { ...opts, global: { headers: { Authorization: auth } } });
  const { data: userData, error: userErr } = await who.auth.getUser();
  if (userErr || !userData.user) return reply(401, { error: "Sign in again." });

  // Re-send the open invite for this email if there is one; otherwise start a new one.
  const expires = new Date(Date.now() + 7 * 86400000).toISOString();
  const fields = { role, crew_id: crewId, expires_at: expires, created_at: new Date().toISOString() };
  const { data: open } = await who.from("sb_invites").select("id").eq("company_id", companyId)
    .eq("email", email).is("accepted_at", null).is("cancelled_at", null).maybeSingle();
  const write = open
    ? await who.from("sb_invites").update(fields).eq("id", open.id).select("id").maybeSingle()
    : await who.from("sb_invites").insert({ ...fields, company_id: companyId, email, created_by: userData.user.id }).select("id").maybeSingle();
  if (write.error || !write.data) return reply(403, { error: "Only the owner can invite people to this company." });

  // New person: Supabase emails an invite link that leads to the set-password screen.
  const admin = createClient(url, serviceKey, opts);
  const invited = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: SITE });
  if (!invited.error) return reply(200, { ok: true, sent: "invite" });
  if (!/already|exists|registered/i.test(invited.error.message || "")) {
    return reply(502, { error: "The email could not be sent. Wait a few minutes and try Resend." });
  }
  // Already has a login (made by hand, or from an earlier invite): send a set-password link instead.
  const anon = createClient(url, anonKey, opts);
  const reset = await anon.auth.resetPasswordForEmail(email, { redirectTo: SITE });
  if (reset.error) return reply(502, { error: "The email could not be sent. Wait a few minutes and try Resend." });
  return reply(200, { ok: true, sent: "reset" });
});
