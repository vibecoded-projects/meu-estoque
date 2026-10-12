import { describe, it, expect, beforeEach, vi } from 'vitest';
import { submitLead } from '../actions';
import { INVENTORY_METHODS } from '@/lib/leads';

interface RecordedQuery {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  payload: unknown;
  eqCalls: Array<{ column: string; value: unknown }>;
}

let recordedQueries: RecordedQuery[] = [];
let mockExistingNamespaces: string[] = [];
let mockExistingLeads: string[] = [];
let mockInsertError: { code?: string; message: string } | null = null;

function createFakeQueryBuilder(table: string) {
  const query: RecordedQuery = {
    table,
    operation: 'select',
    payload: null,
    eqCalls: [],
  };
  recordedQueries.push(query);

  const builder = {
    select() {
      return builder;
    },
    insert(data: unknown) {
      query.operation = 'insert';
      query.payload = data;
      return builder;
    },
    eq(column: string, value: unknown) {
      query.eqCalls.push({ column, value });
      return builder;
    },
    maybeSingle() {
      return Promise.resolve(builder.resolveResult());
    },
    single() {
      return Promise.resolve(builder.resolveResult());
    },
    then<TResult1 = unknown, TResult2 = never>(
      onfulfilled?:
        | ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>)
        | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) {
      return Promise.resolve(builder.resolveResult()).then(onfulfilled, onrejected);
    },
    resolveResult() {
      if (query.table === 'namespaces' && query.operation === 'select') {
        const slugEq = query.eqCalls.find((c) => c.column === 'slug');
        if (slugEq && mockExistingNamespaces.includes(String(slugEq.value))) {
          return { data: { id: 'ns-exists-1' }, error: null };
        }
        return { data: null, error: null };
      }

      if (query.table === 'leads' && query.operation === 'select') {
        const slugEq = query.eqCalls.find((c) => c.column === 'requested_slug');
        if (slugEq && mockExistingLeads.includes(String(slugEq.value))) {
          return { data: { id: 'lead-exists-1' }, error: null };
        }
        return { data: null, error: null };
      }

      if (query.table === 'leads' && query.operation === 'insert') {
        if (mockInsertError) {
          return { data: null, error: mockInsertError };
        }
        return { data: { id: 'lead-new-123' }, error: null };
      }

      return { data: null, error: null };
    },
  };

  return builder;
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => createFakeQueryBuilder(table)),
  },
}));

function makeLeadFormData(overrides: Partial<Record<string, string>> = {}): FormData {
  const fd = new FormData();
  const defaults: Record<string, string> = {
    contact_name: 'Carol Silva',
    store_name: 'Brechó da Carol',
    slug: 'brecho-da-carol',
    whatsapp: '(11) 98765-4321',
    current_inventory_method: 'WhatsApp/Áudios',
  };

  const merged = { ...defaults, ...overrides };
  for (const [key, val] of Object.entries(merged)) {
    if (val !== undefined && val !== null) {
      fd.append(key, val);
    }
  }
  return fd;
}

describe('submitLead Server Action', () => {
  beforeEach(() => {
    recordedQueries = [];
    mockExistingNamespaces = ['loja-carol'];
    mockExistingLeads = ['brecho-existente'];
    mockInsertError = null;
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP = '5511999998888';
  });

  describe('Validações de entrada via Zod', () => {
    it('rejeita nome do responsável vazio ou menor que 2 caracteres', async () => {
      const fd = makeLeadFormData({ contact_name: 'A' });
      const res = await submitLead(fd);

      expect(res.success).toBe(false);
      expect(res.fieldErrors?.contact_name).toBeDefined();
    });

    it('rejeita nome da loja vazio', async () => {
      const fd = makeLeadFormData({ store_name: '' });
      const res = await submitLead(fd);

      expect(res.success).toBe(false);
      expect(res.fieldErrors?.store_name).toBeDefined();
    });

    it('rejeita slug reservado (ex: admin, api, entrar, stokfacil)', async () => {
      const fd = makeLeadFormData({ slug: 'admin' });
      const res = await submitLead(fd);

      expect(res.success).toBe(false);
      expect(res.fieldErrors?.slug).toContain('Link inválido');
    });

    it('rejeita slug com caracteres inválidos ou comprimento menor que 3', async () => {
      const fdShort = makeLeadFormData({ slug: 'ab' });
      const resShort = await submitLead(fdShort);
      expect(resShort.success).toBe(false);
      expect(resShort.fieldErrors?.slug).toBeDefined();

      const fdInvalid = makeLeadFormData({ slug: '---' });
      const resInvalid = await submitLead(fdInvalid);
      expect(resInvalid.success).toBe(false);
      expect(resInvalid.fieldErrors?.slug).toBeDefined();
    });

    it('rejeita telefone brasileiro inválido ou sem DDD', async () => {
      const fdInvalid = makeLeadFormData({ whatsapp: '12345678' });
      const res = await submitLead(fdInvalid);

      expect(res.success).toBe(false);
      expect(res.fieldErrors?.whatsapp).toContain('WhatsApp');
    });

    it('rejeita método de inventário fora da lista pré-definida', async () => {
      const fd = makeLeadFormData({ current_inventory_method: 'Sistema SAP Enterprise' });
      const res = await submitLead(fd);

      expect(res.success).toBe(false);
      expect(res.fieldErrors?.current_inventory_method).toBeDefined();
    });

    it('aceita todos os métodos de estoque oficiais de RF03', async () => {
      for (const method of INVENTORY_METHODS) {
        recordedQueries = [];
        const fd = makeLeadFormData({
          slug: `teste-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          current_inventory_method: method,
        });
        const res = await submitLead(fd);
        expect(res.success).toBe(true);
      }
    });
  });

  describe('Mecanismo Anti-Spam Honeypot', () => {
    it('simula sucesso silencioso sem persistir no banco quando o campo honeypot é preenchido', async () => {
      const fd = makeLeadFormData({
        website: 'https://spam-bot.xyz',
      });

      const res = await submitLead(fd);

      expect(res.success).toBe(true);
      expect(res.message).toContain('Seu pedido foi recebido');
      // Não deve ter executado nenhuma query de inserção no banco
      const inserts = recordedQueries.filter((q) => q.operation === 'insert');
      expect(inserts.length).toBe(0);
    });
  });

  describe('Checagem de disponibilidade e unicidade do slug', () => {
    it('rejeita solicitação se o slug já existir na tabela namespaces', async () => {
      const fd = makeLeadFormData({ slug: 'loja-carol' });
      const res = await submitLead(fd);

      expect(res.success).toBe(false);
      expect(res.error).toBe(
        'Este link já está em uso ou foi solicitado por outra loja.'
      );
      expect(res.fieldErrors?.slug).toBe(
        'Este link já está em uso ou foi solicitado por outra loja.'
      );
      // Garante que não tentou inserir
      const inserts = recordedQueries.filter((q) => q.operation === 'insert');
      expect(inserts.length).toBe(0);
    });

    it('rejeita solicitação se o slug já existir na tabela leads (pedido pendente)', async () => {
      const fd = makeLeadFormData({ slug: 'brecho-existente' });
      const res = await submitLead(fd);

      expect(res.success).toBe(false);
      expect(res.error).toBe(
        'Este link já está em uso ou foi solicitado por outra loja.'
      );
      const inserts = recordedQueries.filter((q) => q.operation === 'insert');
      expect(inserts.length).toBe(0);
    });

    it('trata erro 23505 de violação de chave única retornado pelo banco com mensagem amigável', async () => {
      mockInsertError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint "uq_leads_requested_slug"',
      };

      const fd = makeLeadFormData({ slug: 'slug-com-concorrencia' });
      const res = await submitLead(fd);

      expect(res.success).toBe(false);
      expect(res.error).toBe(
        'Este link já está em uso ou foi solicitado por outra loja.'
      );
    });
  });

  describe('Sucesso, inserção e geração do link WhatsApp Admin', () => {
    it('sanitiza o slug automaticamente caso contenha acentos ou maiúsculas', async () => {
      const fd = makeLeadFormData({
        store_name: 'Boutique & Café São João',
        slug: 'Boutique & Café São João',
      });

      const res = await submitLead(fd);

      expect(res.success).toBe(true);
      const insertQuery = recordedQueries.find(
        (q) => q.table === 'leads' && q.operation === 'insert'
      );
      expect(insertQuery).toBeDefined();
      const payload = insertQuery?.payload as Record<string, unknown>;
      expect(payload.requested_slug).toBe('boutique-cafe-sao-joao');
      expect(payload.status).toBe('trial_pending');
      expect(payload.whatsapp).toBe('5511987654321');
    });

    it('retorna a mensagem de confirmação do RF04 e URL do WhatsApp com dados preenchidos', async () => {
      const fd = makeLeadFormData({
        contact_name: 'Mariana Costa',
        store_name: 'Mariana Acessórios',
        slug: 'mariana-acessorios',
        whatsapp: '(21) 99887-7665',
        current_inventory_method: 'Planilha',
      });

      const res = await submitLead(fd);

      expect(res.success).toBe(true);
      expect(res.message).toBe(
        'Seu pedido foi recebido! Em instantes você receberá seu link e PIN no WhatsApp.'
      );
      expect(res.whatsappAdminUrl).toBeDefined();
      expect(res.whatsappAdminUrl).toContain('https://wa.me/5511999998888?text=');

      // Verifica que os dados essenciais estão no texto codificado do WhatsApp
      const decodedUrl = decodeURIComponent(res.whatsappAdminUrl!);
      expect(decodedUrl).toContain('Mariana Acessórios');
      expect(decodedUrl).toContain('stokfacil.com/mariana-acessorios');
      expect(decodedUrl).toContain('Mariana Costa');
      expect(decodedUrl).toContain('(21) 99887-7665');
      expect(decodedUrl).toContain('Planilha');
      expect(decodedUrl).toContain('Gostaria de acelerar minha ativação!');
    });
  });
});
