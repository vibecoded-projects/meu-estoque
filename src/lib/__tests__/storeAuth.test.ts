import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requireStore } from '../storeAuth';
import { signToken } from '../session';

const cookiesMap = new Map<string, string>();

let mockNamespace = {
  id: 'store-uuid-12345',
  slug: 'loja-carol',
};

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((column: string, value: unknown) => ({
        single: vi.fn(async () => {
          if (table === 'namespaces' && column === 'slug' && value === mockNamespace.slug) {
            return { data: { id: mockNamespace.id, slug: mockNamespace.slug }, error: null };
          }
          return { data: null, error: { message: 'Loja não encontrada' } };
        }),
      })),
    })),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => {
      const val = cookiesMap.get(name);
      return val !== undefined ? { value: val } : undefined;
    }),
  })),
}));

describe('storeAuth — requireStore helper modular', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesMap.clear();
    mockNamespace = {
      id: 'store-uuid-12345',
      slug: 'loja-carol',
    };
  });

  it('rejeita slug vazio ou inválido', async () => {
    // @ts-expect-error teste de input inválido
    const res1 = await requireStore(null);
    expect(res1.success).toBe(false);
    if (!res1.success) {
      expect(res1.error).toBe('Loja não encontrada.');
    }

    const res2 = await requireStore('');
    expect(res2.success).toBe(false);
    if (!res2.success) {
      expect(res2.error).toBe('Loja não encontrada.');
    }
  });

  it('rejeita quando o cookie de autenticação não existe', async () => {
    const res = await requireStore('loja-carol');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('Não autorizado.');
    }
  });

  it('rejeita quando o token está adulterado', async () => {
    cookiesMap.set('auth_loja-carol', 'token-falso');
    const res = await requireStore('loja-carol');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('Não autorizado.');
    }
  });

  it('rejeita quando a loja não existe no banco', async () => {
    const token = signToken({
      slug: 'loja-fantasma',
      purpose: 'session',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    cookiesMap.set('auth_loja-fantasma', token);

    const res = await requireStore('loja-fantasma');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('Loja não encontrada.');
    }
  });

  it('retorna os dados da loja quando autenticado com sucesso', async () => {
    const token = signToken({
      slug: 'loja-carol',
      purpose: 'session',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    cookiesMap.set('auth_loja-carol', token);

    const res = await requireStore('loja-carol');
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.store.id).toBe('store-uuid-12345');
      expect(res.store.slug).toBe('loja-carol');
    }
  });
});
