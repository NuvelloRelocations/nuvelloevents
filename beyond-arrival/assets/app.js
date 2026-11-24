// Set this to the inbox that should receive RSVPs before going live.
// While empty, the page runs in preview mode and sends nothing.
const RECIPIENT = "";

const form = document.getElementById("rsvp");
const status = document.getElementById("status");
const btn = form.querySelector("button");
const f = form.elements; // form.name / form.role are built-in props, so read inputs via elements
document.getElementById("previewRibbon").hidden = !!RECIPIENT;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  status.className = "status";
  if (!form.checkValidity()) {
    const bad = form.querySelector(":invalid");
    const what = bad.labels[0].textContent.replace("*", "").trim().toLowerCase();
    status.textContent = (bad.value ? "Please check your " : "Please enter your ") + what + ".";
    status.classList.add("err");
    bad.focus();
    return;
  }
  if (f._honey.value) return; // bot

  const data = {
    name: f.name.value.trim(),
    phone: f.phone.value.trim(),
    email: f.email.value.trim(),
    company: f.company.value.trim(),
    role: f.role.value.trim(),
    marketing_consent: f.marketing.checked ? "Yes" : "No",
    _subject: "New RSVP — Beyond Arrival Roundtable (12 Jan 2027)",
    _template: "table",
    _autoresponse:
      "Thank you for securing your interest in Beyond Arrival — the HR & Global Mobility Industry Roundtable hosted by Nuvello Relocations.\n\n" +
      "Date: 12 January 2027\nTime: 6:00pm until 7:30pm (GST)\nVenue: Nuvello Head Office, DIP 1\nLight refreshments will be served.\n\n" +
      "We look forward to seeing you.\nNuvello Relocations",
  };

  if (!RECIPIENT) {
    status.textContent = `Preview mode: thank you, ${data.name}. Live, a confirmation email would go to ${data.email}.`;
    status.classList.add("ok");
    form.reset();
    return;
  }

  btn.disabled = true;
  status.textContent = "Sending…";
  try {
    const res = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(RECIPIENT), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(data),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || String(out.success) !== "true") throw new Error(out.message || res.status);
    status.textContent = `Thank you, ${data.name}. Your interest is confirmed — check ${data.email} for details.`;
    status.classList.add("ok");
    form.reset();
  } catch (err) {
    status.textContent = "Sorry, something went wrong. Please try again or message Nuvello Relocations on LinkedIn.";
    status.classList.add("err");
  } finally {
    btn.disabled = false;
  }
});
