'use client'

import { useState, useEffect } from 'react';
import { authenticateNamespace, logoutNamespace, createItem, updateItem, deleteItem, toggleItemSold, updateNamespace } from '@/app/actions';
import { Lock, Unlock, Plus, Pencil, Trash2, LogOut, Image as ImageIcon, Tag, Copy, Check, Download, ExternalLink, X, Save, LayoutGrid, List as ListIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const parseImages = (urlStr: string | null | undefined): string[] => {
  if (!urlStr) return [];
  try {
    const parsed = JSON.parse(urlStr);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}
  return urlStr.split(',').filter(Boolean);
};

type Item = {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  is_sold: boolean;
};

type Namespace = {
  id: string;
  slug: string;
  name: string;
  subtitle?: string;
};

export function ItemList({ initialItems, slug, isAuthenticated: initialAuth, namespace: initialNamespace }: { initialItems: Item[], slug: string, isAuthenticated: boolean, namespace: Namespace }) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);
  
  // View Mode State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Namespace State
  const [namespace, setNamespace] = useState(initialNamespace);
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerName, setHeaderName] = useState(initialNamespace.name || slug);
  const [headerSubtitle, setHeaderSubtitle] = useState(initialNamespace.subtitle || 'Catálogo de produtos');
  const [isSavingHeader, setIsSavingHeader] = useState(false);

  // Modais de Ação
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  
  // View Item Modal
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [isCopied, setIsCopied] = useState(false);
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
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
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
    setImageFiles([]);
    setImageUrls([]);
    setIsItemModalOpen(true);
  };

  const openEditModal = (item: Item, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita abrir o modal de visualização
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || '');
    setPrice(item.price.toString());
    setImageFiles([]);
    setImageUrls(parseImages(item.image_url));
    setIsItemModalOpen(true);
  };

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
        const newUploadedUrls = [];
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

  const handleSaveHeader = async () => {
    setIsSavingHeader(true);
    try {
      const formData = new FormData();
      formData.append('name', headerName);
      formData.append('subtitle', headerSubtitle);
      
      const res = await updateNamespace(slug, formData);
      if (res.success) {
        setNamespace({ ...namespace, name: headerName, subtitle: headerSubtitle });
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
    <>
      <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="w-full flex-1">
          {isEditingHeader ? (
            <div className="space-y-3">
              <input 
                type="text" 
                value={headerName}
                onChange={e => setHeaderName(e.target.value)}
                className="w-full p-2 text-2xl font-bold text-gray-900 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Nome da loja"
              />
              <input 
                type="text" 
                value={headerSubtitle}
                onChange={e => setHeaderSubtitle(e.target.value)}
                className="w-full p-2 text-sm text-gray-500 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Subtítulo ou descrição da loja"
              />
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => {
                    setHeaderName(namespace.name || slug);
                    setHeaderSubtitle(namespace.subtitle || 'Catálogo de produtos');
                    setIsEditingHeader(false);
                  }}
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
                  onClick={() => setIsEditingHeader(true)}
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

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          <button 
            onClick={() => setViewMode('grid')} 
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-slate-100 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            title="Visualização em Grade"
          >
            <LayoutGrid size={20} />
          </button>
          <button 
            onClick={() => setViewMode('list')} 
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            title="Visualização em Lista"
          >
            <ListIcon size={20} />
          </button>
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

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
          <ImageIcon className="text-slate-300 mb-4" size={64} />
          <p className="text-slate-500 font-medium text-lg">Nenhum item cadastrado.</p>
          <p className="text-slate-400 text-sm mt-1">Sua vitrine está vazia no momento.</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6" : "flex flex-col gap-3 sm:gap-4"}>
          {items.map(item => (
            <div 
              key={item.id} 
              onClick={() => setViewingItem(item)}
              className={`bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative group flex ${viewMode === 'grid' ? 'flex-col' : 'flex-row min-h-[120px] sm:min-h-[160px]'} ${item.is_sold ? 'opacity-80' : ''}`}
            >
              {/* Badge de Vendido */}
              {item.is_sold && (
                <div className={`absolute ${viewMode === 'grid' ? 'top-2 left-2 sm:top-3 sm:left-3' : 'top-2 left-2 sm:top-3 sm:left-3'} bg-rose-600 text-white text-[10px] sm:text-xs font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-md z-10 tracking-wider`}>
                  VENDIDO
                </div>
              )}

              <div className={`relative overflow-hidden ${viewMode === 'grid' ? 'aspect-square' : 'w-1/3 sm:w-48 shrink-0 flex flex-col justify-center bg-slate-50 border-r border-slate-100'}`}>
                <div className={`w-full h-full absolute inset-0`}>
                  {(() => {
                  const urls = parseImages(item.image_url);
                  if (urls.length > 0) {
                    return (
                      <>
                        <img 
                          src={urls[0]} 
                          alt={item.title} 
                          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${item.is_sold ? 'grayscale-[60%]' : ''}`} 
                        />
                        {urls.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md backdrop-blur-sm shadow flex items-center gap-1">
                            <ImageIcon size={viewMode === 'grid' ? 12 : 14} /> +{urls.length - 1}
                          </div>
                        )}
                      </>
                    );
                  } else {
                    return (
                      <div className={`w-full h-full bg-slate-50 flex items-center justify-center ${item.is_sold ? 'grayscale-[60%]' : ''}`}>
                        <ImageIcon className="text-slate-300" size={viewMode === 'grid' ? 48 : 32} />
                      </div>
                    );
                  }
                })()}
                {item.is_sold && <div className="absolute inset-0 bg-white/20"></div>}
                </div>
              </div>
              
              <div className={`p-3 sm:p-5 flex flex-col flex-grow ${viewMode === 'list' ? 'justify-between min-w-0' : ''}`}>
                <div className="flex items-start justify-between gap-1 sm:gap-2 mb-1 sm:mb-2">
                  <h3 className={`font-bold text-sm sm:text-lg leading-tight truncate ${item.is_sold ? 'text-slate-500 line-through decoration-slate-400' : 'text-slate-800'} ${viewMode === 'list' ? 'text-base sm:text-xl whitespace-normal line-clamp-2' : ''}`}>
                    {item.title}
                  </h3>
                  <button
                    onClick={(e) => copyTitleOnly(item, e)}
                    className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded-md hover:bg-indigo-50 shrink-0"
                    title="Copiar título do produto"
                  >
                    {copiedTitleId === item.id ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>
                
                <p className={`text-xs sm:text-sm text-slate-500 mb-2 sm:mb-4 flex-grow ${viewMode === 'grid' ? 'line-clamp-2' : 'line-clamp-3 sm:line-clamp-4'}`}>
                  {item.description || "Sem descrição"}
                </p>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mt-auto pt-3 sm:pt-4 border-t border-slate-100">
                  <span className={`font-bold text-base sm:text-xl ${item.is_sold ? 'text-slate-500' : 'text-emerald-600'}`}>
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
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto transition-opacity"
          onClick={() => setViewingItem(null)}
        >
          <div className="min-h-full flex items-center justify-center p-4 py-8">
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
              {(() => {
                const urls = parseImages(viewingItem.image_url);
                if (urls.length > 0) {
                  return (
                    <div className="flex overflow-x-auto snap-x snap-mandatory w-full h-full hide-scrollbar">
                      {urls.map((url, idx) => (
                        <div key={idx} className="min-w-full h-full snap-start relative">
                          <img 
                            src={url} 
                            alt={viewingItem.title} 
                            className={`w-full h-full object-cover ${viewingItem.is_sold ? 'grayscale-[60%]' : ''}`} 
                          />
                          <div className="absolute bottom-4 right-4 flex gap-2">
                            <button 
                              onClick={() => handleDownloadImage(url, `${viewingItem.title}-${idx}`)}
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
                  );
                }
                return (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="text-slate-300" size={64} />
                  </div>
                );
              })()}
            </div>

            <div className="md:w-1/2 p-6 md:p-8 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-2xl font-bold text-slate-800">{viewingItem.title}</h2>
                <button
                  onClick={(e) => copyTitleOnly(viewingItem, e)}
                  className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-indigo-50 shrink-0"
                  title="Copiar título do produto"
                >
                  {copiedTitleId === viewingItem.id ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                </button>
              </div>
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
        </div>
      )}

      {/* Modal de Autenticação */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Unlock size={24} className="text-slate-700" />
            </div>
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Editar Itens</h2>
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
                  className="w-full p-4 border border-slate-200 rounded-xl text-center text-3xl tracking-[1em] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-slate-900"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4 py-8">
            <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">{editingItem ? 'Editar Produto' : 'Novo Produto'}</h2>
            <form onSubmit={handleSaveItem} className="space-y-5">
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Título do Produto</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
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
                  onChange={e => setPrice(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descrição</label>
                <textarea 
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
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
                  onChange={e => {
                    if (e.target.files) {
                      setImageFiles(prev => [...prev, ...Array.from(e.target.files!)]);
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
                          onClick={() => setImageUrls(prev => prev.filter((_, index) => index !== i))} 
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
                          onClick={() => setImageFiles(prev => prev.filter((_, index) => index !== i))} 
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
        </div>
      )}
    </>
  );
}
