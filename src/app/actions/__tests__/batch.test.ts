import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createItemsBatch } from '@/app/actions/batch';
import { signToken } from '@/lib/session';

const cookiesMap = new Map<string, string>();
const mockRevalidatePath = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: (name: string) => {
      const val = cookiesMap.get(name);
      return val ? { value: val } : undefined;
    },
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

interface RecordedQuery {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  payload: unknown;
  eqCalls: Array<{ column: string; value: unknown }>;
}

let recordedQueries: RecordedQuery[] = [];
let mockNamespaceState: Record<string, unknown> | null = {
  id: 'ns-loja-teste-123',
  slug: 'loja-teste',
  trial_starts_at: '2026-10-01T00:00:00.000Z',
  trial_expires_at: '2026-10-15T00:00:00.000Z',
  trial_extended: false,
  activation_completed: false,
  first_shared_at: null,
};
let mockInsertError: { message: string } | null = null;
let mockItemsTotalCount = 0;

function createFakeQueryBuilder(table: string) {
  const query: RecordedQuery = {
    table,
    operation: 'select',
    payload: null,
    eqCalls: [],
  };
  recordedQueries.push(query);

  const builder = {
    select(columns?: string, options?: { count?: string; head?: boolean }) {
      if (options?.count === 'exact') {
        (query as unknown as { isCount: boolean }).isCount = true;
      }
      return builder;
    },
    insert(data: unknown) {
      query.operation = 'insert';
      query.payload = data;
      return Promise.resolve({
        data: mockInsertError ? null : data,
        error: mockInsertError,
      });
    },
    update(data: unknown) {
      query.operation = 'update';
      query.payload = data;
      if (query.table === 'namespaces' && data && typeof data === 'object' && mockNamespaceState) {
        Object.assign(mockNamespaceState, data);
      }
      return builder;
    },
    eq(column: string, value: unknown) {
      query.eqCalls.push({ column, value });
      return builder;
    },
    then<TResult1 = unknown, TResult2 = never>(
      onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) {
      if ((query as unknown as { isCount: boolean }).isCount) {
        return Promise.resolve({
          count: mockItemsTotalCount,
          data: null,
          error: null,
        }).then(onfulfilled, onrejected);
      }
      return Promise.resolve({ data: null, error: null }).then(onfulfilled, onrejected);
    },
    single() {
      if (query.table === 'namespaces') {
        if (!mockNamespaceState) {
          return Promise.resolve({ data: null, error: { message: 'Not found' } });
        }
        const slugEq = query.eqCalls.find((c) => c.column === 'slug');
        if (slugEq && slugEq.value !== mockNamespaceState.slug) {
          return Promise.resolve({ data: null, error: { message: 'Not found' } });
        }
        const idEq = query.eqCalls.find((c) => c.column === 'id');
        if (idEq && idEq.value !== mockNamespaceState.id) {
          return Promise.resolve({ data: null, error: { message: 'Not found' } });
        }
        return Promise.resolve({ data: { ...mockNamespaceState }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };

  return builder;
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => createFakeQueryBuilder(table),
  },
}));

function setAuthenticatedCookie(slug = 'loja-teste'): string {
  const token = signToken({
    slug,
    purpose: 'session',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  cookiesMap.set(`auth_${slug}`, token);
  return token;
}

describe('createItemsBatch Server Action (T18 / RF06)', () => {
  beforeEach(() => {
    cookiesMap.clear();
    mockRevalidatePath.mockClear();
    recordedQueries = [];
    mockInsertError = null;
    mockItemsTotalCount = 0;
    mockNamespaceState = {
      id: 'ns-loja-teste-123',
      slug: 'loja-teste',
      trial_starts_at: '2026-10-01T00:00:00.000Z',
      trial_expires_at: '2026-10-15T00:00:00.000Z',
      trial_extended: false,
      activation_completed: false,
      first_shared_at: null,
    };
  });

  describe('Autenticação e Isolamento de Loja', () => {
    it('rejeita chamada quando cookie de sessão não existe', async () => {
      const res = await createItemsBatch('loja-teste', [
        { title: 'Camisa floral', price: 79.9 },
      ]);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Não autorizado.');
      expect(recordedQueries.filter((q) => q.operation === 'insert')).toHaveLength(0);
    });

    it('rejeita chamada quando o token de sessão é adulterado', async () => {
      cookiesMap.set('auth_loja-teste', 'token-invalido.falsificado');

      const res = await createItemsBatch('loja-teste', [
        { title: 'Camisa floral', price: 79.9 },
      ]);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Não autorizado.');
      expect(recordedQueries.filter((q) => q.operation === 'insert')).toHaveLength(0);
    });

    it('rejeita chamada quando o token pertence a outro slug', async () => {
      const tokenOutroSlug = signToken({
        slug: 'loja-vizinha',
        purpose: 'session',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      cookiesMap.set('auth_loja-teste', tokenOutroSlug);

      const res = await createItemsBatch('loja-teste', [
        { title: 'Camisa floral', price: 79.9 },
      ]);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Não autorizado.');
    });

    it('rejeita chamada se o namespace não existir no banco', async () => {
      setAuthenticatedCookie('loja-inexistente');
      mockNamespaceState = null;

      const res = await createItemsBatch('loja-inexistente', [
        { title: 'Camisa floral', price: 79.9 },
      ]);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Loja não encontrada.');
    });

    it('rejeita chamada se slug for vazio ou não-string', async () => {
      const res = await createItemsBatch('', [
        { title: 'Camisa floral', price: 79.9 },
      ]);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Loja não encontrada.');
    });
  });

  describe('Validação Zod dos Itens do Lote', () => {
    beforeEach(() => {
      setAuthenticatedCookie('loja-teste');
    });

    it('rejeita lote vazio (0 itens)', async () => {
      const res = await createItemsBatch('loja-teste', []);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Envie pelo menos 1 produto para importação.');
      expect(recordedQueries.filter((q) => q.operation === 'insert')).toHaveLength(0);
    });

    it('rejeita lote que ultrapassa 100 itens', async () => {
      const excessItems = Array.from({ length: 101 }, (_, i) => ({
        title: `Item ${i + 1}`,
        price: 10 + i,
      }));

      const res = await createItemsBatch('loja-teste', excessItems);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Limite de no máximo 100 produtos por importação.');
      expect(recordedQueries.filter((q) => q.operation === 'insert')).toHaveLength(0);
    });

    it('aceita lote com exatamente 100 itens', async () => {
      const maxItems = Array.from({ length: 100 }, (_, i) => ({
        title: `Produto ${i + 1}`,
        price: 50,
      }));

      const res = await createItemsBatch('loja-teste', maxItems);

      expect(res.success).toBe(true);
      expect(res.data?.count).toBe(100);
      const insertQuery = recordedQueries.find((q) => q.operation === 'insert');
      expect(insertQuery).toBeDefined();
      expect(Array.isArray(insertQuery?.payload)).toBe(true);
      expect((insertQuery?.payload as unknown[]).length).toBe(100);
    });

    it('rejeita item com título vazio ou apenas espaços', async () => {
      const res = await createItemsBatch('loja-teste', [
        { title: '   ', price: 59.9 },
      ]);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Título é obrigatório.');
    });

    it('rejeita item com título que excede 100 caracteres', async () => {
      const longTitle = 'A'.repeat(101);
      const res = await createItemsBatch('loja-teste', [
        { title: longTitle, price: 59.9 },
      ]);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Título deve ter no máximo 100 caracteres.');
    });

    it('rejeita item com preço negativo', async () => {
      const res = await createItemsBatch('loja-teste', [
        { title: 'Vestido longo', price: -5 },
      ]);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Preço deve ser maior ou igual a zero.');
    });

    it('rejeita item com preço NaN ou infinito', async () => {
      const res1 = await createItemsBatch('loja-teste', [
        { title: 'Vestido longo', price: Number.NaN },
      ]);
      expect(res1.success).toBe(false);

      const res2 = await createItemsBatch('loja-teste', [
        { title: 'Vestido longo', price: Number.POSITIVE_INFINITY },
      ]);
      expect(res2.success).toBe(false);
      expect(res2.message).toMatch(/Preço deve ser um número/);
    });

    it('aceita item com preço zero', async () => {
      const res = await createItemsBatch('loja-teste', [
        { title: 'Brinde Especial', price: 0 },
      ]);

      expect(res.success).toBe(true);
      expect(res.data?.count).toBe(1);
    });

    it('rejeita item com descrição que excede 500 caracteres', async () => {
      const longDesc = 'D'.repeat(501);
      const res = await createItemsBatch('loja-teste', [
        { title: 'Vestido', price: 90, description: longDesc },
      ]);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Descrição deve ter no máximo 500 caracteres.');
    });
  });

  describe('Inserção em Lote e Isolamento de Tenant', () => {
    beforeEach(() => {
      setAuthenticatedCookie('loja-teste');
    });

    it('insere todos os itens em uma única chamada insert com namespace_id e is_sold: false', async () => {
      const itemsToImport = [
        { title: 'Vestido Floral', price: 89.9, description: 'Tamanho M' },
        { title: 'Calça Jeans Mom', price: 120, description: null },
        { title: 'Blusa Linho', price: 45 },
      ];

      const res = await createItemsBatch('loja-teste', itemsToImport);

      expect(res.success).toBe(true);
      expect(res.data?.count).toBe(3);
      expect(res.message).toContain('3 produto(s) importado(s) com sucesso!');

      // Deve ter apenas 1 operação insert em items
      const insertQueries = recordedQueries.filter(
        (q) => q.table === 'items' && q.operation === 'insert'
      );
      expect(insertQueries).toHaveLength(1);

      const payload = insertQueries[0].payload as Array<{
        namespace_id: string;
        title: string;
        price: number;
        description: string | null;
        is_sold: boolean;
      }>;

      expect(payload).toHaveLength(3);
      expect(payload[0]).toEqual({
        namespace_id: 'ns-loja-teste-123',
        title: 'Vestido Floral',
        price: 89.9,
        description: 'Tamanho M',
        is_sold: false,
      });
      expect(payload[1]).toEqual({
        namespace_id: 'ns-loja-teste-123',
        title: 'Calça Jeans Mom',
        price: 120,
        description: null,
        is_sold: false,
      });
      expect(payload[2]).toEqual({
        namespace_id: 'ns-loja-teste-123',
        title: 'Blusa Linho',
        price: 45,
        description: null,
        is_sold: false,
      });

      // Todos os itens devem ter o namespace_id da loja autenticada
      expect(payload.every((item) => item.namespace_id === 'ns-loja-teste-123')).toBe(true);
      expect(payload.every((item) => item.is_sold === false)).toBe(true);

      // Revalida o caminho da loja
      expect(mockRevalidatePath).toHaveBeenCalledWith('/loja-teste');
    });

    it('retorna erro amigável se a query de inserção falhar no Supabase', async () => {
      mockInsertError = { message: 'Database connection failed' };

      const res = await createItemsBatch('loja-teste', [
        { title: 'Vestido Floral', price: 89.9 },
      ]);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Erro ao importar produtos. Tente novamente.');
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('executa ativação progressiva (T15) quando a loja já compartilhou e atinge 5 itens', async () => {
      // Configura loja que já compartilhou mas ainda não estendeu
      if (mockNamespaceState) {
        mockNamespaceState.first_shared_at = '2026-10-05T12:00:00.000Z';
        mockNamespaceState.trial_extended = false;
      }
      // Simula contagem de 5 itens no banco após a inserção
      mockItemsTotalCount = 5;

      const res = await createItemsBatch('loja-teste', [
        { title: 'Item 1', price: 10 },
        { title: 'Item 2', price: 20 },
      ]);

      expect(res.success).toBe(true);

      // Verifica se houve update em namespaces para estender trial
      const updateNamespaceQuery = recordedQueries.find(
        (q) => q.table === 'namespaces' && q.operation === 'update'
      );
      expect(updateNamespaceQuery).toBeDefined();
      expect(mockNamespaceState?.trial_extended).toBe(true);
      expect(mockNamespaceState?.activation_completed).toBe(true);
    });
  });
});
