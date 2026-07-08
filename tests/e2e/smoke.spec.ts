import { expect, test } from "@playwright/test";

test.describe("landing funnel smoke", () => {
  test("renders the assessment landing and language toggle", async ({ page }) => {
    await page.goto("/");

    // Metadata / SEO title.
    await expect(page).toHaveTitle(/Health Twin/i);

    // The quiz hero renders (deterministic, DB-independent copy).
    await expect(page.getByRole("heading", { name: "Build your Health Twin" })).toBeVisible();

    // Reviewer-friendly dev tools are present.
    await expect(page.getByRole("button", { name: /Prefill|Fill|示例|填充/i })).toBeVisible();

    // Switching to Chinese updates the hero copy.
    await page.getByRole("button", { name: "中文" }).click();
    await expect(page.getByRole("heading", { name: "生成你的健康分身" })).toBeVisible();

    // Reset control is available for reviewers.
    await expect(page.getByRole("button", { name: /重新开始/ })).toBeVisible();
  });
});
