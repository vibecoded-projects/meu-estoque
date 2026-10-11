import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('deve carregar a home com status 200, título e link para /loja-carol', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // Título / Header principal
    await expect(page.getByText('Meu Estoque').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /O catálogo da sua loja\./i })
    ).toBeVisible();

    // Link para loja demo
    const demoLink = page.getByRole('link', { name: /Acessar \/loja-carol/i });
    await expect(demoLink).toBeVisible();

    await demoLink.click();
    await expect(page).toHaveURL(/\/loja-carol$/);
  });
});
