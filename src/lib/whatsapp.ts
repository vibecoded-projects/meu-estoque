import { normalizeBrazilianPhone } from './phone';
import { formatPrice } from './format';

export interface BuildOrderLinkParams {
  phone?: string | null;
  title: string;
  price: number;
  storeUrl?: string | null;
}

/**
 * Constrói o link direto de pedido via WhatsApp ("https://wa.me/<phone>?text=...")
 *
 * Formato da mensagem:
 * "Olá! Vi o produto [Título] (R$ [Preço formatado em PT-BR]) no seu catálogo StokFácil e quero comprar. Como faço para fechar o pedido?"
 * (incluindo o link storeUrl opcional se fornecido, ex.: " (https://...)")
 *
 * Retorna `null` se o telefone for nulo, indefinido ou inválido.
 */
export function buildOrderLink({
  phone,
  title,
  price,
  storeUrl,
}: BuildOrderLinkParams): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  const normalizedPhone = normalizeBrazilianPhone(phone);
  if (!normalizedPhone) {
    return null;
  }

  const safePrice = typeof price === 'number' && !isNaN(price) && isFinite(price) && price >= 0 ? price : 0;
  const formattedPrice = formatPrice(safePrice).replace(/\s+/g, ' ');
  const cleanTitle = (title || '').trim();
  const cleanStoreUrl = storeUrl?.trim();

  const urlPart = cleanStoreUrl ? ` (${cleanStoreUrl})` : '';
  const message = `Olá! Vi o produto ${cleanTitle} (${formattedPrice}) no seu catálogo StokFácil${urlPart} e quero comprar. Como faço para fechar o pedido?`;

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
