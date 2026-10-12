import { test, expect } from '@playwright/test';

test.describe('Vitrine (Storefront)', () => {
  test('deve carregar nome da loja e exibir produtos ou estado vazio', async ({ page }) => {
    const res = await page.goto('/loja-carol');
    expect(res?.status()).toBe(200);

    // O header exibe o nome da loja ou o slug em um H1
    const storeHeading = page.locator('header h1');
    await expect(storeHeading).toBeVisible();
    const headingText = await storeHeading.textContent();
    expect(headingText?.trim().length).toBeGreaterThan(0);

    // Deve conter ou estado vazio ou pelo menos um produto
    const emptyState = page.getByText('Nenhum item cadastrado.');
    const emptyStateVisible = await emptyState.isVisible().catch(() => false);

    if (emptyStateVisible) {
      await expect(page.getByText('Sua vitrine está vazia no momento.')).toBeVisible();
    } else {
      // Itens estão na tela: cada item tem um heading h3
      const productCards = page.locator('h3');
      await expect(productCards.first()).toBeVisible();
      const count = await productCards.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('deve alternar entre visualização em grade e em lista', async ({ page }) => {
    await page.goto('/loja-carol');

    const gridBtn = page.getByTitle('Visualização em Grade');
    const listBtn = page.getByTitle('Visualização em Lista');

    await expect(gridBtn).toBeVisible();
    await expect(listBtn).toBeVisible();

    // Alternar para grade
    await gridBtn.click();
    // Alternar para lista
    await listBtn.click();
    // Alternar para grade novamente
    await gridBtn.click();
  });

  test('deve abrir modal de detalhes do produto e fechar com Escape', async ({ page }) => {
    await page.goto('/loja-carol');

    const emptyState = page.getByText('Nenhum item cadastrado.');
    const isEmpty = await emptyState.isVisible().catch(() => false);

    test.skip(isEmpty, 'Nenhum produto cadastrado na vitrine para abrir o modal.');

    const firstProduct = page.locator('h3').first();
    const isProductPresent = await firstProduct.isVisible().catch(() => false);
    test.skip(!isProductPresent, 'Nenhum produto encontrado para teste de modal.');

    // Clica no card do primeiro produto
    await firstProduct.click();

    // Modal de produto aberto deve mostrar o botão "Copiar Infos"
    const copyInfosBtn = page.getByRole('button', { name: /copiar infos/i });
    await expect(copyInfosBtn).toBeVisible();

    // Fecha com tecla Escape
    await page.keyboard.press('Escape');
    await expect(copyInfosBtn).not.toBeVisible();
  });

  test('deve retornar status 404 para slug inexistente', async ({ page }) => {
    const res = await page.goto('/loja-que-nao-existe-404-teste');
    expect(res?.status()).toBe(404);
  });

  test('deve exibir rodapé "Criado com StokFácil" e metatags OpenGraph com nome da loja', async ({ page }) => {
    await page.goto('/loja-carol');

    // Valida rodapé com link para a home
    const footerLink = page.getByRole('link', { name: /Criado com StokFácil — Crie sua vitrine grátis/i });
    await expect(footerLink).toBeVisible();
    await expect(footerLink).toHaveAttribute('href', '/');

    // Valida og:title contendo o nome da loja ou StokFácil
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);
    const content = await ogTitle.getAttribute('content');
    expect(content).toMatch(/StokFácil/);
  });
});
