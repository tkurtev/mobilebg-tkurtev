import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("dealer buys a VIP promotion with the demo checkout", async ({ page }) => {
  await login(page, "dealer@mobited.local", "/profil/dilar");
  await expect(page.getByTestId("dealer-dashboard")).toBeVisible();

  await page.goto("/profil/obiavi?status=active");
  const row = page.getByTestId("my-listing").filter({ hasNot: page.getByText("VIP", { exact: true }) }).first();
  const listingId = await row.getAttribute("data-listing-id");
  expect(listingId).toBeTruthy();

  await page.goto(`/profil/obiavi/${listingId}/promotirane`);
  await page.getByTestId("promotion-option-VIP").click();
  await page.getByTestId("promotion-continue").click();
  await page.waitForURL(/\/demo-plashtane\?obiava=.+&paket=VIP/);

  await expect(page.getByTestId("demo-payment-notice")).toContainText("Демо плащане. Няма да бъде извършена реална транзакция.");
  await page.getByTestId("card-name").fill("Кирил Марков");
  await page.getByTestId("card-number").fill("4111 1111 1111 1111");
  await page.getByTestId("card-expiry").fill("12/30");
  await page.getByTestId("card-cvc").fill("123");

  const actionRequest = page.waitForRequest((request) => request.method() === "POST" && request.url().includes("/demo-plashtane"));
  await page.getByTestId("pay-submit").click();
  const body = (await actionRequest).postData() ?? "";
  expect(body).not.toContain("4111");
  expect(body).not.toContain("123\"");

  await expect(page.getByTestId("payment-success")).toContainText("Плащането е успешно");

  await page.goto("/profil/plashtaniya");
  await expect(page.locator("main")).toContainText("VIP");
  await expect(page.locator("main")).toContainText("Успешно");
  await expect(page.locator("main")).toContainText("9,99");

  await page.goto("/profil/obiavi?status=active");
  await expect(page.locator(`[data-listing-id="${listingId}"]`)).toContainText("VIP");
});
