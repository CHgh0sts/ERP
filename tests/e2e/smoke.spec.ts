import { test, expect } from "@playwright/test";

// Tests smoke: verifient que l'application demarre et que les routes cles repondent.
// Prerequis : DB initialisee (via /setup) ou vierge (redirection automatique).

test("page d'accueil redirige vers /setup si non initialise ou /login sinon", async ({ page }) => {
  const r = await page.goto("/");
  const url = page.url();
  expect(r?.status()).toBeLessThan(500);
  expect(/\/setup|\/login|\/dashboard/.test(url)).toBeTruthy();
});

test("API setup/status repond", async ({ request }) => {
  const r = await request.get("/api/setup/status");
  expect(r.status()).toBe(200);
  const body = await r.json();
  expect(body).toHaveProperty("initialized");
});

test("page /login est accessible", async ({ page }) => {
  const r = await page.goto("/login");
  expect(r?.status()).toBeLessThan(500);
  await expect(page.locator("body")).toContainText(/Connexion|Email|Login/i);
});
