import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StoreFooter } from '../StoreFooter';
import type { Plan } from '@/lib/types';

describe('StoreFooter — Rodapé da Vitrine e White-Label (T23 / RF02 / RF05)', () => {
  describe('Renderização do branding StokFácil nos planos não-anuais', () => {
    const nonAnnualPlans: Plan[] = ['trial', 'monthly', 'quarterly', 'semiannual'];

    nonAnnualPlans.forEach((plan) => {
      it(`renderiza o branding StokFácil e o link para a Home no plano "${plan}"`, () => {
        const html = renderToStaticMarkup(<StoreFooter plan={plan} />);

        // Branding StokFácil deve estar visível
        expect(html).toContain('StokFácil');
        expect(html).toContain('Criado com');
        expect(html).toContain('— Crie sua vitrine grátis');

        // Link padrão aponta para a Home ("/")
        expect(html).toContain('href="/"');
      });
    });

    it('renderiza o branding StokFácil quando plan for indefinido (padrão)', () => {
      const html = renderToStaticMarkup(<StoreFooter />);

      expect(html).toContain('StokFácil');
      expect(html).toContain('Criado com');
      expect(html).toContain('href="/"');
    });

    it('renderiza o branding StokFácil quando fornecido storeName mas o plano não for anual', () => {
      const html = renderToStaticMarkup(
        <StoreFooter plan="monthly" storeName="Modas da Maria" />
      );

      expect(html).toContain('StokFácil');
      expect(html).toContain('Criado com');
      expect(html).toContain('href="/"');
    });
  });

  describe('Ocultação do branding StokFácil no plano Annual (White-Label)', () => {
    it('oculta totalmente a menção a StokFácil no plano "annual"', () => {
      const html = renderToStaticMarkup(<StoreFooter plan="annual" />);

      expect(html).not.toContain('StokFácil');
      expect(html).not.toContain('Criado com');
      expect(html).not.toContain('— Crie sua vitrine grátis');
      expect(html).not.toContain('href="/"');
    });

    it('renderiza rodapé discreto com nome da loja quando fornecido no plano "annual"', () => {
      const html = renderToStaticMarkup(
        <StoreFooter plan="annual" storeName="Ateliê das Flores" />
      );

      expect(html).toContain('Ateliê das Flores — Todos os direitos reservados');
      expect(html).not.toContain('StokFácil');
      expect(html).toContain('<footer');
    });

    it('faz trim no nome da loja e exibe rodapé discreto no plano "annual"', () => {
      const html = renderToStaticMarkup(
        <StoreFooter plan="annual" storeName="   Boutique Chic   " />
      );

      expect(html).toContain('Boutique Chic — Todos os direitos reservados');
      expect(html).not.toContain('StokFácil');
    });

    it('retorna null (omite o rodapé) se storeName for nulo ou vazio no plano "annual"', () => {
      const footerNull = StoreFooter({ plan: 'annual', storeName: null });
      expect(footerNull).toBeNull();
      expect(renderToStaticMarkup(<StoreFooter plan="annual" storeName={null} />)).toBe('');

      const footerEmpty = StoreFooter({ plan: 'annual', storeName: '' });
      expect(footerEmpty).toBeNull();
      expect(renderToStaticMarkup(<StoreFooter plan="annual" storeName="" />)).toBe('');

      const footerSpaces = StoreFooter({ plan: 'annual', storeName: '   ' });
      expect(footerSpaces).toBeNull();
      expect(renderToStaticMarkup(<StoreFooter plan="annual" storeName="   " />)).toBe('');
    });

    it('oculta branding StokFácil se isWhiteLabel for true, independentemente do plano', () => {
      const html = renderToStaticMarkup(
        <StoreFooter isWhiteLabel={true} plan="trial" storeName="Loja VIP" />
      );

      expect(html).not.toContain('StokFácil');
      expect(html).toContain('Loja VIP — Todos os direitos reservados');
    });

    it('mantém ocultação mesmo se isWhiteLabel for explicitamente false no plano "annual"', () => {
      const html = renderToStaticMarkup(
        <StoreFooter isWhiteLabel={false} plan="annual" storeName="Empório Real" />
      );

      expect(html).not.toContain('StokFácil');
      expect(html).toContain('Empório Real — Todos os direitos reservados');
    });
  });

  describe('Acessibilidade e links externos seguros', () => {
    it('possui tag semântica <footer> com classes de espaçamento e borda', () => {
      const html = renderToStaticMarkup(<StoreFooter plan="trial" />);

      expect(html).toContain('<footer');
      expect(html).toContain('class="mt-12 py-8 text-center border-t border-slate-200"');
    });

    it('aplica classes de contraste WCAG AA e foco acessível no link padrão', () => {
      const html = renderToStaticMarkup(<StoreFooter plan="quarterly" />);

      // Contraste text-slate-600 / text-slate-800
      expect(html).toContain('text-slate-600');
      expect(html).toContain('text-slate-800');
      // Foco acessível
      expect(html).toContain('focus:outline-none focus:ring-2 focus:ring-indigo-500');
      // Texto acessível completo preservado
      expect(html).toContain('Criado com');
      expect(html).toContain('StokFácil');
      expect(html).toContain('— Crie sua vitrine grátis');
    });

    it('utiliza Link interno para rota local sem target="_blank"', () => {
      const html = renderToStaticMarkup(<StoreFooter plan="trial" homeUrl="/" />);

      expect(html).toContain('href="/"');
      expect(html).not.toContain('target="_blank"');
      expect(html).not.toContain('rel="noopener noreferrer"');
    });

    it('configura target="_blank" e rel="noopener noreferrer" quando fornecido link externo', () => {
      const htmlHttps = renderToStaticMarkup(
        <StoreFooter plan="trial" homeUrl="https://stokfacil.com" />
      );

      expect(htmlHttps).toContain('href="https://stokfacil.com"');
      expect(htmlHttps).toContain('target="_blank"');
      expect(htmlHttps).toContain('rel="noopener noreferrer"');

      const htmlHttp = renderToStaticMarkup(
        <StoreFooter plan="trial" homeUrl="http://stokfacil.com" />
      );

      expect(htmlHttp).toContain('href="http://stokfacil.com"');
      expect(htmlHttp).toContain('target="_blank"');
      expect(htmlHttp).toContain('rel="noopener noreferrer"');
    });

    it('mantém tag semântica <footer> no modo white-label quando storeName é fornecido', () => {
      const html = renderToStaticMarkup(<StoreFooter plan="annual" storeName="Minha Loja" />);

      expect(html).toContain('<footer');
      expect(html).toContain('class="mt-12 py-8 text-center border-t border-slate-200"');
      expect(html).toContain('text-slate-600');
    });
  });
});
