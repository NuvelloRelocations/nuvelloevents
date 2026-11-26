// Registration service (Cloudflare Worker in /worker). Set to "" to close registration.
const API_URL = "https://beyond-arrival-rsvp.nuvello.workers.dev/register";

const form = document.getElementById("rsvp");
const status = document.getElementById("status");
const btn = form.querySelector("button");
const f = form.elements; // form.name / form.role are built-in props, so read inputs via elements
const FAILED = "Sorry, something went wrong. Please try again or message Nuvello Relocations on LinkedIn.";

const say = (text, ok = false) => {
  status.className = ok ? "status" : "status err";
  status.textContent = text;
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  for (const n of ["name", "phone", "email", "company", "role"]) f[n].value = f[n].value.trim(); // before validating, so spaces alone count as empty
  if (!form.checkValidity()) {
    const bad = form.querySelector(":invalid");
    const what = bad.labels[0].textContent.replace("*", "").trim().toLowerCase();
    say((bad.value ? "Please check your " : "Please enter your ") + what + ".");
    bad.focus();
    return;
  }
  if (f._honey.value) return say(FAILED); // bot, or a browser extension that filled the hidden field
  if (!API_URL) return say("Registration is not open yet, so nothing was sent.");
  const token = f["cf-turnstile-response"]?.value;
  if (!token) return say("Please complete the \"I'm human\" check above the button.");

  btn.disabled = true;
  say("Sending…", true);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45000), // never leave the guest on "Sending…"
      body: JSON.stringify({
        name: f.name.value, phone: f.phone.value, email: f.email.value,
        company: f.company.value, role: f.role.value, marketing: f.marketing.checked, token,
      }),
    });
    const out = await res.json().catch(() => ({}));
    if (res.ok && out.ok && out.confirmation === false) {
      form.reset();
      btn.disabled = false;
      return say("Thank you, you're registered. We couldn't send your confirmation email, but your details have reached our team.", true);
    }
    if (res.ok && out.ok) return location.assign("thanks.html");
    if (out.error === "invalid" && f[out.field]) {
      say("Please check your " + f[out.field].labels[0].textContent.replace("*", "").trim().toLowerCase() + ".");
    } else if (out.error === "human_check") {
      say("The \"I'm human\" check didn't work. Please try it again.");
    } else if (out.error === "rate_limit") {
      say("Too many attempts. Please wait a minute and try again.");
    } else {
      say(FAILED);
    }
  } catch {
    say(FAILED);
  }
  window.turnstile?.reset(); // tokens work once; get a fresh one for the next try
  btn.disabled = false;
});
