import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StoreHeader } from '../StoreHeader';
import { ProductModal } from '../ProductModal';
import { ItemCard } from '../ItemCard';
import { ItemRow } from '../ItemRow';
import type { Namespace, Item } from '@/lib/types';

describe('ITEM-5 — Super-compartilhamento de Loja e Itens na UI', () => {
  const mockNamespace: Namespace = {
    id: 'ns-1',
    slug: 'loja-carol',
    name: 'Loja da Carol',
    subtitle: 'Roupas e Acessórios Femininos',
    whatsapp: '5511999998888',
    instagram_handle: 'lojadacarol',
    plan: 'trial',
    status: 'active',
    trial_starts_at: '2026-10-01T00:00:00Z',
    trial_expires_at: '2026-10-15T00:00:00Z',
    trial_extended: false,
    activation_completed: false,
    first_shared_at: null,
    created_at: '2026-10-01T00:00:00Z',
  };

  const mockItem: Item = {
    id: 'item-1',
    namespace_id: 'ns-1',
    title: 'Vestido Midi Floral',
    price: 129.9,
    description: 'Vestido elegante e confortável em viscose.',
    image_url: 'https://exemplo.com/foto1.jpg',
    is_sold: false,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  };

  describe('StoreHeader — Compartilhamento da Vitrine', () => {
    it('renderiza opções de compartilhamento para visitantes (Enviar no WhatsApp e Compartilhar)', () => {
      const html = renderToStaticMarkup(
        <StoreHeader
          slug="loja-carol"
          namespace={mockNamespace}
          isAuthenticated={false}
        />
      );

      // Deve ter botão de envio no WhatsApp para visitantes
      expect(html).toContain('api.whatsapp.com/send?text=');
      expect(html).toContain('Enviar no WhatsApp');
      // Deve ter botão de compartilhamento nativo para visitantes
      expect(html).toContain('Compartilhar');
      // Não deve ter botões administrativos
      expect(html).not.toContain('Copiar link da Bio');
      expect(html).not.toContain('Importar em lote');
    });

    it('renderiza barra de divulgação com WhatsApp, Compartilhar e Link da Bio para o lojista autenticado', () => {
      const html = renderToStaticMarkup(
        <StoreHeader
          slug="loja-carol"
          namespace={mockNamespace}
          isAuthenticated={true}
        />
      );

      // Barra de divulgação presente
      expect(html).toContain('Divulgação da Vitrine');
      expect(html).toContain('Enviar no WhatsApp');
      expect(html).toContain('Compartilhar');
      expect(html).toContain('Copiar link da Bio');
      expect(html).toContain('api.whatsapp.com/send?text=');
    });
  });

  describe('ProductModal — Super-compartilhamento de Produto', () => {
    it('renderiza botão Compartilhar no WhatsApp com texto formatado do produto', () => {
      const html = renderToStaticMarkup(
        <ProductModal
          item={mockItem}
          slug="loja-carol"
          isAuthenticated={false}
          onClose={vi.fn()}
        />
      );

      expect(html).toContain('Compartilhar no WhatsApp');
      expect(html).toContain('api.whatsapp.com/send?text=');
      // Valida que o link codificado contém novidade e título
      expect(html).toContain('Olha%20essa%20novidade');
      expect(html).toContain('Vestido%20Midi%20Floral');
      // Mantém os botões complementares
      expect(html).toContain('Copiar legenda');
      expect(html).toContain('Copiar Infos');
    });

    it('renderiza botão de pedidos e compartilhamento simultaneamente quando a loja possui WhatsApp', () => {
      const html = renderToStaticMarkup(
        <ProductModal
          item={mockItem}
          slug="loja-carol"
          whatsapp="5511999998888"
          isAuthenticated={false}
          onClose={vi.fn()}
        />
      );

      // Botão de compra direta da loja
      expect(html).toContain('Pedir no WhatsApp');
      // Botão de compartilhamento do item para contatos/grupos
      expect(html).toContain('Compartilhar no WhatsApp');
    });
  });

  describe('ItemCard — Compartilhamento rápido em 1 clique', () => {
    it('renderiza botão de WhatsApp e botão de Legenda lado a lado', () => {
      const html = renderToStaticMarkup(
        <ItemCard
          item={mockItem}
          slug="loja-carol"
          isAuthenticated={false}
          onClick={vi.fn()}
          onCopyTitle={vi.fn()}
          isCopiedTitle={false}
        />
      );

      expect(html).toContain('WhatsApp');
      expect(html).toContain('Legenda');
      expect(html).toContain('title="Enviar novidade no WhatsApp para contatos ou grupos"');
      expect(html).toContain('title="Copiar legenda com emojis e link para colar no Instagram"');
    });
  });

  describe('ItemRow — Compartilhamento na visão de lista', () => {
    it('renderiza botão de Enviar no WhatsApp e Copiar legenda', () => {
      const html = renderToStaticMarkup(
        <ItemRow
          item={mockItem}
          slug="loja-carol"
          isAuthenticated={false}
          onClick={vi.fn()}
          onCopyTitle={vi.fn()}
          isCopiedTitle={false}
        />
      );

      expect(html).toContain('Enviar no WhatsApp');
      expect(html).toContain('Copiar legenda');
      expect(html).toContain('title="Enviar novidade no WhatsApp para contatos ou grupos"');
    });
  });
});
