import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ExplorarPage, { metadata } from "../page";

describe("Página /explorar — Vitrines Modelo por Nicho (ITEM-2)", () => {
  describe("Metadados estáticos (metadata)", () => {
    it("deve definir título e descrição adequados para a página de exploração", () => {
      expect(metadata.title).toBe("Explorar Vitrines Modelo");
      expect(metadata.description).toContain("vitrines digitais");
      expect(metadata.description).toContain("Moda, Cosméticos e Acessórios");
    });

    it("deve conter tags OpenGraph configuradas para compartilhamento social", () => {
      expect(metadata.openGraph).toMatchObject({
        title: "Explorar Vitrines Modelo | StokFácil",
        description: expect.stringContaining("vitrines digitais"),
      });
    });

    it("deve conter configuração para Twitter Card grande", () => {
      expect(metadata.twitter).toMatchObject({
        card: "summary_large_image",
        title: "Explorar Vitrines Modelo | StokFácil",
      });
    });
  });

  describe("Renderização do componente ExplorarPage", () => {
    it("deve renderizar o cabeçalho e título principal da página de exploração", () => {
      const html = renderToStaticMarkup(<ExplorarPage />);

      expect(html).toContain("Vitrines modelo pensadas para o seu segmento");
      expect(html).toContain("Vitrines Modelo &amp; Inspiração");
      expect(html).toContain("Sem taxa por venda");
      expect(html).toContain("Direto no celular");
      expect(html).toContain("14 dias grátis");
    });

    it("deve renderizar os três nichos de vitrine modelo com suas descrições e itens de exemplo", () => {
      const html = renderToStaticMarkup(<ExplorarPage />);

      // 1. Carol Brechó & Desapegos
      expect(html).toContain("Carol Brechó &amp; Desapegos");
      expect(html).toContain("Moda &amp; Brechó Circular");
      expect(html).toContain("Vitrine Interativa ao Vivo");
      expect(html).toContain("Vestido Vintage Floral");
      expect(html).toContain("R$ 89,00");
      expect(html).toContain('href="/loja-carol"');

      // 2. Glow Cosméticos & Make
      expect(html).toContain("Glow Cosméticos &amp; Make");
      expect(html).toContain("Beleza, Perfumaria &amp; Autocuidado");
      expect(html).toContain("Modelo para Consultoras &amp; Revendedoras");
      expect(html).toContain("Batom Matte Hidratante Nude");
      expect(html).toContain("R$ 39,90");
      expect(html).toContain("Criar vitrine de Cosméticos");

      // 3. Aura Acessórios & Joias
      expect(html).toContain("Aura Acessórios &amp; Joias");
      expect(html).toContain("Semijoias, Bijuterias &amp; Artesanato");
      expect(html).toContain("Modelo para Criadores &amp; Joalherias");
      expect(html).toContain("Colar Choker Banhado a Ouro");
      expect(html).toContain("R$ 79,00");
      expect(html).toContain("Criar vitrine de Acessórios");
    });

    it("deve renderizar a seção explicativa de como pequenos lojistas vendem pelo WhatsApp", () => {
      const html = renderToStaticMarkup(<ExplorarPage />);

      expect(html).toContain("Como o StokFácil ajuda você a vender mais pelo WhatsApp");
      expect(html).toContain("Fotografe e cadastre em segundos");
      expect(html).toContain("Compartilhe o link onde seus clientes estão");
      expect(html).toContain("Receba pedidos prontos no WhatsApp");
    });

    it("deve conter CTAs para pedir acesso e testar 14 dias grátis", () => {
      const html = renderToStaticMarkup(<ExplorarPage />);

      expect(html).toContain('href="/#pedir-acesso"');
      expect(html).toContain("Começar 14 dias grátis");
      expect(html).toContain("Pedir acesso grátis");
      expect(html).toContain('href="/"');
      expect(html).toContain("Voltar ao início");
    });

    it("deve conter rodapé com links institucionais e link direto para a loja modelo da Carol", () => {
      const html = renderToStaticMarkup(<ExplorarPage />);

      expect(html).toContain("StokFácil — Vitrines modelo &amp; catálogo digital para WhatsApp");
      expect(html).toContain('href="/loja-carol"');
      expect(html).toContain("Vitrine Carol (/loja-carol)");
    });
  });
});
