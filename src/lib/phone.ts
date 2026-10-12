/**
 * StokFácil — Normalização e formatação de telefones brasileiros
 *
 * Aceita números com ou sem DDI (+55), com DDD e números locais de 8 (fixo) ou 9 dígitos (celular).
 * Converte para o padrão numérico 55DDNNNNNNNNN.
 */

// Lista oficial de DDDs válidos no Brasil (Anatel)
const VALID_BRAZILIAN_DDDS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

/**
 * Normaliza um número de telefone brasileiro para formato numérico canônico:
 * - Celular: 55DD9NNNNNNNN (13 dígitos)
 * - Fixo: 55DDNNNNNNNN (12 dígitos)
 *
 * Retorna null se a entrada for inválida.
 */
export function normalizeBrazilianPhone(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Se contiver caracteres além de números, espaços, parênteses, hífen, ponto ou '+', é inválido
  if (/[^0-9\s()./\\+-]/.test(trimmed)) {
    return null;
  }

  // Extrai apenas os dígitos
  let digits = trimmed.replace(/\D/g, '');

  // Trata prefixo 0 de discagem interurbana (ex: 0119999999999 ou 01133334444)
  if (digits.startsWith('0') && (digits.length === 12 || digits.length === 11)) {
    digits = digits.slice(1);
  }

  let ddd: string;
  let localNumber: string;

  if (digits.length === 13) {
    // 55 + DDD (2) + celular (9)
    if (!digits.startsWith('55')) {
      return null;
    }
    ddd = digits.slice(2, 4);
    localNumber = digits.slice(4);
  } else if (digits.length === 12) {
    // 55 + DDD (2) + fixo (8)
    if (!digits.startsWith('55')) {
      return null;
    }
    ddd = digits.slice(2, 4);
    localNumber = digits.slice(4);
  } else if (digits.length === 11) {
    // DDD (2) + celular (9)
    ddd = digits.slice(0, 2);
    localNumber = digits.slice(2);
  } else if (digits.length === 10) {
    // DDD (2) + fixo (8)
    ddd = digits.slice(0, 2);
    localNumber = digits.slice(2);
  } else {
    // Menos de 10 dígitos (sem DDD) ou mais de 13 dígitos
    return null;
  }

  // Valida o DDD contra a tabela oficial
  if (!VALID_BRAZILIAN_DDDS.has(ddd)) {
    return null;
  }

  // Celular (9 dígitos): deve começar obrigatoriamente com 9
  if (localNumber.length === 9) {
    if (!localNumber.startsWith('9')) {
      return null;
    }
  } else if (localNumber.length === 8) {
    // Fixo (8 dígitos): deve começar com 2, 3, 4 ou 5
    if (!/^[2-5]/.test(localNumber)) {
      return null;
    }
  } else {
    return null;
  }

  return `55${ddd}${localNumber}`;
}

/**
 * Formata um número de telefone brasileiro para exibição amigável:
 * - 11 dígitos (ou 13 com DDI 55): (DD) 9NNNN-NNNN
 * - 10 dígitos (ou 12 com DDI 55): (DD) NNNN-NNNN
 * Também funciona com digitação parcial para máscaras de input.
 */
export function formatBrazilianPhone(value: string): string {
  if (!value) return '';
  let digits = value.replace(/\D/g, '');

  // Se já vier com 55 e tiver tamanho de número completo
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  // Limita a 11 dígitos locais (DDD + 9 dígitos)
  if (digits.length > 11) {
    digits = digits.slice(0, 11);
  }

  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    // Fixo de 8 dígitos ou celular incompleto
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // Celular de 9 dígitos: (DD) 9NNNN-NNNN
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
