# Technical Handover Guide — "Beyond Arrival" Registration Page

For engineers covering this project. It is a single static page, so most changes take minutes.

## 1. Architecture

```
Guest (LinkedIn link) ──► index.html on GitHub Pages (static, HTTPS)
                              │  form submit (JavaScript fetch, JSON)
                              ▼
                        FormSubmit (formsubmit.co/ajax/<inbox>)
                              ├─► notification email to the events inbox
                              └─► auto-reply confirmation to the guest
```

There is no server, database or user account. Registrations exist only as emails in the events inbox.

## 2. Code map

| Path | What it is |
|---|---|
| `index.html` | Page content, styles (in `<style>`) and the security policy (CSP `<meta>`) |
| `assets/app.js` | Form logic: validation, preview mode, sending to FormSubmit. Holds `RECIPIENT`. |
| `assets/hero-band.webp` | Left end of the photo band, painted behind the text |
| `assets/hero-walkers.webp` | Main photo band plus walkers, painted **over** the headline so their legs cross "BEYOND". Rendered from the PDF's own layers; keep the same size and position as `hero-band.webp`. See `DESIGN.md`. |
| `assets/hero-bg.jpg` | Faint background photo behind the olive block |
| `assets/nuvello-leaf.png`, `eura.png`, `werc.png` | Footer logos |
| `assets/flyer.jpg` | Image for the LinkedIn link preview |
| `.claude/launch.json` | Local preview server config (port 8765) |
| `docs/` | These documents |

Design sources: `FINAL Landing page (2).pdf` (desktop) and `Mobile.pdf` (mobile). The images were extracted from those files. Measurements, colours and the sizing system are in `DESIGN.md`; checklist results are in `SECURITY_GATE.md`.

## 3. Setup and local preview

You only need Python (any version 3.x).

```bash
python -m http.server 8765 --directory "D:/Dubai event"
```

Open `http://localhost:8765`. Colleagues on the same Wi-Fi can use `http://<your-ip>:8765`. Windows Firewall may need to allow Python.

## 4. Common changes

| Task | Where |
|---|---|
| **Go live** (start sending emails) | In `assets/app.js`, set `const RECIPIENT = "events@…"`. The preview banner hides itself. |
| Change date, time or venue | The hero text in `index.html`, the `<time datetime>` attribute, the `_autoresponse` text in `assets/app.js`, and the `meta description` / `og:description` |
| Change the confirmation email text | `_autoresponse` in `assets/app.js` |
| Change the notification subject | `_subject` in `assets/app.js` |
| Add or remove a form field | Add the `<label>` and `<input>`, then add it to the `data` object in `assets/app.js`. Only fields in `data` are sent. |
| Privacy Policy link | `<a href="#">Privacy Policy</a>`. It is a placeholder and **must** be set before going live. |
| Colours | CSS variables at the top of `<style>` (`--olive`, `--lime`, `--ink`) |
| Move or resize something on desktop | Sizes are `calc(N * var(--u))`, where N is the pixel value in the 1440 px PDF. Copy the new number from the design. |
| Load a new outside service (font, analytics, form endpoint) | Add its domain to the Content-Security-Policy `<meta>` in `index.html`, or the browser will block it |

## 5. Deploying to GitHub Pages

1. Create a repository (its name becomes the URL path, e.g. `beyond-arrival`) and upload `index.html` and the whole `assets/` folder (including `app.js`).
2. Go to Settings → Pages → Deploy from branch `main`, folder `/ (root)`.
3. Change `og:image` to the full URL, e.g. `https://<user>.github.io/beyond-arrival/assets/flyer.jpg`.
4. When approved for public launch, remove `<meta name="robots" content="noindex, nofollow">`.
5. Submit one test registration. FormSubmit emails the inbox an **activation link** the first time; nothing is delivered until someone clicks it.
6. Check the link preview with LinkedIn's Post Inspector.

## 6. Troubleshooting runbook

| Symptom | Likely cause | Fix |
|---|---|---|
| Yellow "Preview build" banner shows on the live site | `RECIPIENT` is empty | Set it (see §4) |
| Guests submit but nobody gets emails | FormSubmit not activated, or emails are in spam | Click the activation email; check spam and whitelist formsubmit.co |
| Guests see "Sorry, something went wrong" | FormSubmit down, or blocked by the network | Try again later; guests can still message Nuvello on LinkedIn |
| LinkedIn shows no image | `og:image` is a relative path, or LinkedIn cached an old version | Use the full https URL; refresh in Post Inspector |
| Photos missing | `assets/` folder not uploaded | Upload it alongside `index.html` |
| Form does nothing / page unstyled after an edit | Content-Security-Policy is blocking something new | Open the browser console (F12), read the CSP error, and add that domain to the CSP `<meta>` |
| Colleagues can't open the local link | Firewall or guest Wi-Fi blocks it | Allow Python in Windows Firewall, or use the GitHub Pages link |

## 7. Where secrets live

There are none. The only setting is the events inbox address in `RECIPIENT`, which visitors can see in the page source. That is how FormSubmit works. It may attract some spam, so use a shared events inbox rather than a personal one. FormSubmit can also replace the address with a random alias after activation.

## 8. Security review (summary)

- No secrets, no server routes, no database, no payments, no logins.
- Every field is required where appropriate, has a length limit and a format check (email, phone). Only the listed fields are sent.
- A hidden spam-trap field drops simple bots. There is no rate limit on our side; FormSubmit applies its own.
- Guest data passes through FormSubmit, a third-party service. Management must approve this before launch.

## 9. Never do this

- Never put a personal inbox in `RECIPIENT`. Use a shared events inbox.
- Never go live with `href="#"` on the Privacy Policy link.
- Never remove the `noindex` line while the page is only for internal review.
- Never add API keys or passwords to `index.html` or `assets/app.js`. Everything in them is public.
- Never put inline `<script>` code back into `index.html`. The security policy blocks it; use `assets/app.js`.
- Never loosen the security policy with `*` or `'unsafe-inline'` for scripts.
- Never send test registrations to real guests' addresses.

---

*Developed by AI and IT Team*

<sub>Author: Prashad Madushanka (AI and IT Team)</sub>
