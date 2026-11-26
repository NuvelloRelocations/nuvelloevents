// Pure helpers (no Cloudflare APIs) so they can be tested with plain Node.

export const EVENT = {
  title: "Beyond Arrival — HR & Global Mobility Industry Roundtable",
  date: "12 January 2027",
  time: "6:00pm until 7:30pm (GST)",
  venue: "Nuvello Head Office, DIP 1",
};

const TEXT_FIELDS = { name: 100, phone: 25, email: 150, company: 120, role: 120 };
const ALLOWED_KEYS = new Set([...Object.keys(TEXT_FIELDS), "marketing", "token"]);
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"\u0080-\uffff]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const PHONE_RE = /^[\s+()-]*(?:\d[\s+()-]*){7,15}$/;
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

// Returns { ok: true, data } or { ok: false, field }. Unknown keys are rejected (strict allow-list).
export function validate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, field: "body" };
  for (const k of Object.keys(body)) if (!ALLOWED_KEYS.has(k)) return { ok: false, field: k };
  const data = {};
  for (const [k, max] of Object.entries(TEXT_FIELDS)) {
    const v = typeof body[k] === "string" ? body[k].trim() : "";
    if (!v || v.length > max || CONTROL_RE.test(v)) return { ok: false, field: k };
    data[k] = v;
  }
  if (!EMAIL_RE.test(data.email)) return { ok: false, field: "email" };
  if (!PHONE_RE.test(data.phone)) return { ok: false, field: "phone" };
  if (body.marketing !== undefined && typeof body.marketing !== "boolean") return { ok: false, field: "marketing" };
  data.marketing = body.marketing === true;
  if (typeof body.token !== "string" || !body.token || body.token.length > 2048) return { ok: false, field: "token" };
  data.token = body.token;
  return { ok: true, data };
}

const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const wrap76 = (s) => s.replace(/.{1,76}/g, "$&\r\n");

// One RFC 5322 message as a CRLF string. Header values here are fixed or already validated (no CR/LF).
export function buildMessage({ from, to, replyTo, subject, text, domain, now = new Date(), id = crypto.randomUUID() }) {
  return [
    `From: "Nuvello Relocations" <${from}>`,
    `To: <${to}>`,
    replyTo ? `Reply-To: <${replyTo}>` : null,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    `Date: ${now.toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: <${id}@${domain}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64(text.replace(/\r?\n/g, "\r\n"))),
  ].filter((l) => l !== null).join("\r\n");
}

// The two emails for one registration. The guest email is fixed text only, so the form
// cannot be used to send someone else attacker-written content.
export function registrationEmails(data, env, now) {
  const domain = env.SMTP_USER.split("@")[1];
  const rsvp = [
    `New registration for ${EVENT.title}`,
    "",
    `Name:       ${data.name}`,
    `Phone:      ${data.phone}`,
    `Work email: ${data.email}`,
    `Company:    ${data.company}`,
    `Job title:  ${data.role}`,
    `Agreed to other communications: ${data.marketing ? "Yes" : "No"}`,
    "",
    `Received: ${now.toISOString()}`,
  ].join("\n");
  const guest = [
    "Hello,",
    "",
    `Thank you for securing your interest in ${EVENT.title}, hosted by Nuvello Relocations.`,
    "",
    `Date: ${EVENT.date}`,
    `Time: ${EVENT.time}`,
    `Venue: ${EVENT.venue}`,
    "Light refreshments will be served.",
    "",
    "If you did not register, please ignore this email.",
    "",
    "We look forward to seeing you.",
    "Nuvello Relocations",
  ].join("\n");
  return [
    { to: env.RSVP_TO, replyTo: data.email, subject: `New RSVP — Beyond Arrival Roundtable (${EVENT.date})`, text: rsvp },
    { to: data.email, replyTo: env.RSVP_TO, subject: "Thank you for registering — Beyond Arrival", text: guest },
  ].map((m) => ({ ...m, raw: buildMessage({ ...m, from: env.SMTP_USER, domain, now }) }));
}

// SMTP DATA: lines starting with "." get an extra "." (RFC 5321 4.5.2).
export const dotStuff = (raw) => raw.replace(/(^|\r\n)\./g, "$1..");
