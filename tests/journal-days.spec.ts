import { expect, test, type Page } from "@playwright/test";

async function seedJournal(page: Page, long = false, sharedParagraph = false) {
  await page.clock.setFixedTime(new Date("2026-11-09T12:00:00+02:00"));
  await page.addInitScript(({ long, sharedParagraph }) => {
    const text = (value: string) => [{ type: "text", text: value }];
    const paragraph = (value: string, days: string[] = []) => ({ type: "paragraph", attrs: { journalDays: days }, content: text(value) });
    const filler = (prefix: string) => long
      ? Array.from({ length: 18 }, (_, index) => paragraph(`${prefix} thought ${index + 1}. A little room to reflect on the day and the things I want to remember.`))
      : [];
    localStorage.setItem("journal-today:v1", JSON.stringify({
      content: { type: "doc", content: [
        { type: "heading", attrs: { level: 1, journalDays: sharedParagraph ? ["2026-11-07", "2026-11-08"] : ["2026-11-07"] }, content: text("A few quiet days") },
        ...filler("First day"),
        paragraph("A second day.", sharedParagraph ? [] : ["2026-11-08"]),
        ...filler("Second day"),
        paragraph("A third day.", ["2026-11-09"]),
        ...filler("Third day"),
      ] },
      day: "2026-11-09",
    }));
  }, { long, sharedParagraph });
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText("Saved on this device");
}

test("short entries switch the pinned date through buttons and the caret without scrolling", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: testInfo.project.name === "mobile" ? 390 : 1100, height: 1200 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await seedJournal(page);
  const header = page.getByLabel("Journal date navigation");
  const workspace = page.locator(".desktop-workspace");
  const journal = page.getByRole("textbox");
  await expect(header).toHaveAttribute("data-day", "2026-11-07");
  expect(await workspace.evaluate((element) => element.scrollHeight <= element.clientHeight + 2)).toBe(true);
  await page.getByRole("button", { name: "Next journal day" }).click();
  await expect(header).toHaveAttribute("data-day", "2026-11-08");
  await page.getByRole("button", { name: "Next journal day" }).click();
  await expect(header).toHaveAttribute("data-day", "2026-11-09");
  await expect(page.getByRole("button", { name: "Next journal day" })).toBeDisabled();
  await journal.locator("h1").click();
  await expect(header).toHaveAttribute("data-day", "2026-11-07");
  await journal.locator("p").filter({ hasText: "A second day." }).click();
  await expect(header).toHaveAttribute("data-day", "2026-11-08");
  expect(await workspace.evaluate((element) => element.scrollTop)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath("short-journal.png") });
});

test("the side date stays pinned and follows sections when scrolling", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "The side column is a desktop layout.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedJournal(page, true);
  const header = page.getByLabel("Journal date navigation");
  const workspace = page.locator(".desktop-workspace");
  await page.getByRole("button", { name: "Next journal day" }).click();
  await expect(header).toHaveAttribute("data-day", "2026-11-08");
  await expect.poll(() => header.evaluate((element) => {
    const scrollport = element.closest(".desktop-workspace")!;
    const headerHeight = scrollport.querySelector(".journal-header")!.getBoundingClientRect().height;
    return Math.abs(element.getBoundingClientRect().top - scrollport.getBoundingClientRect().top - headerHeight - 24);
  })).toBeLessThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath("pinned-date.png") });
  await workspace.hover();
  await page.mouse.wheel(0, 10000);
  await expect(header).toHaveAttribute("data-day", "2026-11-09");
  await page.mouse.wheel(0, -10000);
  await expect(header).toHaveAttribute("data-day", "2026-11-07");
  await page.screenshot({ path: testInfo.outputPath("scrolling-journal.png") });
});

test("days sharing one midnight paragraph remain individually navigable", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 1200 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedJournal(page, false, true);
  const header = page.getByLabel("Journal date navigation");
  await page.getByRole("button", { name: "Next journal day" }).click();
  await expect(header).toHaveAttribute("data-day", "2026-11-08");
  await page.getByRole("button", { name: "Previous journal day" }).click();
  await expect(header).toHaveAttribute("data-day", "2026-11-07");
});

test("browsing older days does not add today's date to their paragraphs", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-09T12:00:00+02:00") });
  await seedJournal(page);
  await page.clock.setFixedTime(new Date("2026-11-10T12:00:00+02:00"));
  await page.getByRole("button", { name: "Next journal day" }).click();
  await page.clock.runFor(2_000);
  await expect(page.getByLabel("Journal date navigation")).toHaveAttribute("data-day", "2026-11-08");
  await expect(page.locator('.journal-input [data-journal-days*="2026-11-10"]')).toHaveCount(0);
});

test("the header stays visible and smoothly shrinks while scrolling", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seedJournal(page, true);
  const header = page.getByRole("banner", { name: "Journal header" });
  const workspace = page.locator(".desktop-workspace");
  const expandedHeight = await header.evaluate((element) => element.getBoundingClientRect().height);
  expect(await header.evaluate((element) => getComputedStyle(element).maxHeight)).toBe("none");
  await workspace.evaluate((element) => { element.scrollTop = 320; });
  await expect.poll(() => header.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThan(expandedHeight - 10);
  await expect.poll(() => header.evaluate((element) => Math.abs(element.getBoundingClientRect().top - element.closest(".desktop-workspace")!.getBoundingClientRect().top))).toBeLessThanOrEqual(2);
  if (testInfo.project.name === "desktop") {
    const calendar = page.getByLabel("Journal date navigation");
    await expect.poll(() => calendar.evaluate((element) => element.getBoundingClientRect().top - element.closest(".desktop-workspace")!.querySelector(".journal-header")!.getBoundingClientRect().bottom)).toBeGreaterThanOrEqual(23);
  }
  await page.screenshot({ path: testInfo.outputPath("compact-header.png") });
  await workspace.evaluate((element) => { element.scrollTop = 0; });
  await expect.poll(() => header.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(expandedHeight - 1);
});
