# StokFácil — Estratégia de Negócio, Rebranding e Validação Lean

> **De "Meu Estoque" para StokFácil:**  
> A promessa central da marca é **"Estoque Fácil e Descomplicado"**. Não é um ERP pesado nem um e-commerce burocrático; é a ponte mais simples do mundo entre os produtos do lojista e as vendas no WhatsApp e Instagram.

---

## 1. Rebranding & Proposta de Valor: StokFácil

### O Posicionamento
- **Nome:** **StokFácil**
- **Slogan / Tagline:** *"Seu estoque no bolso, suas vendas no WhatsApp."*
- **A Dor Real do Cliente:** Pequenos lojistas (brechós, revendedoras, artesãos) perdem vendas porque o estoque é uma bagunça: fotos perdidas na galeria do celular, clientes perguntando *"tá disponível?"* 30 vezes no direct, e tempo perdido digitando preços repetidamente.
- **A Promessa do StokFácil:** 
  1. **Sem complicação:** Acesso instantâneo via link próprio (`stokfacil.com/sua-loja`) com PIN simples de 4 dígitos.
  2. **Zero atrito:** Marcar como vendido em 1 clique e baixar fotos / copiar dados prontos para postar.
  3. **Venda direta:** O cliente final clica e já cai no WhatsApp com o pedido pronto.

---

## 2. Feature Anti-Fricção: Entrada de Dados sem Esforço

O maior risco de cancelamento no teste de 30 dias é a preguiça de cadastrar 30 a 50 produtos um por um. O StokFácil ataca isso em três formatos:

### A. Canal Onboarding VIP no WhatsApp ("Me manda no Zap que a gente sobe")
- **Como funciona:** O lojista não precisa digitar nada no primeiro dia. Ele encaminha as fotos e áudios/mensagens do WhatsApp para o suporte do StokFácil (você inicialmente no modelo Concierge).
- **Percepção do cliente:** Atendimento de luxo, sensação de parceria e valor percebido imediato.

### B. Importador de Texto Rápido (Lote em 1 minuto)
- O lojista cola uma lista simples vinda de bloco de notas, conversa de WhatsApp ou planilha:
  ```text
  Vestido Linho Floral, 89.90, Tamanho M
  Bolsa Palha Praia, 120.00, Pronta entrega
  Brinco Prata 925, 45.00, Peça única
  ```
- O sistema gera os cartões automaticamente; ele só associa as fotos depois.

### C. Upload Múltiplo de Galeria (Modo Esteira)
- Seleciona 20 fotos da galeria de uma vez só. O app cria os 20 produtos como rascunhos e abre uma lista rápida para digitar apenas o Título e Preço sem precisar abrir e fechar modais individuais.

---

## 3. Super Poder de Compartilhamento (WhatsApp & Instagram)

O compartilhamento é a principal ferramenta de geração de vendas para o lojista e a principal fonte de marketing viral para o StokFácil:

1. **Botão "Pedir pelo WhatsApp" (Cliente Final -> Lojista):**
   - Ao ver o item no catálogo, o cliente clica e abre o WhatsApp do lojista com texto pré-preenchido:
     > *"Olá! Vi o produto [Título] (R$ [Preço]) no StokFácil. Ainda está disponível?"*
2. **Botão "Compartilhar com Cliente" (Lojista -> Cliente):**
   - Lojista gera link direto daquele produto específico para enviar para um cliente que perguntou no privado.
3. **Gerador de Conteúdo para Instagram (Stories e Posts):**
   - **Copiar Legenda Pronta:** Um clique copia título, preço, descrição e hashtags formatadas com emojis.
   - **Baixar Imagem com 1 Toque:** Suporte nativo para salvar no rolo da câmera (Web Share API) já no formato ideal para Stories.
4. **Link da Vitrine na Bio:**
   - Botão rápido para copiar o link limpo da vitrine para colar na bio do Instagram.

---

## 4. Funil da Home Page: "Peça seu Acesso Grátis (30 Dias)"

A nova Home do StokFácil deixa de ser apenas uma tela de demonstração e se torna uma **Landing Page de Captura e Conversão**:

- **Chamada:** *"Chega de perder fotos e vendas na galeria do celular. Tenha sua vitrine online em 2 minutos."*
- **Formulário de Solicitação de Acesso (Zero Burocracia):**
  1. Nome da sua loja.
  2. Link desejado (ex: `/minha-loja`).
  3. WhatsApp para receber o código PIN.
  4. Como está seu estoque hoje? (*"No WhatsApp"*, *"No bloco de notas"*, *"Em planilha"*, *"Fotos soltas"*).
- **Gatilho de Confiança:** *"Teste grátis por 30 dias. Não pedimos cartão de crédito."*
- **Fluxo Operacional (Solopreneur):** O lead cai numa notificação direta para você (tabela no Supabase / mensagem no WhatsApp). Você ativa a loja em 2 minutos e responde com as credenciais prontas.

---

## 5. Estratégia de Precificação e Monetização (Pós-30 dias)

O usuário testa 30 dias grátis. Para a conversão, a tabela de planos é desenhada para guiar fortemente a adesão ao **Plano Anual**:

| Plano | Preço | Equivalente Mensal | O que está incluso |
| :--- | :--- | :--- | :--- |
| **Mensal** | **R$ 39 / mês** | R$ 39,00 | Catálogo online, fotos ilimitadas, controle disponível/vendido, suporte padrão. |
| **Trimestral** | **R$ 99 / trimestre** | R$ 33,00 (~15% OFF) | Tudo do mensal + botão de pedido direto no WhatsApp da loja. |
| **Semestral** | **R$ 169 / semestre** | R$ 28,15 (~28% OFF) | Tudo do trimestral + selo de vitrine verificada + suporte prioritário. |
| **Anual (Campeão)** | **R$ 249 / ano** | **R$ 20,75** (~47% OFF) | **Super Pacote de Benefícios Exclusivos** (Veja abaixo). |

### Por que o cliente vai querer o Plano Anual? (Proposta de Valor Exclusiva)
1. **Onboarding VIP Incluso:** *"Nós cadastramos os seus primeiros 50 produtos para você sem nenhum custo adicional."*
2. **Vitrine 100% White-Label:** Remoção da marca StokFácil do rodapé; a vitrine fica com aspecto de sistema proprietário exclusivo da loja dele.
3. **Kit Gráfico Físico (PDF de Balcão e Sacolas):** Envio de arte personalizada em PDF pronta para impressão com QR Code direto para o catálogo da loja (para colocar no balcão ou nas embalagens).
4. **Relatório Mensal de Desempenho no WhatsApp:** Mensagem com os produtos mais clicados e número de visitas no mês.

---

## 6. Blindagem Jurídica e Operação como Pessoa Física

- **Sem risco de intermediação de pagamentos:** O StokFácil nunca cobra porcentagem sobre as vendas nem custodia valores de clientes finais. Toda transação financeira das vendas é 100% direta entre o lojista e seu cliente no WhatsApp/Pix/balcão.
- **Cobrança da Assinatura via Pix Direto:** Sem mensalidades fixas de gateway. O lojista paga a assinatura via Pix (CPF inicial ou MEI com conta digital gratuita tipo Cora/Inter/Mercado Pago).
- **Termos de Uso Transparentes:** Termo de 1 página declarando que a ferramenta é um serviço digital de exibição de catálogo e divulgação.

---

## 7. Roadmap de Validação (Passo a Passo)

1. **Validação Manual dos Primeiros 5 Clientes:**
   - Contato direto no Instagram de 20 lojistas locais/regionais.
   - Demonstração pronta criada com fotos públicas da própria loja.
   - Ativação do teste de 30 dias grátis com auxílio no cadastro inicial.
2. **Coleta de Feedback & Métricas de Ativação:**
   - Acompanhar se o lojista conseguiu compartilhar no WhatsApp e marcar itens como vendido.
3. **Conversão de Teste para Assinatura:**
   - No 25º dia, enviar mensagem de acompanhamento com a proposta do plano Anual com o super pacote de benefícios.
