import { describe, it, expect } from 'vitest';
import { parseImages, formatPrice, formatItemDetails } from '../format';

describe('format.ts — Utilitários puros de formatação', () => {
  describe('parseImages', () => {
    it('retorna array vazio para entradas nulas, indefinidas ou vazias', () => {
      expect(parseImages(null)).toEqual([]);
      expect(parseImages(undefined)).toEqual([]);
      expect(parseImages('')).toEqual([]);
    });

    it('faz parse de JSON array de strings', () => {
      const input = JSON.stringify(['https://exemplo.com/1.jpg', 'https://exemplo.com/2.jpg']);
      expect(parseImages(input)).toEqual([
        'https://exemplo.com/1.jpg',
        'https://exemplo.com/2.jpg',
      ]);
    });

    it('faz split por vírgula para strings delimitadas por vírgula', () => {
      const input = 'https://exemplo.com/1.jpg,https://exemplo.com/2.jpg';
      expect(parseImages(input)).toEqual([
        'https://exemplo.com/1.jpg',
        'https://exemplo.com/2.jpg',
      ]);
    });

    it('retorna item único quando URL não possui vírgulas e não é JSON', () => {
      const input = 'https://exemplo.com/foto.png';
      expect(parseImages(input)).toEqual(['https://exemplo.com/foto.png']);
    });

    it('remove itens vazios gerados por vírgulas consecutivas ou nas extremidades', () => {
      const input = ',https://exemplo.com/1.jpg,,https://exemplo.com/2.jpg,';
      expect(parseImages(input)).toEqual([
        'https://exemplo.com/1.jpg',
        'https://exemplo.com/2.jpg',
      ]);
    });

    it('faz fallback para split quando JSON é objeto e não array', () => {
      const input = '{"url":"https://exemplo.com/1.jpg"}';
      expect(parseImages(input)).toEqual(['{"url":"https://exemplo.com/1.jpg"}']);
    });
  });

  describe('formatPrice', () => {
    it('formata valor zero para moeda brasileira', () => {
      const formatted = formatPrice(0);
      // Remove espaços não-quebráveis (U+00A0 ou U+202F) para assert robusto
      const normalized = formatted.replace(/\s+/g, ' ');
      expect(normalized).toBe('R$ 0,00');
    });

    it('formata centavos e decimais', () => {
      const formatted = formatPrice(89.9);
      const normalized = formatted.replace(/\s+/g, ' ');
      expect(normalized).toBe('R$ 89,90');
    });

    it('formata milhares com separador de milhar', () => {
      const formatted = formatPrice(3499.5);
      const normalized = formatted.replace(/\s+/g, ' ');
      expect(normalized).toBe('R$ 3.499,50');
    });
  });

  describe('formatItemDetails', () => {
    it('formata texto completo com descrição e status Disponível', () => {
      const text = formatItemDetails({
        title: 'Camiseta Básica',
        price: 49.9,
        description: '100% Algodão',
        is_sold: false,
      });

      expect(text).toContain('Produto: Camiseta Básica');
      expect(text).toContain('Descrição: 100% Algodão');
      expect(text).toContain('Status: Disponível');
      expect(text.replace(/\s+/g, ' ')).toContain('Preço: R$ 49,90');
    });

    it('formata texto com "Sem descrição" quando descrição é nula ou vazia e status Vendido', () => {
      const text = formatItemDetails({
        title: 'Tênis Esportivo',
        price: 299,
        description: null,
        is_sold: true,
      });

      expect(text).toContain('Produto: Tênis Esportivo');
      expect(text).toContain('Descrição: Sem descrição');
      expect(text).toContain('Status: Vendido');
      expect(text.replace(/\s+/g, ' ')).toContain('Preço: R$ 299,00');
    });
  });
});
