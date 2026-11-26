import { validate, registrationEmails } from "./lib.js";
import { sendMail } from "./smtp.js";
import { underLimit } from "./limiter.js";

export { RsvpLimiter } from "./limiter.js";

// POST /register from the event page. Secrets (SMTP_PASS, TURNSTILE_SECRET) are set with
// `wrangler secret put` and never stored in this repository.
const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
};
const MAX_BODY = 8192;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
    const cors = allowed.includes(origin)
      ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600", Vary: "Origin" }
      : {};
    const reply = (status, body) => Response.json(body, { status, headers: { ...cors, ...SECURITY_HEADERS } });

    // Plain http is refused (local `wrangler dev` on localhost is the only exception).
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) return reply(403, { ok: false, error: "https_required" });
    if (url.pathname !== "/register") return reply(404, { ok: false, error: "not_found" });
    if (!cors["Access-Control-Allow-Origin"]) return reply(403, { ok: false, error: "origin" });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...cors, ...SECURITY_HEADERS } });
    if (request.method !== "POST") return reply(405, { ok: false, error: "method" });
    if (!(request.headers.get("Content-Type") || "").startsWith("application/json")) return reply(415, { ok: false, error: "content_type" });
    if (Number(request.headers.get("Content-Length") || 0) > MAX_BODY) return reply(413, { ok: false, error: "too_large" });

    // Strict limits (Durable Object): per IP address, then per guest email address.
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (!(await underLimit(env, "ip:" + ip, Number(env.LIMIT_PER_IP_PER_MINUTE), MINUTE))) return reply(429, { ok: false, error: "rate_limit" });

    const raw = await request.text();
    if (raw.length > MAX_BODY) return reply(413, { ok: false, error: "too_large" });
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return reply(400, { ok: false, error: "invalid", field: "body" });
    }
    const v = validate(body);
    if (!v.ok) return reply(400, { ok: false, error: "invalid", field: v.field });

    if (!(await underLimit(env, "email:" + v.data.email.toLowerCase(), Number(env.LIMIT_PER_EMAIL_PER_HOUR), HOUR))) return reply(429, { ok: false, error: "rate_limit" });
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

// Turnstile token must be valid, unused, issued on our hostname and, in production, for our form's action.
async function humanCheck(token, ip, env) {
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(8000),
    });
    const out = await r.json();
    return out.success === true && out.hostname === env.TURNSTILE_HOSTNAME && (!env.TURNSTILE_ACTION || out.action === env.TURNSTILE_ACTION);
  } catch (e) {
    console.error("turnstile check failed:", e.message);
    return false;
  }
}
