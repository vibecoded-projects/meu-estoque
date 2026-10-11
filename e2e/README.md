# Testes E2E com Playwright — StokFácil

Este diretório contém os testes de ponta a ponta (E2E) do StokFácil executados via Playwright.

## Como rodar

Executar toda a suíte de testes E2E:

```bash
npm run test:e2e
```

Executar com interface visual (modo interativo do Playwright):

```bash
npx playwright test --ui
```

Executar apenas um projeto específico (ex.: desktop ou emulação mobile):

```bash
npx playwright test --project=desktop-chromium
npx playwright test --project=mobile-iphone
npx playwright test --project=mobile-android
```

## Variáveis de Ambiente

- **`E2E_DEMO_PIN`** (opcional, padrão: `'9563'`):
  PIN da loja demo de leitura (`loja-carol`). Utilizado em `e2e/auth.spec.ts`. O teste não realiza operações de escrita no banco.
- **`E2E_STORE_PIN`** (opcional):
  PIN da loja dedicada de escrita (`e2e-teste`). Se não estiver configurado, os testes que realizam mutação em `e2e/items-write.spec.ts` são ignorados (`test.skip`) com mensagem explicativa.

## Loja Dedicada de Testes de Escrita (`e2e-teste`)

Para habilitar a execução de `e2e/items-write.spec.ts`, execute o SQL abaixo no banco de desenvolvimento Supabase para criar o namespace de teste e seu respectivo PIN (substitua `<PIN>` pelo PIN de 4 dígitos desejado):

```sql
INSERT INTO namespaces (slug, name) VALUES ('e2e-teste', 'Loja E2E') ON CONFLICT (slug) DO NOTHING;
INSERT INTO namespace_codes (namespace_id, code) SELECT id, '<PIN>' FROM namespaces WHERE slug='e2e-teste';
```

Em seguida, defina a variável `E2E_STORE_PIN=<PIN>` no seu ambiente ao rodar os testes.
