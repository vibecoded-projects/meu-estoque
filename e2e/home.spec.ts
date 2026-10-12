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
    await expect(page.getByText('Sem cartão de crédito', { exact: true }).first()).toBeVisible();

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

  test('deve navegar para a loja demo através do CTA no Hero', async ({ page }) => {
    await page.goto('/');

    // Link para loja demo no Hero
    const demoLink = page.getByRole('link', { name: /Acessar \/loja-carol/i });
    await expect(demoLink).toBeVisible();

    await demoLink.click();
    await expect(page).toHaveURL(/\/loja-carol$/, { timeout: 30000 });
  });
});

test.describe('Formulário de Pedido de Acesso / Leads — T11 (RF03, RF04)', () => {
  test('deve renderizar a seção #pedir-acesso com todos os campos do formulário e preview de slug', async ({ page }) => {
    await page.goto('/');

    const section = page.locator('#pedir-acesso');
    await expect(section).toBeVisible();

    // Título da seção
    await expect(
      section.getByRole('heading', { name: /Comece agora sua vitrine digital StokFácil/i })
    ).toBeVisible();

    // Campos do formulário
    const contactInput = section.locator('#contact_name');
    const storeInput = section.locator('#store_name');
    const slugInput = section.locator('#slug');
    const phoneInput = section.locator('#whatsapp');
    const inventorySelect = section.locator('#current_inventory_method');
    const submitBtn = section.getByRole('button', { name: /Começar 14 dias grátis/i });

    await expect(contactInput).toBeVisible();
    await expect(storeInput).toBeVisible();
    await expect(slugInput).toBeVisible();
    await expect(phoneInput).toBeVisible();
    await expect(inventorySelect).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Prévia inicial de slug padrão
    await expect(section.getByText('stokfacil.com/sua-loja')).toBeVisible();
  });

  test('deve atualizar a prévia do slug em tempo real ao digitar o nome da loja ou slug personalizado', async ({ page }) => {
    await page.goto('/');

    const section = page.locator('#pedir-acesso');
    const storeInput = section.locator('#store_name');
    const slugInput = section.locator('#slug');

    // Ao digitar o nome da loja, sugere o slug sanitizado na prévia
    await storeInput.fill('Boutique & Café da Maria');
    await expect(section.getByText('stokfacil.com/boutique-cafe-da-maria')).toBeVisible();

    // Ao customizar manualmente o slug, atualiza a prévia diretamente
    await slugInput.fill('minha-loja-vintage');
    await expect(section.getByText('stokfacil.com/minha-loja-vintage')).toBeVisible();
  });

  test('deve aplicar máscara no telefone celular brasileiro enquanto o usuário digita', async ({ page }) => {
    await page.goto('/');

    const section = page.locator('#pedir-acesso');
    const phoneInput = section.locator('#whatsapp');

    await phoneInput.fill('11987654321');
    await expect(phoneInput).toHaveValue('(11) 98765-4321');
  });

  test('deve bloquear submissão e exibir erros de validação ao enviar campos vazios', async ({ page }) => {
    await page.goto('/');

    const section = page.locator('#pedir-acesso');
    const submitBtn = section.getByRole('button', { name: /Começar 14 dias grátis/i });

    // Submete formulário em branco
    await submitBtn.click();

    // Deve exibir alerta de atenção e mensagens nos campos
    await expect(section.getByRole('alert')).toBeVisible();
    await expect(section.getByText(/Informe seu nome/i)).toBeVisible();
    await expect(section.getByText(/Informe o nome da sua loja/i)).toBeVisible();
    await expect(section.getByText(/Informe seu WhatsApp com DDD/i)).toBeVisible();
    await expect(section.getByText(/Selecione como você controla seu estoque hoje/i)).toBeVisible();
  });
});
