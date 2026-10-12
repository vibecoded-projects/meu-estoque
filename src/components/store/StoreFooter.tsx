import Link from 'next/link';
import type { Plan } from '@/lib/types';

export interface StoreFooterProps {
  plan?: Plan;
  isWhiteLabel?: boolean;
  storeName?: string | null;
  homeUrl?: string;
}

export function StoreFooter({
  plan,
  isWhiteLabel = false,
  storeName,
  homeUrl = '/',
}: StoreFooterProps) {
  const isWhiteLabelActive = Boolean(isWhiteLabel || plan === 'annual');

  if (isWhiteLabelActive) {
    const trimmedName = storeName?.trim();
    if (!trimmedName) {
      return null;
    }

    return (
      <footer className="mt-12 py-8 text-center border-t border-slate-200">
        <p className="text-xs text-slate-600">
          {trimmedName} — Todos os direitos reservados
        </p>
      </footer>
    );
  }

  const isExternal = homeUrl.startsWith('http://') || homeUrl.startsWith('https://');

  return (
    <footer className="mt-12 py-8 text-center border-t border-slate-200">
      {isExternal ? (
        <a
          href={homeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
        >
          <span>Criado com</span>
          <strong className="font-semibold text-slate-800 hover:text-indigo-600">StokFácil</strong>
          <span>— Crie sua vitrine grátis</span>
        </a>
      ) : (
        <Link
          href={homeUrl}
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
        >
          <span>Criado com</span>
          <strong className="font-semibold text-slate-800 hover:text-indigo-600">StokFácil</strong>
          <span>— Crie sua vitrine grátis</span>
        </Link>
      )}
    </footer>
  );
}

