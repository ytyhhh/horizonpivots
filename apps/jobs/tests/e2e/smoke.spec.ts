import { expect, test } from "@playwright/test";

test("guest can discover and open a job", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /把分散的招聘信息/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "浏览最新岗位" }).click();
  await expect(page.getByRole("heading", { name: "找到值得投递的岗位" })).toBeVisible();
  await page.getByLabel("搜索公司、岗位或技能").fill("Python");
  await expect(page.getByText(/找到 \d+ 个岗位/)).toBeVisible();
});

test("profile upload validates file type before network work", async ({ page }) => {
  await page.goto("/profile");
  await page.locator('input[type="file"]').setInputFiles({
    name: "resume.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a resume"),
  });
  await expect(page.getByText("仅支持 PDF 或 DOCX")).toBeVisible();
});
