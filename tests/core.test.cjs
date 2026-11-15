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
  await assert.rejects(A.decode("x".repeat(A.MAX_BYTES + 1)), /5 MB/);
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
