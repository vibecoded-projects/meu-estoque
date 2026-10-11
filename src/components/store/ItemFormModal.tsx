'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createItem, updateItem } from '@/app/actions';
import { supabase } from '@/lib/supabase';
import { parseImages } from '@/lib/format';
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

  const handleImageUpload = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${slug}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
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
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    setImageFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                  }
                }}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all cursor-pointer text-slate-900"
              />

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
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Produto'}
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
