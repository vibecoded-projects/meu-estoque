import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
}));

import { metadata as layoutMetadata } from '@/app/layout';

// Mock do supabaseAdmin com vi.hoisted para compatibilidade de hoisting do Vitest
const { mockSingle, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  return { mockSingle, mockFrom };
});

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/app/actions', () => ({
  checkAuth: vi.fn().mockResolvedValue(false),
}));

// Importa generateMetadata dinâmico da página [slug]
import { generateMetadata } from '@/app/[slug]/page';
import { StoreFooter } from '@/components/store/StoreFooter';

describe('Metadados da Aplicação (T06 — Rebranding StokFácil)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Root Layout Metadata (src/app/layout.tsx)', () => {
    it('deve conter o título padrão e o template da marca StokFácil', () => {
      expect(layoutMetadata.title).toEqual({
        default: 'StokFácil — Catálogo digital e vendas no WhatsApp',
        template: '%s | StokFácil',
      });
    });

    it('deve conter a descrição oficial com o slogan da marca', () => {
      expect(layoutMetadata.description).toBe(
        'Seu estoque no bolso, suas vendas no WhatsApp'
      );
    });

    it('deve configurar metadataBase com URL válida do site', () => {
      expect(layoutMetadata.metadataBase).toBeInstanceOf(URL);
      expect(layoutMetadata.metadataBase?.toString()).toMatch(/stokfacil\.com/);
    });

    it('deve configurar as tags OpenGraph padrão do StokFácil', () => {
      expect(layoutMetadata.openGraph).toMatchObject({
        type: 'website',
        locale: 'pt_BR',
        siteName: 'StokFácil',
        title: 'StokFácil — Catálogo digital e vendas no WhatsApp',
        description: 'Seu estoque no bolso, suas vendas no WhatsApp',
      });
    });

    it('deve configurar o Twitter Card com imagem grande', () => {
      expect(layoutMetadata.twitter).toMatchObject({
        card: 'summary_large_image',
        title: 'StokFácil — Catálogo digital e vendas no WhatsApp',
        description: 'Seu estoque no bolso, suas vendas no WhatsApp',
      });
    });
  });

  describe('Storefront generateMetadata (src/app/[slug]/page.tsx)', () => {
    it('deve gerar metadados com nome, descrição e OpenGraph da loja existente', async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'ns-1',
          slug: 'loja-carol',
          name: 'Loja da Carol',
          subtitle: 'Roupas femininas e acessórios exclusivos',
          logo_url: 'https://exemplo.com/logo.jpg',
        },
        error: null,
      });

      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'loja-carol' }),
      });

      expect(meta.title).toBe('Loja da Carol | StokFácil');
      expect(meta.description).toBe('Roupas femininas e acessórios exclusivos');
      expect(meta.openGraph?.title).toBe('Loja da Carol | StokFácil');
      expect(meta.openGraph?.description).toBe('Roupas femininas e acessórios exclusivos');
      expect(meta.openGraph?.images).toEqual([{ url: 'https://exemplo.com/logo.jpg' }]);
      expect(meta.twitter?.title).toBe('Loja da Carol | StokFácil');
    });

    it('deve usar o slug como fallback quando a loja não tem nome customizado', async () => {
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'ns-2',
          slug: 'brecho-vintage',
          name: null,
          subtitle: null,
          logo_url: null,
        },
        error: null,
      });

      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'brecho-vintage' }),
      });

      expect(meta.title).toBe('brecho-vintage | StokFácil');
      expect(meta.description).toContain('brecho-vintage');
      expect(meta.openGraph?.title).toBe('brecho-vintage | StokFácil');
      expect(meta.openGraph?.images).toBeUndefined();
    });

    it('deve retornar título amigável quando a loja não é encontrada', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const meta = await generateMetadata({
        params: Promise.resolve({ slug: 'loja-fantasma' }),
      });

      expect(meta.title).toBe('Loja não encontrada | StokFácil');
      expect(meta.description).toContain('não foi encontrada');
    });
  });

  describe('StoreFooter (src/components/store/StoreFooter.tsx)', () => {
    it('deve renderizar o rodapé padrão quando white-label não estiver ativado', () => {
      const footer = StoreFooter({ isWhiteLabel: false });
      expect(footer).not.toBeNull();
    });

    it('deve omitir o rodapé quando white-label estiver ativo', () => {
      const footer = StoreFooter({ isWhiteLabel: true });
      expect(footer).toBeNull();
    });
  });
});
