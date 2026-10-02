import { expect, test } from "@playwright/test";
import { DEV_PASSWORD, logout, uniqueEmail } from "./helpers";

test("buyer registers, logs in, searches, filters, saves a favorite and messages the seller", async ({ page }) => {
  const email = uniqueEmail("buyer");

  await test.step("register and verify email", async () => {
    await page.goto("/registratsiya");
    await page.getByLabel("Име", { exact: true }).fill("Петър Купувач");
    await page.getByLabel("Имейл").fill(email);
    await page.getByLabel("Парола", { exact: true }).fill("Kupuvach2026");
    await page.getByLabel("Повтори паролата").fill("Kupuvach2026");
    await page.getByLabel(/Приемам/).check();
    await page.getByRole("button", { name: "Регистрация" }).click();
    await expect(page.getByText("Провери пощата си")).toBeVisible();

    await page.goto("/dev/poshta");
    const message = page.getByTestId("dev-email").filter({ hasText: email }).first();
    const link = await message.getByRole("link").first().getAttribute("href");
    expect(link).toContain("/api/auth/verify-email");
    await page.goto(link!);
    await expect(page.getByText("Имейлът е потвърден")).toBeVisible();
  });

  await test.step("log out and log in again", async () => {
    await logout(page);
    await page.goto("/vhod");
    await page.getByLabel("Имейл").fill(email);
    await page.getByLabel("Парола", { exact: true }).fill("Kupuvach2026");
    await page.getByRole("button", { name: "Вход" }).click();
    await page.waitForURL("**/profil");
    await expect(page.getByRole("heading", { name: /Здравей, Петър/ })).toBeVisible();
  });

  await test.step("search BMW and apply a filter", async () => {
    await page.getByRole("searchbox", { name: "Търси обяви" }).fill("BMW");
    await page.getByRole("searchbox", { name: "Търси обяви" }).press("Enter");
    await page.waitForURL(/\/avtomobili\?q=BMW/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = page.getByRole("list", { name: "Резултати" }).getByRole("listitem");
    await expect(results.first()).toBeVisible();

    await page.getByRole("complementary", { name: "Филтри" }).getByRole("checkbox", { name: "Дизел" }).check();
    await page.waitForURL(/fuel=diesel/);
    await expect(page.getByRole("link", { name: "Премахни филтър Дизел" })).toBeVisible();
    await expect(results.first()).toContainText("BMW");
  });

  let listingTitle = "";
  await test.step("open a listing and add it to favorites", async () => {
    const first = page.getByRole("list", { name: "Резултати" }).locator("article h2 a").first();
    listingTitle = (await first.textContent())?.trim() ?? "";
    await first.click();
    await expect(page.getByRole("heading", { level: 1, name: listingTitle })).toBeVisible();
    // Similar listing cards have icon-only favorite buttons; the listing's own button shows its label.
    await page.getByRole("button", { name: "Добави в любими" }).filter({ hasText: "Добави в любими" }).click();
    await expect(page.getByRole("button", { name: "В любими" }).filter({ hasText: "В любими" })).toHaveAttribute("aria-pressed", "true");
  });

  await test.step("message the seller", async () => {
    await page.getByRole("button", { name: "Изпрати съобщение" }).first().click();
    await page.getByRole("textbox", { name: "Съобщение" }).fill("Здравейте, автомобилът наличен ли е? Може ли оглед в събота?");
    await page.getByRole("button", { name: "Изпрати", exact: true }).click();
    await page.waitForURL(/\/suobshteniya\/[0-9a-f-]{36}/);
    await expect(page.getByTestId("message-bubble").filter({ hasText: "Може ли оглед в събота?" })).toBeVisible();
  });

  await test.step("favorite is listed in the account", async () => {
    await page.goto("/lyubimi");
    await expect(page.getByTestId("favorites-list")).toContainText(listingTitle);
  });

  expect(DEV_PASSWORD).toBeTruthy();
});
