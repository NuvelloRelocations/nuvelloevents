import { validate, registrationEmails } from "./lib.js";
import { sendMail } from "./smtp.js";

// POST /register from the event page. Secrets (SMTP_PASS, TURNSTILE_SECRET) are set with
// `wrangler secret put` and never stored in this repository.
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
    const cors = allowed.includes(origin)
      ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600", Vary: "Origin" }
      : {};
    const reply = (status, body) => Response.json(body, { status, headers: { ...cors, "Cache-Control": "no-store" } });

    const { pathname } = new URL(request.url);
    if (pathname !== "/register") return reply(404, { ok: false, error: "not_found" });
    if (!cors["Access-Control-Allow-Origin"]) return reply(403, { ok: false, error: "origin" });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return reply(405, { ok: false, error: "method" });
    if (!(request.headers.get("Content-Type") || "").startsWith("application/json")) return reply(415, { ok: false, error: "content_type" });

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const { success: underLimit } = await env.RSVP_LIMIT.limit({ key: ip });
    if (!underLimit) return reply(429, { ok: false, error: "rate_limit" });

    const raw = await request.text();
    if (raw.length > 8192) return reply(413, { ok: false, error: "too_large" });
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return reply(400, { ok: false, error: "invalid", field: "body" });
    }
    const v = validate(body);
    if (!v.ok) return reply(400, { ok: false, error: "invalid", field: v.field });

    if (!(await humanCheck(v.data.token, ip, env))) return reply(403, { ok: false, error: "human_check" });

    const messages = registrationEmails(v.data, env, new Date());
    if (env.DRY_RUN === "1") return reply(200, { ok: true, dryRun: messages.map(({ to, subject, text }) => ({ to, subject, text })) });

    const smtp = { host: env.SMTP_HOST, port: Number(env.SMTP_PORT), user: env.SMTP_USER, pass: env.SMTP_PASS };
    try {
      await sendMail(smtp, messages.slice(0, 1)); // RSVP to the events inbox first: it is the record
    } catch (e) {
      console.error("rsvp send failed:", e.message); // no personal data in logs
      return reply(502, { ok: false, error: "send" });
    }
    try {
      await sendMail(smtp, messages.slice(1));
      return reply(200, { ok: true, confirmation: true });
    } catch (e) {
      console.error("guest confirmation failed:", e.message);
      return reply(200, { ok: true, confirmation: false });
    }
  },
};

async function humanCheck(token, ip, env) {
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(8000),
    });
    const out = await r.json();
    return out.success === true && out.hostname === env.TURNSTILE_HOSTNAME;
  } catch (e) {
    console.error("turnstile check failed:", e.message);
    return false;
  }
}
