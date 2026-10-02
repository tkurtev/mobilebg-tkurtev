import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("moderator reviews a report, pauses the listing and the action is audited", async ({ page }) => {
  await login(page, "admin@mobited.local", "/admin");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/admin/reports");
  const report = page.getByTestId("report-row").first();
  await expect(report).toBeVisible();
  await report.getByTestId("report-open-listing").click();
  await page.waitForURL(/\/admin\/listings\/[0-9a-f-]{36}/);
  const listingId = page.url().split("/").pop()?.split("?")[0] ?? "";

  await expect(page.getByTestId("moderation-controls")).toBeVisible();
  await page.getByTestId("moderation-pause").click();
  await page.getByTestId("moderation-reason").fill("Проверка на сигнал за фалшива обява");
  await page.getByTestId("moderation-submit").click();
  await expect(page.getByTestId("moderation-controls")).toContainText(/Паузирана|Възстанови/);

  await page.goto(`/admin/audit?targetId=${listingId}`);
  const rows = page.getByTestId("audit-row");
  await expect(rows.first()).toBeVisible();
  await expect(rows.first()).toContainText("Паузирана обява");
});
