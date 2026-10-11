import { describe, expect, it } from 'vitest';
import { parseBatch, parsePrice } from '@/lib/batchParser';

describe('batchParser', () => {
  describe('parsePrice', () => {
    it('aceita formatos monetários padrão brasileiros e universais', () => {
      expect(parsePrice('R$ 89,90')).toBe(89.9);
      expect(parsePrice('R$89,90')).toBe(89.9);
      expect(parsePrice('89,90')).toBe(89.9);
      expect(parsePrice('120.00')).toBe(120);
      expect(parsePrice('45 reais')).toBe(45);
      expect(parsePrice('R$50')).toBe(50);
      expect(parsePrice('1.299,90')).toBe(1299.9);
      expect(parsePrice('1299,90')).toBe(1299.9);
      expect(parsePrice('R$ 1.299')).toBe(1299);
      expect(parsePrice('1.299')).toBe(1299);
      expect(parsePrice('R$ 0,99')).toBe(0.99);
      expect(parsePrice('0,99')).toBe(0.99);
      expect(parsePrice('0.99')).toBe(0.99);
      expect(parsePrice('120')).toBe(120);
      expect(parsePrice('45')).toBe(45);
      expect(parsePrice('1 real')).toBe(1);
    });

    it('retorna null para entradas inválidas ou vazias', () => {
      expect(parsePrice('')).toBeNull();
      expect(parsePrice('   ')).toBeNull();
      expect(parsePrice('abc')).toBeNull();
      expect(parsePrice('R$ abc')).toBeNull();
      expect(parsePrice('-50')).toBeNull();
      expect(parsePrice('1.2345')).toBeNull();
      expect(parsePrice('12,345')).toBeNull();
    });
  });

  describe('parseBatch', () => {
    it('1. aceita preço explícito com R$ e espaço', () => {
      const result = parseBatch('Vestido floral R$ 89,90');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Vestido floral',
        price: 89.9,
        description: null,
      });
    });

    it('2. aceita preço explícito com R$ sem espaço', () => {
      const result = parseBatch('Vestido floral R$89,90');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Vestido floral',
        price: 89.9,
        description: null,
      });
    });

    it('3. aceita preço decimal BR sem marcador', () => {
      const result = parseBatch('Vestido floral 89,90');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Vestido floral',
        price: 89.9,
        description: null,
      });
    });

    it('4. aceita preço com decimal ponto (120.00)', () => {
      const result = parseBatch('Vestido floral 120.00');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Vestido floral',
        price: 120,
        description: null,
      });
    });

    it('5. aceita preço com palavra "reais"', () => {
      const result = parseBatch('Camiseta básica 45 reais');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Camiseta básica',
        price: 45,
        description: null,
      });
    });

    it('6. aceita preço inteiro com R$ (R$50)', () => {
      const result = parseBatch('Shorts praia R$50');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Shorts praia',
        price: 50,
        description: null,
      });
    });

    it('7. aceita preço com milhar e decimal BR (1.299,90)', () => {
      const result = parseBatch('Casaco couro 1.299,90');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Casaco couro',
        price: 1299.9,
        description: null,
      });
    });

    it('8. aceita preço com quatro dígitos e decimal BR (1299,90)', () => {
      const result = parseBatch('Casaco couro 1299,90');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Casaco couro',
        price: 1299.9,
        description: null,
      });
    });

    it('9. aceita preço com milhar sem decimais (R$ 1.299)', () => {
      const result = parseBatch('Bolsa luxo R$ 1.299');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Bolsa luxo',
        price: 1299,
        description: null,
      });
    });

    it('10. rejeita tamanho/medida quando há preço explícito (Calça jeans 38 R$ 59,90)', () => {
      const result = parseBatch('Calça jeans 38 R$ 59,90');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Calça jeans 38',
        price: 59.9,
        description: null,
      });
    });

    it('11. aceita número isolado no fim da linha como preço quando sem decimais (Bolsa couro 120)', () => {
      const result = parseBatch('Bolsa couro 120');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Bolsa couro',
        price: 120,
        description: null,
      });
    });

    it('12. extrai descrição após preço separado por vírgula', () => {
      const result = parseBatch('Vestido floral, R$ 89,90, tamanho M');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Vestido floral',
        price: 89.9,
        description: 'tamanho M',
      });
    });

    it('13. extrai descrição com separador hífen (" - ")', () => {
      const result = parseBatch('Blusa seda - R$ 120.00 - Nova com etiqueta');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Blusa seda',
        price: 120,
        description: 'Nova com etiqueta',
      });
    });

    it('14. extrai descrição com separador pipe (" | ")', () => {
      const result = parseBatch('Saia jeans | 45 reais | seminova');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Saia jeans',
        price: 45,
        description: 'seminova',
      });
    });

    it('15. extrai descrição com separador ponto e vírgula (" ; ")', () => {
      const result = parseBatch('Calça alfaiataria ; R$ 150 ; tamanho 42');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Calça alfaiataria',
        price: 150,
        description: 'tamanho 42',
      });
    });

    it('16. remove numerações iniciais (1., 1), 1 -, -, •, *)', () => {
      const text = [
        '1. Item um R$ 10',
        '2) Item dois R$ 20',
        '3 - Item três R$ 30',
        '- Item quatro R$ 40',
        '• Item cinco R$ 50',
        '* Item seis R$ 60',
      ].join('\n');

      const result = parseBatch(text);
      expect(result).toHaveLength(6);
      expect(result.map((r) => r.title)).toEqual([
        'Item um',
        'Item dois',
        'Item três',
        'Item quatro',
        'Item cinco',
        'Item seis',
      ]);
    });

    it('17. colapsa espaços duplicados e remove pontuação solta nas pontas', () => {
      const result = parseBatch('; -  Vestido   floral   longo  , -  R$ 89,90');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Vestido floral longo',
        price: 89.9,
        description: null,
      });
    });

    it('18. marca warning quando preço não for encontrado', () => {
      const result = parseBatch('Camiseta básica');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Camiseta básica',
        price: null,
        description: null,
        warning: 'Preço não encontrado',
      });
    });

    it('19. não confunde medida no meio da linha com preço se não estiver no fim nem tiver decimais', () => {
      const result = parseBatch('Calça jeans 38 azul');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Calça jeans 38 azul',
        price: null,
        description: null,
        warning: 'Preço não encontrado',
      });
    });

    it('20. lida com texto vazio ou só espaços', () => {
      expect(parseBatch('')).toEqual([]);
      expect(parseBatch('   \n  \n\t  ')).toEqual([]);
    });

    it('21. preserva emojis no título', () => {
      const result = parseBatch('🌸 Vestido midi floral 🌸 R$ 89,90');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: '🌸 Vestido midi floral 🌸',
        price: 89.9,
        description: null,
      });
    });

    it('22. aceita centavos R$ 0,99', () => {
      const result = parseBatch('Chaveiro acrílico R$ 0,99');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Chaveiro acrílico',
        price: 0.99,
        description: null,
      });
    });

    it('23. linha só com preço gera warning de Título vazio', () => {
      const result = parseBatch('R$ 59,90');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: '',
        price: 59.9,
        description: null,
        warning: 'Título vazio',
      });
    });

    it('24. linha só com número inteiro gera warning de Título vazio', () => {
      const result = parseBatch('120');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: '',
        price: 120,
        description: null,
        warning: 'Título vazio',
      });
    });

    it('25. ignora linhas vazias e preserva a numeração original 1-based (com \\r\\n)', () => {
      const text = 'Item 1 R$ 10\r\n\r\nItem 3 R$ 30\r\n   \r\nItem 5 R$ 50';
      const result = parseBatch(text);
      expect(result).toHaveLength(3);
      expect(result[0].line).toBe(1);
      expect(result[0].title).toBe('Item 1');
      expect(result[1].line).toBe(3);
      expect(result[1].title).toBe('Item 3');
      expect(result[2].line).toBe(5);
      expect(result[2].title).toBe('Item 5');
    });

    it('26. seleciona o último número decimal quando há múltiplos', () => {
      const result = parseBatch('Vestido tam 36,5 cm 89,90');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        line: 1,
        title: 'Vestido tam 36,5 cm',
        price: 89.9,
        description: null,
      });
    });
  });
});
