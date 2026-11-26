// Run: node --test worker/test
import { test } from "node:test";
import assert from "node:assert/strict";
import { validate, registrationEmails, buildMessage, dotStuff } from "../src/lib.js";

const good = { name: " Sara ", phone: "+971 50 123 4567", email: "sara@company.ae", company: "Acme", role: "HR Lead", marketing: true, token: "t" };
const env = { SMTP_USER: "AI@nuvellorealestate.ae", RSVP_TO: "relocation@nuvellorealestate.ae" };

test("accepts a good registration and trims it", () => {
  const v = validate(good);
  assert.equal(v.ok, true);
  assert.equal(v.data.name, "Sara");
});

test("rejects bad input", () => {
  const bad = {
    unknownField: { ...good, admin: true },
    spacesName: { ...good, name: "   " },
    dashesPhone: { ...good, phone: "-------" },
    noTld: { ...good, email: "a@b" },
    headerInjection: { ...good, email: "x@y.com\r\nBcc: z@w.com" },
    controlInName: { ...good, name: "A\nB" },
    tooLong: { ...good, company: "x".repeat(121) },
    noToken: { ...good, token: "" },
    marketingNotBool: { ...good, marketing: "yes" },
    nonAsciiEmail: { ...good, email: "jos\u00e9@company.ae" },
  };
  for (const [label, body] of Object.entries(bad)) assert.equal(validate(body).ok, false, label);
  assert.equal(validate([]).ok, false);
  assert.equal(validate(null).ok, false);
});

test("builds the two emails; guest email contains no submitted text", () => {
  const data = validate({ ...good, name: "<script>Evil</script>", company: "Visit evil.example" }).data;
  const [rsvp, guest] = registrationEmails(data, env, new Date("2026-11-26T10:00:00Z"));
  assert.equal(rsvp.to, env.RSVP_TO);
  assert.equal(rsvp.replyTo, "sara@company.ae");
  assert.match(rsvp.text, /Agreed to other communications: Yes/);
  assert.equal(guest.to, "sara@company.ae");
  assert.doesNotMatch(guest.text, /Evil|evil\.example/);
  assert.match(guest.raw, /^From: "Nuvello Relocations" <AI@nuvellorealestate\.ae>\r\n/);
  assert.doesNotMatch(guest.raw.split("\r\n\r\n")[0], /\n(?!\S)/); // no folded or injected header lines
});

test("message body is base64 and decodes to the text", () => {
  const raw = buildMessage({ from: "a@b.co", to: "c@d.co", subject: "Hi — there", text: "Line 1\n.Line 2", domain: "b.co", id: "x" });
  const body = raw.split("\r\n\r\n")[1].replace(/\r\n/g, "");
  assert.equal(new TextDecoder().decode(Uint8Array.from(atob(body), (c) => c.charCodeAt(0))), "Line 1\r\n.Line 2");
});

test("dot-stuffing protects the end-of-message marker", () => {
  assert.equal(dotStuff(".a\r\n.\r\nb"), "..a\r\n..\r\nb");
});
