import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requireStore } from '../storeAuth';
import { signToken } from '../session';

const cookiesMap = new Map<string, string>();

let mockNamespace: Record<string, unknown> = {
  id: 'store-uuid-12345',
  slug: 'loja-carol',
  status: 'active',
  plan: 'trial',
  trial_expires_at: '2026-10-25T00:00:00.000Z',
  plan_expires_at: null,
};

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((column: string, value: unknown) => ({
        single: vi.fn(async () => {
          if (table === 'namespaces' && column === 'slug' && value === mockNamespace.slug) {
            return { data: { ...mockNamespace }, error: null };
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
      status: 'active',
      plan: 'trial',
      trial_expires_at: '2026-10-25T00:00:00.000Z',
      plan_expires_at: null,
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

  describe('validação de permissão de escrita (requireEditPermission - T22 / RF15)', () => {
    const setValidSession = () => {
      const token = signToken({
        slug: 'loja-carol',
        purpose: 'session',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      cookiesMap.set('auth_loja-carol', token);
    };

    it('permite escrita quando a loja está ativa (state = active)', async () => {
      setValidSession();
      mockNamespace.trial_expires_at = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

      const res = await requireStore('loja-carol', { requireEditPermission: true });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.canEdit).toBe(true);
        expect(res.lifecycle?.state).toBe('active');
        expect(res.store.id).toBe('store-uuid-12345');
      }
    });

    it('rejeita escrita quando a loja está no período de carência (state = grace)', async () => {
      setValidSession();
      // Expirou há 2 dias -> dentro da carência de 7 dias
      mockNamespace.trial_expires_at = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

      const res = await requireStore('loja-carol', { requireEditPermission: true });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.canEdit).toBe(false);
        expect(res.lifecycle?.state).toBe('grace');
        expect(res.error).toBe(
          'A edição está bloqueada porque o período da sua loja encerrou. Renove sua assinatura para continuar editando.'
        );
      }

      // Sem requireEditPermission, a autenticação básica ainda tem sucesso (permite ver a loja logado)
      const readRes = await requireStore('loja-carol');
      expect(readRes.success).toBe(true);
    });

    it('rejeita escrita quando a loja está pausada por expiração pós-carência (state = paused)', async () => {
      setValidSession();
      // Expirou há 15 dias -> além dos 7 dias de carência
      mockNamespace.trial_expires_at = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

      const res = await requireStore('loja-carol', { requireEditPermission: true });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.canEdit).toBe(false);
        expect(res.lifecycle?.state).toBe('paused');
        expect(res.error).toBe(
          'A edição está bloqueada porque o período da sua loja encerrou. Renove sua assinatura para continuar editando.'
        );
      }
    });

    it('rejeita escrita quando a loja está pausada manualmente (status = paused)', async () => {
      setValidSession();
      mockNamespace.status = 'paused';

      const res = await requireStore('loja-carol', { requireEditPermission: true });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.canEdit).toBe(false);
        expect(res.lifecycle?.state).toBe('paused');
        expect(res.error).toBe(
          'A edição está bloqueada porque o período da sua loja encerrou. Renove sua assinatura para continuar editando.'
        );
      }
    });

    it('rejeita escrita quando a loja está bloqueada administrativamente (status = blocked)', async () => {
      setValidSession();
      mockNamespace.status = 'blocked';

      const res = await requireStore('loja-carol', { requireEditPermission: true });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.canEdit).toBe(false);
        expect(res.lifecycle?.state).toBe('blocked');
        expect(res.error).toBe(
          'A edição está bloqueada porque o período da sua loja encerrou. Renove sua assinatura para continuar editando.'
        );
      }
    });
  });
});
