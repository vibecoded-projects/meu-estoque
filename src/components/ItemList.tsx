'use client'

import { useState, useEffect } from 'react';
import { authenticateNamespace, logoutNamespace, createItem, updateItem, deleteItem, toggleItemSold } from '@/app/actions';
import { Lock, Unlock, Plus, Pencil, Trash2, LogOut, Image as ImageIcon, Tag, Copy, Check, Download, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Item = {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  is_sold: boolean;
};

export function ItemList({ initialItems, slug, isAuthenticated: initialAuth }: { initialItems: Item[], slug: string, isAuthenticated: boolean }) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);
  
  // Modais de Ação
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  
  // View Item Modal
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [isCopied, setIsCopied] = useState(false);

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
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const res = await authenticateNamespace(slug, authCode);
    if (res.success) {
      setIsAuthenticated(true);
      setIsAuthModalOpen(false);
      setAuthCode('');
    } else {
      setAuthError(res.message);
    }
  };

  const handleLogout = async () => {
    await logoutNamespace(slug);
    setIsAuthenticated(false);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setTitle('');
    setDescription('');
    setPrice('');
    setImageFile(null);
    setImageUrl('');
    setIsItemModalOpen(true);
  };

  const openEditModal = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita abrir o modal de visualização
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || '');
    setPrice(item.price.toString());
    setImageFile(null);
    setImageUrl(item.image_url || '');
    setIsItemModalOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
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
      let finalImageUrl = imageUrl;

      if (imageFile) {
        finalImageUrl = await handleImageUpload(imageFile);
      }

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('image_url', finalImageUrl);

      let res;
      if (editingItem) {
        res = await updateItem(slug, editingItem.id, formData);
      } else {
        res = await createItem(slug, formData);
      }

      if (res.success) {
        setIsItemModalOpen(false);
        window.location.reload(); 
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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir este item?')) {
      const res = await deleteItem(slug, id);
      if (res.success) {
        setItems(items.filter(item => item.id !== id));
      } else {
        alert(res.message);
      }
    }
  };

  const handleToggleSold = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await toggleItemSold(slug, id, currentStatus);
    if (res.success) {
      setItems(items.map(item => item.id === id ? { ...item, is_sold: !currentStatus } : item));
    } else {
      alert(res.message);
    }
  };

  const copyItemDetails = (item: Item) => {
    const formatPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price);
    const text = `Produto: ${item.title}\nPreço: ${formatPrice}\nDescrição: ${item.description || 'Sem descrição'}\nStatus: ${item.is_sold ? 'Vendido' : 'Disponível'}`;
    
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleDownloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Erro ao baixar a imagem", error);
      window.open(url, '_blank');
    }
  };

  return (
    <>
      <div className="flex justify-end mb-6">
        {!isAuthenticated ? (
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-lg hover:bg-slate-700 active:scale-95 transition-all shadow-sm font-medium"
          >
            <Lock size={18} />
            Acesso Restrito
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

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
          <ImageIcon className="text-slate-300 mb-4" size={64} />
          <p className="text-slate-500 font-medium text-lg">Nenhum item cadastrado.</p>
          <p className="text-slate-400 text-sm mt-1">Sua vitrine está vazia no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map(item => (
            <div 
              key={item.id} 
              onClick={() => setViewingItem(item)}
              className={`bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative group flex flex-col ${item.is_sold ? 'opacity-80' : ''}`}
            >
              {/* Badge de Vendido */}
              {item.is_sold && (
                <div className="absolute top-3 left-3 bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md z-10 tracking-wider">
                  VENDIDO
                </div>
              )}

              <div className="relative overflow-hidden aspect-square">
                {item.image_url ? (
                  <img 
                    src={item.image_url} 
                    alt={item.title} 
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${item.is_sold ? 'grayscale-[60%]' : ''}`} 
                  />
                ) : (
                  <div className={`w-full h-full bg-slate-50 flex items-center justify-center ${item.is_sold ? 'grayscale-[60%]' : ''}`}>
                    <ImageIcon className="text-slate-300" size={48} />
                  </div>
                )}
                {item.is_sold && <div className="absolute inset-0 bg-white/20"></div>}
              </div>
              
              <div className="p-5 flex flex-col flex-grow">
                <h3 className={`font-bold text-lg leading-tight mb-2 ${item.is_sold ? 'text-slate-500 line-through decoration-slate-400' : 'text-slate-800'}`}>
                  {item.title}
                </h3>
                
                <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-grow">
                  {item.description || "Sem descrição"}
                </p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                  <span className={`font-bold text-xl ${item.is_sold ? 'text-slate-500' : 'text-emerald-600'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                  </span>
                  
                  {isAuthenticated && (
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => handleToggleSold(item.id, item.is_sold, e)} 
                        title={item.is_sold ? "Disponibilizar" : "Vender"}
                        className={`p-2 rounded-lg transition-colors ${item.is_sold ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-500 hover:bg-amber-50'}`}
                      >
                        <Tag size={18} className={item.is_sold ? "" : "fill-current"} />
                      </button>
                      <button 
                        onClick={(e) => openEditModal(item, e)} 
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(item.id, e)} 
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Visualização (Item Details) */}
      {viewingItem && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity"
          onClick={() => setViewingItem(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="md:w-1/2 relative bg-slate-100 aspect-square md:aspect-auto group">
              {viewingItem.is_sold && (
                <div className="absolute top-4 left-4 bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md z-10 tracking-wider">
                  VENDIDO
                </div>
              )}
              {viewingItem.image_url ? (
                <>
                  <img 
                    src={viewingItem.image_url} 
                    alt={viewingItem.title} 
                    className={`w-full h-full object-cover ${viewingItem.is_sold ? 'grayscale-[60%]' : ''}`} 
                  />
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <button 
                      onClick={() => handleDownloadImage(viewingItem.image_url, viewingItem.title)}
                      className="bg-white/90 backdrop-blur-sm text-slate-800 p-2 rounded-lg shadow-md hover:bg-white transition-all flex items-center justify-center"
                      title="Baixar imagem"
                    >
                      <Download size={18} />
                    </button>
                    <a 
                      href={viewingItem.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-white/90 backdrop-blur-sm text-slate-800 p-2 rounded-lg shadow-md hover:bg-white transition-all flex items-center justify-center"
                      title="Abrir original"
                    >
                      <ExternalLink size={18} />
                    </a>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="text-slate-300" size={64} />
                </div>
              )}
            </div>

            <div className="md:w-1/2 p-6 md:p-8 flex flex-col">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{viewingItem.title}</h2>
              <span className={`font-bold text-3xl mb-6 ${viewingItem.is_sold ? 'text-slate-500' : 'text-emerald-600'}`}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(viewingItem.price)}
              </span>
              
              <div className="bg-slate-50 rounded-lg p-4 mb-6 flex-grow">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Descrição do Produto</h4>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {viewingItem.description || "Nenhuma descrição detalhada fornecida."}
                </p>
              </div>

              <div className="flex gap-3 mt-auto">
                <button 
                  onClick={() => copyItemDetails(viewingItem)}
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
                      setViewingItem(null);
                      openEditModal(viewingItem, e);
                    }} 
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    <Pencil size={16} />
                    Editar
                  </button>
                  <button 
                    onClick={(e) => {
                      handleDelete(viewingItem.id, e);
                      // Se deletar com sucesso, a página vai recarregar ou o item sumirá.
                      // O ideal é fechar o modal.
                      setViewingItem(null);
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
      )}

      {/* Modal de Autenticação */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Unlock size={24} className="text-slate-700" />
            </div>
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Acesso Restrito</h2>
            <p className="text-center text-slate-500 mb-6 text-sm">Insira o PIN da loja para editar os itens.</p>
            
            <form onSubmit={handleAuth}>
              <div className="mb-6">
                <input 
                  type="password" 
                  maxLength={4}
                  required
                  autoFocus
                  value={authCode}
                  onChange={e => setAuthCode(e.target.value)}
                  className="w-full p-4 border border-slate-200 rounded-xl text-center text-3xl tracking-[1em] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono"
                  placeholder="••••"
                />
                {authError && <p className="text-rose-500 text-sm mt-2 text-center font-medium">{authError}</p>}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsAuthModalOpen(false)} className="flex-1 py-3 px-4 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors shadow-sm">Entrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Adicionar/Editar Item */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full my-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">{editingItem ? 'Editar Produto' : 'Novo Produto'}</h2>
            <form onSubmit={handleSaveItem} className="space-y-5">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Título do Produto</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
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
                  onChange={e => setPrice(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descrição</label>
                <textarea 
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                  placeholder="Detalhes do produto..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Foto do Produto</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => setImageFile(e.target.files?.[0] || null)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all cursor-pointer"
                />
                {imageUrl && !imageFile && (
                  <div className="mt-3 relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                    <img src={imageUrl} alt="Atual" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-8">
                <button 
                  type="button" 
                  onClick={() => setIsItemModalOpen(false)} 
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
      )}
    </>
  );
}
