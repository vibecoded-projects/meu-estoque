import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('deve carregar a home com status 200, título e link para /loja-carol', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // Título / Header principal StokFácil
    await expect(page.getByText('StokFácil').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Seu estoque no bolso, suas vendas no WhatsApp/i })
    ).toBeVisible();
    await expect(page).toHaveTitle(/StokFácil — Catálogo digital e vendas no WhatsApp/);

    // Link para loja demo
    const demoLink = page.getByRole('link', { name: /Acessar \/loja-carol/i });
    await expect(demoLink).toBeVisible();

    await demoLink.click();
    await expect(page).toHaveURL(/\/loja-carol$/, { timeout: 30000 });
  });
});
