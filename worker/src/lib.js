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
// Control characters, plus invisible and text-direction characters that could disguise a value
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/;

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
const crlf = (s) => s.replace(/\r?\n/g, "\r\n");

// One RFC 5322 message as a CRLF string. Header values here are fixed or already validated (no CR/LF).
// With `html`, the message is multipart/alternative (plain text first, branded HTML second).
export function buildMessage({ from, to, replyTo, subject, text, html, domain, now = new Date(), id = crypto.randomUUID() }) {
  const boundary = `=_nuvello_${id}`;
  const part = (type, body) => [`Content-Type: ${type}; charset=UTF-8`, "Content-Transfer-Encoding: base64", "", wrap76(b64(crlf(body)))];
  const body = html
    ? [`Content-Type: multipart/alternative; boundary="${boundary}"`, "", `--${boundary}`, ...part("text/plain", text), `--${boundary}`, ...part("text/html", html), `--${boundary}--`, ""]
    : part("text/plain", text);
  return [
    `From: "Nuvello Relocations" <${from}>`,
    `To: <${to}>`,
    replyTo ? `Reply-To: <${replyTo}>` : null,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    `Date: ${now.toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: <${id}@${domain}>`,
    "MIME-Version: 1.0",
    ...body,
  ].filter((l) => l !== null).join("\r\n");
}

// The only visitor-typed text allowed into the guest's email: the first word of their name,
// letters (any language), apostrophes and hyphens only, up to 30 characters. Anything else
// (links, numbers, symbols, code) becomes "Guest", so the form cannot be used to send
// strangers attacker-written content.
export function safeFirstName(name) {
  const first = String(name).trim().split(/\s+/)[0] || "";
  if (!/^\p{L}[\p{L}\p{M}'’-]{0,29}$/u.test(first)) return "Guest";
  return first[0].toLocaleUpperCase() + first.slice(1);
}

const LOGO_URL = "https://nuvellorelocations.github.io/nuvelloevents/beyond-arrival/assets/nuvello-leaf.png";

// Guest thank-you email, wording approved by management (November 2026).
export function guestEmail(firstName) {
  const text = [
    `Dear ${firstName},`,
    "",
    "Thank you for registering your interest in Beyond Arrival, an exclusive HR & Global Mobility Industry Roundtable hosted by Nuvello Relocations.",
    "",
    "Designed as an intimate, discussion-led gathering, Beyond Arrival brings together a select group of industry professionals to exchange perspectives, challenge existing approaches and explore the future of employee relocation and settlement.",
    "",
    "Event details",
    "",
    "Date: Tuesday, 12th January 2027",
    "Time: 6:00pm – 7:30pm",
    "Location: Nuvello Head Office, DIP 1, Dubai",
    "",
    "Light refreshments will be served.",
    "",
    "To preserve the quality and intimacy of the discussion, attendance is limited. Our team will be in touch to confirm your place and issue your personalised attendance pass, along with further event details.",
    "",
    "We look forward to welcoming you to a meaningful conversation that extends beyond relocation itself.",
    "",
    "Warm regards,",
    "The Nuvello Relocations Team",
    "",
    "Prepare. Relocate. Belong.",
  ].join("\n");

  const p = (s, extra = "") => `<p style="margin:0 0 16px;${extra}">${s}</p>`;
  const row = (label, value) => `<tr><td style="padding:4px 16px 4px 0;color:#4a4c40;font-weight:700;white-space:nowrap;">${label}</td><td style="padding:4px 0;">${value}</td></tr>`;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Beyond Arrival</title></head>
<body style="margin:0;padding:0;background:#f4f5ef;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5ef;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Montserrat,Arial,Helvetica,sans-serif;color:#23251f;font-size:15px;line-height:1.6;">
<tr><td style="background:#7d806e;padding:28px 32px;">
<p style="margin:0;color:#f7ff99;font-weight:700;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;">HR &amp; Global Mobility Industry Roundtable</p>
<p style="margin:4px 0 0;color:#ffffff;font-weight:800;font-style:italic;font-size:30px;line-height:1.1;text-transform:uppercase;">Beyond Arrival</p>
</td></tr>
<tr><td style="padding:32px;">
${p(`Dear ${firstName},`)}
${p("Thank you for registering your interest in <strong>Beyond Arrival</strong>, an exclusive HR &amp; Global Mobility Industry Roundtable hosted by Nuvello Relocations.")}
${p("Designed as an intimate, discussion-led gathering, Beyond Arrival brings together a select group of industry professionals to exchange perspectives, challenge existing approaches and explore the future of employee relocation and settlement.")}
<p style="margin:24px 0 8px;font-weight:700;color:#5f6352;font-size:16px;">Event details</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-left:4px solid #7d806e;padding-left:12px;">
${row("Date", "Tuesday, 12th January 2027")}${row("Time", "6:00pm – 7:30pm")}${row("Location", "Nuvello Head Office, DIP 1, Dubai")}
</table>
${p("Light refreshments will be served.")}
${p("To preserve the quality and intimacy of the discussion, attendance is limited. Our team will be in touch to confirm your place and issue your personalised attendance pass, along with further event details.")}
${p("We look forward to welcoming you to a meaningful conversation that extends beyond relocation itself.")}
${p("Warm regards,<br><strong>The Nuvello Relocations Team</strong>", "margin-bottom:24px;")}
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:12px;"><img src="${LOGO_URL}" width="32" height="42" alt="Nuvello" style="display:block;border:0;"></td>
<td style="color:#4a4c40;font-size:13px;line-height:1.3;"><strong>Nuvello</strong><br>Relocations</td>
</tr></table>
<p style="margin:16px 0 0;color:#7d806e;font-weight:700;font-style:italic;">Prepare. Relocate. Belong.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { text, html };
}

// The two emails for one registration. The guest email is approved fixed text plus a
// letters-only first name (see safeFirstName).
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
  const guest = guestEmail(safeFirstName(data.name));
  return [
    { to: env.RSVP_TO, replyTo: data.email, subject: `New RSVP — Beyond Arrival Roundtable (${EVENT.date})`, text: rsvp },
    { to: data.email, replyTo: env.RSVP_TO, subject: "Thank you for registering your interest — Beyond Arrival", text: guest.text, html: guest.html },
  ].map((m) => ({ ...m, raw: buildMessage({ ...m, from: env.SMTP_USER, domain, now }) }));
}

// SMTP DATA: lines starting with "." get an extra "." (RFC 5321 4.5.2).
export const dotStuff = (raw) => raw.replace(/(^|\r\n)\./g, "$1..");
