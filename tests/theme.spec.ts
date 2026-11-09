import { expect, test } from "@playwright/test";

test("settings select and persist the appearance", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/");

  await page.getByRole("button", { name: "Open settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("radio", { name: /System/ })).toBeChecked();

  await dialog.getByRole("radio", { name: /Dark/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(28, 32, 29)");
  await expect(page.evaluate(() => localStorage.getItem("journal-today:theme:v1"))).resolves.toBe("dark");

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" }).getByRole("radio", { name: /Dark/ })).toBeChecked();
});

test("system appearance follows the current device color scheme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(28, 32, 29)");

  await page.getByRole("button", { name: "Open settings" }).click();
  await page.getByRole("dialog", { name: "Settings" }).getByRole("radio", { name: /Light/ }).check();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(249, 248, 244)");
});
