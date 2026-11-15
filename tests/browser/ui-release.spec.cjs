const { test, expect } = require("@playwright/test");
const { AxeBuilder } = require("@axe-core/playwright");
const A = require("../../public/core.js");

async function seed(page) {
  await page.addInitScript(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: A.STORAGE_KEY, state: A.demo() },
  );
  await page.goto("/");
}

async function expectInsideViewport(locator) {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  const viewport = locator.page().viewportSize();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
}

test("320px layout has readable inputs and comfortable action targets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await seed(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".hero [data-essential]").click();
  const title = page.getByLabel("Title", { exact: true });
  expect(
    await title.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await expect(title).toBeEditable();
  await expect(
    page.getByLabel("Contact or location", { exact: true }),
  ).toHaveAccessibleDescription(/Keep passwords, PINs/);
  const close = page.getByRole("button", { name: "Close note", exact: true });
  const dimensions = await close.boundingBox();
  expect(dimensions.width).toBeGreaterThanOrEqual(44);
  expect(dimensions.height).toBeGreaterThanOrEqual(44);
  await expectInsideViewport(close);
  await expectInsideViewport(
    page.getByRole("button", { name: "Save note", exact: true }),
  );
});

test("long handover preview scrolls independently of visible print and close actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await seed(page);
  await page.getByRole("button", { name: "Create handover" }).click();
  const print = page.getByRole("button", { name: "Print / save PDF" });
  const close = page.getByRole("button", {
    name: "Close handover",
    exact: true,
  });
  await expectInsideViewport(print);
  await expectInsideViewport(close);
  const body = page.locator("#packetDialog .dialog-body");
  expect(await body.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(
    true,
  );
  await body.evaluate((e) => {
    e.scrollTop = e.scrollHeight;
  });
  await expectInsideViewport(print);
  await expectInsideViewport(close);
  await page.locator("#packetError").evaluate((e) => {
    e.textContent =
      "Clipboard access is unavailable. Print or manually copy the preview.";
  });
  await expectInsideViewport(page.locator("#packetError"));
  await expectInsideViewport(print);
  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(report.violations).toEqual([]);
});

test("dialog controls remain available at desktop 200-percent reflow dimensions", async ({
  page,
}) => {
  // A 1280x960 window at 200% browser zoom has a 640x480 CSS viewport.
  await page.setViewportSize({ width: 640, height: 480 });
  await seed(page);
  await page
    .getByRole("button", { name: "Edit household and handover plan" })
    .click();
  await expectInsideViewport(
    page.getByRole("button", { name: "Save plan", exact: true }),
  );
  await expectInsideViewport(
    page.getByRole("button", { name: "Close household settings" }),
  );
  await page.locator("#profileDialog .dialog-body").evaluate((e) => {
    e.scrollTop = e.scrollHeight;
  });
  await expectInsideViewport(
    page.getByRole("button", { name: "Save plan", exact: true }),
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Backup & restore" }).click();
  await page.locator("#backupDialog .dialog-body").evaluate((e) => {
    e.scrollTop = e.scrollHeight;
  });
  await expectInsideViewport(
    page.getByRole("button", { name: "Close backups" }),
  );
  await page.locator("#backupError").evaluate((e) => {
    e.textContent = "The passphrases do not match.";
  });
  await expectInsideViewport(page.locator("#backupError"));
  expect(
    await page
      .locator("#backupDialog")
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  ).toBe(true);
});
