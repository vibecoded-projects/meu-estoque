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
  markShared,
} from '@/app/actions';
import {
  itemSchema,
  updateNamespaceSchema,
  parsePrice,
  getFirstZodErrorMessage,
} from '@/lib/validation';
import { signToken, verifyToken } from '@/lib/session';

function setAuthenticatedSessionCookie(slug = 'loja-carol'): string {
  const token = signToken({
    slug,
    purpose: 'session',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  cookiesMap.set(`auth_${slug}`, token);
  return token;
}

// Estrutura para capturar todas as queries executadas no supabaseAdmin
interface RecordedQuery {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  payload: unknown;
  eqCalls: Array<{ column: string; value: unknown }>;
}

let recordedQueries: RecordedQuery[] = [];
const cookiesMap = new Map<string, string>();

let mockNamespaceState: Record<string, unknown> = {
  id: 'ns-carol-123',
  slug: 'loja-carol',
  trial_starts_at: '2026-10-01T00:00:00.000Z',
  trial_expires_at: '2026-10-15T00:00:00.000Z',
  trial_extended: false,
  activation_completed: false,
  first_shared_at: null,
};
let mockItemsCount = 0;

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
      if (query.table === 'namespaces' && data && typeof data === 'object') {
        Object.assign(mockNamespaceState, data);
      }
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
      onfulfilled?: ((value: { data: unknown; error: unknown; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ) {
      return Promise.resolve(builder.resolveResult()).then(onfulfilled, onrejected);
    },
    resolveResult() {
      if (query.table === 'namespaces' && query.operation === 'select') {
        const slugEq = query.eqCalls.find((c) => c.column === 'slug');
        const idEq = query.eqCalls.find((c) => c.column === 'id');
        if (
          (slugEq && slugEq.value === 'loja-carol') ||
          (idEq && idEq.value === 'ns-carol-123')
        ) {
          return {
            data: { ...mockNamespaceState },
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

      if (query.table === 'items' && query.operation === 'select') {
        return { data: [], count: mockItemsCount, error: null };
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
    mockNamespaceState = {
      id: 'ns-carol-123',
      slug: 'loja-carol',
      trial_starts_at: '2026-10-01T00:00:00.000Z',
      trial_expires_at: '2026-10-15T00:00:00.000Z',
      trial_extended: false,
      activation_completed: false,
      first_shared_at: null,
    };
    mockItemsCount = 0;
  });

  describe('(1) Tenant Isolation em items', () => {
    beforeEach(() => {
      // Simula usuário autenticado na loja-carol com sessão assinada
      setAuthenticatedSessionCookie('loja-carol');
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

    it('atualiza whatsapp normalizado e instagram_handle no updateNamespace', async () => {
      const fd = new FormData();
      fd.append('name', 'Carol Boutique');
      fd.append('subtitle', 'Moda feminina sustentável');
      fd.append('whatsapp', '(11) 99999-9999');
      fd.append('instagram_handle', 'carol_boutique');

      const res = await updateNamespace('loja-carol', fd);
      expect(res.success).toBe(true);
      expect(res.message).toBe('Loja atualizada com sucesso!');

      const nsUpdates = recordedQueries.filter(
        (q) => q.table === 'namespaces' && q.operation === 'update'
      );
      expect(nsUpdates).toHaveLength(1);

      const updateQuery = nsUpdates[0];
      expect(updateQuery.payload).toEqual({
        name: 'Carol Boutique',
        subtitle: 'Moda feminina sustentável',
        whatsapp: '5511999999999',
        instagram_handle: 'carol_boutique',
      });
    });

    it('permite limpar whatsapp e instagram_handle passando strings vazias', async () => {
      const fd = new FormData();
      fd.append('name', 'Carol Boutique');
      fd.append('whatsapp', '');
      fd.append('instagram_handle', '');

      const res = await updateNamespace('loja-carol', fd);
      expect(res.success).toBe(true);

      const nsUpdates = recordedQueries.filter(
        (q) => q.table === 'namespaces' && q.operation === 'update'
      );
      expect(nsUpdates).toHaveLength(1);

      const updateQuery = nsUpdates[0];
      expect(updateQuery.payload).toEqual({
        name: 'Carol Boutique',
        subtitle: null,
        whatsapp: null,
        instagram_handle: null,
      });
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

    it('rejeita cookie legado com PIN puro em texto (ex.: 1234) sem tocar em items', async () => {
      cookiesMap.set('auth_loja-carol', '1234');
      const res = await checkAuth('loja-carol');

      expect(res).toBe(false);

      const itemsQueries = recordedQueries.filter((q) => q.table === 'items');
      expect(itemsQueries).toHaveLength(0);
    });

    it('rejeita token assinado para outro slug', async () => {
      const tokenOutraLoja = signToken({
        slug: 'loja-outra',
        purpose: 'session',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      cookiesMap.set('auth_loja-carol', tokenOutraLoja);

      const res = await checkAuth('loja-carol');
      expect(res).toBe(false);
    });

    it('rejeita token com purpose diferente de session (ex.: magic)', async () => {
      const magicToken = signToken({
        slug: 'loja-carol',
        purpose: 'magic',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      cookiesMap.set('auth_loja-carol', magicToken);

      const res = await checkAuth('loja-carol');
      expect(res).toBe(false);
    });

    it('rejeita token expirado no cookie de autenticação', async () => {
      const expiredToken = signToken({
        slug: 'loja-carol',
        purpose: 'session',
        exp: Math.floor(Date.now() / 1000) - 30, // 30 segundos atrás
      });
      cookiesMap.set('auth_loja-carol', expiredToken);

      const res = await checkAuth('loja-carol');
      expect(res).toBe(false);
    });
  });

  describe('(3) Validação de entradas e mensagens em PT-BR', () => {
    beforeEach(() => {
      setAuthenticatedSessionCookie('loja-carol');
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

    it('rejeita whatsapp inválido em updateNamespace com mensagem PT-BR', async () => {
      const fd = new FormData();
      fd.append('name', 'Carol Boutique');
      fd.append('whatsapp', '12345');
      const res = await updateNamespace('loja-carol', fd);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Número de WhatsApp inválido.');
    });

    it('rejeita instagram contendo "@" em updateNamespace com mensagem PT-BR', async () => {
      const fd = new FormData();
      fd.append('name', 'Carol Boutique');
      fd.append('instagram_handle', '@carol_boutique');
      const res = await updateNamespace('loja-carol', fd);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Nome de usuário do Instagram não deve conter "@".');
    });

    it('rejeita instagram com mais de 30 caracteres em updateNamespace com mensagem PT-BR', async () => {
      const fd = new FormData();
      fd.append('name', 'Carol Boutique');
      fd.append('instagram_handle', 'a'.repeat(31));
      const res = await updateNamespace('loja-carol', fd);

      expect(res.success).toBe(false);
      expect(res.message).toBe('Instagram deve ter no máximo 30 caracteres.');
    });
  });

  describe('(4) Caminho feliz de createItem e outras actions', () => {
    beforeEach(() => {
      setAuthenticatedSessionCookie('loja-carol');
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

    it('authenticateNamespace valida PIN no banco, não expõe PIN no cookie e grava token assinado válido', async () => {
      const res = await authenticateNamespace('loja-carol', '1234');

      expect(res.success).toBe(true);
      expect(res.message).toBe('Autenticado com sucesso!');

      const cookieVal = cookiesMap.get('auth_loja-carol');
      expect(cookieVal).toBeDefined();
      expect(cookieVal).not.toBe('1234');
      expect(cookieVal).not.toContain('1234');

      const isTokenValid = verifyToken(cookieVal!, {
        slug: 'loja-carol',
        purpose: 'session',
      });
      expect(isTokenValid).toBe(true);
    });

    it('checkAuth retorna true para lojista autenticado e false para deslogado', async () => {
      expect(await checkAuth('loja-carol')).toBe(true);

      cookiesMap.delete('auth_loja-carol');
      expect(await checkAuth('loja-carol')).toBe(false);
    });

    it('logoutNamespace deleta o cookie e revalida o path', async () => {
      const token = setAuthenticatedSessionCookie('loja-carol');
      expect(cookiesMap.get('auth_loja-carol')).toBe(token);

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

      it('aceita e normaliza whatsapp válido no formato nacional e internacional', () => {
        const res1 = updateNamespaceSchema.safeParse({
          name: 'Loja',
          whatsapp: '(11) 99999-9999',
        });
        expect(res1.success).toBe(true);
        if (res1.success) {
          expect(res1.data.whatsapp).toBe('5511999999999');
        }

        const res2 = updateNamespaceSchema.safeParse({
          name: 'Loja',
          whatsapp: '+55 11 99999-9999',
        });
        expect(res2.success).toBe(true);
        if (res2.success) {
          expect(res2.data.whatsapp).toBe('5511999999999');
        }

        const res3 = updateNamespaceSchema.safeParse({
          name: 'Loja',
          whatsapp: '(11) 3333-4444', // fixo
        });
        expect(res3.success).toBe(true);
        if (res3.success) {
          expect(res3.data.whatsapp).toBe('551133334444');
        }
      });

      it('aceita whatsapp nulo, indefinido ou vazio e converte para nulo/indefinido', () => {
        const res1 = updateNamespaceSchema.safeParse({
          name: 'Loja',
          whatsapp: null,
        });
        expect(res1.success).toBe(true);
        if (res1.success) {
          expect(res1.data.whatsapp).toBeNull();
        }

        const res2 = updateNamespaceSchema.safeParse({
          name: 'Loja',
          whatsapp: '',
        });
        expect(res2.success).toBe(true);
        if (res2.success) {
          expect(res2.data.whatsapp).toBeNull();
        }

        const res3 = updateNamespaceSchema.safeParse({
          name: 'Loja',
        });
        expect(res3.success).toBe(true);
        if (res3.success) {
          expect(res3.data.whatsapp).toBeUndefined();
        }
      });

      it('rejeita whatsapp com formato inválido', () => {
        const err = updateNamespaceSchema.safeParse({
          name: 'Loja',
          whatsapp: '12345',
        });
        expect(err.success).toBe(false);
        if (!err.success) {
          expect(getFirstZodErrorMessage(err.error)).toBe(
            'Número de WhatsApp inválido.'
          );
        }
      });

      it('aceita instagram_handle válido sem "@"', () => {
        const res = updateNamespaceSchema.safeParse({
          name: 'Loja',
          instagram_handle: 'minha_loja.oficial',
        });
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.instagram_handle).toBe('minha_loja.oficial');
        }
      });

      it('aceita instagram_handle nulo, indefinido ou vazio', () => {
        const res1 = updateNamespaceSchema.safeParse({
          name: 'Loja',
          instagram_handle: null,
        });
        expect(res1.success).toBe(true);
        if (res1.success) {
          expect(res1.data.instagram_handle).toBeNull();
        }

        const res2 = updateNamespaceSchema.safeParse({
          name: 'Loja',
          instagram_handle: '   ',
        });
        expect(res2.success).toBe(true);
        if (res2.success) {
          expect(res2.data.instagram_handle).toBeNull();
        }

        const res3 = updateNamespaceSchema.safeParse({
          name: 'Loja',
        });
        expect(res3.success).toBe(true);
        if (res3.success) {
          expect(res3.data.instagram_handle).toBeUndefined();
        }
      });

      it('rejeita instagram_handle contendo "@"', () => {
        const err = updateNamespaceSchema.safeParse({
          name: 'Loja',
          instagram_handle: '@minhaloja',
        });
        expect(err.success).toBe(false);
        if (!err.success) {
          expect(getFirstZodErrorMessage(err.error)).toBe(
            'Nome de usuário do Instagram não deve conter "@".'
          );
        }
      });

      it('rejeita instagram_handle com mais de 30 caracteres', () => {
        const err = updateNamespaceSchema.safeParse({
          name: 'Loja',
          instagram_handle: 'a'.repeat(31),
        });
        expect(err.success).toBe(false);
        if (!err.success) {
          expect(getFirstZodErrorMessage(err.error)).toBe(
            'Instagram deve ter no máximo 30 caracteres.'
          );
        }
      });
    });
  });

  describe('markShared e Ativação Progressiva 14+16 dias (T15 / RF13 / D3)', () => {
    it('rejeita markShared sem cookie de autenticação', async () => {
      const res = await markShared('loja-carol');
      expect(res.success).toBe(false);
      expect(res.message).toBe('Não autorizado.');

      const nsUpdates = recordedQueries.filter(
        (q) => q.table === 'namespaces' && q.operation === 'update'
      );
      expect(nsUpdates).toHaveLength(0);
    });

    it('rejeita markShared com slug inexistente ou diferente do autenticado', async () => {
      setAuthenticatedSessionCookie('loja-carol');
      const res = await markShared('loja-inexistente');
      expect(res.success).toBe(false);
      expect(res.message).toBe('Não autorizado.');
    });

    describe('loja autenticada', () => {
      beforeEach(() => {
        setAuthenticatedSessionCookie('loja-carol');
      });

      it('primeiro compartilhamento com menos de 5 itens: registra first_shared_at mas não estende trial', async () => {
        mockItemsCount = 2;
        mockNamespaceState.first_shared_at = null;
        mockNamespaceState.trial_extended = false;
        mockNamespaceState.activation_completed = false;

        const res = await markShared('loja-carol');

        expect(res.success).toBe(true);
        expect(res.data).toEqual({ extended: false });
        expect(res.message).toBe('Compartilhamento registrado com sucesso!');

        // Verifica que atualizou first_shared_at no banco
        const nsUpdates = recordedQueries.filter(
          (q) => q.table === 'namespaces' && q.operation === 'update'
        );
        expect(nsUpdates.length).toBeGreaterThanOrEqual(1);

        const shareUpdate = nsUpdates.find(
          (q) =>
            q.payload &&
            typeof q.payload === 'object' &&
            'first_shared_at' in (q.payload as Record<string, unknown>)
        );
        expect(shareUpdate).toBeDefined();

        // Não deve ter atualizado trial_extended
        expect(mockNamespaceState.trial_extended).toBe(false);
        expect(mockNamespaceState.activation_completed).toBe(false);

        expect(revalidatePathMock).toHaveBeenCalledWith('/loja-carol');
      });

      it('chamada quando já compartilhado: não sobrescreve first_shared_at (D3)', async () => {
        const existingDate = '2026-10-02T10:00:00.000Z';
        mockItemsCount = 3;
        mockNamespaceState.first_shared_at = existingDate;
        mockNamespaceState.trial_extended = false;

        const res = await markShared('loja-carol');

        expect(res.success).toBe(true);
        expect(res.data).toEqual({ extended: false });

        // Não deve ter feito nenhum update de first_shared_at
        const nsUpdates = recordedQueries.filter(
          (q) => q.table === 'namespaces' && q.operation === 'update'
        );
        expect(nsUpdates).toHaveLength(0);
        expect(mockNamespaceState.first_shared_at).toBe(existingDate);
      });

      it('primeiro compartilhamento com 5 ou mais itens: estende trial para 30 dias automaticamente', async () => {
        const trialStartsAt = '2026-10-01T00:00:00.000Z';
        mockItemsCount = 5;
        mockNamespaceState.first_shared_at = null;
        mockNamespaceState.trial_starts_at = trialStartsAt;
        mockNamespaceState.trial_extended = false;
        mockNamespaceState.activation_completed = false;

        const res = await markShared('loja-carol');

        expect(res.success).toBe(true);
        expect(res.data).toEqual({ extended: true });
        expect(res.message).toContain('30 dias');

        // Verifica que estendeu o trial
        expect(mockNamespaceState.trial_extended).toBe(true);
        expect(mockNamespaceState.activation_completed).toBe(true);

        // Data esperada: 2026-10-01 + 30 dias = 2026-10-31T00:00:00.000Z
        const expectedExpiresAt = new Date(
          new Date(trialStartsAt).getTime() + 30 * 24 * 60 * 60 * 1000
        ).toISOString();
        expect(mockNamespaceState.trial_expires_at).toBe(expectedExpiresAt);

        expect(revalidatePathMock).toHaveBeenCalledWith('/loja-carol');
      });

      it('idempotência: não re-estende trial se trial_extended já for true', async () => {
        mockItemsCount = 8;
        mockNamespaceState.first_shared_at = '2026-10-02T10:00:00.000Z';
        mockNamespaceState.trial_extended = true;
        mockNamespaceState.activation_completed = true;
        const originalExpiresAt = '2026-10-31T00:00:00.000Z';
        mockNamespaceState.trial_expires_at = originalExpiresAt;

        const res = await markShared('loja-carol');

        expect(res.success).toBe(true);
        expect(res.data).toEqual({ extended: false });
        expect(mockNamespaceState.trial_expires_at).toBe(originalExpiresAt);

        // Nenhum update em namespaces deve ter sido executado
        const nsUpdates = recordedQueries.filter(
          (q) => q.table === 'namespaces' && q.operation === 'update'
        );
        expect(nsUpdates).toHaveLength(0);
      });

      it('createItem: estende trial para 30 dias ao cadastrar o 5º item se a loja já compartilhou a vitrine', async () => {
        const trialStartsAt = '2026-10-01T00:00:00.000Z';
        mockItemsCount = 5; // Com o novo item inserido, totaliza 5
        mockNamespaceState.first_shared_at = '2026-10-02T10:00:00.000Z';
        mockNamespaceState.trial_starts_at = trialStartsAt;
        mockNamespaceState.trial_extended = false;
        mockNamespaceState.activation_completed = false;

        const formData = createItemFormData({
          title: 'Quinto Produto',
          price: '49.90',
        });

        const res = await createItem('loja-carol', formData);

        expect(res.success).toBe(true);
        expect(res.message).toBe('Item criado!');

        // Verifica que o trial foi estendido no banco
        expect(mockNamespaceState.trial_extended).toBe(true);
        expect(mockNamespaceState.activation_completed).toBe(true);

        const expectedExpiresAt = new Date(
          new Date(trialStartsAt).getTime() + 30 * 24 * 60 * 60 * 1000
        ).toISOString();
        expect(mockNamespaceState.trial_expires_at).toBe(expectedExpiresAt);
      });

      it('createItem: não estende trial ao cadastrar o 5º item se a loja ainda não compartilhou a vitrine', async () => {
        mockItemsCount = 5;
        mockNamespaceState.first_shared_at = null; // Não compartilhou
        mockNamespaceState.trial_extended = false;
        mockNamespaceState.activation_completed = false;

        const formData = createItemFormData({
          title: 'Quinto Produto',
          price: '49.90',
        });

        const res = await createItem('loja-carol', formData);

        expect(res.success).toBe(true);
        expect(mockNamespaceState.trial_extended).toBe(false);
        expect(mockNamespaceState.activation_completed).toBe(false);
      });
    });
  });

  describe('T22 — Bloqueio de Edição em Carência (grace), Vitrine Pausada e Bloqueada (RF15 / D4)', () => {
    beforeEach(() => {
      setAuthenticatedSessionCookie('loja-carol');
      recordedQueries = [];
    });

    const expectedBlockedMessage =
      'A edição está bloqueada porque o período da sua loja encerrou. Renove sua assinatura para continuar editando.';

    describe('Período de Tolerância / Carência de 7 dias (state = grace)', () => {
      beforeEach(() => {
        // Expirou há 2 dias -> dentro da janela de 7 dias de tolerância (grace)
        mockNamespaceState.trial_expires_at = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
        mockNamespaceState.status = 'active';
      });

      it('rejeita createItem com mensagem explicativa e não insere item', async () => {
        const formData = createItemFormData({ title: 'Vestido Grace', price: '99.00' });
        const res = await createItem('loja-carol', formData);

        expect(res.success).toBe(false);
        expect(res.message).toBe(expectedBlockedMessage);

        const itemInserts = recordedQueries.filter(
          (q) => q.table === 'items' && q.operation === 'insert'
        );
        expect(itemInserts).toHaveLength(0);
      });

      it('rejeita updateItem com mensagem explicativa e não atualiza item', async () => {
        const formData = createItemFormData({ title: 'Vestido Atualizado', price: '120.00' });
        const res = await updateItem('loja-carol', 'item-abc', formData);

        expect(res.success).toBe(false);
        expect(res.message).toBe(expectedBlockedMessage);

        const itemUpdates = recordedQueries.filter(
          (q) => q.table === 'items' && q.operation === 'update'
        );
        expect(itemUpdates).toHaveLength(0);
      });

      it('rejeita deleteItem com mensagem explicativa e não exclui item', async () => {
        const res = await deleteItem('loja-carol', 'item-abc');

        expect(res.success).toBe(false);
        expect(res.message).toBe(expectedBlockedMessage);

        const itemDeletes = recordedQueries.filter(
          (q) => q.table === 'items' && q.operation === 'delete'
        );
        expect(itemDeletes).toHaveLength(0);
      });

      it('rejeita toggleItemSold com mensagem explicativa e não altera status', async () => {
        const res = await toggleItemSold('loja-carol', 'item-abc', false);

        expect(res.success).toBe(false);
        expect(res.message).toBe(expectedBlockedMessage);

        const itemUpdates = recordedQueries.filter(
          (q) => q.table === 'items' && q.operation === 'update'
        );
        expect(itemUpdates).toHaveLength(0);
      });

      it('rejeita updateNamespace com mensagem explicativa e não atualiza a loja', async () => {
        const fd = new FormData();
        fd.append('name', 'Carol Modas Grace');
        const res = await updateNamespace('loja-carol', fd);

        expect(res.success).toBe(false);
        expect(res.message).toBe(expectedBlockedMessage);

        const nsUpdates = recordedQueries.filter(
          (q) => q.table === 'namespaces' && q.operation === 'update'
        );
        expect(nsUpdates).toHaveLength(0);
      });
    });

    describe('Vitrine Pausada pós-carência (state = paused)', () => {
      beforeEach(() => {
        // Expirou há 15 dias -> além da carência de 7 dias
        mockNamespaceState.trial_expires_at = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
        mockNamespaceState.status = 'active';
      });

      it('rejeita criação e modificações de itens quando a loja está pausada', async () => {
        const formData = createItemFormData({ title: 'Item Pausado', price: '50.00' });
        const res = await createItem('loja-carol', formData);

        expect(res.success).toBe(false);
        expect(res.message).toBe(expectedBlockedMessage);
      });
    });

    describe('Loja Bloqueada pelo Operador (state = blocked)', () => {
      beforeEach(() => {
        mockNamespaceState.status = 'blocked';
      });

      it('rejeita criação e modificações de itens quando a loja está bloqueada', async () => {
        const formData = createItemFormData({ title: 'Item Bloqueado', price: '50.00' });
        const res = await createItem('loja-carol', formData);

        expect(res.success).toBe(false);
        expect(res.message).toBe(expectedBlockedMessage);
      });
    });
  });
});
