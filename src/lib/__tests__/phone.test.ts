import { describe, it, expect } from 'vitest';
import { normalizeBrazilianPhone, formatBrazilianPhone } from '@/lib/phone';

describe('normalizeBrazilianPhone', () => {
  describe('Formatos válidos de celular (9 dígitos no número local)', () => {
    it('normaliza formato com parênteses e hífen: (11) 99999-9999', () => {
      expect(normalizeBrazilianPhone('(11) 99999-9999')).toBe('5511999999999');
    });

    it('normaliza formato internacional com espaços e sem hífen: +55 11 99999 9999', () => {
      expect(normalizeBrazilianPhone('+55 11 99999 9999')).toBe('5511999999999');
    });

    it('normaliza formato internacional com parênteses e hífen: +55 (11) 99999-9999', () => {
      expect(normalizeBrazilianPhone('+55 (11) 99999-9999')).toBe('5511999999999');
    });

    it('normaliza formato numérico puro de 11 dígitos com DDD: 11999999999', () => {
      expect(normalizeBrazilianPhone('11999999999')).toBe('5511999999999');
    });

    it('normaliza formato numérico puro de 13 dígitos com DDI: 5511999999999', () => {
      expect(normalizeBrazilianPhone('5511999999999')).toBe('5511999999999');
    });

    it('normaliza formato com prefixo de discagem 0 (ex.: 011999999999)', () => {
      expect(normalizeBrazilianPhone('011999999999')).toBe('5511999999999');
      expect(normalizeBrazilianPhone('011 98888-7777')).toBe('5511988887777');
    });

    it('aceita celulares válidos de diferentes regiões e DDDs do Brasil', () => {
      expect(normalizeBrazilianPhone('(21) 98765-4321')).toBe('5521987654321'); // RJ
      expect(normalizeBrazilianPhone('(31) 99123-4567')).toBe('5531991234567'); // MG
      expect(normalizeBrazilianPhone('(41) 99876-5432')).toBe('5541998765432'); // PR
      expect(normalizeBrazilianPhone('(51) 98111-2233')).toBe('5551981112233'); // RS
      expect(normalizeBrazilianPhone('(61) 99444-5566')).toBe('5561994445566'); // DF
      expect(normalizeBrazilianPhone('(71) 98555-6677')).toBe('5571985556677'); // BA
      expect(normalizeBrazilianPhone('(85) 99666-7788')).toBe('5585996667788'); // CE
      expect(normalizeBrazilianPhone('(92) 98222-3344')).toBe('5592982223344'); // AM
    });
  });

  describe('Formatos válidos de telefone fixo (8 dígitos no número local)', () => {
    it('normaliza formato fixo com parênteses e hífen: (11) 3333-4444', () => {
      expect(normalizeBrazilianPhone('(11) 3333-4444')).toBe('551133334444');
    });

    it('normaliza formato numérico puro de 10 dígitos: 1133334444', () => {
      expect(normalizeBrazilianPhone('1133334444')).toBe('551133334444');
    });

    it('normaliza formato fixo com DDI e máscara: +55 11 3333-4444', () => {
      expect(normalizeBrazilianPhone('+55 11 3333-4444')).toBe('551133334444');
    });

    it('normaliza formato fixo numérico de 12 dígitos com DDI: 551133334444', () => {
      expect(normalizeBrazilianPhone('551133334444')).toBe('551133334444');
    });

    it('normaliza formato fixo com prefixo de discagem 0 (ex.: 01133334444)', () => {
      expect(normalizeBrazilianPhone('01133334444')).toBe('551133334444');
    });

    it('aceita fixos iniciados em 2, 3, 4 ou 5', () => {
      expect(normalizeBrazilianPhone('(21) 2222-3333')).toBe('552122223333');
      expect(normalizeBrazilianPhone('(31) 4004-1234')).toBe('553140041234');
      expect(normalizeBrazilianPhone('(47) 5123-4567')).toBe('554751234567');
    });
  });

  describe('Entradas inválidas (devem retornar null)', () => {
    it('retorna null para valores vazios ou apenas espaços', () => {
      expect(normalizeBrazilianPhone('')).toBeNull();
      expect(normalizeBrazilianPhone('   ')).toBeNull();
    });

    it('retorna null para tipos inválidos (null, undefined)', () => {
      expect(normalizeBrazilianPhone(null as unknown as string)).toBeNull();
      expect(normalizeBrazilianPhone(undefined as unknown as string)).toBeNull();
    });

    it('retorna null para textos sem dígitos ou letras no número', () => {
      expect(normalizeBrazilianPhone('telefone')).toBeNull();
      expect(normalizeBrazilianPhone('(11) 99999-abcd')).toBeNull();
      expect(normalizeBrazilianPhone('1199999999a')).toBeNull();
      expect(normalizeBrazilianPhone('11-99999-999@')).toBeNull();
    });

    it('retorna null para números sem DDD (8 ou 9 dígitos)', () => {
      expect(normalizeBrazilianPhone('99999-9999')).toBeNull();
      expect(normalizeBrazilianPhone('999999999')).toBeNull();
      expect(normalizeBrazilianPhone('3333-4444')).toBeNull();
      expect(normalizeBrazilianPhone('33334444')).toBeNull();
    });

    it('retorna null para DDDs inexistentes no Brasil', () => {
      expect(normalizeBrazilianPhone('(00) 99999-9999')).toBeNull();
      expect(normalizeBrazilianPhone('(01) 99999-9999')).toBeNull();
      expect(normalizeBrazilianPhone('(20) 99999-9999')).toBeNull();
      expect(normalizeBrazilianPhone('(23) 99999-9999')).toBeNull();
      expect(normalizeBrazilianPhone('(25) 99999-9999')).toBeNull();
      expect(normalizeBrazilianPhone('(26) 99999-9999')).toBeNull();
      expect(normalizeBrazilianPhone('(36) 99999-9999')).toBeNull();
      expect(normalizeBrazilianPhone('(39) 99999-9999')).toBeNull();
      expect(normalizeBrazilianPhone('(52) 99999-9999')).toBeNull();
      expect(normalizeBrazilianPhone('(78) 99999-9999')).toBeNull();
      expect(normalizeBrazilianPhone('(90) 99999-9999')).toBeNull();
    });

    it('retorna null para números de outros países (DDI não é 55)', () => {
      expect(normalizeBrazilianPhone('+1 555 123 4567')).toBeNull();
      expect(normalizeBrazilianPhone('+44 7911 123456')).toBeNull();
      expect(normalizeBrazilianPhone('+351 912 345 678')).toBeNull();
    });

    it('retorna null para dígitos a mais ou a menos', () => {
      expect(normalizeBrazilianPhone('1199999999')).toBeNull(); // 10 dígitos começando com 9 (celular incompleto)
      expect(normalizeBrazilianPhone('119999999')).toBeNull();  // 9 dígitos totais
      expect(normalizeBrazilianPhone('+55 11 99999-99999')).toBeNull(); // 14 dígitos
      expect(normalizeBrazilianPhone('55119999999999')).toBeNull();
    });

    it('retorna null para fixos iniciados com dígitos inválidos (0, 1, 6-9)', () => {
      expect(normalizeBrazilianPhone('(11) 0333-4444')).toBeNull();
      expect(normalizeBrazilianPhone('(11) 1333-4444')).toBeNull();
      expect(normalizeBrazilianPhone('(11) 6333-4444')).toBeNull();
      expect(normalizeBrazilianPhone('(11) 7333-4444')).toBeNull();
      expect(normalizeBrazilianPhone('(11) 8333-4444')).toBeNull();
    });

    it('retorna null para celulares que não começam com 9', () => {
      expect(normalizeBrazilianPhone('(11) 88888-8888')).toBeNull();
      expect(normalizeBrazilianPhone('(11) 77777-7777')).toBeNull();
    });
  });
});

describe('formatBrazilianPhone', () => {
  it('formata celular completo de 13 dígitos para (DD) 9NNNN-NNNN', () => {
    expect(formatBrazilianPhone('5511999999999')).toBe('(11) 99999-9999');
  });

  it('formata fixo completo de 12 dígitos para (DD) NNNN-NNNN', () => {
    expect(formatBrazilianPhone('551133334444')).toBe('(11) 3333-4444');
  });

  it('formata celular sem DDI (11 dígitos)', () => {
    expect(formatBrazilianPhone('11999999999')).toBe('(11) 99999-9999');
  });

  it('formata fixo sem DDI (10 dígitos)', () => {
    expect(formatBrazilianPhone('1133334444')).toBe('(11) 3333-4444');
  });

  it('lida com entradas parciais enquanto o usuário digita', () => {
    expect(formatBrazilianPhone('')).toBe('');
    expect(formatBrazilianPhone('1')).toBe('(1');
    expect(formatBrazilianPhone('11')).toBe('(11');
    expect(formatBrazilianPhone('119')).toBe('(11) 9');
    expect(formatBrazilianPhone('119999')).toBe('(11) 9999');
    expect(formatBrazilianPhone('1199999')).toBe('(11) 9999-9');
    expect(formatBrazilianPhone('11999999')).toBe('(11) 9999-99');
  });
});
