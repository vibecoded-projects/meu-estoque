import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TrialBanner, buildRenewalWhatsAppLink } from '../TrialBanner';
import type { StoreLifecycle } from '@/lib/lifecycle';

describe('TrialBanner — Banner de expiração e renovação via Pix (T16 / RF14)', () => {
  const originalEnv = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP = '5511988887777';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP = originalEnv;
  });

  describe('buildRenewalWhatsAppLink', () => {
    it('gera link de renovação contendo nome da loja, slug e menção a Pix', () => {
      const link = buildRenewalWhatsAppLink({
        slug: 'loja-carol',
        storeName: 'Loja da Carol',
        adminWhatsApp: '5511999999999',
        isReactivation: false,
      });

      expect(link).toContain('https://wa.me/5511999999999?text=');
      const textParam = decodeURIComponent(link.split('?text=')[1]);
      expect(textParam).toBe(
        'Olá! Gostaria de renovar o plano da minha loja Loja da Carol (loja-carol) via Pix no StokFácil.'
      );
    });

    it('gera link de reativação para carência / pausa pós-trial', () => {
      const link = buildRenewalWhatsAppLink({
        slug: 'loja-carol',
        storeName: 'Loja da Carol',
        adminWhatsApp: '5511999999999',
        isReactivation: true,
      });

      const textParam = decodeURIComponent(link.split('?text=')[1]);
      expect(textParam).toBe(
        'Olá! Gostaria de reativar o plano da minha loja Loja da Carol (loja-carol) via Pix no StokFácil.'
      );
    });

    it('utiliza apenas o slug quando storeName for nulo ou idêntico ao slug', () => {
      const linkSemNome = buildRenewalWhatsAppLink({
        slug: 'boutique-chic',
        storeName: null,
        adminWhatsApp: '5511999999999',
      });
      const text1 = decodeURIComponent(linkSemNome.split('?text=')[1]);
      expect(text1).toContain('minha loja boutique-chic via Pix');

      const linkNomeIgual = buildRenewalWhatsAppLink({
        slug: 'boutique-chic',
        storeName: 'boutique-chic',
        adminWhatsApp: '5511999999999',
      });
      const text2 = decodeURIComponent(linkNomeIgual.split('?text=')[1]);
      expect(text2).toContain('minha loja boutique-chic via Pix');
    });

    it('limpa pontuações e formatações do telefone do admin', () => {
      const link = buildRenewalWhatsAppLink({
        slug: 'teste',
        adminWhatsApp: '+55 (11) 98888-7777',
      });

      expect(link.startsWith('https://wa.me/5511988887777?text=')).toBe(true);
    });

    it('utiliza process.env.NEXT_PUBLIC_ADMIN_WHATSAPP por padrão', () => {
      process.env.NEXT_PUBLIC_ADMIN_WHATSAPP = '5521999990000';
      const link = buildRenewalWhatsAppLink({
        slug: 'minha-loja',
      });

      expect(link.startsWith('https://wa.me/5521999990000?text=')).toBe(true);
    });

    it('possui fallback seguro quando a variável de ambiente não estiver definida', () => {
      delete process.env.NEXT_PUBLIC_ADMIN_WHATSAPP;
      const link = buildRenewalWhatsAppLink({
        slug: 'minha-loja',
      });

      expect(link.startsWith('https://wa.me/5511999999999?text=')).toBe(true);
    });
  });

  describe('TrialBanner Component — Regras de Exibição e Acessibilidade', () => {
    const baseActiveLifecycle: StoreLifecycle = {
      state: 'active',
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      daysLeft: 3,
      canEdit: true,
      isPublic: true,
      showRenewalBanner: true,
    };

    it('NUNCA renderiza o banner para visitantes (isAuthenticated = false)', () => {
      const html = renderToStaticMarkup(
        <TrialBanner
          lifecycle={baseActiveLifecycle}
          isAuthenticated={false}
          slug="loja-carol"
          storeName="Loja da Carol"
        />
      );

      expect(html).toBe('');
    });

    it('não renderiza quando showRenewalBanner for falso (ex.: faltam mais de 5 dias)', () => {
      const lifecycleSemBanner: StoreLifecycle = {
        ...baseActiveLifecycle,
        daysLeft: 10,
        showRenewalBanner: false,
      };

      const html = renderToStaticMarkup(
        <TrialBanner
          lifecycle={lifecycleSemBanner}
          isAuthenticated={true}
          slug="loja-carol"
          storeName="Loja da Carol"
        />
      );

      expect(html).toBe('');
    });

    it('exibe banner amarelo/âmbar no período ativo com daysLeft <= 5', () => {
      const html = renderToStaticMarkup(
        <TrialBanner
          lifecycle={{
            ...baseActiveLifecycle,
            daysLeft: 5,
          }}
          isAuthenticated={true}
          slug="loja-carol"
          storeName="Loja da Carol"
          adminWhatsApp="5511999999999"
        />
      );

      expect(html).toContain('role="alert"');
      expect(html).toContain('bg-amber-50');
      expect(html).toContain('border-amber-300');
      expect(html).toContain('text-amber-950');
      expect(html).toContain(
        'Seu período de teste vence em 5 dias. Continue vendendo sem interrupções!'
      );
      expect(html).toContain('Renovar no WhatsApp (via Pix)');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain('https://wa.me/5511999999999?text=');
    });

    it('formata o singular "1 dia" corretamente quando daysLeft for 1', () => {
      const html = renderToStaticMarkup(
        <TrialBanner
          lifecycle={{
            ...baseActiveLifecycle,
            daysLeft: 1,
          }}
          isAuthenticated={true}
          slug="loja-carol"
          storeName="Loja da Carol"
        />
      );

      expect(html).toContain(
        'Seu período de teste vence em 1 dia. Continue vendendo sem interrupções!'
      );
    });

    it('exibe banner vermelho/laranja no período de carência (state = grace)', () => {
      const graceLifecycle: StoreLifecycle = {
        state: 'grace',
        expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        daysLeft: 5,
        canEdit: false,
        isPublic: true,
        showRenewalBanner: true,
      };

      const html = renderToStaticMarkup(
        <TrialBanner
          lifecycle={graceLifecycle}
          isAuthenticated={true}
          slug="loja-carol"
          storeName="Loja da Carol"
          adminWhatsApp="5511999999999"
        />
      );

      expect(html).toContain('role="alert"');
      expect(html).toContain('bg-rose-50');
      expect(html).toContain('border-rose-300');
      expect(html).toContain('text-rose-950');
      expect(html).toContain(
        'Período de teste encerrado. Sua vitrine continua online, mas a edição de produtos está bloqueada. Renove via Pix para reativar!'
      );
      expect(html).toContain('Reativar no WhatsApp (via Pix)');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');

      // Verifica link de reativação
      const textParam = decodeURIComponent(html.split('?text=')[1].split('"')[0]);
      expect(textParam).toContain('reativar');
    });

    it('exibe alerta de vitrine pausada quando state = paused e showRenewalBanner = true', () => {
      const pausedLifecycle: StoreLifecycle = {
        state: 'paused',
        expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        daysLeft: 0,
        canEdit: false,
        isPublic: false,
        showRenewalBanner: true,
      };

      const html = renderToStaticMarkup(
        <TrialBanner
          lifecycle={pausedLifecycle}
          isAuthenticated={true}
          slug="loja-carol"
          storeName="Loja da Carol"
        />
      );

      expect(html).toContain('role="alert"');
      expect(html).toContain('bg-rose-50');
      expect(html).toContain(
        'Período de teste encerrado. Sua vitrine está pausada e a edição de produtos está bloqueada. Renove via Pix para reativar!'
      );
      expect(html).toContain('Reativar no WhatsApp (via Pix)');
    });

    it('não renderiza nada se a loja estiver bloqueada administrativamente', () => {
      const blockedLifecycle: StoreLifecycle = {
        state: 'blocked',
        expiresAt: null,
        daysLeft: null,
        canEdit: false,
        isPublic: false,
        showRenewalBanner: false,
      };

      const html = renderToStaticMarkup(
        <TrialBanner
          lifecycle={blockedLifecycle}
          isAuthenticated={true}
          slug="loja-carol"
        />
      );

      expect(html).toBe('');
    });
  });
});
