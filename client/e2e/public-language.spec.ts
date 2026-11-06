import { test, expect } from "@playwright/test";
test("public routes stay English with a saved Vietnamese workspace preference", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("tenvora_lang", "vi"));
  for (const route of ["/", "/mobile", "/privacy", "/terms", "/delete-account", "/download", "/login", "/register"]) {
    await page.goto(route);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("button", { name: "Chuyển sang Tiếng Việt", exact: true })).toHaveCount(0);
    if (route === "/privacy") await expect(page.getByRole("heading", { name: "Tenvora privacy policy" })).toBeVisible();
    if (route === "/terms") await expect(page.getByRole("heading", { name: "Tenvora terms of service" })).toBeVisible();
    if (route === "/download") await expect(page).toHaveURL(/\/mobile$/);
    expect(await page.evaluate(() => localStorage.getItem("tenvora_lang"))).toBe("vi");
  }
});

test("public navigation stays usable at tablet, phone, and desktop widths", async ({ page }) => {
  for (const width of [810, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");

    const menuButton = page.getByRole("button", { name: "Open navigation menu" });
    await expect(menuButton).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeHidden();
    await menuButton.click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Close navigation menu" })).toHaveAttribute("aria-expanded", "true");
  }

  await page.setViewportSize({ width: 1024, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeHidden();
});

test("unknown routes render the not-found screen", async ({ page }) => {
  await page.goto("/route-that-does-not-exist");
  await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "This page isn’t in the notebook" })).toBeVisible();
});
