import { expect, type Page } from "@playwright/test";

export const DEV_PASSWORD = "MobiTed123!";

export async function login(page: Page, email: string, next = "/profil") {
  await page.goto(`/vhod?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Имейл").fill(email);
  await page.getByLabel("Парола", { exact: true }).fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Вход" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/vhod"));
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Меню на профила" }).click();
  await page.getByRole("menuitem", { name: "Изход" }).click();
  await expect(page.getByRole("link", { name: "Вход" }).first()).toBeVisible();
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
}
