import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createUploadUrl } from '../upload';
import { signToken } from '@/lib/session';

// Estado simulado de cookies e banco
const cookiesMap = new Map<string, string>();

let mockNamespace = {
  id: 'store-uuid-12345',
  slug: 'loja-carol',
};

const createSignedUploadUrlMock = vi.fn();
const getPublicUrlMock = vi.fn();

// Mock do supabaseAdmin e supabase
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
    storage: {
      from: vi.fn((bucket: string) => {
        if (bucket === 'product-images') {
          return {
            createSignedUploadUrl: createSignedUploadUrlMock,
            getPublicUrl: getPublicUrlMock,
          };
        }
        return {};
      }),
    },
  },
  supabase: {
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

function setAuthenticatedCookie(slug = 'loja-carol') {
  const token = signToken({
    slug,
    purpose: 'session',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  cookiesMap.set(`auth_${slug}`, token);
  return token;
}

describe('Server Action createUploadUrl — Upload assinado pelo servidor (T21 / RNF06 / D7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesMap.clear();

    mockNamespace = {
      id: 'store-uuid-12345',
      slug: 'loja-carol',
    };

    createSignedUploadUrlMock.mockImplementation(async (path: string) => ({
      data: {
        signedUrl: `https://storage.supabase.co/upload/sign/product-images/${path}?token=signed-token-xyz`,
        token: 'signed-token-xyz',
        path,
      },
      error: null,
    }));

    getPublicUrlMock.mockImplementation((path: string) => ({
      data: {
        publicUrl: `https://storage.supabase.co/public/product-images/${path}`,
      },
    }));
  });

  describe('1. Autenticação obrigatória (requireStore)', () => {
    it('rejeita requisição quando não há cookie de autenticação', async () => {
      const result = await createUploadUrl('loja-carol', 'webp');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Não autorizado.');
      expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
    });

    it('rejeita requisição com token de autenticação forjado ou inválido', async () => {
      cookiesMap.set('auth_loja-carol', 'token-invalido-adulterado');

      const result = await createUploadUrl('loja-carol', 'webp');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Não autorizado.');
      expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
    });

    it('rejeita requisição quando o cookie pertence a outro slug', async () => {
      setAuthenticatedCookie('outra-loja');

      const result = await createUploadUrl('loja-carol', 'webp');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Não autorizado.');
      expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
    });

    it('rejeita quando a loja não existe no banco de dados', async () => {
      setAuthenticatedCookie('loja-inexistente');

      const result = await createUploadUrl('loja-inexistente', 'webp');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Loja não encontrada.');
      expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
    });
  });

  describe('2. Validação de extensões permitidas', () => {
    beforeEach(() => {
      setAuthenticatedCookie('loja-carol');
    });

    it.each(['jpg', 'jpeg', 'png', 'webp'])('aceita a extensão permitida "%s"', async (ext) => {
      const result = await createUploadUrl('loja-carol', ext);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.path).toMatch(new RegExp(`^store-uuid-12345/[0-9a-f-]+\\.${ext}$`));
    });

    it('aceita extensão com ponto inicial (ex: ".png")', async () => {
      const result = await createUploadUrl('loja-carol', '.png');

      expect(result.success).toBe(true);
      expect(result.data?.path.endsWith('.png')).toBe(true);
    });

    it('aceita extensão com letras maiúsculas e espaços (ex: " WEBP ")', async () => {
      const result = await createUploadUrl('loja-carol', ' WEBP ');

      expect(result.success).toBe(true);
      expect(result.data?.path.endsWith('.webp')).toBe(true);
    });

    it.each(['exe', 'gif', 'pdf', 'svg', 'sh', 'html', ''])('rejeita extensão inválida/não autorizada "%s"', async (invalidExt) => {
      const result = await createUploadUrl('loja-carol', invalidExt);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Extensão de imagem inválida');
      expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
    });
  });

  describe('3. Prefixo obrigatório com store.id no caminho do arquivo', () => {
    beforeEach(() => {
      setAuthenticatedCookie('loja-carol');
    });

    it('sempre prefixa o caminho com store.id (${store.id}/${uuid}.${extension})', async () => {
      const result = await createUploadUrl('loja-carol', 'jpg');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const { path, signedUrl, token, publicUrl } = result.data!;

      // Prefixo obrigatório
      expect(path.startsWith('store-uuid-12345/')).toBe(true);

      // Formato: store.id/UUID.ext
      const parts = path.split('/');
      expect(parts).toHaveLength(2);
      expect(parts[0]).toBe('store-uuid-12345');

      const fileName = parts[1];
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/i;
      expect(fileName).toMatch(uuidRegex);

      // Confirma que chamou createSignedUploadUrl com o path prefixado
      expect(createSignedUploadUrlMock).toHaveBeenCalledTimes(1);
      expect(createSignedUploadUrlMock).toHaveBeenCalledWith(path);

      // Confirma que chamou getPublicUrl com o path prefixado
      expect(getPublicUrlMock).toHaveBeenCalledTimes(1);
      expect(getPublicUrlMock).toHaveBeenCalledWith(path);

      // Retornos completos
      expect(signedUrl).toBe(`https://storage.supabase.co/upload/sign/product-images/${path}?token=signed-token-xyz`);
      expect(token).toBe('signed-token-xyz');
      expect(publicUrl).toBe(`https://storage.supabase.co/public/product-images/${path}`);
    });

    it('gera UUIDs únicos para requisições subsequentes', async () => {
      const res1 = await createUploadUrl('loja-carol', 'webp');
      const res2 = await createUploadUrl('loja-carol', 'webp');

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(res1.data?.path).not.toBe(res2.data?.path);
    });
  });

  describe('4. Tratamento de erros do Supabase', () => {
    beforeEach(() => {
      setAuthenticatedCookie('loja-carol');
    });

    it('retorna mensagem de erro amigável quando createSignedUploadUrl falha no Supabase', async () => {
      createSignedUploadUrlMock.mockResolvedValueOnce({
        data: null,
        error: { message: 'Supabase Storage: Bucket not found or permission denied' },
      });

      const result = await createUploadUrl('loja-carol', 'webp');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Supabase Storage: Bucket not found or permission denied');
    });

    it('retorna erro genérico quando o Supabase devolve dados nulos sem erro explícito', async () => {
      createSignedUploadUrlMock.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await createUploadUrl('loja-carol', 'webp');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Erro ao gerar URL de upload assinado');
    });
  });
});
