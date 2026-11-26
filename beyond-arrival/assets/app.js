// Set this to the inbox that should receive RSVPs before going live.
// While empty, nothing is sent and guests are told registration is not open.
const RECIPIENT = "relocation@nuvellorealestate.ae";

const form = document.getElementById("rsvp");
const status = document.getElementById("status");
const btn = form.querySelector("button");
const f = form.elements; // form.name / form.role are built-in props, so read inputs via elements

form.addEventListener("submit", (e) => {
  e.preventDefault();
  status.className = "status err";
  for (const n of ["name", "phone", "email", "company", "role"]) f[n].value = f[n].value.trim(); // before validating, so spaces alone count as empty
  if (!form.checkValidity()) {
    const bad = form.querySelector(":invalid");
    const what = bad.labels[0].textContent.replace("*", "").trim().toLowerCase();
    status.textContent = (bad.value ? "Please check your " : "Please enter your ") + what + ".";
    bad.focus();
    return;
  }
  if (f._honey.value) { // bot, or a browser extension that filled the hidden field
    status.textContent = "Sorry, something went wrong. Please try again or message Nuvello Relocations on LinkedIn.";
    return;
  }
  if (!RECIPIENT) {
    status.textContent = "Registration is not open yet, so nothing was sent.";
    return;
  }

  f.marketing_consent.value = f.marketing.checked ? "Yes" : "No";
  btn.disabled = true;
  status.className = "status";
  status.textContent = "Sending…";
  form.action = "https://formsubmit.co/" + RECIPIENT;
  form.submit();
});

// Back button from FormSubmit's reCAPTCHA page: make the form usable again
addEventListener("pageshow", () => {
  btn.disabled = false;
  status.textContent = "";
});
