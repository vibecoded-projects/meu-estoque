'use client';

import { AlertTriangle, AlertCircle, MessageCircle } from 'lucide-react';
import type { StoreLifecycle } from '@/lib/lifecycle';

export interface TrialBannerProps {
  lifecycle: StoreLifecycle;
  isAuthenticated: boolean;
  slug: string;
  storeName?: string | null;
  adminWhatsApp?: string | null;
}

export interface BuildRenewalLinkParams {
  slug: string;
  storeName?: string | null;
  adminWhatsApp?: string | null;
  isReactivation?: boolean;
}

/**
 * Constrói o link do WhatsApp para o operador com a mensagem pré-formatada
 * solicitando renovação ou reativação da loja via Pix.
 */
export function buildRenewalWhatsAppLink({
  slug,
  storeName,
  adminWhatsApp,
  isReactivation = false,
}: BuildRenewalLinkParams): string {
  const rawAdminPhone =
    adminWhatsApp ??
    process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ??
    '5511999999999';
  const cleanPhone = rawAdminPhone.replace(/\D/g, '') || '5511999999999';

  const cleanSlug = (slug || '').trim();
  const cleanName = storeName?.trim();
  const storeReference =
    cleanName && cleanName !== cleanSlug
      ? `${cleanName} (${cleanSlug})`
      : cleanSlug;

  const action = isReactivation ? 'reativar' : 'renovar';
  const message = `Olá! Gostaria de ${action} o plano da minha loja ${storeReference} via Pix no StokFácil.`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Banner de expiração e renovação via Pix (T16 / RF14).
 *
 * Visibilidade:
 * - Apenas no modo autenticado (isAuthenticated === true). Visitantes nunca visualizam.
 * - Se showRenewalBanner for falso, não renderiza nada (null).
 *
 * Estados:
 * - state === 'active' (dias restantes <= 5): banner amarelo/âmbar de alerta com botão "Renovar no WhatsApp (via Pix)".
 * - state === 'grace': banner vermelho/laranja informando bloqueio de edição com botão "Reativar no WhatsApp (via Pix)".
 * - state === 'paused': banner vermelho/laranja informando pausa e bloqueio com botão "Reativar no WhatsApp (via Pix)".
 */
export function TrialBanner({
  lifecycle,
  isAuthenticated,
  slug,
  storeName,
  adminWhatsApp,
}: TrialBannerProps) {
  if (!isAuthenticated || !lifecycle || !lifecycle.showRenewalBanner) {
    return null;
  }

  const isReactivation = lifecycle.state !== 'active';
  const whatsappUrl = buildRenewalWhatsAppLink({
    slug,
    storeName,
    adminWhatsApp,
    isReactivation,
  });

  if (lifecycle.state === 'active') {
    const days = lifecycle.daysLeft ?? 0;
    const daysText = days === 1 ? '1 dia' : `${days} dias`;
    const message = `Seu período de teste vence em ${daysText}. Continue vendendo sem interrupções!`;

    return (
      <aside
        role="alert"
        aria-label="Alerta de expiração do período de teste"
        className="w-full bg-amber-50 border border-amber-300 text-amber-950 rounded-xl p-4 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-700 shrink-0 mt-0.5" size={20} aria-hidden="true" />
            <p className="text-sm font-medium text-amber-950 leading-relaxed">
              {message}
            </p>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-xs transition-all text-center"
          >
            <MessageCircle size={16} aria-hidden="true" />
            <span>Renovar no WhatsApp (via Pix)</span>
          </a>
        </div>
      </aside>
    );
  }

  // Período de tolerância (grace) ou pausa por expiração
  const graceMessage =
    lifecycle.state === 'grace'
      ? 'Período de teste encerrado. Sua vitrine continua online, mas a edição de produtos está bloqueada. Renove via Pix para reativar!'
      : 'Período de teste encerrado. Sua vitrine está pausada e a edição de produtos está bloqueada. Renove via Pix para reativar!';

  return (
    <aside
      role="alert"
      aria-label="Alerta de encerramento do período de teste"
      className="w-full bg-rose-50 border border-rose-300 text-rose-950 rounded-xl p-4 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-rose-700 shrink-0 mt-0.5" size={20} aria-hidden="true" />
          <p className="text-sm font-medium text-rose-950 leading-relaxed">
            {graceMessage}
          </p>
        </div>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-xs transition-all text-center"
        >
          <MessageCircle size={16} aria-hidden="true" />
          <span>Reativar no WhatsApp (via Pix)</span>
        </a>
      </div>
    </aside>
  );
}
