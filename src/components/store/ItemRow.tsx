'use client';

import { Image as ImageIcon, Copy, Check, Tag, Pencil, Trash2 } from 'lucide-react';
import { parseImages, formatPrice } from '@/lib/format';
import type { Item } from '@/lib/types';

interface ItemRowProps {
  item: Item;
  isAuthenticated: boolean;
  onClick: () => void;
  onCopyTitle: (item: Item, e: React.MouseEvent) => void;
  isCopiedTitle: boolean;
  onToggleSold?: (id: string, currentStatus: boolean, e: React.MouseEvent) => void;
  onEdit?: (item: Item, e: React.MouseEvent) => void;
  onDelete?: (id: string, e: React.MouseEvent) => void;
}

export function ItemRow({
  item,
  isAuthenticated,
  onClick,
  onCopyTitle,
  isCopiedTitle,
  onToggleSold,
  onEdit,
  onDelete,
}: ItemRowProps) {
  const urls = parseImages(item.image_url);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative group flex flex-row min-h-[120px] sm:min-h-[160px] ${item.is_sold ? 'opacity-80' : ''}`}
    >
      {/* Badge de Vendido */}
      {item.is_sold && (
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-rose-600 text-white text-[10px] sm:text-xs font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-md z-10 tracking-wider">
          VENDIDO
        </div>
      )}

      <div className="relative overflow-hidden w-1/3 sm:w-48 shrink-0 flex flex-col justify-center bg-slate-50 border-r border-slate-100">
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
                  <ImageIcon size={14} /> +{urls.length - 1}
                </div>
              )}
            </>
          ) : (
            <div className={`w-full h-full bg-slate-50 flex items-center justify-center ${item.is_sold ? 'grayscale-[60%]' : ''}`}>
              <ImageIcon className="text-slate-300" size={32} />
            </div>
          )}
          {item.is_sold && <div className="absolute inset-0 bg-white/20"></div>}
        </div>
      </div>

      <div className="p-3 sm:p-5 flex flex-col flex-grow justify-between min-w-0">
        <div className="flex items-start justify-between gap-1 sm:gap-2 mb-1 sm:mb-2">
          <h3 className={`font-bold text-sm sm:text-lg leading-tight truncate ${item.is_sold ? 'text-slate-500 line-through decoration-slate-400' : 'text-slate-800'} text-base sm:text-xl whitespace-normal line-clamp-2`}>
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

        <p className="text-xs sm:text-sm text-slate-500 mb-2 sm:mb-4 flex-grow line-clamp-3 sm:line-clamp-4">
          {item.description || 'Sem descrição'}
        </p>

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
