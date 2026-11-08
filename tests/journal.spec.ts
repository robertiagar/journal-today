import { expect, test } from "@playwright/test";

test("restores a journal copied into storage before reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
  await page.evaluate(() => {
    localStorage.setItem("journal-today:v1", JSON.stringify({
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "My browser journal" }] },
          { type: "paragraph", attrs: { journalDays: ["2026-11-08"] }, content: [{ type: "text", text: "A memory to keep." }] },
        ],
      },
      day: "2026-11-08",
    }));
  });
  await page.reload();
  await expect(page.getByRole("textbox")).toContainText("My browser journal");
  await expect(page.getByRole("textbox")).toContainText("A memory to keep.");
  await expect(page.locator('.journal-input [data-journal-days*="2026-11-08"]')).toHaveCount(1);
});

test("formats typed Markdown, pastes Markdown, and restores a saved journal", async ({ page }) => {
  await page.goto("/");
  const journal = page.getByRole("textbox", { name: "Journal entry" });
  await expect(journal.locator("h1")).toHaveAttribute("data-placeholder", "Let it out");
  await journal.locator("h1").click();
  await page.keyboard.type("A small moment");
  await expect(journal.locator("h1")).toContainText("A small moment");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Feeling **grateful** today.");
  await expect(journal.locator("strong")).toHaveText("grateful");
  await page.keyboard.type(" [A memory](https://example.com)");
  await expect(journal.locator('a[href="https://example.com"]')).toHaveText("A memory");
  await page.keyboard.press("Enter");
  await page.keyboard.type("- A walk outside");
  await expect(journal.locator("ul li")).toContainText("A walk outside");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Control+End");
  await journal.evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", "\n\n## Tomorrow\n\nA *fresh* start.");
    element.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }));
  });
  await expect(journal.locator("h2")).toHaveText("Tomorrow");
  await expect(journal.locator("em")).toHaveText("fresh");
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
  await page.reload();
  await expect(page.getByRole("textbox").locator("strong")).toHaveText("grateful");
  await expect(page.getByRole("textbox").locator("h2")).toHaveText("Tomorrow");
  await expect(page).toHaveTitle("Journal / Today");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("keeps unreadable stored content when the blank editor unloads", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("journal-today:v1", '{"content":"damaged backup"}');
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Couldn’t save");
  await page.getByRole("textbox").locator("h1").click();
  await page.keyboard.type("A new thought");
  await expect(page.getByRole("status")).toContainText("Couldn’t save");
  // A failed restore must leave the original data available for recovery.
  expect(await page.evaluate(() => localStorage.getItem("journal-today:v1"))).toBe('{"content":"damaged backup"}');
  await page.getByRole("textbox").evaluate(() => window.dispatchEvent(new Event("pagehide")));
  expect(await page.evaluate(() => localStorage.getItem("journal-today:v1"))).toBe('{"content":"damaged backup"}');
});

test("midnight pins the new day to the active paragraph, including edits above it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install({ time: new Date("2026-11-08T23:59:55+02:00") });
  await page.goto("/");
  const journal = page.getByRole("textbox", { name: "Journal entry" });
  await journal.locator("h1").click();
  await page.keyboard.type("Before midnight.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("A late-night thought.");
  await expect(page.getByText("is on its way")).toBeAttached();
  await page.clock.runFor(6_000);
  const boundary = journal.locator('[data-journal-days*="2026-11-09"]');
  await expect(boundary).toContainText("A late-night thought.");
  await expect(boundary).not.toContainText("Before midnight.");

  await boundary.evaluate((element) => {
    const text = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE)!;
    const range = document.createRange();
    range.setStart(text, 0);
    range.collapse(true);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.clock.runFor(50);
  await page.keyboard.press("Enter");
  await expect(journal.locator("p")).toHaveCount(3);
  await journal.locator("p").first().evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(true);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.clock.runFor(50);
  await page.keyboard.type("An extra thought above.");
  await expect(boundary).toContainText("A late-night thought.");
  await expect(boundary).not.toContainText("An extra thought above.");
  await page.keyboard.press("Control+z");
  await expect(boundary).toContainText("A late-night thought.");
  await page.keyboard.press("Control+Shift+z");
  await expect(boundary).toContainText("A late-night thought.");
  await expect(boundary).not.toContainText("An extra thought above.");
  await page.clock.runFor(9_000);
  // The sidebar follows the paragraph being read, including earlier days.
  await boundary.click();
  await page.clock.runFor(50);
  await expect(page.locator('[aria-label="Current journal date"] time[datetime="2026-11-09"]')).toHaveCount(1);
  await expect(page.locator('[aria-label="Current journal date"] time[datetime="2026-11-08"]')).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
  await page.reload();
  await expect(page.getByRole("textbox").locator('[data-journal-days*="2026-11-09"]')).toContainText("A late-night thought.");
});

test("the previous date fades away after midnight", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Animation timing is shared across viewports.");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.setFixedTime(new Date("2026-11-08T23:59:59+02:00"));
  await page.goto("/");
  const dates = page.locator('[aria-label="Current journal date"]');
  await expect(dates.locator('time[datetime="2026-11-08"]')).toHaveCount(1);
  await expect(page.getByText("is on its way")).toBeAttached();
  await page.clock.setFixedTime(new Date("2026-11-09T00:00:01+02:00"));
  await expect(dates.locator('time[datetime="2026-11-09"]').first()).toBeAttached();
  await expect(dates.locator('time[datetime="2026-11-08"]')).toHaveCount(0, { timeout: 12_000 });
  await expect(page.getByText("is on its way")).toHaveCount(0);
});

test("resuming after midnight dates the next edit without stamping older paragraphs", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-08T23:59:55+02:00") });
  await page.goto("/");
  const journal = page.getByRole("textbox", { name: "Journal entry" });
  await journal.locator("h1").click();
  await page.keyboard.type("Yesterday’s memory.");
  await page.clock.runFor(500);
  await page.reload();
  await expect(page.getByRole("textbox")).toContainText("Yesterday’s memory.");
  await page.clock.runFor(6_000);
  await expect(page.locator('.journal-input [data-journal-days*="2026-11-09"]')).toHaveCount(0);
  await page.getByRole("textbox").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Today begins here.");
  await expect(page.locator('.journal-input [data-journal-days*="2026-11-09"]')).toContainText("Today begins here.");
  await expect(page.locator('.journal-input [data-journal-days*="2026-11-08"]')).toContainText("Yesterday’s memory.");
});
