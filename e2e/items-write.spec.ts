import { test, expect } from '@playwright/test';

const STORE_PIN = process.env.E2E_STORE_PIN;
const STORE_SLUG = 'e2e-teste';
const ITEM_PREFIX = 'Item E2E Automacao';

test.describe('Fluxo completo de escrita em loja de testes (e2e-teste)', () => {
  let createdTitle = '';
  let updatedTitle = '';

  test.beforeEach(async ({ page }) => {
    test.skip(
      !STORE_PIN,
      'E2E_STORE_PIN não está definido nas variáveis de ambiente. Defina E2E_STORE_PIN para rodar testes de escrita.'
    );

    createdTitle = `${ITEM_PREFIX} ${Date.now()}`;
    updatedTitle = `${createdTitle} (Editado)`;

    // Acessa a loja de testes
    const res = await page.goto(`/${STORE_SLUG}`);
    if (res?.status() === 404) {
      test.skip(
        true,
        `Loja /${STORE_SLUG} não encontrada no banco. Crie a loja usando o SQL fornecido no README antes de executar testes de escrita.`
      );
    }
  });

  test.afterEach(async ({ page }) => {
    if (!STORE_PIN) return;

    // Garante limpeza via UI caso algum item de teste tenha permanecido
    try {
      await page.goto(`/${STORE_SLUG}`);

      // Se não estiver autenticado, autentica para poder excluir
      const editItemsBtn = page.getByRole('button', { name: /editar itens/i });
      if (await editItemsBtn.isVisible().catch(() => false)) {
        await editItemsBtn.click();
        await page.getByPlaceholder('••••').fill(STORE_PIN);
        await page.getByRole('button', { name: 'Entrar' }).click();
        await expect(page.getByRole('button', { name: /novo produto/i })).toBeVisible({ timeout: 5000 });
      }

      // Procura qualquer item criado por este teste
      page.on('dialog', (dialog) => dialog.accept());

      for (const title of [updatedTitle, createdTitle]) {
        if (!title) continue;
        const targetCard = page.locator('div', { has: page.getByRole('heading', { name: title, level: 3 }) }).first();
        if (await targetCard.isVisible().catch(() => false)) {
          // Abre o modal do item e clica em Excluir
          await targetCard.click();
          const deleteBtn = page.getByRole('button', { name: /excluir/i });
          if (await deleteBtn.isVisible().catch(() => false)) {
            await deleteBtn.click();
            await page.waitForTimeout(1000);
          }
        }
      }
    } catch (err) {
      console.warn('Erro durante cleanup no afterEach:', err);
    }
  });

  test('deve executar o ciclo completo: criar -> editar -> marcar vendido -> excluir', async ({ page }) => {
    // 1. Autenticar na loja de testes se necessário
    const editBtn = page.getByRole('button', { name: /editar itens/i });
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await page.getByPlaceholder('••••').fill(STORE_PIN!);
      await page.getByRole('button', { name: 'Entrar' }).click();
    }

    const addProductBtn = page.getByRole('button', { name: /novo produto/i });
    await expect(addProductBtn).toBeVisible({ timeout: 5000 });

    // 2. Criar novo produto
    await addProductBtn.click();

    // Preenche campos do formulário
    await page.getByLabel(/título do produto/i).fill(createdTitle);
    await page.getByLabel(/preço/i).fill('49.90');
    await page.getByLabel(/descrição/i).fill('Descrição cadastrada via automação E2E');

    // Submete e aguarda reload
    await page.getByRole('button', { name: /salvar produto/i }).click();

    // Valida que o produto foi criado e aparece na vitrine
    const createdItemHeading = page.getByRole('heading', { name: createdTitle, level: 3 });
    await expect(createdItemHeading).toBeVisible({ timeout: 10000 });

    // 3. Editar o produto
    // Localiza o card do produto recém-criado
    const createdCard = page.locator('div', { has: createdItemHeading }).first();
    // Abre o modal de visualização
    await createdCard.click();

    // No modal de visualização, clica no botão "Editar"
    const editModalBtn = page.getByRole('button', { name: /editar/i });
    await expect(editModalBtn).toBeVisible();
    await editModalBtn.click();

    // Altera o título e o preço
    const titleInput = page.getByLabel(/título do produto/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill(updatedTitle);
    await page.getByLabel(/preço/i).fill('89.90');

    // Salva a alteração
    await page.getByRole('button', { name: /salvar produto/i }).click();

    // Valida que o título atualizado agora está na vitrine
    const updatedHeading = page.getByRole('heading', { name: updatedTitle, level: 3 });
    await expect(updatedHeading).toBeVisible({ timeout: 10000 });

    // 4. Marcar como vendido
    const updatedCard = page.locator('div', { has: updatedHeading }).first();
    const sellBtn = updatedCard.getByTitle('Vender');
    await expect(sellBtn).toBeVisible();
    await sellBtn.click();

    // Valida a badge "VENDIDO" no card
    const soldBadge = updatedCard.getByText('VENDIDO');
    await expect(soldBadge).toBeVisible({ timeout: 5000 });

    // 5. Excluir o item
    page.once('dialog', (dialog) => dialog.accept());
    await updatedCard.click();

    const deleteBtn = page.getByRole('button', { name: /excluir/i });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Valida que o item não existe mais na tela
    await expect(page.getByRole('heading', { name: updatedTitle, level: 3 })).not.toBeVisible({ timeout: 5000 });
  });
});
