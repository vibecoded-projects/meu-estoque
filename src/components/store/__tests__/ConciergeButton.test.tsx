import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ConciergeButton,
  buildConciergeMessage,
  resolveAdminPhone,
  buildConciergeWhatsAppUrl,
} from '../ConciergeButton';

describe('ConciergeButton — Suporte de Cadastro Concierge (RF08 / T19)', () => {
  const originalEnv = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ADMIN_WHATSAPP;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_ADMIN_WHATSAPP = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_ADMIN_WHATSAPP;
    }
  });

  describe('buildConciergeMessage', () => {
    it('formata a mensagem com o nome da loja e slug', () => {
      const msg = buildConciergeMessage('Loja da Carol', 'loja-carol');
      expect(msg).toBe(
        'Olá! Preciso de ajuda do Concierge StokFácil para cadastrar produtos na minha loja Loja da Carol (slug: loja-carol).'
      );
    });

    it('faz fallback para o slug quando storeName for vazio, nulo ou indefinido', () => {
      expect(buildConciergeMessage(null, 'loja-teste')).toBe(
        'Olá! Preciso de ajuda do Concierge StokFácil para cadastrar produtos na minha loja loja-teste (slug: loja-teste).'
      );
      expect(buildConciergeMessage(undefined, 'loja-teste')).toBe(
        'Olá! Preciso de ajuda do Concierge StokFácil para cadastrar produtos na minha loja loja-teste (slug: loja-teste).'
      );
      expect(buildConciergeMessage('', 'loja-teste')).toBe(
        'Olá! Preciso de ajuda do Concierge StokFácil para cadastrar produtos na minha loja loja-teste (slug: loja-teste).'
      );
      expect(buildConciergeMessage('   ', 'loja-teste')).toBe(
        'Olá! Preciso de ajuda do Concierge StokFácil para cadastrar produtos na minha loja loja-teste (slug: loja-teste).'
      );
    });

    it('remove espaços sobressalentes nas pontas do slug e nome', () => {
      const msg = buildConciergeMessage('  Boutique Vintage  ', '  boutique-vintage  ');
      expect(msg).toBe(
        'Olá! Preciso de ajuda do Concierge StokFácil para cadastrar produtos na minha loja Boutique Vintage (slug: boutique-vintage).'
      );
    });
  });

  describe('resolveAdminPhone', () => {
    it('prioriza telefone explícito fornecido', () => {
      process.env.NEXT_PUBLIC_ADMIN_WHATSAPP = '5511999999999';
      const phone = resolveAdminPhone('5521988887777');
      expect(phone).toBe('5521988887777');
    });

    it('normaliza telefone com formatação brasileira', () => {
      const phone = resolveAdminPhone('(11) 98765-4321');
      expect(phone).toBe('5511987654321');
    });

    it('usa a variável de ambiente NEXT_PUBLIC_ADMIN_WHATSAPP', () => {
      process.env.NEXT_PUBLIC_ADMIN_WHATSAPP = '5511912345678';
      expect(resolveAdminPhone()).toBe('5511912345678');
    });

    it('normaliza a variável de ambiente se tiver formatação', () => {
      process.env.NEXT_PUBLIC_ADMIN_WHATSAPP = '+55 (11) 91234-5678';
      expect(resolveAdminPhone()).toBe('5511912345678');
    });

    it('usa fallback 5511999999999 quando não configurado', () => {
      delete process.env.NEXT_PUBLIC_ADMIN_WHATSAPP;
      expect(resolveAdminPhone()).toBe('5511999999999');
      expect(resolveAdminPhone('')).toBe('5511999999999');
    });
  });

  describe('buildConciergeWhatsAppUrl', () => {
    it('monta o link wa.me com telefone e mensagem codificada', () => {
      const url = buildConciergeWhatsAppUrl({
        slug: 'loja-carol',
        storeName: 'Loja Carol',
        adminPhone: '5511999999999',
      });

      expect(url).toBe(
        'https://wa.me/5511999999999?text=' +
          encodeURIComponent(
            'Olá! Preciso de ajuda do Concierge StokFácil para cadastrar produtos na minha loja Loja Carol (slug: loja-carol).'
          )
      );
    });
  });

  describe('Componente ConciergeButton', () => {
    it('retorna null (não renderiza nada) quando isAuthenticated = false', () => {
      const htmlUnauth0 = renderToStaticMarkup(
        <ConciergeButton
          isAuthenticated={false}
          itemsCount={0}
          slug="loja-carol"
          storeName="Loja Carol"
        />
      );
      expect(htmlUnauth0).toBe('');

      const htmlUnauth10 = renderToStaticMarkup(
        <ConciergeButton
          isAuthenticated={false}
          itemsCount={10}
          slug="loja-carol"
          storeName="Loja Carol"
        />
      );
      expect(htmlUnauth10).toBe('');
    });

    it('quando itemsCount < 5: exibe card de assistência amigável em destaque com botão verde', () => {
      const html = renderToStaticMarkup(
        <ConciergeButton
          isAuthenticated={true}
          itemsCount={2}
          slug="loja-carol"
          storeName="Loja Carol"
          adminPhone="5511999999999"
        />
      );

      // Card de destaque presente
      expect(html).toContain('data-testid="concierge-highlight-card"');
      // Texto exato do requisito
      expect(html).toContain(
        'Precisa de ajuda para cadastrar seu estoque? Chame no WhatsApp e subimos até 15 peças para você sem custo!'
      );
      // Botão verde de ação
      expect(html).toContain('Chamar no WhatsApp');
      expect(html).toContain('bg-emerald-600');
      // Link apontando para WhatsApp do operador
      expect(html).toContain('https://wa.me/5511999999999?text=');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      // Não exibe o botão compacto
      expect(html).not.toContain('data-testid="concierge-compact-container"');
    });

    it('comporta-se como card de assistência na fronteira itemsCount = 0 e itemsCount = 4', () => {
      const html0 = renderToStaticMarkup(
        <ConciergeButton
          isAuthenticated={true}
          itemsCount={0}
          slug="loja-carol"
        />
      );
      expect(html0).toContain('data-testid="concierge-highlight-card"');
      expect(html0).toContain('subimos até 15 peças para você sem custo!');

      const html4 = renderToStaticMarkup(
        <ConciergeButton
          isAuthenticated={true}
          itemsCount={4}
          slug="loja-carol"
        />
      );
      expect(html4).toContain('data-testid="concierge-highlight-card"');
      expect(html4).toContain('subimos até 15 peças para você sem custo!');
    });

    it('quando itemsCount >= 5: exibe botão sutil e compacto ("Precisa de ajuda com o estoque? Chame o suporte")', () => {
      const html5 = renderToStaticMarkup(
        <ConciergeButton
          isAuthenticated={true}
          itemsCount={5}
          slug="loja-carol"
          storeName="Loja Carol"
          adminPhone="5511999999999"
        />
      );

      // Container compacto presente
      expect(html5).toContain('data-testid="concierge-compact-container"');
      // Texto exato do requisito compacto
      expect(html5).toContain('Precisa de ajuda com o estoque? Chame o suporte');
      // Link para o WhatsApp
      expect(html5).toContain('https://wa.me/5511999999999?text=');
      expect(html5).toContain('target="_blank"');
      // Não exibe o card de assistência com 15 peças
      expect(html5).not.toContain('data-testid="concierge-highlight-card"');
      expect(html5).not.toContain('subimos até 15 peças para você sem custo!');
    });

    it('comporta-se como botão compacto para contagens altas (ex: 25 produtos)', () => {
      const html25 = renderToStaticMarkup(
        <ConciergeButton
          isAuthenticated={true}
          itemsCount={25}
          slug="loja-carol"
        />
      );
      expect(html25).toContain('data-testid="concierge-compact-container"');
      expect(html25).toContain('Precisa de ajuda com o estoque? Chame o suporte');
      expect(html25).not.toContain('data-testid="concierge-highlight-card"');
    });
  });
});
