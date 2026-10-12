'use client';

import React, { useState, useEffect, useId } from 'react';
import {
  X,
  Camera,
  Images,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';
import { createUploadUrl } from '@/app/actions/upload';
import { updateItem } from '@/app/actions';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';
import type { Item } from '@/lib/types';

export type ConveyorSlotStatus =
  | 'idle'
  | 'compressing'
  | 'uploading'
  | 'saving'
  | 'success'
  | 'error';

export interface ConveyorSlot {
  id: string;
  file: File;
  previewUrl: string;
  assignedItemId: string | null;
  status: ConveyorSlotStatus;
  errorMessage?: string;
}

export interface AutoAssignResult {
  file: File;
  assignedItemId: string | null;
}

/**
 * Realiza a auto-associação sequencial 1 para 1 padrão entre fotos selecionadas e itens sem foto.
 * Respeita itens que já estejam em uso para evitar duplicidades na fila.
 */
export function autoAssignFilesToItems(
  files: File[],
  itemsWithoutPhotos: Item[],
  usedItemIds: Set<string> = new Set()
): AutoAssignResult[] {
  const availableItems = itemsWithoutPhotos.filter((item) => !usedItemIds.has(item.id));
  return files.map((file, idx) => {
    const item = availableItems[idx];
    return {
      file,
      assignedItemId: item ? item.id : null,
    };
  });
}

/**
 * Calcula a porcentagem inteira de progresso de upload entre 0 e 100.
 */
export function calculateUploadProgress(completed: number, total: number): number {
  if (total <= 0) return 0;
  if (completed <= 0) return 0;
  if (completed >= total) return 100;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}

/**
 * Processa o upload e a vinculação de um slot individual:
 * 1. comprime usando compressImage(file) (T20)
 * 2. obtém signed upload URL via createUploadUrl(slug, ext) (T21)
 * 3. faz upload no storage via uploadToSignedUrl
 * 4. atualiza o item via updateItem com a nova image_url
 */
export async function processConveyorSlotUpload({
  slot,
  targetItem,
  slug,
  supabaseClient = supabase,
  compressFn = compressImage,
  createUrlFn = createUploadUrl,
  updateItemFn = updateItem,
}: {
  slot: ConveyorSlot;
  targetItem: Item;
  slug: string;
  supabaseClient?: typeof supabase;
  compressFn?: typeof compressImage;
  createUrlFn?: typeof createUploadUrl;
  updateItemFn?: typeof updateItem;
}): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    // 1. Otimização de imagem com detecção HEIC e step-down resizing
    const compressedFile = await compressFn(slot.file);

    // 2. Extração segura de extensão permitida
    const rawExt = (compressedFile.name.split('.').pop() || 'webp').toLowerCase().replace(/^\./, '').trim();
    const ext = ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'webp';

    // 3. Obtenção de URL de upload assinada pelo servidor
    const uploadRes = await createUrlFn(slug, ext);
    if (!uploadRes.success || !uploadRes.data) {
      return {
        success: false,
        error: uploadRes.message || 'Falha ao gerar URL de upload.',
      };
    }

    const { token, path, publicUrl } = uploadRes.data;

    // 4. Upload no bucket de imagens do Supabase
    const { error: storageError } = await supabaseClient.storage
      .from('product-images')
      .uploadToSignedUrl(path, token, compressedFile);

    if (storageError) {
      return {
        success: false,
        error: storageError.message || 'Falha no envio do arquivo para o storage.',
      };
    }

    // 5. Vinculação da imagem ao produto via updateItem
    const formData = new FormData();
    formData.append('title', targetItem.title);
    formData.append('price', targetItem.price.toString());
    if (targetItem.description) {
      formData.append('description', targetItem.description);
    }
    formData.append('image_url', publicUrl);

    const updateRes = await updateItemFn(slug, targetItem.id, formData);
    if (!updateRes.success) {
      return {
        success: false,
        error: updateRes.message || 'Falha ao vincular imagem ao produto.',
      };
    }

    return {
      success: true,
      publicUrl,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro inesperado no upload.';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

export interface PhotoConveyorModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  itemsWithoutPhotos: Item[];
  onComplete?: () => void;
}

function PhotoConveyorModalContent({
  onClose,
  slug,
  itemsWithoutPhotos,
  onComplete,
}: Omit<PhotoConveyorModalProps, 'isOpen'>) {
  const [slots, setSlots] = useState<ConveyorSlot[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStepMessage, setCurrentStepMessage] = useState<string>('');
  const [isFinished, setIsFinished] = useState(false);
  const fileInputId = useId();

  // Fecha no Escape quando não estiver enviando
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUploading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUploading, onClose]);

  // Previne rolagem do body quando o modal está aberto
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Revoga as URLs de preview ao desmontar para evitar vazamentos de memória
  useEffect(() => {
    return () => {
      slots.forEach((s) => {
        try {
          URL.revokeObjectURL(s.previewUrl);
        } catch {
          // Ignora caso já tenha sido revogada
        }
      });
    };
  }, [slots]);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    e.target.value = '';

    const usedItemIds = new Set(
      slots.map((s) => s.assignedItemId).filter((id): id is string => Boolean(id))
    );

    const assignments = autoAssignFilesToItems(newFiles, itemsWithoutPhotos, usedItemIds);

    const newSlots: ConveyorSlot[] = assignments.map((item, index) => {
      const previewUrl = URL.createObjectURL(item.file);
      return {
        id: `slot_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
        file: item.file,
        previewUrl,
        assignedItemId: item.assignedItemId,
        status: 'idle',
      };
    });

    setSlots((prev) => [...prev, ...newSlots]);
    setIsFinished(false);
  };

  const handleRemoveSlot = (slotId: string) => {
    if (isUploading) return;
    setSlots((prev) => {
      const slotToRemove = prev.find((s) => s.id === slotId);
      if (slotToRemove) {
        try {
          URL.revokeObjectURL(slotToRemove.previewUrl);
        } catch {
          // Ignora erro
        }
      }
      return prev.filter((s) => s.id !== slotId);
    });
  };

  const handleAssignItem = (slotId: string, itemId: string | null) => {
    if (isUploading) return;
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, assignedItemId: itemId || null } : s))
    );
  };

  const handleClearAll = () => {
    if (isUploading) return;
    slots.forEach((s) => {
      try {
        URL.revokeObjectURL(s.previewUrl);
      } catch {
        // Ignora erro
      }
    });
    setSlots([]);
    setIsFinished(false);
    setProgress(0);
    setCurrentStepMessage('');
  };

  const assignedSlots = slots.filter((s) => Boolean(s.assignedItemId));
  const pendingSlots = slots.filter((s) => Boolean(s.assignedItemId) && s.status !== 'success');
  const successSlots = slots.filter((s) => s.status === 'success');
  const errorSlots = slots.filter((s) => s.status === 'error');

  const handleStartUpload = async () => {
    if (isUploading) return;
    const toUpload = slots.filter((s) => Boolean(s.assignedItemId) && s.status !== 'success');
    if (toUpload.length === 0) return;

    setIsUploading(true);
    setIsFinished(false);
    setProgress(0);

    const totalToUpload = toUpload.length;
    let completedCount = 0;

    for (let i = 0; i < toUpload.length; i++) {
      const slot = toUpload[i];
      const targetItem = itemsWithoutPhotos.find((it) => it.id === slot.assignedItemId);

      if (!targetItem) {
        completedCount++;
        setProgress(calculateUploadProgress(completedCount, totalToUpload));
        continue;
      }

      setCurrentStepMessage(
        `Processando foto ${i + 1} de ${totalToUpload}: ${targetItem.title}…`
      );

      // Marca o slot como 'compressing'
      setSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, status: 'compressing' } : s))
      );

      const result = await processConveyorSlotUpload({
        slot,
        targetItem,
        slug,
      });

      completedCount++;
      setProgress(calculateUploadProgress(completedCount, totalToUpload));

      if (result.success) {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slot.id
              ? { ...s, status: 'success', errorMessage: undefined }
              : s
          )
        );
      } else {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slot.id
              ? {
                  ...s,
                  status: 'error',
                  errorMessage: result.error || 'Falha no upload desta foto.',
                }
              : s
          )
        );
      }
    }

    setIsUploading(false);
    setIsFinished(true);
    setCurrentStepMessage('');
  };

  const handleClose = () => {
    if (isUploading) return;
    onClose();
  };

  const handleCompleteAndClose = () => {
    if (isUploading) return;
    onClose();
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conveyor-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto flex flex-col max-h-[94vh] border border-slate-100">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
              <Camera size={22} />
            </div>
            <div>
              <h2 id="conveyor-modal-title" className="text-lg font-bold text-slate-900">
                Esteira de fotos
              </h2>
              <p className="text-xs text-slate-600">
                {itemsWithoutPhotos.length === 1
                  ? '1 produto aguardando foto'
                  : `${itemsWithoutPhotos.length} produtos aguardando foto`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            aria-label="Fechar esteira"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {itemsWithoutPhotos.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Todos os produtos já possuem foto!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Não há nenhum item sem foto na sua loja no momento. Novos produtos cadastrados sem imagem aparecerão aqui automaticamente.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Seletor / Botão de Adição de Fotos */}
              <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-2xl p-4 sm:p-6 text-center transition-all hover:bg-indigo-50/70">
                <input
                  id={fileInputId}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFilesSelected}
                  disabled={isUploading}
                  className="sr-only"
                  aria-label="Selecionar fotos da câmera ou galeria"
                />
                <label
                  htmlFor={fileInputId}
                  className={`cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    isUploading ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 text-indigo-600 bg-white p-3 rounded-full shadow-sm border border-indigo-100">
                    <Camera size={22} />
                    <span className="text-slate-300">•</span>
                    <Images size={22} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-indigo-700 block hover:underline">
                      {slots.length === 0
                        ? 'Tirar fotos ou selecionar da galeria'
                        : 'Adicionar mais fotos à esteira'}
                    </span>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      Selecione várias fotos de uma vez pelo celular ou computador
                    </span>
                  </div>
                </label>
              </div>

              {/* Barra de Progresso Durante o Envio */}
              {(isUploading || progress > 0) && (
                <div
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progresso de upload das fotos"
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      {isUploading && <Loader2 size={14} className="animate-spin text-indigo-600" />}
                      <span>{currentStepMessage || 'Enviando fotos…'}</span>
                    </span>
                    <span className="font-mono text-indigo-700 text-sm font-bold">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Mensagem de Conclusão / Erro Parcial */}
              {isFinished && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    errorSlots.length === 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  {errorSlots.length === 0 ? (
                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-sm">
                      {errorSlots.length === 0
                        ? 'Todas as fotos foram vinculadas com sucesso!'
                        : `${successSlots.length} foto(s) vinculada(s). ${errorSlots.length} foto(s) com erro.`}
                    </p>
                    <p className="text-slate-600">
                      {errorSlots.length === 0
                        ? 'Os produtos já foram atualizados com as novas imagens.'
                        : 'Você pode tentar reenviar as fotos com erro ou concluir a esteira agora.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Fila / Grade de Fotos na Esteira */}
              {slots.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Fila da esteira ({slots.length})
                      </h3>
                      <span className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
                        {assignedSlots.length} associada(s)
                      </span>
                    </div>
                    {!isUploading && (
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-xs text-slate-400 hover:text-rose-600 font-medium transition-colors"
                      >
                        Limpar fila
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {slots.map((slot, index) => {
                      const isAssigned = Boolean(slot.assignedItemId);
                      const isSuccess = slot.status === 'success';
                      const isError = slot.status === 'error';
                      const isWorking =
                        slot.status === 'compressing' ||
                        slot.status === 'uploading' ||
                        slot.status === 'saving';

                      return (
                        <div
                          key={slot.id}
                          className={`border rounded-xl p-3 flex flex-col justify-between gap-2.5 transition-all bg-white ${
                            isSuccess
                              ? 'border-emerald-300 bg-emerald-50/20'
                              : isError
                              ? 'border-rose-300 bg-rose-50/20'
                              : isWorking
                              ? 'border-indigo-300 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {/* Topo do Card: Número + Miniatura + Ação de remover */}
                          <div className="flex items-start gap-3">
                            <div className="relative shrink-0 w-20 h-20 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={slot.previewUrl}
                                alt={`Prévia ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute top-1 left-1 bg-slate-900/70 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                                #{index + 1}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-800 truncate" title={slot.file.name}>
                                {slot.file.name}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {(slot.file.size / 1024).toFixed(0)} KB
                              </p>

                              {/* Status individual */}
                              <div className="mt-2">
                                {isSuccess && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                    <CheckCircle2 size={12} />
                                    <span>Vinculada</span>
                                  </span>
                                )}
                                {isError && (
                                  <span
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded truncate max-w-full"
                                    title={slot.errorMessage}
                                  >
                                    <AlertCircle size={12} />
                                    <span>Erro</span>
                                  </span>
                                )}
                                {isWorking && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                                    <Loader2 size={12} className="animate-spin" />
                                    <span>
                                      {slot.status === 'compressing'
                                        ? 'Otimizando…'
                                        : slot.status === 'uploading'
                                        ? 'Enviando…'
                                        : 'Vinculando…'}
                                    </span>
                                  </span>
                                )}
                                {!isWorking && !isSuccess && !isError && (
                                  <span
                                    className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded ${
                                      isAssigned
                                        ? 'text-indigo-700 bg-indigo-50 border border-indigo-200'
                                        : 'text-slate-500 bg-slate-100'
                                    }`}
                                  >
                                    {isAssigned ? 'Pronta para envio' : 'Sem produto'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {!isUploading && !isSuccess && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(slot.id)}
                                aria-label={`Remover foto ${index + 1}`}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>

                          {/* Seletor do Produto a vincular */}
                          <div className="pt-1 border-t border-slate-100">
                            <label
                              htmlFor={`assign-select-${slot.id}`}
                              className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1"
                            >
                              Vincular ao produto:
                            </label>
                            <select
                              id={`assign-select-${slot.id}`}
                              value={slot.assignedItemId || ''}
                              onChange={(e) => handleAssignItem(slot.id, e.target.value)}
                              disabled={isUploading || isSuccess}
                              className="w-full p-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                            >
                              <option value="">(Não vincular esta foto)</option>
                              {itemsWithoutPhotos.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.title} — {formatPrice(item.price)}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Mensagem de Erro Detalhada */}
                          {isError && slot.errorMessage && (
                            <p className="text-[11px] text-rose-700 font-medium bg-rose-50 p-1.5 rounded">
                              {slot.errorMessage}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-between items-center gap-3 shrink-0">
          <p className="text-xs text-slate-500 hidden sm:block">
            Pressione <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px]">Esc</kbd> para fechar
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {isFinished ? (
              <>
                {errorSlots.length > 0 && (
                  <button
                    type="button"
                    onClick={handleStartUpload}
                    disabled={isUploading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors"
                  >
                    <RefreshCw size={15} />
                    <span>Tentar {errorSlots.length} com erro</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCompleteAndClose}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  <CheckCircle2 size={16} />
                  <span>Concluir</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isUploading}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleStartUpload}
                  disabled={pendingSlots.length === 0 || isUploading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Enviando esteira…</span>
                    </>
                  ) : pendingSlots.length === 0 ? (
                    <span>Enviar fotos</span>
                  ) : pendingSlots.length === 1 ? (
                    <>
                      <Upload size={16} />
                      <span>Enviar 1 foto</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Enviar {pendingSlots.length} fotos</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PhotoConveyorModal({ isOpen, ...props }: PhotoConveyorModalProps) {
  if (!isOpen) return null;
  return <PhotoConveyorModalContent {...props} />;
}
