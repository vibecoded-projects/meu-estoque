import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ItemFormModal } from '../ItemFormModal';
import type { Item } from '@/lib/types';

// Mock do supabase e das actions
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn(),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.test/img.webp' } }),
      }),
    },
  },
}));

vi.mock('@/app/actions', () => ({
  createItem: vi.fn(),
  updateItem: vi.fn(),
}));

describe('ItemFormModal — Modal de Produto e Upload com Compressão (T20)', () => {
  it('não renderiza nada quando isOpen é false', () => {
    const html = renderToStaticMarkup(
      <ItemFormModal
        isOpen={false}
        slug="loja-carol"
        editingItem={null}
        onClose={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renderiza o formulário de novo produto com input aceitando HEIC e HEIF', () => {
    const html = renderToStaticMarkup(
      <ItemFormModal
        isOpen={true}
        slug="loja-carol"
        editingItem={null}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('Novo Produto');
    expect(html).toContain('Fotos do Produto');
    // Deve incluir suporte explícito a HEIC e HEIF no seletor mobile
    expect(html).toContain('accept="image/*,.heic,.heif,image/heic,image/heif"');
    expect(html).toContain('Salvar Produto');
    expect(html).toContain('Cancelar');
  });

  it('renderiza formulário com dados pré-preenchidos em modo de edição', () => {
    const mockItem: Item = {
      id: 'item-123',
      namespace_id: 'loja-carol-id',
      title: 'Vestido Linho Floral',
      description: 'Peça vintage única',
      price: 149.9,
      is_sold: false,
      image_url: 'https://cdn.test/vestido.jpg',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const html = renderToStaticMarkup(
      <ItemFormModal
        isOpen={true}
        slug="loja-carol"
        editingItem={mockItem}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('Editar Produto');
    expect(html).toContain('Vestido Linho Floral');
    expect(html).toContain('149.9');
    expect(html).toContain('Peça vintage única');
    expect(html).toContain('https://cdn.test/vestido.jpg');
  });
});
