---
name: test-meu-estoque
description: >-
  Use this skill to run tests for the Meu Estoque application before a deployment. It verifies the build, linting, and basic runtime availability, as well as providing a manual testing checklist for the user.
---

# Test Routine for Meu Estoque

Always run this skill before deploying the application to ensure everything is working correctly, especially after modifying components like `ItemList.tsx` or `actions.ts`.

## Automated Steps (Agent)

Execute these steps in order using your terminal tools:

1. **Verify Build**:
   Run the production build to ensure there are no type or compilation errors:
   `npm run build`

2. **Run Linting**:
   Ensure the codebase follows all formatting and linting rules:
   `npm run lint`

3. **Local Server Smoke Test**:
   Start the application in the background (`npm run start` se o build funcionou, ou `npm run dev`) e aguarde alguns segundos.
   Em seguida, rode um teste de resposta para a página inicial:
   `Invoke-WebRequest -Uri http://localhost:3000` (ajuste a porta se necessário).
   Certifique-se de que o retorno seja `StatusCode: 200`.

## Manual Steps (User)

Após os testes automatizados passarem, instrua o usuário a abrir a aplicação no navegador (ex: `http://localhost:3000/loja-carol`) e validar:

- **Cadastro de Imagens**: Criar um novo produto e fazer upload de 2 ou mais fotos.
- **Visualização (Carousel)**: Clicar no produto recém-criado e validar se é possível deslizar horizontalmente (scroll) para ver todas as imagens.
- **Formulário de Cadastro**: Verificar se o texto digitado nos campos (título, preço, descrição) e no código PIN de acesso está escuro (`text-slate-900`) e fácil de ler, sem se misturar com os placeholders.
- **Deleção**: Apagar o produto de teste.
