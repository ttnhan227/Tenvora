import { test, expect } from "@playwright/test";
test("public routes stay English with a saved Vietnamese workspace preference", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("tenvora_lang", "vi"));
  for (const route of ["/", "/mobile", "/privacy", "/delete-account", "/login", "/register"]) {
    await page.goto(route);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("button", { name: "Chuyển sang Tiếng Việt", exact: true })).toHaveCount(0);
    if (route === "/privacy") await expect(page.getByRole("heading", { name: "Tenvora privacy policy" })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("tenvora_lang"))).toBe("vi");
  }
});
