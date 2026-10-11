import type { Item } from './types';

/**
 * Converte a string de imagem do banco (que pode ser JSON array ou CSV ou URL única)
 * em uma lista de URLs de imagens.
 */
export function parseImages(urlStr: string | null | undefined): string[] {
  if (!urlStr) return [];
  try {
    const parsed = JSON.parse(urlStr);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Ignora erro de JSON.parse e segue para split por vírgula
  }
  return urlStr.split(',').filter(Boolean);
}

/**
 * Formata um valor numérico para a moeda brasileira (BRL / R$).
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
}

/**
 * Formata os detalhes do produto para cópia rápida / compartilhamento.
 */
export function formatItemDetails(item: Pick<Item, 'title' | 'price' | 'description' | 'is_sold'>): string {
  const formattedPrice = formatPrice(item.price);
  return `Produto: ${item.title}\nPreço: ${formattedPrice}\nDescrição: ${item.description || 'Sem descrição'}\nStatus: ${item.is_sold ? 'Vendido' : 'Disponível'}`;
}
