import { test, expect } from '@playwright/test';

const DEMO_PIN = process.env.E2E_DEMO_PIN ?? '9563';
const INVALID_PIN = DEMO_PIN === '0000' ? '9999' : '0000';

test.describe('Autenticação e Sessão de Lojista', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/loja-carol');
  });

  test('deve exibir mensagem de erro ao submeter PIN inválido', async ({ page }) => {
    // Abre o modal de edição
    const editBtn = page.getByRole('button', { name: /editar itens/i });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Modal de PIN aberto
    const pinInput = page.getByPlaceholder('••••');
    await expect(pinInput).toBeVisible();

    // Digita PIN incorreto e tenta entrar
    await pinInput.fill(INVALID_PIN);
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Mensagem de erro deve aparecer no formulário
    const errorMsg = page.locator('form p.text-rose-500');
    await expect(errorMsg).toBeVisible();
    const errorText = await errorMsg.textContent();
    expect(errorText?.trim().length).toBeGreaterThan(0);
  });

  test('deve autenticar com PIN válido, exibir botão de adicionar e permitir logout', async ({ page }) => {
    // Abre o modal de edição
    const editBtn = page.getByRole('button', { name: /editar itens/i });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Digita PIN válido
    const pinInput = page.getByPlaceholder('••••');
    await expect(pinInput).toBeVisible();
    await pinInput.fill(DEMO_PIN);
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Modo de edição: botão "Novo Produto" e "Sair" ficam visíveis
    const addProductBtn = page.getByRole('button', { name: /novo produto/i });
    await expect(addProductBtn).toBeVisible();

    const logoutBtn = page.getByRole('button', { name: /sair/i });
    await expect(logoutBtn).toBeVisible();

    // Realiza logout e valida retorno ao modo visitante
    await logoutBtn.click();
    await expect(page.getByRole('button', { name: /editar itens/i })).toBeVisible();
    await expect(addProductBtn).not.toBeVisible();
  });
});
