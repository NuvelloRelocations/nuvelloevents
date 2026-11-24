# Security Gate and Launch Checklist — "Beyond Arrival" Registration Page

**Run on:** 24 November 2026 · **Build:** preview (registrations not sent) · **Re-run:** after setting the RSVP inbox, before going live, and after any big change.

**What the project is:** one static page (`index.html`, `assets/app.js`, images) hosted on GitHub Pages. The form posts to FormSubmit, which emails the events inbox and sends the guest a confirmation. There is no server code, database, user account, login or payment. Many items below are therefore Not applicable; the reason is given for each.

Result key: **Pass** (with evidence) · **Fixed** (failed, now fixed) · **N/A** (with reason) · **Open** (must be done before go-live)

## 7-check security gate

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Secrets in the client bundle | **Pass** | No env vars, API keys or tokens exist. The only setting is `RECIPIENT` (the events inbox) in `assets/app.js`. It is public by design (FormSubmit needs it in the page). Use a shared events inbox; FormSubmit can swap it for a random alias after activation. Nothing to rotate. |
| 2 | Ownership checks on every route | **N/A** | No server routes. The page only *sends* a registration and never reads anyone's data back. |
| 3 | RLS on the database | **N/A** | No database. Registrations exist only as emails in the events inbox. |
| 4 | Mass assignment / allow-list | **Pass** | `app.js` builds the request from a fixed list of fields (name, phone, email, company, role, marketing consent and FormSubmit settings). Extra fields typed into the page are never sent. Each field has a length limit; email and phone are format-checked. FormSubmit itself would accept extra fields posted directly, but those only reach our inbox as text. |
| 5 | Checkout trusts the browser | **N/A** | No payments. |
| 6 | Rate limits | **Open (risk accepted for preview)** | No login, signup or paid API. The form has a hidden spam-trap field. There is no rate limit on our side, since there is no server; FormSubmit applies its own spam filtering. Decide before go-live whether this is enough. |
| 7 | User A / user B test | **N/A** | No user accounts or stored records, so one user can't read or change another's. |

## A. Security (19)

| # | Item | Result | Evidence / reason |
|---|---|---|---|
| A1 | Protect admin routes | N/A | No admin pages or APIs. |
| A2 | Server-side permissions | N/A | No server; the page exposes no data. |
| A3 | RLS on every table | N/A | No database. |
| A4 | Verify email addresses | N/A | No accounts. (The confirmation email goes to the address entered; a typo just means the guest gets no email.) |
| A5 | Hash passwords | N/A | No passwords. |
| A6 | Tokens out of local storage | Pass | The page stores nothing (no cookies, localStorage or tokens). |
| A7 | API secrets on the server | Pass | No API secrets exist (see gate 1). |
| A8 | `.env` off Git | N/A | No `.env` file. The project isn't a Git repository yet; check again when it's pushed to GitHub. |
| A9 | Sensitive data out of logs | Pass | `app.js` logs nothing. Errors show a generic message, not the details. |
| A10 | Parameterized SQL | N/A | No SQL. |
| A11 | Validate every input | Pass | Required fields, length limits, email and phone format checks in the browser. Tested: empty form, bad phone (`abcdefgh`) and bad email (`bad`) are all refused with a clear message. There's no server of ours to re-validate; FormSubmit receives the data. |
| A12 | XSS: escape output + CSP | **Fixed** | Guest input is only ever written with `textContent`. Tested: a name of `<img src=x onerror=alert(1)>` showed as plain text and created no element. **Added** a Content-Security-Policy (only our files, Google Fonts and formsubmit.co allowed; `form-action 'none'`, `object-src 'none'`). To make that possible the script moved from inline to `assets/app.js`. No CSP errors in the console. |
| A13 | Validate file uploads | N/A | No uploads. |
| A14 | Verify webhook signatures | N/A | No webhooks. |
| A15 | Rate limiting | Open | See gate 6. |
| A16 | Tighten CORS | N/A | We serve no API. The page only calls formsubmit.co (allowed by the CSP `connect-src`). |
| A17 | Disable production debugging | Pass | No debug mode, `console.log` or stack traces. GitHub Pages shows no version banner. |
| A18 | Dependency audit | Pass | No packages (no `package.json` or `requirements.txt`). The only outside resources are Google Fonts (CSS) and FormSubmit. |
| A19 | Security review of the code | Pass (manual) | `/security-review` needs a Git repository and this project isn't one yet, so I reviewed every line by hand. Fixes from it: CSP (A12), and the form now falls back to `method="post"` so personal data can never end up in a URL if JavaScript fails. Run `/security-review` once the code is on GitHub. |

## B. Scale: 1,000 people (11)

| # | Item | Result | Evidence / reason |
|---|---|---|---|
| B1 | Real email provider | **Open** | FormSubmit is a free form-to-email service, not a dedicated email provider. Its limits for about 1,000 submissions haven't been checked. Management needs to approve it, or switch to a provider the company already uses. |
| B2 | Index searched columns | N/A | No database. |
| B3 | Fast RLS policies | N/A | No database. |
| B4 | Connection pooler | N/A | No database. |
| B5 | No N+1 queries | N/A | No queries. |
| B6 | Paginate lists | N/A | No lists. |
| B7 | Cache shared content | Pass | The page is static; GitHub Pages serves it from a CDN with caching. Total page weight is about 570 KB including images. |
| B8 | Retry external calls | Pass (by design) | A failed submission shows "please try again", and the guest's typed details are kept so they can resend. No automatic retry, to avoid duplicate registrations. |
| B9 | Queue slow jobs | N/A | No slow jobs; FormSubmit sends the emails. |
| B10 | Provider limits | Open | Same as B1: confirm FormSubmit's limits. |
| B11 | Load test | Pass (local) | 1,000 page visits (5 files each), 50 at a time, against the local server: **1000/1000 OK, 5.3 s total, median 245 ms, p95 282 ms**. GitHub Pages' CDN will be faster. The FormSubmit endpoint wasn't load-tested, so it wouldn't be spammed. |

## C. Design (13)

| # | Item | Result | Evidence / reason |
|---|---|---|---|
| C1 | Brand colours, no purple gradients | Pass | Olive `#7d806e`, lime `#f7ff99`, ink `#23251f`, taken from the PDF. |
| C2 | Real fonts | Pass | Montserrat, the font used in the design PDF. |
| C3 | No template chrome | Pass | No placeholder nav, lorem ipsum or template footer. |
| C4 | No generic three-card row | Pass | The layout follows the supplied design. |
| C5 | Icons, not emoji | Pass | Location pin and clock are SVG icons. |
| C6 | Real photos | Pass | Event photo from the approved flyer and design. |
| C7 | Specific headline | Pass | "Beyond Arrival", the event's real name. |
| C8 | No scroll fade-ins | Pass | None. |
| C9 | No fake testimonials, logos or statistics | Pass | Only the real EuRA and WERC memberships, taken from the design. |
| C10 | No website-builder leftovers | Pass | Hand-written HTML/CSS. |
| C11 | Use the user's references | Pass | Built from `FINAL Landing page (2).pdf` (desktop) and `Mobile.pdf`. |
| C12 | Design file | Pass | `docs/DESIGN.md`. |
| C13 | Screenshot in a real browser | Pass | Checked at 1440 px (element positions measured within ~5 px of the PDF) and 375 px mobile. |

## Open before go-live

1. Set the events inbox (`RECIPIENT` in `assets/app.js`), then click FormSubmit's activation email.
2. Replace the Privacy Policy placeholder link (`href="#"`).
3. Get management approval for FormSubmit (guest data passes through it) and check its limits (B1, B10, gate 6).
4. Once on GitHub: run `/security-review`, check `.gitignore`, and re-run this checklist.

---

*Developed by AI and IT Team*

<sub>Author: Prashad Madushanka (AI and IT Team)</sub>
