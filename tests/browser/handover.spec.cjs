const { test, expect } = require("@playwright/test");
const { AxeBuilder } = require("@axe-core/playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const A = require("../../public/core.js");
const key = A.STORAGE_KEY;

async function addFirst(page, title = "Jamie — partner") {
  await page.locator(".hero [data-essential]").click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page
    .getByLabel("Contact or location", { exact: true })
    .fill("202-555-0142");
  await page.getByLabel("What should they know?").fill("Call Jamie first.");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
}
async function seed(page, state) {
  await page.addInitScript(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key, state },
  );
  await page.goto("/");
}
test("cold offline load uses only bundled assets; example never touches personal data", async ({
  page,
  context,
}) => {
  const outbound = [],
    errors = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://localhost:5017/"))
      outbound.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await context.route("**/*", (route) =>
    route.request().url().startsWith("http://localhost:5017/")
      ? route.continue()
      : route.abort(),
  );
  await page.goto("/");
  await expect(page.locator("#essentialsHeading")).toBeVisible();
  await expect(page.locator("#pageContent")).toContainText("0 of 7 reviewed");
  await page.getByRole("button", { name: "Take a look at an example" }).click();
  await expect(page.locator("#householdName")).toHaveText(
    "The Taylor household",
  );
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    null,
  );
  await page.getByRole("button", { name: "Back to my household" }).click();
  await expect(page.locator("#householdName")).toHaveText("My household");
  expect(outbound).toEqual([]);
  expect(errors).toEqual([]);
});
test("entry is a draft, review is explicit, editing clears review and reload preserves notes", async ({
  page,
}) => {
  await page.goto("/");
  await addFirst(page);
  await expect(page.locator("#pageContent")).toContainText("0 of 7 reviewed");
  await page.getByRole("link", { name: /People & contacts/ }).click();
  await page
    .getByRole("button", { name: "Mark reviewed", exact: true })
    .click();
  await page.getByRole("button", { name: "Mark reviewed today" }).click();
  await expect(page.locator(".record-card")).toContainText("Reviewed");
  await page.getByRole("button", { name: "Edit note", exact: true }).click();
  await page
    .getByLabel("What should they know?")
    .fill("Updated contact instructions.");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(page.locator(".record-card")).toContainText(
    "Draft · not reviewed",
  );
  await page.reload();
  await expect(page.locator(".record-card")).toContainText(
    "Updated contact instructions.",
  );
});
test("encrypted download round-trips through a second browser context and requires confirmation", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await addFirst(page, "Private family contact");
  await page.getByRole("button", { name: "Backup & restore" }).click();
  await page
    .getByLabel("New backup passphrase")
    .fill("fictional testing phrase");
  await page.getByLabel("Repeat passphrase").fill("fictional testing phrase");
  const waiting = page.waitForEvent("download");
  await page.getByRole("button", { name: "Encrypt & download" }).click();
  const download = await waiting;
  const fs = require("node:fs/promises");
  const raw = await fs.readFile(await download.path(), "utf8");
  expect(raw).not.toContain("Private family contact");
  expect(JSON.parse(raw).format).toBe("ark-encrypted");
  const second = await browser.newContext();
  const other = await second.newPage();
  await other.goto("http://localhost:5017/");
  await other.getByRole("button", { name: "Backup & restore" }).click();
  await other.getByLabel("Backup file").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  await other.locator("#importPassword").fill("wrong fictional phrase");
  await other.getByRole("button", { name: "Check backup" }).click();
  await expect(other.locator("#backupError")).toContainText("incorrect");
  expect(await other.evaluate((key) => localStorage.getItem(key), key)).toBe(
    null,
  );
  await other.locator("#importPassword").fill("fictional testing phrase");
  await other.getByRole("button", { name: "Check backup" }).click();
  await expect(other.locator("#restorePreview")).toBeVisible();
  expect(await other.evaluate((key) => localStorage.getItem(key), key)).toBe(
    null,
  );
  await other.getByRole("button", { name: "Replace with this backup" }).click();
  await expect(other.locator("#backupSuccess")).toContainText(
    "Backup restored",
  );
  expect(
    JSON.parse(await other.evaluate((key) => localStorage.getItem(key), key))
      .records[0].title,
  ).toBe("Private family contact");
  await second.close();
});
test("malformed restore does not replace existing records", async ({
  page,
}) => {
  await page.goto("/");
  await addFirst(page);
  const before = await page.evaluate((key) => localStorage.getItem(key), key);
  await page.getByRole("button", { name: "Backup & restore" }).click();
  const invalid = { ...A.blank(), records: [{ id: "broken" }] };
  await page.getByLabel("Backup file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(invalid)),
  });
  await page.getByRole("button", { name: "Check backup" }).click();
  await expect(page.locator("#backupError")).not.toBeEmpty();
  await expect(page.locator("#restorePreview")).toBeHidden();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    before,
  );
});
test("storage failures keep the form and never report success", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.goto("/");
  await addFirst(page);
  await expect(page.locator("#recordDialog")).toBeVisible();
  await expect(page.locator("#recordError")).toContainText("could not save");
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Jamie — partner",
  );
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    null,
  );
});
test("invalid saved copy is preserved and normal writes are blocked", async ({
  page,
}) => {
  await page.addInitScript((key) => localStorage.setItem(key, "{invalid"), key);
  await page.goto("/");
  await expect(page.locator("#storageWarning")).toContainText(
    "has not been replaced",
  );
  await addFirst(page);
  await expect(page.locator("#recordError")).toContainText("preserved");
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    "{invalid",
  );
});
test("legacy data migrates without inheriting verification flags", async ({
  page,
}) => {
  const old = {
    familyName: "Old household",
    urgent: [
      { title: "Old contact", ref: "555", notes: "Call first", verified: true },
    ],
    finance: [],
    home: [],
    parents: [],
    sitter: { kids: "Sam", allergies: "", contacts: "", house: "Bedtime 8" },
  };
  await page.addInitScript(
    ({ old, key }) => localStorage.setItem(key, JSON.stringify(old)),
    { old, key: A.LEGACY_KEY },
  );
  await page.goto("/");
  await expect(page.locator("#householdName")).toHaveText("Old household");
  await expect(page.locator("#pageContent")).toContainText("0 of 7 reviewed");
  const migrated = JSON.parse(
    await page.evaluate((key) => localStorage.getItem(key), key),
  );
  expect(migrated.records).toHaveLength(2);
  expect(migrated.records[0].reviewedAt).toBeNull();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), A.LEGACY_KEY),
  ).not.toBeNull();
});
test("caregiver preset excludes finance, access and location plan; print keeps all selected text", async ({
  page,
}) => {
  const s = A.demo();
  s.records.find((r) => r.section === "care").notes =
    "Long routine\n".repeat(80) + "END OF ROUTINE";
  await seed(page, s);
  await page.getByRole("button", { name: "Create handover" }).click();
  await page
    .getByRole("button", { name: "Caregiver briefing", exact: true })
    .click();
  await expect(page.locator("#includePlan")).not.toBeChecked();
  await expect(page.locator("#packetPreview")).toContainText("END OF ROUTINE");
  await expect(page.locator("#packetPreview")).not.toContainText(
    "Essential monthly bills",
  );
  await expect(page.locator("#packetPreview")).not.toContainText(
    "Password-manager instructions",
  );
  await expect(page.locator("#packetPreview")).not.toContainText(
    "Blue folder on the study shelf",
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#printPacket")).toBeVisible();
  await expect(page.locator("#printPacket")).toContainText("END OF ROUTINE");
  await expect(page.locator(".app-shell")).toBeHidden();
});
test("untrusted note markup is displayed as text", async ({ page }) => {
  const s = A.demo();
  s.records[0].title = "<img src=x onerror=alert(1)>";
  await seed(page, s);
  await page.getByRole("link", { name: /People & contacts/ }).click();
  await expect(page.locator(".record-card h3")).toHaveText(s.records[0].title);
  expect(await page.locator(".record-card img").count()).toBe(0);
});
test("stale tabs cannot overwrite the newer copy", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const other = await context.newPage();
  await other.goto("http://localhost:5017/");
  await addFirst(page);
  await expect(other.locator("#storageWarning")).toContainText("Another tab");
  await expect(other.locator(".hero [data-essential]")).toBeDisabled();
  await expect(other.locator("#saveStatus")).toHaveText("Read-only snapshot");
  const stored = JSON.parse(
    await other.evaluate((key) => localStorage.getItem(key), key),
  );
  expect(stored.records[0].title).toBe("Jamie — partner");
});
test("keyboard forms, mobile layout, and main screens pass accessibility checks", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  let results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.locator(".hero [data-essential]").click();
  results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.locator("#recordDialog")).toBeHidden();
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-overview.png`,
    fullPage: true,
  });
});
test("standalone file loads with network disabled from the start", async ({
  page,
  context,
}) => {
  await context.setOffline(true);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve("public/index.html")).href);
  await expect(page.locator("#essentialsHeading")).toBeVisible();
  await addFirst(page);
  await expect(page.locator("#recordDialog")).toBeHidden();
  await page.reload();
  await expect(page.locator("#pageContent")).toContainText(
    "Draft · not reviewed",
  );
  expect(errors).toEqual([]);
});

test("populated sections and all primary dialogs have accessible content", async ({
  page,
}) => {
  test.setTimeout(60000);
  await seed(page, A.demo());
  const scan = async () => {
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(report.violations).toEqual([]);
  };
  await page.getByRole("link", { name: /Money & insurance/ }).click();
  await scan();
  await page
    .getByRole("button", { name: "Edit note", exact: true })
    .first()
    .click();
  await scan();
  await page.keyboard.press("Escape");
  await page.locator("#profileBtn").click();
  await scan();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Backup & restore" }).click();
  await scan();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Create handover" }).click();
  await scan();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: /Your handover/ }).click();
  await scan();
  await page.getByRole("button", { name: "Record a practice run" }).click();
  await scan();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Read privacy/ }).click();
  await scan();
});

test("browser printing before packet selection does not disclose household notes", async ({
  page,
}) => {
  await seed(page, A.demo());
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#printPacket")).toContainText(
    "Create a handover first",
  );
  await expect(page.locator("#printPacket")).not.toContainText("Taylor");
});

test("unsupported editing coordination degrades to an honest read-only view", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "locks", { get: () => undefined }),
  );
  await page.goto("/");
  await expect(page.locator("#storageWarning")).toContainText(
    "cannot coordinate safe editing",
  );
  await expect(page.locator(".hero [data-essential]")).toBeDisabled();
  await expect(page.locator("#saveStatus")).toHaveText("Read-only snapshot");
});
