'use client';

import { Sparkles, HelpCircle } from 'lucide-react';
import { normalizeBrazilianPhone } from '@/lib/phone';

function WhatsAppIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.11 7.44C8.95 7.44 8.68 7.5 8.46 7.74C8.24 7.97 7.62 8.56 7.62 9.75C7.62 10.95 8.49 12.1 8.61 12.26C8.73 12.42 10.32 14.88 12.77 15.93C14.8 16.81 15.22 16.63 15.67 16.59C16.12 16.55 17.11 16 17.31 15.43C17.52 14.86 17.52 14.37 17.46 14.27C17.4 14.17 17.24 14.11 17 13.99C16.76 13.87 15.58 13.29 15.36 13.21C15.14 13.13 14.98 13.09 14.82 13.33C14.66 13.57 14.2 14.11 14.06 14.27C13.92 14.43 13.78 14.45 13.54 14.33C13.3 14.21 12.53 13.96 11.61 13.14C10.89 12.5 10.4 11.71 10.26 11.47C10.12 11.23 10.25 11.1 10.37 10.98C10.48 10.87 10.61 10.69 10.74 10.54C10.86 10.39 10.9 10.28 10.98 10.12C11.06 9.96 11.02 9.82 10.96 9.7C10.9 9.58 10.44 8.45 10.25 7.99C10.06 7.54 9.87 7.6 9.73 7.59C9.59 7.58 9.43 7.58 9.27 7.58L9.11 7.44Z" />
    </svg>
  );
}

export interface ConciergeButtonProps {
  itemsCount: number;
  slug: string;
  storeName?: string | null;
  isAuthenticated: boolean;
  adminPhone?: string;
  className?: string;
}

/**
 * Monta o texto pré-formatado da mensagem do WhatsApp do Concierge.
 * "Olá! Preciso de ajuda do Concierge StokFácil para cadastrar produtos na minha loja [Nome da Loja] (slug: [slug])."
 */
export function buildConciergeMessage(storeName: string | null | undefined, slug: string): string {
  const cleanSlug = (slug || '').trim();
  const displayName = storeName?.trim() || cleanSlug;
  return `Olá! Preciso de ajuda do Concierge StokFácil para cadastrar produtos na minha loja ${displayName} (slug: ${cleanSlug}).`;
}

/**
 * Resolve o número de WhatsApp do operador:
 * Prioriza adminPhone explícito, em seguida process.env.NEXT_PUBLIC_ADMIN_WHATSAPP,
 * e por fim o padrão '5511999999999'. Normaliza para dígitos canônicos.
 */
export function resolveAdminPhone(explicitPhone?: string): string {
  const candidate = (explicitPhone || process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || '').trim();
  if (!candidate) {
    return '5511999999999';
  }
  const normalized = normalizeBrazilianPhone(candidate);
  if (normalized) {
    return normalized;
  }
  const digitsOnly = candidate.replace(/\D/g, '');
  return digitsOnly || '5511999999999';
}

/**
 * Constrói o link wa.me para o Concierge StokFácil.
 */
export function buildConciergeWhatsAppUrl({
  slug,
  storeName,
  adminPhone,
}: {
  slug: string;
  storeName?: string | null;
  adminPhone?: string;
}): string {
  const phone = resolveAdminPhone(adminPhone);
  const message = buildConciergeMessage(storeName, slug);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function ConciergeButton({
  itemsCount,
  slug,
  storeName,
  isAuthenticated,
  adminPhone,
  className = '',
}: ConciergeButtonProps) {
  // Exibido EXCLUSIVAMENTE para o lojista autenticado
  if (!isAuthenticated) {
    return null;
  }

  const whatsAppUrl = buildConciergeWhatsAppUrl({ slug, storeName, adminPhone });

  // Quando a loja tem menos de 5 produtos: Card de assistência amigável em destaque
  if (itemsCount < 5) {
    return (
      <aside
        aria-label="Assistência Concierge para cadastro de estoque"
        className={`bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-xs mb-6 transition-all ${className}`}
        data-testid="concierge-highlight-card"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
              <Sparkles size={20} className="text-emerald-700" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wide uppercase text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  Concierge StokFácil
                </span>
                <span className="text-xs text-emerald-700 font-medium">Suporte Grátis</span>
              </div>
              <p className="text-sm sm:text-base font-medium text-slate-800 mt-1 leading-snug">
                Precisa de ajuda para cadastrar seu estoque? Chame no WhatsApp e subimos até 15 peças para você sem custo!
              </p>
            </div>
          </div>
          <div className="shrink-0 sm:self-center">
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chamar Concierge no WhatsApp para cadastrar produtos"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-xs hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-95"
              data-testid="concierge-whatsapp-link"
            >
              <WhatsAppIcon size={18} className="shrink-0 text-white" />
              <span>Chamar no WhatsApp</span>
            </a>
          </div>
        </div>
      </aside>
    );
  }

  // Quando a loja tem 5 ou mais produtos: Botão sutil e compacto
  return (
    <div
      className={`flex justify-end mb-4 ${className}`}
      data-testid="concierge-compact-container"
    >
      <a
        href={whatsAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Pedir ajuda ao suporte no WhatsApp"
        className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-emerald-700 hover:bg-slate-100/80 border border-slate-200/90 bg-white/80 px-3 py-1.5 rounded-lg shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
        data-testid="concierge-whatsapp-link"
      >
        <HelpCircle size={15} className="text-slate-400 shrink-0" aria-hidden="true" />
        <span>Precisa de ajuda com o estoque? Chame o suporte</span>
      </a>
    </div>
  );
}
