'use client';

import { useState } from 'react';
import { Pencil, Save } from 'lucide-react';
import { updateNamespace } from '@/app/actions';
import type { Namespace } from '@/lib/types';

interface StoreHeaderProps {
  slug: string;
  namespace: Namespace;
  isAuthenticated: boolean;
  onUpdateNamespace?: (updated: Namespace) => void;
}

export function StoreHeader({ slug, namespace, isAuthenticated, onUpdateNamespace }: StoreHeaderProps) {
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerName, setHeaderName] = useState(namespace.name || slug);
  const [headerSubtitle, setHeaderSubtitle] = useState(namespace.subtitle || 'Catálogo de produtos');
  const [isSavingHeader, setIsSavingHeader] = useState(false);

  const startEditing = () => {
    setHeaderName(namespace.name || slug);
    setHeaderSubtitle(namespace.subtitle || 'Catálogo de produtos');
    setIsEditingHeader(true);
  };

  const cancelEditing = () => {
    setHeaderName(namespace.name || slug);
    setHeaderSubtitle(namespace.subtitle || 'Catálogo de produtos');
    setIsEditingHeader(false);
  };

  const handleSaveHeader = async () => {
    setIsSavingHeader(true);
    try {
      const formData = new FormData();
      formData.append('name', headerName);
      formData.append('subtitle', headerSubtitle);

      const res = await updateNamespace(slug, formData);
      if (res.success) {
        onUpdateNamespace?.({ ...namespace, name: headerName, subtitle: headerSubtitle });
        setIsEditingHeader(false);
      } else {
        alert(res.message);
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao atualizar a loja.');
    } finally {
      setIsSavingHeader(false);
    }
  };

  return (
    <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
      <div className="w-full flex-1">
        {isEditingHeader ? (
          <div className="space-y-3">
            <input
              type="text"
              value={headerName}
              onChange={(e) => setHeaderName(e.target.value)}
              className="w-full p-2 text-2xl font-bold text-gray-900 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Nome da loja"
            />
            <input
              type="text"
              value={headerSubtitle}
              onChange={(e) => setHeaderSubtitle(e.target.value)}
              className="w-full p-2 text-sm text-gray-500 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Subtítulo ou descrição da loja"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={cancelEditing}
                className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 rounded font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveHeader}
                disabled={isSavingHeader}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded font-medium flex items-center gap-1"
              >
                {isSavingHeader ? 'Salvando...' : <><Save size={14} /> Salvar</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start w-full">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{namespace.name || slug}</h1>
              <p className="text-sm text-gray-500 mt-1">{namespace.subtitle || 'Catálogo de produtos'}</p>
            </div>
            {isAuthenticated && (
              <button
                onClick={startEditing}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shrink-0 ml-4"
                title="Editar título e subtítulo"
              >
                <Pencil size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
