const { test, expect } = require("@playwright/test");
const A = require("../../public/core.js");

const passphrase = "fictional safety test phrase";

async function seed(page, name = "Audit household", extra = {}) {
  const state = A.demo();
  state.familyName = name;
  await page.addInitScript(
    ({ state, extra, key }) => {
      localStorage.setItem(key, JSON.stringify(state));
      for (const [key, value] of Object.entries(extra))
        localStorage.setItem(key, value);
    },
    { state, extra, key: A.STORAGE_KEY },
  );
  await page.goto("/");
  await expect(page.locator("#householdName")).toHaveText(name);
  return state;
}

async function rename(page, name) {
  await page.locator("#profileBtn").click();
  await page.locator("#profileName").fill(name);
  await page.getByRole("button", { name: "Save plan", exact: true }).click();
  await expect(page.locator("#profileDialog")).toBeHidden();
}

async function stored(page, key = A.STORAGE_KEY) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  }, key);
}

async function fillExport(page) {
  await page.locator("#exportPassword").fill(passphrase);
  await page.locator("#exportConfirm").fill(passphrase);
}

test("unsaved dialog cancellation keeps the draft; explicit discard leaves saved data unchanged", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".hero [data-essential]").click();
  await page.locator("#recordTitle").fill("An unsaved important instruction");
  await page
    .locator("#recordNotes")
    .fill("Keep this draft until I explicitly discard it.");
  await page.keyboard.press("Escape");
  await expect(page.locator("#confirmHeading")).toHaveText(
    "Discard unsaved changes?",
  );
  await page.locator("#confirmDialog [data-close]").last().click();
  await expect(page.locator("#recordDialog")).toBeVisible();
  await expect(page.locator("#recordTitle")).toHaveValue(
    "An unsaved important instruction",
  );
  await page.locator("#recordDialog [data-close]").first().click();
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(page.locator("#recordDialog")).toBeHidden();
  expect(await stored(page)).toBeNull();
});

test("successful replacement keeps the former household as a recoverable previous copy and recovery swaps copies", async ({
  page,
}) => {
  await seed(page, "Original household");
  await rename(page, "Current household");
  expect((await stored(page, A.RECOVERY_KEY)).familyName).toBe(
    "Original household",
  );
  const imported = A.demo();
  imported.familyName = "Restored household";
  await page.locator("#backupBtn").click();
  await page.locator("#importFile").setInputFiles({
    name: "restore.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await page.locator("#importSubmit").click();
  await expect(page.locator("#restorePreview")).toBeVisible();
  expect((await stored(page)).familyName).toBe("Current household");
  await page.locator("#confirmRestoreBtn").click();
  await expect
    .poll(async () => (await stored(page)).familyName)
    .toBe("Restored household");
  expect((await stored(page, A.RECOVERY_KEY)).familyName).toBe(
    "Current household",
  );
  await page.locator("#recoverPreviousBtn").click();
  await expect(page.locator("#restoreSummary")).toContainText(
    "Current household",
  );
  await page.locator("#confirmRestoreBtn").click();
  await expect
    .poll(async () => (await stored(page)).familyName)
    .toBe("Current household");
  expect((await stored(page, A.RECOVERY_KEY)).familyName).toBe(
    "Restored household",
  );
});

test("deletion requires the exact household name and removes current, previous, and legacy copies", async ({
  page,
}) => {
  await seed(page, "Delete audit household", {
    [A.RECOVERY_KEY]: JSON.stringify(A.blank()),
    [A.LEGACY_KEY]: JSON.stringify({ familyName: "Legacy audit copy" }),
  });
  await page.locator("#backupBtn").click();
  await page.locator("#deleteHouseholdBtn").click();
  await page.locator("#deleteConfirmName").fill("wrong household");
  await page.locator("#confirmAction").click();
  await expect(page.locator("#confirmError")).toContainText("exactly");
  expect((await stored(page)).familyName).toBe("Delete audit household");
  await page.locator("#deleteConfirmName").fill("Delete audit household");
  await page.locator("#confirmAction").click();
  await expect(page.locator("#confirmDialog")).toBeHidden();
  await expect(page.locator("#householdName")).toHaveText("My household");
  expect(
    await page.evaluate(
      (keys) => keys.map((key) => localStorage.getItem(key)),
      [A.STORAGE_KEY, A.RECOVERY_KEY, A.LEGACY_KEY],
    ),
  ).toEqual([null, null, null]);
});

test("a stale tab cannot produce a normal backup", async ({
  page,
  context,
}) => {
  await seed(page);
  const stale = await context.newPage();
  await stale.goto("/");
  await rename(page, "Newer household");
  await expect(stale.locator("#storageWarning")).toContainText("Another tab");
  let downloads = 0;
  stale.on("download", () => downloads++);
  await stale.locator("#backupBtn").click();
  await fillExport(stale);
  await expect(stale.locator("#exportSubmit")).toBeDisabled();
  await stale.locator("#exportForm").dispatchEvent("submit");
  await expect(stale.locator("#backupError")).toContainText(
    /read.only|Another tab/i,
  );
  expect(downloads).toBe(0);
});

test("closing an export during cryptography cancels its later download", async ({
  page,
}) => {
  await seed(page);
  await page.evaluate(() => {
    const original = window.Ark.encrypt;
    window.Ark.encrypt = async (...args) => {
      window.auditEncryptionStarted = true;
      await new Promise((resolve) => {
        window.auditReleaseEncryption = resolve;
      });
      try {
        return await original(...args);
      } finally {
        window.auditEncryptionSettled = true;
      }
    };
  });
  let downloads = 0;
  page.on("download", () => downloads++);
  await page.locator("#backupBtn").click();
  await fillExport(page);
  await page.locator("#exportSubmit").click();
  await expect
    .poll(() => page.evaluate(() => Boolean(window.auditEncryptionStarted)))
    .toBe(true);
  await page.locator("#backupDialog [data-close]").click();
  await page.evaluate(() => window.auditReleaseEncryption());
  // Wait for the submitted export promise to settle without relying on a timing sleep.
  await expect
    .poll(() => page.evaluate(() => Boolean(window.auditEncryptionSettled)))
    .toBe(true);
  await page.locator("#backupBtn").click();
  await expect(page.locator("#exportSubmit")).toBeEnabled();
  await expect(page.locator("#backupSuccess")).toBeEmpty();
  expect(downloads).toBe(0);
});

test("only the lifetime editor can commit while a second tab is read-only", async ({
  page,
  context,
}) => {
  await seed(page);
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.locator("#storageWarning")).toContainText(/read.only/i);
  await page.evaluate(() => {
    navigator.locks.request(
      "ark-household-write",
      () =>
        new Promise((resolve) => {
          window.auditHeld = true;
          window.auditReleaseLock = resolve;
        }),
    );
  });
  await expect
    .poll(() => page.evaluate(() => Boolean(window.auditHeld)))
    .toBe(true);
  await page.locator("#profileBtn").click();
  await page.locator("#profileName").fill("Owner change");
  await page.getByRole("button", { name: "Save plan", exact: true }).click();
  // Exercise the save guard even if the secondary tab's editing controls are disabled.
  const blocked = other.evaluate(() =>
    commit(
      { ...state, familyName: "Rejected second-tab change" },
      "profileError",
    ),
  );
  await page.evaluate(() => window.auditReleaseLock());
  expect(await blocked).toBe(false);
  await expect(page.locator("#profileDialog")).toBeHidden();
  await expect(other.locator("#profileError")).toContainText(/read.only/i);
  await Promise.all(
    [page, other].map((tab) =>
      tab.evaluate(() =>
        navigator.locks.request("ark-household-write", () => {}),
      ),
    ),
  );
  await expect
    .poll(async () => (await stored(other)).familyName)
    .toBe("Owner change");
  expect((await stored(page, A.RECOVERY_KEY)).familyName).toBe(
    "Audit household",
  );
});

test("a read-only tab may become editor only after the owner closes and it reloads", async ({
  page,
  context,
}) => {
  await seed(page);
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.locator("#storageWarning")).toContainText(/read.only/i);
  await page.close();
  await other.reload();
  await expect(other.locator("#storageWarning")).not.toContainText(
    /read.only/i,
  );
  await rename(other, "New editor household");
  expect((await stored(other)).familyName).toBe("New editor household");
});

test("a cancelled previous-copy request cannot replace a newer import preview", async ({
  page,
}) => {
  const previous = A.blank();
  previous.familyName = "Previous recovery household";
  await seed(page, "Current household", {
    [A.RECOVERY_KEY]: JSON.stringify(previous),
  });
  await page.evaluate(() => {
    navigator.locks.request(
      "ark-household-write",
      () =>
        new Promise((resolve) => {
          window.auditHeld = true;
          window.auditReleaseLock = resolve;
        }),
    );
  });
  await expect
    .poll(() => page.evaluate(() => Boolean(window.auditHeld)))
    .toBe(true);
  await page.locator("#backupBtn").click();
  await page.locator("#recoverPreviousBtn").click();
  await page.locator("#backupDialog [data-close]").click();
  await page.locator("#backupBtn").click();
  const imported = A.blank();
  imported.familyName = "New selected household";
  await page.locator("#importFile").setInputFiles({
    name: "selected.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(imported)),
  });
  await page.locator("#importSubmit").click();
  await expect(page.locator("#restoreSummary")).toContainText(
    "New selected household",
  );
  await page.evaluate(() => window.auditReleaseLock());
  await page.evaluate(() =>
    navigator.locks.request("ark-household-write", () => {}),
  );
  await expect(page.locator("#restoreSummary")).toContainText(
    "New selected household",
  );
  await page.locator("#confirmRestoreBtn").click();
  await expect
    .poll(async () => (await stored(page)).familyName)
    .toBe("New selected household");
});

test("edits during a pending save are either prevented or kept open rather than silently discarded", async ({
  page,
}) => {
  await seed(page);
  await page.evaluate(() => {
    navigator.locks.request(
      "ark-household-write",
      () =>
        new Promise((resolve) => {
          window.auditHeld = true;
          window.auditReleaseLock = resolve;
        }),
    );
  });
  await expect
    .poll(() => page.evaluate(() => Boolean(window.auditHeld)))
    .toBe(true);
  await page.locator("#profileBtn").click();
  await page.locator("#profileName").fill("First requested name");
  await page.getByRole("button", { name: "Save plan", exact: true }).click();
  const editable = await page.locator("#profileName").isEditable();
  if (editable) await page.locator("#profileName").fill("Later unsaved name");
  await page.evaluate(() => window.auditReleaseLock());
  await expect
    .poll(async () => (await stored(page)).familyName)
    .toBe("First requested name");
  if (editable) {
    await expect(page.locator("#profileDialog")).toBeVisible();
    await expect(page.locator("#profileName")).toHaveValue(
      "Later unsaved name",
    );
  } else await expect(page.locator("#profileDialog")).toBeHidden();
});

test("failed current-copy persistence preserves the older recovery snapshot", async ({
  page,
}) => {
  const previous = A.blank();
  previous.familyName = "Older recovery household";
  await seed(page, "Current household", {
    [A.RECOVERY_KEY]: JSON.stringify(previous),
  });
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key)
        throw new DOMException(
          "Simulated primary write failure",
          "QuotaExceededError",
        );
      return original.call(this, name, value);
    };
  }, A.STORAGE_KEY);
  await page.locator("#profileBtn").click();
  await page.locator("#profileName").fill("Rejected household");
  await page.getByRole("button", { name: "Save plan", exact: true }).click();
  await expect(page.locator("#profileError")).toContainText("could not save");
  expect((await stored(page)).familyName).toBe("Current household");
  expect((await stored(page, A.RECOVERY_KEY)).familyName).toBe(
    "Older recovery household",
  );
});

test("recovery storage overhead cannot block a primary save that fits without the duplicate", async ({
  page,
}) => {
  const previous = A.blank();
  previous.familyName = "Smaller older recovery";
  await seed(page, "Current household", {
    [A.RECOVERY_KEY]: JSON.stringify(previous),
  });
  await page.evaluate(
    ({ currentKey, recoveryKey }) => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name, value) {
        if (
          name === currentKey &&
          JSON.parse(this.getItem(recoveryKey)).familyName ===
            "Current household"
        ) {
          throw new DOMException(
            "Simulated duplicate exceeds available storage",
            "QuotaExceededError",
          );
        }
        return original.call(this, name, value);
      };
    },
    { currentKey: A.STORAGE_KEY, recoveryKey: A.RECOVERY_KEY },
  );
  await rename(page, "Successfully updated household");
  expect((await stored(page)).familyName).toBe(
    "Successfully updated household",
  );
  expect((await stored(page, A.RECOVERY_KEY)).familyName).toBe(
    "Smaller older recovery",
  );
  await expect(page.locator("#storageWarning")).toContainText("Changes saved");
  await expect(page.locator("#storageWarning")).toContainText(
    "could not be refreshed",
  );
});
