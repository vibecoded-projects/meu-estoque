export type ParsedBatchItem = {
  line: number;
  title: string;
  price: number | null;
  description: string | null;
  warning?: string;
};

interface FoundPrice {
  price: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Converte uma representação textual de preço em número ou null.
 * Suporta formatos monetários brasileiros e universais:
 * - R$ 89,90, R$89,90, 89,90, 120.00, 45 reais, R$50, 1.299,90, 1299,90, R$ 1.299, R$ 0,99
 *
 * Regras:
 * - vírgula seguida de 1-2 dígitos no fim = decimal BR
 * - ponto seguido de exatamente 3 dígitos = milhar
 * - ponto seguido de 1-2 dígitos = decimal
 * - arredondar para 2 casas decimais
 */
export function parsePrice(raw: string): number | null {
  if (!raw || typeof raw !== 'string') return null;

  let s = raw.trim();
  if (!s) return null;

  // Remove marcador monetário no início (R$, r$, $)
  s = s.replace(/^[rR]?\$\s*/, '');

  // Remove marcador monetário no fim (reais, real, R$, r$, $)
  s = s.replace(/\s*(?:reais|real|[rR]?\$)$/i, '');

  s = s.trim();
  if (!s) return null;

  // Regra 1: vírgula seguida de 1-2 dígitos no fim = decimal BR
  // Exemplos: 1.299,90, 1299,90, 89,90, 0,99, ,90
  const brCommaMatch = s.match(/^(\d{1,3}(?:\.\d{3})+|\d+)?,\s*(\d{1,2})$/);
  if (brCommaMatch) {
    const intPart = brCommaMatch[1] ? brCommaMatch[1].replace(/\./g, '') : '0';
    const decPart = brCommaMatch[2];
    const val = parseFloat(`${intPart}.${decPart}`);
    if (Number.isFinite(val) && val >= 0) {
      return Math.round((val + Number.EPSILON) * 100) / 100;
    }
    return null;
  }

  // Regra 2: ponto seguido de 1-2 dígitos no fim = decimal
  // Exemplos: 120.00, 120.5, 0.99, 1.299.50
  const dotDecimalMatch = s.match(/^(\d{1,3}(?:\.\d{3})+|\d+)?\.\s*(\d{1,2})$/);
  if (dotDecimalMatch) {
    const intPart = dotDecimalMatch[1] ? dotDecimalMatch[1].replace(/\./g, '') : '0';
    const decPart = dotDecimalMatch[2];
    const val = parseFloat(`${intPart}.${decPart}`);
    if (Number.isFinite(val) && val >= 0) {
      return Math.round((val + Number.EPSILON) * 100) / 100;
    }
    return null;
  }

  // Regra 3: ponto seguido de exatamente 3 dígitos = milhar
  // Exemplos: 1.299, 12.500, 1.000.000
  const dotMilharMatch = s.match(/^(\d{1,3}(?:\.\d{3})+)$/);
  if (dotMilharMatch) {
    const intPart = s.replace(/\./g, '');
    const val = parseInt(intPart, 10);
    if (Number.isFinite(val) && val >= 0) {
      return val;
    }
    return null;
  }

  // Regra 4: número inteiro puro sem pontos ou vírgulas
  // Exemplos: 45, 50, 120
  const integerMatch = s.match(/^\d+$/);
  if (integerMatch) {
    const val = parseInt(s, 10);
    if (Number.isFinite(val) && val >= 0) {
      return val;
    }
    return null;
  }

  return null;
}

/**
 * Remove numeração inicial, marcadores de lista, espaços duplicados e pontuação solta nas pontas.
 */
function cleanTitle(rawTitle: string): string {
  let title = rawTitle.trim();

  // Remove numeração e bullets iniciais repetidamente: 1., 1), 1 -, -, •, *
  let changed = true;
  while (changed) {
    changed = false;
    const next = title
      .replace(/^\d+\s*[\.\)]\s*/, '')
      .replace(/^\d+\s*[-–—]\s*/, '')
      .replace(/^[-–—•*]\s*/, '')
      .trim();
    if (next !== title) {
      title = next;
      changed = true;
    }
  }

  // Remove pontuação solta nas pontas (, ; : - | – —)
  let stripped = true;
  while (stripped) {
    stripped = false;
    const next = title
      .replace(/^[,;:\-|–—]+\s*/, '')
      .replace(/\s*[,;:\-|–—]+$/, '')
      .trim();
    if (next !== title) {
      title = next;
      stripped = true;
    }
  }

  // Normaliza espaços duplicados
  return title.replace(/\s+/g, ' ').trim();
}

/**
 * Se houver separadores (, - | ;) após o preço, extrai o texto subsequente como descrição.
 */
function cleanDescription(afterText: string): string | null {
  if (!afterText) return null;

  const sepMatch = afterText.match(/^\s*(?:[-–—]|\||;|,)\s*(.*)$/);
  if (!sepMatch) {
    return null;
  }

  let desc = sepMatch[1].trim();
  if (!desc) return null;

  // Remove pontuação solta nas pontas da descrição
  desc = desc
    .replace(/^[,;:\-|–—]+\s*/, '')
    .replace(/\s*[,;:\-|–—]+$/, '')
    .trim();

  desc = desc.replace(/\s+/g, ' ').trim();
  return desc.length > 0 ? desc : null;
}

/**
 * Localiza o preço em uma linha respeitando as prioridades do domínio:
 * 1. Preço com marcador explícito (R$ ou reais/real)
 * 2. Sem marcador explícito: o ÚLTIMO número com formato monetário com decimais
 * 3. Sem decimais: o último número isolado no fim da linha
 */
function findPriceInLine(line: string): FoundPrice | null {
  // Prioridade 1: Marcadores explícitos (R$ ou reais/real)
  const explicitRegexes = [
    /(?:^|[^\w])([rR]\$\s*(?:\d{1,3}(?:\.\d{3})*,\d{1,2}|\d+,\d{1,2}|\d{1,3}(?:\.\d{3})+|\d{1,3}(?:\.\d{3})*\.\d{1,2}|\d+\.\d{1,2}|\d+))(?=[^\w]|$)/g,
    /(?:^|[^\w])((?:\d{1,3}(?:\.\d{3})*,\d{1,2}|\d+,\d{1,2}|\d{1,3}(?:\.\d{3})+|\d{1,3}(?:\.\d{3})*\.\d{1,2}|\d+\.\d{1,2}|\d+)\s*(?:reais|real|[rR]\$))(?=[^\w]|$)/gi,
  ];

  const explicitMatches: FoundPrice[] = [];
  for (const regex of explicitRegexes) {
    const matches = Array.from(line.matchAll(regex));
    for (const match of matches) {
      const token = match[1];
      if (!token || match.index === undefined) continue;
      const offset = match[0].indexOf(token);
      const startIndex = match.index + offset;
      const endIndex = startIndex + token.length;
      const price = parsePrice(token);
      if (price !== null) {
        explicitMatches.push({ price, startIndex, endIndex });
      }
    }
  }

  if (explicitMatches.length > 0) {
    explicitMatches.sort((a, b) => a.startIndex - b.startIndex);
    return explicitMatches[explicitMatches.length - 1];
  }

  // Prioridade 2: Sem marcador explícito, último número com decimais
  const decimalRegex = /(?:^|[^\w])(\d{1,3}(?:\.\d{3})*,\d{1,2}|\d+,\d{1,2}|\d{1,3}(?:\.\d{3})*\.\d{1,2}|\d+\.\d{1,2})(?=[^\w]|$)/g;
  const decimalMatches: FoundPrice[] = [];
  const matches = Array.from(line.matchAll(decimalRegex));
  for (const match of matches) {
    const token = match[1];
    if (!token || match.index === undefined) continue;
    const offset = match[0].indexOf(token);
    const startIndex = match.index + offset;
    const endIndex = startIndex + token.length;
    const price = parsePrice(token);
    if (price !== null) {
      decimalMatches.push({ price, startIndex, endIndex });
    }
  }

  if (decimalMatches.length > 0) {
    decimalMatches.sort((a, b) => a.startIndex - b.startIndex);
    return decimalMatches[decimalMatches.length - 1];
  }

  // Prioridade 3: Sem decimais, último número isolado no fim da linha
  const endNumberRegex = /(?:^|[^\w])(\d{1,3}(?:\.\d{3})+|\d+)\s*[,;:\.!\?\|\-–—]*$/;
  const endMatch = line.match(endNumberRegex);
  if (endMatch && endMatch[1] && endMatch.index !== undefined) {
    const token = endMatch[1];
    const offset = endMatch[0].indexOf(token);
    const startIndex = endMatch.index + offset;
    const endIndex = startIndex + token.length;
    const price = parsePrice(token);
    if (price !== null) {
      return { price, startIndex, endIndex };
    }
  }

  return null;
}

/**
 * Parser inteligente de lote para importação rápida de itens.
 * Linhas vazias são ignoradas; line preserva a numeração original (1-based).
 */
export function parseBatch(text: string): ParsedBatchItem[] {
  if (!text || typeof text !== 'string') return [];

  const rawLines = text.split(/\r\n|\r|\n/);
  const items: ParsedBatchItem[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    if (rawLine.trim() === '') {
      continue;
    }

    const lineNumber = i + 1;
    const trimmedLine = rawLine.trim();

    const priceMatch = findPriceInLine(trimmedLine);

    let title: string;
    let price: number | null = null;
    let description: string | null = null;

    if (priceMatch) {
      price = priceMatch.price;
      const rawTitlePart = trimmedLine.substring(0, priceMatch.startIndex);
      const rawAfterPart = trimmedLine.substring(priceMatch.endIndex);

      title = cleanTitle(rawTitlePart);
      description = cleanDescription(rawAfterPart);
    } else {
      title = cleanTitle(trimmedLine);
      price = null;
      description = null;
    }

    let warning: string | undefined;
    if (!title) {
      warning = 'Título vazio';
    } else if (price === null) {
      warning = 'Preço não encontrado';
    }

    const item: ParsedBatchItem = {
      line: lineNumber,
      title,
      price,
      description,
    };

    if (warning) {
      item.warning = warning;
    }

    items.push(item);
  }

  return items;
}
