import { describe, it, expect } from 'vitest';
import { sanitizeSlug, isValidSlug, RESERVED_SLUGS } from '../slug';

describe('slug.ts — Utilitários de higienização e validação de slugs', () => {
  describe('sanitizeSlug', () => {
    it('converte letras maiúsculas para minúsculas', () => {
      expect(sanitizeSlug('MinhaLoja')).toBe('minhaloja');
      expect(sanitizeSlug('LOJA-DA-MARIA')).toBe('loja-da-maria');
    });

    it('remove acentos diacríticos (á, é, í, ó, ú, ç, ã, õ, etc.)', () => {
      expect(sanitizeSlug('Boutique & Café São João')).toBe('boutique-cafe-sao-joao');
      expect(sanitizeSlug('Brechó da Vovó Çalo')).toBe('brecho-da-vovo-calo');
      expect(sanitizeSlug('Óculos & Acessórios')).toBe('oculos-acessorios');
    });

    it('substitui espaços e underlines por hífens', () => {
      expect(sanitizeSlug('loja da maria')).toBe('loja-da-maria');
      expect(sanitizeSlug('loja_da_maria')).toBe('loja-da-maria');
      expect(sanitizeSlug('loja   com    espacos')).toBe('loja-com-espacos');
    });

    it('remove caracteres especiais não permitidos mantendo apenas [a-z0-9-]', () => {
      expect(sanitizeSlug('loja@#$123!')).toBe('loja123');
      expect(sanitizeSlug('calcados.e.roupas/vendas')).toBe('calcadoseroupasvendas');
      expect(sanitizeSlug('loja (oficial) [2026]')).toBe('loja-oficial-2026');
    });

    it('unifica hífens consecutivos e remove hífens das extremidades', () => {
      expect(sanitizeSlug('--minha--loja--')).toBe('minha-loja');
      expect(sanitizeSlug('---abc---def---')).toBe('abc-def');
      expect(sanitizeSlug('-loja-')).toBe('loja');
    });

    it('limita o tamanho máximo a 40 caracteres e limpa hífen que restar na ponta', () => {
      // 50 caracteres: "minha-loja-super-especial-de-roupas-vintage-retro-2026"
      const longName = 'minha loja super especial de roupas vintage retro 2026';
      const result = sanitizeSlug(longName);
      expect(result.length).toBeLessThanOrEqual(40);
      expect(result.endsWith('-')).toBe(false);
      expect(result.startsWith('-')).toBe(false);

      // Cenário onde o corte no 40º caractere terminaria em hífen
      // "a".repeat(39) + " " + "b".repeat(10) -> "a"*39 + "-" + "b"*10 -> cortado em 40 seria "a"*39 + "-"
      const trickyInput = 'a'.repeat(39) + ' bbbbbbb';
      const trickyResult = sanitizeSlug(trickyInput);
      expect(trickyResult).toBe('a'.repeat(39));
      expect(trickyResult.endsWith('-')).toBe(false);
    });

    it('retorna string vazia para entradas nulas, indefinidas ou sem caracteres alfanuméricos', () => {
      expect(sanitizeSlug('')).toBe('');
      // @ts-expect-error testando tipo inválido em tempo de execução
      expect(sanitizeSlug(null)).toBe('');
      // @ts-expect-error testando tipo inválido em tempo de execução
      expect(sanitizeSlug(undefined)).toBe('');
      expect(sanitizeSlug('!@#$%^&*()_+')).toBe('');
      expect(sanitizeSlug('   ---   ')).toBe('');
    });
  });

  describe('isValidSlug', () => {
    it('aprova slugs válidos com letras, números e hífens internos', () => {
      expect(isValidSlug('loja-carol')).toBe(true);
      expect(isValidSlug('brecho123')).toBe(true);
      expect(isValidSlug('abc')).toBe(true);
      expect(isValidSlug('123-roupas-456')).toBe(true);
      expect(isValidSlug('a'.repeat(40))).toBe(true);
    });

    it('rejeita slugs com menos de 3 caracteres', () => {
      expect(isValidSlug('')).toBe(false);
      expect(isValidSlug('a')).toBe(false);
      expect(isValidSlug('ab')).toBe(false);
    });

    it('rejeita slugs com mais de 40 caracteres', () => {
      expect(isValidSlug('a'.repeat(41))).toBe(false);
      expect(isValidSlug('loja-' + 'a'.repeat(36))).toBe(false);
    });

    it('rejeita slugs com hífens no início ou no fim', () => {
      expect(isValidSlug('-loja')).toBe(false);
      expect(isValidSlug('loja-')).toBe(false);
      expect(isValidSlug('-loja-carol-')).toBe(false);
    });

    it('rejeita slugs com hífens consecutivos', () => {
      expect(isValidSlug('loja--carol')).toBe(false);
      expect(isValidSlug('loja---carol')).toBe(false);
    });

    it('rejeita slugs com caracteres maiúsculos ou especiais', () => {
      expect(isValidSlug('Loja-carol')).toBe(false);
      expect(isValidSlug('loja_carol')).toBe(false);
      expect(isValidSlug('loja.carol')).toBe(false);
      expect(isValidSlug('loja@carol')).toBe(false);
      expect(isValidSlug('loja carol')).toBe(false);
    });

    it('rejeita todos os slugs da lista de reservados', () => {
      const sampleReserved = [
        'api',
        'admin',
        'entrar',
        '_next',
        'login',
        'auth',
        'app',
        'stokfacil',
        'suporte',
        'termos',
        'privacidade',
        'checkout',
        'dashboard',
      ];

      for (const slug of sampleReserved) {
        expect(isValidSlug(slug)).toBe(false);
      }

      // Garante que cada item em RESERVED_SLUGS é de fato rejeitado
      for (const reserved of RESERVED_SLUGS) {
        expect(isValidSlug(reserved)).toBe(false);
      }
    });

    it('rejeita entradas nulas ou inválidas', () => {
      // @ts-expect-error testando tipo inválido em tempo de execução
      expect(isValidSlug(null)).toBe(false);
      // @ts-expect-error testando tipo inválido em tempo de execução
      expect(isValidSlug(undefined)).toBe(false);
      // @ts-expect-error testando tipo inválido em tempo de execução
      expect(isValidSlug(12345)).toBe(false);
    });
  });
});
