import { test, expect } from '@playwright/test';

test.describe('Home Page — Landing Page & Planos (T10)', () => {
  test('deve carregar a home com status 200, slogan do Hero e badges de benefício', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // Header / Identidade da marca
    await expect(page.getByText('StokFácil').first()).toBeVisible();

    // Slogan principal em H1
    await expect(
      page.getByRole('heading', { name: /Seu estoque no bolso, suas vendas no WhatsApp/i })
    ).toBeVisible();
    await expect(page).toHaveTitle(/StokFácil — Catálogo digital e vendas no WhatsApp/);

    // Badges de benefícios no Hero
    await expect(page.getByText('14 dias grátis').first()).toBeVisible();
    await expect(page.getByText('Sem mensalidade inicial')).toBeVisible();
    await expect(page.getByText('Sem cartão de crédito')).toBeVisible();

    // CTA principal
    const heroCta = page.getByRole('link', { name: /Pedir acesso grátis/i });
    await expect(heroCta).toBeVisible();
    await expect(heroCta).toHaveAttribute('href', '#pedir-acesso');
  });

  test('deve exibir os recursos visuais principais (Vitrine no WhatsApp, Catálogo 1-clique, Controle no bolso)', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /Vitrine no WhatsApp/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Catálogo 1-clique/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Controle no bolso/i })
    ).toBeVisible();
  });

  test('deve exibir a seção de planos com a grade comercial completa e o Anual em destaque VIP', async ({ page }) => {
    await page.goto('/');

    // Cabeçalho da seção de planos
    await expect(
      page.getByRole('heading', { name: /Planos simples para o seu estoque voar/i })
    ).toBeVisible();

    // Os 4 planos
    await expect(page.getByRole('heading', { name: 'Mensal' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Trimestral' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Semestral' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Anual' })).toBeVisible();

    // Preços de cada plano
    await expect(page.getByText('R$ 39,00')).toBeVisible();
    await expect(page.getByText('R$ 99,00')).toBeVisible();
    await expect(page.getByText('R$ 169,00')).toBeVisible();
    await expect(page.getByText('R$ 299,00')).toBeVisible();

    // Economias e destaques
    await expect(page.getByText(/Economia de R\$ 18/i).first()).toBeVisible();
    await expect(page.getByText(/Economia de R\$ 65/i).first()).toBeVisible();
    await expect(page.getByText(/Apenas ~R\$ 24,90\/mês/i)).toBeVisible();

    // Recursos exclusivos do plano Anual
    await expect(page.getByText(/Setup inicial de até 15 itens incluso/i).first()).toBeVisible();
    await expect(page.getByText(/White-label sem marca no rodapé/i).first()).toBeVisible();
    await expect(page.getByText(/Kit de Balcão em PDF/i).first()).toBeVisible();
    await expect(page.getByText(/Mais Popular · Melhor Custo-Benefício/i)).toBeVisible();
  });

  test('deve conter o placeholder com id #pedir-acesso e link funcional para a loja demo', async ({ page }) => {
    await page.goto('/');

    // Seção de acesso
    const accessSection = page.locator('#pedir-acesso');
    await expect(accessSection).toBeVisible();
    await expect(
      accessSection.getByRole('heading', { name: /Comece agora sua vitrine digital StokFácil/i })
    ).toBeVisible();

    // Link para loja demo
    const demoLink = page.getByRole('link', { name: /Acessar \/loja-carol/i });
    await expect(demoLink).toBeVisible();

    await demoLink.click();
    await expect(page).toHaveURL(/\/loja-carol$/, { timeout: 30000 });
  });
});
