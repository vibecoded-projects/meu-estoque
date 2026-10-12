'use client';

import { PauseCircle, AlertTriangle, MessageCircle } from 'lucide-react';
import type { Namespace } from '@/lib/types';
import type { StoreLifecycle } from '@/lib/lifecycle';
import { normalizeBrazilianPhone } from '@/lib/phone';
import { buildRenewalWhatsAppLink } from './TrialBanner';

export interface PausedStoreProps {
  namespace: Pick<
    Namespace,
    'slug' | 'name' | 'whatsapp' | 'logo_url' | 'instagram_handle'
  >;
  lifecycle: StoreLifecycle;
  isAuthenticated?: boolean;
  adminWhatsApp?: string | null;
}

/**
 * Monta o link do WhatsApp para contato direto com a loja pelo cliente.
 */
export function buildStoreWhatsAppLink(
  whatsapp?: string | null,
  storeName?: string | null
): string | null {
  if (!whatsapp || typeof whatsapp !== 'string') {
    return null;
  }

  const normalizedPhone = normalizeBrazilianPhone(whatsapp);
  if (!normalizedPhone) {
    return null;
  }

  const cleanName = storeName?.trim();
  const greeting = cleanName
    ? `Olá! Vi que a vitrine da loja ${cleanName} está temporariamente pausada e gostaria de tirar uma dúvida.`
    : 'Olá! Vi que a sua vitrine está temporariamente pausada e gostaria de tirar uma dúvida.';

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(greeting)}`;
}

/**
 * Componente acolhedor exibido quando a loja está pausada ou bloqueada (T22 / RF15).
 * Respeita a privacidade da loja (oculta catálogo) e disponibiliza canal direto no WhatsApp.
 * Se o lojista estiver autenticado, exibe aviso administrativo em destaque com botão Pix do admin.
 */
export function PausedStore({
  namespace,
  lifecycle,
  isAuthenticated = false,
  adminWhatsApp,
}: PausedStoreProps) {
  const storeName = namespace.name?.trim() || null;
  const storeTitle = storeName ? `${storeName} está em manutenção` : 'Vitrine Temporariamente Indisponível';
  const storeWhatsAppUrl = buildStoreWhatsAppLink(namespace.whatsapp, storeName);
  const isBlocked = lifecycle.state === 'blocked';

  const adminRenewalUrl = buildRenewalWhatsAppLink({
    slug: namespace.slug,
    storeName,
    adminWhatsApp,
    isReactivation: true,
  });

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center">
      {/* Aviso administrativo em destaque no topo para o lojista autenticado */}
      {isAuthenticated && (
        <aside
          role="alert"
          aria-label="Aviso administrativo: assinatura vencida"
          className="w-full bg-amber-50 border border-amber-300 text-amber-950 rounded-xl p-4 sm:p-5 shadow-xs mb-6 sm:mb-8 transition-all"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="text-amber-700 shrink-0 mt-0.5"
                size={22}
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Painel do Lojista
                </p>
                <p className="text-sm font-medium text-amber-950 mt-0.5 leading-relaxed">
                  {isBlocked
                    ? 'Sua vitrine foi bloqueada administrativamente. Entre em contato com o suporte para regularizar.'
                    : 'Sua assinatura venceu e sua vitrine está pausada para os clientes. Renove via Pix para reativar seu catálogo imediatamente.'}
                </p>
              </div>
            </div>
            <a
              href={adminRenewalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-xs transition-all text-center"
            >
              <MessageCircle size={18} aria-hidden="true" />
              <span>Renovar no WhatsApp (via Pix)</span>
            </a>
          </div>
        </aside>
      )}

      {/* Card acolhedor para visitantes e clientes */}
      <section
        aria-labelledby="store-paused-heading"
        className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 text-center flex flex-col items-center"
      >
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-5 shadow-2xs">
          <PauseCircle size={36} aria-hidden="true" className="text-slate-600" />
        </div>

        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full mb-3">
          Vitrine Temporariamente Indisponível
        </span>

        <h1
          id="store-paused-heading"
          className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
        >
          {storeTitle}
        </h1>

        <p className="text-slate-600 text-sm sm:text-base mt-3 max-w-md leading-relaxed">
          Esta vitrine está pausada no momento. Entre em contato diretamente com a loja no WhatsApp.
        </p>

        {/* Botão de contato direto com a loja */}
        {storeWhatsAppUrl && (
          <div className="mt-6 w-full max-w-sm">
            <a
              href={storeWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-semibold py-3 px-6 rounded-xl shadow-xs transition-all text-sm sm:text-base"
            >
              <MessageCircle size={20} aria-hidden="true" />
              <span>Falar com a loja no WhatsApp</span>
            </a>
          </div>
        )}

        {/* Instagram da loja (se configurado) */}
        {namespace.instagram_handle && (
          <p className="mt-5 text-xs text-slate-500">
            Instagram:{' '}
            <a
              href={`https://instagram.com/${namespace.instagram_handle.replace(/^@/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-700 hover:text-slate-900 underline underline-offset-2"
            >
              @{namespace.instagram_handle.replace(/^@/, '')}
            </a>
          </p>
        )}
      </section>
    </div>
  );
}
