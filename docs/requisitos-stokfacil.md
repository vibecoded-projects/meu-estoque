# StokFácil — Documento de Requisitos Funcionais e Não Funcionais (MVP & Escala Lean)

> **Documento de Engenharia e Produto**  
> **Produto:** StokFácil (anteriormente Meu Estoque)  
> **Objetivo:** Especificar os requisitos técnicos e funcionais necessários para viabilizar a estratégia de monetização, onboarding sem fricção, compartilhamento multicanal e conversão de planos pós-30 dias grátis.

---

## 1. Requisitos Funcionais (RF)

### Módulo 1: Rebranding & Identidade Visual
* **RF01 - Atualização de Marca StokFácil:**  
  O sistema deve exibir a nova identidade "StokFácil", ícone temático e o slogan *"Seu estoque no bolso, suas vendas no WhatsApp"* em todos os pontos de contato (Navbar, Footer, Título da aba, Metatags OpenGraph).
* **RF02 - Rodapé Condicional / White-Label:**  
  O rodapé do catálogo público deve conter por padrão a assinatura *"Criado com StokFácil — Crie sua vitrine grátis"*, com link apontando para a Home.  
  *Exceção:* Lojas com plano Anual ativo devem ter a opção de desativar esse selo (modo 100% white-label).

---

### Módulo 2: Home Page & Captura de Leads (Pedido de Acesso)
* **RF03 - Formulário de Pedido de Acesso (30 Dias Grátis):**  
  A página inicial deve conter um formulário simples de cadastro para lojistas solicitarem acesso, contendo os campos:
  - Nome do Responsável / Lojista (obrigatório).
  - Nome da Loja (obrigatório).
  - Slug pretendido (ex: `stokfacil.com/sua-loja`) com validação de formato e disponibilidade (obrigatório).
  - Número de WhatsApp com DDD (obrigatório).
  - Formato atual do estoque (Select: *"WhatsApp/Áudios"*, *"Planilha"*, *"Bloco de Notas"*, *"Fotos no Celular"*, *"Vou cadastrar do zero"*).
* **RF04 - Armazenamento e Notificação do Lead:**  
  Ao submeter o formulário de pedido de acesso:
  - Os dados do lojista devem ser salvos na tabela `leads` ou `namespaces` (com status `trial_pending` ou `active`).
  - Uma mensagem de confirmação na tela deve informar: *"Seu pedido foi recebido! Em instantes você receberá seu link e PIN no WhatsApp."*
  - Deve gerar link direto para abrir uma conversa no WhatsApp do administrador já com os dados preenchidos para acelerar a ativação.
* **RF05 - Seção de Planos e Preços na Home:**  
  Apresentar de forma transparente a grade de preços (Mensal R$ 39, Trimestral R$ 99, Semestral R$ 169 e Anual R$ 249), destacando os benefícios do plano Anual (Setup de 50 itens incluso, White-label e PDF para impressão).

---

### Módulo 3: Entrada de Dados Anti-Fricção (Onboarding)
* **RF06 - Importador de Texto em Lote (Fast Batch Insert):**  
  Dentro do painel autenticado da loja, deve existir a funcionalidade de importar múltiplos itens colando texto formatado (ex: `Título, Preço, Descrição`), criando registros instantâneos no banco sem necessidade de abrir modais individuais.
* **RF07 - Upload de Fotos em Esteira (Modo Galeria):**  
  O lojista deve conseguir selecionar múltiplas fotos de uma só vez pelo celular/desktop. O sistema deve carregar as imagens e permitir preenchimento rápido em cascata de título e preço em uma listagem única.
* **RF08 - Botão Concierge de Suporte para Cadastro:**  
  Exibir botão visível no painel: *"Precisa de ajuda para cadastrar seu estoque? Chame no WhatsApp e subimos suas peças para você"*.

---

### Módulo 4: Catálogo, Pedidos & Compartilhamento Multicanal
* **RF09 - Pedido com 1 Clique no WhatsApp (Cliente -> Lojista):**  
  No modal de detalhes do produto do catálogo público, deve haver um botão de destaque *"Pedir no WhatsApp"*. Ao clicar, abre o WhatsApp da loja com mensagem pré-formatada:  
  `"Olá! Vi o produto [Título] (R$ [Preço]) na sua vitrine StokFácil. Ainda está disponível?"`
* **RF10 - Configuração do WhatsApp da Loja:**  
  O lojista autenticado deve conseguir cadastrar/editar seu número de WhatsApp de atendimento nas configurações do seu catálogo.
* **RF11 - Compartilhamento Rápido para Redes Sociais:**  
  - **Copiar Legenda Pronta:** Botão que copia para a área de transferência o título, preço formatado, descrição e link do produto com emojis.
  - **Download de Foto Otimizado:** Manter e aprimorar o download ou compartilhamento nativo para a galeria (Web Share API) para criação de Stories no Instagram.
  - **Copiar Link da Vitrine para a Bio:** Botão no topo do catálogo que copia o link limpo com mensagem instrutiva de como colar na Bio do Instagram.
* **RF12 - Gestão de Status Disponível / Vendido:**  
  Manter o botão rápido para o lojista alternar o status do produto entre "Disponível" e "Vendido" sem recarregar a tela inteira.

---

### Módulo 5: Gestão de Planos, Trials e Ciclo de Vida (Operação Solopreneur)
* **RF13 - Controle de Período de Teste (Trial 30 Dias):**  
  O modelo de dados do `namespace` deve armazenar a data de criação (`created_at`) e a data de expiração do trial (`trial_expires_at`).
* **RF14 - Alerta de Expiração de Acesso:**  
  Quando faltarem 5 dias para o término dos 30 dias grátis, o lojista autenticado deve visualizar um banner no topo da tela informando os dias restantes e o botão *"Renovar no WhatsApp (Via Pix)"*.
* **RF15 - Bloqueio de Edição Pós-Trial:**  
  Caso o trial expire e o plano não seja renovado pelo administrador, o lojista não poderá adicionar novos itens até a liberação manual, mas a vitrine pública poderá permanecer visível por um período de tolerância.

---

## 2. Requisitos Não Funcionais (RNF)

### Performance e Otimização
* **RNF01 - Tempo de Carregamento em Conexão 4G/3G:**  
  Como os clientes acessam via links de Instagram e WhatsApp no celular, a página pública da vitrine deve ter carregamento inicial (LCP) inferior a 2 segundos.
* **RNF02 - Compressão Automática de Imagens no Upload:**  
  Imagens tiradas diretamente da câmera de celulares modernos (geralmente entre 5MB e 15MB) devem ser comprimidas no frontend antes do envio para o Supabase Storage, economizando franquia gratuita e agilizando o upload.

### Usabilidade e Interface (UX/UI)
* **RNF03 - Mobile-First Extremo:**  
  100% das ações (pedir acesso, navegar na vitrine, autenticar com PIN, cadastrar item, alternar status de vendido e baixar fotos) devem ser confortáveis e realizáveis com apenas uma mão na tela do celular.
* **RNF04 - Contraste e Legibilidade:**  
  Os campos de formulários, preços, botões de ação e títulos devem seguir o padrão WCAG AA, garantindo leitura perfeita sob luz solar (típico de comércio de rua/feiras).

### Segurança e Privacidade
* **RNF05 - Autenticação Descomplicada por PIN e Cookies Seguros:**  
  A autenticação de edição por loja continuará baseada em PIN numérico de 4 dígitos armazenado com segurança e associado a cookies `httpOnly`, `SameSite=Lax` com prazo de expiração de sessão.
* **RNF06 - Isolamento de Dados por Tenant (Namespace):**  
  Nenhum lojista ou cliente de uma loja pode acessar ou alterar dados de outra loja (isolamento estrito por `namespace_id` via Row Level Security ou validação de backend).
* **RNF07 - Conformidade com LGPD & Risco Zero:**  
  Não coletar nem reter CPFs, endereços físicos de clientes finais ou dados bancários de compradores. Os únicos dados mantidos são dados de catálogo e número de contato comercial fornecido voluntariamente pelo lojista.

### Compatibilidade e Operação
* **RNF08 - Custo de Infraestrutura Próximo a Zero (Lean Free-Tier):**  
  A solução deve operar integralmente dentro dos limites gratuitos da Vercel (Next.js) e do Supabase (PostgreSQL + Storage) nas fases iniciais (até os primeiros 50 a 100 lojistas ativos).
* **RNF09 - Navegadores e Plataformas:**  
  Total compatibilidade com os navegadores embutidos (WebViews) do WhatsApp, Instagram e TikTok, onde a maioria dos links de bio é aberta.

---

## 3. Matriz de Priorização (MVP vs. Versões Futuras)

| Requisito | Descrição | Prioridade | Fase |
| :--- | :--- | :---: | :---: |
| **RF01** | Rebranding StokFácil na interface | **Alta** | Fase 1 |
| **RF03** | Formulário de Pedido de Acesso na Home | **Alta** | Fase 1 |
| **RF09** | Botão de Pedido com 1 clique no WhatsApp | **Alta** | Fase 1 |
| **RF10** | Cadastro do WhatsApp da Loja no Namespace | **Alta** | Fase 1 |
| **RF11** | Compartilhamento para Instagram e Link de Bio | **Alta** | Fase 1 |
| **RF06** | Importador de itens por texto em lote | **Média** | Fase 2 |
| **RF08** | Botão Concierge de Onboarding no Zap | **Média** | Fase 2 |
| **RF13/14** | Controle de Trial de 30 dias e Banner de Renovação | **Média** | Fase 2 |
| **RNF02** | Compressão de fotos no frontend antes do upload | **Média** | Fase 2 |
| **RF02** | Remoção de marca (White-label no Anual) | **Baixa** | Fase 3 |
| **RF07** | Upload de fotos em esteira sequencial | **Baixa** | Fase 3 |
