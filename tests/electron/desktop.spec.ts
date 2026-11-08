import { _electron as electron, expect, test, type ElectronApplication } from "@playwright/test";
import path from "node:path";

async function launch(profile: string) {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }
  env.JOURNAL_USER_DATA_DIR = profile;
  env.JOURNAL_DISABLE_UPDATES = "1";
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.ELECTRON_RENDERER_URL;
  const executablePath = process.env.ELECTRON_EXECUTABLE_PATH;
  return electron.launch({
    executablePath,
    args: executablePath ? [`--user-data-dir=${profile}`] : [path.resolve("electron/main.cjs")],
    env,
  });
}

async function getJournalWindow(app: ElectronApplication) {
  // DevTools can be the first reported window when it opens automatically.
  const findJournal = () => app.windows().find((page) => page.url().startsWith("journal://app/"));
  await expect.poll(findJournal).toBeTruthy();
  return findJournal()!;
}

test("the offline desktop has isolated window controls and a draggable title bar", async () => {
  const testInfo = test.info();
  const app = await launch(testInfo.outputPath("profile"));
  try {
    const page = await getJournalWindow(app);
    await expect(page.getByRole("textbox", { name: "Journal entry" })).toBeVisible();
    await expect(page.locator('[aria-label="Current journal date"] time').first()).toBeVisible();
    expect(page.url()).toBe("journal://app/");
    expect(await page.evaluate(() => ({
      node: typeof (window as Window & { require?: unknown }).require,
      drag: getComputedStyle(document.querySelector(".desktop-titlebar")!).getPropertyValue("-webkit-app-region"),
      button: getComputedStyle(document.querySelector(".window-controls")!).getPropertyValue("-webkit-app-region"),
    }))).toEqual({ node: "undefined", drag: "drag", button: "no-drag" });

    await page.getByRole("button", { name: "Maximize window" }).click();
    await expect(page.getByRole("button", { name: "Restore window" })).toBeVisible();
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMaximized())).toBe(true);
    await page.getByRole("button", { name: "Restore window" }).click();
    await expect(page.getByRole("button", { name: "Maximize window" })).toBeVisible();

    await page.getByRole("button", { name: "Minimize window" }).click();
    await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMinimized())).toBe(true);
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].restore());

    await page.evaluate(() => window.open("javascript:document.title='unsafe'"));
    await expect(page).toHaveTitle("Journal / Today");
    expect(app.windows().filter((window) => window.url().startsWith("journal://app/"))).toHaveLength(1);
    await page.screenshot({ path: testInfo.outputPath("desktop.png") });
  } finally {
    await app.close();
  }
});

test("imports browser storage without overwriting it on reload", async () => {
  const app = await launch(test.info().outputPath("profile"));
  try {
    const page = await getJournalWindow(app);
    await expect(page.getByRole("status")).toHaveText("Saved on this device");
    await page.evaluate(() => {
      localStorage.setItem("journal-today:v1", JSON.stringify({
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "My browser journal" }] },
            { type: "paragraph", attrs: { journalDays: ["2026-11-08"] }, content: [{ type: "text", text: "An imported memory." }] },
          ],
        },
        day: "2026-11-08",
      }));
    });
    await page.reload();
    await expect(page.getByRole("textbox")).toContainText("My browser journal");
    await expect(page.getByRole("textbox")).toContainText("An imported memory.");
    await expect(page.locator('.journal-input [data-journal-days*="2026-11-08"]')).toHaveCount(1);
    await page.reload();
    await expect(page.getByRole("textbox")).toContainText("An imported memory.");
  } finally {
    await app.close();
  }
});

test("closing the window flushes pending edits and reopening restores them", async () => {
  const testInfo = test.info();
  const profile = testInfo.outputPath("profile");
  let app: ElectronApplication | undefined = await launch(profile);
  try {
    let page = await getJournalWindow(app);
    // Keep the automatically opened debugger from taking keyboard focus while
    // the test types; production builds do not open it.
    await app.evaluate(async ({ app, BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows().find((window) => window.webContents.getURL().startsWith("journal://app/"))!;
      if (!app.isPackaged && !win.webContents.isDevToolsOpened()) {
        await new Promise<void>((resolve) => win.webContents.once("devtools-opened", () => resolve()));
      }
      win.webContents.closeDevTools();
      win.focus();
    });
    const journal = page.getByRole("textbox", { name: "Journal entry" });
    await journal.locator("h1").click();
    await page.keyboard.type("My desktop journal");
    await page.keyboard.press("Enter");
    await page.keyboard.type("A thought before closing.");
    await expect(journal).toContainText("My desktop journal");
    await expect(journal).toContainText("A thought before closing.");
    // Close synchronously, before the 400 ms autosave debounce can finish.
    await Promise.all([
      page.waitForEvent("close"),
      page.evaluate(() => window.desktop!.close()),
    ]);
    // On macOS the application remains open after its last window is closed.
    await app.close();
    app = undefined;

    app = await launch(profile);
    page = await getJournalWindow(app);
    await expect(page.getByRole("textbox")).toContainText("My desktop journal");
    await expect(page.getByRole("textbox")).toContainText("A thought before closing.");
    await expect(page.getByRole("status")).toHaveText("Saved on this device");
  } finally {
    await app?.close();
  }
});
