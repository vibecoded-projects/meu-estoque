import { describe, it, expect } from 'vitest';
import { buildOrderLink } from '../whatsapp';

describe('whatsapp.ts — buildOrderLink', () => {
  describe('Validação do telefone e retornos nulos', () => {
    it('retorna null se o telefone for nulo', () => {
      const link = buildOrderLink({
        phone: null,
        title: 'Camiseta Básica',
        price: 49.9,
      });
      expect(link).toBeNull();
    });

    it('retorna null se o telefone for indefinido', () => {
      const link = buildOrderLink({
        phone: undefined,
        title: 'Camiseta Básica',
        price: 49.9,
      });
      expect(link).toBeNull();
    });

    it('retorna null se o telefone for string vazia', () => {
      const link = buildOrderLink({
        phone: '',
        title: 'Camiseta Básica',
        price: 49.9,
      });
      expect(link).toBeNull();
    });

    it('retorna null se o telefone contiver apenas espaços', () => {
      const link = buildOrderLink({
        phone: '   ',
        title: 'Camiseta Básica',
        price: 49.9,
      });
      expect(link).toBeNull();
    });

    it('retorna null se o telefone for inválido (poucos dígitos)', () => {
      const link = buildOrderLink({
        phone: '12345',
        title: 'Camiseta Básica',
        price: 49.9,
      });
      expect(link).toBeNull();
    });

    it('retorna null se o telefone contiver letras ou caracteres inválidos', () => {
      const link = buildOrderLink({
        phone: 'telefone123',
        title: 'Camiseta Básica',
        price: 49.9,
      });
      expect(link).toBeNull();
    });

    it('retorna null se o DDD for inválido no Brasil', () => {
      const link = buildOrderLink({
        phone: '00999999999',
        title: 'Camiseta Básica',
        price: 49.9,
      });
      expect(link).toBeNull();
    });
  });

  describe('Normalização de diferentes formatos de telefone brasileiro', () => {
    it('aceita celular formatado com DDD e máscara: (11) 99999-9999', () => {
      const link = buildOrderLink({
        phone: '(11) 99999-9999',
        title: 'Vestido Midi',
        price: 89.9,
      });
      expect(link).not.toBeNull();
      expect(link?.startsWith('https://wa.me/5511999999999?text=')).toBe(true);
    });

    it('aceita celular com DDI +55 e espaços: +55 11 99999 9999', () => {
      const link = buildOrderLink({
        phone: '+55 11 99999 9999',
        title: 'Vestido Midi',
        price: 89.9,
      });
      expect(link).not.toBeNull();
      expect(link?.startsWith('https://wa.me/5511999999999?text=')).toBe(true);
    });

    it('aceita número de celular em dígitos puros com DDD: 11999999999', () => {
      const link = buildOrderLink({
        phone: '11999999999',
        title: 'Vestido Midi',
        price: 89.9,
      });
      expect(link).not.toBeNull();
      expect(link?.startsWith('https://wa.me/5511999999999?text=')).toBe(true);
    });

    it('aceita número já normalizado com DDI 55: 5511999999999', () => {
      const link = buildOrderLink({
        phone: '5511999999999',
        title: 'Vestido Midi',
        price: 89.9,
      });
      expect(link).not.toBeNull();
      expect(link?.startsWith('https://wa.me/5511999999999?text=')).toBe(true);
    });

    it('aceita telefone fixo com 8 dígitos: (11) 3333-4444', () => {
      const link = buildOrderLink({
        phone: '(11) 3333-4444',
        title: 'Vestido Midi',
        price: 89.9,
      });
      expect(link).not.toBeNull();
      expect(link?.startsWith('https://wa.me/551133334444?text=')).toBe(true);
    });
  });

  describe('Formatação de preço em padrão PT-BR com vírgula', () => {
    it('formata preço com vírgula e duas casas decimais (R$ 89,90)', () => {
      const link = buildOrderLink({
        phone: '11999999999',
        title: 'Vestido Floral',
        price: 89.9,
      });

      expect(link).not.toBeNull();
      const decoded = decodeURIComponent(link!.split('?text=')[1]);
      expect(decoded).toContain('(R$ 89,90)');
    });

    it('formata preço zero como R$ 0,00', () => {
      const link = buildOrderLink({
        phone: '11999999999',
        title: 'Brinde Especial',
        price: 0,
      });

      expect(link).not.toBeNull();
      const decoded = decodeURIComponent(link!.split('?text=')[1]);
      expect(decoded).toContain('(R$ 0,00)');
    });

    it('formata preço inteiro com centavos zerados (R$ 150,00)', () => {
      const link = buildOrderLink({
        phone: '11999999999',
        title: 'Jaqueta Couro',
        price: 150,
      });

      expect(link).not.toBeNull();
      const decoded = decodeURIComponent(link!.split('?text=')[1]);
      expect(decoded).toContain('(R$ 150,00)');
    });

    it('formata valor na casa dos milhares com separador de milhar (R$ 1.250,50)', () => {
      const link = buildOrderLink({
        phone: '11999999999',
        title: 'Bolsa Luxo',
        price: 1250.5,
      });

      expect(link).not.toBeNull();
      const decoded = decodeURIComponent(link!.split('?text=')[1]);
      expect(decoded).toContain('(R$ 1.250,50)');
    });
  });

  describe('Codificação de caracteres acentuados e caracteres especiais', () => {
    it('codifica corretamente acentos, cedilhas e tils sem corromper a mensagem', () => {
      const link = buildOrderLink({
        phone: '11999999999',
        title: 'Camisão de Botão em Algodão & Calça',
        price: 119.9,
      });

      expect(link).not.toBeNull();
      // Garante que a URL não contém caracteres não-codificados problemáticos
      expect(link).not.toContain(' ');
      expect(link).not.toContain('ã');
      expect(link).not.toContain('ç');

      // Ao decodificar, recupera exatamente o texto em português
      const decoded = decodeURIComponent(link!.split('?text=')[1]);
      expect(decoded).toBe(
        'Olá! Vi o produto Camisão de Botão em Algodão & Calça (R$ 119,90) no seu catálogo StokFácil e quero comprar. Como faço para fechar o pedido?'
      );
    });

    it('codifica pontuações especiais como aspas, exclamação e interrogação', () => {
      const link = buildOrderLink({
        phone: '11999999999',
        title: 'Blusa "Vintage" - Edição Limitada',
        price: 75,
      });

      expect(link).not.toBeNull();
      const decoded = decodeURIComponent(link!.split('?text=')[1]);
      expect(decoded).toBe(
        'Olá! Vi o produto Blusa "Vintage" - Edição Limitada (R$ 75,00) no seu catálogo StokFácil e quero comprar. Como faço para fechar o pedido?'
      );
    });
  });

  describe('Codificação de emojis', () => {
    it('codifica emojis de produtos e vestuário sem corromper', () => {
      const link = buildOrderLink({
        phone: '11999999999',
        title: 'Vestido Longo 👗✨',
        price: 199.9,
      });

      expect(link).not.toBeNull();
      // Emojis são codificados em percent-encoding na URL
      expect(link).toContain('%F0%9F%91%97');

      // Decodificação recupera os emojis com fidelidade
      const decoded = decodeURIComponent(link!.split('?text=')[1]);
      expect(decoded).toContain('Vestido Longo 👗✨');
      expect(decoded).toBe(
        'Olá! Vi o produto Vestido Longo 👗✨ (R$ 199,90) no seu catálogo StokFácil e quero comprar. Como faço para fechar o pedido?'
      );
    });

    it('lida com múltiplos emojis e caracteres multilocais', () => {
      const link = buildOrderLink({
        phone: '11999999999',
        title: 'Camiseta Brasil 🇧🇷 ⚽',
        price: 59.9,
      });

      expect(link).not.toBeNull();
      const decoded = decodeURIComponent(link!.split('?text=')[1]);
      expect(decoded).toContain('Camiseta Brasil 🇧🇷 ⚽');
    });
  });

  describe('Parâmetro opcional storeUrl', () => {
    it('inclui o link da loja na mensagem quando fornecido', () => {
      const link = buildOrderLink({
        phone: '11999999999',
        title: 'Saia Jeans',
        price: 89.9,
        storeUrl: 'https://stokfacil.com/loja-carol',
      });

      expect(link).not.toBeNull();
      const decoded = decodeURIComponent(link!.split('?text=')[1]);
      expect(decoded).toBe(
        'Olá! Vi o produto Saia Jeans (R$ 89,90) no seu catálogo StokFácil (https://stokfacil.com/loja-carol) e quero comprar. Como faço para fechar o pedido?'
      );
    });

    it('omite o link da loja quando storeUrl for nulo, indefinido ou apenas espaços', () => {
      const linkNull = buildOrderLink({
        phone: '11999999999',
        title: 'Saia Jeans',
        price: 89.9,
        storeUrl: null,
      });
      const linkUndefined = buildOrderLink({
        phone: '11999999999',
        title: 'Saia Jeans',
        price: 89.9,
        storeUrl: undefined,
      });
      const linkEmpty = buildOrderLink({
        phone: '11999999999',
        title: 'Saia Jeans',
        price: 89.9,
        storeUrl: '   ',
      });

      const expected =
        'Olá! Vi o produto Saia Jeans (R$ 89,90) no seu catálogo StokFácil e quero comprar. Como faço para fechar o pedido?';

      expect(decodeURIComponent(linkNull!.split('?text=')[1])).toBe(expected);
      expect(decodeURIComponent(linkUndefined!.split('?text=')[1])).toBe(expected);
      expect(decodeURIComponent(linkEmpty!.split('?text=')[1])).toBe(expected);
    });
  });

  describe('Intenção direta de compra (ITEM-3 / Pedido direto no WhatsApp)', () => {
    it('monta a mensagem ativa e assertiva de fechamento de pedido', () => {
      const link = buildOrderLink({
        phone: '5511999999999',
        title: 'Colar de Prata',
        price: 120,
      });

      expect(link).toBe(
        'https://wa.me/5511999999999?text=' +
          encodeURIComponent(
            'Olá! Vi o produto Colar de Prata (R$ 120,00) no seu catálogo StokFácil e quero comprar. Como faço para fechar o pedido?'
          )
      );
    });

    it('não utiliza pergunta passiva de disponibilidade ("Ainda está disponível?")', () => {
      const link = buildOrderLink({
        phone: '5511999999999',
        title: 'Vestido Estampado',
        price: 79.9,
        storeUrl: 'https://stokfacil.com/loja-carol',
      });

      expect(link).not.toBeNull();
      const decoded = decodeURIComponent(link!.split('?text=')[1]);
      expect(decoded).not.toContain('Ainda está disponível?');
      expect(decoded).not.toContain('na sua vitrine StokFácil');
      expect(decoded).toContain('no seu catálogo StokFácil');
      expect(decoded).toContain('quero comprar');
      expect(decoded).toContain('Como faço para fechar o pedido?');
    });
  });
});
