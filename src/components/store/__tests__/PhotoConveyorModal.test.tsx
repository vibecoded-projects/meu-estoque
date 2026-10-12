import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PhotoConveyorModal,
  autoAssignFilesToItems,
  calculateUploadProgress,
  processConveyorSlotUpload,
  type ConveyorSlot,
} from '../PhotoConveyorModal';
import { StoreHeader } from '../StoreHeader';
import { BatchImportModal } from '../BatchImportModal';
import { supabase } from '@/lib/supabase';
import type { Item, Namespace } from '@/lib/types';

// Mock do supabase e das actions
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn(),
        uploadToSignedUrl: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.test/mock.webp' } }),
      }),
    },
  },
}));

vi.mock('@/app/actions', () => ({
  updateItem: vi.fn().mockResolvedValue({ success: true, message: 'Item atualizado!' }),
  updateNamespace: vi.fn().mockResolvedValue({ success: true, message: 'Loja atualizada!' }),
  markShared: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/app/actions/upload', () => ({
  createUploadUrl: vi.fn().mockResolvedValue({
    success: true,
    data: {
      signedUrl: 'https://storage.supabase.co/upload/sign/mock',
      token: 'mock-token',
      path: 'store-123/mock.webp',
      publicUrl: 'https://cdn.test/mock.webp',
    },
  }),
}));

vi.mock('@/lib/imageCompression', () => ({
  compressImage: vi.fn().mockImplementation(async (file: File) => {
    return new File([file], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
  }),
}));

const mockNamespace: Namespace = {
  id: 'ns-carol-123',
  slug: 'loja-carol',
  name: 'Loja da Carol',
  subtitle: 'Moda e Acessórios',
  status: 'active',
};

const mockItemsWithoutPhotos: Item[] = [
  {
    id: 'item-1',
    namespace_id: 'ns-carol-123',
    title: 'Vestido Floral Midi',
    price: 89.9,
    description: 'Vestido 100% algodão',
    image_url: null,
    is_sold: false,
  },
  {
    id: 'item-2',
    namespace_id: 'ns-carol-123',
    title: 'Calça Jeans Mom',
    price: 120.0,
    description: null,
    image_url: '',
    is_sold: false,
  },
  {
    id: 'item-3',
    namespace_id: 'ns-carol-123',
    title: 'Blusa Linho Cru',
    price: 45.0,
    description: 'Tamanho M',
    image_url: null,
    is_sold: false,
  },
];

describe('PhotoConveyorModal — Esteira de Fotos em Lote (T24 / RF07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Auto-associação sequencial 1 para 1 (autoAssignFilesToItems)', () => {
    it('associa arquivos 1 para 1 na ordem sequencial dos itens sem foto', () => {
      const files = [
        new File(['f1'], 'foto1.jpg', { type: 'image/jpeg' }),
        new File(['f2'], 'foto2.jpg', { type: 'image/jpeg' }),
      ];

      const result = autoAssignFilesToItems(files, mockItemsWithoutPhotos);

      expect(result).toHaveLength(2);
      expect(result[0].file.name).toBe('foto1.jpg');
      expect(result[0].assignedItemId).toBe('item-1');
      expect(result[1].file.name).toBe('foto2.jpg');
      expect(result[1].assignedItemId).toBe('item-2');
    });

    it('define assignedItemId como null quando há mais fotos do que itens sem foto', () => {
      const files = [
        new File(['f1'], 'foto1.jpg', { type: 'image/jpeg' }),
        new File(['f2'], 'foto2.jpg', { type: 'image/jpeg' }),
        new File(['f3'], 'foto3.jpg', { type: 'image/jpeg' }),
        new File(['f4'], 'foto4.jpg', { type: 'image/jpeg' }),
      ];

      const result = autoAssignFilesToItems(files, mockItemsWithoutPhotos);

      expect(result).toHaveLength(4);
      expect(result[0].assignedItemId).toBe('item-1');
      expect(result[1].assignedItemId).toBe('item-2');
      expect(result[2].assignedItemId).toBe('item-3');
      expect(result[3].assignedItemId).toBeNull();
    });

    it('respeita itens que já estão em uso na esteira para evitar duplicidade', () => {
      const usedIds = new Set(['item-1']);
      const files = [new File(['f2'], 'foto2.jpg', { type: 'image/jpeg' })];

      const result = autoAssignFilesToItems(files, mockItemsWithoutPhotos, usedIds);

      expect(result).toHaveLength(1);
      // Pula item-1 e associa ao próximo disponível (item-2)
      expect(result[0].assignedItemId).toBe('item-2');
    });

    it('retorna array vazio quando nenhum arquivo é selecionado', () => {
      const result = autoAssignFilesToItems([], mockItemsWithoutPhotos);
      expect(result).toEqual([]);
    });
  });

  describe('2. Cálculo de Progresso de Upload (calculateUploadProgress)', () => {
    it('retorna 0 quando total é zero ou completed é zero', () => {
      expect(calculateUploadProgress(0, 0)).toBe(0);
      expect(calculateUploadProgress(0, 5)).toBe(0);
      expect(calculateUploadProgress(-1, 5)).toBe(0);
    });

    it('calcula porcentagens intermediárias arredondadas', () => {
      expect(calculateUploadProgress(1, 3)).toBe(33);
      expect(calculateUploadProgress(2, 3)).toBe(67);
      expect(calculateUploadProgress(2, 4)).toBe(50);
      expect(calculateUploadProgress(4, 5)).toBe(80);
    });

    it('retorna 100 quando completed é igual ou maior que o total', () => {
      expect(calculateUploadProgress(5, 5)).toBe(100);
      expect(calculateUploadProgress(6, 5)).toBe(100);
    });
  });

  describe('3. Pipeline de Upload Individual e Resiliência (processConveyorSlotUpload)', () => {
    const sampleSlot: ConveyorSlot = {
      id: 'slot-1',
      file: new File(['img-content'], 'peca.jpg', { type: 'image/jpeg' }),
      previewUrl: 'blob:http://localhost/preview-1',
      assignedItemId: 'item-1',
      status: 'idle',
    };

    it('executa compressão, URL assinada, storage upload e vinculação com updateItem com sucesso', async () => {
      const fakeCompress = vi.fn().mockResolvedValue(new File(['webp-data'], 'peca.webp', { type: 'image/webp' }));
      const fakeCreateUrl = vi.fn().mockResolvedValue({
        success: true,
        data: {
          token: 'signed-token',
          path: 'store/item1.webp',
          publicUrl: 'https://cdn.test/item1.webp',
        },
      });
      const fakeStorageUpload = vi.fn().mockResolvedValue({ error: null });
      const fakeSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({ uploadToSignedUrl: fakeStorageUpload }),
        },
      } as unknown as typeof supabase;
      const fakeUpdateItem = vi.fn().mockResolvedValue({ success: true, message: 'Item atualizado!' });

      const res = await processConveyorSlotUpload({
        slot: sampleSlot,
        targetItem: mockItemsWithoutPhotos[0],
        slug: 'loja-carol',
        supabaseClient: fakeSupabase,
        compressFn: fakeCompress,
        createUrlFn: fakeCreateUrl,
        updateItemFn: fakeUpdateItem,
      });

      expect(res.success).toBe(true);
      expect(res.publicUrl).toBe('https://cdn.test/item1.webp');
      expect(fakeCompress).toHaveBeenCalledWith(sampleSlot.file);
      expect(fakeCreateUrl).toHaveBeenCalledWith('loja-carol', 'webp');
      expect(fakeStorageUpload).toHaveBeenCalledWith('store/item1.webp', 'signed-token', expect.any(File));
      expect(fakeUpdateItem).toHaveBeenCalledWith(
        'loja-carol',
        'item-1',
        expect.any(FormData)
      );
    });

    it('trata erro quando createUploadUrl falha sem derrubar o restante', async () => {
      const fakeCreateUrl = vi.fn().mockResolvedValue({
        success: false,
        message: 'Falha na autorização do token.',
      });

      const res = await processConveyorSlotUpload({
        slot: sampleSlot,
        targetItem: mockItemsWithoutPhotos[0],
        slug: 'loja-carol',
        createUrlFn: fakeCreateUrl,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Falha na autorização do token.');
    });

    it('trata erro quando o uploadToSignedUrl no Supabase Storage falha', async () => {
      const fakeCreateUrl = vi.fn().mockResolvedValue({
        success: true,
        data: {
          token: 'tok',
          path: 'p',
          publicUrl: 'https://cdn.test/p',
        },
      });
      const fakeStorage = vi.fn().mockResolvedValue({
        error: { message: 'Timeout na rede de storage.' },
      });
      const fakeSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({ uploadToSignedUrl: fakeStorage }),
        },
      } as unknown as typeof supabase;

      const res = await processConveyorSlotUpload({
        slot: sampleSlot,
        targetItem: mockItemsWithoutPhotos[0],
        slug: 'loja-carol',
        supabaseClient: fakeSupabase,
        createUrlFn: fakeCreateUrl,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Timeout na rede de storage.');
    });

    it('trata erro quando a Server Action updateItem falha ao vincular o produto', async () => {
      const fakeCreateUrl = vi.fn().mockResolvedValue({
        success: true,
        data: {
          token: 'tok',
          path: 'p',
          publicUrl: 'https://cdn.test/p',
        },
      });
      const fakeStorage = vi.fn().mockResolvedValue({ error: null });
      const fakeSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({ uploadToSignedUrl: fakeStorage }),
        },
      } as unknown as typeof supabase;
      const fakeUpdateItem = vi.fn().mockResolvedValue({
        success: false,
        message: 'Produto bloqueado para edição.',
      });

      const res = await processConveyorSlotUpload({
        slot: sampleSlot,
        targetItem: mockItemsWithoutPhotos[0],
        slug: 'loja-carol',
        supabaseClient: fakeSupabase,
        createUrlFn: fakeCreateUrl,
        updateItemFn: fakeUpdateItem,
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('Produto bloqueado para edição.');
    });
  });

  describe('4. Renderização do Modal e Acessibilidade WCAG', () => {
    it('não renderiza nada quando isOpen é false', () => {
      const html = renderToStaticMarkup(
        <PhotoConveyorModal
          isOpen={false}
          slug="loja-carol"
          itemsWithoutPhotos={mockItemsWithoutPhotos}
          onClose={vi.fn()}
        />
      );
      expect(html).toBe('');
    });

    it('renderiza estrutura completa da esteira quando isOpen é true', () => {
      const html = renderToStaticMarkup(
        <PhotoConveyorModal
          isOpen={true}
          slug="loja-carol"
          itemsWithoutPhotos={mockItemsWithoutPhotos}
          onClose={vi.fn()}
        />
      );

      // Título e Contador
      expect(html).toContain('Esteira de fotos');
      expect(html).toContain('3 produtos aguardando foto');

      // Botão de upload e input com atributos mobile-first
      expect(html).toContain('accept="image/*"');
      expect(html).toContain('multiple=""');
      expect(html).toContain('Tirar fotos ou selecionar da galeria');

      // Acessibilidade WCAG
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="conveyor-modal-title"');
      expect(html).toContain('aria-label="Fechar esteira"');

      // Botões de ação
      expect(html).toContain('Cancelar');
      expect(html).toContain('Enviar fotos');
    });

    it('exibe estado positivo vazio quando todos os produtos já possuem foto', () => {
      const html = renderToStaticMarkup(
        <PhotoConveyorModal
          isOpen={true}
          slug="loja-carol"
          itemsWithoutPhotos={[]}
          onClose={vi.fn()}
        />
      );

      expect(html).toContain('Todos os produtos já possuem foto!');
      expect(html).toContain('Não há nenhum item sem foto na sua loja no momento.');
      expect(html).toContain('Fechar');
    });
  });

  describe('5. Integração com StoreHeader (Atalho "Subir fotos em lote")', () => {
    it('renderiza o botão "Subir fotos em lote" quando autenticado e existem itens sem foto', () => {
      const html = renderToStaticMarkup(
        <StoreHeader
          slug="loja-carol"
          namespace={mockNamespace}
          isAuthenticated={true}
          itemsWithoutPhotos={mockItemsWithoutPhotos}
        />
      );

      expect(html).toContain('Subir fotos em lote');
      expect(html).toContain('Importar em lote');
    });

    it('não renderiza o botão "Subir fotos em lote" quando todos os itens já têm foto', () => {
      const html = renderToStaticMarkup(
        <StoreHeader
          slug="loja-carol"
          namespace={mockNamespace}
          isAuthenticated={true}
          itemsWithoutPhotos={[]}
        />
      );

      expect(html).not.toContain('Subir fotos em lote');
      expect(html).toContain('Importar em lote');
    });

    it('não renderiza o botão "Subir fotos em lote" para visitantes deslogados', () => {
      const html = renderToStaticMarkup(
        <StoreHeader
          slug="loja-carol"
          namespace={mockNamespace}
          isAuthenticated={false}
          itemsWithoutPhotos={mockItemsWithoutPhotos}
        />
      );

      expect(html).not.toContain('Subir fotos em lote');
      expect(html).not.toContain('Importar em lote');
    });
  });

  describe('6. Integração com BatchImportModal (Convite de Ação após Importação)', () => {
    it('BatchImportModal aceita a prop onOpenPhotoConveyor', () => {
      const onOpen = vi.fn();
      const html = renderToStaticMarkup(
        <BatchImportModal
          isOpen={true}
          slug="loja-carol"
          onClose={vi.fn()}
          onOpenPhotoConveyor={onOpen}
        />
      );

      expect(html).toContain('Importação em lote');
      expect(html).toContain('id="batch-textarea"');
    });
  });
});
