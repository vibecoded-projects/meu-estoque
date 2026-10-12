'use client';

import { useState, useEffect } from 'react';
import { logoutNamespace, deleteItem, toggleItemSold } from '@/app/actions';
import { Lock, Plus, LogOut, Image as ImageIcon, LayoutGrid, List as ListIcon } from 'lucide-react';
import type { Item, Namespace } from '@/lib/types';
import { StoreHeader } from './store/StoreHeader';
import { AuthModal } from './store/AuthModal';
import { ItemFormModal } from './store/ItemFormModal';
import { ProductModal } from './store/ProductModal';
import { ItemCard } from './store/ItemCard';
import { ItemRow } from './store/ItemRow';
import { ConciergeButton } from './store/ConciergeButton';
import { TrialBanner } from './store/TrialBanner';
import { getStoreLifecycle, type StoreLifecycle } from '@/lib/lifecycle';

export function ItemList({
  initialItems,
  slug,
  isAuthenticated: initialAuth,
  namespace: initialNamespace,
  lifecycle: initialLifecycle,
  onShared,
}: {
  initialItems: Item[];
  slug: string;
  isAuthenticated: boolean;
  namespace: Namespace;
  lifecycle?: StoreLifecycle;
  onShared?: () => void;
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [namespace, setNamespace] = useState(initialNamespace);
  const lifecycle = initialLifecycle ?? getStoreLifecycle(namespace);

  // Modais de Ação
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Modal de Detalhes do Produto
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [copiedTitleId, setCopiedTitleId] = useState<string | null>(null);

  const copyTitleOnly = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.title).then(() => {
      setCopiedTitleId(item.id);
      setTimeout(() => setCopiedTitleId(null), 2000);
    });
  };

  // Esc para fechar modais
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewingItem(null);
        setIsItemModalOpen(false);
        setIsAuthModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logoutNamespace(slug);
    setIsAuthenticated(false);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const openEditModal = (item: Item, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Evita abrir o modal de visualização
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Tem certeza que deseja excluir este item?')) {
      const res = await deleteItem(slug, id);
      if (res.success) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert(res.message);
      }
    }
  };

  const handleToggleSold = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await toggleItemSold(slug, id, currentStatus);
    if (res.success) {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_sold: !currentStatus } : item)));
    } else {
      alert(res.message);
    }
  };

  return (
    <>
      <TrialBanner
        lifecycle={lifecycle}
        isAuthenticated={isAuthenticated}
        slug={slug}
        storeName={namespace.name}
      />

      <StoreHeader
        slug={slug}
        namespace={namespace}
        isAuthenticated={isAuthenticated}
        onUpdateNamespace={setNamespace}
        onShared={onShared}
      />

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-slate-100 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            title="Visualização em Grade"
          ><LayoutGrid size={20} /></button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            title="Visualização em Lista"
          ><ListIcon size={20} /></button>
        </div>

        {!isAuthenticated ? (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-lg hover:bg-slate-700 active:scale-95 transition-all shadow-sm font-medium"
          >
            <Lock size={18} />
            Editar Itens
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all shadow-sm font-medium"
            >
              <Plus size={18} />
              Novo Produto
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-5 py-2.5 rounded-lg hover:bg-slate-50 active:scale-95 transition-all shadow-sm font-medium"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        )}
      </div>

      {isAuthenticated && (
        <ConciergeButton
          itemsCount={items.length}
          slug={slug}
          storeName={namespace.name}
          isAuthenticated={isAuthenticated}
        />
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
          <ImageIcon className="text-slate-300 mb-4" size={64} />
          <p className="text-slate-500 font-medium text-lg">Nenhum item cadastrado.</p>
          <p className="text-slate-400 text-sm mt-1">Sua vitrine está vazia no momento.</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6' : 'flex flex-col gap-3 sm:gap-4'}>
          {items.map((item) =>
            viewMode === 'grid' ? (
              <ItemCard
                key={item.id}
                item={item}
                slug={slug}
                isAuthenticated={isAuthenticated}
                onClick={() => setViewingItem(item)}
                onCopyTitle={copyTitleOnly}
                isCopiedTitle={copiedTitleId === item.id}
                onToggleSold={handleToggleSold}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onShared={onShared}
              />
            ) : (
              <ItemRow
                key={item.id}
                item={item}
                slug={slug}
                isAuthenticated={isAuthenticated}
                onClick={() => setViewingItem(item)}
                onCopyTitle={copyTitleOnly}
                isCopiedTitle={copiedTitleId === item.id}
                onToggleSold={handleToggleSold}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onShared={onShared}
              />
            )
          )}
        </div>
      )}

      {/* Modal de Detalhes do Produto */}
      <ProductModal
        item={viewingItem}
        slug={slug}
        isAuthenticated={isAuthenticated}
        whatsapp={namespace.whatsapp}
        storeUrl={typeof window !== 'undefined' ? `${window.location.origin}/${slug}` : undefined}
        namespace={namespace}
        onClose={() => setViewingItem(null)}
        onEdit={(item, e) => openEditModal(item, e)}
        onDelete={(id, e) => handleDelete(id, e)}
        onShared={onShared}
      />
      {/* Modal de Autenticação */}
      <AuthModal
        isOpen={isAuthModalOpen}
        slug={slug}
        onSuccess={() => {
          setIsAuthenticated(true);
          setIsAuthModalOpen(false);
        }}
        onClose={() => setIsAuthModalOpen(false)}
      />
      {/* Modal de Adicionar/Editar Item */}
      <ItemFormModal
        isOpen={isItemModalOpen}
        slug={slug}
        editingItem={editingItem}
        onClose={() => setIsItemModalOpen(false)}
      />
    </>
  );
}
