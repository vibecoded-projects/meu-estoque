'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createItem, updateItem } from '@/app/actions';
import { createUploadUrl } from '@/app/actions/upload';
import { supabase } from '@/lib/supabase';
import { parseImages } from '@/lib/format';
import { compressImage } from '@/lib/imageCompression';
import type { Item } from '@/lib/types';

interface ItemFormModalProps {
  isOpen: boolean;
  slug: string;
  editingItem: Item | null;
  onClose: () => void;
  onSaved?: () => void;
}

interface ItemFormModalContentProps {
  slug: string;
  editingItem: Item | null;
  onClose: () => void;
  onSaved?: () => void;
}

function ItemFormModalContent({
  slug,
  editingItem,
  onClose,
  onSaved,
}: ItemFormModalContentProps) {
  const [title, setTitle] = useState(editingItem?.title || '');
  const [description, setDescription] = useState(editingItem?.description || '');
  const [price, setPrice] = useState(editingItem ? editingItem.price.toString() : '');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>(() => parseImages(editingItem?.image_url));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStatus, setCompressionStatus] = useState<string>('');

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = Array.from(e.target.files);
    e.target.value = '';

    setIsCompressing(true);
    try {
      const processed: File[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setCompressionStatus(
          selectedFiles.length > 1
            ? `Otimizando foto ${i + 1} de ${selectedFiles.length}…`
            : 'Otimizando foto…'
        );
        const compressed = await compressImage(file);
        processed.push(compressed);
      }
      setImageFiles((prev) => [...prev, ...processed]);
    } catch (err) {
      console.error('Erro ao otimizar foto:', err);
      setImageFiles((prev) => [...prev, ...selectedFiles]);
    } finally {
      setIsCompressing(false);
      setCompressionStatus('');
    }
  };

  const handleImageUpload = async (file: File) => {
    const readyFile = await compressImage(file);
    const rawExt = readyFile.name.split('.').pop() || 'webp';
    const ext = rawExt.toLowerCase().replace(/^\./, '').trim();

    // 1. Solicitar URL de upload assinada pelo servidor (RNF06 / D7)
    const uploadRes = await createUploadUrl(slug, ext);
    if (!uploadRes.success || !uploadRes.data) {
      throw new Error(uploadRes.message || 'Erro ao gerar URL assinada de upload.');
    }

    const { token, path, publicUrl } = uploadRes.data;

    // 2. Fazer o upload seguro usando a autorização temporária da URL assinada
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .uploadToSignedUrl(path, token, readyFile);

    if (uploadError) {
      throw uploadError;
    }

    return publicUrl;
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalImageUrls = [...imageUrls];

      if (imageFiles.length > 0) {
        const newUploadedUrls: string[] = [];
        for (const file of imageFiles) {
          const url = await handleImageUpload(file);
          newUploadedUrls.push(url);
        }
        finalImageUrls = [...finalImageUrls, ...newUploadedUrls];
      }

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('image_url', JSON.stringify(finalImageUrls));

      let res;
      if (editingItem) {
        res = await updateItem(slug, editingItem.id, formData);
      } else {
        res = await createItem(slug, formData);
      }

      if (res.success) {
        onClose();
        if (onSaved) {
          onSaved();
        } else {
          window.location.reload();
        }
      } else {
        alert(res.message);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">
            {editingItem ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          <form onSubmit={handleSaveItem} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Título do Produto</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                placeholder="Ex: iPhone 13 Pro"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Preço (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descrição</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none text-slate-900"
                placeholder="Detalhes do produto..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fotos do Produto</label>
              <input
                type="file"
                accept="image/*,.heic,.heif,image/heic,image/heif"
                multiple
                disabled={isSubmitting || isCompressing}
                onChange={handleFilesSelected}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all cursor-pointer text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
              />

              {isCompressing && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-2.5 flex items-center gap-2 p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs font-medium text-indigo-800"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                  <span>{compressionStatus || 'Otimizando foto…'}</span>
                </div>
              )}

              {(imageUrls.length > 0 || imageFiles.length > 0) && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {imageUrls.map((url, i) => (
                    <div key={`url-${i}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 group">
                      <img src={url} alt={`Atual ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrls((prev) => prev.filter((_, index) => index !== i))}
                        className="absolute top-1 right-1 bg-rose-500/90 hover:bg-rose-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                        title="Remover imagem"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {imageFiles.map((file, i) => (
                    <div key={`file-${i}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 group">
                      <img src={URL.createObjectURL(file)} alt={`Nova ${i + 1}`} className="w-full h-full object-cover opacity-80" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">NOVA</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImageFiles((prev) => prev.filter((_, index) => index !== i))}
                        className="absolute top-1 right-1 bg-rose-500/90 hover:bg-rose-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                        title="Remover nova imagem"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                disabled={isSubmitting || isCompressing}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSubmitting || isCompressing}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Salvando...</span>
                  </>
                ) : isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Otimizando...</span>
                  </>
                ) : (
                  'Salvar Produto'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function ItemFormModal({
  isOpen,
  slug,
  editingItem,
  onClose,
  onSaved,
}: ItemFormModalProps) {
  if (!isOpen) return null;

  return (
    <ItemFormModalContent
      key={editingItem ? editingItem.id : 'new'}
      slug={slug}
      editingItem={editingItem}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
