/* Ark — a local household handover. All assets are bundled. */
"use strict";
const A = window.Ark;
const $ = (id) => document.getElementById(id);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Not yet";
const clone = (value) => JSON.parse(JSON.stringify(value));
function icon(name) {
  const paths = {
    overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    people:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    money: "M3 5h17v15H3z M3 5V3h14 M15 11h6v5h-6z",
    home: "m3 10 9-7 9 7v11H3z M9 21v-8h6v8",
    care: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8",
    documents: "M14 2H4v20h16V8z M14 2v6h6 M8 12h8 M8 16h8",
    handover: "M5 19 19 5 M5 5h14v14",
    digital: "M15 7a5 5 0 1 1-9 3L2 14v4h4v-3h3l3-3 M15 6h.01",
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.documents}"/></svg>`;
}
let state = A.blank(),
  personalState = null,
  demoMode = false,
  lastStored = null,
  corrupt = false,
  conflict = false,
  pendingRestore = null,
  restoreGeneration = 0,
  toastTimer;
const warning = (message) => {
  $("storageWarning").textContent = message;
  $("storageWarning").hidden = !message;
};
function load() {
  try {
    lastStored = localStorage.getItem(A.STORAGE_KEY);
    if (lastStored !== null) state = A.validate(JSON.parse(lastStored));
    else {
      const legacy = localStorage.getItem(A.LEGACY_KEY);
      if (legacy !== null) {
        state = A.migrateLegacy(JSON.parse(legacy));
        A.persist(localStorage, state);
        lastStored = JSON.stringify(state);
        warning(
          "Your older Ark notes were imported without marking them reviewed. The old browser copy is unchanged. Check imported notes, complete the essentials, and download an encrypted backup.",
        );
      }
    }
  } catch {
    corrupt = true;
    warning(
      "Ark could not read your browser copy. It has not been replaced. Restore a valid backup, or save the unreadable copy before seeking help.",
    );
    const recovery = document.createElement("button");
    recovery.className = "button secondary small";
    recovery.textContent = "Save unreadable copy";
    recovery.addEventListener("click", () => {
      try {
        download(
          localStorage.getItem(A.STORAGE_KEY) ??
            localStorage.getItem(A.LEGACY_KEY) ??
            "",
          "ark-unreadable-copy.json",
        );
      } catch {
        toast(
          "This browser is blocking access to local storage. Try its normal browsing mode.",
        );
      }
    });
    $("storageWarning").append(document.createElement("br"), recovery);
  }
}
function toast(message) {
  clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").hidden = false;
  toastTimer = setTimeout(() => ($("toast").hidden = true), 4500);
}
function commit(next, errorId, restore = false) {
  try {
    next.updatedAt = A.now();
    const clean = A.validate(next);
    if (!demoMode) {
      if (conflict)
        throw new Error(
          "Another tab changed this household. Reload Ark before saving. Your current form has not been cleared.",
        );
      if (corrupt && !restore)
        throw new Error(
          "Your existing browser copy could not be read. Restore a valid backup first; the existing copy is preserved.",
        );
      if (localStorage.getItem(A.STORAGE_KEY) !== lastStored) {
        conflict = true;
        throw new Error(
          "Another tab changed this household. Reload Ark before saving.",
        );
      }
      A.persist(localStorage, clean);
      lastStored = JSON.stringify(clean);
      corrupt = false;
      if (restore) warning("");
    }
    state = clean;
    render();
    return true;
  } catch (error) {
    const message =
      error.name === "QuotaExceededError" || error.name === "SecurityError"
        ? "This browser could not save your changes. The previous saved copy is unchanged. Keep this form open and check storage permissions or available space."
        : error.message;
    if (errorId) $(errorId).textContent = message;
    warning(message);
    $("saveStatus").textContent = "Changes not saved";
    return false;
  }
}
function openDialog(id) {
  $(id).showModal();
}
function closeDialog(dialog) {
  dialog.close();
}
document
  .querySelectorAll("[data-close]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      closeDialog(button.closest("dialog")),
    ),
  );
document.querySelectorAll("dialog").forEach((dialog) =>
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      dialog.close();
  }),
);
function confirmAction(heading, message, label, action) {
  $("confirmHeading").textContent = heading;
  $("confirmMessage").textContent = message;
  $("confirmAction").textContent = label;
  $("confirmAction").onclick = () => {
    if (action() !== false) $("confirmDialog").close();
  };
  openDialog("confirmDialog");
}
function sectionName(id) {
  return A.SECTIONS.find((s) => s.id === id)?.name ?? id;
}
function reviewLabel(r) {
  const status = A.status(r);
  return status === "reviewed"
    ? `Reviewed ${formatDate(r.reviewedAt)}`
    : status === "stale"
      ? `Review due · ${formatDate(r.reviewedAt)}`
      : "Draft · not reviewed";
}
function currentPage() {
  const id = location.hash.slice(1);
  return ["overview", "handover", ...A.SECTIONS.map((s) => s.id)].includes(id)
    ? id
    : "overview";
}
function renderNavigation(page) {
  const links = [
    { id: "overview", name: "Overview", icon: "◫" },
    ...A.SECTIONS,
    { id: "handover", name: "Your handover", icon: "↗" },
  ];
  $("navigation").innerHTML = links
    .map(
      (s) =>
        `${s.id === "handover" ? '<div class="nav-divider"></div>' : ""}<a class="nav-link ${page === s.id ? "active" : ""}" ${page === s.id ? 'aria-current="page"' : ""} href="#${s.id}"><span class="nav-symbol">${icon(s.id)}</span>${s.name}${A.SECTIONS.some((t) => t.id === s.id) ? `<span class="nav-count">${state.records.filter((r) => r.section === s.id).length}</span>` : ""}</a>`,
    )
    .join("");
}
const houseArt = `<svg viewBox="0 0 220 230" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="132" cy="120" r="78" fill="#e0e7d9"/><path d="M34 190h169" stroke="#b0bea5"/><path d="m65 114 58-50 59 50v77H65z" fill="#fbfcf5" stroke="#73866c" stroke-width="1.5"/><path d="m52 119 71-61 71 61" stroke="#61785b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M113 146h29v45h-29z" fill="#d9b58d" stroke="#a88761"/><path d="M80 125h23v24H80zm74 0h17v24h-17z" fill="#d5dfce" stroke="#96a68d"/><path d="M91 126v22m-10-10h21" stroke="#a0b093"/><circle cx="135" cy="169" r="2" fill="#a27d56"/><path d="M48 190v-45m0 18c-20-8-23-24-21-31 19 3 25 20 21 31Zm0-10c19-11 20-28 17-34-17 5-22 24-17 34Z" fill="#93a583" stroke="#7d936d"/><path d="M178 190v-28m0 11c14-4 19-15 17-21-14 1-20 13-17 21Z" fill="#93a583" stroke="#7d936d"/><path d="m144 68 10-4v22" stroke="#73866c" stroke-width="6"/><circle cx="180" cy="66" r="10" fill="#d4a675"/><path d="M87 63c5-6 11-6 16 0m-64 38c5-6 11-6 16 0" stroke="#9cae91" stroke-width="1.5" stroke-linecap="round"/></svg>`;
function planMarkup() {
  return `<div class="panel plan-panel"><div class="plan-icon" aria-hidden="true">▤</div><h2>A plan worth sharing.</h2><p>Give your trusted person a clear place to start.</p><dl><div><dt>Prepared for</dt><dd>${esc(state.recipient || "Choose your trusted person")}</dd></div><div><dt>Printed packet</dt><dd>${esc(state.packetLocation || "Choose a place they can find")}</dd></div><div><dt>Backup copy</dt><dd>${esc(state.backupLocation || "Keep a separate, tested copy")}</dd></div></dl><button class="button secondary" data-action="profile">${state.recipient ? "Edit handover plan" : "Set up your handover plan"} <span aria-hidden="true">↗</span></button></div>`;
}
function essentialsMarkup() {
  const p = A.progress(state);
  return `<section class="panel" aria-labelledby="essentialsHeading"><div class="panel-header"><div><h2 id="essentialsHeading">Your household essentials</h2><p>Small steps toward a useful handover.</p></div><span class="pill green">${p.reviewed} of ${p.total} reviewed</span></div><progress class="progress-track" max="${p.total || 1}" value="${p.reviewed}" aria-label="Applicable essentials reviewed"></progress><p class="progress-caption">${p.excluded ? `${p.excluded} marked not applicable. ` : ""}Reviews are due after 90 days. This checklist is not a safety or legal assessment.</p>${A.ESSENTIALS.map(
    (t) => {
      const record = state.records.find((r) => r.template === t.id),
        excluded = state.notApplicable.includes(t.id),
        status = A.status(record);
      return `<div class="essential-row"><span class="essential-icon ${status === "reviewed" ? "done" : ""}" aria-hidden="true">${status === "reviewed" ? "✓" : icon(t.id === "digital" ? "digital" : t.section)}</span><div class="essential-body"><h3>${t.title}</h3><p>${excluded ? "Marked not applicable" : record ? esc(reviewLabel(record)) : t.subtitle}</p></div><button class="text-button" data-essential="${t.id}">${excluded ? "Include again" : record ? "Open note" : "Add note"} <span aria-hidden="true">↗</span></button>${!record && !excluded ? `<button class="text-button" data-exclude="${t.id}" aria-label="Mark ${esc(t.title)} not applicable">N/A</button>` : ""}</div>`;
    },
  ).join("")}</section>`;
}
function renderOverview() {
  const next = A.ESSENTIALS.find(
    (t) =>
      !state.notApplicable.includes(t.id) &&
      A.status(state.records.find((r) => r.template === t.id)) !== "reviewed",
  );
  const stale = state.records.filter((r) => A.status(r) === "stale").length;
  $("pageContent").innerHTML =
    `${stale ? `<div class="notice">${stale} ${stale === 1 ? "note is" : "notes are"} due for a review. Check the details with the relevant person or provider.</div>` : ""}<div class="overview-layout"><div class="main-column"><section class="hero"><div class="hero-copy"><p class="eyebrow">START SMALL. MAKE IT USEFUL.</p><h2>${next ? "A little clarity for<br>life’s what-ifs." : "The next step?<br>Try it together."}</h2><p>${next ? "Who to call. Where to look. What to do next. Put the essentials in one thoughtful place." : "Your checklist is a starting point. Now check that someone else can use the handover."}</p><button class="button primary" ${next ? `data-essential="${next.id}"` : 'data-action="drill"'}>${next ? (state.records.length ? "Continue your setup" : "Start with the essentials") : "Practice the handover"} <span aria-hidden="true">→</span></button></div><div class="hero-art">${houseArt}</div></section>${essentialsMarkup()}</div><aside class="side-column" aria-label="Your next steps">${planMarkup()}<section class="note-card"><p class="eyebrow">THE BEST KIND OF BACKUP</p><h3>Someone who knows<br>where to look.</h3><p>Print a copy. Tell your trusted person where it lives. Try finding a few important details together.</p><a href="#handover" class="text-button">Make your handover useful ↗</a></section><p class="bottom-tip"><strong>New here?</strong> Explore a fictional household before you begin.<br><button class="text-button" data-action="demo">${demoMode ? "Return to your household" : "Take a look at an example"} ↗</button><br><button class="text-button" data-action="privacy">Privacy & storage details</button></p></aside></div>`;
}
function cardMarkup(r) {
  return `<article class="panel record-card"><div><span class="pill ${A.status(r) === "reviewed" ? "green" : "orange"}">${esc(reviewLabel(r))}</span></div><h3>${esc(r.title)}</h3><p class="record-ref">${esc(r.ref)}</p><p class="record-notes">${esc(r.notes)}</p><div class="record-actions"><button class="text-button" data-edit="${r.id}">Edit note</button><button class="text-button" data-review="${r.id}">${A.status(r) === "reviewed" ? "Review again" : "Mark reviewed"}</button><button class="text-button danger" data-delete="${r.id}">Delete</button></div></article>`;
}
function renderSection(page) {
  const section = A.SECTIONS.find((s) => s.id === page),
    records = state.records.filter((r) => r.section === page);
  const templates = A.ESSENTIALS.filter(
    (t) =>
      t.section === page &&
      !state.records.some((r) => r.template === t.id) &&
      !state.notApplicable.includes(t.id),
  );
  $("pageContent").innerHTML =
    `<div class="section-toolbar"><h2>${records.length} ${records.length === 1 ? "household note" : "household notes"}</h2><button class="button secondary" data-add="${page}">+ Add a note</button></div>${records.length ? `<div class="record-grid">${records.map(cardMarkup).join("")}</div>` : `<div class="panel empty-section"><span class="plan-icon" aria-hidden="true">${section.icon}</span><h2>Leave a little less to guesswork.</h2><p>${section.description} Start with a guided essential, or add your own note.</p><button class="button primary" ${templates[0] ? `data-essential="${templates[0].id}"` : `data-add="${page}"`}>${templates[0] ? "Start this essential" : "Add your first note"}</button></div>`}${templates.length ? `<div class="panel section-hint"><h3>Suggested essentials</h3>${templates.map((t) => `<p><button class="text-button" data-essential="${t.id}">${t.title} ↗</button></p>`).join("")}</div>` : ""}<p class="section-hint">Notes are drafts until you explicitly review them. Editing a note makes it a draft again.</p>`;
}
function renderHandover() {
  $("pageContent").innerHTML =
    `<div class="handover-grid">${planMarkup()}<section class="panel practice-card"><p class="eyebrow">PREPARATION IS A SHARED THING</p><h2>Give it a practice run.</h2><p>A filled-in note is a start. A handover works when someone else can find it and understand what to do.</p><div class="checklist-simple"><p>Choose what to include in a family or caregiver packet.</p><p>Print it, or save a PDF somewhere appropriate.</p><p>Ask your trusted person to find the important details.</p><p>Restore your encrypted backup in a different browser.</p></div><p><strong>Last recorded practice:</strong> ${formatDate(state.practicedAt)}</p><button class="button secondary" data-action="drill">Record a practice run ↗</button></section><section class="panel"><h2>Share only what’s needed.</h2><p class="section-hint">A caregiver may need routines and an emergency contact, without your financial or legal notes. Review the selected notes before printing or copying.</p><button class="button primary" data-action="packet">Choose packet contents</button></section><section class="panel"><h2>A map, not a legal document.</h2><p class="section-hint">Your notes help people locate information. They do not give permission to act on an account, appoint a guardian, or replace professional instructions. Keep originals and authorized access arrangements current.</p><button class="text-button" data-action="privacy">Read privacy & product limits ↗</button></section></div>`;
}
function render() {
  const page = currentPage(),
    section = A.SECTIONS.find((s) => s.id === page);
  $("householdName").textContent = state.familyName;
  $("demoBanner").hidden = !demoMode;
  $("saveStatus").textContent = demoMode
    ? "Example · changes are temporary"
    : corrupt || conflict
      ? "Browser copy needs attention"
      : lastStored
        ? "Saved on this browser"
        : "No notes saved yet";
  $("breadcrumb").textContent =
    section?.name || (page === "handover" ? "Your handover" : "Overview");
  $("pageEyebrow").textContent =
    page === "overview"
      ? "A LITTLE PREPARATION. A LOT OF PEACE OF MIND."
      : page === "handover"
        ? "FOR THE PEOPLE WHO COUNT ON YOU"
        : "YOUR HOUSEHOLD, THOUGHTFULLY DOCUMENTED";
  $("pageTitle").textContent =
    section?.name ||
    (page === "handover"
      ? "Make it easy to pick things up."
      : "Your family, in good hands.");
  $("pageDescription").textContent =
    section?.description ||
    (page === "handover"
      ? "Make a copy, choose a person, and try it together."
      : "Make the important things easy to find, even when you’re not there.");
  renderNavigation(page);
  if (page === "overview") renderOverview();
  else if (page === "handover") renderHandover();
  else renderSection(page);
  // An unprepared browser print must not silently disclose every household note.
  $("printPacket").innerHTML =
    '<div class="packet-document"><h1>Create a handover first</h1><p>Return to Ark and choose Create handover. Select the notes you intend to print, then use Print / save PDF.</p></div>';
}
function openRecord(templateId = null, id = null, section = "people") {
  const t = A.ESSENTIALS.find((t) => t.id === templateId),
    existing = id
      ? state.records.find((r) => r.id === id)
      : state.records.find((r) => r.template === templateId && templateId);
  if (t && state.notApplicable.includes(t.id)) {
    const next = clone(state);
    next.notApplicable = next.notApplicable.filter((x) => x !== t.id);
    if (!commit(next)) return;
  }
  $("recordForm").reset();
  $("recordError").textContent = "";
  $("recordStep").textContent = t
    ? `ESSENTIAL ${A.ESSENTIALS.indexOf(t) + 1} OF ${A.ESSENTIALS.length}`
    : "HOUSEHOLD NOTE";
  $("recordHeading").textContent = existing
    ? "Edit your note"
    : t?.title || "Add a household note";
  $("recordPrompt").textContent =
    t?.prompt ||
    "Leave clear, practical instructions for someone you trust. Avoid recording access secrets.";
  $("recordId").value = existing?.id || "";
  $("recordTemplate").value = existing?.template || t?.id || "";
  $("recordSection").innerHTML = A.SECTIONS.map(
    (s) => `<option value="${s.id}">${s.name}</option>`,
  ).join("");
  $("recordSection").value = existing?.section || t?.section || section;
  $("recordSection").disabled = Boolean(t || existing?.template);
  $("recordTitle").value = existing?.title || "";
  $("recordTitle").placeholder = t?.example || "e.g. The person to call";
  $("recordRef").value = existing?.ref || "";
  $("recordNotes").value = existing?.notes || "";
  openDialog("recordDialog");
}
$("recordForm").addEventListener("submit", (e) => {
  e.preventDefault();
  $("recordError").textContent = "";
  const next = clone(state),
    time = A.now(),
    id =
      $("recordId").value ||
      `note-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  const record = {
    id,
    template: $("recordTemplate").value || null,
    section: $("recordSection").value,
    title: $("recordTitle").value.trim(),
    ref: $("recordRef").value.trim(),
    notes: $("recordNotes").value.trim(),
    updatedAt: time,
    reviewedAt: null,
  };
  const index = next.records.findIndex((r) => r.id === id);
  if (index < 0) next.records.push(record);
  else next.records[index] = record;
  next.notApplicable = next.notApplicable.filter((t) => t !== record.template);
  if (commit(next, "recordError")) {
    $("recordDialog").close();
    toast("Note saved as a draft. Check the details, then mark it reviewed.");
  }
});
function openProfile() {
  $("profileError").textContent = "";
  $("profileName").value = state.familyName;
  $("profileRecipient").value = state.recipient;
  $("profileLocation").value = state.packetLocation;
  $("profileBackup").value = state.backupLocation;
  openDialog("profileDialog");
}
$("profileForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const next = clone(state);
  next.familyName = $("profileName").value.trim();
  next.recipient = $("profileRecipient").value.trim();
  next.packetLocation = $("profileLocation").value.trim();
  next.backupLocation = $("profileBackup").value.trim();
  if (commit(next, "profileError")) {
    $("profileDialog").close();
    toast("Handover plan saved.");
  }
});
$("profileBtn").addEventListener("click", openProfile);
$("privacyBtn").addEventListener("click", () => openDialog("privacyDialog"));
function toggleDemo() {
  if (!demoMode) {
    personalState = state;
    state = A.demo();
    demoMode = true;
  } else {
    state = personalState;
    personalState = null;
    demoMode = false;
  }
  location.hash = "overview";
  render();
}
$("exitDemoBtn").addEventListener("click", toggleDemo);
$("pageContent").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.essential) return openRecord(b.dataset.essential);
  if (b.dataset.add) return openRecord(null, null, b.dataset.add);
  if (b.dataset.edit) return openRecord(null, b.dataset.edit);
  if (b.dataset.exclude)
    return confirmAction(
      "Not applicable to your household?",
      "This essential will be shown as not applicable, separate from reviewed notes. You can include it again at any time.",
      "Mark not applicable",
      () => {
        const next = clone(state);
        next.notApplicable.push(b.dataset.exclude);
        return commit(next);
      },
    );
  if (b.dataset.delete)
    return confirmAction(
      "Delete this note?",
      "This removes the note from this browser copy. Previously downloaded backups and printed packets will still contain it.",
      "Delete note",
      () => {
        const next = clone(state);
        next.records = next.records.filter((r) => r.id !== b.dataset.delete);
        return commit(next);
      },
    );
  if (b.dataset.review)
    return confirmAction(
      "Have you checked these details?",
      "Confirm the contact, location, and instructions are current. This records your review date; it is not independent verification.",
      "Mark reviewed today",
      () => {
        const next = clone(state);
        next.records.find((r) => r.id === b.dataset.review).reviewedAt =
          A.now();
        return commit(next);
      },
    );
  if (b.dataset.action === "profile") openProfile();
  if (b.dataset.action === "privacy") openDialog("privacyDialog");
  if (b.dataset.action === "demo") toggleDemo();
  if (b.dataset.action === "packet") openPacket();
  if (b.dataset.action === "drill") {
    $("drillForm").reset();
    $("drillError").textContent = "";
    openDialog("drillDialog");
  }
});
$("drillForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const next = clone(state);
  next.practicedAt = A.now();
  if (commit(next, "drillError")) {
    $("drillDialog").close();
    toast("Practice recorded. Repeat after important household changes.");
  }
});
function download(content, name) {
  const blob = new Blob([content], { type: "application/json" }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function clearRestore() {
  restoreGeneration++;
  pendingRestore = null;
  $("restorePreview").hidden = true;
  $("backupError").textContent = "";
}
$("backupBtn").addEventListener("click", () => {
  if (demoMode)
    return toast("Return to your household before using backup or restore.");
  $("exportForm").reset();
  $("importForm").reset();
  clearRestore();
  $("backupSuccess").textContent = "";
  openDialog("backupDialog");
});
$("exportForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("backupError").textContent = "";
  $("backupSuccess").textContent = "";
  if ($("exportPassword").value !== $("exportConfirm").value) {
    $("backupError").textContent = "The passphrases do not match.";
    return;
  }
  if (corrupt) {
    $("backupError").textContent =
      "Your browser copy could not be read. Save the unreadable copy using the warning above, or restore a valid backup.";
    return;
  }
  $("exportSubmit").disabled = true;
  try {
    const encrypted = await A.encrypt(clone(state), $("exportPassword").value);
    download(
      JSON.stringify(encrypted, null, 2),
      `ark-backup-${new Date().toISOString().slice(0, 10)}.json`,
    );
    $("exportForm").reset();
    $("backupSuccess").textContent =
      "Encrypted file prepared for download. Confirm it is saved, store it separately, and test restoring it. The passphrase is not saved by Ark.";
  } catch (error) {
    $("backupError").textContent = error.message;
  } finally {
    $("exportSubmit").disabled = false;
  }
});
$("importFile").addEventListener("change", clearRestore);
$("importPassword").addEventListener("input", clearRestore);
$("importForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearRestore();
  $("backupSuccess").textContent = "";
  const generation = restoreGeneration;
  $("importSubmit").disabled = true;
  try {
    const file = $("importFile").files[0];
    if (!file || file.size > A.MAX_BYTES)
      throw new Error("Choose an Ark backup smaller than 5 MB.");
    const restored = await A.decode(
      await file.text(),
      $("importPassword").value,
    );
    if (generation !== restoreGeneration || !$("backupDialog").open) return;
    pendingRestore = restored;
    $("restoreSummary").textContent =
      `${restored.familyName} · ${restored.records.length} notes · last changed ${formatDate(restored.updatedAt)}. Review the source of this file before continuing.`;
    $("restorePreview").hidden = false;
    $("confirmRestoreBtn").focus();
  } catch (error) {
    if (generation === restoreGeneration)
      $("backupError").textContent = error.message;
  } finally {
    $("importSubmit").disabled = false;
  }
});
$("cancelRestoreBtn").addEventListener("click", clearRestore);
$("confirmRestoreBtn").addEventListener("click", () => {
  if (!pendingRestore) return;
  if (commit(clone(pendingRestore), "backupError", true)) {
    clearRestore();
    $("importForm").reset();
    $("backupSuccess").textContent =
      "Backup restored. Check your notes and make sure your trusted person can find the current packet.";
  }
});
$("backupDialog").addEventListener("close", () => {
  clearRestore();
  $("exportForm").reset();
  $("importForm").reset();
});
let packetPreset = "family";
function selectedIds() {
  return [...$("packetSelection").querySelectorAll("input:checked")].map(
    (input) => input.value,
  );
}
function buildPacket(ids, includePlan, title) {
  const selected = state.records.filter((r) => ids.includes(r.id)),
    wrapper = document.createElement("div");
  wrapper.className = "packet-document";
  const missing = A.ESSENTIALS.filter(
    (t) =>
      !state.notApplicable.includes(t.id) &&
      !state.records.some((r) => r.template === t.id),
  );
  wrapper.innerHTML = `<header class="packet-cover"><p class="packet-kicker">ARK / ${demoMode ? "FICTIONAL EXAMPLE / " : ""}CONFIDENTIAL HOUSEHOLD INFORMATION</p><h1>${esc(state.familyName)}</h1><h2>${esc(title)}</h2><p class="packet-meta">Prepared ${formatDate(A.now())} · ${selected.length} selected notes</p><p class="packet-meta">Use only with appropriate permission. This packet does not grant legal or account access.</p></header>${includePlan ? `<section><h2>Start here</h2><p><strong>Prepared for:</strong> ${esc(state.recipient || "Not recorded")}</p><p><strong>Printed packet location:</strong> ${esc(state.packetLocation || "Not recorded")}</p><p><strong>Backup location:</strong> ${esc(state.backupLocation || "Not recorded")}</p><p><strong>Last handover practice:</strong> ${formatDate(state.practicedAt)}</p></section>` : ""}<p class="packet-note">${selected.filter((r) => A.status(r) !== "reviewed").length} selected notes are drafts or due for review. Dates reflect household self-review, not independent verification.${includePlan ? ` ${missing.length} essentials have no note. ${state.notApplicable.length} marked not applicable.` : ""} For immediate danger, contact local emergency services.</p>${selected.length ? "" : "<p>No notes selected. Add a note or choose notes above.</p>"}${A.SECTIONS.map(
    (s) => {
      const records = selected.filter((r) => r.section === s.id);
      return records.length
        ? `<section><h2>${s.name}</h2>${records.map((r) => `<article><h3>${esc(r.title)}</h3><p class="packet-meta">${esc(reviewLabel(r))}</p>${r.ref ? `<p><strong>Contact / location:</strong> ${esc(r.ref)}</p>` : ""}<p>${esc(r.notes)}</p></article>`).join("")}</section>`
        : "";
    },
  ).join(
    "",
  )}<footer class="packet-footer">Printed and copied information is unencrypted and cannot be revoked. Keep it in an appropriate place and replace older copies after changes. This organizer is not legal, medical, or financial advice.</footer>`;
  return wrapper;
}
function renderPrintPacket(ids, includePlan, title) {
  $("printPacket").replaceChildren(buildPacket(ids, includePlan, title));
}
function updatePacketPreview() {
  const ids = selectedIds(),
    plan = $("includePlan").checked,
    title = packetPreset === "care" ? "Caregiver briefing" : "Family handover";
  $("packetPreview").replaceChildren(buildPacket(ids, plan, title));
  renderPrintPacket(ids, plan, title);
}
function setPreset(preset) {
  packetPreset = preset;
  $("includePlan").checked = preset === "family";
  $("packetSelection").innerHTML =
    state.records
      .map(
        (r) =>
          `<label class="check-label"><input type="checkbox" value="${r.id}" ${preset === "family" || r.section === "care" || r.template === "first-call" ? "checked" : ""}><span>${esc(r.title)}<small>${sectionName(r.section)} · ${esc(reviewLabel(r))}</small></span></label>`,
      )
      .join("") ||
    '<p class="section-hint">There are no notes yet. Add your first essential before creating a packet.</p>';
  document.querySelectorAll("[data-preset]").forEach((b) => {
    b.classList.toggle("selected", b.dataset.preset === preset);
    b.setAttribute("aria-pressed", String(b.dataset.preset === preset));
  });
  updatePacketPreview();
}
function openPacket() {
  $("packetError").textContent = "";
  setPreset("family");
  openDialog("packetDialog");
}
$("printBtn").addEventListener("click", openPacket);
document
  .querySelectorAll("[data-preset]")
  .forEach((b) =>
    b.addEventListener("click", () => setPreset(b.dataset.preset)),
  );
$("packetSelection").addEventListener("change", updatePacketPreview);
$("includePlan").addEventListener("change", updatePacketPreview);
$("copyPacketBtn").addEventListener("click", async () => {
  try {
    if (!navigator.clipboard?.writeText)
      throw new Error(
        "Clipboard access is unavailable. Select and copy the preview text manually, or print a packet.",
      );
    await navigator.clipboard.writeText($("packetPreview").innerText);
    $("packetError").textContent = "";
    toast("Briefing copied. Share only with the intended person.");
  } catch (error) {
    $("packetError").textContent = error.message;
  }
});
$("printPacketBtn").addEventListener("click", () => {
  updatePacketPreview();
  $("packetDialog").close();
  window.print();
});
window.addEventListener("hashchange", () => {
  render();
  $("main").focus({ preventScroll: true });
});
window.addEventListener("storage", (e) => {
  if (e.key === A.STORAGE_KEY || e.key === null) {
    conflict = true;
    warning(
      "Another tab changed or cleared this household. Reload Ark before saving to avoid overwriting that copy.",
    );
    $("saveStatus").textContent = "Another tab changed this copy";
  }
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted) render();
});
load();
render();
