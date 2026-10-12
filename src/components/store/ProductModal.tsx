'use client';

import { useState } from 'react';
import { Image as ImageIcon, Copy, Check, Download, ExternalLink, Pencil, Trash2, Phone, Share2 } from 'lucide-react';
import { parseImages, formatPrice, formatItemDetails } from '@/lib/format';
import { buildOrderLink } from '@/lib/whatsapp';
import { buildCaption, copyToClipboard, shareOrDownloadImage, getStoreUrl } from '@/lib/share';
import type { Item, Namespace } from '@/lib/types';

function WhatsAppIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.11 7.44C8.95 7.44 8.68 7.5 8.46 7.74C8.24 7.97 7.62 8.56 7.62 9.75C7.62 10.95 8.49 12.1 8.61 12.26C8.73 12.42 10.32 14.88 12.77 15.93C14.8 16.81 15.22 16.63 15.67 16.59C16.12 16.55 17.11 16 17.31 15.43C17.52 14.86 17.52 14.37 17.46 14.27C17.4 14.17 17.24 14.11 17 13.99C16.76 13.87 15.58 13.29 15.36 13.21C15.14 13.13 14.98 13.09 14.82 13.33C14.66 13.57 14.2 14.11 14.06 14.27C13.92 14.43 13.78 14.45 13.54 14.33C13.3 14.21 12.53 13.96 11.61 13.14C10.89 12.5 10.4 11.71 10.26 11.47C10.12 11.23 10.25 11.1 10.37 10.98C10.48 10.87 10.61 10.69 10.74 10.54C10.86 10.39 10.9 10.28 10.98 10.12C11.06 9.96 11.02 9.82 10.96 9.7C10.9 9.58 10.44 8.45 10.25 7.99C10.06 7.54 9.87 7.6 9.73 7.59C9.59 7.58 9.43 7.58 9.27 7.58L9.11 7.44Z" />
    </svg>
  );
}

interface ProductModalProps {
  item: Item | null;
  slug?: string;
  isAuthenticated: boolean;
  whatsapp?: string | null;
  storeUrl?: string | null;
  namespace?: Namespace | null;
  onClose: () => void;
  onEdit?: (item: Item, e: React.MouseEvent) => void;
  onDelete?: (id: string, e: React.MouseEvent) => void;
  onShared?: () => void;
}

export function ProductModal({
  item,
  slug,
  isAuthenticated,
  whatsapp,
  storeUrl,
  namespace,
  onClose,
  onEdit,
  onDelete,
  onShared,
}: ProductModalProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isTitleCopied, setIsTitleCopied] = useState(false);
  const [isCaptionCopied, setIsCaptionCopied] = useState(false);
  const [imageFeedback, setImageFeedback] = useState<string | null>(null);

  if (!item) return null;

  const effectiveWhatsapp = whatsapp ?? namespace?.whatsapp ?? null;

  const orderLink =
    effectiveWhatsapp && !item.is_sold
      ? buildOrderLink({
          phone: effectiveWhatsapp,
          title: item.title,
          price: item.price,
          storeUrl,
        })
      : null;

  const copyTitleOnly = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyToClipboard(item.title);
    if (ok) {
      setIsTitleCopied(true);
      setTimeout(() => setIsTitleCopied(false), 2000);
    }
  };

  const copyItemDetails = async () => {
    const text = formatItemDetails(item);
    const ok = await copyToClipboard(text);
    if (ok) {
      setIsCopied(true);
      onShared?.();
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleCopyCaption = async () => {
    const targetUrl =
      storeUrl ||
      (slug ? getStoreUrl(slug) : namespace?.slug ? getStoreUrl(namespace.slug) : typeof window !== 'undefined' ? window.location.href : '');
    const caption = buildCaption(item, targetUrl);
    const ok = await copyToClipboard(caption);
    if (ok) {
      setIsCaptionCopied(true);
      onShared?.();
      setTimeout(() => setIsCaptionCopied(false), 2000);
    }
  };

  const handleDownloadImage = async (url: string, filename: string) => {
    const result = await shareOrDownloadImage(url, filename);
    if (result === 'downloaded') {
      setImageFeedback('Foto salva!');
      onShared?.();
      setTimeout(() => setImageFeedback(null), 2500);
    } else if (result === 'shared') {
      onShared?.();
    }
  };

  const urls = parseImages(item.image_url);

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto transition-opacity"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <div
          className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="md:w-1/2 relative bg-slate-100 aspect-square md:aspect-auto group">
            {item.is_sold && (
              <div className="absolute top-4 left-4 bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md z-10 tracking-wider">
                VENDIDO
              </div>
            )}
            {imageFeedback && (
              <div className="absolute top-4 right-4 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg z-20 flex items-center gap-1.5">
                <Check size={14} />
                <span>{imageFeedback}</span>
              </div>
            )}
            {urls.length > 0 ? (
              <div className="flex overflow-x-auto snap-x snap-mandatory w-full h-full hide-scrollbar">
                {urls.map((url, idx) => (
                  <div key={idx} className="min-w-full h-full snap-start relative">
                    <img
                      src={url}
                      alt={item.title}
                      className={`w-full h-full object-cover ${item.is_sold ? 'grayscale-[60%]' : ''}`}
                    />
                    <div className="absolute bottom-4 right-4 flex gap-2">
                      <button
                        onClick={() => handleDownloadImage(url, `${item.title}-${idx}`)}
                        className="bg-white/90 backdrop-blur-sm text-slate-800 p-2 rounded-lg shadow-md hover:bg-white transition-all flex items-center justify-center"
                        title="Baixar imagem"
                      >
                        <Download size={18} />
                      </button>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-white/90 backdrop-blur-sm text-slate-800 p-2 rounded-lg shadow-md hover:bg-white transition-all flex items-center justify-center"
                        title="Abrir original"
                      >
                        <ExternalLink size={18} />
                      </a>
                    </div>
                    {urls.length > 1 && (
                      <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm font-bold backdrop-blur-sm shadow-md">
                        {idx + 1} / {urls.length}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="text-slate-300" size={64} />
              </div>
            )}
          </div>

          <div className="md:w-1/2 p-6 md:p-8 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="text-2xl font-bold text-slate-800">{item.title}</h2>
              <button
                onClick={copyTitleOnly}
                className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-indigo-50 shrink-0"
                title="Copiar título do produto"
              >
                {isTitleCopied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
              </button>
            </div>
            <span className={`font-bold text-3xl mb-6 ${item.is_sold ? 'text-slate-500' : 'text-emerald-600'}`}>
              {formatPrice(item.price)}
            </span>

            <div className="bg-slate-50 rounded-lg p-4 mb-6 flex-grow">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Descrição do Produto</h4>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {item.description || 'Nenhuma descrição detalhada fornecida.'}
              </p>
            </div>

            <div className="flex flex-col gap-2.5 mt-auto">
              {/* Botão de destaque do WhatsApp */}
              {orderLink && !item.is_sold && (
                <a
                  href={orderLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  <WhatsAppIcon size={20} className="shrink-0 text-white" />
                  <span>Pedir no WhatsApp</span>
                  {isAuthenticated && (
                    <span className="text-[10px] font-normal uppercase tracking-wider bg-emerald-700/70 px-1.5 py-0.5 rounded ml-1 text-emerald-100">
                      Prévia
                    </span>
                  )}
                </a>
              )}

              {/* Aviso no modo admin se o item estiver vendido e o WhatsApp estiver configurado */}
              {item.is_sold && isAuthenticated && effectiveWhatsapp && (
                <div className="w-full py-2 px-3 bg-slate-100 rounded-lg text-xs text-slate-500 text-center font-medium">
                  Botão de pedidos oculto para visitantes (produto vendido)
                </div>
              )}

              {/* Aviso sutil no modo admin se a loja não tiver WhatsApp cadastrado */}
              {isAuthenticated && !effectiveWhatsapp && (
                <div className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <Phone size={14} className="shrink-0 text-amber-600" />
                  <span>Cadastre o WhatsApp no cabeçalho da loja para ativar o botão de pedidos.</span>
                </div>
              )}

              {/* Botão Copiar legenda com feedback 1 clique */}
              <button
                type="button"
                onClick={handleCopyCaption}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-white transition-all shadow-sm active:scale-95 ${
                  isCaptionCopied ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
                title="Copiar legenda com emojis e link para colar no Instagram"
              >
                {isCaptionCopied ? <Check size={18} /> : <Share2 size={18} />}
                <span>{isCaptionCopied ? 'Legenda copiada!' : 'Copiar legenda'}</span>
              </button>

              <button
                type="button"
                onClick={copyItemDetails}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-white transition-all ${isCopied ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-800 hover:bg-slate-900'}`}
              >
                {isCopied ? <Check size={18} /> : <Copy size={18} />}
                {isCopied ? 'Copiado!' : 'Copiar Infos'}
              </button>
            </div>

            {/* Controles de edição dentro do modal */}
            {isAuthenticated && (
              <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={(e) => {
                    onClose();
                    onEdit?.(item, e);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                >
                  <Pencil size={16} />
                  Editar
                </button>
                <button
                  onClick={(e) => {
                    onClose();
                    onDelete?.(item.id, e);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                >
                  <Trash2 size={16} />
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
