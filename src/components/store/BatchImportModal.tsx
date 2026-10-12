'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  ListPlus,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Loader2,
  Sparkles,
  Camera,
} from 'lucide-react';
import { parseBatch, type ParsedBatchItem } from '@/lib/batchParser';
import { formatPrice } from '@/lib/format';
import { createItemsBatch } from '@/app/actions/batch';

export interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  onSuccess?: () => void;
  initialText?: string;
  onOpenPhotoConveyor?: () => void;
}

const EXAMPLE_BATCH_TEXT = `Vestido floral midi 89,90
Calça jeans mom 120,00
Blusa canelada branca - R$ 45,00
Jaqueta couro vintage 249,90 - Peça única tamanho M`;

/**
 * Remove a linha correspondente ao índice (1-based) do texto informado.
 */
export function removeLineFromText(currentText: string, lineNumber: number): string {
  if (!currentText) return '';
  const lines = currentText.split(/\r\n|\r|\n/);
  const targetIndex = lineNumber - 1;
  if (targetIndex >= 0 && targetIndex < lines.length) {
    lines.splice(targetIndex, 1);
    return lines.join('\n');
  }
  return currentText;
}

function BatchImportModalContent({
  onClose,
  slug,
  onSuccess,
  initialText = '',
  onOpenPhotoConveyor,
}: Omit<BatchImportModalProps, 'isOpen'>) {
  const [text, setText] = useState(initialText);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isBatchSuccess, setIsBatchSuccess] = useState(false);

  const handleFinishWithoutPhotos = useCallback(() => {
    onClose();
    if (onSuccess) {
      onSuccess();
    } else {
      window.location.reload();
    }
  }, [onClose, onSuccess]);

  const handleGoToPhotoConveyor = () => {
    onClose();
    if (onSuccess) {
      onSuccess();
    }
    if (onOpenPhotoConveyor) {
      onOpenPhotoConveyor();
    }
  };

  // Fecha no Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        if (isBatchSuccess) {
          handleFinishWithoutPhotos();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, isBatchSuccess, onClose, handleFinishWithoutPhotos]);

  // Previne rolagem do body quando modal está aberto
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Atualização em tempo real conforme o usuário digita
  const parsedItems: ParsedBatchItem[] = useMemo(() => {
    return parseBatch(text);
  }, [text]);

  const itemsWithWarning = useMemo(() => {
    return parsedItems.filter((item) => Boolean(item.warning));
  }, [parsedItems]);

  const validItems = useMemo(() => {
    return parsedItems.filter(
      (item) => !item.warning && item.price !== null && item.title.trim().length > 0
    );
  }, [parsedItems]);

  const hasWarnings = itemsWithWarning.length > 0;
  const isOverLimit = parsedItems.length > 100;
  const canSubmit = validItems.length > 0 && !hasWarnings && !isOverLimit && !isSubmitting;

  const handleFillExample = () => {
    setText(EXAMPLE_BATCH_TEXT);
    setErrorMessage(null);
  };

  const handleClear = () => {
    setText('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleRemoveLine = (lineNumber: number) => {
    const updated = removeLineFromText(text, lineNumber);
    setText(updated);
    setErrorMessage(null);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      if (isBatchSuccess) {
        handleFinishWithoutPhotos();
      } else {
        onClose();
      }
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = validItems.map((item) => ({
        title: item.title,
        price: item.price as number,
        description: item.description,
      }));

      const res = await createItemsBatch(slug, payload);

      if (res.success) {
        setSuccessMessage(res.message);
        setIsBatchSuccess(true);
      } else {
        setErrorMessage(res.message || 'Erro ao importar produtos.');
      }
    } catch (err) {
      console.error('[BatchImportModal] Erro ao submeter lote:', err);
      setErrorMessage('Erro de conexão ao importar produtos. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-modal-title"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] border border-slate-100">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <ListPlus size={20} />
            </div>
            <div>
              <h2 id="batch-modal-title" className="text-lg font-bold text-slate-900">
                Importação em lote
              </h2>
              <p className="text-xs text-slate-500">
                Cadastre várias peças colando texto ou anotações informais
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={isBatchSuccess ? handleFinishWithoutPhotos : onClose}
            disabled={isSubmitting}
            aria-label="Fechar modal"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo scrollável ou Convite de Sucesso */}
        {isBatchSuccess ? (
          <div className="p-6 sm:p-10 flex flex-col items-center text-center space-y-5 my-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-xl font-bold text-slate-900">
                Produtos importados com sucesso!
              </h3>
              <p className="text-sm text-slate-600">
                Deseja subir as fotos agora na esteira?
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full max-w-sm justify-center">
              <button
                type="button"
                onClick={handleGoToPhotoConveyor}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm active:scale-95"
              >
                <Camera size={18} />
                <span>Subir fotos na esteira</span>
              </button>
              <button
                type="button"
                onClick={handleFinishWithoutPhotos}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Caixa de Texto e Ações Rápidas */}
              <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="batch-textarea"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Lista de produtos
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFillExample}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  <Sparkles size={12} />
                  <span>Preencher exemplo</span>
                </button>
                {text.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={isSubmitting}
                    className="text-xs text-slate-400 hover:text-rose-600 font-medium transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <textarea
              id="batch-textarea"
              rows={5}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={isSubmitting}
              placeholder={`Cole sua lista aqui, um produto por linha:
Vestido floral 89,90
Calça jeans 120,00
Blusa canelada branca - R$ 45,00`}
              className="w-full p-3 text-sm font-mono text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none resize-y placeholder:text-slate-400"
            />
            <p className="text-xs text-slate-500 mt-1">
              O sistema detecta automaticamente preços (ex.: <code>89,90</code>, <code>R$ 120,00</code>, <code>45 reais</code>) e títulos em cada linha.
            </p>
          </div>

          {/* Resumo e Indicadores em Tempo Real */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {parsedItems.length} {parsedItems.length === 1 ? 'item identificado' : 'itens identificados'}
            </span>
            {validItems.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {validItems.length} {validItems.length === 1 ? 'válido' : 'válidos'}
              </span>
            )}
            {hasWarnings && (
              <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {itemsWithWarning.length} {itemsWithWarning.length === 1 ? 'com aviso' : 'com avisos'}
              </span>
            )}
          </div>

          {/* Avisos de Bloqueio */}
          {hasWarnings && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">
                  {itemsWithWarning.length === 1
                    ? 'Existe 1 linha com aviso'
                    : `Existem ${itemsWithWarning.length} linhas com avisos`}
                </p>
                <p className="mt-0.5 text-amber-700">
                  Corrija o texto ou clique no ícone da lixeira para remover as linhas com aviso antes de importar.
                </p>
              </div>
            </div>
          )}

          {isOverLimit && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900">Limite de 100 itens excedido</p>
                <p className="mt-0.5 text-rose-700">
                  O lote possui {parsedItems.length} itens. Remova linhas para ficar dentro do limite de 100 produtos por importação.
                </p>
              </div>
            </div>
          )}

          {/* Banner de Erro da Action */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
              <p className="font-medium text-rose-900">{errorMessage}</p>
            </div>
          )}

          {/* Banner de Sucesso */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
              <p className="font-medium text-emerald-900">{successMessage}</p>
            </div>
          )}

          {/* Tabela de Pré-visualização dos Produtos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Pré-visualização dos produtos
              </h3>
              <span className="text-xs text-slate-400">
                {validItems.length} prontos para envio
              </span>
            </div>

            {parsedItems.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <p className="text-sm font-medium text-slate-500">Nenhum produto identificado ainda</p>
                <p className="text-xs text-slate-400 mt-1">
                  Digite ou cole seus produtos no campo acima para ver a prévia em tempo real.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 sm:max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 w-12 text-center">#</th>
                      <th className="py-2 px-3">Produto</th>
                      <th className="py-2 px-3 w-28 text-right">Preço</th>
                      <th className="py-2 px-3 w-16 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedItems.map((item) => {
                      const isWarning = Boolean(item.warning);
                      return (
                        <tr
                          key={`batch-item-line-${item.line}`}
                          className={`transition-colors ${
                            isWarning ? 'bg-rose-50/70 text-rose-950 font-medium' : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {item.line}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium">
                              {item.title ? (
                                item.title
                              ) : (
                                <span className="text-rose-600 italic">(Título vazio)</span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {item.description}
                              </p>
                            )}
                            {item.warning && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] uppercase tracking-wide font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                                <AlertTriangle size={10} />
                                {item.warning}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            {item.price !== null ? (
                              <span className="font-semibold text-emerald-700">
                                {formatPrice(item.price)}
                              </span>
                            ) : (
                              <span className="text-rose-600 font-semibold italic text-[11px]">
                                Sem preço
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(item.line)}
                              disabled={isSubmitting}
                              title={`Remover linha ${item.line}`}
                              aria-label={`Remover linha ${item.line}`}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-between items-center gap-3 shrink-0">
          <p className="text-xs text-slate-400 hidden sm:block">
            Pressione <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px]">Esc</kbd> para fechar
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Importando...</span>
                </>
              ) : validItems.length === 0 ? (
                <span>Importar produtos</span>
              ) : validItems.length === 1 ? (
                <span>Importar 1 produto</span>
              ) : (
                <span>Importar {validItems.length} produtos</span>
              )}
            </button>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

export function BatchImportModal({ isOpen, ...props }: BatchImportModalProps) {
  if (!isOpen) return null;
  return <BatchImportModalContent {...props} />;
}
