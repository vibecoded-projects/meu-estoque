'use client';

import { useState } from 'react';
import { Image as ImageIcon, Copy, Check, Download, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { parseImages, formatPrice, formatItemDetails } from '@/lib/format';
import type { Item } from '@/lib/types';

interface ProductModalProps {
  item: Item | null;
  isAuthenticated: boolean;
  onClose: () => void;
  onEdit?: (item: Item, e: React.MouseEvent) => void;
  onDelete?: (id: string, e: React.MouseEvent) => void;
}

export function ProductModal({
  item,
  isAuthenticated,
  onClose,
  onEdit,
  onDelete,
}: ProductModalProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isTitleCopied, setIsTitleCopied] = useState(false);

  if (!item) return null;

  const copyTitleOnly = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.title).then(() => {
      setIsTitleCopied(true);
      setTimeout(() => setIsTitleCopied(false), 2000);
    });
  };

  const copyItemDetails = () => {
    const text = formatItemDetails(item);
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleDownloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();

      const fileNameStr = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;

      // Attempt to use Web Share API for mobile devices (allows saving directly to gallery)
      if (navigator.canShare) {
        const file = new File([blob], fileNameStr, { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: filename,
            });
            return; // Se compartilhou/salvou com sucesso, não precisa fazer o download tradicional
          } catch (shareError) {
            console.log('Compartilhamento cancelado ou falhou:', shareError);
            return; // Se o usuário cancelar, interrompe a ação sem forçar o download tradicional
          }
        }
      }

      // Fallback para download tradicional (Desktop ou navegadores sem suporte ao Web Share de arquivos)
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileNameStr;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Erro ao baixar a imagem', error);
      window.open(url, '_blank');
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

            <div className="flex gap-3 mt-auto">
              <button
                onClick={copyItemDetails}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white transition-all ${isCopied ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-800 hover:bg-slate-900'}`}
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
