const { test } = require("node:test");
const assert = require("node:assert/strict");
const A = require("../public/core.js");

function note(template = "first-call") {
  const time = A.now(),
    spec = A.ESSENTIALS.find((t) => t.id === template);
  return {
    id: "note-1",
    template,
    section: spec.section,
    title: "Jamie",
    ref: "202-555-0142",
    notes: "Call first.",
    updatedAt: time,
    reviewedAt: null,
  };
}
test("one note does not imply a complete household, and new notes are drafts", () => {
  const s = A.blank();
  s.records.push(note());
  assert.deepEqual(A.progress(s), {
    reviewed: 0,
    total: 7,
    excluded: 0,
    percent: 0,
  });
  s.records[0].reviewedAt = A.now();
  assert.equal(A.progress(s).reviewed, 1);
  assert.equal(A.progress(s).total, 7);
});
test("not-applicable items remain separate and all excluded is not 100 percent", () => {
  const s = A.blank();
  s.notApplicable = A.ESSENTIALS.map((t) => t.id);
  assert.deepEqual(A.progress(s), {
    reviewed: 0,
    total: 0,
    excluded: 7,
    percent: 0,
  });
  assert.doesNotThrow(() => A.validate(s));
});
test("reviews expire after 90 days", () => {
  const r = note();
  r.reviewedAt = r.updatedAt;
  assert.equal(A.status(r, Date.parse(r.reviewedAt) + 91 * 86400000), "stale");
});
test("schema rejects invalid, duplicate and contradictory records", () => {
  const s = A.blank();
  s.records.push(note());
  assert.throws(
    () => A.validate({ ...s, records: [...s.records, ...s.records] }),
    /duplicate/,
  );
  assert.throws(
    () => A.validate({ ...s, records: [{ ...note(), section: "unknown" }] }),
    /section/,
  );
  assert.throws(
    () => A.validate({ ...s, notApplicable: ["first-call"] }),
    /not-applicable/,
  );
  assert.throws(
    () => A.validate({ ...s, records: [{ ...note(), ref: "", notes: "" }] }),
    /instruction/,
  );
  assert.throws(
    () => A.validate({ ...s, records: [{ ...note(), id: 'x" onclick="' }] }),
    /ID/,
  );
  assert.throws(
    () =>
      A.validate({ ...s, records: [{ ...note(), notes: "a".repeat(4001) }] }),
    /instructions/,
  );
  assert.throws(() => A.validate({ ...s, updatedAt: "not a date" }), /date/);
  assert.throws(() => A.validate({ ...s, version: 999 }), /Unsupported/);
});
test("legacy migration preserves notes and care fields without trusting old verification", () => {
  const old = {
    familyName: "Legacy",
    urgent: [{ title: "Contact", ref: "555", notes: "Call", verified: true }],
    finance: [],
    home: [],
    parents: [],
    sitter: {
      kids: "Sam",
      allergies: "Ask clinician",
      contacts: "Jamie",
      house: "Bedtime 8",
    },
  };
  const s = A.migrateLegacy(old);
  assert.equal(s.records.length, 2);
  assert.equal(s.records[0].reviewedAt, null);
  assert.equal(s.records[0].template, null);
  assert.match(s.records[1].notes, /Bedtime 8/);
  assert.equal(A.progress(s).reviewed, 0);
  assert.equal(A.progress(s).total, 7);
  assert.throws(() =>
    A.migrateLegacy({ ...old, urgent: { title: "invalid" } }),
  );
});
test("validator projects known fields and cannot import a prototype payload", () => {
  const s = A.blank();
  const imported = JSON.parse(
    JSON.stringify(s).replace(
      '"version":4',
      '"__proto__":{"polluted":true},"version":4',
    ),
  );
  assert.equal(Object.hasOwn(A.validate(imported), "__proto__"), false);
  assert.equal({}.polluted, undefined);
});
test("failed persistence propagates rather than returning a successful state", () => {
  const s = A.blank();
  const before = JSON.stringify(s);
  assert.throws(
    () =>
      A.persist(
        {
          setItem() {
            throw new Error("quota");
          },
        },
        s,
      ),
    /quota/,
  );
  assert.equal(JSON.stringify(s), before);
});
test("encrypted backups round-trip, hide household name and use fresh randomness", async () => {
  const s = A.blank();
  s.familyName = "A secret family";
  s.records.push(note());
  const one = await A.encrypt(s, "a long fictional phrase"),
    two = await A.encrypt(s, "a long fictional phrase");
  assert.equal(JSON.stringify(one).includes(s.familyName), false);
  assert.notEqual(one.salt, two.salt);
  assert.notEqual(one.iv, two.iv);
  assert.deepEqual(
    await A.decode(JSON.stringify(one), "a long fictional phrase"),
    s,
  );
});
test("wrong passphrase and tampered ciphertext fail authenticated decryption", async () => {
  const file = await A.encrypt(A.blank(), "a long fictional phrase");
  await assert.rejects(
    A.decode(JSON.stringify(file), "another long phrase"),
    /incorrect|damaged/,
  );
  const bytes = Buffer.from(file.data, "base64");
  bytes[0] ^= 1;
  file.data = bytes.toString("base64");
  await assert.rejects(
    A.decode(JSON.stringify(file), "a long fictional phrase"),
    /incorrect|damaged/,
  );
});
test("malformed imports and untrusted KDF parameters fail without processing", async () => {
  await assert.rejects(A.decode("not json"), /valid JSON/);
  await assert.rejects(A.decode("x".repeat(A.MAX_BYTES + 1)), /32 MB/);
  await assert.rejects(
    A.decode(
      JSON.stringify({ format: "ark-encrypted", version: 1, iterations: 1 }),
      "anything",
    ),
    /Unsupported/,
  );
  await assert.rejects(A.encrypt(A.blank(), "short"), /12 characters/);
});
test("old plaintext and current plaintext imports are validated", async () => {
  const s = A.blank();
  assert.deepEqual(await A.decode(JSON.stringify(s)), s);
  await assert.rejects(A.decode('{"familyName":"not enough"}'), /legacy/);
});
test("example records are valid and created independently", () => {
  const d = A.demo();
  assert.equal(A.validate(d).records.length, 7);
  d.familyName = "changed";
  assert.notEqual(A.demo().familyName, d.familyName);
});

test("every maximum-size legal backup remains importable, including JSON escaping", async () => {
  const s = A.blank(),
    time = A.now();
  s.records = Array.from({ length: 500 }, (_, i) => ({
    id: `max-${i}`,
    template: null,
    section: "care",
    title: "t".repeat(120),
    ref: "r".repeat(300),
    notes: "\u0001".repeat(4000),
    updatedAt: time,
    reviewedAt: null,
  }));
  const file = await A.encrypt(s, "large backup fictional phrase");
  const raw = JSON.stringify(file, null, 2);
  assert.ok(Buffer.byteLength(raw) < A.MAX_BYTES);
  assert.deepEqual(await A.decode(raw, "large backup fictional phrase"), s);
});

test("migration retains legacy labels and splits long care instructions without truncation", () => {
  const old = {
    familyName: "Legacy",
    urgent: [
      {
        title: "Contact",
        badge: "CALL SECOND AFTER SPOUSE",
        ref: "555",
        notes: "Call",
      },
    ],
    finance: [],
    home: [],
    parents: [],
    sitter: {
      kids: "k".repeat(3000),
      allergies: "a".repeat(3000),
      contacts: "c".repeat(3000),
      house: "h".repeat(3000),
    },
  };
  const s = A.migrateLegacy(old);
  assert.equal(s.records[0].legacyLabel, old.urgent[0].badge);
  const recovered = s.records
    .filter((r) => r.id.startsWith("legacy-sitter"))
    .map((r) => r.notes)
    .join("");
  assert.equal(
    recovered,
    "KIDS\n" +
      old.sitter.kids +
      "\n\nALLERGIES\n" +
      old.sitter.allergies +
      "\n\nCONTACTS\n" +
      old.sitter.contacts +
      "\n\nHOUSE\n" +
      old.sitter.house,
  );
});

test("release metadata agrees with the running application", () => {
  assert.equal(A.APP_VERSION, require("../package.json").version);
});

test("optional recovery failure does not prevent a normal save", () => {
  const initial = A.blank(),
    updated = { ...initial, familyName: "Changed" },
    values = new Map([[A.STORAGE_KEY, JSON.stringify(initial)]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem(key, value) {
      if (key === A.RECOVERY_KEY)
        throw new DOMException("Full", "QuotaExceededError");
      values.set(key, value);
    },
    removeItem: (key) => values.delete(key),
  };
  const result = A.persistWithRecovery(
    storage,
    updated,
    JSON.stringify(initial),
  );
  assert.equal(result.recoverySaved, false);
  assert.equal(JSON.parse(values.get(A.STORAGE_KEY)).familyName, "Changed");
});

test("quota consumed by a duplicate snapshot is released before retrying the save", () => {
  const initial = A.blank(),
    older = { ...initial, familyName: "Older" },
    updated = { ...initial, familyName: "Changed" };
  const previous = JSON.stringify(initial),
    olderRaw = JSON.stringify(older),
    values = new Map([
      [A.STORAGE_KEY, previous],
      [A.RECOVERY_KEY, olderRaw],
    ]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem(key, value) {
      if (key === A.STORAGE_KEY && values.get(A.RECOVERY_KEY) === previous)
        throw new DOMException("Full", "QuotaExceededError");
      values.set(key, value);
    },
    removeItem: (key) => values.delete(key),
  };
  const result = A.persistWithRecovery(storage, updated, previous);
  assert.equal(result.recoverySaved, false);
  assert.equal(values.get(A.RECOVERY_KEY), olderRaw);
  assert.equal(JSON.parse(values.get(A.STORAGE_KEY)).familyName, "Changed");
});
