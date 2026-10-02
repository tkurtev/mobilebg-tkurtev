import path from "node:path";
import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const fixtures = path.join(__dirname, "fixtures");

test("seller creates, publishes, edits, reprices and sells a listing", async ({ page }) => {
  await login(page, "user@mobited.local", "/publikuvai");

  await test.step("create a draft in the wizard", async () => {
    await page.goto("/publikuvai");
    await page.locator('[data-category="avtomobili"]').click();
    await page.waitForURL(/\/publikuvai\/[0-9a-f-]{36}/);

    await page.getByLabel("Марка").selectOption({ label: "Skoda" });
    await expect(page.getByLabel("Модел").locator("option", { hasText: "Octavia" })).toHaveCount(1);
    await page.getByLabel("Модел").selectOption({ label: "Octavia" });
    await page.getByLabel("Заглавие").fill("Skoda Octavia 2.0 TDI Style");
    await page.getByTestId("wizard-next").click();

    await page.getByLabel("Година").selectOption("2020");
    await page.getByLabel("Пробег (км)").fill("98000");
    await page.getByLabel("Гориво").selectOption("diesel");
    await page.getByLabel("Скоростна кутия").selectOption("manual");
    await page.getByLabel("Купе").selectOption("wagon");
    await page.getByLabel("Състояние").selectOption("used");
    await page.getByTestId("wizard-next").click();

    await page.getByLabel("Климатроник").check();
    await page.getByTestId("wizard-next").click();

    await page.getByLabel("Цена (€)").fill("17900");
    await page.getByTestId("wizard-next").click();
  });

  await test.step("upload photos", async () => {
    await page.getByTestId("photo-input").setInputFiles([path.join(fixtures, "car-1.jpg"), path.join(fixtures, "car-2.jpg")]);
    await expect(page.getByTestId("uploaded-photo")).toHaveCount(2, { timeout: 30_000 });
    await page.getByTestId("wizard-next").click();
  });

  await test.step("description, location and contact", async () => {
    await page.getByLabel("Описание").fill("Първи собственик, обслужвана в официален сервиз. Нови гуми.");
    await page.getByTestId("wizard-next").click();
    await page.getByLabel("Област").selectOption({ label: "Варна" });
    await page.getByLabel("Град").selectOption({ label: "Варна" });
    await page.getByTestId("wizard-next").click();
    await page.getByLabel("Телефон").fill("0887 654 321");
    await page.getByTestId("wizard-next").click();
  });

  let listingPath = "";
  await test.step("preview and publish", async () => {
    await expect(page.getByTestId("listing-preview")).toContainText("Skoda Octavia 2.0 TDI Style");
    await expect(page.getByTestId("listing-preview")).toContainText("17");
    await page.getByTestId("publish-listing").click();
    await expect(page.getByTestId("publish-success")).toBeVisible();
    listingPath = (await page.getByRole("link", { name: "Виж обявата" }).getAttribute("href")) ?? "";
    expect(listingPath).toMatch(/^\/avtomobili\/\d+-skoda-octavia/);
    await page.goto(listingPath);
    await expect(page.getByRole("heading", { level: 1, name: "Skoda Octavia 2.0 TDI Style" })).toBeVisible();
  });

  await test.step("edit the listing", async () => {
    await page.getByRole("link", { name: "Редактирай" }).click();
    await page.waitForURL(/\/publikuvai\//);
    await page.getByRole("button", { name: "Описание" }).click();
    await page.getByLabel("Описание").fill("Първи собственик, обслужвана в официален сервиз. Нови гуми и спирачки.");
    await page.getByTestId("wizard-next").click();
    await expect(page.getByText(/Запазено/)).toBeVisible();
  });

  await test.step("change the price and mark as sold", async () => {
    await page.goto("/profil/obiavi?status=active");
    const row = page.getByTestId("my-listing").filter({ hasText: "Skoda Octavia 2.0 TDI Style" });
    await row.getByRole("button", { name: "Още действия" }).click();
    await page.getByRole("menuitem", { name: "Промени цената" }).click();
    await page.getByTestId("quick-price-input").fill("16900");
    await page.getByTestId("quick-price-save").click();
    await expect(row.getByTestId("my-listing-price")).toContainText("16");

    await page.goto(listingPath);
    await expect(page.getByRole("complementary", { name: "Цена и продавач" }).getByText(/17\s900\s€ -> 16\s900\s€/)).toBeVisible();

    await page.goto("/profil/obiavi?status=active");
    await row.getByRole("button", { name: "Още действия" }).click();
    await page.getByRole("menuitem", { name: "Маркирай като продадена" }).click();
    await page.getByTestId("confirm-action").click();
    await page.goto("/profil/obiavi?status=sold");
    await expect(page.getByTestId("my-listing").filter({ hasText: "Skoda Octavia 2.0 TDI Style" })).toContainText("Продадена");
  });
});
