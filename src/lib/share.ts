import { formatPrice } from './format';

/**
 * Monta legenda atrativa para feed/stories com emojis (✨ título, 💰 preço, 📦 descrição, 🔗 link da vitrine).
 */
export function buildCaption(
  item: { title: string; price: number; description?: string | null },
  storeUrl: string
): string {
  const parts: string[] = [
    `✨ ${item.title.trim()}`,
    `💰 ${formatPrice(item.price)}`,
  ];

  const cleanDesc = item.description?.trim();
  if (cleanDesc) {
    parts.push(`📦 ${cleanDesc}`);
  }

  const cleanUrl = storeUrl.trim();
  if (cleanUrl) {
    parts.push(`🔗 Link da vitrine: ${cleanUrl}`);
  }

  return parts.join('\n\n');
}

/**
 * Retorna a URL canônica da vitrine a partir do slug.
 */
export function getStoreUrl(slug: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    return slug ? `${origin}/${slug}` : origin;
  }
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://stokfacil.com').replace(/\/+$/, '');
  return slug ? `${base}/${slug}` : base;
}

/**
 * Utilitário com fallback robusto para cópia de texto:
 * tenta `navigator.clipboard.writeText`, com fallback para `document.execCommand('copy')`.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  // 1. Tenta API moderna assíncrona Clipboard
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Falha (ex.: permissão negada ou WebView restritiva); prossegue para fallback
    }
  }

  // 2. Fallback síncrono clássico com textarea temporário
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return Boolean(success);
  } catch {
    return false;
  }
}

/**
 * Encapsula a lógica de compartilhamento com a Web Share API (navigator.canShare({ files })),
 * tratando AbortError (usuário cancelou) sem acionar fallback, e disparando download via
 * blob: com feedback visual de conclusão caso o share não seja suportado ou falhe por NotAllowedError.
 */
export async function shareOrDownloadImage(
  imageUrl: string,
  filename: string
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (typeof window === 'undefined') {
    return 'cancelled';
  }

  // 1. Baixa o blob da imagem
  let blob: Blob;
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Falha ao obter imagem (${response.status})`);
    }
    blob = await response.blob();
  } catch (fetchError) {
    console.error('Erro ao baixar blob da imagem:', fetchError);
    // Como último recurso, tenta abrir em nova aba
    try {
      window.open(imageUrl, '_blank');
      return 'downloaded';
    } catch {
      return 'cancelled';
    }
  }

  const cleanName = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const fileNameStr = cleanName.endsWith('.jpg') || cleanName.endsWith('.jpeg') || cleanName.endsWith('.png')
    ? cleanName
    : `${cleanName}.jpg`;

  // 2. Tenta Web Share API se suportado para arquivos (mobile)
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof navigator.share === 'function' &&
    typeof File !== 'undefined'
  ) {
    try {
      const file = new File([blob], fileNameStr, { type: blob.type || 'image/jpeg' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: filename,
          });
          return 'shared';
        } catch (shareError: unknown) {
          const isAbort =
            (shareError instanceof Error && shareError.name === 'AbortError') ||
            (typeof shareError === 'object' &&
              shareError !== null &&
              (shareError as { name?: string }).name === 'AbortError');

          if (isAbort) {
            // Usuário cancelou intencionalmente a tela nativa; NÃO dispara fallback de download
            return 'cancelled';
          }
          // NotAllowedError ou outro erro: continua para fallback via blob
          console.warn('Web Share não permitido ou falhou, acionando fallback de download:', shareError);
        }
      }
    } catch (canShareError) {
      console.warn('Erro ao avaliar canShare, acionando fallback:', canShareError);
    }
  }

  // 3. Fallback de download via blob: (Desktop ou WebViews sem suporte a files no share)
  try {
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileNameStr;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    return 'downloaded';
  } catch (downloadError) {
    console.error('Erro no fallback de download via blob:', downloadError);
    window.open(imageUrl, '_blank');
    return 'downloaded';
  }
}

/**
 * Constrói o link direto para envio da vitrine completa via WhatsApp ("https://api.whatsapp.com/send?text=...").
 * Permite que o vendedor envie a vitrine com 1 clique para qualquer contato individual ou grupo.
 *
 * Mensagem:
 * "Conheça a nossa vitrine online! Veja todas as novidades e peças disponíveis no link: <url>"
 * (Personaliza com o nome da loja caso fornecido).
 */
export function buildWhatsAppStoreShareLink(storeName: string, storeUrl: string): string {
  const cleanUrl = (storeUrl || '').trim();
  const cleanName = (storeName || '').trim();

  const greeting = cleanName
    ? `Conheça a vitrine online da ${cleanName}!`
    : 'Conheça a nossa vitrine online!';

  const message = cleanUrl
    ? `${greeting} Veja todas as novidades e peças disponíveis no link: ${cleanUrl}`
    : `${greeting} Veja todas as nossas novidades e peças disponíveis!`;

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

/**
 * Constrói o link direto para envio de um item específico via WhatsApp ("https://api.whatsapp.com/send?text=...").
 *
 * Formato da mensagem:
 * "Olha essa novidade: *[Título]* por apenas *[Preço]*!\n\nConfira todos os detalhes e fotos na nossa vitrine: <itemUrl>"
 */
export function buildWhatsAppProductShareLink(
  item: { title: string; price: number; description?: string | null },
  storeUrl: string
): string {
  const cleanTitle = (item?.title || '').trim();
  const safePrice =
    typeof item?.price === 'number' && !isNaN(item.price) && isFinite(item.price) && item.price >= 0
      ? item.price
      : 0;
  const formattedPrice = formatPrice(safePrice).replace(/\s+/g, ' ');
  const cleanUrl = (storeUrl || '').trim();

  const urlPart = cleanUrl ? `: ${cleanUrl}` : '.';
  const message = `Olha essa novidade: *${cleanTitle}* por apenas *${formattedPrice}*!\n\nConfira todos os detalhes e fotos na nossa vitrine${urlPart}`;

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

/**
 * Compartilha URL/conteúdo tentando primariamente a Web Share API nativa (navigator.share).
 * Caso o ambiente não suporte ou rejeite (ex: navegadores Desktop convencionais),
 * aciona automaticamente o fallback direto para o WhatsApp (https://api.whatsapp.com/send?text=...).
 * Se o usuário cancelar ativamente a tela de compartilhamento (AbortError), não dispara fallback.
 */
export async function shareUrlOrWhatsApp(params: {
  title: string;
  text: string;
  url: string;
}): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const { title, text, url } = params;

  // 1. Tenta Web Share API nativa (disponível em navegadores mobile modernos e apps compatíveis)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return;
    } catch (err: unknown) {
      const isAbort =
        (err instanceof Error && err.name === 'AbortError') ||
        (typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError');

      if (isAbort) {
        // Usuário cancelou intencionalmente a tela nativa; NÃO dispara fallback
        return;
      }
      // Outros erros (ex.: NotAllowedError) prosseguem para o fallback do WhatsApp
    }
  }

  // 2. Fallback direto para o WhatsApp
  const cleanText = (text || '').trim();
  const cleanUrl = (url || '').trim();
  const fullText = cleanText.includes(cleanUrl)
    ? cleanText
    : `${cleanText ? `${cleanText}\n\n` : ''}${cleanUrl}`.trim();

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;

  try {
    const opened = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      await copyToClipboard(cleanUrl || fullText);
    }
  } catch {
    await copyToClipboard(cleanUrl || fullText);
  }
}

