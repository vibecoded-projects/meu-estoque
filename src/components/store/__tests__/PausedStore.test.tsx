import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PausedStore,
  buildStoreWhatsAppLink,
  type PausedStoreProps,
} from '../PausedStore';
import type { StoreLifecycle } from '@/lib/lifecycle';

describe('PausedStore — Vitrine Pausada e Bloqueada (T22 / RF15)', () => {
  const originalAdminEnv = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP = '5511999998888';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP = originalAdminEnv;
  });

  describe('buildStoreWhatsAppLink', () => {
    it('retorna null se o telefone da loja for nulo, indefinido ou vazio', () => {
      expect(buildStoreWhatsAppLink(null, 'Loja Carol')).toBeNull();
      expect(buildStoreWhatsAppLink(undefined, 'Loja Carol')).toBeNull();
      expect(buildStoreWhatsAppLink('', 'Loja Carol')).toBeNull();
      expect(buildStoreWhatsAppLink('   ', 'Loja Carol')).toBeNull();
    });

    it('retorna null se o número for inválido', () => {
      expect(buildStoreWhatsAppLink('12345', 'Loja Carol')).toBeNull();
      expect(buildStoreWhatsAppLink('letras-aqui', 'Loja Carol')).toBeNull();
    });

    it('normaliza o número brasileiro e inclui nome da loja na mensagem amigável', () => {
      const link = buildStoreWhatsAppLink('(11) 98765-4321', 'Carol Modas');
      expect(link).not.toBeNull();
      expect(link).toContain('https://wa.me/5511987654321?text=');

      const textParam = decodeURIComponent(link!.split('?text=')[1]);
      expect(textParam).toContain('Carol Modas');
      expect(textParam).toContain('temporariamente pausada');
    });

    it('gera mensagem genérica amigável se a loja não tiver nome', () => {
      const link = buildStoreWhatsAppLink('11987654321', null);
      expect(link).not.toBeNull();
      const textParam = decodeURIComponent(link!.split('?text=')[1]);
      expect(textParam).toContain('sua vitrine está temporariamente pausada');
    });
  });

  describe('Renderização do Componente PausedStore', () => {
    const pausedLifecycle: StoreLifecycle = {
      state: 'paused',
      expiresAt: new Date('2026-10-01T00:00:00.000Z'),
      daysLeft: 0,
      canEdit: false,
      isPublic: false,
      showRenewalBanner: true,
    };

    const blockedLifecycle: StoreLifecycle = {
      state: 'blocked',
      expiresAt: null,
      daysLeft: null,
      canEdit: false,
      isPublic: false,
      showRenewalBanner: false,
    };

    const mockNamespace: PausedStoreProps['namespace'] = {
      slug: 'loja-carol',
      name: 'Loja da Carol',
      whatsapp: '(11) 98765-4321',
      logo_url: null,
      instagram_handle: 'lojadacarol',
    };

    it('renderiza layout amigável e acolhedor para visitantes (não autenticado)', () => {
      const html = renderToStaticMarkup(
        <PausedStore
          namespace={mockNamespace}
          lifecycle={pausedLifecycle}
          isAuthenticated={false}
        />
      );

      // Mensagem cordial sem alarmismo
      expect(html).toContain('Esta vitrine está pausada no momento. Entre em contato diretamente com a loja no WhatsApp.');
      expect(html).toContain('Loja da Carol está em manutenção');
      expect(html).toContain('Vitrine Temporariamente Indisponível');

      // Botão de WhatsApp direto com a loja
      expect(html).toContain('Falar com a loja no WhatsApp');
      expect(html).toContain('https://wa.me/5511987654321');

      // Link do Instagram presente
      expect(html).toContain('@lojadacarol');
      expect(html).toContain('https://instagram.com/lojadacarol');

      // NÃO exibe aviso administrativo nem botão Pix do admin
      expect(html).not.toContain('Painel do Lojista');
      expect(html).not.toContain('Renovar no WhatsApp (via Pix)');
    });

    it('renderiza título padrão quando namespace não tem nome cadastrado', () => {
      const html = renderToStaticMarkup(
        <PausedStore
          namespace={{ ...mockNamespace, name: null }}
          lifecycle={pausedLifecycle}
          isAuthenticated={false}
        />
      );

      expect(html).toContain('Vitrine Temporariamente Indisponível');
    });

    it('não renderiza o botão de WhatsApp da loja se namespace.whatsapp for nulo', () => {
      const html = renderToStaticMarkup(
        <PausedStore
          namespace={{ ...mockNamespace, whatsapp: null }}
          lifecycle={pausedLifecycle}
          isAuthenticated={false}
        />
      );

      expect(html).not.toContain('Falar com a loja no WhatsApp');
      expect(html).toContain('Esta vitrine está pausada no momento.');
    });

    it('renderiza aviso administrativo e botão Pix do admin no modo autenticado (isAuthenticated = true)', () => {
      const html = renderToStaticMarkup(
        <PausedStore
          namespace={mockNamespace}
          lifecycle={pausedLifecycle}
          isAuthenticated={true}
        />
      );

      // Aviso do lojista no topo
      expect(html).toContain('Painel do Lojista');
      expect(html).toContain('Sua assinatura venceu e sua vitrine está pausada para os clientes.');

      // Botão de renovação Pix com o admin
      expect(html).toContain('Renovar no WhatsApp (via Pix)');
      expect(html).toContain('https://wa.me/5511999998888');

      // Conteúdo codificado do link de renovação admin
      expect(html).toContain(encodeURIComponent('loja-carol'));
      expect(html).toContain(encodeURIComponent('Pix'));

      // Ainda mantém o card acolhedor da loja
      expect(html).toContain('Loja da Carol está em manutenção');
      expect(html).toContain('Falar com a loja no WhatsApp');
    });

    it('permite sobrescrever o WhatsApp do admin via prop adminWhatsApp', () => {
      const html = renderToStaticMarkup(
        <PausedStore
          namespace={mockNamespace}
          lifecycle={pausedLifecycle}
          isAuthenticated={true}
          adminWhatsApp="5521977776666"
        />
      );

      expect(html).toContain('https://wa.me/5521977776666');
    });

    it('renderiza corretamente quando a loja está bloqueada (state = blocked)', () => {
      const html = renderToStaticMarkup(
        <PausedStore
          namespace={mockNamespace}
          lifecycle={blockedLifecycle}
          isAuthenticated={true}
        />
      );

      // Não quebra e renderiza os mesmos avisos acolhedores
      expect(html).toContain('Vitrine Temporariamente Indisponível');
      expect(html).toContain('Loja da Carol está em manutenção');
      expect(html).toContain('Painel do Lojista');
      expect(html).toContain('Renovar no WhatsApp (via Pix)');
    });
  });
});
