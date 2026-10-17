'use client';

import { useState } from 'react';
import { Image as ImageIcon, Copy, Check, Tag, Pencil, Trash2, Share2 } from 'lucide-react';
import { parseImages, formatPrice } from '@/lib/format';
import { buildCaption, copyToClipboard, getStoreUrl, buildWhatsAppProductShareLink } from '@/lib/share';
import type { Item } from '@/lib/types';

function WhatsAppIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
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

interface ItemCardProps {
  item: Item;
  slug?: string;
  storeUrl?: string;
  isAuthenticated: boolean;
  onClick: () => void;
  onCopyTitle: (item: Item, e: React.MouseEvent) => void;
  isCopiedTitle: boolean;
  onToggleSold?: (id: string, currentStatus: boolean, e: React.MouseEvent) => void;
  onEdit?: (item: Item, e: React.MouseEvent) => void;
  onDelete?: (id: string, e: React.MouseEvent) => void;
  onShared?: () => void;
}

export function ItemCard({
  item,
  slug,
  storeUrl,
  isAuthenticated,
  onClick,
  onCopyTitle,
  isCopiedTitle,
  onToggleSold,
  onEdit,
  onDelete,
  onShared,
}: ItemCardProps) {
  const [isCaptionCopied, setIsCaptionCopied] = useState(false);
  const urls = parseImages(item.image_url);

  const handleCopyCaption = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetUrl = storeUrl || (slug ? getStoreUrl(slug) : typeof window !== 'undefined' ? window.location.href : '');
    const caption = buildCaption(item, targetUrl);
    const ok = await copyToClipboard(caption);
    if (ok) {
      setIsCaptionCopied(true);
      onShared?.();
      setTimeout(() => setIsCaptionCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetUrl = storeUrl || (slug ? getStoreUrl(slug) : typeof window !== 'undefined' ? window.location.href : '');
    const link = buildWhatsAppProductShareLink(item, targetUrl);
    window.open(link, '_blank', 'noopener,noreferrer');
    onShared?.();
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative group flex flex-col ${item.is_sold ? 'opacity-80' : ''}`}
    >
      {/* Badge de Vendido */}
      {item.is_sold && (
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-rose-600 text-white text-[10px] sm:text-xs font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-md z-10 tracking-wider">
          VENDIDO
        </div>
      )}

      <div className="relative overflow-hidden aspect-square">
        <div className="w-full h-full absolute inset-0">
          {urls.length > 0 ? (
            <>
              <img
                src={urls[0]}
                alt={item.title}
                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${item.is_sold ? 'grayscale-[60%]' : ''}`}
              />
              {urls.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md backdrop-blur-sm shadow flex items-center gap-1">
                  <ImageIcon size={12} /> +{urls.length - 1}
                </div>
              )}
            </>
          ) : (
            <div className={`w-full h-full bg-slate-50 flex items-center justify-center ${item.is_sold ? 'grayscale-[60%]' : ''}`}>
              <ImageIcon className="text-slate-300" size={48} />
            </div>
          )}
          {item.is_sold && <div className="absolute inset-0 bg-white/20"></div>}
        </div>
      </div>

      <div className="p-3 sm:p-5 flex flex-col flex-grow">
        <div className="flex items-start justify-between gap-1 sm:gap-2 mb-1 sm:mb-2">
          <h3 className={`font-bold text-sm sm:text-lg leading-tight truncate ${item.is_sold ? 'text-slate-500 line-through decoration-slate-400' : 'text-slate-800'}`}>
            {item.title}
          </h3>
          <button
            onClick={(e) => onCopyTitle(item, e)}
            className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded-md hover:bg-indigo-50 shrink-0"
            title="Copiar título do produto"
          >
            {isCopiedTitle ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 mb-2 sm:mb-4 flex-grow line-clamp-2">
          {item.description || 'Sem descrição'}
        </p>

        {/* Ações de compartilhamento direto: WhatsApp e Legenda */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all active:scale-95"
            title="Enviar novidade no WhatsApp para contatos ou grupos"
          >
            <WhatsAppIcon size={13} className="shrink-0 text-emerald-600" />
            <span className="truncate">WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={handleCopyCaption}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all active:scale-95 ${
              isCaptionCopied
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : 'bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200'
            }`}
            title="Copiar legenda com emojis e link para colar no Instagram"
          >
            {isCaptionCopied ? (
              <>
                <Check size={13} className="text-emerald-600 shrink-0" />
                <span className="truncate">Copiado!</span>
              </>
            ) : (
              <>
                <Share2 size={13} className="shrink-0" />
                <span className="truncate">Legenda</span>
              </>
            )}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mt-auto pt-3 sm:pt-4 border-t border-slate-100">
          <span className={`font-bold text-base sm:text-xl ${item.is_sold ? 'text-slate-500' : 'text-emerald-600'}`}>
            {formatPrice(item.price)}
          </span>

          {isAuthenticated && (
            <div className="flex gap-1">
              <button
                onClick={(e) => onToggleSold?.(item.id, item.is_sold, e)}
                title={item.is_sold ? 'Disponibilizar' : 'Vender'}
                className={`p-2 rounded-lg transition-colors ${item.is_sold ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-500 hover:bg-amber-50'}`}
              >
                <Tag size={18} className={item.is_sold ? '' : 'fill-current'} />
              </button>
              <button
                onClick={(e) => onEdit?.(item, e)}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={(e) => onDelete?.(item.id, e)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
