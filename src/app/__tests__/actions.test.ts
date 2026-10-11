import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  authenticateNamespace,
  checkAuth,
  logoutNamespace,
  createItem,
  updateItem,
  deleteItem,
  toggleItemSold,
  updateNamespace,
} from '@/app/actions';
import {
  itemSchema,
  updateNamespaceSchema,
  parsePrice,
  getFirstZodErrorMessage,
} from '@/lib/validation';

// Estrutura para capturar todas as queries executadas no supabaseAdmin
interface RecordedQuery {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  payload: unknown;
  eqCalls: Array<{ column: string; value: unknown }>;
}

let recordedQueries: RecordedQuery[] = [];
const cookiesMap = new Map<string, string>();

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
    update(data: unknown) {
      query.operation = 'update';
      query.payload = data;
      return builder;
    },
    delete() {
      query.operation = 'delete';
      return builder;
    },
    eq(column: string, value: unknown) {
      query.eqCalls.push({ column, value });
      return builder;
    },
    single() {
      return Promise.resolve(builder.resolveResult());
    },
    then<TResult1 = unknown, TResult2 = never>(
      onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) {
      return Promise.resolve(builder.resolveResult()).then(onfulfilled, onrejected);
    },
    resolveResult() {
      if (query.table === 'namespaces' && query.operation === 'select') {
        const slugEq = query.eqCalls.find((c) => c.column === 'slug');
        if (slugEq && slugEq.value === 'loja-carol') {
          return {
            data: { id: 'ns-carol-123', slug: 'loja-carol' },
            error: null,
          };
        }
        return { data: null, error: { message: 'Namespace not found' } };
      }

      if (query.table === 'namespace_codes' && query.operation === 'select') {
        const nsIdEq = query.eqCalls.find((c) => c.column === 'namespace_id');
        const codeEq = query.eqCalls.find((c) => c.column === 'code');
        if (nsIdEq?.value === 'ns-carol-123' && codeEq?.value === '1234') {
          return { data: { id: 'code-1' }, error: null };
        }
        return { data: null, error: { message: 'Invalid code' } };
      }

      // Default para items ou outras operações (update, insert, delete)
      return { data: null, error: null };
    },
  };

  return builder;
}

const revalidatePathMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => createFakeQueryBuilder(table)),
  },
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => {
      const val = cookiesMap.get(name);
      return val !== undefined ? { value: val } : undefined;
    }),
    set: vi.fn((name: string, val: string) => {
      cookiesMap.set(name, val);
    }),
    delete: vi.fn((name: string) => {
      cookiesMap.delete(name);
    }),
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

function createItemFormData({
  title = 'Vestido Longo',
  price = '129.90',
  description = 'Vestido floral',
  image_url = '["https://example.com/foto1.jpg"]',
}: {
  title?: string;
  price?: string;
  description?: string;
  image_url?: string;
} = {}): FormData {
  const fd = new FormData();
  if (title !== undefined) fd.append('title', title);
  if (price !== undefined) fd.append('price', price);
  if (description !== undefined) fd.append('description', description);
  if (image_url !== undefined) fd.append('image_url', image_url);
  return fd;
}

describe('Server Actions — T01 Tenant Isolation & Validation', () => {
  beforeEach(() => {
    recordedQueries = [];
    cookiesMap.clear();
    revalidatePathMock.mockClear();
  });

  describe('(1) Tenant Isolation em items', () => {
    beforeEach(() => {
      // Simula usuário autenticado na loja-carol
      cookiesMap.set('auth_loja-carol', '1234');
    });

    it('updateItem aplica .eq("id", id) E .eq("namespace_id", store.id)', async () => {
      const formData = createItemFormData({ title: 'Vestido Midi', price: '99.00' });
      const res = await updateItem('loja-carol', 'item-abc', formData);

      expect(res.success).toBe(true);

      const itemUpdates = recordedQueries.filter(
        (q) => q.table === 'items' && q.operation === 'update'
      );
      expect(itemUpdates).toHaveLength(1);

      const updateQuery = itemUpdates[0];
      const idFilter = updateQuery.eqCalls.find((c) => c.column === 'id');
      const nsFilter = updateQuery.eqCalls.find((c) => c.column === 'namespace_id');

      expect(idFilter).toEqual({ column: 'id', value: 'item-abc' });
      expect(nsFilter).toEqual({ column: 'namespace_id', value: 'ns-carol-123' });
    });

    it('deleteItem aplica .eq("id", id) E .eq("namespace_id", store.id)', async () => {
      const res = await deleteItem('loja-carol', 'item-xyz');

      expect(res.success).toBe(true);

      const itemDeletes = recordedQueries.filter(
        (q) => q.table === 'items' && q.operation === 'delete'
      );
      expect(itemDeletes).toHaveLength(1);

      const deleteQuery = itemDeletes[0];
      const idFilter = deleteQuery.eqCalls.find((c) => c.column === 'id');
      const nsFilter = deleteQuery.eqCalls.find((c) => c.column === 'namespace_id');

      expect(idFilter).toEqual({ column: 'id', value: 'item-xyz' });
      expect(nsFilter).toEqual({ column: 'namespace_id', value: 'ns-carol-123' });
    });

    it('toggleItemSold aplica .eq("id", id) E .eq("namespace_id", store.id)', async () => {
      const res = await toggleItemSold('loja-carol', 'item-456', false);

      expect(res.success).toBe(true);

      const itemUpdates = recordedQueries.filter(
        (q) => q.table === 'items' && q.operation === 'update'
      );
      expect(itemUpdates).toHaveLength(1);

      const updateQuery = itemUpdates[0];
      const idFilter = updateQuery.eqCalls.find((c) => c.column === 'id');
      const nsFilter = updateQuery.eqCalls.find((c) => c.column === 'namespace_id');

      expect(idFilter).toEqual({ column: 'id', value: 'item-456' });
      expect(nsFilter).toEqual({ column: 'namespace_id', value: 'ns-carol-123' });
      expect((updateQuery.payload as { is_sold: boolean }).is_sold).toBe(true);
    });

    it('updateNamespace aplica .eq("id", store.id)', async () => {
      const fd = new FormData();
      fd.append('name', 'Carol Boutique');
      fd.append('subtitle', 'Moda feminina sustentável');

      const res = await updateNamespace('loja-carol', fd);
      expect(res.success).toBe(true);

      const nsUpdates = recordedQueries.filter(
        (q) => q.table === 'namespaces' && q.operation === 'update'
      );
      expect(nsUpdates).toHaveLength(1);

      const updateQuery = nsUpdates[0];
      const idFilter = updateQuery.eqCalls.find((c) => c.column === 'id');
      expect(idFilter).toEqual({ column: 'id', value: 'ns-carol-123' });
    });
  });

  describe('(2) Não autenticado: bloqueio e sem tocar em items', () => {
    it('createItem sem cookie retorna success:false sem tocar em items', async () => {
      const formData = createItemFormData();
      const res = await createItem('loja-carol', formData);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Não autorizado.');

      const itemsQueries = recordedQueries.filter((q) => q.table === 'items');
      expect(itemsQueries).toHaveLength(0);
    });

    it('createItem com cookie inválido retorna success:false sem tocar em items', async () => {
      cookiesMap.set('auth_loja-carol', 'codigo-errado');
      const formData = createItemFormData();
      const res = await createItem('loja-carol', formData);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Não autorizado.');

      const itemsQueries = recordedQueries.filter((q) => q.table === 'items');
      expect(itemsQueries).toHaveLength(0);
    });

    it('updateItem sem autenticação não toca em items', async () => {
      const formData = createItemFormData();
      const res = await updateItem('loja-carol', 'item-1', formData);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Não autorizado.');

      const itemsQueries = recordedQueries.filter((q) => q.table === 'items');
      expect(itemsQueries).toHaveLength(0);
    });

    it('deleteItem sem autenticação não toca em items', async () => {
      const res = await deleteItem('loja-carol', 'item-1');

      expect(res.success).toBe(false);
      expect(res.message).toBe('Não autorizado.');

      const itemsQueries = recordedQueries.filter((q) => q.table === 'items');
      expect(itemsQueries).toHaveLength(0);
    });

    it('toggleItemSold sem autenticação não toca em items', async () => {
      const res = await toggleItemSold('loja-carol', 'item-1', false);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Não autorizado.');

      const itemsQueries = recordedQueries.filter((q) => q.table === 'items');
      expect(itemsQueries).toHaveLength(0);
    });
  });

  describe('(3) Validação de entradas e mensagens em PT-BR', () => {
    beforeEach(() => {
      cookiesMap.set('auth_loja-carol', '1234');
    });

    it('rejeita preço NaN em createItem com mensagem PT-BR sem tocar em items', async () => {
      const formData = createItemFormData({ price: 'invalido' });
      const res = await createItem('loja-carol', formData);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Preço deve ser um número válido.');

      const itemInserts = recordedQueries.filter(
        (q) => q.table === 'items' && q.operation === 'insert'
      );
      expect(itemInserts).toHaveLength(0);
    });

    it('rejeita preço negativo em createItem com mensagem PT-BR sem tocar em items', async () => {
      const formData = createItemFormData({ price: '-15.50' });
      const res = await createItem('loja-carol', formData);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Preço deve ser maior ou igual a zero.');

      const itemInserts = recordedQueries.filter(
        (q) => q.table === 'items' && q.operation === 'insert'
      );
      expect(itemInserts).toHaveLength(0);
    });

    it('rejeita título vazio em createItem com mensagem PT-BR', async () => {
      const formData = createItemFormData({ title: '   ' });
      const res = await createItem('loja-carol', formData);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Título é obrigatório.');

      const itemInserts = recordedQueries.filter(
        (q) => q.table === 'items' && q.operation === 'insert'
      );
      expect(itemInserts).toHaveLength(0);
    });

    it('rejeita título > 120 caracteres em updateItem com mensagem PT-BR', async () => {
      const formData = createItemFormData({ title: 'a'.repeat(121) });
      const res = await updateItem('loja-carol', 'item-1', formData);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Título deve ter no máximo 120 caracteres.');

      const itemUpdates = recordedQueries.filter(
        (q) => q.table === 'items' && q.operation === 'update'
      );
      expect(itemUpdates).toHaveLength(0);
    });

    it('rejeita nome de loja vazio em updateNamespace com mensagem PT-BR', async () => {
      const fd = new FormData();
      fd.append('name', '');
      const res = await updateNamespace('loja-carol', fd);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Nome da loja é obrigatório.');
    });
  });

  describe('(4) Caminho feliz de createItem e outras actions', () => {
    beforeEach(() => {
      cookiesMap.set('auth_loja-carol', '1234');
    });

    it('cria item com sucesso associado ao namespace_id da loja e revalida o path', async () => {
      const formData = createItemFormData({
        title: 'Bolsa de Couro',
        price: '189,90',
        description: 'Couro ecológico',
        image_url: '["https://example.com/bolsa.jpg"]',
      });

      const res = await createItem('loja-carol', formData);

      expect(res.success).toBe(true);
      expect(res.message).toBe('Item criado!');

      const itemInserts = recordedQueries.filter(
        (q) => q.table === 'items' && q.operation === 'insert'
      );
      expect(itemInserts).toHaveLength(1);

      const insertPayload = itemInserts[0].payload as {
        namespace_id: string;
        title: string;
        price: number;
        description: string;
        image_url: string;
      };

      expect(insertPayload.namespace_id).toBe('ns-carol-123');
      expect(insertPayload.title).toBe('Bolsa de Couro');
      expect(insertPayload.price).toBe(189.9);
      expect(insertPayload.description).toBe('Couro ecológico');
      expect(insertPayload.image_url).toBe('["https://example.com/bolsa.jpg"]');

      expect(revalidatePathMock).toHaveBeenCalledWith('/loja-carol');
    });

    it('authenticateNamespace autentica com sucesso e salva o cookie', async () => {
      const res = await authenticateNamespace('loja-carol', '1234');

      expect(res.success).toBe(true);
      expect(res.message).toBe('Autenticado com sucesso!');
      expect(cookiesMap.get('auth_loja-carol')).toBe('1234');
    });

    it('checkAuth retorna true para lojista autenticado e false para deslogado', async () => {
      expect(await checkAuth('loja-carol')).toBe(true);

      cookiesMap.delete('auth_loja-carol');
      expect(await checkAuth('loja-carol')).toBe(false);
    });

    it('logoutNamespace deleta o cookie e revalida o path', async () => {
      expect(cookiesMap.get('auth_loja-carol')).toBe('1234');

      await logoutNamespace('loja-carol');

      expect(cookiesMap.get('auth_loja-carol')).toBeUndefined();
      expect(revalidatePathMock).toHaveBeenCalledWith('/loja-carol');
    });
  });

  describe('Testes unitários dos Schemas de Validação (src/lib/validation.ts)', () => {
    describe('parsePrice', () => {
      it('converte number e strings nos formatos pt-BR e en-US', () => {
        expect(parsePrice(42.5)).toBe(42.5);
        expect(parsePrice('42.50')).toBe(42.5);
        expect(parsePrice('42,50')).toBe(42.5);
        expect(parsePrice('0')).toBe(0);
        expect(parsePrice(0)).toBe(0);
      });

      it('retorna NaN para valores vazios ou não numéricos', () => {
        expect(Number.isNaN(parsePrice(''))).toBe(true);
        expect(Number.isNaN(parsePrice('   '))).toBe(true);
        expect(Number.isNaN(parsePrice(null))).toBe(true);
        expect(Number.isNaN(parsePrice(undefined))).toBe(true);
        expect(Number.isNaN(parsePrice('abc'))).toBe(true);
      });
    });

    describe('itemSchema', () => {
      it('aceita entrada válida completa', () => {
        const result = itemSchema.safeParse({
          title: 'Vestido Vintage',
          price: '89.90',
          description: 'Peça única brechó',
          image_url: '["https://example.com/foto.jpg"]',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.title).toBe('Vestido Vintage');
          expect(result.data.price).toBe(89.9);
        }
      });

      it('permite descrição e image_url nulos ou vazios', () => {
        const result = itemSchema.safeParse({
          title: 'Colar',
          price: 15,
          description: null,
          image_url: '',
        });
        expect(result.success).toBe(true);
      });

      it('rejeita descrição maior que 2000 caracteres', () => {
        const result = itemSchema.safeParse({
          title: 'Item',
          price: 10,
          description: 'a'.repeat(2001),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(getFirstZodErrorMessage(result.error)).toBe(
            'Descrição deve ter no máximo 2000 caracteres.'
          );
        }
      });

      it('rejeita URL de imagem maior que 10000 caracteres', () => {
        const result = itemSchema.safeParse({
          title: 'Item',
          price: 10,
          image_url: 'a'.repeat(10001),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(getFirstZodErrorMessage(result.error)).toBe(
            'URL da imagem excede o tamanho máximo permitido.'
          );
        }
      });
    });

    describe('updateNamespaceSchema', () => {
      it('valida nome de loja e subtítulo', () => {
        const ok = updateNamespaceSchema.safeParse({
          name: 'Brechó da Carol',
          subtitle: 'Roupas seminovas',
        });
        expect(ok.success).toBe(true);
      });

      it('rejeita nome maior que 100 caracteres', () => {
        const err = updateNamespaceSchema.safeParse({
          name: 'a'.repeat(101),
        });
        expect(err.success).toBe(false);
        if (!err.success) {
          expect(getFirstZodErrorMessage(err.error)).toBe(
            'Nome da loja deve ter no máximo 100 caracteres.'
          );
        }
      });

      it('rejeita subtítulo maior que 255 caracteres', () => {
        const err = updateNamespaceSchema.safeParse({
          name: 'Loja',
          subtitle: 'a'.repeat(256),
        });
        expect(err.success).toBe(false);
        if (!err.success) {
          expect(getFirstZodErrorMessage(err.error)).toBe(
            'Subtítulo deve ter no máximo 255 caracteres.'
          );
        }
      });
    });
  });
});
