'use client';

import { useState } from 'react';
import { Pencil, Save, Phone, AlertCircle, Copy, Check, Link2, ListPlus } from 'lucide-react';
import { updateNamespace, markShared } from '@/app/actions';
import { formatBrazilianPhone, normalizeBrazilianPhone } from '@/lib/phone';
import { copyToClipboard, getStoreUrl } from '@/lib/share';
import type { Namespace } from '@/lib/types';
import { BatchImportModal } from './BatchImportModal';

function InstagramIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

interface StoreHeaderProps {
  slug: string;
  namespace: Namespace;
  isAuthenticated: boolean;
  onUpdateNamespace?: (updated: Namespace) => void;
  onShared?: () => void;
  onImportSuccess?: () => void;
}

export function StoreHeader({
  slug,
  namespace,
  isAuthenticated,
  onUpdateNamespace,
  onShared,
  onImportSuccess,
}: StoreHeaderProps) {
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerName, setHeaderName] = useState(namespace.name || slug);
  const [headerSubtitle, setHeaderSubtitle] = useState(namespace.subtitle || 'Catálogo de produtos');
  const [headerWhatsapp, setHeaderWhatsapp] = useState(formatBrazilianPhone(namespace.whatsapp || ''));
  const [headerInstagram, setHeaderInstagram] = useState(namespace.instagram_handle || '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSavingHeader, setIsSavingHeader] = useState(false);
  const [isBioCopied, setIsBioCopied] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  const startEditing = () => {
    setHeaderName(namespace.name || slug);
    setHeaderSubtitle(namespace.subtitle || 'Catálogo de produtos');
    setHeaderWhatsapp(formatBrazilianPhone(namespace.whatsapp || ''));
    setHeaderInstagram(namespace.instagram_handle || '');
    setValidationError(null);
    setIsEditingHeader(true);
  };

  const cancelEditing = () => {
    setHeaderName(namespace.name || slug);
    setHeaderSubtitle(namespace.subtitle || 'Catálogo de produtos');
    setHeaderWhatsapp(formatBrazilianPhone(namespace.whatsapp || ''));
    setHeaderInstagram(namespace.instagram_handle || '');
    setValidationError(null);
    setIsEditingHeader(false);
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBrazilianPhone(e.target.value);
    setHeaderWhatsapp(formatted);
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleInstagramChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove o '@' inicial caso o lojista cole o handle completo
    const clean = e.target.value.replace(/^@+/, '');
    setHeaderInstagram(clean);
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleSaveHeader = async () => {
    const trimmedName = headerName.trim();
    if (!trimmedName) {
      setValidationError('Nome da loja é obrigatório.');
      return;
    }
    if (trimmedName.length > 100) {
      setValidationError('Nome da loja deve ter no máximo 100 caracteres.');
      return;
    }

    const trimmedWhatsapp = headerWhatsapp.trim();
    let normalizedWhatsapp: string | null = null;
    if (trimmedWhatsapp) {
      normalizedWhatsapp = normalizeBrazilianPhone(trimmedWhatsapp);
      if (!normalizedWhatsapp) {
        setValidationError('Número de WhatsApp inválido. Digite DDD + número (ex.: (11) 99999-9999).');
        return;
      }
    }

    const trimmedInstagram = headerInstagram.trim();
    if (trimmedInstagram) {
      if (trimmedInstagram.includes('@')) {
        setValidationError('Nome de usuário do Instagram não deve conter "@".');
        return;
      }
      if (trimmedInstagram.length > 30) {
        setValidationError('Nome de usuário do Instagram deve ter no máximo 30 caracteres.');
        return;
      }
    }

    setValidationError(null);
    setIsSavingHeader(true);

    try {
      const formData = new FormData();
      formData.append('name', trimmedName);
      formData.append('subtitle', headerSubtitle.trim());
      formData.append('whatsapp', trimmedWhatsapp);
      formData.append('instagram_handle', trimmedInstagram);

      const res = await updateNamespace(slug, formData);
      if (res.success) {
        onUpdateNamespace?.({
          ...namespace,
          name: trimmedName,
          subtitle: headerSubtitle.trim(),
          whatsapp: normalizedWhatsapp,
          instagram_handle: trimmedInstagram || null,
        });
        setIsEditingHeader(false);
      } else {
        setValidationError(res.message);
      }
    } catch (e) {
      console.error(e);
      setValidationError('Erro ao atualizar a loja.');
    } finally {
      setIsSavingHeader(false);
    }
  };

  const handleCopyBioLink = async () => {
    const storeUrl = getStoreUrl(slug);
    const ok = await copyToClipboard(storeUrl);
    if (ok) {
      setIsBioCopied(true);
      onShared?.();

      // Ativação progressiva (T15 / D3):
      // Se a vitrine ainda não foi compartilhada (first_shared_at nulo),
      // registra o compartilhamento em segundo plano sem bloquear a UI.
      if (!namespace.first_shared_at) {
        markShared(namespace.slug || slug)
          .then((res) => {
            if (res.success && onUpdateNamespace) {
              const extended = Boolean(
                res.data && (res.data as { extended?: boolean }).extended
              );
              onUpdateNamespace({
                ...namespace,
                first_shared_at: new Date().toISOString(),
                ...(extended
                  ? { trial_extended: true, activation_completed: true }
                  : {}),
              });
            }
          })
          .catch((err) => {
            console.error('[StoreHeader] Erro ao registrar compartilhamento:', err);
          });
      }

      setTimeout(() => setIsBioCopied(false), 3000);
    }
  };

  return (
    <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
      <div className="w-full flex-1">
        {isEditingHeader ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="header-name-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Nome da loja
              </label>
              <input
                id="header-name-input"
                type="text"
                value={headerName}
                onChange={(e) => {
                  setHeaderName(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                maxLength={100}
                className="w-full p-2 text-2xl font-bold text-gray-900 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Nome da loja"
              />
            </div>

            <div>
              <label htmlFor="header-subtitle-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subtítulo ou descrição
              </label>
              <input
                id="header-subtitle-input"
                type="text"
                value={headerSubtitle}
                onChange={(e) => setHeaderSubtitle(e.target.value)}
                maxLength={255}
                className="w-full p-2 text-sm text-gray-700 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Subtítulo ou descrição da loja"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label htmlFor="header-whatsapp-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  WhatsApp de atendimento
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone size={16} />
                  </div>
                  <input
                    id="header-whatsapp-input"
                    type="tel"
                    value={headerWhatsapp}
                    onChange={handleWhatsappChange}
                    className="w-full pl-9 p-2 text-sm text-gray-900 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  DDD + número (celular ou fixo). Deixe em branco se não quiser exibir.
                </p>
              </div>

              <div>
                <label htmlFor="header-instagram-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Instagram da loja
                </label>
                <div className="relative flex rounded">
                  <span className="inline-flex items-center px-3 rounded-l border border-r-0 border-indigo-300 bg-slate-50 text-slate-500 text-sm font-semibold select-none">
                    @
                  </span>
                  <input
                    id="header-instagram-input"
                    type="text"
                    value={headerInstagram}
                    onChange={handleInstagramChange}
                    maxLength={30}
                    className="w-full p-2 text-sm text-gray-900 border border-indigo-300 rounded-r focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="sualoja"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Apenas o usuário, sem o &apos;@&apos;. Deixe em branco se não quiser exibir.
                </p>
              </div>
            </div>

            {validationError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded text-sm text-rose-700 font-medium">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={cancelEditing}
                className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 rounded font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveHeader}
                disabled={isSavingHeader}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                {isSavingHeader ? (
                  'Salvando...'
                ) : (
                  <>
                    <Save size={14} /> Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col w-full">
            <div className="flex justify-between items-start w-full">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{namespace.name || slug}</h1>
                <p className="text-sm text-gray-500 mt-1">{namespace.subtitle || 'Catálogo de produtos'}</p>

                {(namespace.whatsapp || namespace.instagram_handle) && (
                  <div className="flex flex-wrap items-center gap-2.5 mt-3">
                    {namespace.whatsapp && (
                      <a
                        href={`https://wa.me/${namespace.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        title="WhatsApp de atendimento"
                      >
                        <Phone size={13} className="text-emerald-600" />
                        <span>{formatBrazilianPhone(namespace.whatsapp)}</span>
                      </a>
                    )}
                    {namespace.instagram_handle && (
                      <a
                        href={`https://instagram.com/${namespace.instagram_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 transition-colors"
                        title="Perfil no Instagram"
                      >
                        <InstagramIcon size={13} className="text-pink-600" />
                        <span>@{namespace.instagram_handle}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
              {isAuthenticated && (
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-sm"
                    title="Importar produtos em lote"
                  >
                    <ListPlus size={16} />
                    <span>Importar em lote</span>
                  </button>
                  <button
                    type="button"
                    onClick={startEditing}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Editar dados da loja"
                  >
                    <Pencil size={18} />
                  </button>
                </div>
              )}
            </div>

            {isAuthenticated && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-pink-50/40 -mx-6 -mb-6 p-4 rounded-b-lg border-t border-indigo-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg shrink-0 shadow-sm">
                    <Link2 size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <span>Link da Vitrine para a Bio</span>
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                        Instagram
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {isBioCopied
                        ? 'Cole no Instagram: Perfil > Editar perfil > Links > Adicionar link externo.'
                        : '1 toque para copiar e colar na bio do seu perfil do Instagram.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyBioLink}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95 shrink-0 ${
                    isBioCopied
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isBioCopied ? (
                    <>
                      <Check size={16} />
                      <span>Link copiado para a Bio!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Copiar link da Bio</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isAuthenticated && (
        <BatchImportModal
          isOpen={isBatchModalOpen}
          onClose={() => setIsBatchModalOpen(false)}
          slug={slug}
          onSuccess={onImportSuccess}
        />
      )}
    </header>
  );
}
