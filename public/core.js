/* Ark's data contract. No runtime dependencies or network access. */
(function (root) {
  "use strict";
  const VERSION = 4;
  const STORAGE_KEY = "ark_handover_v4";
  const LEGACY_KEY = "ark_vault_data_clean_v3";
  const ITERATIONS = 600000;
  const MAX_BYTES = 5 * 1024 * 1024;
  const SECTIONS = [
    {
      id: "people",
      name: "People & contacts",
      icon: "♧",
      description: "The people to call, and how they can help.",
    },
    {
      id: "money",
      name: "Money & insurance",
      icon: "▱",
      description:
        "Keep the practical things running, one clear instruction at a time.",
    },
    {
      id: "home",
      name: "Home & essentials",
      icon: "⌂",
      description:
        "The little things about your home that someone else needs to know.",
    },
    {
      id: "care",
      name: "Care & routines",
      icon: "♡",
      description:
        "Thoughtful instructions for the people and pets who depend on you.",
    },
    {
      id: "documents",
      name: "Documents & access",
      icon: "▤",
      description:
        "A map to your important papers and authorized account access.",
    },
  ];
  const ESSENTIALS = [
    {
      id: "first-call",
      section: "people",
      title: "Who to call first",
      subtitle: "A trusted person, their number, and their role.",
      prompt:
        "Who should your family call if you are unavailable? Add a current phone number and what this person can help with.",
      example: "e.g. Jamie — partner",
      icon: "♧",
    },
    {
      id: "bills",
      section: "money",
      title: "Keep the bills running",
      subtitle: "The next payment and where to find the details.",
      prompt:
        "Which bills need attention first? Record due dates, which account pays them (last four digits only), and where to find payment instructions.",
      example: "e.g. Mortgage & essential bills",
      icon: "▱",
    },
    {
      id: "insurance",
      section: "money",
      title: "Find the insurance",
      subtitle: "Provider, contact, and policy document location.",
      prompt:
        "Where are your current insurance documents? Record the provider and claims contact. Confirm coverage and claims steps directly with the insurer.",
      example: "e.g. Life insurance — document location",
      icon: "◇",
    },
    {
      id: "shutoffs",
      section: "home",
      title: "Know the home essentials",
      subtitle: "Water shutoff, spare keys, and useful contacts.",
      prompt:
        "Describe where the water shutoff is and where to find safe operating instructions for your home. For gas or electrical concerns, contact the utility or a qualified professional.",
      example: "e.g. Water shutoff & home contacts",
      icon: "⌂",
    },
    {
      id: "dependents",
      section: "care",
      title: "Care for those who depend on you",
      subtitle: "Children, parents, pets, and everyday routines.",
      prompt:
        "Who needs care if you are unavailable? Include routine, care contacts, allergies as reported by the person or clinician, and where to find current professional care instructions. This note is not a medical order.",
      example: "e.g. School pickup & evening routine",
      icon: "♡",
    },
    {
      id: "papers",
      section: "documents",
      title: "Locate the important papers",
      subtitle: "Legal originals and the right professional to call.",
      prompt:
        "Where are current signed legal documents? Include the location and professional contact. A note here does not create authority or replace a will, power of attorney, or court appointment.",
      example: "e.g. Estate documents — blue folder",
      icon: "▤",
    },
    {
      id: "digital",
      section: "documents",
      title: "Plan authorized digital access",
      subtitle: "Password-manager recovery instructions, without secrets.",
      prompt:
        "Where can an authorized person find your password-manager emergency instructions or legacy-contact details? Do not put passwords, recovery codes, or device PINs here.",
      example: "e.g. Password-manager emergency instructions",
      icon: "⌘",
    },
  ];
  const now = () => new Date().toISOString();
  function blank() {
    return {
      version: VERSION,
      familyName: "My household",
      recipient: "",
      packetLocation: "",
      backupLocation: "",
      practicedAt: null,
      updatedAt: now(),
      records: [],
      notApplicable: [],
    };
  }
  function text(value, max, name) {
    if (typeof value !== "string" || value.length > max)
      throw new Error(`Invalid ${name}.`);
    return value;
  }
  function date(value, nullable = false) {
    if (nullable && value === null) return null;
    if (
      typeof value !== "string" ||
      value.length > 35 ||
      !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      Date.parse(value) > Date.now() + 86400000
    )
      throw new Error("Invalid record date.");
    return value;
  }
  function validate(data) {
    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      data.version !== VERSION
    )
      throw new Error("Unsupported Ark data format.");
    const clean = {
      version: VERSION,
      familyName: text(data.familyName, 80, "household name"),
      recipient: text(data.recipient, 160, "recipient"),
      packetLocation: text(data.packetLocation, 300, "packet location"),
      backupLocation: text(data.backupLocation, 300, "backup location"),
      practicedAt: date(data.practicedAt, true),
      updatedAt: date(data.updatedAt),
      records: [],
      notApplicable: [],
    };
    if (!clean.familyName.trim())
      throw new Error("A household name is required.");
    if (
      !Array.isArray(data.records) ||
      data.records.length > 500 ||
      !Array.isArray(data.notApplicable) ||
      data.notApplicable.length > ESSENTIALS.length
    )
      throw new Error("Invalid record collection.");
    const ids = new Set(),
      templates = new Set();
    for (const r of data.records) {
      if (!r || typeof r !== "object") throw new Error("Invalid note.");
      const id = text(r.id, 100, "note ID");
      if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id))
        throw new Error("Invalid or duplicate note ID.");
      ids.add(id);
      if (!SECTIONS.some((s) => s.id === r.section))
        throw new Error("Invalid section.");
      const template =
        r.template === null ? null : text(r.template, 30, "essential");
      const spec = ESSENTIALS.find((t) => t.id === template);
      if (
        template &&
        (!spec || spec.section !== r.section || templates.has(template))
      )
        throw new Error("Invalid or duplicate essential note.");
      if (template) templates.add(template);
      const entry = {
        id,
        section: r.section,
        template,
        title: text(r.title, 120, "title"),
        ref: text(r.ref, 300, "contact or location"),
        notes: text(r.notes, 4000, "instructions"),
        updatedAt: date(r.updatedAt),
        reviewedAt: date(r.reviewedAt, true),
      };
      if (!entry.title.trim() || (!entry.ref.trim() && !entry.notes.trim()))
        throw new Error(
          "Each note needs a title and a contact, location, or instruction.",
        );
      if (
        entry.reviewedAt &&
        Date.parse(entry.reviewedAt) < Date.parse(entry.updatedAt)
      )
        throw new Error("Review date predates the latest edit.");
      clean.records.push(entry);
    }
    for (const id of data.notApplicable) {
      if (
        !ESSENTIALS.some((t) => t.id === id) ||
        clean.notApplicable.includes(id) ||
        templates.has(id)
      )
        throw new Error("Invalid not-applicable essential.");
      clean.notApplicable.push(id);
    }
    return clean;
  }
  function migrateLegacy(data) {
    if (
      !data ||
      typeof data !== "object" ||
      typeof data.familyName !== "string"
    )
      throw new Error("Not a recognized legacy Ark backup.");
    const result = blank();
    result.familyName = text(data.familyName, 80, "household name");
    const map = {
      urgent: "people",
      finance: "money",
      home: "home",
      parents: "care",
    };
    for (const [old, section] of Object.entries(map)) {
      if (!Array.isArray(data[old]) || data[old].length > 500)
        throw new Error("Invalid legacy collection.");
      for (const r of data[old]) {
        if (!r || typeof r !== "object")
          throw new Error("Invalid legacy note.");
        const title = text(r.title, 120, "legacy title"),
          ref = text(r.ref ?? "", 300, "legacy reference"),
          notes = text(r.notes ?? "", 4000, "legacy notes");
        result.records.push({
          id: `legacy-${result.records.length}`,
          template: null,
          section,
          title,
          ref,
          notes:
            notes ||
            (!ref ? "Imported note: please add current instructions." : ""),
          updatedAt: result.updatedAt,
          reviewedAt: null,
        });
      }
    }
    if (data.sitter !== undefined) {
      if (
        !data.sitter ||
        typeof data.sitter !== "object" ||
        Array.isArray(data.sitter)
      )
        throw new Error("Invalid legacy care briefing.");
      const lines = ["kids", "allergies", "contacts", "house"]
        .map((key) => {
          const value = text(data.sitter[key] ?? "", 2000, "legacy care field");
          return value ? `${key.toUpperCase()}\n${value}` : "";
        })
        .filter(Boolean);
      if (lines.length)
        result.records.push({
          id: "legacy-sitter",
          template: null,
          section: "care",
          title: "Imported caregiver briefing",
          ref: "",
          notes: lines.join("\n\n"),
          updatedAt: result.updatedAt,
          reviewedAt: null,
        });
    }
    return validate(result);
  }
  function parseData(value) {
    return value?.version === VERSION ? validate(value) : migrateLegacy(value);
  }
  function status(record, at = Date.now()) {
    if (!record) return "missing";
    if (!record.reviewedAt) return "draft";
    return at - Date.parse(record.reviewedAt) > 90 * 86400000
      ? "stale"
      : "reviewed";
  }
  function progress(state, at = Date.now()) {
    const applicable = ESSENTIALS.filter(
      (t) => !state.notApplicable.includes(t.id),
    );
    const reviewed = applicable.filter(
      (t) =>
        status(
          state.records.find((r) => r.template === t.id),
          at,
        ) === "reviewed",
    ).length;
    return {
      reviewed,
      total: applicable.length,
      excluded: state.notApplicable.length,
      percent: applicable.length
        ? Math.round((reviewed / applicable.length) * 100)
        : 0,
    };
  }
  function persist(storage, value) {
    const clean = validate(value);
    storage.setItem(STORAGE_KEY, JSON.stringify(clean));
    return clean;
  }
  function b64(bytes) {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  }
  function unb64(s, max) {
    if (
      typeof s !== "string" ||
      s.length > max ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(s)
    )
      throw new Error("Invalid encrypted backup.");
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  }
  async function derive(password, salt) {
    if (!globalThis.crypto?.subtle)
      throw new Error(
        "Encrypted backups are unavailable in this browser. Use a current browser or run Ark at http://localhost:5000.",
      );
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }
  async function encrypt(state, password) {
    text(password, 256, "passphrase");
    if (password.length < 12)
      throw new Error("Use a passphrase of at least 12 characters.");
    const clean = validate(state),
      salt = crypto.getRandomValues(new Uint8Array(16)),
      iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await derive(password, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(JSON.stringify(clean)),
    );
    return {
      format: "ark-encrypted",
      version: 1,
      kdf: "PBKDF2-SHA256",
      iterations: ITERATIONS,
      cipher: "AES-256-GCM",
      salt: b64(salt),
      iv: b64(iv),
      data: b64(new Uint8Array(encrypted)),
    };
  }
  async function decode(raw, password = "") {
    if (
      typeof raw !== "string" ||
      new TextEncoder().encode(raw).length > MAX_BYTES
    )
      throw new Error("Backup exceeds the 5 MB limit.");
    let value;
    try {
      value = JSON.parse(raw);
    } catch {
      throw new Error(
        "This file is not valid JSON. Your current notes are unchanged.",
      );
    }
    if (value?.format !== "ark-encrypted") return parseData(value);
    if (
      value.version !== 1 ||
      value.kdf !== "PBKDF2-SHA256" ||
      value.iterations !== ITERATIONS ||
      value.cipher !== "AES-256-GCM"
    )
      throw new Error("Unsupported encrypted backup format.");
    const salt = unb64(value.salt, 32),
      iv = unb64(value.iv, 24),
      data = unb64(value.data, MAX_BYTES);
    if (salt.length !== 16 || iv.length !== 12 || data.length < 17)
      throw new Error("Invalid encrypted backup.");
    if (!password) throw new Error("Enter the passphrase for this backup.");
    const key = await derive(password, salt);
    let clear;
    try {
      clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    } catch {
      throw new Error(
        "The passphrase is incorrect or the backup has been damaged. Your notes are unchanged.",
      );
    }
    return validate(JSON.parse(new TextDecoder().decode(clear)));
  }
  function demo() {
    const s = blank();
    s.familyName = "The Taylor household";
    s.recipient = "Alex Taylor — partner";
    s.packetLocation = "Blue folder on the study shelf";
    s.backupLocation = "USB in our document box";
    const examples = [
      [
        "Alex Taylor",
        "+1 (202) 555-0142",
        "Alex is our first call. Our neighbor Morgan can help with school pickup.",
      ],
      [
        "Essential monthly bills",
        "Household binder, Bills tab",
        "Rent is due on the 1st. Utilities are on autopay. Account references are in the household binder.",
      ],
      [
        "Insurance documents",
        "Blue folder, Insurance tab",
        "Provider and claims contact are on the front of the current policy. Confirm instructions with the insurer.",
      ],
      [
        "Water shutoff",
        "Utility cupboard by the front door",
        "The labeled water valve is beside the meter. The plumber’s contact is on the cupboard door.",
      ],
      [
        "Evening routine",
        "School and care folder",
        "Sam finishes school at 3:15. Pickup permissions and current care instructions are in the care folder.",
      ],
      [
        "Signed legal documents",
        "Document box, study cupboard",
        "Original documents and our attorney’s contact are in the box. Ask the attorney about authority before acting.",
      ],
      [
        "Password-manager instructions",
        "Emergency sheet in our document box",
        "Alex is our designated emergency contact. Follow the instructions on the recovery sheet. No credentials are stored here.",
      ],
    ];
    s.records = ESSENTIALS.map((t, i) => ({
      id: `demo-${i}`,
      template: t.id,
      section: t.section,
      title: examples[i][0],
      ref: examples[i][1],
      notes: examples[i][2],
      updatedAt: s.updatedAt,
      reviewedAt: i < 4 ? s.updatedAt : null,
    }));
    return s;
  }
  const api = {
    VERSION,
    STORAGE_KEY,
    LEGACY_KEY,
    MAX_BYTES,
    SECTIONS,
    ESSENTIALS,
    blank,
    validate,
    parseData,
    migrateLegacy,
    status,
    progress,
    persist,
    encrypt,
    decode,
    demo,
    now,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Ark = api;
})(globalThis);
